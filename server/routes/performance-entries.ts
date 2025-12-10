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
    
    const entries = await collection
      .find({ orderId, deletedAt: { $exists: false } })
      .sort({ dateStart: -1, itemPath: 1 })
      .toArray();
    
    // Calculate summary
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
 */
async function updateOrderDeliverySummary(orderId: string): Promise<void> {
  try {
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    // Aggregate performance data for this order
    const aggregation = await perfCollection.aggregate([
      { $match: { orderId, deletedAt: { $exists: false } } },
      { $group: {
        _id: '$channel',
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        units: { $sum: { 
          $add: [
            { $ifNull: ['$metrics.insertions', 0] },
            { $ifNull: ['$metrics.spotsAired', 0] },
            { $ifNull: ['$metrics.posts', 0] },
            { $ifNull: ['$metrics.downloads', 0] }
          ]
        }},
        reach: { $sum: '$metrics.reach' }
      }}
    ]).toArray();
    
    // Get current order to check goals
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    if (!order) return;
    
    // Calculate totals
    const byChannel: Record<string, { goal: number; delivered: number; percent: number }> = {};
    let totalDelivered = 0;
    let totalGoal = 0;
    
    // Process delivery goals if they exist
    if (order.deliveryGoals) {
      Object.entries(order.deliveryGoals).forEach(([itemPath, goal]: [string, any]) => {
        totalGoal += goal.goalValue || 0;
      });
    }
    
    aggregation.forEach((agg: any) => {
      const channelDelivered = agg.impressions + agg.units;
      totalDelivered += channelDelivered;
      
      // Get channel goal from order if available
      const channelGoal = Object.values(order.deliveryGoals || {})
        .filter((g: any) => g.goalType === 'impressions' || g.goalType === 'units')
        .reduce((sum: number, g: any) => sum + (g.goalValue || 0), 0);
      
      byChannel[agg._id] = {
        goal: channelGoal,
        delivered: channelDelivered,
        percent: channelGoal > 0 ? Math.round((channelDelivered / channelGoal) * 100) : 0
      };
    });
    
    const percentComplete = totalGoal > 0 ? Math.round((totalDelivered / totalGoal) * 100) : 0;
    
    // Update order with delivery summary
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: {
          deliverySummary: {
            totalGoalValue: totalGoal,
            totalDelivered,
            percentComplete,
            byChannel,
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

export default router;
