// Admin API endpoints for package management
import type { DatabasePackage } from '@/hooks/usePackages';
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
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface PackageCreateData {
  name: string;
  tagline?: string;
  description?: string;
  price?: string;
  priceRange?: string;
  audience?: string[];
  channels?: string[];
  complexity?: string;
  outlets?: string[];
  features?: string[];
  isActive?: boolean;
}

export interface PackagesListResponse {
  packages: any[];
}

export const packagesApi = {
  // Get all packages
  async getAll(activeOnly: boolean = false): Promise<PackagesListResponse> {
    try {
      const url = `${API_BASE_URL}/packages?active_only=${activeOnly}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw error;
    }
  },

  // Create new package (admin only)
  async create(packageData: PackageCreateData): Promise<{ package: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/packages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  },

  // Update package (admin only)
  async update(packageId: string, packageData: Partial<PackageCreateData>): Promise<{ package: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/packages/${packageId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (response.status === 404) {
          throw new Error('Package not found.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating package:', error);
      throw error;
    }
  },

  // Delete package (admin only)
  async delete(packageId: string, permanent: boolean = false): Promise<{ success: boolean }> {
    try {
      const url = `${API_BASE_URL}/admin/packages/${packageId}${permanent ? '?permanent=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (response.status === 404) {
          throw new Error('Package not found.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  },

  // Generate insertion order for a package
  async generateInsertionOrder(
    packageId: string, 
    format: 'html' | 'markdown' = 'html'
  ): Promise<{ success: boolean; insertionOrder: { generatedAt: Date; format: string; content: string; version: number } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hub-packages/${packageId}/insertion-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 404) {
          throw new Error('Package not found.');
        }
        if (response.status === 400) {
          try {
            const error = JSON.parse(errorText);
            throw new Error(error.error || 'Invalid format specified.');
          } catch (e) {
            throw new Error('Invalid format specified.');
          }
        }
        throw new Error(`Failed to generate insertion order (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating package insertion order:', error);
      throw error;
    }
  },
};


