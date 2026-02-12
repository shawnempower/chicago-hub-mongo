import { PublicationFrontend, PublicationInsertFrontend } from '@/types/publication';
import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

// Type for minimal publication data (for dropdowns)
export interface PublicationMinimal {
  _id?: string;
  publicationId: number;
  hubIds?: string[];
  basicInfo: {
    publicationName: string;
  };
}

// Type for list view publication data
export interface PublicationListItem {
  _id?: string;
  publicationId: number;
  hubIds?: string[];
  basicInfo: {
    publicationName: string;
    websiteUrl?: string;
    publicationType?: string;
    contentType?: string;
    geographicCoverage?: string;
    primaryServiceArea?: string;
  };
  contactInfo?: {
    primaryContact?: any;
  };
  metadata?: {
    verificationStatus?: string;
    lastUpdated?: string;
  };
}

// Paginated response type
export interface PaginatedPublicationsResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    count: number;
  };
}

// Field level options for getPublications
export type PublicationFieldLevel = 'minimal' | 'list' | 'full';

// Get all publications with optional filtering and field projection
export const getPublications = async (filters?: {
  geographicCoverage?: string;
  publicationType?: string;
  contentType?: string;
  verificationStatus?: string;
  fields?: PublicationFieldLevel;
}): Promise<PublicationFrontend[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.geographicCoverage) params.append('geographicCoverage', filters.geographicCoverage);
    if (filters?.publicationType) params.append('publicationType', filters.publicationType);
    if (filters?.contentType) params.append('contentType', filters.contentType);
    if (filters?.verificationStatus) params.append('verificationStatus', filters.verificationStatus);
    if (filters?.fields) params.append('fields', filters.fields);

    const url = `${API_BASE_URL}/publications${params.toString() ? '?' + params.toString() : ''}`;
    
    // Add timeout and better error handling for large responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await authenticatedFetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Publications API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch publications: ${response.status} ${response.statusText}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Unexpected response type:', contentType, text.substring(0, 100));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      // Validate response is an array
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', typeof data, data);
        throw new Error('Invalid response format: expected array');
      }

      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
      throw new Error('Network error while fetching publications');
    }
  } catch (error) {
    console.error('Error fetching publications:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch publications');
  }
};

// Get minimal publication data for dropdowns (much smaller payload)
export const getPublicationsMinimal = async (): Promise<PublicationMinimal[]> => {
  try {
    const url = `${API_BASE_URL}/publications?fields=minimal`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for minimal data
    
    try {
      const response = await authenticatedFetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch publications: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
      throw new Error('Network error while fetching publications');
    }
  } catch (error) {
    console.error('Error fetching minimal publications:', error);
    throw error;
  }
};

// Get paginated publications list (for admin views)
export const getPublicationsPaginated = async (options?: {
  limit?: number;
  cursor?: string;
  fields?: PublicationFieldLevel;
  filters?: {
    geographicCoverage?: string;
    publicationType?: string;
    contentType?: string;
    verificationStatus?: string;
  };
}): Promise<PaginatedPublicationsResponse<PublicationListItem>> => {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.fields) params.append('fields', options.fields);
    if (options?.filters?.geographicCoverage) params.append('geographicCoverage', options.filters.geographicCoverage);
    if (options?.filters?.publicationType) params.append('publicationType', options.filters.publicationType);
    if (options?.filters?.contentType) params.append('contentType', options.filters.contentType);
    if (options?.filters?.verificationStatus) params.append('verificationStatus', options.filters.verificationStatus);

    const url = `${API_BASE_URL}/publications${params.toString() ? '?' + params.toString() : ''}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await authenticatedFetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch publications: ${response.status}`);
      }

      const data = await response.json();
      
      // If response has pagination structure, return as-is
      if (data.pagination && data.data) {
        return data;
      }
      
      // If response is an array (non-paginated fallback), wrap it
      if (Array.isArray(data)) {
        return {
          data,
          pagination: {
            hasMore: false,
            nextCursor: null,
            count: data.length
          }
        };
      }

      throw new Error('Invalid response format');
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
      throw new Error('Network error while fetching publications');
    }
  } catch (error) {
    console.error('Error fetching paginated publications:', error);
    throw error;
  }
};

// Get a single publication by ID
export const getPublicationById = async (id: string): Promise<PublicationFrontend | null> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/${id}`);
    
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publicationData),
    });

    if (!response.ok) {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/import`, {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/import`, {
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/import-preview`, {
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

// Generate AI profile for a single publication using Perplexity
export const generateAiProfile = async (id: string): Promise<{
  success: boolean;
  publicationId: number;
  publicationName: string;
  aiProfile: {
    summary: string;
    fullProfile: string;
    audienceInsight: string;
    communityRole: string;
    citations: string[];
    generatedAt: string;
    generatedBy: string;
    version: number;
  };
}> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/${id}/generate-ai-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate AI profile: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating AI profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate AI profile');
  }
};

// Bulk generate AI profiles for publications that don't have one
export const bulkGenerateAiProfiles = async (limit = 10): Promise<{
  success: boolean;
  generated: number;
  failed: number;
  total: number;
  results: Array<{ publicationId: number; publicationName: string; success: boolean; error?: string }>;
}> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/bulk-generate-ai-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to bulk generate AI profiles: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error bulk generating AI profiles:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to bulk generate AI profiles');
  }
};

// Get publication categories for filtering
export const getPublicationCategories = async (): Promise<Array<{ id: string; name: string; count: number }>> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/categories`);
    
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
    const response = await authenticatedFetch(`${API_BASE_URL}/publications/types`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch publication types');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication types:', error);
    throw new Error('Failed to fetch publication types');
  }
};

