import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Publication } from '@/integrations/mongodb/schemas';
import { usePublication } from '@/contexts/PublicationContext';

export interface DataQualityIssue {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  count: number;
  description: string;
  items: string[]; // Item names with issues
}

export interface DataQualityScore {
  score: number; // 0-100
  totalItems: number;
  completeItems: number;
  issuesCount: number;
  criticalCount: number;
  issues: DataQualityIssue[];
}

interface Props {
  publication: Publication | any; // Accept both Publication and PublicationFrontend types
  onViewDetails?: () => void;
  preCalculatedQuality?: DataQualityScore; // Optional: use pre-calculated quality from parent
}

/**
 * Helper: Check if print dimension format is parseable
 */
function validatePrintDimensionFormat(dim: string): boolean {
  if (!dim) return false;
  
  // Remove quotes and extra spaces
  let cleaned = dim.replace(/["']/g, '').trim();
  
  // Handle "or" - take first option
  cleaned = cleaned.split(/\s+or\s+/i)[0].trim();
  cleaned = cleaned.split(',')[0].trim();
  
  // Try various patterns
  const patterns = [
    /^\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*wide\s*[x×]\s*\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*(?:high|tall)/i,
    /^\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*[Ww]\s*[x×]\s*\d+(?:[-.]\d+)?(?:\/\d+)?\s*(?:"|inches?)?\s*[Hh]/i,
    /^\d+(?:\.\d+)?\s*(?:"|inches?)?\s*[x×]\s*\d+(?:\.\d+)?\s*(?:"|inches?)?/i,
    /^\d+(?:-\d+\/\d+)?\s*(?:"|inches?)?\s*[x×]\s*\d+(?:-\d+\/\d+)?\s*(?:"|inches?)?/i,
    /trim:\s*\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?/i,
    /bleed:\s*\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?/i
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Helper: Check if dimension uses standard format
 */
function isStandardFormat(dim: string): boolean {
  return /^\d+(?:\.\d+)?"\s*x\s*\d+(?:\.\d+)?"$/.test(dim);
}

/**
 * Analyzes a single inventory item for data quality issues
 * @param channelFrequency - Optional frequency string from parent channel (e.g., "weekly", "daily")
 *                           Used as fallback for occurrence-based pricing when occurrencesPerMonth is not set
 */
function analyzeInventoryItem(
  item: any,
  channel: string,
  itemName: string,
  channelFrequency?: string
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  
  // Handle nested pricing structure (print ads often have tier.pricing.flatRate)
  let defaultPricing;
  if (Array.isArray(item.pricing) && item.pricing.length > 0) {
    const firstTier = item.pricing[0];
    // Check if pricing is nested (tier.pricing.flatRate) or flat (tier.flatRate)
    // Handle case where firstTier could be null
    defaultPricing = firstTier ? (firstTier.pricing || firstTier) : null;
  } else {
    defaultPricing = item.pricing;
  }

  // Issue 1: Missing pricing entirely
  if (!defaultPricing) {
    issues.push({
      severity: 'critical',
      type: 'Missing Pricing',
      count: 1,
      description: 'No pricing data found',
      items: [itemName]
    });
    return issues; // Can't check further without pricing
  }

  // Issue 2: Missing flatRate (but NOT contact pricing)
  if (
    defaultPricing.pricingModel !== 'contact' && 
    !defaultPricing.flatRate && 
    defaultPricing.flatRate !== 0
  ) {
    issues.push({
      severity: 'critical',
      type: 'Missing Price',
      count: 1,
      description: 'flatRate is required for this pricing model',
      items: [itemName]
    });
  }

  // Issue 3: Missing pricingModel
  if (!defaultPricing.pricingModel) {
    issues.push({
      severity: 'critical',
      type: 'Missing Pricing Model',
      count: 1,
      description: 'pricingModel field is required',
      items: [itemName]
    });
  }

  // Issue 4: Occurrence-based without occurrencesPerMonth
  // For Radio/Podcast: Always require occurrencesPerMonth (spotsPerShow varies per ad)
  // For other channels: Accept channelFrequency as fallback (1 ad = 1 occurrence per issue/send)
  const occurrenceModels = ['per_send', 'per_ad', 'per_spot', 'per_post', 'per_episode', 'per_story'];
  if (
    defaultPricing.pricingModel && 
    occurrenceModels.includes(defaultPricing.pricingModel)
  ) {
    if (!item.performanceMetrics?.occurrencesPerMonth) {
      // For radio (per_spot) and podcasts (per_episode), missing occurrences is CRITICAL
      // because show frequency doesn't equal ad occurrences (spotsPerShow multiplier needed)
      const isCritical = channel === 'Radio' || channel === 'Podcast';
      
      // For other channels, channelFrequency is a valid fallback since 1 ad = 1 occurrence
      const hasFrequencyFallback = !isCritical && channelFrequency;
      
      if (!hasFrequencyFallback) {
        issues.push({
          severity: isCritical ? 'critical' : 'warning',
          type: isCritical ? 'Missing Performance Metrics' : 'Missing Frequency Data',
          count: 1,
          description: isCritical 
            ? 'occurrencesPerMonth is required - cannot calculate revenue without it'
            : 'occurrencesPerMonth needed for accurate revenue calculation',
          items: [itemName]
        });
      }
    }
  }

  // Issue 5: Impression-based without impressionsPerMonth
  const impressionModels = ['cpm', 'cpd', 'cpv', 'cpc'];
  if (
    defaultPricing.pricingModel && 
    impressionModels.includes(defaultPricing.pricingModel)
  ) {
    if (!item.performanceMetrics?.impressionsPerMonth && !item.monthlyImpressions) {
      issues.push({
        severity: 'warning',
        type: 'Missing Impression Data',
        count: 1,
        description: 'impressionsPerMonth needed for CPM/CPC calculation',
        items: [itemName]
      });
    }
  }

  // Issue 6: Zero price (ambiguous - could be free or incomplete)
  if (
    defaultPricing.flatRate === 0 && 
    defaultPricing.pricingModel !== 'contact'
  ) {
    issues.push({
      severity: 'info',
      type: 'Zero Price',
      count: 1,
      description: 'Verify if intentionally free',
      items: [itemName]
    });
  }

  // Issue 7: Multi-tier without 1x tier
  // Only check if tiers use the same pricing model (true tiers, not alternative pricing)
  if (Array.isArray(item.pricing) && item.pricing.length > 0) {
    // Check if all tiers have the same pricing model
    const pricingModels = item.pricing.map((tier: any) => {
      const pricing = tier.pricing || tier;
      return pricing.pricingModel;
    }).filter(Boolean);
    
    const uniqueModels = [...new Set(pricingModels)];
    
    // Only check for 1x tier if all tiers use the same pricing model
    if (uniqueModels.length === 1) {
      const has1x = item.pricing.some((tier: any) => {
        // Handle nested structure (tier.pricing.frequency) or flat (tier.frequency)
        const pricing = tier.pricing || tier;
        const freq = (pricing.frequency || '').toLowerCase();
        return freq === '1x' || freq.includes('one time') || freq === 'onetime';
      });
      
      if (!has1x) {
        issues.push({
          severity: 'info',
          type: 'Missing Base Tier',
          count: 1,
          description: 'No 1x tier found in multi-tier pricing',
          items: [itemName]
        });
      }
    }
    // If different pricing models, they're alternative pricing options, not tiers - no warning needed
  }

  // Issue 8: Legacy hub pricing structure (duplicate hub entries)
  // After migration, each hub should have only one entry with pricing as array
  if (item.hubPricing && Array.isArray(item.hubPricing) && item.hubPricing.length > 1) {
    const hubKeys = item.hubPricing.map((hp: any) => hp.hubId || hp.hubName || 'unknown');
    const uniqueHubs = new Set(hubKeys);
    
    if (hubKeys.length > uniqueHubs.size) {
      // Found duplicate hub entries - legacy structure
      const duplicates: string[] = [];
      const seen = new Set();
      hubKeys.forEach(key => {
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      });
      
      issues.push({
        severity: 'warning',
        type: 'Legacy Hub Pricing Structure',
        count: 1,
        description: `Hub pricing has duplicate entries for: ${[...new Set(duplicates)].join(', ')}. Needs migration to consolidate tiers.`,
        items: [itemName]
      });
    }
  }

  // Issue 9: Print dimension validation (CRITICAL for creative asset matching)
  if (channel.toLowerCase() === 'print') {
    const dimensions = item.format?.dimensions;
    
    if (!dimensions) {
      issues.push({
        severity: 'warning',
        type: 'Missing Print Dimensions',
        count: 1,
        description: 'Dimensions required for PDF asset matching. Add format like "8.5" x 11"',
        items: [itemName]
      });
    } else {
      // Check if dimensions are parseable
      const isParseable = validatePrintDimensionFormat(dimensions);
      
      if (!isParseable) {
        issues.push({
          severity: 'critical',
          type: 'Invalid Print Dimensions',
          count: 1,
          description: `Cannot parse "${dimensions}". Use format: Width x Height (e.g., "10" x 12.625")`,
          items: [itemName]
        });
      } else if (!isStandardFormat(dimensions)) {
        // Parseable but inconsistent format
        issues.push({
          severity: 'warning',
          type: 'Inconsistent Dimension Format',
          count: 1,
          description: `Dimension format varies: "${dimensions}". Consider standardizing.`,
          items: [itemName]
        });
      }
    }
  }

  // Issue 10: Newsletter dimension validation (for creative asset matching)
  if (channel.toLowerCase() === 'newsletter') {
    // Get dimensions from format object
    const dimensions = item.format?.dimensions;
    
    if (!dimensions) {
      issues.push({
        severity: 'warning',
        type: 'Missing Newsletter Dimensions',
        count: 1,
        description: 'Add dimensions for asset matching (e.g., 600x150, 728x90)',
        items: [itemName]
      });
    } else {
      // Check for vague/useless dimension values that are essentially missing
      const dimString = Array.isArray(dimensions) ? dimensions.join(', ') : String(dimensions);
      const isVagueDimension = isVagueNewsletterDimension(dimString);
      
      if (isVagueDimension) {
        issues.push({
          severity: 'critical',
          type: 'Invalid Newsletter Dimensions',
          count: 1,
          description: `"${dimString}" is not usable for asset matching. Specify actual dimensions (e.g., 600x150, 728x90)`,
          items: [itemName]
        });
      } else {
        // Check if it's a standard newsletter dimension
        const isStandardNewsletterDimension = isStandardNewsletterFormat(dimensions);
        
        if (!isStandardNewsletterDimension) {
          issues.push({
            severity: 'warning',
            type: 'Non-Standard Newsletter Dimension',
            count: 1,
            description: `"${dimString}" is non-standard. Consider using: 600x150, 600x100, 728x90, 300x250, or "full-newsletter"`,
            items: [itemName]
          });
        }
      }
    }
  }

  // Issue 11: Radio dimension/format validation (for creative asset matching)
  if (channel.toLowerCase() === 'radio') {
    // Check for format.dimensions (e.g., "15s", "30s", "60s", "long-form")
    const dimensions = item.format?.dimensions;
    const duration = item.format?.duration;
    const adFormat = item.adFormat;
    const fileFormats = item.format?.fileFormats;
    
    if (!dimensions && !duration) {
      issues.push({
        severity: 'critical',
        type: 'Missing Radio Duration',
        count: 1,
        description: 'Add duration for asset matching (e.g., 15s, 30s, 60s)',
        items: [itemName]
      });
    } else if (!dimensions && duration) {
      // Has duration but missing format.dimensions - flag for migration
      issues.push({
        severity: 'warning',
        type: 'Missing Radio Format Dimensions',
        count: 1,
        description: `Has duration (${duration}s) but missing format.dimensions for asset matching`,
        items: [itemName]
      });
    } else if (dimensions && !isValidRadioDimension(dimensions)) {
      issues.push({
        severity: 'warning',
        type: 'Non-Standard Radio Dimension',
        count: 1,
        description: `"${dimensions}" is non-standard. Consider using: 15s, 30s, 60s, or long-form`,
        items: [itemName]
      });
    }
    
    // Check for adFormat
    if (!adFormat) {
      issues.push({
        severity: 'warning',
        type: 'Missing Radio Ad Format',
        count: 1,
        description: 'Add ad format (e.g., 15_second_spot, 30_second_spot, live_read)',
        items: [itemName]
      });
    }
    
    // Check for file formats
    if (!fileFormats || fileFormats.length === 0) {
      issues.push({
        severity: 'info',
        type: 'Missing Radio File Formats',
        count: 1,
        description: 'Add accepted file formats (e.g., MP3, WAV, TXT)',
        items: [itemName]
      });
    }
  }

  // Issue 12: Podcast dimension/format validation (for creative asset matching)
  if (channel.toLowerCase() === 'podcast') {
    // Check for format.dimensions (e.g., "30s", "60s", "pre-roll", "host-read")
    const dimensions = item.format?.dimensions;
    const duration = item.format?.duration;
    const adFormat = item.adFormat;
    const fileFormats = item.format?.fileFormats;
    
    if (!dimensions && !adFormat) {
      issues.push({
        severity: 'critical',
        type: 'Missing Podcast Format',
        count: 1,
        description: 'Add format for asset matching (e.g., pre-roll, mid-roll, 30s, 60s, host-read)',
        items: [itemName]
      });
    } else if (!dimensions && (duration || adFormat)) {
      // Has some data but missing format.dimensions - flag for migration
      issues.push({
        severity: 'warning',
        type: 'Missing Podcast Format Dimensions',
        count: 1,
        description: 'Missing format.dimensions for asset matching',
        items: [itemName]
      });
    } else if (dimensions && !isValidPodcastDimension(dimensions)) {
      issues.push({
        severity: 'warning',
        type: 'Non-Standard Podcast Dimension',
        count: 1,
        description: `"${dimensions}" is non-standard. Consider: pre-roll, 30s, 60s, post-roll, host-read, sponsorship`,
        items: [itemName]
      });
    }
    
    // Check for adFormat
    if (!adFormat) {
      issues.push({
        severity: 'warning',
        type: 'Missing Podcast Ad Format',
        count: 1,
        description: 'Add ad format (e.g., pre_roll, mid_roll_30, mid_roll_60, host_read)',
        items: [itemName]
      });
    }
    
    // Check for file formats
    if (!fileFormats || fileFormats.length === 0) {
      issues.push({
        severity: 'info',
        type: 'Missing Podcast File Formats',
        count: 1,
        description: 'Add accepted file formats (e.g., MP3, WAV, TXT)',
        items: [itemName]
      });
    }
  }

  return issues;
}

/**
 * Helper: Check if radio dimension is valid
 */
function isValidRadioDimension(dim: string): boolean {
  if (!dim || typeof dim !== 'string') return false;
  
  const cleaned = dim.toLowerCase().trim();
  
  // Standard radio duration formats
  const standardFormats = ['15s', '30s', '60s', 'long-form', 'custom'];
  
  // Also accept direct second values like "20s", "45s"
  const durationPattern = /^\d+s$/;
  
  return standardFormats.includes(cleaned) || durationPattern.test(cleaned);
}

/**
 * Helper: Check if podcast dimension is valid
 */
function isValidPodcastDimension(dim: string): boolean {
  if (!dim || typeof dim !== 'string') return false;
  
  const cleaned = dim.toLowerCase().trim();
  
  // Standard podcast formats (position-based and duration-based)
  const standardFormats = [
    'pre-roll', 'preroll', 
    'mid-roll', 'midroll', 
    'post-roll', 'postroll',
    '15s', '30s', '60s',
    'host-read', 'host read',
    'sponsorship', 'custom'
  ];
  
  // Also accept direct second values like "20s", "45s"
  const durationPattern = /^\d+s$/;
  
  return standardFormats.includes(cleaned) || durationPattern.test(cleaned);
}

/**
 * Helper: Check if newsletter dimension is vague/useless for asset matching
 * These are essentially the same as missing dimensions
 */
function isVagueNewsletterDimension(dim: string): boolean {
  if (!dim || typeof dim !== 'string') return false;
  
  const cleaned = dim.toLowerCase().trim();
  
  // Vague terms that don't specify actual dimensions
  const vagueTerms = [
    'multiple', 'various', 'varies', 'variable',
    'contact', 'contact for', 'contact us', 'tbd', 'tba',
    'custom', 'customized', 'flexible',
    'n/a', 'na', 'none', 'not specified', 'not available',
    'see specs', 'see details', 'upon request',
    'standard', 'default'
  ];
  
  // Check if the dimension is just a vague term
  if (vagueTerms.some(term => cleaned === term || cleaned.startsWith(term + ' ') || cleaned.includes('contact'))) {
    return true;
  }
  
  // Check if it's too short to be a real dimension (unless it's a known format)
  if (cleaned.length < 4 && !/^\d+x\d+$/i.test(cleaned)) {
    return true;
  }
  
  return false;
}

/**
 * Helper: Check if newsletter dimension is standard
 */
function isStandardNewsletterFormat(dim: string | string[] | any): boolean {
  if (!dim) return false;
  
  // Handle array of dimensions - check if any are standard
  if (Array.isArray(dim)) {
    return dim.some(d => typeof d === 'string' && isStandardNewsletterFormat(d));
  }
  
  // Handle non-string values
  if (typeof dim !== 'string') return false;
  
  const cleaned = dim.toLowerCase().trim();
  
  // Standard email dimensions (600px width)
  const emailStandards = ['600x150', '600x100', '600x200', '600x300'];
  
  // IAB standards commonly used in newsletters
  const iabStandards = ['728x90', '300x250', '336x280', '300x600', '160x600', '320x50', '970x250', '120x600'];
  
  // Special formats
  const specialFormats = [
    'full-newsletter', 'full newsletter', 'full email', 'full-email',
    'dedicated send', 'dedicated-send', 'takeover',
    'text-only', 'text only', 'sponsored-content', 'sponsored content',
    'responsive', 'logo-text', 'logo text', 'content-integration'
  ];
  
  // Check pixel dimensions (normalize format)
  const pixelMatch = cleaned.match(/^(\d+)\s*[x×]\s*(\d+)$/);
  if (pixelMatch) {
    const normalized = `${pixelMatch[1]}x${pixelMatch[2]}`;
    if (emailStandards.includes(normalized) || iabStandards.includes(normalized)) {
      return true;
    }
  }
  
  // Check special formats
  if (specialFormats.some(fmt => cleaned.includes(fmt))) {
    return true;
  }
  
  return false;
}

/**
 * Calculate comprehensive data quality score for a publication
 * Exported so it can be used by dashboard components
 */
export function calculateDataQuality(publication: Publication | any): DataQualityScore {
  const allIssues: DataQualityIssue[] = [];
  let totalItems = 0;
  let completeItems = 0;

  // Helper to check all items in a channel
  // channelFrequency is the parent channel's frequency (e.g., newsletter.frequency, print.frequency)
  const checkChannel = (items: any[], channel: string, getItemName: (item: any) => string, channelFrequency?: string) => {
    items?.forEach(item => {
      const itemName = getItemName(item);
      totalItems++;
      
      const itemIssues = analyzeInventoryItem(item, channel, itemName, channelFrequency);
      
      if (itemIssues.length === 0) {
        completeItems++;
      } else {
        allIssues.push(...itemIssues);
      }
    });
  };

  const channels = publication.distributionChannels || {};

  // Check Website
  if (channels.website?.advertisingOpportunities) {
    checkChannel(
      channels.website.advertisingOpportunities,
      'Website',
      (item) => `[Website] ${item.name || 'Unnamed Ad'}`
    );
  }

  // Check Newsletters
  channels.newsletters?.forEach(newsletter => {
    checkChannel(
      newsletter.advertisingOpportunities || [],
      'Newsletter',
      (item) => `[Newsletter] ${newsletter.name} - ${item.name || 'Unnamed'}`,
      newsletter.frequency
    );
  });

  // Check Print
  const printArray = Array.isArray(channels.print) 
    ? channels.print 
    : channels.print ? [channels.print] : [];
  
  printArray.forEach(print => {
    checkChannel(
      print.advertisingOpportunities || [],
      'Print',
      (item) => `[Print] ${print.name || 'Print'} - ${item.name || 'Unnamed'}`,
      print.frequency || publication.printFrequency  // Use print frequency or publication-level fallback
    );
  });

  // Check Podcasts
  // Note: Podcast remains critical because adsPerEpisode can vary per ad
  channels.podcasts?.forEach(podcast => {
    checkChannel(
      podcast.advertisingOpportunities || [],
      'Podcast',
      (item) => `[Podcast] ${podcast.name} - ${item.name || 'Unnamed'}`,
      podcast.frequency  // Passed but won't be used as fallback since Podcast is marked critical
    );
  });

  // Check Social Media
  // Social media typically doesn't have a channel-level frequency, so no fallback
  channels.socialMedia?.forEach(profile => {
    checkChannel(
      profile.advertisingOpportunities || [],
      'Social Media',
      (item) => `[Social] ${profile.platform} - ${item.name || 'Unnamed'}`,
      profile.frequency  // May not exist, ad-level frequency is more common
    );
  });

  // Check Streaming (with special channel-level checks)
  channels.streamingVideo?.forEach(stream => {
    const streamName = stream.name || 'Unnamed Channel';
    
    // Count the channel itself as an item to be checked
    totalItems++;
    
    // Check streaming channel-level data quality
    const channelIssues: DataQualityIssue[] = [];
    
    // Issue: Missing frequency (critical for revenue calculations)
    if (!stream.frequency) {
      channelIssues.push({
        severity: 'critical',
        type: 'Missing Frequency',
        count: 1,
        description: 'Publishing frequency is required to calculate impressions/month',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing averageViews (critical for CPM/CPV calculations)
    if (!stream.averageViews && stream.advertisingOpportunities?.some((ad: any) => 
      ['cpm', 'cpv'].includes(ad.pricing?.pricingModel)
    )) {
      channelIssues.push({
        severity: 'critical',
        type: 'Missing Performance Data',
        count: 1,
        description: 'averageViews is required for CPM/CPV pricing',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing platform
    if (!stream.platform || (Array.isArray(stream.platform) && stream.platform.length === 0)) {
      channelIssues.push({
        severity: 'warning',
        type: 'Missing Platform',
        count: 1,
        description: 'Platform should be specified (YouTube, Twitch, etc.)',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // Issue: Missing subscribers (less critical, but useful)
    if (!stream.subscribers || stream.subscribers === 0) {
      channelIssues.push({
        severity: 'info',
        type: 'Missing Audience Data',
        count: 1,
        description: 'Subscriber count helps with audience reach metrics',
        items: [`[Streaming] ${streamName}`]
      });
    }
    
    // If no channel-level issues, count as complete
    if (channelIssues.length === 0) {
      completeItems++;
    }
    
    // Add channel-level issues
    allIssues.push(...channelIssues);
    
    // Check each streaming ad
    checkChannel(
      stream.advertisingOpportunities || [],
      'Streaming',
      (item) => `[Streaming] ${streamName} - ${item.name || 'Unnamed'}`,
      stream.frequency
    );
  });

  // Check Radio
  // Note: Radio remains critical because spotsPerShow can vary per ad
  channels.radioStations?.forEach(station => {
    if (station.shows && station.shows.length > 0) {
      station.shows.forEach(show => {
        checkChannel(
          show.advertisingOpportunities || [],
          'Radio',
          (item) => `[Radio] ${station.callSign} - ${show.name} - ${item.name || 'Unnamed'}`,
          show.frequency  // Passed but won't be used as fallback since Radio is marked critical
        );
      });
    } else {
      checkChannel(
        station.advertisingOpportunities || [],
        'Radio',
        (item) => `[Radio] ${station.callSign} - ${item.name || 'Unnamed'}`,
        station.frequency
      );
    }
  });

  // Check Events
  channels.events?.forEach(event => {
    checkChannel(
      event.advertisingOpportunities || [],
      'Events',
      (item) => `[Event] ${event.name} - ${item.level || 'Unnamed'}`,
      event.frequency
    );
  });

  // Aggregate issues by type
  const aggregatedIssues: Map<string, DataQualityIssue> = new Map();
  
  allIssues.forEach(issue => {
    const key = `${issue.severity}-${issue.type}`;
    if (aggregatedIssues.has(key)) {
      const existing = aggregatedIssues.get(key)!;
      existing.count += issue.count;
      existing.items.push(...issue.items);
    } else {
      aggregatedIssues.set(key, { ...issue });
    }
  });

  const issuesList = Array.from(aggregatedIssues.values())
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  const criticalCount = issuesList
    .filter(i => i.severity === 'critical')
    .reduce((sum, i) => sum + i.count, 0);

  // Calculate score (0-100)
  let score = 100;
  if (totalItems > 0) {
    score = Math.round((completeItems / totalItems) * 100);
  }

  return {
    score,
    totalItems,
    completeItems,
    issuesCount: allIssues.length,
    criticalCount,
    issues: issuesList
  };
}

export const PublicationDataQuality: React.FC<Props> = ({ 
  publication, 
  onViewDetails,
  preCalculatedQuality 
}) => {
  const { refreshPublication } = usePublication();
  // Use pre-calculated quality if provided (ensures same data as tile), otherwise calculate
  const quality = preCalculatedQuality || useMemo(() => calculateDataQuality(publication), [publication]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPublication();
    setIsRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { variant: 'secondary' as const, label: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 50) return { variant: 'secondary' as const, label: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { variant: 'destructive' as const, label: 'Needs Attention', color: 'bg-red-100 text-red-800' };
  };


  const badge = getScoreBadge(quality.score);

  if (quality.totalItems === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Inventory Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No inventory items found for this publication.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-base flex items-center justify-between">
          <span>Inventory Quality Score</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh inventory quality score"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={badge.color}>
              {badge.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className={`text-2xl font-bold ${getScoreColor(quality.score)}`}>
              {quality.score}%
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {quality.completeItems} of {quality.totalItems} items complete
            </div>
          </div>
          <div className="text-right">
            {quality.criticalCount === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">No Critical Issues</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{quality.criticalCount} Critical</span>
              </div>
            )}
          </div>
        </div>

        {/* Issues Summary - Expandable */}
        {quality.issues.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between font-medium text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>Issues Found ({quality.issues.length} {quality.issues.length === 1 ? 'type' : 'types'}):</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            {/* Collapsed View - Summary */}
            {!isExpanded && (
              <div className="space-y-1">
                {quality.issues.slice(0, 3).map((issue, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-2 text-sm p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setIsExpanded(true)}
                  >
                    {issue.severity === 'critical' && (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'info' && (
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {issue.count} × {issue.type}
                      </div>
                      <div className="text-xs text-gray-600">
                        {issue.description}
                      </div>
                    </div>
                  </div>
                ))}
                {quality.issues.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 pl-6 underline"
                  >
                    Click to see {quality.issues.length - 3} more {quality.issues.length - 3 === 1 ? 'issue' : 'issues'} and all affected items
                  </button>
                )}
              </div>
            )}

            {/* Expanded View - Detailed List */}
            {isExpanded && (
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {quality.issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {issue.severity === 'critical' && (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.severity === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.severity === 'info' && (
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {issue.count} × {issue.type}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {issue.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* List of affected items */}
                    <div className="ml-7 space-y-1">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Affected Items:
                      </div>
                      {issue.items.slice(0, 10).map((item, itemIdx) => (
                        <div 
                          key={itemIdx}
                          className="text-xs text-gray-600 pl-3 py-1 bg-white rounded border-l-2 border-gray-300"
                        >
                          • {item}
                        </div>
                      ))}
                      {issue.items.length > 10 && (
                        <div className="text-xs text-gray-500 pl-3 italic">
                          ... and {issue.items.length - 10} more items
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewDetails}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/pricing-formulas.html#data-quality', '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Inventory Quality Guide
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
          <div>
            <div className="text-xl font-bold text-green-600">
              {quality.completeItems}
            </div>
            <div className="text-xs text-gray-600">Complete</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-600">
              {quality.issuesCount - quality.criticalCount}
            </div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">
              {quality.criticalCount}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

