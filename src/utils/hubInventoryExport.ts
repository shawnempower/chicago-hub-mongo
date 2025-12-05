/**
 * Hub Inventory CSV Export Utility
 * 
 * Exports all inventory and pricing data for a specific hub
 * Includes calculated monthly reach and revenue estimates
 */

import { PublicationFrontend, HubPricing } from '@/types/publication';

interface InventoryRow {
  // Publication Info
  publicationId: number;
  publicationName: string;
  publicationType?: string;
  contentType?: string;
  geographicCoverage?: string;
  websiteUrl?: string;
  
  // Inventory Info
  channel: string;
  inventoryId: string;
  inventoryName: string;
  adFormat?: string;
  location?: string;
  position?: string;
  specifications?: string;
  
  // Audience Metrics
  subscribers?: number;
  monthlyImpressions?: number;
  monthlyVisitors?: number;
  averageViews?: number;
  circulation?: number;
  attendees?: number;
  followers?: number;
  
  // Calculated Reach
  estimatedMonthlyReach?: number;
  
  // Hub-Specific Pricing
  hubAvailable: boolean;
  hubPricingModel?: string;
  hubFlatRate?: number;
  hubDiscount?: number;
  hubMinimumCommitment?: string;
  
  // Frequency/Timing
  frequency?: string;
  sendDay?: string;
  sendTime?: string;
  eventDate?: string;
  
  // Performance Metrics
  openRate?: number;
  clickThroughRate?: number;
  averageSessionDuration?: number;
  bounceRate?: number;
  
  // Additional Details
  available: boolean;
  notes?: string;
}

/**
 * Get hub pricing for a specific ad opportunity
 */
function getHubPricing(hubPricingArray: HubPricing[] | undefined, hubId: string): HubPricing | undefined {
  if (!hubPricingArray) return undefined;
  return hubPricingArray.find(hp => hp.hubId === hubId);
}

/**
 * Extract display values from hub pricing (handles both single pricing and tiered pricing)
 */
function getHubPricingDisplayValues(hubPricing: HubPricing | undefined): {
  pricingModel?: string;
  flatRate?: number;
  frequency?: string;
} {
  if (!hubPricing || !hubPricing.pricing) {
    return {};
  }
  
  const lowestTier = getLowestTierPricing(hubPricing.pricing);
  if (!lowestTier) {
    return {};
  }
  
  return {
    pricingModel: lowestTier.pricingModel,
    flatRate: lowestTier.flatRate,
    frequency: lowestTier.frequency,
  };
}

/**
 * Format specifications as a string
 */
function formatSpecifications(specs: any): string {
  if (!specs) return '';
  const parts: string[] = [];
  if (specs.size) parts.push(`Size: ${specs.size}`);
  if (specs.format) parts.push(`Format: ${specs.format}`);
  if (specs.fileSize) parts.push(`File Size: ${specs.fileSize}`);
  if (specs.resolution) parts.push(`Resolution: ${specs.resolution}`);
  if (specs.duration) parts.push(`Duration: ${specs.duration}s`);
  if (specs.aspectRatio) parts.push(`Aspect Ratio: ${specs.aspectRatio}`);
  return parts.join(' | ');
}

/**
 * Calculate frequency multiplier for monthly calculations
 */
function getFrequencyMultiplier(frequency?: string): number {
  if (!frequency) return 1;
  
  const freq = frequency.toLowerCase();
  if (freq.includes('daily')) return 30;
  if (freq.includes('weekly')) return 4;
  if (freq.includes('bi-weekly') || freq.includes('biweekly')) return 2;
  if (freq.includes('monthly')) return 1;
  if (freq.includes('quarterly')) return 0.33;
  if (freq.includes('annual')) return 0.083;
  
  return 1; // Default to monthly
}

/**
 * Parse pricing tier frequency to get commitment multiplier (e.g., '4x' -> 4)
 */
function parseCommitmentMultiplier(frequency?: string): number {
  if (!frequency) return 1;
  const match = frequency.match(/^(\d+)x$/i);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Get the 1x (lowest tier) pricing from pricing tiers
 * Used for monthly revenue calculations to get per-insertion cost
 */
function getLowestTierPricing(pricing: any): any {
  if (!pricing) return null;
  
  // If pricing is an array of tiers
  if (Array.isArray(pricing)) {
    // Find the 1x tier or lowest frequency tier
    const onexTier = pricing.find(p => {
      const freq = (p.pricing?.frequency || p.frequency || '').toLowerCase();
      return freq === '1x' || freq.includes('one time') || freq === 'onetime';
    });
    
    if (onexTier) {
      return onexTier.pricing || onexTier;
    }
    
    // Otherwise find lowest multiplier
    const sortedTiers = [...pricing].sort((a, b) => {
      const freqA = (a.pricing?.frequency || a.frequency || '');
      const freqB = (b.pricing?.frequency || b.frequency || '');
      const multA = parseCommitmentMultiplier(freqA);
      const multB = parseCommitmentMultiplier(freqB);
      return multA - multB;
    });
    
    const lowestTier = sortedTiers[0];
    return lowestTier?.pricing || lowestTier;
  }
  
  // Single pricing object
  return pricing;
}

/**
 * Calculate estimated monthly reach based on audience metrics
 */
function calculateMonthlyReach(
  channel: string,
  metrics: {
    subscribers?: number;
    monthlyImpressions?: number;
    monthlyVisitors?: number;
    circulation?: number;
    attendees?: number;
    followers?: number;
    averageViews?: number;
  },
  frequency?: string
): number {
  // For most channels, reach is the audience metric itself
  switch (channel.toLowerCase()) {
    case 'website':
      return metrics.monthlyVisitors || metrics.monthlyImpressions || 0;
    
    case 'newsletter': {
      // Reach is subscribers * sends per month * open rate (assume 25% if not specified)
      const subscribers = metrics.subscribers || 0;
      const sendsPerMonth = getFrequencyMultiplier(frequency);
      return Math.round(subscribers * sendsPerMonth * 0.25);
    }
    
    case 'print':
      return metrics.circulation || 0;
    
    case 'events':
      // Events reach is attendees * frequency
      return Math.round((metrics.attendees || 0) * getFrequencyMultiplier(frequency));
    
    case 'social media':
      // Assume 10% of followers see each post, times frequency
      return Math.round((metrics.followers || 0) * 0.1 * getFrequencyMultiplier(frequency));
    
    case 'podcast':
      return metrics.subscribers || metrics.averageViews || 0;
    
    case 'streaming video':
      return metrics.averageViews || metrics.subscribers || 0;
    
    case 'radio':
      return metrics.subscribers || 0;
    
    default:
      return metrics.monthlyImpressions || metrics.subscribers || 0;
  }
}

/**
 * Calculate estimated monthly revenue based on pricing model
 * For tiered pricing (1x, 4x, etc.), uses the 1x tier to get per-insertion cost
 */
function calculateMonthlyRevenue(
  channel: string,
  pricing: any, // Can be single object or array of tiers
  metrics: {
    monthlyImpressions?: number;
    subscribers?: number;
    averageViews?: number;
  },
  frequency?: string
): number {
  if (!pricing) return 0;
  
  // Get the lowest tier pricing (1x) for per-insertion calculations
  const lowestTierPricing = getLowestTierPricing(pricing);
  if (!lowestTierPricing) return 0;
  
  const pricingModel = lowestTierPricing.pricingModel;
  if (!pricingModel) return 0;
  
  const model = pricingModel.toLowerCase();
  const freqMultiplier = getFrequencyMultiplier(frequency);
  
  // Handle different pricing models
  switch (model) {
    case 'cpm': {
      // CPM = cost per 1000 impressions
      const impressions = metrics.monthlyImpressions || 0;
      return (lowestTierPricing.cpm || lowestTierPricing.flatRate || 0) * (impressions / 1000);
    }
    
    case 'cpv': {
      // CPV = cost per 100 views (streaming video standard)
      const views = metrics.averageViews || 0;
      return (lowestTierPricing.flatRate || 0) * (views / 100);
    }
    
    case 'per_send':
    case 'persend': {
      // Newsletter: price per send * sends per month
      const perSend = lowestTierPricing.perSend || lowestTierPricing.flatRate || 0;
      return perSend * freqMultiplier;
    }
    
    case 'per_spot':
    case 'perspot': {
      // Radio/Podcast: price per spot * frequency
      const perSpot = lowestTierPricing.perSpot || lowestTierPricing.flatRate || 0;
      return perSpot * freqMultiplier;
    }
    
    case 'per_episode':
      // Podcast/Streaming: price per episode * frequency
      return (lowestTierPricing.flatRate || 0) * freqMultiplier;
    
    case 'per_ad':
      // Print/Event: price per ad * frequency
      return (lowestTierPricing.flatRate || 0) * freqMultiplier;
    
    case 'weekly':
      // Weekly rate * 4 weeks
      return (lowestTierPricing.weekly || lowestTierPricing.flatRate || 0) * 4;
    
    case 'monthly':
    case 'flat':
    case 'flat_rate':
      // For flat rates with publication frequency, multiply by frequency
      // Example: Event at $1000 with annual frequency = $1000 * 0.083 = ~$83/month
      if (frequency) {
        return (lowestTierPricing.monthly || lowestTierPricing.flatRate || 0) * freqMultiplier;
      }
      // Otherwise already monthly
      return lowestTierPricing.monthly || lowestTierPricing.flatRate || 0;
    
    case 'per_day':
      // Daily rate * 30 days
      return (lowestTierPricing.flatRate || 0) * 30;
    
    case 'per_week':
      // Weekly rate * 4 weeks
      return (lowestTierPricing.flatRate || 0) * 4;
    
    // For print, use frequency-based pricing
    case 'frequency_based':
      if (channel.toLowerCase() === 'print') {
        // Legacy format - prefer lowest frequency for conservative estimate
        const printPricing = lowestTierPricing as any;
        const rate = printPricing.oneTime || printPricing.fourTimes || 
                     printPricing.thirteenTimes || printPricing.twelveTimes || 
                     lowestTierPricing.flatRate || 0;
        // Multiply by publication frequency to get monthly revenue
        return rate * freqMultiplier;
      }
      return lowestTierPricing.flatRate || 0;
    
    default:
      // Default: if there's a flat rate and frequency, multiply them
      if (lowestTierPricing.flatRate && frequency) {
        return lowestTierPricing.flatRate * freqMultiplier;
      }
      return lowestTierPricing.flatRate || lowestTierPricing.monthly || 0;
  }
}

/**
 * Export hub inventory to CSV
 */
export function exportHubInventoryToCSV(
  publications: PublicationFrontend[],
  hubId: string,
  hubName: string
): void {
  const rows: InventoryRow[] = [];

  publications.forEach(pub => {
    const pubInfo = {
      publicationId: pub.publicationId,
      publicationName: pub.basicInfo.publicationName,
      publicationType: pub.basicInfo.publicationType,
      contentType: pub.basicInfo.contentType,
      geographicCoverage: pub.basicInfo.geographicCoverage,
      websiteUrl: pub.basicInfo.websiteUrl,
    };

    // Website Ads
    if (pub.distributionChannels?.website?.advertisingOpportunities) {
      pub.distributionChannels.website.advertisingOpportunities.forEach((ad, idx) => {
        const hubPricing = getHubPricing(ad.hubPricing, hubId);
        
        const monthlyImpressions = ad.performanceMetrics?.impressionsPerMonth || ad.monthlyImpressions;
        const monthlyVisitors = pub.distributionChannels?.website?.metrics?.monthlyVisitors;
        
        // Calculate reach and revenue
        const reach = calculateMonthlyReach('website', {
          monthlyImpressions,
          monthlyVisitors,
        });
        
        const hubRevenue = hubPricing ? calculateMonthlyRevenue('website', 
          hubPricing.pricing || ad.pricing,
          {
            monthlyImpressions,
          }) : 0;
        
        const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
        
        rows.push({
          ...pubInfo,
          channel: 'Website',
          inventoryId: ad.adId || `website-${idx}`,
          inventoryName: ad.name || ad.title || 'Unnamed Ad',
          adFormat: ad.adFormat,
          location: ad.location,
          specifications: formatSpecifications(ad.specifications),
          monthlyImpressions,
          monthlyVisitors,
          estimatedMonthlyReach: reach,
          hubAvailable: hubPricing?.available ?? ad.available ?? true,
          hubPricingModel: hubPricingDisplay.pricingModel,
          hubFlatRate: hubPricingDisplay.flatRate,
          hubDiscount: hubPricing?.discount,
          hubMinimumCommitment: hubPricing?.minimumCommitment,
          available: ad.available ?? true,
        });
      });
    }

    // Newsletter Ads
    if (pub.distributionChannels?.newsletters) {
      pub.distributionChannels.newsletters.forEach((newsletter, nlIdx) => {
        newsletter.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('newsletter', {
            subscribers: newsletter.subscribers,
          }, newsletter.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('newsletter',
            hubPricing.pricing || ad.pricing,
            {
              subscribers: newsletter.subscribers,
            }, newsletter.frequency) : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Newsletter',
            inventoryId: ad.adId || `newsletter-${nlIdx}-${adIdx}`,
            inventoryName: `${newsletter.name} - ${ad.name || ad.position || 'Ad'}`,
            position: ad.position,
            specifications: ad.format?.dimensions || ad.specifications?.dimensions || ad.dimensions,
            subscribers: newsletter.subscribers,
            estimatedMonthlyReach: reach,
            frequency: newsletter.frequency,
            sendDay: newsletter.sendDay,
            sendTime: newsletter.sendTime,
            openRate: newsletter.openRate,
            clickThroughRate: newsletter.clickThroughRate,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Print Ads
    if (pub.distributionChannels?.print) {
      pub.distributionChannels.print.forEach((printPub, pIdx) => {
        printPub.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          // Print pricing can be complex with multiple tier options
          const printPricingNote = ad.pricing ? 
            `1x: $${ad.pricing.oneTime || 'N/A'} | 4x: $${ad.pricing.fourTimes || 'N/A'} | 13x: $${ad.pricing.thirteenTimes || 'N/A'}` : 
            undefined;
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('print', {
            circulation: printPub.circulation,
          }, printPub.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('print',
            hubPricing.pricing || ad.pricing,
            {}, printPub.frequency) : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Print',
            inventoryId: ad.adId || `print-${pIdx}-${adIdx}`,
            inventoryName: `${printPub.name || 'Print'} - ${ad.name || ad.adFormat || 'Ad'}`,
            adFormat: ad.adFormat,
            specifications: `${ad.dimensions || ''} ${ad.color || ''}`.trim(),
            circulation: printPub.circulation,
            estimatedMonthlyReach: reach,
            frequency: printPub.frequency,
            notes: printPricingNote,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Events
    if (pub.distributionChannels?.events) {
      pub.distributionChannels.events.forEach((event, eIdx) => {
        event.advertisingOpportunities?.forEach((opp, oppIdx) => {
          const hubPricing = getHubPricing(opp.hubPricing, hubId);
          
          // Handle both single pricing object and array of pricing tiers
          const pricing = Array.isArray(opp.pricing) ? opp.pricing[0] : opp.pricing;
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('events', {
            attendees: event.averageAttendance,
          }, event.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('events',
            hubPricing.pricing || pricing,
            {}, event.frequency) : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Events',
            inventoryId: opp.adId || `event-${eIdx}-${oppIdx}`,
            inventoryName: `${event.name} - ${opp.name || opp.level || 'Sponsorship'}`,
            attendees: event.averageAttendance,
            estimatedMonthlyReach: reach,
            frequency: event.frequency,
            eventDate: event.date,
            specifications: opp.benefits?.join(' | '),
            hubAvailable: hubPricing?.available ?? opp.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: opp.available ?? true,
          });
        });
      });
    }

    // Social Media
    if (pub.distributionChannels?.socialMedia) {
      pub.distributionChannels.socialMedia.forEach((social, sIdx) => {
        social.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          // Calculate reach and revenue (assume weekly posting frequency if not specified)
          const reach = calculateMonthlyReach('social media', {
            followers: social.followers,
          }, ad.pricing?.frequency || 'weekly');
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('social media',
            hubPricing.pricing || ad.pricing,
            {}, ad.pricing?.frequency || 'weekly') : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Social Media',
            inventoryId: ad.adId || `social-${sIdx}-${adIdx}`,
            inventoryName: `${social.platform} - ${ad.name || ad.adFormat || 'Ad'}`,
            adFormat: ad.adFormat,
            followers: social.followers,
            estimatedMonthlyReach: reach,
            specifications: formatSpecifications(ad.specifications),
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Podcasts
    if (pub.distributionChannels?.podcasts) {
      pub.distributionChannels.podcasts.forEach((podcast, pIdx) => {
        podcast.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          const podcastAudience = podcast.averageDownloads || podcast.averageListeners;
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('podcast', {
            subscribers: podcastAudience,
          }, podcast.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('podcast',
            hubPricing.pricing || ad.pricing,
            {
              subscribers: podcastAudience,
            }, podcast.frequency) : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Podcast',
            inventoryId: ad.adId || `podcast-${pIdx}-${adIdx}`,
            inventoryName: `${podcast.name} - ${ad.name || ad.adFormat || 'Ad'}`,
            adFormat: ad.adFormat,
            specifications: formatSpecifications(ad.specifications),
            frequency: podcast.frequency,
            subscribers: podcastAudience,
            estimatedMonthlyReach: reach,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Streaming Video
    if (pub.distributionChannels?.streamingVideo) {
      pub.distributionChannels.streamingVideo.forEach((stream, sIdx) => {
        stream.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          const averageViews = stream.averageViewsPerMonth || stream.averageViews;
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('streaming video', {
            averageViews,
            subscribers: stream.subscribers,
          }, ad.pricing?.frequency || stream.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('streaming video',
            hubPricing.pricing || ad.pricing,
            {
              averageViews,
            }, ad.pricing?.frequency || stream.frequency) : 0;
          
          const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
          
          rows.push({
            ...pubInfo,
            channel: 'Streaming Video',
            inventoryId: ad.adId || `streaming-${sIdx}-${adIdx}`,
            inventoryName: `${stream.name} - ${ad.name || ad.adFormat || 'Ad'}`,
            adFormat: ad.adFormat,
            position: ad.position,
            specifications: formatSpecifications(ad.specifications),
            subscribers: stream.subscribers,
            averageViews,
            estimatedMonthlyReach: reach,
            frequency: ad.pricing?.frequency || stream.frequency,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricingDisplay.pricingModel,
            hubFlatRate: hubPricingDisplay.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Radio Stations - iterate through shows (canonical location for ads)
    if (pub.distributionChannels?.radioStations) {
      pub.distributionChannels.radioStations.forEach((station, rIdx) => {
        const shows = station.shows || [];
        shows.forEach((show: any, showIdx: number) => {
          (show.advertisingOpportunities || []).forEach((ad: any, adIdx: number) => {
            const hubPricing = getHubPricing(ad.hubPricing, hubId);
            
            // Calculate reach and revenue - use show's average listeners if available
            const listeners = show.averageListeners || station.listeners;
            const reach = calculateMonthlyReach('radio', {
              subscribers: listeners,
            }, show.frequency);
            
            const hubRevenue = hubPricing ? calculateMonthlyRevenue('radio',
              hubPricing.pricing || ad.pricing,
              {
                subscribers: listeners,
              }, show.frequency) : 0;
            
            const hubPricingDisplay = getHubPricingDisplayValues(hubPricing);
            
            rows.push({
              ...pubInfo,
              channel: 'Radio',
              inventoryId: ad.adId || `radio-${rIdx}-${showIdx}-${adIdx}`,
              inventoryName: `${station.callSign || station.name} - ${show.name} - ${ad.name || ad.adFormat || 'Ad'}`,
              adFormat: ad.adFormat,
              specifications: ad.format?.dimensions || formatSpecifications(ad.specifications),
              frequency: show.frequency,
              subscribers: listeners,
              estimatedMonthlyReach: reach,
              hubAvailable: hubPricing?.available ?? ad.available ?? true,
              hubPricingModel: hubPricingDisplay.pricingModel,
              hubFlatRate: hubPricingDisplay.flatRate,
              hubDiscount: hubPricing?.discount,
              hubMinimumCommitment: hubPricing?.minimumCommitment,
              available: ad.available ?? true,
            });
          });
        });
      });
    }
  });

  // Convert to CSV
  const csvContent = convertToCSV(rows, hubName);
  
  // Download
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${hubId}-inventory-${timestamp}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Convert data rows to CSV format
 */
function convertToCSV(rows: InventoryRow[], hubName: string): string {
  if (rows.length === 0) {
    return 'No inventory data available';
  }

  // Define column headers
  const headers = [
    // Publication Info
    'Publication ID',
    'Publication Name',
    'Publication Type',
    'Content Type',
    'Geographic Coverage',
    'Website URL',
    
    // Inventory Info
    'Channel',
    'Inventory ID',
    'Inventory Name',
    'Ad Format',
    'Location/Position',
    'Specifications',
    
    // Audience Metrics
    'Subscribers/Circulation',
    'Monthly Impressions',
    'Monthly Visitors',
    'Average Views',
    'Attendees',
    'Followers',
    
    // Calculated Reach
    'Est. Monthly Reach',
    
    // Hub-Specific Pricing
    'Hub Available',
    'Hub Pricing Model',
    'Hub Rate',
    'Hub Discount %',
    'Hub Min Commitment',
    
    // Frequency/Timing
    'Frequency',
    'Send Day',
    'Send Time',
    'Event Date',
    
    // Performance Metrics
    'Open Rate %',
    'Click Through Rate %',
    'Avg Session Duration',
    'Bounce Rate %',
    
    // Status
    'Available',
    
    // Notes
    'Notes',
  ];

  // Build CSV rows
  const csvRows = [headers.join(',')];

  rows.forEach(row => {
    const values = [
      // Publication Info
      row.publicationId,
      escapeCsvValue(row.publicationName),
      escapeCsvValue(row.publicationType),
      escapeCsvValue(row.contentType),
      escapeCsvValue(row.geographicCoverage),
      escapeCsvValue(row.websiteUrl),
      
      // Inventory Info
      escapeCsvValue(row.channel),
      escapeCsvValue(row.inventoryId),
      escapeCsvValue(row.inventoryName),
      escapeCsvValue(row.adFormat),
      escapeCsvValue(row.location || row.position),
      escapeCsvValue(row.specifications),
      
      // Audience Metrics
      row.subscribers || row.circulation || '',
      row.monthlyImpressions || '',
      row.monthlyVisitors || '',
      row.averageViews || '',
      row.attendees || '',
      row.followers || '',
      
      // Calculated Reach
      row.estimatedMonthlyReach ? Math.round(row.estimatedMonthlyReach) : '',
      
      // Hub-Specific Pricing
      row.hubAvailable ? 'Yes' : 'No',
      escapeCsvValue(row.hubPricingModel),
      row.hubFlatRate || '',
      row.hubDiscount || '',
      escapeCsvValue(row.hubMinimumCommitment),
      
      // Frequency/Timing
      escapeCsvValue(row.frequency),
      escapeCsvValue(row.sendDay),
      escapeCsvValue(row.sendTime),
      escapeCsvValue(row.eventDate),
      
      // Performance Metrics
      row.openRate || '',
      row.clickThroughRate || '',
      row.averageSessionDuration || '',
      row.bounceRate || '',
      
      // Status
      row.available ? 'Yes' : 'No',
      
      // Notes
      escapeCsvValue(row.notes),
    ];

    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If the value contains a comma, quote, or newline, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Trigger CSV download in the browser
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

