/**
 * Placement Completion Service
 * 
 * Handles automatic placement completion based on inventory type rules.
 * Placements are automatically marked as "delivered" when criteria are met:
 * 
 * - Digital (website, newsletter, streaming): Impressions goal achieved OR campaign end date passes
 * - Offline (print, radio, podcast, etc.): All expected proofs uploaded (frequency met)
 * 
 * This replaces manual completion by publications, ensuring completion is
 * driven by actual delivery evidence rather than self-reporting.
 */

import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';

// Completion result type
export interface CompletionCheckResult {
  completed: boolean;
  reason?: string;
  alreadyDelivered?: boolean;
  progress?: {
    delivered: number;
    goal: number;
    percent: number;
  };
}

// Completion rule types
export type CompletionRuleType = 'impressions_or_end_date' | 'proof_count';

export interface CompletionRule {
  type: CompletionRuleType;
  usesFrequency?: boolean;  // For offline channels - uses item.currentFrequency
  description: string;
}

// Completion rules per channel
export const COMPLETION_RULES: Record<string, CompletionRule> = {
  // Digital channels - complete when impressions goal met OR campaign ends
  website: {
    type: 'impressions_or_end_date',
    description: 'Completes when impressions goal met or campaign ends',
  },
  newsletter: {
    type: 'impressions_or_end_date',
    description: 'Completes when impressions goal met or campaign ends',
  },
  streaming: {
    type: 'impressions_or_end_date',
    description: 'Completes when impressions goal met or campaign ends',
  },
  
  // Offline channels - complete when all expected proofs uploaded
  print: {
    type: 'proof_count',
    usesFrequency: true,
    description: 'Completes when all tear sheets uploaded',
  },
  radio: {
    type: 'proof_count',
    usesFrequency: true,
    description: 'Completes when all affidavits/attestations uploaded',
  },
  podcast: {
    type: 'proof_count',
    usesFrequency: true,
    description: 'Completes when all episode proofs uploaded',
  },
  social_media: {
    type: 'proof_count',
    usesFrequency: true,
    description: 'Completes when all post proofs uploaded',
  },
  events: {
    type: 'proof_count',
    usesFrequency: false,  // Events typically have single report
    description: 'Completes when event report uploaded',
  },
};

// Digital channel list for quick lookup
const DIGITAL_CHANNELS = ['website', 'newsletter', 'streaming'];

export class PlacementCompletionService {
  private get ordersCollection() {
    return getDatabase().collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
  }

  private get campaignsCollection() {
    return getDatabase().collection(COLLECTIONS.CAMPAIGNS);
  }

  private get performanceEntriesCollection() {
    return getDatabase().collection(COLLECTIONS.PERFORMANCE_ENTRIES);
  }

  private get proofsCollection() {
    return getDatabase().collection(COLLECTIONS.PROOF_OF_PERFORMANCE);
  }

  /**
   * Get the completion rule for a channel
   */
  getCompletionRule(channel: string): CompletionRule {
    const normalizedChannel = channel.toLowerCase();
    return COMPLETION_RULES[normalizedChannel] || {
      type: 'proof_count',
      usesFrequency: false,
      description: 'Completes when proof uploaded',
    };
  }

  /**
   * Check if a placement is ready for auto-completion and mark it as delivered if so.
   * 
   * @param orderId - The insertion order ID
   * @param placementId - The placement itemPath
   * @param channel - The inventory channel type
   * @returns Result indicating if completion occurred and why
   */
  async checkAndCompleteIfReady(
    orderId: string,
    placementId: string,
    channel: string
  ): Promise<CompletionCheckResult> {
    try {
      const normalizedChannel = channel.toLowerCase();
      
      // Get the order
      const order = await this.ordersCollection.findOne({
        _id: new ObjectId(orderId),
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { completed: false, reason: 'Order not found' };
      }

      const currentStatus = order.placementStatuses?.[placementId];
      if (currentStatus === 'delivered') {
        return { completed: false, alreadyDelivered: true, reason: 'Already delivered' };
      }
      if (currentStatus === 'suspended') {
        return { completed: false, reason: 'Placement is suspended' };
      }

      // Get campaign for dates and inventory details (needed for validation)
      const campaign = await this.campaignsCollection.findOne({ campaignId: order.campaignId });
      if (!campaign) {
        return { completed: false, reason: 'Campaign not found' };
      }

      // Check if within campaign window (7-day grace period before start)
      const campaignStart = campaign.timeline?.startDate ? new Date(campaign.timeline.startDate) : null;
      const gracePeriodDays = 7;
      const now = new Date();
      const earliestAllowedDate = campaignStart 
        ? new Date(campaignStart.getTime() - (gracePeriodDays * 24 * 60 * 60 * 1000))
        : null;
      const withinCampaignWindow = !earliestAllowedDate || now >= earliestAllowedDate;

      // If placement is accepted, auto-mark as in_production first (activity detected)
      if (currentStatus === 'accepted') {
        // Only auto-mark in_production if within campaign window
        if (!withinCampaignWindow) {
          console.log(`[PlacementCompletion] Skipping auto-in_production for ${placementId}: campaign hasn't started yet`);
          return { completed: false, reason: 'Campaign has not started yet (outside grace period)' };
        }
        
        await this.markPlacementInProduction(order, placementId);
        // Re-fetch order to get updated statuses
        const updatedOrder = await this.ordersCollection.findOne({
          _id: new ObjectId(orderId),
          deletedAt: { $exists: false }
        });
        if (updatedOrder) {
          Object.assign(order, { 
            placementStatuses: updatedOrder.placementStatuses,
            status: updatedOrder.status 
          });
        }
      }

      // Only auto-complete if placement is in_production (actively running)
      if (order.placementStatuses?.[placementId] !== 'in_production') {
        return { completed: false, reason: `Placement status is ${currentStatus}, must be accepted or in_production` };
      }

      // Find the placement from order.selectedInventory (source of truth)
      const orderPublication = order?.selectedInventory?.publications?.[0];
      const placement = orderPublication?.inventoryItems?.find(
        (item: any) => (item.itemPath || item.sourcePath) === placementId
      );

      if (!placement) {
        return { completed: false, reason: 'Placement not found in order' };
      }

      // Determine completion based on channel type
      const rule = this.getCompletionRule(normalizedChannel);
      
      if (rule.type === 'impressions_or_end_date') {
        return await this.checkDigitalCompletion(order, campaign, placementId, normalizedChannel, placement);
      } else {
        return await this.checkOfflineCompletion(order, placementId, normalizedChannel, placement);
      }
    } catch (error) {
      console.error('Error in checkAndCompleteIfReady:', error);
      return { completed: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check completion for digital placements (impressions goal OR campaign end)
   */
  private async checkDigitalCompletion(
    order: any,
    campaign: any,
    placementId: string,
    channel: string,
    placement: any
  ): Promise<CompletionCheckResult> {
    // Read impressions goal from stored delivery goals
    const storedGoal = order.deliveryGoals?.[placementId];
    const impressionsGoal = storedGoal?.goalValue || 0;

    // Get delivered impressions from performance entries
    const impressionsDelivered = await this.getDeliveredImpressions(order._id.toString(), placementId);

    // Check if impressions goal is met
    if (impressionsGoal > 0 && impressionsDelivered >= impressionsGoal) {
      await this.markPlacementDelivered(order, placementId, 'Impressions goal achieved');
      return {
        completed: true,
        reason: 'Impressions goal achieved',
        progress: {
          delivered: impressionsDelivered,
          goal: impressionsGoal,
          percent: Math.round((impressionsDelivered / impressionsGoal) * 100)
        }
      };
    }

    // Check if campaign has ended
    const campaignEndDate = campaign.timeline?.endDate ? new Date(campaign.timeline.endDate) : null;
    const now = new Date();
    
    if (campaignEndDate && campaignEndDate <= now) {
      await this.markPlacementDelivered(order, placementId, 'Campaign ended');
      return {
        completed: true,
        reason: 'Campaign ended',
        progress: impressionsGoal > 0 ? {
          delivered: impressionsDelivered,
          goal: impressionsGoal,
          percent: Math.round((impressionsDelivered / impressionsGoal) * 100)
        } : undefined
      };
    }

    // Not ready for completion
    return {
      completed: false,
      reason: impressionsGoal > 0 
        ? `Waiting for impressions goal (${impressionsDelivered}/${impressionsGoal}) or campaign end`
        : 'Waiting for campaign to end',
      progress: impressionsGoal > 0 ? {
        delivered: impressionsDelivered,
        goal: impressionsGoal,
        percent: impressionsGoal > 0 ? Math.round((impressionsDelivered / impressionsGoal) * 100) : 0
      } : undefined
    };
  }

  /**
   * Check completion for offline placements (all proofs uploaded)
   */
  private async checkOfflineCompletion(
    order: any,
    placementId: string,
    channel: string,
    placement: any
  ): Promise<CompletionCheckResult> {
    const rule = this.getCompletionRule(channel);
    
    // Get expected frequency (number of proofs needed)
    const expectedCount = rule.usesFrequency 
      ? (placement.currentFrequency || placement.quantity || 1)
      : 1;

    // Count proofs uploaded for this placement
    const proofsUploaded = await this.getProofCount(order._id.toString(), placementId);

    // Check if all proofs are uploaded
    if (proofsUploaded >= expectedCount) {
      await this.markPlacementDelivered(order, placementId, `All proofs uploaded (${proofsUploaded}/${expectedCount})`);
      return {
        completed: true,
        reason: `All proofs uploaded (${proofsUploaded}/${expectedCount})`,
        progress: {
          delivered: proofsUploaded,
          goal: expectedCount,
          percent: 100
        }
      };
    }

    // Not ready for completion
    return {
      completed: false,
      reason: `Waiting for proofs (${proofsUploaded}/${expectedCount})`,
      progress: {
        delivered: proofsUploaded,
        goal: expectedCount,
        percent: Math.round((proofsUploaded / expectedCount) * 100)
      }
    };
  }

  /**
   * Get total delivered impressions for a placement
   */
  private async getDeliveredImpressions(orderId: string, placementId: string): Promise<number> {
    const result = await this.performanceEntriesCollection.aggregate([
      {
        $match: {
          orderId,
          itemPath: placementId,
          deletedAt: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } }
        }
      }
    ]).toArray();

    return result[0]?.totalImpressions || 0;
  }

  /**
   * Get proof count for a placement
   */
  private async getProofCount(orderId: string, placementId: string): Promise<number> {
    // Count proofs that match this placement OR are order-level (no itemPath)
    const count = await this.proofsCollection.countDocuments({
      orderId,
      $or: [
        { itemPath: placementId },
        { itemPath: { $exists: false } },
        { itemPath: null },
        { itemPath: '' }
      ],
      deletedAt: { $exists: false }
    });

    return count;
  }

  /**
   * Mark a placement as in_production (activity detected) and sync order status
   */
  private async markPlacementInProduction(
    order: any,
    placementId: string
  ): Promise<void> {
    const updatedStatuses = {
      ...(order.placementStatuses || {}),
      [placementId]: 'in_production'
    };

    const historyEntry = {
      placementId,
      status: 'in_production',
      timestamp: new Date(),
      changedBy: 'system',
      notes: 'Auto-marked: Activity detected (performance data or proof submitted)'
    };

    // Determine new order status - should be in_production if confirmed
    const newOrderStatus = order.status === 'confirmed' ? 'in_production' : null;
    const statusUpdate: any = {
      placementStatuses: updatedStatuses,
      updatedAt: new Date()
    };

    if (newOrderStatus) {
      statusUpdate.status = newOrderStatus;
    }

    await this.ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: statusUpdate,
        $push: {
          placementStatusHistory: historyEntry,
          ...(newOrderStatus ? {
            statusHistory: {
              status: newOrderStatus,
              timestamp: new Date(),
              changedBy: 'system',
              notes: 'Auto-updated: Activity detected on placement'
            }
          } : {})
        }
      }
    );

    console.log(`[PlacementCompletion] Auto-marked placement ${placementId} as in_production`);
    if (newOrderStatus) {
      console.log(`[PlacementCompletion] Order status updated to ${newOrderStatus}`);
    }
  }

  /**
   * Mark a placement as delivered and sync order status
   */
  private async markPlacementDelivered(
    order: any,
    placementId: string,
    reason: string
  ): Promise<void> {
    const updatedStatuses = {
      ...(order.placementStatuses || {}),
      [placementId]: 'delivered'
    };

    const historyEntry = {
      placementId,
      status: 'delivered',
      timestamp: new Date(),
      changedBy: 'system',
      notes: `Auto-completed: ${reason}`
    };

    // Determine new order status based on placement statuses
    const newOrderStatus = this.deriveOrderStatus(updatedStatuses, order.status);
    const statusUpdate: any = {
      placementStatuses: updatedStatuses,
      updatedAt: new Date()
    };

    // Only update order status if it changed
    if (newOrderStatus && newOrderStatus !== order.status) {
      statusUpdate.status = newOrderStatus;
    }

    await this.ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: statusUpdate,
        $push: {
          placementStatusHistory: historyEntry,
          ...(newOrderStatus && newOrderStatus !== order.status ? {
            statusHistory: {
              status: newOrderStatus,
              timestamp: new Date(),
              changedBy: 'system',
              notes: newOrderStatus === 'delivered' 
                ? 'Auto-completed: All placements delivered'
                : 'Auto-updated: Placement went live'
            }
          } : {})
        }
      }
    );

    console.log(`[PlacementCompletion] Auto-completed placement ${placementId} in order ${order._id}: ${reason}`);
    if (newOrderStatus && newOrderStatus !== order.status) {
      console.log(`[PlacementCompletion] Order status updated to ${newOrderStatus}`);
    }
  }

  /**
   * Derive order status from placement statuses
   * - If ALL placements are delivered → order is 'delivered'
   * - If ANY placement is in_production or delivered → order is 'in_production'
   * - Otherwise, keep current status
   */
  private deriveOrderStatus(
    placementStatuses: Record<string, string>,
    currentOrderStatus: string
  ): string | null {
    const statuses = Object.values(placementStatuses);
    if (statuses.length === 0) return null;

    // Suspended placements are treated as "resolved" -- they don't block order progression
    const activeStatuses = statuses.filter(s => s !== 'suspended');
    if (activeStatuses.length === 0) return null;

    const allDeliveredOrSuspended = activeStatuses.every(s => s === 'delivered');
    if (allDeliveredOrSuspended) {
      return 'delivered';
    }

    const hasLivePlacements = activeStatuses.some(s => s === 'in_production' || s === 'delivered');
    if (hasLivePlacements && currentOrderStatus === 'confirmed') {
      return 'in_production';
    }

    return null;
  }

  /**
   * Check all placements in an order for completion.
   * Useful for batch checking on order load or scheduled jobs.
   */
  async checkAllPlacementsInOrder(orderId: string): Promise<{
    checked: number;
    completed: number;
    results: Record<string, CompletionCheckResult>;
  }> {
    const results: Record<string, CompletionCheckResult> = {};
    let checked = 0;
    let completed = 0;

    try {
      // Get the order
      const order = await this.ordersCollection.findOne({
        _id: new ObjectId(orderId),
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { checked: 0, completed: 0, results: {} };
      }

      // Get campaign for placement details
      // Use order.selectedInventory as source of truth
      const orderPublication = order?.selectedInventory?.publications?.[0];

      if (!orderPublication?.inventoryItems) {
        return { checked: 0, completed: 0, results: {} };
      }

      // Check each placement
      for (const item of orderPublication.inventoryItems) {
        if (item.isExcluded) continue;

        const placementId = item.itemPath || item.sourcePath;
        const channel = item.channel || 'other';

        if (!placementId) continue;

        checked++;
        const result = await this.checkAndCompleteIfReady(orderId, placementId, channel);
        results[placementId] = result;

        if (result.completed) {
          completed++;
        }
      }

      return { checked, completed, results };
    } catch (error) {
      console.error('Error in checkAllPlacementsInOrder:', error);
      return { checked, completed, results };
    }
  }

  /**
   * Check digital placements for campaign end date completion.
   * Called when loading order details to catch ended campaigns.
   */
  async checkDigitalPlacementsForCampaignEnd(orderId: string): Promise<{
    checked: number;
    completed: number;
  }> {
    let checked = 0;
    let completed = 0;

    try {
      // Get the order
      const order = await this.ordersCollection.findOne({
        _id: new ObjectId(orderId),
        deletedAt: { $exists: false }
      });

      if (!order) {
        return { checked: 0, completed: 0 };
      }

      // Get campaign
      const campaign = await this.campaignsCollection.findOne({ campaignId: order.campaignId });
      if (!campaign) {
        return { checked: 0, completed: 0 };
      }

      // Check if campaign has ended
      const campaignEndDate = campaign.timeline?.endDate ? new Date(campaign.timeline.endDate) : null;
      if (!campaignEndDate || campaignEndDate > new Date()) {
        // Campaign hasn't ended yet
        return { checked: 0, completed: 0 };
      }

      // Use order.selectedInventory as source of truth
      const orderPublication = order?.selectedInventory?.publications?.[0];

      if (!orderPublication?.inventoryItems) {
        return { checked: 0, completed: 0 };
      }

      // Check only digital placements that are in_production
      for (const item of orderPublication.inventoryItems) {
        if (item.isExcluded) continue;

        const channel = (item.channel || 'other').toLowerCase();
        if (!DIGITAL_CHANNELS.includes(channel)) continue;

        const placementId = item.itemPath || item.sourcePath;
        if (!placementId) continue;

        const currentStatus = order.placementStatuses?.[placementId];
        if (currentStatus !== 'in_production') continue;

        checked++;
        const result = await this.checkAndCompleteIfReady(orderId, placementId, channel);

        if (result.completed) {
          completed++;
        }
      }

      return { checked, completed };
    } catch (error) {
      console.error('Error in checkDigitalPlacementsForCampaignEnd:', error);
      return { checked, completed };
    }
  }
}

// Export singleton instance
export const placementCompletionService = new PlacementCompletionService();
