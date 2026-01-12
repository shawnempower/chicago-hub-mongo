/**
 * Tracking Scripts Routes
 * 
 * API endpoints for generating and managing tracking scripts for digital ad placements.
 * Generates impression pixels, click trackers, and HTML tags for publications to traffic.
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authenticate';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { 
  TrackingScript, 
  TrackingScriptInsert,
  TrackingChannel,
  CHANNEL_TYPE_CODES,
  generateDisplayAdTag,
  generateNewsletterImageTag,
  generateNewsletterImageSimplifiedTag,
  generateNewsletterTextTag,
  buildTrackingUrl,
  validateTrackingScript,
  ESPCompatibility
} from '../../src/integrations/mongodb/trackingScriptSchema';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Tracking CDN base URL - change this to your production CDN domain
 * The tracking endpoints:
 * - /pxl.png - Impression pixel (static 1x1 PNG in S3, CloudFront logs capture parameters)
 * - /c - Click redirect (Lambda@Edge logs click, redirects to landing page)
 * - /a/* - Asset serving (serves creative images from S3)
 */
// Ensure TRACKING_CDN_URL has https:// prefix
function getTrackingCdnBaseUrl(): string {
  const url = process.env.TRACKING_CDN_URL;
  if (!url) {
    console.error('[TrackingScripts] TRACKING_CDN_URL environment variable is required');
    return '';
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

const TRACKING_CDN_BASE_URL = getTrackingCdnBaseUrl();

/**
 * GET /api/tracking-scripts
 * List tracking scripts with optional filters
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId, creativeId, channel, limit = 100 } = req.query;
    
    const db = getDatabase();
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    // Build query
    const query: any = { deletedAt: { $exists: false } };
    
    if (campaignId) query.campaignId = campaignId;
    if (publicationId) query.publicationId = parseInt(publicationId as string);
    if (creativeId) query.creativeId = creativeId;
    if (channel) query.channel = channel;
    
    const scripts = await collection
      .find(query)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit as string))
      .toArray();
    
    res.json({ scripts, total: scripts.length });
  } catch (error) {
    console.error('Error fetching tracking scripts:', error);
    res.status(500).json({ error: 'Failed to fetch tracking scripts' });
  }
});

/**
 * GET /api/tracking-scripts/campaign/:campaignId
 * Get all tracking scripts for a campaign
 */
router.get('/campaign/:campaignId', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    const scripts = await collection
      .find({ 
        campaignId, 
        deletedAt: { $exists: false } 
      })
      .sort({ publicationName: 1, channel: 1 })
      .toArray();
    
    // Group by publication for easier display
    const byPublication: Record<number, TrackingScript[]> = {};
    scripts.forEach(script => {
      if (!byPublication[script.publicationId]) {
        byPublication[script.publicationId] = [];
      }
      byPublication[script.publicationId].push(script);
    });
    
    res.json({ scripts, byPublication, total: scripts.length });
  } catch (error) {
    console.error('Error fetching campaign tracking scripts:', error);
    res.status(500).json({ error: 'Failed to fetch tracking scripts' });
  }
});

/**
 * GET /api/tracking-scripts/order/:orderId
 * Get tracking scripts for a specific publication order
 */
router.get('/order/:orderId', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const db = getDatabase();
    
    // First get the order to find campaignId and publicationId
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    const order = await ordersCollection.findOne({ 
      _id: new ObjectId(orderId),
      deletedAt: { $exists: false }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    const scripts = await collection
      .find({ 
        campaignId: order.campaignId,
        publicationId: order.publicationId,
        deletedAt: { $exists: false } 
      })
      .sort({ channel: 1, 'creative.name': 1 })
      .toArray();
    
    res.json({ scripts, order: { campaignId: order.campaignId, publicationId: order.publicationId } });
  } catch (error) {
    console.error('Error fetching order tracking scripts:', error);
    res.status(500).json({ error: 'Failed to fetch tracking scripts' });
  }
});

/**
 * GET /api/tracking-scripts/:id
 * Get a single tracking script by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid script ID' });
    }
    
    const db = getDatabase();
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    const script = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!script) {
      return res.status(404).json({ error: 'Tracking script not found' });
    }
    
    res.json({ script });
  } catch (error) {
    console.error('Error fetching tracking script:', error);
    res.status(500).json({ error: 'Failed to fetch tracking script' });
  }
});

/**
 * POST /api/tracking-scripts/generate
 * Generate tracking scripts for a creative/publication combination
 */
router.post('/generate', async (req: any, res: Response) => {
  try {
    const {
      campaignId,
      creativeId,
      publicationId,
      orderId,  // Now required - MongoDB _id of the publication insertion order
      publicationName,
      channel,
      creative,
      espCompatibility,
      advertiserName,
      campaignName
    } = req.body;
    
    // Validate required fields (removed publicationCode - now using only publicationId)
    if (!campaignId || !creativeId || !publicationId || !channel || !creative) {
      return res.status(400).json({ 
        error: 'Missing required fields: campaignId, creativeId, publicationId, channel, creative' 
      });
    }
    
    // Validate channel
    const validChannels: TrackingChannel[] = ['website', 'newsletter_image', 'newsletter_text', 'streaming'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }
    
    const db = getDatabase();
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    // If orderId not provided, look up the order
    let resolvedOrderId = orderId;
    if (!resolvedOrderId) {
      const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
      const order = await ordersCollection.findOne({
        campaignId,
        publicationId: parseInt(publicationId),
        deletedAt: { $exists: false }
      });
      if (order) {
        resolvedOrderId = order._id.toString();
      }
    }
    
    if (!resolvedOrderId) {
      return res.status(400).json({ 
        error: 'Could not find order for this campaign/publication. Either provide orderId or ensure an order exists.' 
      });
    }
    
    // Check if script already exists for this combination
    const existing = await collection.findOne({
      campaignId,
      creativeId,
      publicationId: parseInt(publicationId),
      channel,
      deletedAt: { $exists: false }
    });
    
    // Build tracking URLs with new simplified structure
    const channelCode = CHANNEL_TYPE_CODES[channel as TrackingChannel];
    const size = creative.width && creative.height ? `${creative.width}x${creative.height}` : undefined;
    const isNewsletter = channel.includes('newsletter');
    
    const urls = {
      impressionPixel: buildTrackingUrl(TRACKING_CDN_BASE_URL, '/pxl.png', 'display', {
        orderId: resolvedOrderId,
        campaignId,
        publicationId: parseInt(publicationId),
        channel: channelCode,
        creativeId,
        size,
        emailId: isNewsletter ? 'EMAIL_ID' : undefined
      }),
      clickTracker: buildTrackingUrl(TRACKING_CDN_BASE_URL, '/c', 'click', {
        orderId: resolvedOrderId,
        campaignId,
        publicationId: parseInt(publicationId),
        channel: channelCode,
        creativeId,
        redirectUrl: creative.clickUrl,  // Include landing page URL for redirect
        emailId: isNewsletter ? 'EMAIL_ID' : undefined
      }),
      creativeUrl: creative.imageUrl || `${TRACKING_CDN_BASE_URL}/a/${creativeId}`
    };
    
    // Generate HTML tags based on channel
    let fullTag: string;
    let simplifiedTag: string | undefined;
    const adName = advertiserName || 'Advertiser';
    const campName = campaignName || 'Campaign';
    const sizeStr = size || 'auto';
    
    switch (channel) {
      case 'website':
        fullTag = generateDisplayAdTag(creative, urls, adName, campName, sizeStr);
        break;
      case 'newsletter_image':
        fullTag = generateNewsletterImageTag(creative, urls, adName, campName);
        simplifiedTag = generateNewsletterImageSimplifiedTag(urls, adName, campName);
        break;
      case 'newsletter_text':
        fullTag = generateNewsletterTextTag(creative, urls, adName, campName);
        break;
      case 'streaming':
        // For streaming, just provide the tracking URLs
        fullTag = `<!-- ${adName} | ${campName} | Streaming -->
<!-- Video Tracking URLs -->
<!-- Impression (fire on video start): ${urls.impressionPixel} -->
<!-- Click-through URL: ${urls.clickTracker} -->`;
        break;
      default:
        fullTag = '';
    }
    
    const comments = `<!-- ${adName} | ${campName} | ${channel} | ${publicationName} -->`;
    
    const scriptData: TrackingScriptInsert = {
      campaignId,
      creativeId,
      publicationId: parseInt(publicationId),
      // publicationCode removed - no longer used, only publicationId needed
      publicationName: publicationName || `Publication ${publicationId}`,
      channel: channel as TrackingChannel,
      creative: {
        name: creative.name || 'Creative',
        clickUrl: creative.clickUrl,
        imageUrl: creative.imageUrl,
        width: creative.width,
        height: creative.height,
        altText: creative.altText,
        headline: creative.headline,
        body: creative.body,
        ctaText: creative.ctaText
      },
      urls,
      tags: {
        fullTag,
        simplifiedTag,
        comments
      },
      espCompatibility: espCompatibility as ESPCompatibility,
      generatedAt: new Date(),
      generatedBy: req.user.id,
      version: existing ? (existing.version || 0) + 1 : 1
    };
    
    // Validate the script data
    const validationErrors = validateTrackingScript(scriptData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    let result;
    if (existing) {
      // Update existing script
      result = await collection.updateOne(
        { _id: existing._id },
        { 
          $set: {
            ...scriptData,
            updatedAt: new Date()
          }
        }
      );
      
      res.json({ 
        script: { ...scriptData, _id: existing._id },
        updated: true,
        message: 'Tracking script updated'
      });
    } else {
      // Create new script
      result = await collection.insertOne(scriptData as any);
      
      res.status(201).json({ 
        script: { ...scriptData, _id: result.insertedId },
        created: true,
        message: 'Tracking script generated'
      });
    }
  } catch (error) {
    console.error('Error generating tracking script:', error);
    res.status(500).json({ error: 'Failed to generate tracking script' });
  }
});

/**
 * POST /api/tracking-scripts/generate-batch
 * Generate tracking scripts for multiple creatives/publications at once
 */
router.post('/generate-batch', async (req: any, res: Response) => {
  try {
    const { items, advertiserName, campaignName } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    
    const results: { success: any[]; errors: any[] } = { success: [], errors: [] };
    const db = getDatabase();
    
    for (const item of items) {
      try {
        // Reuse the generate logic by making an internal call
        const {
          campaignId,
          creativeId,
          publicationId,
          orderId,  // Optional - will look up if not provided
          publicationName,
          channel,
          creative,
          espCompatibility
        } = item;
        
        // Validate required fields (removed publicationCode - using only publicationId)
        if (!campaignId || !creativeId || !publicationId || !channel || !creative) {
          results.errors.push({ 
            item, 
            error: 'Missing required fields' 
          });
          continue;
        }
        
        const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
        
        // Look up orderId if not provided
        let resolvedOrderId = orderId;
        if (!resolvedOrderId) {
          const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
          const order = await ordersCollection.findOne({
            campaignId,
            publicationId: parseInt(publicationId),
            deletedAt: { $exists: false }
          });
          if (order) {
            resolvedOrderId = order._id.toString();
          }
        }
        
        if (!resolvedOrderId) {
          results.errors.push({ 
            item, 
            error: 'Could not find order for this campaign/publication' 
          });
          continue;
        }
        
        // Build tracking URLs with new simplified structure
        const channelCode = CHANNEL_TYPE_CODES[channel as TrackingChannel];
        const size = creative.width && creative.height ? `${creative.width}x${creative.height}` : undefined;
        const isNewsletter = channel.includes('newsletter');
        
        const urls = {
          impressionPixel: buildTrackingUrl(TRACKING_CDN_BASE_URL, '/pxl.png', 'display', {
            orderId: resolvedOrderId,
            campaignId,
            publicationId: parseInt(publicationId),
            channel: channelCode,
            creativeId,
            size,
            emailId: isNewsletter ? 'EMAIL_ID' : undefined
          }),
          clickTracker: buildTrackingUrl(TRACKING_CDN_BASE_URL, '/c', 'click', {
            orderId: resolvedOrderId,
            campaignId,
            publicationId: parseInt(publicationId),
            channel: channelCode,
            creativeId,
            redirectUrl: creative.clickUrl,
            emailId: isNewsletter ? 'EMAIL_ID' : undefined
          }),
          creativeUrl: creative.imageUrl || `${TRACKING_CDN_BASE_URL}/a/${creativeId}`
        };
        
        // Generate HTML tags based on channel
        let fullTag: string;
        let simplifiedTag: string | undefined;
        const adName = advertiserName || 'Advertiser';
        const campName = campaignName || 'Campaign';
        const sizeStr = size || 'auto';
        
        switch (channel) {
          case 'website':
            fullTag = generateDisplayAdTag(creative, urls, adName, campName, sizeStr);
            break;
          case 'newsletter_image':
            fullTag = generateNewsletterImageTag(creative, urls, adName, campName);
            simplifiedTag = generateNewsletterImageSimplifiedTag(urls, adName, campName);
            break;
          case 'newsletter_text':
            fullTag = generateNewsletterTextTag(creative, urls, adName, campName);
            break;
          case 'streaming':
            fullTag = `<!-- ${adName} | ${campName} | Streaming -->
<!-- Impression: ${urls.impressionPixel} -->
<!-- Click: ${urls.clickTracker} -->`;
            break;
          default:
            fullTag = '';
        }
        
        const comments = `<!-- ${adName} | ${campName} | ${channel} | ${publicationName} -->`;
        
        const scriptData: TrackingScriptInsert = {
          campaignId,
          creativeId,
          publicationId: parseInt(publicationId),
          // publicationCode removed - no longer used, only publicationId needed
          publicationName: publicationName || `Publication ${publicationId}`,
          channel: channel as TrackingChannel,
          creative: {
            name: creative.name || 'Creative',
            clickUrl: creative.clickUrl,
            imageUrl: creative.imageUrl,
            width: creative.width,
            height: creative.height,
            altText: creative.altText,
            headline: creative.headline,
            body: creative.body,
            ctaText: creative.ctaText
          },
          urls,
          tags: {
            fullTag,
            simplifiedTag,
            comments
          },
          espCompatibility: espCompatibility as ESPCompatibility,
          generatedAt: new Date(),
          generatedBy: req.user.id,
          version: 1
        };
        
        // Upsert the script
        const result = await collection.updateOne(
          { campaignId, creativeId, publicationId, channel, deletedAt: { $exists: false } },
          { 
            $set: scriptData,
            $inc: { version: 1 }
          },
          { upsert: true }
        );
        
        results.success.push({
          campaignId,
          creativeId,
          publicationId,
          channel,
          upsertedId: result.upsertedId
        });
      } catch (itemError) {
        results.errors.push({ item, error: (itemError as Error).message });
      }
    }
    
    res.json({
      message: `Generated ${results.success.length} scripts, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Error in batch generate:', error);
    res.status(500).json({ error: 'Failed to generate tracking scripts' });
  }
});

/**
 * DELETE /api/tracking-scripts/:id
 * Soft delete a tracking script
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid script ID' });
    }
    
    const db = getDatabase();
    const collection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id), deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tracking script not found' });
    }
    
    res.json({ message: 'Tracking script deleted' });
  } catch (error) {
    console.error('Error deleting tracking script:', error);
    res.status(500).json({ error: 'Failed to delete tracking script' });
  }
});

/**
 * POST /api/tracking-scripts/refresh/:campaignId/:publicationId
 * Refresh (regenerate) tracking scripts for an order based on current creatives
 */
router.post('/refresh/:campaignId/:publicationId', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId } = req.params;
    
    if (!campaignId || !publicationId) {
      return res.status(400).json({ error: 'Campaign ID and Publication ID are required' });
    }

    const { refreshScriptsForOrder } = await import('../../src/services/trackingScriptService');
    const result = await refreshScriptsForOrder(campaignId, parseInt(publicationId));
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      scriptsGenerated: result.scriptsGenerated,
      scriptsDeleted: result.scriptsDeleted,
      message: `Generated ${result.scriptsGenerated} scripts (deleted ${result.scriptsDeleted} old scripts)`
    });
  } catch (error) {
    console.error('Error refreshing tracking scripts:', error);
    res.status(500).json({ error: 'Failed to refresh tracking scripts' });
  }
});

/**
 * GET /api/tracking-scripts/config
 * Get the tracking configuration (base URL, etc.)
 */
router.get('/config', async (req: any, res: Response) => {
  res.json({
    cdnBaseUrl: TRACKING_CDN_BASE_URL,
    endpoints: {
      impression: '/pxl.png',  // Static pixel file in S3
      click: '/c',              // Lambda@Edge redirect
      asset: '/a/'              // Creative assets in S3
    },
    parameters: {
      cr: 'creative_id',
      p: 'publication_code',
      t: 'channel_type (display, nli, nlt, stream)',
      s: 'size (e.g., 300x250)'
    }
  });
});

export default router;
