/**
 * File Storage System
 * 
 * Handles file uploads and storage for creative assets using S3
 */

import path from 'path';
import crypto from 'crypto';

// Will be set by initializeFileStorage
let s3ServiceInstance: any = null;

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default

// Allowed file types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/tiff': ['.tif', '.tiff'], // Print ads
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/postscript': ['.ai', '.eps'],
  'image/vnd.adobe.photoshop': ['.psd'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  // Audio files (radio/podcast ads)
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  // Text/document files (live reads, scripts, newsletter content)
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
  'application/octet-stream': ['.indd', '.ai', '.psd', '.eps'] // Design files
};

export interface FileUploadResult {
  success: boolean;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
  storageProvider: 'local' | 's3';
  error?: string;
}

export interface FileStorageOptions {
  category?: string; // Allow any category for 'creative-assets/campaigns', etc.
  subPath?: string; // e.g., campaignId, packageId
  preserveFileName?: boolean;
}

export class FileStorage {
  /**
   * Initialize storage with S3 service
   */
  setS3Service(s3Service: any): void {
    s3ServiceInstance = s3Service;
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    // S3 doesn't require directory creation - folders are virtual
    console.log('File storage initialized (using S3)');
  }

  /**
   * Validate file type
   */
  private validateFileType(fileType: string, fileName: string): { valid: boolean; extension: string; error?: string } {
    const allowedExtensions = ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES];
    
    if (!allowedExtensions) {
      return {
        valid: false,
        extension: '',
        error: `File type ${fileType} is not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`
      };
    }

    const fileExtension = path.extname(fileName).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        extension: fileExtension,
        error: `File extension ${fileExtension} does not match MIME type ${fileType}`
      };
    }

    return {
      valid: true,
      extension: fileExtension
    };
  }

  /**
   * Generate unique file name
   */
  private generateFileName(originalFileName: string, preserveOriginal = false): string {
    if (preserveOriginal) {
      // Sanitize the original filename
      const sanitized = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      const timestamp = Date.now();
      return `${name}_${timestamp}${ext}`;
    }

    // Generate completely new name
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFileName);
    return `${timestamp}_${random}${extension}`;
  }

  /**
   * Build storage path
   */
  private buildStoragePath(fileName: string, options: FileStorageOptions): string {
    const parts: string[] = [];
    
    if (options.category) {
      parts.push(options.category);
    }
    
    if (options.subPath) {
      parts.push(options.subPath);
    }
    
    parts.push(fileName);
    
    return path.join(...parts);
  }

  /**
   * Upload file (Buffer or Base64)
   */
  async uploadFile(
    fileData: Buffer | string,
    originalFileName: string,
    fileType: string,
    options: FileStorageOptions = {}
  ): Promise<FileUploadResult> {
    try {
      if (!s3ServiceInstance) {
        return {
          success: false,
          fileName: '',
          originalFileName,
          fileUrl: '',
          storagePath: '',
          fileSize: 0,
          fileType,
          fileExtension: '',
          storageProvider: 's3',
          error: 'S3 service not initialized'
        };
      }

      // Validate file type
      const validation = this.validateFileType(fileType, originalFileName);
      if (!validation.valid) {
        return {
          success: false,
          fileName: '',
          originalFileName,
          fileUrl: '',
          storagePath: '',
          fileSize: 0,
          fileType,
          fileExtension: validation.extension,
          storageProvider: 's3',
          error: validation.error
        };
      }

      // Convert Base64 to Buffer if needed
      let buffer: Buffer;
      if (typeof fileData === 'string') {
        const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = fileData;
      }

      // Check file size
      if (buffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          fileName: '',
          originalFileName,
          fileUrl: '',
          storagePath: '',
          fileSize: buffer.length,
          fileType,
          fileExtension: validation.extension,
          storageProvider: 's3',
          error: `File size ${buffer.length} exceeds maximum allowed size ${MAX_FILE_SIZE}`
        };
      }

      // Generate file name and path
      const fileName = this.generateFileName(originalFileName, options.preserveFileName);
      const storagePath = this.buildStoragePath(fileName, options);

      // Upload to S3 using existing s3Service
      const uploadResult = await s3ServiceInstance.uploadFile({
        userId: 'system', // Can be updated to use actual userId
        folder: 'uploads' as any, // Using uploads folder for creative assets
        originalName: originalFileName,
        mimeType: fileType,
        buffer: buffer,
        isPublic: false
      });

      if (!uploadResult.success) {
        return {
          success: false,
          fileName,
          originalFileName,
          fileUrl: '',
          storagePath: '',
          fileSize: buffer.length,
          fileType,
          fileExtension: validation.extension,
          storageProvider: 's3',
          error: uploadResult.error || 'S3 upload failed'
        };
      }

      return {
        success: true,
        fileName,
        originalFileName,
        fileUrl: uploadResult.url || '',
        storagePath: uploadResult.key || storagePath,
        fileSize: buffer.length,
        fileType,
        fileExtension: validation.extension,
        storageProvider: 's3'
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        fileName: '',
        originalFileName,
        fileUrl: '',
        storagePath: '',
        fileSize: 0,
        fileType,
        fileExtension: '',
        storageProvider: 's3',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete file
   */
  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      if (!s3ServiceInstance) {
        console.error('S3 service not initialized');
        return false;
      }
      
      const result = await s3ServiceInstance.deleteFile(storagePath);
      return result.success;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      if (!s3ServiceInstance) {
        return false;
      }
      
      const result = await s3ServiceInstance.fileExists(storagePath);
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(storagePath: string): Promise<{ size: number; modifiedAt: Date } | null> {
    try {
      if (!s3ServiceInstance) {
        return null;
      }
      
      // S3 service may not have this method - implement if needed
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate signed URL
   */
  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      if (!s3ServiceInstance) {
        return null;
      }
      
      const url = await s3ServiceInstance.getSignedUrl(storagePath, expiresIn);
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }

  /**
   * Generate signed URL for download (forces browser to download instead of play/display)
   */
  async getSignedDownloadUrl(storagePath: string, fileName: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      if (!s3ServiceInstance) {
        return null;
      }
      
      const url = await s3ServiceInstance.getSignedDownloadUrl(storagePath, fileName, expiresIn);
      return url;
    } catch (error) {
      console.error('Error generating signed download URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const fileStorage = new FileStorage();

