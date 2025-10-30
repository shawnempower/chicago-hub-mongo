import { useState, useEffect } from 'react';
import { HubPackage } from '@/integrations/mongodb/hubPackageSchema';
import { hubPackagesApi, HubPackageFilters } from '@/api/hubPackages';

export const useHubPackages = (filters?: HubPackageFilters) => {
  const [packages, setPackages] = useState<HubPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubPackagesApi.getAll(filters);
        setPackages(data.packages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [filters?.active_only, filters?.featured, filters?.category, filters?.hub_id]);

  return { packages, loading, error };
};

export const useHubPackage = (id: string | null) => {
  const [package_, setPackage] = useState<HubPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setPackage(null);
      return;
    }

    const fetchPackage = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hubPackagesApi.getById(id);
        setPackage(data.package);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPackage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  return { package: package_, loading, error };
};

