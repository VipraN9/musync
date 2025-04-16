import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PlatformBadge from './platform-badge';
import { SiSpotify, SiApplemusic, SiSoundcloud } from 'react-icons/si';
import { AlertCircle, Search, Music } from 'lucide-react';
import axios from 'axios';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  albumCover: string | null;
  platform: string;
  addedAt: string;
}

interface Platform {
  id: number;
  type: string;
  isConnected: boolean;
  userId: number;
  connectedAt?: string;
}

export function SongLibrary() {
  const [filter, setFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const { toast } = useToast();

  const { data: platformsData, isLoading: platformsLoading, error: platformsError } = useQuery({
    queryKey: ['/api/platforms'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/platforms');
        console.log('Platforms response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching platforms:', error);
        throw error;
      }
    }
  });

  const platforms = platformsData?.platforms || [];
  const connectedPlatforms = platforms.filter((p: Platform) => p.isConnected);
  console.log('Connected platforms:', connectedPlatforms);

  const { data: songsData, isLoading: songsLoading, error: songsError } = useQuery({
    queryKey: ['/api/platforms/songs', platformFilter],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/platforms/songs', {
          params: platformFilter !== 'all' ? { platform: platformFilter } : {}
        });
        console.log('Songs response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching songs:', error);
        throw error;
      }
    },
    enabled: connectedPlatforms.length > 0
  });

  // Show error states
  if (platformsError || songsError) {
    const error = platformsError || songsError;
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load data. Please try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Show loading state
  if (platformsLoading || songsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search by title or artist"
            disabled
            className="max-w-sm"
          />
          <Select disabled>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square relative animate-pulse bg-muted" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const songs = songsData?.songs || [];

  // Filter songs by title or artist
  const filteredSongs = filter 
    ? songs.filter((song: Song) => 
        song.title.toLowerCase().includes(filter.toLowerCase()) || 
        song.artist.toLowerCase().includes(filter.toLowerCase())
      )
    : songs;

  // Show empty state
  if (filteredSongs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search by title or artist"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {connectedPlatforms.map((platform: Platform) => (
                <SelectItem key={platform.id} value={platform.type}>
                  {platform.type === 'spotify' ? 'Spotify' : 
                   platform.type === 'apple_music' ? 'Apple Music' : 
                   platform.type === 'soundcloud' ? 'SoundCloud' : platform.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="text-center p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Music className="h-12 w-12 text-muted-foreground" />
            <CardTitle>No liked songs found</CardTitle>
            <CardDescription>
              {filter || platformFilter !== 'all'
                ? "Try adjusting your filters or search term."
                : connectedPlatforms.length === 0
                  ? "Connect to your music platforms to see your liked songs."
                  : "Your liked songs will appear here once you've imported them. Click the Import button above to get started."}
            </CardDescription>
            {connectedPlatforms.length > 0 && !filter && platformFilter === 'all' && (
              <Button
                onClick={async () => {
                  try {
                    await axios.post('/api/import-all-songs');
                    toast({
                      title: "Import started",
                      description: "Your songs are being imported. This may take a few moments.",
                    });
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Import failed",
                      description: "Failed to import songs. Please try again.",
                    });
                  }
                }}
              >
                Import Songs
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or artist"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {connectedPlatforms.map((platform: Platform) => (
                <SelectItem key={platform.id} value={platform.type}>
                  {platform.type === 'spotify' ? 'Spotify' : 
                   platform.type === 'apple_music' ? 'Apple Music' : 
                   platform.type === 'soundcloud' ? 'SoundCloud' : platform.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredSongs.length} liked songs
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSongs.map((song: Song) => (
          <Card key={song.id} className="overflow-hidden">
            <div className="aspect-square relative">
              {song.albumCover ? (
                <img
                  src={song.albumCover}
                  alt={`${song.album || song.title} cover`}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Music className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <PlatformBadge type={song.platform} />
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold truncate" title={song.title}>{song.title}</h3>
              <p className="text-sm text-muted-foreground truncate" title={song.artist}>{song.artist}</p>
              {song.album && (
                <p className="text-sm text-muted-foreground truncate" title={song.album}>{song.album}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Added {new Date(song.addedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}