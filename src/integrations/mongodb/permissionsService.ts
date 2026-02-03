import { getDatabase } from './client';
import { COLLECTIONS, UserPermissions, UserPublicationAccess, UserRole, AccessScope, PublicationGroup } from './schemas';
import { ObjectId } from 'mongodb';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PermissionsService');

/**
 * PermissionsService
 * 
 * Manages user permissions and access control for hubs and publications.
 * Supports scalable access patterns including hub-level, group-level, and individual access.
 */
export class PermissionsService {
  private get permissionsCollection() {
    return getDatabase().collection<UserPermissions>(COLLECTIONS.USER_PERMISSIONS);
  }
  
  private get accessJunctionCollection() {
    return getDatabase().collection<UserPublicationAccess>(COLLECTIONS.USER_PUBLICATION_ACCESS);
  }
  
  private get publicationGroupsCollection() {
    return getDatabase().collection<PublicationGroup>(COLLECTIONS.PUBLICATION_GROUPS);
  }
  
  /**
   * Check if permission filtering should be applied for this user
   * Returns false for admins only (they see everything)
   */
  async shouldFilterByPermissions(userId: string): Promise<boolean> {
    try {
      // Get user permissions
      const permissions = await this.getPermissions(userId);
      
      // Admin users always see everything
      if (permissions?.role === 'admin') {
        logger.debug('Admin user - no filtering applied');
        return false;
      }
      
      // All non-admin users should be filtered
      return true;
    } catch (error) {
      logger.error('Error checking if should filter by permissions:', error);
      return true; // Fail safe: filter by default for security
    }
  }

  /**
   * Get user permissions record
   */
  async getPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      return await this.permissionsCollection.findOne({ userId });
    } catch (error) {
      logger.error('Error getting permissions:', error);
      return null;
    }
  }

  /**
   * Check if user is admin (checks both new role and legacy isAdmin flag)
   */
  isAdmin(user: { role?: UserRole; isAdmin?: boolean }): boolean {
    return user.role === 'admin' || user.isAdmin === true;
  }

  /**
   * Check if user has access to a specific hub
   */
  async canAccessHub(userId: string, hubId: string): Promise<boolean> {
    try {
      const permissions = await this.getPermissions(userId);
      if (!permissions) return false; // No permissions = no access
      
      // Admin has access to everything
      if (permissions.role === 'admin') return true;
      
      // Check hub access
      if (permissions.hubAccess) {
        return permissions.hubAccess.some(access => access.hubId === hubId);
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking hub access:', error);
      return false;
    }
  }

  /**
   * Check if user has access to a specific publication
   */
  async canAccessPublication(userId: string, publicationId: string): Promise<boolean> {
    try {
      const permissions = await this.getPermissions(userId);
      if (!permissions) return false;
      
      // Admin has access to everything
      if (permissions.role === 'admin') return true;
      
      // First, look up the publication to get both ID formats
      // The ID passed could be either _id (MongoDB string) or publicationId (numeric)
      const publicationsCollection = getDatabase().collection(COLLECTIONS.PUBLICATIONS);
      const query: any = { $or: [] };
      
      // Try to match as string _id
      query.$or.push({ _id: publicationId });
      
      // Try to match as ObjectId (for MongoDB-generated IDs)
      if (ObjectId.isValid(publicationId)) {
        query.$or.push({ _id: new ObjectId(publicationId) });
      }
      
      // Try to match as numeric publicationId
      const numericId = parseInt(publicationId);
      if (!isNaN(numericId)) {
        query.$or.push({ publicationId: numericId });
      }
      
      const publication = await publicationsCollection.findOne(query);
      
      if (!publication) {
        logger.warn(`Publication not found for ID: ${publicationId}`);
        return false;
      }
      
      // Check via access junction table with the numeric publicationId
      // (which is how access records are stored)
      const access = await this.accessJunctionCollection.findOne({
        userId,
        publicationId: String(publication.publicationId)
      });
      
      if (access) {
        return true;
      }
      
      // Check if user has hub access and publication belongs to that hub
      // This handles cases where junction table wasn't synced or publication was added later
      if (permissions?.hubAccess && publication.hubIds) {
        const userHubIds = permissions.hubAccess.map(h => h.hubId);
        const publicationHubIds = Array.isArray(publication.hubIds) ? publication.hubIds : [publication.hubIds];
        
        const hasHubAccess = userHubIds.some(hubId => publicationHubIds.includes(hubId));
        if (hasHubAccess) {
          logger.info(`User ${userId} has hub-based access to publication ${publication.publicationId}`);
          return true;
        }
      }
      
      // Also check legacy permissions for backward compatibility
      if (permissions?.individualPublicationIds?.includes(String(publication.publicationId))) {
        logger.info(`User ${userId} has legacy publication access to ${publication.publicationId}`);
        return true;
      }
      
      logger.debug(`User ${userId} denied access to publication ${publicationId} - no access record found`);
      return false;
    } catch (error) {
      logger.error('Error checking publication access:', error);
      return false;
    }
  }

  /**
   * Get all hub IDs a user can access
   */
  async getUserHubs(userId: string): Promise<string[]> {
    try {
      const permissions = await this.getPermissions(userId);
      if (!permissions) return [];
      
      if (permissions.role === 'admin') {
        // Admin can access all hubs - return empty array to signal "all"
        return [];
      }
      
      if (permissions.hubAccess) {
        return permissions.hubAccess.map(access => access.hubId);
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting user hubs:', error);
      return [];
    }
  }

  /**
   * Get all publication IDs a user can access
   * Returns empty array for admins (signals "all publications")
   */
  async getUserPublications(userId: string): Promise<string[]> {
    try {
      const permissions = await this.getPermissions(userId);
      if (!permissions) return [];
      
      if (permissions.role === 'admin') {
        // Admin can access all publications - return empty array to signal "all"
        return [];
      }
      
      // Query access junction table
      const accessRecords = await this.accessJunctionCollection
        .find({ userId })
        .toArray();
      
      return accessRecords.map(record => record.publicationId);
    } catch (error) {
      logger.error('Error getting user publications:', error);
      return [];
    }
  }

  /**
   * Assign user to hub (admin or hub user with invite permissions)
   */
  async assignUserToHub(
    userId: string,
    hubId: string,
    assignedBy: string,
    accessLevel: 'full' | 'limited' = 'full'
  ): Promise<void> {
    try {
      logger.info(`Assigning user ${userId} to hub ${hubId}`);
      
      // Get or create permissions record
      let permissions = await this.getPermissions(userId);
      
      if (!permissions) {
        // Create new permissions record
        permissions = {
          userId,
          role: 'hub_user',
          accessScope: 'hub_level',
          hubAccess: [{ hubId, accessLevel }],
          canInviteUsers: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: assignedBy
        };
        
        await this.permissionsCollection.insertOne(permissions);
      } else {
        // Update existing permissions
        const hubAccess = permissions.hubAccess || [];
        
        // Check if hub already assigned
        const existingIndex = hubAccess.findIndex(access => access.hubId === hubId);
        
        if (existingIndex >= 0) {
          // Update existing
          hubAccess[existingIndex].accessLevel = accessLevel;
        } else {
          // Add new
          hubAccess.push({ hubId, accessLevel });
        }
        
        await this.permissionsCollection.updateOne(
          { userId },
          {
            $set: {
              hubAccess,
              updatedAt: new Date()
            }
          }
        );
      }
      
      // If full access, grant access to all publications in the hub
      if (accessLevel === 'full') {
        await this.syncHubPublicationsAccess(userId, hubId, assignedBy);
      }
      
      logger.info(`Successfully assigned user ${userId} to hub ${hubId}`);
    } catch (error) {
      logger.error('Error assigning user to hub:', error);
      throw error;
    }
  }

  /**
   * Sync publication access for a hub (grant access to all publications in the hub)
   */
  private async syncHubPublicationsAccess(userId: string, hubId: string, grantedBy: string): Promise<void> {
    try {
      // Get all publications in the hub
      const publicationsCollection = getDatabase().collection(COLLECTIONS.PUBLICATIONS);
      const publications = await publicationsCollection.find({ hubIds: hubId }).toArray();
      
      // Grant access to each publication
      const accessRecords: UserPublicationAccess[] = publications.map(pub => ({
        userId,
        publicationId: String(pub.publicationId),
        grantedVia: 'hub',
        grantedViaId: hubId,
        grantedAt: new Date(),
        grantedBy
      }));
      
      if (accessRecords.length > 0) {
        // Remove existing hub-based access for this user/hub combo
        await this.accessJunctionCollection.deleteMany({
          userId,
          grantedVia: 'hub',
          grantedViaId: hubId
        });
        
        // Insert new access records
        await this.accessJunctionCollection.insertMany(accessRecords);
      }
    } catch (error) {
      logger.error('Error syncing hub publications access:', error);
      throw error;
    }
  }

  /**
   * Assign user to individual publication
   */
  async assignUserToPublication(
    userId: string,
    publicationId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      logger.info(`Assigning user ${userId} to publication ${publicationId}`);
      
      // Get or create permissions record
      let permissions = await this.getPermissions(userId);
      
      if (!permissions) {
        // Create new permissions record
        permissions = {
          userId,
          role: 'publication_user',
          accessScope: 'individual',
          individualPublicationIds: [publicationId],
          canInviteUsers: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: assignedBy
        };
        
        await this.permissionsCollection.insertOne(permissions);
      } else {
        // Update existing permissions
        const individualPublicationIds = permissions.individualPublicationIds || [];
        
        if (!individualPublicationIds.includes(publicationId)) {
          individualPublicationIds.push(publicationId);
          
          await this.permissionsCollection.updateOne(
            { userId },
            {
              $set: {
                individualPublicationIds,
                updatedAt: new Date()
              }
            }
          );
        }
      }
      
      // Create access junction record
      const existingAccess = await this.accessJunctionCollection.findOne({
        userId,
        publicationId
      });
      
      if (!existingAccess) {
        await this.accessJunctionCollection.insertOne({
          userId,
          publicationId,
          grantedVia: 'direct',
          grantedAt: new Date(),
          grantedBy: assignedBy
        });
      }
      
      logger.info(`Successfully assigned user ${userId} to publication ${publicationId}`);
    } catch (error) {
      logger.error('Error assigning user to publication:', error);
      throw error;
    }
  }

  /**
   * Remove user from hub
   */
  async removeUserFromHub(userId: string, hubId: string): Promise<void> {
    try {
      logger.info(`Removing user ${userId} from hub ${hubId}`);
      
      // Update permissions
      await this.permissionsCollection.updateOne(
        { userId },
        {
          $pull: { hubAccess: { hubId } } as any,
          $set: { updatedAt: new Date() }
        }
      );
      
      // Remove access junction records granted via this hub
      await this.accessJunctionCollection.deleteMany({
        userId,
        grantedVia: 'hub',
        grantedViaId: hubId
      });
      
      logger.info(`Successfully removed user ${userId} from hub ${hubId}`);
    } catch (error) {
      logger.error('Error removing user from hub:', error);
      throw error;
    }
  }

  /**
   * Remove user from publication
   */
  async removeUserFromPublication(userId: string, publicationId: string): Promise<void> {
    try {
      logger.info(`Removing user ${userId} from publication ${publicationId}`);
      
      // Update permissions
      await this.permissionsCollection.updateOne(
        { userId },
        {
          $pull: { individualPublicationIds: publicationId } as any,
          $set: { updatedAt: new Date() }
        }
      );
      
      // Remove access junction record
      await this.accessJunctionCollection.deleteMany({
        userId,
        publicationId,
        grantedVia: 'direct'
      });
      
      logger.info(`Successfully removed user ${userId} from publication ${publicationId}`);
    } catch (error) {
      logger.error('Error removing user from publication:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole, updatedBy: string): Promise<void> {
    try {
      logger.info(`Updating user ${userId} role to ${role}`);
      
      // Also update the User record
      const usersCollection = getDatabase().collection(COLLECTIONS.USERS);
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role, updatedAt: new Date() } }
      );
      
      // Update permissions
      await this.permissionsCollection.updateOne(
        { userId },
        {
          $set: {
            role,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      logger.info(`Successfully updated user ${userId} role to ${role}`);
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Get all users who have access to a hub
   */
  async getHubUsers(hubId: string): Promise<Array<{ userId: string; accessLevel: string }>> {
    try {
      const permissions = await this.permissionsCollection
        .find({ 'hubAccess.hubId': hubId })
        .toArray();
      
      return permissions.map(perm => {
        const hubAccess = perm.hubAccess?.find(access => access.hubId === hubId);
        return {
          userId: perm.userId,
          accessLevel: hubAccess?.accessLevel || 'full'
        };
      });
    } catch (error) {
      logger.error('Error getting hub users:', error);
      return [];
    }
  }

  /**
   * Get all users who have access to a publication
   */
  async getPublicationUsers(publicationId: string): Promise<string[]> {
    try {
      const accessRecords = await this.accessJunctionCollection
        .find({ publicationId })
        .toArray();
      
      return accessRecords.map(record => record.userId);
    } catch (error) {
      logger.error('Error getting publication users:', error);
      return [];
    }
  }

  /**
   * Get users who have DIRECT access to a publication (excludes hub users)
   */
  async getDirectPublicationUsers(publicationId: string): Promise<string[]> {
    try {
      const accessRecords = await this.accessJunctionCollection
        .find({ 
          publicationId,
          grantedVia: 'direct'
        })
        .toArray();
      
      return accessRecords.map(record => record.userId);
    } catch (error) {
      logger.error('Error getting direct publication users:', error);
      return [];
    }
  }

  /**
   * Create a publication group for managing bulk access
   */
  async createPublicationGroup(
    groupId: string,
    name: string,
    publicationIds: string[],
    createdBy: string,
    hubId?: string,
    description?: string
  ): Promise<void> {
    try {
      const group: PublicationGroup = {
        groupId,
        name,
        description,
        publicationIds,
        hubId,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.publicationGroupsCollection.insertOne(group);
      logger.info(`Created publication group ${groupId} with ${publicationIds.length} publications`);
    } catch (error) {
      logger.error('Error creating publication group:', error);
      throw error;
    }
  }

  /**
   * Assign user to publication group
   */
  async assignUserToPublicationGroup(
    userId: string,
    groupId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      // Get group
      const group = await this.publicationGroupsCollection.findOne({ groupId });
      if (!group) {
        throw new Error(`Publication group ${groupId} not found`);
      }
      
      // Update permissions
      await this.permissionsCollection.updateOne(
        { userId },
        {
          $addToSet: { publicationGroupIds: groupId } as any,
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
      
      // Grant access to all publications in the group
      const accessRecords: UserPublicationAccess[] = group.publicationIds.map(pubId => ({
        userId,
        publicationId: pubId,
        grantedVia: 'group',
        grantedViaId: groupId,
        grantedAt: new Date(),
        grantedBy: assignedBy
      }));
      
      if (accessRecords.length > 0) {
        // Remove existing group-based access
        await this.accessJunctionCollection.deleteMany({
          userId,
          grantedVia: 'group',
          grantedViaId: groupId
        });
        
        // Insert new access records
        await this.accessJunctionCollection.insertMany(accessRecords);
      }
      
      logger.info(`Assigned user ${userId} to publication group ${groupId}`);
    } catch (error) {
      logger.error('Error assigning user to publication group:', error);
      throw error;
    }
  }
}

// Export singleton instance with lazy initialization
let _permissionsServiceInstance: PermissionsService | null = null;

export const permissionsService = {
  get instance(): PermissionsService {
    if (!_permissionsServiceInstance) {
      _permissionsServiceInstance = new PermissionsService();
    }
    return _permissionsServiceInstance;
  },
  
  // Proxy all methods to the instance
  shouldFilterByPermissions: (userId: string) => permissionsService.instance.shouldFilterByPermissions(userId),
  getPermissions: (userId: string) => permissionsService.instance.getPermissions(userId),
  isAdmin: (user: any) => permissionsService.instance.isAdmin(user),
  canAccessHub: (userId: string, hubId: string) => permissionsService.instance.canAccessHub(userId, hubId),
  canAccessPublication: (userId: string, publicationId: string) => permissionsService.instance.canAccessPublication(userId, publicationId),
  getUserHubs: (userId: string) => permissionsService.instance.getUserHubs(userId),
  getUserPublications: (userId: string) => permissionsService.instance.getUserPublications(userId),
  assignUserToHub: (userId: string, hubId: string, assignedBy: string, accessLevel?: 'full' | 'limited') => 
    permissionsService.instance.assignUserToHub(userId, hubId, assignedBy, accessLevel),
  assignUserToPublication: (userId: string, publicationId: string, assignedBy: string) => 
    permissionsService.instance.assignUserToPublication(userId, publicationId, assignedBy),
  removeUserFromHub: (userId: string, hubId: string) => permissionsService.instance.removeUserFromHub(userId, hubId),
  removeUserFromPublication: (userId: string, publicationId: string) => 
    permissionsService.instance.removeUserFromPublication(userId, publicationId),
  updateUserRole: (userId: string, role: any, updatedBy: string) => 
    permissionsService.instance.updateUserRole(userId, role, updatedBy),
  getHubUsers: (hubId: string) => permissionsService.instance.getHubUsers(hubId),
  getPublicationUsers: (publicationId: string) => permissionsService.instance.getPublicationUsers(publicationId),
  getDirectPublicationUsers: (publicationId: string) => permissionsService.instance.getDirectPublicationUsers(publicationId),
  createPublicationGroup: (groupId: string, name: string, publicationIds: string[], createdBy: string, hubId?: string, description?: string) =>
    permissionsService.instance.createPublicationGroup(groupId, name, publicationIds, createdBy, hubId, description),
  assignUserToPublicationGroup: (userId: string, groupId: string, assignedBy: string) =>
    permissionsService.instance.assignUserToPublicationGroup(userId, groupId, assignedBy)
};

