import { PublicationFrontend, PublicationInsertFrontend } from '@/types/publication';
import { API_BASE_URL } from '@/config/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Get all publications with optional filtering
export const getPublications = async (filters?: {
  geographicCoverage?: string;
  publicationType?: string;
  contentType?: string;
  verificationStatus?: string;
}): Promise<PublicationFrontend[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.geographicCoverage) params.append('geographicCoverage', filters.geographicCoverage);
    if (filters?.publicationType) params.append('publicationType', filters.publicationType);
    if (filters?.contentType) params.append('contentType', filters.contentType);
    if (filters?.verificationStatus) params.append('verificationStatus', filters.verificationStatus);

    const url = `${API_BASE_URL}/publications${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch publications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publications:', error);
    throw new Error('Failed to fetch publications');
  }
};

// Get a single publication by ID
export const getPublicationById = async (id: string): Promise<PublicationFrontend | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch publication');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication:', error);
    throw new Error('Failed to fetch publication');
  }
};

// Create a new publication
export const createPublication = async (publicationData: PublicationInsertFrontend): Promise<PublicationFrontend> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(publicationData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create publication');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating publication:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create publication');
  }
};

// Update an existing publication
export const updatePublication = async (id: string, updates: Partial<PublicationInsertFrontend>): Promise<PublicationFrontend | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('🔴 Publication update failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: `${API_BASE_URL}/publications/${id}`,
        updates
      });
      throw new Error(errorData.error || 'Failed to update publication');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating publication:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update publication');
  }
};

// Delete a publication
export const deletePublication = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 403) {
        throw new Error('Admin access required');
      }
      if (response.status === 404) {
        return false;
      }
      throw new Error('Failed to delete publication');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting publication:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete publication');
  }
};

// Import multiple publications
export const importPublications = async (publications: PublicationInsertFrontend[]): Promise<{ inserted: number; errors: any[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publications }),
    });

    if (!response.ok) {
      throw new Error('Failed to import publications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error importing publications:', error);
    throw new Error('Failed to import publications');
  }
};

// Enhanced import with options
export const importPublicationsWithOptions = async (publications: PublicationInsertFrontend[], options: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publications, options }),
    });

    if (!response.ok) {
      throw new Error('Failed to import publications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error importing publications:', error);
    throw new Error('Failed to import publications');
  }
};

// Preview import changes
export const previewPublicationsImport = async (publications: PublicationInsertFrontend[], options: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/import-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publications, options }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate import preview');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating import preview:', error);
    throw new Error('Failed to generate import preview');
  }
};

// Get publication categories for filtering
export const getPublicationCategories = async (): Promise<Array<{ id: string; name: string; count: number }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch publication categories');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication categories:', error);
    throw new Error('Failed to fetch publication categories');
  }
};

// Get publication types for filtering
export const getPublicationTypes = async (): Promise<Array<{ id: string; name: string; count: number }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/publications/types`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch publication types');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication types:', error);
    throw new Error('Failed to fetch publication types');
  }
};

// Convert publication to legacy MediaEntity format for backward compatibility
export const getPublicationAsMediaEntity = async (id: string) => {
  try {
    // This would need a separate API endpoint for conversion
    // For now, we'll fetch the publication and convert on the client side
    const publication = await getPublicationById(id);
    if (!publication) {
      return null;
    }
    
    // Basic conversion to MediaEntity format
    return {
      _id: publication._id,
      legacyId: publication.publicationId,
      name: publication.basicInfo.publicationName,
      type: publication.basicInfo.publicationType || 'publication',
      tagline: publication.basicInfo.publicationType,
      description: publication.editorialInfo?.contentFocus?.join(', ') || '',
      website: publication.basicInfo.websiteUrl,
      category: publication.basicInfo.contentType || 'mixed',
      categoryTag: publication.basicInfo.contentType?.toLowerCase().replace(/\s+/g, '-') || 'mixed',
      logo: publication.basicInfo.publicationName.substring(0, 3).toUpperCase(),
      logoColor: '#1E40AF',
      brief: `${publication.basicInfo.geographicCoverage || 'Local'} ${publication.basicInfo.contentType || 'publication'}`,
      reach: publication.audienceDemographics?.totalAudience?.toString() || 'Unknown',
      audience: publication.audienceDemographics?.targetMarkets?.join(', ') || 'General audience',
      strengths: publication.competitiveInfo?.keyDifferentiators || [],
      advertising: publication.crossChannelPackages?.map(pkg => pkg.name || pkg.packageName || 'Package') || [],
      isActive: publication.metadata?.verificationStatus !== 'outdated',
      sortOrder: 0,
      createdAt: publication.metadata?.createdAt || new Date(),
      updatedAt: publication.metadata?.lastUpdated || new Date()
    };
  } catch (error) {
    console.error('Error converting publication to media entity:', error);
    throw new Error('Failed to convert publication');
  }
};

// Get all publications as MediaEntity format for backward compatibility
export const getPublicationsAsMediaEntities = async (filters?: {
  geographicCoverage?: string;
  publicationType?: string;
  contentType?: string;
  verificationStatus?: string;
}) => {
  try {
    const publications = await getPublications(filters);
    return publications.map(pub => ({
      _id: pub._id,
      legacyId: pub.publicationId,
      name: pub.basicInfo.publicationName,
      type: pub.basicInfo.publicationType || 'publication',
      tagline: pub.basicInfo.publicationType,
      description: pub.editorialInfo?.contentFocus?.join(', ') || '',
      website: pub.basicInfo.websiteUrl,
      category: pub.basicInfo.contentType || 'mixed',
      categoryTag: pub.basicInfo.contentType?.toLowerCase().replace(/\s+/g, '-') || 'mixed',
      logo: pub.basicInfo.publicationName.substring(0, 3).toUpperCase(),
      logoColor: '#1E40AF',
      brief: `${pub.basicInfo.geographicCoverage || 'Local'} ${pub.basicInfo.contentType || 'publication'}`,
      reach: pub.audienceDemographics?.totalAudience?.toString() || 'Unknown',
      audience: pub.audienceDemographics?.targetMarkets?.join(', ') || 'General audience',
      strengths: pub.competitiveInfo?.keyDifferentiators || [],
      advertising: pub.crossChannelPackages?.map(pkg => pkg.name || pkg.packageName || 'Package') || [],
      isActive: pub.metadata?.verificationStatus !== 'outdated',
      sortOrder: 0,
      createdAt: pub.metadata?.createdAt || new Date(),
      updatedAt: pub.metadata?.lastUpdated || new Date()
    }));
  } catch (error) {
    console.error('Error converting publications to media entities:', error);
    throw new Error('Failed to convert publications');
  }
};
