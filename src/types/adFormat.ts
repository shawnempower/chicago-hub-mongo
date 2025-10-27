/**
 * Structured Ad Format Types
 * 
 * This replaces the simple "dimensions" string with a structured object
 * that properly handles different ad format types.
 * 
 * Categories:
 * - iab-standard: Standard web display ad sizes (300x250, 728x90, etc.)
 * - email-standard: Standard email newsletter sizes (600x150, 600x100, etc.)
 * - custom-display: Non-standard pixel sizes
 * - native: Content-integrated ads (text, sponsored content)
 * - responsive: Dynamic sizing that adapts to screen size
 * - takeover: Full newsletter sponsorships
 */

// IAB Standard Ad Size Names (Web Standards)
export type IABStandardName =
  | "Medium Rectangle"        // 300x250
  | "Leaderboard"            // 728x90
  | "Wide Skyscraper"        // 160x600
  | "Half Page"              // 300x600
  | "Mobile Banner"          // 320x50
  | "Billboard"              // 970x250
  | "Large Rectangle"        // 336x280
  | "Skyscraper"            // 120x600
  | "Full Banner"           // 468x60
  | "Button 2"              // 120x60
  | "Large Mobile Banner";   // 320x100

// Email Standard Ad Size Names (Newsletter Standards)
export type EmailStandardName =
  | "Email Header Banner"     // 600x150
  | "Email Leaderboard"       // 600x100
  | "Email Large Banner"      // 600x200
  | "Email Display Ad";       // 600x300

// Device types for responsive ads
export type DeviceType = "desktop" | "tablet" | "mobile";

// Newsletter takeover types
export type NewsletterTakeoverType = "branded" | "dedicated-send" | "sponsorship";

// Native ad format types
export type NativeFormatType = "text-only" | "sponsored-content" | "logo-text" | "content-integration";

// Base format category discriminator
export type AdFormatCategory = 
  | "iab-standard"
  | "email-standard"
  | "custom-display"
  | "native"
  | "responsive"
  | "takeover";

/**
 * IAB Standard display ad format (web standards)
 */
export interface IABStandardAdFormat {
  category: "iab-standard";
  iabStandard: {
    size: "300x250" | "728x90" | "160x600" | "300x600" | "320x50" | "970x250" | "336x280" | "120x600" | "468x60" | "120x60" | "320x100";
    width: number;
    height: number;
    name: IABStandardName;
  };
}

/**
 * Email Standard display ad format (newsletter standards)
 */
export interface EmailStandardAdFormat {
  category: "email-standard";
  emailStandard: {
    size: "600x150" | "600x100" | "600x200" | "600x300";
    width: number;
    height: number;
    name: EmailStandardName;
  };
}

/**
 * Custom display ad format (non-standard pixel sizes)
 */
export interface CustomDisplayAdFormat {
  category: "custom-display";
  customDisplay: {
    width: number;
    height: number;
    unit: "px";
    description?: string;
  };
  alternativeSizes?: Array<{
    width: number;
    height: number;
    unit?: "px";
    note?: string;
  }>;
}

/**
 * Native ad format (content-integrated ads)
 */
export interface NativeAdFormat {
  category: "native";
  native: {
    format: NativeFormatType;
    specifications?: {
      maxCharacters?: number;
      imageSize?: string;
      allowHtml?: boolean;
      allowLinks?: boolean;
      description?: string;
    };
  };
}

/**
 * Responsive ad format (adapts to different screen sizes)
 */
export interface ResponsiveAdFormat {
  category: "responsive";
  responsive: {
    maxWidth: number;
    aspectRatio?: string; // e.g., "16:9", "3:1"
    breakpoints?: Array<{
      device: DeviceType;
      width: number;
      height: number;
    }>;
  };
}

/**
 * Newsletter takeover format (full newsletter sponsorships)
 */
export interface TakeoverAdFormat {
  category: "takeover";
  takeover: {
    type: NewsletterTakeoverType;
    advertiserProvidesCreative: boolean;
    specifications?: {
      subjectLineIncluded?: boolean;
      preheaderIncluded?: boolean;
      [key: string]: string | number | boolean | undefined;
    };
  };
}

/**
 * Union type of all ad formats
 */
export type AdFormat =
  | IABStandardAdFormat
  | EmailStandardAdFormat
  | CustomDisplayAdFormat
  | NativeAdFormat
  | ResponsiveAdFormat
  | TakeoverAdFormat;

/**
 * Helper type guards
 */
export const isIABStandardFormat = (format: AdFormat): format is IABStandardAdFormat => {
  return format.category === "iab-standard";
};

export const isEmailStandardFormat = (format: AdFormat): format is EmailStandardAdFormat => {
  return format.category === "email-standard";
};

export const isCustomDisplayFormat = (format: AdFormat): format is CustomDisplayAdFormat => {
  return format.category === "custom-display";
};

export const isNativeFormat = (format: AdFormat): format is NativeAdFormat => {
  return format.category === "native";
};

export const isResponsiveFormat = (format: AdFormat): format is ResponsiveAdFormat => {
  return format.category === "responsive";
};

export const isTakeoverFormat = (format: AdFormat): format is TakeoverAdFormat => {
  return format.category === "takeover";
};

/**
 * IAB Standard sizes reference (Web Standards)
 */
export const IAB_STANDARD_SIZES: Record<string, { name: IABStandardName; width: number; height: number }> = {
  "300x250": { name: "Medium Rectangle", width: 300, height: 250 },
  "728x90": { name: "Leaderboard", width: 728, height: 90 },
  "160x600": { name: "Wide Skyscraper", width: 160, height: 600 },
  "300x600": { name: "Half Page", width: 300, height: 600 },
  "320x50": { name: "Mobile Banner", width: 320, height: 50 },
  "970x250": { name: "Billboard", width: 970, height: 250 },
  "336x280": { name: "Large Rectangle", width: 336, height: 280 },
  "120x600": { name: "Skyscraper", width: 120, height: 600 },
  "468x60": { name: "Full Banner", width: 468, height: 60 },
  "120x60": { name: "Button 2", width: 120, height: 60 },
  "320x100": { name: "Large Mobile Banner", width: 320, height: 100 },
};

/**
 * Email Standard sizes reference (Newsletter Standards)
 */
export const EMAIL_STANDARD_SIZES: Record<string, { name: EmailStandardName; width: number; height: number }> = {
  "600x150": { name: "Email Header Banner", width: 600, height: 150 },
  "600x100": { name: "Email Leaderboard", width: 600, height: 100 },
  "600x200": { name: "Email Large Banner", width: 600, height: 200 },
  "600x300": { name: "Email Display Ad", width: 600, height: 300 },
};

/**
 * Check if dimensions match an IAB standard
 */
export const getIABStandard = (width: number, height: number): { name: IABStandardName; isStandard: true } | { isStandard: false } => {
  const key = `${width}x${height}`;
  const standard = IAB_STANDARD_SIZES[key];
  
  if (standard) {
    return { name: standard.name, isStandard: true };
  }
  
  return { isStandard: false };
};

/**
 * Check if dimensions match an Email standard
 */
export const getEmailStandard = (width: number, height: number): { name: EmailStandardName; isStandard: true } | { isStandard: false } => {
  const key = `${width}x${height}`;
  const standard = EMAIL_STANDARD_SIZES[key];
  
  if (standard) {
    return { name: standard.name, isStandard: true };
  }
  
  return { isStandard: false };
};

/**
 * Create an ad format from width and height
 * Automatically determines if it's IAB standard, email standard, or custom
 */
export const createAdFormatFromDimensions = (width: number, height: number): AdFormat => {
  // Check if it's an IAB standard size
  const iabCheck = getIABStandard(width, height);
  if (iabCheck.isStandard) {
    const key = `${width}x${height}` as "300x250" | "728x90" | "160x600" | "300x600" | "320x50" | "970x250" | "336x280" | "120x600" | "468x60" | "120x60" | "320x100";
    return {
      category: "iab-standard",
      iabStandard: {
        size: key,
        width,
        height,
        name: iabCheck.name,
      },
    };
  }
  
  // Check if it's an email standard size
  const emailCheck = getEmailStandard(width, height);
  if (emailCheck.isStandard) {
    const key = `${width}x${height}` as "600x150" | "600x100" | "600x200" | "600x300";
    return {
      category: "email-standard",
      emailStandard: {
        size: key,
        width,
        height,
        name: emailCheck.name,
      },
    };
  }
  
  // Otherwise it's a custom display size
  return {
    category: "custom-display",
    customDisplay: {
      width,
      height,
      unit: "px",
    },
  };
};

/**
 * Create a native ad format
 */
export const createNativeFormat = (
  formatType: NativeFormatType = "text-only",
  specifications?: {
    maxCharacters?: number;
    imageSize?: string;
    allowHtml?: boolean;
    allowLinks?: boolean;
    description?: string;
  }
): NativeAdFormat => {
  return {
    category: "native",
    native: {
      format: formatType,
      ...(specifications && { specifications }),
    },
  };
};

/**
 * Create a takeover format
 */
export const createTakeoverFormat = (
  takeoverType: NewsletterTakeoverType = "dedicated-send"
): TakeoverAdFormat => {
  return {
    category: "takeover",
    takeover: {
      type: takeoverType,
      advertiserProvidesCreative: true,
    },
  };
};

/**
 * Create a responsive format
 */
export const createResponsiveFormat = (maxWidth: number, aspectRatio?: string): ResponsiveAdFormat => {
  return {
    category: "responsive",
    responsive: {
      maxWidth,
      ...(aspectRatio && { aspectRatio }),
    },
  };
};

/**
 * Get display-friendly string for any format
 */
export const getFormatDisplayString = (format: AdFormat): string => {
  switch (format.category) {
    case "iab-standard": {
      const { width, height, name } = format.iabStandard;
      return `${width}×${height}px (${name})`;
    }
    
    case "email-standard": {
      const { width, height, name } = format.emailStandard;
      return `${width}×${height}px (${name})`;
    }
    
    case "custom-display": {
      const { width, height } = format.customDisplay;
      return `${width}×${height}px`;
    }
    
    case "native": {
      const { format: formatType, specifications } = format.native;
      if (formatType === "text-only" && specifications?.maxCharacters) {
        return `Text only (${specifications.maxCharacters} chars)`;
      }
      return specifications?.description || formatType.replace(/-/g, ' ');
    }
    
    case "responsive": {
      const { maxWidth, aspectRatio } = format.responsive;
      const ratio = aspectRatio ? `, ${aspectRatio}` : '';
      return `Responsive (max ${maxWidth}px${ratio})`;
    }
    
    case "takeover": {
      const typeMap: Record<NewsletterTakeoverType, string> = {
        "dedicated-send": "Dedicated Send",
        "branded": "Branded Newsletter",
        "sponsorship": "Newsletter Sponsorship",
      };
      return typeMap[format.takeover.type] || "Full Newsletter";
    }
    
    default: {
      const _exhaustive: never = format;
      return "Unknown format";
    }
  }
};

/**
 * Get short format category label
 */
export const getFormatCategoryLabel = (format: AdFormat): string => {
  const labels: Record<AdFormatCategory, string> = {
    "iab-standard": "IAB Standard",
    "email-standard": "Email Standard",
    "custom-display": "Custom Display",
    native: "Native Ad",
    responsive: "Responsive",
    takeover: "Takeover",
  };
  
  return labels[format.category];
};

/**
 * Check if format supports a specific pixel size
 */
export const supportsPixelSize = (format: AdFormat, width: number, height: number): boolean => {
  // Check IAB standard
  if (isIABStandardFormat(format)) {
    return format.iabStandard.width === width && format.iabStandard.height === height;
  }
  
  // Check Email standard
  if (isEmailStandardFormat(format)) {
    return format.emailStandard.width === width && format.emailStandard.height === height;
  }
  
  // Check custom display
  if (isCustomDisplayFormat(format)) {
    // Check primary size
    if (format.customDisplay.width === width && format.customDisplay.height === height) {
      return true;
    }
    // Check alternative sizes
    return format.alternativeSizes?.some(alt => 
      alt.width === width && alt.height === height
    ) ?? false;
  }
  
  return false;
};

/**
 * Get all supported pixel sizes from a format
 */
export const getAllPixelSizes = (format: AdFormat): Array<{ width: number; height: number; note?: string }> => {
  // IAB standard
  if (isIABStandardFormat(format)) {
    return [{
      width: format.iabStandard.width,
      height: format.iabStandard.height,
      note: format.iabStandard.name,
    }];
  }
  
  // Email standard
  if (isEmailStandardFormat(format)) {
    return [{
      width: format.emailStandard.width,
      height: format.emailStandard.height,
      note: format.emailStandard.name,
    }];
  }
  
  // Custom display
  if (isCustomDisplayFormat(format)) {
    const sizes: Array<{ width: number; height: number; note?: string }> = [{
      width: format.customDisplay.width,
      height: format.customDisplay.height,
    }];
    
    if (format.alternativeSizes) {
      sizes.push(...format.alternativeSizes.map(alt => ({
        width: alt.width,
        height: alt.height,
        note: alt.note
      })));
    }
    
    return sizes;
  }
  
  return [];
};

/**
 * Backward compatibility: Get legacy dimensions string
 */
export const getLegacyDimensionsString = (format: AdFormat): string => {
  switch (format.category) {
    case "iab-standard":
      return `${format.iabStandard.width}x${format.iabStandard.height}`;
      
    case "email-standard":
      return `${format.emailStandard.width}x${format.emailStandard.height}`;
      
    case "custom-display":
      return `${format.customDisplay.width}x${format.customDisplay.height}`;
      
    case "native": {
      if (format.native.format === "text-only") {
        const chars = format.native.specifications?.maxCharacters;
        return chars ? `Text only (${chars} characters)` : "Text only";
      }
      return format.native.specifications?.description || "Native ad";
    }
      
    case "responsive":
      return `Responsive (${format.responsive.maxWidth}px max width)`;
      
    case "takeover":
      return "Full newsletter";
      
    default:
      return "Unknown";
  }
};

/**
 * Parse legacy dimensions string into new format
 * Used for migration
 */
export const parseLegacyDimensions = (dimensions: string): AdFormat => {
  if (!dimensions) {
    return createNativeFormat("content-integration", { description: "Not specified" });
  }
  
  // Try to parse pixel dimensions (e.g., "300x250")
  const pixelMatch = dimensions.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
  if (pixelMatch) {
    const width = parseInt(pixelMatch[1], 10);
    const height = parseInt(pixelMatch[2], 10);
    return createAdFormatFromDimensions(width, height);
  }
  
  // Check for multiple sizes (e.g., "300x250, 728x90")
  const multiSizeMatch = dimensions.match(/^(\d+\s*[xX×]\s*\d+)(?:\s*,\s*(\d+\s*[xX×]\s*\d+))+$/);
  if (multiSizeMatch) {
    // Parse first as primary, rest as alternatives
    const sizes = dimensions.split(',').map(s => {
      const match = s.trim().match(/(\d+)\s*[xX×]\s*(\d+)/);
      return match ? { width: parseInt(match[1]), height: parseInt(match[2]) } : null;
    }).filter((s): s is { width: number; height: number } => s !== null);
    
    if (sizes.length > 0) {
      const [primary, ...alternatives] = sizes;
      const format = createAdFormatFromDimensions(primary.width, primary.height);
      
      // Add alternatives if it's a custom display format
      if (isCustomDisplayFormat(format) && alternatives.length > 0) {
        format.alternativeSizes = alternatives.map(alt => ({ ...alt, unit: "px" as const }));
      }
      
      return format;
    }
  }
  
  // Check for full newsletter variations
  if (/full\s*(email|newsletter|edition|integration|send)/i.test(dimensions)) {
    return createTakeoverFormat("dedicated-send");
  }
  
  // Check for text-only variations
  if (/text\s*(only|based|-based)/i.test(dimensions)) {
    const charMatch = dimensions.match(/(\d+)\s*char/i);
    return createNativeFormat("text-only", {
      maxCharacters: charMatch ? parseInt(charMatch[1]) : undefined,
      allowHtml: false,
      allowLinks: true,
    });
  }
  
  // Check for responsive
  if (/responsive/i.test(dimensions)) {
    const widthMatch = dimensions.match(/(\d+)\s*px/i);
    return createResponsiveFormat(widthMatch ? parseInt(widthMatch[1]) : 600);
  }
  
  // Character-based (move to text format)
  const charMatch = dimensions.match(/^(\d+)\s*character/i);
  if (charMatch) {
    return createNativeFormat("text-only", {
      maxCharacters: parseInt(charMatch[1]),
      allowHtml: false,
      allowLinks: true,
    });
  }
  
  // Everything else is native with custom description
  return createNativeFormat("content-integration", { description: dimensions });
};

