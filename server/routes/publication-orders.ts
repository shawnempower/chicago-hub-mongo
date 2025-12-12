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
      // Regular publication user - get their assigned publications
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
        console.log('User does not have access to publication:', requestedPubId);
        return res.status(403).json({ error: 'Access denied to this publication' });
      }
    }

    // Get orders for the publications
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const allOrders = [];
    
    for (const pubId of publicationsToQuery) {
      const orders = await insertionOrderService.getOrdersForPublication(
        parseInt(pubId),
        filters
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
          
          // Generate spec key for matching
          const reqSpecKey = reqDimensions ? 
            `${reqChannel}::dim:${reqDimensions}` : 
            `${reqChannel}::general`;
          
          // Find matching assets
          const matchingAssets = campaignAssets.filter((asset: any) => {
            // Primary: Match by spec group ID
            if (asset.metadata?.specGroupId) {
              return asset.metadata.specGroupId === reqSpecKey;
            }
            
            // Fallback: Match by channel and dimensions
            const assetChannel = asset.specifications?.channel || 'general';
            const assetDimensions = asset.metadata?.detectedDimensions || asset.specifications?.dimensions;
            
            return assetChannel === reqChannel && assetDimensions === reqDimensions;
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

    res.json({ order: orderWithCampaignData });
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

    res.json({
      success: true,
      assets: result.assets,
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
        
        // Find hub admins from permissions
        const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
          'hubAccess.hubId': order.hubId,
          role: { $in: ['admin', 'hub_user'] }
        }).toArray();
        
        // Also find system admins from user_profiles
        const systemAdmins = await db.collection(COLLECTIONS.USER_PROFILES).find({
          isAdmin: true
        }).toArray();
        
        // Combine user IDs, avoiding duplicates
        const notifyUserIds = new Set<string>();
        hubPermissions.forEach(p => notifyUserIds.add(p.userId));
        systemAdmins.forEach(a => notifyUserIds.add(a.userId));
        
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
                campaignUrl
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

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
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

    // Add message
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
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
          
          // Find users with publication access
          const permissions = await getDatabase().collection(COLLECTIONS.USER_PERMISSIONS).find({
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
              const user = await getDatabase().collection(COLLECTIONS.USERS).findOne({ _id: perm.userId });
              if (user?.email) {
                // Use generic notification email
                // Could add a sendMessageNotificationEmail method to emailService later
                console.log(`📧 Would send message notification email to ${user.email}`);
              }
            }
          }
        } else {
          // Publication sent message -> notify hub admins
          const { getDatabase } = await import('../../src/integrations/mongodb/client');
          const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
          const db = getDatabase();
          
          // Find hub admin users from permissions
          const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
            'hubAccess.hubId': order.hubId,
            role: { $in: ['admin', 'hub_user'] }
          }).toArray();
          
          // Also find system admins from user_profiles
          const systemAdmins = await db.collection(COLLECTIONS.USER_PROFILES).find({
            isAdmin: true
          }).toArray();
          
          // Combine user IDs, avoiding duplicates
          const notifyUserIds = new Set<string>();
          hubPermissions.forEach(p => notifyUserIds.add(p.userId));
          systemAdmins.forEach(a => notifyUserIds.add(a.userId));
          
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
        
        // Find hub admins from permissions
        const hubPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
          'hubAccess.hubId': order.hubId,
          role: { $in: ['admin', 'hub_user'] }
        }).toArray();
        
        // Also find system admins from user_profiles
        const systemAdmins = await db.collection(COLLECTIONS.USER_PROFILES).find({
          isAdmin: true
        }).toArray();
        
        // Combine user IDs, avoiding duplicates
        const notifyUserIds = new Set<string>();
        hubPermissions.forEach(p => notifyUserIds.add(p.userId));
        systemAdmins.forEach(a => notifyUserIds.add(a.userId));
        
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
                  campaignUrl
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

    res.json({ success: true, orderConfirmed: result.orderConfirmed });
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

