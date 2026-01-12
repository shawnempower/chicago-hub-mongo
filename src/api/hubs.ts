/**
 * Hub API Client
 * 
 * Frontend API for interacting with hub endpoints
 */

import { API_BASE_URL } from '@/config/api';
import { Hub, HubInsert, HubUpdate } from '@/integrations/mongodb/hubSchema';

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export interface HubFilters {
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  includeInactive?: boolean;
}

export interface HubStats {
  publicationCount: number;
  packageCount: number;
}

class HubsAPI {
  private baseUrl = `${API_BASE_URL}/hubs`;

  /**
   * Get all hubs
   */
  async getAll(filters?: HubFilters): Promise<Hub[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeInactive) params.append('includeInactive', 'true');

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch hubs');
    }

    const data = await response.json();
    return data.hubs;
  }

  /**
   * Get hub by ID
   */
  async getById(id: string): Promise<Hub> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch hub');
    }

    const data = await response.json();
    return data.hub;
  }

  /**
   * Get hub by slug
   */
  async getBySlug(hubId: string): Promise<Hub> {
    const response = await fetch(`${this.baseUrl}/slug/${hubId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch hub');
    }

    const data = await response.json();
    return data.hub;
  }

  /**
   * Create new hub (admin only)
   */
  async create(hubData: HubInsert): Promise<Hub> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(hubData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create hub');
    }

    const data = await response.json();
    return data.hub;
  }

  /**
   * Update hub (admin only)
   */
  async update(id: string, updates: Partial<HubUpdate>): Promise<Hub> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update hub');
    }

    const data = await response.json();
    return data.hub;
  }

  /**
   * Delete hub (admin only)
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete hub');
    }
  }

  /**
   * Get hub statistics
   */
  async getStats(id: string): Promise<HubStats> {
    const response = await fetch(`${this.baseUrl}/${id}/stats`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch hub stats');
    }

    const data = await response.json();
    return data.stats;
  }

  /**
   * Get publications for a hub
   */
  async getPublications(hubId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/${hubId}/publications`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch hub publications');
    }

    const data = await response.json();
    return data.publications;
  }

  /**
   * Assign publication to hubs (admin only)
   */
  async assignPublicationToHubs(publicationId: string, hubIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/publications/${publicationId}/hubs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ hubIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign publication to hubs');
    }
  }

  /**
   * Remove publication from hub (admin only)
   */
  async removePublicationFromHub(publicationId: string, hubId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${hubId}/publications/${publicationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to remove publication from hub');
    }
  }

  /**
   * Bulk assign publications to hub (admin only)
   */
  async bulkAssignPublications(publicationIds: string[], hubId: string): Promise<number> {
    console.log('Bulk assigning publications:', { publicationIds, hubId });
    
    const response = await fetch(`${this.baseUrl}/${hubId}/publications/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ publicationIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Bulk assign failed:', response.status, error);
      throw new Error(error.error || error.message || 'Failed to bulk assign publications');
    }

    const data = await response.json();
    console.log('Bulk assign success:', data);
    return data.modifiedCount;
  }

  /**
   * Get publications not assigned to any hub
   */
  async getUnassignedPublications(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/publications/unassigned`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch unassigned publications');
    }

    const data = await response.json();
    return data.publications;
  }
}

export const hubsApi = new HubsAPI();

