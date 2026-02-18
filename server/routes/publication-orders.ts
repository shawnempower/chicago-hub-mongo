/**
 * Publication Orders Routes
 * 
 * API endpoints for publications to view and manage their insertion orders
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authenticate';
// import { insertionOrderService } from '../../src/services/insertionOrderService'; // Temporarily disabled
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';
import { placementCompletionService } from '../../src/services/placementCompletionService';
import { earningsService } from '../../src/services/earningsService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/publication-orders
 * List all insertion orders for the logged-in publication user
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile to check if they're a publication user
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    console.log('User profile:', { userId, profile: profile ? { id: profile._id, isAdmin: profile.isAdmin, publicationId: profile.publicationId } : null });
    
    // Get user's assigned publications
    let publicationIds: string[] = [];
    
    // If admin, get ALL publication orders
    if (profile?.isAdmin) {
      console.log('User is admin, fetching ALL publication orders');
      // Get all publication IDs from campaigns that have insertion orders
      const { insertionOrderService } = await import('../../src/services/insertionOrderService');
      const allOrders = await insertionOrderService.getAllOrders();
      
      // Get unique publication IDs
      const uniquePubIds = new Set(allOrders.map(order => order.publicationId.toString()));
      publicationIds = Array.from(uniquePubIds);
      console.log('Admin - found orders for publications:', publicationIds);
    } else {
      // Get user's assigned publications (includes hub-based publications)
      try {
        publicationIds = await permissionsService.getUserPublications(userId);
        console.log('Publications from permissions service:', publicationIds);
      } catch (err) {
        console.warn('Could not get user publications from permissions service:', err);
      }
      
      // If no permissions found, try to get from profile
      if (publicationIds.length === 0 && profile?.publicationId) {
        publicationIds = [profile.publicationId.toString()];
        console.log('Using publication from profile:', publicationIds);
      }
    }
    
    if (publicationIds.length === 0) {
      console.log('No publications found for user, returning empty');
      return res.json({ orders: [] });
    }

    // Get filters from query params
    const { status, dateFrom, dateTo, publicationId } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    // Filter to specific publication if provided
    let publicationsToQuery = publicationIds;
    if (publicationId) {
      // Check if user has access to this publication
      const requestedPubId = publicationId.toString();
      if (profile?.isAdmin || publicationIds.includes(requestedPubId)) {
        publicationsToQuery = [requestedPubId];
        console.log('Filtering to specific publication:', requestedPubId);
      } else {
        // Fallback: check via canAccessPublication which handles hub-level access
        const hasAccess = await permissionsService.canAccessPublication(userId, requestedPubId);
        if (hasAccess) {
          publicationsToQuery = [requestedPubId];
          console.log('Hub-level access granted to publication:', requestedPubId);
        } else {
          console.log('User does not have access to publication:', requestedPubId);
          return res.status(403).json({ error: 'Access denied to this publication' });
        }
      }
    }

    // Get orders for the publications
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const allOrders = [];
    
    // Publication users should not see draft orders - only sent and beyond
    const isAdmin = profile?.isAdmin === true;
    
    for (const pubId of publicationsToQuery) {
      const orders = await insertionOrderService.getOrdersForPublication(
        parseInt(pubId),
        { ...filters, excludeDrafts: !isAdmin } // Admins see drafts, publications don't
      );
      allOrders.push(...orders);
    }

    // Sort by generated date (newest first)
    allOrders.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );

    console.log(`Found ${allOrders.length} orders for publications:`, publicationIds);
    res.json({ orders: allOrders });
  } catch (error) {
    console.error('Error fetching publication orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/publication-orders/unread-message-count
 * Get count of orders with unread messages for the current user
 * - Hub users: count of orders where latest publication message > lastViewedByHub
 * - Publication users: count of orders where latest hub message > lastViewedByPublication
 */
router.get('/unread-message-count', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const { getDatabase } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
    
    const profile = await userProfilesService.getByUserId(userId);
    const db = getDatabase();
    
    // Determine if hub or publication user
    let isHubUser = false;
    let hubId: string | null = null;
    let publicationIds: number[] = [];
    
    if (profile?.isAdmin) {
      isHubUser = true;
      // For admins, get their hub context (first hub they have access to, or all if super admin)
      const userHubs = await permissionsService.getUserHubs(userId);
      hubId = userHubs.length > 0 ? userHubs[0] : null;
    } else {
      const userHubs = await permissionsService.getUserHubs(userId);
      if (userHubs.length > 0) {
        isHubUser = true;
        hubId = userHubs[0];
      } else {
        // Get publications from permissions service (same as main orders endpoint)
        try {
          const pubIds = await permissionsService.getUserPublications(userId);
          publicationIds = pubIds.map((id: string) => parseInt(id));
        } catch (err) {
          console.warn('Could not get user publications from permissions service:', err);
        }
        
        // Fallback to profile.publicationId if permissions service returned nothing
        if (publicationIds.length === 0 && profile?.publicationId) {
          const pubId = typeof profile.publicationId === 'number' 
            ? profile.publicationId 
            : parseInt(profile.publicationId.toString());
          publicationIds = [pubId];
        }
      }
    }

    let count = 0;
    
    if (isHubUser) {
      // Hub user: count orders with unread publication messages
      const pipeline: any[] = [
        { $match: { deletedAt: { $exists: false } } }
      ];
      
      // Filter by hub if not super admin
      if (hubId) {
        pipeline[0].$match.hubId = hubId;
      }
      
      pipeline.push(
        // Unwind messages to find latest from publication
        { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
        { $match: { 'messages.sender': 'publication' } },
        // Group by order to get latest publication message
        {
          $group: {
            _id: { campaignId: '$campaignId', publicationId: '$publicationId' },
            lastViewedByHub: { $first: '$lastViewedByHub' },
            latestPubMessage: { $max: '$messages.timestamp' }
          }
        },
        // Filter to only unread (pub message newer than last viewed, or never viewed)
        {
          $match: {
            $or: [
              { lastViewedByHub: null },
              { $expr: { $gt: ['$latestPubMessage', '$lastViewedByHub'] } }
            ]
          }
        },
        { $count: 'total' }
      );
      
      const result = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
        .aggregate(pipeline)
        .toArray();
      
      count = result.length > 0 ? result[0].total : 0;
    } else if (publicationIds.length > 0) {
      // Publication user: count orders with unread hub messages
      const pipeline = [
        { 
          $match: { 
            publicationId: { $in: publicationIds },
            deletedAt: { $exists: false }
          } 
        },
        { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
        { $match: { 'messages.sender': 'hub' } },
        {
          $group: {
            _id: { campaignId: '$campaignId', publicationId: '$publicationId' },
            lastViewedByPublication: { $first: '$lastViewedByPublication' },
            latestHubMessage: { $max: '$messages.timestamp' }
          }
        },
        {
          $match: {
            $or: [
              { lastViewedByPublication: null },
              { $expr: { $gt: ['$latestHubMessage', '$lastViewedByPublication'] } }
            ]
          }
        },
        { $count: 'total' }
      ];
      
      const result = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
        .aggregate(pipeline)
        .toArray();
      
      count = result.length > 0 ? result[0].total : 0;
    }

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ error: 'Failed to get unread message count' });
  }
});

/**
 * GET /api/publication-orders/with-recent-messages
 * Get list of orders with recent messages (both read and unread)
 * Returns minimal data for dropdown display with isUnread flag
 */
router.get('/with-recent-messages', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const { getDatabase } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
    
    const profile = await userProfilesService.getByUserId(userId);
    const db = getDatabase();
    
    // Determine if hub or publication user
    let isHubUser = false;
    let hubId: string | null = null;
    let publicationIds: number[] = [];
    
    if (profile?.isAdmin) {
      isHubUser = true;
      const userHubs = await permissionsService.getUserHubs(userId);
      hubId = userHubs.length > 0 ? userHubs[0] : null;
    } else {
      const userHubs = await permissionsService.getUserHubs(userId);
      if (userHubs.length > 0) {
        isHubUser = true;
        hubId = userHubs[0];
      } else {
        // Get publications from permissions service (same as main orders endpoint)
        try {
          const pubIds = await permissionsService.getUserPublications(userId);
          publicationIds = pubIds.map((id: string) => parseInt(id));
        } catch (err) {
          console.warn('Could not get user publications from permissions service:', err);
        }
        
        // Fallback to profile.publicationId if permissions service returned nothing
        if (publicationIds.length === 0 && profile?.publicationId) {
          const pubId = typeof profile.publicationId === 'number' 
            ? profile.publicationId 
            : parseInt(profile.publicationId.toString());
          publicationIds = [pubId];
        }
      }
    }

    let orders: any[] = [];
    
    if (isHubUser) {
      // Hub user: get orders with messages from publications (recent, not just unread)
      const pipeline: any[] = [
        { 
          $match: { 
            deletedAt: { $exists: false },
            messages: { $exists: true, $ne: [] }
          } 
        }
      ];
      
      if (hubId) {
        pipeline[0].$match.hubId = hubId;
      }
      
      pipeline.push(
        // Filter to messages from publication and get the latest
        { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
        { $match: { 'messages.sender': 'publication' } },
        { $sort: { 'messages.timestamp': -1 } },
        {
          $group: {
            _id: { campaignId: '$campaignId', publicationId: '$publicationId' },
            campaignName: { $first: '$campaignName' },
            publicationName: { $first: '$publicationName' },
            lastViewedByHub: { $first: '$lastViewedByHub' },
            latestMessage: { $first: '$messages' }
          }
        },
        // Sort by latest message timestamp
        { $sort: { 'latestMessage.timestamp': -1 } },
        { $limit: 20 }
      );
      
      const results = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
        .aggregate(pipeline)
        .toArray();
      
      orders = results.map(r => {
        const lastViewed = r.lastViewedByHub ? new Date(r.lastViewedByHub) : null;
        const messageTime = r.latestMessage?.timestamp ? new Date(r.latestMessage.timestamp) : null;
        const isUnread = !lastViewed || (messageTime && messageTime > lastViewed);
        
        return {
          campaignId: r._id.campaignId,
          publicationId: r._id.publicationId,
          campaignName: r.campaignName,
          publicationName: r.publicationName,
          latestMessagePreview: r.latestMessage?.content?.substring(0, 100) || '(attachment)',
          latestMessageSender: r.latestMessage?.senderName,
          latestMessageTimestamp: r.latestMessage?.timestamp,
          isUnread
        };
      });
    } else if (publicationIds.length > 0) {
      // Publication user: get orders with messages from hub (recent, not just unread)
      const pipeline = [
        { 
          $match: { 
            publicationId: { $in: publicationIds },
            deletedAt: { $exists: false },
            messages: { $exists: true, $ne: [] }
          } 
        },
        { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
        { $match: { 'messages.sender': 'hub' } },
        { $sort: { 'messages.timestamp': -1 } },
        {
          $group: {
            _id: { campaignId: '$campaignId', publicationId: '$publicationId' },
            campaignName: { $first: '$campaignName' },
            publicationName: { $first: '$publicationName' },
            lastViewedByPublication: { $first: '$lastViewedByPublication' },
            latestMessage: { $first: '$messages' }
          }
        },
        { $sort: { 'latestMessage.timestamp': -1 } },
        { $limit: 20 }
      ];
      
      const results = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS)
        .aggregate(pipeline)
        .toArray();
      
      orders = results.map(r => {
        const lastViewed = r.lastViewedByPublication ? new Date(r.lastViewedByPublication) : null;
        const messageTime = r.latestMessage?.timestamp ? new Date(r.latestMessage.timestamp) : null;
        const isUnread = !lastViewed || (messageTime && messageTime > lastViewed);
        
        return {
          campaignId: r._id.campaignId,
          publicationId: r._id.publicationId,
          campaignName: r.campaignName,
          publicationName: r.publicationName,
          latestMessagePreview: r.latestMessage?.content?.substring(0, 100) || '(attachment)',
          latestMessageSender: r.latestMessage?.senderName,
          latestMessageTimestamp: r.latestMessage?.timestamp,
          isUnread
        };
      });
    }

    res.json({ orders, userType: isHubUser ? 'hub' : 'publication' });
  } catch (error) {
    console.error('Error getting orders with unread messages:', error);
    res.status(500).json({ error: 'Failed to get orders with unread messages' });
  }
});

/**
 * GET /api/publication-orders/delivery-summary
 * Get aggregated delivery progress across all active orders for a publication
 * NOTE: This must be defined BEFORE parameterized routes like /:campaignId/:publicationId
 */
router.get('/delivery-summary', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { publicationId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's assigned publications
    let publicationIds: string[] = [];
    
    if (publicationId) {
      publicationIds = [publicationId as string];
    } else {
      publicationIds = await permissionsService.getUserPublications(userId);
    }
    
    if (publicationIds.length === 0) {
      return res.json({
        overallDeliveryPercent: 0,
        totalExpectedReports: 0,
        totalReportsSubmitted: 0,
        totalOrders: 0,
        activeOrders: 0,
        byChannel: {},
        totals: {
          reports: 0,
          impressions: 0,
          clicks: 0,
          insertions: 0,
          circulation: 0,
          spotsAired: 0,
          downloads: 0,
          proofs: 0
        },
        statusBreakdown: {
          on_track: 0,
          ahead: 0,
          behind: 0,
          at_risk: 0
        }
      });
    }

    const { getDatabase } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
    const db = getDatabase();
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    const perfCollection = db.collection(COLLECTIONS.PERFORMANCE_ENTRIES);
    const proofsCollection = db.collection(COLLECTIONS.PROOF_OF_PERFORMANCE);

    // Get all active orders (confirmed, in_production) for the publication
    const activeStatuses = ['confirmed', 'in_production'];
    const orders = await ordersCollection.find({
      publicationId: { $in: publicationIds.map(id => parseInt(id)) },
      status: { $in: activeStatuses }
    }).toArray();

    if (orders.length === 0) {
      return res.json({
        overallDeliveryPercent: 0,
        totalExpectedReports: 0,
        totalReportsSubmitted: 0,
        totalOrders: 0,
        activeOrders: 0,
        byChannel: {},
        totals: {
          reports: 0,
          impressions: 0,
          clicks: 0,
          insertions: 0,
          circulation: 0,
          spotsAired: 0,
          downloads: 0,
          proofs: 0
        },
        statusBreakdown: {
          on_track: 0,
          ahead: 0,
          behind: 0,
          at_risk: 0
        }
      });
    }

    // --- Real-time delivery computation ---
    // Fetch campaigns so we can derive goals from inventory items directly,
    // rather than relying on a pre-computed deliverySummary cache on the order.
    const campaignsCollection = db.collection(COLLECTIONS.CAMPAIGNS);
    const campaignIds = [...new Set(orders.map(o => o.campaignId).filter(Boolean))];
    const campaigns = await campaignsCollection.find(
      { campaignId: { $in: campaignIds } },
      { projection: { campaignId: 1, selectedInventory: 1 } }
    ).toArray();
    const campaignMap = new Map(campaigns.map((c: any) => [c.campaignId, c]));

    const orderIds = orders.map(o => o._id?.toString()).filter(Boolean);
    const digitalChannels = ['website', 'streaming'];

    const baseEntryFilter = {
      orderId: { $in: orderIds },
      deletedAt: { $exists: false },
      validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic'] }
    };

    // Aggregate performance entries by (orderId, channel) in one query.
    // Uses a relaxed filter (no itemName check) so digital impressions include
    // all legitimate automated entries.  reportCount is computed conditionally
    // to only count entries with proper item names (for "X of Y placements reported").
    const entriesByOrderChannel = await perfCollection.aggregate([
      { $match: baseEntryFilter },
      {
        $group: {
          _id: {
            orderId: '$orderId',
            channel: { $toLower: { $ifNull: ['$channel', 'other'] } }
          },
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
          clicks: { $sum: { $ifNull: ['$metrics.clicks', 0] } }
        }
      }
    ]).toArray();

    // Newsletter sends: count distinct dates per itemPath per order, then sum.
    // Each unique date for a given newsletter placement = one send.
    const newsletterSendsAgg = await perfCollection.aggregate([
      { $match: { ...baseEntryFilter, channel: { $regex: /^newsletter$/i } } },
      { $group: {
        _id: { orderId: '$orderId', itemPath: '$itemPath' },
        distinctDates: { $addToSet: {
          $dateToString: { format: '%Y-%m-%d', date: '$dateStart' }
        }}
      }},
      { $group: {
        _id: '$_id.orderId',
        totalSends: { $sum: { $size: '$distinctDates' } }
      }}
    ]).toArray();
    const newsletterSendsByOrder = new Map(
      newsletterSendsAgg.map((r: any) => [r._id, r.totalSends])
    );

    // Build lookup: orderId -> Map<channel, entryData>
    const entryLookup = new Map<string, Map<string, any>>();
    for (const entry of entriesByOrderChannel) {
      const oid = entry._id.orderId;
      const ch = entry._id.channel;
      if (!entryLookup.has(oid)) entryLookup.set(oid, new Map());
      entryLookup.get(oid)!.set(ch, entry);
    }

    // Aggregate totals (display stats) in a single pass
    const perfAggregation = await perfCollection.aggregate([
      {
        $match: {
          orderId: { $in: orderIds },
          deletedAt: { $exists: false },
          validationStatus: { $nin: ['bad_pixel', 'invalid_orderId', 'invalid_traffic'] }
        }
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalImpressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
          totalClicks: { $sum: { $ifNull: ['$metrics.clicks', 0] } },
          totalInsertions: { $sum: { $ifNull: ['$metrics.insertions', 0] } },
          totalCirculation: { $sum: { $ifNull: ['$metrics.circulation', 0] } },
          totalSpotsAired: { $sum: { $ifNull: ['$metrics.spotsAired', 0] } },
          totalDownloads: { $sum: { $ifNull: ['$metrics.downloads', 0] } }
        }
      }
    ]).toArray();

    const perfTotals = perfAggregation[0] || {
      totalEntries: 0, totalImpressions: 0, totalClicks: 0,
      totalInsertions: 0, totalCirculation: 0, totalSpotsAired: 0, totalDownloads: 0
    };

    // --- Build goals from campaign inventory & match against real entries ---
    let totalExpectedReports = 0;
    let totalReportsSubmitted = 0;
    const byChannel: Record<string, {
      goal: number; delivered: number; deliveryPercent: number;
      goalType: string; volumeLabel: string;
    }> = {};
    const statusBreakdown = { on_track: 0, ahead: 0, behind: 0, at_risk: 0 };

    const getVolumeLabel = (channel: string, isDigital: boolean) =>
      isDigital ? 'Impressions' :
      channel === 'newsletter' ? 'Sends' :
      channel === 'podcast' ? 'Episodes' :
      channel === 'radio' ? 'Spots' :
      channel === 'print' ? 'Insertions' : 'Units';

    for (const order of orders) {
      const campaign = campaignMap.get(order.campaignId);
      const publication = campaign?.selectedInventory?.publications?.find(
        (p: any) => p.publicationId === order.publicationId
      );

      // Per-order channel tracking
      const orderChannels: Record<string, {
        goal: number; delivered: number; deliveryPercent: number;
        goalType: string; volumeLabel: string;
      }> = {};

      // Build goals from inventory items
      if (publication?.inventoryItems) {
        for (const item of publication.inventoryItems) {
          if (item.isExcluded) continue;
          const channel = (item.channel || 'other').toLowerCase();
          const isDigital = digitalChannels.includes(channel);

          if (!orderChannels[channel]) {
            orderChannels[channel] = {
              goal: 0, delivered: 0, deliveryPercent: 0,
              goalType: isDigital ? 'impressions' : 'frequency',
              volumeLabel: getVolumeLabel(channel, isDigital)
            };
          }

          totalExpectedReports++;

          if (isDigital) {
            let impressions = 0;
            const placementGoal = order.deliveryGoals?.[item.itemPath];
            if (placementGoal?.goalType === 'impressions' && placementGoal.goalValue > 0) {
              impressions = placementGoal.goalValue;
            } else if (item.monthlyImpressions > 0) {
              const pct = (item.currentFrequency || item.quantity || 100) / 100;
              impressions = Math.round(item.monthlyImpressions * pct);
            }
            orderChannels[channel].goal += impressions;
          } else if (channel === 'newsletter') {
            const sends = item.currentFrequency || item.quantity || 1;
            orderChannels[channel].goal += sends;
          } else {
            const frequency = item.currentFrequency || item.quantity || 1;
            orderChannels[channel].goal += frequency;
          }
        }
      }

      // Fill in delivered amounts from real entry data
      const oid = order._id.toString();
      const orderEntries = entryLookup.get(oid);
      if (orderEntries) {
        for (const [channel, entryData] of orderEntries) {
          const isDigital = digitalChannels.includes(channel);
          const isNewsletter = channel === 'newsletter';
          let delivered: number;
          if (isDigital) {
            delivered = entryData.impressions || 0;
          } else if (isNewsletter) {
            delivered = newsletterSendsByOrder.get(oid) || 0;
          } else {
            delivered = entryData.reportCount || 0;
          }

          if (!orderChannels[channel]) {
            orderChannels[channel] = {
              goal: 0, delivered: 0, deliveryPercent: 0,
              goalType: isDigital ? 'impressions' : 'frequency',
              volumeLabel: getVolumeLabel(channel, isDigital)
            };
          }
          orderChannels[channel].delivered += delivered;
          totalReportsSubmitted += entryData.reportCount || 0;
        }
      }

      // Compute per-channel delivery percent for this order
      for (const ch of Object.values(orderChannels)) {
        ch.deliveryPercent = ch.goal > 0 ? Math.round((ch.delivered / ch.goal) * 100) : 0;
      }

      // Order-level pacing (average of its channel percentages)
      const orderPercents = Object.values(orderChannels).map(ch => ch.deliveryPercent);
      const orderPercent = orderPercents.length > 0
        ? Math.round(orderPercents.reduce((s, p) => s + p, 0) / orderPercents.length)
        : 0;

      if (orderPercent >= 110) statusBreakdown.ahead++;
      else if (orderPercent >= 90) statusBreakdown.on_track++;
      else if (orderPercent >= 70) statusBreakdown.behind++;
      else statusBreakdown.at_risk++;

      // Merge into publication-level byChannel
      for (const [channel, data] of Object.entries(orderChannels)) {
        if (!byChannel[channel]) {
          byChannel[channel] = {
            goal: 0, delivered: 0, deliveryPercent: 0,
            goalType: data.goalType, volumeLabel: data.volumeLabel
          };
        }
        byChannel[channel].goal += data.goal;
        byChannel[channel].delivered += data.delivered;
      }
    }

    // Final publication-level percentages
    for (const ch of Object.values(byChannel)) {
      ch.deliveryPercent = ch.goal > 0 ? Math.round((ch.delivered / ch.goal) * 100) : 0;
    }

    const channelPercents = Object.values(byChannel).map(ch => ch.deliveryPercent);
    const overallDeliveryPercent = channelPercents.length > 0
      ? Math.round(channelPercents.reduce((s, p) => s + p, 0) / channelPercents.length)
      : 0;

    // Count proofs
    const proofsCount = await proofsCollection.countDocuments({
      orderId: { $in: orderIds }
    });

    // Get total order count (all statuses)
    const totalOrders = await ordersCollection.countDocuments({
      publicationId: { $in: publicationIds.map(id => parseInt(id)) }
    });

    res.json({
      overallDeliveryPercent,
      totalExpectedReports,
      totalReportsSubmitted,
      totalOrders,
      activeOrders: orders.length,
      byChannel,
      totals: {
        reports: perfTotals.totalEntries,
        impressions: perfTotals.totalImpressions,
        clicks: perfTotals.totalClicks,
        insertions: perfTotals.totalInsertions,
        circulation: perfTotals.totalCirculation,
        spotsAired: perfTotals.totalSpotsAired,
        downloads: perfTotals.totalDownloads,
        proofs: proofsCount
      },
      statusBreakdown
    });
  } catch (error) {
    console.error('Error fetching delivery summary:', error);
    res.status(500).json({ error: 'Failed to fetch delivery summary' });
  }
});

/**
 * GET /api/publication-orders/:campaignId/:publicationId
 * Get a specific insertion order
 */
router.get('/:campaignId/:publicationId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;

    // Get user profile
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    // Verify user has access to this publication
    let hasAccess = false;
    
    // Check if admin
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      // Check permissions
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        // Fallback: check if this is their publication from profile
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the specific order directly
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const order = await insertionOrderService.getOrderByCampaignAndPublication(
      campaignId,
      parseInt(publicationId)
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Publication users cannot view draft orders
    if (order.status === 'draft' && !profile?.isAdmin) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch the full campaign data to include inventory items
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    
    // Try to get campaign by both _id and campaignId string
    let campaign = await campaignsService.getById(campaignId);
    if (!campaign) {
      campaign = await campaignsService.getByCampaignId(campaignId);
    }
    
    // **DYNAMIC ASSET LOADING**: Fetch fresh assets from database
    let freshCreativeAssets: any[] = [];
    
    if (campaign) {
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
      
      const creativeAssetsCollection = getDatabase().collection(COLLECTIONS.CREATIVE_ASSETS);
      
      // Fetch all assets for this campaign
      // NOTE: Campaign may have both _id (ObjectId) and campaignId (string)
      // Assets may be associated with either, so we query for both
      const campaignObjectId = campaign._id?.toString();
      const campaignStringId = (campaign as any).campaignId;
      
      const campaignAssets = await creativeAssetsCollection.find({
        $or: [
          { 'associations.campaignId': campaignId }, // Try route parameter
          { 'associations.campaignId': campaignObjectId }, // Try ObjectId string
          { 'associations.campaignId': campaignStringId }, // Try campaignId string
        ],
        deletedAt: { $exists: false },
        'uploadInfo.uploadedAt': { $exists: true }
      }).toArray();
      
      // Find this publication's inventory items
      const publication = campaign.selectedInventory?.publications?.find(
        (p: any) => p.publicationId.toString() === publicationId.toString()
      );
      
      if (publication && publication.inventoryItems) {
        // Use the spec extraction utility to properly parse inventory items
        const { extractRequirementsForSelectedInventory } = await import('../../src/utils/creativeSpecsExtractor');
        const { generateSpecKey } = await import('../../src/utils/creativeSpecsGrouping');
        
        // Transform inventory items to format expected by extractor
        const inventoryForExtraction = publication.inventoryItems.map((item: any) => ({
          ...item,
          publicationId: publication.publicationId,
          publicationName: publication.publicationName,
        }));
        
        // Extract proper specs (this will infer dimensions from itemName if needed)
        const extractedRequirements = extractRequirementsForSelectedInventory(inventoryForExtraction);
        
        // Match assets to extracted requirements
        extractedRequirements.forEach((req: any) => {
          const reqChannel = req.channel || 'general';
          const reqDimensions = req.dimensions;
          const reqPlacementId = req.placementId || req.itemPath;
          
          // Generate spec key for matching
          const reqSpecKey = reqDimensions ? 
            `${reqChannel}::dim:${reqDimensions}` : 
            `${reqChannel}::general`;
          
          // Find matching assets
          const matchingAssets = campaignAssets.filter((asset: any) => {
            // Primary: Match by direct placement link with EXACT placementId match
            // This is the most precise - asset is assigned to this specific placement
            const assetPlacements = asset.associations?.placements;
            if (assetPlacements && Array.isArray(assetPlacements)) {
              const placementMatch = assetPlacements.some((p: any) => {
                // Must match this specific publication
                if (p.publicationId !== parseInt(publicationId)) return false;
                
                // Exact placementId match (most reliable)
                if (p.placementId === reqPlacementId) return true;
                
                return false;
              });
              if (placementMatch) return true;
            }
            
            // Secondary: Match by dimensions within the specGroupId
            // This catches assets that are assigned by dimension spec rather than direct placement
            const assetSpecGroupId = asset.associations?.specGroupId || asset.metadata?.specGroupId;
            if (assetSpecGroupId && reqDimensions) {
              // Extract just the dimensions part (handles digital_display::dim:300x600 vs website::dim:300x600)
              const assetDimPart = assetSpecGroupId?.split('::dim:')[1];
              if (assetDimPart && assetDimPart === reqDimensions) {
                // Also verify this asset is assigned to this publication via placements
                const isForThisPub = assetPlacements?.some((p: any) => p.publicationId === parseInt(publicationId));
                if (isForThisPub) return true;
              }
            }
            
            return false;
          });
          
          // Add all matching assets for this placement
          matchingAssets.forEach((matchingAsset: any) => {
            freshCreativeAssets.push({
              assetId: matchingAsset._id.toString(),
              fileName: matchingAsset.metadata?.fileName || 'Unknown',
              fileUrl: matchingAsset.metadata?.fileUrl || '',
              fileType: matchingAsset.metadata?.fileType || 'unknown',
              fileSize: matchingAsset.metadata?.fileSize || 0,
              uploadedAt: matchingAsset.uploadInfo?.uploadedAt || new Date(),
              uploadedBy: matchingAsset.uploadInfo?.uploadedBy || '',
              placementId: req.placementId,
              placementName: req.placementName,
              specifications: {
                dimensions: reqDimensions,
                channel: reqChannel,
                format: req.format,
                fileSize: req.fileSize
              },
              detectedSpecs: {
                dimensions: matchingAsset.metadata?.detectedDimensions,
                colorSpace: matchingAsset.metadata?.detectedColorSpace,
                estimatedDPI: matchingAsset.metadata?.detectedDPI
              }
            });
          });
        });
      }
      
    }
    
    // Fetch publication's ad delivery settings
    const { getDatabase: getDb } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS: COLS } = await import('../../src/integrations/mongodb/schemas');
    const publicationsCollection = getDb().collection(COLS.PUBLICATIONS);
    const publicationDoc = await publicationsCollection.findOne({ publicationId: parseInt(publicationId) });
    
    // Fetch hub to get advertising terms
    let hubTerms = null;
    if (order.hubId) {
      const { HubsService } = await import('../../src/integrations/mongodb/hubService');
      const hub = await HubsService.getHubBySlug(order.hubId);
      if (hub?.advertisingTerms) {
        hubTerms = hub.advertisingTerms;
      }
    }
    
    // Check if any digital placements should auto-complete (campaign ended)
    // This runs lazily when order detail is loaded
    try {
      const completionCheck = await placementCompletionService.checkDigitalPlacementsForCampaignEnd(
        order._id.toString()
      );
      if (completionCheck.completed > 0) {
        console.log(`[Order Load] Auto-completed ${completionCheck.completed} digital placements (campaign ended)`);
        // Re-fetch order to get updated placement statuses
        const updatedOrder = await insertionOrderService.getOrderByCampaignAndPublication(
          campaignId,
          parseInt(publicationId)
        );
        if (updatedOrder) {
          Object.assign(order, { placementStatuses: updatedOrder.placementStatuses });
        }
      }
    } catch (err) {
      // Don't fail the request if completion check fails
      console.error('Error checking digital placements for campaign end:', err);
    }

    // Include campaign data with inventory for ad specs
    const orderWithCampaignData = {
      ...order,
      creativeAssets: freshCreativeAssets, // Use fresh assets instead of cached ones!
      campaignData: campaign ? {
        selectedInventory: campaign.selectedInventory,
        timeline: campaign.timeline,
        objectives: campaign.objectives,
        basicInfo: campaign.basicInfo
      } : null,
      publicationSettings: publicationDoc ? {
        adDeliverySettings: publicationDoc.adDeliverySettings
      } : null
    };

    res.json({ order: orderWithCampaignData, hubTerms });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * PUT /api/publication-orders/:campaignId/:publicationId/status
 * Update order status
 */
router.put('/:campaignId/:publicationId/status', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Verify user has access to this publication
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update status
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.updateCampaignOrderStatus(
      campaignId,
      parseInt(publicationId),
      status,
      userId,
      notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, order: result.order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * GET /api/publication-orders/:campaignId/:publicationId/print
 * Generate print-friendly HTML for an order on-demand
 * 
 * Returns HTML that can be opened in a new tab for printing/saving as PDF.
 * HTML is generated fresh from campaign data, not stored.
 */
router.get('/:campaignId/:publicationId/print', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;

    // Verify user has access to this order
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate print HTML on-demand
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.generatePrintHTML(
      campaignId,
      parseInt(publicationId)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Return HTML directly (can be rendered in browser)
    res.setHeader('Content-Type', 'text/html');
    res.send(result.html);
  } catch (error) {
    console.error('Error generating print HTML:', error);
    res.status(500).json({ error: 'Failed to generate print view' });
  }
});

/**
 * GET /api/publication-orders/:campaignId/:publicationId/fresh-assets
 * Load fresh creative assets for an order (dynamically from campaign assets)
 * 
 * This endpoint loads the CURRENT state of assets, not a snapshot.
 * Use this to check if assets have been uploaded after order generation.
 */
router.get('/:campaignId/:publicationId/fresh-assets', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;

    // Verify user has access to this order
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Load fresh assets
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.loadFreshAssetsForOrder(
      campaignId,
      parseInt(publicationId)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Regenerate signed URLs for S3 assets (stored URLs expire after 1 hour)
    // Collect asset IDs that need fresh URLs
    const assetIds = result.assets
      .filter(item => item.hasAsset && item.asset?.assetId)
      .map(item => new ObjectId(item.asset!.assetId));

    let storagePathMap: Record<string, string> = {};
    if (assetIds.length > 0) {
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const db = getDatabase();
      const assetDocs = await db.collection('creative_assets').find(
        { _id: { $in: assetIds }, deletedAt: { $exists: false } },
        { projection: { 'metadata.storageProvider': 1, 'metadata.storagePath': 1 } }
      ).toArray();

      // Build a map of assetId -> storagePath for S3 assets
      for (const doc of assetDocs) {
        if (doc.metadata?.storageProvider === 's3' && doc.metadata?.storagePath) {
          storagePathMap[doc._id.toString()] = doc.metadata.storagePath;
        }
      }
    }

    // Generate fresh signed URLs in parallel
    const { fileStorage } = await import('../storage/fileStorage');
    const assetsWithFreshUrls = await Promise.all(
      result.assets.map(async (item) => {
        if (!item.hasAsset || !item.asset) return item;

        const storagePath = storagePathMap[item.asset.assetId];
        if (storagePath) {
          try {
            const freshUrl = await fileStorage.getSignedUrl(storagePath, 86400); // 24 hours
            if (freshUrl) {
              item.asset.fileUrl = freshUrl;
              // For image assets, use the same fresh URL as thumbnail
              if (item.asset.thumbnailUrl) {
                item.asset.thumbnailUrl = freshUrl;
              }
            }
          } catch (error) {
            console.error('Error generating fresh signed URL for asset:', item.asset.assetId, error);
            // Keep the old URL as fallback
          }
        }

        return item;
      })
    );

    res.json({
      success: true,
      assets: assetsWithFreshUrls,
      assetStatus: result.assetStatus
    });
  } catch (error) {
    console.error('Error loading fresh assets:', error);
    res.status(500).json({ error: 'Failed to load assets' });
  }
});

/**
 * POST /api/publication-orders/:campaignId/:publicationId/confirm
 * Confirm an insertion order
 */
router.post('/:campaignId/:publicationId/confirm', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { notes } = req.body;

    // Verify access
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update to confirmed status
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.updateCampaignOrderStatus(
      campaignId,
      parseInt(publicationId),
      'confirmed',
      userId,
      notes || 'Order confirmed by publication'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Send notifications to hub admins
    try {
      const { notifyOrderConfirmed } = await import('../../src/services/notificationService');
      const { emailService } = await import('../emailService');
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
      
      const db = getDatabase();
      const order = result.order;
      
      if (order?.hubId) {
        // Get campaign for additional context
        const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
        const campaign = await campaignsService.getByCampaignId(campaignId) || await campaignsService.getById(campaignId);
        
        // Get hub for branding
        const hub = await db.collection(COLLECTIONS.HUBS).findOne({ hubId: order.hubId });
        const hubName = hub?.basicInfo?.name;
        
        // Find hub admins from permissions (scoped to this hub only)
        const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
          'hubAccess.hubId': order.hubId,
          role: { $in: ['admin', 'hub_user'] }
        }).toArray();
        
        const notifyUserIds = new Set<string>();
        hubPermissions.forEach(p => notifyUserIds.add(p.userId));
        
        const campaignUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaigns/${campaignId}`;
        
        for (const recipientUserId of notifyUserIds) {
          // Create in-app notification
          await notifyOrderConfirmed({
            userId: recipientUserId,
            hubId: order.hubId,
            publicationName: order.publicationName,
            publicationId,
            campaignId: campaignId,
            campaignName: order.campaignName,
            orderId: order._id?.toString() || ''
          });
          
          // Send email notification
          if (emailService) {
            const { ObjectId } = await import('mongodb');
            const userIdObj = typeof recipientUserId === 'string' ? new ObjectId(recipientUserId) : recipientUserId;
            const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userIdObj });
            if (user?.email) {
              await emailService.sendOrderConfirmedEmail({
                recipientEmail: user.email,
                recipientName: user.firstName,
                publicationName: order.publicationName,
                campaignName: order.campaignName,
                advertiserName: campaign?.basicInfo?.advertiserName,
                confirmedAt: new Date(),
                campaignUrl,
                hubName
              });
            }
          }
        }
        
        console.log(`📧 Sent order confirmed notifications to hub admins for ${order.publicationName}`);
      }
    } catch (notifyError) {
      console.error('Error sending order confirmed notifications:', notifyError);
      // Don't fail the request if notifications fail
    }
    
    // Create earnings estimate for this order when confirmed
    try {
      const orderId = result.order?._id?.toString();
      if (orderId) {
        await earningsService.createPublisherEarningsEstimate(orderId);
        console.log(`📊 Created earnings estimate for order ${orderId}`);
        
        // Also try to create/update hub billing estimate
        // Hub billing aggregates all publisher earnings for a campaign
        await earningsService.createHubBillingEstimate(campaignId);
      }
    } catch (earningsError) {
      console.error('Error creating earnings estimate:', earningsError);
      // Don't fail the request if earnings creation fails
    }

    res.json({ success: true, order: result.order });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

/**
 * POST /api/publication-orders/:campaignId/:publicationId/ad-specs
 * Provide ad specifications
 */
router.post('/:campaignId/:publicationId/ad-specs', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { specifications } = req.body;

    if (!specifications || !Array.isArray(specifications)) {
      return res.status(400).json({ error: 'Specifications array is required' });
    }

    // Verify access
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Save ad specifications
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.saveAdSpecifications(
      campaignId,
      parseInt(publicationId),
      specifications
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true, message: 'Ad specifications saved', order: result.order });
  } catch (error) {
    console.error('Error saving ad specifications:', error);
    res.status(500).json({ error: 'Failed to save ad specifications' });
  }
});

/**
 * POST /api/publication-orders/:campaignId/:publicationId/notes
 * Add notes to an order
 */
router.post('/:campaignId/:publicationId/notes', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { notes, noteType } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    // Verify access
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add notes (type defaults to 'publication' but can be overridden)
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.addNotes(
      campaignId,
      parseInt(publicationId),
      notes,
      noteType || 'publication'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding notes:', error);
    res.status(500).json({ error: 'Failed to add notes' });
  }
});

/**
 * POST /api/publication-orders/:campaignId/:publicationId/messages
 * Add a message to the order conversation thread
 */
router.post('/:campaignId/:publicationId/messages', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { content, attachments } = req.body;

    // Require either message content or attachments
    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content or attachments required' });
    }

    // Get user profile and auth user to determine sender type and name
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const { getDatabase } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
    
    const profile = await userProfilesService.getByUserId(userId);
    
    // Also get the auth user record for email
    const usersCollection = getDatabase().collection(COLLECTIONS.USERS);
    const authUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    // Determine if hub or publication user
    const isHubUser = profile?.isAdmin === true;
    let hasAccess = false;

    if (isHubUser) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order is in draft status - messages not allowed on drafts
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const orderForCheck = await insertionOrderService.getOrderByCampaignAndPublication(campaignId, parseInt(publicationId));
    
    if (orderForCheck?.status === 'draft') {
      return res.status(400).json({ error: 'Messages cannot be sent on draft orders. Please send the order to the publication first.' });
    }

    // Build sender name - try multiple sources
    let senderName = 'Unknown User';
    if (profile?.firstName && profile?.lastName) {
      senderName = `${profile.firstName} ${profile.lastName}`;
    } else if (profile?.firstName) {
      senderName = profile.firstName;
    } else if (authUser?.firstName && authUser?.lastName) {
      senderName = `${authUser.firstName} ${authUser.lastName}`;
    } else if (authUser?.email) {
      // Use email prefix as name
      senderName = authUser.email.split('@')[0];
    } else if (profile?.companyName) {
      senderName = profile.companyName;
    }
    
    const senderType: 'hub' | 'publication' = isHubUser ? 'hub' : 'publication';

    // Add message (insertionOrderService already imported above for draft check)
    const result = await insertionOrderService.addMessage(
      campaignId,
      parseInt(publicationId),
      {
        content: content.trim(),
        sender: senderType,
        senderName,
        senderId: userId,
        attachments
      }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Send notification and email to the other party
    try {
      const { notifyMessageReceived } = await import('../../src/services/notificationService');
      const { emailService } = await import('../emailService');
      
      // Get order details for notification context
      const order = await insertionOrderService.getOrderByCampaignAndPublication(campaignId, parseInt(publicationId));
      
      if (order) {
        if (senderType === 'hub') {
          // Hub sent message -> notify publication users
          const { permissionsService } = await import('../../src/integrations/mongodb/permissionsService');
          const { getDatabase } = await import('../../src/integrations/mongodb/client');
          const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
          
          // Get hub name for email branding
          const db = getDatabase();
          const hub = order.hubId ? await db.collection(COLLECTIONS.HUBS).findOne({ hubId: order.hubId }) : null;
          const hubName = hub?.basicInfo?.name;
          
          // Find users with publication access
          const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
            'publications.publicationId': parseInt(publicationId)
          }).toArray();
          
          for (const perm of permissions) {
            // Create in-app notification
            await notifyMessageReceived({
              userId: perm.userId,
              senderName,
              campaignId,
              campaignName: order.campaignName,
              orderId: order._id?.toString() || '',
              publicationId: parseInt(publicationId),
              messagePreview: content.trim()
            });
            
            // Send email notification
            if (emailService) {
              const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: perm.userId });
              if (user?.email) {
                await emailService.sendMessageNotificationEmail({
                  recipientEmail: user.email,
                  recipientName: user.firstName,
                  senderName,
                  campaignName: order.campaignName,
                  publicationName: order.publicationName,
                  messagePreview: content.trim().slice(0, 100),
                  orderUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?tab=order-detail&campaignId=${campaignId}&publicationId=${publicationId}`,
                  hubName
                });
              }
            }
          }
        } else {
          // Publication sent message -> notify hub admins
          const { getDatabase } = await import('../../src/integrations/mongodb/client');
          const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
          const db = getDatabase();
          
          // Get hub name for email branding
          const hub = order.hubId ? await db.collection(COLLECTIONS.HUBS).findOne({ hubId: order.hubId }) : null;
          const hubName = hub?.basicInfo?.name;
          
          // Find hub admin users from permissions (scoped to this hub only)
          const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
            'hubAccess.hubId': order.hubId,
            role: { $in: ['admin', 'hub_user'] }
          }).toArray();
          
          const notifyUserIds = new Set<string>();
          hubPermissions.forEach(p => notifyUserIds.add(p.userId));
          
          for (const recipientUserId of notifyUserIds) {
            await notifyMessageReceived({
              userId: recipientUserId,
              senderName,
              campaignId,
              campaignName: order.campaignName,
              orderId: order._id?.toString() || '',
              hubId: order.hubId,
              messagePreview: content.trim()
            });
            
            // Send email notification to hub admins
            if (emailService) {
              const { ObjectId } = await import('mongodb');
              const userIdObj = typeof recipientUserId === 'string' ? new ObjectId(recipientUserId) : recipientUserId;
              const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userIdObj });
              if (user?.email) {
                await emailService.sendMessageNotificationEmail({
                  recipientEmail: user.email,
                  recipientName: user.firstName,
                  senderName,
                  campaignName: order.campaignName,
                  publicationName: order.publicationName,
                  messagePreview: content.trim().slice(0, 100),
                  orderUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?tab=order-detail&campaignId=${campaignId}&publicationId=${publicationId}`,
                  hubName
                });
              }
            }
          }
        }
      }
    } catch (notifyError) {
      console.error('Error sending message notifications:', notifyError);
      // Don't fail the request if notification fails
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * GET /api/publication-orders/:campaignId/:publicationId/messages
 * Get all messages for an order
 */
router.get('/:campaignId/:publicationId/messages', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;

    // Verify access
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.getMessages(
      campaignId,
      parseInt(publicationId)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, messages: result.messages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * PUT /api/publication-orders/:campaignId/:publicationId/mark-viewed
 * Mark the order as viewed by the current user (hub or publication)
 * - Hub users: updates lastViewedByHub timestamp
 * - Publication users: updates lastViewedByPublication timestamp
 */
router.put('/:campaignId/:publicationId/mark-viewed', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;

    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const { getDatabase } = await import('../../src/integrations/mongodb/client');
    const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
    
    const profile = await userProfilesService.getByUserId(userId);
    const db = getDatabase();
    
    // Determine if hub or publication user
    let isHubUser = false;
    let hasAccess = false;
    
    if (profile?.isAdmin) {
      isHubUser = true;
      hasAccess = true;
    } else {
      // Check if user has hub access
      const userHasHubAccess = await permissionsService.getUserHubs(userId);
      if (userHasHubAccess.length > 0) {
        isHubUser = true;
        hasAccess = true;
      } else {
        // Check if publication user has access to this order
        try {
          hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
        } catch (err) {
          if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the appropriate lastViewed timestamp based on user type
    const updateField = isHubUser ? 'lastViewedByHub' : 'lastViewedByPublication';
    
    const result = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS).updateOne(
      {
        campaignId,
        publicationId: parseInt(publicationId),
        deletedAt: { $exists: false }
      },
      {
        $set: {
          [updateField]: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, userType: isHubUser ? 'hub' : 'publication' });
  } catch (error) {
    console.error('Error marking order as viewed:', error);
    res.status(500).json({ error: 'Failed to mark order as viewed' });
  }
});

/**
 * PUT /api/publication-orders/:campaignId/:publicationId/placement-status
 * Update individual placement status (accept/reject)
 */
router.put('/:campaignId/:publicationId/placement-status', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { placementId, status, notes } = req.body;

    if (!placementId || !status) {
      return res.status(400).json({ error: 'Placement ID and status are required' });
    }

    if (!['accepted', 'rejected', 'pending', 'in_production', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify access
    const { userProfilesService } = await import('../../src/integrations/mongodb/allServices');
    const profile = await userProfilesService.getByUserId(userId);
    
    let hasAccess = false;
    if (profile?.isAdmin) {
      hasAccess = true;
    } else {
      try {
        hasAccess = await permissionsService.canAccessPublication(userId, publicationId);
      } catch (err) {
        if (profile?.publicationId && profile.publicationId.toString() === publicationId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update placement status using the service
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const result = await insertionOrderService.updatePlacementStatus(
      campaignId,
      parseInt(publicationId),
      placementId,
      status,
      userId,
      notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    console.log('Placement status updated:', { campaignId, publicationId, placementId, status });

    // Send notifications to hub admins for placement status changes
    try {
      const { 
        notifyPlacementAccepted, 
        notifyPlacementRejected, 
        notifyPlacementDelivered 
      } = await import('../../src/services/notificationService');
      const { emailService } = await import('../emailService');
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
      
      const db = getDatabase();
      
      // Get order details for notification context
      const order = await insertionOrderService.getOrderByCampaignAndPublication(campaignId, parseInt(publicationId));
      
      if (order?.hubId && ['accepted', 'rejected', 'delivered'].includes(status)) {
        // Get campaign for additional context
        const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
        const campaign = await campaignsService.getByCampaignId(campaignId) || await campaignsService.getById(campaignId);
        
        // Get hub for email branding
        const hub = await db.collection(COLLECTIONS.HUBS).findOne({ hubId: order.hubId });
        const hubName = hub?.basicInfo?.name;
        
        // Find hub admins from permissions (scoped to this hub only)
        const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
          'hubAccess.hubId': order.hubId,
          role: { $in: ['admin', 'hub_user'] }
        }).toArray();
        
        const notifyUserIds = new Set<string>();
        hubPermissions.forEach(p => notifyUserIds.add(p.userId));
        
        const campaignUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaigns/${campaignId}`;
        
        // Extract placement name from placementId (e.g., "print/full-page" -> "Full Page Print")
        const placementName = placementId.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || placementId;
        
        for (const recipientUserId of notifyUserIds) {
          if (status === 'accepted') {
            // In-app notification only for accepted
            await notifyPlacementAccepted({
              userId: recipientUserId,
              hubId: order.hubId,
              publicationName: order.publicationName,
              publicationId,
              placementName,
              campaignId,
              campaignName: order.campaignName,
              orderId: order._id?.toString() || ''
            });
          } else if (status === 'rejected') {
            // In-app notification for rejected
            await notifyPlacementRejected({
              userId: recipientUserId,
              hubId: order.hubId,
              publicationName: order.publicationName,
              publicationId,
              placementName,
              campaignId,
              campaignName: order.campaignName,
              orderId: order._id?.toString() || '',
              reason: notes
            });
            
            // Email notification for rejected
            if (emailService) {
              const { ObjectId } = await import('mongodb');
              const userIdObj = typeof recipientUserId === 'string' ? new ObjectId(recipientUserId) : recipientUserId;
              const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userIdObj });
              if (user?.email) {
                await emailService.sendPlacementRejectedEmail({
                  recipientEmail: user.email,
                  recipientName: user.firstName,
                  publicationName: order.publicationName,
                  placementName,
                  campaignName: order.campaignName,
                  rejectionReason: notes,
                  campaignUrl,
                  hubName
                });
              }
            }
          } else if (status === 'delivered') {
            // In-app notification only for delivered
            await notifyPlacementDelivered({
              userId: recipientUserId,
              hubId: order.hubId,
              publicationName: order.publicationName,
              publicationId,
              placementName,
              campaignId,
              campaignName: order.campaignName,
              orderId: order._id?.toString() || ''
            });
          }
        }
        
        console.log(`📧 Sent placement ${status} notifications to hub admins`);
      }
    } catch (notifyError) {
      console.error('Error sending placement status notifications:', notifyError);
      // Don't fail the request if notifications fail
    }

    res.json({ success: true, orderConfirmed: result.orderConfirmed, orderRejected: result.orderRejected });
  } catch (error) {
    console.error('Error updating placement status:', error);
    res.status(500).json({ error: 'Failed to update placement status' });
  }
});

/**
 * POST /api/publication-orders/:campaignId/:publicationId/proof
 * Upload proof of performance (post-campaign)
 */
router.post('/:campaignId/:publicationId/proof', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { files, notes } = req.body;

    // Verify access
    const hasAccess = await permissionsService.canAccessPublication(
      userId,
      publicationId
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Implement proof of performance upload
    // This would save files and update the order
    
    res.json({ success: true, message: 'Proof of performance uploaded' });
  } catch (error) {
    console.error('Error uploading proof:', error);
    res.status(500).json({ error: 'Failed to upload proof' });
  }
});

/**
 * GET /api/publication-orders/stats
 * Get order statistics for the logged-in publication
 */
router.get('/stats', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    // Get user's assigned publications
    const publicationIds = await permissionsService.getUserPublications(userId);
    
    if (publicationIds.length === 0) {
      return res.json({ 
        total: 0,
        byStatus: {
          draft: 0,
          sent: 0,
          confirmed: 0,
          rejected: 0,
          in_production: 0,
          delivered: 0
        }
      });
    }

    // Aggregate stats from all assigned publications
    const allStats = {
      total: 0,
      byStatus: {
        draft: 0,
        sent: 0,
        confirmed: 0,
        rejected: 0,
        in_production: 0,
        delivered: 0
      }
    };

    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    for (const pubId of publicationIds) {
      const stats = await insertionOrderService.getOrderStatistics({
        publicationId: parseInt(pubId)
      });
      
      allStats.total += stats.total;
      Object.keys(stats.byStatus).forEach(status => {
        allStats.byStatus[status as keyof typeof allStats.byStatus] += 
          stats.byStatus[status as keyof typeof stats.byStatus];
      });
    }

    res.json(allStats);
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

