/**
 * Insertion Order Service
 * 
 * Handles business logic for insertion order lifecycle management
 */

import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import {
  Campaign,
  PublicationInsertionOrder,
  StatusHistoryEntry
} from '../integrations/mongodb/campaignSchema';
import { HubPackage } from '../integrations/mongodb/hubPackageSchema';
import { ObjectId } from 'mongodb';

export type InsertionOrderStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'in_production' | 'delivered';

// Valid status transitions
const VALID_TRANSITIONS: Record<InsertionOrderStatus, InsertionOrderStatus[]> = {
  draft: ['sent'],
  sent: ['confirmed', 'rejected'],
  confirmed: ['in_production', 'rejected'],
  rejected: ['draft'], // Can restart from draft
  in_production: ['delivered'],
  delivered: [] // Terminal state
};

export class InsertionOrderService {
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

    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Update insertion order status (for campaigns)
   */
  async updateCampaignOrderStatus(
    campaignId: string,
    publicationId: number,
    newStatus: InsertionOrderStatus,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; order?: PublicationInsertionOrder }> {
    try {
      // Find the campaign - try by _id first (MongoDB ObjectId), then campaignId string
      let campaign;
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
      } catch {
        // Not a valid ObjectId, try campaignId string
        campaign = await this.campaignsCollection.findOne({ campaignId });
      }
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Find the insertion order
      const orderIndex = campaign.publicationInsertionOrders?.findIndex(
        o => o.publicationId === publicationId
      );

      if (orderIndex === undefined || orderIndex === -1) {
        return { success: false, error: 'Insertion order not found' };
      }

      const order = campaign.publicationInsertionOrders![orderIndex];

      // Validate transition
      const validation = this.validateStatusTransition(
        order.status as InsertionOrderStatus,
        newStatus
      );
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create status history entry
      const historyEntry: StatusHistoryEntry = {
        status: newStatus,
        timestamp: new Date(),
        changedBy: userId,
        notes
      };

      // Update the order
      const updatedOrder: PublicationInsertionOrder = {
        ...order,
        status: newStatus,
        statusHistory: [...(order.statusHistory || []), historyEntry]
      };

      // Special handling for specific statuses
      if (newStatus === 'confirmed') {
        updatedOrder.confirmationDate = new Date();
      }
      if (newStatus === 'sent') {
        updatedOrder.sentAt = new Date();
      }

      // Update in database
      const updatePath = `publicationInsertionOrders.${orderIndex}`;
      await this.campaignsCollection.updateOne(
        { _id: campaign._id },
        { $set: { [updatePath]: updatedOrder } }
      );

      return { success: true, order: updatedOrder };
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
  ): Promise<Array<PublicationInsertionOrder & { campaignId: string; campaignName: string; packageId?: string }>> {
    try {
      const query: any = {
        'publicationInsertionOrders.publicationId': publicationId
      };

      // Get campaigns with orders for this publication
      const campaigns = await this.campaignsCollection
        .find(query)
        .toArray();

      const orders: Array<PublicationInsertionOrder & { campaignId: string; campaignName: string }> = [];

      for (const campaign of campaigns) {
        const publicationOrders = campaign.publicationInsertionOrders?.filter(
          o => o.publicationId === publicationId
        ) || [];

        for (const order of publicationOrders) {
          // Apply filters
          if (filters?.status && order.status !== filters.status) continue;
          if (filters?.dateFrom && new Date(order.generatedAt) < filters.dateFrom) continue;
          if (filters?.dateTo && new Date(order.generatedAt) > filters.dateTo) continue;

          orders.push({
            ...order,
            campaignId: campaign.campaignId,
            campaignName: campaign.basicInfo.name
          });
        }
      }

      // Sort by generated date (newest first)
      orders.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      return orders;
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
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Array<PublicationInsertionOrder & { campaignId: string; campaignName: string }>> {
    try {
      const query: any = {
        publicationInsertionOrders: { $exists: true, $ne: [] }
      };

      if (filters?.campaignId) {
        query.campaignId = filters.campaignId;
      }

      const campaigns = await this.campaignsCollection
        .find(query)
        .toArray();

      const orders: Array<PublicationInsertionOrder & { campaignId: string; campaignName: string }> = [];

      for (const campaign of campaigns) {
        for (const order of campaign.publicationInsertionOrders || []) {
          // Apply filters
          if (filters?.status && order.status !== filters.status) continue;
          if (filters?.publicationId && order.publicationId !== filters.publicationId) continue;
          if (filters?.dateFrom && new Date(order.generatedAt) < filters.dateFrom) continue;
          if (filters?.dateTo && new Date(order.generatedAt) > filters.dateTo) continue;

          orders.push({
            ...order,
            campaignId: campaign.campaignId,
            campaignName: campaign.basicInfo.name
          });
        }
      }

      // Sort by generated date (newest first)
      orders.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      return orders;
    } catch (error) {
      console.error('Error fetching all orders:', error);
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
      // Find the campaign - try by _id first (MongoDB ObjectId), then campaignId string
      let campaign;
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
      } catch {
        // Not a valid ObjectId, try campaignId string
        campaign = await this.campaignsCollection.findOne({ campaignId });
      }
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      const orderIndex = campaign.publicationInsertionOrders?.findIndex(
        o => o.publicationId === publicationId
      );

      if (orderIndex === undefined || orderIndex === -1) {
        return { success: false, error: 'Insertion order not found' };
      }

      const fieldPath = noteType === 'publication' 
        ? `publicationInsertionOrders.${orderIndex}.publicationNotes`
        : `publicationInsertionOrders.${orderIndex}.hubNotes`;

      await this.campaignsCollection.updateOne(
        { _id: campaign._id },
        { $set: { [fieldPath]: notes } }
      );

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
   * Get order statistics
   */
  async getOrderStatistics(filters?: {
    publicationId?: number;
    campaignId?: string;
  }): Promise<{
    total: number;
    byStatus: Record<InsertionOrderStatus, number>;
  }> {
    try {
      const orders = await this.getAllOrders(filters);

      const stats = {
        total: orders.length,
        byStatus: {
          draft: 0,
          sent: 0,
          confirmed: 0,
          rejected: 0,
          in_production: 0,
          delivered: 0
        } as Record<InsertionOrderStatus, number>
      };

      for (const order of orders) {
        stats.byStatus[order.status as InsertionOrderStatus]++;
      }

      return stats;
    } catch (error) {
      console.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * PHASE 6: Generate insertion orders for a campaign
   * 
   * Uses campaign's pre-calculated values (no recalculation):
   * - pricing from campaign.pricing (calculated by shared utilities)
   * - reach from campaign.estimatedPerformance (calculated by shared utilities)
   * - publicationTotal from campaign.selectedInventory.publications (calculated by shared utilities)
   * 
   * This service just structures data for publication view - does not recalculate.
   */
  async generateOrdersForCampaign(
    campaignId: string,
    userId: string
  ): Promise<{ success: boolean; ordersGenerated: number; error?: string }> {
    try {
      // Try to find by _id first (MongoDB ObjectId), then fall back to campaignId string
      let campaign;
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
      } catch {
        // Not a valid ObjectId, try campaignId string
        campaign = await this.campaignsCollection.findOne({ campaignId });
      }
      
      if (!campaign) {
        return { success: false, ordersGenerated: 0, error: 'Campaign not found' };
      }

      // Check if orders already exist
      if (campaign.publicationInsertionOrders && campaign.publicationInsertionOrders.length > 0) {
        return { success: false, ordersGenerated: 0, error: 'Orders already generated for this campaign' };
      }

      // Generate orders for each publication
      const publications = campaign.selectedInventory.publications || [];
      const orders: PublicationInsertionOrder[] = [];

      // Import the insertion order generator (uses campaign's pre-calculated values)
      const { insertionOrderGenerator } = await import('../../server/insertionOrderGenerator');

      for (const pub of publications) {
        // Generate the HTML content for this publication
        let content = '';
        try {
          const html = await insertionOrderGenerator.generatePublicationHTMLInsertionOrder(
            campaign,
            pub.publicationId
          );
          content = html || '';
        } catch (error) {
          console.error(`Error generating IO content for publication ${pub.publicationId}:`, error);
          // Continue with empty content rather than failing
        }

        const order: PublicationInsertionOrder = {
          _id: new ObjectId().toString(),
          publicationId: pub.publicationId,
          publicationName: pub.publicationName,
          generatedAt: new Date(),
          format: 'html',
          content, // Now contains actual HTML content
          status: 'draft',
          creativeAssets: [],
          adSpecifications: [],
          adSpecificationsProvided: false,
          statusHistory: [{
            status: 'draft',
            timestamp: new Date(),
            changedBy: userId,
            notes: 'Order created'
          }]
        };

        orders.push(order);
      }

      // Save orders to campaign
      await this.campaignsCollection.updateOne(
        { _id: campaign._id },
        { $set: { publicationInsertionOrders: orders } }
      );

      return { success: true, ordersGenerated: orders.length };
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
   * Save ad specifications for a publication order
   */
  async saveAdSpecifications(
    campaignId: string,
    publicationId: number,
    specifications: AdSpecification[]
  ): Promise<{ success: boolean; error?: string; order?: PublicationInsertionOrder }> {
    try {
      // Find campaign
      let campaign;
      try {
        const objectId = new ObjectId(campaignId);
        campaign = await this.campaignsCollection.findOne({ _id: objectId });
      } catch {
        campaign = await this.campaignsCollection.findOne({ campaignId });
      }

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      // Find the publication order
      const orders = campaign.publicationInsertionOrders || [];
      const orderIndex = orders.findIndex(o => o.publicationId === publicationId);

      if (orderIndex === -1) {
        return { success: false, error: 'Order not found for this publication' };
      }

      // Update or add specifications
      const existingSpecs = orders[orderIndex].adSpecifications || [];
      
      for (const spec of specifications) {
        const existingIndex = existingSpecs.findIndex(s => s.placementId === spec.placementId);
        if (existingIndex >= 0) {
          // Update existing
          existingSpecs[existingIndex] = {
            ...existingSpecs[existingIndex],
            ...spec,
            lastUpdated: new Date()
          };
        } else {
          // Add new
          existingSpecs.push({
            ...spec,
            lastUpdated: new Date()
          });
        }
      }

      orders[orderIndex].adSpecifications = existingSpecs;
      orders[orderIndex].adSpecificationsProvided = existingSpecs.length > 0;

      // Save back to database
      await this.campaignsCollection.updateOne(
        { _id: campaign._id },
        { $set: { publicationInsertionOrders: orders } }
      );

      return { success: true, order: orders[orderIndex] };
    } catch (error) {
      console.error('Error saving ad specifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const insertionOrderService = new InsertionOrderService();

