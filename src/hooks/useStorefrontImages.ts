import { useState } from 'react';
import { API_BASE_URL } from '@/config/api';

export interface StorefrontImageUploadOptions {
  publicationId: string;
  imageType: 'logo' | 'hero' | 'channel' | 'about' | 'ogImage';
  channelId?: string;
  file: File;
}

export interface StorefrontImageResponse {
  success: boolean;
  url?: string;
  imageType?: string;
  channelId?: string;
  error?: string;
}

export const useStorefrontImages = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const uploadImage = async (options: StorefrontImageUploadOptions): Promise<StorefrontImageResponse> => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', options.file);
      formData.append('imageType', options.imageType);
      if (options.channelId) {
        formData.append('channelId', options.channelId);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/storefront/${options.publicationId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return result;
    } catch (error) {
      console.error('Error uploading storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    } finally {
      setIsUploading(false);
    }
  };

  const replaceImage = async (options: StorefrontImageUploadOptions): Promise<StorefrontImageResponse> => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', options.file);
      formData.append('imageType', options.imageType);
      if (options.channelId) {
        formData.append('channelId', options.channelId);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/storefront/${options.publicationId}/images`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Replace failed');
      }

      return result;
    } catch (error) {
      console.error('Error replacing storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Replace failed'
      };
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (
    publicationId: string,
    imageType: 'logo' | 'hero' | 'channel' | 'about' | 'ogImage',
    channelId?: string
  ): Promise<StorefrontImageResponse> => {
    setIsRemoving(true);
    
    try {
      const params = new URLSearchParams({ imageType });
      if (channelId) {
        params.append('channelId', channelId);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/storefront/${publicationId}/images?${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Remove failed');
      }

      return result;
    } catch (error) {
      console.error('Error removing storefront image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Remove failed'
      };
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    uploadImage,
    replaceImage,
    removeImage,
    isUploading,
    isRemoving,
  };
};
