/**
 * Hub Service
 * 
 * Provides database operations for managing hubs.
 */

import { getDatabase } from './client';
import { COLLECTIONS } from './schemas';
import { Hub, HubInsert, HubUpdate, validateHubData } from './hubSchema';
import { ObjectId } from 'mongodb';

export class HubsService {
  /**
   * Get all hubs with optional filtering
   */
  static async getAllHubs(filters?: {
    status?: 'active' | 'inactive' | 'pending' | 'archived';
    includeInactive?: boolean;
  }) {
    const db = getDatabase();
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    } else if (!filters?.includeInactive) {
      // By default, only return active hubs
      query.status = 'active';
    }
    
    const hubs = await db
      .collection(COLLECTIONS.HUBS)
      .find(query)
      .sort({ 'basicInfo.name': 1 })
      .toArray();
    
    return hubs as Hub[];
  }

  /**
   * Get hub by MongoDB _id
   */
  static async getHubById(id: string): Promise<Hub | null> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid hub ID format');
    }
    
    const hub = await db
      .collection(COLLECTIONS.HUBS)
      .findOne({ _id: new ObjectId(id) });
    
    return hub as Hub | null;
  }

  /**
   * Get hub by hubId (slug)
   */
  static async getHubBySlug(hubId: string): Promise<Hub | null> {
    const db = getDatabase();
    
    const hub = await db
      .collection(COLLECTIONS.HUBS)
      .findOne({ hubId });
    
    return hub as Hub | null;
  }

  /**
   * Create a new hub
   */
  static async createHub(hubData: HubInsert): Promise<Hub> {
    const db = getDatabase();
    
    // Validate hub data
    const errors = validateHubData(hubData);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    // Check if hubId already exists
    const existing = await this.getHubBySlug(hubData.hubId);
    if (existing) {
      throw new Error(`Hub with ID '${hubData.hubId}' already exists`);
    }
    
    // Add timestamps if not provided
    const now = new Date();
    const hubToInsert = {
      ...hubData,
      createdAt: hubData.createdAt || now,
      updatedAt: hubData.updatedAt || now,
    };
    
    const result = await db
      .collection(COLLECTIONS.HUBS)
      .insertOne(hubToInsert);
    
    return {
      ...hubToInsert,
      _id: result.insertedId,
    } as Hub;
  }

  /**
   * Update an existing hub
   */
  static async updateHub(id: string, updates: Partial<HubUpdate>): Promise<Hub | null> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid hub ID format');
    }
    
    // Validate updates if hubId or basicInfo.name is being changed
    if (updates.hubId || updates.basicInfo) {
      const hub = await this.getHubById(id);
      if (!hub) {
        throw new Error('Hub not found');
      }
      
      const hubToValidate = {
        ...hub,
        ...updates,
        basicInfo: {
          ...hub.basicInfo,
          ...updates.basicInfo,
        },
      };
      
      const errors = validateHubData(hubToValidate);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
      
      // If hubId is changing, check for conflicts
      if (updates.hubId && updates.hubId !== hub.hubId) {
        const existing = await this.getHubBySlug(updates.hubId);
        if (existing) {
          throw new Error(`Hub with ID '${updates.hubId}' already exists`);
        }
      }
    }
    
    // Add updated timestamp
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };
    
    const result = await db
      .collection(COLLECTIONS.HUBS)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
    
    return result as Hub | null;
  }

  /**
   * Delete a hub (soft delete by setting status to archived)
   */
  static async deleteHub(id: string): Promise<boolean> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid hub ID format');
    }
    
    const result = await db
      .collection(COLLECTIONS.HUBS)
      .updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'archived',
            updatedAt: new Date()
          } 
        }
      );
    
    return result.modifiedCount > 0;
  }

  /**
   * Hard delete a hub (permanent removal)
   * Use with caution - this cannot be undone
   */
  static async hardDeleteHub(id: string): Promise<boolean> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid hub ID format');
    }
    
    const result = await db
      .collection(COLLECTIONS.HUBS)
      .deleteOne({ _id: new ObjectId(id) });
    
    return result.deletedCount > 0;
  }

  /**
   * Get publications assigned to a hub
   */
  static async getHubPublications(hubId: string) {
    const db = getDatabase();
    
    const publications = await db
      .collection(COLLECTIONS.PUBLICATIONS)
      .find({ hubIds: hubId })
      .sort({ 'basicInfo.publicationName': 1 })
      .toArray();
    
    return publications;
  }

  /**
   * Assign publication to hub(s)
   */
  static async assignPublicationToHubs(publicationId: string, hubIds: string[]): Promise<boolean> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(publicationId)) {
      throw new Error('Invalid publication ID format');
    }
    
    // Verify all hubs exist
    for (const hubId of hubIds) {
      const hub = await this.getHubBySlug(hubId);
      if (!hub) {
        throw new Error(`Hub '${hubId}' not found`);
      }
    }
    
    const result = await db
      .collection(COLLECTIONS.PUBLICATIONS)
      .updateOne(
        { _id: new ObjectId(publicationId) },
        { 
          $addToSet: { hubIds: { $each: hubIds } },
          $set: { 'metadata.lastUpdated': new Date() }
        }
      );
    
    return result.modifiedCount > 0;
  }

  /**
   * Remove publication from hub
   */
  static async removePublicationFromHub(publicationId: string, hubId: string): Promise<boolean> {
    const db = getDatabase();
    
    if (!ObjectId.isValid(publicationId)) {
      throw new Error('Invalid publication ID format');
    }
    
    const result = await db
      .collection(COLLECTIONS.PUBLICATIONS)
      .updateOne(
        { _id: new ObjectId(publicationId) },
        { 
          $pull: { hubIds: hubId },
          $set: { 'metadata.lastUpdated': new Date() }
        }
      );
    
    return result.modifiedCount > 0;
  }

  /**
   * Get hub statistics
   */
  static async getHubStats(hubId: string) {
    const db = getDatabase();
    
    const [publicationCount, packageCount] = await Promise.all([
      db.collection(COLLECTIONS.PUBLICATIONS).countDocuments({ hubIds: hubId }),
      db.collection(COLLECTIONS.HUB_PACKAGES).countDocuments({ 'hubInfo.hubId': hubId }),
    ]);
    
    return {
      publicationCount,
      packageCount,
    };
  }

  /**
   * Bulk assign publications to a hub
   */
  static async bulkAssignPublicationsToHub(publicationIds: string[], hubId: string): Promise<number> {
    const db = getDatabase();
    
    // Verify hub exists
    const hub = await this.getHubBySlug(hubId);
    if (!hub) {
      throw new Error(`Hub '${hubId}' not found`);
    }
    
    // Validate all publication IDs
    const objectIds = publicationIds.map(id => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid publication ID format: ${id}`);
      }
      return new ObjectId(id);
    });
    
    const result = await db
      .collection(COLLECTIONS.PUBLICATIONS)
      .updateMany(
        { _id: { $in: objectIds } },
        { 
          $addToSet: { hubIds: hubId },
          $set: { 'metadata.lastUpdated': new Date() }
        }
      );
    
    return result.modifiedCount;
  }

  /**
   * Get all publications not assigned to any hub
   */
  static async getUnassignedPublications() {
    const db = getDatabase();
    
    const publications = await db
      .collection(COLLECTIONS.PUBLICATIONS)
      .find({
        $or: [
          { hubIds: { $exists: false } },
          { hubIds: { $size: 0 } }
        ]
      })
      .sort({ 'basicInfo.publicationName': 1 })
      .toArray();
    
    return publications;
  }
}

