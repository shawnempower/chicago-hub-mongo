/**
 * Creative Specifications Extractor
 * 
 * Extracts creative requirements from inventory items in publications.
 * Publications define their ad specifications in their inventory data,
 * and this utility extracts them for campaign creation.
 */

import { PublicationFrontend } from '@/types/publication';

/**
 * Infer dimensions from placement name
 * Maps common ad placement names to their standard IAB dimensions
 */
function inferDimensionsFromName(itemName: string, channel: string): string | undefined {
  if (!itemName) return undefined;
  
  const nameLower = itemName.toLowerCase();
  
  // Website ad placements
  if (channel === 'website') {
    // Medium Rectangle (most common)
    if (nameLower.includes('medium rectangle') || nameLower.includes('med rect')) {
      return '300x250';
    }
    
    // Leaderboard
    if (nameLower.includes('leaderboard') && nameLower.includes('large')) {
      return '970x90';
    }
    if (nameLower.includes('leaderboard')) {
      return '728x90';
    }
    
    // Skyscraper / Half Page
    if (nameLower.includes('wide skyscraper') || nameLower.includes('half page') || nameLower.includes('skyscraper')) {
      return '160x600';
    }
    if (nameLower.includes('half page') || nameLower.includes('tall tower')) {
      return '300x600';
    }
    
    // Billboard
    if (nameLower.includes('billboard')) {
      return '970x250';
    }
    
    // Mobile Banner
    if (nameLower.includes('mobile banner')) {
      return '320x50';
    }
    
    // Square
    if (nameLower.includes('square') && nameLower.includes('large')) {
      return '336x280';
    }
    if (nameLower.includes('square')) {
      return '250x250';
    }
    
    // Rectangle
    if (nameLower.includes('large rectangle') || nameLower.includes('display rectangle')) {
      return '336x280';
    }
    
    // Generic banner (default to standard)
    if (nameLower.includes('banner') && !nameLower.includes('large') && !nameLower.includes('mobile')) {
      return '728x90';
    }
    if (nameLower.includes('banner') && nameLower.includes('large')) {
      return '970x90';
    }
    
    // Standard sizes - check for explicit dimensions in name
    const dimensionMatch = nameLower.match(/(\d{2,4})\s*x\s*(\d{2,4})/);
    if (dimensionMatch) {
      return `${dimensionMatch[1]}x${dimensionMatch[2]}`;
    }
  }
  
  // Newsletter placements - only explicit names
  if (channel === 'newsletter') {
    // Only infer from explicit size names, not generic terms
    if (nameLower.includes('leaderboard')) {
      return '600x100';
    }
    if (nameLower.includes('medium rectangle')) {
      return '300x250';
    }
    if (nameLower.includes('large banner') || (nameLower.includes('banner') && nameLower.includes('large'))) {
      return '600x150';
    }
    // Check for explicit dimensions in name
    const dimensionMatch = nameLower.match(/(\d{2,4})\s*x\s*(\d{2,4})/);
    if (dimensionMatch) {
      return `${dimensionMatch[1]}x${dimensionMatch[2]}`;
    }
  }
  
  return undefined;
}

export interface CreativeRequirement {
  placementId: string; // Unique identifier for this placement
  placementName: string;
  publicationId: number;
  publicationName: string;
  channel: string; // website, newsletter, print, radio, podcast, etc.
  
  // Creative specifications
  dimensions?: string | string[]; // e.g., "300x250" or ["300x250", "728x90"]
  fileFormats?: string[]; // e.g., ["JPG", "PNG", "PDF"]
  maxFileSize?: string; // e.g., "10MB", "500KB"
  colorSpace?: string; // e.g., "RGB", "CMYK"
  resolution?: string; // e.g., "300dpi", "72ppi"
  additionalRequirements?: string;
  
  // For audio/video
  duration?: number; // in seconds
  bitrate?: string;
  codec?: string;
  
  // For print
  bleed?: string;
  trim?: string;
  
  // Deadlines
  materialDeadline?: Date;
  
  // Source path for reference
  itemPath?: string; // Path to the item in publication data structure
}

/**
 * Extract creative requirements from a single inventory item
 */
function extractFromInventoryItem(
  item: any,
  channel: string,
  publicationId: number,
  publicationName: string,
  itemPath: string
): CreativeRequirement | null {
  if (!item) {
    console.warn('extractFromInventoryItem: item is null/undefined');
    return null;
  }
  
  // Item name can be in different fields
  const itemName = item.name || item.itemName || item.sourceName;
  
  if (!itemName) {
    console.warn('extractFromInventoryItem: No name found for item', item);
    // Still create requirement with default name
  }

  const requirement: CreativeRequirement = {
    placementId: itemPath || `${publicationId}_${channel}_${itemName || 'unknown'}`,
    placementName: itemName || `${channel} Placement`,
    publicationId,
    publicationName,
    channel,
    itemPath,
  };

  // Extract dimensions from multiple possible locations
  if (item.format?.dimensions) {
    requirement.dimensions = item.format.dimensions;
  } else if (item.specifications?.dimensions) {
    // Check specifications.dimensions (added by package refresh fix)
    requirement.dimensions = item.specifications.dimensions;
  } else if (item.sizes && Array.isArray(item.sizes)) {
    requirement.dimensions = item.sizes;
  } else if (item.dimensions) {
    requirement.dimensions = item.dimensions;
  } else {
    // Try to infer dimensions from item name
    const inferredDimensions = inferDimensionsFromName(itemName || '', channel);
    if (inferredDimensions) {
      requirement.dimensions = inferredDimensions;
      console.log(`[Dimensions Inference] Inferred ${inferredDimensions} from "${itemName}" for ${channel}`);
    }
  }

  // Extract specifications
  if (item.specifications) {
    const specs = item.specifications;
    
    // File formats - check multiple field names
    if (specs.fileFormats && Array.isArray(specs.fileFormats)) {
      // Primary field used by radio/podcast migration
      requirement.fileFormats = specs.fileFormats;
    } else if (specs.formats) {
      requirement.fileFormats = Array.isArray(specs.formats) ? specs.formats : [specs.formats];
    } else if (specs.format) {
      // Handle both array and string (comma-separated)
      if (Array.isArray(specs.format)) {
        requirement.fileFormats = specs.format;
      } else if (typeof specs.format === 'string') {
        // Split comma-separated string
        requirement.fileFormats = specs.format.split(',').map(f => f.trim());
      } else {
        requirement.fileFormats = [specs.format];
      }
    }
    
    // File size
    if (specs.maxFileSize) {
      requirement.maxFileSize = specs.maxFileSize;
    } else if (specs.fileSize) {
      requirement.maxFileSize = specs.fileSize;
    }
    
    // Color space
    if (specs.colorSpace) {
      requirement.colorSpace = specs.colorSpace;
    }
    
    // Resolution
    if (specs.resolution) {
      requirement.resolution = specs.resolution;
    }
    
    // Audio/Video specific
    if (specs.duration) {
      requirement.duration = specs.duration;
    }
    if (specs.bitrate) {
      requirement.bitrate = specs.bitrate;
    }
    if (specs.codec) {
      requirement.codec = specs.codec;
    }
    
    // Print specific
    if (specs.bleed) {
      requirement.bleed = specs.bleed;
    }
    if (specs.trim) {
      requirement.trim = specs.trim;
    }
    
    // Additional requirements
    if (specs.additionalRequirements) {
      requirement.additionalRequirements = specs.additionalRequirements;
    } else if (specs.notes) {
      requirement.additionalRequirements = specs.notes;
    }
  }

  // Extract deadline if available
  if (item.deadline) {
    requirement.materialDeadline = new Date(item.deadline);
  } else if (item.materialDeadline) {
    requirement.materialDeadline = new Date(item.materialDeadline);
  }

  return requirement;
}

/**
 * Extract creative requirements from all distribution channels
 */
export function extractCreativeRequirements(
  publication: PublicationFrontend
): CreativeRequirement[] {
  const requirements: CreativeRequirement[] = [];
  const channels = publication.distributionChannels;

  if (!channels) return requirements;

  const publicationId = publication.publicationId;
  const publicationName = publication.basicInformation.title;

  // Website
  if (channels.website?.advertisingOpportunities) {
    channels.website.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'website',
        publicationId,
        publicationName,
        `distributionChannels.website.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Newsletter/Email
  if (channels.newsletter?.advertisingOpportunities) {
    channels.newsletter.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'newsletter',
        publicationId,
        publicationName,
        `distributionChannels.newsletter.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Print
  if (channels.print?.advertisingOpportunities) {
    channels.print.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'print',
        publicationId,
        publicationName,
        `distributionChannels.print.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Radio - iterate through stations → shows → ads
  if (channels.radioStations) {
    channels.radioStations.forEach((station: any, stationIndex: number) => {
      const shows = station.shows || [];
      shows.forEach((show: any, showIndex: number) => {
        (show.advertisingOpportunities || []).forEach((item: any, adIndex: number) => {
          const requirement = extractFromInventoryItem(
            item,
            'radio',
            publicationId,
            publicationName,
            `distributionChannels.radioStations[${stationIndex}].shows[${showIndex}].advertisingOpportunities[${adIndex}]`
          );
          if (requirement) requirements.push(requirement);
        });
      });
    });
  }

  // Podcast
  if (channels.podcast?.advertisingOpportunities) {
    channels.podcast.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'podcast',
        publicationId,
        publicationName,
        `distributionChannels.podcast.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Events
  if (channels.events?.advertisingOpportunities) {
    channels.events.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'events',
        publicationId,
        publicationName,
        `distributionChannels.events.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Social Media
  if (channels.social?.advertisingOpportunities) {
    channels.social.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'social',
        publicationId,
        publicationName,
        `distributionChannels.social.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Streaming
  if (channels.streaming?.advertisingOpportunities) {
    channels.streaming.advertisingOpportunities.forEach((item, index) => {
      const requirement = extractFromInventoryItem(
        item,
        'streaming',
        publicationId,
        publicationName,
        `distributionChannels.streaming.advertisingOpportunities[${index}]`
      );
      if (requirement) requirements.push(requirement);
    });
  }

  // Expand any requirements with multiple pixel dimensions into separate requirements
  return expandMultiDimensionRequirements(requirements);
}

/**
 * Extract requirements for specific inventory items selected in a campaign
 */
export function extractRequirementsForSelectedInventory(
  inventoryItems: any[]
): CreativeRequirement[] {
  const requirements: CreativeRequirement[] = [];

  if (!inventoryItems || inventoryItems.length === 0) {
    console.warn('extractRequirementsForSelectedInventory: No inventory items provided');
    return requirements;
  }

  inventoryItems.forEach((item, index) => {
    if (!item) {
      console.warn(`extractRequirementsForSelectedInventory: Item at index ${index} is null/undefined`);
      return;
    }
    
    // Debug log
    // Removed verbose logging
    
    const requirement = extractFromInventoryItem(
      item,
      item.channel || 'general',
      item.publicationId || 0,
      item.publicationName || 'Unknown',
      item.itemPath || item.sourcePath || `item_${index}`
    );
    
    if (requirement) {
      requirements.push(requirement);
    } else {
      console.warn(`extractRequirementsForSelectedInventory: Failed to extract requirement for item ${index}`, item);
    }
  });

  console.log(`extractRequirementsForSelectedInventory: Extracted ${requirements.length} requirements from ${inventoryItems.length} items`);
  
  // Expand any requirements with multiple pixel dimensions into separate requirements
  const expanded = expandMultiDimensionRequirements(requirements);
  console.log(`extractRequirementsForSelectedInventory: Expanded to ${expanded.length} requirements (from ${requirements.length})`);
  return expanded;
}

/**
 * Check if a dimension string looks like a pixel size (e.g., "300x250", "728x90")
 */
function isPixelDimension(dim: string): boolean {
  return /^\d+\s*x\s*\d+$/i.test(dim.trim());
}

/**
 * Expand requirements that have multiple pixel dimensions into separate requirements.
 * This ensures each ad size gets its own creative asset row.
 * 
 * For example, a requirement with dimensions: ["300x250", "300x600", "450x900"]
 * becomes three separate requirements, one for each size.
 * 
 * Non-pixel dimensions (like "pre-roll", "host-read", "text-only") are NOT split.
 */
function expandMultiDimensionRequirements(requirements: CreativeRequirement[]): CreativeRequirement[] {
  const expanded: CreativeRequirement[] = [];
  
  requirements.forEach(req => {
    // Check if dimensions is an array of pixel sizes
    if (Array.isArray(req.dimensions) && req.dimensions.length > 1) {
      // Check if ALL items are pixel dimensions (to avoid splitting podcast positions, etc.)
      const allPixelDimensions = req.dimensions.every(d => isPixelDimension(d));
      
      if (allPixelDimensions) {
        // Split into separate requirements for each dimension
        req.dimensions.forEach((dim, dimIndex) => {
          expanded.push({
            ...req,
            placementId: `${req.placementId}_dim${dimIndex}`,
            placementName: `${req.placementName} (${dim})`,
            dimensions: dim, // Single dimension string now
          });
        });
        return; // Skip adding original
      }
    }
    
    // For single dimensions or non-pixel arrays, keep as-is
    expanded.push(req);
  });
  
  return expanded;
}

/**
 * Format dimensions for display
 */
export function formatDimensions(dimensions?: string | string[]): string {
  if (!dimensions) return 'Not specified';
  if (Array.isArray(dimensions)) {
    return dimensions.join(', ');
  }
  return dimensions;
}

/**
 * Format file size for display
 */
export function formatFileSize(size?: string): string {
  if (!size) return 'Not specified';
  return size;
}

/**
 * Check if a file meets the requirements
 */
export function validateFileAgainstRequirements(
  file: File,
  requirement: CreativeRequirement
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file format
  if (requirement.fileFormats && requirement.fileFormats.length > 0) {
    const fileExt = file.name.split('.').pop()?.toUpperCase();
    const acceptedFormats = requirement.fileFormats.map(f => f.toUpperCase());
    
    if (fileExt && !acceptedFormats.includes(fileExt)) {
      errors.push(`File format .${fileExt} not accepted. Accepted formats: ${requirement.fileFormats.join(', ')}`);
    }
  }

  // Check file size
  if (requirement.maxFileSize) {
    const maxBytes = parseFileSize(requirement.maxFileSize);
    if (maxBytes && file.size > maxBytes) {
      errors.push(`File size ${formatBytes(file.size)} exceeds maximum ${requirement.maxFileSize}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parse file size string to bytes
 */
function parseFileSize(sizeStr: string): number | null {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  return value * (multipliers[unit] || 1);
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Group requirements by publication
 */
export function groupRequirementsByPublication(
  requirements: CreativeRequirement[]
): Map<number, CreativeRequirement[]> {
  const grouped = new Map<number, CreativeRequirement[]>();

  requirements.forEach(req => {
    const existing = grouped.get(req.publicationId) || [];
    existing.push(req);
    grouped.set(req.publicationId, existing);
  });

  return grouped;
}

/**
 * Group requirements by channel
 */
export function groupRequirementsByChannel(
  requirements: CreativeRequirement[]
): Map<string, CreativeRequirement[]> {
  const grouped = new Map<string, CreativeRequirement[]>();

  requirements.forEach(req => {
    const existing = grouped.get(req.channel) || [];
    existing.push(req);
    grouped.set(req.channel, existing);
  });

  return grouped;
}
