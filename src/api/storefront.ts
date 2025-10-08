import { StorefrontConfiguration, StorefrontConfigurationInsert, StorefrontConfigurationUpdate } from '@/types/storefront';
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

// Get storefront configuration by publication ID
export const getStorefrontConfiguration = async (publicationId: string): Promise<StorefrontConfiguration | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${publicationId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching storefront configuration:', error);
    throw new Error('Failed to fetch storefront configuration');
  }
};

// Get all storefront configurations with optional filtering
export const getStorefrontConfigurations = async (filters?: {
  is_draft?: boolean;
  publisher_id?: string;
  isActive?: boolean;
}): Promise<StorefrontConfiguration[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.is_draft !== undefined) params.append('is_draft', filters.is_draft.toString());
    if (filters?.publisher_id) params.append('publisher_id', filters.publisher_id);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const url = `${API_BASE_URL}/storefront${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch storefront configurations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching storefront configurations:', error);
    throw new Error('Failed to fetch storefront configurations');
  }
};

// Create a new storefront configuration
export const createStorefrontConfiguration = async (configData: StorefrontConfigurationInsert): Promise<StorefrontConfiguration> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating storefront configuration:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create storefront configuration');
  }
};

// Update an existing storefront configuration
export const updateStorefrontConfiguration = async (publicationId: string, updates: Partial<StorefrontConfigurationInsert>): Promise<StorefrontConfiguration | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${publicationId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date(),
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('🔴 Storefront configuration update failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: `${API_BASE_URL}/storefront/${publicationId}`,
        updates
      });
      throw new Error(errorData.error || 'Failed to update storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating storefront configuration:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update storefront configuration');
  }
};

// Delete a storefront configuration
export const deleteStorefrontConfiguration = async (publicationId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${publicationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error('Failed to delete storefront configuration');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting storefront configuration:', error);
    throw new Error('Failed to delete storefront configuration');
  }
};

// Publish a draft storefront configuration (set is_draft to false)
export const publishStorefrontConfiguration = async (publicationId: string): Promise<StorefrontConfiguration | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${publicationId}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to publish storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error publishing storefront configuration:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to publish storefront configuration');
  }
};

// Duplicate a storefront configuration for a new publication
export const duplicateStorefrontConfiguration = async (sourcePublicationId: string, targetPublicationId: string, targetPublisherId: string): Promise<StorefrontConfiguration> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${sourcePublicationId}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        targetPublicationId,
        targetPublisherId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to duplicate storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error duplicating storefront configuration:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to duplicate storefront configuration');
  }
};

// Preview storefront configuration (get rendered HTML/data for preview)
export const previewStorefrontConfiguration = async (publicationId: string): Promise<{ html: string; config: StorefrontConfiguration }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/${publicationId}/preview`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Storefront configuration not found');
      }
      throw new Error('Failed to generate preview');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating storefront preview:', error);
    throw new Error('Failed to generate storefront preview');
  }
};

// Validate storefront configuration
export const validateStorefrontConfiguration = async (config: StorefrontConfigurationInsert): Promise<{ isValid: boolean; errors: string[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to validate storefront configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating storefront configuration:', error);
    throw new Error('Failed to validate storefront configuration');
  }
};

// Get storefront configuration templates
export const getStorefrontTemplates = async (): Promise<Array<{ id: string; name: string; description: string; config: StorefrontConfigurationInsert }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/storefront/templates`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch storefront templates');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching storefront templates:', error);
    throw new Error('Failed to fetch storefront templates');
  }
};
