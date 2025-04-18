import { 
    users, 
    platforms, 
    songs, 
    syncHistory, 
    type User, 
    type InsertUser, 
    type Platform, 
    type InsertPlatform, 
    type Song, 
    type InsertSong, 
    type SyncHistory, 
    type InsertSyncHistory 
  } from "@shared/schema";
  
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const db = drizzle(pool, { schema: { users, platforms, songs, syncHistory } });

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Platform methods
  getPlatformsByUserId(userId: number): Promise<Platform[]>;
  getPlatform(id: number): Promise<Platform | undefined>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  updatePlatform(id: number, data: Partial<InsertPlatform>): Promise<Platform>;
  deletePlatform(id: number): Promise<void>;
  
  // Song methods
  getSongsByUserId(userId: number): Promise<Song[]>;
  getSongsByUserIdAndPlatform(userId: number, platformId: number): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, data: Partial<InsertSong>): Promise<Song>;
  deleteSong(id: number): Promise<void>;
  
  // Sync history methods
  getSyncHistoryByUserId(userId: number): Promise<SyncHistory[]>;
  createSyncHistory(history: InsertSyncHistory): Promise<SyncHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private platforms: Map<number, Platform>;
  private songs: Map<number, Song>;
  private syncHistory: Map<number, SyncHistory>;
  
  private userIdCounter: number;
  private platformIdCounter: number;
  private songIdCounter: number;
  private syncHistoryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.platforms = new Map();
    this.songs = new Map();
    this.syncHistory = new Map();
    
    this.userIdCounter = 1;
    this.platformIdCounter = 1;
    this.songIdCounter = 1;
    this.syncHistoryIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Platform methods
  async getPlatformsByUserId(userId: number): Promise<Platform[]> {
    return Array.from(this.platforms.values()).filter(
      (platform) => platform.userId === userId
    );
  }
  
  async getPlatform(id: number): Promise<Platform | undefined> {
    return this.platforms.get(id);
  }
  
  async createPlatform(insertPlatform: InsertPlatform): Promise<Platform> {
    const id = this.platformIdCounter++;
    const platform: Platform = { 
      ...insertPlatform, 
      id, 
      isConnected: insertPlatform.isConnected || false,
      accessToken: insertPlatform.accessToken || null,
      refreshToken: insertPlatform.refreshToken || null,
      connectedAt: insertPlatform.isConnected ? new Date() : null 
    };
    this.platforms.set(id, platform);
    return platform;
  }
  
  async updatePlatform(id: number, data: Partial<InsertPlatform>): Promise<Platform> {
    const platform = this.platforms.get(id);
    if (!platform) {
      throw new Error(`Platform with id ${id} not found`);
    }
    
    const updatedPlatform: Platform = { 
      ...platform, 
      ...data,
      connectedAt: data.isConnected && !platform.isConnected ? new Date() : platform.connectedAt
    };
    
    this.platforms.set(id, updatedPlatform);
    return updatedPlatform;
  }
  
  async deletePlatform(id: number): Promise<void> {
    this.platforms.delete(id);
  }
  
  // Song methods
  async getSongsByUserId(userId: number): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(
      (song) => song.userId === userId
    );
  }
  
  async getSongsByUserIdAndPlatform(userId: number, platformId: number): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(
      (song) => song.userId === userId && 
                (song.platforms as number[]).includes(platformId)
    );
  }
  
  async getSong(id: number): Promise<Song | undefined> {
    return this.songs.get(id);
  }
  
  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = this.songIdCounter++;
    const song: Song = { 
      ...insertSong, 
      id, 
      album: insertSong.album || null,
      albumCover: insertSong.albumCover || null,
      addedAt: new Date() 
    };
    this.songs.set(id, song);
    return song;
  }
  
  async updateSong(id: number, data: Partial<InsertSong>): Promise<Song> {
    const song = this.songs.get(id);
    if (!song) {
      throw new Error(`Song with id ${id} not found`);
    }
    
    const updatedSong: Song = { ...song, ...data };
    this.songs.set(id, updatedSong);
    return updatedSong;
  }
  
  async deleteSong(id: number): Promise<void> {
    this.songs.delete(id);
  }
  
  // Sync history methods
  async getSyncHistoryByUserId(userId: number): Promise<SyncHistory[]> {
    return Array.from(this.syncHistory.values())
      .filter((history) => history.userId === userId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }
  
  async createSyncHistory(insertHistory: InsertSyncHistory): Promise<SyncHistory> {
    const id = this.syncHistoryIdCounter++;
    const history: SyncHistory = { 
      ...insertHistory, 
      id, 
      songsAdded: insertHistory.songsAdded || 0,
      completedAt: new Date() 
    };
    this.syncHistory.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
  