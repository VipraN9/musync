import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import authRoutes from './routes/auth';
import { createServer } from 'http';
import session from 'express-session';
import { storage } from './storage';

const app = express();
const port = process.env.PORT || 3000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.NODE_ENV === 'production' ? 'musync-sable.vercel.app' : undefined,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://musync-sable.vercel.app' 
    : 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try different ports if 5000 is not available
  const ports = [5000, 3000, 8888, 8000];
  let currentPort = 0;
  
  const tryNextPort = async () => {
    if (currentPort >= ports.length) {
      log('No available ports found. Please close any applications using ports 5000, 3000, 8888, or 8000');
      process.exit(1);
    }
    
    const port = ports[currentPort++];
    log(`Attempting to start server on port ${port}...`);
    
    try {
      const httpServer = server.listen(port, "0.0.0.0", () => {
        log(`Server started successfully on port ${port}`);
      });
      
      httpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' || err.code === 'ENOTSUP') {
          log(`Port ${port} is in use, trying next port...`);
          httpServer.close();
          tryNextPort();
        } else {
          log(`Server error: ${err.message}`);
          process.exit(1);
        }
      });
    } catch (err) {
      log(`Failed to start server: ${err}`);
      process.exit(1);
    }
  };
  
  tryNextPort();
})();
