import React, { useState } from 'react';
import { Plus, Search, Filter, Upload, Download, Eye, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePublications, PublicationDisplay } from '@/hooks/usePublications';
import { PublicationFrontend, PublicationInsertFrontend } from '@/types/publication';
import { useToast } from '@/hooks/use-toast';

const PublicationManagement: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<PublicationDisplay | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const {
    publications,
    categories,
    types,
    loading,
    error,
    refetch,
    createPublication,
    updatePublication,
    deletePublication,
    importPublications
  } = usePublications({
    publicationType: selectedType || undefined,
    contentType: selectedCategory || undefined,
    verificationStatus: selectedStatus || undefined
  });

  // Filter publications based on search term
  const filteredPublications = publications.filter(pub =>
    pub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.primaryServiceArea?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.contentType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'needs_verification': return 'bg-yellow-100 text-yellow-800';
      case 'outdated': return 'bg-red-100 text-red-800';
      case 'incomplete': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreatePublication = async (data: Partial<PublicationInsertFrontend>) => {
    try {
      await createPublication(data);
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Publication created successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create publication",
        variant: "destructive",
      });
    }
  };

  const handleDeletePublication = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this publication?')) {
      return;
    }
    
    try {
      await deletePublication(id);
      toast({
        title: "Success",
        description: "Publication deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete publication",
        variant: "destructive",
      });
    }
  };

  const handleImportPublications = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      const publications = Array.isArray(data) ? data : [data];
      
      const result = await importPublications(publications);
      
      setIsImportDialogOpen(false);
      toast({
        title: "Import Complete",
        description: `Imported ${result.inserted} publications. ${result.errors.length} errors.`,
      });
      
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (err) {
      toast({
        title: "Import Error",
        description: err instanceof Error ? err.message : "Failed to import publications",
        variant: "destructive",
      });
    }
  };

  const handleExportPublications = () => {
    const dataStr = JSON.stringify(publications, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'publications-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const viewPublication = (publication: PublicationDisplay) => {
    setSelectedPublication(publication);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={refetch} className="mt-4">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Publication Management</h2>
          <p className="text-gray-600">Manage your universal publisher profiles</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportPublications} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <ImportDialog onImport={handleImportPublications} />
          </Dialog>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Publication
              </Button>
            </DialogTrigger>
            <CreatePublicationDialog onSubmit={handleCreatePublication} />
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search publications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Publication Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="needs_verification">Needs Verification</SelectItem>
                <SelectItem value="outdated">Outdated</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Publications List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPublications.map((publication) => (
          <Card key={publication.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {publication.name}
                    </h3>
                    <Badge className={getStatusColor(publication.metadata?.verificationStatus)}>
                      {publication.metadata?.verificationStatus || 'unknown'}
                    </Badge>
                    {publication.contentType && (
                      <Badge variant="outline">{publication.contentType}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Type:</strong> {publication.type}
                    </div>
                    <div>
                      <strong>Coverage:</strong> {publication.geographicCoverage || 'N/A'}
                    </div>
                    <div>
                      <strong>Market:</strong> {publication.primaryServiceArea || 'N/A'}
                    </div>
                    <div>
                      <strong>Audience:</strong> {publication.audienceDemographics?.totalAudience?.toLocaleString() || 'N/A'}
                    </div>
                    <div>
                      <strong>Monthly Visitors:</strong> {publication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || 'N/A'}
                    </div>
                    <div>
                      <strong>Last Updated:</strong> {publication.metadata?.lastUpdated ? new Date(publication.metadata.lastUpdated).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewPublication(publication)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePublication(publication.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPublications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No publications found matching your criteria.</p>
        </div>
      )}

      {/* View Publication Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPublication?.name}</DialogTitle>
            <DialogDescription>Publication Details</DialogDescription>
          </DialogHeader>
          {selectedPublication && (
            <PublicationDetails publication={selectedPublication} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Create Publication Dialog Component
const CreatePublicationDialog: React.FC<{ onSubmit: (data: Partial<PublicationInsertFrontend>) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    publicationId: '',
    publicationName: '',
    websiteUrl: '',
    publicationType: '',
    contentType: '',
    geographicCoverage: '',
    primaryServiceArea: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const publicationData: Partial<PublicationInsertFrontend> = {
      publicationId: parseInt(formData.publicationId),
      basicInfo: {
        publicationName: formData.publicationName,
        websiteUrl: formData.websiteUrl,
        publicationType: formData.publicationType as any,
        contentType: formData.contentType as any,
        geographicCoverage: formData.geographicCoverage as any,
        primaryServiceArea: formData.primaryServiceArea
      }
    };
    
    onSubmit(publicationData);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Publication</DialogTitle>
        <DialogDescription>Create a new publication profile</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="publicationId">Publication ID</Label>
          <Input
            id="publicationId"
            type="number"
            value={formData.publicationId}
            onChange={(e) => setFormData({ ...formData, publicationId: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="publicationName">Publication Name</Label>
          <Input
            id="publicationName"
            value={formData.publicationName}
            onChange={(e) => setFormData({ ...formData, publicationName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="publicationType">Publication Type</Label>
          <Select value={formData.publicationType} onValueChange={(value) => setFormData({ ...formData, publicationType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="contentType">Content Type</Label>
          <Select value={formData.contentType} onValueChange={(value) => setFormData({ ...formData, contentType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="alternative">Alternative</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="geographicCoverage">Geographic Coverage</Label>
          <Select value={formData.geographicCoverage} onValueChange={(value) => setFormData({ ...formData, geographicCoverage: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select coverage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="primaryServiceArea">Primary Service Area</Label>
          <Input
            id="primaryServiceArea"
            value={formData.primaryServiceArea}
            onChange={(e) => setFormData({ ...formData, primaryServiceArea: e.target.value })}
            placeholder="e.g., Chicago Metro Area"
          />
        </div>
        <Button type="submit" className="w-full">Create Publication</Button>
      </form>
    </DialogContent>
  );
};

// Import Dialog Component
const ImportDialog: React.FC<{ onImport: (data: string) => void }> = ({ onImport }) => {
  const [importData, setImportData] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onImport(importData);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Import Publications</DialogTitle>
        <DialogDescription>Paste JSON data to import publications</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="importData">JSON Data</Label>
          <Textarea
            id="importData"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste your JSON data here..."
            className="min-h-[300px] font-mono text-sm"
            required
          />
        </div>
        <Button type="submit" className="w-full">Import Publications</Button>
      </form>
    </DialogContent>
  );
};

// Publication Details Component
const PublicationDetails: React.FC<{ publication: PublicationDisplay }> = ({ publication }) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h4 className="font-semibold mb-2">Basic Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Name:</strong> {publication.name}</div>
          <div><strong>Type:</strong> {publication.type}</div>
          <div><strong>Content Type:</strong> {publication.contentType || 'N/A'}</div>
          <div><strong>Founded:</strong> {publication.founded || 'N/A'}</div>
          <div><strong>Coverage:</strong> {publication.geographicCoverage || 'N/A'}</div>
          <div><strong>Service Area:</strong> {publication.primaryServiceArea || 'N/A'}</div>
        </div>
      </div>

      {/* Contact Info */}
      {publication.contactInfo && (
        <div>
          <h4 className="font-semibold mb-2">Contact Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Main Phone:</strong> {publication.contactInfo.mainPhone || 'N/A'}</div>
            {publication.contactInfo.salesContact && (
              <>
                <div><strong>Sales Contact:</strong> {publication.contactInfo.salesContact.name || 'N/A'}</div>
                <div><strong>Sales Email:</strong> {publication.contactInfo.salesContact.email || 'N/A'}</div>
                <div><strong>Sales Phone:</strong> {publication.contactInfo.salesContact.phone || 'N/A'}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div>
        <h4 className="font-semibold mb-2">Metrics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Total Audience:</strong> {publication.audienceDemographics?.totalAudience?.toLocaleString() || 'N/A'}</div>
          <div><strong>Monthly Visitors:</strong> {publication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || 'N/A'}</div>
          <div><strong>Print Circulation:</strong> {publication.distributionChannels?.print?.circulation?.toLocaleString() || 'N/A'}</div>
          <div><strong>Newsletter Subscribers:</strong> {publication.distributionChannels?.newsletters?.[0]?.subscribers?.toLocaleString() || 'N/A'}</div>
        </div>
      </div>

      {/* Business Info */}
      {publication.businessInfo && (
        <div>
          <h4 className="font-semibold mb-2">Business Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Ownership:</strong> {publication.businessInfo.ownershipType || 'N/A'}</div>
            <div><strong>Employees:</strong> {publication.businessInfo.numberOfEmployees || 'N/A'}</div>
            <div><strong>Years in Operation:</strong> {publication.businessInfo.yearsInOperation || 'N/A'}</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div>
        <h4 className="font-semibold mb-2">Metadata</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Status:</strong> 
            <Badge className={`ml-2 ${publication.metadata?.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {publication.metadata?.verificationStatus || 'unknown'}
            </Badge>
          </div>
          <div><strong>Last Updated:</strong> {publication.metadata?.lastUpdated ? new Date(publication.metadata.lastUpdated).toLocaleDateString() : 'N/A'}</div>
          <div><strong>Created:</strong> {publication.metadata?.createdAt ? new Date(publication.metadata.createdAt).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default PublicationManagement;
