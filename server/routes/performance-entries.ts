/**
 * Performance Entries Routes
 * 
 * API endpoints for creating, reading, updating, and deleting performance entries.
 * Supports both publication self-reporting and hub admin entry.
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authenticate';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { 
  PerformanceEntry, 
  PerformanceEntryInsert,
  validatePerformanceEntry,
  computeCTR,
  PerformanceChannel
} from '../../src/integrations/mongodb/performanceEntrySchema';
import { placementCompletionService } from '../../src/services/placementCompletionService';
import { earningsService } from '../../src/services/earningsService';
import { countNewsletterSends } from '../newsletterSendDetection';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/performance-entries
 * List performance entries with optional filters
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { orderId, campaignId, publicationId, channel, dateFrom, dateTo, limit = 100 } = req.query;
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Build query
    const query: any = { deletedAt: { $exists: false } };
    
    if (orderId) query.orderId = orderId;
    if (campaignId) query.campaignId = campaignId;
    if (publicationId) query.publicationId = parseInt(publicationId as string);
    if (channel) query.channel = channel;
    if (dateFrom || dateTo) {
      query.dateStart = {};
      if (dateFrom) query.dateStart.$gte = new Date(dateFrom as string);
      if (dateTo) query.dateStart.$lte = new Date(dateTo as string);
    }
    
    const entries = await collection
      .find(query)
      .sort({ dateStart: -1 })
      .limit(parseInt(limit as string))
      .toArray();
    
    res.json({ entries, total: entries.length });
  } catch (error) {
    console.error('Error fetching performance entries:', error);
    res.status(500).json({ error: 'Failed to fetch performance entries' });
  }
});

/**
 * GET /api/performance-entries/order/:orderId
 * Get all performance entries for a specific order
 */
router.get('/order/:orderId', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Return ALL entries (including invalid) so the frontend can show warnings
    const entries = await collection
      .find({ orderId, deletedAt: { $exists: false } })
      .sort({ dateStart: -1, itemPath: 1 })
      .toArray();
    
    // Calculate summary — only count valid entries in totals
    const isValidEntry = (entry: PerformanceEntry) => {
      const vs = (entry as any).validationStatus;
      if (vs === 'bad_pixel' || vs === 'invalid_orderId' || vs === 'invalid_traffic') return false;
      // Also exclude automated entries with tracking-pixel or empty itemName
      if (entry.source === 'automated') {
        const name = (entry as any).itemName;
        if (!name || name === 'tracking-pixel') return false;
      }
      return true;
    };
    
    const summary = {
      totalEntries: entries.length,
      byChannel: {} as Record<string, { count: number; impressions: number; clicks: number; units: number }>,
      dateRange: {
        earliest: entries.length > 0 ? entries[entries.length - 1].dateStart : null,
        latest: entries.length > 0 ? entries[0].dateStart : null,
      },
      totals: {
        impressions: 0,
        clicks: 0,
        reach: 0,
      }
    };
    
    entries.forEach(entry => {
      if (!isValidEntry(entry)) return; // Skip invalid entries from totals
      
      const ch = entry.channel;
      if (!summary.byChannel[ch]) {
        summary.byChannel[ch] = { count: 0, impressions: 0, clicks: 0, units: 0 };
      }
      summary.byChannel[ch].count++;
      summary.byChannel[ch].impressions += entry.metrics.impressions || 0;
      summary.byChannel[ch].clicks += entry.metrics.clicks || 0;
      summary.byChannel[ch].units += (entry.metrics.insertions || entry.metrics.spotsAired || entry.metrics.posts || 0);
      
      summary.totals.impressions += entry.metrics.impressions || 0;
      summary.totals.clicks += entry.metrics.clicks || 0;
      summary.totals.reach += entry.metrics.reach || 0;
    });
    
    res.json({ entries, summary });
  } catch (error) {
    console.error('Error fetching order performance entries:', error);
    res.status(500).json({ error: 'Failed to fetch performance entries' });
  }
});

/**
 * GET /api/performance-entries/campaign/:campaignId
 * Get all performance entries for a campaign
 */
router.get('/campaign/:campaignId', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    const entries = await collection
      .find({ campaignId, deletedAt: { $exists: false } })
      .sort({ publicationId: 1, dateStart: -1 })
      .toArray();
    
    // Group by publication
    const byPublication: Record<number, {
      publicationId: number;
      publicationName: string;
      entries: PerformanceEntry[];
      totals: { impressions: number; clicks: number; units: number; reach: number };
    }> = {};
    
    entries.forEach(entry => {
      if (!byPublication[entry.publicationId]) {
        byPublication[entry.publicationId] = {
          publicationId: entry.publicationId,
          publicationName: entry.publicationName,
          entries: [],
          totals: { impressions: 0, clicks: 0, units: 0, reach: 0 }
        };
      }
      byPublication[entry.publicationId].entries.push(entry);
      byPublication[entry.publicationId].totals.impressions += entry.metrics.impressions || 0;
      byPublication[entry.publicationId].totals.clicks += entry.metrics.clicks || 0;
      byPublication[entry.publicationId].totals.reach += entry.metrics.reach || 0;
      byPublication[entry.publicationId].totals.units += (
        entry.metrics.insertions || 
        entry.metrics.spotsAired || 
        entry.metrics.posts || 
        entry.metrics.downloads ||
        0
      );
    });
    
    res.json({ 
      entries, 
      byPublication: Object.values(byPublication),
      total: entries.length
    });
  } catch (error) {
    console.error('Error fetching campaign performance entries:', error);
    res.status(500).json({ error: 'Failed to fetch performance entries' });
  }
});

/**
 * GET /api/performance-entries/:id
 * Get a specific performance entry by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    const entry = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!entry) {
      return res.status(404).json({ error: 'Performance entry not found' });
    }
    
    res.json({ entry });
  } catch (error) {
    console.error('Error fetching performance entry:', error);
    res.status(500).json({ error: 'Failed to fetch performance entry' });
  }
});

/**
 * POST /api/performance-entries
 * Create a new performance entry
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const entryData: PerformanceEntryInsert = {
      ...req.body,
      enteredBy: userId,
      enteredAt: new Date(),
      source: req.body.source || 'manual',
    };
    
    // Validate
    const errors = validatePerformanceEntry(entryData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    // Compute CTR if clicks and impressions are provided
    if (entryData.metrics.clicks !== undefined && entryData.metrics.impressions !== undefined) {
      entryData.metrics.ctr = computeCTR(entryData.metrics.clicks, entryData.metrics.impressions);
    }
    
    // Parse dates
    entryData.dateStart = new Date(entryData.dateStart);
    if (entryData.dateEnd) {
      entryData.dateEnd = new Date(entryData.dateEnd);
    }
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    const result = await collection.insertOne(entryData as any);
    
    // Update order delivery summary
    await updateOrderDeliverySummary(entryData.orderId);
    
    // Check if this placement should auto-complete
    if (entryData.itemPath && entryData.channel) {
      try {
        const completionResult = await placementCompletionService.checkAndCompleteIfReady(
          entryData.orderId,
          entryData.itemPath,
          entryData.channel
        );
        if (completionResult.completed) {
          console.log(`[Performance Entry] Auto-completed placement ${entryData.itemPath}: ${completionResult.reason}`);
        }
      } catch (err) {
        // Don't fail the request if completion check fails
        console.error('Error checking placement completion:', err);
      }
    }
    
    // Update publisher earnings based on new performance data
    try {
      await earningsService.updatePublisherActualEarnings(entryData.orderId);
      // Also update hub billing if this is a digital channel with tracked impressions
      if (entryData.metrics?.impressions) {
        const order = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
          .findOne({ _id: entryData.orderId });
        if (order?.campaignId) {
          await earningsService.updateHubBillingActual(order.campaignId);
        }
      }
    } catch (err) {
      // Don't fail the request if earnings update fails
      console.error('Error updating earnings:', err);
    }
    
    res.status(201).json({ 
      success: true, 
      entry: { ...entryData, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating performance entry:', error);
    res.status(500).json({ error: 'Failed to create performance entry' });
  }
});

/**
 * PUT /api/performance-entries/:id
 * Update a performance entry
 */
router.put('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Get existing entry
    const existing = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Performance entry not found' });
    }
    
    // Prevent editing of automated (digital tracking) entries
    if (existing.source === 'automated') {
      return res.status(403).json({ error: 'Automated performance entries cannot be edited' });
    }
    
    // Build update
    const updateData: any = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date(),
    };
    
    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.orderId;
    delete updateData.campaignId;
    delete updateData.publicationId;
    delete updateData.enteredBy;
    delete updateData.enteredAt;
    
    // Compute CTR if metrics changed
    if (updateData.metrics) {
      const metrics = { ...existing.metrics, ...updateData.metrics };
      if (metrics.clicks !== undefined && metrics.impressions !== undefined) {
        updateData.metrics.ctr = computeCTR(metrics.clicks, metrics.impressions);
      }
    }
    
    // Parse dates if provided
    if (updateData.dateStart) {
      updateData.dateStart = new Date(updateData.dateStart);
    }
    if (updateData.dateEnd) {
      updateData.dateEnd = new Date(updateData.dateEnd);
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Update order delivery summary
    await updateOrderDeliverySummary(existing.orderId);
    
    // Update publisher earnings
    try {
      await earningsService.updatePublisherActualEarnings(existing.orderId);
      // Also update hub billing
      const order = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
        .findOne({ _id: existing.orderId });
      if (order?.campaignId) {
        await earningsService.updateHubBillingActual(order.campaignId);
      }
    } catch (err) {
      console.error('Error updating earnings:', err);
    }

    res.json({ success: true, entry: result });
  } catch (error) {
    console.error('Error updating performance entry:', error);
    res.status(500).json({ error: 'Failed to update performance entry' });
  }
});

/**
 * DELETE /api/performance-entries/:id
 * Soft delete a performance entry
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Get existing entry first
    const existing = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Performance entry not found' });
    }
    
    // Prevent deletion of automated (digital tracking) entries
    if (existing.source === 'automated') {
      return res.status(403).json({ error: 'Automated performance entries cannot be deleted' });
    }
    
    // Soft delete
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() } }
    );

    // Update order delivery summary
    await updateOrderDeliverySummary(existing.orderId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting performance entry:', error);
    res.status(500).json({ error: 'Failed to delete performance entry' });
  }
});

/**
 * POST /api/performance-entries/bulk
 * Create multiple performance entries at once
 */
router.post('/bulk', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }
    
    const db = getDatabase();
    const collection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    const now = new Date();
    const processedEntries: PerformanceEntryInsert[] = [];
    const errors: Array<{ index: number; errors: string[] }> = [];
    
    entries.forEach((entry: any, index: number) => {
      const entryData: PerformanceEntryInsert = {
        ...entry,
        enteredBy: userId,
        enteredAt: now,
        source: entry.source || 'import',
        dateStart: new Date(entry.dateStart),
        dateEnd: entry.dateEnd ? new Date(entry.dateEnd) : undefined,
      };
      
      // Validate
      const validationErrors = validatePerformanceEntry(entryData);
      if (validationErrors.length > 0) {
        errors.push({ index, errors: validationErrors });
      } else {
        // Compute CTR
        if (entryData.metrics.clicks !== undefined && entryData.metrics.impressions !== undefined) {
          entryData.metrics.ctr = computeCTR(entryData.metrics.clicks, entryData.metrics.impressions);
        }
        processedEntries.push(entryData);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Some entries failed validation', 
        errors,
        validCount: processedEntries.length
      });
    }
    
    if (processedEntries.length > 0) {
      await collection.insertMany(processedEntries as any[]);
      
      // Update delivery summaries for affected orders
      const orderIds = [...new Set(processedEntries.map(e => e.orderId))];
      for (const orderId of orderIds) {
        await updateOrderDeliverySummary(orderId);
      }
    }
    
    res.status(201).json({ 
      success: true, 
      inserted: processedEntries.length
    });
  } catch (error) {
    console.error('Error creating bulk performance entries:', error);
    res.status(500).json({ error: 'Failed to create performance entries' });
  }
});

/**
 * Helper function to update order delivery summary
 * Tracks TWO metrics:
 * 1. Reports completion - how many placements have been reported (e.g., 4/4 episodes)
 * 2. Volume delivered - total impressions, downloads, spots aired, etc.
 */
export async function updateOrderDeliverySummary(orderId: string): Promise<void> {
  try {
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    // Get current order
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    if (!order) return;
    
    // Use the order's own selectedInventory as the authoritative source for placements.
    // The campaign's selectedInventory may be stale when placements are added to orders.
    const publication = order.selectedInventory?.publications?.[0];
    
    // Calculate expected delivery by channel from stored deliveryGoals
    const expectedByChannel: Record<string, { 
      count: number;        // Number of placements
      goal: number;         // Expected delivery (impressions for digital, frequency for offline)
      goalType: 'impressions' | 'frequency';
    }> = {};
    let totalExpectedReports = 0;
    let totalExpectedGoal = 0;
    
    const digitalChannels = ['website', 'streaming'];
    
    if (publication?.inventoryItems) {
      publication.inventoryItems.forEach((item: any) => {
        if (item.isExcluded) return;
        const channel = (item.channel || 'other').toLowerCase();
        const isDigital = digitalChannels.includes(channel);
        
        if (!expectedByChannel[channel]) {
          expectedByChannel[channel] = { 
            count: 0, 
            goal: 0, 
            goalType: isDigital ? 'impressions' : 'frequency' 
          };
        }
        
        expectedByChannel[channel].count++;
        totalExpectedReports++;
        
        const placementGoal = order.deliveryGoals?.[item.itemPath] || order.deliveryGoals?.[item.sourcePath];
        const goalValue = placementGoal?.goalValue || 0;
        expectedByChannel[channel].goal += goalValue;
        totalExpectedGoal += goalValue;
      });
    }
    
    // Get all performance entries for this order, excluding only data-quality failures.
    // The aggregation uses a relaxed filter so digital delivery (impressions) includes
    // automated entries even when they lack a specific asset/item name.
    // reportCount is computed conditionally to only count entries with proper item names.
    const deliveryFilter = {
      orderId,
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
    };
    
    const entriesByChannel = await perfCollection.aggregate([
      { $match: deliveryFilter },
      { $group: {
        _id: '$channel',
        reportCount: { $sum: {
          $cond: [
            { $or: [
              { $ne: ['$source', 'automated'] },
              { $and: [
                { $ne: [{ $ifNull: ['$itemName', ''] }, ''] },
                { $ne: ['$itemName', 'tracking-pixel'] }
              ]}
            ]},
            1, 0
          ]
        }},
        impressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
        clicks: { $sum: { $ifNull: ['$metrics.clicks', 0] } },
        reach: { $sum: { $ifNull: ['$metrics.reach', 0] } },
        insertions: { $sum: { $ifNull: ['$metrics.insertions', 0] } },
        spotsAired: { $sum: { $ifNull: ['$metrics.spotsAired', 0] } },
        downloads: { $sum: { $ifNull: ['$metrics.downloads', 0] } },
        posts: { $sum: { $ifNull: ['$metrics.posts', 0] } },
        circulation: { $sum: { $ifNull: ['$metrics.circulation', 0] } }
      }}
    ]).toArray();

    // Newsletter sends: get impressions per (itemPath, date), then cluster into
    // send bursts (gap > 2 days = new send), filtering out noise via min impressions
    const nlDatesAgg = await perfCollection.aggregate([
      { $match: { ...deliveryFilter, channel: { $regex: /^newsletter$/i } } },
      { $group: {
        _id: {
          itemPath: '$itemPath',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$dateStart' } }
        },
        impressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } }
      }},
      { $group: {
        _id: '$_id.itemPath',
        dateImpressions: { $push: { date: '$_id.date', impressions: '$impressions' } }
      }}
    ]).toArray();

    const subscribersByItemPath: Record<string, number> = {};
    if (publication?.inventoryItems) {
      for (const item of publication.inventoryItems) {
        if ((item.channel || '').toLowerCase() === 'newsletter' && (item.itemPath || item.sourcePath)) {
          subscribersByItemPath[item.itemPath || item.sourcePath] =
            item.audienceMetrics?.subscribers || 0;
        }
      }
    }
    const newsletterSendCount = countNewsletterSends(nlDatesAgg, 2, subscribersByItemPath);
    
    // Compute pixel health from ALL automated entries (including invalid ones)
    const pixelHealthAgg = await perfCollection.aggregate([
      { $match: { orderId, deletedAt: { $exists: false }, source: 'automated' } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        badCount: { $sum: {
          $cond: [
            { $or: [
              { $in: ['$validationStatus', ['bad_pixel', 'invalid_orderId', 'invalid_traffic']] },
              { $eq: ['$itemName', 'tracking-pixel'] },
              { $eq: ['$itemName', ''] },
              { $eq: [{ $ifNull: ['$itemName', null] }, null] },
            ]},
            1, 0
          ]
        }},
        totalImpressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
        hasAssetEntries: { $sum: {
          $cond: [
            { $and: [
              { $ne: [{ $ifNull: ['$itemName', ''] }, ''] },
              { $ne: ['$itemName', 'tracking-pixel'] },
              { $gt: [{ $ifNull: ['$metrics.impressions', 0] }, 0] }
            ]},
            1, 0
          ]
        }},
      }}
    ]).toArray();
    
    const hasDigitalPlacements = Object.keys(expectedByChannel).some(ch => digitalChannels.includes(ch) || ch === 'newsletter');
    const pxAgg = pixelHealthAgg[0] || { total: 0, badCount: 0, totalImpressions: 0, hasAssetEntries: 0 };
    
    let pixelHealth: { status: string; message: string; badEntryCount: number; totalAutomatedEntries: number; lastChecked: Date } | undefined;
    
    if (hasDigitalPlacements) {
      if (pxAgg.badCount > 0) {
        pixelHealth = {
          status: 'error',
          message: `${pxAgg.badCount} tracking ${pxAgg.badCount === 1 ? 'entry has' : 'entries have'} data quality issues and ${pxAgg.badCount === 1 ? 'is' : 'are'} excluded from totals.`,
          badEntryCount: pxAgg.badCount,
          totalAutomatedEntries: pxAgg.total,
          lastChecked: new Date(),
        };
      } else if (pxAgg.total === 0) {
        pixelHealth = {
          status: 'no_data',
          message: 'No tracking data received yet. Verify the tracking pixel is installed on your site.',
          badEntryCount: 0,
          totalAutomatedEntries: 0,
          lastChecked: new Date(),
        };
      } else if (pxAgg.hasAssetEntries === 0 && pxAgg.totalImpressions <= 10) {
        pixelHealth = {
          status: 'warning',
          message: 'Tracking pixel is active but ad impressions are very low. Verify your ad placements are rendering correctly.',
          badEntryCount: 0,
          totalAutomatedEntries: pxAgg.total,
          lastChecked: new Date(),
        };
      } else {
        pixelHealth = {
          status: 'healthy',
          message: 'Tracking is working correctly.',
          badEntryCount: 0,
          totalAutomatedEntries: pxAgg.total,
          lastChecked: new Date(),
        };
      }
    }
    
    // Build channel summaries - goal vs delivered for all channels
    const byChannel: Record<string, {
      goal: number;           // Expected delivery (impressions for digital, frequency for offline)
      delivered: number;      // Actual delivered
      deliveryPercent: number;
      goalType: 'impressions' | 'frequency';
      volumeLabel: string;
    }> = {};
    
    let totalReportsSubmitted = 0;
    let totalDelivered = 0;
    
    // Initialize all expected channels with their goals
    Object.entries(expectedByChannel).forEach(([channel, expected]) => {
      const isDigital = digitalChannels.includes(channel);
      const volumeLabel = isDigital ? 'Impressions' :
        (channel === 'newsletter' ? 'Sends' :
         channel === 'podcast' ? 'Episodes' : 
         channel === 'radio' ? 'Spots' : 
         channel === 'print' ? 'Insertions' : 'Units');
      
      byChannel[channel] = {
        goal: expected.goal,
        delivered: 0,
        deliveryPercent: 0,
        goalType: expected.goalType,
        volumeLabel
      };
    });
    
    // Process actual entries
    entriesByChannel.forEach((agg: any) => {
      const channel = agg._id?.toLowerCase() || 'other';
      const expected = expectedByChannel[channel];
      const isDigital = digitalChannels.includes(channel);
      
      // For digital: delivered = impressions
      // For offline: delivered = report count (each report = 1 episode/spot/insertion)
      let delivered = 0;
      let volumeLabel = 'Delivered';
      
      if (isDigital) {
        delivered = agg.impressions || 0;
        volumeLabel = 'Impressions';
      } else if (channel === 'newsletter') {
        delivered = newsletterSendCount;
        volumeLabel = 'Sends';
      } else if (channel === 'podcast') {
        delivered = agg.reportCount || 0;
        volumeLabel = 'Episodes';
      } else if (channel === 'radio') {
        delivered = agg.reportCount || 0;
        volumeLabel = 'Spots';
      } else if (channel === 'print') {
        delivered = agg.reportCount || 0;
        volumeLabel = 'Insertions';
      } else if (channel === 'social_media' || channel === 'social') {
        delivered = agg.reportCount || 0;
        volumeLabel = 'Posts';
      } else {
        delivered = agg.reportCount || 0;
        volumeLabel = 'Units';
      }
      
      totalReportsSubmitted += agg.reportCount || 0;
      totalDelivered += delivered;
      
      const goal = expected?.goal || 0;
      
      // Delivery percent (allow over 100% to show over-delivery)
      const deliveryPercent = goal > 0 
        ? Math.round((delivered / goal) * 100) 
        : 0;
      
      byChannel[channel] = {
        goal,
        delivered,
        deliveryPercent,
        goalType: expected?.goalType || (isDigital ? 'impressions' : 'frequency'),
        volumeLabel
      };
    });
    
    // Calculate overall percentages
    const rawReportsPercent = totalExpectedReports > 0 
      ? Math.round((totalReportsSubmitted / totalExpectedReports) * 100) 
      : 0;
    const reportsPercent = Math.min(rawReportsPercent, 100);
    
    const deliveryPercent = totalExpectedGoal > 0
      ? Math.round((totalDelivered / totalExpectedGoal) * 100)
      : 0;
    
    // Update order with enhanced delivery summary
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: {
          deliverySummary: {
            // Reports tracking (how many placements reported)
            totalExpectedReports,
            totalReportsSubmitted,
            reportsPercent,
            // Delivery tracking (actual volume delivered vs expected)
            totalExpectedGoal,
            totalDelivered,
            deliveryPercent,
            // Legacy fields for backward compatibility
            totalGoalValue: totalExpectedGoal,
            percentComplete: deliveryPercent, // Now based on actual delivery vs goal
            // Per-channel breakdown
            byChannel,
            // Pixel tracking health
            ...(pixelHealth ? { pixelHealth } : {}),
            lastUpdated: new Date()
          },
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating order delivery summary:', error);
  }
}

/**
 * Get the appropriate volume label for a channel
 */
function getVolumeLabel(channel: string): string {
  switch (channel.toLowerCase()) {
    case 'podcast': return 'Downloads';
    case 'radio': return 'Spots Aired';
    case 'print': return 'Circulation';
    case 'website':
    case 'newsletter':
    case 'streaming': return 'Impressions';
    case 'social_media':
    case 'social': return 'Engagements';
    default: return 'Delivered';
  }
}

export default router;
