/**
 * Tracking Script Schema
 * 
 * For future digital tracking. Stores generated tags per creative/publication combination.
 * Includes impression pixels, click trackers, and full HTML snippets.
 * 
 * Key design decisions:
 * - Denormalizes creative info for self-contained tag generation
 * - Supports both full HTML and simplified versions for limited ESP support
 * - Tracks versioning for tag regeneration
 */

import { ObjectId } from 'mongodb';

// Digital channels that support pixel tracking
export type TrackingChannel = 'website' | 'newsletter_image' | 'newsletter_text' | 'streaming';

// ESP HTML support levels
export type ESPCompatibility = 'full' | 'limited' | 'none';

/**
 * Creative information denormalized for tag generation
 */
export interface TrackingCreativeInfo {
  name: string;
  clickUrl: string;          // Landing page URL
  imageUrl?: string;         // S3/CloudFront path to creative image
  width?: number;            // Image width in pixels
  height?: number;           // Image height in pixels
  altText?: string;          // Alt text for accessibility
  // For newsletter text ads
  headline?: string;
  body?: string;
  ctaText?: string;          // Call-to-action button text
}

/**
 * Generated tracking URLs
 * 
 * URL Format: https://{cloudfront-domain}/pxl.png?oid={orderId}&cid={campaignId}&p={pubCode}&ch={channel}&t={eventType}&...
 * 
 * Required params: oid, cid, p, ch, t, cb
 * Optional params: cr, pid, s, ip
 */
export interface TrackingUrls {
  impressionPixel: string;   // e.g., "https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=xxx&cid=camp_xxx&p=chireader&ch=website&t=display&s=300x250&cb=..."
  clickTracker: string;      // e.g., "https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=xxx&cid=camp_xxx&p=chireader&ch=website&t=click&cb=..."
  creativeUrl: string;       // e.g., "https://cdn.network.com/a/xxx.jpg"
}

/**
 * Generated HTML tag snippets
 */
export interface TrackingTags {
  fullTag: string;           // Complete HTML for full ESP support
  simplifiedTag?: string;    // For limited HTML ESPs (just URLs for manual linking)
  comments: string;          // HTML comment with campaign/advertiser info for identification
}

/**
 * Tracking Script Document
 * 
 * Represents generated tracking tags for a specific creative/publication combination.
 */
export interface TrackingScript {
  _id?: string | ObjectId;
  
  // References
  campaignId: string;
  creativeId: string;          // FK to creative_assets
  publicationId: number;
  publicationCode?: string;    // DEPRECATED - kept for backward compatibility, no longer used in URLs
  publicationName: string;     // Denormalized for display
  
  // Channel type
  channel: TrackingChannel;
  
  // Creative info (denormalized for tag generation)
  creative: TrackingCreativeInfo;
  
  // Generated tracking URLs
  urls: TrackingUrls;
  
  // Generated HTML snippets
  tags: TrackingTags;
  
  // Newsletter ESP compatibility
  espCompatibility?: ESPCompatibility;
  
  // Metadata
  generatedAt: Date;
  generatedBy: string;         // User ID who generated
  version: number;             // Increment on regeneration
  
  // Soft delete
  deletedAt?: Date;
}

// Type for creating new scripts
export type TrackingScriptInsert = Omit<TrackingScript, '_id'>;

// Type for updating scripts
export type TrackingScriptUpdate = Partial<Omit<TrackingScript, '_id' | 'campaignId' | 'creativeId' | 'publicationId'>>;

/**
 * Tag URL parameter reference
 * 
 * Required parameters for performance tracking attribution:
 * - oid: Order ID (MongoDB _id from publication_insertion_orders)
 * - cid: Campaign ID (campaign identifier)
 * - p: Publication code (publication slug)
 * - ch: Channel (website, newsletter, streaming, social, podcast)
 * - t: Event type (display, click, view)
 * - cb: Cache buster (timestamp)
 * 
 * Optional parameters:
 * - cr: Creative ID
 * - pid: Publication numeric ID
 * - s: Ad size (e.g., 300x250)
 * - ip: Item path (inventory path in order)
 */
export const TAG_URL_PARAMS = {
  oid: 'order_id',             // MongoDB _id from publication_insertion_orders
  cid: 'campaign_id',          // Campaign identifier
  p: 'publication_code',       // Publication short code
  pid: 'publication_id',       // Numeric publication ID
  ch: 'channel',               // website, newsletter, streaming, social, podcast
  t: 'event_type',             // display, click, view
  cr: 'creative_id',           // Creative identifier (optional)
  s: 'size',                   // Ad size (e.g., 300x250)
  ip: 'item_path',             // Inventory path in order
  cb: 'cache_buster',          // Timestamp to prevent caching
};

/**
 * Channel type codes for internal tracking channel types
 * Maps internal TrackingChannel to display codes
 */
export const CHANNEL_TYPE_CODES: Record<TrackingChannel, string> = {
  website: 'display',
  newsletter_image: 'nli',
  newsletter_text: 'nlt',
  streaming: 'stream',
};

/**
 * Channel URL codes for pixel URL `ch` parameter
 * Maps internal TrackingChannel to URL channel values
 */
export const CHANNEL_URL_CODES: Record<TrackingChannel, string> = {
  website: 'website',
  newsletter_image: 'newsletter',
  newsletter_text: 'newsletter',
  streaming: 'streaming',
};

/**
 * Event types for pixel URL `t` parameter
 */
export type TrackingEventType = 'display' | 'click' | 'view';

/**
 * Generate display ad tag HTML
 */
export function generateDisplayAdTag(
  creative: TrackingCreativeInfo,
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string,
  size: string
): string {
  return `<!-- ${advertiserName} | ${campaignName} | ${size} -->
<a href="${urls.clickTracker}">
  <img src="${urls.creativeUrl}" 
       width="${creative.width}" height="${creative.height}" border="0" alt="${creative.altText || ''}" />
</a>
<img src="${urls.impressionPixel}" 
     width="1" height="1" style="display:none;" />`;
}

/**
 * Generate newsletter image tag HTML (full ESP support)
 * 
 * Best practices for email client compatibility:
 * - Table-based layout (works in Outlook, Gmail, Yahoo, Apple Mail)
 * - Inline CSS only (external/head styles often stripped)
 * - Descriptive alt text (shows when images blocked - ~40% of users)
 * - border="0" attribute (prevents blue border in some clients)
 * - Explicit width/height (prevents layout shift)
 * - "Sponsored" label for FTC compliance
 * 
 * Note: Impression tracking may be inflated due to:
 * - Apple Mail Privacy Protection (pre-loads all images)
 * - Gmail image proxy caching
 * Click tracking is more reliable for engagement measurement.
 */
export function generateNewsletterImageTag(
  creative: TrackingCreativeInfo,
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  const altText = creative.altText || `${advertiserName} - Click to learn more`;
  
  return `<!-- ${advertiserName} | ${campaignName} | Newsletter Ad -->
<!-- Note: Click tracking is most reliable. Impressions may be inflated by Apple Mail Privacy Protection. -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:10px 0;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#999999;padding-bottom:4px;">
            Sponsored
          </td>
        </tr>
        <tr>
          <td>
            <a href="${urls.clickTracker}" target="_blank" style="text-decoration:none;">
              <img src="${urls.creativeUrl}" 
                   width="${creative.width}" 
                   height="${creative.height}"
                   alt="${altText}"
                   title="${altText}"
                   style="display:block;max-width:100%;height:auto;border:0;" 
                   border="0" />
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<img src="${urls.impressionPixel}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" border="0" />`;
}

/**
 * Generate newsletter image tag for limited ESP support
 * Some ESPs have restricted HTML support - this provides essential URLs
 * that can be manually inserted into their native image/link blocks.
 */
export function generateNewsletterImageSimplifiedTag(
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  return `<!-- ${advertiserName} | ${campaignName} | Simplified Version -->
<!-- Use these URLs in your ESP's native image/link blocks: -->
<!--
  LINK URL (wrap the image with this):
  ${urls.clickTracker}

  IMAGE URL (the ad creative):
  ${urls.creativeUrl}

  IMPRESSION PIXEL (add as 1x1 hidden image):
  ${urls.impressionPixel}
-->

<!-- Or copy this minimal HTML if your ESP supports it: -->
<a href="${urls.clickTracker}"><img src="${urls.creativeUrl}" alt="${advertiserName}" style="max-width:100%;border:0;" border="0" /></a>
<img src="${urls.impressionPixel}" width="1" height="1" alt="" style="display:none;" />`;
}

/**
 * Generate newsletter text tag HTML (text-based ad for newsletters)
 * 
 * Best for:
 * - Newsletters with minimal image usage
 * - Better deliverability (no images to block)
 * - Works even when images disabled
 * - Native feel within newsletter content
 */
export function generateNewsletterTextTag(
  creative: TrackingCreativeInfo,
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  const headline = creative.headline || advertiserName;
  const body = creative.body || '';
  const ctaText = creative.ctaText || 'Learn More';
  
  return `<!-- ${advertiserName} | ${campaignName} | Newsletter Text Ad -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:15px 0;">
  <tr>
    <td style="background-color:#f5f5f5;padding:15px;border-radius:4px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#999999;text-transform:uppercase;padding-bottom:8px;">
            Sponsored
          </td>
        </tr>
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#333333;line-height:1.3;padding-bottom:8px;">
            <a href="${urls.clickTracker}" target="_blank" style="color:#333333;text-decoration:none;">${headline}</a>
          </td>
        </tr>
        ${body ? `<tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#555555;line-height:1.5;padding-bottom:12px;">
            ${body}
          </td>
        </tr>` : ''}
        <tr>
          <td>
            <a href="${urls.clickTracker}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#0066cc;text-decoration:none;">${ctaText} &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<img src="${urls.impressionPixel}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" border="0" />`;
}

/**
 * Build tracking URL with parameters
 * 
 * @param baseUrl - Base URL for tracking pixel (e.g., "https://dxafls8akrlrp.cloudfront.net")
 * @param pixelPath - Path to pixel endpoint (e.g., "/pxl.png" for impressions)
 * @param eventType - Event type: 'display' (impression), 'click', or 'view'
 * @param params - URL parameters for tracking
 * @returns Complete tracking URL with all parameters
 * 
 * URL Structure:
 * - Impressions: /pxl.png?oid=...&cid=...&pid=...&ch=...&t=display&cb=CACHE_BUSTER
 * - Clicks: /c?oid=...&cid=...&pid=...&ch=...&t=click&r={encodedLandingUrl}
 * - Viewability: /v (POST with JSON body)
 */
export function buildTrackingUrl(
  baseUrl: string,
  pixelPath: string,
  eventType: TrackingEventType,
  params: {
    orderId: string;           // Required - MongoDB _id from publication_insertion_orders
    campaignId: string;        // Required - Campaign identifier
    publicationId: number;     // Required - Numeric publication ID (removed publicationCode - was redundant)
    channel: string;           // Required - website, newsletter, streaming, etc.
    creativeId?: string;       // Optional - Creative identifier
    size?: string;             // Optional - Ad dimensions (e.g., "728x90")
    itemPath?: string;         // Optional - Inventory path in order
    redirectUrl?: string;      // Required for clicks - Landing page URL
    emailId?: string;          // Optional - Newsletter subscriber ID placeholder (for ESP merge tag)
  }
): string {
  // Use different paths for different event types
  let path = pixelPath;
  if (eventType === 'click') {
    path = '/c';  // Click redirect endpoint
  } else if (eventType === 'view' || eventType === 'display') {
    path = '/v';  // Impression/view pixel endpoint
  }
  
  const url = new URL(`${baseUrl}${path}`);
  
  // Required parameters
  url.searchParams.set('oid', params.orderId);
  url.searchParams.set('cid', params.campaignId);
  url.searchParams.set('pid', params.publicationId.toString());  // Using only pid (removed redundant p/publicationCode)
  url.searchParams.set('ch', params.channel);
  url.searchParams.set('t', eventType);
  
  // Cache buster - use placeholder that ad servers/ESPs will replace
  // GAM: %%CACHEBUSTER%%, Broadstreet: [timestamp], ESP merge tags vary
  // For base tags, use CACHE_BUSTER placeholder
  url.searchParams.set('cb', 'CACHE_BUSTER');
  
  // Optional parameters
  if (params.creativeId) {
    url.searchParams.set('cr', params.creativeId);
  }
  if (params.size) {
    url.searchParams.set('s', params.size);
  }
  if (params.itemPath) {
    url.searchParams.set('ip', params.itemPath);
  }
  
  // Email ID placeholder for newsletter tracking (ESP will replace with subscriber ID)
  if (params.emailId) {
    url.searchParams.set('eid', params.emailId);
  }
  
  // Redirect URL for click tracking - REQUIRED for clicks to work
  // Note: searchParams.set() already URL-encodes values, don't double-encode
  if (eventType === 'click' && params.redirectUrl) {
    url.searchParams.set('r', params.redirectUrl);
  }
  
  return url.toString();
}

/**
 * Validate tracking script data
 */
export function validateTrackingScript(script: Partial<TrackingScript>): string[] {
  const errors: string[] = [];
  
  if (!script.campaignId) errors.push('campaignId is required');
  if (!script.creativeId) errors.push('creativeId is required');
  if (!script.publicationId) errors.push('publicationId is required');
  // publicationCode is now optional/deprecated - no longer validated
  if (!script.channel) errors.push('channel is required');
  if (!script.creative) errors.push('creative info is required');
  if (!script.urls) errors.push('urls are required');
  if (!script.tags) errors.push('tags are required');
  if (!script.generatedBy) errors.push('generatedBy is required');
  
  // Validate creative info based on channel
  if (script.creative && script.channel) {
    if (script.channel === 'newsletter_text') {
      if (!script.creative.headline) errors.push('headline is required for newsletter text');
      if (!script.creative.body) errors.push('body is required for newsletter text');
    } else {
      if (!script.creative.imageUrl) errors.push('imageUrl is required for image-based ads');
      if (!script.creative.width) errors.push('width is required for image-based ads');
      if (!script.creative.height) errors.push('height is required for image-based ads');
    }
    if (!script.creative.clickUrl) errors.push('clickUrl is required');
  }
  
  return errors;
}
