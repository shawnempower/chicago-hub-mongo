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
    fileSize: 100 * 1024 * 1024 // 100MB max
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
      assetType,
      description,
      tags
    } = req.body;

    const category = campaignId ? 'campaigns' : packageId ? 'packages' : 'insertion-orders';
    const subPath = campaignId || packageId || insertionOrderId;

    // Upload file to storage
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

    // Create asset record
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
        assetType: assetType || 'other',
        description,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined
      },
      associations: {
        campaignId,
        packageId,
        insertionOrderId,
        publicationId: publicationId ? parseInt(publicationId) : undefined
      },
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

    const total = await creativesService.count(filters);

    res.json({
      assets,
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

    res.json({ asset });
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

    // Redirect to file URL or serve file
    // For local storage, we'll redirect to the static file route
    // For S3, we'd generate a signed URL
    res.redirect(asset.metadata.fileUrl);
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

export default router;

