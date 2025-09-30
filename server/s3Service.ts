import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

interface FileUploadOptions {
  userId: string;
  folder: 'documents' | 'avatars' | 'uploads';
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  isPublic?: boolean;
}

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle || false,
    });
  }

  // Generate a unique file key
  private generateFileKey(userId: string, folder: string, originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `users/${userId}/${folder}/${timestamp}_${randomString}_${sanitizedBaseName}${extension}`;
  }

  // Upload file to S3
  async uploadFile(options: FileUploadOptions): Promise<UploadResult> {
    try {
      const key = this.generateFileKey(options.userId, options.folder, options.originalName);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: options.buffer,
        ContentType: options.mimeType,
        Metadata: {
          originalName: options.originalName,
          userId: options.userId,
          folder: options.folder,
          uploadedAt: new Date().toISOString(),
        },
        // Set ACL based on public/private requirement
        ...(options.isPublic ? { ACL: 'public-read' } : {}),
      });

      await this.s3Client.send(command);

      // Generate URL
      const url = options.isPublic 
        ? `https://${this.bucket}.s3.amazonaws.com/${key}`
        : await this.getSignedUrl(key, 3600); // 1 hour expiry for private files

      return {
        success: true,
        key,
        url,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  // Get signed URL for private file access
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Delete file from S3
  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      return { success: true };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error',
      };
    }
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get file metadata
  async getFileMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        success: true,
        metadata: response.Metadata,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // List user files
  async listUserFiles(userId: string, folder?: string) {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const prefix = folder ? `users/${userId}/${folder}/` : `users/${userId}/`;
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      
      return {
        success: true,
        files: response.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        })) || [],
      };
    } catch (error) {
      console.error('Error listing user files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
      };
    }
  }

  // Generate presigned URL for direct upload (for large files)
  async generatePresignedUploadUrl(
    userId: string,
    folder: string,
    originalName: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<{ success: boolean; uploadUrl?: string; key?: string; error?: string }> {
    try {
      const key = this.generateFileKey(userId, folder, originalName);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        Metadata: {
          originalName,
          userId,
          folder,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        uploadUrl,
        key,
      };
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create and export S3 service instance
export const createS3Service = (): S3Service | null => {
  const config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  };

  // Check if required config is present
  if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    console.warn('AWS S3 configuration incomplete. File storage service disabled.');
    return null;
  }

  return new S3Service(config);
};

// Lazy-load S3 service to ensure environment variables are loaded
let _s3Service: S3Service | null | undefined;

export const getS3Service = (): S3Service | null => {
  if (_s3Service === undefined) {
    _s3Service = createS3Service();
  }
  return _s3Service;
};

// Export as a getter function instead of immediate initialization
export { getS3Service as s3Service };
