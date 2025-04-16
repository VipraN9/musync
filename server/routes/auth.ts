import { Router } from 'express';
import { SpotifyService } from '../services/spotify';
import { SoundCloudService } from '../services/soundcloud';
import { log } from '../vite';
import crypto from 'crypto';
import { storage } from '../storage';

const router = Router();
const spotifyService = SpotifyService.getInstance();
const soundcloudService = SoundCloudService.getInstance();

// Middleware to ensure user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Spotify OAuth routes
router.get('/spotify', isAuthenticated, (req: any, res) => {
  // Generate and store state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  req.session.userId = req.user.id;

  const authUrl = spotifyService.getAuthUrl(state);
  // Directly redirect to Spotify's authorization page
  res.redirect(authUrl);
});

router.get('/spotify/callback', async (req: any, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      log(`Spotify auth error: ${error}`);
      return res.redirect('http://localhost:5000/dashboard?error=auth_failed');
    }

    // Verify state to prevent CSRF
    if (!state || state !== req.session.oauthState) {
      log('Invalid OAuth state');
      return res.redirect('http://localhost:5000/dashboard?error=invalid_state');
    }

    if (!code || typeof code !== 'string') {
      log('No code received from Spotify');
      return res.redirect('http://localhost:5000/dashboard?error=no_code');
    }

    if (!req.session.userId) {
      log('No user session found');
      return res.redirect('http://localhost:5000/dashboard?error=no_session');
    }

    await spotifyService.handleCallback(code);
    const platform = await spotifyService.connect(
      req.session.userId,
      spotifyService.getAccessToken() || '',
      spotifyService.getRefreshToken() || ''
    );

    // Clear OAuth state
    delete req.session.oauthState;
    
    // Redirect back to the frontend with success message
    res.redirect('http://localhost:5000/dashboard?success=spotify_connected');
  } catch (err) {
    log(`Error handling Spotify callback: ${err}`);
    res.redirect('http://localhost:5000/dashboard?error=callback_failed');
  }
});

// SoundCloud OAuth routes
router.get('/soundcloud', isAuthenticated, (req: any, res) => {
  // Generate and store state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  req.session.userId = req.user.id;

  const authUrl = soundcloudService.getAuthUrl(state);
  // Directly redirect to SoundCloud's authorization page
  res.redirect(authUrl);
});

router.get('/soundcloud/callback', async (req: any, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      log(`SoundCloud auth error: ${error}`);
      return res.redirect('http://localhost:5000/dashboard?error=auth_failed');
    }

    // Verify state to prevent CSRF
    if (!state || state !== req.session.oauthState) {
      log('Invalid OAuth state');
      return res.redirect('http://localhost:5000/dashboard?error=invalid_state');
    }

    if (!code || typeof code !== 'string') {
      log('No code received from SoundCloud');
      return res.redirect('http://localhost:5000/dashboard?error=no_code');
    }

    if (!req.session.userId) {
      log('No user session found');
      return res.redirect('http://localhost:5000/dashboard?error=no_session');
    }

    await soundcloudService.handleCallback(code);
    const platform = await soundcloudService.connect(
      req.session.userId,
      soundcloudService.getAccessToken() || '',
      soundcloudService.getRefreshToken() || ''
    );

    // Clear OAuth state
    delete req.session.oauthState;
    
    // Redirect back to the frontend with success message
    res.redirect('http://localhost:5000/dashboard?success=soundcloud_connected');
  } catch (err) {
    log(`Error handling SoundCloud callback: ${err}`);
    res.redirect('http://localhost:5000/dashboard?error=callback_failed');
  }
});

export default router; 