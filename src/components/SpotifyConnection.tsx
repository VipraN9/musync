import React from 'react';
import { Button } from './ui/button';

export const SpotifyConnection: React.FC = () => {
  const handleConnect = () => {
    window.location.href = '/auth/spotify';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold">Connect Spotify</h2>
      <p className="text-gray-600">
        Connect your Spotify account to sync playlists and tracks
      </p>
      <Button onClick={handleConnect} className="bg-green-500 hover:bg-green-600">
        Connect with Spotify
      </Button>
    </div>
  );
}; 