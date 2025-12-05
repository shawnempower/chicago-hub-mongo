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
 * Aligned with NEWSLETTER_STANDARDS in config/inventoryStandards.ts
 */
export function getDimensionLabel(dimensions: string): string {
  const labels: Record<string, string> = {
    // Email Standard (600px width for email clients)
    '600x150': '600×150 - Email Header Banner',
    '600x100': '600×100 - Email Leaderboard',
    '600x200': '600×200 - Email Large Banner',
    '600x300': '600×300 - Email Display Ad',
    
    // Web Standard (IAB sizes also used in newsletters)
    '728x90': '728×90 - Leaderboard',
    '300x250': '300×250 - Medium Rectangle',
    '336x280': '336×280 - Large Rectangle',
    '300x600': '300×600 - Half Page',
    '160x600': '160×600 - Wide Skyscraper',
    '320x50': '320×50 - Mobile Banner',
    '970x250': '970×250 - Billboard',
    '120x600': '120×600 - Skyscraper',
    
    // Special Formats
    'full-newsletter': 'Full Newsletter Takeover / Dedicated Send',
    'full-email': 'Full Newsletter Takeover',
    'dedicated-send': 'Dedicated Send',
    'text-only': 'Text Only / Sponsored Message',
    'responsive': 'Responsive / Flexible Size',
    
    // Native / Content Integration
    'sponsored-content': 'Sponsored Content',
    'logo-text': 'Logo + Text',
    'content-integration': 'Content Integration',
    
    // Custom
    'custom': 'Custom Size'
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
 * These align with NEWSLETTER_STANDARDS in config/inventoryStandards.ts
 */
export const DIMENSION_OPTIONS = [
  {
    label: 'Email Standard (600px width)',
    options: [
      { value: '600x150', label: '600×150 - Email Header Banner', standardId: 'newsletter_email_header_600x150' },
      { value: '600x100', label: '600×100 - Email Leaderboard', standardId: 'newsletter_email_leaderboard_600x100' },
      { value: '600x200', label: '600×200 - Email Large Banner', standardId: 'newsletter_email_large_600x200' },
      { value: '600x300', label: '600×300 - Email Display Ad', standardId: 'newsletter_email_display_600x300' }
    ]
  },
  {
    label: 'Web Standard (IAB)',
    options: [
      { value: '728x90', label: '728×90 - Leaderboard', standardId: 'newsletter_leaderboard_728x90' },
      { value: '300x250', label: '300×250 - Medium Rectangle', standardId: 'newsletter_medium_rectangle_300x250' },
      { value: '336x280', label: '336×280 - Large Rectangle', standardId: 'newsletter_large_rectangle_336x280' },
      { value: '300x600', label: '300×600 - Half Page', standardId: 'website_banner_300x600' },
      { value: '160x600', label: '160×600 - Wide Skyscraper', standardId: 'website_banner_160x600' },
      { value: '320x50', label: '320×50 - Mobile Banner', standardId: 'website_banner_320x50' },
      { value: '970x250', label: '970×250 - Billboard', standardId: 'website_banner_970x250' },
      { value: '120x600', label: '120×600 - Skyscraper', standardId: 'website_banner_120x600' }
    ]
  },
  {
    label: 'Special Formats',
    options: [
      { value: 'full-newsletter', label: 'Full Newsletter Takeover / Dedicated Send', standardId: 'newsletter_takeover' },
      { value: 'responsive', label: 'Responsive / Flexible Size', standardId: 'newsletter_responsive' }
    ]
  },
  {
    label: 'Text / Native (Upload .txt or .html file)',
    options: [
      { value: 'text-only', label: 'Text Only - Sponsored Message', standardId: 'newsletter_text_only' },
      { value: 'sponsored-content', label: 'Sponsored Content / Native Ad', standardId: 'newsletter_native' },
      { value: 'logo-text', label: 'Logo + Text', standardId: 'newsletter_native' },
      { value: 'content-integration', label: 'Content Integration', standardId: 'newsletter_native' }
    ]
  },
  {
    label: 'Custom',
    options: [
      { value: 'custom', label: 'Custom Size...' }
    ]
  }
] as const;

