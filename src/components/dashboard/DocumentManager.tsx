import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/CustomAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link as LinkIcon, FileText, Trash2, ExternalLink, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BrandDocument {
  id: string;
  name: string;
  description: string | null;
  type: string;
  url: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
}

const DOCUMENT_TYPES = [
  "Brand Guidelines", "Logo Files", "Marketing Materials", "Previous Campaigns",
  "Product Documentation", "Style Guide", "Color Palette", "Typography Guide", "Other"
];

interface DocumentManagerProps {
  onDocumentChange?: () => void;
}

export function DocumentManager({ onDocumentChange }: DocumentManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDocuments();
    }
  }, [user?.id]);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('http://localhost:3001/api/files/documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.split('.')[0]);
      }
    }
  };

  const uploadFileToServer = async (file: File, documentName: string, documentType: string, description?: string): Promise<any> => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', documentName);
    formData.append('documentType', documentType);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch('http://localhost:3001/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  };

  const saveDocument = async () => {
    if (!documentName || !documentType || (!selectedFile && !externalUrl)) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let fileUrl = null;
      let mimeType = null;
      let fileSize = null;

      if (selectedFile) {
        // Upload file via our API
        setUploadProgress(50);
        const result = await uploadFileToServer(selectedFile, documentName, documentType, description);
        setUploadProgress(90);
      } else if (externalUrl) {
        // Save external URL document via API
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No authentication token');
        }

        const response = await fetch('http://localhost:3001/api/documents/external', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentName,
            documentType,
            description: description || null,
            externalUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save external document');
        }
      }

      toast({
        title: "Success",
        description: "Document added successfully",
      });

      // Reset form
      setDocumentName("");
      setDescription("");
      setDocumentType("");
      setExternalUrl("");
      setSelectedFile(null);
      setShowAddForm(false);
      setUploadProgress(0);

      // Reload documents
      await loadDocuments();
      onDocumentChange?.();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, fileUrl: string | null) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`http://localhost:3001/api/files/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      await loadDocuments();
      onDocumentChange?.();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Brand Assets & Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Brand Assets & Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showAddForm ? (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document or Link
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentName">Document Name *</Label>
                <Input
                  id="documentName"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              <div>
                <Label htmlFor="documentType">Document Type *</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload File or Add External Link</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg,.ppt,.pptx"
                  />
                </div>
                <span className="self-center text-muted-foreground">OR</span>
                <div className="flex-1">
                  <Input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://external-link.com"
                  />
                </div>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {uploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={saveDocument} disabled={uploading}>
                {uploading ? "Saving..." : "Save Document"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setDocumentName("");
                  setDescription("");
                  setDocumentType("");
                  setExternalUrl("");
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Documents ({documents.length})</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{doc.name}</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {doc.type}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {doc.size && formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(doc.url || doc.externalUrl) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.url || doc.externalUrl!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDocument(doc.id, doc.url)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">Add brand guidelines, logos, or other assets to help create better campaigns</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}