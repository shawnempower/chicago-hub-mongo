import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSavedPackages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedPackages, setSavedPackages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved packages when user logs in
  useEffect(() => {
    if (user) {
      loadSavedPackages();
    } else {
      setSavedPackages([]);
    }
  }, [user]);

  const loadSavedPackages = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_packages')
        .select('package_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const packageIds = data?.map(item => item.package_id) || [];
      setSavedPackages(packageIds);
    } catch (error) {
      console.error('Error loading saved packages:', error);
    }
  };

  const toggleSavePackage = async (packageId: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save packages to view them later.",
      });
      return;
    }

    setLoading(true);
    const isSaved = savedPackages.includes(packageId);

    try {
      if (isSaved) {
        // Remove from saved packages
        const { error } = await supabase
          .from('saved_packages')
          .delete()
          .eq('user_id', user.id)
          .eq('package_id', packageId);

        if (error) throw error;
        
        setSavedPackages(prev => prev.filter(id => id !== packageId));
        toast({
          title: "Package removed",
          description: "Package has been removed from your saved list.",
        });
      } else {
        // Add to saved packages
        const { error } = await supabase
          .from('saved_packages')
          .insert({
            user_id: user.id,
            package_id: packageId
          });

        if (error) throw error;
        
        setSavedPackages(prev => [...prev, packageId]);
        toast({
          title: "Package saved",
          description: "Package has been added to your saved list.",
        });
      }
    } catch (error: any) {
      console.error('Error toggling saved package:', error);
      toast({
        title: "Error",
        description: "Failed to update saved packages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isSaved = (packageId: number) => savedPackages.includes(packageId);

  return {
    savedPackages,
    toggleSavePackage,
    isSaved,
    loading
  };
}