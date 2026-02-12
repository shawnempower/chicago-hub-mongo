/**
 * Hub API Client
 * 
 * Frontend API for interacting with hub endpoints
 */

import { API_BASE_URL } from '@/config/api';
import { Hub, HubInsert, HubUpdate } from '@/integrations/mongodb/hubSchema';
import { authenticatedFetch } from '@/api/client';

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
    const response = await authenticatedFetch(url, { credentials: 'include' });

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
    const response = await authenticatedFetch(`${this.baseUrl}/${id}`, { credentials: 'include' });

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
    const response = await authenticatedFetch(`${this.baseUrl}/slug/${hubId}`, { credentials: 'include' });

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
    const response = await authenticatedFetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await authenticatedFetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await authenticatedFetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await authenticatedFetch(`${this.baseUrl}/${id}/stats`, {
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
    const response = await authenticatedFetch(`${this.baseUrl}/${hubId}/publications`, {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/${publicationId}/hubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await authenticatedFetch(`${this.baseUrl}/${hubId}/publications/${publicationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
    
    const response = await authenticatedFetch(`${this.baseUrl}/${hubId}/publications/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/unassigned`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch unassigned publications');
    }

    const data = await response.json();
    return data.publications;
  }
  /**
   * Generate AI network summary for a hub
   * Calls Perplexity to synthesize a value proposition from all publication profiles
   */
  async generateNetworkSummary(hubId: string): Promise<{
    success: boolean;
    hubId: string;
    hubName: string;
    networkSummary: {
      valueProposition: string;
      audienceHighlights: string;
      marketCoverage: string;
      channelStrengths: string;
      competitivePositioning?: string;
      contentVerticals?: string;
      recommendedVerticals?: string;
      citations: string[];
      generatedAt: string;
      generatedBy: string;
      publicationCount: number;
      version: number;
    };
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for AI agent

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/hubs/${hubId}/generate-network-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to generate network summary: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Network summary generation timed out. The AI agent may need more time for large hubs -- please try again.');
      }
      throw error;
    }
  }
}

export const hubsApi = new HubsAPI();

