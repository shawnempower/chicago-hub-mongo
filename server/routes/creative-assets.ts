/**
 * Creative Assets Routes
 * 
 * API endpoints for uploading and managing creative assets
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
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
    // Accept images, PDFs, ZIP files, and common design files
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/postscript', // AI files
      'image/vnd.adobe.photoshop', // PSD files
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
        specGroupId
      },
      associations: {
        campaignId,
        packageId,
        insertionOrderId,
        publicationId: publicationId ? parseInt(publicationId) : (parsedSpecs?.publicationId ? parseInt(parsedSpecs.publicationId) : undefined),
        placementId
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
        additionalRequirements: parsedSpecs.additionalRequirements
      } : undefined,
      uploadInfo: {
        uploadedAt: new Date(),
        uploadedBy: userId,
        uploaderName,
        uploadSource: 'web'
      },
      status: 'pending'
    });

    res.json({
      success: true,
      asset
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
 * GET /api/creative-assets/:id/download
 * Download a creative asset
 */
router.get('/:id/download', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await creativesService.getById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Record download
    await creativesService.recordDownload(id);

    // Generate fresh signed URL for S3 assets
    let downloadUrl = asset.metadata.fileUrl;
    if (asset.metadata.storageProvider === 's3' && asset.metadata.storagePath) {
      try {
        const freshUrl = await fileStorage.getSignedUrl(asset.metadata.storagePath, 3600); // 1 hour for downloads
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
    // For S3, we redirect to the fresh signed URL
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

    // Check if user is admin or the uploader
    const asset = await creativesService.getById(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const userProfile = await userProfilesService.getByUserId(userId);
    const isAdmin = userProfile?.isAdmin;
    const isUploader = asset.uploadInfo.uploadedBy === userId;

    if (!isAdmin && !isUploader) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update asset
    const updatedAsset = await creativesService.update(id, updates);

    res.json({ success: true, asset: updatedAsset });
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

