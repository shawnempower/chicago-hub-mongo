/**
 * Creative Assets Routes
 * 
 * API endpoints for uploading and managing creative assets
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/authenticate';
import { creativesService } from '../../src/services/creativesService';
import { fileStorage } from '../storage/fileStorage';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max (supports large ZIP files)
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, ZIP files, audio files, text files, and common design files
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/tiff', // Print ads
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/postscript', // AI files
      'image/vnd.adobe.photoshop', // PSD files
      // Audio files (for radio/podcast ads)
      'audio/mpeg', // MP3
      'audio/wav',
      'audio/x-wav',
      'audio/mp4', // M4A
      // Text/document files (live reads, scripts, newsletter content)
      'text/plain', // TXT
      'text/html', // HTML
      'application/octet-stream' // Generic binary (for various design files)
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(ai|psd|indd|eps)$/i)) {
      cb(null, true);
    } else {
      cb(null, true); // Allow all for now, validation happens server-side
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/creative-assets/upload
 * Upload a creative asset
 */
router.post('/upload', upload.single('file'), async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get metadata from request
    const {
      campaignId,
      packageId,
      insertionOrderId,
      publicationId,
      placementId,
      assetType,
      description,
      tags,
      specifications,
      suggestedStandardId,
      specGroupId
    } = req.body;
    
    // Parse placements array if provided (direct placement links for publication order lookup)
    let placements;
    if (req.body.placements) {
      try {
        placements = typeof req.body.placements === 'string'
          ? JSON.parse(req.body.placements)
          : req.body.placements;
      } catch (e) {
        console.warn('Failed to parse placements:', e);
      }
    }

    // Parse specifications if provided as string
    let parsedSpecs;
    if (specifications) {
      try {
        parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
      } catch (e) {
        console.warn('Failed to parse specifications:', e);
      }
    }
    
    // Parse detected specs if provided
    let detectedSpecs;
    if (req.body.detectedSpecs) {
      try {
        detectedSpecs = typeof req.body.detectedSpecs === 'string'
          ? JSON.parse(req.body.detectedSpecs)
          : req.body.detectedSpecs;
      } catch (e) {
        console.warn('Failed to parse detected specs:', e);
      }
    }

    // Parse digital ad properties if provided (for website, newsletter, streaming placements)
    let digitalAdProperties;
    if (req.body.digitalAdProperties) {
      try {
        digitalAdProperties = typeof req.body.digitalAdProperties === 'string'
          ? JSON.parse(req.body.digitalAdProperties)
          : req.body.digitalAdProperties;
      } catch (e) {
        console.warn('Failed to parse digital ad properties:', e);
      }
    }

    // Calculate content hash for deduplication
    const contentHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Note: We don't block duplicate uploads - users may want to re-upload the same file
    // to update it or assign it to different spec groups. The contentHash is still stored
    // for informational purposes and potential future cleanup.

    // Determine category and path for S3 storage
    const category = campaignId ? 'creative-assets/campaigns' : packageId ? 'creative-assets/packages' : 'creative-assets/insertion-orders';
    const subPath = campaignId || packageId || insertionOrderId;

    // Upload file to storage (uses S3 if configured)
    const uploadResult = await fileStorage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      { category, subPath }
    );

    if (!uploadResult.success) {
      return res.status(400).json({ error: uploadResult.error });
    }

    // Get user info for uploader name
    const userProfile = await userProfilesService.getByUserId(userId);
    const uploaderName = userProfile 
      ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() 
      : undefined;

    // Soft-delete any existing assets for this spec group to prevent duplicates
    // When a user re-uploads to the same spec group, the old asset should be replaced
    if (specGroupId && campaignId) {
      try {
        const { getDatabase } = await import('../../src/integrations/mongodb/client');
        const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
        const db = getDatabase();
        
        const deleteResult = await db.collection(COLLECTIONS.CREATIVE_ASSETS || 'creative_assets').updateMany(
          {
            'associations.campaignId': campaignId,
            'associations.specGroupId': specGroupId,
            deletedAt: { $exists: false }
          },
          { $set: { deletedAt: new Date(), deletedBy: userId } }
        );
        
        if (deleteResult.modifiedCount > 0) {
          console.log(`🗑️ Soft-deleted ${deleteResult.modifiedCount} existing asset(s) for spec group ${specGroupId} before re-upload`);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up existing assets:', cleanupError);
        // Don't fail the upload if cleanup fails
      }
    }

    // Create asset record with specifications and detected specs
    const asset = await creativesService.create({
      metadata: {
        fileName: uploadResult.fileName,
        originalFileName: uploadResult.originalFileName,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        fileExtension: uploadResult.fileExtension,
        fileUrl: uploadResult.fileUrl,
        storagePath: uploadResult.storagePath,
        storageProvider: uploadResult.storageProvider,
        assetType: assetType || 'placement',
        description: parsedSpecs?.placementName || description,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined,
        // Store detected specs
        detectedDimensions: detectedSpecs?.dimensions,
        detectedColorSpace: detectedSpecs?.colorSpace,
        detectedDPI: detectedSpecs?.estimatedDPI,
        // Store standard ID and spec group ID for matching
        suggestedStandardId,
        specGroupId,
        // Store content hash for deduplication
        contentHash
      },
      associations: {
        campaignId,
        packageId,
        insertionOrderId,
        publicationId: publicationId ? parseInt(publicationId) : (parsedSpecs?.publicationId ? parseInt(parsedSpecs.publicationId) : undefined),
        placementId,
        channel: parsedSpecs?.channel,
        // Direct placement links for publication order lookup
        placements: placements || undefined,
        specGroupId: specGroupId || undefined
      },
      // Store specifications with the asset
      specifications: parsedSpecs ? {
        placementName: parsedSpecs.placementName,
        publicationName: parsedSpecs.publicationName,
        channel: parsedSpecs.channel,
        dimensions: parsedSpecs.dimensions,
        fileFormats: parsedSpecs.fileFormats,
        maxFileSize: parsedSpecs.maxFileSize,
        colorSpace: parsedSpecs.colorSpace,
        resolution: parsedSpecs.resolution,
        additionalRequirements: parsedSpecs.additionalRequirements,
        // Store parsed width/height for script generation
        width: parsedSpecs.dimensions ? parseInt(parsedSpecs.dimensions.split('x')[0]) : undefined,
        height: parsedSpecs.dimensions ? parseInt(parsedSpecs.dimensions.split('x')[1]) : undefined
      } : undefined,
      // Digital ad properties for tracking scripts (website, newsletter, streaming)
      digitalAdProperties: digitalAdProperties ? {
        clickUrl: digitalAdProperties.clickUrl,
        altText: digitalAdProperties.altText,
        headline: digitalAdProperties.headline,
        body: digitalAdProperties.body,
        ctaText: digitalAdProperties.ctaText
      } : undefined,
      uploadInfo: {
        uploadedAt: new Date(),
        uploadedBy: userId,
        uploaderName,
        uploadSource: 'web'
      },
      status: 'pending'
    });

    // Auto-generate tracking scripts for digital assets
    // Scripts are generated for ALL orders in the campaign when an asset is uploaded
    if (campaignId) {
      try {
        const { generateScriptsForAsset } = await import('../../src/services/trackingScriptService');
        console.log(`🔄 Auto-generating tracking scripts for asset: ${uploadResult.originalFileName} (campaign: ${campaignId})`);
        
        const scriptResult = await generateScriptsForAsset({
          ...asset,
          fileUrl: uploadResult.fileUrl,
          fileType: uploadResult.fileType,
          originalFilename: uploadResult.originalFileName
        } as any);
        
        if (scriptResult.scriptsGenerated > 0) {
          console.log(`✅ Auto-generated ${scriptResult.scriptsGenerated} tracking scripts for "${uploadResult.originalFileName}"`);
        } else if (scriptResult.error) {
          console.warn(`⚠️ Script generation returned error for "${uploadResult.originalFileName}": ${scriptResult.error}`);
        } else {
          console.log(`ℹ️ No scripts generated for "${uploadResult.originalFileName}" - may be non-digital asset or no orders found`);
        }
      } catch (scriptError) {
        console.error('❌ Error auto-generating tracking scripts:', scriptError);
        // Don't fail the upload, just log the error
      }

      // Check if this upload completes any orders' assets and send notifications
      try {
        const { insertionOrderService } = await import('../../src/services/insertionOrderService');
        const orders = await insertionOrderService.getOrdersForCampaign(campaignId);
        
        for (const order of orders) {
          // Check fresh asset status for each order
          const freshStatus = await insertionOrderService.loadFreshAssetsForOrder(
            order.campaignId,
            order.publicationId
          );
          
          // If assets just became ready, send notification
          if (freshStatus.assetsJustBecameReady) {
            console.log(`📧 Assets just completed for order: ${order.publicationName} - sending notification`);
            
            try {
              // Get publication contact email
              const { getDatabase } = await import('../../src/integrations/mongodb/client');
              const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
              const db = getDatabase();
              
              // Find publication to get contact info
              const publication = await db.collection(COLLECTIONS.PUBLICATIONS).findOne({
                publicationId: order.publicationId
              });
              
              // Find users with access to this publication
              const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
                'publications.publicationId': order.publicationId
              }).toArray();
              
              // Get user emails from permissions
              const userIds = permissions.map((p: any) => p.userId);
              
              if (userIds.length > 0) {
                const { emailService } = await import('../emailService');
                
                if (emailService) {
                  // Get campaign for advertiser name
                  const campaign = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
                    campaignId: order.campaignId
                  });
                  
                  // Send email to each user with publication access
                  const { ObjectId } = await import('mongodb');
                  for (const userId of userIds) {
                    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
                    const user = await db.collection(COLLECTIONS.USERS).findOne({
                      _id: userIdObj
                    });
                    
                    if (user?.email) {
                      const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`;
                      
                      // Send email notification
                      await emailService.sendAssetsReadyEmail({
                        recipientEmail: user.email,
                        recipientName: user.firstName,
                        publicationName: order.publicationName,
                        campaignName: order.campaignName,
                        advertiserName: campaign?.basicInfo?.advertiserName,
                        assetCount: freshStatus.assetStatus.placementsWithAssets,
                        orderUrl,
                        hubName: campaign?.hubName
                      });

                      // Create in-app notification
                      const { notifyAssetsReady } = await import('../../src/services/notificationService');
                      await notifyAssetsReady({
                        userId: userId.toString(),
                        publicationId: order.publicationId,
                        campaignId: order.campaignId,
                        campaignName: order.campaignName,
                        orderId: order._id?.toString() || '',
                        assetCount: freshStatus.assetStatus.placementsWithAssets
                      });

                      console.log(`✅ Sent assets ready email + notification to ${user.email} for ${order.publicationName}`);
                    }
                  }
                }
              }
            } catch (notifyError) {
              console.error('Error sending assets ready notification:', notifyError);
              // Don't fail the upload for notification errors
            }
          }
        }
      } catch (orderError) {
        console.error('Error checking order asset status:', orderError);
        // Don't fail the upload for notification errors
      }
    }

    res.json({
      success: true,
      asset,
      scriptsGenerated: true // Indicate that scripts were processed
    });
  } catch (error) {
    console.error('Error uploading creative asset:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

/**
 * GET /api/creative-assets
 * List creative assets with filters
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const {
      campaignId,
      packageId,
      insertionOrderId,
      publicationId,
      assetType,
      status,
      limit = 50,
      skip = 0
    } = req.query;

    const filters: any = {};
    if (campaignId) filters.campaignId = campaignId;
    if (packageId) filters.packageId = packageId;
    if (insertionOrderId) filters.insertionOrderId = insertionOrderId;
    if (publicationId) filters.publicationId = parseInt(publicationId as string);
    if (assetType) filters.assetType = assetType;
    if (status) filters.status = status;

    const assets = await creativesService.listSummaries(
      filters,
      parseInt(limit as string),
      parseInt(skip as string)
    );

    // Generate fresh signed URLs for S3 assets
    const assetsWithFreshUrls = await Promise.all(
      assets.map(async (asset) => {
        let fileUrl = asset.fileUrl;
        
        // If this is an S3 asset with a storage path, generate a fresh signed URL
        if (asset.storageProvider === 's3' && asset.storagePath) {
          try {
            const freshUrl = await fileStorage.getSignedUrl(asset.storagePath, 86400); // 24 hours
            if (freshUrl) {
              fileUrl = freshUrl;
            }
          } catch (error) {
            console.error('Error generating fresh signed URL for asset:', asset.assetId, error);
            // Keep the old URL as fallback
          }
        }
        
        return {
          ...asset,
          fileUrl
        };
      })
    );

    const total = await creativesService.count(filters);

    res.json({
      assets: assetsWithFreshUrls,
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string)
    });
  } catch (error) {
    console.error('Error listing creative assets:', error);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

/**
 * GET /api/creative-assets/campaign/:campaignId
 * Get all creative assets for a specific campaign
 */
router.get('/campaign/:campaignId', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;

    const filters = { campaignId };
    const assets = await creativesService.list(filters, 1000, 0);

    // Generate fresh signed URLs for S3 assets
    const assetsWithFreshUrls = await Promise.all(
      assets.map(async (asset) => {
        let fileUrl = asset.metadata.fileUrl;
        
        // If this is an S3 asset with a storage path, generate a fresh signed URL
        if (asset.metadata.storageProvider === 's3' && asset.metadata.storagePath) {
          try {
            const freshUrl = await fileStorage.getSignedUrl(asset.metadata.storagePath, 86400); // 24 hours
            if (freshUrl) {
              fileUrl = freshUrl;
            }
          } catch (error) {
            console.error('Error generating fresh signed URL for asset:', asset._id, error);
            // Keep the old URL as fallback
          }
        }
        
        return {
          ...asset,
          metadata: {
            ...asset.metadata,
            fileUrl
          }
        };
      })
    );

    res.json({ 
      assets: assetsWithFreshUrls,
      count: assetsWithFreshUrls.length 
    });
  } catch (error) {
    console.error('Error fetching campaign assets:', error);
    res.status(500).json({ error: 'Failed to fetch campaign assets' });
  }
});

/**
 * GET /api/creative-assets/:id
 * Get a specific creative asset
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await creativesService.getById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Generate fresh signed URL for S3 assets
    let fileUrl = asset.metadata.fileUrl;
    if (asset.metadata.storageProvider === 's3' && asset.metadata.storagePath) {
      try {
        const freshUrl = await fileStorage.getSignedUrl(asset.metadata.storagePath, 86400); // 24 hours
        if (freshUrl) {
          fileUrl = freshUrl;
        }
      } catch (error) {
        console.error('Error generating fresh signed URL for asset:', asset._id, error);
        // Keep the old URL as fallback
      }
    }

    res.json({ 
      asset: {
        ...asset,
        metadata: {
          ...asset.metadata,
          fileUrl
        }
      }
    });
  } catch (error) {
    console.error('Error fetching creative asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

/**
 * GET /api/creative-assets/:id/download-url
 * Get a signed download URL with Content-Disposition: attachment
 * Returns the URL so frontend can redirect to it
 */
router.get('/:id/download-url', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await creativesService.getById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Record download
    await creativesService.recordDownload(id);

    // Generate fresh signed URL for S3 assets with Content-Disposition: attachment
    // This forces the browser to download instead of playing audio/video files
    let downloadUrl = asset.metadata.fileUrl;
    if (asset.metadata.storageProvider === 's3' && asset.metadata.storagePath) {
      try {
        const fileName = asset.metadata.fileName || asset.metadata.originalFileName || 'download';
        const freshUrl = await fileStorage.getSignedDownloadUrl(asset.metadata.storagePath, fileName, 3600);
        if (freshUrl) {
          downloadUrl = freshUrl;
        }
      } catch (error) {
        console.error('Error generating fresh signed URL for download:', asset._id, error);
        // Keep the old URL as fallback
      }
    }

    res.json({ downloadUrl, fileName: asset.metadata.fileName || asset.metadata.originalFileName });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

/**
 * GET /api/creative-assets/:id/download
 * Download a creative asset (redirects to signed URL with Content-Disposition)
 */
router.get('/:id/download', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await creativesService.getById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Record download
    await creativesService.recordDownload(id);

    // Generate fresh signed URL for S3 assets with Content-Disposition: attachment
    // This forces the browser to download instead of playing audio/video files
    let downloadUrl = asset.metadata.fileUrl;
    if (asset.metadata.storageProvider === 's3' && asset.metadata.storagePath) {
      try {
        const fileName = asset.metadata.fileName || asset.metadata.originalFileName || 'download';
        const freshUrl = await fileStorage.getSignedDownloadUrl(asset.metadata.storagePath, fileName, 3600);
        if (freshUrl) {
          downloadUrl = freshUrl;
        }
      } catch (error) {
        console.error('Error generating fresh signed URL for download:', asset._id, error);
        // Keep the old URL as fallback
      }
    }

    // Redirect to file URL or serve file
    // For local storage, we'll redirect to the static file route
    // For S3, we redirect to the fresh signed URL with Content-Disposition: attachment
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Error downloading creative asset:', error);
    res.status(500).json({ error: 'Failed to download asset' });
  }
});

/**
 * PUT /api/creative-assets/:id
 * Update a creative asset
 */
router.put('/:id', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Check if user is admin, uploader, or hub user with campaign access
    const asset = await creativesService.getById(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const userProfile = await userProfilesService.getByUserId(userId);
    const isAdmin = userProfile?.isAdmin || req.user.isAdmin === true || req.user.role === 'admin';
    const isUploader = asset.uploadInfo.uploadedBy === userId;

    let hasHubAccess = false;
    if (!isAdmin && !isUploader && asset.associations?.campaignId) {
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
      const db = getDatabase();
      const campaign = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
        campaignId: asset.associations.campaignId
      });
      if (campaign) {
        const assignedHubIds = req.user.permissions?.assignedHubIds || [];
        const campaignHubId = campaign.hubId || campaign.hubInfo?.hubId;
        hasHubAccess = !!(campaignHubId && assignedHubIds.includes(campaignHubId));
      }
    }

    if (!isAdmin && !isUploader && !hasHubAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Detect if click URL is changing (for downstream updates)
    const oldClickUrl = asset.digitalAdProperties?.clickUrl || '';
    const newClickUrl = updates.digitalAdProperties?.clickUrl || '';
    const clickUrlChanged = updates.digitalAdProperties !== undefined && newClickUrl !== oldClickUrl;

    // Detect if placement assignments are being updated (dot-notation from frontend)
    const placementsChanged = updates['associations.placements'] !== undefined;

    // Update asset
    const updatedAsset = await creativesService.update(id, updates);

    // If click URL changed, update ALL other digital assets in the same campaign that
    // don't already have the new URL. This is broader than just matching the old URL —
    // it catches assets with any wrong URL (e.g., multiple different Dropbox links).
    // Non-digital assets (print, radio, podcast) are excluded since they don't use click URLs.
    let siblingAssetsUpdated = 0;
    if (clickUrlChanged && updatedAsset?.associations?.campaignId) {
      try {
        const { getDatabase } = await import('../../src/integrations/mongodb/client');
        const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
        const db = getDatabase();
        const campaignId = updatedAsset.associations.campaignId;

        // Non-digital spec group prefixes that should NOT be cascade-updated
        const nonDigitalPrefixes = /^(print|radio|podcast)/i;

        // Find all other digital assets in the campaign that don't have the new click URL
        const updateResult = await db.collection(COLLECTIONS.CREATIVE_ASSETS || 'creative_assets').updateMany(
          {
            'associations.campaignId': campaignId,
            'digitalAdProperties.clickUrl': { $nin: [newClickUrl, null] }, // has a URL, but not the correct one
            'associations.specGroupId': { $not: nonDigitalPrefixes }, // exclude print/radio/podcast
            assetId: { $ne: updatedAsset.assetId }, // exclude the one we already updated
            deletedAt: { $exists: false }
          },
          {
            $set: { 'digitalAdProperties.clickUrl': newClickUrl }
          }
        );
        siblingAssetsUpdated = updateResult.modifiedCount;
        
        if (siblingAssetsUpdated > 0) {
          console.log(`🔄 Also updated click URL on ${siblingAssetsUpdated} other assets in campaign ${campaignId}`);
        }
      } catch (siblingError) {
        console.error('Error updating sibling assets:', siblingError);
        // Don't fail the request
      }
    }

    // If click URL changed, regenerate tracking scripts for all affected orders
    if (clickUrlChanged && updatedAsset?.associations?.campaignId) {
      try {
        const { refreshScriptsForOrder } = await import('../../src/services/trackingScriptService');
        const { insertionOrderService } = await import('../../src/services/insertionOrderService');
        
        const campaignId = updatedAsset.associations.campaignId;
        const orders = await insertionOrderService.getOrdersForCampaign(campaignId);
        
        let scriptsRegenerated = 0;
        for (const order of orders) {
          try {
            const result = await refreshScriptsForOrder(campaignId, order.publicationId);
            scriptsRegenerated += result.scriptsGenerated;
          } catch (regenError) {
            console.error(`Error regenerating scripts for order ${order.publicationId}:`, regenError);
          }
        }
        
        console.log(`🔄 Regenerated ${scriptsRegenerated} tracking scripts after click URL change (campaign: ${campaignId})`);
      } catch (regenError) {
        console.error('Error regenerating tracking scripts:', regenError);
        // Don't fail the request if script regeneration fails
      }
    }

    // If placement assignments changed, generate scripts for the newly assigned placements
    // (existing scripts are skipped via duplicate check in generateScriptsForAsset)
    if (placementsChanged && updatedAsset) {
      try {
        const { generateScriptsForAsset } = await import('../../src/services/trackingScriptService');
        const result = await generateScriptsForAsset(updatedAsset);
        if (result.scriptsGenerated > 0) {
          console.log(`Generated ${result.scriptsGenerated} tracking scripts after placement assignment update`);
        }
      } catch (scriptError) {
        console.error('Error generating scripts after placement update:', scriptError);
      }
    }

    // Send notification to publication users if this asset is associated with orders
    // Only notify publications that have accepted/confirmed orders
    try {
      if (updatedAsset?.associations?.campaignId) {
        const { getDatabase } = await import('../../src/integrations/mongodb/client');
        const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
        const { insertionOrderService } = await import('../../src/services/insertionOrderService');
        
        const db = getDatabase();
        const campaignId = updatedAsset.associations.campaignId;
        
        // Get all orders for this campaign
        const orders = await insertionOrderService.getOrdersForCampaign(campaignId);

        // Get placement names from the asset for context
        const assetPlacements = updatedAsset.associations?.placements || [];
        
        for (const order of orders) {
          // Only notify for orders that have been accepted (confirmed status)
          // This means the publication has accepted all placements.
          // Orders in draft or sent status are not yet accepted.
          if (order.status !== 'confirmed') {
            continue;
          }

          // Find placement names relevant to this publication
          const pubPlacementNames = assetPlacements
            .filter((p: any) => p.publicationId === order.publicationId)
            .map((p: any) => p.placementName)
            .filter(Boolean);

          // Find users with access to this publication
          const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
            'publications.publicationId': order.publicationId
          }).toArray();
          
          if (clickUrlChanged) {
            // Use specific click URL changed notification
            const { notifyClickUrlChanged } = await import('../../src/services/notificationService');
            for (const perm of permissions) {
              await notifyClickUrlChanged({
                userId: perm.userId,
                publicationId: order.publicationId,
                campaignId,
                campaignName: order.campaignName,
                orderId: order._id?.toString() || '',
                assetName: updatedAsset.metadata?.fileName || 'Creative Asset',
                placementNames: pubPlacementNames,
                oldUrl: oldClickUrl,
                newUrl: newClickUrl,
              });
            }
          } else {
            // Generic asset updated notification
            const { notifyAssetUpdated } = await import('../../src/services/notificationService');
            for (const perm of permissions) {
              await notifyAssetUpdated({
                userId: perm.userId,
                publicationId: order.publicationId,
                campaignId,
                campaignName: order.campaignName,
                orderId: order._id?.toString() || '',
                assetName: updatedAsset.metadata?.fileName || 'Creative Asset'
              });
            }
          }
        }
        
        console.log(`📧 Sent asset updated notifications for confirmed orders in campaign ${campaignId}`);
      }
    } catch (notifyError) {
      console.error('Error sending asset updated notifications:', notifyError);
      // Don't fail the request if notifications fail
    }

    res.json({ 
      success: true, 
      asset: updatedAsset,
      clickUrlChanged,
      siblingAssetsUpdated: siblingAssetsUpdated || 0
    });
  } catch (error) {
    console.error('Error updating creative asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

/**
 * PUT /api/creative-assets/:id/status
 * Update asset status (approve/reject)
 */
router.put('/:id/status', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if user is admin
    const userProfile = await userProfilesService.getByUserId(userId);
    if (!userProfile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updatedAsset = await creativesService.updateStatus(id, status, userId, reason);

    if (!updatedAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ success: true, asset: updatedAsset });
  } catch (error) {
    console.error('Error updating asset status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/creative-assets/:id/comments
 * Add a comment to an asset
 */
router.post('/:id/comments', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    // Get user info
    const userProfile = await userProfilesService.getByUserId(userId);
    const userName = userProfile 
      ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() 
      : 'Unknown User';

    const updatedAsset = await creativesService.addComment(id, userId, userName, comment);

    if (!updatedAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ success: true, asset: updatedAsset });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * DELETE /api/creative-assets/:id
 * Delete a creative asset (soft delete)
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if user is admin
    const userProfile = await userProfilesService.getByUserId(userId);
    if (!userProfile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const success = await creativesService.delete(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    console.error('Error deleting creative asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

/**
 * POST /api/creative-assets/upload-bulk (ZIP file)
 * Upload multiple assets via ZIP file
 * TODO: Implement ZIP extraction and bulk upload
 * 
 * Expected format:
 * - ZIP file containing multiple assets
 * - Optional mapping file (JSON) to map files to placements
 * - Extracts all files and uploads individually
 */
router.post('/upload-bulk', upload.single('file'), async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if it's a ZIP file
    if (!file.originalname.endsWith('.zip') && file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
      return res.status(400).json({ error: 'File must be a ZIP archive' });
    }

    // TODO: Implement ZIP extraction
    // For now, just upload the ZIP as-is
    res.status(501).json({ 
      error: 'ZIP extraction not yet implemented',
      message: 'Please upload individual files for now. ZIP extraction coming soon!'
    });

    // Future implementation:
    // 1. Extract ZIP using adm-zip or jszip
    // 2. Parse mapping file if provided
    // 3. Upload each file individually
    // 4. Return array of uploaded assets
    
  } catch (error) {
    console.error('Error uploading bulk assets:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});

export default router;

