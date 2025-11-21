/**
 * Campaign API Client
 * 
 * Frontend API client for campaign management
 */

import { Campaign, CampaignAnalysisRequest, CampaignAnalysisResponse, CampaignSummary } from '../integrations/mongodb/campaignSchema';
import { API_BASE_URL } from '@/config/api';

/**
 * Get auth headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export interface CampaignListFilters {
  hubId?: string;
  status?: string | string[];
  searchTerm?: string;
  startDateFrom?: string;
  startDateTo?: string;
  summaryOnly?: boolean;
}

export interface CampaignCreateData {
  hubId: string;
  hubName: string;
  basicInfo: {
    name: string;
    description: string;
    advertiserName: string;
    advertiserContact: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    };
  };
  objectives: any;
  timeline: {
    startDate: Date;
    endDate: Date;
  };
  selectedInventory: any;
  pricing: any;
  estimatedPerformance: any;
  status: Campaign['status'];
}

export const campaignsApi = {
  /**
   * Analyze campaign requirements using AI
   */
  async analyze(request: CampaignAnalysisRequest): Promise<CampaignAnalysisResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing campaign:', error);
      throw error;
    }
  },

  /**
   * Create a new campaign
   */
  async create(campaignData: CampaignCreateData): Promise<{ campaign: Campaign }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  },

  /**
   * Get all campaigns with optional filters
   */
  async getAll(filters?: CampaignListFilters): Promise<{ campaigns: Campaign[] | CampaignSummary[] }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.hubId) params.append('hubId', filters.hubId);
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          filters.status.forEach(s => params.append('status', s));
        } else {
          params.append('status', filters.status);
        }
      }
      if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters?.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
      if (filters?.startDateTo) params.append('startDateTo', filters.startDateTo);

      const response = await fetch(`${API_BASE_URL}/campaigns?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  /**
   * Get a specific campaign by ID
   */
  async getById(id: string): Promise<{ campaign: Campaign }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Campaign not found');
        }
        throw new Error('Failed to fetch campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  },

  /**
   * Update a campaign
   */
  async update(id: string, updates: Partial<Campaign>): Promise<{ campaign: Campaign }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },

  /**
   * Update campaign status
   */
  async updateStatus(
    id: string, 
    status: Campaign['status'],
    approvalDetails?: {
      approvedBy?: string;
      rejectedBy?: string;
      rejectionReason?: string;
    }
  ): Promise<{ campaign: Campaign }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, approvalDetails }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update campaign status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  },

  /**
   * Generate or regenerate insertion order
   */
  async generateInsertionOrder(
    id: string, 
    format: 'html' | 'markdown' = 'html'
  ): Promise<{ campaign: Campaign; insertionOrder: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}/insertion-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate insertion order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating insertion order:', error);
      throw error;
    }
  },

  /**
   * Delete a campaign (soft delete)
   */
  async delete(id: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  },

  /**
   * Get campaign statistics by status
   */
  async getStatsByStatus(hubId?: string): Promise<{ stats: Record<Campaign['status'], number> }> {
    try {
      const params = hubId ? `?hubId=${hubId}` : '';
      const response = await fetch(`${API_BASE_URL}/campaigns/stats/by-status${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      throw error;
    }
  },

  /**
   * Get available campaign generation algorithms
   */
  async getAlgorithms(): Promise<{ algorithms: Array<{ id: string; name: string; description: string; icon: string }> }> {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/algorithms`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch algorithms');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching algorithms:', error);
      throw error;
    }
  },
};

