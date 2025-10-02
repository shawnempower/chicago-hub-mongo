// API functions for publication file management
import { PublicationFile, PublicationFileInsert } from '@/integrations/mongodb/schemas';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Create multipart headers with auth token
const getMultipartAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export interface PublicationFileResponse {
  _id: string;
  publicationId: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  description?: string;
  s3Key: string;
  s3Bucket: string;
  fileUrl?: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
  tags?: string[];
  isPublic?: boolean;
  downloadCount?: number;
  lastAccessedAt?: Date;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pageCount?: number;
    extractedText?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Get all files for a publication
export const getPublicationFiles = async (publicationId: string): Promise<PublicationFileResponse[]> => {
  try {
    const response = await fetch(`/api/publications/${publicationId}/files`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch publication files');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication files:', error);
    throw new Error('Failed to fetch publication files');
  }
};

// Get a single file by ID
export const getPublicationFile = async (publicationId: string, fileId: string): Promise<PublicationFileResponse | null> => {
  try {
    const response = await fetch(`/api/publications/${publicationId}/files/${fileId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch publication file');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching publication file:', error);
    throw new Error('Failed to fetch publication file');
  }
};

// Upload a new file
export const uploadPublicationFile = async (
  publicationId: string,
  file: File,
  fileType: string,
  description?: string,
  tags?: string[],
  isPublic: boolean = false
): Promise<PublicationFileResponse> => {
  try {
    if (!file) {
      throw new Error('No file provided to uploadPublicationFile');
    }

    if (!(file instanceof File)) {
      throw new Error('Invalid file object provided');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    if (description) formData.append('description', description);
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));
    formData.append('isPublic', isPublic.toString());

    const response = await fetch(`/api/publications/${publicationId}/files`, {
      method: 'POST',
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required. You do not have permission to upload files.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload file');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload file');
  }
};

// Update file metadata
export const updatePublicationFile = async (
  publicationId: string,
  fileId: string,
  updates: {
    fileName?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  }
): Promise<PublicationFileResponse | null> => {
  try {
    const response = await fetch(`/api/publications/${publicationId}/files/${fileId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required. You do not have permission to update files.');
      }
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update file');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update file');
  }
};

// Delete a file
export const deletePublicationFile = async (publicationId: string, fileId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/publications/${publicationId}/files/${fileId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required. You do not have permission to delete files.');
      }
      if (response.status === 404) {
        return false;
      }
      throw new Error('Failed to delete file');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete file');
  }
};

// Get download URL for a file
export const getFileDownloadUrl = async (publicationId: string, fileId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/publications/${publicationId}/files/${fileId}/download`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 404) {
        throw new Error('File not found');
      }
      throw new Error('Failed to get download URL');
    }

    const result = await response.json();
    return result.downloadUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get download URL');
  }
};

// Search files across all publications (admin only)
export const searchPublicationFiles = async (
  query: string,
  filters?: {
    fileType?: string;
    publicationId?: string;
    tags?: string[];
    isPublic?: boolean;
  }
): Promise<PublicationFileResponse[]> => {
  try {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.fileType) params.append('fileType', filters.fileType);
    if (filters?.publicationId) params.append('publicationId', filters.publicationId);
    if (filters?.tags && filters.tags.length > 0) params.append('tags', JSON.stringify(filters.tags));
    if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());

    const response = await fetch(`/api/publications/files/search?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required. You do not have permission to search files.');
      }
      throw new Error('Failed to search files');
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching files:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to search files');
  }
};

// Supported MIME types (must match server configuration)
export const SUPPORTED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'image/gif',
  'image/webp',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  // Video
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/mp4'
];

// Get supported file extensions for display
export const getSupportedFileExtensions = (): string[] => {
  return [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 
    'txt', 'csv', 'md', 'json',
    'jpg', 'jpeg', 'png', 'svg', 'gif', 'webp',
    'zip', 'gz',
    'mp4', 'mpeg', 'mov',
    'mp3', 'wav'
  ];
};

// Validate file type
export const validateFileType = (file: File): { isValid: boolean; error?: string } => {
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    const supportedExts = getSupportedFileExtensions().join(', ');
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported. Supported formats: ${supportedExts}`
    };
  }
  return { isValid: true };
};

// Get file types for filtering
export const getFileTypes = (): Array<{ value: string; label: string }> => {
  return [
    { value: 'media_kit', label: 'Media Kit' },
    { value: 'rate_card', label: 'Rate Card' },
    { value: 'brand_guide', label: 'Brand Guide' },
    { value: 'editorial_calendar', label: 'Editorial Calendar' },
    { value: 'audience_report', label: 'Audience Report' },
    { value: 'case_study', label: 'Case Study' },
    { value: 'contract', label: 'Contract' },
    { value: 'other', label: 'Other' },
  ];
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file icon based on mime type
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📈';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📄';
};
