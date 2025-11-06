// API client for hub packages
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { API_BASE_URL } from '@/config/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface HubPackageFilters {
  active_only?: boolean;
  featured?: boolean;
  category?: string;
  hub_id?: string;
}

export const hubPackagesApi = {
  // Get all hub packages
  async getAll(filters?: HubPackageFilters): Promise<{ packages: HubPackage[] }> {
    try {
      const params = new URLSearchParams();
      if (filters?.active_only) params.append('active_only', 'true');
      if (filters?.featured) params.append('featured', 'true');
      if (filters?.category) params.append('category', filters.category);
      if (filters?.hub_id) params.append('hub_id', filters.hub_id);

      const url = `${API_BASE_URL}/api/hub-packages${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hub packages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching hub packages:', error);
      throw new Error('Failed to fetch hub packages');
    }
  },

  // Get a single hub package by ID
  async getById(id: string): Promise<{ package: HubPackage }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub-packages/${id}`);
      
      if (!response.ok) {
        throw new Error('Package not found');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching hub package:', error);
      throw new Error('Failed to fetch hub package');
    }
  },

  // Search hub packages
  async search(query: string): Promise<{ packages: HubPackage[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub-packages/search/${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching hub packages:', error);
      throw new Error('Failed to search hub packages');
    }
  },

  // Record package inquiry (requires auth)
  async inquire(id: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub-packages/${id}/inquire`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to record inquiry');
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording inquiry:', error);
      throw new Error('Failed to record inquiry');
    }
  }
};

