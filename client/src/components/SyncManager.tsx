import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlatforms, syncLibraries, importAllSongs } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const platformIcons = {
  spotify: <SiSpotify className="h-5 w-5 text-green-500" />,
  apple_music: <SiApplemusic className="h-5 w-5 text-pink-500" />,
  soundcloud: <SiSoundcloud className="h-5 w-5 text-orange-500" />,
};

const platformLabels = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
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

export function SyncManager() {
  const [sourcePlatform, setSourcePlatform] = useState<string>('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/platforms'],
    queryFn: getPlatforms
  });

  const platforms = data?.platforms || [];
  const connectedPlatforms = platforms.filter((p: Platform) => p.isConnected);

  const handleTargetPlatformChange = (type: string) => {
    setTargetPlatforms(prev => {
      if (prev.includes(type)) {
        return prev.filter(p => p !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleSync = async () => {
    if (!sourcePlatform) {
      toast({
        title: "Error",
        description: "Please select a source platform",
        variant: "destructive",
      });
      return;
    }

    if (targetPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one target platform",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);
      
      await syncLibraries({
        sourcePlatform,
        targetPlatforms,
      });
      
      toast({
        title: "Success",
        description: "Music libraries synchronized successfully",
      });
      
      // Invalidate songs queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to synchronize music libraries",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportAll = async () => {
    try {
      setIsImporting(true);
      
      const result = await importAllSongs();
      
      toast({
        title: "Success",
        description: `Imported ${result.totalImported} songs from your connected platforms`,
      });
      
      // Invalidate songs queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import songs",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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

  if (connectedPlatforms.length < 2) {
    return (
      <Alert className="mb-6 bg-yellow-500/10 text-yellow-600 border-yellow-500/50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not enough connected platforms</AlertTitle>
        <AlertDescription>
          You need at least two connected music platforms to synchronize your libraries.
          Please connect more platforms to use this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Import All Songs</CardTitle>
          <CardDescription>
            First, import your music from all connected platforms. 
            This will fetch all your liked songs and save them to Musync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will import your songs from all connected platforms without synchronizing them.
            Use this to get started before syncing your libraries.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={handleImportAll}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import All Songs
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sync Libraries</CardTitle>
          <CardDescription>
            Choose which platforms to sync and where to sync from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Source Platform
            </label>
            <Select 
              value={sourcePlatform} 
              onValueChange={setSourcePlatform}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a source platform" />
              </SelectTrigger>
              <SelectContent>
                {connectedPlatforms.map((platform: Platform) => (
                  <SelectItem key={platform.id} value={platform.type}>
                    <div className="flex items-center">
                      {platformIcons[platform.type as keyof typeof platformIcons]}
                      <span className="ml-2">{platformLabels[platform.type as keyof typeof platformLabels]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This is where we'll get the songs to sync from
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Target Platforms
            </label>
            <div className="space-y-2 mt-2">
              {connectedPlatforms
                .filter((platform: Platform) => platform.type !== sourcePlatform)
                .map((platform: Platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`platform-${platform.id}`}
                      checked={targetPlatforms.includes(platform.type)}
                      onCheckedChange={() => handleTargetPlatformChange(platform.type)}
                    />
                    <label 
                      htmlFor={`platform-${platform.id}`}
                      className="flex items-center text-sm font-medium leading-none"
                    >
                      {platformIcons[platform.type as keyof typeof platformIcons]}
                      <span className="ml-2">{platformLabels[platform.type as keyof typeof platformLabels]}</span>
                    </label>
                  </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These are the platforms where songs will be added
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={handleSync}
            disabled={isSyncing || !sourcePlatform || targetPlatforms.length === 0}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Libraries'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}