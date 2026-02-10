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
// NEWSLETTER / EMAIL STANDARDS
// =====================================================

/**
 * Newsletter and Email advertising standards
 * Common email newsletter ad formats, plus support for web-standard sizes
 */
export const NEWSLETTER_STANDARDS: Record<string, InventoryTypeStandard> = {
  // Email Standard Sizes (600px width for email clients)
  EMAIL_HEADER_BANNER: {
    id: 'newsletter_email_header_600x150',
    channel: 'newsletter',
    name: '600x150 Email Header Banner',
    description: 'Standard email header/banner ad. Most common newsletter size.',
    defaultSpecs: {
      dimensions: '600x150',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Must work on mobile. Avoid small text. Keep key info in safe area.'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    },
    examples: ['Newsletter header', 'Email banner']
  },

  EMAIL_LEADERBOARD: {
    id: 'newsletter_email_leaderboard_600x100',
    channel: 'newsletter',
    name: '600x100 Email Leaderboard',
    description: 'Compact email leaderboard ad.',
    defaultSpecs: {
      dimensions: '600x100',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Keep text large and readable on mobile.'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  EMAIL_LARGE_BANNER: {
    id: 'newsletter_email_large_600x200',
    channel: 'newsletter',
    name: '600x200 Email Large Banner',
    description: 'Larger email banner for more visual impact.',
    defaultSpecs: {
      dimensions: '600x200',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '250KB',
      colorSpace: 'RGB',
      resolution: '72ppi'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  EMAIL_DISPLAY: {
    id: 'newsletter_email_display_600x300',
    channel: 'newsletter',
    name: '600x300 Email Display Ad',
    description: 'Large email display ad.',
    defaultSpecs: {
      dimensions: '600x300',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '300KB',
      colorSpace: 'RGB',
      resolution: '72ppi'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  // Web Standard Sizes (also common in newsletters)
  NEWSLETTER_LEADERBOARD: {
    id: 'newsletter_leaderboard_728x90',
    channel: 'newsletter',
    name: '728x90 Leaderboard',
    description: 'IAB standard leaderboard, common in email newsletters.',
    defaultSpecs: {
      dimensions: '728x90',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  NEWSLETTER_MEDIUM_RECTANGLE: {
    id: 'newsletter_medium_rectangle_300x250',
    channel: 'newsletter',
    name: '300x250 Medium Rectangle',
    description: 'IAB standard size, used in newsletter content.',
    defaultSpecs: {
      dimensions: '300x250',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  NEWSLETTER_LARGE_RECTANGLE: {
    id: 'newsletter_large_rectangle_336x280',
    channel: 'newsletter',
    name: '336x280 Large Rectangle',
    description: 'IAB standard large rectangle.',
    defaultSpecs: {
      dimensions: '336x280',
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '150KB',
      colorSpace: 'RGB',
      resolution: '72ppi'
    },
    validation: {
      required: ['dimensions', 'fileFormats'],
      optional: ['maxFileSize']
    }
  },

  // Special newsletter formats
  NEWSLETTER_TAKEOVER: {
    id: 'newsletter_takeover',
    channel: 'newsletter',
    name: 'Full Newsletter Takeover',
    description: 'Exclusive newsletter sponsorship. Custom creative based on publication template.',
    defaultSpecs: {
      fileFormats: ['HTML', 'JPG', 'PNG'],
      maxFileSize: '500KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Work with publication on custom creative. Provide assets in multiple sizes.'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['dimensions']
    },
    examples: ['Dedicated send', 'Full email', 'Newsletter sponsorship']
  },

  NEWSLETTER_TEXT_ONLY: {
    id: 'newsletter_text_only',
    channel: 'newsletter',
    name: 'Text-Only Sponsorship',
    description: 'Text-based sponsorship message. No image required. Plain text preferred.',
    defaultSpecs: {
      dimensions: 'text-only', // Special marker for text assets
      fileFormats: ['TXT'], // Prefer plain text for text-only placements
      maxFileSize: '10KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Provide text copy (usually 150-250 characters). May include URL. Upload a .txt file with your message.'
    },
    validation: {
      required: [],
      optional: ['dimensions']
    },
    examples: ['Sponsored message', 'Text sponsorship', 'Classified', 'Native ad copy']
  },

  NEWSLETTER_NATIVE: {
    id: 'newsletter_native',
    channel: 'newsletter',
    name: 'Native / Sponsored Content',
    description: 'Content-integrated advertising that matches newsletter style.',
    defaultSpecs: {
      dimensions: 'sponsored-content', // Special marker for native content
      fileFormats: ['TXT', 'HTML', 'JPG', 'PNG'],
      maxFileSize: '200KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Provide copy and optional logo. Content should match publication tone and style.'
    },
    validation: {
      required: [],
      optional: ['dimensions']
    },
    examples: ['Sponsored content', 'Content integration', 'Advertorial', 'Logo + text']
  },

  NEWSLETTER_RESPONSIVE: {
    id: 'newsletter_responsive',
    channel: 'newsletter',
    name: 'Responsive Newsletter Ad',
    description: 'Flexible ad that adapts to email client and device.',
    defaultSpecs: {
      fileFormats: ['JPG', 'PNG', 'GIF'],
      maxFileSize: '300KB',
      colorSpace: 'RGB',
      resolution: '72ppi',
      additionalRequirements: 'Provide assets at multiple sizes. Key content should be legible at any size.'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['dimensions']
    },
    examples: ['Responsive banner', '600px wide responsive']
  }
};

// =====================================================
// PRINT STANDARDS
// =====================================================

/**
 * Print advertising standards
 * 
 * Unlike website ads (which have standardized IAB sizes), print ad dimensions
 * are publication-specific based on physical newspaper/magazine layouts.
 * 
 * These standards define requirements by AD FORMAT (full page, half page, etc.)
 * rather than exact dimensions, as actual sizes vary by publication.
 */
export const PRINT_STANDARDS: Record<string, InventoryTypeStandard> = {
  // Full Page Print Ad
  FULL_PAGE: {
    id: 'print_full_page',
    channel: 'print',
    name: 'Full Page Print Ad',
    description: 'Full page advertisement. Exact dimensions vary by publication.',
    defaultSpecs: {
      fileFormats: ['PDF', 'TIFF', 'EPS', 'AI'],
      maxFileSize: '50MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      bleed: '0.125 inches',
      additionalRequirements: 'All fonts must be embedded or outlined. Images must be 300dpi CMYK. Check with publication for exact trim size.'
    },
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: ['bleed', 'trim', 'safeArea']
    },
    examples: [
      'Full page newspaper ad',
      'Full page magazine ad',
      'Full page newsletter ad'
    ]
  },

  // Half Page Print Ad
  HALF_PAGE: {
    id: 'print_half_page',
    channel: 'print',
    name: 'Half Page Print Ad',
    description: 'Half page advertisement. Can be horizontal or vertical. Dimensions vary by publication.',
    defaultSpecs: {
      fileFormats: ['PDF', 'TIFF', 'EPS', 'AI'],
      maxFileSize: '25MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      bleed: '0.125 inches',
      additionalRequirements: 'Specify horizontal or vertical orientation. All fonts must be embedded. Images must be 300dpi CMYK.'
    },
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: ['bleed', 'trim']
    },
    examples: [
      'Half page horizontal',
      'Half page vertical'
    ]
  },

  // Quarter Page Print Ad
  QUARTER_PAGE: {
    id: 'print_quarter_page',
    channel: 'print',
    name: 'Quarter Page Print Ad',
    description: 'Quarter page advertisement. Dimensions vary by publication.',
    defaultSpecs: {
      fileFormats: ['PDF', 'TIFF', 'EPS', 'AI'],
      maxFileSize: '15MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      bleed: '0.125 inches',
      additionalRequirements: 'All fonts must be embedded. Images must be 300dpi CMYK. Maintain minimum 6pt text size.'
    },
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: ['bleed']
    },
    examples: [
      'Quarter page vertical',
      'Quarter page horizontal'
    ]
  },

  // Eighth Page Print Ad
  EIGHTH_PAGE: {
    id: 'print_eighth_page',
    channel: 'print',
    name: 'Eighth Page Print Ad',
    description: 'Eighth page advertisement. Smaller format ad.',
    defaultSpecs: {
      fileFormats: ['PDF', 'TIFF', 'JPG'],
      maxFileSize: '10MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      additionalRequirements: 'Keep text large and readable (minimum 8pt). Simple designs work best at this size.'
    },
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: []
    }
  },

  // Business Card Size Ad
  BUSINESS_CARD: {
    id: 'print_business_card',
    channel: 'print',
    name: 'Business Card Ad',
    description: 'Business card sized advertisement, typically 3.5" x 2"',
    defaultSpecs: {
      dimensions: '3.5x2',
      fileFormats: ['PDF', 'TIFF', 'JPG'],
      maxFileSize: '5MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      additionalRequirements: 'Minimum text size 6pt. Keep design simple and legible at small size.'
    },
    commonSizes: ['3.5x2', '2x3.5'],
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: []
    }
  },

  // Classified Ad
  CLASSIFIED: {
    id: 'print_classified',
    channel: 'print',
    name: 'Classified Ad',
    description: 'Classified advertisement, typically text-based or small display',
    defaultSpecs: {
      fileFormats: ['PDF', 'JPG', 'TEXT'],
      maxFileSize: '5MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      additionalRequirements: 'Text-based ads may be submitted as plain text. Display classifieds require CMYK files.'
    },
    validation: {
      required: ['resolution'],
      optional: ['colorSpace']
    },
    examples: [
      'Text classified',
      'Display classified'
    ]
  },

  // Insert
  INSERT: {
    id: 'print_insert',
    channel: 'print',
    name: 'Print Insert',
    description: 'Separate insert to be included with publication. Customer usually provides pre-printed materials.',
    defaultSpecs: {
      fileFormats: ['PDF'],
      maxFileSize: '100MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      additionalRequirements: 'Dimensions, paper stock, and quantity must be confirmed with publication. Files must be print-ready PDF/X-1a if printing through publication.'
    },
    validation: {
      required: ['resolution'],
      optional: ['colorSpace', 'bleed', 'trim']
    },
    examples: [
      'Flyer insert',
      'Brochure insert',
      'Pre-printed promotional piece'
    ]
  },

  // Custom Print Ad
  CUSTOM: {
    id: 'print_custom',
    channel: 'print',
    name: 'Custom Print Ad',
    description: 'Custom-sized print advertisement with publication-specific requirements',
    defaultSpecs: {
      fileFormats: ['PDF', 'TIFF', 'EPS'],
      maxFileSize: '50MB',
      colorSpace: 'CMYK',
      resolution: '300dpi',
      additionalRequirements: 'Confirm all specifications with publication before creating artwork. Include bleed if required.'
    },
    validation: {
      required: ['colorSpace', 'resolution'],
      optional: ['bleed', 'trim', 'safeArea']
    }
  }
};

// =====================================================
// RADIO / AUDIO STANDARDS
// =====================================================

/**
 * Radio advertising standards
 * Duration-based formats (radio's equivalent of "dimensions")
 */
export const RADIO_STANDARDS: Record<string, InventoryTypeStandard> = {
  // ===== 15-SECOND SPOTS =====
  SPOT_15_AUDIO: {
    id: 'radio_spot_15s_audio',
    channel: 'radio',
    name: '15-Second Spot - Audio',
    description: 'Short pre-produced radio commercial.',
    defaultSpecs: {
      dimensions: '15s',
      duration: 15,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '10MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be broadcast quality. Include 0.5s of silence at start and end.'
    },
    validation: {
      required: ['duration', 'fileFormats'],
      optional: ['bitrate']
    },
    examples: ['Quick mention', 'Teaser spot', 'Reminder ad']
  },

  SPOT_15_SCRIPT: {
    id: 'radio_spot_15s_script',
    channel: 'radio',
    name: '15-Second Spot - Script',
    description: 'Script for a short radio commercial (~35-40 words).',
    defaultSpecs: {
      dimensions: '15s',
      duration: 15,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script copy (~35-40 words for 15s read). Include pronunciation guides for brand names if needed.'
    },
    validation: {
      required: ['duration'],
      optional: []
    },
    examples: ['Quick mention script', 'Teaser spot copy']
  },

  // ===== 30-SECOND SPOTS =====
  SPOT_30_AUDIO: {
    id: 'radio_spot_30s_audio',
    channel: 'radio',
    name: '30-Second Spot - Audio',
    description: 'Standard pre-produced radio commercial. Most common format for radio advertising.',
    defaultSpecs: {
      dimensions: '30s',
      duration: 30,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '15MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be broadcast quality. Include 0.5s of silence at start and end.'
    },
    validation: {
      required: ['duration', 'fileFormats'],
      optional: ['bitrate']
    },
    examples: ['Standard commercial', 'Product ad', 'Service promotion']
  },

  SPOT_30_SCRIPT: {
    id: 'radio_spot_30s_script',
    channel: 'radio',
    name: '30-Second Spot - Script',
    description: 'Script for a standard radio commercial (~75 words).',
    defaultSpecs: {
      dimensions: '30s',
      duration: 30,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script copy (~50-75 words for 30s read). Include pronunciation guides for brand names if needed.'
    },
    validation: {
      required: ['duration'],
      optional: []
    },
    examples: ['Standard commercial script', 'Product ad copy']
  },

  // ===== 60-SECOND SPOTS =====
  SPOT_60_AUDIO: {
    id: 'radio_spot_60s_audio',
    channel: 'radio',
    name: '60-Second Spot - Audio',
    description: 'Full-length pre-produced radio commercial for detailed messaging.',
    defaultSpecs: {
      dimensions: '60s',
      duration: 60,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '25MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be broadcast quality. Include 0.5s of silence at start and end.'
    },
    validation: {
      required: ['duration', 'fileFormats'],
      optional: ['bitrate']
    },
    examples: ['Full commercial', 'Detailed product pitch', 'Story-based ad']
  },

  SPOT_60_SCRIPT: {
    id: 'radio_spot_60s_script',
    channel: 'radio',
    name: '60-Second Spot - Script',
    description: 'Script for a full-length radio commercial (~150 words).',
    defaultSpecs: {
      dimensions: '60s',
      duration: 60,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script copy (~100-150 words for 60s read). Include pronunciation guides for brand names if needed.'
    },
    validation: {
      required: ['duration'],
      optional: []
    },
    examples: ['Full commercial script', 'Detailed product pitch copy']
  },

  // Live Read / Script-based
  LIVE_READ: {
    id: 'radio_live_read',
    channel: 'radio',
    name: 'Live Read',
    description: 'Host-read advertisement. Provide script for on-air talent to read.',
    defaultSpecs: {
      dimensions: 'live-read',
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script copy (typically 50-150 words for 30s read). Include pronunciation guides for brand names if needed.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Host endorsement', 'Personal read', 'Organic mention']
  },

  // Sponsorship
  SPONSORSHIP: {
    id: 'radio_sponsorship',
    channel: 'radio',
    name: 'Sponsorship',
    description: 'Show or segment sponsorship. "Brought to you by..." format.',
    defaultSpecs: {
      dimensions: 'sponsorship',
      fileFormats: ['TXT', 'MP3', 'WAV'],
      maxFileSize: '10MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      additionalRequirements: 'Provide sponsor tag copy or pre-recorded audio. Typically 5-15 seconds.'
    },
    validation: {
      required: [],
      optional: ['duration', 'fileFormats']
    },
    examples: ['Weather sponsor', 'Traffic sponsor', 'News sponsor', 'Show presented by...']
  },

  // Long-form / Takeover
  LONG_FORM: {
    id: 'radio_long_form',
    channel: 'radio',
    name: 'Long-Form / Interview',
    description: 'Extended format for interviews, takeovers, or special features.',
    defaultSpecs: {
      dimensions: 'long-form',
      fileFormats: ['MP3', 'WAV', 'TXT'],
      maxFileSize: '100MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Duration varies (typically 5-30 minutes). Coordinate format and timing with station.'
    },
    validation: {
      required: [],
      optional: ['duration', 'fileFormats', 'bitrate']
    },
    examples: ['10-minute interview', '22-minute takeover', 'Sponsored segment']
  },

  // Custom
  CUSTOM: {
    id: 'radio_custom',
    channel: 'radio',
    name: 'Custom Radio Ad',
    description: 'Custom duration or format. Coordinate specifics with station.',
    defaultSpecs: {
      dimensions: 'custom',
      fileFormats: ['MP3', 'WAV', 'TXT'],
      maxFileSize: '50MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      additionalRequirements: 'Confirm duration and format requirements with station before production.'
    },
    validation: {
      required: [],
      optional: ['duration', 'fileFormats', 'bitrate']
    }
  }
};

// =====================================================
// PODCAST STANDARDS
// =====================================================

/**
 * Podcast advertising standards
 * Position-based (pre/mid/post-roll) and duration-based formats
 */
export const PODCAST_STANDARDS: Record<string, InventoryTypeStandard> = {
  // ===== PRE-ROLL (beginning of episode) =====
  PRE_ROLL_30_AUDIO: {
    id: 'podcast_pre_roll_30s_audio',
    channel: 'podcast',
    name: 'Pre-Roll 30s - Audio',
    description: 'Pre-recorded 30-second ad at the beginning of the podcast episode.',
    defaultSpecs: {
      dimensions: 'pre-roll',
      duration: 30,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '15MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality (44.1kHz, stereo).'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['duration', 'bitrate']
    },
    examples: ['Opening sponsor', 'Episode intro ad', 'Presented by...']
  },

  PRE_ROLL_30_SCRIPT: {
    id: 'podcast_pre_roll_30s_script',
    channel: 'podcast',
    name: 'Pre-Roll 30s - Script',
    description: 'Script for a 30-second ad read at the beginning of the podcast episode.',
    defaultSpecs: {
      dimensions: 'pre-roll',
      duration: 30,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~50-75 words for 30s read). Host may personalize delivery.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Opening sponsor script', 'Episode intro copy']
  },

  PRE_ROLL_60_AUDIO: {
    id: 'podcast_pre_roll_60s_audio',
    channel: 'podcast',
    name: 'Pre-Roll 60s - Audio',
    description: 'Pre-recorded 60-second ad at the beginning of the podcast episode.',
    defaultSpecs: {
      dimensions: 'pre-roll',
      duration: 60,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '25MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality (44.1kHz, stereo).'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['duration', 'bitrate']
    },
    examples: ['Extended opening sponsor', 'Detailed intro ad']
  },

  PRE_ROLL_60_SCRIPT: {
    id: 'podcast_pre_roll_60s_script',
    channel: 'podcast',
    name: 'Pre-Roll 60s - Script',
    description: 'Script for a 60-second ad read at the beginning of the podcast episode.',
    defaultSpecs: {
      dimensions: 'pre-roll',
      duration: 60,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~100-150 words for 60s read). Host may personalize delivery.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Extended opening sponsor script', 'Detailed intro copy']
  },

  // ===== MID-ROLL 30 seconds =====
  MID_ROLL_30_AUDIO: {
    id: 'podcast_mid_roll_30s_audio',
    channel: 'podcast',
    name: 'Mid-Roll 30s - Audio',
    description: 'Pre-recorded 30-second ad played during the middle of the episode.',
    defaultSpecs: {
      dimensions: '30s',
      duration: 30,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '15MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality. Mid-rolls have highest completion rates.'
    },
    validation: {
      required: ['duration', 'fileFormats'],
      optional: ['bitrate']
    },
    examples: ['Standard podcast ad', 'Product commercial', 'Service promotion']
  },

  MID_ROLL_30_SCRIPT: {
    id: 'podcast_mid_roll_30s_script',
    channel: 'podcast',
    name: 'Mid-Roll 30s - Script',
    description: 'Script for a 30-second ad read during the middle of the episode.',
    defaultSpecs: {
      dimensions: '30s',
      duration: 30,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~50-75 words for 30s read). Host may personalize delivery.'
    },
    validation: {
      required: ['duration'],
      optional: []
    },
    examples: ['Standard podcast ad script', 'Product ad copy']
  },

  // ===== MID-ROLL 60 seconds =====
  MID_ROLL_60_AUDIO: {
    id: 'podcast_mid_roll_60s_audio',
    channel: 'podcast',
    name: 'Mid-Roll 60s - Audio',
    description: 'Pre-recorded 60-second ad played during the middle of the episode.',
    defaultSpecs: {
      dimensions: '60s',
      duration: 60,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '25MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality. Allows for detailed messaging.'
    },
    validation: {
      required: ['duration', 'fileFormats'],
      optional: ['bitrate']
    },
    examples: ['Extended product pitch', 'Story-based ad', 'Detailed promotion']
  },

  MID_ROLL_60_SCRIPT: {
    id: 'podcast_mid_roll_60s_script',
    channel: 'podcast',
    name: 'Mid-Roll 60s - Script',
    description: 'Script for a 60-second ad read during the middle of the episode.',
    defaultSpecs: {
      dimensions: '60s',
      duration: 60,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~100-150 words for 60s read). Host may personalize delivery.'
    },
    validation: {
      required: ['duration'],
      optional: []
    },
    examples: ['Extended product pitch script', 'Story-based ad copy']
  },

  // ===== POST-ROLL (end of episode) =====
  POST_ROLL_30_AUDIO: {
    id: 'podcast_post_roll_30s_audio',
    channel: 'podcast',
    name: 'Post-Roll 30s - Audio',
    description: 'Pre-recorded 30-second ad at the end of the podcast episode.',
    defaultSpecs: {
      dimensions: 'post-roll',
      duration: 30,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '15MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality. Lower completion rate but often more affordable.'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['duration', 'bitrate']
    },
    examples: ['Closing sponsor', 'Call-to-action', 'Next episode promo']
  },

  POST_ROLL_30_SCRIPT: {
    id: 'podcast_post_roll_30s_script',
    channel: 'podcast',
    name: 'Post-Roll 30s - Script',
    description: 'Script for a 30-second ad read at the end of the podcast episode.',
    defaultSpecs: {
      dimensions: 'post-roll',
      duration: 30,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~50-75 words for 30s read). Host may personalize delivery.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Closing sponsor script', 'Call-to-action copy']
  },

  POST_ROLL_60_AUDIO: {
    id: 'podcast_post_roll_60s_audio',
    channel: 'podcast',
    name: 'Post-Roll 60s - Audio',
    description: 'Pre-recorded 60-second ad at the end of the podcast episode.',
    defaultSpecs: {
      dimensions: 'post-roll',
      duration: 60,
      fileFormats: ['MP3', 'WAV'],
      maxFileSize: '25MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      bitrate: '192kbps',
      additionalRequirements: 'Audio must be podcast quality.'
    },
    validation: {
      required: ['fileFormats'],
      optional: ['duration', 'bitrate']
    },
    examples: ['Extended closing sponsor', 'Detailed call-to-action']
  },

  POST_ROLL_60_SCRIPT: {
    id: 'podcast_post_roll_60s_script',
    channel: 'podcast',
    name: 'Post-Roll 60s - Script',
    description: 'Script for a 60-second ad read at the end of the podcast episode.',
    defaultSpecs: {
      dimensions: 'post-roll',
      duration: 60,
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (~100-150 words for 60s read). Host may personalize delivery.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Extended closing sponsor script']
  },

  // Host Read
  HOST_READ: {
    id: 'podcast_host_read',
    channel: 'podcast',
    name: 'Host-Read Ad',
    description: 'Host reads sponsor copy in their own voice. Most authentic and engaging format.',
    defaultSpecs: {
      dimensions: 'host-read',
      fileFormats: ['TXT'],
      maxFileSize: '100KB',
      colorSpace: 'RGB',
      resolution: 'N/A',
      additionalRequirements: 'Provide script/talking points (50-200 words). Host may personalize delivery. Include pronunciation guides if needed.'
    },
    validation: {
      required: [],
      optional: ['duration']
    },
    examples: ['Personal endorsement', 'Organic mention', 'Conversational ad']
  },

  // Sponsorship / Takeover
  SPONSORSHIP: {
    id: 'podcast_sponsorship',
    channel: 'podcast',
    name: 'Episode Sponsorship',
    description: 'Full episode sponsorship with multiple mentions and "presented by" branding.',
    defaultSpecs: {
      dimensions: 'sponsorship',
      fileFormats: ['TXT', 'MP3', 'WAV'],
      maxFileSize: '25MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      additionalRequirements: 'Includes pre-roll, mid-roll, and post-roll mentions. Provide sponsor copy and/or pre-recorded audio.'
    },
    validation: {
      required: [],
      optional: ['duration', 'fileFormats']
    },
    examples: ['Episode presented by...', 'Title sponsorship', 'Full episode takeover']
  },

  // Custom
  CUSTOM: {
    id: 'podcast_custom',
    channel: 'podcast',
    name: 'Custom Podcast Ad',
    description: 'Custom format or duration. Coordinate specifics with podcast host.',
    defaultSpecs: {
      dimensions: 'custom',
      fileFormats: ['MP3', 'WAV', 'TXT'],
      maxFileSize: '50MB',
      colorSpace: 'RGB',
      resolution: '44.1kHz',
      additionalRequirements: 'Confirm format, duration, and placement requirements with podcast.'
    },
    validation: {
      required: [],
      optional: ['duration', 'fileFormats', 'bitrate']
    }
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get standard specs by ID
 */
export function getInventoryStandard(standardId: string): InventoryTypeStandard | null {
  return WEBSITE_STANDARDS[standardId] || NEWSLETTER_STANDARDS[standardId] || PRINT_STANDARDS[standardId] || RADIO_STANDARDS[standardId] || PODCAST_STANDARDS[standardId] || null;
}

/**
 * Get all website standards
 */
export function getWebsiteStandards(): InventoryTypeStandard[] {
  return Object.values(WEBSITE_STANDARDS);
}

/**
 * Get all print standards
 */
export function getPrintStandards(): InventoryTypeStandard[] {
  return Object.values(PRINT_STANDARDS);
}

/**
 * Get standards by channel
 */
export function getStandardsByChannel(channel: InventoryChannel): InventoryTypeStandard[] {
  switch (channel) {
    case 'website':
      return Object.values(WEBSITE_STANDARDS);
    case 'newsletter':
      return Object.values(NEWSLETTER_STANDARDS);
    case 'print':
      return Object.values(PRINT_STANDARDS);
    case 'radio':
      return Object.values(RADIO_STANDARDS);
    case 'podcast':
      return Object.values(PODCAST_STANDARDS);
    // Add other channels as they're developed
    default:
      return [];
  }
}

/**
 * Get all standards across all channels
 */
export function getAllStandards(): InventoryTypeStandard[] {
  return [
    ...Object.values(WEBSITE_STANDARDS),
    ...Object.values(NEWSLETTER_STANDARDS),
    ...Object.values(PRINT_STANDARDS),
    ...Object.values(RADIO_STANDARDS),
    ...Object.values(PODCAST_STANDARDS)
  ];
}

/**
 * Get IAB standard sizes only (website)
 */
export function getIABStandards(): InventoryTypeStandard[] {
  return Object.values(WEBSITE_STANDARDS).filter(s => s.iabStandard);
}

/**
 * Find standard by dimensions
 * 
 * For website: Matches exact pixel dimensions (e.g., "300x250")
 * For print: Dimensions are publication-specific, so this primarily matches format-based standards
 * 
 * @param dimensions - The dimensions string (e.g., "300x250" for web, '10" x 12.5"' for print)
 * @param channel - Optional channel type. If not provided, will auto-detect from dimension format.
 */
export function findStandardByDimensions(dimensions: string, channel?: InventoryChannel): InventoryTypeStandard | null {
  // Auto-detect channel from dimension format if not provided
  const isPrintDimension = dimensions.includes('"') || dimensions.includes('inch') || 
    /\d+(\.\d+)?\s*['"]?\s*[xX×]\s*\d+(\.\d+)?\s*['"]?\s*(inches?|in)?/.test(dimensions);
  
  const effectiveChannel = channel || (isPrintDimension ? 'print' : 'website');
  const standards = getStandardsByChannel(effectiveChannel);
  
  // For print, dimensions are publication-specific, so we match by format
  if (effectiveChannel === 'print') {
    // Print dimensions don't match standards directly - return null
    // Print matching happens at the spec group level, not standard level
    return null;
  }
  
  return standards.find(
    s => s.defaultSpecs.dimensions === dimensions
  ) || null;
}

/**
 * Check if a dimension string represents print (inch) dimensions
 */
export function isPrintDimensions(dimensions: string): boolean {
  if (!dimensions) return false;
  
  // Check for inch indicators: quotes, "inch", "in"
  // Also check for decimal dimensions which are common in print (e.g., "10.5 x 12.625")
  return dimensions.includes('"') || 
    dimensions.toLowerCase().includes('inch') ||
    /^\d+(\.\d+)?\s*['"]\s*[xX×]\s*\d+(\.\d+)?\s*['"]\s*$/.test(dimensions) ||
    /\d+\.\d+\s*[xX×]\s*\d+(\.\d+)?/.test(dimensions);
}

/**
 * Parse print dimensions (inches) from a string
 * Returns width and height in inches, or null if not valid print dimensions
 * 
 * Handles formats like:
 * - '10" x 12.5"'
 * - '10.5" x 13.5"'
 * - "10 x 12.5"
 * - "10x12.5"
 * - "10 W x 12 H"
 */
export function parsePrintDimensions(dimensions: string): { width: number; height: number } | null {
  if (!dimensions) return null;
  
  // Remove quotes, W/H indicators, and normalize
  let cleaned = dimensions
    .replace(/["'""'']/g, '') // Remove all quote types
    .replace(/\s*[WwHh]\s*/g, ' ') // Remove W/H indicators
    .replace(/inches?|in\b/gi, '') // Remove "inch" text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Match patterns like "10 x 12.5" or "10x12.5" or "10.5 x 13.5"
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)$/);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
  }
  
  // Fallback: try to extract any two numbers separated by 'x'
  const numbers = cleaned.match(/(\d+(?:\.\d+)?)/g);
  if (numbers && numbers.length >= 2) {
    return {
      width: parseFloat(numbers[0]),
      height: parseFloat(numbers[1])
    };
  }
  
  return null;
}

/**
 * Check if two print dimensions match within tolerance
 * @param dims1 - First dimensions string
 * @param dims2 - Second dimensions string  
 * @param tolerance - Percentage tolerance (default 5% for print)
 */
export function printDimensionsMatch(dims1: string, dims2: string, tolerance: number = 0.05): boolean {
  const parsed1 = parsePrintDimensions(dims1);
  const parsed2 = parsePrintDimensions(dims2);
  
  if (!parsed1 || !parsed2) return false;
  
  const widthDiff = Math.abs(parsed1.width - parsed2.width) / Math.max(parsed1.width, parsed2.width);
  const heightDiff = Math.abs(parsed1.height - parsed2.height) / Math.max(parsed1.height, parsed2.height);
  
  return widthDiff <= tolerance && heightDiff <= tolerance;
}

/**
 * Get newsletter standards for selection
 */
export function getNewsletterStandards(): InventoryTypeStandard[] {
  return Object.values(NEWSLETTER_STANDARDS);
}

/**
 * Find newsletter standard by dimension or type
 */
export function findNewsletterStandard(searchTerm: string): InventoryTypeStandard | null {
  const term = searchTerm.toLowerCase().trim();
  
  // Try exact dimension match first
  const byDimension = Object.values(NEWSLETTER_STANDARDS).find(s => {
    const dims = s.defaultSpecs.dimensions;
    if (!dims) return false;
    if (Array.isArray(dims)) {
      return dims.some(d => d.toLowerCase() === term);
    }
    return dims.toLowerCase() === term;
  });
  if (byDimension) return byDimension;
  
  // Try fuzzy match on common terms
  const fuzzyMap: Record<string, string> = {
    'full email': 'NEWSLETTER_TAKEOVER',
    'full newsletter': 'NEWSLETTER_TAKEOVER',
    'dedicated send': 'NEWSLETTER_TAKEOVER',
    'takeover': 'NEWSLETTER_TAKEOVER',
    'text only': 'NEWSLETTER_TEXT_ONLY',
    'text-only': 'NEWSLETTER_TEXT_ONLY',
    'text': 'NEWSLETTER_TEXT_ONLY',
    'sponsored message': 'NEWSLETTER_TEXT_ONLY',
    'sponsored content': 'NEWSLETTER_NATIVE',
    'sponsored-content': 'NEWSLETTER_NATIVE',
    'native': 'NEWSLETTER_NATIVE',
    'content integration': 'NEWSLETTER_NATIVE',
    'content-integration': 'NEWSLETTER_NATIVE',
    'logo-text': 'NEWSLETTER_NATIVE',
    'logo text': 'NEWSLETTER_NATIVE',
    'advertorial': 'NEWSLETTER_NATIVE',
    'responsive': 'NEWSLETTER_RESPONSIVE',
    'custom': 'NEWSLETTER_RESPONSIVE',
    'multiple': 'NEWSLETTER_RESPONSIVE'
  };
  
  const standardKey = fuzzyMap[term];
  return standardKey ? NEWSLETTER_STANDARDS[standardKey] : null;
}

/**
 * Get radio standards for selection
 */
export function getRadioStandards(): InventoryTypeStandard[] {
  return Object.values(RADIO_STANDARDS);
}

/**
 * Find radio standard by duration or type
 */
export function findRadioStandard(searchTerm: string | number): InventoryTypeStandard | null {
  // Handle numeric duration (in seconds)
  if (typeof searchTerm === 'number') {
    const byDuration = Object.values(RADIO_STANDARDS).find(s => 
      s.defaultSpecs.duration === searchTerm
    );
    if (byDuration) return byDuration;
  }
  
  const term = String(searchTerm).toLowerCase().trim();
  
  // Try exact dimension match first (e.g., "15s", "30s")
  const byDimension = Object.values(RADIO_STANDARDS).find(s => {
    const dims = s.defaultSpecs.dimensions;
    if (!dims) return false;
    if (Array.isArray(dims)) {
      return dims.some(d => d.toLowerCase() === term);
    }
    return dims.toLowerCase() === term;
  });
  if (byDimension) return byDimension;
  
  // Try duration match (e.g., "15", "30", "60")
  const numericDuration = parseInt(term);
  if (!isNaN(numericDuration)) {
    const byNumericDuration = Object.values(RADIO_STANDARDS).find(s => 
      s.defaultSpecs.duration === numericDuration
    );
    if (byNumericDuration) return byNumericDuration;
  }
  
  // Try fuzzy match on common terms (defaults to audio variant)
  const fuzzyMap: Record<string, string> = {
    '15': 'SPOT_15_AUDIO',
    '15s': 'SPOT_15_AUDIO',
    '15 second': 'SPOT_15_AUDIO',
    '15-second': 'SPOT_15_AUDIO',
    '15_second_spot': 'SPOT_15_AUDIO',
    '15 audio': 'SPOT_15_AUDIO',
    '15 script': 'SPOT_15_SCRIPT',
    '30': 'SPOT_30_AUDIO',
    '30s': 'SPOT_30_AUDIO',
    '30 second': 'SPOT_30_AUDIO',
    '30-second': 'SPOT_30_AUDIO',
    '30_second_spot': 'SPOT_30_AUDIO',
    '30 audio': 'SPOT_30_AUDIO',
    '30 script': 'SPOT_30_SCRIPT',
    '60': 'SPOT_60_AUDIO',
    '60s': 'SPOT_60_AUDIO',
    '60 second': 'SPOT_60_AUDIO',
    '60-second': 'SPOT_60_AUDIO',
    '60_second_spot': 'SPOT_60_AUDIO',
    '60 audio': 'SPOT_60_AUDIO',
    '60 script': 'SPOT_60_SCRIPT',
    'live read': 'LIVE_READ',
    'live-read': 'LIVE_READ',
    'live_read': 'LIVE_READ',
    'host read': 'LIVE_READ',
    'sponsorship': 'SPONSORSHIP',
    'sponsor': 'SPONSORSHIP',
    'traffic_weather_sponsor': 'SPONSORSHIP',
    'long form': 'LONG_FORM',
    'long-form': 'LONG_FORM',
    'interview': 'LONG_FORM',
    'takeover': 'LONG_FORM',
    'custom': 'CUSTOM'
  };
  
  const standardKey = fuzzyMap[term];
  return standardKey ? RADIO_STANDARDS[standardKey] : null;
}

/**
 * Infer radio format from duration in seconds
 */
export function inferRadioFormatFromDuration(durationSeconds: number): InventoryTypeStandard | null {
  if (durationSeconds <= 15) return RADIO_STANDARDS.SPOT_15_AUDIO;
  if (durationSeconds <= 30) return RADIO_STANDARDS.SPOT_30_AUDIO;
  if (durationSeconds <= 60) return RADIO_STANDARDS.SPOT_60_AUDIO;
  if (durationSeconds > 120) return RADIO_STANDARDS.LONG_FORM;
  return RADIO_STANDARDS.CUSTOM;
}

/**
 * Get podcast standards for selection
 */
export function getPodcastStandards(): InventoryTypeStandard[] {
  return Object.values(PODCAST_STANDARDS);
}

/**
 * Find podcast standard by position, duration, or type
 */
export function findPodcastStandard(searchTerm: string | number): InventoryTypeStandard | null {
  // Handle numeric duration (in seconds)
  if (typeof searchTerm === 'number') {
    const byDuration = Object.values(PODCAST_STANDARDS).find(s => 
      s.defaultSpecs.duration === searchTerm
    );
    if (byDuration) return byDuration;
  }
  
  const term = String(searchTerm).toLowerCase().trim();
  
  // Try exact dimension match first (e.g., "30s", "pre-roll")
  const byDimension = Object.values(PODCAST_STANDARDS).find(s => {
    const dims = s.defaultSpecs.dimensions;
    if (!dims) return false;
    if (Array.isArray(dims)) {
      return dims.some(d => d.toLowerCase() === term);
    }
    return dims.toLowerCase() === term;
  });
  if (byDimension) return byDimension;
  
  // Try duration match (e.g., "30", "60")
  const numericDuration = parseInt(term);
  if (!isNaN(numericDuration)) {
    const byNumericDuration = Object.values(PODCAST_STANDARDS).find(s => 
      s.defaultSpecs.duration === numericDuration
    );
    if (byNumericDuration) return byNumericDuration;
  }
  
  // Try fuzzy match on common terms (defaults to audio variant)
  const fuzzyMap: Record<string, string> = {
    // Pre-roll variants (default to 30s audio)
    'pre-roll': 'PRE_ROLL_30_AUDIO',
    'pre roll': 'PRE_ROLL_30_AUDIO',
    'preroll': 'PRE_ROLL_30_AUDIO',
    'pre_roll': 'PRE_ROLL_30_AUDIO',
    'opening': 'PRE_ROLL_30_AUDIO',
    'pre-roll 30 audio': 'PRE_ROLL_30_AUDIO',
    'pre-roll 30 script': 'PRE_ROLL_30_SCRIPT',
    'pre-roll 60 audio': 'PRE_ROLL_60_AUDIO',
    'pre-roll 60 script': 'PRE_ROLL_60_SCRIPT',
    
    // Mid-roll 30s variants
    '30': 'MID_ROLL_30_AUDIO',
    '30s': 'MID_ROLL_30_AUDIO',
    '30 second': 'MID_ROLL_30_AUDIO',
    '30-second': 'MID_ROLL_30_AUDIO',
    'mid-roll': 'MID_ROLL_30_AUDIO',
    'mid roll': 'MID_ROLL_30_AUDIO',
    'midroll': 'MID_ROLL_30_AUDIO',
    'mid_roll': 'MID_ROLL_30_AUDIO',
    'mid-roll 30 audio': 'MID_ROLL_30_AUDIO',
    'mid-roll 30 script': 'MID_ROLL_30_SCRIPT',
    
    // Mid-roll 60s variants
    '60': 'MID_ROLL_60_AUDIO',
    '60s': 'MID_ROLL_60_AUDIO',
    '60 second': 'MID_ROLL_60_AUDIO',
    '60-second': 'MID_ROLL_60_AUDIO',
    'mid-roll 60 audio': 'MID_ROLL_60_AUDIO',
    'mid-roll 60 script': 'MID_ROLL_60_SCRIPT',
    
    // Post-roll variants (default to 30s audio)
    'post-roll': 'POST_ROLL_30_AUDIO',
    'post roll': 'POST_ROLL_30_AUDIO',
    'postroll': 'POST_ROLL_30_AUDIO',
    'post_roll': 'POST_ROLL_30_AUDIO',
    'closing': 'POST_ROLL_30_AUDIO',
    'post-roll 30 audio': 'POST_ROLL_30_AUDIO',
    'post-roll 30 script': 'POST_ROLL_30_SCRIPT',
    'post-roll 60 audio': 'POST_ROLL_60_AUDIO',
    'post-roll 60 script': 'POST_ROLL_60_SCRIPT',
    
    // Host read variants
    'host read': 'HOST_READ',
    'host-read': 'HOST_READ',
    'host_read': 'HOST_READ',
    'live read': 'HOST_READ',
    'live-read': 'HOST_READ',
    
    // Sponsorship variants
    'sponsorship': 'SPONSORSHIP',
    'sponsor': 'SPONSORSHIP',
    'sponsored_content': 'SPONSORSHIP',
    'takeover': 'SPONSORSHIP',
    'title sponsorship': 'SPONSORSHIP',
    
    // Custom
    'custom': 'CUSTOM'
  };
  
  const standardKey = fuzzyMap[term];
  return standardKey ? PODCAST_STANDARDS[standardKey] : null;
}

/**
 * Infer podcast format from ad name and duration
 */
export function inferPodcastFormatFromName(adName: string, durationSeconds?: number): InventoryTypeStandard | null {
  const name = adName.toLowerCase();
  
  // Check for host-read / script-based formats first
  if (name.includes('host read') || name.includes('host-read')) {
    return PODCAST_STANDARDS.HOST_READ;
  }
  if (name.includes('takeover') || name.includes('sponsorship') || name.includes('sponsor') || name.includes('title')) {
    return PODCAST_STANDARDS.SPONSORSHIP;
  }
  
  // Determine duration from name or argument
  let dur = durationSeconds;
  if (!dur) {
    if (name.includes('60') || name.includes(':60')) dur = 60;
    else if (name.includes('30') || name.includes(':30')) dur = 30;
    else if (name.includes('15') || name.includes(':15')) dur = 15;
  }
  
  // Check for position-based formats (defaults to audio)
  if (name.includes('pre-roll') || name.includes('preroll') || name.includes('pre roll') || name.includes('opening')) {
    return dur && dur >= 45 ? PODCAST_STANDARDS.PRE_ROLL_60_AUDIO : PODCAST_STANDARDS.PRE_ROLL_30_AUDIO;
  }
  if (name.includes('post-roll') || name.includes('postroll') || name.includes('post roll') || name.includes('closing')) {
    return dur && dur >= 45 ? PODCAST_STANDARDS.POST_ROLL_60_AUDIO : PODCAST_STANDARDS.POST_ROLL_30_AUDIO;
  }
  
  // Mid-roll by duration (defaults to audio)
  if (name.includes('mid-roll') || name.includes('midroll') || name.includes('mid roll')) {
    return dur && dur >= 45 ? PODCAST_STANDARDS.MID_ROLL_60_AUDIO : PODCAST_STANDARDS.MID_ROLL_30_AUDIO;
  }
  
  // Duration-based fallback (defaults to audio mid-roll)
  if (dur) {
    if (dur >= 45) return PODCAST_STANDARDS.MID_ROLL_60_AUDIO;
    return PODCAST_STANDARDS.MID_ROLL_30_AUDIO;
  }
  
  // Use duration if provided
  if (durationSeconds) {
    if (durationSeconds <= 20) return PODCAST_STANDARDS.PRE_ROLL_30_AUDIO;
    if (durationSeconds <= 40) return PODCAST_STANDARDS.MID_ROLL_30_AUDIO;
    if (durationSeconds <= 70) return PODCAST_STANDARDS.MID_ROLL_60_AUDIO;
    return PODCAST_STANDARDS.SPONSORSHIP;
  }
  
  // Default to mid-roll 30s audio if nothing else matches
  return PODCAST_STANDARDS.MID_ROLL_30_AUDIO;
}

/**
 * Infer podcast format from duration in seconds
 */
export function inferPodcastFormatFromDuration(durationSeconds: number): InventoryTypeStandard | null {
  if (durationSeconds <= 20) return PODCAST_STANDARDS.PRE_ROLL_30_AUDIO;
  if (durationSeconds <= 40) return PODCAST_STANDARDS.MID_ROLL_30_AUDIO;
  if (durationSeconds <= 70) return PODCAST_STANDARDS.MID_ROLL_60_AUDIO;
  if (durationSeconds > 120) return PODCAST_STANDARDS.SPONSORSHIP;
  return PODCAST_STANDARDS.CUSTOM;
}

/**
 * Check if a dimension string indicates a text-only/native placement
 */
export function isTextOnlyPlacement(dimensions?: string | string[]): boolean {
  if (!dimensions) return false;
  
  const dims = Array.isArray(dimensions) ? dimensions : [dimensions];
  const textOnlyMarkers = [
    'text-only', 'text only', 'text',
    'sponsored-content', 'sponsored content',
    'native', 'advertorial',
    'logo-text', 'logo text',
    'content-integration', 'content integration'
  ];
  
  return dims.some(dim => {
    const d = dim.toLowerCase();
    return textOnlyMarkers.some(marker => d.includes(marker));
  });
}

/**
 * Find print standard by ad format
 */
export function findPrintStandardByFormat(adFormat: string): InventoryTypeStandard | null {
  const formatMap: Record<string, string> = {
    'tall full page': 'FULL_PAGE',
    'tall portrait full page': 'FULL_PAGE',
    'upper portrait full page': 'FULL_PAGE',
    'square full page': 'FULL_PAGE',
    'narrow full page': 'FULL_PAGE',
    'half v tall': 'HALF_PAGE',
    'half v standard': 'HALF_PAGE',
    'half v slim': 'HALF_PAGE',
    'half v mid': 'HALF_PAGE',
    'half v compact': 'HALF_PAGE',
    'half h tall': 'HALF_PAGE',
    'half h standard': 'HALF_PAGE',
    'half h wide': 'HALF_PAGE',
    'half h mid': 'HALF_PAGE',
    'half h compact': 'HALF_PAGE',
    'quarter page': 'QUARTER_PAGE',
    'eighth page': 'EIGHTH_PAGE',
    'business card': 'BUSINESS_CARD',
    'classified': 'CLASSIFIED',
    'insert': 'INSERT',
    'custom': 'CUSTOM'
  };
  
  const standardKey = formatMap[adFormat.toLowerCase()];
  return standardKey ? PRINT_STANDARDS[standardKey] : null;
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
  
  // Check dimensions (if not responsive/custom/text-only)
  const skipDimensionCheck = ['responsive', 'text-only', 'sponsored-content', 'native'].some(
    skip => specs.dimensions?.toString().toLowerCase().includes(skip)
  );
  
  if (specs.dimensions && !skipDimensionCheck && detectedSpecs.dimensions) {
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
  // Standards collections
  websiteStandards: WEBSITE_STANDARDS,
  printStandards: PRINT_STANDARDS,
  
  // Getters
  getStandard: getInventoryStandard,
  getWebsiteStandards,
  getPrintStandards,
  getStandardsByChannel,
  getAllStandards,
  getIABStandards,
  
  // Finders
  findByDimensions: findStandardByDimensions,
  findPrintByFormat: findPrintStandardByFormat,
  
  // Utilities
  generateSpecGroupId: generateSpecGroupIdFromStandard,
  validate: validateAgainstStandard,
  getRecommendations: getStandardRecommendations
};

