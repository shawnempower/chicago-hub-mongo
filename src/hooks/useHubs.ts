/**
 * useHubs Hook
 * 
 * React hooks for fetching and managing hubs
 */

import { useState, useEffect } from 'react';
import { hubsApi, HubFilters, HubStats } from '@/api/hubs';
import { Hub } from '@/integrations/mongodb/hubSchema';

/**
 * Hook to fetch all hubs
 * @param filters - Optional filters for hub query
 * @param options - Optional settings (enabled: whether to fetch)
 */
export const useHubs = (filters?: HubFilters, options?: { enabled?: boolean }) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Default to enabled if not specified
  const enabled = options?.enabled !== false;

  useEffect(() => {
    // Skip fetching if not enabled (e.g., user not logged in)
    if (!enabled) {
      setHubs([]);
      setLoading(false);
      setError(null);
      return;
    }

    let retryTimeout: NodeJS.Timeout;
    
    const fetchHubs = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching hubs...', { retryCount });
        const data = await hubsApi.getAll(filters);
        console.log('✅ Hubs fetched successfully:', data.length);
        setHubs(data);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hubs';
        setError(errorMessage);
        console.error('❌ Error fetching hubs:', err);
        
        // Auto-retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5s
          console.log(`⏳ Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/3)`);
          retryTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, retryDelay);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHubs();
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [filters?.status, filters?.includeInactive, retryCount, enabled]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);
      console.log('🔄 Manual refetch of hubs...');
      const data = await hubsApi.getAll(filters);
      console.log('✅ Hubs refetched successfully:', data.length);
      setHubs(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hubs';
      setError(errorMessage);
      console.error('❌ Error refetching hubs:', err);
    } finally {
      setLoading(false);
    }
  };

  return { hubs, loading, error, refetch };
};

/**
 * Hook to fetch a single hub by ID
 */
export const useHub = (id: string | null) => {
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setHub(null);
      setLoading(false);
      return;
    }

    const fetchHub = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubsApi.getById(id);
        setHub(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hub');
        console.error('Error fetching hub:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHub();
  }, [id]);

  return { hub, loading, error };
};

/**
 * Hook to fetch a hub by slug
 */
export const useHubBySlug = (hubId: string | null) => {
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hubId) {
      setHub(null);
      setLoading(false);
      return;
    }

    const fetchHub = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubsApi.getBySlug(hubId);
        setHub(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hub');
        console.error('Error fetching hub:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHub();
  }, [hubId]);

  return { hub, loading, error };
};

/**
 * Hook to fetch hub statistics
 */
export const useHubStats = (id: string | null) => {
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubsApi.getStats(id);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hub stats');
        console.error('Error fetching hub stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [id]);

  return { stats, loading, error };
};

/**
 * Hook to fetch hub publications
 */
export const useHubPublications = (hubId: string | null) => {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublications = async () => {
    if (!hubId) {
      setPublications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await hubsApi.getPublications(hubId);
      setPublications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch publications');
      console.error('Error fetching hub publications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [hubId]);

  const refetch = () => fetchPublications();

  return { publications, loading, error, refetch };
};

/**
 * Hook to fetch unassigned publications
 */
export const useUnassignedPublications = () => {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hubsApi.getUnassignedPublications();
      setPublications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch unassigned publications');
      console.error('Error fetching unassigned publications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const refetch = () => fetchPublications();

  return { publications, loading, error, refetch };
};

