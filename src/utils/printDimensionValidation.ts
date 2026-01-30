/**
 * Print Dimension Validation Utilities
 * Shared validation logic for print ad dimensions
 */

export interface DimensionValidationResult {
  isValid: boolean;
  standardized?: string;
  issue?: 'missing' | 'unparseable' | 'inconsistent';
  suggestion?: string;
}

/**
 * Parse dimension string with various formats
 */
function parseDimension(dim: string): { width: number; height: number } | null {
  if (!dim) return null;
  
  // Remove quotes and extra spaces
  let cleaned = dim.replace(/["']/g, '').trim();
  
  // Handle "or" for multiple options - take first one
  cleaned = cleaned.split(/\s+or\s+/i)[0].trim();
  
  // Handle comma-separated options (take first)
  cleaned = cleaned.split(',')[0].trim();
  
  // Helper to parse fractions like "6-1/4"
  const parseFraction = (str: string): number => {
    const match = str.match(/^(\d+)(?:-(\d+)\/(\d+))?$/);
    if (!match) return parseFloat(str);
    
    const whole = parseInt(match[1]);
    if (!match[2]) return whole;
    
    const numerator = parseInt(match[2]);
    const denominator = parseInt(match[3]);
    return whole + (numerator / denominator);
  };
  
  // Pattern 1: "9" wide x 10" high" or "9 wide x 10 high"
  let match = cleaned.match(/^(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*wide\s*[x×]\s*(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*(?:high|tall)/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 2: "10" W x 12.625" H" or "5" W x 6-1/4" H"
  match = cleaned.match(/^(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*[Ww]\s*[x×]\s*(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*[Hh]/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 3: Standard "10.5" x 13.5"" or "10.5 x 13.5 inches"
  match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:"|inches?)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:"|inches?)?/i);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
  }
  
  // Pattern 4: With fractions "5 x 6-1/4"
  match = cleaned.match(/^(\d+(?:-\d+\/\d+)?)\s*(?:"|inches?)?\s*[x×]\s*(\d+(?:-\d+\/\d+)?)\s*(?:"|inches?)?/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 5: Extract from complex specs like "Bleed: 21.25 x 13.75, Trim: 21 x 13.25"
  // Prefer Trim, then Bleed
  const trimMatch = cleaned.match(/trim:\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (trimMatch) {
    return {
      width: parseFloat(trimMatch[1]),
      height: parseFloat(trimMatch[2])
    };
  }
  
  const bleedMatch = cleaned.match(/bleed:\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (bleedMatch) {
    return {
      width: parseFloat(bleedMatch[1]),
      height: parseFloat(bleedMatch[2])
    };
  }
  
  return null;
}

/**
 * Standardize dimension string to consistent format
 */
function standardizeDimension(dim: string): string | null {
  const parsed = parseDimension(dim);
  if (!parsed) return null;
  
  return `${parsed.width}" x ${parsed.height}"`;
}

/**
 * Check if dimension format is valid (parseable)
 */
export function isValidDimension(dim: string): boolean {
  if (!dim) return false;
  
  // Check if it matches our standard format
  if (/^\d+(?:\.\d+)?["']?\s*[x×]\s*\d+(?:\.\d+)?["']?/.test(dim)) {
    return true;
  }
  
  // Check if parseable
  return parseDimension(dim) !== null;
}

/**
 * Validate print ad dimensions
 * Returns validation result with standardized format and suggestions
 */
export function validatePrintDimensions(item: any): DimensionValidationResult {
  // Check if this is a print item - get dimensions from format object
  const dimensions = item.format?.dimensions;
  
  // Missing dimensions
  if (!dimensions) {
    return {
      isValid: false,
      issue: 'missing',
      suggestion: 'Add dimensions field (e.g., "8.5\\" x 11\\""). Required for creative asset matching.'
    };
  }
  
  // Try to parse
  const parsed = parseDimension(dimensions);
  
  // Unparseable
  if (!parsed) {
    // Check if it's just text description
    if (!/\d/.test(dimensions)) {
      return {
        isValid: false,
        issue: 'unparseable',
        suggestion: `"${dimensions}" appears to be a description. Please provide numeric dimensions (e.g., "8.5\\" x 11\\").`
      };
    }
    
    // Has numbers but can't parse
    return {
      isValid: false,
      issue: 'unparseable',
      suggestion: `Cannot parse "${dimensions}". Use format: Width x Height (e.g., "10\\" x 12.625\\" or "8.5 x 11 inches").`
    };
  }
  
  // Parseable but inconsistent format
  const standardized = standardizeDimension(dimensions);
  if (standardized && standardized !== dimensions) {
    return {
      isValid: true, // Parseable, so technically valid
      standardized,
      issue: 'inconsistent',
      suggestion: `Consider standardizing to: ${standardized}`
    };
  }
  
  // Perfect!
  return {
    isValid: true,
    standardized: dimensions
  };
}

/**
 * Get default dimension for common ad formats
 */
export function getDefaultDimensionForFormat(adFormat?: string): string {
  if (!adFormat) return '8.5" x 11"';
  
  const format = adFormat.toLowerCase();
  
  const defaults: Record<string, string> = {
    'tall full page': '10" x 15.5"',
    'tall portrait full page': '10.5" x 13.5"',
    'upper portrait full page': '10" x 12.75"',
    'square full page': '10" x 10"',
    'narrow full page': '8.5" x 10.85"',
    'half page horizontal': '10" x 5"',
    'half page vertical': '5" x 10"',
    'quarter page': '5" x 5"',
    'eighth page': '5" x 3.25"',
    'business card': '3.5" x 2"',
    'classified': '2" x 2"',
    'insert': '8.5" x 11"'
  };
  
  for (const [key, dimension] of Object.entries(defaults)) {
    if (format.includes(key)) {
      return dimension;
    }
  }
  
  return '8.5" x 11"';
}

