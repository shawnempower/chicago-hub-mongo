import React, { useState, useEffect, useRef } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  Filter,
  Calendar,
  FileImage,
  File,
  FileSpreadsheet,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { 
  getPublicationFiles, 
  uploadPublicationFile, 
  deletePublicationFile,
  getFileDownloadUrl,
  validateFileType,
  getFileTypes
} from '@/api/publicationFiles';

interface PublicationFile {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  description?: string;
  fileUrl?: string;
  fileSize: number;
  uploadedBy?: string;
  tags?: string[];
  isPublic?: boolean;
  downloadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const PublicationKnowledgeBase: React.FC = () => {
  const { selectedPublication } = usePublication();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PublicationFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [uploadFileType, setUploadFileType] = useState('media_kit');
  const [uploadDescription, setUploadDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    if (selectedPublication?._id) {
      setFiles([]); // Clear previous files immediately
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [selectedPublication]);

  const loadFiles = async () => {
    if (!selectedPublication?._id) return;
    
    try {
      setLoading(true);
      const publicationFiles = await getPublicationFiles(selectedPublication._id);
      setFiles(publicationFiles);
    } catch (error) {
      console.error('Error loading publication files:', error);
      toast({
        title: "Error",
        description: "Failed to load files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPublication?._id) return;

    // Validate file type
    const validation = validateFileType(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File Type",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      await uploadPublicationFile(
        selectedPublication._id,
        file,
        uploadFileType,
        uploadDescription || undefined,
        [],
        false
      );
      
      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
      
      // Reset form and reload files
      setUploadDescription('');
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: PublicationFile) => {
    if (!selectedPublication?._id) return;
    
    try {
      const downloadUrl = await getFileDownloadUrl(selectedPublication._id, file._id);
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (file: PublicationFile) => {
    if (!selectedPublication?._id || !confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deletePublicationFile(selectedPublication._id, file._id);
      toast({
        title: "Success",
        description: "File deleted successfully!",
      });
      loadFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleView = (file: PublicationFile) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank');
    } else {
      handleDownload(file);
    }
  };

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedFileType === 'all' || file.fileType.includes(selectedFileType);
    return matchesSearch && matchesType;
  });

  const fileTypeStats = {
    all: files.length,
    pdf: files.filter(f => f.fileType.includes('pdf')).length,
    image: files.filter(f => f.fileType.startsWith('image/')).length,
    spreadsheet: files.filter(f => f.fileType.includes('spreadsheet') || f.fileType.includes('excel')).length,
    document: files.filter(f => f.fileType.includes('document') || f.fileType.includes('word')).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground font-sans">
            Knowledge base (media kits, rate cards, and resources) for {selectedPublication.basicInfo.publicationName}
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(!showUploadForm)}>
          {showUploadForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`cursor-pointer transition-colors ${selectedFileType === 'all' ? 'ring-2 ring-primary' : ''}`} 
              onClick={() => setSelectedFileType('all')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{fileTypeStats.all}</p>
            <p className="text-sm text-muted-foreground">All Files</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${selectedFileType === 'pdf' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedFileType('pdf')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{fileTypeStats.pdf}</p>
            <p className="text-sm text-muted-foreground">PDFs</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${selectedFileType === 'image' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedFileType('image')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{fileTypeStats.image}</p>
            <p className="text-sm text-muted-foreground">Images</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${selectedFileType === 'spreadsheet' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedFileType('spreadsheet')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{fileTypeStats.spreadsheet}</p>
            <p className="text-sm text-muted-foreground">Spreadsheets</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${selectedFileType === 'document' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedFileType('document')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{fileTypeStats.document}</p>
            <p className="text-sm text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle className="font-sans text-base">Upload New File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">File Type</label>
                <Select value={uploadFileType} onValueChange={setUploadFileType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getFileTypes().map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Input
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the file..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Choose File</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.json,.jpg,.jpeg,.png,.svg,.gif,.webp,.zip,.gz,.mp4,.mpeg,.mov,.mp3,.wav"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: PDF, Word, Excel, PowerPoint, Images, Archives, Audio, Video
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading file...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-sans text-base">Files & Resources</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedFileType !== 'all' 
                  ? 'No files match your current filters.' 
                  : 'Upload your first file to get started.'}
              </p>
              <Button onClick={() => setShowUploadForm(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div key={file._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getFileIcon(file.fileType)}
                    <div>
                      <h3 className="font-medium font-sans">{file.originalFileName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        {file.downloadCount && file.downloadCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{file.downloadCount} downloads</span>
                          </>
                        )}
                      </div>
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-1 font-sans">{file.description}</p>
                      )}
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {file.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs font-sans">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.isPublic && (
                      <Badge variant="outline" className="text-xs">Public</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleView(file)}
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(file)}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file)}
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
