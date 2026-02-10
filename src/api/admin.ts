// Admin API endpoints for user management
import type { UserProfile } from "@/types/common";
import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

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

export interface UserPermissionDetail {
  userId: string;
  role: string | null;
  accessScope: string | null;
  hubAccess: Array<{ hubId: string; hubName: string; accessLevel: string }>;
  publicationAccess: Array<{ publicationId: string; publicationName: string; grantedVia: string }>;
  canInviteUsers: boolean;
  canManageGroups: boolean;
  hasPermissionsRecord: boolean;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  reasons: string[];
}

export const adminApi = {
  // Check if current user is admin
  async checkAdminStatus(): Promise<AdminCheckResponse> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 403) {
          throw new Error('Access denied. You must be an admin to manage user privileges.');
        }
        if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request data.');
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  },

  // Get full permission details for a user (admin only)
  async getUserPermissions(userId: string): Promise<UserPermissionDetail> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}/permissions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  },

  // Check if a user can access a specific resource (admin diagnostic tool)
  async checkUserAccess(userId: string, resourceType: 'hub' | 'publication', resourceId: string): Promise<AccessCheckResult> {
    try {
      const params = new URLSearchParams({ resourceType, resourceId });
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}/check-access?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking user access:', error);
      throw error;
    }
  },

  // Update user role (admin only) - uses permissions API endpoint
  async updateUserRole(userId: string, role: string): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/permissions/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },
};

