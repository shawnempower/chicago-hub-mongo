import { Router, Request, Response } from 'express';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { userProfilesService, brandDocumentsService } from '../../src/integrations/mongodb/allServices';
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
 * Campaign Routes
 * 
 * These endpoints support the Campaign Builder feature that uses AI
 * to intelligently select inventory based on campaign requirements.
 */

// Get current LLM configuration
router.get('/llm-config', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignLLMService } = await import('../campaignLLMService');
    const config = campaignLLMService.getConfig();
    res.json({ config });
  } catch (error) {
    console.error('Error getting LLM config:', error);
    res.status(500).json({ error: 'Failed to get LLM configuration' });
  }
});

// Reload LLM configuration (useful for development)
router.post('/llm-config/reload', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignLLMService } = await import('../campaignLLMService');
    const { preset } = req.body;
    const newConfig = campaignLLMService.reloadConfig(preset);
    res.json({ 
      message: 'Configuration reloaded successfully',
      config: newConfig 
    });
  } catch (error) {
    console.error('Error reloading LLM config:', error);
    res.status(500).json({ error: 'Failed to reload LLM configuration' });
  }
});

// Update LLM configuration
router.patch('/llm-config', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignLLMService } = await import('../campaignLLMService');
    const updates = req.body;
    campaignLLMService.updateConfig(updates);
    const newConfig = campaignLLMService.getConfig();
    res.json({ 
      message: 'Configuration updated successfully',
      config: newConfig 
    });
  } catch (error) {
    console.error('Error updating LLM config:', error);
    res.status(500).json({ error: 'Failed to update LLM configuration' });
  }
});

// Get available campaign generation algorithms (from database)
router.get('/algorithms', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const dbAlgorithms = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS)
      .find({ isActive: { $ne: false } })
      .project({ algorithmId: 1, name: 1, description: 1, icon: 1, isDefault: 1 })
      .sort({ isDefault: -1, name: 1 })
      .toArray();
    
    const algorithms = dbAlgorithms.map((alg: any) => ({
      id: alg.algorithmId,
      name: alg.name,
      description: alg.description,
      icon: alg.icon
    }));
    
    res.json({ algorithms });
  } catch (error: any) {
    console.error('❌ Error listing algorithms:', error);
    res.status(500).json({ error: 'Failed to list algorithms' });
  }
});

// Analyze campaign requirements using specified algorithm
router.post('/analyze', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if API key is set
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured. Please add ANTHROPIC_API_KEY to your .env file.' 
      });
    }

    const { campaignLLMService } = await import('../campaignLLMService');
    const analysisRequest = req.body;
    
    // Validate required fields
    if (!analysisRequest.hubId || !analysisRequest.objectives || !analysisRequest.timeline) {
      return res.status(400).json({ error: 'Missing required fields: hubId, objectives, timeline' });
    }

    const algorithm = analysisRequest.algorithm || 'all-inclusive';
    console.log('📊 Starting campaign analysis for hub:', analysisRequest.hubId, 'with algorithm:', algorithm);
    const analysisResponse = await campaignLLMService.analyzeCampaign(analysisRequest);
    console.log('✅ Campaign analysis complete');
    res.json(analysisResponse);
  } catch (error: any) {
    console.error('❌ Error analyzing campaign:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }
    res.status(500).json({ 
      error: error.message || 'Failed to analyze campaign requirements',
      details: error.response?.data || undefined
    });
  }
});

// Create a new campaign
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const campaignData = req.body;
    
    const campaign = await campaignsService.create(campaignData, req.user.id);
    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get campaigns list (public - filtered by hub)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { hubId, status, searchTerm, startDateFrom, startDateTo, summaryOnly } = req.query;
    
    const filters: any = {};
    if (hubId) filters.hubId = hubId;
    if (status) filters.status = status;
    if (searchTerm) filters.searchTerm = searchTerm;
    if (startDateFrom) filters.startDateFrom = new Date(startDateFrom as string);
    if (startDateTo) filters.startDateTo = new Date(startDateTo as string);
    
    // Get campaigns by hub if hubId is provided, otherwise return empty
    const campaigns = hubId 
      ? await campaignsService.getByHub(hubId as string, filters)
      : [];
    
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign by ID (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { id } = req.params;
    
    const campaign = await campaignsService.getById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Update campaign
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { id } = req.params;
    const updates = req.body;
    
    // Check if user has access (admin or creator)
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin && campaign.metadata.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedCampaign = await campaignsService.update(id, updates, req.user.id);
    res.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Update campaign status
router.patch('/:id/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { id } = req.params;
    const { status, approvalDetails } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Check if user has access
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    const isAdmin = profile?.isAdmin;
    const isCreator = campaign.metadata.createdBy === req.user.id;
    
    // Only admin can approve/reject, creator can request approval
    if (status === 'approved' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve campaigns' });
    }
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedCampaign = await campaignsService.updateStatus(id, status, req.user.id, approvalDetails);
    res.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// Generate/regenerate insertion order
router.post('/:id/insertion-order', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { insertionOrderGenerator } = await import('../insertionOrderGenerator');
    const { id } = req.params;
    const { format = 'html' } = req.body;
    
    // Check if user has access
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin && campaign.metadata.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate insertion order
    const content = format === 'markdown' 
      ? await insertionOrderGenerator.generateMarkdownInsertionOrder(campaign)
      : await insertionOrderGenerator.generateHTMLInsertionOrder(campaign);
    
    const insertionOrder = {
      generatedAt: new Date(),
      format: format as 'html' | 'markdown',
      content,
      version: (campaign.insertionOrder?.version || 0) + 1
    };
    
    // Save insertion order to campaign
    const updatedCampaign = await campaignsService.saveInsertionOrder(id, insertionOrder);
    
    res.json({ 
      campaign: updatedCampaign,
      insertionOrder 
    });
  } catch (error) {
    console.error('Error generating insertion order:', error);
    res.status(500).json({ error: 'Failed to generate insertion order' });
  }
});

// Generate per-publication insertion orders
router.post('/:id/publication-insertion-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { insertionOrderGenerator } = await import('../insertionOrderGenerator');
    const { id } = req.params;
    const { publicationIds } = req.body;
    
    // Check if user has access
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin && campaign.metadata.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate insertion orders for all or specific publications
    const publicationsToGenerate = publicationIds 
      ? (Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory : []).filter((p: any) => publicationIds.includes(p.publicationId))
      : (Array.isArray(campaign.selectedInventory) ? campaign.selectedInventory : []);
    
    const generatedOrders = [];
    
    for (const pub of publicationsToGenerate) {
      const content = await insertionOrderGenerator.generatePublicationHTMLInsertionOrder(campaign, pub.publicationId);
      if (content) {
        generatedOrders.push({
          publicationId: pub.publicationId,
          publicationName: pub.publicationName,
          generatedAt: new Date(),
          format: 'html' as const,
          content,
          status: 'draft' as const
        });
      }
    }
    
    // Save publication insertion orders to campaign
    const updatedCampaign = await campaignsService.update(id, {
      publicationInsertionOrders: generatedOrders
    }, req.user.id);
    
    res.json({ 
      success: true, 
      campaign: updatedCampaign,
      publicationInsertionOrders: generatedOrders,
      count: generatedOrders.length
    });
  } catch (error) {
    console.error('Error generating publication insertion orders:', error);
    res.status(500).json({ error: 'Failed to generate publication insertion orders' });
  }
});

// Get single publication insertion order
router.get('/:id/publication-insertion-orders/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { id, publicationId } = req.params;
    
    // Check if user has access
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin && campaign.metadata.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find the publication insertion order
    const pubIO = campaign.publicationInsertionOrders?.find(
      (io: any) => io.publicationId === parseInt(publicationId)
    );
    
    if (!pubIO) {
      return res.status(404).json({ error: 'Publication insertion order not found' });
    }
    
    res.json({ publicationInsertionOrder: pubIO });
  } catch (error) {
    console.error('Error fetching publication insertion order:', error);
    res.status(500).json({ error: 'Failed to fetch publication insertion order' });
  }
});

// Delete campaign (soft delete)
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { id } = req.params;
    
    // Check if user has access
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin && campaign.metadata.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await campaignsService.delete(id, req.user.id);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Get campaign statistics by status (public)
router.get('/stats/by-status', async (req: Request, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { hubId } = req.query;
    
    const stats = await campaignsService.getCountByStatus(hubId as string | undefined);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign statistics' });
  }
});

// File upload routes
router.post('/files/upload', authenticateToken, upload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const s3ServiceInstance = s3Service();
    if (!s3ServiceInstance) {
      return res.status(503).json({ error: 'File storage service unavailable' });
    }

    const { documentName, documentType, description } = req.body;
    
    if (!documentName || !documentType) {
      return res.status(400).json({ error: 'Document name and type are required' });
    }

    // Upload to S3
    const uploadResult = await s3ServiceInstance.uploadFile({
      userId: req.user.id,
      folder: 'documents',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      isPublic: false,
    });

    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }

    // Save document metadata to MongoDB
    const document = await brandDocumentsService.create({
      userId: req.user.id,
      documentName,
      documentType,
      description: description || null,
      fileUrl: uploadResult.url,
      s3Key: uploadResult.key,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalFileName: req.file.originalname,
    });

    res.json({
      success: true,
      document: {
        id: document._id,
        name: document.documentName,
        type: document.documentType,
        url: document.fileUrl,
        size: document.fileSize,
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get user documents
router.get('/files/documents', authenticateToken, async (req: any, res: Response) => {
  try {
    const documents = await brandDocumentsService.getByUserId(req.user.id);
    
    // Generate fresh signed URLs for private documents
    const s3ServiceInstance = s3Service();
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let url = doc.fileUrl;
        
        if (s3ServiceInstance && doc.s3Key) {
          try {
            url = await s3ServiceInstance.getSignedUrl(doc.s3Key, 3600);
          } catch (error) {
            console.error('Error generating signed URL:', error);
          }
        }
        
        return {
          id: doc._id,
          name: doc.documentName,
          type: doc.documentType,
          description: doc.description,
          url,
          size: doc.fileSize,
          mimeType: doc.mimeType,
          originalFileName: doc.originalFileName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      })
    );

    res.json({ documents: documentsWithUrls });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete document
router.delete('/files/documents/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const document = await brandDocumentsService.getById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from S3
    const s3ServiceInstance = s3Service();
    if (s3ServiceInstance && document.s3Key) {
      try {
        await s3ServiceInstance.deleteFile(document.s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }

    await brandDocumentsService.delete(id, req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;

