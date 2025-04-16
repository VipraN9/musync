import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100)
});

import { Express, Request, Response } from 'express';
import { createServer, Server } from 'http';
import session from 'express-session';
import { storage } from './storage';
import { User, InsertUser } from '../shared/schema';
import { log } from './vite';
import { SpotifyService } from './services/spotify';
import { AppleMusicService } from './services/applemusic';
import { SoundCloudService } from './services/soundcloud';
import querystring from "querystring";
import { insertPlatformSchema, insertSongSchema, insertSyncHistorySchema } from "@shared/schema";
import { ZodError } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from 'express';
import authRoutes from './routes/auth';

declare module "express-session" {
  interface SessionData {
    userId?: number;
    oauthState?: string;
  }
}

const router = Router();
const spotifyService = SpotifyService.getInstance();
const appleMusicService = AppleMusicService.getInstance();
const soundcloudService = SoundCloudService.getInstance();

interface SongResponse {
  title: string;
  artist: string;
  album: string | null;
  albumCover: string | null;
  platformId: number;
  externalId: string;
  addedAt: string;
  platform?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );

  // Configure passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Register auth routes
  app.use('/auth', authRoutes);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // User routes
  app.post("/api/signup", async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Initialize default platforms (disconnected)
      await storage.createPlatform({
        userId: user.id,
        type: "spotify",
        isConnected: false,
        accessToken: null,
        refreshToken: null,
      });
      
      await storage.createPlatform({
        userId: user.id,
        type: "apple_music",
        isConnected: false,
        accessToken: null,
        refreshToken: null,
      });
      
      await storage.createPlatform({
        userId: user.id,
        type: "soundcloud",
        isConnected: false,
        accessToken: null,
        refreshToken: null,
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login", error: err.message });
        }
        return res.status(201).json({ 
          message: "User created successfully",
          user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }
        });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    return res.json({ 
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout", error: err.message });
      }
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", isAuthenticated, (req, res) => {
    const user = req.user as any;
    return res.json({ 
      user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }
    });
  });

  // Platform routes
  app.get("/api/platforms", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const platforms = await storage.getPlatformsByUserId(user.id);
      return res.json({ platforms });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  app.post('/api/platforms/connect', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { type } = req.body;
      
      // Instead of generating URLs here, redirect to the auth routes
      switch (type) {
        case 'spotify':
          return res.json({ authUrl: '/auth/spotify' });
        case 'apple_music':
          return res.json({ authUrl: '/auth/apple-music' });
        case 'soundcloud':
          return res.json({ authUrl: '/auth/soundcloud' });
        default:
          return res.status(400).json({ message: "Unsupported platform type" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Song sync routes
  app.post("/api/sync", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { sourcePlatform, targetPlatforms } = req.body;
      
      // Validate that we have valid platform types
      if (!sourcePlatform || !Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
        return res.status(400).json({ 
          message: "You must specify a source platform and at least one target platform" 
        });
      }
      
      // Get all user platforms
      const platforms = await storage.getPlatformsByUserId(user.id);
      
      // Find source platform
      const source = platforms.find(p => p.type === sourcePlatform && p.isConnected);
      if (!source) {
        return res.status(404).json({ message: "Source platform not found or not connected" });
      }
      
      // Find target platforms
      const targets = platforms.filter(p => 
        targetPlatforms.includes(p.type) && 
        p.isConnected && 
        p.type !== sourcePlatform
      );
      
      if (targets.length === 0) {
        return res.status(404).json({ message: "No valid target platforms found" });
      }
      
      // Get songs from source platform
      let sourceSongs = [];
      switch (sourcePlatform) {
        case 'spotify':
          sourceSongs = await spotifyService.getLikedSongs(source);
          break;
        case 'apple_music':
          sourceSongs = await appleMusicService.getLikedSongs(source);
          break;
        case 'soundcloud':
          sourceSongs = await soundcloudService.getLikedSongs(source);
          break;
        default:
          return res.status(400).json({ message: "Unsupported source platform type" });
      }
      
      // Add songs to each target platform
      const syncResults = [];
      let totalSongsAdded = 0;
      
      for (const target of targets) {
        let songsAddedToTarget = 0;
        
        // First, get existing songs for this platform
        const existingSongs = await storage.getSongsByUserIdAndPlatform(user.id, target.id);
        
        // For each song in the source, check if it's in the target
        for (const song of sourceSongs) {
          // Check if we already have this song in our database for this target platform
          const existingSong = existingSongs.find(s => 
            s.title.toLowerCase() === song.title.toLowerCase() && 
            s.artist.toLowerCase() === song.artist.toLowerCase()
          );
          
          if (!existingSong) {
            // We need to add this song to the target platform
            let searchResult;
            let addResult = false;
            
            // Search for the song in the target platform
            switch (target.type) {
              case 'spotify':
                searchResult = await spotifyService.searchSong(target, `${song.title} ${song.artist}`);
                if (searchResult) {
                  addResult = await spotifyService.addSongToLibrary(target, searchResult.externalId);
                }
                break;
              case 'apple_music':
                searchResult = await appleMusicService.searchSong(target, `${song.title} ${song.artist}`);
                if (searchResult) {
                  addResult = await appleMusicService.addSongToLibrary(target, searchResult.externalId);
                }
                break;
              case 'soundcloud':
                searchResult = await soundcloudService.searchSong(target, `${song.title} ${song.artist}`);
                if (searchResult) {
                  addResult = await soundcloudService.addSongToLibrary(target, searchResult.externalId);
                }
                break;
            }
            
            if (addResult) {
              // Successfully added to the platform, now save it to our db
              const platforms = song.platforms || [];
              platforms.push(target.id);
              
              // If this is a new song, add it to the database
              if (!existingSong) {
                await storage.createSong({
                  userId: user.id,
                  title: song.title,
                  artist: song.artist,
                  album: song.album || null,
                  albumCover: song.albumCover || null,
                  platforms: platforms
                });
              }
              
              songsAddedToTarget++;
              totalSongsAdded++;
            }
          }
        }
        
        syncResults.push({
          platformType: target.type,
          songsAdded: songsAddedToTarget
        });
      }
      
      // Create sync history entry
      const syncHistoryData = insertSyncHistorySchema.parse({
        userId: user.id,
        type: 'full',
        targetPlatforms: targets.map(t => t.id),
        songsAdded: totalSongsAdded,
        status: "completed"
      });
      
      const syncHistoryRecord = await storage.createSyncHistory(syncHistoryData);
      
      return res.json({ 
        message: "Sync completed successfully", 
        syncHistory: syncHistoryRecord,
        syncResults
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  app.get("/api/sync/history", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const syncHistory = await storage.getSyncHistoryByUserId(user.id);
      return res.json({ syncHistory });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Fetch all songs from all connected platforms
  app.post("/api/import-all-songs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get all connected platforms
      const platforms = await storage.getPlatformsByUserId(user.id);
      const connectedPlatforms = platforms.filter(p => p.isConnected);
      
      if (connectedPlatforms.length === 0) {
        return res.status(400).json({ 
          message: "No connected platforms found" 
        });
      }
      
      const results = [];
      let totalImported = 0;
      
      // For each connected platform, fetch songs
      for (const platform of connectedPlatforms) {
        let platformSongs = [];
        
        // Use the appropriate service to fetch songs
        switch (platform.type) {
          case 'spotify':
            platformSongs = await spotifyService.getLikedSongs(platform);
            break;
          case 'apple_music':
            platformSongs = await appleMusicService.getLikedSongs(platform);
            break;
          case 'soundcloud':
            platformSongs = await soundcloudService.getLikedSongs(platform);
            break;
          default:
            continue; // Skip unknown platforms
        }
        
        // Get existing songs for this user
        const existingSongs = await storage.getSongsByUserId(user.id);
        let importedCount = 0;
        
        // Import each song if it doesn't already exist
        for (const song of platformSongs) {
          // Check if the song already exists (by title and artist)
          const exists = existingSongs.some(s => 
            s.title.toLowerCase() === song.title.toLowerCase() && 
            s.artist.toLowerCase() === song.artist.toLowerCase() &&
            (s.platforms as any).includes(platform.id)
          );
          
          if (!exists) {
            // Add the song to our database
            await storage.createSong({
              userId: user.id,
              title: song.title,
              artist: song.artist,
              album: song.album || null,
              albumCover: song.albumCover || null,
              platforms: [platform.id]
            });
            
            importedCount++;
            totalImported++;
          }
        }
        
        results.push({
          platformType: platform.type,
          songsImported: importedCount,
          totalSongs: platformSongs.length
        });
      }
      
      return res.json({
        message: "Songs imported successfully",
        totalImported,
        results
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Comparison routes for missing songs
  app.get("/api/songs/missing", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get all platforms
      const platforms = await storage.getPlatformsByUserId(user.id);
      const connectedPlatforms = platforms.filter(p => p.isConnected);
      
      if (connectedPlatforms.length < 2) {
        return res.status(400).json({ 
          message: "Need at least 2 connected platforms to compare" 
        });
      }
      
      // Get all songs
      const allSongs = await storage.getSongsByUserId(user.id);
      
      // Calculate missing songs for each platform
      const missingSongs = connectedPlatforms.map(platform => {
        const platformId = platform.id;
        const songsNotInPlatform = allSongs.filter(
          song => !(song.platforms as number[]).includes(platformId)
        );
        
        return {
          platformId,
          platformType: platform.type,
          songs: songsNotInPlatform
        };
      });
      
      return res.json({ missingSongs });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Fetch songs from all or specific platform
  app.get("/api/platforms/songs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { platform: platformType } = req.query;
      
      console.log('User requesting songs:', user?.id);
      
      const platforms = await storage.getPlatformsByUserId(user.id);
      console.log('User platforms:', platforms);
      
      let targetPlatforms = platforms.filter(p => p.isConnected);
      console.log('Connected platforms:', targetPlatforms);
      
      if (platformType && platformType !== 'all') {
        targetPlatforms = targetPlatforms.filter(p => p.type === platformType);
      }
      
      if (targetPlatforms.length === 0) {
        console.log('No connected platforms found');
        return res.json({ songs: [] });
      }
      
      const songs: Array<{
        title: string;
        artist: string;
        album: string | null;
        albumCover: string | null;
        platformId: number;
        externalId: string;
        addedAt: string;
        platform: string;
      }> = [];
      
      for (const platform of targetPlatforms) {
        try {
          console.log(`Fetching songs from ${platform.type}...`);
          const platformSongs = await (async () => {
            switch (platform.type) {
              case 'spotify':
                return await spotifyService.getLikedSongs(platform);
              case 'apple_music':
                return await appleMusicService.getLikedSongs(platform);
              case 'soundcloud':
                return await soundcloudService.getLikedSongs(platform);
              default:
                return [];
            }
          })();
          
          console.log(`Got ${platformSongs.length} songs from ${platform.type}`);
          
          songs.push(
            ...platformSongs.map(song => ({
              ...song,
              platform: platform.type
            }))
          );
        } catch (error) {
          console.error(`Error fetching songs from ${platform.type}:`, error);
        }
      }
      
      songs.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      console.log(`Returning ${songs.length} total songs`);
      
      return res.json({ songs });
    } catch (error) {
      console.error('Error fetching songs:', error);
      return res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Spotify API routes
  router.get('/spotify/playlists', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userPlatforms = await storage.getPlatformsByUserId(userId);
      const spotifyPlatform = userPlatforms.find(p => p.type === 'spotify');
      
      if (!spotifyPlatform) {
        return res.status(404).json({ error: 'Spotify not connected' });
      }

      const playlists = await spotifyService.getPlaylists();
      res.json(playlists);
    } catch (error) {
      log(`Error fetching Spotify playlists: ${error}`);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  });

  router.post('/spotify/playlists', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, description, isPublic } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Playlist name is required' });
      }

      const userPlatforms = await storage.getPlatformsByUserId(userId);
      const spotifyPlatform = userPlatforms.find(p => p.type === 'spotify');
      
      if (!spotifyPlatform) {
        return res.status(404).json({ error: 'Spotify not connected' });
      }

      const playlist = await spotifyService.createPlaylist(
        name,
        description || '',
        isPublic ?? true
      );
      res.json(playlist);
    } catch (error) {
      log(`Error creating Spotify playlist: ${error}`);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  });

  router.post('/spotify/playlists/:playlistId/tracks', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { playlistId } = req.params;
      const { trackUris } = req.body;
      
      if (!Array.isArray(trackUris) || trackUris.length === 0) {
        return res.status(400).json({ error: 'Track URIs are required' });
      }

      const userPlatforms = await storage.getPlatformsByUserId(userId);
      const spotifyPlatform = userPlatforms.find(p => p.type === 'spotify');
      
      if (!spotifyPlatform) {
        return res.status(404).json({ error: 'Spotify not connected' });
      }

      await spotifyService.addTracksToPlaylist(playlistId, trackUris);
      res.json({ success: true });
    } catch (error) {
      log(`Error adding tracks to Spotify playlist: ${error}`);
      res.status(500).json({ error: 'Failed to add tracks to playlist' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

export default router;
