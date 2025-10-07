// API Configuration
const getApiBaseUrl = (): string => {
  // In development, use relative URLs (Vite proxy handles routing)
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production, use the environment variable or fallback to ALB endpoint
  return import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : 'http://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com/api';
};

export const API_BASE_URL = getApiBaseUrl();
