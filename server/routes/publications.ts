import { Router, Response } from 'express';
import { publicationsService, userProfilesService, publicationFilesService } from '../../src/integrations/mongodb/allServices';
import { HubsService } from '../../src/integrations/mongodb/hubService';
import { authenticateToken, requirePublicationAccess } from '../middleware/authenticate';
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';
import { s3Service } from '../s3Service';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../../src/integrations/mongodb/client';

const router = Router();

// Field projections for different use cases
const MINIMAL_PROJECTION = {
  _id: 1,
  publicationId: 1,
  hubIds: 1,
  'basicInfo.publicationName': 1
};

const LIST_PROJECTION = {
  _id: 1,
  publicationId: 1,
  hubIds: 1,
  'basicInfo.publicationName': 1,
  'basicInfo.websiteUrl': 1,
  'basicInfo.publicationType': 1,
  'basicInfo.contentType': 1,
  'basicInfo.geographicCoverage': 1,
  'basicInfo.primaryServiceArea': 1,
  'contactInfo.primaryContact': 1,
  'metadata.verificationStatus': 1,
  'metadata.lastUpdated': 1
};

// Full projection returns all fields (no projection applied)

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

// Get all publications with optional filters (requires authentication, filtered by permissions)
// Supports field projection via ?fields=minimal|list|full (default: list for non-admins, full for admins)
// Supports pagination via ?limit=50&cursor=<lastId>
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const { 
      geographicCoverage, 
      publicationType, 
      contentType, 
      verificationStatus,
      fields,
      limit: limitParam,
      cursor
    } = req.query;

    // Check if service is initialized
    if (!publicationsService) {
      console.error('PublicationsService is not initialized');
      return res.status(500).json({ error: 'Publications service not initialized' });
    }

    // Build base query filters
    const query: any = {};
    if (geographicCoverage) query['basicInfo.geographicCoverage'] = geographicCoverage as string;
    if (publicationType) query['basicInfo.publicationType'] = publicationType as string;
    if (contentType) query['basicInfo.contentType'] = contentType as string;
    if (verificationStatus) query['metadata.verificationStatus'] = verificationStatus as string;

    // Check user permissions
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    
    // Get user's assigned publications and hubs for permission filtering
    let actualAssignedHubIds: string[] = [];
    let actualAssignedPublicationIds: string[] = [];
    
    if (!isAdmin) {
      const assignedHubIds = req.user.permissions?.assignedHubIds || [];
      const assignedPublicationIds = req.user.permissions?.assignedPublicationIds || [];
      
      actualAssignedHubIds = assignedHubIds;
      actualAssignedPublicationIds = assignedPublicationIds;
      
      // If user has no permissions in JWT, check the database directly
      if (assignedHubIds.length === 0 && assignedPublicationIds.length === 0) {
        const userPermissions = await permissionsService.getPermissions(req.user.id);
        if (userPermissions) {
          actualAssignedHubIds = userPermissions.hubAccess?.map(h => h.hubId) || [];
          actualAssignedPublicationIds = await permissionsService.getUserPublications(req.user.id);
        }
      }
      
      // Add permission filter to database query (only if user has permissions)
      if (actualAssignedHubIds.length > 0 || actualAssignedPublicationIds.length > 0) {
        const permissionConditions: any[] = [];
        
        // Match by publicationId (as string or number)
        if (actualAssignedPublicationIds.length > 0) {
          const pubIdNumbers = actualAssignedPublicationIds
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));
          
          if (pubIdNumbers.length > 0) {
            permissionConditions.push({ publicationId: { $in: pubIdNumbers } });
          }
          
          // Also check _id field
          const validObjectIds = actualAssignedPublicationIds
            .filter(id => ObjectId.isValid(id))
            .map(id => new ObjectId(id));
          
          if (validObjectIds.length > 0) {
            permissionConditions.push({ _id: { $in: validObjectIds } });
          }
        }
        
        // Match by hubIds
        if (actualAssignedHubIds.length > 0) {
          permissionConditions.push({ hubIds: { $in: actualAssignedHubIds } });
        }
        
        if (permissionConditions.length > 0) {
          query.$or = permissionConditions;
        }
      }
    }

    // Determine field projection based on 'fields' parameter
    // Default: 'list' for better performance, unless explicitly requesting 'full'
    let projection: any = null;
    const fieldsParam = (fields as string)?.toLowerCase();
    
    if (fieldsParam === 'minimal') {
      projection = MINIMAL_PROJECTION;
    } else if (fieldsParam === 'list') {
      projection = LIST_PROJECTION;
    } else if (fieldsParam === 'full') {
      projection = null; // No projection - return all fields
    } else {
      // Default behavior: full for backward compatibility
      projection = null;
    }

    // Parse pagination parameters
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam as string) || 100, 1), 500) : null;
    
    // Add cursor to query if provided (for pagination)
    if (cursor && ObjectId.isValid(cursor as string)) {
      query._id = { ...query._id, $gt: new ObjectId(cursor as string) };
    }

    // Fetch publications with projection and optional pagination
    const publications = await publicationsService.getAllWithOptions({
      query,
      projection,
      limit: limit ? limit + 1 : null, // Fetch one extra to check if more exist
      sort: { 'basicInfo.publicationName': 1 }
    });

    // Handle pagination response
    if (limit) {
      const hasMore = publications.length > limit;
      const data = hasMore ? publications.slice(0, limit) : publications;
      
      return res.json({
        data,
        pagination: {
          hasMore,
          nextCursor: hasMore && data.length > 0 ? data[data.length - 1]._id?.toString() : null,
          count: data.length
        }
      });
    }

    // Non-paginated response (backward compatible)
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

// Duplicate publication (admin only)
router.post('/:id/duplicate', authenticateToken, async (req: any, res: Response) => {
  try {
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { newPublicationId, newName } = req.body;

    if (!newPublicationId || typeof newPublicationId !== 'number') {
      return res.status(400).json({ error: 'newPublicationId is required and must be a number' });
    }
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return res.status(400).json({ error: 'newName is required and must be a non-empty string' });
    }

    const sourceId = Number(req.params.id);
    if (isNaN(sourceId)) {
      return res.status(400).json({ error: 'Invalid source publication ID' });
    }

    const newPublication = await publicationsService.duplicate(sourceId, newPublicationId, newName.trim());
    res.status(201).json(newPublication);
  } catch (error: any) {
    console.error('Error duplicating publication:', error);
    if (error.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: error.message });
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to duplicate publication' });
  }
});

// Update publication (requires publication access)
router.put('/:id', authenticateToken, requirePublicationAccess('id'), async (req: any, res: Response) => {
  try {
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

// Generate or refresh AI profile for a publication using Perplexity
router.post('/:id/generate-ai-profile', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    // Import WebSearchService dynamically to avoid circular deps
    const { WebSearchService } = await import('../services/webSearchService');
    
    if (!WebSearchService.isConfigured()) {
      return res.status(503).json({ error: 'Perplexity API is not configured. Set PERPLEXITY_API_KEY environment variable.' });
    }

    // Get the publication to extract context for the search
    const publication = await publicationsService.getById(id);
    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    const pubName = publication.basicInfo?.publicationName || `Publication ${id}`;
    const currentVersion = publication.aiProfile?.version || 0;

    // Research the publication via Perplexity
    const searchResponse = await WebSearchService.researchPublication(pubName, {
      websiteUrl: publication.basicInfo?.websiteUrl,
      publicationType: publication.basicInfo?.publicationType,
      serviceArea: publication.basicInfo?.primaryServiceArea,
      contentType: publication.basicInfo?.contentType,
    });

    if (!searchResponse.answer) {
      return res.status(502).json({ error: 'No response from Perplexity API' });
    }

    // Parse the structured response into profile sections
    const profileSections = WebSearchService.parsePublicationProfile(searchResponse.answer);

    const aiProfile = {
      summary: profileSections.summary,
      fullProfile: profileSections.fullProfile,
      audienceInsight: profileSections.audienceInsight,
      communityRole: profileSections.communityRole,
      citations: searchResponse.results.map(r => r.url).filter(Boolean),
      generatedAt: new Date(),
      generatedBy: 'perplexity-sonar-pro' as const,
      version: currentVersion + 1,
    };

    // Update the publication document with the new profile
    const updated = await publicationsService.update(id, {
      aiProfile,
      'metadata.lastUpdated': new Date(),
    });

    if (!updated) {
      return res.status(500).json({ error: 'Failed to update publication with AI profile' });
    }

    res.json({
      success: true,
      publicationId: publication.publicationId,
      publicationName: pubName,
      aiProfile,
    });
  } catch (error: any) {
    console.error('Error generating AI profile:', error);
    res.status(500).json({ error: `Failed to generate AI profile: ${error.message}` });
  }
});

// Bulk generate AI profiles for publications that don't have one (admin only)
router.post('/bulk-generate-ai-profiles', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { WebSearchService } = await import('../services/webSearchService');
    
    if (!WebSearchService.isConfigured()) {
      return res.status(503).json({ error: 'Perplexity API is not configured. Set PERPLEXITY_API_KEY environment variable.' });
    }

    const { limit = 10 } = req.body;
    const maxLimit = Math.min(Number(limit) || 10, 50);

    // Query only publications that lack AI profiles, with minimal projection
    const db = getDatabase();
    const pubsWithoutProfile = await db.collection('publications')
      .find({ 
        $or: [
          { 'aiProfile.summary': { $exists: false } },
          { 'aiProfile.summary': null },
          { 'aiProfile.summary': '' },
        ]
      })
      .project({
        _id: 1,
        publicationId: 1,
        'basicInfo.publicationName': 1,
        'basicInfo.websiteUrl': 1,
        'basicInfo.publicationType': 1,
        'basicInfo.primaryServiceArea': 1,
        'basicInfo.contentType': 1,
      })
      .limit(maxLimit)
      .sort({ 'basicInfo.publicationName': 1 })
      .toArray();

    if (pubsWithoutProfile.length === 0) {
      return res.json({ success: true, message: 'All publications already have AI profiles', generated: 0 });
    }

    const results: Array<{ publicationId: number; publicationName: string; success: boolean; error?: string }> = [];

    for (const pub of pubsWithoutProfile) {
      try {
        const pubName = pub.basicInfo?.publicationName || `Publication ${pub.publicationId}`;

        // Rate limit: wait 1 second between requests to avoid API throttling
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const searchResponse = await WebSearchService.researchPublication(pubName, {
          websiteUrl: pub.basicInfo?.websiteUrl,
          publicationType: pub.basicInfo?.publicationType,
          serviceArea: pub.basicInfo?.primaryServiceArea,
          contentType: pub.basicInfo?.contentType,
        });

        if (!searchResponse.answer) {
          results.push({ publicationId: pub.publicationId, publicationName: pubName, success: false, error: 'No response from Perplexity' });
          continue;
        }

        const profileSections = WebSearchService.parsePublicationProfile(searchResponse.answer);

        const aiProfile = {
          summary: profileSections.summary,
          fullProfile: profileSections.fullProfile,
          audienceInsight: profileSections.audienceInsight,
          communityRole: profileSections.communityRole,
          citations: searchResponse.results.map(r => r.url).filter(Boolean),
          generatedAt: new Date(),
          generatedBy: 'perplexity-sonar-pro' as const,
          version: 1,
        };

        const pubId = pub._id?.toString() || pub.publicationId?.toString();
        await publicationsService.update(pubId, {
          aiProfile,
          'metadata.lastUpdated': new Date(),
        });

        results.push({ publicationId: pub.publicationId, publicationName: pubName, success: true });
      } catch (err: any) {
        results.push({ 
          publicationId: pub.publicationId, 
          publicationName: pub.basicInfo?.publicationName || 'Unknown',
          success: false, 
          error: err.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      generated: successCount,
      failed: results.length - successCount,
      total: pubsWithoutProfile.length,
      results,
    });
  } catch (error: any) {
    console.error('Error bulk generating AI profiles:', error);
    res.status(500).json({ error: `Failed to bulk generate AI profiles: ${error.message}` });
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

// Upload a new file to publication (requires publication access)
router.post('/:publicationId/files', authenticateToken, requirePublicationAccess('publicationId'), upload.single('file'), async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    const { fileType, description, tags, isPublic } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!fileType) {
      return res.status(400).json({ error: 'File type is required' });
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

// Update file metadata (requires publication access)
router.put('/:publicationId/files/:fileId', authenticateToken, requirePublicationAccess('publicationId'), async (req: any, res: Response) => {
  try {
    const { publicationId, fileId } = req.params;
    const { fileName, description, tags, isPublic } = req.body;

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

// Delete file (requires publication access)
router.delete('/:publicationId/files/:fileId', authenticateToken, requirePublicationAccess('publicationId'), async (req: any, res: Response) => {
  try {
    const { publicationId, fileId } = req.params;

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

