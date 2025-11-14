import { Router, Response } from 'express';
import { publicationsService, userProfilesService, publicationFilesService } from '../../src/integrations/mongodb/allServices';
import { HubsService } from '../../src/integrations/mongodb/hubService';
import { authenticateToken } from '../middleware/authenticate';
import { s3Service } from '../s3Service';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

/**
 * Publications Routes
 * 
 * These endpoints handle publication data, including listing, creation,
 * updates, and retrieving categories/types.
 */

// Get all publications with optional filters (public)
router.get('/', async (req, res) => {
  try {
    const { geographicCoverage, publicationType, contentType, verificationStatus } = req.query;
    
    const filters: any = {};
    if (geographicCoverage) filters.geographicCoverage = geographicCoverage as string;
    if (publicationType) filters.publicationType = publicationType as string;
    if (contentType) filters.contentType = contentType as string;
    if (verificationStatus) filters.verificationStatus = verificationStatus as string;

    // Check if service is initialized
    if (!publicationsService) {
      console.error('PublicationsService is not initialized');
      return res.status(500).json({ error: 'Publications service not initialized' });
    }

    const publications = await publicationsService.getAll(filters);
    res.json(publications);
  } catch (error) {
    console.error('Error fetching publications:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to fetch publications',
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch publications' });
    }
  }
});

// Get publication categories (public)
router.get('/categories', async (req, res) => {
  try {
    const categories = await publicationsService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching publication categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get publication types (public)
router.get('/types', async (req, res) => {
  try {
    const types = await publicationsService.getTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching publication types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
});

// Get unassigned publications (must come BEFORE /:id route)
router.get('/unassigned', async (req, res) => {
  try {
    const publications = await HubsService.getUnassignedPublications();
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching unassigned publications:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned publications' });
  }
});

// Get publication by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const publication = await publicationsService.getById(id);
    
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json(publication);
  } catch (error) {
    console.error('Error fetching publication:', error);
    res.status(500).json({ error: 'Failed to fetch publication' });
  }
});

// Create new publication (admin only)
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const publication = await publicationsService.create(req.body);
    res.status(201).json(publication);
  } catch (error) {
    console.error('Error creating publication:', error);
    res.status(500).json({ error: 'Failed to create publication' });
  }
});

// Update publication (admin only)
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const publication = await publicationsService.update(id, req.body);
    
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json(publication);
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({ error: 'Failed to update publication' });
  }
});

// Delete publication (admin only)
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const success = await publicationsService.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ error: 'Failed to delete publication' });
  }
});

// Import publications from JSON/CSV (admin only)
router.post('/import', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publications, overwrite = false } = req.body;

    if (!Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({ error: 'No publications provided' });
    }

    // Import publications
    const results = await publicationsService.bulkImport(publications, overwrite);
    res.json(results);
  } catch (error) {
    console.error('Error importing publications:', error);
    res.status(500).json({ error: 'Failed to import publications' });
  }
});

// Preview import without saving (admin only)
router.post('/import-preview', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { publications } = req.body;

    if (!Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({ error: 'No publications provided for preview' });
    }

    // Validate publications
    const preview = await publicationsService.previewImport(publications);
    res.json(preview);
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(500).json({ error: 'Failed to preview import' });
  }
});

// Get files for a publication
router.get('/:publicationId/files', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    
    const files = await publicationFilesService.getByPublicationId(publicationId);
    
    // Return files array directly to match frontend expectations
    res.json(files || []);
  } catch (error) {
    console.error('Error fetching publication files:', error);
    res.status(500).json({ error: 'Failed to fetch publication files' });
  }
});

// Get single file by ID
router.get('/:publicationId/files/:fileId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { fileId } = req.params;
    
    const file = await publicationFilesService.getById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error fetching publication file:', error);
    res.status(500).json({ error: 'Failed to fetch publication file' });
  }
});

// Get file download URL
router.get('/:publicationId/files/:fileId/download', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId, fileId } = req.params;
    
    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }
    
    // Get file
    const file = await publicationFilesService.getById(fileId);
    if (!file || file.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Generate signed URL for S3 files
    const s3ServiceInstance = s3Service();
    if (s3ServiceInstance && file.s3Key) {
      try {
        const downloadUrl = await s3ServiceInstance.getSignedUrl(file.s3Key, 3600); // 1 hour expiry
        return res.json({ downloadUrl });
      } catch (error) {
        console.error('Error generating signed URL:', error);
        return res.status(500).json({ error: 'Failed to generate download URL' });
      }
    }
    
    // If no S3 service or no s3Key, return the stored URL directly
    if (file.fileUrl) {
      return res.json({ downloadUrl: file.fileUrl });
    }
    
    return res.status(404).json({ error: 'File URL not available' });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// Upload a new file to publication
router.post('/:publicationId/files', authenticateToken, upload.single('file'), async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    const { fileType, description, tags, isPublic } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!fileType) {
      return res.status(400).json({ error: 'File type is required' });
    }

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Upload file to S3
    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(500).json({ error: 'File storage service not available' });
    }

    const uploadResult = await s3ServiceInstance.uploadFile({
      userId: req.user.id,
      folder: 'uploads',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      isPublic: isPublic === 'true'
    });

    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error || 'Failed to upload file' });
    }

    // Create file record
    const fileData = {
      publicationId: publication._id!.toString(),
      fileName: req.file.originalname,
      originalFileName: req.file.originalname,
      fileType,
      description: description || undefined,
      s3Key: uploadResult.key!,
      s3Bucket: process.env.AWS_S3_BUCKET || '',
      fileUrl: uploadResult.url,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      tags: tags ? JSON.parse(tags) : undefined,
      isPublic: isPublic === 'true'
    };

    const createdFile = await publicationFilesService.create(fileData);
    res.status(201).json(createdFile);
  } catch (error) {
    console.error('Error uploading publication file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Update file metadata
router.put('/:publicationId/files/:fileId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId, fileId } = req.params;
    const { fileName, description, tags, isPublic } = req.body;

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Verify file exists and belongs to publication
    const existingFile = await publicationFilesService.getById(fileId);
    if (!existingFile || existingFile.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update file metadata
    const updates: any = {};
    if (fileName) updates.fileName = fileName;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const updatedFile = await publicationFilesService.update(fileId, updates);
    res.json(updatedFile);
  } catch (error) {
    console.error('Error updating publication file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file
router.delete('/:publicationId/files/:fileId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId, fileId } = req.params;

    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify publication exists
    const publication = await publicationsService.getById(publicationId);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Verify file exists and belongs to publication
    const existingFile = await publicationFilesService.getById(fileId);
    if (!existingFile || existingFile.publicationId !== publication._id!.toString()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3
    const s3ServiceInstance = s3Service();
    if (s3ServiceInstance && existingFile.s3Key) {
      try {
        await s3ServiceInstance.deleteFile(existingFile.s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }

    // Delete file record
    await publicationFilesService.delete(fileId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting publication file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;

