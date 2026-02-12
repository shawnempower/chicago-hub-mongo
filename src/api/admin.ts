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

// Assistant prompt types
export interface AssistantPrompt {
  _id: string | null;
  promptKey: string;
  label: string;
  category: 'system' | 'tool' | 'search' | 'model' | 'publication' | 'hub';
  content: string;
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface PromptKeyMeta {
  key: string;
  label: string;
  category: 'system' | 'tool' | 'search' | 'model' | 'publication' | 'hub';
  description: string;
}

export interface AssistantPromptsResponse {
  prompts: Record<string, AssistantPrompt[]>;
  promptKeys: PromptKeyMeta[];
}

export interface PromptHistoryResponse {
  promptKey: string;
  versions: AssistantPrompt[];
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

  // ===== Assistant Prompt Management =====

  // Get all active assistant prompts (grouped by category)
  async getAssistantPrompts(): Promise<AssistantPromptsResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Get version history for a specific prompt key
  async getPromptHistory(promptKey: string): Promise<PromptHistoryResponse> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts/${promptKey}/history`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Save a new version of a prompt
  async savePromptVersion(promptKey: string, content: string, version: string): Promise<{ success: boolean; prompt: AssistantPrompt }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptKey, content, version }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },

  // Activate a specific prompt version
  async activatePromptVersion(id: string): Promise<{ success: boolean; prompt: AssistantPrompt }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts/${id}/activate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Seed default prompts (one-time setup)
  async seedPromptDefaults(): Promise<{ success: boolean; seeded: string[]; skipped: string[] }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Get default content for a prompt key (for "Reset to Default")
  async getPromptDefault(promptKey: string): Promise<{ promptKey: string; content: string }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/assistant-prompts/${promptKey}/default`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
};

