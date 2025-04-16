import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumCover?: string;
  platform: string;
  addedAt: string;
}

export function MusicLibrary() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Fetch liked songs from all platforms
  const { data: songs, isLoading, error } = useQuery<Song[]>({
    queryKey: ['liked-songs'],
    queryFn: async () => {
      const response = await fetch('/api/platforms/songs');
      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your music library',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const platformIcons = {
    spotify: <SiSpotify className="h-5 w-5 text-green-500" />,
    apple_music: <SiApplemusic className="h-5 w-5 text-pink-500" />,
    soundcloud: <SiSoundcloud className="h-5 w-5 text-orange-500" />,
  };

  const filteredSongs = activeTab === 'all' 
    ? songs 
    : songs?.filter(song => song.platform === activeTab);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Platforms</TabsTrigger>
          <TabsTrigger value="spotify" className="flex items-center gap-2">
            <SiSpotify /> Spotify
          </TabsTrigger>
          <TabsTrigger value="apple_music" className="flex items-center gap-2">
            <SiApplemusic /> Apple Music
          </TabsTrigger>
          <TabsTrigger value="soundcloud" className="flex items-center gap-2">
            <SiSoundcloud /> SoundCloud
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs?.map((song) => (
              <Card key={song.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  {song.albumCover ? (
                    <img 
                      src={song.albumCover} 
                      alt={`${song.album} cover`} 
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No Cover</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold truncate">{song.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{song.artist}</p>
                      <p className="text-xs text-gray-400 mt-1">{song.album}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {platformIcons[song.platform as keyof typeof platformIcons]}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Added {new Date(song.addedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSongs?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No songs found in your library</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 