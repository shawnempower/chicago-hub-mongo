// API Configuration
const getApiBaseUrl = (): string => {
  // In development, use relative URLs (Vite proxy handles routing)
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production, use the environment variable or fallback to custom domain
  return import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : 'https://hubapi.empowerlocal.co/api';
};

export const API_BASE_URL = getApiBaseUrl();
