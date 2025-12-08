/**
 * File Specification Detection
 * 
 * Automatically detects dimensions, format, size, and other specs
 * from uploaded files to enable auto-matching with requirements.
 */

// Use standard build for Vite compatibility
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using locally served file (copied to public folder)
if (typeof window !== 'undefined') {
  // Use local worker file served from public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log('[PDF Detection] PDF.js configured with local worker');
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
  
  // For text files (text-only/native ads)
  isTextAsset?: boolean;
  characterCount?: number;
  wordCount?: number;
  textContent?: string; // First 500 chars for preview
  
  // For audio files (radio ads)
  isAudioAsset?: boolean;
  audioDuration?: number; // Duration in seconds
  audioDurationFormatted?: string; // "0:30" format
  audioFormat?: string; // MP3, WAV, etc.
  
  // For video files (streaming ads)
  isVideoAsset?: boolean;
  videoDuration?: number; // Duration in seconds
  videoDurationFormatted?: string; // "0:30" format
  videoFormat?: string; // MP4, MOV, etc.
  videoResolution?: string; // "1920x1080", "1280x720", etc.
  
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

  // Detect text file info (for text-only/native newsletter ads)
  const ext = file.name.toLowerCase();
  if (file.type === 'text/plain' || file.type === 'text/html' || 
      ext.endsWith('.txt') || ext.endsWith('.html') || ext.endsWith('.htm')) {
    console.log('[Text Detection] Detecting text specs for:', file.name);
    const textInfo = await detectTextSpecs(file);
    if (textInfo) {
      specs.isTextAsset = true;
      specs.characterCount = textInfo.characterCount;
      specs.wordCount = textInfo.wordCount;
      specs.textContent = textInfo.preview;
      // For text assets, set a special "dimension" marker
      specs.dimensions = {
        width: 0,
        height: 0,
        formatted: 'text-only'
      };
    }
  }

  // Detect audio file info (for radio ads)
  if (file.type.startsWith('audio/') || 
      ext.endsWith('.mp3') || ext.endsWith('.wav') || 
      ext.endsWith('.m4a') || ext.endsWith('.aac')) {
    console.log('[Audio Detection] Detecting audio specs for:', file.name);
    const audioInfo = await detectAudioSpecs(file);
    if (audioInfo) {
      specs.isAudioAsset = true;
      specs.audioDuration = audioInfo.duration;
      specs.audioDurationFormatted = formatAudioDuration(audioInfo.duration);
      specs.audioFormat = audioInfo.format;
      // Set dimension to duration for matching (e.g., "30s")
      specs.dimensions = {
        width: 0,
        height: 0,
        formatted: `${Math.round(audioInfo.duration)}s`
      };
    }
  }
  
  // Detect video file info (for streaming ads)
  if (file.type.startsWith('video/') || 
      ext.endsWith('.mp4') || ext.endsWith('.mov') || 
      ext.endsWith('.avi') || ext.endsWith('.webm')) {
    console.log('[Video Detection] Detecting video specs for:', file.name);
    const videoInfo = await detectVideoSpecs(file);
    if (videoInfo) {
      specs.isVideoAsset = true;
      specs.videoDuration = videoInfo.duration;
      specs.videoDurationFormatted = formatAudioDuration(videoInfo.duration); // Reuse same format
      specs.videoFormat = videoInfo.format;
      specs.videoResolution = videoInfo.resolution;
      // Set dimension to resolution for matching (e.g., "1920x1080")
      specs.dimensions = {
        width: videoInfo.width,
        height: videoInfo.height,
        formatted: videoInfo.resolution
      };
    }
  }

  return specs;
}

/**
 * Detect text file specifications
 */
async function detectTextSpecs(file: File): Promise<{
  characterCount: number;
  wordCount: number;
  preview: string;
} | null> {
  try {
    const text = await file.text();
    const characterCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const preview = text.substring(0, 500) + (text.length > 500 ? '...' : '');
    
    return { characterCount, wordCount, preview };
  } catch (error) {
    console.error('[Text Detection] Error reading text file:', error);
    return null;
  }
}

/**
 * Detect audio file specifications
 */
async function detectAudioSpecs(file: File): Promise<{
  duration: number;
  format: string;
} | null> {
  try {
    // Create an audio element to get duration
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    
    return new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        
        // Determine format from extension
        const ext = file.name.toLowerCase().split('.').pop() || '';
        const formatMap: Record<string, string> = {
          'mp3': 'MP3',
          'wav': 'WAV',
          'm4a': 'M4A',
          'aac': 'AAC',
          'ogg': 'OGG',
          'flac': 'FLAC'
        };
        
        resolve({
          duration: Math.round(duration),
          format: formatMap[ext] || ext.toUpperCase()
        });
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('[Audio Detection] Error loading audio file');
        resolve(null);
      };
      
      // Set a timeout in case the file doesn't load
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 5000);
      
      audio.src = url;
    });
  } catch (error) {
    console.error('[Audio Detection] Error detecting audio specs:', error);
    return null;
  }
}

/**
 * Format audio duration as MM:SS
 */
function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Detect video file specifications
 */
async function detectVideoSpecs(file: File): Promise<{
  duration: number;
  format: string;
  width: number;
  height: number;
  resolution: string;
} | null> {
  try {
    // Create a video element to get duration and dimensions
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;
        URL.revokeObjectURL(url);
        
        // Determine format from extension
        const ext = file.name.toLowerCase().split('.').pop() || '';
        const formatMap: Record<string, string> = {
          'mp4': 'MP4',
          'mov': 'MOV',
          'avi': 'AVI',
          'webm': 'WebM',
          'mkv': 'MKV',
          'm4v': 'M4V'
        };
        
        // Get resolution label
        let resolutionLabel = `${width}x${height}`;
        if (height === 2160 || height === 2160) resolutionLabel = '4K';
        else if (height === 1440) resolutionLabel = '2K';
        else if (height === 1080) resolutionLabel = '1080p';
        else if (height === 720) resolutionLabel = '720p';
        else if (height === 480) resolutionLabel = '480p';
        
        resolve({
          duration: Math.round(duration),
          format: formatMap[ext] || ext.toUpperCase(),
          width,
          height,
          resolution: resolutionLabel
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('[Video Detection] Error loading video file');
        resolve(null);
      };
      
      // Set a timeout in case the file doesn't load
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 10000); // Video might take longer to load metadata
      
      video.src = url;
      video.load();
    });
  } catch (error) {
    console.error('[Video Detection] Error detecting video specs:', error);
    return null;
  }
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
 * 
 * Philosophy: Be helpful but not too smart. If unsure, don't auto-assign.
 * - Only auto-assign when confidence is high (score >= 50)
 * - For ambiguous cases, let the user decide
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
  
  // Helper to check if placement accepts text files
  const isTextAcceptingPlacement = (dims: string | string[] | undefined): boolean => {
    if (!dims) return false;
    const dimsArray = Array.isArray(dims) ? dims : [dims];
    return dimsArray.some(dim => {
      const d = dim.toLowerCase();
      return d.includes('text-only') || d.includes('text only') || 
             d.includes('sponsored-content') || d.includes('sponsored content') ||
             d.includes('native') || d.includes('logo-text') ||
             d.includes('content-integration');
    });
  };
  
  // Helper to check if placement is strictly text-only (no images)
  const isStrictlyTextOnly = (dims: string | string[] | undefined): boolean => {
    if (!dims) return false;
    const dimsArray = Array.isArray(dims) ? dims : [dims];
    return dimsArray.some(dim => {
      const d = dim.toLowerCase();
      return d === 'text-only' || d === 'text only';
    });
  };
  
  specGroups.forEach(spec => {
    let score = 0;
    const reasons: string[] = [];
    const mismatches: string[] = [];
    
    const isWebsite = spec.channel.toLowerCase() === 'website';
    const isNewsletter = spec.channel.toLowerCase() === 'newsletter';
    const placementAcceptsText = isTextAcceptingPlacement(spec.dimensions);
    const placementIsStrictlyTextOnly = isStrictlyTextOnly(spec.dimensions);
    
    // Get file extension for format checking
    const fileExt = detectedSpecs.fileExtension?.toUpperCase() || '';
    const isTxtFile = fileExt === 'TXT';
    const isHtmlFile = fileExt === 'HTML' || fileExt === 'HTM';
    
    // ===========================================
    // CASE 1: Text/HTML file uploaded
    // ===========================================
    if (detectedSpecs.isTextAsset) {
      const requiredDims = Array.isArray(spec.dimensions) ? spec.dimensions : [spec.dimensions || ''];
      
      if (placementAcceptsText && isNewsletter) {
        // Check specific format matching
        if (placementIsStrictlyTextOnly) {
          // text-only placements: prefer .txt files
          if (isTxtFile) {
            score += 70; // High confidence - .txt to text-only
            reasons.push('Text file (.txt) matches text-only placement');
          } else if (isHtmlFile) {
            score += 30; // Lower confidence - let user decide if .html is okay
            reasons.push('HTML file uploaded to text-only placement (may work, please verify)');
          }
        } else {
          // native/sponsored-content placements: accept both .txt and .html
          if (isTxtFile || isHtmlFile) {
            score += 60; // Good match for native content
            reasons.push(`${fileExt} file matches native/sponsored content placement`);
          }
        }
        
        // Add word/character count info for user context
        if (detectedSpecs.wordCount) {
          reasons.push(`${detectedSpecs.wordCount} words, ${detectedSpecs.characterCount} characters`);
        }
      } else if (placementAcceptsText && (isRadio || isPodcast)) {
        // Radio/Podcast text placements (host-read, live-read scripts)
        const dims = (requiredDims[0] || '').toLowerCase();
        const isHostRead = dims.includes('host-read') || dims.includes('live-read') || dims.includes('script');
        
        if (isTxtFile) {
          if (isHostRead) {
            score += 80; // High confidence - script for host-read
            reasons.push('Text script (.txt) matches host-read/live-read placement');
          } else {
            score += 50; // Medium confidence - text for audio channel
            reasons.push(`Text file for ${spec.channel} placement (e.g., script or talking points)`);
          }
          
          // Add word count context for script length estimation
          if (detectedSpecs.wordCount) {
            const estimatedSeconds = Math.round(detectedSpecs.wordCount / 2.5); // ~150 words/minute
            reasons.push(`${detectedSpecs.wordCount} words (~${estimatedSeconds}s read time)`);
          }
        } else {
          score += 30;
          reasons.push(`${fileExt} file may work for ${spec.channel} text placement`);
        }
      } else if (placementAcceptsText && !isNewsletter) {
        // Other non-newsletter channels with text placement - lower confidence
        score += 20;
        reasons.push(`Text file may work for ${spec.channel} text placement (verify manually)`);
      } else {
        // Placement needs image - this is a clear mismatch
        mismatches.push('This placement requires an image, not a text file');
      }
      
      // Always add to matches list (even with score 0) so user can see options
      matches.push({
        file: null as any,
        detectedSpecs,
        specGroupId: spec.specGroupId,
        specGroupName: `${spec.channel} - ${requiredDims.join(' or ')}`,
        matchScore: score,
        matchReasons: reasons,
        mismatches
      });
      return; // Skip dimension matching for text files
    }
    
    // ===========================================
    // CASE 1b: Audio file uploaded (for radio ads)
    // ===========================================
    const isRadio = spec.channel.toLowerCase() === 'radio';
    const isPodcast = spec.channel.toLowerCase() === 'podcast';
    
    if (detectedSpecs.isAudioAsset) {
      // Audio file - check if this is a radio/podcast placement
      if (isRadio || isPodcast) {
        const audioDuration = detectedSpecs.audioDuration || 0;
        const requiredDims = Array.isArray(spec.dimensions) ? spec.dimensions : [spec.dimensions || ''];
        
        // Get spec duration (stored as number in seconds on the spec object)
        const specDuration = (spec as any).duration as number | undefined;
        
        // Check if duration matches placement requirements
        let durationMatches = false;
        let matchedDuration = '';
        
        // FIRST: Check the spec.duration field (primary source for radio spots)
        if (specDuration && specDuration > 0) {
          // Allow tolerance: ±3 seconds for shorter spots, ±5 seconds for longer
          const tolerance = specDuration <= 30 ? 3 : 5;
          if (Math.abs(audioDuration - specDuration) <= tolerance) {
            durationMatches = true;
            matchedDuration = `${specDuration} second spot`;
          }
        }
        
        // SECOND: Check dimensions array for string-based durations
        if (!durationMatches) {
          durationMatches = requiredDims.some(dim => {
            if (!dim) return false;
            const d = dim.toLowerCase().trim();
            
            // Exact duration match (e.g., "30s" matches 30 second file)
            if (d === `${audioDuration}s` || d === `${audioDuration}`) {
              matchedDuration = dim;
              return true;
            }
            
            // Parse numeric duration from various formats
            const numMatch = d.match(/^(\d+)\s*(s|sec|second|seconds)?$/);
            if (numMatch) {
              const targetDuration = parseInt(numMatch[1], 10);
              const tolerance = targetDuration <= 30 ? 3 : 5;
              if (Math.abs(audioDuration - targetDuration) <= tolerance) {
                matchedDuration = dim;
                return true;
              }
            }
            
            // Check for standard spot durations with tolerance
            if ((d === '15s' || d === '15 second' || d === '15 seconds') && audioDuration >= 12 && audioDuration <= 18) {
              matchedDuration = dim;
              return true;
            }
            if ((d === '30s' || d === '30 second' || d === '30 seconds') && audioDuration >= 27 && audioDuration <= 33) {
              matchedDuration = dim;
              return true;
            }
            if ((d === '60s' || d === '60 second' || d === '60 seconds') && audioDuration >= 55 && audioDuration <= 65) {
              matchedDuration = dim;
              return true;
            }
            
            // Long-form is flexible
            if (d === 'long-form' && audioDuration > 60) {
              matchedDuration = 'long-form';
              return true;
            }
            
            // Podcast position-based formats (pre-roll, post-roll typically 15-30s)
            if ((d === 'pre-roll' || d === 'preroll' || d.includes('pre-roll')) && audioDuration >= 10 && audioDuration <= 35) {
              matchedDuration = dim;
              return true;
            }
            if ((d === 'post-roll' || d === 'postroll' || d.includes('post-roll')) && audioDuration >= 10 && audioDuration <= 35) {
              matchedDuration = dim;
              return true;
            }
            
            // Mid-roll can be 30-60s typically
            if ((d === 'mid-roll' || d === 'midroll' || d.includes('mid-roll')) && audioDuration >= 25 && audioDuration <= 70) {
              matchedDuration = dim;
              return true;
            }
            
            // Sponsorship is flexible
            if (d === 'sponsorship') {
              matchedDuration = 'sponsorship';
              return true;
            }
            
            return false;
          });
        }
        
        // Display what we're matching against
        const displayDuration = specDuration ? `${specDuration}s spot` : requiredDims.filter(d => d).join(' or ');
        
        if (durationMatches) {
          score += 70; // High confidence
          reasons.push(`Audio duration (${detectedSpecs.audioDurationFormatted || audioDuration + 's'}) matches ${matchedDuration || displayDuration}`);
        } else {
          // Duration doesn't match - provide context but give moderate score for same channel
          score += 30; // Low-moderate confidence (it's the right type of file for the channel)
          mismatches.push(`Audio duration (${audioDuration}s) may not exactly match ${displayDuration} (consider trimming)`);
        }
        
        // Check audio format
        if (spec.fileFormats && spec.fileFormats.length > 0) {
          const audioFormat = detectedSpecs.audioFormat?.toUpperCase() || '';
          if (spec.fileFormats.some(fmt => fmt.toUpperCase() === audioFormat)) {
            score += 15;
            reasons.push(`Audio format (${audioFormat}) is accepted`);
          } else {
            mismatches.push(`Audio format ${audioFormat} may need conversion to ${spec.fileFormats.join('/')}`);
          }
        }
        
        matches.push({
          file: null as any,
          detectedSpecs,
          specGroupId: spec.specGroupId,
          specGroupName: `${spec.channel} - ${requiredDims.join(' or ')}`,
          matchScore: score,
          matchReasons: reasons,
          mismatches
        });
        return; // Skip dimension matching for audio files
      } else {
        // Audio file uploaded to non-audio placement
        mismatches.push(`This placement requires ${spec.channel} assets, not audio files`);
        matches.push({
          file: null as any,
          detectedSpecs,
          specGroupId: spec.specGroupId,
          specGroupName: `${spec.channel} - ${spec.dimensions}`,
          matchScore: 0,
          matchReasons: [],
          mismatches
        });
        return;
      }
    }
    
    // ===========================================
    // CASE 1c: Video file uploaded (for streaming ads)
    // ===========================================
    const isStreaming = spec.channel.toLowerCase() === 'streaming';
    const isSocial = spec.channel.toLowerCase() === 'social';
    
    if (detectedSpecs.isVideoAsset) {
      // Video file - check if this is a streaming/video placement
      if (isStreaming || isSocial) {
        const videoDuration = detectedSpecs.videoDuration || 0;
        const videoResolution = detectedSpecs.videoResolution || '';
        const requiredDims = Array.isArray(spec.dimensions) ? spec.dimensions : [spec.dimensions || ''];
        
        // Get spec duration (might be stored as number)
        const specDuration = (spec as any).duration as number | undefined;
        
        // Check if duration matches (if specified)
        let durationMatches = true; // Default to true if no duration requirement
        let durationMessage = '';
        
        if (specDuration && specDuration > 0) {
          // Allow tolerance: ±3 seconds for shorter spots, ±5 seconds for longer
          const tolerance = specDuration <= 30 ? 3 : 5;
          if (Math.abs(videoDuration - specDuration) <= tolerance) {
            durationMatches = true;
            durationMessage = `Video duration (${detectedSpecs.videoDurationFormatted}) matches ${specDuration}s requirement`;
          } else {
            durationMatches = false;
            durationMessage = `Video duration (${videoDuration}s) doesn't match ${specDuration}s requirement`;
          }
        }
        
        // Check resolution match
        let resolutionMatches = true;
        let resolutionMessage = '';
        
        if (requiredDims.length > 0 && requiredDims[0]) {
          const dimLower = requiredDims[0].toLowerCase();
          const videoHeight = detectedSpecs.dimensions?.height || 0;
          
          // Check for resolution requirements
          if (dimLower.includes('4k') || dimLower.includes('2160')) {
            resolutionMatches = videoHeight >= 2160;
            resolutionMessage = resolutionMatches ? 'Video is 4K resolution' : 'Video should be 4K (2160p)';
          } else if (dimLower.includes('1080') || dimLower.includes('hd') || dimLower.includes('full hd')) {
            resolutionMatches = videoHeight >= 1080;
            resolutionMessage = resolutionMatches ? 'Video is 1080p or higher' : 'Video should be at least 1080p';
          } else if (dimLower.includes('720')) {
            resolutionMatches = videoHeight >= 720;
            resolutionMessage = resolutionMatches ? 'Video is 720p or higher' : 'Video should be at least 720p';
          } else {
            // Assume any video works if no specific resolution required
            resolutionMessage = `Video resolution: ${videoResolution}`;
          }
        }
        
        // Calculate score
        if (durationMatches && resolutionMatches) {
          score += 70;
        } else if (durationMatches || resolutionMatches) {
          score += 45;
        } else {
          score += 25; // Base score for correct channel type
        }
        
        if (durationMessage) {
          if (durationMatches) reasons.push(durationMessage);
          else mismatches.push(durationMessage);
        }
        if (resolutionMessage) {
          if (resolutionMatches) reasons.push(resolutionMessage);
          else mismatches.push(resolutionMessage);
        }
        
        // Check video format
        if (spec.fileFormats && spec.fileFormats.length > 0) {
          const videoFormat = detectedSpecs.videoFormat?.toUpperCase() || '';
          if (spec.fileFormats.some(fmt => fmt.toUpperCase() === videoFormat)) {
            score += 15;
            reasons.push(`Video format (${videoFormat}) is accepted`);
          } else {
            mismatches.push(`Video format ${videoFormat} may need conversion to ${spec.fileFormats.join('/')}`);
          }
        }
        
        matches.push({
          file: null as any,
          detectedSpecs,
          specGroupId: spec.specGroupId,
          specGroupName: `${spec.channel} - ${requiredDims.join(' or ') || 'Video'}`,
          matchScore: score,
          matchReasons: reasons,
          mismatches
        });
        return; // Skip dimension matching for video files
      } else {
        // Video file uploaded to non-video placement
        mismatches.push(`This placement requires ${spec.channel} assets, not video files`);
        matches.push({
          file: null as any,
          detectedSpecs,
          specGroupId: spec.specGroupId,
          specGroupName: `${spec.channel} - ${spec.dimensions}`,
          matchScore: 0,
          matchReasons: [],
          mismatches
        });
        return;
      }
    }
    
    // ===========================================
    // CASE 2: Image/PDF file uploaded to text-accepting placement
    // ===========================================
    if (!detectedSpecs.isTextAsset && placementAcceptsText) {
      // Check if placement also accepts images (like native with logo support)
      const placementFormats = spec.fileFormats?.map(f => f.toUpperCase()) || [];
      const imageFormats = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'];
      const placementAcceptsImages = placementFormats.some(f => imageFormats.includes(f));
      
      if (placementAcceptsImages && !placementIsStrictlyTextOnly) {
        // Native placement that accepts both - check if it could work
        score += 30; // Low-medium confidence - let user verify
        reasons.push('Image may work for native/sponsored content (e.g., logo)');
      } else {
        // Strictly text-only - image won't work
        mismatches.push('This placement requires text content (.txt file), not an image');
        matches.push({
          file: null as any,
          detectedSpecs,
          specGroupId: spec.specGroupId,
          specGroupName: `${spec.channel} - ${spec.dimensions}`,
          matchScore: 0,
          matchReasons: [],
          mismatches
        });
        return; // Skip further matching
      }
    }
    
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

