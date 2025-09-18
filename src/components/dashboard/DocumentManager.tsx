import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  document_name: string;
  description: string | null;
  document_type: string;
  file_url: string | null;
  external_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
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
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('brand-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('brand-documents')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
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
        fileUrl = await uploadFile(selectedFile);
        mimeType = selectedFile.type;
        fileSize = selectedFile.size;
      }

      const { error } = await supabase
        .from('brand_documents')
        .insert({
          user_id: user?.id,
          document_name: documentName,
          description: description || null,
          document_type: documentType,
          file_url: fileUrl,
          external_url: externalUrl || null,
          mime_type: mimeType,
          file_size: fileSize,
        });

      if (error) throw error;

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
      // Delete from storage if it's a uploaded file
      if (fileUrl && fileUrl.includes('brand-documents')) {
        const fileName = fileUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('brand-documents')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      await loadDocuments();
      onDocumentChange?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
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
                      <span className="font-medium">{doc.document_name}</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {doc.document_type}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {doc.file_size && formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(doc.file_url || doc.external_url) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url || doc.external_url!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDocument(doc.id, doc.file_url)}
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