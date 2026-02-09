/**
 * Reporting Routes
 * 
 * API endpoints for campaign performance reporting, daily aggregates, and pacing.
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authenticate';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { PerformanceEntry, PerformanceChannel } from '../../src/integrations/mongodb/performanceEntrySchema';
import { 
  DailyAggregate, 
  normalizeToDay, 
  getDateRange,
  calculatePacingStatus,
  computeCTR
} from '../../src/integrations/mongodb/dailyAggregateSchema';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/reporting/campaign/:campaignId/summary
 * Get performance summary for a campaign
 */
router.get('/campaign/:campaignId/summary', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const campaignCollection = db.collection(COLLECTIONS.CAMPAIGNS);
    
    // Get campaign info
    let campaign = null;
    try {
      campaign = await campaignCollection.findOne({ _id: new ObjectId(campaignId) });
    } catch {
      campaign = await campaignCollection.findOne({ campaignId });
    }
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Aggregate performance data
    const aggregation = await perfCollection.aggregate([
      { $match: { campaignId: campaign.campaignId || campaignId, deletedAt: { $exists: false } } },
      { $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalImpressions: { $sum: '$metrics.impressions' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalReach: { $sum: '$metrics.reach' },
        totalInsertions: { $sum: '$metrics.insertions' },
        totalSpotsAired: { $sum: '$metrics.spotsAired' },
        totalDownloads: { $sum: '$metrics.downloads' },
        totalPosts: { $sum: '$metrics.posts' },
        uniquePublications: { $addToSet: '$publicationId' },
        earliestDate: { $min: '$dateStart' },
        latestDate: { $max: '$dateStart' },
      }}
    ]).toArray();
    
    // Get by-channel breakdown
    const channelBreakdown = await perfCollection.aggregate([
      { $match: { campaignId: campaign.campaignId || campaignId, deletedAt: { $exists: false } } },
      { $group: {
        _id: '$channel',
        entries: { $sum: 1 },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}}
      }}
    ]).toArray();
    
    // Get by-publication breakdown
    const publicationBreakdown = await perfCollection.aggregate([
      { $match: { campaignId: campaign.campaignId || campaignId, deletedAt: { $exists: false } } },
      { $group: {
        _id: { publicationId: '$publicationId', publicationName: '$publicationName' },
        entries: { $sum: 1 },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}}
      }},
      { $sort: { impressions: -1 } }
    ]).toArray();
    
    // Look up publication names for entries where publicationName is null
    const publicationsCollection = db.collection(COLLECTIONS.HUB_PUBLICATIONS);
    const publicationIdsToLookup = publicationBreakdown
      .filter(pub => !pub._id.publicationName && pub._id.publicationId)
      .map(pub => pub._id.publicationId);
    
    let publicationNamesMap: Record<number, string> = {};
    if (publicationIdsToLookup.length > 0) {
      const publications = await publicationsCollection
        .find({ publicationId: { $in: publicationIdsToLookup } })
        .project({ publicationId: 1, name: 1 })
        .toArray();
      
      publicationNamesMap = publications.reduce((acc, pub) => {
        acc[pub.publicationId] = pub.name;
        return acc;
      }, {} as Record<number, string>);
    }
    
    const totals = aggregation[0] || {
      totalEntries: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalReach: 0,
      totalInsertions: 0,
      totalSpotsAired: 0,
      totalDownloads: 0,
      totalPosts: 0,
      uniquePublications: [],
      earliestDate: null,
      latestDate: null,
    };
    
    // Filter selectedInventory by active orders to get accurate goals
    // This ensures rescinded/rejected placements don't count toward delivery goals
    try {
      const campaignObjectId = campaign._id?.toString() || '';
      const campaignIdString = campaign.campaignId || '';
      
      // Only include sent orders (not drafts) for reporting/delivery progress
      // Draft orders haven't been sent to publications yet
      const activeOrders = await db.collection('publication_insertion_orders').find({
        $or: [
          { campaignObjectId: campaignObjectId },
          { campaignId: campaignIdString }
        ],
        deletedAt: { $exists: false },
        status: { $ne: 'draft' } // Exclude draft orders from reporting
      }).toArray();
      
      if (activeOrders.length > 0) {
        const validStatuses = ['pending', 'accepted', 'in_production', 'delivered'];
        const filteredPublications: any[] = [];
        
        for (const order of activeOrders) {
          const pubId = order.publicationId;
          const placementStatuses = order.placementStatuses || {};
          
          const validPlacements = new Set<string>();
          for (const [placementPath, status] of Object.entries(placementStatuses)) {
            if (validStatuses.includes(status as string)) {
              validPlacements.add(placementPath);
            }
          }
          
          if (validPlacements.size === 0) continue;
          
          // Use order.selectedInventory as single source of truth
          const pubData = order.selectedInventory?.publications?.[0];
          if (!pubData) continue;
          
          const filteredItems = (pubData.inventoryItems || []).filter((item: any) => {
            return validPlacements.has(item.itemPath || '') || 
                   validPlacements.has(item.sourcePath || '');
          });
          
          if (filteredItems.length > 0) {
            filteredPublications.push({
              ...pubData,
              inventoryItems: filteredItems
            });
          }
        }
        
        campaign.selectedInventory = {
          ...campaign.selectedInventory,
          publications: filteredPublications
        };
      }
    } catch (filterError) {
      console.error('Error filtering selectedInventory for reporting:', filterError);
    }
    
    // Calculate delivery progress by channel from selectedInventory
    const digitalChannels = ['website', 'newsletter', 'streaming'];
    const deliveryProgress: Record<string, {
      goal: number;
      delivered: number;
      deliveryPercent: number;
      goalType: 'impressions' | 'frequency';
      volumeLabel: string;
    }> = {};
    
    let totalExpectedGoal = 0;
    let totalExpectedReports = 0;
    
    // Build expected goals from selectedInventory
    if (campaign.selectedInventory?.publications) {
      for (const pub of campaign.selectedInventory.publications) {
        for (const item of (pub.inventoryItems || [])) {
          if (item.isExcluded) continue;
          
          const channel = (item.channel || 'other').toLowerCase();
          const isDigital = digitalChannels.includes(channel);
          
          if (!deliveryProgress[channel]) {
            const volumeLabel = isDigital ? 'Impressions' : 
              (channel === 'podcast' ? 'Episodes' : 
               channel === 'radio' ? 'Spots' : 
               channel === 'print' ? 'Insertions' : 'Units');
            
            deliveryProgress[channel] = {
              goal: 0,
              delivered: 0,
              deliveryPercent: 0,
              goalType: isDigital ? 'impressions' : 'frequency',
              volumeLabel
            };
          }
          
          totalExpectedReports++;
          
          if (isDigital) {
            const impressions = item.performanceMetrics?.impressionsPerMonth || 0;
            deliveryProgress[channel].goal += impressions;
            totalExpectedGoal += impressions;
          } else {
            const frequency = item.currentFrequency || item.quantity || 1;
            deliveryProgress[channel].goal += frequency;
            totalExpectedGoal += frequency;
          }
        }
      }
    }
    
    // Fill in delivered amounts from channel breakdown
    for (const ch of channelBreakdown) {
      const channel = ch._id?.toLowerCase() || 'other';
      const isDigital = digitalChannels.includes(channel);
      
      if (deliveryProgress[channel]) {
        // Digital: delivered = impressions, Offline: delivered = report count
        deliveryProgress[channel].delivered = isDigital ? (ch.impressions || 0) : (ch.entries || 0);
        
        const goal = deliveryProgress[channel].goal;
        const delivered = deliveryProgress[channel].delivered;
        deliveryProgress[channel].deliveryPercent = goal > 0 
          ? Math.round((delivered / goal) * 100) 
          : 0;
      }
    }
    
    // Calculate overall delivery % as average of channel percentages
    const channelPercents = Object.values(deliveryProgress).map(ch => ch.deliveryPercent);
    const overallDeliveryPercent = channelPercents.length > 0
      ? Math.round(channelPercents.reduce((sum, p) => sum + p, 0) / channelPercents.length)
      : 0;
    
    // Calculate pacing if campaign has goals
    let pacing = null;
    if (campaign.objectives?.budget?.totalBudget || campaign.selectedInventory) {
      const startDate = new Date(campaign.timeline?.startDate);
      const endDate = new Date(campaign.timeline?.endDate);
      const now = new Date();
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Use our calculated delivery percent
      pacing = calculatePacingStatus(overallDeliveryPercent, 100, Math.min(daysPassed, totalDays), totalDays);
      pacing = {
        ...pacing,
        totalDays,
        daysPassed: Math.min(daysPassed, totalDays),
        daysRemaining: Math.max(totalDays - daysPassed, 0),
      };
    }
    
    res.json({
      campaignId: campaign.campaignId || campaignId,
      campaignName: campaign.basicInfo?.name,
      dateRange: {
        start: campaign.timeline?.startDate,
        end: campaign.timeline?.endDate,
      },
      performanceRange: {
        earliest: totals.earliestDate,
        latest: totals.latestDate,
      },
      totals: {
        entries: totals.totalEntries,
        impressions: totals.totalImpressions,
        clicks: totals.totalClicks,
        ctr: computeCTR(totals.totalClicks, totals.totalImpressions),
        reach: totals.totalReach,
        insertions: totals.totalInsertions,
        spotsAired: totals.totalSpotsAired,
        downloads: totals.totalDownloads,
        posts: totals.totalPosts,
        publications: totals.uniquePublications?.length || 0,
      },
      // Delivery progress by channel (goal vs delivered)
      deliveryProgress: {
        overallPercent: overallDeliveryPercent,
        totalExpectedReports,
        totalReportsSubmitted: totals.totalEntries,
        byChannel: deliveryProgress,
      },
      byChannel: channelBreakdown.map(ch => ({
        channel: ch._id,
        entries: ch.entries,
        impressions: ch.impressions,
        clicks: ch.clicks,
        ctr: computeCTR(ch.clicks, ch.impressions),
        reach: ch.reach,
        units: ch.units,
      })),
      byPublication: publicationBreakdown.map(pub => ({
        publicationId: pub._id.publicationId,
        publicationName: pub._id.publicationName || publicationNamesMap[pub._id.publicationId] || `Publication ${pub._id.publicationId}`,
        entries: pub.entries,
        impressions: pub.impressions,
        clicks: pub.clicks,
        ctr: computeCTR(pub.clicks, pub.impressions),
        reach: pub.reach,
        units: pub.units,
      })),
      pacing,
    });
  } catch (error) {
    console.error('Error fetching campaign summary:', error);
    res.status(500).json({ error: 'Failed to fetch campaign summary' });
  }
});

/**
 * GET /api/reporting/campaign/:campaignId/daily
 * Get daily performance data for a campaign (for charts)
 */
router.get('/campaign/:campaignId/daily', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.$lte = new Date(dateTo as string);
    
    const match: any = { 
      campaignId, 
      deletedAt: { $exists: false } 
    };
    if (Object.keys(dateFilter).length > 0) {
      match.dateStart = dateFilter;
    }
    
    // Aggregate by day
    const dailyData = await perfCollection.aggregate([
      { $match: match },
      { $group: {
        _id: { 
          $dateToString: { format: '%Y-%m-%d', date: '$dateStart' }
        },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}},
        entries: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    res.json({ 
      campaignId,
      daily: dailyData.map(d => ({
        date: d._id,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: computeCTR(d.clicks, d.impressions),
        reach: d.reach,
        units: d.units,
        entries: d.entries,
      }))
    });
  } catch (error) {
    console.error('Error fetching daily data:', error);
    res.status(500).json({ error: 'Failed to fetch daily data' });
  }
});

/**
 * GET /api/reporting/order/:orderId/summary
 * Get performance summary for a specific order
 */
router.get('/order/:orderId/summary', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    // Get order info
    let order = null;
    try {
      order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    } catch {
      order = await ordersCollection.findOne({ orderId });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Aggregate performance data
    const aggregation = await perfCollection.aggregate([
      { $match: { orderId: order._id?.toString() || orderId, deletedAt: { $exists: false } } },
      { $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalImpressions: { $sum: '$metrics.impressions' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalReach: { $sum: '$metrics.reach' },
        earliestDate: { $min: '$dateStart' },
        latestDate: { $max: '$dateStart' },
      }}
    ]).toArray();
    
    // Get by-placement breakdown
    const placementBreakdown = await perfCollection.aggregate([
      { $match: { orderId: order._id?.toString() || orderId, deletedAt: { $exists: false } } },
      { $group: {
        _id: { itemPath: '$itemPath', itemName: '$itemName', channel: '$channel' },
        entries: { $sum: 1 },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}}
      }},
      { $sort: { '_id.channel': 1, '_id.itemName': 1 } }
    ]).toArray();
    
    const totals = aggregation[0] || {
      totalEntries: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalReach: 0,
      earliestDate: null,
      latestDate: null,
    };
    
    // Calculate delivery progress against goals
    let deliveryProgress = null;
    if (order.deliveryGoals) {
      deliveryProgress = {};
      const goals = order.deliveryGoals as Record<string, any>;
      
      Object.entries(goals).forEach(([itemPath, goal]) => {
        const placement = placementBreakdown.find(p => p._id.itemPath === itemPath);
        const delivered = placement 
          ? (goal.goalType === 'impressions' ? placement.impressions : placement.units)
          : 0;
        
        deliveryProgress[itemPath] = {
          goal: goal.goalValue,
          goalType: goal.goalType,
          delivered,
          percentComplete: goal.goalValue > 0 ? Math.round((delivered / goal.goalValue) * 100) : 0,
        };
      });
    }
    
    res.json({
      orderId: order._id?.toString() || orderId,
      publicationId: order.publicationId,
      publicationName: order.publicationName,
      campaignId: order.campaignId,
      campaignName: order.campaignName,
      performanceRange: {
        earliest: totals.earliestDate,
        latest: totals.latestDate,
      },
      totals: {
        entries: totals.totalEntries,
        impressions: totals.totalImpressions,
        clicks: totals.totalClicks,
        ctr: computeCTR(totals.totalClicks, totals.totalImpressions),
        reach: totals.totalReach,
      },
      byPlacement: placementBreakdown.map(p => ({
        itemPath: p._id.itemPath,
        itemName: p._id.itemName,
        channel: p._id.channel,
        entries: p.entries,
        impressions: p.impressions,
        clicks: p.clicks,
        ctr: computeCTR(p.clicks, p.impressions),
        reach: p.reach,
        units: p.units,
        deliveryProgress: deliveryProgress?.[p._id.itemPath],
      })),
      deliverySummary: order.deliverySummary,
    });
  } catch (error) {
    console.error('Error fetching order summary:', error);
    res.status(500).json({ error: 'Failed to fetch order summary' });
  }
});

/**
 * GET /api/reporting/publication/:publicationId/summary
 * Get performance summary for a publication across all campaigns
 */
router.get('/publication/:publicationId/summary', async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    
    // Build match
    const match: any = { 
      publicationId: parseInt(publicationId),
      deletedAt: { $exists: false }
    };
    
    if (dateFrom || dateTo) {
      match.dateStart = {};
      if (dateFrom) match.dateStart.$gte = new Date(dateFrom as string);
      if (dateTo) match.dateStart.$lte = new Date(dateTo as string);
    }
    
    // Aggregate by campaign
    const byCampaign = await perfCollection.aggregate([
      { $match: match },
      { $group: {
        _id: '$campaignId',
        entries: { $sum: 1 },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}},
        earliestDate: { $min: '$dateStart' },
        latestDate: { $max: '$dateStart' }
      }},
      { $sort: { latestDate: -1 } }
    ]).toArray();
    
    // Aggregate by channel
    const byChannel = await perfCollection.aggregate([
      { $match: match },
      { $group: {
        _id: '$channel',
        entries: { $sum: 1 },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}}
      }}
    ]).toArray();
    
    // Calculate totals
    const totals = {
      campaigns: byCampaign.length,
      entries: byCampaign.reduce((sum, c) => sum + c.entries, 0),
      impressions: byCampaign.reduce((sum, c) => sum + c.impressions, 0),
      clicks: byCampaign.reduce((sum, c) => sum + c.clicks, 0),
      reach: byCampaign.reduce((sum, c) => sum + c.reach, 0),
      units: byCampaign.reduce((sum, c) => sum + c.units, 0),
    };
    
    res.json({
      publicationId: parseInt(publicationId),
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null,
      },
      totals: {
        ...totals,
        ctr: computeCTR(totals.clicks, totals.impressions),
      },
      byCampaign: byCampaign.map(c => ({
        campaignId: c._id,
        entries: c.entries,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: computeCTR(c.clicks, c.impressions),
        reach: c.reach,
        units: c.units,
        dateRange: {
          earliest: c.earliestDate,
          latest: c.latestDate,
        }
      })),
      byChannel: byChannel.map(ch => ({
        channel: ch._id,
        entries: ch.entries,
        impressions: ch.impressions,
        clicks: ch.clicks,
        ctr: computeCTR(ch.clicks, ch.impressions),
        reach: ch.reach,
        units: ch.units,
      })),
    });
  } catch (error) {
    console.error('Error fetching publication summary:', error);
    res.status(500).json({ error: 'Failed to fetch publication summary' });
  }
});

/**
 * POST /api/reporting/compute-aggregates
 * Compute/recompute daily aggregates for a date range (admin)
 */
router.post('/compute-aggregates', async (req: any, res: Response) => {
  try {
    const { dateFrom, dateTo, campaignId } = req.body;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const aggregatesCollection = db.collection<DailyAggregate>(COLLECTIONS.DAILY_AGGREGATES);
    
    // Build match for source data
    const match: any = {
      dateStart: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      },
      deletedAt: { $exists: false }
    };
    
    if (campaignId) {
      match.campaignId = campaignId;
    }
    
    // Aggregate by day/campaign/publication/channel
    const aggregation = await perfCollection.aggregate([
      { $match: match },
      { $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$dateStart' } },
          campaignId: '$campaignId',
          publicationId: '$publicationId',
          channel: '$channel',
        },
        publicationName: { $first: '$publicationName' },
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        reach: { $sum: '$metrics.reach' },
        units: { $sum: { $add: [
          { $ifNull: ['$metrics.insertions', 0] },
          { $ifNull: ['$metrics.spotsAired', 0] },
          { $ifNull: ['$metrics.downloads', 0] },
          { $ifNull: ['$metrics.posts', 0] }
        ]}},
        entryCount: { $sum: 1 }
      }}
    ]).toArray();
    
    // Look up publication names for aggregates where publicationName is null
    const publicationsCollection = db.collection(COLLECTIONS.HUB_PUBLICATIONS);
    const publicationIdsToLookup = aggregation
      .filter(agg => !agg.publicationName && agg._id.publicationId)
      .map(agg => agg._id.publicationId);
    
    let publicationNamesMap: Record<number, string> = {};
    if (publicationIdsToLookup.length > 0) {
      const publications = await publicationsCollection
        .find({ publicationId: { $in: publicationIdsToLookup } })
        .project({ publicationId: 1, name: 1 })
        .toArray();
      
      publicationNamesMap = publications.reduce((acc, pub) => {
        acc[pub.publicationId] = pub.name;
        return acc;
      }, {} as Record<number, string>);
    }
    
    // Upsert aggregates
    const now = new Date();
    let updated = 0;
    
    for (const agg of aggregation) {
      const pubName = agg.publicationName || publicationNamesMap[agg._id.publicationId] || null;
      
      await aggregatesCollection.updateOne(
        {
          date: new Date(agg._id.date),
          campaignId: agg._id.campaignId,
          publicationId: agg._id.publicationId,
          channel: agg._id.channel,
        },
        {
          $set: {
            publicationName: pubName,
            impressions: agg.impressions || 0,
            clicks: agg.clicks || 0,
            unitsDelivered: agg.units || 0,
            reach: agg.reach || 0,
            ctr: computeCTR(agg.clicks || 0, agg.impressions || 0),
            computedAt: now,
            entryCount: agg.entryCount,
          }
        },
        { upsert: true }
      );
      updated++;
    }
    
    res.json({ 
      success: true, 
      aggregatesComputed: updated,
      dateRange: { from: dateFrom, to: dateTo }
    });
  } catch (error) {
    console.error('Error computing aggregates:', error);
    res.status(500).json({ error: 'Failed to compute aggregates' });
  }
});

/**
 * GET /api/reporting/daily-aggregates
 * Get daily aggregates with filters
 */
router.get('/daily-aggregates', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId, channel, dateFrom, dateTo, limit = 100 } = req.query;
    
    const db = getDatabase();
    const collection = db.collection<DailyAggregate>(COLLECTIONS.DAILY_AGGREGATES);
    
    // Build query
    const query: any = { deletedAt: { $exists: false } };
    
    if (campaignId) query.campaignId = campaignId;
    if (publicationId) query.publicationId = parseInt(publicationId as string);
    if (channel) query.channel = channel;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom as string);
      if (dateTo) query.date.$lte = new Date(dateTo as string);
    }
    
    const aggregates = await collection
      .find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit as string))
      .toArray();
    
    res.json({ aggregates, total: aggregates.length });
  } catch (error) {
    console.error('Error fetching daily aggregates:', error);
    res.status(500).json({ error: 'Failed to fetch daily aggregates' });
  }
});

export default router;
