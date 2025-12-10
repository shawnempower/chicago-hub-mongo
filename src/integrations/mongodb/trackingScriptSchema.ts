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
 */
export interface TrackingUrls {
  impressionPixel: string;   // e.g., "https://cdn.network.com/i.gif?cr=xxx&p=nash&t=display&s=300x250"
  clickTracker: string;      // e.g., "https://cdn.network.com/c?cr=xxx&p=nash&t=display"
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
  publicationCode: string;     // Short code for URLs (e.g., "nash", "chi")
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
 */
export const TAG_URL_PARAMS = {
  cr: 'creative_id',           // Creative identifier
  p: 'publication_code',       // Publication short code
  t: 'channel_type',           // display, nli (newsletter image), nlt (newsletter text), stream
  s: 'size',                   // Ad size (e.g., 300x250)
};

/**
 * Channel type codes for URL parameters
 */
export const CHANNEL_TYPE_CODES: Record<TrackingChannel, string> = {
  website: 'display',
  newsletter_image: 'nli',
  newsletter_text: 'nlt',
  streaming: 'stream',
};

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
 */
export function generateNewsletterImageTag(
  creative: TrackingCreativeInfo,
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  return `<!-- ${advertiserName} | ${campaignName} | Newsletter Image -->
<a href="${urls.clickTracker}">
  <img src="${urls.creativeUrl}" 
       width="${creative.width}" style="max-width:100%;height:auto;" alt="${creative.altText || ''}" />
</a>
<img src="${urls.impressionPixel}" 
     width="1" height="1" style="display:none;" />`;
}

/**
 * Generate newsletter image tag for limited ESP support (just URLs)
 */
export function generateNewsletterImageSimplifiedTag(
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  return `<!-- ${advertiserName} | ${campaignName} | Limited HTML Version -->
<!-- Image URL (link to): ${urls.clickTracker} -->
<!-- Image source: ${urls.creativeUrl} -->`;
}

/**
 * Generate newsletter text tag HTML
 */
export function generateNewsletterTextTag(
  creative: TrackingCreativeInfo,
  urls: TrackingUrls,
  advertiserName: string,
  campaignName: string
): string {
  return `<!-- ${advertiserName} | ${campaignName} | Newsletter Text -->
<table role="presentation" width="100%" style="background:#f5f5f5;padding:15px;margin:15px 0;">
  <tr>
    <td style="font-family:Arial,sans-serif;">
      <p style="font-size:11px;color:#999;margin:0 0 5px 0;text-transform:uppercase;">Sponsored</p>
      <p style="font-size:18px;font-weight:bold;margin:0 0 10px 0;line-height:1.3;">
        <a href="${urls.clickTracker}" 
           style="color:#333333;text-decoration:none;">${creative.headline || ''}</a>
      </p>
      <p style="font-size:14px;color:#555555;margin:0 0 12px 0;line-height:1.5;">${creative.body || ''}</p>
      <a href="${urls.clickTracker}" 
         style="color:#0066cc;font-size:14px;font-weight:bold;text-decoration:none;">${creative.ctaText || 'Learn More'} →</a>
    </td>
  </tr>
</table>
<img src="${urls.impressionPixel}" 
     width="1" height="1" style="display:none;" />`;
}

/**
 * Build tracking URL with parameters
 */
export function buildTrackingUrl(
  baseUrl: string,
  endpoint: 'i.gif' | 'c' | 'a',
  params: {
    creativeId: string;
    publicationCode: string;
    channelType: string;
    size?: string;
  }
): string {
  const url = new URL(`${baseUrl}/${endpoint}`);
  url.searchParams.set('cr', params.creativeId);
  url.searchParams.set('p', params.publicationCode);
  url.searchParams.set('t', params.channelType);
  if (params.size) {
    url.searchParams.set('s', params.size);
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
  if (!script.publicationCode) errors.push('publicationCode is required');
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
