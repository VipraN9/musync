import { createContext, useContext, useState, ReactNode } from 'react';

type Platform = {
  id: number;
  userId: number;
  type: string;
  isConnected: boolean;
};

type Song = {
  id: number;
  userId: number;
  title: string;
  artist: string;
  album?: string;
  albumCover?: string;
  platforms: number[];
  addedAt: string;
};

type MusicContextType = {
  platforms: Platform[];
  songs: Song[];
  setPlatforms: (platforms: Platform[]) => void;
  setSongs: (songs: Song[]) => void;
  addSong: (song: Song) => void;
  updateSongPlatforms: (songId: number, platforms: number[]) => void;
};

const MusicContext = createContext<MusicContextType>({
  platforms: [],
  songs: [],
  setPlatforms: () => {},
  setSongs: () => {},
  addSong: () => {},
  updateSongPlatforms: () => {},
});

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);

  const addSong = (song: Song) => {
    setSongs((prevSongs) => [song, ...prevSongs]);
  };

  const updateSongPlatforms = (songId: number, platformIds: number[]) => {
    setSongs((prevSongs) =>
      prevSongs.map((song) =>
        song.id === songId ? { ...song, platforms: platformIds } : song
      )
    );
  };

  return (
    <MusicContext.Provider value={{ platforms, songs, setPlatforms, setSongs, addSong, updateSongPlatforms }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
