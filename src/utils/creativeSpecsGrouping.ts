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
 * For website inventory: dimensions are the PRIMARY grouping factor
 * For print/other: include all specs for strict matching
 */
function generateSpecKey(req: CreativeRequirement): string {
  const isWebsite = (req.channel || '').toLowerCase() === 'website';
  
  const parts: string[] = [
    req.channel || 'general',
  ];
  
  // Dimensions (ALWAYS include - most important)
  if (req.dimensions) {
    const dims = Array.isArray(req.dimensions) 
      ? req.dimensions.sort().join('|') 
      : req.dimensions;
    parts.push(`dim:${dims}`);
  }
  
  // For website inventory, dimensions + channel is sufficient for grouping
  // Other specs (format, color space) are flexible
  if (!isWebsite) {
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
  
  // Dimensions
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
 */
export function formatDimensions(dimensions?: string | string[]): string {
  if (!dimensions) return 'Not specified';
  if (Array.isArray(dimensions)) {
    return dimensions.join(', ');
  }
  return dimensions;
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

