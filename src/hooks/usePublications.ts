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
  getPublicationTypes,
  getPublicationsAsMediaEntities
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

  // Legacy compatibility - return as MediaEntity format
  const getAsMediaEntities = async () => {
    try {
      return await getPublicationsAsMediaEntities(filters);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get publications as media entities');
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
    importPublications: importManyPublications,
    getAsMediaEntities
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

// Import the conversion function from useMediaEntities
const convertMediaEntity = (dbEntity: any) => ({
  id: dbEntity._id?.toString() || dbEntity.id,
  name: dbEntity.name,
  type: dbEntity.type,
  tagline: dbEntity.tagline,
  description: dbEntity.description,
  website: dbEntity.website,
  category: dbEntity.category,
  categoryTag: dbEntity.categoryTag,
  logo: dbEntity.logo,
  logoColor: dbEntity.logoColor,
  brief: dbEntity.brief,
  reach: dbEntity.reach,
  audience: dbEntity.audience,
  strengths: dbEntity.strengths || [],
  advertising: dbEntity.advertising || [],
  contactInfo: dbEntity.contactInfo,
  businessInfo: dbEntity.businessInfo,
  audienceMetrics: dbEntity.audienceMetrics,
  socialMedia: dbEntity.socialMedia,
  editorialInfo: dbEntity.editorialInfo,
  technicalSpecs: dbEntity.technicalSpecs,
  isActive: dbEntity.isActive,
  sortOrder: dbEntity.sortOrder,
});

// New simplified hook for frontend components that need MediaEntity-like interface
export const usePublicationsAsMediaEntities = (filters?: { category?: string; type?: string; includeInactive?: boolean }) => {
  const [mediaEntities, setMediaEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicationsAsMediaEntities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Map frontend filters to publications API filters
        const publicationFilters = {
          contentType: filters?.category && filters.category !== 'all' ? filters.category : undefined,
          publicationType: filters?.type && filters.type !== 'all' ? filters.type : undefined,
          // Don't filter by verification status by default - show all publications
          // verificationStatus: filters?.includeInactive ? undefined : 'verified'
        };

        // Call the API directly and convert the response
        const publications = await getPublications(publicationFilters);
        
        const convertedEntities = publications.map(pub => ({
          id: pub._id,
          _id: pub._id,
          legacyId: pub.publicationId,
          name: pub.basicInfo.publicationName,
          type: pub.basicInfo.publicationType || 'other',
          tagline: pub.basicInfo.publicationType,
          description: pub.editorialInfo?.contentFocus?.join(', ') || pub.competitiveInfo?.uniqueValueProposition || 'Chicago media publication',
          website: pub.basicInfo.websiteUrl,
          category: pub.basicInfo.contentType || 'mixed',
          categoryTag: pub.basicInfo.contentType?.toLowerCase().replace(/\s+/g, '-') || 'mixed',
          logo: pub.basicInfo.publicationName.substring(0, 3).toUpperCase(),
          logoColor: '#1E40AF',
          brief: pub.competitiveInfo?.uniqueValueProposition || `${pub.basicInfo.geographicCoverage || 'Local'} ${pub.basicInfo.contentType || 'publication'}`,
          reach: pub.audienceDemographics?.totalAudience?.toString() || 'Chicago area',
          audience: pub.audienceDemographics?.targetMarkets?.join(', ') || 'General audience',
          strengths: pub.competitiveInfo?.keyDifferentiators || [],
          advertising: pub.crossChannelPackages?.map(pkg => pkg.name || pkg.packageName || 'Package') || [],
          isActive: pub.metadata?.verificationStatus !== 'outdated',
          sortOrder: 0,
          createdAt: new Date(pub.metadata?.createdAt || Date.now()),
          updatedAt: new Date(pub.metadata?.lastUpdated || Date.now())
        }));

        setMediaEntities(convertedEntities);

      } catch (err) {
        console.error('Error fetching publications as media entities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMediaEntities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicationsAsMediaEntities();
  }, [filters?.category, filters?.type, filters?.includeInactive]);

  return { mediaEntities, loading, error };
};

// Hook for categories compatible with MediaEntity interface
export const usePublicationCategories = () => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/publications/categories`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        const formattedCategories = data.map((category: any) => ({
          id: category.id,
          name: category.name,
          count: category.count
        }));
        
        setCategories([
          { id: 'all', name: 'All Categories' },
          ...formattedCategories
        ]);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCategories([{ id: 'all', name: 'All Categories' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
};

// Hook for types compatible with MediaEntity interface
export const usePublicationTypes = () => {
  const [types, setTypes] = useState<Array<{ id: string; name: string; count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/publications/types`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch types');
        }

        const data = await response.json();
        const formattedTypes = data.map((type: any) => ({
          id: type.id,
          name: type.name,
          count: type.count
        }));
        
        setTypes([
          { id: 'all', name: 'All Types' },
          ...formattedTypes
        ]);
      } catch (err) {
        console.error('Error fetching types:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setTypes([{ id: 'all', name: 'All Types' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { types, loading, error };
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
      const data = await getPublications(filters);
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
