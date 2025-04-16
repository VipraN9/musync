import { apiRequest } from '@/lib/queryClient';

// Auth API
export const signup = async (userData: {
  fullName: string;
  email: string;
  username: string;
  password: string;
}) => {
  const response = await apiRequest('POST', '/api/signup', userData);
  return response.json();
};

export const login = async (credentials: {
  username: string;
  password: string;
}) => {
  const response = await apiRequest('POST', '/api/login', credentials);
  return response.json();
};

export const logout = async () => {
  const response = await apiRequest('POST', '/api/logout', undefined);
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await apiRequest('GET', '/api/me', undefined);
  return response.json();
};

// Platforms API
export const getPlatforms = async () => {
  const response = await apiRequest('GET', '/api/platforms', undefined);
  return response.json();
};

export const connectPlatform = async (
  type: string,
  tokens: { 
    accessToken?: string; 
    refreshToken?: string;
    userToken?: string; // For Apple Music
  }
) => {
  const response = await apiRequest('POST', `/api/platforms/${type}/connect`, tokens);
  return response.json();
};

export const getPlatformSongs = async (platformType: string) => {
  const response = await apiRequest('GET', `/api/platforms/${platformType}/songs`, undefined);
  return response.json();
};

export const disconnectPlatform = async (type: string) => {
  const response = await apiRequest('POST', `/api/platforms/${type}/disconnect`, undefined);
  return response.json();
};

// Songs API
export const getSongs = async (platformType?: string) => {
  const url = platformType ? `/api/songs?platform=${platformType}` : '/api/songs';
  const response = await apiRequest('GET', url, undefined);
  return response.json();
};

export const importAllSongs = async () => {
  const response = await apiRequest('POST', '/api/import-all-songs', undefined);
  return response.json();
};

export const getMissingSongs = async () => {
  const response = await apiRequest('GET', '/api/songs/missing', undefined);
  return response.json();
};

// Sync API
export const syncLibraries = async (data: {
  sourcePlatform: string;
  targetPlatforms: string[];
}) => {
  const response = await apiRequest('POST', '/api/sync', data);
  return response.json();
};

export const getSyncHistory = async () => {
  const response = await apiRequest('GET', '/api/sync/history', undefined);
  return response.json();
};
