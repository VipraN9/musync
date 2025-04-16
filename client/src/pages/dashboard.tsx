import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/store/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PlatformManager } from '@/components/PlatformManager';
import { SyncManager } from '@/components/SyncManager';
import { SongLibrary } from '@/components/SongLibrary';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout: logoutUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('library');

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      setLocation('/signup');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-8 rounded-lg shadow-lg bg-card">
          <h1 className="text-2xl font-bold text-center mb-4">Please log in</h1>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to view this page.
          </p>
          <Button
            onClick={() => setLocation('/signup')}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold gradient-text-musync">Musync</h1>
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h2 className="text-xl font-medium">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Hello, <span className="font-medium text-foreground">{user.fullName}</span>
            </p>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <Tabs 
          defaultValue="library" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="library">Music Library</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Your Music Library</h2>
                <p className="text-muted-foreground">
                  View and manage all your music across different platforms
                </p>
              </div>
            </div>
            <Separator />
            <SongLibrary />
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Connected Platforms</h2>
              <p className="text-muted-foreground">
                Manage your connected music streaming services
              </p>
            </div>
            <Separator />
            <PlatformManager />
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Sync Manager</h2>
              <p className="text-muted-foreground">
                Synchronize your music between different platforms
              </p>
            </div>
            <Separator />
            <SyncManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}