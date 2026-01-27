import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireInvitePermission } from '../middleware/authenticate';
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';
import { invitationsService } from '../../src/integrations/mongodb/invitationsService';
import { authService } from '../../src/integrations/mongodb/authService';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';

const router = Router();

/**
 * Helper function to check if user is admin
 * Checks both req.user.isAdmin flag and role
 */
function isUserAdmin(user: any): boolean {
  return user.isAdmin === true || user.role === 'admin';
}

/**
 * Permissions Routes
 * 
 * Handles user invitations, access management, and role assignments
 */

// Invite user to a hub or publication
router.post('/invite', authenticateToken, requireInvitePermission, async (req: any, res: Response) => {
  try {
    const { email, resourceType, resourceId, resourceName } = req.body;
    
    console.log('🎯 [INVITE ROUTE] Received invitation request:', { email, resourceType, resourceId, resourceName });

    if (!email || !resourceType || !resourceId || !resourceName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, resourceType, resourceId, resourceName' 
      });
    }

    if (resourceType !== 'hub' && resourceType !== 'publication') {
      return res.status(400).json({ 
        error: 'resourceType must be either "hub" or "publication"' 
      });
    }

    const inviterName = req.user.firstName 
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : req.user.email;

    console.log('🎯 [INVITE ROUTE] Calling invitationsService.inviteUser...');
    
    const result = await invitationsService.inviteUser({
      invitedEmail: email,
      invitedBy: req.user.id,
      invitedByName: inviterName,
      resourceType,
      resourceId,
      resourceName
    });
    
    console.log('🎯 [INVITE ROUTE] Result from invitationsService:', result);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        invitation: result.invitation 
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept invitation
router.post('/accept-invitation/:token', authenticateToken, async (req: any, res: Response) => {
  try {
    const { token } = req.params;

    const result = await invitationsService.acceptInvitation(token, req.user.id);

    if (result.success) {
      res.json({ success: true, message: 'Invitation accepted successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get invitation details by token (public, for preview before accepting)
router.get('/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await invitationsService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    // Return safe invitation details (don't expose internal IDs)
    res.json({
      resourceType: invitation.resourceType,
      resourceName: invitation.resourceName,
      invitedEmail: invitation.invitedEmail,
      invitedByName: invitation.invitedByName,
      isExistingUser: invitation.isExistingUser,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    console.error('Error getting invitation:', error);
    res.status(500).json({ error: 'Failed to get invitation' });
  }
});

// Get users for a hub
router.get('/hub/:hubId/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.params;

    // Check if user has access to this hub
    const hasAccess = isUserAdmin(req.user) || 
      await permissionsService.canAccessHub(req.user.id, hubId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userIds = await permissionsService.getHubUsers(hubId);
    
    // Fetch user details
    const users = await Promise.all(
      userIds.map(async (entry) => {
        const user = await authService.getUserById(entry.userId);
        return user ? { ...user, accessLevel: entry.accessLevel } : null;
      })
    );

    res.json(users.filter(u => u !== null));
  } catch (error) {
    console.error('Error getting hub users:', error);
    res.status(500).json({ error: 'Failed to get hub users' });
  }
});

// Get users for a publication
router.get('/publication/:publicationId/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;

    // Check if user has access to this publication
    const hasAccess = isUserAdmin(req.user) || 
      await permissionsService.canAccessPublication(req.user.id, publicationId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only get users with direct publication access (not hub users)
    const userIds = await permissionsService.getDirectPublicationUsers(publicationId);
    
    // Fetch user details
    const users = await Promise.all(
      userIds.map(async (userId) => await authService.getUserById(userId))
    );

    res.json(users.filter(u => u !== null));
  } catch (error) {
    console.error('Error getting publication users:', error);
    res.status(500).json({ error: 'Failed to get publication users' });
  }
});

// Get pending invitations for a resource
router.get('/:resourceType/:resourceId/invitations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { resourceType, resourceId } = req.params;

    if (resourceType !== 'hub' && resourceType !== 'publication') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Check if user has access to this resource
    const hasAccess = isUserAdmin(req.user) || 
      (resourceType === 'hub' 
        ? await permissionsService.canAccessHub(req.user.id, resourceId)
        : await permissionsService.canAccessPublication(req.user.id, resourceId));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invitations = await invitationsService.getResourceInvitations(resourceType, resourceId);
    res.json(invitations);
  } catch (error) {
    console.error('Error getting invitations:', error);
    res.status(500).json({ error: 'Failed to get invitations' });
  }
});

// Assign existing user to hub (admin only)
router.post('/assign/hub', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId, hubId, accessLevel = 'full' } = req.body;

    if (!userId || !hubId) {
      return res.status(400).json({ error: 'userId and hubId are required' });
    }

    await permissionsService.assignUserToHub(userId, hubId, req.user.id, accessLevel);

    res.json({ success: true, message: 'User assigned to hub successfully' });
  } catch (error) {
    console.error('Error assigning user to hub:', error);
    res.status(500).json({ error: 'Failed to assign user to hub' });
  }
});

// Assign existing user to publication (admin only)
router.post('/assign/publication', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId, publicationId } = req.body;

    if (!userId || !publicationId) {
      return res.status(400).json({ error: 'userId and publicationId are required' });
    }

    await permissionsService.assignUserToPublication(userId, publicationId, req.user.id);

    res.json({ success: true, message: 'User assigned to publication successfully' });
  } catch (error) {
    console.error('Error assigning user to publication:', error);
    res.status(500).json({ error: 'Failed to assign user to publication' });
  }
});

// Revoke user access from hub
router.delete('/revoke/hub', authenticateToken, async (req: any, res: Response) => {
  try {
    const { userId, hubId } = req.body;

    if (!userId || !hubId) {
      return res.status(400).json({ error: 'userId and hubId are required' });
    }

    // Prevent users from removing themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own access. Please ask another administrator.' });
    }

    // Check if requester has access to manage this hub
    const canManage = permissionsService.isAdmin(req.user) || 
      await permissionsService.canAccessHub(req.user.id, hubId);

    if (!canManage) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await permissionsService.removeUserFromHub(userId, hubId);

    // Send notification email
    const user = await authService.getUserById(userId);
    if (user) {
      const { emailService } = await import('../emailService');
      const db = getDatabase();
      const hub = await db.collection(COLLECTIONS.HUBS).findOne({ hubId });
      
      if (emailService && hub) {
        await emailService.sendAccessRevokedEmail({
          recipientEmail: user.email,
          recipientName: user.firstName,
          resourceType: 'hub',
          resourceName: hub.basicInfo?.name || hubId,
          revokedBy: req.user.email,
          hubName: hub.basicInfo?.name
        });
      }
    }

    res.json({ success: true, message: 'User access revoked successfully' });
  } catch (error) {
    console.error('Error revoking hub access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Revoke user access from publication
router.delete('/revoke/publication', authenticateToken, async (req: any, res: Response) => {
  try {
    const { userId, publicationId } = req.body;

    if (!userId || !publicationId) {
      return res.status(400).json({ error: 'userId and publicationId are required' });
    }

    // Prevent users from removing themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own access. Please ask another administrator.' });
    }

    // Check if requester has access to manage this publication
    const canManage = permissionsService.isAdmin(req.user) || 
      await permissionsService.canAccessPublication(req.user.id, publicationId);

    if (!canManage) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await permissionsService.removeUserFromPublication(userId, publicationId);

    // Send notification email
    const user = await authService.getUserById(userId);
    if (user) {
      const { emailService } = await import('../emailService');
      const db = getDatabase();
      const publication = await db.collection(COLLECTIONS.PUBLICATIONS).findOne({ 
        publicationId: parseInt(publicationId) 
      });
      
      if (emailService && publication) {
        // Try to get hub name if publication belongs to a hub
        let hubName: string | undefined;
        if (publication.hubIds && publication.hubIds.length > 0) {
          const hub = await db.collection(COLLECTIONS.HUBS).findOne({ hubId: publication.hubIds[0] });
          hubName = hub?.basicInfo?.name;
        }
        
        await emailService.sendAccessRevokedEmail({
          recipientEmail: user.email,
          recipientName: user.firstName,
          resourceType: 'publication',
          resourceName: publication.basicInfo?.publicationName || publicationId,
          revokedBy: req.user.email,
          hubName
        });
      }
    }

    res.json({ success: true, message: 'User access revoked successfully' });
  } catch (error) {
    console.error('Error revoking publication access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Update user role (admin only)
router.patch('/role', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    const validRoles = ['admin', 'hub_user', 'publication_user', 'standard'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = user.role || 'standard';
    await permissionsService.updateUserRole(userId, role, req.user.id);

    // Send notification email
    const { emailService } = await import('../emailService');
    if (emailService) {
      await emailService.sendRoleChangeEmail({
        recipientEmail: user.email,
        recipientName: user.firstName,
        oldRole,
        newRole: role,
        changedBy: req.user.email
      });
    }

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get current user's assigned resources
router.get('/my-resources', authenticateToken, async (req: any, res: Response) => {
  try {
    const hubIds = await permissionsService.getUserHubs(req.user.id);
    const publicationIds = await permissionsService.getUserPublications(req.user.id);

    res.json({
      hubs: hubIds,
      publications: publicationIds,
      isAdmin: permissionsService.isAdmin(req.user)
    });
  } catch (error) {
    console.error('Error getting user resources:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

// Cancel invitation (admin or inviter only)
router.delete('/invitation/:invitationId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { invitationId } = req.params;

    // Note: Should add permission check here to ensure only admin or original inviter can cancel

    await invitationsService.cancelInvitation(invitationId, req.user.id);

    res.json({ success: true, message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// Resend invitation (admin or inviter only)
router.post('/invitation/:invitationId/resend', authenticateToken, async (req: any, res: Response) => {
  try {
    const { invitationId } = req.params;

    // Note: Should add permission check here to ensure only admin or original inviter can resend

    const result = await invitationsService.resendInvitation(invitationId);

    if (result.success) {
      res.json({ success: true, message: 'Invitation resent successfully' });
    } else {
      res.status(400).json({ error: result.error || 'Failed to resend invitation' });
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

export default router;

