/**
 * Creative Assets Service
 * 
 * Handles business logic for creative assets management
 */

import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import {
  CreativeAsset,
  CreativeAssetInsert,
  CreativeAssetUpdate,
  CreativeAssetListFilters,
  CreativeAssetSummary
} from '../integrations/mongodb/creativesSchema';
import { ObjectId } from 'mongodb';

export class CreativesService {
  private get collection() {
    return getDatabase().collection<CreativeAsset>(COLLECTIONS.CREATIVE_ASSETS || 'creative_assets');
  }

  /**
   * Generate unique asset ID
   */
  private generateAssetId(): string {
    return `asset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new creative asset
   */
  async create(assetData: CreativeAssetInsert): Promise<CreativeAsset> {
    try {
      const now = new Date();
      const assetId = this.generateAssetId();

      const asset: CreativeAsset = {
        ...assetData,
        assetId,
        version: 1,
        usage: {
          downloadCount: 0,
          placements: [],
          ...assetData.usage
        },
        uploadInfo: {
          ...assetData.uploadInfo,
          uploadedAt: now
        }
      };

      const result = await this.collection.insertOne(asset);
      const created = await this.collection.findOne({ _id: result.insertedId });
      
      return created as CreativeAsset;
    } catch (error) {
      console.error('Error creating creative asset:', error);
      throw error;
    }
  }

  /**
   * Get asset by ID
   */
  async getById(id: string): Promise<CreativeAsset | null> {
    try {
      const query: any = {};
      
      // Try both _id (MongoDB) and assetId (our custom ID)
      if (ObjectId.isValid(id)) {
        query.$or = [
          { _id: new ObjectId(id) },
          { assetId: id }
        ];
      } else {
        query.assetId = id;
      }

      return await this.collection.findOne(query);
    } catch (error) {
      console.error('Error fetching creative asset:', error);
      throw error;
    }
  }

  /**
   * Get asset by asset ID
   */
  async getByAssetId(assetId: string): Promise<CreativeAsset | null> {
    try {
      return await this.collection.findOne({ assetId, deletedAt: { $exists: false } });
    } catch (error) {
      console.error('Error fetching creative asset by assetId:', error);
      throw error;
    }
  }

  /**
   * List assets with filters
   */
  async list(filters: CreativeAssetListFilters, limit = 50, skip = 0): Promise<CreativeAsset[]> {
    try {
      const query: any = { deletedAt: { $exists: false } };

      // Apply filters
      if (filters.campaignId) {
        query['associations.campaignId'] = filters.campaignId;
      }
      if (filters.packageId) {
        query['associations.packageId'] = filters.packageId;
      }
      if (filters.insertionOrderId) {
        query['associations.insertionOrderId'] = filters.insertionOrderId;
      }
      if (filters.publicationId !== undefined) {
        query['associations.publicationId'] = filters.publicationId;
      }
      if (filters.assetType) {
        query['metadata.assetType'] = filters.assetType;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.uploadedBy) {
        query['uploadInfo.uploadedBy'] = filters.uploadedBy;
      }
      if (filters.uploadedAfter || filters.uploadedBefore) {
        query['uploadInfo.uploadedAt'] = {};
        if (filters.uploadedAfter) {
          query['uploadInfo.uploadedAt'].$gte = filters.uploadedAfter;
        }
        if (filters.uploadedBefore) {
          query['uploadInfo.uploadedAt'].$lte = filters.uploadedBefore;
        }
      }
      if (filters.searchTerm) {
        query.$or = [
          { 'metadata.fileName': { $regex: filters.searchTerm, $options: 'i' } },
          { 'metadata.description': { $regex: filters.searchTerm, $options: 'i' } },
          { 'metadata.tags': { $in: [new RegExp(filters.searchTerm, 'i')] } }
        ];
      }

      return await this.collection
        .find(query)
        .sort({ 'uploadInfo.uploadedAt': -1 })
        .limit(limit)
        .skip(skip)
        .toArray();
    } catch (error) {
      console.error('Error listing creative assets:', error);
      throw error;
    }
  }

  /**
   * Get asset summaries (lighter weight for list views)
   */
  async listSummaries(filters: CreativeAssetListFilters, limit = 50, skip = 0): Promise<CreativeAssetSummary[]> {
    try {
      const assets = await this.list(filters, limit, skip);
      
      return assets.map(asset => ({
        _id: asset._id?.toString() || '',
        assetId: asset.assetId,
        fileName: asset.metadata.fileName,
        fileType: asset.metadata.fileType,
        fileSize: asset.metadata.fileSize,
        thumbnailUrl: asset.metadata.thumbnailUrl,
        assetType: asset.metadata.assetType,
        status: asset.status,
        uploadedAt: asset.uploadInfo.uploadedAt,
        uploadedBy: asset.uploadInfo.uploadedBy,
        associations: asset.associations
      }));
    } catch (error) {
      console.error('Error listing creative asset summaries:', error);
      throw error;
    }
  }

  /**
   * Update asset
   */
  async update(id: string, updates: CreativeAssetUpdate): Promise<CreativeAsset | null> {
    try {
      const query: any = {};
      
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query.assetId = id;
      }

      const result = await this.collection.findOneAndUpdate(
        query,
        { $set: updates },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error updating creative asset:', error);
      throw error;
    }
  }

  /**
   * Update asset status
   */
  async updateStatus(
    id: string,
    status: CreativeAsset['status'],
    userId: string,
    reason?: string
  ): Promise<CreativeAsset | null> {
    try {
      const updates: any = { status };
      
      if (status === 'approved') {
        updates.approvalInfo = {
          approvedBy: userId,
          approvedAt: new Date()
        };
      } else if (status === 'rejected') {
        updates.approvalInfo = {
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: reason
        };
      }

      return await this.update(id, updates);
    } catch (error) {
      console.error('Error updating asset status:', error);
      throw error;
    }
  }

  /**
   * Increment download count
   */
  async recordDownload(id: string): Promise<void> {
    try {
      const query: any = {};
      
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query.assetId = id;
      }

      await this.collection.updateOne(
        query,
        {
          $inc: { 'usage.downloadCount': 1 },
          $set: { 'usage.lastDownloadedAt': new Date() }
        }
      );
    } catch (error) {
      console.error('Error recording download:', error);
      throw error;
    }
  }

  /**
   * Add usage/placement record
   */
  async addPlacement(
    id: string,
    placement: {
      publicationId: number;
      publicationName: string;
      channel: string;
      placementName: string;
      usedAt?: Date;
    }
  ): Promise<void> {
    try {
      const query: any = {};
      
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query.assetId = id;
      }

      await this.collection.updateOne(
        query,
        {
          $push: {
            'usage.placements': {
              ...placement,
              usedAt: placement.usedAt || new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Error adding placement:', error);
      throw error;
    }
  }

  /**
   * Add comment to asset
   */
  async addComment(
    id: string,
    userId: string,
    userName: string,
    comment: string
  ): Promise<CreativeAsset | null> {
    try {
      const query: any = {};
      
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query.assetId = id;
      }

      const result = await this.collection.findOneAndUpdate(
        query,
        {
          $push: {
            comments: {
              userId,
              userName,
              comment,
              commentedAt: new Date()
            }
          }
        },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Soft delete asset
   */
  async delete(id: string, deletedBy: string): Promise<boolean> {
    try {
      const query: any = {};
      
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query.assetId = id;
      }

      const result = await this.collection.updateOne(
        query,
        {
          $set: {
            deletedAt: new Date(),
            deletedBy
          }
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error deleting creative asset:', error);
      throw error;
    }
  }

  /**
   * Get assets by campaign ID
   */
  async getByCampaignId(campaignId: string): Promise<CreativeAsset[]> {
    return await this.list({ campaignId });
  }

  /**
   * Get assets by package ID
   */
  async getByPackageId(packageId: string): Promise<CreativeAsset[]> {
    return await this.list({ packageId });
  }

  /**
   * Get assets by insertion order ID
   */
  async getByInsertionOrderId(insertionOrderId: string): Promise<CreativeAsset[]> {
    return await this.list({ insertionOrderId });
  }

  /**
   * Get assets by publication ID
   */
  async getByPublicationId(publicationId: number): Promise<CreativeAsset[]> {
    return await this.list({ publicationId });
  }

  /**
   * Find asset by content hash (for deduplication)
   * Returns existing asset if same content was already uploaded for this campaign
   */
  async findByHash(campaignId: string, contentHash: string): Promise<CreativeAsset | null> {
    try {
      return await this.collection.findOne({
        'associations.campaignId': campaignId,
        'metadata.contentHash': contentHash,
        deletedAt: { $exists: false }
      });
    } catch (error) {
      console.error('Error finding asset by hash:', error);
      return null;
    }
  }

  /**
   * Count assets matching filters
   */
  async count(filters: CreativeAssetListFilters): Promise<number> {
    try {
      const query: any = { deletedAt: { $exists: false } };

      // Apply same filters as list()
      if (filters.campaignId) {
        query['associations.campaignId'] = filters.campaignId;
      }
      if (filters.packageId) {
        query['associations.packageId'] = filters.packageId;
      }
      if (filters.insertionOrderId) {
        query['associations.insertionOrderId'] = filters.insertionOrderId;
      }
      if (filters.publicationId !== undefined) {
        query['associations.publicationId'] = filters.publicationId;
      }
      if (filters.assetType) {
        query['metadata.assetType'] = filters.assetType;
      }
      if (filters.status) {
        query.status = filters.status;
      }

      return await this.collection.countDocuments(query);
    } catch (error) {
      console.error('Error counting creative assets:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const creativesService = new CreativesService();

