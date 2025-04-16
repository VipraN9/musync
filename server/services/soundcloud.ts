import { log } from "../vite";
import axios from 'axios';
import { storage } from '../storage';
import { Platform, InsertPlatform } from '../../shared/schema';

const SOUNDCLOUD_API_URL = 'https://api.soundcloud.com';
const SOUNDCLOUD_AUTH_URL = 'https://soundcloud.com/connect';
const SOUNDCLOUD_TOKEN_URL = 'https://api.soundcloud.com/oauth2/token';

export class SoundCloudService {
  private static instance: SoundCloudService;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {
    this.clientId = process.env.SOUNDCLOUD_CLIENT_ID || '';
    this.clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET || '';
    this.redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://musync.vercel.app/auth/soundcloud/callback'
      : 'http://localhost:3000/auth/soundcloud/callback';

    if (!this.clientId || !this.clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Missing SoundCloud API credentials');
        process.exit(1);
      } else {
        console.warn('Missing SoundCloud API credentials. SoundCloud features will be disabled.');
      }
    }
  }

  public static getInstance(): SoundCloudService {
    if (!SoundCloudService.instance) {
      SoundCloudService.instance = new SoundCloudService();
    }
    return SoundCloudService.instance;
  }

  public getAuthUrl(state: string): string {
    const scopes = [
      'non-expiring',
      'liking',
      'playlist-read-private',
      'playlist-modify-private'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
      display: 'popup'
    });

    return `https://soundcloud.com/connect?${params.toString()}`;
  }

  public async handleCallback(code: string): Promise<void> {
    try {
      const response = await axios.post('https://api.soundcloud.com/oauth2/token', new URLSearchParams({
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
      log('Successfully authenticated with SoundCloud');
    } catch (error) {
      log(`Error during SoundCloud authentication: ${error}`);
      throw error;
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(SOUNDCLOUD_TOKEN_URL, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }
    } catch (error) {
      log(`Error refreshing SoundCloud token: ${error}`);
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
      url: `${SOUNDCLOUD_API_URL}${endpoint}`,
      headers: {
        'Authorization': `OAuth ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  public async searchTracks(query: string): Promise<any> {
    return this.makeRequest(`/tracks?q=${encodeURIComponent(query)}`);
  }

  public async getPlaylists(): Promise<any> {
    return this.makeRequest('/me/playlists');
  }

  public async createPlaylist(name: string, description: string, isPublic: boolean): Promise<any> {
    return this.makeRequest('/playlists', 'POST', {
      playlist: {
        title: name,
        description,
        sharing: isPublic ? 'public' : 'private'
      }
    });
  }

  public async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<any> {
    return this.makeRequest(`/playlists/${playlistId}`, 'PUT', {
      playlist: {
        tracks: trackUris.map(uri => ({ id: uri }))
      }
    });
  }

  async connect(userId: number, accessToken: string, refreshToken: string): Promise<Platform> {
    if (!accessToken || !refreshToken) {
      throw new Error('Access token and refresh token are required');
    }

    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const existingPlatform = userPlatforms.find(p => p.type === 'soundcloud');
    
    if (existingPlatform) {
      return await storage.updatePlatform(existingPlatform.id, {
        accessToken,
        refreshToken,
        isConnected: true
      });
    }
    
    return await storage.createPlatform({
      userId,
      type: 'soundcloud',
      accessToken,
      refreshToken,
      isConnected: true
    } as InsertPlatform);
  }

  async disconnect(userId: number): Promise<void> {
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const soundcloudPlatform = userPlatforms.find(p => p.type === 'soundcloud');
    
    if (soundcloudPlatform) {
      await storage.updatePlatform(soundcloudPlatform.id, {
        isConnected: false
      });
    }
  }

  async getLikedSongs(platform: Platform): Promise<any[]> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for SoundCloud');
      }

      const response = await axios.get(`${SOUNDCLOUD_API_URL}/me/favorites`, {
        headers: {
          'Authorization': `OAuth ${platform.accessToken}`
        }
      });

      return response.data.map((item: any) => ({
        title: item.title,
        artist: item.user.username,
        album: item.genre || 'Unknown',
        albumCover: item.artwork_url,
        platformId: platform.id,
        externalId: item.id.toString(),
        addedAt: new Date(item.created_at).toISOString()
      }));
    } catch (error) {
      console.error('Failed to fetch SoundCloud liked songs:', error);
      throw new Error('Failed to fetch SoundCloud liked songs');
    }
  }

  async addSongToLibrary(platform: Platform, songExternalId: string): Promise<boolean> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for SoundCloud');
      }

      if (!songExternalId) {
        return false;
      }

      await axios.put(`${SOUNDCLOUD_API_URL}/me/favorites/${songExternalId}`, null, {
        headers: {
          'Authorization': `OAuth ${platform.accessToken}`
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add song to SoundCloud favorites:', error);
      return false;
    }
  }

  async searchSong(platform: Platform, query: string): Promise<any> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for SoundCloud');
      }

      const response = await axios.get(`${SOUNDCLOUD_API_URL}/tracks?q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          'Authorization': `OAuth ${platform.accessToken}`
        }
      });
      
      if (response.data.length > 0) {
        const song = response.data[0];
        return {
          title: song.title,
          artist: song.user.username,
          album: song.genre || 'Unknown',
          albumCover: song.artwork_url,
          externalId: song.id.toString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to search SoundCloud:', error);
      return null;
    }
  }
}