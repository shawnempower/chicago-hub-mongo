/**
 * Insertion Order Service
 * 
 * Handles business logic for insertion order lifecycle management.
 * Orders are stored in their own collection (publication_insertion_orders).
 */

import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { Campaign } from '../integrations/mongodb/campaignSchema';
import { HubPackage } from '../integrations/mongodb/hubPackageSchema';
import {
  PublicationInsertionOrderDocument,
  PublicationInsertionOrderInsert,
  PublicationInsertionOrderWithCampaign,
  OrderStatusHistoryEntry,
  OrderAdSpecification,
  OrderAssetReference,
  OrderMessage,
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS
} from '../integrations/mongodb/insertionOrderSchema';
import { ObjectId } from 'mongodb';

// Re-define the type here to avoid ESM export issues
export type InsertionOrderStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';

export class InsertionOrderService {
  private get ordersCollection() {
    return getDatabase().collection<PublicationInsertionOrderDocument>(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
  }

  private get campaignsCollection() {
    return getDatabase().collection<Campaign>(COLLECTIONS.CAMPAIGNS);
  }

  private get packagesCollection() {
    return getDatabase().collection<HubPackage>(COLLECTIONS.HUB_PACKAGES);
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(
    currentStatus: InsertionOrderStatus,
    newStatus: InsertionOrderStatus
  ): { valid: boolean; error?: string } {
    if (currentStatus === newStatus) {
      return { valid: false, error: 'Status is already set to this value' };
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string): Promise<PublicationInsertionOrderDocument | null> {
    try {
      const objectId = new ObjectId(orderId);
      return await this.ordersCollection.findOne({ 
        _id: objectId,
        deletedAt: { $exists: false }
      });
    } catch {
      return null;
    }
  }

  /**
   * Get order by campaign and publication
   */
  async getOrderByCampaignAndPublication(
    campaignId: string,
    publicationId: number
  ): Promise<PublicationInsertionOrderDocument | null> {
    return await this.ordersCollection.findOne({
      campaignId,
      publicationId,
      deletedAt: { $exists: false }
    });
  }

  /**
   * Update insertion order status
   */
  async updateCampaignOrderStatus(
    campaignId: string,
    publicationId: number,
    newStatus: InsertionOrderStatus,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; order?: PublicationInsertionOrderDocument }> {
    try {
      // Find the order
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Insertion order not found' };
      }

      // Validate transition
      const validation = this.validateStatusTransition(
        order.status as InsertionOrderStatus,
        newStatus
      );
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create status history entry
      const historyEntry: OrderStatusHistoryEntry = {
        status: newStatus,
        timestamp: new Date(),
        changedBy: userId,
        notes
      };

      // Build update
      const update: any = {
        $set: {
          status: newStatus,
          updatedAt: new Date()
        },
        $push: {
          statusHistory: historyEntry
        }
      };

      // Special handling for specific statuses
      if (newStatus === 'confirmed') {
        update.$set.confirmationDate = new Date();
      }
      if (newStatus === 'sent') {
        update.$set.sentAt = new Date();
      }

      // Update in database
      const result = await this.ordersCollection.findOneAndUpdate(
        { _id: order._id },
        update,
        { returnDocument: 'after' }
      );

      // Note: Tracking scripts are generated when creative assets are uploaded,
      // not when order status changes. Scripts depend on having assets first.

      return { success: true, order: result || undefined };
    } catch (error) {
      console.error('Error updating insertion order status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get insertion orders for a publication
   */
  async getOrdersForPublication(
    publicationId: number,
    filters?: {
      status?: InsertionOrderStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<PublicationInsertionOrderWithCampaign[]> {
    try {
      const query: any = {
        publicationId,
        deletedAt: { $exists: false }
      };

      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.dateFrom) {
        query.generatedAt = { ...query.generatedAt, $gte: filters.dateFrom };
      }
      if (filters?.dateTo) {
        query.generatedAt = { ...query.generatedAt, $lte: filters.dateTo };
      }

      const orders = await this.ordersCollection
        .find(query)
        .sort({ generatedAt: -1 })
        .toArray();

      // Enrich orders with campaign data (selectedInventory, timeline, etc.)
      if (orders.length === 0) {
        return [];
      }

      // Get unique campaign IDs and fetch campaigns
      const campaignIds = [...new Set(orders.map(o => o.campaignId))];
      const campaigns = await this.campaignsCollection
        .find({ campaignId: { $in: campaignIds } })
        .toArray();
      
      const campaignMap = new Map<string, any>();
      campaigns.forEach(c => campaignMap.set(c.campaignId, c));

      // Get all creative assets for these campaigns to calculate fresh asset status
      const creativeAssetsCollection = getDatabase().collection(COLLECTIONS.CREATIVE_ASSETS);
      const allCampaignAssets = await creativeAssetsCollection.find({
        'associations.campaignId': { $in: campaignIds },
        deletedAt: { $exists: false }
      }).toArray();

      // Group assets by campaign
      const assetsByCampaign = new Map<string, any[]>();
      allCampaignAssets.forEach((asset: any) => {
        const cid = asset.associations?.campaignId;
        if (cid) {
          if (!assetsByCampaign.has(cid)) {
            assetsByCampaign.set(cid, []);
          }
          assetsByCampaign.get(cid)!.push(asset);
        }
      });

      // Enrich each order with campaign data and fresh asset status
      return orders.map(order => {
        const campaign = campaignMap.get(order.campaignId);
        const campaignAssets = assetsByCampaign.get(order.campaignId) || [];
        
        // Calculate fresh asset status by checking each placement
        const pub = campaign?.selectedInventory?.publications?.find(
          (p: any) => String(p.publicationId) === String(order.publicationId)
        );
        const inventoryItems = pub?.inventoryItems || [];
        const totalPlacements = inventoryItems.length;
        
        let placementsWithAssets = 0;
        for (const item of inventoryItems) {
          const itemPlacementId = item.itemPath || item.sourcePath;

          // Simple direct placement lookup - check if any asset has this placement linked
          const hasAsset = campaignAssets.some((asset: any) => {
            // Primary: Direct placement link (new approach)
            const assetPlacements = asset.associations?.placements;
            if (assetPlacements && Array.isArray(assetPlacements)) {
              return assetPlacements.some((p: any) => {
                // Check for exact match
                if (p.placementId === itemPlacementId) return true;
                // Check for expanded dimension match (asset has _dim0, _dim1, etc suffix)
                if (p.placementId && itemPlacementId && p.placementId.startsWith(itemPlacementId + '_dim')) return true;
                // Also check with publication context
                if (p.publicationId === order.publicationId) {
                  if (p.placementId === itemPlacementId) return true;
                  if (p.placementId && itemPlacementId && p.placementId.startsWith(itemPlacementId + '_dim')) return true;
                }
                return false;
              });
            }

            // Fallback: Legacy specGroupId match for older assets
            const assetSpecGroupId = asset.associations?.specGroupId || asset.metadata?.specGroupId;
            const itemSpecGroupId = item.specGroupId;
            if (assetSpecGroupId && itemSpecGroupId && assetSpecGroupId === itemSpecGroupId) {
              return true;
            }

            return false;
          });
          
          if (hasAsset) {
            placementsWithAssets++;
          }
        }
        
        const allAssetsReady = placementsWithAssets >= totalPlacements && totalPlacements > 0;
        
        // Create fresh asset status
        const freshAssetStatus = {
          totalPlacements,
          placementsWithAssets,
          allAssetsReady,
          pendingUpload: totalPlacements > 0 && !allAssetsReady,
          assetsReadyAt: allAssetsReady ? (order.assetStatus?.assetsReadyAt || new Date()) : undefined,
          lastAssetUpdateAt: order.assetStatus?.lastAssetUpdateAt
        };
        
        return {
          ...order,
          campaignStartDate: campaign?.timeline?.startDate,
          campaignEndDate: campaign?.timeline?.endDate,
          // Include campaignData with selectedInventory for Action Center
          campaignData: campaign ? {
            name: campaign.basicInfo?.name || campaign.name,
            timeline: campaign.timeline,
            selectedInventory: campaign.selectedInventory
          } : undefined,
          // Fresh asset status (overrides stale stored value)
          assetStatus: freshAssetStatus
        } as PublicationInsertionOrderWithCampaign;
      });
    } catch (error) {
      console.error('Error fetching publication orders:', error);
      throw error;
    }
  }

  /**
   * Get all insertion orders (for admin)
   */
  async getAllOrders(filters?: {
    status?: InsertionOrderStatus;
    publicationId?: number;
    campaignId?: string;
    hubId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<PublicationInsertionOrderWithCampaign[]> {
    try {
      const query: any = {
        deletedAt: { $exists: false }
      };

      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.publicationId) {
        query.publicationId = filters.publicationId;
      }
      if (filters?.campaignId) {
        query.campaignId = filters.campaignId;
      }
      if (filters?.hubId) {
        query.hubId = filters.hubId;
      }
      if (filters?.dateFrom) {
        query.generatedAt = { ...query.generatedAt, $gte: filters.dateFrom };
      }
      if (filters?.dateTo) {
        query.generatedAt = { ...query.generatedAt, $lte: filters.dateTo };
      }

      const orders = await this.ordersCollection
        .find(query)
        .sort({ generatedAt: -1 })
        .toArray();

      // Fetch asset counts for campaigns
      const campaignIds = [...new Set(orders.map(o => o.campaignId))];
      const creativeAssetsCollection = getDatabase().collection(COLLECTIONS.CREATIVE_ASSETS);
      
      const assetCounts = await creativeAssetsCollection.aggregate([
        {
          $match: {
            'associations.campaignId': { $in: campaignIds },
            deletedAt: { $exists: false },
            'uploadInfo.uploadedAt': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$associations.campaignId',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const assetCountMap = new Map<string, number>();
      assetCounts.forEach((ac: any) => {
        assetCountMap.set(ac._id, ac.count);
      });

      // Get campaign data for additional fields
      const campaigns = await this.campaignsCollection
        .find({ campaignId: { $in: campaignIds } })
        .toArray();

      const campaignMap = new Map<string, Campaign>();
      campaigns.forEach(c => campaignMap.set(c.campaignId, c));

      // Get all creative assets for matching to placements
      const allCampaignAssets = await creativeAssetsCollection.find({
        'associations.campaignId': { $in: campaignIds },
        deletedAt: { $exists: false }
      }).toArray();

      // Group assets by campaign
      const assetsByCampaign = new Map<string, any[]>();
      allCampaignAssets.forEach((asset: any) => {
        const cid = asset.associations?.campaignId;
        if (cid) {
          if (!assetsByCampaign.has(cid)) {
            assetsByCampaign.set(cid, []);
          }
          assetsByCampaign.get(cid)!.push(asset);
        }
      });

      // Enrich orders with campaign data, message counts, and fresh asset status
      return orders.map(order => {
        const campaign = campaignMap.get(order.campaignId);
        const pub = campaign?.selectedInventory?.publications?.find(
          (p: any) => p.publicationId === order.publicationId
        );
        
        // Count messages and check for unread (messages from publication)
        const messageCount = order.messages?.length || 0;
        const hasUnreadMessages = order.messages?.some(
          (m: any) => m.sender === 'publication'
        ) || false;
        
        // Calculate fresh asset status based on current assets
        const campaignAssets = assetsByCampaign.get(order.campaignId) || [];
        const inventoryItems = pub?.inventoryItems || [];
        const totalPlacements = inventoryItems.length;
        
        let placementsWithAssets = 0;
        for (const item of inventoryItems) {
          const itemPlacementId = item.itemPath || item.sourcePath;

          // Simple direct placement lookup - check if any asset has this placement linked
          const hasAsset = campaignAssets.some((asset: any) => {
            // Primary: Direct placement link (new approach)
            const assetPlacements = asset.associations?.placements;
            if (assetPlacements && Array.isArray(assetPlacements)) {
              return assetPlacements.some((p: any) => {
                // Check for exact match
                if (p.placementId === itemPlacementId) return true;
                // Check for expanded dimension match (asset has _dim0, _dim1, etc suffix)
                if (p.placementId && itemPlacementId && p.placementId.startsWith(itemPlacementId + '_dim')) return true;
                // Also check with publication context
                if (p.publicationId === order.publicationId) {
                  if (p.placementId === itemPlacementId) return true;
                  if (p.placementId && itemPlacementId && p.placementId.startsWith(itemPlacementId + '_dim')) return true;
                }
                return false;
              });
            }
            
            // Fallback: Legacy specGroupId match for older assets
            const assetSpecGroupId = asset.associations?.specGroupId || asset.metadata?.specGroupId;
            const itemSpecGroupId = item.specGroupId;
            if (assetSpecGroupId && itemSpecGroupId && assetSpecGroupId === itemSpecGroupId) {
              return true;
            }
            
            return false;
          });
          
          if (hasAsset) {
            placementsWithAssets++;
          }
        }
        
        const allAssetsReady = placementsWithAssets >= totalPlacements && totalPlacements > 0;
        
        // Create fresh asset status (overrides stale stored value)
        const freshAssetStatus = {
          totalPlacements,
          placementsWithAssets,
          allAssetsReady,
          pendingUpload: totalPlacements > 0 && !allAssetsReady,
          // Preserve timestamps from stored status if available
          assetsReadyAt: allAssetsReady ? (order.assetStatus?.assetsReadyAt || new Date()) : undefined,
          lastAssetUpdateAt: order.assetStatus?.lastAssetUpdateAt
        };
        
        return {
          ...order,
          uploadedAssetCount: assetCountMap.get(order.campaignId) || 0,
          placementCount: totalPlacements,
          campaignStartDate: campaign?.timeline?.startDate,
          campaignEndDate: campaign?.timeline?.endDate,
          messageCount,
          hasUnreadMessages,
          assetStatus: freshAssetStatus
        } as PublicationInsertionOrderWithCampaign;
      });
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  }

  /**
   * Get orders for a campaign
   */
  async getOrdersForCampaign(campaignId: string): Promise<PublicationInsertionOrderDocument[]> {
    try {
      return await this.ordersCollection
        .find({
          campaignId,
          deletedAt: { $exists: false }
        })
        .sort({ publicationName: 1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching campaign orders:', error);
      throw error;
    }
  }

  /**
   * Add notes to an insertion order
   */
  async addNotes(
    campaignId: string,
    publicationId: number,
    notes: string,
    noteType: 'publication' | 'hub'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fieldName = noteType === 'publication' ? 'publicationNotes' : 'hubNotes';

      const result = await this.ordersCollection.updateOne(
        {
          campaignId,
          publicationId,
          deletedAt: { $exists: false }
        },
        {
          $set: {
            [fieldName]: notes,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Insertion order not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding notes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add a message to the order conversation thread
   * Messages are appended to support bi-directional communication
   */
  async addMessage(
    campaignId: string,
    publicationId: number,
    message: {
      content: string;
      sender: 'hub' | 'publication';
      senderName: string;
      senderId: string;
      attachments?: Array<{
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize?: number;
      }>;
    }
  ): Promise<{ success: boolean; message?: OrderMessage; error?: string }> {
    try {
      // Generate unique message ID
      const messageId = new ObjectId().toString();
      
      const newMessage: OrderMessage = {
        id: messageId,
        content: message.content,
        sender: message.sender,
        senderName: message.senderName,
        senderId: message.senderId,
        timestamp: new Date(),
        attachments: message.attachments
      };

      const result = await this.ordersCollection.updateOne(
        {
          campaignId,
          publicationId,
          deletedAt: { $exists: false }
        },
        {
          $push: { messages: newMessage },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Order not found' };
      }

      return { success: true, message: newMessage };
    } catch (error) {
      console.error('Error adding message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get messages for an order
   */
  async getMessages(
    campaignId: string,
    publicationId: number
  ): Promise<{ success: boolean; messages?: OrderMessage[]; error?: string }> {
    try {
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      return { success: true, messages: order.messages || [] };
    } catch (error) {
      console.error('Error getting messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(filters?: {
    publicationId?: number;
    campaignId?: string;
    hubId?: string;
  }): Promise<{
    total: number;
    byStatus: Record<InsertionOrderStatus, number>;
  }> {
    try {
      const query: any = { deletedAt: { $exists: false } };
      
      if (filters?.publicationId) {
        query.publicationId = filters.publicationId;
      }
      if (filters?.campaignId) {
        query.campaignId = filters.campaignId;
      }
      if (filters?.hubId) {
        query.hubId = filters.hubId;
      }

      const stats = await this.ordersCollection.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const result = {
        total: 0,
        byStatus: {
          draft: 0,
          sent: 0,
          confirmed: 0,
          rejected: 0,
          in_production: 0,
          delivered: 0
        } as Record<InsertionOrderStatus, number>
      };

      stats.forEach((s: any) => {
        result.byStatus[s._id as InsertionOrderStatus] = s.count;
        result.total += s.count;
      });

      return result;
    } catch (error) {
      console.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Generate insertion orders for a campaign
   * 
   * Creates orders in the publication_insertion_orders collection.
   */
  async generateOrdersForCampaign(
    campaignId: string,
    userId: string
  ): Promise<{ success: boolean; ordersGenerated: number; error?: string }> {
    try {
      // Try to find by _id first (MongoDB ObjectId), then fall back to campaignId string
      let campaign: Campaign | null = null;
      let campaignObjectId: string | undefined;
      
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
        if (campaign) {
          campaignObjectId = objectId.toString();
        }
      } catch {
        // Not a valid ObjectId, try campaignId string
        campaign = await this.campaignsCollection.findOne({ campaignId });
        if (campaign && campaign._id) {
          campaignObjectId = campaign._id.toString();
        }
      }
      
      if (!campaign) {
        return { success: false, ordersGenerated: 0, error: 'Campaign not found' };
      }

      // Check if orders already exist for this campaign
      const existingOrders = await this.ordersCollection.countDocuments({
        campaignId: campaign.campaignId,
        deletedAt: { $exists: false }
      });

      if (existingOrders > 0) {
        return { success: false, ordersGenerated: 0, error: 'Orders already generated for this campaign' };
      }

      // Generate orders for each publication
      const publications = campaign.selectedInventory?.publications || [];
      const ordersToInsert: PublicationInsertionOrderInsert[] = [];

      // Import the insertion order generator
      const { insertionOrderGenerator } = await import('../../server/insertionOrderGenerator');

      // Fetch all creative assets for this campaign
      const creativeAssetsCollection = getDatabase().collection(COLLECTIONS.CREATIVE_ASSETS);
      const campaignAssets = await creativeAssetsCollection.find({
        $or: [
          { 'associations.campaignId': campaign.campaignId },
          { 'associations.campaignId': campaignObjectId }
        ],
        deletedAt: { $exists: false },
        'uploadInfo.uploadedAt': { $exists: true }
      }).toArray();

      if (campaignAssets.length === 0) {
        console.warn(`⚠️  No creative assets found for campaign ${campaignId}. Orders will be generated without assets.`);
      }

      for (const pub of publications) {
        // NOTE: HTML content is now generated on-demand when viewing/printing
        // No need to store redundant HTML - all data is in the order fields

        // Build asset references for ALL placements (whether assets exist or not)
        // This allows orders to be generated before assets are ready
        // Assets are loaded dynamically via /fresh-assets endpoint
        const assetReferences: OrderAssetReference[] = [];
        let placementsWithAssets = 0;
        
        pub.inventoryItems?.forEach((item: any) => {
          const itemChannel = item.channel || 'general';
          const itemDimensions = item.format?.dimensions;
          const placementId = item.itemPath || item.sourcePath;
          const placementName = item.itemName || item.sourceName;
          
          // Generate specGroupId for this placement if not already set
          const specGroupId = item.specGroupId || `${itemChannel}::dim:${itemDimensions || 'default'}`;
          
          // Simple direct placement lookup - check if any asset has this placement linked
          const hasAsset = campaignAssets.some((asset: any) => {
            // Primary: Direct placement link (new approach)
            const assetPlacements = asset.associations?.placements;
            if (assetPlacements && Array.isArray(assetPlacements)) {
              return assetPlacements.some((p: any) => {
                // Check for exact match
                if (p.placementId === placementId) return true;
                // Check for expanded dimension match (asset has _dim0, _dim1, etc suffix)
                // e.g., asset placementId: "path[0]_dim2" matches order placementId: "path[0]"
                if (p.placementId && placementId && p.placementId.startsWith(placementId + '_dim')) return true;
                // Also check with publication context
                if (p.publicationId === pub.publicationId) {
                  if (p.placementId === placementId) return true;
                  if (p.placementId && placementId && p.placementId.startsWith(placementId + '_dim')) return true;
                }
                return false;
              });
            }
            
            // Fallback: Legacy specGroupId match for older assets
            const assetSpecGroupId = asset.associations?.specGroupId || asset.metadata?.specGroupId;
            if (assetSpecGroupId && (assetSpecGroupId === specGroupId || assetSpecGroupId === item.specGroupId)) {
              return true;
            }
            
            return false;
          });
          
          // Create asset reference (always, even if no asset exists yet)
          assetReferences.push({
            specGroupId,
            placementId,
            placementName,
            channel: itemChannel,
            dimensions: itemDimensions
          });
          
          if (hasAsset) {
            placementsWithAssets++;
          }
        });

        const totalPlacements = pub.inventoryItems?.length || 0;
        const allAssetsReady = placementsWithAssets >= totalPlacements && totalPlacements > 0;

        // Initialize placement statuses
        const placementStatuses: Record<string, 'pending'> = {};
        pub.inventoryItems?.forEach((item: any) => {
          const placementId = item.itemPath || item.sourcePath;
          if (placementId) {
            placementStatuses[placementId] = 'pending';
          }
        });

        const order: PublicationInsertionOrderInsert = {
          campaignId: campaign.campaignId,
          campaignObjectId,
          campaignName: campaign.basicInfo.name,
          hubId: campaign.hubId,
          publicationId: pub.publicationId,
          publicationName: pub.publicationName,
          generatedAt: new Date(),
          // Always send immediately - publications see "Assets Pending" status if not ready
          status: 'sent',
          sentAt: new Date(),
          // Asset references for dynamic loading (assets loaded via /fresh-assets endpoint)
          assetReferences,
          assetStatus: {
            totalPlacements,
            placementsWithAssets,
            allAssetsReady,
            pendingUpload: !allAssetsReady,  // Mark as pending if assets not ready
            assetsReadyAt: allAssetsReady ? new Date() : undefined,
            lastAssetUpdateAt: allAssetsReady ? new Date() : undefined,
            lastChecked: new Date()
          },
          adSpecifications: [],
          adSpecificationsProvided: false,
          placementStatuses,
          placementStatusHistory: [],
          statusHistory: [{
            status: 'sent',
            timestamp: new Date(),
            changedBy: userId,
            notes: allAssetsReady 
              ? 'Order sent to publication with all assets ready' 
              : `Order sent to publication - awaiting ${totalPlacements - placementsWithAssets} creative asset(s)`
          }]
        };

        ordersToInsert.push(order);
      }

      // Insert all orders
      if (ordersToInsert.length > 0) {
        const now = new Date();
        const ordersWithTimestamps = ordersToInsert.map(o => ({
          ...o,
          createdAt: now,
          updatedAt: now
        }));
        
        await this.ordersCollection.insertMany(ordersWithTimestamps);

        // Note: Tracking scripts are generated when creative assets are uploaded,
        // not when orders are created. Scripts require actual asset files.
      }

      return { success: true, ordersGenerated: ordersToInsert.length };
    } catch (error) {
      console.error('Error generating orders for campaign:', error);
      return {
        success: false,
        ordersGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete orders for a campaign (to allow regeneration)
   */
  async deleteOrdersForCampaign(campaignId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const result = await this.ordersCollection.updateMany(
        { campaignId, deletedAt: { $exists: false } },
        { $set: { deletedAt: new Date() } }
      );

      return { success: true, deletedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error deleting campaign orders:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete/rescind a single publication order
   * Cannot rescind if any placements are in_production or delivered
   */
  async deleteOrderForPublication(
    campaignId: string,
    publicationId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if any placements are live (in_production or delivered)
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Check for live placements
      const placementStatuses = order.placementStatuses || {};
      const liveStatuses = ['in_production', 'delivered'];
      const livePlacements = Object.entries(placementStatuses).filter(
        ([_, status]) => liveStatuses.includes(status as string)
      );

      if (livePlacements.length > 0) {
        return { 
          success: false, 
          error: `Cannot rescind order: ${livePlacements.length} placement(s) are already live (in production or delivered)` 
        };
      }

      const result = await this.ordersCollection.updateOne(
        { _id: order._id },
        { $set: { deletedAt: new Date() } }
      );

      if (result.modifiedCount === 0) {
        return { success: false, error: 'Failed to rescind order' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting publication order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rescind/remove a specific placement from a publication order
   * This allows hub admins to remove individual placements without rescinding the entire order
   */
  async rescindPlacement(
    campaignId: string,
    publicationId: number,
    placementId: string
  ): Promise<{ success: boolean; error?: string; updatedOrder?: PublicationInsertionOrderDocument }> {
    try {
      // Get the order
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Check if placement is live (in_production or delivered)
      const placementStatus = order.placementStatuses?.[placementId];
      if (placementStatus === 'in_production' || placementStatus === 'delivered') {
        return {
          success: false,
          error: `Cannot rescind placement: it is already ${placementStatus === 'in_production' ? 'in production' : 'delivered'}`
        };
      }

      // Find and remove the placement from selectedInventory
      const selectedInventory = order.selectedInventory || { publications: [] };
      let placementFound = false;
      let placementCost = 0;

      console.log(`[RescindPlacement] Looking for placement: ${placementId}`);
      console.log(`[RescindPlacement] Order has placementStatuses keys:`, Object.keys(order.placementStatuses || {}));

      // Find the publication in selectedInventory
      const pubIndex = selectedInventory.publications?.findIndex(
        (p: any) => String(p.publicationId) === String(publicationId)
      );

      if (pubIndex !== undefined && pubIndex >= 0 && selectedInventory.publications) {
        const pub = selectedInventory.publications[pubIndex];
        
        console.log(`[RescindPlacement] Found publication with ${pub.inventoryItems?.length || 0} inventory items`);
        
        // Debug: log all item paths
        pub.inventoryItems?.forEach((item: any, idx: number) => {
          console.log(`[RescindPlacement] Item ${idx}: itemPath="${item.itemPath}", sourcePath="${item.sourcePath}", name="${item.itemName}"`);
        });
        
        // Try multiple matching strategies
        let itemIndex = -1;
        
        // Strategy 1: Match by itemPath or sourcePath
        itemIndex = pub.inventoryItems?.findIndex(
          (item: any) => item.itemPath === placementId || item.sourcePath === placementId
        ) ?? -1;
        
        // Strategy 2: Match by itemPath/sourcePath containing the placementId path parts
        if (itemIndex < 0 && pub.inventoryItems) {
          // The placementId might be like "distributionChannels.website.advertisingOpportunities[1]"
          // while item.itemPath might be the raw path
          itemIndex = pub.inventoryItems.findIndex((item: any, idx: number) => {
            // Also check if this item's index in statuses matches
            const possibleKeys = [
              item.itemPath,
              item.sourcePath,
              `placement-${idx}`
            ].filter(Boolean);
            
            console.log(`[RescindPlacement] Item ${idx} (${item.itemName}): paths = ${possibleKeys.join(', ')}`);
            
            return possibleKeys.includes(placementId);
          });
        }
        
        // Strategy 3: Try to find by extracting index from placementId like "...advertisingOpportunities[1]"
        if (itemIndex < 0 && pub.inventoryItems) {
          const indexMatch = placementId.match(/\[(\d+)\]$/);
          if (indexMatch) {
            const targetIndex = parseInt(indexMatch[1], 10);
            // Find items that match the channel type from the placementId
            const channelType = placementId.includes('.print') ? 'print' :
                               placementId.includes('.website') ? 'website' :
                               placementId.includes('.newsletter') ? 'newsletter' :
                               placementId.includes('.digital') ? 'digital' : null;
            
            if (channelType) {
              let channelItemIndex = 0;
              for (let i = 0; i < pub.inventoryItems.length; i++) {
                const item = pub.inventoryItems[i];
                const itemChannel = (item.channel || '').toLowerCase();
                if (itemChannel === channelType || 
                    (channelType === 'newsletter' && itemChannel === 'newsletters') ||
                    (channelType === 'website' && itemChannel === 'digital')) {
                  if (channelItemIndex === targetIndex) {
                    itemIndex = i;
                    console.log(`[RescindPlacement] Found item by channel index: ${item.itemName}`);
                    break;
                  }
                  channelItemIndex++;
                }
              }
            }
          }
        }

        if (itemIndex >= 0 && pub.inventoryItems) {
          placementFound = true;
          const item = pub.inventoryItems[itemIndex];
          placementCost = item.cost || item.price || item.itemPricing?.hubPrice || 0;
          
          console.log(`[RescindPlacement] Found item to remove: ${item.itemName}, cost: ${placementCost}`);
          
          // Remove the placement
          pub.inventoryItems.splice(itemIndex, 1);
          
          // Update publication total
          if (pub.publicationTotal) {
            pub.publicationTotal -= placementCost;
          }
        }
      }

      if (!placementFound) {
        console.log(`[RescindPlacement] Placement not found in inventory items`);
        return { success: false, error: 'Placement not found in order' };
      }

      // Remove placement status
      const updatedPlacementStatuses = { ...order.placementStatuses };
      delete updatedPlacementStatuses[placementId];

      // Update order totals
      const currentTotal = order.orderTotal || 0;
      const newTotal = Math.max(0, currentTotal - placementCost);

      // Update the order
      const result = await this.ordersCollection.findOneAndUpdate(
        { _id: order._id },
        {
          $set: {
            selectedInventory,
            placementStatuses: updatedPlacementStatuses,
            orderTotal: newTotal,
            updatedAt: new Date()
          },
          $push: {
            statusHistory: {
              status: order.status,
              changedAt: new Date(),
              changedBy: 'hub_admin',
              notes: `Placement "${placementId}" was rescinded by hub admin`
            }
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return { success: false, error: 'Failed to update order' };
      }

      // Check if all placements have been removed - if so, soft delete the order
      const remainingPlacements = selectedInventory.publications?.[0]?.inventoryItems?.length || 0;
      if (remainingPlacements === 0) {
        await this.ordersCollection.updateOne(
          { _id: order._id },
          { $set: { deletedAt: new Date() } }
        );
      }

      return { success: true, updatedOrder: result };
    } catch (error) {
      console.error('Error rescinding placement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate print-friendly HTML for an order on-demand
   * 
   * This generates the HTML when needed (for printing/viewing) instead of
   * storing redundant HTML content in the database.
   */
  async generatePrintHTML(
    campaignId: string,
    publicationId: number
  ): Promise<{ success: boolean; html?: string; error?: string }> {
    try {
      // Verify order exists
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Get the campaign for generating HTML
      let campaign: Campaign | null = null;
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
      } catch {
        campaign = await this.campaignsCollection.findOne({ campaignId });
      }

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Generate HTML on-demand from current campaign data
      const { insertionOrderGenerator } = await import('../../server/insertionOrderGenerator');
      const html = await insertionOrderGenerator.generatePublicationHTMLInsertionOrder(
        campaign,
        publicationId
      );

      return { success: true, html: html || '' };
    } catch (error) {
      console.error('Error generating print HTML:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load fresh creative assets for an order
   * 
   * Dynamically loads current assets from the creative_assets collection
   * based on the order's asset references. This ensures orders always
   * show the latest uploaded assets without needing regeneration.
   */
  async loadFreshAssetsForOrder(
    campaignId: string,
    publicationId: number
  ): Promise<{ 
    success: boolean; 
    assets: Array<{
      specGroupId: string;
      placementId: string;
      placementName: string;
      channel: string;
      hasAsset: boolean;
      asset?: {
        assetId: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        uploadedAt: Date;
        thumbnailUrl?: string;
        detectedSpecs?: any;
      };
    }>;
    assetStatus: {
      totalPlacements: number;
      placementsWithAssets: number;
      allAssetsReady: boolean;
    };
    assetsJustBecameReady?: boolean;  // True if assets transitioned to ready on this call
    error?: string;
  }> {
    try {
      // Get the order
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { 
          success: false, 
          assets: [], 
          assetStatus: { totalPlacements: 0, placementsWithAssets: 0, allAssetsReady: false },
          error: 'Order not found' 
        };
      }

      // Get campaign's creative assets
      const creativeAssetsCollection = getDatabase().collection(COLLECTIONS.CREATIVE_ASSETS);
      const campaignAssets = await creativeAssetsCollection.find({
        $or: [
          { 'associations.campaignId': campaignId },
          { 'associations.campaignId': order.campaignObjectId }
        ],
        deletedAt: { $exists: false }
      }).toArray();

      // Build fresh asset data for each reference
      const assets: Array<{
        specGroupId: string;
        placementId: string;
        placementName: string;
        channel: string;
        dimensions?: string;
        hasAsset: boolean;
        asset?: any;
      }> = [];

      let placementsWithAssets = 0;
      const references = order.assetReferences || [];
      
      for (const ref of references) {
        // Simple direct placement lookup - check if any asset has this placement linked
        const currentAsset = campaignAssets.find((a: any) => {
          // Primary: Direct placement link (new approach)
          const assetPlacements = a.associations?.placements;
          if (assetPlacements && Array.isArray(assetPlacements)) {
            const match = assetPlacements.some((p: any) => {
              // Check for exact match
              if (p.placementId === ref.placementId) return true;
              // Check for expanded dimension match (asset has _dim0, _dim1, etc suffix)
              if (p.placementId && ref.placementId && p.placementId.startsWith(ref.placementId + '_dim')) return true;
              // Also check with publication context
              if (p.publicationId === parseInt(publicationId)) {
                if (p.placementId === ref.placementId) return true;
                if (p.placementId && ref.placementId && p.placementId.startsWith(ref.placementId + '_dim')) return true;
              }
              return false;
            });
            if (match) return true;
          }
          
          // Fallback: Legacy specGroupId match for older assets
          const assetSpecGroupId = a.associations?.specGroupId || a.metadata?.specGroupId;
          if (assetSpecGroupId && assetSpecGroupId === ref.specGroupId) {
            return true;
          }
          
          return false;
        });

        const hasAsset = !!currentAsset;
        if (hasAsset) placementsWithAssets++;

        assets.push({
          specGroupId: ref.specGroupId,
          placementId: ref.placementId,
          placementName: ref.placementName,
          channel: ref.channel,
          dimensions: ref.dimensions,
          hasAsset,
          asset: currentAsset ? {
            assetId: currentAsset._id.toString(),
            fileName: currentAsset.metadata?.fileName || 'Unknown',
            fileUrl: currentAsset.metadata?.fileUrl || '',
            fileType: currentAsset.metadata?.fileType || 'unknown',
            fileSize: currentAsset.metadata?.fileSize || 0,
            uploadedAt: currentAsset.uploadInfo?.uploadedAt || new Date(),
            thumbnailUrl: currentAsset.metadata?.thumbnailUrl,
            detectedSpecs: {
              dimensions: currentAsset.metadata?.detectedDimensions,
              colorSpace: currentAsset.metadata?.detectedColorSpace,
              estimatedDPI: currentAsset.metadata?.detectedDPI
            }
          } : undefined
        });
      }

      const totalPlacements = assets.length;
      const allAssetsReady = placementsWithAssets >= totalPlacements && totalPlacements > 0;

      // Update order's asset status if it changed
      const currentStatus = order.assetStatus;
      const statusChanged = !currentStatus || 
          currentStatus.placementsWithAssets !== placementsWithAssets ||
          currentStatus.allAssetsReady !== allAssetsReady;
      
      // Check if assets just became ready (transition from not ready to ready)
      const assetsJustBecameReady = allAssetsReady && 
          currentStatus && 
          !currentStatus.allAssetsReady;
      
      if (statusChanged) {
        const newAssetStatus: any = {
          totalPlacements,
          placementsWithAssets,
          allAssetsReady,
          pendingUpload: !allAssetsReady,
          lastAssetUpdateAt: new Date(),
          lastChecked: new Date()
        };
        
        // Set assetsReadyAt when transitioning to ready
        if (assetsJustBecameReady) {
          newAssetStatus.assetsReadyAt = new Date();
        } else if (currentStatus?.assetsReadyAt) {
          // Preserve existing assetsReadyAt
          newAssetStatus.assetsReadyAt = currentStatus.assetsReadyAt;
        }
        
        await this.ordersCollection.updateOne(
          { _id: order._id },
          { 
            $set: { 
              assetStatus: newAssetStatus,
              updatedAt: new Date()
            } 
          }
        );
        
        // Return flag indicating assets just became ready (for notification triggering)
        return {
          success: true,
          assets,
          assetStatus: {
            totalPlacements,
            placementsWithAssets,
            allAssetsReady
          },
          assetsJustBecameReady
        };
      }

      // No status change
      return {
        success: true,
        assets,
        assetStatus: {
          totalPlacements,
          placementsWithAssets,
          allAssetsReady
        },
        assetsJustBecameReady: false
      };
    } catch (error) {
      console.error('Error loading fresh assets for order:', error);
      return {
        success: false,
        assets: [],
        assetStatus: { totalPlacements: 0, placementsWithAssets: 0, allAssetsReady: false },
        assetsJustBecameReady: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save ad specifications for a publication order
   */
  async saveAdSpecifications(
    campaignId: string,
    publicationId: number,
    specifications: OrderAdSpecification[]
  ): Promise<{ success: boolean; error?: string; order?: PublicationInsertionOrderDocument }> {
    try {
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found for this publication' };
      }

      // Update or add specifications
      const existingSpecs = order.adSpecifications || [];
      
      for (const spec of specifications) {
        const existingIndex = existingSpecs.findIndex(s => s.placementId === spec.placementId);
        if (existingIndex >= 0) {
          existingSpecs[existingIndex] = {
            ...existingSpecs[existingIndex],
            ...spec,
            lastUpdated: new Date()
          };
        } else {
          existingSpecs.push({
            ...spec,
            lastUpdated: new Date()
          });
        }
      }

      const result = await this.ordersCollection.findOneAndUpdate(
        { _id: order._id },
        {
          $set: {
            adSpecifications: existingSpecs,
            adSpecificationsProvided: existingSpecs.length > 0,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return { success: true, order: result || undefined };
    } catch (error) {
      console.error('Error saving ad specifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update placement status
   */
  async updatePlacementStatus(
    campaignId: string,
    publicationId: number,
    placementId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered',
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; orderConfirmed?: boolean }> {
    try {
      const order = await this.ordersCollection.findOne({
        campaignId,
        publicationId,
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const updatedStatuses = {
        ...(order.placementStatuses || {}),
        [placementId]: status
      };

      const historyEntry = {
        placementId,
        status,
        timestamp: new Date(),
        changedBy: userId,
        notes
      };

      await this.ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            placementStatuses: updatedStatuses,
            updatedAt: new Date()
          },
          $push: {
            placementStatusHistory: historyEntry
          }
        }
      );

      // Check if all placements are accepted for auto-confirm
      let orderConfirmed = false;
      if (status === 'accepted' && order.status === 'sent') {
        // Get campaign to count total placements
        const campaign = await this.campaignsCollection.findOne({ campaignId });
        const pub = campaign?.selectedInventory?.publications?.find(
          (p: any) => p.publicationId === publicationId
        );
        
        if (pub) {
          const totalPlacements = pub.inventoryItems?.length || 0;
          const acceptedCount = Object.values(updatedStatuses).filter(s => s === 'accepted').length;
          
          if (acceptedCount === totalPlacements) {
            await this.ordersCollection.updateOne(
              { _id: order._id },
              {
                $set: {
                  status: 'confirmed',
                  confirmationDate: new Date()
                },
                $push: {
                  statusHistory: {
                    status: 'confirmed',
                    timestamp: new Date(),
                    changedBy: userId,
                    notes: 'Auto-confirmed: All placements accepted'
                  }
                }
              }
            );
            orderConfirmed = true;
            // Scripts are already generated when order was sent - no need to regenerate here
            // Use the "Refresh Scripts" button if new creatives were added after send
          }
        }
      }

      return { success: true, orderConfirmed };
    } catch (error) {
      console.error('Error updating placement status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const insertionOrderService = new InsertionOrderService();
