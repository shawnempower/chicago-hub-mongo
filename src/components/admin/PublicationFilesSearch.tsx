import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Download, Calendar, Globe, Lock, Plus, Upload,
  FileText, Image, Video, Music, Archive, File, RefreshCw, Trash2
} from 'lucide-react';

import { usePublicationFiles } from '@/hooks/usePublicationFiles';
import { getFileTypes, formatFileSize, validateFileType, getSupportedFileExtensions } from '@/api/publicationFiles';
import { getPublications } from '@/api/publications';
import type { PublicationFileResponse } from '@/api/publicationFiles';
import type { PublicationFrontend } from '@/types/publication';

interface FileUploadFormData {
  file: File | null;
  fileType: string;
  description: string;
  tags: string;
  isPublic: boolean;
}

const PublicationFilesSearch: React.FC = () => {
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('');
  const [publications, setPublications] = useState<PublicationFrontend[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const {
    files,
    loading: loadingFiles,
    uploading,
    fetchFiles,
    uploadFile,
    deleteFile,
    getDownloadUrl
  } = usePublicationFiles(selectedPublicationId || undefined);

  const [uploadForm, setUploadForm] = useState<FileUploadFormData>({
    file: null,
    fileType: '',
    description: '',
    tags: '',
    isPublic: false
  });

  const fileTypes = React.useMemo(() => {
    try {
      return getFileTypes();
    } catch (error) {
      console.error('Error getting file types:', error);
      return [];
    }
  }, []);

  // Load publications on component mount
  useEffect(() => {
    const loadPublications = async () => {
      try {
        setLoadingPublications(true);
        const pubs = await getPublications();
        setPublications(pubs);
      } catch (error) {
        console.error('Error loading publications:', error);
      } finally {
        setLoadingPublications(false);
      }
    };

    loadPublications();
  }, []);

  const handlePublicationChange = (publicationId: string) => {
    setSelectedPublicationId(publicationId === 'none' ? '' : publicationId);
  };

  const handleRefresh = () => {
    if (selectedPublicationId) {
      fetchFiles();
    }
  };

  const handleFileDownload = async (file: PublicationFileResponse) => {
    try {
      const downloadUrl = await getDownloadUrl(file._id);
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleFileDelete = async (file: PublicationFileResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }

    try {
      await deleteFile(file._id);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.fileType) {
      toast.error('Please select a file and file type');
      return;
    }

    if (!selectedPublicationId) {
      toast.error('Please select a publication first');
      return;
    }

    try {
      const tags = uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      await uploadFile(
        uploadForm.file,
        uploadForm.fileType,
        uploadForm.description || undefined,
        tags.length > 0 ? tags : undefined,
        uploadForm.isPublic
      );

      toast.success('File uploaded successfully');
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      fileType: '',
      description: '',
      tags: '',
      isPublic: false
    });
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const selectedPublication = publications.find(p => p._id === selectedPublicationId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                View and manage knowledge base files for any publication (Admin only)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {selectedPublicationId && (
                <>
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload File</DialogTitle>
                        <DialogDescription>
                          Add a new file to the knowledge base
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleFileUpload} className="space-y-4">
                        <div>
                          <Label htmlFor="file">File</Label>
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                const validation = validateFileType(file);
                                if (!validation.isValid) {
                                  toast.error(validation.error!);
                                  e.target.value = ''; // Clear the input
                                  setUploadForm(prev => ({ ...prev, file: null }));
                                  return;
                                }
                              }
                              setUploadForm(prev => ({ ...prev, file }));
                            }}
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Supported formats: {getSupportedFileExtensions().join(', ')}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="fileType">File Type</Label>
                          <Select 
                            value={uploadForm.fileType} 
                            onValueChange={(value) => setUploadForm(prev => ({ ...prev, fileType: value }))}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select file type" />
                            </SelectTrigger>
                            <SelectContent>
                              {fileTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the file"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tags">Tags (Optional)</Label>
                          <Input
                            id="tags"
                            value={uploadForm.tags}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="Comma-separated tags"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isPublic"
                            checked={uploadForm.isPublic}
                            onCheckedChange={(checked) => setUploadForm(prev => ({ ...prev, isPublic: checked }))}
                          />
                          <Label htmlFor="isPublic">Make file public</Label>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setUploadDialogOpen(false);
                              resetUploadForm();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={uploading}>
                            {uploading ? (
                              <>
                                <Upload className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={handleRefresh} disabled={loadingFiles}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Select 
                value={selectedPublicationId || "none"} 
                onValueChange={handlePublicationChange}
                disabled={loadingPublications}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingPublications ? "Loading publications..." : "Select a publication"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a publication</SelectItem>
                  {publications.map(pub => (
                    <SelectItem key={pub._id} value={pub._id!}>
                      {pub.basicInfo?.publicationName || pub.name || `Publication ${pub.publicationId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPublication && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedPublication.basicInfo?.publicationName || selectedPublication.name}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  <span>ID: {selectedPublication.publicationId || selectedPublication._id}</span>
                  {selectedPublication.basicInfo?.publicationType && (
                    <span className="ml-4">Type: {selectedPublication.basicInfo.publicationType}</span>
                  )}
                  {selectedPublication.basicInfo?.geographicCoverage && (
                    <span className="ml-4">Coverage: {selectedPublication.basicInfo.geographicCoverage}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {selectedPublicationId && (
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base Files</CardTitle>
            <CardDescription>
              {loadingFiles ? 'Loading files...' : `${files.length} files found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No knowledge base files found</h3>
                <p className="text-muted-foreground mb-4">
                  This publication doesn't have any knowledge base files uploaded yet.
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload First File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {files.map(file => (
                  <Card key={file._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {getFileTypeIcon(file.mimeType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium truncate">{file.fileName}</h4>
                            {file.isPublic ? (
                              <Globe className="h-3 w-3 text-green-500" title="Public" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground" title="Private" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{fileTypes?.find(t => t.value === file.fileType)?.label || file.fileType}</span>
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                            {file.downloadCount && file.downloadCount > 0 && (
                              <span>
                                <Download className="h-3 w-3 inline mr-1" />
                                {file.downloadCount} downloads
                              </span>
                            )}
                          </div>
                          
                          {file.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {file.description}
                            </p>
                          )}
                          
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {file.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDownload(file)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDelete(file)}
                          title="Delete"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublicationFilesSearch;
