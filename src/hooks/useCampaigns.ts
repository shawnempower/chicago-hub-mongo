/**
 * Campaign Hooks
 * 
 * React hooks for campaign management
 */

import { useState, useEffect, useCallback } from 'react';
import { campaignsApi, CampaignListFilters } from '../api/campaigns';
import { 
  Campaign, 
  CampaignSummary, 
  CampaignAnalysisRequest,
  CampaignAnalysisResponse 
} from '../integrations/mongodb/campaignSchema';

/**
 * Hook to fetch all campaigns
 */
export function useCampaigns(filters?: CampaignListFilters) {
  const [campaigns, setCampaigns] = useState<Campaign[] | CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    // Don't fetch if hubId is required but not provided yet
    // Keep loading = true so UI shows loading state while waiting for hubId
    if (!filters?.hubId) {
      console.log('Waiting for hubId to be available...', filters?.hubId);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching campaigns with hubId:', filters.hubId);
      const { campaigns: fetchedCampaigns } = await campaignsApi.getAll(filters);
      console.log('Fetched campaigns:', fetchedCampaigns.length);
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      console.error('Error in useCampaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [filters?.hubId, filters?.status, filters?.searchTerm, filters?.summaryOnly]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns
  };
}

/**
 * Hook to fetch a single campaign by ID
 */
export function useCampaign(id: string | null) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!id) {
      setCampaign(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { campaign: fetchedCampaign } = await campaignsApi.getById(id);
      setCampaign(fetchedCampaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign');
      console.error('Error in useCampaign:', err);
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    loading,
    error,
    refetch: fetchCampaign
  };
}

/**
 * Hook for campaign analysis (AI selection)
 */
export function useAnalyzeCampaign() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CampaignAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (request: CampaignAnalysisRequest) => {
    try {
      setAnalyzing(true);
      setError(null);
      const analysisResult = await campaignsApi.analyze(request);
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze campaign';
      setError(errorMessage);
      console.error('Error in useAnalyzeCampaign:', err);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    analyze,
    analyzing,
    result,
    error,
    reset
  };
}

/**
 * Hook for creating campaigns
 */
export function useCreateCampaign() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (campaignData: any) => {
    try {
      setCreating(true);
      setError(null);
      const { campaign } = await campaignsApi.create(campaignData);
      return campaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
      console.error('Error in useCreateCampaign:', err);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  return {
    create,
    creating,
    error
  };
}

/**
 * Hook for updating campaigns
 */
export function useUpdateCampaign() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string, updates: Partial<Campaign>) => {
    try {
      setUpdating(true);
      setError(null);
      const { campaign } = await campaignsApi.update(id, updates);
      return campaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
      setError(errorMessage);
      console.error('Error in useUpdateCampaign:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    update,
    updating,
    error
  };
}

/**
 * Hook for updating campaign status
 */
export function useUpdateCampaignStatus() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (
    id: string, 
    status: Campaign['status'],
    approvalDetails?: {
      approvedBy?: string;
      rejectedBy?: string;
      rejectionReason?: string;
    }
  ) => {
    try {
      setUpdating(true);
      setError(null);
      const { campaign } = await campaignsApi.updateStatus(id, status, approvalDetails);
      return campaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign status';
      setError(errorMessage);
      console.error('Error in useUpdateCampaignStatus:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateStatus,
    updating,
    error
  };
}

/**
 * Hook for generating insertion orders
 */
export function useGenerateInsertionOrder() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (id: string, format: 'html' | 'markdown' = 'html') => {
    try {
      setGenerating(true);
      setError(null);
      const result = await campaignsApi.generateInsertionOrder(id, format);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate insertion order';
      setError(errorMessage);
      console.error('Error in useGenerateInsertionOrder:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generate,
    generating,
    error
  };
}

/**
 * Hook for deleting campaigns
 */
export function useDeleteCampaign() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCampaign = async (id: string) => {
    try {
      setDeleting(true);
      setError(null);
      const result = await campaignsApi.delete(id);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      setError(errorMessage);
      console.error('Error in useDeleteCampaign:', err);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleteCampaign,
    deleting,
    error
  };
}

/**
 * Hook for campaign statistics
 */
export function useCampaignStats(hubId?: string) {
  const [stats, setStats] = useState<Record<Campaign['status'], number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { stats: fetchedStats } = await campaignsApi.getStatsByStatus(hubId);
      setStats(fetchedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign statistics');
      console.error('Error in useCampaignStats:', err);
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

/**
 * Hook for generating publication insertion orders
 * Creates the database records that publications can view
 */
export function useGeneratePublicationOrders() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOrders = async (campaignId: string) => {
    try {
      setGenerating(true);
      setError(null);
      const result = await campaignsApi.generatePublicationOrders(campaignId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate publication orders';
      setError(errorMessage);
      console.error('Error in useGeneratePublicationOrders:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generateOrders,
    generating,
    error
  };
}


