import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicationFrontend } from '@/types/publication';
import { getPublications } from '@/api/publications';

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
  const [selectedPublication, setSelectedPublication] = useState<PublicationFrontend | null>(null);
  const [availablePublications, setAvailablePublications] = useState<PublicationFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      const publications = await getPublications();
      setAvailablePublications(publications);
      
      // Auto-select the first publication if none is selected
      if (publications.length > 0 && !selectedPublication) {
        // Check for previously selected publication in localStorage
        const savedPublicationId = localStorage.getItem('selectedPublicationId');
        const savedPublication = savedPublicationId 
          ? publications.find(p => p._id === savedPublicationId || p.publicationId.toString() === savedPublicationId)
          : null;
        
        setSelectedPublication(savedPublication || publications[0]);
      }
    } catch (err) {
      console.error('Error loading publications:', err);
      setError('Failed to load publications');
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
        // Also update in availablePublications
        setAvailablePublications(publications);
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
