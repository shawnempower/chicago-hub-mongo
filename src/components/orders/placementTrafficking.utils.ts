/**
 * Placement Trafficking Utilities
 * 
 * Extracts channel-specific trafficking information from inventory items.
 * Uses existing calculation utilities for consistency.
 */

import { HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';
import { TrackingScript } from '@/integrations/mongodb/trackingScriptSchema';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { getItemAudienceSize, getItemImpressions } from '@/utils/reachCalculations';
import { inferOccurrencesFromFrequency } from '@/utils/pricingCalculations';
import {
  PlacementTraffickingInfo,
  WebsiteTraffickingInfo,
  NewsletterTraffickingInfo,
  PrintTraffickingInfo,
  RadioTraffickingInfo,
  PodcastTraffickingInfo,
  StreamingTraffickingInfo,
  EventsTraffickingInfo,
  SocialTraffickingInfo,
  GenericTraffickingInfo,
} from './placementTrafficking.types';

interface ExtractOptions {
  campaignStartDate?: Date | null;
  campaignEndDate?: Date | null;
  trackingScripts?: TrackingScript[];
  placementStatus?: 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered';
  durationMonths?: number;
  assets?: Array<{
    placementId: string;
    hasAsset: boolean;
    asset?: {
      fileUrl: string;
      fileName: string;
    };
  }>;
}

/**
 * Extract trafficking info from an inventory item based on its channel
 */
export function extractTraffickingInfo(
  item: HubPackageInventoryItem,
  itemIndex: number,
  options: ExtractOptions = {}
): PlacementTraffickingInfo | GenericTraffickingInfo {
  const {
    campaignStartDate,
    campaignEndDate,
    trackingScripts = [],
    placementStatus = 'pending',
    durationMonths = 1,
    assets = [],
  } = options;

  const placementId = item.itemPath || (item as any).sourcePath || `placement-${itemIndex}`;
  const channel = (item.channel || 'other').toLowerCase();
  
  // Calculate earnings using existing utility
  const frequency = item.currentFrequency || item.quantity || 1;
  const earnings = calculateItemCost(item, frequency, durationMonths);

  const baseInfo = {
    placementId,
    placementName: item.itemName || (item as any).sourceName || 'Ad Placement',
    status: placementStatus,
    earnings,
    period: {
      startDate: campaignStartDate || null,
      endDate: campaignEndDate || null,
    },
  };

  // Find asset for this placement
  const placementAsset = assets.find(a => a.placementId === placementId);

  switch (channel) {
    case 'website':
      return extractWebsiteInfo(item, baseInfo, trackingScripts);
    case 'newsletter':
      return extractNewsletterInfo(item, baseInfo, trackingScripts);
    case 'print':
      return extractPrintInfo(item, baseInfo, placementAsset);
    case 'radio':
      return extractRadioInfo(item, baseInfo, placementAsset);
    case 'podcast':
      return extractPodcastInfo(item, baseInfo);
    case 'streaming':
      return extractStreamingInfo(item, baseInfo, trackingScripts);
    case 'events':
      return extractEventsInfo(item, baseInfo);
    case 'social_media':
    case 'social':
      return extractSocialInfo(item, baseInfo);
    default:
      return extractGenericInfo(item, baseInfo);
  }
}

/**
 * Website/Display Ads - Unit: Impressions
 */
function extractWebsiteInfo(
  item: HubPackageInventoryItem,
  baseInfo: any,
  trackingScripts: TrackingScript[]
): WebsiteTraffickingInfo {
  // Get impressions using existing utility
  const monthlyImpressions = getItemImpressions(item) || item.monthlyImpressions || 0;
  const audienceSize = getItemAudienceSize(item);
  
  // Parse dimensions - may be string or array
  const dimensions = item.format?.dimensions;
  const sizeList = parseDimensions(dimensions);
  
  // Match scripts to sizes
  // Scripts can have channel: 'website' or 'display' depending on how they were generated
  const availableSizes = sizeList.map(dim => {
    const [width, height] = dim.split(/x/i).map(d => parseInt(d?.trim()));
    const matchingScript = trackingScripts.find(s => 
      (s.channel === 'display' || s.channel === 'website') && 
      s.creative.width === width && 
      s.creative.height === height
    );
    return {
      dimensions: dim,
      script: matchingScript,
    };
  });

  // If no specific sizes parsed, try to get scripts for this channel
  if (availableSizes.length === 0) {
    const channelScripts = trackingScripts.filter(s => s.channel === 'display' || s.channel === 'website');
    channelScripts.forEach(script => {
      if (script.creative.width && script.creative.height) {
        availableSizes.push({
          dimensions: `${script.creative.width}x${script.creative.height}`,
          script,
        });
      }
    });
  }

  return {
    ...baseInfo,
    channel: 'website',
    totalImpressions: monthlyImpressions,
    availableSizes,
    audienceContext: {
      monthlyVisitors: item.audienceMetrics?.monthlyVisitors || audienceSize,
      monthlyPageViews: item.audienceMetrics?.monthlyPageViews,
    },
  };
}

/**
 * Newsletter - Unit: Sends
 */
function extractNewsletterInfo(
  item: HubPackageInventoryItem,
  baseInfo: any,
  trackingScripts: TrackingScript[]
): NewsletterTraffickingInfo {
  // currentFrequency represents number of sends purchased
  const sends = item.currentFrequency || item.quantity || 1;
  const subscriberCount = item.audienceMetrics?.subscribers || getItemAudienceSize(item);
  
  // Get newsletter-specific scripts
  const scripts = trackingScripts.filter(s => 
    s.channel?.includes('newsletter') || 
    ['newsletter_image', 'newsletter_text'].includes(s.channel)
  );

  return {
    ...baseInfo,
    channel: 'newsletter',
    sends,
    newsletterName: (item as any).sourceName || item.itemName,
    position: (item as any).position,
    dimensions: typeof item.format?.dimensions === 'string' ? item.format.dimensions : undefined,
    subscriberCount,
    openRate: (item as any).openRate,
    scripts,
  };
}

/**
 * Print - Unit: Insertions
 */
function extractPrintInfo(
  item: HubPackageInventoryItem,
  baseInfo: any,
  placementAsset?: { hasAsset: boolean; asset?: { fileUrl: string } }
): PrintTraffickingInfo {
  // currentFrequency represents number of insertions
  const insertions = item.currentFrequency || item.quantity || 1;
  const circulationPerIssue = item.audienceMetrics?.circulation || 0;
  const totalCirculation = insertions * circulationPerIssue;
  // Standard pass-along rate of 2.5x for print
  const estimatedReach = Math.round(totalCirculation * 2.5);

  return {
    ...baseInfo,
    channel: 'print',
    insertions,
    dimensions: typeof item.format?.dimensions === 'string' ? item.format.dimensions : undefined,
    editions: (item as any).editions || (item as any).runDays,
    circulationPerIssue,
    totalCirculation,
    estimatedReach,
    hasAsset: placementAsset?.hasAsset || false,
    assetUrl: placementAsset?.asset?.fileUrl,
  };
}

/**
 * Radio - Unit: Spots
 */
function extractRadioInfo(
  item: HubPackageInventoryItem,
  baseInfo: any,
  placementAsset?: { hasAsset: boolean; asset?: { fileUrl: string } }
): RadioTraffickingInfo {
  // currentFrequency represents number of spots
  const spots = item.currentFrequency || item.quantity || 1;
  const listenersPerSpot = item.audienceMetrics?.listeners || getItemAudienceSize(item) || 0;
  const totalEstimatedListeners = spots * listenersPerSpot;

  return {
    ...baseInfo,
    channel: 'radio',
    spots,
    duration: item.format?.duration,
    dayparts: (item as any).dayparts || (item as any).timeSlots,
    showName: (item as any).sourceName || (item as any).showName,
    listenersPerSpot,
    totalEstimatedListeners,
    hasAsset: placementAsset?.hasAsset || false,
    assetUrl: placementAsset?.asset?.fileUrl,
    scriptText: (item as any).scriptText,
  };
}

/**
 * Podcast - Unit: Episodes
 */
function extractPodcastInfo(
  item: HubPackageInventoryItem,
  baseInfo: any
): PodcastTraffickingInfo {
  // currentFrequency represents number of episodes
  const episodes = item.currentFrequency || item.quantity || 1;
  const downloadsPerEpisode = item.audienceMetrics?.listeners || 
    (item as any).averageDownloads || 
    getItemAudienceSize(item) || 0;
  const totalEstimatedDownloads = episodes * downloadsPerEpisode;

  return {
    ...baseInfo,
    channel: 'podcast',
    episodes,
    position: (item as any).adPosition || (item as any).position,
    duration: item.format?.duration,
    type: (item as any).adType,
    podcastName: (item as any).sourceName || (item as any).podcastName,
    downloadsPerEpisode,
    totalEstimatedDownloads,
    talkingPoints: (item as any).talkingPoints,
    landingUrl: (item as any).landingUrl,
  };
}

/**
 * Streaming Video - Unit: Views
 */
function extractStreamingInfo(
  item: HubPackageInventoryItem,
  baseInfo: any,
  trackingScripts: TrackingScript[]
): StreamingTraffickingInfo {
  const totalViews = getItemImpressions(item) || item.monthlyImpressions || 0;
  const subscriberCount = item.audienceMetrics?.subscribers || 
    (item as any).subscribers || 
    getItemAudienceSize(item);

  const scripts = trackingScripts.filter(s => s.channel === 'streaming');

  return {
    ...baseInfo,
    channel: 'streaming',
    totalViews,
    position: (item as any).adPosition || (item as any).position,
    duration: item.format?.duration,
    channelName: (item as any).sourceName || (item as any).channelName,
    subscriberCount,
    scripts,
  };
}

/**
 * Events - Unit: Deliverables
 */
function extractEventsInfo(
  item: HubPackageInventoryItem,
  baseInfo: any
): EventsTraffickingInfo {
  const expectedAttendance = item.audienceMetrics?.expectedAttendees || 
    item.audienceMetrics?.averageAttendance ||
    getItemAudienceSize(item);

  // Parse deliverables from item if available
  const deliverables = (item as any).deliverables || (item as any).benefits?.map((b: string) => ({
    item: b,
    completed: false,
  }));

  return {
    ...baseInfo,
    channel: 'events',
    eventName: (item as any).sourceName || (item as any).eventName || item.itemName,
    eventDates: (item as any).eventDates,
    expectedAttendance,
    sponsorshipLevel: (item as any).sponsorshipLevel || (item as any).level,
    deliverables,
  };
}

/**
 * Social Media - Unit: Posts
 */
function extractSocialInfo(
  item: HubPackageInventoryItem,
  baseInfo: any
): SocialTraffickingInfo {
  // currentFrequency represents number of posts
  const posts = item.currentFrequency || item.quantity || 1;
  const followers = item.audienceMetrics?.followers || getItemAudienceSize(item) || 0;
  // Estimate 10% reach of followers per post
  const estimatedReach = Math.round(posts * followers * 0.1);

  return {
    ...baseInfo,
    channel: 'social_media',
    posts,
    platform: (item as any).platform || (item as any).sourceName,
    followers,
    estimatedReach,
    contentType: (item as any).contentType || (item as any).postType,
  };
}

/**
 * Generic/Other channels
 */
function extractGenericInfo(
  item: HubPackageInventoryItem,
  baseInfo: any
): GenericTraffickingInfo {
  const quantity = item.currentFrequency || item.quantity || 1;
  const audienceSize = getItemAudienceSize(item);

  return {
    ...baseInfo,
    quantity,
    unit: 'placements',
    audienceSize,
    details: item.itemName,
  };
}

/**
 * Parse dimensions string/array into array of dimension strings
 */
function parseDimensions(dimensions: string | string[] | undefined): string[] {
  if (!dimensions) return [];
  if (Array.isArray(dimensions)) return dimensions;
  
  // Handle comma-separated or various formats
  return dimensions
    .split(/[,;]/)
    .map(d => d.trim())
    .filter(d => d.length > 0);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number | undefined): string {
  if (!num) return '—';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return 'TBD';
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  if (start && end) {
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }
  if (start) {
    return `Starting ${start.toLocaleDateString('en-US', options)}`;
  }
  if (end) {
    return `Until ${end.toLocaleDateString('en-US', options)}`;
  }
  return 'TBD';
}

/**
 * Group website placements by their sizes for consolidated display
 */
export function groupWebsitePlacements(
  items: WebsiteTraffickingInfo[]
): WebsiteTraffickingInfo[] {
  // For now, return as-is - grouping logic can be enhanced if needed
  // The current implementation already handles multiple sizes per placement
  return items;
}
