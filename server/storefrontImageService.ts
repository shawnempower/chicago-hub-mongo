import { S3Service } from './s3Service';
import { storefrontConfigurationsService } from '../src/integrations/mongodb/allServices';
import crypto from 'crypto';

interface StorefrontImageUploadOptions {
  userId: string;
  publicationId: string;
  imageType: 'logo' | 'hero' | 'channel' | 'about' | 'ogImage' | 'favicon' | 'metaLogo';
  channelId?: string; // For inventory channel images
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

interface StorefrontImageResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export class StorefrontImageService {
  private s3Service: S3Service;

  constructor(s3Service: S3Service) {
    this.s3Service = s3Service;
  }

  /**
   * Upload a new storefront image and update the configuration
   */
  async uploadStorefrontImage(options: StorefrontImageUploadOptions): Promise<StorefrontImageResult> {
    try {
      // Generate a specific folder structure for storefront images
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const extension = options.originalName.split('.').pop();
      
      // Create custom S3 key for organized storefront images
      // Format: storefront/{publicationId}/{imageType}/{timestamp}_{random}.{ext}
      const customKey = `storefront/${options.publicationId}/${options.imageType}/${timestamp}_${randomString}.${extension}`;

      // Upload to S3 using the new method with custom key
      const uploadResult = await this.s3Service.uploadFileWithCustomKey(
        customKey,
        options.buffer,
        options.mimeType,
        {
          originalName: options.originalName,
          userId: options.userId,
          publicationId: options.publicationId,
          imageType: options.imageType,
          uploadedAt: new Date().toISOString(),
        },
        true  // isPublic - will use CloudFront URL if configured
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload image'
        };
      }

      // Update the storefront configuration with the new image URL
      const updateResult = await this.updateStorefrontImageUrl(
        options.publicationId,
        options.imageType,
        uploadResult.url!,
        options.channelId
      );

      if (!updateResult.success) {
        // If config update fails, we should delete the uploaded image
        await this.s3Service.deleteFile(uploadResult.key!);
        return {
          success: false,
          error: updateResult.error || 'Failed to update storefront configuration'
        };
      }

      return {
        success: true,
        url: uploadResult.url,
        key: uploadResult.key
      };

    } catch (error) {
      console.error('Error uploading storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Replace an existing storefront image
   */
  async replaceStorefrontImage(options: StorefrontImageUploadOptions): Promise<StorefrontImageResult> {
    try {
      // Get current configuration to find existing image
      const currentConfig = await storefrontConfigurationsService.getByPublicationId(options.publicationId);
      if (!currentConfig) {
        return {
          success: false,
          error: 'Storefront configuration not found'
        };
      }

      // Get the current image URL to extract the old key for deletion
      const currentImageUrl = this.getCurrentImageUrl(currentConfig, options.imageType, options.channelId);
      let oldKey: string | null = null;

      if (currentImageUrl) {
        // Extract S3 key from URL for deletion
        oldKey = this.extractS3KeyFromUrl(currentImageUrl);
      }

      // Upload the new image
      const uploadResult = await this.uploadStorefrontImage(options);

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Delete the old image if it exists
      if (oldKey) {
        try {
          await this.s3Service.deleteFile(oldKey);
        } catch (error) {
          console.warn('Failed to delete old storefront image:', error);
          // Don't fail the operation if old image deletion fails
        }
      }

      return uploadResult;

    } catch (error) {
      console.error('Error replacing storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Remove a storefront image (soft delete - only removes from config, keeps in S3)
   * Images are kept in S3 for potential rollback or draft/publish workflows
   */
  async removeStorefrontImage(
    publicationId: string,
    imageType: 'logo' | 'hero' | 'channel' | 'about' | 'ogImage' | 'favicon' | 'metaLogo',
    channelId?: string
  ): Promise<StorefrontImageResult> {
    try {
      // Get current configuration
      const currentConfig = await storefrontConfigurationsService.getByPublicationId(publicationId);
      if (!currentConfig) {
        return {
          success: false,
          error: 'Storefront configuration not found'
        };
      }

      // Get the current image URL
      const currentImageUrl = this.getCurrentImageUrl(currentConfig, imageType, channelId);
      if (!currentImageUrl) {
        return {
          success: true // Already removed
        };
      }

      // SOFT DELETE: Only remove from configuration, keep file in S3
      // This allows for:
      // - Rollback if needed
      // - Draft versions can reference old images
      // - Published version still has images until draft is published
      console.log(`Soft-deleting image from config (keeping in S3): ${currentImageUrl}`);

      // Update configuration to remove the image URL
      const updateResult = await this.updateStorefrontImageUrl(
        publicationId,
        imageType,
        null, // Remove the URL from config
        channelId
      );

      return {
        success: updateResult.success,
        error: updateResult.error
      };

    } catch (error) {
      console.error('Error removing storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Hard delete an image from S3 (use with caution)
   * Only call this when you're certain the image is no longer referenced anywhere
   */
  async permanentlyDeleteImage(s3Key: string): Promise<StorefrontImageResult> {
    try {
      await this.s3Service.deleteFile(s3Key);
      return {
        success: true
      };
    } catch (error) {
      console.error('Error permanently deleting image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete image'
      };
    }
  }

  /**
   * Update the storefront configuration with a new image URL
   */
  private async updateStorefrontImageUrl(
    publicationId: string,
    imageType: string,
    imageUrl: string | null,
    channelId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentConfig = await storefrontConfigurationsService.getByPublicationId(publicationId);
      if (!currentConfig) {
        return { success: false, error: 'Storefront configuration not found' };
      }

      const updatedConfig = { ...currentConfig };

      // Update the appropriate field based on image type
      switch (imageType) {
        case 'logo':
          if (!updatedConfig.components.navbar) {
            updatedConfig.components.navbar = { enabled: true, order: 0, content: {} };
          }
          if (imageUrl) {
            updatedConfig.components.navbar.content.logoUrl = imageUrl;
          } else {
            delete updatedConfig.components.navbar.content.logoUrl;
          }
          break;

        case 'hero':
          if (!updatedConfig.components.hero) {
            updatedConfig.components.hero = { enabled: true, order: 1, content: {} };
          }
          if (imageUrl) {
            updatedConfig.components.hero.content.imageUrl = imageUrl;
          } else {
            delete updatedConfig.components.hero.content.imageUrl;
          }
          break;

        case 'channel':
          if (!channelId) {
            return { success: false, error: 'Channel ID required for channel images' };
          }
          if (!updatedConfig.components.inventory?.content?.channels) {
            return { success: false, error: 'Inventory channels not found' };
          }
          const channelIndex = updatedConfig.components.inventory.content.channels.findIndex(
            (ch: any) => ch.id === channelId
          );
          if (channelIndex === -1) {
            return { success: false, error: 'Channel not found' };
          }
          if (imageUrl) {
            updatedConfig.components.inventory.content.channels[channelIndex].imageUrl = imageUrl;
          } else {
            delete updatedConfig.components.inventory.content.channels[channelIndex].imageUrl;
          }
          break;

        case 'about':
          if (!updatedConfig.components.about) {
            updatedConfig.components.about = { enabled: true, order: 5, content: {} };
          }
          if (imageUrl) {
            updatedConfig.components.about.content.imageUrl = imageUrl;
          } else {
            delete updatedConfig.components.about.content.imageUrl;
          }
          break;

        case 'ogImage':
          if (!updatedConfig.seoMetadata) {
            updatedConfig.seoMetadata = {};
          }
          if (imageUrl) {
            updatedConfig.seoMetadata.ogImage = imageUrl;
          } else {
            delete updatedConfig.seoMetadata.ogImage;
          }
          break;

        case 'favicon':
          if (imageUrl) {
            updatedConfig.meta.faviconUrl = imageUrl;
          } else {
            delete updatedConfig.meta.faviconUrl;
          }
          break;

        case 'metaLogo':
          if (imageUrl) {
            updatedConfig.meta.logoUrl = imageUrl;
          } else {
            delete updatedConfig.meta.logoUrl;
          }
          break;

        default:
          return { success: false, error: `Unknown image type: ${imageType}` };
      }

      // Update the configuration
      const result = await storefrontConfigurationsService.update(publicationId, updatedConfig);
      
      return {
        success: !!result,
        error: result ? undefined : 'Failed to update configuration'
      };

    } catch (error) {
      console.error('Error updating storefront image URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get the current image URL from configuration
   */
  private getCurrentImageUrl(config: any, imageType: string, channelId?: string): string | null {
    switch (imageType) {
      case 'logo':
        return config.components?.navbar?.content?.logoUrl || null;
      case 'hero':
        return config.components?.hero?.content?.imageUrl || null;
      case 'channel':
        if (!channelId) return null;
        const channel = config.components?.inventory?.content?.channels?.find((ch: any) => ch.id === channelId);
        return channel?.imageUrl || null;
      case 'about':
        return config.components?.about?.content?.imageUrl || null;
      case 'ogImage':
        return config.seoMetadata?.ogImage || null;
      case 'favicon':
        return config.meta?.faviconUrl || null;
      case 'metaLogo':
        return config.meta?.logoUrl || null;
      default:
        return null;
    }
  }

  /**
   * Extract S3 key from URL
   */
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Handle both s3.amazonaws.com and custom domain formats
      const pathname = urlObj.pathname;
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch (error) {
      console.warn('Failed to extract S3 key from URL:', url, error);
      return null;
    }
  }
}
