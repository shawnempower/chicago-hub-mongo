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
import { countNewsletterSends } from '../newsletterSendDetection';

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
    
    // Only count valid entries in aggregations
    const validEntryMatch = {
      campaignId: campaign.campaignId || campaignId,
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
      $or: [
        { source: { $ne: 'automated' } },
        { itemName: { $nin: [null, '', 'tracking-pixel'] } },
      ]
    };
    
    // Aggregate performance data
    const aggregation = await perfCollection.aggregate([
      { $match: validEntryMatch },
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
      { $match: validEntryMatch },
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
      { $match: validEntryMatch },
      { $group: {
        _id: '$publicationId',
        publicationName: { $first: '$publicationName' },
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
    const allPublicationIds = publicationBreakdown.map(pub => pub._id).filter(Boolean);
    
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
      
      // Realtime per-publication-per-channel delivery aggregation
      const digitalChannelsForPub = ['website', 'streaming'];
      const pubDeliveryFilter = {
        campaignId: campaign.campaignId || campaignId,
        publicationId: { $in: allPublicationIds },
        deletedAt: { $exists: false },
        validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
      };
      
      const pubChannelDelivery = await perfCollection.aggregate([
        { $match: pubDeliveryFilter },
        { $group: {
          _id: { publicationId: '$publicationId', channel: { $toLower: { $ifNull: ['$channel', 'other'] } } },
          impressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
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
        }}
      ]).toArray();
      
      // Newsletter sends per publication: get distinct dates per (pubId, itemPath),
      // then cluster into send bursts (gap > 2 days = new send)
      const pubNlDatesAgg = await perfCollection.aggregate([
        { $match: { ...pubDeliveryFilter, channel: { $regex: /^newsletter$/i } } },
        { $group: {
          _id: { publicationId: '$publicationId', itemPath: '$itemPath' },
          distinctDates: { $addToSet: {
            $dateToString: { format: '%Y-%m-%d', date: '$dateStart' }
          }}
        }}
      ]).toArray();

      const pubNewsletterSendMap = new Map<number, number>();
      const byPub = new Map<number, Array<{ _id: string; distinctDates: string[] }>>();
      for (const row of pubNlDatesAgg) {
        const pid = row._id.publicationId;
        if (!byPub.has(pid)) byPub.set(pid, []);
        byPub.get(pid)!.push({ _id: row._id.itemPath, distinctDates: row.distinctDates });
      }
      for (const [pid, items] of byPub) {
        pubNewsletterSendMap.set(pid, countNewsletterSends(items));
      }
      
      // Build lookup: pubId -> channel -> { impressions, reportCount }
      const pubDeliveryMap: Record<number, Record<string, { impressions: number; reportCount: number }>> = {};
      for (const entry of pubChannelDelivery) {
        const pubId = entry._id.publicationId;
        const channel = entry._id.channel;
        if (!pubDeliveryMap[pubId]) pubDeliveryMap[pubId] = {};
        pubDeliveryMap[pubId][channel] = {
          impressions: entry.impressions || 0,
          reportCount: entry.reportCount || 0,
        };
      }
      
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
        
        // Compute deliverySummary in realtime from inventory goals + performance entries
        const deliveryByChannel = pubDeliveryMap[pubId] || {};
        let totalGoalValue = 0;
        let totalDelivered = 0;
        const byChannel: Record<string, { goal: number; delivered: number; percent: number }> = {};
        const pubPlacementStatuses = order.placementStatuses || {};
        const validPubPlacementStatuses = ['pending', 'accepted', 'in_production', 'delivered'];
        
        for (const item of inventoryItems) {
          if (item.isExcluded) continue;
          const itemStatus = pubPlacementStatuses[item.itemPath] || pubPlacementStatuses[item.sourcePath];
          if (itemStatus && !validPubPlacementStatuses.includes(itemStatus)) continue;
          const channel = (item.channel || 'other').toLowerCase();
          const isDigital = digitalChannelsForPub.includes(channel);
          
          if (!byChannel[channel]) {
            byChannel[channel] = { goal: 0, delivered: 0, percent: 0 };
          }
          
          const placementGoal = order.deliveryGoals?.[item.itemPath] || order.deliveryGoals?.[item.sourcePath];
          const goalValue = placementGoal?.goalValue || 0;
          byChannel[channel].goal += goalValue;
          totalGoalValue += goalValue;
        }
        
        // Fill in delivered amounts from realtime aggregation
        for (const [channel, data] of Object.entries(byChannel)) {
          const entry = deliveryByChannel[channel];
          if (entry) {
            const isDigital = digitalChannelsForPub.includes(channel);
            if (isDigital) {
              data.delivered = entry.impressions;
            } else if (channel === 'newsletter') {
              data.delivered = pubNewsletterSendMap.get(pubId) || 0;
            } else {
              data.delivered = entry.reportCount;
            }
            totalDelivered += data.delivered;
          }
          data.percent = data.goal > 0 ? Math.round((data.delivered / data.goal) * 100) : 0;
        }
        
        // Include channels present in performance data but not in inventory
        for (const [channel, entry] of Object.entries(deliveryByChannel)) {
          if (!byChannel[channel]) {
            const isDigital = digitalChannelsForPub.includes(channel);
            let delivered: number;
            if (isDigital) {
              delivered = entry.impressions;
            } else if (channel === 'newsletter') {
              delivered = pubNewsletterSendMap.get(pubId) || 0;
            } else {
              delivered = entry.reportCount;
            }
            byChannel[channel] = { goal: 0, delivered, percent: 0 };
            totalDelivered += delivered;
          }
        }
        
        const percentComplete = totalGoalValue > 0
          ? Math.round((totalDelivered / totalGoalValue) * 100)
          : 0;
        
        publicationOrderMap[pubId] = {
          orderStatus: order.status,
          deliveryGoals: order.deliveryGoals,
          deliverySummary: {
            totalGoalValue,
            totalDelivered,
            percentComplete,
            byChannel,
          },
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
    // Combined delivery goals map from all orders, used later for goal lookups
    const campaignDeliveryGoals: Record<string, any> = {};
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
          
          // Merge this order's delivery goals into the campaign-wide map
          if (order.deliveryGoals) {
            Object.assign(campaignDeliveryGoals, order.deliveryGoals);
          }
          
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
    const digitalChannels = ['website', 'streaming'];
    const deliveryProgress: Record<string, {
      goal: number;
      delivered: number;
      deliveryPercent: number;
      goalType: 'impressions' | 'frequency';
      volumeLabel: string;
    }> = {};
    
    let totalExpectedGoal = 0;
    let totalExpectedReports = 0;
    
    const getVolumeLabelCampaign = (channel: string, isDigital: boolean) =>
      isDigital ? 'Impressions' :
      channel === 'newsletter' ? 'Sends' :
      channel === 'podcast' ? 'Episodes' :
      channel === 'radio' ? 'Spots' :
      channel === 'print' ? 'Insertions' : 'Units';
    
    // Build expected goals from selectedInventory
    if (campaign.selectedInventory?.publications) {
      for (const pub of campaign.selectedInventory.publications) {
        for (const item of (pub.inventoryItems || [])) {
          if (item.isExcluded) continue;
          
          const channel = (item.channel || 'other').toLowerCase();
          const isDigital = digitalChannels.includes(channel);
          
          if (!deliveryProgress[channel]) {
            deliveryProgress[channel] = {
              goal: 0,
              delivered: 0,
              deliveryPercent: 0,
              goalType: isDigital ? 'impressions' : 'frequency',
              volumeLabel: getVolumeLabelCampaign(channel, isDigital)
            };
          }
          
          totalExpectedReports++;
          
          const placementGoal = campaignDeliveryGoals[item.itemPath] || campaignDeliveryGoals[item.sourcePath];
          const goalValue = placementGoal?.goalValue || 0;
          deliveryProgress[channel].goal += goalValue;
          totalExpectedGoal += goalValue;
        }
      }
    }
    
    // Relaxed delivery aggregation by channel (includes all valid automated entries
    // for accurate digital impression counts, with conditional report count for offline)
    const campaignDeliveryFilter = {
      campaignId: campaign.campaignId || campaignId,
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
    };
    
    const campaignChannelDelivery = await perfCollection.aggregate([
      { $match: campaignDeliveryFilter },
      { $group: {
        _id: { $toLower: { $ifNull: ['$channel', 'other'] } },
        impressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
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
      }}
    ]).toArray();
    
    // Newsletter sends: get distinct dates per itemPath, then cluster into
    // send bursts (gap > 2 days = new send)
    const campaignNlDatesAgg = await perfCollection.aggregate([
      { $match: { ...campaignDeliveryFilter, channel: { $regex: /^newsletter$/i } } },
      { $group: {
        _id: '$itemPath',
        distinctDates: { $addToSet: {
          $dateToString: { format: '%Y-%m-%d', date: '$dateStart' }
        }}
      }}
    ]).toArray();
    const campaignNewsletterSendCount = countNewsletterSends(campaignNlDatesAgg);
    
    // Fill in delivered amounts from relaxed delivery aggregation
    for (const ch of campaignChannelDelivery) {
      const channel = ch._id || 'other';
      const isDigital = digitalChannels.includes(channel);
      const isNewsletter = channel === 'newsletter';
      
      if (deliveryProgress[channel]) {
        if (isDigital) {
          deliveryProgress[channel].delivered = ch.impressions || 0;
        } else if (isNewsletter) {
          deliveryProgress[channel].delivered = campaignNewsletterSendCount;
        } else {
          deliveryProgress[channel].delivered = ch.reportCount || 0;
        }
        
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
        const pubId = pub._id;
        const context = publicationContextMap[pubId];
        const order = publicationOrderMap[pubId];
        
        return {
          // Core performance metrics
          publicationId: pubId,
          publicationName: pub.publicationName || publicationNamesMap[pubId] || `Publication ${pubId}`,
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
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
      $or: [
        { source: { $ne: 'automated' } },
        { itemName: { $nin: [null, '', 'tracking-pixel'] } },
      ]
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
 * GET /api/reporting/order/:orderId/daily
 * Get daily performance time-series data for a specific order
 */
router.get('/order/:orderId/daily', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    // Resolve orderId
    let order = null;
    try {
      order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    } catch {
      order = await ordersCollection.findOne({ orderId });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const resolvedOrderId = order._id?.toString() || orderId;
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.$lte = new Date(dateTo as string);
    
    const match: any = { 
      orderId: resolvedOrderId, 
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
      $or: [
        { source: { $ne: 'automated' } },
        { itemName: { $nin: [null, '', 'tracking-pixel'] } },
      ]
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
      orderId: resolvedOrderId,
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
    console.error('Error fetching order daily data:', error);
    res.status(500).json({ error: 'Failed to fetch order daily data' });
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
    
    const resolvedOrderId = order._id?.toString() || orderId;
    const digitalChannels = ['website', 'streaming'];

    // Relaxed filter for delivery metrics (includes bare automated entries for impressions)
    const deliveryMatch = {
      orderId: resolvedOrderId,
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic', ''] },
    };

    // Strict filter for report/placement counting (excludes bare automated entries)
    const reportMatch = {
      ...deliveryMatch,
      $or: [
        { source: { $ne: 'automated' } },
        { itemName: { $nin: [null, '', 'tracking-pixel'] } },
      ]
    };

    // Totals from strict filter (for display stats)
    const aggregation = await perfCollection.aggregate([
      { $match: reportMatch },
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

    // By-placement breakdown (strict filter)
    const placementBreakdown = await perfCollection.aggregate([
      { $match: reportMatch },
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

    // By-channel delivery (relaxed filter, includes all valid automated entries)
    const channelDelivery = await perfCollection.aggregate([
      { $match: deliveryMatch },
      { $group: {
        _id: { $toLower: { $ifNull: ['$channel', 'other'] } },
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
      }}
    ]).toArray();

    const channelDeliveryMap = new Map(channelDelivery.map((c: any) => [c._id, c]));

    const totals = aggregation[0] || {
      totalEntries: 0, totalImpressions: 0, totalClicks: 0,
      totalReach: 0, earliestDate: null, latestDate: null,
    };

    // --- Compute fresh deliverySummary from campaign inventory + entries ---
    const campaignsCollection = db.collection(COLLECTIONS.CAMPAIGNS);
    const campaign = await campaignsCollection.findOne(
      { campaignId: order.campaignId },
      { projection: { campaignId: 1, selectedInventory: 1 } }
    );
    const publication = campaign?.selectedInventory?.publications?.find(
      (p: any) => p.publicationId === order.publicationId
    );

    let totalExpectedReports = 0;
    let totalReportsSubmitted = 0;
    let totalExpectedGoal = 0;
    let totalDelivered = 0;
    const byChannel: Record<string, {
      goal: number; delivered: number; deliveryPercent: number;
      goalType: string; volumeLabel: string;
    }> = {};

    const getVolumeLabel = (channel: string, isDigital: boolean) =>
      isDigital ? 'Impressions' :
      channel === 'newsletter' ? 'Sends' :
      channel === 'podcast' ? 'Episodes' :
      channel === 'radio' ? 'Spots' :
      channel === 'print' ? 'Insertions' : 'Units';

    // Newsletter sends: get distinct dates per itemPath, then cluster into
    // send bursts (gap > 2 days = new send)
    const orderNlDatesAgg = await perfCollection.aggregate([
      { $match: { ...deliveryMatch, channel: { $regex: /^newsletter$/i } } },
      { $group: {
        _id: '$itemPath',
        distinctDates: { $addToSet: {
          $dateToString: { format: '%Y-%m-%d', date: '$dateStart' }
        }}
      }}
    ]).toArray();
    const orderNewsletterSendCount = countNewsletterSends(orderNlDatesAgg);

    // Build goals from inventory items, skipping rejected/rescinded placements
    const placementStatuses = order.placementStatuses || {};
    const validPlacementStatuses = ['pending', 'accepted', 'in_production', 'delivered'];

    if (publication?.inventoryItems) {
      for (const item of publication.inventoryItems) {
        if (item.isExcluded) continue;
        const itemStatus = placementStatuses[item.itemPath] || placementStatuses[item.sourcePath];
        if (itemStatus && !validPlacementStatuses.includes(itemStatus)) continue;
        const channel = (item.channel || 'other').toLowerCase();
        const isDigital = digitalChannels.includes(channel);

        if (!byChannel[channel]) {
          byChannel[channel] = {
            goal: 0, delivered: 0, deliveryPercent: 0,
            goalType: isDigital ? 'impressions' : 'frequency',
            volumeLabel: getVolumeLabel(channel, isDigital)
          };
        }

        totalExpectedReports++;

        const placementGoal = order.deliveryGoals?.[item.itemPath] || order.deliveryGoals?.[item.sourcePath];
        const goalValue = placementGoal?.goalValue || 0;
        byChannel[channel].goal += goalValue;
        totalExpectedGoal += goalValue;
      }
    }

    // Fill in delivered amounts from channel delivery aggregation
    for (const [channel, data] of Object.entries(byChannel)) {
      const entry = channelDeliveryMap.get(channel);
      if (entry) {
        const isDigital = digitalChannels.includes(channel);
        if (isDigital) {
          data.delivered = entry.impressions || 0;
        } else if (channel === 'newsletter') {
          data.delivered = orderNewsletterSendCount;
        } else {
          data.delivered = entry.reportCount || 0;
        }
        totalDelivered += data.delivered;
        totalReportsSubmitted += entry.reportCount || 0;
        data.deliveryPercent = data.goal > 0 ? Math.round((data.delivered / data.goal) * 100) : 0;
      }
    }

    // Also pick up entries in channels not in inventory
    for (const entry of channelDelivery) {
      const channel = entry._id;
      if (!byChannel[channel]) {
        const isDigital = digitalChannels.includes(channel);
        let delivered: number;
        if (isDigital) {
          delivered = entry.impressions || 0;
        } else if (channel === 'newsletter') {
          delivered = orderNewsletterSendCount;
        } else {
          delivered = entry.reportCount || 0;
        }
        byChannel[channel] = {
          goal: 0, delivered, deliveryPercent: 0,
          goalType: isDigital ? 'impressions' : 'frequency',
          volumeLabel: getVolumeLabel(channel, isDigital)
        };
        totalDelivered += delivered;
        totalReportsSubmitted += entry.reportCount || 0;
      }
    }

    const channelPercents = Object.values(byChannel).map(ch => ch.deliveryPercent);
    const deliveryPercent = channelPercents.length > 0
      ? Math.round(channelPercents.reduce((s, p) => s + p, 0) / channelPercents.length)
      : 0;

    const computedDeliverySummary = {
      totalExpectedReports,
      totalReportsSubmitted,
      reportsPercent: totalExpectedReports > 0
        ? Math.min(100, Math.round((totalReportsSubmitted / totalExpectedReports) * 100))
        : 0,
      totalExpectedGoal,
      totalDelivered,
      deliveryPercent,
      totalGoalValue: totalExpectedGoal,
      percentComplete: deliveryPercent,
      byChannel,
      ...(order.deliverySummary?.pixelHealth ? { pixelHealth: order.deliverySummary.pixelHealth } : {}),
      lastUpdated: new Date(),
    };

    // Calculate delivery progress against goals (per-placement)
    let deliveryProgress = null;
    if (order.deliveryGoals) {
      deliveryProgress = {} as Record<string, any>;
      const goals = order.deliveryGoals as Record<string, any>;

      Object.entries(goals).forEach(([itemPath, goal]) => {
        const placement = placementBreakdown.find((p: any) => p._id.itemPath === itemPath);
        const delivered = placement
          ? (goal.goalType === 'impressions' ? placement.impressions : placement.units)
          : 0;

        deliveryProgress![itemPath] = {
          goal: goal.goalValue,
          goalType: goal.goalType,
          delivered,
          percentComplete: goal.goalValue > 0 ? Math.round((delivered / goal.goalValue) * 100) : 0,
        };
      });
    }

    res.json({
      orderId: resolvedOrderId,
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
      byPlacement: placementBreakdown.map((p: any) => ({
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
      deliverySummary: computedDeliverySummary,
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
