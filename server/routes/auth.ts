import { Router } from 'express';
import { SpotifyService } from '../services/spotify';
import { AppleMusicService } from '../services/applemusic';
import { SoundCloudService } from '../services/soundcloud';
import { storage } from '../storage';
import { log } from '../vite';
import crypto from 'crypto';

const router = Router();
const spotifyService = SpotifyService.getInstance();
const appleMusicService = AppleMusicService.getInstance();
const soundcloudService = SoundCloudService.getInstance();

// Generate state parameter for OAuth
const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to get redirect URL
const getRedirectUrl = (path: string, params?: Record<string, string>) => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://musync-sable.vercel.app'
    : 'http://localhost:5173';
  
  const url = new URL(path, baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};

// Spotify auth routes
router.get('/spotify', (req, res) => {
  const state = generateState();
  req.session.oauthState = state;
  const authUrl = spotifyService.getAuthUrl(state);
  res.redirect(authUrl);
});

router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      return res.redirect(getRedirectUrl('/login', { error: 'invalid_state' }));
    }

    await spotifyService.handleCallback(code as string);
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect(getRedirectUrl('/login', { error: 'not_authenticated' }));
    }

    await spotifyService.connect(
      userId,
      spotifyService.getAccessToken()!,
      spotifyService.getRefreshToken()!
    );

    res.redirect(getRedirectUrl('/platforms'));
  } catch (error) {
    log(`Spotify callback error: ${error}`);
    res.redirect(getRedirectUrl('/login', { error: 'spotify_auth_failed' }));
  }
});

// Apple Music auth routes
router.get('/apple-music', (req, res) => {
  const state = generateState();
  req.session.oauthState = state;
  const authUrl = appleMusicService.getAuthUrl(state);
  res.redirect(authUrl);
});

router.get('/apple-music/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      return res.redirect(getRedirectUrl('/login', { error: 'invalid_state' }));
    }

    await appleMusicService.handleCallback(code as string);
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect(getRedirectUrl('/login', { error: 'not_authenticated' }));
    }

    await appleMusicService.connect(
      userId,
      appleMusicService.getAccessToken()!,
      appleMusicService.getRefreshToken()!
    );

    res.redirect(getRedirectUrl('/platforms'));
  } catch (error) {
    log(`Apple Music callback error: ${error}`);
    res.redirect(getRedirectUrl('/login', { error: 'apple_music_auth_failed' }));
  }
});

// SoundCloud auth routes
router.get('/soundcloud', (req, res) => {
  const state = generateState();
  req.session.oauthState = state;
  const authUrl = soundcloudService.getAuthUrl(state);
  res.redirect(authUrl);
});

router.get('/soundcloud/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      return res.redirect(getRedirectUrl('/login', { error: 'invalid_state' }));
    }

    await soundcloudService.handleCallback(code as string);
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect(getRedirectUrl('/login', { error: 'not_authenticated' }));
    }

    await soundcloudService.connect(
      userId,
      soundcloudService.getAccessToken()!,
      soundcloudService.getRefreshToken()!
    );

    res.redirect(getRedirectUrl('/platforms'));
  } catch (error) {
    log(`SoundCloud callback error: ${error}`);
    res.redirect(getRedirectUrl('/login', { error: 'soundcloud_auth_failed' }));
  }
});

export default router; 