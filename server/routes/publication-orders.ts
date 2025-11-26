/**
 * Publication Orders Routes
 * 
 * API endpoints for publications to view and manage their insertion orders
 */

import { Router, Request, Response } from 'express';
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

    // Get orders for this publication
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
    const orders = await insertionOrderService.getOrdersForPublication(
      parseInt(publicationId)
    );

    // Find the specific order
    const order = orders.find(o => o.campaignId === campaignId);

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
    
    // Include campaign data with inventory for ad specs
    const orderWithCampaignData = {
      ...order,
      creativeAssets: freshCreativeAssets, // Use fresh assets instead of cached ones!
      campaignData: campaign ? {
        selectedInventory: campaign.selectedInventory,
        timeline: campaign.timeline,
        objectives: campaign.objectives,
        basicInfo: campaign.basicInfo
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

    // TODO: Send email notification to hub

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

