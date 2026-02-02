import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { PublicationFrontend } from '@/types/publication';
import { getPublications, getPublicationsMinimal, getPublicationById, PublicationMinimal } from '@/api/publications';
import { useAuth } from './CustomAuthContext';

interface PublicationContextType {
  selectedPublication: PublicationFrontend | null;
  setSelectedPublication: (publication: PublicationFrontend | PublicationMinimal | null) => void;
  availablePublications: PublicationMinimal[];
  loading: boolean;
  error: string | null;
  refreshPublication: () => Promise<void>;
  // New: expose method to get full publication data when needed
  getFullPublication: (id: string) => Promise<PublicationFrontend | null>;
}

const PublicationContext = createContext<PublicationContextType | undefined>(undefined);

export const usePublication = () => {
  const context = useContext(PublicationContext);
  if (context === undefined) {
    throw new Error('usePublication must be used within a PublicationProvider');
  }
  return context;
};

interface PublicationProviderProps {
  children: ReactNode;
}

export const PublicationProvider: React.FC<PublicationProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [selectedPublication, setSelectedPublicationState] = useState<PublicationFrontend | null>(null);
  // Store minimal publication data for dropdown (much smaller payload)
  const [allPublications, setAllPublications] = useState<PublicationMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter publications based on user permissions
  // Note: Permission filtering is now done server-side, but we keep client-side as backup
  const availablePublications = useMemo(() => {
    // Server already filters by permissions, but keep client-side filter as backup
    // Admins see all publications
    if (user?.isAdmin || user?.role === 'admin') {
      return allPublications;
    }

    // If user has no permissions data, show all (backward compatible)
    if (!user?.permissions?.assignedPublicationIds && !user?.permissions?.assignedHubIds) {
      return allPublications;
    }

    const assignedPublicationIds = user.permissions.assignedPublicationIds || [];
    const assignedHubIds = user.permissions.assignedHubIds || [];

    // No filtering if both arrays are empty (backward compatible)
    if (assignedPublicationIds.length === 0 && assignedHubIds.length === 0) {
      return allPublications;
    }

    // Filter to only assigned publications or publications in assigned hubs
    return allPublications.filter(pub => {
      // Direct publication assignment
      if (assignedPublicationIds.includes(pub.publicationId.toString()) || 
          assignedPublicationIds.includes(pub._id || '')) {
        return true;
      }

      // Hub-level access (user has access to hub that contains this publication)
      // Note: publications have hubIds as an array
      if (pub.hubIds && Array.isArray(pub.hubIds)) {
        if (pub.hubIds.some(hubId => assignedHubIds.includes(hubId))) {
          return true;
        }
      }

      return false;
    });
  }, [allPublications, user]);

  // Create a stable reference for user permissions to detect changes
  const userPermissionsKey = useMemo(() => {
    if (!user?.permissions) return '';
    const pubIds = user.permissions.assignedPublicationIds?.sort().join(',') || '';
    const hubIds = user.permissions.assignedHubIds?.sort().join(',') || '';
    return `${pubIds}|${hubIds}`;
  }, [user?.permissions?.assignedPublicationIds, user?.permissions?.assignedHubIds]);

  // Wait for auth to be ready AND user to be logged in before loading publications
  // Also reload when user permissions change (e.g., after accepting an invite)
  useEffect(() => {
    if (!authLoading && user) {
      loadPublications();
    } else if (!authLoading && !user) {
      // User not logged in - clear publications and stop loading
      setAllPublications([]);
      setSelectedPublicationState(null);
      setLoading(false);
    }
  }, [authLoading, user, userPermissionsKey]);

  // Ensure selected publication is in the available list after filtering
  useEffect(() => {
    if (!loading && availablePublications.length > 0) {
      // Check if current selection is still available after filtering
      const isCurrentSelectionAvailable = selectedPublication && availablePublications.some(
        p => p._id === selectedPublication._id || p.publicationId === selectedPublication.publicationId
      );

      if (!isCurrentSelectionAvailable) {
        // Current selection is not available, select the first available one
        console.log('Selected publication not in available list, auto-selecting first available');
        
        // Try to get from localStorage first
        const savedPublicationId = localStorage.getItem('selectedPublicationId');
        const savedPublication = savedPublicationId 
          ? availablePublications.find(p => p._id === savedPublicationId || p.publicationId.toString() === savedPublicationId)
          : null;
        
        const newSelection = savedPublication || availablePublications[0];
        setSelectedPublication(newSelection);
        
        // Update localStorage
        if (newSelection) {
          localStorage.setItem('selectedPublicationId', newSelection._id || newSelection.publicationId.toString());
        }
      }
    }
  }, [availablePublications, loading]);

  // Fetch full publication data by ID
  const getFullPublication = useCallback(async (id: string): Promise<PublicationFrontend | null> => {
    try {
      return await getPublicationById(id);
    } catch (err) {
      console.error('Error fetching full publication:', err);
      return null;
    }
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use minimal fields for much smaller payload (~15KB vs ~525KB)
      const publications = await getPublicationsMinimal();
      setAllPublications(publications);
      
      // Initial selection will be handled by the useEffect above after filtering
      if (publications.length > 0 && !selectedPublication) {
        // Check for previously selected publication in localStorage
        const savedPublicationId = localStorage.getItem('selectedPublicationId');
        const savedMinimalPub = savedPublicationId 
          ? publications.find(p => p._id === savedPublicationId || p.publicationId.toString() === savedPublicationId)
          : null;
        
        const minimalPubToSelect = savedMinimalPub || publications[0];
        
        // Fetch full details for the selected publication
        if (minimalPubToSelect) {
          const fullPub = await getPublicationById(
            minimalPubToSelect._id || minimalPubToSelect.publicationId.toString()
          );
          if (fullPub) {
            setSelectedPublicationState(fullPub);
            localStorage.setItem('selectedPublicationId', fullPub._id || fullPub.publicationId.toString());
          }
        }
      }
    } catch (err) {
      console.error('Error loading publications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load publications';
      setError(errorMessage);
      // Don't clear publications on error - keep existing data if available
    } finally {
      setLoading(false);
    }
  };

  const handleSetSelectedPublication = async (publication: PublicationFrontend | PublicationMinimal | null) => {
    if (!publication) {
      setSelectedPublicationState(null);
      localStorage.removeItem('selectedPublicationId');
      return;
    }

    // Save selection to localStorage
    localStorage.setItem('selectedPublicationId', publication._id || publication.publicationId.toString());

    // Check if we already have full data (has distributionChannels or other full fields)
    const hasFullData = 'distributionChannels' in publication || 'audienceDemographics' in publication;
    
    if (hasFullData) {
      // Already have full publication data
      setSelectedPublicationState(publication as PublicationFrontend);
    } else {
      // Minimal data - need to fetch full details
      try {
        const fullPub = await getPublicationById(
          publication._id || publication.publicationId.toString()
        );
        if (fullPub) {
          setSelectedPublicationState(fullPub);
        } else {
          // Fallback: try to use what we have
          console.warn('Could not fetch full publication data, using minimal');
          setSelectedPublicationState(publication as PublicationFrontend);
        }
      } catch (err) {
        console.error('Error fetching full publication on select:', err);
        // Fallback: use what we have
        setSelectedPublicationState(publication as PublicationFrontend);
      }
    }
  };

  const refreshPublication = async () => {
    if (!selectedPublication) return;
    
    try {
      // Refresh the full selected publication
      const refreshedPub = await getPublicationById(
        selectedPublication._id || selectedPublication.publicationId.toString()
      );
      
      if (refreshedPub) {
        setSelectedPublicationState(refreshedPub);
      }
      
      // Also refresh the minimal publications list
      const minimalPubs = await getPublicationsMinimal();
      setAllPublications(minimalPubs);
    } catch (err) {
      console.error('Error refreshing publication:', err);
    }
  };

  return (
    <PublicationContext.Provider
      value={{
        selectedPublication,
        setSelectedPublication: handleSetSelectedPublication,
        availablePublications,
        loading,
        error,
        refreshPublication,
        getFullPublication,
      }}
    >
      {children}
    </PublicationContext.Provider>
  );
};
