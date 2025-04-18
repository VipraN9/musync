import { log } from "../vite";
import axios from 'axios';
import { storage } from '../storage';
import { Platform, InsertPlatform } from '../../shared/schema';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export class SpotifyService {
  private static instance: SpotifyService;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://musync-sable.vercel.app/auth/spotify/callback'
      : 'http://localhost:3000/auth/spotify/callback';

    if (!this.clientId || !this.clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Missing Spotify API credentials');
        process.exit(1);
      } else {
        console.warn('Missing Spotify API credentials. Spotify features will be disabled.');
      }
    }
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  public getAuthUrl(state: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-modify-private',
      'playlist-modify-public'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  public async handleCallback(code: string): Promise<void> {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      log('Successfully authenticated with Spotify');
    } catch (error) {
      log(`Error during Spotify authentication: ${error}`);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(SPOTIFY_TOKEN_URL, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }
    } catch (error) {
      log(`Error refreshing Spotify token: ${error}`);
      throw error;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  private async makeRequest<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    await this.ensureValidToken();
    
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
    const response = await axios({
      method,
      url: `${SPOTIFY_API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  public async searchTracks(query: string): Promise<any> {
    return this.makeRequest(`/search?q=${encodeURIComponent(query)}&type=track`);
  }

  public async getPlaylists(): Promise<any> {
    return this.makeRequest('/me/playlists');
  }

  public async createPlaylist(name: string, description: string, isPublic: boolean): Promise<any> {
    const user = await this.makeRequest<{ id: string }>('/me');
    return this.makeRequest(`/users/${user.id}/playlists`, 'POST', {
      name,
      description,
      public: isPublic
    });
  }

  public async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<any> {
    return this.makeRequest(`/playlists/${playlistId}/tracks`, 'POST', {
      uris: trackUris
    });
  }

  /**
   * Connect to Spotify API with the provided access and refresh tokens
   */
  async connect(userId: number, accessToken: string, refreshToken: string): Promise<Platform> {
    if (!accessToken || !refreshToken) {
      throw new Error('Access token and refresh token are required');
    }

    // Check if the user already has a Spotify platform connection
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const existingPlatform = userPlatforms.find(p => p.type === 'spotify');
    
    if (existingPlatform) {
      // Update the existing platform
      return await storage.updatePlatform(existingPlatform.id, {
        accessToken,
        refreshToken,
        isConnected: true
      });
    }
    
    // Create a new platform connection
    return await storage.createPlatform({
      userId,
      type: 'spotify',
      accessToken,
      refreshToken,
      isConnected: true
    } as InsertPlatform);
  }

  /**
   * Disconnect from Spotify API
   */
  async disconnect(userId: number): Promise<void> {
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const spotifyPlatform = userPlatforms.find(p => p.type === 'spotify');
    
    if (spotifyPlatform) {
      await storage.updatePlatform(spotifyPlatform.id, {
        isConnected: false
      });
    }
  }

  /**
   * Get a new access token using the refresh token
   */
  async refreshAccessTokenForUser(userRefreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    if (!userRefreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      const tokenData = new URLSearchParams();
      tokenData.append('grant_type', 'refresh_token');
      tokenData.append('refresh_token', userRefreshToken);
      
      const response = await axios.post(SPOTIFY_TOKEN_URL, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || userRefreshToken
      };
    } catch (error) {
      console.error('Failed to refresh Spotify access token:', error);
      throw new Error('Failed to refresh Spotify access token');
    }
  }

  /**
   * Fetch the user's liked songs from Spotify
   */
  async getLikedSongs(platform: Platform): Promise<any[]> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Spotify');
      }

      let accessToken = platform.accessToken;
      
      // Function to fetch a single page of liked songs
      const fetchPage = async (url: string, token: string) => {
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return response.data;
        } catch (error: any) {
          // If token expired, refresh and try again
          if (error.response && error.response.status === 401 && platform.refreshToken) {
            const tokens = await this.refreshAccessTokenForUser(platform.refreshToken);
            
            // Update platform with new tokens
            await storage.updatePlatform(platform.id, {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken
            });
            
            // Retry with new token
            const retryResponse = await axios.get(url, {
              headers: {
                'Authorization': `Bearer ${tokens.accessToken}`
              }
            });
            return retryResponse.data;
          }
          throw error;
        }
      };
      
      // Fetch first page of liked songs
      const firstPage = await fetchPage(`${SPOTIFY_API_URL}/me/tracks?limit=50`, accessToken);
      
      let tracks = firstPage.items;
      let nextUrl = firstPage.next;
      
      // Fetch remaining pages
      while (nextUrl) {
        const nextPage = await fetchPage(nextUrl, accessToken);
        tracks = [...tracks, ...nextPage.items];
        nextUrl = nextPage.next;
      }
      
      // Transform to common format
      return tracks.map((item: any) => ({
        title: item.track.name,
        artist: item.track.artists.map((a: any) => a.name).join(', '),
        album: item.track.album.name,
        albumCover: item.track.album.images[0]?.url,
        platformId: platform.id,
        externalId: item.track.id,
        addedAt: new Date(item.added_at).toISOString()
      }));
    } catch (error) {
      console.error('Failed to fetch Spotify liked songs:', error);
      throw new Error('Failed to fetch Spotify liked songs');
    }
  }

  /**
   * Add a song to the user's Spotify library
   */
  async addSongToLibrary(platform: Platform, songExternalId: string): Promise<boolean> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Spotify');
      }

      if (!songExternalId) {
        return false;
      }

      let accessToken = platform.accessToken;
      
      // Add the track to the user's Spotify library
      await axios.put(`${SPOTIFY_API_URL}/me/tracks?ids=${songExternalId}`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return true;
    } catch (error: any) {
      // If token expired, refresh and try again
      if (error.response && error.response.status === 401 && platform.refreshToken) {
        try {
          const tokens = await this.refreshAccessTokenForUser(platform.refreshToken);
          
          // Update platform with new tokens
          await storage.updatePlatform(platform.id, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          });
          
          // Retry with new token
          await axios.put(`${SPOTIFY_API_URL}/me/tracks?ids=${songExternalId}`, {}, {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          return true;
        } catch (retryError) {
          console.error('Failed to add song to Spotify library after token refresh:', retryError);
          return false;
        }
      }
      
      console.error('Failed to add song to Spotify library:', error);
      return false;
    }
  }

  /**
   * Search for a song on Spotify
   */
  async searchSong(platform: Platform, query: string): Promise<any> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Spotify');
      }

      let accessToken = platform.accessToken;
      
      // Search for the track
      const response = await axios.get(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.data.tracks.items.length > 0) {
        const track = response.data.tracks.items[0];
        return {
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album.name,
          albumCover: track.album.images[0]?.url,
          externalId: track.id
        };
      }
      
      return null;
    } catch (error: any) {
      // If token expired, refresh and try again
      if (error.response && error.response.status === 401 && platform.refreshToken) {
        try {
          const tokens = await this.refreshAccessTokenForUser(platform.refreshToken);
          
          // Update platform with new tokens
          await storage.updatePlatform(platform.id, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          });
          
          // Retry with new token
          const retryResponse = await axios.get(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`
            }
          });
          
          if (retryResponse.data.tracks.items.length > 0) {
            const track = retryResponse.data.tracks.items[0];
            return {
              title: track.name,
              artist: track.artists.map((a: any) => a.name).join(', '),
              album: track.album.name,
              albumCover: track.album.images[0]?.url,
              externalId: track.id
            };
          }
          
          return null;
        } catch (retryError) {
          console.error('Failed to search Spotify after token refresh:', retryError);
          return null;
        }
      }
      
      console.error('Failed to search Spotify:', error);
      return null;
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }
}