import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Upload, Download, Edit, Trash2, Eye, Search, Plus, 
  FileText, Image, Video, Music, Archive, File,
  Calendar, User, Tag, Globe, Lock, ExternalLink
} from 'lucide-react';

import { usePublicationFiles } from '@/hooks/usePublicationFiles';
import { getFileTypes, formatFileSize, getFileIcon, validateFileType, getSupportedFileExtensions } from '@/api/publicationFiles';
import type { PublicationFileResponse } from '@/api/publicationFiles';

interface PublicationFilesManagerProps {
  publicationId: string;
  publicationName: string;
}

interface FileUploadFormData {
  file: File | null;
  fileType: string;
  description: string;
  tags: string;
  isPublic: boolean;
}

const PublicationFilesManager: React.FC<PublicationFilesManagerProps> = ({
  publicationId,
  publicationName
}) => {
  const {
    files,
    loading,
    uploading,
    uploadFile,
    updateFile,
    deleteFile,
    getDownloadUrl
  } = usePublicationFiles(publicationId);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PublicationFileResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [uploadForm, setUploadForm] = useState<FileUploadFormData>({
    file: null,
    fileType: '',
    description: '',
    tags: '',
    isPublic: false
  });

  const [editForm, setEditForm] = useState({
    fileName: '',
    description: '',
    tags: '',
    isPublic: false
  });

  const fileTypes = getFileTypes();

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || file.fileType === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.fileType) {
      toast.error('Please select a file and file type');
      return;
    }

    try {
      const tags = uploadForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await uploadFile(
        uploadForm.file,
        uploadForm.fileType,
        uploadForm.description || undefined,
        tags.length > 0 ? tags : undefined,
        uploadForm.isPublic
      );

      // Reset form
      setUploadForm({
        file: null,
        fileType: '',
        description: '',
        tags: '',
        isPublic: false
      });
      setUploadDialogOpen(false);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleFileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) return;

    try {
      const tags = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await updateFile(selectedFile._id, {
        fileName: editForm.fileName || undefined,
        description: editForm.description || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPublic: editForm.isPublic
      });

      setEditDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleFileDelete = async (file: PublicationFileResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }

    try {
      await deleteFile(file._id);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleFileDownload = async (file: PublicationFileResponse) => {
    try {
      const downloadUrl = await getDownloadUrl(file._id);
      if (downloadUrl) {
        // Open in new tab for download
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const openEditDialog = (file: PublicationFileResponse) => {
    setSelectedFile(file);
    setEditForm({
      fileName: file.fileName,
      description: file.description || '',
      tags: file.tags?.join(', ') || '',
      isPublic: file.isPublic || false
    });
    setEditDialogOpen(true);
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>Loading files...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Manage files and documents for {publicationName}
              </CardDescription>
            </div>
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
                      onValueChange={(value) => setUploadForm(prev => ({
                        ...prev,
                        fileType: value
                      }))}
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
                      placeholder="Brief description of the file..."
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (Optional)</Label>
                    <Input
                      id="tags"
                      placeholder="tag1, tag2, tag3"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(prev => ({
                        ...prev,
                        tags: e.target.value
                      }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={uploadForm.isPublic}
                      onCheckedChange={(checked) => setUploadForm(prev => ({
                        ...prev,
                        isPublic: checked
                      }))}
                    />
                    <Label htmlFor="isPublic">Make file publicly accessible</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setUploadDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {fileTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Files List */}
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files found</h3>
              <p className="text-muted-foreground mb-4">
                {files.length === 0 
                  ? "Upload your first file to get started" 
                  : "No files match your search criteria"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFiles.map(file => (
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
                          <span>{fileTypes.find(t => t.value === file.fileType)?.label}</span>
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
                        onClick={() => openEditDialog(file)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
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

      {/* Edit File Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
            <DialogDescription>
              Update file information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileEdit} className="space-y-4">
            <div>
              <Label htmlFor="editFileName">File Name</Label>
              <Input
                id="editFileName"
                value={editForm.fileName}
                onChange={(e) => setEditForm(prev => ({
                  ...prev,
                  fileName: e.target.value
                }))}
              />
            </div>

            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="Brief description of the file..."
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="editTags">Tags</Label>
              <Input
                id="editTags"
                placeholder="tag1, tag2, tag3"
                value={editForm.tags}
                onChange={(e) => setEditForm(prev => ({
                  ...prev,
                  tags: e.target.value
                }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="editIsPublic"
                checked={editForm.isPublic}
                onCheckedChange={(checked) => setEditForm(prev => ({
                  ...prev,
                  isPublic: checked
                }))}
              />
              <Label htmlFor="editIsPublic">Make file publicly accessible</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicationFilesManager;
