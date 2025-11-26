/**
 * Smart ZIP File Processor
 * 
 * Extracts ZIP files and automatically matches contents to inventory standards
 * based on detected file specifications.
 */

import JSZip from 'jszip';
import { detectFileSpecs, DetectedFileSpecs } from './fileSpecDetection';
import { findStandardByDimensions, validateAgainstStandard, InventoryTypeStandard } from '@/config/inventoryStandards';

export interface ProcessedZipFile {
  fileName: string;
  file: File;
  detectedSpecs: DetectedFileSpecs;
  suggestedStandard: InventoryTypeStandard | null;
  matchConfidence: number; // 0-100
  matchReasons: string[];
  previewUrl?: string;
}

export interface ZipProcessingResult {
  totalFiles: number;
  processedFiles: ProcessedZipFile[];
  errors: Array<{ fileName: string; error: string }>;
  autoMatched: number;
  needsReview: number;
}

/**
 * Process a ZIP file and auto-match contents to inventory standards
 */
export async function processZipFile(
  zipFile: File,
  onProgress?: (progress: number, message: string) => void
): Promise<ZipProcessingResult> {
  
  onProgress?.(0, 'Reading ZIP file...');
  
  try {
    // Load ZIP file
    const zip = await JSZip.loadAsync(zipFile);
    
    // Get all files (excluding directories and system files)
    const fileEntries = Object.entries(zip.files).filter(([path, file]) => 
      !file.dir && 
      !path.startsWith('__MACOSX/') &&
      !path.startsWith('.') &&
      !path.includes('/.') // Hidden files
    );
    
    onProgress?.(10, `Found ${fileEntries.length} files in ZIP...`);
    
    const processedFiles: ProcessedZipFile[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];
    
    // Process each file
    for (let i = 0; i < fileEntries.length; i++) {
      const [path, zipEntry] = fileEntries[i];
      const fileName = path.split('/').pop() || path;
      
      try {
        onProgress?.(
          10 + (i / fileEntries.length) * 80,
          `Processing ${fileName}...`
        );
        
        // Extract file as blob
        const blob = await zipEntry.async('blob');
        
        // Convert to File object
        const file = new File([blob], fileName, {
          type: getMimeType(fileName)
        });
        
        // Detect file specifications
        const detectedSpecs = await detectFileSpecs(file);
        
        // Auto-match to standard using dimensions
        let suggestedStandard: InventoryTypeStandard | null = null;
        let matchConfidence = 0;
        const matchReasons: string[] = [];
        
        if (detectedSpecs.dimensions) {
          suggestedStandard = findStandardByDimensions(detectedSpecs.dimensions.formatted);
          
          if (suggestedStandard) {
            // Calculate match confidence
            const validation = validateAgainstStandard(
              {
                dimensions: detectedSpecs.dimensions.formatted,
                fileFormat: detectedSpecs.fileExtension,
                fileSize: detectedSpecs.fileSize,
                colorSpace: detectedSpecs.colorSpace
              },
              suggestedStandard
            );
            
            if (validation.valid) {
              matchConfidence = 100;
              matchReasons.push('Perfect match - all specs met');
            } else if (validation.errors.length === 0 && validation.warnings.length > 0) {
              matchConfidence = 85;
              matchReasons.push('Good match with minor warnings');
            } else if (validation.errors.length <= 1) {
              matchConfidence = 60;
              matchReasons.push('Partial match - some specs need adjustment');
            } else {
              matchConfidence = 30;
              matchReasons.push('Low confidence - multiple spec mismatches');
            }
            
            // Add specific reasons
            if (detectedSpecs.dimensions) {
              matchReasons.push(`Dimensions: ${detectedSpecs.dimensions.formatted}`);
            }
            if (detectedSpecs.colorSpace) {
              matchReasons.push(`Color: ${detectedSpecs.colorSpace}`);
            }
          }
        }
        
        // Create preview for images
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
          console.log(`[ZIP Processor] Created blob URL for ${fileName}:`, previewUrl);
        } else {
          console.log(`[ZIP Processor] File ${fileName} is not an image, type:`, file.type);
        }
        
        processedFiles.push({
          fileName,
          file,
          detectedSpecs,
          suggestedStandard,
          matchConfidence,
          matchReasons,
          previewUrl
        });
        
      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        errors.push({
          fileName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    onProgress?.(90, 'Finalizing results...');
    
    // Calculate stats
    const autoMatched = processedFiles.filter(f => f.matchConfidence >= 80).length;
    const needsReview = processedFiles.filter(f => f.matchConfidence < 80).length;
    
    onProgress?.(100, 'Complete!');
    
    return {
      totalFiles: fileEntries.length,
      processedFiles: processedFiles.sort((a, b) => b.matchConfidence - a.matchConfidence),
      errors,
      autoMatched,
      needsReview
    };
    
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw new Error(`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Group processed files by suggested standard
 */
export function groupByStandard(
  processedFiles: ProcessedZipFile[]
): Map<string, ProcessedZipFile[]> {
  const grouped = new Map<string, ProcessedZipFile[]>();
  
  processedFiles.forEach(file => {
    const key = file.suggestedStandard?.id || 'unmatched';
    const existing = grouped.get(key) || [];
    existing.push(file);
    grouped.set(key, existing);
  });
  
  return grouped;
}

/**
 * Generate summary report
 */
export function generateZipSummary(result: ZipProcessingResult): string {
  const lines = [
    `Processed ${result.totalFiles} files from ZIP`,
    `✓ ${result.autoMatched} files auto-matched (≥80% confidence)`,
    result.needsReview > 0 ? `⚠ ${result.needsReview} files need review (<80% confidence)` : '',
    result.errors.length > 0 ? `✗ ${result.errors.length} files had errors` : ''
  ].filter(Boolean);
  
  return lines.join('\n');
}

