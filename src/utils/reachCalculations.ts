/**
 * Reach Calculations Utility
 * 
 * Standardized calculations for estimating total and unique reach
 * across multi-channel packages
 */

import { HubPackagePublication, HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';

export interface ChannelAudience {
  website?: number;
  print?: number;
  newsletter?: number;
  social?: number;
  podcast?: number;
  radio?: number;
  streaming?: number;
  events?: number;
}

export interface ReachSummary {
  // Tier 1: Impression-based (most accurate)
  totalMonthlyImpressions?: number;
  
  // Tier 2: Channel-specific audience
  channelAudiences: ChannelAudience;
  
  // Tier 3: Aggregated reach estimates
  estimatedTotalReach: number;
  estimatedUniqueReach: number;
  
  // NEW: Total exposures (frequency-adjusted impressions)
  totalMonthlyExposures?: number;
  
  // Metadata
  calculationMethod: 'impressions' | 'audience' | 'mixed';
  overlapFactor: number;
  publicationsCount: number;
  channelsCount: number;
}

/**
 * Configuration for overlap factor based on package composition
 */
export interface OverlapConfig {
  singlePubMultiChannel: number;  // 0.60 = 40% overlap
  multiPubSameGeo: number;        // 0.75 = 25% overlap
  multiPubDiffGeo: number;        // 0.90 = 10% overlap
  default: number;                // 0.70 = 30% overlap
}

const DEFAULT_OVERLAP_CONFIG: OverlapConfig = {
  singlePubMultiChannel: 0.60,
  multiPubSameGeo: 0.75,
  multiPubDiffGeo: 0.90,
  default: 0.70
};

/**
 * Extract audience size from an inventory item
 * Priority: item-level metrics > channel-level metrics
 */
function getItemAudienceSize(item: HubPackageInventoryItem): number | undefined {
  // Priority 1: Item-specific performance metrics
  if (item.performanceMetrics?.audienceSize) {
    return item.performanceMetrics.audienceSize;
  }
  
  // Priority 2: Channel-level audience metrics
  const metrics = item.audienceMetrics;
  if (!metrics) return undefined;
  
  // Return appropriate metric based on channel
  switch (item.channel) {
    case 'website':
      return metrics.monthlyVisitors;
    case 'print':
      return metrics.circulation;
    case 'newsletter':
    case 'email':
      return metrics.subscribers;
    case 'social':
      return metrics.followers;
    case 'podcast':
    case 'radio':
      return metrics.listeners;
    case 'events':
      return metrics.averageAttendance || metrics.expectedAttendees;
    default:
      return undefined;
  }
}

/**
 * Extract impressions from an inventory item
 */
function getItemImpressions(item: HubPackageInventoryItem): number | undefined {
  // Check performance metrics
  if (item.performanceMetrics?.impressionsPerMonth) {
    return item.performanceMetrics.impressionsPerMonth;
  }
  
  // Check channel metrics (for website)
  if (item.channel === 'website' && item.audienceMetrics?.monthlyPageViews) {
    return item.audienceMetrics.monthlyPageViews;
  }
  
  // Check legacy field
  if ((item as any).monthlyImpressions) {
    return (item as any).monthlyImpressions;
  }
  
  return undefined;
}

/**
 * Calculate reach for a package
 * Uses publication-level deduplication to avoid double-counting
 */
export function calculatePackageReach(
  publications: HubPackagePublication[],
  overlapConfig: OverlapConfig = DEFAULT_OVERLAP_CONFIG
): ReachSummary {
  // Track reach per publication to avoid double-counting
  const publicationReach = new Map<number, {
    impressions: number;
    audience: number;
    channels: Set<string>;
  }>();
  
  // Track total exposures (frequency-adjusted)
  let totalExposures = 0;
  
  // Process each publication
  publications.forEach(pub => {
    let pubImpressions = 0;
    let pubMaxAudience = 0;
    const pubChannels = new Set<string>();
    
    // Process items, excluding excluded items
    pub.inventoryItems
      ?.filter(item => !item.isExcluded)
      .forEach(item => {
        pubChannels.add(item.channel);
        const frequency = item.currentFrequency || item.quantity || 1;
        
        // Aggregate impressions (additive across items)
        const itemImpressions = getItemImpressions(item);
        if (itemImpressions) {
          pubImpressions += itemImpressions;
        }
        
        // Track max audience for this publication
        const itemAudience = getItemAudienceSize(item);
        if (itemAudience) {
          pubMaxAudience = Math.max(pubMaxAudience, itemAudience);
        }
        
        // Calculate exposures (audience × frequency)
        // For impression-based items, use impressions directly
        // For audience-based items, multiply audience by frequency
        if (itemImpressions) {
          totalExposures += itemImpressions; // Impressions already account for volume
        } else if (itemAudience) {
          // Multiply base audience by frequency for total exposures
          // E.g., 15K subscribers × 8 sends = 120K exposures
          totalExposures += itemAudience * frequency;
        }
      });
    
    publicationReach.set(pub.publicationId, {
      impressions: pubImpressions,
      audience: pubMaxAudience,
      channels: pubChannels
    });
  });
  
  // Aggregate across publications
  let totalImpressions = 0;
  const channelAudiences: ChannelAudience = {};
  const allChannels = new Set<string>();
  
  // Sum impressions and track channels
  publicationReach.forEach((pubData, pubId) => {
    totalImpressions += pubData.impressions;
    pubData.channels.forEach(ch => allChannels.add(ch));
  });
  
  // Calculate channel-specific audiences (max per channel across pubs)
  const channelMap = new Map<string, number[]>();
  
  publications.forEach(pub => {
    const channelMaxForPub = new Map<string, number>();
    
    pub.inventoryItems
      ?.filter(item => !item.isExcluded)
      .forEach(item => {
        const audience = getItemAudienceSize(item);
        if (audience) {
          const currentMax = channelMaxForPub.get(item.channel) || 0;
          channelMaxForPub.set(item.channel, Math.max(currentMax, audience));
        }
      });
    
    // Add to channel aggregation
    channelMaxForPub.forEach((audience, channel) => {
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(audience);
    });
  });
  
  // For each channel, sum audiences across publications
  let totalAudience = 0;
  channelMap.forEach((audiences, channel) => {
    const channelTotal = audiences.reduce((sum, aud) => sum + aud, 0);
    (channelAudiences as any)[channel] = channelTotal;
    totalAudience += channelTotal;
  });
  
  // Determine overlap factor based on package composition
  let overlapFactor = overlapConfig.default;
  const pubCount = publications.length;
  const channelCount = allChannels.size;
  
  if (pubCount === 1 && channelCount > 1) {
    // Single publication with multiple channels - high overlap
    overlapFactor = overlapConfig.singlePubMultiChannel;
  } else if (pubCount > 1) {
    // Multiple publications - check if same geography (future enhancement)
    // For now, use moderate overlap assumption
    overlapFactor = overlapConfig.multiPubSameGeo;
  }
  
  // Apply overlap adjustment
  const estimatedUniqueReach = Math.round(totalAudience * overlapFactor);
  
  // Determine calculation method
  let calculationMethod: 'impressions' | 'audience' | 'mixed' = 'audience';
  if (totalImpressions > 0 && totalAudience > 0) {
    calculationMethod = 'mixed';
  } else if (totalImpressions > 0) {
    calculationMethod = 'impressions';
  }
  
  return {
    totalMonthlyImpressions: totalImpressions > 0 ? Math.round(totalImpressions) : undefined,
    totalMonthlyExposures: totalExposures > 0 ? Math.round(totalExposures) : undefined,
    channelAudiences,
    estimatedTotalReach: totalAudience,
    estimatedUniqueReach,
    calculationMethod,
    overlapFactor,
    publicationsCount: pubCount,
    channelsCount: channelCount
  };
}

/**
 * Format reach for display
 */
export function formatReachNumber(reach: number): string {
  if (reach >= 1000000) {
    return `${(reach / 1000000).toFixed(1)}M`;
  }
  if (reach >= 1000) {
    return `${(reach / 1000).toFixed(1)}K`;
  }
  return reach.toLocaleString();
}

/**
 * Get reach description for display
 */
export function getReachDescription(summary: ReachSummary): string {
  if (summary.calculationMethod === 'impressions') {
    return 'Based on impression data';
  }
  
  const overlapPercent = Math.round((1 - summary.overlapFactor) * 100);
  
  if (summary.publicationsCount === 1) {
    return `Single publication across ${summary.channelsCount} channel${summary.channelsCount > 1 ? 's' : ''}, ${overlapPercent}% overlap estimated`;
  }
  
  return `${summary.publicationsCount} publications across ${summary.channelsCount} channel${summary.channelsCount > 1 ? 's' : ''}, ${overlapPercent}% overlap estimated`;
}

/**
 * Get channel label for display
 */
export function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    website: 'Website',
    print: 'Print',
    newsletter: 'Newsletter',
    email: 'Email',
    social: 'Social Media',
    podcast: 'Podcast',
    radio: 'Radio',
    streaming: 'Streaming',
    events: 'Events'
  };
  return labels[channel] || channel;
}

