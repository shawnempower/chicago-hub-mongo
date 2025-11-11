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
  hubCpm?: number;
  hubPerSend?: number;
  hubMonthly?: number;
  hubDiscount?: number;
  hubMinimumCommitment?: string;
  
  // Calculated Hub Revenue
  estimatedMonthlyRevenueHub?: number;
  
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
    
    case 'newsletter':
      // Reach is subscribers * sends per month * open rate (assume 25% if not specified)
      const subscribers = metrics.subscribers || 0;
      const sendsPerMonth = getFrequencyMultiplier(frequency);
      return Math.round(subscribers * sendsPerMonth * 0.25);
    
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
 */
function calculateMonthlyRevenue(
  channel: string,
  pricing: {
    pricingModel?: string;
    flatRate?: number;
    cpm?: number;
    perSend?: number;
    monthly?: number;
    perSpot?: number;
    weekly?: number;
  },
  metrics: {
    monthlyImpressions?: number;
    subscribers?: number;
    averageViews?: number;
  },
  frequency?: string
): number {
  if (!pricing || !pricing.pricingModel) return 0;
  
  const model = pricing.pricingModel.toLowerCase();
  const freqMultiplier = getFrequencyMultiplier(frequency);
  
  // Handle different pricing models
  switch (model) {
    case 'cpm':
      // CPM = cost per 1000 impressions
      const impressions = metrics.monthlyImpressions || 0;
      return (pricing.cpm || pricing.flatRate || 0) * (impressions / 1000);
    
    case 'cpv':
      // CPV = cost per 100 views (streaming video standard)
      const views = metrics.averageViews || 0;
      return (pricing.flatRate || 0) * (views / 100);
    
    case 'per_send':
    case 'persend':
      // Newsletter: price per send * sends per month
      const perSend = pricing.perSend || pricing.flatRate || 0;
      return perSend * freqMultiplier;
    
    case 'per_spot':
    case 'perspot':
      // Radio/Podcast: price per spot * frequency
      const perSpot = pricing.perSpot || pricing.flatRate || 0;
      return perSpot * freqMultiplier;
    
    case 'per_episode':
      // Podcast/Streaming: price per episode * frequency
      return (pricing.flatRate || 0) * freqMultiplier;
    
    case 'weekly':
      // Weekly rate * 4 weeks
      return (pricing.weekly || pricing.flatRate || 0) * 4;
    
    case 'monthly':
    case 'flat':
    case 'flat_rate':
      // Already monthly
      return pricing.monthly || pricing.flatRate || 0;
    
    case 'per_day':
      // Daily rate * 30 days
      return (pricing.flatRate || 0) * 30;
    
    case 'per_week':
      // Weekly rate * 4 weeks
      return (pricing.flatRate || 0) * 4;
    
    // For print, use frequency-based pricing
    case 'frequency_based':
      if (channel.toLowerCase() === 'print') {
        // Use the most common rate if available
        const printPricing = pricing as any;
        const rate = printPricing.thirteenTimes || printPricing.twelveTimes || 
                     printPricing.fourTimes || printPricing.oneTime || pricing.flatRate || 0;
        // Estimate based on 1 ad per month
        return rate;
      }
      return pricing.flatRate || 0;
    
    default:
      // Default to flat rate if available
      return pricing.flatRate || pricing.monthly || 0;
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
        
        const hubRevenue = hubPricing ? calculateMonthlyRevenue('website', {
          pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
          flatRate: hubPricing.pricing?.flatRate,
          cpm: hubPricing.pricing?.cpm,
        }, {
          monthlyImpressions,
        }) : 0;
        
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
          hubPricingModel: hubPricing?.pricing?.pricingModel,
          hubFlatRate: hubPricing?.pricing?.flatRate,
          hubCpm: hubPricing?.pricing?.cpm,
          hubDiscount: hubPricing?.discount,
          hubMinimumCommitment: hubPricing?.minimumCommitment,
          estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('newsletter', {
            pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
            perSend: hubPricing.pricing?.perSend,
            monthly: hubPricing.pricing?.monthly,
          }, {
            subscribers: newsletter.subscribers,
          }, newsletter.frequency) : 0;
          
          rows.push({
            ...pubInfo,
            channel: 'Newsletter',
            inventoryId: ad.adId || `newsletter-${nlIdx}-${adIdx}`,
            inventoryName: `${newsletter.name} - ${ad.name || ad.position || 'Ad'}`,
            position: ad.position,
            specifications: ad.dimensions || ad.specifications?.dimensions,
            subscribers: newsletter.subscribers,
            estimatedMonthlyReach: reach,
            frequency: newsletter.frequency,
            sendDay: newsletter.sendDay,
            sendTime: newsletter.sendTime,
            openRate: newsletter.openRate,
            clickThroughRate: newsletter.clickThroughRate,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubPerSend: hubPricing?.pricing?.perSend,
            hubMonthly: hubPricing?.pricing?.monthly,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('print', {
            pricingModel: hubPricing.pricing?.pricingModel || 'frequency_based',
            flatRate: hubPricing.pricing?.flatRate,
          }, {}, printPub.frequency) : 0;
          
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
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('events', {
            pricingModel: hubPricing.pricing?.pricingModel || pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
          }, {}, event.frequency) : 0;
          
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
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('social media', {
            pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
          }, {}, ad.pricing?.frequency || 'weekly') : 0;
          
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
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('podcast', {
            pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
            cpm: hubPricing.pricing?.cpm,
          }, {
            subscribers: podcastAudience,
          }, podcast.frequency) : 0;
          
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
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubCpm: hubPricing?.pricing?.cpm,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
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
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('streaming video', {
            pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
          }, {
            averageViews,
          }, ad.pricing?.frequency || stream.frequency) : 0;
          
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
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
            available: ad.available ?? true,
          });
        });
      });
    }

    // Radio Stations
    if (pub.distributionChannels?.radioStations) {
      pub.distributionChannels.radioStations.forEach((station, rIdx) => {
        station.advertisingOpportunities?.forEach((ad, adIdx) => {
          const hubPricing = getHubPricing(ad.hubPricing, hubId);
          
          // Calculate reach and revenue
          const reach = calculateMonthlyReach('radio', {
            subscribers: station.listeners,
          }, ad.pricing?.frequency);
          
          const hubRevenue = hubPricing ? calculateMonthlyRevenue('radio', {
            pricingModel: hubPricing.pricing?.pricingModel || ad.pricing?.pricingModel,
            flatRate: hubPricing.pricing?.flatRate,
          }, {
            subscribers: station.listeners,
          }, ad.pricing?.frequency) : 0;
          
          rows.push({
            ...pubInfo,
            channel: 'Radio',
            inventoryId: ad.adId || `radio-${rIdx}-${adIdx}`,
            inventoryName: `${station.callSign || station.name} - ${ad.name || ad.adFormat || 'Ad'}`,
            adFormat: ad.adFormat,
            specifications: formatSpecifications(ad.specifications),
            frequency: ad.pricing?.frequency,
            subscribers: station.listeners,
            estimatedMonthlyReach: reach,
            hubAvailable: hubPricing?.available ?? ad.available ?? true,
            hubPricingModel: hubPricing?.pricing?.pricingModel,
            hubFlatRate: hubPricing?.pricing?.flatRate,
            hubDiscount: hubPricing?.discount,
            hubMinimumCommitment: hubPricing?.minimumCommitment,
            estimatedMonthlyRevenueHub: hubRevenue,
            available: ad.available ?? true,
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
    'Hub Flat Rate',
    'Hub CPM',
    'Hub Per Send',
    'Hub Monthly',
    'Hub Discount %',
    'Hub Min Commitment',
    
    // Calculated Hub Revenue
    'Est. Monthly Revenue (Hub)',
    
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
      row.hubCpm || '',
      row.hubPerSend || '',
      row.hubMonthly || '',
      row.hubDiscount || '',
      escapeCsvValue(row.hubMinimumCommitment),
      
      // Calculated Hub Revenue
      row.estimatedMonthlyRevenueHub ? `$${Math.round(row.estimatedMonthlyRevenueHub).toLocaleString()}` : '',
      
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

