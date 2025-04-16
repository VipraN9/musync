import { log } from "../vite";
import axios from 'axios';
import { storage } from '../storage';
import { Platform, InsertPlatform } from '../../shared/schema';

const APPLE_MUSIC_API_URL = 'https://api.music.apple.com/v1';
const APPLE_MUSIC_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_MUSIC_TOKEN_URL = 'https://appleid.apple.com/auth/token';

export class AppleMusicService {
  private static instance: AppleMusicService;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {
    this.clientId = process.env.APPLE_MUSIC_CLIENT_ID || '';
    this.clientSecret = process.env.APPLE_MUSIC_CLIENT_SECRET || '';
    this.redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://musync.vercel.app/auth/apple-music/callback'
      : 'http://localhost:3000/auth/apple-music/callback';
    
    if (!this.clientId || !this.clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Missing Apple Music API credentials');
        process.exit(1);
      } else {
        console.warn('Missing Apple Music API credentials. Apple Music features will be disabled.');
      }
    }
  }

  public static getInstance(): AppleMusicService {
    if (!AppleMusicService.instance) {
      AppleMusicService.instance = new AppleMusicService();
    }
    return AppleMusicService.instance;
  }

  public getAuthUrl(): string {
    const scopes = [
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-modify-private'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      response_mode: 'form_post'
    });

    return `${APPLE_MUSIC_AUTH_URL}?${params.toString()}`;
  }

  public async handleCallback(code: string): Promise<void> {
    try {
      const response = await axios.post(APPLE_MUSIC_TOKEN_URL, new URLSearchParams({
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
      log('Successfully authenticated with Apple Music');
    } catch (error) {
      log(`Error during Apple Music authentication: ${error}`);
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
      const response = await axios.post(APPLE_MUSIC_TOKEN_URL, new URLSearchParams({
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
      log(`Error refreshing Apple Music token: ${error}`);
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
      url: `${APPLE_MUSIC_API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  public async searchTracks(query: string): Promise<any> {
    return this.makeRequest(`/catalog/us/search?term=${encodeURIComponent(query)}&types=songs`);
  }

  public async getPlaylists(): Promise<any> {
    return this.makeRequest('/me/library/playlists');
  }

  public async createPlaylist(name: string, description: string, isPublic: boolean): Promise<any> {
    return this.makeRequest('/me/library/playlists', 'POST', {
      attributes: {
        name,
        description,
        isPublic
      }
    });
  }

  public async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<any> {
    return this.makeRequest(`/me/library/playlists/${playlistId}/tracks`, 'POST', {
      data: trackUris.map(uri => ({ id: uri }))
    });
  }

  async connect(userId: number, accessToken: string, refreshToken: string): Promise<Platform> {
    if (!accessToken || !refreshToken) {
      throw new Error('Access token and refresh token are required');
    }

    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const existingPlatform = userPlatforms.find(p => p.type === 'apple_music');
    
    if (existingPlatform) {
      return await storage.updatePlatform(existingPlatform.id, {
        accessToken,
        refreshToken,
        isConnected: true
      });
    }
    
    return await storage.createPlatform({
      userId,
      type: 'apple_music',
      accessToken,
      refreshToken,
      isConnected: true
    } as InsertPlatform);
  }

  async disconnect(userId: number): Promise<void> {
    const userPlatforms = await storage.getPlatformsByUserId(userId);
    const appleMusicPlatform = userPlatforms.find(p => p.type === 'apple_music');
    
    if (appleMusicPlatform) {
      await storage.updatePlatform(appleMusicPlatform.id, {
        isConnected: false
      });
    }
  }

  async getLikedSongs(platform: Platform): Promise<any[]> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Apple Music');
      }

      const response = await axios.get(`${APPLE_MUSIC_API_URL}/me/library/songs`, {
        headers: {
          'Authorization': `Bearer ${platform.accessToken}`
        }
      });

      return response.data.data.map((item: any) => ({
        title: item.attributes.name,
        artist: item.attributes.artistName,
        album: item.attributes.albumName,
        albumCover: item.attributes.artwork?.url,
        platformId: platform.id,
        externalId: item.id,
        addedAt: new Date(item.attributes.dateAdded).toISOString()
      }));
    } catch (error) {
      console.error('Failed to fetch Apple Music liked songs:', error);
      throw new Error('Failed to fetch Apple Music liked songs');
    }
  }

  async addSongToLibrary(platform: Platform, songExternalId: string): Promise<boolean> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Apple Music');
      }

      if (!songExternalId) {
        return false;
      }

      await axios.post(`${APPLE_MUSIC_API_URL}/me/library/songs`, {
        data: [{ id: songExternalId }]
      }, {
        headers: {
          'Authorization': `Bearer ${platform.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add song to Apple Music library:', error);
      return false;
    }
  }

  async searchSong(platform: Platform, query: string): Promise<any> {
    try {
      if (!platform.accessToken) {
        throw new Error('No access token available for Apple Music');
      }

      const response = await axios.get(`${APPLE_MUSIC_API_URL}/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=1`, {
        headers: {
          'Authorization': `Bearer ${platform.accessToken}`
        }
      });
      
      if (response.data.results.songs?.data.length > 0) {
        const song = response.data.results.songs.data[0];
        return {
          title: song.attributes.name,
          artist: song.attributes.artistName,
          album: song.attributes.albumName,
          albumCover: song.attributes.artwork?.url,
          externalId: song.id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to search Apple Music:', error);
      return null;
    }
  }
} 