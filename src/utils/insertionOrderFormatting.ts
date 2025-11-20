/**
 * Insertion Order Formatting Utilities
 * 
 * Standardized formatting for quantity and audience information in insertion orders
 */

import { HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';
import { getFrequencyLabel } from './frequencyLabels';

/**
 * Format quantity display based on pricing model and frequency
 * Shows meaningful context like "4 weeks", "Monthly", "12× per month"
 */
export function formatInsertionOrderQuantity(item: HubPackageInventoryItem): string {
  const frequency = item.currentFrequency || item.quantity || 1;
  const pricingModel = item.itemPricing?.pricingModel || 'flat';
  
  // Use the standardized frequency label
  const frequencyLabel = getFrequencyLabel(frequency, pricingModel);
  
  // For specific models, add more context
  switch (pricingModel) {
    case 'monthly':
      return 'Monthly';
    
    case 'flat':
      return 'One-time';
    
    case 'per_week':
      return `${frequency} ${frequency === 1 ? 'week' : 'weeks'}/month`;
    
    case 'per_day':
      return `${frequency} ${frequency === 1 ? 'day' : 'days'}/month`;
    
    case 'per_spot':
    case 'per_ad':
      return `${frequency}× per month`;
    
    case 'per_send':
    case 'per_post':
    case 'per_story':
    case 'per_episode':
      return `${frequency}× per month`;
    
    case 'cpm':
    case 'cpv':
    case 'cpc':
      return `${frequency}% share`;
    
    default:
      return `${frequency}×`;
  }
}

/**
 * Format audience information with actual metrics from publication data
 * Pulls from performanceMetrics, monthlyImpressions, or inventory specifications
 */
export function formatInsertionOrderAudience(
  item: HubPackageInventoryItem,
  performanceMetrics?: {
    impressionsPerMonth?: number;
    occurrencesPerMonth?: number;
    audienceSize?: number;
    guaranteed?: boolean;
  },
  channelMetrics?: {
    monthlyVisitors?: number;
    monthlyPageViews?: number;
    subscribers?: number;
    circulation?: number;
    followers?: number;
    listeners?: number;
  }
): string {
  const pricingModel = item.itemPricing?.pricingModel || 'flat';
  const frequency = item.currentFrequency || item.quantity || 1;
  
  // Try to get metrics from multiple sources (priority order)
  const monthlyImpressions = 
    (item as any).monthlyImpressions || 
    performanceMetrics?.impressionsPerMonth ||
    channelMetrics?.monthlyPageViews; // Fallback to channel-level page views
  
  const audienceSize = 
    performanceMetrics?.audienceSize ||
    channelMetrics?.monthlyVisitors || // Fallback to channel-level visitors
    channelMetrics?.subscribers ||
    channelMetrics?.circulation ||
    channelMetrics?.followers ||
    channelMetrics?.listeners;
  
  const occurrencesPerMonth = performanceMetrics?.occurrencesPerMonth;
  
  // CPM pricing - show impressions
  if (pricingModel === 'cpm' && monthlyImpressions) {
    const purchasedImpressions = Math.round((monthlyImpressions * frequency) / 100);
    return `${purchasedImpressions.toLocaleString()} impressions/month`;
  }
  
  // CPV pricing - show views
  if (pricingModel === 'cpv' && monthlyImpressions) {
    const purchasedViews = Math.round((monthlyImpressions * frequency) / 100);
    return `${purchasedViews.toLocaleString()} views/month`;
  }
  
  // CPC pricing - show estimated clicks
  if (pricingModel === 'cpc' && monthlyImpressions) {
    const purchasedImpressions = Math.round((monthlyImpressions * frequency) / 100);
    const estimatedClicks = Math.round(purchasedImpressions * 0.01); // 1% CTR estimate
    return `~${estimatedClicks.toLocaleString()} clicks/month`;
  }
  
  // Per send/newsletter - show audience size
  if ((pricingModel === 'per_send' || pricingModel === 'per_newsletter') && audienceSize) {
    return `${audienceSize.toLocaleString()} subscribers × ${frequency} sends`;
  }
  
  // Per spot/ad - show occurrences or audience
  if ((pricingModel === 'per_spot' || pricingModel === 'per_ad')) {
    if (audienceSize) {
      return `${audienceSize.toLocaleString()} listeners/viewers × ${frequency} spots`;
    }
    if (occurrencesPerMonth) {
      return `${frequency} spots/month`;
    }
    return `${frequency}× placements/month`;
  }
  
  // Per post/story/episode - show audience
  if ((pricingModel === 'per_post' || pricingModel === 'per_story' || pricingModel === 'per_episode') && audienceSize) {
    return `${audienceSize.toLocaleString()} ${getAudienceLabel(item.channel)} × ${frequency}×`;
  }
  
  // Monthly/flat - show base audience if available
  if ((pricingModel === 'monthly' || pricingModel === 'flat')) {
    if (monthlyImpressions) {
      return `${monthlyImpressions.toLocaleString()} impressions/month`;
    }
    if (audienceSize) {
      return `${audienceSize.toLocaleString()} ${getAudienceLabel(item.channel)}`;
    }
    return 'Contact for reach details';
  }
  
  // Per week/day - show audience if available
  if ((pricingModel === 'per_week' || pricingModel === 'per_day') && audienceSize) {
    return `${audienceSize.toLocaleString()} ${getAudienceLabel(item.channel)}`;
  }
  
  // Fallback - try to show any available metric
  if (monthlyImpressions) {
    return `${monthlyImpressions.toLocaleString()} impressions/month`;
  }
  if (audienceSize) {
    return `${audienceSize.toLocaleString()} ${getAudienceLabel(item.channel)}`;
  }
  
  // No metrics available
  return 'Contact for audience details';
}

/**
 * Get appropriate audience label based on channel
 */
function getAudienceLabel(channel: string): string {
  const labels: Record<string, string> = {
    'website': 'monthly visitors',
    'print': 'circulation',
    'newsletter': 'subscribers',
    'email': 'subscribers',
    'social': 'followers',
    'podcast': 'listeners',
    'radio': 'listeners',
    'streaming': 'viewers',
    'events': 'attendees'
  };
  
  return labels[channel] || 'audience';
}

/**
 * Format audience info with guaranteed badge if applicable
 */
export function formatInsertionOrderAudienceWithBadge(
  item: HubPackageInventoryItem,
  performanceMetrics?: {
    impressionsPerMonth?: number;
    occurrencesPerMonth?: number;
    audienceSize?: number;
    guaranteed?: boolean;
  },
  channelMetrics?: {
    monthlyVisitors?: number;
    monthlyPageViews?: number;
    subscribers?: number;
    circulation?: number;
    followers?: number;
    listeners?: number;
  }
): string {
  const audienceInfo = formatInsertionOrderAudience(item, performanceMetrics, channelMetrics);
  const isGuaranteed = performanceMetrics?.guaranteed;
  
  if (isGuaranteed && audienceInfo !== 'Contact for audience details') {
    return `${audienceInfo} <span class="guaranteed-badge">✓ Guaranteed</span>`;
  }
  
  return audienceInfo;
}

