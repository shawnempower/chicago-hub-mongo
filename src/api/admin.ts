// Admin API endpoints for user management
import type { UserProfile } from "@/types/common";
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

export interface AdminCheckResponse {
  isAdmin: boolean;
}

export interface UsersListResponse {
  users: UserProfile[];
}

export interface AdminStatusUpdateResponse {
  success: boolean;
  profile: UserProfile;
  message: string;
}

export const adminApi = {
  // Check if current user is admin
  async checkAdminStatus(): Promise<AdminCheckResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/check`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking admin status:', error);
      throw error;
    }
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<UsersListResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Set/unset admin privileges for a user (admin only)
  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<AdminStatusUpdateResponse> {
    try {
      console.log(`API call: Updating admin status for userId=${userId}, isAdmin=${isAdmin}`);
      
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isAdmin }),
      });

      console.log(`API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        
        if (response.status === 403) {
          throw new Error('Access denied. You must be an admin to manage user privileges.');
        }
        if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request data.');
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API success response:', result);
      return result;
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  },
};

