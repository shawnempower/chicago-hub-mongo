import { Router, Response } from 'express';
import { storefrontConfigurationsService, userProfilesService } from '../../src/integrations/mongodb/allServices';
import { authenticateToken } from '../middleware/authenticate';
import { StorefrontImageService } from '../storefrontImageService';
import { subdomainService } from '../subdomainService';
import multer from 'multer';
import { s3Service } from '../s3Service';

const router = Router();

// Initialize storefront image service
let storefrontImageService: StorefrontImageService | null = null;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * Storefront Configuration Routes
 * 
 * These endpoints manage publication storefront configurations,
 * including subdomain management, hero images, and customization settings.
 */

// Check subdomain availability
router.get('/check-subdomain', authenticateToken, async (req: any, res: Response) => {
  try {
    const { subdomain, excludePublicationId } = req.query;
    
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }
    
    const exists = await storefrontConfigurationsService.checkSubdomainExists(
      subdomain as string,
      excludePublicationId as string | undefined
    );
    
    res.json({ available: !exists, exists });
  } catch (error) {
    console.error('Error checking subdomain:', error);
    res.status(500).json({ error: 'Failed to check subdomain availability' });
  }
});

// Get storefront configuration by publication ID (public)
router.get('/:publicationId', async (req, res) => {
  try {
    const { publicationId } = req.params;
    const { draft } = req.query;
    
    let config;
    
    if (draft !== undefined) {
      config = await storefrontConfigurationsService.getByPublicationId(publicationId, draft === 'true');
    } else {
      // Try draft first, then published
      config = await storefrontConfigurationsService.getByPublicationId(publicationId, true);
      if (!config) {
        config = await storefrontConfigurationsService.getByPublicationId(publicationId, false);
      }
    }
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching storefront configuration:', error);
    res.status(500).json({ error: 'Failed to fetch storefront configuration' });
  }
});

// Get all storefront configurations with optional filtering (admin only)
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, draft } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (draft !== undefined) filters.isDraft = draft === 'true';
    
    const configs = await storefrontConfigurationsService.getAll(filters);
    res.json({ storefronts: configs });
  } catch (error) {
    console.error('Error fetching storefront configurations:', error);
    res.status(500).json({ error: 'Failed to fetch storefront configurations' });
  }
});

// Create a new storefront configuration (admin only)
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const config = await storefrontConfigurationsService.create(req.body, req.user.id);
    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating storefront configuration:', error);
    res.status(500).json({ error: 'Failed to create storefront configuration' });
  }
});

// Update storefront configuration (admin only)
router.put('/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    const updates = req.body;
    
    const config = await storefrontConfigurationsService.update(publicationId, updates, req.user.id);
    res.json(config);
  } catch (error) {
    console.error('Error updating storefront configuration:', error);
    res.status(500).json({ error: 'Failed to update storefront configuration' });
  }
});

// Delete storefront configuration (admin only)
router.delete('/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    await storefrontConfigurationsService.delete(publicationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting storefront configuration:', error);
    res.status(500).json({ error: 'Failed to delete storefront configuration' });
  }
});

// Publish draft storefront configuration
router.post('/:publicationId/publish', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    console.log(`📤 Publishing storefront for publication: ${publicationId}`);
    
    const config = await storefrontConfigurationsService.publish(publicationId, req.user.id);
    console.log(`📤 Publish result - websiteUrl: ${config?.websiteUrl || 'NOT SET'}`);
    
    // Automatically setup subdomain if websiteUrl is configured
    let subdomainSetupResult = null;
    if (config?.websiteUrl) {
      try {
        // Extract subdomain from websiteUrl
        let websiteUrl = config.websiteUrl.trim().toLowerCase();
        websiteUrl = websiteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        console.log(`📤 Parsed websiteUrl: ${websiteUrl}`);
        
        if (websiteUrl.endsWith('.localmedia.store')) {
          const subdomain = websiteUrl.replace('.localmedia.store', '');
          console.log(`📤 Extracted subdomain: ${subdomain}`);
          
          if (subdomain && subdomain !== 'localmedia' && !subdomain.includes('.')) {
            const subdomainSvc = subdomainService();
            console.log(`📤 Subdomain service available: ${!!subdomainSvc}`);
            
            if (subdomainSvc) {
              console.log(`🔧 Auto-configuring subdomain on publish: ${subdomain}`);
              subdomainSetupResult = await subdomainSvc.setupSubdomain(subdomain);
              if (subdomainSetupResult.success) {
                console.log(`✅ Subdomain auto-configured: ${subdomainSetupResult.fullDomain}`);
              } else {
                console.warn(`⚠️ Subdomain auto-config failed: ${subdomainSetupResult.error}`);
              }
            } else {
              console.warn('⚠️ Subdomain service not available for auto-config');
            }
          } else {
            console.log(`📤 Invalid subdomain format: "${subdomain}"`);
          }
        } else {
          console.log(`📤 URL doesn't end with .localmedia.store: ${websiteUrl}`);
        }
      } catch (subdomainError) {
        console.error('Error auto-configuring subdomain:', subdomainError);
        // Don't fail the publish if subdomain setup fails
      }
    } else {
      console.log('📤 No websiteUrl configured, skipping subdomain setup');
    }
    
    // Return config with subdomain setup result
    res.json({
      ...config,
      subdomainSetup: subdomainSetupResult
    });
  } catch (error) {
    console.error('Error publishing storefront configuration:', error);
    res.status(500).json({ error: 'Failed to publish storefront configuration' });
  }
});

// Setup subdomain for storefront (Route53 + CloudFront)
router.post('/:publicationId/setup-subdomain', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    const { isDraft } = req.query;
    
    // Get the storefront configuration to find the websiteUrl
    const config = await storefrontConfigurationsService.getByPublicationId(
      publicationId, 
      isDraft === 'true'
    );
    
    if (!config) {
      return res.status(404).json({ error: 'Storefront configuration not found' });
    }
    
    if (!config.websiteUrl) {
      return res.status(400).json({ error: 'No website URL configured for this storefront' });
    }
    
    // Extract subdomain from websiteUrl (e.g., "wct.localmedia.store" or "https://wct.localmedia.store")
    let websiteUrl = config.websiteUrl.trim().toLowerCase();
    // Remove protocol if present
    websiteUrl = websiteUrl.replace(/^https?:\/\//, '');
    // Remove trailing slash
    websiteUrl = websiteUrl.replace(/\/+$/, '');
    
    // Validate it's a localmedia.store subdomain
    if (!websiteUrl.endsWith('.localmedia.store')) {
      return res.status(400).json({ 
        error: 'Website URL must be a subdomain of localmedia.store',
        success: false,
        fullDomain: websiteUrl,
        alreadyConfigured: false
      });
    }
    
    // Extract the subdomain part (everything before .localmedia.store)
    const subdomain = websiteUrl.replace('.localmedia.store', '');
    
    if (!subdomain || subdomain === 'localmedia' || subdomain.includes('.')) {
      return res.status(400).json({ 
        error: 'Invalid subdomain format',
        success: false,
        fullDomain: websiteUrl,
        alreadyConfigured: false
      });
    }
    
    // Check if subdomain service is available
    const subdomainSvc = subdomainService();
    if (!subdomainSvc) {
      console.warn('⚠️  Subdomain service not available - missing AWS configuration');
      return res.status(503).json({ 
        error: 'Subdomain service unavailable. Please check AWS configuration.',
        success: false,
        fullDomain: `${subdomain}.localmedia.store`,
        alreadyConfigured: false
      });
    }
    
    // Setup the subdomain in Route53 and CloudFront
    console.log(`🔧 Setting up subdomain for publication ${publicationId}: ${subdomain}`);
    const result = await subdomainSvc.setupSubdomain(subdomain);
    
    if (result.success) {
      console.log(`✅ Subdomain setup complete: ${result.fullDomain}`);
    } else {
      console.error(`❌ Subdomain setup failed: ${result.error}`);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error setting up subdomain:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to setup subdomain',
      success: false,
      fullDomain: '',
      alreadyConfigured: false
    });
  }
});

// Upload hero image
router.post('/:publicationId/hero-image', authenticateToken, upload.single('image'), async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { publicationId } = req.params;
    const { altText, caption } = req.body;
    
    // Initialize storefront image service if not already done
    if (!storefrontImageService) {
      const s3ServiceInstance = s3Service();
      if (!s3ServiceInstance) {
        return res.status(500).json({ error: 'Image storage service not available' });
      }
      storefrontImageService = new StorefrontImageService(s3ServiceInstance);
    }
    
    const uploadResult = await storefrontImageService.uploadHeroImage({
      publicationId,
      imageBuffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      altText,
      caption,
      uploadedBy: req.user.id
    });
    
    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error || 'Failed to upload hero image' });
    }
    
    // Update storefront configuration with hero image
    const config = await storefrontConfigurationsService.update(
      publicationId,
      { heroImage: uploadResult.heroImage },
      req.user.id
    );
    
    res.json({ 
      success: true, 
      heroImage: uploadResult.heroImage,
      config 
    });
  } catch (error) {
    console.error('Error uploading hero image:', error);
    res.status(500).json({ error: 'Failed to upload hero image' });
  }
});

// Delete hero image
router.delete('/:publicationId/hero-image', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    
    // Get current configuration to retrieve S3 key
    const currentConfig = await storefrontConfigurationsService.getByPublicationId(publicationId, true);
    
    if (currentConfig?.heroImage?.s3Key) {
      // Initialize service if needed
      if (!storefrontImageService) {
        const s3ServiceInstance = s3Service();
        if (s3ServiceInstance) {
          storefrontImageService = new StorefrontImageService(s3ServiceInstance);
        }
      }
      
      // Delete from S3
      if (storefrontImageService) {
        await storefrontImageService.deleteHeroImage(currentConfig.heroImage.s3Key);
      }
    }
    
    // Update configuration to remove hero image
    const config = await storefrontConfigurationsService.update(
      publicationId,
      { heroImage: null },
      req.user.id
    );
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    res.status(500).json({ error: 'Failed to delete hero image' });
  }
});

export default router;

