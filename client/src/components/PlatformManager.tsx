import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlatforms, disconnectPlatform } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';
import { ConnectPlatformModal } from './ConnectPlatformModal';
import PlatformBadge from './platform-badge';

const platformLabels = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
};

const platformIcons = {
  spotify: <SiSpotify className="h-6 w-6 text-green-500" />,
  apple_music: <SiApplemusic className="h-6 w-6 text-pink-500" />,
  soundcloud: <SiSoundcloud className="h-6 w-6 text-orange-500" />,
};

interface Platform {
  id: number;
  userId: number;
  type: string;
  isConnected: boolean;
  connectedAt?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: string;
}

export function PlatformManager() {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/platforms'],
    queryFn: getPlatforms
  });

  const handleConnect = (type: string) => {
    setConnectingPlatform(type);
  };

  const handleDisconnect = async (type: string) => {
    try {
      await disconnectPlatform(type);
      
      toast({
        title: 'Success',
        description: `Disconnected from ${platformLabels[type as keyof typeof platformLabels]}`,
      });
      
      // Invalidate the platforms query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to disconnect from ${platformLabels[type as keyof typeof platformLabels]}`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40">Loading platforms...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-red-500">Error loading platforms</p>
      </div>
    );
  }

  const platforms = data?.platforms || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform: Platform) => (
          <Card key={platform.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {platformIcons[platform.type as keyof typeof platformIcons]}
                <CardTitle className="text-xl">
                  {platformLabels[platform.type as keyof typeof platformLabels]}
                </CardTitle>
              </div>
              <Badge
                variant={platform.isConnected ? "default" : "outline"}
                className={platform.isConnected ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {platform.isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </CardHeader>
            
            <CardContent>
              <CardDescription className="mt-2">
                {platform.isConnected
                  ? `Connected since ${platform.connectedAt ? new Date(platform.connectedAt).toLocaleDateString() : 'recently'}`
                  : `Not connected to ${platformLabels[platform.type as keyof typeof platformLabels]}`}
              </CardDescription>
            </CardContent>
            
            <CardFooter>
              {platform.isConnected ? (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleDisconnect(platform.type)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => handleConnect(platform.type)}
                >
                  Connect
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Connect Platform Modal */}
      {connectingPlatform && (
        <ConnectPlatformModal
          type={connectingPlatform as 'spotify' | 'apple_music' | 'soundcloud'}
          isOpen={!!connectingPlatform}
          onClose={() => setConnectingPlatform(null)}
        />
      )}
    </div>
  );
}