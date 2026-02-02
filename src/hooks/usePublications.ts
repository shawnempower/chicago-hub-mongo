import { useState, useEffect } from 'react';
import { 
  PublicationFrontend, 
  PublicationInsertFrontend, 
  PublicationCategory, 
  PublicationType 
} from '@/types/publication';
import { API_BASE_URL } from '@/config/api';
import { 
  getPublications, 
  getPublicationById, 
  createPublication, 
  updatePublication, 
  deletePublication, 
  importPublications,
  getPublicationCategories,
  getPublicationTypes
} from '@/api/publications';

// Simplified frontend interface for display purposes
export interface PublicationDisplay {
  id: string;
  publicationId: number;
  name: string;
  type: string;
  website?: string;
  founded?: string | number;
  contentType?: string;
  geographicCoverage?: string;
  primaryServiceArea?: string;
  contactInfo?: {
    mainPhone?: string;
    primaryContact?: {
      name?: string;
      email?: string;
      phone?: string;
      preferredContact?: string;
    };
    salesContact?: {
      name?: string;
      email?: string;
      phone?: string;
      preferredContact?: string;
    };
    editorialContact?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  distributionChannels?: {
    website?: {
      metrics?: {
        monthlyVisitors?: number;
        monthlyPageViews?: number;
      };
    };
    print?: {
      circulation?: number;
      frequency?: string;
    };
    newsletters?: Array<{
      name?: string;
      subscribers?: number;
      openRate?: number;
    }>;
  };
  audienceDemographics?: {
    totalAudience?: number;
    targetMarkets?: string[];
  };
  businessInfo?: {
    legalEntity?: string;
    taxId?: string;
    ownershipType?: string;
    numberOfEmployees?: number;
    yearsInOperation?: number;
  };
  metadata?: {
    verificationStatus?: string;
    lastUpdated?: Date;
    createdAt?: Date;
  };
}

export interface UsePublicationsFilters {
  geographicCoverage?: string;
  publicationType?: string;
  contentType?: string;
  verificationStatus?: string;
}

export const usePublications = (filters?: UsePublicationsFilters) => {
  const [publications, setPublications] = useState<PublicationDisplay[]>([]);
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [types, setTypes] = useState<PublicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Publication to frontend format
  const toFrontendFormat = (pub: PublicationFrontend): PublicationDisplay => ({
    id: pub._id?.toString() || '',
    publicationId: pub.publicationId,
    name: pub.basicInfo.publicationName,
    type: pub.basicInfo.publicationType || 'publication',
    website: pub.basicInfo.websiteUrl,
    founded: pub.basicInfo.founded,
    contentType: pub.basicInfo.contentType,
    geographicCoverage: pub.basicInfo.geographicCoverage,
    primaryServiceArea: pub.basicInfo.primaryServiceArea,
    contactInfo: pub.contactInfo,
    distributionChannels: pub.distributionChannels,
    audienceDemographics: pub.audienceDemographics,
    businessInfo: pub.businessInfo,
    metadata: pub.metadata
  });

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublications(filters);
      setPublications(data.map(toFrontendFormat));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch publications');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getPublicationCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const data = await getPublicationTypes();
      setTypes(data);
    } catch (err) {
      console.error('Failed to fetch types:', err);
    }
  };

  useEffect(() => {
    fetchPublications();
    fetchCategories();
    fetchTypes();
  }, [filters?.geographicCoverage, filters?.publicationType, filters?.contentType, filters?.verificationStatus]);

  const refetch = () => {
    fetchPublications();
    fetchCategories();
    fetchTypes();
  };

  // CRUD operations
  const createNewPublication = async (publicationData: Partial<PublicationFrontend>) => {
    try {
      if (!publicationData.publicationId || !publicationData.basicInfo?.publicationName) {
        throw new Error('Publication ID and name are required');
      }
      
      const newPub = await createPublication(publicationData as any);
      await fetchPublications(); // Refresh the list
      return newPub;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create publication');
    }
  };

  const updateExistingPublication = async (id: string, updates: Partial<PublicationFrontend>) => {
    try {
      const updated = await updatePublication(id, updates);
      await fetchPublications(); // Refresh the list
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update publication');
    }
  };

  const deleteExistingPublication = async (id: string) => {
    try {
      const success = await deletePublication(id);
      if (success) {
        await fetchPublications(); // Refresh the list
      }
      return success;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete publication');
    }
  };

  const importManyPublications = async (publicationsData: any[]) => {
    try {
      const result = await importPublications(publicationsData);
      await fetchPublications(); // Refresh the list
      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to import publications');
    }
  };

  return {
    publications,
    categories,
    types,
    loading,
    error,
    refetch,
    createPublication: createNewPublication,
    updatePublication: updateExistingPublication,
    deletePublication: deleteExistingPublication,
    importPublications: importManyPublications
  };
};

// Hook for getting a single publication
export const usePublication = (id?: string) => {
  const [publication, setPublication] = useState<PublicationFrontend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublication = async (publicationId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicationById(publicationId);
      setPublication(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch publication');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPublication(id);
    }
  }, [id]);

  return {
    publication,
    loading,
    error,
    refetch: () => id ? fetchPublication(id) : null
  };
};

// Enhanced hook that returns full PublicationFrontend objects for admin management
export const usePublicationsFull = (filters?: UsePublicationsFilters) => {
  const [publications, setPublications] = useState<PublicationFrontend[]>([]);
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [types, setTypes] = useState<PublicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use 'list' fields to reduce payload size while still providing needed data
      // for components like HubPublicationsManager that need geographicCoverage, etc.
      const data = await getPublications({ ...filters, fields: 'list' });
      setPublications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch publications');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getPublicationCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const data = await getPublicationTypes();
      setTypes(data);
    } catch (err) {
      console.error('Failed to fetch types:', err);
    }
  };

  useEffect(() => {
    fetchPublications();
    fetchCategories();
    fetchTypes();
  }, [filters]);

  const refetch = () => {
    fetchPublications();
    fetchCategories();
    fetchTypes();
  };

  const createNewPublication = async (data: PublicationInsertFrontend) => {
    try {
      await createPublication(data);
      refetch();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create publication');
    }
  };

  const updateExistingPublication = async (id: string, data: PublicationInsertFrontend) => {
    try {
      await updatePublication(id, data);
      refetch();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update publication');
    }
  };

  const deleteExistingPublication = async (id: string) => {
    try {
      await deletePublication(id);
      refetch();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete publication');
    }
  };

  return {
    publications,
    categories,
    types,
    loading,
    error,
    refetch,
    createPublication: createNewPublication,
    updatePublication: updateExistingPublication,
    deletePublication: deleteExistingPublication
  };
};
