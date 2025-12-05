/**
 * File Upload Utility
 * 
 * Client-side file upload handling with validation and progress tracking
 */

export interface FileUploadOptions {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  onProgress?: (progress: number) => void; // Progress callback (0-100)
  category?: string;
  subPath?: string;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  };
  error?: string;
}

// Default configuration
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff', // Print ads
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  // Audio files (for radio/podcast ads)
  'audio/mpeg', // MP3
  'audio/wav',
  'audio/x-wav',
  'audio/mp4', // M4A
  // Text/document files (live reads, scripts, newsletter content)
  'text/plain', // TXT
  'text/html' // HTML
];

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: FileUploadOptions = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxFileSize || DEFAULT_MAX_SIZE;
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType === 'application/pdf') return '📄';
  return '📎';
}

/**
 * Upload file to server
 */
export async function uploadFile(
  file: File,
  endpoint: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, options);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.category) {
      formData.append('category', options.category);
    }
    if (options.subPath) {
      formData.append('subPath', options.subPath);
    }

    // Upload with progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            options.onProgress!(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              data: response.data || response
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse server response'
            });
          }
        } else {
          let errorMessage = 'Upload failed';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.error || response.message || errorMessage;
          } catch (e) {
            // Use default error message
          }
          resolve({
            success: false,
            error: errorMessage
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error during upload'
        });
      });

      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: 'Upload cancelled'
        });
      });

      // Send request
      xhr.open('POST', endpoint);
      
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  endpoint: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Wrap progress callback to include file index
    const progressCallback = options.onProgress
      ? (progress: number) => {
          const overallProgress = ((i / files.length) * 100) + (progress / files.length);
          options.onProgress!(overallProgress);
        }
      : undefined;
    
    const result = await uploadFile(file, endpoint, {
      ...options,
      onProgress: progressCallback
    });
    
    results.push(result);
    
    // Stop on first error if desired
    if (!result.success && options.onProgress) {
      break;
    }
  }
  
  return results;
}

/**
 * Convert file to base64 (for preview or small files)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Create image preview URL
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke preview URL (cleanup)
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

