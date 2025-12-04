/**
 * File Specification Detection
 * 
 * Automatically detects dimensions, format, size, and other specs
 * from uploaded files to enable auto-matching with requirements.
 */

// Use legacy build for better browser compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure worker using locally served file (copied to public folder)
if (typeof window !== 'undefined') {
  // Use local worker file served from public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log('[PDF Detection] PDF.js legacy build configured with local worker');
}

export interface DetectedFileSpecs {
  // Basic info
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  fileType: string;
  fileExtension: string;
  
  // Image specs (if image)
  dimensions?: {
    width: number;
    height: number;
    formatted: string; // "300x250"
  };
  
  // Color info (if available)
  colorSpace?: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown';
  
  // For PDFs
  pageCount?: number;
  
  // Quality indicators
  estimatedDPI?: number;
  
  // Metadata
  detectedAt: Date;
}

export interface FileMatchScore {
  file: File;
  detectedSpecs: DetectedFileSpecs;
  specGroupId: string;
  specGroupName: string;
  matchScore: number; // 0-100
  matchReasons: string[];
  mismatches: string[];
}

/**
 * Detect specifications from a file
 */
export async function detectFileSpecs(file: File): Promise<DetectedFileSpecs> {
  const specs: DetectedFileSpecs = {
    fileName: file.name,
    fileSize: file.size,
    fileSizeFormatted: formatBytes(file.size),
    fileType: file.type,
    fileExtension: getFileExtension(file.name),
    detectedAt: new Date()
  };

  // Detect image dimensions
  if (file.type.startsWith('image/')) {
    const dimensions = await detectImageDimensions(file);
    if (dimensions) {
      specs.dimensions = dimensions;
      specs.estimatedDPI = estimateDPI(dimensions.width, dimensions.height, file.size);
    }
    
    // Try to detect color space (basic detection)
    specs.colorSpace = await detectColorSpace(file);
  }
  
  // Detect PDF info
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    console.log('[PDF Detection] Detecting PDF specs for:', file.name);
    const pdfInfo = await detectPDFSpecs(file);
    if (pdfInfo) {
      console.log('[PDF Detection] Successfully detected:', pdfInfo);
      specs.dimensions = pdfInfo.dimensions;
      specs.pageCount = pdfInfo.pageCount;
      specs.colorSpace = pdfInfo.colorSpace;
      specs.estimatedDPI = 300; // PDFs for print are typically 300 DPI
    } else {
      console.warn('[PDF Detection] Failed to detect PDF specifications for:', file.name);
    }
  }

  return specs;
}

/**
 * Detect PDF specifications including dimensions
 */
async function detectPDFSpecs(file: File): Promise<{
  dimensions: { width: number; height: number; formatted: string };
  pageCount: number;
  colorSpace?: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown';
} | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Get first page to determine dimensions
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Convert points to inches (72 points = 1 inch for print)
    const widthInches = viewport.width / 72;
    const heightInches = viewport.height / 72;
    
    // Round to 2 decimal places for cleaner display
    const widthRounded = Math.round(widthInches * 100) / 100;
    const heightRounded = Math.round(heightInches * 100) / 100;
    
    // Format for display (e.g., "10" x 12.5")
    const formatted = `${widthRounded}" x ${heightRounded}"`;
    
    // Try to detect color space from PDF metadata
    let colorSpace: 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown' = 'Unknown';
    try {
      const metadata = await pdf.getMetadata();
      // Check for CMYK or RGB in metadata
      // Note: This is basic detection - actual color space detection 
      // would require analyzing page content/images
      if (metadata.info && typeof metadata.info === 'object') {
        const info = metadata.info as any;
        // Some PDFs include color space in keywords or subject
        const keywords = info.Keywords?.toLowerCase() || '';
        const subject = info.Subject?.toLowerCase() || '';
        
        if (keywords.includes('cmyk') || subject.includes('cmyk')) {
          colorSpace = 'CMYK';
        } else if (keywords.includes('rgb') || subject.includes('rgb')) {
          colorSpace = 'RGB';
        }
      }
    } catch (metadataError) {
      console.log('Could not detect PDF color space from metadata');
    }
    
    // If no color space detected, assume CMYK for print-sized PDFs
    if (colorSpace === 'Unknown') {
      // Print documents are typically letter size or smaller in inches
      // and larger than typical web graphics
      if (widthInches >= 3 && widthInches <= 20 && heightInches >= 3 && heightInches <= 20) {
        colorSpace = 'CMYK'; // Likely a print document
      } else {
        colorSpace = 'RGB'; // Likely a web/screen document
      }
    }
    
    return {
      dimensions: {
        width: widthRounded,
        height: heightRounded,
        formatted
      },
      pageCount: pdf.numPages,
      colorSpace
    };
  } catch (error) {
    console.error('[PDF Detection] Failed to detect PDF specifications:', error);
    console.error('[PDF Detection] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error // Log the whole error object
    });
    
    // Check if it's a worker issue
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as any;
      if (err.message && err.message.includes('worker')) {
        console.error('[PDF Detection] This appears to be a worker loading issue');
        console.error('[PDF Detection] Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      }
    }
    
    return null;
  }
}

/**
 * Detect image dimensions
 */
async function detectImageDimensions(file: File): Promise<{ width: number; height: number; formatted: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        formatted: `${img.naturalWidth}x${img.naturalHeight}`
      };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Estimate DPI based on dimensions and file size
 * This is a rough estimate - actual DPI would need EXIF data
 */
function estimateDPI(width: number, height: number, fileSize: number): number {
  // Very rough heuristic:
  // High-res print images are usually 300dpi
  // Web images are usually 72ppi
  
  const pixels = width * height;
  const bytesPerPixel = fileSize / pixels;
  
  // If very high quality (large file per pixel), likely print
  if (bytesPerPixel > 3) {
    return 300; // Likely print quality
  }
  
  // If dimensions are common web sizes
  if (isCommonWebSize(width, height)) {
    return 72;
  }
  
  // If very large dimensions (e.g., 3000+ pixels)
  if (width > 2400 || height > 2400) {
    return 300; // Likely high-res
  }
  
  return 72; // Default to web
}

/**
 * Check if dimensions match common web ad sizes
 */
function isCommonWebSize(width: number, height: number): boolean {
  const commonSizes = [
    [300, 250], [728, 90], [160, 600], [300, 600],
    [970, 250], [320, 50], [468, 60], [336, 280]
  ];
  
  return commonSizes.some(([w, h]) => width === w && height === h);
}

/**
 * Detect color space (basic detection)
 * More advanced detection would require reading image data
 */
async function detectColorSpace(file: File): Promise<'RGB' | 'CMYK' | 'Grayscale' | 'Unknown'> {
  // For now, use heuristics:
  // - JPEGs can be CMYK (for print) or RGB
  // - PNGs are always RGB
  // - PDFs can be either
  
  if (file.type === 'image/png' || file.type === 'image/webp') {
    return 'RGB'; // PNGs are always RGB
  }
  
  // For JPEGs, we'd need to read EXIF/metadata
  // For now, assume RGB for web-sized images
  return 'RGB';
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
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
 * Parse file size string (e.g., "150KB", "10MB") to bytes
 */
function parseFileSizeToBytes(sizeStr: string): number | null {
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
 * Auto-match uploaded file to spec groups
 * Returns sorted array of matches (best match first)
 */
export function autoMatchFileToSpecs(
  detectedSpecs: DetectedFileSpecs,
  specGroups: Array<{
    specGroupId: string;
    channel: string;
    dimensions?: string | string[];
    fileFormats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
  }>
): FileMatchScore[] {
  const matches: FileMatchScore[] = [];
  
  specGroups.forEach(spec => {
    let score = 0;
    const reasons: string[] = [];
    const mismatches: string[] = [];
    
    const isWebsite = spec.channel.toLowerCase() === 'website';
    
    // Check dimensions (MOST IMPORTANT - especially for website)
    if (detectedSpecs.dimensions && spec.dimensions) {
      const requiredDims = Array.isArray(spec.dimensions) ? spec.dimensions : [spec.dimensions];
      const detectedDim = detectedSpecs.dimensions.formatted;
      
      // Try exact string match first (works for both "300x250" and '10" x 12.5"')
      if (requiredDims.some(dim => normalizesDimension(dim) === normalizesDimension(detectedDim))) {
        score += 70; // Perfect dimension match - INCREASED WEIGHT
        reasons.push(`Dimensions match exactly: ${detectedDim}`);
      } else {
        // Check if close enough (within 5% for print, 0% for website)
        const closeMatch = requiredDims.some(dim => {
          const parsed = parseDimension(dim);
          if (parsed && detectedSpecs.dimensions) {
            const widthDiff = Math.abs(parsed.width - detectedSpecs.dimensions.width) / parsed.width;
            const heightDiff = Math.abs(parsed.height - detectedSpecs.dimensions.height) / parsed.height;
            // For print (inch dimensions), allow small variance due to rounding
            // For website (pixel dimensions), require exact match
            const tolerance = spec.channel === 'print' ? 0.05 : 0.01;
            return widthDiff < tolerance && heightDiff < tolerance;
          }
          return false;
        });
        
        if (closeMatch) {
          score += 40;
          reasons.push('Dimensions are close match');
        } else {
          mismatches.push(`Dimensions don't match: need ${requiredDims.join(' or ')}, got ${detectedDim}`);
        }
      }
    }
    
    // Check file format (less critical for website)
    if (spec.fileFormats && spec.fileFormats.length > 0) {
      if (spec.fileFormats.some(fmt => fmt.toUpperCase() === detectedSpecs.fileExtension)) {
        score += isWebsite ? 15 : 20; // Lower weight for website
        reasons.push('File format matches');
      } else if (isWebsite) {
        // For website, don't penalize as much - most image formats work
        reasons.push(`Format: ${detectedSpecs.fileExtension} (can be converted if needed)`);
      } else {
        mismatches.push(`Format mismatch: need ${spec.fileFormats.join('/')}, got ${detectedSpecs.fileExtension}`);
      }
    }
    
    // Check file size
    if (spec.maxFileSize) {
      const maxBytes = parseFileSizeToBytes(spec.maxFileSize);
      if (maxBytes && detectedSpecs.fileSize <= maxBytes) {
        score += 10;
        reasons.push('File size within limit');
      } else {
        mismatches.push(`File too large: max ${spec.maxFileSize}, got ${detectedSpecs.fileSizeFormatted}`);
      }
    }
    
    // Check color space (much less critical for website)
    if (spec.colorSpace && detectedSpecs.colorSpace) {
      if (spec.colorSpace.toUpperCase() === detectedSpecs.colorSpace.toUpperCase()) {
        score += isWebsite ? 5 : 10; // Lower weight for website
        reasons.push('Color space matches');
      } else if (isWebsite && detectedSpecs.colorSpace === 'RGB') {
        // RGB is fine for web, even if spec says something else
        score += 3;
        reasons.push('RGB color space (web standard)');
      } else if (!isWebsite) {
        mismatches.push(`Color space mismatch: need ${spec.colorSpace}, got ${detectedSpecs.colorSpace}`);
      }
    }
    
    // For website inventory, if dimensions match well, that's the main thing
    const dimensionScore = score >= 40; // Has good dimension match
    
    // Only include if dimensions match OR there's some other strong match
    if (isWebsite && dimensionScore) {
      // For website, dimension match is sufficient
      matches.push({
        file: null as any, // Will be set by caller
        detectedSpecs,
        specGroupId: spec.specGroupId,
        specGroupName: `${spec.channel}${spec.dimensions ? ` ${spec.dimensions}` : ''}`,
        matchScore: score,
        matchReasons: reasons,
        mismatches
      });
    } else if (!isWebsite && (score > 0 || mismatches.length === 0)) {
      // For non-website, use previous logic
      matches.push({
        file: null as any, // Will be set by caller
        detectedSpecs,
        specGroupId: spec.specGroupId,
        specGroupName: `${spec.channel}${spec.dimensions ? ` ${spec.dimensions}` : ''}`,
        matchScore: score,
        matchReasons: reasons,
        mismatches
      });
    }
  });
  
  // Sort by score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Normalize dimension string for comparison
 * Handles both pixel dimensions (300x250) and inch dimensions (10" x 12.5")
 */
function normalizesDimension(dim: string): string {
  // Remove quotes, spaces, and normalize to lowercase
  return dim.replace(/["\s]/g, '').toLowerCase()
    .replace(/×/g, 'x') // Normalize multiplication symbol
    .replace(/inches?/gi, '') // Remove "inch" or "inches"
    .replace(/in\b/gi, '') // Remove "in" suffix
    .replace(/[wh]/gi, ''); // Remove "W" and "H" indicators
}

/**
 * Parse dimension string like "300x250" or '10" x 12.5"' or "10" W x 12.625" H' to {width, height}
 */
function parseDimension(dim: string): { width: number; height: number } | null {
  // Remove quotes, W, H indicators and extra spaces
  const cleaned = dim.replace(/["']/g, '').replace(/\s*[WwHh]\s*/g, ' ').trim();
  
  // Try to match various formats:
  // - "300x250" (pixels)
  // - "10 x 12.5" (inches)
  // - "10 x 12.625" (inches with W/H removed)
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*(?:inches?|in))?/i);
  if (!match) return null;
  
  return {
    width: parseFloat(match[1]),
    height: parseFloat(match[2])
  };
}

/**
 * Get best match for a file
 */
export function getBestMatch(matches: FileMatchScore[]): FileMatchScore | null {
  if (matches.length === 0) return null;
  
  // Return best match (already sorted)
  const best = matches[0];
  
  // Only return if score is above threshold
  return best.matchScore >= 40 ? best : null;
}

/**
 * Store detected specs with asset metadata
 */
export interface AssetMetadataWithSpecs {
  // Original file info
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
  
  // Detected specifications
  detectedSpecs: {
    dimensions?: string; // "300x250"
    dimensionsWidth?: number;
    dimensionsHeight?: number;
    colorSpace?: string;
    estimatedDPI?: number;
    pageCount?: number;
  };
  
  // Storage info
  fileUrl: string;
  storagePath: string;
  storageProvider: 's3' | 'local';
  
  // Upload info
  uploadedAt: Date;
  uploadedBy: string;
  
  // Association
  specGroupId?: string;
  appliesTo?: Array<{
    placementId: string;
    publicationId: number;
    publicationName: string;
  }>;
}

/**
 * Prepare metadata for storage
 */
export function prepareAssetMetadata(
  file: File,
  detectedSpecs: DetectedFileSpecs,
  uploadInfo: {
    uploadedBy: string;
    specGroupId?: string;
    appliesTo?: any[];
  }
): Partial<AssetMetadataWithSpecs> {
  return {
    fileName: file.name,
    originalFileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileExtension: detectedSpecs.fileExtension,
    
    detectedSpecs: {
      dimensions: detectedSpecs.dimensions?.formatted,
      dimensionsWidth: detectedSpecs.dimensions?.width,
      dimensionsHeight: detectedSpecs.dimensions?.height,
      colorSpace: detectedSpecs.colorSpace,
      estimatedDPI: detectedSpecs.estimatedDPI,
      pageCount: detectedSpecs.pageCount
    },
    
    uploadedAt: new Date(),
    uploadedBy: uploadInfo.uploadedBy,
    specGroupId: uploadInfo.specGroupId,
    appliesTo: uploadInfo.appliesTo
  };
}

