import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { PublicationFrontend } from '@/types/publication';
import { getPublications } from '@/api/publications';
import { useAuth } from './CustomAuthContext';

interface PublicationContextType {
  selectedPublication: PublicationFrontend | null;
  setSelectedPublication: (publication: PublicationFrontend | null) => void;
  availablePublications: PublicationFrontend[];
  loading: boolean;
  error: string | null;
  refreshPublication: () => Promise<void>;
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
  const [selectedPublication, setSelectedPublication] = useState<PublicationFrontend | null>(null);
  const [allPublications, setAllPublications] = useState<PublicationFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter publications based on user permissions
  const availablePublications = useMemo(() => {
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

  // Wait for auth to be ready before loading publications
  // Also reload when user permissions change (e.g., after accepting an invite)
  useEffect(() => {
    if (!authLoading) {
      loadPublications();
    }
  }, [authLoading, userPermissionsKey]);

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

  const loadPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      const publications = await getPublications();
      setAllPublications(publications);
      
      // Initial selection will be handled by the useEffect above after filtering
      if (publications.length > 0 && !selectedPublication) {
        // Check for previously selected publication in localStorage
        const savedPublicationId = localStorage.getItem('selectedPublicationId');
        const savedPublication = savedPublicationId 
          ? publications.find(p => p._id === savedPublicationId || p.publicationId.toString() === savedPublicationId)
          : null;
        
        // Set temporarily - will be validated by the useEffect after filtering
        setSelectedPublication(savedPublication || publications[0]);
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

  const handleSetSelectedPublication = (publication: PublicationFrontend | null) => {
    setSelectedPublication(publication);
    // Save selection to localStorage
    if (publication) {
      localStorage.setItem('selectedPublicationId', publication._id || publication.publicationId.toString());
    } else {
      localStorage.removeItem('selectedPublicationId');
    }
  };

  const refreshPublication = async () => {
    if (!selectedPublication) return;
    
    try {
      const publications = await getPublications();
      const refreshedPub = publications.find(
        p => p._id === selectedPublication._id || 
             p.publicationId === selectedPublication.publicationId
      );
      
      if (refreshedPub) {
        setSelectedPublication(refreshedPub);
        // Also update in allPublications
        setAllPublications(publications);
      }
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
      }}
    >
      {children}
    </PublicationContext.Provider>
  );
};
