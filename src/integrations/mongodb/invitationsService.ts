import { getDatabase } from './client';
import { COLLECTIONS, UserInvitation } from './schemas';
import { createLogger } from '../../utils/logger';
import { permissionsService } from './permissionsService';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

const logger = createLogger('InvitationsService');

// Lazy load email service to avoid path issues
async function getEmailService() {
  try {
    const { emailService } = await import('../../../server/emailService');
    console.log('📧 [GET EMAIL SERVICE] Imported emailService:', !!emailService);
    return emailService;
  } catch (error) {
    console.error('❌ [GET EMAIL SERVICE] Failed to import email service:', error);
    logger.warn('Email service not available:', error);
    return null;
  }
}

/**
 * InvitationsService
 * 
 * Manages user invitations for hub and publication access.
 * Handles invitation creation, acceptance, and email notifications.
 */
export class InvitationsService {
  private get invitationsCollection() {
    return getDatabase().collection<UserInvitation>(COLLECTIONS.USER_INVITATIONS);
  }
  
  private get usersCollection() {
    return getDatabase().collection(COLLECTIONS.USERS);
  }
  
  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if user has permission to invite others to a resource
   */
  async canInviteToResource(
    inviterId: string,
    resourceType: 'hub' | 'publication',
    resourceId: string
  ): Promise<boolean> {
    try {
      // Check if inviter is admin
      const inviterPermissions = await permissionsService.getPermissions(inviterId);
      if (inviterPermissions?.role === 'admin') {
        return true;
      }
      
      // Check if inviter has access to the resource and can invite users
      if (!inviterPermissions?.canInviteUsers) {
        return false;
      }
      
      if (resourceType === 'hub') {
        return await permissionsService.canAccessHub(inviterId, resourceId);
      } else {
        return await permissionsService.canAccessPublication(inviterId, resourceId);
      }
    } catch (error) {
      logger.error('Error checking invite permission:', error);
      return false;
    }
  }

  /**
   * Invite a user to a hub or publication
   */
  async inviteUser(params: {
    invitedEmail: string;
    invitedBy: string;
    invitedByName: string;
    resourceType: 'hub' | 'publication';
    resourceId: string;
    resourceName: string;
  }): Promise<{ success: boolean; invitation?: UserInvitation; error?: string }> {
    try {
      const { invitedEmail, invitedBy, invitedByName, resourceType, resourceId, resourceName } = params;
      
      console.log('📧 [INVITATIONS SERVICE] inviteUser called with:', params);
      logger.info(`Inviting ${invitedEmail} to ${resourceType} ${resourceId}`);
      
      // Check if inviter has permission
      const canInvite = await this.canInviteToResource(invitedBy, resourceType, resourceId);
      if (!canInvite) {
        return { 
          success: false, 
          error: 'You do not have permission to invite users to this resource' 
        };
      }
      
      // Check for existing pending invitation
      const existingInvitation = await this.invitationsCollection.findOne({
        invitedEmail: invitedEmail.toLowerCase(),
        resourceType,
        resourceId,
        status: 'pending'
      });
      
      if (existingInvitation) {
        return {
          success: false,
          error: 'An invitation has already been sent to this email for this resource'
        };
      }
      
      // Check if user already has access
      const existingUser = await this.usersCollection.findOne({ 
        email: invitedEmail.toLowerCase() 
      });
      
      console.log(`📧 [INVITE] Checking existing user for ${invitedEmail}:`, !!existingUser);
      
      if (existingUser) {
        const userId = existingUser._id?.toString() || '';
        const hasAccess = resourceType === 'hub'
          ? await permissionsService.canAccessHub(userId, resourceId)
          : await permissionsService.canAccessPublication(userId, resourceId);
        
        if (hasAccess) {
          return {
            success: false,
            error: 'This user already has access to this resource'
          };
        }
      }
      
      // Create invitation
      const invitationToken = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
      
      const invitation: UserInvitation = {
        invitedEmail: invitedEmail.toLowerCase(),
        invitedBy,
        invitedByName,
        invitationToken,
        resourceType,
        resourceId,
        resourceName,
        isExistingUser: !!existingUser,
        status: 'pending',
        expiresAt,
        createdAt: new Date()
      };
      
      console.log(`📧 [INVITE] Created invitation with isExistingUser=${invitation.isExistingUser}`);
      
      await this.invitationsCollection.insertOne(invitation);
      
      // Get inviter's email for the invitation email
      const inviter = await this.usersCollection.findOne({ _id: new ObjectId(invitedBy) });
      const inviterEmail = inviter?.email || '';
      
      // Send invitation email
      console.log('📧 [INVITATIONS SERVICE] About to load email service...');
      const emailService = await getEmailService();
      console.log(`📧 [INVITATIONS SERVICE] Email service loaded: ${!!emailService}`);
      logger.info(`Email service loaded: ${!!emailService}`);
      
      if (emailService) {
        console.log(`📧 [INVITATIONS SERVICE] Sending invitation email to ${invitedEmail}`);
        logger.info(`Sending invitation email to ${invitedEmail}`);
        
        // Get hub name for email branding
        let hubName: string | undefined;
        if (resourceType === 'hub') {
          // For hub invitations, resourceName is the hub name
          hubName = resourceName;
        } else if (resourceType === 'publication') {
          // For publication invitations, look up the publication's hub
          const publication = await getDatabase().collection(COLLECTIONS.PUBLICATIONS).findOne({
            publicationId: parseInt(resourceId)
          });
          if (publication?.hubIds && publication.hubIds.length > 0) {
            const hub = await getDatabase().collection(COLLECTIONS.HUBS).findOne({
              hubId: publication.hubIds[0]
            });
            hubName = hub?.basicInfo?.name;
          }
        }
        
        const emailResult = await emailService.sendInvitationEmail({
          invitedByName,
          invitedByEmail: inviterEmail,
          recipientEmail: invitedEmail,
          recipientName: existingUser?.firstName,
          resourceType,
          resourceName,
          invitationToken,
          isExistingUser: !!existingUser,
          hubName
        });
        
        console.log(`📧 [INVITATIONS SERVICE] Email result:`, emailResult);
        logger.info(`Email result: ${JSON.stringify(emailResult)}`);
        
        if (!emailResult.success) {
          console.error('❌ Failed to send invitation email:', emailResult.error);
          logger.error('Failed to send invitation email:', emailResult.error);
        } else {
          console.log('✅ Invitation email sent successfully to ' + invitedEmail);
          logger.info('✅ Invitation email sent successfully to ' + invitedEmail);
        }
      } else {
        console.error('❌ Email service is not available - emails will not be sent!');
        logger.error('❌ Email service is not available - emails will not be sent!');
      }
      
      logger.info(`Successfully created invitation for ${invitedEmail}`);
      
      return { success: true, invitation };
    } catch (error) {
      logger.error('Error inviting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invitation'
      };
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Accepting invitation with token ${token.substring(0, 8)}...`);
      
      // Find invitation
      const invitation = await this.invitationsCollection.findOne({
        invitationToken: token,
        status: 'pending'
      });
      
      if (!invitation) {
        return { success: false, error: 'Invalid or expired invitation' };
      }
      
      // Check expiration
      if (new Date() > invitation.expiresAt) {
        await this.invitationsCollection.updateOne(
          { _id: invitation._id },
          { $set: { status: 'expired' } }
        );
        return { success: false, error: 'This invitation has expired' };
      }
      
      // Grant access based on resource type
      if (invitation.resourceType === 'hub') {
        await permissionsService.assignUserToHub(
          userId,
          invitation.resourceId,
          invitation.invitedBy
        );
      } else {
        await permissionsService.assignUserToPublication(
          userId,
          invitation.resourceId,
          invitation.invitedBy
        );
      }
      
      // Mark invitation as accepted
      await this.invitationsCollection.updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date()
          }
        }
      );
      
      // Send confirmation email
      const emailService = await getEmailService();
      if (emailService) {
        const { ObjectId } = await import('mongodb');
        const user = await this.usersCollection.findOne({ _id: new ObjectId(userId) });
        if (user) {
          await emailService.sendAccessGrantedEmail({
            recipientEmail: user.email,
            recipientName: user.firstName,
            resourceType: invitation.resourceType,
            resourceName: invitation.resourceName,
            grantedBy: 'invitation'
          });
        }
      }
      
      logger.info(`Successfully accepted invitation for user ${userId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation'
      };
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
    try {
      await this.invitationsCollection.updateOne(
        { _id: new ObjectId(invitationId) },
        { $set: { status: 'cancelled' } }
      );
      logger.info(`Cancelled invitation ${invitationId}`);
    } catch (error) {
      logger.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Resend an invitation email
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invitation = await this.invitationsCollection.findOne({ _id: new ObjectId(invitationId) });
      
      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }
      
      if (invitation.status !== 'pending') {
        return { success: false, error: 'Can only resend pending invitations' };
      }
      
      // Check if expired and update if needed
      if (invitation.expiresAt < new Date()) {
        // Extend expiration by 7 days
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);
        
        await this.invitationsCollection.updateOne(
          { _id: new ObjectId(invitationId) },
          { $set: { expiresAt: newExpiresAt } }
        );
        
        invitation.expiresAt = newExpiresAt;
      }
      
      // Get inviter info and check if recipient exists
      const inviter = await this.usersCollection.findOne({ 
        _id: new ObjectId(invitation.invitedBy) 
      });
      const inviterEmail = inviter?.email || '';
      
      const existingUser = await this.usersCollection.findOne({ 
        email: invitation.invitedEmail.toLowerCase() 
      });
      
      // Send invitation email again
      const emailService = await getEmailService();
      console.log(`📧 [RESEND] Email service loaded: ${!!emailService}`);
      logger.info(`[RESEND] Email service loaded: ${!!emailService}`);
      
      if (emailService) {
        console.log(`📧 [RESEND] Sending invitation email to ${invitation.invitedEmail}`);
        logger.info(`[RESEND] Sending invitation email to ${invitation.invitedEmail}`);
        const emailResult = await emailService.sendInvitationEmail({
          invitedByName: invitation.invitedByName,
          invitedByEmail: inviterEmail,
          recipientEmail: invitation.invitedEmail,
          recipientName: existingUser?.firstName,
          resourceType: invitation.resourceType,
          resourceName: invitation.resourceName,
          invitationToken: invitation.invitationToken,
          isExistingUser: !!existingUser
        });
        
        console.log(`📧 [RESEND] Email result:`, emailResult);
        logger.info(`[RESEND] Email result: ${JSON.stringify(emailResult)}`);
        
        if (!emailResult.success) {
          console.error('❌ [RESEND] Failed to send invitation email:', emailResult.error);
          logger.error('[RESEND] Failed to send invitation email:', emailResult.error);
        } else {
          console.log('✅ [RESEND] Invitation email sent successfully to ' + invitation.invitedEmail);
          logger.info('✅ [RESEND] Invitation email sent successfully to ' + invitation.invitedEmail);
        }
      } else {
        console.error('❌ [RESEND] Email service is not available - emails will not be sent!');
        logger.error('❌ [RESEND] Email service is not available - emails will not be sent!');
      }
      
      logger.info(`Resent invitation ${invitationId} to ${invitation.invitedEmail}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error resending invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation'
      };
    }
  }

  /**
   * Get pending invitations for a resource
   */
  async getResourceInvitations(
    resourceType: 'hub' | 'publication',
    resourceId: string
  ): Promise<UserInvitation[]> {
    try {
      return await this.invitationsCollection
        .find({
          resourceType,
          resourceId,
          status: 'pending'
        })
        .toArray();
    } catch (error) {
      logger.error('Error getting resource invitations:', error);
      return [];
    }
  }

  /**
   * Get user's pending invitations by email
   */
  async getUserInvitations(email: string): Promise<UserInvitation[]> {
    try {
      return await this.invitationsCollection
        .find({
          invitedEmail: email.toLowerCase(),
          status: 'pending',
          expiresAt: { $gt: new Date() }
        })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      logger.error('Error getting user invitations:', error);
      return [];
    }
  }

  /**
   * Cleanup expired invitations (can be run periodically)
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await this.invitationsCollection.updateMany(
        {
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        {
          $set: { status: 'expired' }
        }
      );
      
      logger.info(`Marked ${result.modifiedCount} invitations as expired`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  }

  /**
   * Get invitation by token (for displaying invitation details)
   */
  async getInvitationByToken(token: string): Promise<UserInvitation | null> {
    try {
      return await this.invitationsCollection.findOne({
        invitationToken: token,
        status: 'pending'
      });
    } catch (error) {
      logger.error('Error getting invitation by token:', error);
      return null;
    }
  }
}

// Export singleton instance with lazy initialization
let _invitationsServiceInstance: InvitationsService | null = null;

export const invitationsService = {
  get instance(): InvitationsService {
    if (!_invitationsServiceInstance) {
      _invitationsServiceInstance = new InvitationsService();
    }
    return _invitationsServiceInstance;
  },
  
  // Proxy all methods to the instance
  canInviteToResource: (inviterId: string, resourceType: 'hub' | 'publication', resourceId: string) =>
    invitationsService.instance.canInviteToResource(inviterId, resourceType, resourceId),
  inviteUser: (params: any) => invitationsService.instance.inviteUser(params),
  acceptInvitation: (token: string, userId: string) => invitationsService.instance.acceptInvitation(token, userId),
  cancelInvitation: (invitationId: string, cancelledBy: string) => 
    invitationsService.instance.cancelInvitation(invitationId, cancelledBy),
  resendInvitation: (invitationId: string) =>
    invitationsService.instance.resendInvitation(invitationId),
  getResourceInvitations: (resourceType: 'hub' | 'publication', resourceId: string) =>
    invitationsService.instance.getResourceInvitations(resourceType, resourceId),
  getUserInvitations: (email: string) => invitationsService.instance.getUserInvitations(email),
  cleanupExpiredInvitations: () => invitationsService.instance.cleanupExpiredInvitations(),
  getInvitationByToken: (token: string) => invitationsService.instance.getInvitationByToken(token)
};

