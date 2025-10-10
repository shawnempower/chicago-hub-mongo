import React from 'react';
import { ImageUpload } from '@/components/ui/image-upload';
import { useStorefrontImages } from '@/hooks/useStorefrontImages';
import { StorefrontConfiguration } from '@/types/storefront';

interface StorefrontImageManagerProps {
  publicationId: string;
  config: StorefrontConfiguration;
  onChange: (config: StorefrontConfiguration) => void;
  imageType: 'logo' | 'hero' | 'channel' | 'about' | 'ogImage';
  channelId?: string;
  label?: string;
  description?: string;
  className?: string;
}

export const StorefrontImageManager: React.FC<StorefrontImageManagerProps> = ({
  publicationId,
  config,
  onChange,
  imageType,
  channelId,
  label,
  description,
  className
}) => {
  const { uploadImage, replaceImage, removeImage, isUploading, isRemoving } = useStorefrontImages();

  // Get current image URL based on type
  const getCurrentImageUrl = (): string | undefined => {
    switch (imageType) {
      case 'logo':
        return config.components?.navbar?.content?.logoUrl;
      case 'hero':
        return config.components?.hero?.content?.imageUrl;
      case 'channel':
        if (!channelId) return undefined;
        return config.components?.inventory?.content?.channels?.find(
          (ch: any) => ch.id === channelId
        )?.imageUrl;
      case 'about':
        return config.components?.about?.content?.imageUrl;
      case 'ogImage':
        return config.seoMetadata?.ogImage;
      default:
        return undefined;
    }
  };

  // Update config with new image URL
  const updateConfigWithImageUrl = (url: string | null) => {
    const updatedConfig = { ...config };

    switch (imageType) {
      case 'logo':
        if (!updatedConfig.components.navbar) {
          updatedConfig.components.navbar = { enabled: true, order: 0, content: {} };
        }
        if (url) {
          updatedConfig.components.navbar.content.logoUrl = url;
        } else {
          delete updatedConfig.components.navbar.content.logoUrl;
        }
        break;

      case 'hero':
        if (!updatedConfig.components.hero) {
          updatedConfig.components.hero = { enabled: true, order: 1, content: {} };
        }
        if (url) {
          updatedConfig.components.hero.content.imageUrl = url;
        } else {
          delete updatedConfig.components.hero.content.imageUrl;
        }
        break;

      case 'channel':
        if (!channelId || !updatedConfig.components.inventory?.content?.channels) {
          return;
        }
        const channelIndex = updatedConfig.components.inventory.content.channels.findIndex(
          (ch: any) => ch.id === channelId
        );
        if (channelIndex === -1) return;
        
        if (url) {
          updatedConfig.components.inventory.content.channels[channelIndex].imageUrl = url;
        } else {
          delete updatedConfig.components.inventory.content.channels[channelIndex].imageUrl;
        }
        break;

      case 'about':
        if (!updatedConfig.components.about) {
          updatedConfig.components.about = { enabled: true, order: 5, content: {} };
        }
        if (url) {
          updatedConfig.components.about.content.imageUrl = url;
        } else {
          delete updatedConfig.components.about.content.imageUrl;
        }
        break;

      case 'ogImage':
        if (!updatedConfig.seoMetadata) {
          updatedConfig.seoMetadata = {};
        }
        if (url) {
          updatedConfig.seoMetadata.ogImage = url;
        } else {
          delete updatedConfig.seoMetadata.ogImage;
        }
        break;
    }

    onChange(updatedConfig);
  };

  const handleUpload = async (file: File) => {
    const currentUrl = getCurrentImageUrl();
    
    // Use replace if image already exists, upload if new
    const result = currentUrl
      ? await replaceImage({ publicationId, imageType, channelId, file })
      : await uploadImage({ publicationId, imageType, channelId, file });

    if (result.success && result.url) {
      updateConfigWithImageUrl(result.url);
    }

    return result;
  };

  const handleRemove = async () => {
    const result = await removeImage(publicationId, imageType, channelId);
    
    if (result.success) {
      updateConfigWithImageUrl(null);
    }

    return result;
  };

  const getPlaceholder = () => {
    switch (imageType) {
      case 'logo':
        return 'Upload logo image';
      case 'hero':
        return 'Upload hero background image';
      case 'channel':
        return 'Upload channel image';
      case 'about':
        return 'Upload about us image';
      case 'ogImage':
        return 'Upload social sharing image';
      default:
        return 'Upload image';
    }
  };

  return (
    <div className={className}>
      {label && (
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      
      <ImageUpload
        value={getCurrentImageUrl()}
        onChange={updateConfigWithImageUrl}
        onUpload={handleUpload}
        onRemove={handleRemove}
        placeholder={getPlaceholder()}
        disabled={isUploading || isRemoving}
        maxSize={5}
      />
    </div>
  );
};
