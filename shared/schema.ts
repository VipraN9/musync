import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Connected platforms schema
export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'spotify', 'apple_music', 'soundcloud'
  isConnected: boolean("is_connected").notNull().default(false),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  connectedAt: timestamp("connected_at"),
});

export const insertPlatformSchema = createInsertSchema(platforms).pick({
  userId: true,
  type: true,
  isConnected: true,
  accessToken: true,
  refreshToken: true,
});

export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type Platform = typeof platforms.$inferSelect;

// Songs schema
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  albumCover: text("album_cover"),
  platforms: jsonb("platforms").notNull(), // Array of platform IDs where the song exists
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songs).pick({
  userId: true,
  title: true,
  artist: true,
  album: true,
  albumCover: true,
  platforms: true,
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;

// Sync history schema
export const syncHistory = pgTable("sync_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'full', 'partial'
  targetPlatforms: jsonb("target_platforms").notNull(), // Array of platform IDs
  songsAdded: integer("songs_added").notNull().default(0),
  status: text("status").notNull(), // 'completed', 'failed'
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertSyncHistorySchema = createInsertSchema(syncHistory).pick({
  userId: true,
  type: true,
  targetPlatforms: true,
  songsAdded: true,
  status: true,
});

export type InsertSyncHistory = z.infer<typeof insertSyncHistorySchema>;
export type SyncHistory = typeof syncHistory.$inferSelect;
