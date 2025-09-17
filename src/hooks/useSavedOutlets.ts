import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useSavedOutlets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedOutlets, setSavedOutlets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadSavedOutlets = async () => {
    if (!user) {
      setSavedOutlets(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_outlets')
        .select('outlet_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const outletIds = new Set(data?.map(item => item.outlet_id) || []);
      setSavedOutlets(outletIds);
    } catch (error) {
      console.error('Error loading saved outlets:', error);
      toast({
        title: "Error",
        description: "Failed to load saved outlets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedOutlets();
  }, [user]);

  const toggleSaveOutlet = async (outletId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save outlets",
        variant: "destructive"
      });
      return;
    }

    const isCurrentlySaved = savedOutlets.has(outletId);

    try {
      if (isCurrentlySaved) {
        // Remove from saved outlets
        const { error } = await supabase
          .from('saved_outlets')
          .delete()
          .eq('user_id', user.id)
          .eq('outlet_id', outletId);

        if (error) throw error;

        setSavedOutlets(prev => {
          const newSet = new Set(prev);
          newSet.delete(outletId);
          return newSet;
        });

        toast({
          title: "Outlet Removed",
          description: "Outlet removed from your saved list"
        });
      } else {
        // Add to saved outlets
        const { error } = await supabase
          .from('saved_outlets')
          .insert({
            user_id: user.id,
            outlet_id: outletId
          });

        if (error) throw error;

        setSavedOutlets(prev => new Set(prev).add(outletId));

        toast({
          title: "Outlet Saved",
          description: "Outlet added to your saved list"
        });
      }
    } catch (error) {
      console.error('Error toggling save outlet:', error);
      toast({
        title: "Error",
        description: "Failed to update saved outlets",
        variant: "destructive"
      });
    }
  };

  const isSaved = (outletId: string) => savedOutlets.has(outletId);

  return {
    savedOutlets,
    toggleSaveOutlet,
    isSaved,
    loading
  };
}