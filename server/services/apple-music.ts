import axios from 'axios';
import { storage } from '../storage';
import { Platform, InsertPlatform } from '../../shared/schema';

const APPLE_MUSIC_API_URL = 'https://api.music.apple.com/v1';

class AppleMusicService {
  private developerToken: string;

  constructor() {
    this.developerToken = process.env.APPLE_MUSIC_DEVELOPER_TOKEN || '';
    
    if (!this.developerToken) {
      console.error('Apple Music API credentials are missing');
    }
  }

  /**
   * Connect to Apple Music API with the provided user token
   */
  async connect(userId: number, userToken: string): Promise<Platform> {
    // Check if the user already has an Apple Music platform connection
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const existingPlatform = userPlatforms.find(p => p.type === 'apple_music');
    
    if (existingPlatform) {
      // Update the existing platform
      return await storage.updatePlatform(existingPlatform.id, {
        accessToken: userToken,
        isConnected: true
      });
    }
    
    // Create a new platform connection
    return await storage.createPlatform({
      userId,
      type: 'apple_music',
      accessToken: userToken,
      isConnected: true
    } as InsertPlatform);
  }

  /**
   * Disconnect from Apple Music API
   */
  async disconnect(userId: number): Promise<void> {
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const appleMusicPlatform = userPlatforms.find(p => p.type === 'apple_music');
    
    if (appleMusicPlatform) {
      await storage.updatePlatform(appleMusicPlatform.id, {
        isConnected: false
      });
    }
  }

  /**
   * Fetch the user's library from Apple Music
   */
  async getLikedSongs(platform: Platform): Promise<any[]> {
    try {
      const userToken = platform.accessToken;
      
      // Make sure we have a valid user token
      if (!userToken) {
        throw new Error('No user token available for Apple Music');
      }
      
      // Function to fetch a single page of library songs
      const fetchPage = async (url: string) => {
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${this.developerToken}`,
              'Music-User-Token': userToken
            }
          });
          return response.data;
        } catch (error) {
          console.error('Error fetching Apple Music library page:', error);
          throw error;
        }
      };
      
      // Fetch first page of library
      const firstPage = await fetchPage(`${APPLE_MUSIC_API_URL}/me/library/songs?limit=100`);
      
      let tracks = firstPage.data;
      let nextUrl = firstPage.next;
      
      // Fetch remaining pages
      while (nextUrl) {
        const nextPage = await fetchPage(nextUrl);
        tracks = [...tracks, ...nextPage.data];
        nextUrl = nextPage.next;
      }
      
      // Transform to common format
      return tracks.map((item: any) => ({
        title: item.attributes.name,
        artist: item.attributes.artistName,
        album: item.attributes.albumName,
        albumCover: item.attributes.artwork?.url.replace('{w}', '500').replace('{h}', '500'),
        platformId: platform.id,
        externalId: item.id,
        addedAt: new Date(item.attributes.dateAdded).toISOString()
      }));
    } catch (error) {
      console.error('Failed to fetch Apple Music library:', error);
      throw new Error('Failed to fetch Apple Music library');
    }
  }

  /**
   * Add a song to the user's Apple Music library
   */
  async addSongToLibrary(platform: Platform, songExternalId: string): Promise<boolean> {
    try {
      const userToken = platform.accessToken;
      
      // If no external ID, we can't add the song
      if (!songExternalId) {
        return false;
      }
      
      // Make sure we have a valid user token
      if (!userToken) {
        throw new Error('No user token available for Apple Music');
      }
      
      // Add the track to the user's Apple Music library
      await axios.post(`${APPLE_MUSIC_API_URL}/me/library`, {
        ids: [songExternalId],
        type: 'songs'
      }, {
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': userToken,
          'Content-Type': 'application/json'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add song to Apple Music library:', error);
      return false;
    }
  }

  /**
   * Search for a song on Apple Music
   */
  async searchSong(platform: Platform, query: string): Promise<any> {
    try {
      const userToken = platform.accessToken;
      
      // Make sure we have a valid user token
      if (!userToken) {
        throw new Error('No user token available for Apple Music');
      }
      
      // Search for the track
      const response = await axios.get(`${APPLE_MUSIC_API_URL}/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=1`, {
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': userToken
        }
      });
      
      if (response.data.results.songs.data.length > 0) {
        const track = response.data.results.songs.data[0];
        return {
          title: track.attributes.name,
          artist: track.attributes.artistName,
          album: track.attributes.albumName,
          albumCover: track.attributes.artwork?.url.replace('{w}', '500').replace('{h}', '500'),
          externalId: track.id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to search Apple Music:', error);
      return null;
    }
  }
}

export const appleMusicService = new AppleMusicService();