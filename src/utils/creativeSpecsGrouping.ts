/**
 * Creative Specs Grouping Utility
 * 
 * Groups creative requirements by unique specifications so assets can be
 * uploaded once and shared across multiple publications/placements.
 */

import { CreativeRequirement } from './creativeSpecsExtractor';

export interface GroupedCreativeRequirement {
  // Unique identifier for this spec group
  specGroupId: string;
  
  // The specification details
  channel: string;
  dimensions?: string | string[];
  fileFormats?: string[];
  maxFileSize?: string;
  colorSpace?: string;
  resolution?: string;
  additionalRequirements?: string;
  
  // Audio/video specific
  duration?: number; // in seconds (e.g., 15, 30, 60 for radio spots)
  bitrate?: string;
  
  // All placements that need this spec
  placements: Array<{
    placementId: string;
    placementName: string;
    publicationId: number;
    publicationName: string;
  }>;
  
  // Count of how many placements need this
  placementCount: number;
  publicationCount: number;
  
  // Split/merge metadata
  isPublicationSpecific?: boolean; // True if this was split for a specific publication
  originalGroupId?: string; // Reference to parent group if this is a split
  originalDimensions?: string | string[]; // Original dimensions before split
  
  // Uploaded asset (once uploaded, applies to all placements)
  uploadedAsset?: {
    assetId: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
  };
}

/**
 * Generate a unique key for a specification
 * This groups placements with identical specs together
 * 
 * Grouping strategy by channel:
 * - Website: dimensions + channel (flexible on format)
 * - Radio/Podcast: duration + channel (different lengths = different creatives)
 * - Print: dimensions + color space + resolution (strict matching)
 * - Other: all specs for strict matching
 */
function generateSpecKey(req: CreativeRequirement): string {
  const channelLower = (req.channel || 'general').toLowerCase();
  const isAudio = channelLower === 'radio' || channelLower === 'podcast';
  
  // Keep website and newsletter as separate spec groups so they appear in the correct channel tabs
  // The same image may work for both, but they need separate group entries for proper tab filtering
  const isDigitalDisplay = channelLower === 'website' || channelLower === 'newsletter';
  
  const parts: string[] = [
    req.channel || 'general',  // Use original channel, not normalized
  ];
  
  // Audio channels: group by duration (15s, 30s, 60s are different creatives)
  if (isAudio) {
    if (req.duration) {
      parts.push(`dur:${req.duration}s`);
    }
    // Also include file formats for audio (WAV vs MP3)
    if (req.fileFormats && req.fileFormats.length > 0) {
      parts.push(`fmt:${req.fileFormats.sort().join('|')}`);
    }
    return parts.join('::');
  }
  
  // Dimensions (important for visual media)
  if (req.dimensions) {
    const dims = Array.isArray(req.dimensions) 
      ? req.dimensions.sort().join('|') 
      : req.dimensions;
    parts.push(`dim:${dims}`);
  }
  
  // For digital display (website/newsletter), dimensions is sufficient for grouping
  // Other specs (format, color space) are flexible
  if (!isDigitalDisplay) {
    // For non-website (print, etc.), include all specs for strict matching
    
    // File formats
    if (req.fileFormats && req.fileFormats.length > 0) {
      parts.push(`fmt:${req.fileFormats.sort().join('|')}`);
    }
    
    // Color space (important for print)
    if (req.colorSpace) {
      parts.push(`color:${req.colorSpace}`);
    }
    
    // Resolution (important for print)
    if (req.resolution) {
      parts.push(`res:${req.resolution}`);
    }
    
    // File size (if specified)
    if (req.maxFileSize) {
      parts.push(`size:${req.maxFileSize}`);
    }
  }
  
  return parts.join('::');
}

/**
 * Group requirements by unique specifications
 */
export function groupRequirementsBySpec(
  requirements: CreativeRequirement[]
): GroupedCreativeRequirement[] {
  const groupsMap = new Map<string, GroupedCreativeRequirement>();
  
  requirements.forEach(req => {
    const specKey = generateSpecKey(req);
    
    let group = groupsMap.get(specKey);
    
    if (!group) {
      // Create new group
      group = {
        specGroupId: specKey,
        channel: req.channel,
        dimensions: req.dimensions,
        fileFormats: req.fileFormats,
        maxFileSize: req.maxFileSize,
        colorSpace: req.colorSpace,
        resolution: req.resolution,
        additionalRequirements: req.additionalRequirements,
        // Audio/video specific
        duration: req.duration,
        bitrate: req.bitrate,
        placements: [],
        placementCount: 0,
        publicationCount: 0,
      };
      groupsMap.set(specKey, group);
    }
    
    // Add this placement to the group
    group.placements.push({
      placementId: req.placementId,
      placementName: req.placementName,
      publicationId: req.publicationId,
      publicationName: req.publicationName,
    });
    
    group.placementCount = group.placements.length;
    
    // Count unique publications
    const uniquePubs = new Set(group.placements.map(p => p.publicationId));
    group.publicationCount = uniquePubs.size;
  });
  
  // Convert to array and sort by placement count (most used first)
  return Array.from(groupsMap.values()).sort((a, b) => b.placementCount - a.placementCount);
}

/**
 * Get a human-readable display name for a spec group
 */
export function getSpecDisplayName(group: GroupedCreativeRequirement): string {
  const parts: string[] = [];
  const channelLower = (group.channel || '').toLowerCase();
  const isAudio = channelLower === 'radio' || channelLower === 'podcast';
  
  // For audio channels, show duration prominently
  if (isAudio) {
    if (group.duration) {
      parts.push(`${group.duration} second spot`);
    }
    parts.push(capitalizeFirst(group.channel));
    if (group.fileFormats && group.fileFormats.length > 0) {
      parts.push(group.fileFormats.join('/'));
    }
    return parts.join(' • ');
  }
  
  // Dimensions (for visual media)
  if (group.dimensions) {
    const dims = Array.isArray(group.dimensions) 
      ? group.dimensions.join(' or ') 
      : group.dimensions;
    parts.push(dims);
  }
  
  // Channel
  parts.push(capitalizeFirst(group.channel));
  
  // Color space for print
  if (group.colorSpace) {
    parts.push(group.colorSpace);
  }
  
  return parts.join(' • ');
}

/**
 * Get a description of which publications use this spec
 */
export function getPublicationsSummary(group: GroupedCreativeRequirement): string {
  const pubNames = [...new Set(group.placements.map(p => p.publicationName))];
  
  if (pubNames.length === 0) return 'No publications';
  if (pubNames.length === 1) return pubNames[0];
  if (pubNames.length === 2) return `${pubNames[0]} and ${pubNames[1]}`;
  if (pubNames.length === 3) return `${pubNames[0]}, ${pubNames[1]}, and ${pubNames[2]}`;
  
  return `${pubNames.slice(0, 2).join(', ')}, and ${pubNames.length - 2} more`;
}

/**
 * Format dimensions for display
 * Handles special dimension values from the standardized format:
 * - Pixel dimensions: "300x250", "728x90"
 * - Audio durations: "30s", "60s", "15s"
 * - Special types: "text-only", "native-inline", "sponsorship"
 * - Podcast positions: "pre-roll", "mid-roll", "post-roll"
 * - Live reads: "live-read", "host-read"
 * 
 * @param dimensions - The dimensions string or array
 * @param channel - Optional channel type for context
 * @param fileFormats - Optional file formats for fallback display
 */
export function formatDimensions(
  dimensions?: string | string[],
  channel?: string,
  fileFormats?: string[]
): string {
  // If we have dimensions, format them appropriately
  if (dimensions) {
    // Handle array of dimensions
    if (Array.isArray(dimensions)) {
      return dimensions.map(d => formatSingleDimension(d)).join(', ');
    }
    return formatSingleDimension(dimensions);
  }
  
  // No dimensions - provide helpful fallback based on channel
  if (channel) {
    const channelLower = channel.toLowerCase();
    
    // Audio channels without dimensions - distinguish audio vs script
    if (channelLower === 'radio' || channelLower === 'podcast') {
      const isScriptOnly = fileFormats && fileFormats.length === 1 && fileFormats[0].toUpperCase() === 'TXT';
      return isScriptOnly ? 'Script' : 'Audio spot';
    }
    
    // If we have file formats, show them
    if (fileFormats && fileFormats.length > 0) {
      return fileFormats.join(', ');
    }
    
    // Channel-specific fallbacks
    if (channelLower === 'website') {
      return 'Flexible size';
    }
    if (channelLower === 'newsletter') {
      return 'Custom size';
    }
    if (channelLower === 'print') {
      return 'Custom size';
    }
  }
  
  return 'Not specified';
}

/**
 * Format a single dimension value for display
 */
function formatSingleDimension(dim: string): string {
  if (!dim) return 'Not specified';
  
  const dimLower = dim.toLowerCase().trim();
  
  // Audio durations (e.g., "30s", "60s", "15s")
  const durationMatch = dimLower.match(/^(\d+)s$/);
  if (durationMatch) {
    return `${durationMatch[1]} second spot`;
  }
  
  // Special types
  switch (dimLower) {
    case 'text-only':
      return 'Text only';
    case 'native-inline':
      return 'Native content';
    case 'sponsorship':
      return 'Sponsorship';
    case 'pre-roll':
      return 'Pre-roll';
    case 'mid-roll':
      return 'Mid-roll';
    case 'post-roll':
      return 'Post-roll';
    case 'live-read':
      return 'Live read';
    case 'host-read':
      return 'Host read';
    case 'full-newsletter':
      return 'Full newsletter';
    case 'custom':
      return 'Custom';
    case 'long-form':
      return 'Long form';
    default:
      // Return as-is for standard dimensions like "300x250", "10\" x 13\""
      return dim;
  }
}

/**
 * Helper to capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Export interface for uploaded assets with spec mapping
 */
export interface UploadedAssetWithSpecs {
  specGroupId: string;
  standardId?: string; // Links to inventory standard (e.g., "website_banner_300x250")
  assetId?: string;
  file?: File; // Optional - only present for pending uploads, not for loaded assets
  fileName?: string; // File name for loaded assets
  previewUrl?: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadProgress?: number;
  errorMessage?: string;
  fileUrl?: string;
  uploadedUrl?: string; // S3 URL after upload
  assetType?: 'placement' | 'unassigned'; // Whether assigned to placements or in library
  
  // Detected specifications from file
  detectedSpecs?: {
    dimensions?: {
      width: number;
      height: number;
      formatted: string;
    };
    colorSpace?: string;
    estimatedDPI?: number;
    fileExtension?: string;
    fileSize?: number;
    formatted?: string;
    // Text file support
    isTextAsset?: boolean;
    textContent?: string; // First 500 chars for preview
    wordCount?: number;
    characterCount?: number;
  };
  
  // Which placements this asset applies to
  appliesTo: Array<{
    placementId: string;
    publicationId: number;
    publicationName: string;
  }>;
  
  // Digital Ad Properties (for website, newsletter, streaming)
  clickUrl?: string;           // Landing page URL for click-through
  altText?: string;            // Alt text for accessibility
  // For newsletter text ads
  headline?: string;
  body?: string;
  ctaText?: string;            // Call-to-action button text
}

/**
 * Find all spec groups that match a given dimension
 * Used for website inventory where dimensions are the primary matching criteria
 */
export function findSpecGroupsByDimension(
  specGroups: GroupedCreativeRequirement[],
  targetDimension: string,
  channel: string = 'website'
): GroupedCreativeRequirement[] {
  return specGroups.filter(group => {
    // Check channel match
    if (group.channel.toLowerCase() !== channel.toLowerCase()) {
      return false;
    }
    
    // Check dimension match
    if (!group.dimensions) {
      return false;
    }
    
    const groupDims = Array.isArray(group.dimensions) 
      ? group.dimensions 
      : [group.dimensions];
    
    return groupDims.some(dim => dim === targetDimension);
  });
}

/**
 * Check if a dimension string matches between two requirements
 * Handles both string and array formats
 */
export function dimensionsMatch(
  dims1: string | string[] | undefined,
  dims2: string | string[] | undefined
): boolean {
  if (!dims1 || !dims2) return false;
  
  const arr1 = Array.isArray(dims1) ? dims1 : [dims1];
  const arr2 = Array.isArray(dims2) ? dims2 : [dims2];
  
  // Check if any dimension in arr1 matches any in arr2
  return arr1.some(d1 => arr2.some(d2 => d1 === d2));
}

