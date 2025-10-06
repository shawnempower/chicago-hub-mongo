import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getPublicationFiles,
  uploadPublicationFile,
  updatePublicationFile,
  deletePublicationFile,
  getFileDownloadUrl,
  type PublicationFileResponse
} from '@/api/publicationFiles';

export const usePublicationFiles = (publicationId?: string) => {
  const [files, setFiles] = useState<PublicationFileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch files for the current publication
  const fetchFiles = useCallback(async () => {
    if (!publicationId) {
      setFiles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPublicationFiles(publicationId);
      setFiles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      toast.error(errorMessage);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [publicationId]);

  // Upload a new file
  const uploadFile = useCallback(async (
    file: File,
    fileType: string,
    description?: string,
    tags?: string[],
    isPublic: boolean = false
  ) => {
    if (!publicationId) {
      throw new Error('No publication selected');
    }

    try {
      setUploading(true);
      setError(null);
      
      const newFile = await uploadPublicationFile(
        publicationId,
        file,
        fileType,
        description,
        tags,
        isPublic
      );
      
      // Add the new file to the list
      setFiles(prevFiles => [newFile, ...prevFiles]);
      toast.success('File uploaded successfully');
      
      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [publicationId]);

  // Update file metadata
  const updateFile = useCallback(async (
    fileId: string,
    updates: {
      fileName?: string;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    }
  ) => {
    if (!publicationId) {
      throw new Error('No publication selected');
    }

    try {
      setError(null);
      
      const updatedFile = await updatePublicationFile(publicationId, fileId, updates);
      
      if (updatedFile) {
        // Update the file in the list
        setFiles(prevFiles => 
          prevFiles.map(file => 
            file._id === fileId ? updatedFile : file
          )
        );
        toast.success('File updated successfully');
      }
      
      return updatedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [publicationId]);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string) => {
    if (!publicationId) {
      throw new Error('No publication selected');
    }

    try {
      setError(null);
      
      const success = await deletePublicationFile(publicationId, fileId);
      
      if (success) {
        // Remove the file from the list
        setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
        toast.success('File deleted successfully');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [publicationId]);

  // Get download URL for a file
  const getDownloadUrl = useCallback(async (fileId: string) => {
    if (!publicationId) {
      throw new Error('No publication selected');
    }

    try {
      setError(null);
      return await getFileDownloadUrl(publicationId, fileId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get download URL';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [publicationId]);

  // Fetch files when publicationId changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    uploading,
    error,
    fetchFiles,
    uploadFile,
    updateFile,
    deleteFile,
    getDownloadUrl
  };
};
