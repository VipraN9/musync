import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { connectPlatform } from '@/lib/api';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';

interface ConnectPlatformModalProps {
  type: 'spotify' | 'apple_music' | 'soundcloud';
  isOpen: boolean;
  onClose: () => void;
}

const platformLabels = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
};

const platformIcons = {
  spotify: <SiSpotify className="h-10 w-10 text-green-500" />,
  apple_music: <SiApplemusic className="h-10 w-10 text-pink-500" />,
  soundcloud: <SiSoundcloud className="h-10 w-10 text-orange-500" />,
};

const platformDescriptions = {
  spotify: 'Connect your Spotify account to sync and manage your music library',
  apple_music: 'Connect your Apple Music account to sync your music library across platforms',
  soundcloud: 'Connect your SoundCloud account to sync your liked tracks to other platforms',
};

export function ConnectPlatformModal({ type, isOpen, onClose }: ConnectPlatformModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get the auth URL from the backend
      const response = await fetch('/api/platforms/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get authorization URL');
      }

      // Redirect to the auth URL
      window.location.href = data.authUrl;
      
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect to ${platformLabels[type]}`,
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {platformIcons[type]}
            <DialogTitle>Connect to {platformLabels[type]}</DialogTitle>
          </div>
          <DialogDescription>
            {platformDescriptions[type]}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p>Click connect to authorize {platformLabels[type]} access to your music library.</p>
          <p className="text-sm text-gray-500">You will be redirected to {platformLabels[type]} to log in and grant permissions.</p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}