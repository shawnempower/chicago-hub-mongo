import { useState, useEffect } from 'react';
// MongoDB services removed - using API calls instead
import { useAuth } from '@/contexts/CustomAuthContext';
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
      // For now, use localStorage as a temporary solution
      const saved = localStorage.getItem(`saved_outlets_${user.id}`);
      const outletIds = saved ? JSON.parse(saved) : [];
      setSavedOutlets(new Set(outletIds));
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
      let newOutlets;
      if (isCurrentlySaved) {
        // Remove from saved outlets
        setSavedOutlets(prev => {
          const newSet = new Set(prev);
          newSet.delete(outletId);
          newOutlets = Array.from(newSet);
          return newSet;
        });

        toast({
          title: "Outlet Removed",
          description: "Outlet removed from your saved list"
        });
      } else {
        // Add to saved outlets
        setSavedOutlets(prev => {
          const newSet = new Set(prev).add(outletId);
          newOutlets = Array.from(newSet);
          return newSet;
        });

        toast({
          title: "Outlet Saved",
          description: "Outlet added to your saved list"
        });
      }
      
      // Save to localStorage
      localStorage.setItem(`saved_outlets_${user.id}`, JSON.stringify(newOutlets));
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