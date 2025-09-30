import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/CustomAuthContext';
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
      // For now, use localStorage as a temporary solution
      const saved = localStorage.getItem(`saved_packages_${user.id}`);
      const packageIds = saved ? JSON.parse(saved) : [];
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
      let newSavedPackages;
      if (isSaved) {
        // Remove from saved packages
        newSavedPackages = savedPackages.filter(id => id !== packageId);
        setSavedPackages(newSavedPackages);
        toast({
          title: "Package removed",
          description: "Package has been removed from your saved list.",
        });
      } else {
        // Add to saved packages
        newSavedPackages = [...savedPackages, packageId];
        setSavedPackages(newSavedPackages);
        toast({
          title: "Package saved",
          description: "Package has been added to your saved list.",
        });
      }
      
      // Save to localStorage
      localStorage.setItem(`saved_packages_${user.id}`, JSON.stringify(newSavedPackages));
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