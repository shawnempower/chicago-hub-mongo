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
    
    // Look up full publication documents for all publications in the breakdown
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const allPublicationIds = publicationBreakdown.map(pub => pub._id.publicationId).filter(Boolean);
    
    let publicationNamesMap: Record<number, string> = {};
    let publicationContextMap: Record<number, any> = {};
    
    if (allPublicationIds.length > 0) {
      const publications = await publicationsCollection
        .find({ publicationId: { $in: allPublicationIds } })
        .project({
          publicationId: 1,
          'basicInfo.publicationName': 1,
          'basicInfo.publicationType': 1,
          'basicInfo.contentType': 1,
          'basicInfo.websiteUrl': 1,
          'basicInfo.founded': 1,
          'basicInfo.geographicCoverage': 1,
          'basicInfo.primaryServiceArea': 1,
          'basicInfo.secondaryMarkets': 1,
          'basicInfo.serviceAreas': 1,
          'audienceDemographics': 1,
          'editorialInfo.contentFocus': 1,
          'editorialInfo.contentPillars': 1,
          'editorialInfo.specialSections': 1,
          'competitiveInfo.uniqueValueProposition': 1,
          'competitiveInfo.keyDifferentiators': 1,
          'awards': 1,
          'distributionChannels.website.metrics': 1,
          'distributionChannels.newsletters': 1,
          'distributionChannels.print': 1,
          'distributionChannels.podcasts': 1,
          'distributionChannels.radioStations': 1,
          'distributionChannels.socialMedia': 1,
          'distributionChannels.events': 1,
          'distributionChannels.streamingVideo': 1,
          'aiProfile': 1,
        })
        .toArray();
      
      for (const pub of publications) {
        const id = pub.publicationId;
        publicationNamesMap[id] = pub.basicInfo?.publicationName || pub.name;
        
        // Build channel-specific audience metrics from distribution channels
        const channelAudience: Record<string, any> = {};
        
        if (pub.distributionChannels?.website?.metrics) {
          channelAudience.website = {
            monthlyVisitors: pub.distributionChannels.website.metrics.monthlyVisitors,
            monthlyPageViews: pub.distributionChannels.website.metrics.monthlyPageViews,
            bounceRate: pub.distributionChannels.website.metrics.bounceRate,
            mobilePercentage: pub.distributionChannels.website.metrics.mobilePercentage,
          };
        }
        
        if (pub.distributionChannels?.newsletters?.length > 0) {
          channelAudience.newsletters = pub.distributionChannels.newsletters.map((nl: any) => ({
            name: nl.name,
            subscribers: nl.subscribers,
            openRate: nl.openRate,
            clickThroughRate: nl.clickThroughRate,
            frequency: nl.frequency,
          }));
        }
        
        if (pub.distributionChannels?.print?.length > 0) {
          channelAudience.print = pub.distributionChannels.print.map((p: any) => ({
            name: p.name,
            circulation: p.circulation,
            paidCirculation: p.paidCirculation,
            freeCirculation: p.freeCirculation,
            distributionArea: p.distributionArea,
            frequency: p.frequency,
          }));
        }
        
        if (pub.distributionChannels?.podcasts?.length > 0) {
          channelAudience.podcasts = pub.distributionChannels.podcasts.map((pc: any) => ({
            name: pc.name,
            averageDownloads: pc.averageDownloads,
            averageListeners: pc.averageListeners,
            episodeCount: pc.episodeCount,
            platforms: pc.platforms,
            frequency: pc.frequency,
          }));
        }
        
        if (pub.distributionChannels?.radioStations?.length > 0) {
          channelAudience.radio = pub.distributionChannels.radioStations.map((rs: any) => ({
            callSign: rs.callSign,
            frequency: rs.frequency,
            format: rs.format,
            coverageArea: rs.coverageArea,
            listeners: rs.listeners,
          }));
        }
        
        if (pub.distributionChannels?.socialMedia?.length > 0) {
          channelAudience.social = pub.distributionChannels.socialMedia.map((sm: any) => ({
            platform: sm.platform,
            handle: sm.handle,
            followers: sm.metrics?.followers,
            engagementRate: sm.metrics?.engagementRate,
            averageReach: sm.metrics?.averageReach,
          }));
        }
        
        if (pub.distributionChannels?.events?.length > 0) {
          channelAudience.events = pub.distributionChannels.events.map((ev: any) => ({
            name: ev.name,
            type: ev.type,
            averageAttendance: ev.averageAttendance,
            location: ev.location,
            frequency: ev.frequency,
          }));
        }
        
        publicationContextMap[id] = {
          // Identity
          publicationType: pub.basicInfo?.publicationType,
          contentType: pub.basicInfo?.contentType,
          websiteUrl: pub.basicInfo?.websiteUrl,
          founded: pub.basicInfo?.founded,
          // Geography
          geographicCoverage: pub.basicInfo?.geographicCoverage,
          primaryServiceArea: pub.basicInfo?.primaryServiceArea,
          secondaryMarkets: pub.basicInfo?.secondaryMarkets,
          // Audience demographics
          audienceDemographics: pub.audienceDemographics ? {
            totalAudience: pub.audienceDemographics.totalAudience,
            ageGroups: pub.audienceDemographics.ageGroups,
            gender: pub.audienceDemographics.gender,
            householdIncome: pub.audienceDemographics.householdIncome,
            education: pub.audienceDemographics.education,
            interests: pub.audienceDemographics.interests,
            targetMarkets: pub.audienceDemographics.targetMarkets,
          } : undefined,
          // Editorial
          editorialInfo: pub.editorialInfo ? {
            contentFocus: pub.editorialInfo.contentFocus,
            contentPillars: pub.editorialInfo.contentPillars,
            specialSections: pub.editorialInfo.specialSections,
          } : undefined,
          // Competitive
          competitiveInfo: pub.competitiveInfo ? {
            uniqueValueProposition: pub.competitiveInfo.uniqueValueProposition,
            keyDifferentiators: pub.competitiveInfo.keyDifferentiators,
          } : undefined,
          // Awards
          awards: pub.awards,
          // Channel-specific audience metrics
          channelAudience,
          // AI profile
          aiProfile: pub.aiProfile || undefined,
        };
      }
    }
    
    // Look up insertion orders for campaign activity context per publication
    const ioCollection = db.collection('publication_insertion_orders');
    let publicationOrderMap: Record<number, any> = {};
    
    if (allPublicationIds.length > 0) {
      const campaignObjectId = campaign._id?.toString() || '';
      const campaignIdString = campaign.campaignId || '';
      
      const orders = await ioCollection.find({
        $or: [
          { campaignObjectId: campaignObjectId },
          { campaignId: campaignIdString }
        ],
        publicationId: { $in: allPublicationIds },
        deletedAt: { $exists: false },
      }).project({
        publicationId: 1,
        status: 1,
        deliveryGoals: 1,
        deliverySummary: 1,
        assetStatus: 1,
        placementStatuses: 1,
        proofOfPerformanceComplete: 1,
        proofCount: 1,
        orderTotal: 1,
        'selectedInventory.publications': 1,
      }).toArray();
      
      for (const order of orders) {
        const pubId = order.publicationId;
        
        // Extract channel mix from the order's inventory items
        const inventoryItems = order.selectedInventory?.publications?.[0]?.inventoryItems || [];
        const channelMix = inventoryItems.map((item: any) => ({
          channel: item.channel,
          itemName: item.itemName,
          itemPath: item.itemPath,
          placementStatus: order.placementStatuses?.[item.itemPath],
        }));
        
        publicationOrderMap[pubId] = {
          orderStatus: order.status,
          deliveryGoals: order.deliveryGoals,
          deliverySummary: order.deliverySummary,
          assetStatus: order.assetStatus ? {
            totalPlacements: order.assetStatus.totalPlacements,
            placementsWithAssets: order.assetStatus.placementsWithAssets,
            allAssetsReady: order.assetStatus.allAssetsReady,
          } : undefined,
          proofStatus: {
            complete: order.proofOfPerformanceComplete || false,
            proofCount: order.proofCount || 0,
          },
          orderTotal: order.orderTotal,
          channelMix,
        };
      }
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
    
    // Calculate pacing if campaign has goals and valid timeline dates
    let pacing = null;
    if ((campaign.objectives?.budget?.totalBudget || campaign.selectedInventory) && 
        campaign.timeline?.startDate && campaign.timeline?.endDate) {
      const startDate = new Date(campaign.timeline.startDate);
      const endDate = new Date(campaign.timeline.endDate);
      const now = new Date();
      
      // Guard against invalid dates
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
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
    }
    
    res.json({
      campaignId: campaign.campaignId || campaignId,
      campaignName: campaign.basicInfo?.name,
      advertiserName: campaign.basicInfo?.advertiserName,
      status: campaign.status,
      dateRange: {
        start: campaign.timeline?.startDate,
        end: campaign.timeline?.endDate,
      },
      budget: campaign.objectives?.budget ? {
        totalBudget: campaign.objectives.budget.totalBudget,
        monthlyBudget: campaign.objectives.budget.monthlyBudget,
        currency: campaign.objectives.budget.currency || 'USD',
      } : undefined,
      pricing: campaign.pricing ? {
        total: campaign.pricing.total,
        monthlyTotal: campaign.pricing.monthlyTotal,
      } : undefined,
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
      byPublication: publicationBreakdown.map(pub => {
        const pubId = pub._id.publicationId;
        const context = publicationContextMap[pubId];
        const order = publicationOrderMap[pubId];
        
        return {
          // Core performance metrics
          publicationId: pubId,
          publicationName: pub._id.publicationName || publicationNamesMap[pubId] || `Publication ${pubId}`,
          entries: pub.entries,
          impressions: pub.impressions,
          clicks: pub.clicks,
          ctr: computeCTR(pub.clicks, pub.impressions),
          reach: pub.reach,
          units: pub.units,
          // Publication context (from publication document)
          context: context || undefined,
          // Campaign activity (from insertion order)
          activity: order || undefined,
        };
      }),
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
    const campaignCollection = db.collection(COLLECTIONS.CAMPAIGNS);
    
    // Resolve campaignId the same way as the summary endpoint
    let campaign = null;
    try {
      campaign = await campaignCollection.findOne({ _id: new ObjectId(campaignId) });
    } catch {
      campaign = await campaignCollection.findOne({ campaignId });
    }
    
    const resolvedCampaignId = campaign?.campaignId || campaignId;
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.$lte = new Date(dateTo as string);
    
    const match: any = { 
      campaignId: resolvedCampaignId, 
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
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
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
