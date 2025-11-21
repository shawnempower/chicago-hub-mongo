// API Configuration
const getApiBaseUrl = (): string => {
  // In development, use relative URLs (Vite proxy handles routing)
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production, use the environment variable (no fallback)
  if (!import.meta.env.VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL environment variable is required in production');
  }
  
  return `${import.meta.env.VITE_API_BASE_URL}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
