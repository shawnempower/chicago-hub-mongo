/**
 * Earnings Service
 * 
 * Handles publication earnings and hub platform billing calculations.
 * 
 * Publisher Earnings:
 * - Publishers are paid their hub rate based on actual delivery
 * - Earnings update in real-time as performance entries/proofs are submitted
 * - Final reconciliation occurs at campaign end
 * 
 * Hub Platform Billing:
 * - Hubs are charged a % of publisher payouts (revenue share)
 * - Plus a CPM fee on system-tracked digital impressions
 * - Fees are calculated per campaign
 */

import { getDatabase } from '../integrations/mongodb/client';
import { 
  COLLECTIONS, 
  PublicationEarnings, 
  PublicationEarningsItem,
  HubBilling
} from '../integrations/mongodb/schemas';
import { Hub, HubPlatformBilling } from '../integrations/mongodb/hubSchema';
import { HubPackageInventoryItem } from '../integrations/mongodb/hubPackageSchema';
import { ObjectId } from 'mongodb';
import { CHANNEL_CONFIG } from '../config/inventoryChannels';

// Digital channels for CPM fee calculation
const DIGITAL_CHANNELS = ['website', 'newsletter', 'streaming'];

/**
 * Determine if a channel is digital (for platform CPM fee calculation)
 */
function isDigitalChannel(channel: string): boolean {
  const config = CHANNEL_CONFIG[channel];
  return config?.isDigital ?? DIGITAL_CHANNELS.includes(channel);
}

/**
 * Get delivery type based on pricing model
 */
function getDeliveryType(pricingModel: string): 'impressions' | 'occurrences' {
  const impressionModels = ['cpm', 'cpv', 'cpd', 'cpc'];
  return impressionModels.includes(pricingModel) ? 'impressions' : 'occurrences';
}

/**
 * Calculate earnings for a single inventory item based on actual delivery
 */
function calculateItemEarnings(
  item: {
    pricingModel: string;
    rate: number;
    plannedDelivery: number;
    deliveryType: 'impressions' | 'occurrences';
  },
  actualDelivery: number
): number {
  const { pricingModel, rate, deliveryType } = item;
  
  switch (pricingModel) {
    // Impression-based pricing
    case 'cpm':
    case 'cpd':
      // Cost per 1000 impressions/downloads
      return (actualDelivery / 1000) * rate;
    
    case 'cpv':
      // Cost per 100 views
      return (actualDelivery / 100) * rate;
    
    case 'cpc':
      // Cost per click - actual delivery IS clicks
      return actualDelivery * rate;
    
    // Occurrence-based pricing
    case 'per_send':
    case 'per_spot':
    case 'per_post':
    case 'per_ad':
    case 'per_episode':
    case 'per_story':
      return actualDelivery * rate;
    
    // Time-based pricing (flat, monthly, per_week, per_day)
    case 'flat':
    case 'monthly':
    case 'per_month':
      // For time-based, actual delivery is percentage complete (0-100)
      // or days delivered vs planned days
      return (actualDelivery / 100) * rate;
    
    case 'per_week':
      return actualDelivery * rate;
    
    case 'per_day':
      return actualDelivery * rate;
    
    default:
      // Unknown model, use simple multiplication
      return actualDelivery * rate;
  }
}

export class EarningsService {
  // ==================== Database Collections ====================
  
  private get earningsCollection() {
    return getDatabase().collection<PublicationEarnings>(COLLECTIONS.PUBLICATION_EARNINGS);
  }
  
  private get hubBillingCollection() {
    return getDatabase().collection<HubBilling>(COLLECTIONS.HUB_BILLING);
  }
  
  private get ordersCollection() {
    return getDatabase().collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
  }
  
  private get campaignsCollection() {
    return getDatabase().collection(COLLECTIONS.CAMPAIGNS);
  }
  
  private get hubsCollection() {
    return getDatabase().collection<Hub>(COLLECTIONS.HUBS);
  }
  
  private get performanceEntriesCollection() {
    return getDatabase().collection(COLLECTIONS.PERFORMANCE_ENTRIES);
  }
  
  private get proofsCollection() {
    return getDatabase().collection(COLLECTIONS.PROOF_OF_PERFORMANCE);
  }

  // ==================== Publisher Earnings ====================

  /**
   * Create earnings estimate for a publication order
   * Called when an order is confirmed
   */
  async createPublisherEarningsEstimate(orderId: string): Promise<PublicationEarnings | null> {
    // Get the order
    const order = await this.ordersCollection.findOne({ 
      $or: [
        { _id: new ObjectId(orderId) },
        { _id: orderId }
      ]
    });
    
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return null;
    }

    // Check if earnings record already exists
    const existing = await this.earningsCollection.findOne({ orderId: orderId.toString() });
    if (existing) {
      console.log(`Earnings record already exists for order ${orderId}`);
      return existing;
    }

    // Get campaign for dates and name
    const campaign = await this.campaignsCollection.findOne({ campaignId: order.campaignId });
    
    // Build earnings estimate from order inventory items
    const itemsEstimate: PublicationEarningsItem[] = [];
    let totalEstimated = 0;
    let totalDigitalImpressions = 0;
    const byChannel: Record<string, number> = {};

    // Get inventory items from the order
    const inventoryItems = order.inventoryItems || [];
    const orderDeliveryGoals = order.deliveryGoals || {};
    
    for (const item of inventoryItems) {
      const channel = item.channel || 'unknown';
      const pricingModel = item.itemPricing?.pricingModel || 'flat';
      const rate = item.itemPricing?.hubPrice || 0;
      const deliveryType = getDeliveryType(pricingModel);
      
      // Read planned delivery from stored delivery goals
      const itemPath = item.itemPath || item.sourcePath;
      const storedGoal = orderDeliveryGoals[itemPath];
      const plannedDelivery = storedGoal?.goalValue || (
        deliveryType === 'impressions' ? 0 : (item.currentFrequency || item.quantity || 1)
      );
      
      // Calculate estimated earnings
      const estimatedEarnings = calculateItemEarnings(
        { pricingModel, rate, plannedDelivery, deliveryType },
        plannedDelivery
      );
      
      itemsEstimate.push({
        itemPath: item.itemPath,
        itemName: item.itemName || 'Unknown Item',
        channel,
        plannedDelivery,
        deliveryType,
        pricingModel,
        rate,
        estimatedEarnings,
      });
      
      totalEstimated += estimatedEarnings;
      byChannel[channel] = (byChannel[channel] || 0) + estimatedEarnings;
      
      // Track digital impressions for platform CPM
      if (isDigitalChannel(channel) && deliveryType === 'impressions') {
        totalDigitalImpressions += plannedDelivery;
      }
    }

    // Create earnings record
    const earningsRecord: PublicationEarnings = {
      orderId: orderId.toString(),
      campaignId: order.campaignId,
      campaignName: campaign?.basicInfo?.name || order.campaignName,
      publicationId: order.publicationId,
      publicationName: order.publicationName,
      hubId: order.hubId,
      
      estimated: {
        total: totalEstimated,
        byChannel,
        byItem: itemsEstimate,
      },
      
      actual: {
        total: 0,
        byChannel: {},
        byItem: [],
      },
      
      trackedDigitalImpressions: {
        estimated: totalDigitalImpressions,
        actual: 0,
      },
      
      variance: {
        amount: 0,
        percentage: 0,
      },
      
      paymentStatus: 'pending',
      amountPaid: 0,
      amountOwed: 0,
      paymentHistory: [],
      
      createdAt: new Date(),
      updatedAt: new Date(),
      campaignStartDate: campaign?.timeline?.startDate,
      campaignEndDate: campaign?.timeline?.endDate,
      finalized: false,
    };

    const result = await this.earningsCollection.insertOne(earningsRecord as any);
    
    return { ...earningsRecord, _id: result.insertedId };
  }

  /**
   * Update actual earnings based on performance data
   * Called when a performance entry is created/updated
   */
  async updatePublisherActualEarnings(orderId: string): Promise<PublicationEarnings | null> {
    // Get earnings record
    const earnings = await this.earningsCollection.findOne({ orderId: orderId.toString() });
    if (!earnings) {
      console.log(`No earnings record found for order ${orderId}`);
      return null;
    }

    // Get all performance entries for this order
    const performanceEntries = await this.performanceEntriesCollection
      .find({ orderId: orderId.toString() })
      .toArray();

    // Get all verified proofs for this order (for offline channels)
    const verifiedProofs = await this.proofsCollection
      .find({ 
        orderId: orderId.toString(),
        verificationStatus: 'verified'
      })
      .toArray();

    // Aggregate delivery by item path
    const deliveryByItem: Record<string, { 
      impressions: number; 
      occurrences: number;
      clicks: number;
    }> = {};

    // Process performance entries
    for (const entry of performanceEntries) {
      const itemPath = entry.itemPath;
      if (!deliveryByItem[itemPath]) {
        deliveryByItem[itemPath] = { impressions: 0, occurrences: 0, clicks: 0 };
      }
      
      // Sum up metrics
      deliveryByItem[itemPath].impressions += entry.metrics?.impressions || 0;
      deliveryByItem[itemPath].clicks += entry.metrics?.clicks || 0;
      
      // Count occurrences based on channel type
      const isOffline = !isDigitalChannel(entry.channel);
      if (isOffline) {
        // Each performance entry = 1 occurrence for offline
        deliveryByItem[itemPath].occurrences += 1;
      }
    }

    // Process verified proofs (for offline channels)
    for (const proof of verifiedProofs) {
      const itemPath = proof.itemPath;
      if (!deliveryByItem[itemPath]) {
        deliveryByItem[itemPath] = { impressions: 0, occurrences: 0, clicks: 0 };
      }
      // Each verified proof = 1 occurrence
      deliveryByItem[itemPath].occurrences += 1;
    }

    // Calculate actual earnings for each item
    const actualByItem: Array<{
      itemPath: string;
      actualDelivery: number;
      actualEarnings: number;
      lastUpdated: Date;
    }> = [];
    let totalActual = 0;
    let totalDigitalImpressions = 0;
    const actualByChannel: Record<string, number> = {};

    for (const estimatedItem of earnings.estimated.byItem) {
      const delivery = deliveryByItem[estimatedItem.itemPath] || { impressions: 0, occurrences: 0, clicks: 0 };
      
      // Determine actual delivery based on delivery type and pricing model
      let actualDelivery = 0;
      if (estimatedItem.deliveryType === 'impressions') {
        if (estimatedItem.pricingModel === 'cpc') {
          actualDelivery = delivery.clicks;
        } else {
          actualDelivery = delivery.impressions;
        }
      } else {
        // For occurrences, use the count of entries/proofs
        actualDelivery = delivery.occurrences;
      }
      
      // Calculate actual earnings, capped at the item's estimated cost
      const rawEarnings = calculateItemEarnings(
        {
          pricingModel: estimatedItem.pricingModel,
          rate: estimatedItem.rate,
          plannedDelivery: estimatedItem.plannedDelivery,
          deliveryType: estimatedItem.deliveryType,
        },
        actualDelivery
      );
      const actualEarnings = Math.min(rawEarnings, estimatedItem.estimatedEarnings || rawEarnings);
      
      actualByItem.push({
        itemPath: estimatedItem.itemPath,
        actualDelivery,
        actualEarnings,
        lastUpdated: new Date(),
      });
      
      totalActual += actualEarnings;
      actualByChannel[estimatedItem.channel] = (actualByChannel[estimatedItem.channel] || 0) + actualEarnings;
      
      // Track digital impressions
      if (isDigitalChannel(estimatedItem.channel) && estimatedItem.deliveryType === 'impressions') {
        totalDigitalImpressions += delivery.impressions;
      }
    }

    // Cap total actual at contract value
    totalActual = Math.min(totalActual, earnings.estimated.total);

    // Calculate variance
    const varianceAmount = totalActual - earnings.estimated.total;
    const variancePercentage = earnings.estimated.total > 0 
      ? ((totalActual / earnings.estimated.total) - 1) * 100 
      : 0;

    // Update earnings record
    const updateResult = await this.earningsCollection.updateOne(
      { _id: earnings._id },
      {
        $set: {
          actual: {
            total: totalActual,
            byChannel: actualByChannel,
            byItem: actualByItem,
          },
          trackedDigitalImpressions: {
            estimated: earnings.trackedDigitalImpressions.estimated,
            actual: totalDigitalImpressions,
          },
          variance: {
            amount: varianceAmount,
            percentage: variancePercentage,
          },
          amountOwed: Math.max(0, totalActual - earnings.amountPaid),
          updatedAt: new Date(),
        }
      }
    );

    // Return updated record
    return this.earningsCollection.findOne({ _id: earnings._id });
  }

  /**
   * Finalize earnings for an order (called at campaign end)
   */
  async finalizePublisherEarnings(orderId: string): Promise<PublicationEarnings | null> {
    // First update to get latest actuals
    await this.updatePublisherActualEarnings(orderId);
    
    // Mark as finalized
    const result = await this.earningsCollection.findOneAndUpdate(
      { orderId: orderId.toString() },
      {
        $set: {
          finalized: true,
          finalizedAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Record a payment to a publisher
   */
  async recordPublisherPayment(
    earningsId: string,
    payment: {
      amount: number;
      reference?: string;
      method?: 'check' | 'ach' | 'wire' | 'other';
      notes?: string;
      recordedBy?: string;
    }
  ): Promise<PublicationEarnings | null> {
    const earnings = await this.earningsCollection.findOne({
      $or: [
        { _id: new ObjectId(earningsId) },
        { _id: earningsId as any }
      ]
    });
    
    if (!earnings) return null;

    const newAmountPaid = earnings.amountPaid + payment.amount;
    const newAmountOwed = earnings.actual.total - newAmountPaid;
    
    let newStatus: 'pending' | 'partially_paid' | 'paid' = 'pending';
    if (newAmountPaid >= earnings.actual.total) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partially_paid';
    }

    const result = await this.earningsCollection.findOneAndUpdate(
      { _id: earnings._id },
      {
        $set: {
          amountPaid: newAmountPaid,
          amountOwed: Math.max(0, newAmountOwed),
          paymentStatus: newStatus,
          updatedAt: new Date(),
        },
        $push: {
          paymentHistory: {
            amount: payment.amount,
            date: new Date(),
            reference: payment.reference,
            method: payment.method,
            notes: payment.notes,
            recordedBy: payment.recordedBy,
            recordedAt: new Date(),
          }
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // ==================== Hub Platform Billing ====================

  /**
   * Create hub billing estimate for a campaign
   * Called when all orders for a campaign are confirmed
   */
  async createHubBillingEstimate(campaignId: string): Promise<HubBilling | null> {
    // Check if billing record already exists
    const campaign = await this.campaignsCollection.findOne({ campaignId });
    if (!campaign) {
      console.error(`Campaign not found: ${campaignId}`);
      return null;
    }

    const hubId = campaign.hubId;
    
    // Get hub billing configuration
    const hub = await this.hubsCollection.findOne({ hubId });
    if (!hub?.platformBilling) {
      console.log(`Hub ${hubId} has no platform billing configuration`);
      return null;
    }

    const billingConfig = hub.platformBilling;

    // Check if billing record already exists
    const existing = await this.hubBillingCollection.findOne({ 
      hubId, 
      campaignId 
    });
    if (existing) {
      console.log(`Billing record already exists for hub ${hubId}, campaign ${campaignId}`);
      return existing;
    }

    // Get all earnings records for this campaign
    const allEarnings = await this.earningsCollection
      .find({ campaignId })
      .toArray();

    // Calculate totals
    let totalEstimatedPayouts = 0;
    let totalEstimatedDigitalImpressions = 0;

    for (const earnings of allEarnings) {
      totalEstimatedPayouts += earnings.estimated.total;
      totalEstimatedDigitalImpressions += earnings.trackedDigitalImpressions.estimated;
    }

    // Calculate fees
    const revenueShareRate = billingConfig.revenueSharePercent;
    const platformCpmRate = billingConfig.platformCpmRate;

    const revenueShareEstimated = totalEstimatedPayouts * (revenueShareRate / 100);
    const platformCpmEstimated = (totalEstimatedDigitalImpressions / 1000) * platformCpmRate;
    const totalFeesEstimated = revenueShareEstimated + platformCpmEstimated;

    // Create billing record
    const billingRecord: HubBilling = {
      hubId,
      hubName: hub.basicInfo?.name,
      campaignId,
      campaignName: campaign.basicInfo?.name,
      
      publisherPayouts: {
        estimated: totalEstimatedPayouts,
        actual: 0,
        publicationCount: allEarnings.length,
      },
      
      revenueShareFee: {
        rate: revenueShareRate,
        estimated: revenueShareEstimated,
        actual: 0,
      },
      
      platformCpmFee: {
        rate: platformCpmRate,
        trackedImpressions: {
          estimated: totalEstimatedDigitalImpressions,
          actual: 0,
        },
        estimated: platformCpmEstimated,
        actual: 0,
      },
      
      totalFees: {
        estimated: totalFeesEstimated,
        actual: 0,
      },
      
      paymentStatus: 'pending',
      amountPaid: 0,
      amountOwed: 0,
      paymentHistory: [],
      
      createdAt: new Date(),
      updatedAt: new Date(),
      campaignStartDate: campaign.timeline?.startDate,
      campaignEndDate: campaign.timeline?.endDate,
      finalized: false,
    };

    const result = await this.hubBillingCollection.insertOne(billingRecord as any);
    
    return { ...billingRecord, _id: result.insertedId };
  }

  /**
   * Update hub billing based on actual publisher earnings
   * Called after publisher earnings are updated
   */
  async updateHubBillingActual(campaignId: string): Promise<HubBilling | null> {
    // Get billing record
    const billing = await this.hubBillingCollection.findOne({ campaignId });
    if (!billing) {
      console.log(`No billing record found for campaign ${campaignId}`);
      return null;
    }

    // Get all earnings records for this campaign
    const allEarnings = await this.earningsCollection
      .find({ campaignId })
      .toArray();

    // Calculate actual totals
    let totalActualPayouts = 0;
    let totalActualDigitalImpressions = 0;

    for (const earnings of allEarnings) {
      totalActualPayouts += earnings.actual.total;
      totalActualDigitalImpressions += earnings.trackedDigitalImpressions.actual;
    }

    // Calculate actual fees
    const revenueShareActual = totalActualPayouts * (billing.revenueShareFee.rate / 100);
    const platformCpmActual = (totalActualDigitalImpressions / 1000) * billing.platformCpmFee.rate;
    const totalFeesActual = revenueShareActual + platformCpmActual;

    // Update billing record
    const result = await this.hubBillingCollection.findOneAndUpdate(
      { _id: billing._id },
      {
        $set: {
          'publisherPayouts.actual': totalActualPayouts,
          'revenueShareFee.actual': revenueShareActual,
          'platformCpmFee.trackedImpressions.actual': totalActualDigitalImpressions,
          'platformCpmFee.actual': platformCpmActual,
          'totalFees.actual': totalFeesActual,
          amountOwed: totalFeesActual - billing.amountPaid,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Finalize hub billing for a campaign (called at campaign end)
   */
  async finalizeHubBilling(campaignId: string): Promise<HubBilling | null> {
    // First update to get latest actuals
    await this.updateHubBillingActual(campaignId);
    
    // Mark as finalized
    const result = await this.hubBillingCollection.findOneAndUpdate(
      { campaignId },
      {
        $set: {
          finalized: true,
          finalizedAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Record a payment from a hub to the platform
   */
  async recordHubPayment(
    billingId: string,
    payment: {
      amount: number;
      reference?: string;
      method?: 'ach' | 'wire' | 'check' | 'credit_card' | 'other';
      invoiceNumber?: string;
      notes?: string;
    }
  ): Promise<HubBilling | null> {
    const billing = await this.hubBillingCollection.findOne({
      $or: [
        { _id: new ObjectId(billingId) },
        { _id: billingId as any }
      ]
    });
    
    if (!billing) return null;

    const newAmountPaid = billing.amountPaid + payment.amount;
    const newAmountOwed = billing.totalFees.actual - newAmountPaid;
    
    let newStatus: 'pending' | 'invoiced' | 'partially_paid' | 'paid' = billing.paymentStatus;
    if (newAmountPaid >= billing.totalFees.actual) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partially_paid';
    }

    const result = await this.hubBillingCollection.findOneAndUpdate(
      { _id: billing._id },
      {
        $set: {
          amountPaid: newAmountPaid,
          amountOwed: Math.max(0, newAmountOwed),
          paymentStatus: newStatus,
          updatedAt: new Date(),
        },
        $push: {
          paymentHistory: {
            amount: payment.amount,
            date: new Date(),
            reference: payment.reference,
            method: payment.method,
            invoiceNumber: payment.invoiceNumber,
            notes: payment.notes,
            recordedAt: new Date(),
          }
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // ==================== Query Methods ====================

  /**
   * Calculate earnings for a single order on-the-fly
   * This doesn't require a pre-created earnings record
   */
  async calculateOrderEarnings(orderId: string): Promise<{
    orderId: string;
    campaignId: string;
    campaignName: string;
    publicationId: number;
    publicationName: string;
    hubId: string;
    estimated: { total: number; byChannel: Record<string, number> };
    actual: { total: number; byChannel: Record<string, number> };
    variance: { amount: number; percentage: number };
    paymentStatus: 'pending' | 'partially_paid' | 'paid';
    amountPaid: number;
    amountOwed: number;
    finalized: boolean;
    createdAt: Date;
    campaignEndDate?: Date;
  } | null> {
    // Get the order - handle different ID formats
    const orderQuery: any[] = [{ _id: orderId }];
    // Only add ObjectId query if orderId is a valid 24-char hex string
    if (orderId && /^[a-fA-F0-9]{24}$/.test(orderId)) {
      orderQuery.unshift({ _id: new ObjectId(orderId) });
    }
    const order = await this.ordersCollection.findOne({ $or: orderQuery });
    
    if (!order) return null;
    
    // Only include confirmed orders
    if (order.status !== 'confirmed' && order.status !== 'completed') {
      return null;
    }
    
    // Get campaign info - handle different ID formats
    const campaignQuery: any[] = [
      { _id: order.campaignId },
      { campaignId: order.campaignId }
    ];
    // Only add ObjectId query if campaignId is a valid 24-char hex string
    if (order.campaignId && /^[a-fA-F0-9]{24}$/.test(order.campaignId)) {
      campaignQuery.unshift({ _id: new ObjectId(order.campaignId) });
    }
    const campaign = await this.campaignsCollection.findOne({ $or: campaignQuery });
    
    // Get existing earnings record for payment info (if exists)
    const existingEarnings = await this.earningsCollection.findOne({ orderId: orderId.toString() });
    
    // Get performance entries for this order
    const performanceEntries = await this.performanceEntriesCollection
      .find({ orderId: orderId.toString() })
      .toArray();
    
    // Get verified proofs for this order
    const verifiedProofs = await this.proofsCollection
      .find({ orderId: orderId.toString(), status: 'verified' })
      .toArray();
    
    // Calculate estimated earnings from campaign inventory for this publication
    const estimatedByChannel: Record<string, number> = {};
    let estimatedTotal = 0;
    
    // Get items from order.selectedInventory (source of truth, not campaign.selectedInventory which may be stale)
    // Structure: order.selectedInventory.publications[0].inventoryItems (HubPackageInventoryItem[])
    let items: any[] = [];
    
    const orderPublication = order?.selectedInventory?.publications?.[0];
    if (orderPublication) {
      items = orderPublication.inventoryItems || [];
      // Calculate total in real-time from inventory items (more reliable than stored total)
      estimatedTotal = items.reduce((sum: number, item: any) => {
        return sum + (item.itemPricing?.totalCost || item.itemPricing?.hubPrice || 0);
      }, 0);
    }
    
    // Calculate channel breakdown from inventory items
    for (const item of items) {
      const channel = item.channel || 'other';
      const itemCost = item.itemPricing?.totalCost || item.campaignCost || 0;
      estimatedByChannel[channel] = (estimatedByChannel[channel] || 0) + itemCost;
    }
    
    // Calculate actual earnings from performance entries
    const actualByChannel: Record<string, number> = {};
    let actualTotal = 0;
    
    for (const entry of performanceEntries) {
      const channel = entry.channel || 'other';
      // Find the matching item by path first; only fall back to channel
      // if exactly one item exists for that channel (avoids false matches).
      let matchingItem = items.find((i: any) => 
        i.itemPath === entry.itemPath || 
        i.sourcePath === entry.itemPath
      );
      if (!matchingItem) {
        const channelItems = items.filter((i: any) => i.channel === channel);
        if (channelItems.length === 1) {
          matchingItem = channelItems[0];
        }
      }
      
      if (matchingItem) {
        const pricingModel = matchingItem.itemPricing?.pricingModel || 'flat';
        // HubPackageInventoryItem stores rate in itemPricing.hubPrice
        const rate = matchingItem.itemPricing?.hubPrice || 0;
        const itemEstimatedCost = matchingItem.itemPricing?.totalCost || matchingItem.campaignCost || rate;
        
        // Calculate based on pricing model
        let itemEarnings = 0;
        const impressions = entry.metrics?.impressions || 0;
        const clicks = entry.metrics?.clicks || 0;
        const occurrences = entry.occurrenceCount || 1;
        
        switch (pricingModel) {
          case 'cpm':
            itemEarnings = (impressions / 1000) * rate;
            break;
          case 'cpc':
            itemEarnings = clicks * rate;
            break;
          case 'per_send':
          case 'per_spot':
          case 'per_post':
          case 'per_ad':
          case 'per_episode':
            itemEarnings = occurrences * rate;
            break;
          case 'flat':
          case 'monthly':
          default:
            // For flat rate, count verified proofs or use percentage complete
            const proofCount = verifiedProofs.filter(p => p.itemPath === entry.itemPath).length;
            // HubPackageInventoryItem uses 'quantity' for planned occurrences
            const plannedOccurrences = matchingItem.quantity || 1;
            const completionPercent = Math.min(1, proofCount / plannedOccurrences);
            itemEarnings = completionPercent * itemEstimatedCost;
            break;
        }
        
        // Cap per-item earnings at the contract value
        itemEarnings = Math.min(itemEarnings, itemEstimatedCost);
        
        actualByChannel[channel] = (actualByChannel[channel] || 0) + itemEarnings;
        actualTotal += itemEarnings;
      }
    }
    
    // For flat-rate items without performance entries, calculate from proofs
    for (const item of items) {
      const channel = item.channel || 'other';
      const hasPerformanceEntry = performanceEntries.some((e: any) => 
        e.itemPath === item.itemPath || e.itemPath === item.sourcePath
      );
      
      if (!hasPerformanceEntry) {
        const itemProofs = verifiedProofs.filter(p => 
          p.itemPath === item.itemPath || p.itemPath === item.sourcePath
        );
        
        if (itemProofs.length > 0) {
          // HubPackageInventoryItem uses 'quantity' for planned occurrences
          const plannedOccurrences = item.quantity || 1;
          const completionPercent = Math.min(1, itemProofs.length / plannedOccurrences);
          const itemEstimatedCost = item.itemPricing?.totalCost || item.campaignCost || 0;
          const itemEarnings = Math.min(
            completionPercent * itemEstimatedCost,
            itemEstimatedCost
          );
          
          actualByChannel[channel] = (actualByChannel[channel] || 0) + itemEarnings;
          actualTotal += itemEarnings;
        }
      }
    }
    
    // Cap total actual earnings at the contract value
    actualTotal = Math.min(actualTotal, estimatedTotal);
    
    // Calculate variance
    const varianceAmount = actualTotal - estimatedTotal;
    const variancePercent = estimatedTotal > 0 ? (varianceAmount / estimatedTotal) * 100 : 0;
    
    // Use payment info from existing record, or defaults
    const amountPaid = existingEarnings?.amountPaid || 0;
    const amountOwed = Math.max(0, actualTotal - amountPaid);
    let paymentStatus: 'pending' | 'partially_paid' | 'paid' = 'pending';
    if (amountPaid >= actualTotal && actualTotal > 0) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partially_paid';
    }
    
    // Check if campaign has ended (finalized)
    const campaignEndDate = campaign?.timeline?.endDate ? new Date(campaign.timeline.endDate) : undefined;
    const finalized = campaignEndDate ? campaignEndDate < new Date() : false;
    
    return {
      orderId: orderId.toString(),
      campaignId: order.campaignId,
      campaignName: campaign?.basicInfo?.name || 'Unknown Campaign',
      publicationId: order.publicationId,
      publicationName: order.publicationName || 'Unknown Publication',
      hubId: order.hubId || campaign?.hubId || '',
      estimated: { total: estimatedTotal, byChannel: estimatedByChannel },
      actual: { total: actualTotal, byChannel: actualByChannel },
      variance: { amount: varianceAmount, percentage: variancePercent },
      paymentStatus,
      amountPaid,
      amountOwed,
      finalized,
      createdAt: order.createdAt || new Date(),
      campaignEndDate,
    };
  }

  /**
   * Get earnings for a publication (calculates on-the-fly)
   */
  async getPublicationEarnings(
    publicationId: number,
    options?: {
      paymentStatus?: 'pending' | 'partially_paid' | 'paid';
      finalized?: boolean;
      limit?: number;
      skip?: number;
    }
  ): Promise<any[]> {
    // Get all confirmed orders for this publication
    const orders = await this.ordersCollection
      .find({ 
        publicationId,
        status: { $in: ['confirmed', 'completed'] }
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Calculate earnings for each order
    const earningsPromises = orders.map(async (order) => {
      const orderId = order._id?.toString();
      if (!orderId) return null;
      return this.calculateOrderEarnings(orderId);
    });
    
    const allEarnings = (await Promise.all(earningsPromises)).filter(e => e !== null);
    
    // Apply filters
    let filteredEarnings = allEarnings;
    
    if (options?.paymentStatus) {
      filteredEarnings = filteredEarnings.filter(e => e!.paymentStatus === options.paymentStatus);
    }
    if (options?.finalized !== undefined) {
      filteredEarnings = filteredEarnings.filter(e => e!.finalized === options.finalized);
    }
    
    // Apply pagination
    const skip = options?.skip || 0;
    const limit = options?.limit || 100;
    
    return filteredEarnings.slice(skip, skip + limit);
  }

  /**
   * Get earnings summary for a publication (calculates on-the-fly)
   */
  async getPublicationEarningsSummary(publicationId: number): Promise<{
    totalEarned: number;
    totalPaid: number;
    totalPending: number;
    campaignCount: number;
    byPaymentStatus: Record<string, number>;
  }> {
    // Get all earnings on-the-fly
    const allEarnings = await this.getPublicationEarnings(publicationId, { limit: 1000 });

    const summary = {
      totalEarned: 0,
      totalPaid: 0,
      totalPending: 0,
      campaignCount: allEarnings.length,
      byPaymentStatus: {
        pending: 0,
        partially_paid: 0,
        paid: 0,
      } as Record<string, number>,
    };

    for (const earnings of allEarnings) {
      // Use actual if available, otherwise estimated
      summary.totalEarned += earnings.actual.total > 0 ? earnings.actual.total : earnings.estimated.total;
      summary.totalPaid += earnings.amountPaid;
      summary.totalPending += earnings.amountOwed;
      summary.byPaymentStatus[earnings.paymentStatus] = 
        (summary.byPaymentStatus[earnings.paymentStatus] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get hub billing records
   */
  async getHubBilling(
    hubId: string,
    options?: {
      paymentStatus?: 'pending' | 'invoiced' | 'partially_paid' | 'paid';
      finalized?: boolean;
      limit?: number;
      skip?: number;
    }
  ): Promise<HubBilling[]> {
    const query: any = { hubId };
    
    if (options?.paymentStatus) {
      query.paymentStatus = options.paymentStatus;
    }
    if (options?.finalized !== undefined) {
      query.finalized = options.finalized;
    }

    return this.hubBillingCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0)
      .limit(options?.limit || 100)
      .toArray();
  }

  /**
   * Get hub billing summary
   */
  async getHubBillingSummary(hubId: string): Promise<{
    totalFees: number;
    totalPaid: number;
    totalOutstanding: number;
    campaignCount: number;
    revenueShareTotal: number;
    platformCpmTotal: number;
  }> {
    const allBilling = await this.hubBillingCollection
      .find({ hubId })
      .toArray();

    const summary = {
      totalFees: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      campaignCount: allBilling.length,
      revenueShareTotal: 0,
      platformCpmTotal: 0,
    };

    for (const billing of allBilling) {
      summary.totalFees += billing.totalFees.actual || billing.totalFees.estimated;
      summary.totalPaid += billing.amountPaid;
      summary.totalOutstanding += billing.amountOwed;
      summary.revenueShareTotal += billing.revenueShareFee.actual || billing.revenueShareFee.estimated;
      summary.platformCpmTotal += billing.platformCpmFee.actual || billing.platformCpmFee.estimated;
    }

    return summary;
  }

  /**
   * Get all hub billing (platform admin view)
   */
  async getAllHubBilling(options?: {
    paymentStatus?: string;
    limit?: number;
    skip?: number;
  }): Promise<HubBilling[]> {
    const query: any = {};
    
    if (options?.paymentStatus) {
      query.paymentStatus = options.paymentStatus;
    }

    return this.hubBillingCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0)
      .limit(options?.limit || 100)
      .toArray();
  }

  /**
   * Get platform-wide billing summary
   */
  async getPlatformBillingSummary(): Promise<{
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
    hubCount: number;
    campaignCount: number;
    byHub: Array<{
      hubId: string;
      hubName: string;
      totalFees: number;
      paid: number;
      outstanding: number;
    }>;
  }> {
    const allBilling = await this.hubBillingCollection.find({}).toArray();

    const byHubMap = new Map<string, {
      hubId: string;
      hubName: string;
      totalFees: number;
      paid: number;
      outstanding: number;
    }>();

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    const hubIds = new Set<string>();

    for (const billing of allBilling) {
      hubIds.add(billing.hubId);
      
      const fees = billing.totalFees.actual || billing.totalFees.estimated;
      totalRevenue += fees;
      totalCollected += billing.amountPaid;
      totalOutstanding += billing.amountOwed;

      const existing = byHubMap.get(billing.hubId);
      if (existing) {
        existing.totalFees += fees;
        existing.paid += billing.amountPaid;
        existing.outstanding += billing.amountOwed;
      } else {
        byHubMap.set(billing.hubId, {
          hubId: billing.hubId,
          hubName: billing.hubName || billing.hubId,
          totalFees: fees,
          paid: billing.amountPaid,
          outstanding: billing.amountOwed,
        });
      }
    }

    return {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      hubCount: hubIds.size,
      campaignCount: allBilling.length,
      byHub: Array.from(byHubMap.values()).sort((a, b) => b.totalFees - a.totalFees),
    };
  }
}

// Singleton instance
export const earningsService = new EarningsService();
