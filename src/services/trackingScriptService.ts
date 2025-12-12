/**
 * Tracking Script Service
 * 
 * Handles generation and management of tracking scripts for digital ad placements.
 * Scripts are generated based on actual uploaded creative assets.
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { 
  TrackingScript, 
  TrackingChannel,
  CHANNEL_TYPE_CODES,
  CHANNEL_URL_CODES,
  generateDisplayAdTag,
  generateNewsletterImageTag,
  generateNewsletterImageSimplifiedTag,
  generateNewsletterTextTag,
  buildTrackingUrl
} from '../integrations/mongodb/trackingScriptSchema';
import { CreativeAsset } from '../integrations/mongodb/creativesSchema';

// Tracking pixel configuration - REQUIRED environment variables
const TRACKING_PIXEL_PATH = process.env.TRACKING_PIXEL_PATH || '/pxl.png';

// Ensure TRACKING_CDN_URL has https:// prefix
function getTrackingCdnBaseUrl(): string {
  const url = process.env.TRACKING_CDN_URL;
  if (!url) {
    console.error('[TrackingScript] TRACKING_CDN_URL environment variable is required');
    return '';
  }
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

const TRACKING_CDN_BASE_URL = getTrackingCdnBaseUrl();

// CloudFront domain for ad creative assets (images, banners)
// Using CloudFront instead of presigned S3 URLs ensures ads don't break after URL expiration
function getAdAssetsCdnDomain(): string {
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN_AD_ASSETS;
  if (!domain) return '';
  // Strip protocol if provided - we'll add https:// in convertToCloudFrontUrl
  return domain.replace(/^https?:\/\//, '');
}

const AD_ASSETS_CDN_DOMAIN = getAdAssetsCdnDomain();

/**
 * Convert an S3 URL to a CloudFront URL for ad assets
 * Presigned S3 URLs expire (typically 1 hour) - CloudFront URLs are permanent
 * 
 * @param s3Url - The S3 URL (presigned or direct)
 * @returns CloudFront URL if configured, otherwise original URL
 */
function convertToCloudFrontUrl(s3Url: string): string {
  if (!s3Url) return s3Url;
  if (!AD_ASSETS_CDN_DOMAIN) {
    // CloudFront not configured - warn in dev, return original URL
    if (process.env.NODE_ENV === 'development') {
      console.warn('[TrackingScript] AWS_CLOUDFRONT_DOMAIN_AD_ASSETS not configured - using S3 URL which may expire');
    }
    return s3Url;
  }
  
  try {
    const url = new URL(s3Url);
    
    // Check if this is an S3 URL
    if (url.hostname.includes('.s3.') || url.hostname.includes('s3.amazonaws.com')) {
      // Extract the S3 key (path after bucket name)
      // Format: https://bucket-name.s3.region.amazonaws.com/path/to/file.jpg?presigned-params
      const key = url.pathname.substring(1); // Remove leading slash
      
      // Return CloudFront URL without any query params (no presigned auth needed)
      return `https://${AD_ASSETS_CDN_DOMAIN}/${key}`;
    }
    
    // Not an S3 URL, return as-is
    return s3Url;
  } catch (e) {
    // Invalid URL, return as-is
    return s3Url;
  }
}

// Digital channels that need tracking scripts
const DIGITAL_CHANNELS = ['website', 'newsletter', 'streaming'];

export interface GenerateScriptsResult {
  success: boolean;
  scriptsGenerated: number;
  scriptsDeleted: number;
  error?: string;
}

/**
 * Generate tracking scripts for a confirmed order based on uploaded creatives
 */
export async function generateScriptsForOrder(
  campaignId: string,
  publicationId: number,
  options?: { deleteExisting?: boolean }
): Promise<GenerateScriptsResult> {
  const db = getDatabase();
  const scriptsCollection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
  const creativesCollection = db.collection<CreativeAsset>(COLLECTIONS.CREATIVE_ASSETS);
  const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
  const campaignsCollection = db.collection(COLLECTIONS.CAMPAIGNS);

  try {
    // Get the order
    const order = await ordersCollection.findOne({
      campaignId,
      publicationId,
      deletedAt: { $exists: false }
    });

    if (!order) {
      return { success: false, scriptsGenerated: 0, scriptsDeleted: 0, error: 'Order not found' };
    }

    // Get campaign details
    const campaign = await campaignsCollection.findOne({ campaignId });
    if (!campaign) {
      return { success: false, scriptsGenerated: 0, scriptsDeleted: 0, error: 'Campaign not found' };
    }

    const advertiserName = campaign.basicInfo?.advertiserName || 'Advertiser';
    const campaignName = campaign.basicInfo?.name || 'Campaign';

    // Get publication info
    const pub = campaign.selectedInventory?.publications?.find(
      (p: any) => p.publicationId === publicationId
    );
    const publicationName = pub?.publicationName || order.publicationName || 'Publication';
    const pubCode = publicationName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);

    // Delete existing scripts if requested
    let scriptsDeleted = 0;
    if (options?.deleteExisting) {
      const deleteResult = await scriptsCollection.updateMany(
        { campaignId, publicationId, deletedAt: { $exists: false } },
        { $set: { deletedAt: new Date() } }
      );
      scriptsDeleted = deleteResult.modifiedCount;
    }

    // Get all creative assets for this campaign
    // campaignId can be at top level OR in associations.campaignId
    const creatives = await creativesCollection.find({
      $or: [
        { campaignId },
        { 'associations.campaignId': campaignId }
      ],
      status: { $in: ['pending', 'approved'] },
      deletedAt: { $exists: false }
    }).toArray();

    console.log(`Found ${creatives.length} total creatives for campaign ${campaignId}`);

    // Filter to digital channels only
    const digitalCreatives = creatives.filter(c => {
      const channel = (
        c.associations?.channel || 
        c.specifications?.channel || 
        c.metadata?.channel ||
        ''
      ).toLowerCase();
      
      // Check if it's a digital channel
      const isDigital = DIGITAL_CHANNELS.some(dc => channel.includes(dc));
      
      // Also check by file type for images (likely digital ads)
      const fileType = c.fileType || c.metadata?.fileType || '';
      const fileName = c.originalFilename || c.metadata?.originalFileName || '';
      const isImage = fileType.startsWith('image/') || 
                      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                        fileName.toLowerCase().endsWith(`.${ext}`)
                      );
      
      // Include if it's explicitly digital OR if it's an image (likely display ad)
      return isDigital || isImage;
    });

    console.log(`Found ${digitalCreatives.length} digital creatives for campaign ${campaignId}`);

    if (digitalCreatives.length === 0) {
      return { 
        success: true, 
        scriptsGenerated: 0, 
        scriptsDeleted,
        error: 'No digital creatives found. Upload image assets for digital placements first.'
      };
    }

    // Generate scripts for each creative
    const scriptsToInsert: any[] = [];

    for (const creative of digitalCreatives) {
      const fileName = creative.originalFilename || creative.metadata?.originalFileName || 'Creative';
      
      // Try to get dimensions from specifications, metadata, or parse from filename
      let width = creative.specifications?.width || creative.metadata?.width;
      let height = creative.specifications?.height || creative.metadata?.height;
      
      // Parse dimensions from filename if not available (e.g., "300x250_MediumRectangle.png")
      if (!width || !height) {
        const dimMatch = fileName.match(/(\d+)x(\d+)/i);
        if (dimMatch) {
          width = parseInt(dimMatch[1]);
          height = parseInt(dimMatch[2]);
        } else {
          width = 300;
          height = 250;
        }
      }
      
      const sizeStr = `${width}x${height}`;
      
      // Determine channel: First check asset associations, then match to order placements by dimensions
      let channel = (creative.associations?.channel || creative.specifications?.channel || '').toLowerCase();
      
      // If no channel on asset, try to match to order's assetReferences by dimensions
      if (!channel && order.assetReferences) {
        const matchedRef = order.assetReferences.find((ref: any) => {
          const refDims = Array.isArray(ref.dimensions) ? ref.dimensions : [ref.dimensions];
          return refDims.some((d: string) => d === sizeStr);
        });
        if (matchedRef) {
          channel = (matchedRef.channel || '').toLowerCase();
          console.log(`[TrackingScript] Matched ${sizeStr} to placement "${matchedRef.placementName}" with channel "${channel}"`);
        }
      }
      
      // Default to website if still no channel
      if (!channel) {
        channel = 'website';
      }
      
      // Validate and get click URL - warn if missing
      const clickUrl = creative.digitalAdProperties?.clickUrl;
      if (!clickUrl) {
        console.warn(`[TrackingScript] WARNING: No click URL provided for creative ${creative.assetId || creative._id}. Using placeholder - ads will not redirect to landing page!`);
      }
      const finalClickUrl = clickUrl || `https://advertiser.example.com/landing`;
      
      const imageUrl = convertToCloudFrontUrl(creative.fileUrl || creative.metadata?.fileUrl || '');
      const altText = creative.digitalAdProperties?.altText || `${advertiserName} Ad`;
      const headline = creative.digitalAdProperties?.headline;
      const body = creative.digitalAdProperties?.body;
      const ctaText = creative.digitalAdProperties?.ctaText;
      const creativeId = creative.assetId || creative._id?.toString() || '';

      // Determine tracking channel type
      let trackingChannel: TrackingChannel = 'website';
      if (channel.includes('newsletter')) {
        trackingChannel = headline || body ? 'newsletter_text' : 'newsletter_image';
      } else if (channel.includes('streaming')) {
        trackingChannel = 'streaming';
      }

      const channelCode = CHANNEL_TYPE_CODES[trackingChannel] || 'd';
      const channelUrlCode = CHANNEL_URL_CODES[trackingChannel] || 'website';
      const orderId = order._id?.toString() || '';
      
      // Determine if this is a newsletter channel (needs email ID tracking)
      const isNewsletter = trackingChannel.includes('newsletter');

      // Build tracking URLs with full attribution parameters
      const urls = {
        impressionPixel: buildTrackingUrl(TRACKING_CDN_BASE_URL, TRACKING_PIXEL_PATH, 'display', {
          orderId,
          campaignId,
          publicationId,  // Using only publicationId (removed redundant publicationCode)
          channel: channelUrlCode,
          creativeId,
          size: sizeStr,
          itemPath: 'tracking-display',
          emailId: isNewsletter ? 'EMAIL_ID' : undefined  // Placeholder for ESP merge tag
        }),
        clickTracker: buildTrackingUrl(TRACKING_CDN_BASE_URL, TRACKING_PIXEL_PATH, 'click', {
          orderId,
          campaignId,
          publicationId,  // Using only publicationId
          channel: channelUrlCode,
          creativeId,
          redirectUrl: finalClickUrl,  // CRITICAL: Include landing page URL for redirect
          emailId: isNewsletter ? 'EMAIL_ID' : undefined
        }),
        creativeUrl: imageUrl || `${TRACKING_CDN_BASE_URL}/a/${creativeId}.jpg`
      };

      // Build creative info for tag generation
      const creativeInfo = {
        name: fileName || `${advertiserName} - ${sizeStr}`,
        clickUrl: finalClickUrl,
        imageUrl: urls.creativeUrl,
        width,
        height,
        altText,
        headline,
        body,
        ctaText
      };

      // Generate HTML tags based on channel
      // Note: function signature is (creative, urls, advertiserName, campaignName, [size])
      let fullTag = '';
      let simplifiedTag: string | undefined;

      if (trackingChannel === 'newsletter_text') {
        fullTag = generateNewsletterTextTag(creativeInfo, urls, advertiserName, campaignName);
      } else if (trackingChannel === 'newsletter_image') {
        fullTag = generateNewsletterImageTag(creativeInfo, urls, advertiserName, campaignName);
        simplifiedTag = generateNewsletterImageSimplifiedTag(urls, advertiserName, campaignName);
      } else {
        fullTag = generateDisplayAdTag(creativeInfo, urls, advertiserName, campaignName, sizeStr);
      }

      // Create script document
      const script = {
        campaignId,
        creativeId,
        publicationId,
        publicationName,
        channel: trackingChannel,
        creative: creativeInfo,
        urls,
        tags: {
          fullTag,
          simplifiedTag,
          comments: `<!-- ${advertiserName} | ${campaignName} | ${trackingChannel} | ${publicationName} -->`
        },
        espCompatibility: 'full' as const,
        generatedAt: new Date(),
        generatedBy: 'system',
        status: 'active' as const,
        impressionCount: 0,
        clickCount: 0
      };

      scriptsToInsert.push(script);
    }

    // Insert scripts
    if (scriptsToInsert.length > 0) {
      await scriptsCollection.insertMany(scriptsToInsert);
    }

    console.log(`Generated ${scriptsToInsert.length} tracking scripts for order ${campaignId}/${publicationId}`);

    return {
      success: true,
      scriptsGenerated: scriptsToInsert.length,
      scriptsDeleted
    };
  } catch (error) {
    console.error('Error generating tracking scripts:', error);
    return {
      success: false,
      scriptsGenerated: 0,
      scriptsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Refresh (regenerate) tracking scripts for an order
 * Deletes existing scripts and creates new ones from current creatives
 */
export async function refreshScriptsForOrder(
  campaignId: string,
  publicationId: number
): Promise<GenerateScriptsResult> {
  return generateScriptsForOrder(campaignId, publicationId, { deleteExisting: true });
}

/**
 * Generate tracking scripts for a single creative asset across ALL orders for that campaign.
 * This is called when a creative asset is uploaded, so scripts are generated automatically.
 */
export async function generateScriptsForAsset(
  asset: CreativeAsset & { _id?: ObjectId; assetId?: string }
): Promise<{ success: boolean; scriptsGenerated: number; error?: string }> {
  const db = getDatabase();
  const scriptsCollection = db.collection<TrackingScript>(COLLECTIONS.TRACKING_SCRIPTS);
  const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
  const campaignsCollection = db.collection(COLLECTIONS.CAMPAIGNS);

  try {
    // Get campaign ID from asset
    const campaignId = asset.associations?.campaignId || (asset as any).campaignId;
    if (!campaignId) {
      console.log('[TrackingScripts] Asset has no campaignId, skipping script generation');
      console.log('[TrackingScripts] Asset associations:', JSON.stringify(asset.associations || {}));
      return { success: true, scriptsGenerated: 0 };
    }

    // Check if this is a digital asset (image files for web/newsletter/streaming)
    const assetChannel = (
      asset.associations?.channel ||
      asset.specifications?.channel ||
      asset.metadata?.channel ||
      ''
    ).toLowerCase();

    const fileType = asset.fileType || asset.metadata?.fileType || '';
    const fileName = asset.originalFilename || asset.metadata?.originalFileName || '';
    const isImage = fileType.startsWith('image/') || 
                    ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                      fileName.toLowerCase().endsWith(`.${ext}`)
                    );
    
    const isDigitalChannel = DIGITAL_CHANNELS.some(dc => assetChannel.includes(dc));
    
    console.log(`[TrackingScripts] Processing asset: ${fileName}, fileType: ${fileType}, channel: ${assetChannel}, isImage: ${isImage}, isDigitalChannel: ${isDigitalChannel}`);
    
    // Only generate scripts for digital assets (images or explicitly digital channels)
    if (!isImage && !isDigitalChannel) {
      console.log(`[TrackingScripts] Asset ${fileName} is not digital (fileType: ${fileType}, channel: ${assetChannel}), skipping`);
      return { success: true, scriptsGenerated: 0 };
    }

    // Get campaign details
    const campaign = await campaignsCollection.findOne({ campaignId });
    if (!campaign) {
      console.log(`[TrackingScripts] Campaign ${campaignId} not found in database`);
      return { success: false, scriptsGenerated: 0, error: 'Campaign not found' };
    }

    const advertiserName = campaign.basicInfo?.advertiserName || 'Advertiser';
    const campaignName = campaign.basicInfo?.name || 'Campaign';
    console.log(`[TrackingScripts] Found campaign: ${campaignName}`);

    // Get ALL orders for this campaign
    const orders = await ordersCollection.find({
      campaignId,
      deletedAt: { $exists: false }
    }).toArray();

    if (orders.length === 0) {
      console.log(`[TrackingScripts] No orders found for campaign ${campaignId} - scripts cannot be generated without orders`);
      return { success: true, scriptsGenerated: 0 };
    }

    console.log(`[TrackingScripts] Generating scripts for asset "${fileName}" across ${orders.length} orders`);

    // Parse dimensions from asset
    let width = asset.specifications?.width || asset.metadata?.width;
    let height = asset.specifications?.height || asset.metadata?.height;
    
    // Parse dimensions from filename if not available (e.g., "300x250_MediumRectangle.png")
    if (!width || !height) {
      const dimMatch = fileName.match(/(\d+)x(\d+)/i);
      if (dimMatch) {
        width = parseInt(dimMatch[1]);
        height = parseInt(dimMatch[2]);
      } else {
        // Default dimensions for display ads
        width = 300;
        height = 250;
      }
    }

    // Validate and get click URL - warn if missing
    const clickUrl = asset.digitalAdProperties?.clickUrl;
    if (!clickUrl) {
      console.warn(`[TrackingScript] WARNING: No click URL provided for asset ${asset.assetId || asset._id}. Using placeholder - ads will not redirect to landing page!`);
    }
    const finalClickUrl = clickUrl || `https://advertiser.example.com/landing`;
    
    const imageUrl = convertToCloudFrontUrl(asset.fileUrl || asset.metadata?.fileUrl || '');
    const altText = asset.digitalAdProperties?.altText || `${advertiserName} Ad`;
    const headline = asset.digitalAdProperties?.headline;
    const body = asset.digitalAdProperties?.body;
    const ctaText = asset.digitalAdProperties?.ctaText;
    const creativeId = asset.assetId || asset._id?.toString() || '';
    const sizeStr = `${width}x${height}`;

    // Generate one script per order
    const scriptsToInsert: any[] = [];

    for (const order of orders) {
      const publicationId = order.publicationId;
      const publicationName = order.publicationName || 'Publication';
      const pubCode = publicationName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
      const orderId = order._id?.toString() || '';

      // Check if a script already exists for this asset + order combination
      const existingScript = await scriptsCollection.findOne({
        campaignId,
        publicationId,
        creativeId,
        deletedAt: { $exists: false }
      });

      if (existingScript) {
        console.log(`Script already exists for asset ${creativeId} / publication ${publicationId}`);
        continue;
      }

      // Determine channel: First check asset associations, then match to order placements by dimensions
      let channel = assetChannel;
      
      // If no channel on asset, try to match to order's assetReferences by dimensions
      if (!channel && order.assetReferences) {
        const matchedRef = order.assetReferences.find((ref: any) => {
          const refDims = Array.isArray(ref.dimensions) ? ref.dimensions : [ref.dimensions];
          return refDims.some((d: string) => d === sizeStr);
        });
        if (matchedRef) {
          channel = (matchedRef.channel || '').toLowerCase();
          console.log(`[TrackingScript] Matched ${sizeStr} to placement "${matchedRef.placementName}" with channel "${channel}" for pub ${publicationId}`);
        }
      }
      
      // Default to website if still no channel
      if (!channel) {
        channel = 'website';
      }
      
      // Determine tracking channel type based on resolved channel
      let trackingChannel: TrackingChannel = 'website';
      if (channel.includes('newsletter')) {
        trackingChannel = headline || body ? 'newsletter_text' : 'newsletter_image';
      } else if (channel.includes('streaming')) {
        trackingChannel = 'streaming';
      }

      const channelCode = CHANNEL_TYPE_CODES[trackingChannel] || 'd';
      const channelUrlCode = CHANNEL_URL_CODES[trackingChannel] || 'website';

      // Determine if this is a newsletter channel (needs email ID tracking)
      const isNewsletter = trackingChannel.includes('newsletter');

      // Build tracking URLs with full attribution parameters
      const urls = {
        impressionPixel: buildTrackingUrl(TRACKING_CDN_BASE_URL, TRACKING_PIXEL_PATH, 'display', {
          orderId,
          campaignId,
          publicationId,  // Using only publicationId (removed redundant publicationCode)
          channel: channelUrlCode,
          creativeId,
          size: sizeStr,
          itemPath: 'tracking-display',
          emailId: isNewsletter ? 'EMAIL_ID' : undefined  // Placeholder for ESP merge tag
        }),
        clickTracker: buildTrackingUrl(TRACKING_CDN_BASE_URL, TRACKING_PIXEL_PATH, 'click', {
          orderId,
          campaignId,
          publicationId,  // Using only publicationId
          channel: channelUrlCode,
          creativeId,
          redirectUrl: finalClickUrl,  // CRITICAL: Include landing page URL for redirect
          emailId: isNewsletter ? 'EMAIL_ID' : undefined
        }),
        creativeUrl: imageUrl || `${TRACKING_CDN_BASE_URL}/a/${creativeId}.jpg`
      };

      // Build creative info for tag generation
      const creativeInfo = {
        name: fileName || `${advertiserName} - ${sizeStr}`,
        clickUrl: finalClickUrl,
        imageUrl: urls.creativeUrl,
        width,
        height,
        altText,
        headline,
        body,
        ctaText
      };

      // Generate HTML tags based on channel
      let fullTag = '';
      let simplifiedTag: string | undefined;

      if (trackingChannel === 'newsletter_text') {
        fullTag = generateNewsletterTextTag(creativeInfo, urls, advertiserName, campaignName);
      } else if (trackingChannel === 'newsletter_image') {
        fullTag = generateNewsletterImageTag(creativeInfo, urls, advertiserName, campaignName);
        simplifiedTag = generateNewsletterImageSimplifiedTag(urls, advertiserName, campaignName);
      } else {
        fullTag = generateDisplayAdTag(creativeInfo, urls, advertiserName, campaignName, sizeStr);
      }

      // Create script document
      const script = {
        campaignId,
        creativeId,
        publicationId,
        publicationName,
        channel: trackingChannel,
        creative: creativeInfo,
        urls,
        tags: {
          fullTag,
          simplifiedTag,
          comments: `<!-- ${advertiserName} | ${campaignName} | ${trackingChannel} | ${publicationName} -->`
        },
        espCompatibility: 'full' as const,
        generatedAt: new Date(),
        generatedBy: 'system',
        status: 'active' as const,
        impressionCount: 0,
        clickCount: 0
      };

      scriptsToInsert.push(script);
    }

    // Insert scripts
    if (scriptsToInsert.length > 0) {
      await scriptsCollection.insertMany(scriptsToInsert);
      console.log(`Generated ${scriptsToInsert.length} tracking scripts for asset ${fileName}`);
    }

    return {
      success: true,
      scriptsGenerated: scriptsToInsert.length
    };
  } catch (error) {
    console.error('Error generating tracking scripts for asset:', error);
    return {
      success: false,
      scriptsGenerated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
