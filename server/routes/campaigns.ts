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

    // Try to find by MongoDB _id first, then by campaignId
    let campaign = await campaignsService.getById(id);
    if (!campaign) {
      campaign = await campaignsService.getByCampaignId(id);
    }

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
    
    // Valid status transitions - campaigns auto-activate when orders are generated
    // Manual status changes still allowed (e.g., pause, complete, cancel)
    // Legacy approval statuses are still supported for backwards compatibility
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived', 
                          'pending_review', 'pending_approval', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }
    
    // Legacy: Only admin can set legacy approved/rejected statuses
    if ((status === 'approved' || status === 'rejected') && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can set legacy approval statuses' });
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
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
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
    
    // Use the campaignId string for generating orders
    const campaignIdToUse = campaign.campaignId || id;
    
    // Generate insertion orders using the service (inserts into new collection)
    const result = await insertionOrderService.generateOrdersForCampaign(
      campaignIdToUse,
      req.user.id
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Fetch the generated orders
    const generatedOrders = await insertionOrderService.getOrdersForCampaign(campaignIdToUse);
    
    // Send notifications to publication users for each generated order
    try {
      const { notifyOrderReceived } = await import('../../src/services/notificationService');
      const { emailService } = await import('../emailService');
      const { getDatabase } = await import('../../src/integrations/mongodb/client');
      const { COLLECTIONS } = await import('../../src/integrations/mongodb/schemas');
      
      const db = getDatabase();
      
      for (const order of generatedOrders) {
        // Find users with access to this publication
        const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).find({
          'publications.publicationId': order.publicationId
        }).toArray();
        
        const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`;
        
        for (const perm of permissions) {
          // Create in-app notification
          await notifyOrderReceived({
            userId: perm.userId,
            publicationId: order.publicationId,
            publicationName: order.publicationName,
            campaignId: order.campaignId,
            campaignName: order.campaignName,
            orderId: order._id?.toString() || ''
          });
          
          // Send email notification
          if (emailService) {
            const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: perm.userId });
            if (user?.email) {
              await emailService.sendOrderSentEmail({
                recipientEmail: user.email,
                recipientName: user.firstName,
                publicationName: order.publicationName,
                campaignName: order.campaignName,
                advertiserName: campaign.basicInfo?.advertiserName,
                hubName: campaign.hubName,
                flightDates: campaign.timeline?.startDate && campaign.timeline?.endDate 
                  ? `${new Date(campaign.timeline.startDate).toLocaleDateString()} - ${new Date(campaign.timeline.endDate).toLocaleDateString()}`
                  : undefined,
                totalValue: order.totalCost,
                orderUrl
              });
            }
          }
        }
      }
      
      console.log(`📧 Sent order notifications for ${generatedOrders.length} publication orders`);
    } catch (notifyError) {
      console.error('Error sending order notifications:', notifyError);
      // Don't fail the request if notifications fail
    }
    
    res.json({ 
      success: true, 
      publicationInsertionOrders: generatedOrders,
      count: result.ordersGenerated
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
    const { insertionOrderService } = await import('../../src/services/insertionOrderService');
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
    
    // Use the campaignId string for lookup
    const campaignIdToUse = campaign.campaignId || id;
    
    // Find the publication insertion order from the collection
    const pubIO = await insertionOrderService.getOrderByCampaignAndPublication(
      campaignIdToUse,
      parseInt(publicationId)
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

// Permanently delete campaign and ALL related records (admin only)
router.delete('/:id/permanent', authenticateToken, async (req: any, res: Response) => {
  try {
    const { campaignsService } = await import('../../src/integrations/mongodb/campaignService');
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    
    // Admin only
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required for permanent deletion' });
    }
    
    // Find the campaign
    const campaign = await campaignsService.getById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const db = getDatabase();
    const campaignIdString = campaign._id?.toString() || id;
    const campaignIdField = campaign.campaignId;
    
    // Build queries for related collections
    const buildQuery = () => ({
      $or: [
        { campaignId: campaignIdString },
        ...(campaignIdField ? [{ campaignId: campaignIdField }] : []),
        { campaignObjectId: campaignIdString },
      ]
    });
    
    const stats: Record<string, number> = {};
    
    // Delete in order of dependencies
    // 1. Notifications
    const notifResult = await db.collection(COLLECTIONS.NOTIFICATIONS).deleteMany(buildQuery());
    stats.notifications = notifResult.deletedCount;
    
    // 2. Daily aggregates
    const aggResult = await db.collection(COLLECTIONS.DAILY_AGGREGATES).deleteMany(buildQuery());
    stats.daily_aggregates = aggResult.deletedCount;
    
    // 3. Proof of performance
    const proofResult = await db.collection(COLLECTIONS.PROOF_OF_PERFORMANCE).deleteMany(buildQuery());
    stats.proof_of_performance = proofResult.deletedCount;
    
    // 4. Performance entries
    const perfResult = await db.collection(COLLECTIONS.PERFORMANCE_ENTRIES).deleteMany(buildQuery());
    stats.performance_entries = perfResult.deletedCount;
    
    // 5. Tracking scripts
    const scriptsResult = await db.collection(COLLECTIONS.TRACKING_SCRIPTS).deleteMany(buildQuery());
    stats.tracking_scripts = scriptsResult.deletedCount;
    
    // 6. Creative assets
    const assetsResult = await db.collection(COLLECTIONS.CREATIVE_ASSETS).deleteMany(buildQuery());
    stats.creative_assets = assetsResult.deletedCount;
    
    // 7. Publication insertion orders
    const ordersResult = await db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS).deleteMany(buildQuery());
    stats.publication_insertion_orders = ordersResult.deletedCount;
    
    // 8. Campaign itself (hard delete)
    let campaignObjectId: InstanceType<typeof ObjectId>;
    try {
      campaignObjectId = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: 'Invalid campaign ID format' });
    }
    const campaignResult = await db.collection(COLLECTIONS.CAMPAIGNS).deleteOne({ _id: campaignObjectId });
    stats.campaigns = campaignResult.deletedCount;
    
    const totalDeleted = Object.values(stats).reduce((sum, n) => sum + n, 0);
    
    console.log(`[Permanent Delete] Campaign ${id} (${campaign.basicInfo?.name}) permanently deleted by ${req.user.email}:`, stats);
    
    res.json({ 
      success: true, 
      deletedRecords: stats,
      totalDeleted,
      campaignName: campaign.basicInfo?.name
    });
  } catch (error) {
    console.error('Error permanently deleting campaign:', error);
    res.status(500).json({ error: 'Failed to permanently delete campaign' });
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

