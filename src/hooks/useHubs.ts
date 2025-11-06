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
 */
export const useHubs = (filters?: HubFilters) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubsApi.getAll(filters);
        setHubs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hubs');
        console.error('Error fetching hubs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHubs();
  }, [filters?.status, filters?.includeInactive]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hubsApi.getAll(filters);
      setHubs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hubs');
      console.error('Error fetching hubs:', err);
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

