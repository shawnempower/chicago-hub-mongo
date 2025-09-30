import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AdPackage } from '@/types/common';

export interface DatabasePackage {
  id: string;
  legacy_id: number | null;
  name: string;
  tagline: string | null;
  description: string | null;
  price: string | null;
  price_range: string | null;
  audience: string[] | null;
  channels: string[] | null;
  complexity: string | null;
  outlets: string[] | null;
  features: any | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

// Convert MongoDB AdPackage to frontend DatabasePackage format
const convertAdPackage = (adPackage: AdPackage): DatabasePackage => ({
  id: adPackage._id?.toString() || '',
  legacy_id: adPackage.legacyId || null,
  name: adPackage.name,
  tagline: adPackage.tagline || null,
  description: adPackage.description || null,
  price: adPackage.price || null,
  price_range: adPackage.priceRange || null,
  audience: adPackage.audience || null,
  channels: adPackage.channels || null,
  complexity: adPackage.complexity || null,
  outlets: adPackage.outlets || null,
  features: adPackage.features || null,
  is_active: adPackage.isActive || null,
  created_at: adPackage.createdAt || new Date().toISOString(),
  updated_at: adPackage.updatedAt || new Date().toISOString(),
});

// No fallback data - all data must come from MongoDB

export const usePackages = () => {
  const [packages, setPackages] = useState<DatabasePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      
      // Fetch from MongoDB API
      const response = await fetch('/api/packages');
      
      if (!response.ok) {
        throw new Error('Failed to fetch packages from API');
      }
      
      const data = await response.json();
      const convertedPackages = data.packages.map(convertAdPackage);
      setPackages(convertedPackages);
      
    } catch (error) {
      console.error('Error fetching packages from API:', error);
      
      // No fallback - show error and empty state
      setPackages([]);
      
      toast({
        title: "Error",
        description: "Failed to load packages. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return {
    packages,
    loading,
    refetch: fetchPackages
  };
};