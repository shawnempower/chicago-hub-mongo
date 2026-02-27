/**
 * Placement Trafficking Types
 * 
 * Channel-specific interfaces for displaying trafficking information to publications.
 * Each channel has its own "unit of delivery" and specific information needed to execute.
 * 
 * Uses existing calculation utilities from:
 * - reachCalculations.ts (getItemAudienceSize, getItemImpressions)
 * - inventoryPricing.ts (calculateItemCost)
 * - pricingCalculations.ts (inferOccurrencesFromFrequency)
 */

import { TrackingScript } from '@/integrations/mongodb/trackingScriptSchema';

// Base interface for all placement trafficking info
export interface BasePlacementInfo {
  placementId: string;
  placementName: string;
  channel: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered' | 'suspended';
  earnings: number;  // Total earnings for this placement (calculated via calculateItemCost)
  period: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Website/Display Ads
 * Unit of delivery: Impressions (grouped across sizes)
 */
export interface WebsiteTraffickingInfo extends BasePlacementInfo {
  channel: 'website';
  totalImpressions: number;  // Grouped total - publication distributes as needed
  availableSizes: Array<{
    dimensions: string;
    script?: TrackingScript;
  }>;
  audienceContext: {
    monthlyVisitors?: number;
    monthlyPageViews?: number;
  };
}

/**
 * Newsletter
 * Unit of delivery: Sends
 */
export interface NewsletterTraffickingInfo extends BasePlacementInfo {
  channel: 'newsletter';
  sends: number;  // Number of newsletter sends
  newsletterName?: string;  // If publication has multiple newsletters
  position?: string;  // header, inline, footer
  dimensions?: string;  // e.g., "600x200"
  schedule?: string[];  // Specific send dates if known
  subscriberCount?: number;
  openRate?: number;
  scripts?: TrackingScript[];
}

/**
 * Print
 * Unit of delivery: Insertions (issues)
 */
export interface PrintTraffickingInfo extends BasePlacementInfo {
  channel: 'print';
  insertions: number;  // Number of issues to run in
  dimensions?: string;  // e.g., "10\" x 9.875\""
  editions?: string;  // e.g., "Monday-Saturday"
  circulationPerIssue?: number;
  totalCirculation?: number;  // insertions × circulation
  estimatedReach?: number;  // with pass-along factor
  hasAsset?: boolean;
  assetUrl?: string;
}

/**
 * Radio
 * Unit of delivery: Spots (airings)
 */
export interface RadioTraffickingInfo extends BasePlacementInfo {
  channel: 'radio';
  spots: number;  // Total number of airings
  duration?: number;  // Spot duration in seconds (30, 60)
  dayparts?: string[];  // e.g., ["Morning Drive", "Afternoon Drive"]
  showName?: string;  // Specific show if applicable
  listenersPerSpot?: number;
  totalEstimatedListeners?: number;
  hasAsset?: boolean;
  assetUrl?: string;
  scriptText?: string;
}

/**
 * Podcast
 * Unit of delivery: Episodes
 */
export interface PodcastTraffickingInfo extends BasePlacementInfo {
  channel: 'podcast';
  episodes: number;  // Number of episodes to include ad
  position?: 'pre-roll' | 'mid-roll' | 'post-roll';
  duration?: number;  // Duration in seconds
  type?: 'host-read' | 'pre-recorded';
  podcastName?: string;
  downloadsPerEpisode?: number;
  totalEstimatedDownloads?: number;
  talkingPoints?: string;
  landingUrl?: string;
}

/**
 * Streaming Video
 * Unit of delivery: Views/Plays
 */
export interface StreamingTraffickingInfo extends BasePlacementInfo {
  channel: 'streaming';
  totalViews: number;
  position?: 'pre-roll' | 'mid-roll' | 'post-roll';
  duration?: number;
  channelName?: string;
  subscriberCount?: number;
  scripts?: TrackingScript[];
}

/**
 * Events
 * Unit of delivery: Deliverables
 */
export interface EventsTraffickingInfo extends BasePlacementInfo {
  channel: 'events';
  eventName?: string;
  eventDates?: string[];  // Specific event dates
  expectedAttendance?: number;
  sponsorshipLevel?: string;  // e.g., "Gold", "Silver"
  deliverables?: Array<{
    item: string;
    description?: string;
    completed?: boolean;
  }>;
}

/**
 * Social Media
 * Unit of delivery: Posts
 */
export interface SocialTraffickingInfo extends BasePlacementInfo {
  channel: 'social_media' | 'social';
  posts: number;  // Number of posts
  platform?: string;  // e.g., "Instagram", "Facebook"
  followers?: number;
  estimatedReach?: number;
  contentType?: string;  // e.g., "Story", "Feed Post", "Reel"
}

// Union type for all trafficking info
export type PlacementTraffickingInfo = 
  | WebsiteTraffickingInfo 
  | NewsletterTraffickingInfo 
  | PrintTraffickingInfo 
  | RadioTraffickingInfo 
  | PodcastTraffickingInfo 
  | StreamingTraffickingInfo
  | EventsTraffickingInfo 
  | SocialTraffickingInfo;

/**
 * Generic placement info for unknown or "other" channels
 */
export interface GenericTraffickingInfo extends BasePlacementInfo {
  quantity: number;
  unit: string;  // e.g., "units", "placements"
  audienceSize?: number;
  details?: string;
}





