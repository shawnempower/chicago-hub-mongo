import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';

/**
 * Permissions API Client
 * Handles user invitations, access management, and role assignments
 */

interface InviteUserParams {
  email: string;
  resourceType: 'hub' | 'publication';
  resourceId: string;
  resourceName: string;
}

interface AssignUserParams {
  userId: string;
  hubId?: string;
  publicationId?: string;
  accessLevel?: 'full' | 'limited';
}

interface RevokeAccessParams {
  userId: string;
  hubId?: string;
  publicationId?: string;
}

interface UpdateRoleParams {
  userId: string;
  role: 'admin' | 'hub_user' | 'publication_user' | 'standard';
}

class PermissionsAPI {
  private baseUrl = `${API_BASE_URL}/permissions`;

  /**
   * Invite a user to a hub or publication
   */
  async inviteUser(params: InviteUserParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to send invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error inviting user:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/accept-invitation/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to accept invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Get invitation details by token (public)
   */
  async getInvitation(token: string): Promise<{ invitation?: any; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/invitation/${token}`);
      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Invitation not found' };
      }

      return { invitation: result };
    } catch (error) {
      console.error('Error getting invitation:', error);
      return { error: 'Network error occurred' };
    }
  }

  /**
   * Get users for a hub
   */
  async getHubUsers(hubId: string): Promise<{ users?: any[]; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/hub/${hubId}/users`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to get hub users' };
      }

      return { users: result };
    } catch (error) {
      console.error('Error getting hub users:', error);
      return { error: 'Network error occurred' };
    }
  }

  /**
   * Get users for a publication
   */
  async getPublicationUsers(publicationId: string): Promise<{ users?: any[]; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/publication/${publicationId}/users`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to get publication users' };
      }

      return { users: result };
    } catch (error) {
      console.error('Error getting publication users:', error);
      return { error: 'Network error occurred' };
    }
  }

  /**
   * Get pending invitations for a resource
   */
  async getResourceInvitations(
    resourceType: 'hub' | 'publication',
    resourceId: string
  ): Promise<{ invitations?: any[]; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/${resourceType}/${resourceId}/invitations`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to get invitations' };
      }

      return { invitations: result };
    } catch (error) {
      console.error('Error getting invitations:', error);
      return { error: 'Network error occurred' };
    }
  }

  /**
   * Assign existing user to hub (admin only)
   */
  async assignUserToHub(params: AssignUserParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/assign/hub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          hubId: params.hubId,
          accessLevel: params.accessLevel || 'full',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to assign user to hub' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning user to hub:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Assign existing user to publication (admin only)
   */
  async assignUserToPublication(params: AssignUserParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/assign/publication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          publicationId: params.publicationId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to assign user to publication' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning user to publication:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Revoke user access from hub
   */
  async revokeHubAccess(params: RevokeAccessParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/revoke/hub`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          hubId: params.hubId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to revoke access' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error revoking hub access:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Revoke user access from publication
   */
  async revokePublicationAccess(params: RevokeAccessParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/revoke/publication`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          publicationId: params.publicationId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to revoke access' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error revoking publication access:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(params: UpdateRoleParams): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update user role' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Get current user's assigned resources
   */
  async getMyResources(): Promise<{ hubs?: string[]; publications?: string[]; isAdmin?: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/my-resources`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to get resources' };
      }

      return result;
    } catch (error) {
      console.error('Error getting user resources:', error);
      return { error: 'Network error occurred' };
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/invitation/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to cancel invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/invitation/${invitationId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to resend invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }
}

export const permissionsAPI = new PermissionsAPI();

