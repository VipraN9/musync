import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Signup from "@/pages/signup";
import ConnectServices from "@/pages/connect-services";
import Dashboard from "@/pages/dashboard";
import { AuthProvider } from "@/store/auth-store.tsx";
import { MusicProvider } from "@/store/music-store.tsx";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Signup} />
      <Route path="/connect-services" component={ConnectServices} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MusicProvider>
          <Router />
          <Toaster />
        </MusicProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
