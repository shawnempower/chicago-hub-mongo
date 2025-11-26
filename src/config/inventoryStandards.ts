/**
 * System-Wide Inventory Standards Configuration
 * 
 * Defines the standard specifications for inventory types across all publications.
 * Publications reference these standards rather than defining specs individually.
 * 
 * Benefits:
 * - Single source of truth for specifications
 * - Consistent validation across system
 * - Easy to update system-wide
 * - Version controlled
 * - Type-safe
 */

// =====================================================
// CORE TYPES
// =====================================================

export type InventoryChannel = 
  | 'website'
  | 'print'
  | 'newsletter'
  | 'social'
  | 'radio'
  | 'podcast'
  | 'streaming'
  | 'events';

export interface StandardSpecs {
  // Core specs (all channels)
  fileFormats: string[];
  maxFileSize: string;
  colorSpace: 'RGB' | 'CMYK' | 'Grayscale';
  resolution: string;
  
  // Visual specs
  dimensions?: string | string[];
  aspectRatio?: string;
  
  // Video/Audio specs
  duration?: number;
  bitrate?: string;
  codec?: string;
  frameRate?: number;
  
  // Print specs
  bleed?: string;
  trim?: string;
  safeArea?: string;
  
  // Behavioral specs
  animationDuration?: number;
  clickable?: boolean;
  
  // Additional notes
  additionalRequirements?: string;
}

export interface InventoryTypeStandard {
  id: string;
  channel: InventoryChannel;
  name: string;
  description: string;
  iabStandard?: boolean; // IAB standard size
  defaultSpecs: StandardSpecs;
  commonSizes?: string[];
  validation?: {
    required: string[];
    optional: string[];
  };
  examples?: string[];
}

// =====================================================
// WEBSITE / DIGITAL STANDARDS
// =====================================================

/**
 * IAB Standard Ad Units (Interactive Advertising Bureau)
 * Most common and widely supported digital ad sizes
 */
export const WEBSITE_STANDARDS: Record<string, InventoryTypeStandard> = {
  // ===== MOST POPULAR IAB SIZES =====
  
  // Medium Rectangle - Most popular size
  BANNER_300x250: {
    id: 'website_banner_300x250',
    channel: 'website',
    name: '300x250 Medium Rectangle',
    description: 'IAB Standard - Most common web ad size. Works well in content or sidebar.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '300x250',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5', 'SVG'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true,
      additionalRequirements: 'Animation must loop no more than 3 times. Final frame must be static.'
    },
    commonSizes: ['300x250'],
    validation: {
      required: ['dimensions', 'fileFormats', 'maxFileSize', 'colorSpace'],
      optional: ['animationDuration']
    },
    examples: [
      'Homepage sidebar placement',
      'In-article advertising',
      'Category page sidebar'
    ]
  },

  // Leaderboard - Top banner
  BANNER_728x90: {
    id: 'website_banner_728x90',
    channel: 'website',
    name: '728x90 Leaderboard',
    description: 'IAB Standard - Horizontal banner typically placed at top or bottom of page.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '728x90',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['728x90'],
    examples: [
      'Header banner',
      'Above article content',
      'Footer placement'
    ]
  },

  // Wide Skyscraper - Vertical sidebar
  BANNER_160x600: {
    id: 'website_banner_160x600',
    channel: 'website',
    name: '160x600 Wide Skyscraper',
    description: 'IAB Standard - Tall vertical ad for sidebar placement.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '160x600',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['160x600'],
    examples: [
      'Right sidebar',
      'Left sidebar',
      'Between content sections'
    ]
  },

  // Half Page - Large sidebar unit
  BANNER_300x600: {
    id: 'website_banner_300x600',
    channel: 'website',
    name: '300x600 Half Page',
    description: 'IAB Standard - Large vertical unit for premium sidebar placement.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '300x600',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['300x600'],
    examples: [
      'Premium sidebar placement',
      'Sticky sidebar ad'
    ]
  },

  // Mobile Leaderboard
  BANNER_320x50: {
    id: 'website_banner_320x50',
    channel: 'website',
    name: '320x50 Mobile Leaderboard',
    description: 'IAB Standard - Mobile-optimized banner for smartphone screens.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '320x50',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '50KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true,
      additionalRequirements: 'Optimized for mobile load times. Keep file size minimal.'
    },
    commonSizes: ['320x50'],
    examples: [
      'Mobile header banner',
      'Mobile footer banner',
      'In-article mobile placement'
    ]
  },

  // Large Leaderboard
  BANNER_970x250: {
    id: 'website_banner_970x250',
    channel: 'website',
    name: '970x250 Billboard/Large Leaderboard',
    description: 'IAB Standard - Large billboard-style banner for premium placements.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '970x250',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['970x250', '970x90'],
    examples: [
      'Homepage masthead',
      'Premium header placement',
      'Above-the-fold placement'
    ]
  },

  // Large Leaderboard / Super Leaderboard
  BANNER_970x90: {
    id: 'website_banner_970x90',
    channel: 'website',
    name: '970x90 Large Leaderboard',
    description: 'IAB Standard - Wide banner for prominent placement at top of page.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '970x90',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['970x90'],
    examples: [
      'Homepage header',
      'Above content area',
      'Large leaderboard placement'
    ]
  },

  // Large Rectangle
  BANNER_336x280: {
    id: 'website_banner_336x280',
    channel: 'website',
    name: '336x280 Large Rectangle',
    description: 'IAB Standard - Larger rectangular ad for sidebar or content placement.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '336x280',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['336x280'],
    examples: [
      'Sidebar placement',
      'In-content ad',
      'Larger display ad'
    ]
  },

  // Full Banner
  BANNER_468x60: {
    id: 'website_banner_468x60',
    channel: 'website',
    name: '468x60 Full Banner',
    description: 'IAB Standard - Traditional banner size for header or content placement.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '468x60',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['468x60'],
    examples: [
      'Header banner',
      'Above content',
      'Traditional banner placement'
    ]
  },

  // Square Banner
  BANNER_250x250: {
    id: 'website_banner_250x250',
    channel: 'website',
    name: '250x250 Square',
    description: 'IAB Standard - Square ad for sidebar or widget placement.',
    iabStandard: true,
    defaultSpecs: {
      dimensions: '250x250',
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      animationDuration: 15,
      clickable: true
    },
    commonSizes: ['250x250'],
    examples: [
      'Sidebar widget',
      'Square display ad',
      'Social media style ad'
    ]
  },

  // Video - Pre-roll
  VIDEO_PRE_ROLL: {
    id: 'website_video_preroll',
    channel: 'website',
    name: 'Pre-roll Video Ad',
    description: 'Video advertisement that plays before content',
    defaultSpecs: {
      dimensions: '1920x1080',
      fileFormats: ['MP4'],
      maxFileSize: '50MB',
      colorSpace: 'RGB',
      resolution: '1080p',
      codec: 'H.264',
      bitrate: '5Mbps',
      aspectRatio: '16:9',
      duration: 30,
      clickable: true,
      additionalRequirements: 'Must include clickable overlay. Audio required.'
    },
    commonSizes: ['1920x1080', '1280x720'],
    validation: {
      required: ['duration', 'codec', 'aspectRatio', 'bitrate'],
      optional: []
    },
    examples: [
      'Video player pre-roll',
      'Article video ad'
    ]
  },

  // Video - Mid-roll
  VIDEO_MID_ROLL: {
    id: 'website_video_midroll',
    channel: 'website',
    name: 'Mid-roll Video Ad',
    description: 'Video advertisement that plays during content',
    defaultSpecs: {
      dimensions: '1920x1080',
      fileFormats: ['MP4'],
      maxFileSize: '30MB',
      colorSpace: 'RGB',
      resolution: '1080p',
      codec: 'H.264',
      bitrate: '5Mbps',
      aspectRatio: '16:9',
      duration: 15,
      additionalRequirements: 'Shorter duration preferred. Must be skippable after 5 seconds.'
    },
    validation: {
      required: ['duration', 'codec', 'aspectRatio'],
      optional: ['bitrate']
    }
  },

  // Native Ad
  NATIVE_AD: {
    id: 'website_native_ad',
    channel: 'website',
    name: 'Native Ad Unit',
    description: 'Advertisement designed to match site content style',
    defaultSpecs: {
      dimensions: 'responsive',
      fileFormats: ['JPG', 'PNG'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      clickable: true,
      additionalRequirements: 'Must include headline (max 60 chars), description (max 120 chars), and thumbnail image (1200x628).'
    },
    commonSizes: ['1200x628', '1200x1200'],
    examples: [
      'In-feed sponsored content',
      'Recommended articles section'
    ]
  },

  // Custom/Flexible Banner
  CUSTOM_BANNER: {
    id: 'website_banner_custom',
    channel: 'website',
    name: 'Custom Banner Size',
    description: 'Non-standard banner size specific to publication layout',
    iabStandard: false,
    defaultSpecs: {
      fileFormats: ['JPG', 'PNG', 'GIF', 'HTML5'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      clickable: true,
      additionalRequirements: 'Dimensions vary by publication. Confirm exact size requirements before creating.'
    },
    examples: [
      'Custom homepage takeover',
      'Publication-specific placement'
    ]
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get standard specs by ID
 */
export function getInventoryStandard(standardId: string): InventoryTypeStandard | null {
  return WEBSITE_STANDARDS[standardId] || null;
}

/**
 * Get all website standards
 */
export function getWebsiteStandards(): InventoryTypeStandard[] {
  return Object.values(WEBSITE_STANDARDS);
}

/**
 * Get IAB standard sizes only
 */
export function getIABStandards(): InventoryTypeStandard[] {
  return Object.values(WEBSITE_STANDARDS).filter(s => s.iabStandard);
}

/**
 * Find standard by dimensions
 */
export function findStandardByDimensions(dimensions: string): InventoryTypeStandard | null {
  return Object.values(WEBSITE_STANDARDS).find(
    s => s.defaultSpecs.dimensions === dimensions
  ) || null;
}

/**
 * Generate spec group ID from standard
 */
export function generateSpecGroupIdFromStandard(standard: InventoryTypeStandard): string {
  const specs = standard.defaultSpecs;
  const parts = [
    standard.channel,
    specs.dimensions ? `dim:${specs.dimensions}` : '',
    `fmt:${specs.fileFormats.sort().join(',')}`,
    `color:${specs.colorSpace}`,
    `res:${specs.resolution}`
  ].filter(Boolean);
  
  return parts.join('::');
}

/**
 * Validate uploaded asset against standard
 */
export function validateAgainstStandard(
  detectedSpecs: {
    dimensions?: string;
    fileFormat: string;
    fileSize: number;
    colorSpace?: string;
  },
  standard: InventoryTypeStandard
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const specs = standard.defaultSpecs;
  
  // Check dimensions (if not responsive/custom)
  if (specs.dimensions && specs.dimensions !== 'responsive' && detectedSpecs.dimensions) {
    const requiredDims = Array.isArray(specs.dimensions) 
      ? specs.dimensions 
      : [specs.dimensions];
    
    if (!requiredDims.includes(detectedSpecs.dimensions)) {
      errors.push(
        `Dimensions ${detectedSpecs.dimensions} don't match required ${requiredDims.join(' or ')}`
      );
    }
  }
  
  // Check file format
  const normalizedFormat = detectedSpecs.fileFormat.toUpperCase();
  if (!specs.fileFormats.map(f => f.toUpperCase()).includes(normalizedFormat)) {
    errors.push(
      `Format ${normalizedFormat} not in allowed formats: ${specs.fileFormats.join(', ')}`
    );
  }
  
  // Check file size
  const maxBytes = parseFileSize(specs.maxFileSize);
  if (maxBytes && detectedSpecs.fileSize > maxBytes) {
    errors.push(
      `File size ${formatBytes(detectedSpecs.fileSize)} exceeds maximum of ${specs.maxFileSize}`
    );
  } else if (maxBytes && detectedSpecs.fileSize > maxBytes * 0.8) {
    warnings.push(
      `File size is close to limit. Consider optimizing for faster load times.`
    );
  }
  
  // Check color space
  if (specs.colorSpace && detectedSpecs.colorSpace) {
    if (detectedSpecs.colorSpace !== specs.colorSpace) {
      errors.push(
        `Color space ${detectedSpecs.colorSpace} doesn't match required ${specs.colorSpace}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get recommendations for a standard
 */
export function getStandardRecommendations(standard: InventoryTypeStandard): string[] {
  const recommendations: string[] = [];
  const specs = standard.defaultSpecs;
  
  // Animation recommendations
  if (specs.animationDuration) {
    recommendations.push(
      `Keep animations to ${specs.animationDuration} seconds or less`
    );
    recommendations.push('Ensure final frame is static and clear');
  }
  
  // File size recommendations
  const maxSize = parseFileSize(specs.maxFileSize);
  if (maxSize) {
    const recommended = Math.floor(maxSize * 0.7);
    recommendations.push(
      `Aim for ${formatBytes(recommended)} or less for faster loading`
    );
  }
  
  // Mobile recommendations
  if (specs.dimensions === '320x50') {
    recommendations.push('Optimize for mobile data usage');
    recommendations.push('Use clear, readable text (minimum 12px font)');
    recommendations.push('Test on actual mobile devices');
  }
  
  // Video recommendations
  if (standard.id.includes('video')) {
    recommendations.push('Include captions/subtitles for accessibility');
    recommendations.push('Ensure audio is clear and balanced');
    recommendations.push('Test playback on multiple devices');
  }
  
  return recommendations;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

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

// =====================================================
// EXPORTS
// =====================================================

export default {
  standards: WEBSITE_STANDARDS,
  getStandard: getInventoryStandard,
  getAllStandards: getWebsiteStandards,
  getIABStandards,
  findByDimensions: findStandardByDimensions,
  generateSpecGroupId: generateSpecGroupIdFromStandard,
  validate: validateAgainstStandard,
  getRecommendations: getStandardRecommendations
};

