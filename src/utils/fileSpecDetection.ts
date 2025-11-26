/**
 * File Specification Detection
 * 
 * Automatically detects dimensions, format, size, and other specs
 * from uploaded files to enable auto-matching with requirements.
 */

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
  if (file.type === 'application/pdf') {
    // PDF detection would require a library like pdf.js
    // For now, mark as unknown
    specs.pageCount = undefined; // TODO: Implement PDF page count detection
  }

  return specs;
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
      
      if (requiredDims.some(dim => dim === detectedDim)) {
        score += 70; // Perfect dimension match - INCREASED WEIGHT
        reasons.push(`Dimensions match exactly: ${detectedDim}`);
      } else {
        // Check if close enough (within 5%)
        const closeMatch = requiredDims.some(dim => {
          const parsed = parseDimension(dim);
          if (parsed && detectedSpecs.dimensions) {
            const widthDiff = Math.abs(parsed.width - detectedSpecs.dimensions.width) / parsed.width;
            const heightDiff = Math.abs(parsed.height - detectedSpecs.dimensions.height) / parsed.height;
            return widthDiff < 0.05 && heightDiff < 0.05;
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
 * Parse dimension string like "300x250" to {width, height}
 */
function parseDimension(dim: string): { width: number; height: number } | null {
  const match = dim.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (!match) return null;
  
  return {
    width: parseInt(match[1]),
    height: parseInt(match[2])
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

