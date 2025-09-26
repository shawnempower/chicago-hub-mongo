import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const usePackages = () => {
  const [packages, setPackages] = useState<DatabasePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ad_packages')
        .select('*')
        .eq('is_active', true)
        .order('legacy_id');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages. Please try again.",
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