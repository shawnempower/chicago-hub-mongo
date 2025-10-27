/**
 * Newsletter Ad Format Types - Simplified
 * 
 * Format is determined by the dimensions value, not stored separately.
 * This keeps the schema simple while allowing categorization when needed.
 */

export type AdFormatCategory = 
  | "iab-standard"      // Web display standards (300x250, 728x90, etc.)
  | "email-standard"    // Newsletter standards (600x150, 600x100, etc.)
  | "custom-display"    // Non-standard pixel sizes
  | "native"            // Content-integrated ads
  | "responsive"        // Dynamic sizing
  | "takeover";         // Full newsletter (no pixel dimensions)

export interface NewsletterAdFormat {
  dimensions: string | string[];  // Single or multiple accepted dimensions
}

export interface NewsletterAdOpportunity {
  name: string;
  position: "header" | "footer" | "inline" | "dedicated";
  
  // Legacy field - will be removed after migration
  dimensions?: string;
  
  // New structured format
  format?: NewsletterAdFormat;
  
  pricing: any;
  hubPricing?: any[];
  available?: boolean;
  specifications?: Record<string, any>;
}

/**
 * Standard dimensions by category
 */
export const EMAIL_STANDARD_SIZES = ['600x150', '600x100', '600x200', '600x300'] as const;
export const IAB_STANDARD_SIZES = ['300x250', '728x90', '300x600', '160x600', '320x50', '970x250', '336x280', '120x600'] as const;
export const NATIVE_FORMATS = ['text-only', 'sponsored-content', 'logo-text', 'content-integration'] as const;
export const TAKEOVER_FORMATS = ['full-newsletter'] as const;

/**
 * Get category from dimensions value (string or array)
 * If array, returns category of first dimension
 */
export function getCategory(dimensions: string | string[]): AdFormatCategory {
  // If array, use first dimension for category
  const dim = Array.isArray(dimensions) ? dimensions[0] : dimensions;
  
  if (EMAIL_STANDARD_SIZES.includes(dim as any)) {
    return 'email-standard';
  }
  
  if (IAB_STANDARD_SIZES.includes(dim as any)) {
    return 'iab-standard';
  }
  
  if (NATIVE_FORMATS.includes(dim as any)) {
    return 'native';
  }
  
  if (TAKEOVER_FORMATS.includes(dim as any)) {
    return 'takeover';
  }
  
  // Check for responsive patterns
  if (dim === 'responsive' || dim.includes(',')) {
    return 'responsive';
  }
  
  // Check for pixel dimensions pattern (any WxH format not in standards)
  if (/^\d+x\d+$/i.test(dim)) {
    return 'custom-display';
  }
  
  // Default to custom display
  return 'custom-display';
}

/**
 * Helper to get dimensions from either old or new field
 */
export function getAdDimensions(ad: NewsletterAdOpportunity): {
  category?: AdFormatCategory;
  dimensions?: string | string[];
} {
  // Prefer new format
  if (ad.format?.dimensions) {
    return {
      category: getCategory(ad.format.dimensions),
      dimensions: ad.format.dimensions
    };
  }
  
  // Fallback to legacy dimensions
  if (ad.dimensions) {
    return {
      category: getCategory(ad.dimensions),
      dimensions: ad.dimensions
    };
  }
  
  return {};
}

/**
 * Get all supported dimensions as array
 */
export function getAllDimensions(dimensions: string | string[]): string[] {
  return Array.isArray(dimensions) ? dimensions : [dimensions];
}

/**
 * Get primary dimension (first if array)
 */
export function getPrimaryDimension(dimensions: string | string[]): string {
  return Array.isArray(dimensions) ? dimensions[0] : dimensions;
}

/**
 * Check if ad supports a specific dimension
 */
export function supportsDimension(ad: NewsletterAdOpportunity, dimension: string): boolean {
  const { dimensions } = getAdDimensions(ad);
  if (!dimensions) return false;
  
  const allDims = getAllDimensions(dimensions);
  return allDims.includes(dimension);
}

/**
 * Get display-friendly category label
 */
export function getCategoryLabel(category: AdFormatCategory): string {
  const labels: Record<AdFormatCategory, string> = {
    "iab-standard": "IAB Standard",
    "email-standard": "Email Standard",
    "custom-display": "Custom Display",
    "native": "Native Ad",
    "responsive": "Responsive",
    "takeover": "Full Newsletter"
  };
  return labels[category];
}

/**
 * Get display string for dimensions
 */
export function getDisplayDimensions(ad: NewsletterAdOpportunity): string {
  const { category, dimensions } = getAdDimensions(ad);
  
  // Takeover doesn't need dimensions shown
  if (category === "takeover") {
    return "Full Newsletter";
  }
  
  // Show dimensions if available
  if (dimensions) {
    if (Array.isArray(dimensions)) {
      // Multiple dimensions - show all
      return dimensions.join(', ');
    }
    return dimensions;
  }
  
  return "Not specified";
}

/**
 * Get human-readable label for dimension value
 */
export function getDimensionLabel(dimensions: string): string {
  const labels: Record<string, string> = {
    // Email Standard
    '600x150': '600×150 - Email Header Banner',
    '600x100': '600×100 - Email Leaderboard',
    '600x200': '600×200 - Email Large Banner',
    '600x300': '600×300 - Email Display Ad',
    
    // IAB Standard
    '300x250': '300×250 - Medium Rectangle',
    '728x90': '728×90 - Leaderboard',
    '300x600': '300×600 - Half Page',
    '160x600': '160×600 - Wide Skyscraper',
    '320x50': '320×50 - Mobile Banner',
    '970x250': '970×250 - Billboard',
    '336x280': '336×280 - Large Rectangle',
    '120x600': '120×600 - Skyscraper',
    
    // Native
    'text-only': 'Text Only',
    'sponsored-content': 'Sponsored Content',
    'logo-text': 'Logo + Text',
    'content-integration': 'Content Integration',
    
    // Takeover
    'full-newsletter': 'Full Newsletter Takeover',
    
    // Responsive
    'responsive': 'Responsive'
  };
  
  return labels[dimensions] || dimensions;
}

/**
 * Check if category requires pixel dimensions
 */
export function requiresPixelDimensions(category: AdFormatCategory): boolean {
  return ['iab-standard', 'email-standard', 'custom-display'].includes(category);
}

/**
 * Options for dimension selector grouped by category
 */
export const DIMENSION_OPTIONS = [
  {
    label: 'Email Standard',
    options: [
      { value: '600x150', label: '600×150 - Email Header Banner' },
      { value: '600x100', label: '600×100 - Email Leaderboard' },
      { value: '600x200', label: '600×200 - Email Large Banner' },
      { value: '600x300', label: '600×300 - Email Display Ad' }
    ]
  },
  {
    label: 'IAB Standard',
    options: [
      { value: '300x250', label: '300×250 - Medium Rectangle' },
      { value: '728x90', label: '728×90 - Leaderboard' },
      { value: '300x600', label: '300×600 - Half Page' },
      { value: '160x600', label: '160×600 - Wide Skyscraper' },
      { value: '320x50', label: '320×50 - Mobile Banner' },
      { value: '970x250', label: '970×250 - Billboard' },
      { value: '336x280', label: '336×280 - Large Rectangle' },
      { value: '120x600', label: '120×600 - Skyscraper' }
    ]
  },
  {
    label: 'Native',
    options: [
      { value: 'text-only', label: 'Text Only' },
      { value: 'sponsored-content', label: 'Sponsored Content' },
      { value: 'logo-text', label: 'Logo + Text' },
      { value: 'content-integration', label: 'Content Integration' }
    ]
  },
  {
    label: 'Other',
    options: [
      { value: 'full-newsletter', label: 'Full Newsletter Takeover' },
      { value: 'responsive', label: 'Responsive' },
      { value: 'custom', label: 'Custom Size...' }
    ]
  }
] as const;

