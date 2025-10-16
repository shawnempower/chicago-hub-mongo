import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Trash2, Edit, Plus, Eye, Users, TrendingUp, Award, Building, 
  RefreshCw, Save, X, ExternalLink, Globe, Mail, Phone, Search
} from 'lucide-react';

import { usePublications, usePublication } from '@/hooks/usePublications';
import { PublicationFrontend, PublicationInsertFrontend, PublicationUpdateFrontend } from '@/types/publication';

interface PublicationFormData {
  // Basic Info
  publicationName: string;
  websiteUrl: string;
  founded: string;
  publicationType: string;
  contentType: string;
  headquarters: string;
  geographicCoverage: string;
  primaryServiceArea: string;
  secondaryMarkets: string[];
  numberOfPublications: number;
  
  // Contact Info
  mainPhone: string;
  businessHours: string;
  salesContactName: string;
  salesContactTitle: string;
  salesContactEmail: string;
  salesContactPhone: string;
  editorialContactName: string;
  editorialContactTitle: string;
  editorialContactEmail: string;
  editorialContactPhone: string;
  generalManagerName: string;
  generalManagerEmail: string;
  advertisingDirectorName: string;
  advertisingDirectorEmail: string;
  
  // Audience Demographics
  totalAudience: number;
  ageGroup25_34: number;
  ageGroup35_44: number;
  ageGroup45_54: number;
  ageGroup55_64: number;
  ageGroup65Plus: number;
  genderMale: number;
  genderFemale: number;
  income35k_50k: number;
  income50k_75k: number;
  income75k_100k: number;
  income100k_150k: number;
  incomeOver150k: number;
  educationBachelors: number;
  educationGraduate: number;
  targetMarkets: string[];
  interests: string[];
  
  // Editorial Info
  contentFocus: string[];
  contentPillars: string[];
  specialSections: string[];
  signatureFeatures: string[];
  
  // Business Info
  legalEntity: string;
  taxId: string;
  ownershipType: string;
  parentCompany: string;
  yearsInOperation: number;
  numberOfEmployees: number;
  topAdvertiserCategories: string[];
  
  // Competitive Info
  uniqueValueProposition: string;
  keyDifferentiators: string[];
  competitiveAdvantages: string[];
  
  // Social Media
  facebookUrl: string;
  facebookFollowers: number;
  instagramUrl: string;
  instagramFollowers: number;
  twitterUrl: string;
  twitterFollowers: number;
  linkedinUrl: string;
  
  // Website Metrics
  monthlyVisitors: number;
  monthlyPageViews: number;
  averageSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  mobilePercentage: number;
  
  // Print Info
  printFrequency: string;
  circulation: number;
  paidCirculation: number;
  freeCirculation: number;
  distributionArea: string;
  
  // Newsletter Info
  newsletterSubscribers: number;
  newsletterOpenRate: number;
  
  // Metadata
  verificationStatus: string;
  dataCompleteness: number;
}

const PUBLICATION_TYPES = [
  'daily',
  'weekly', 
  'monthly',
  'bi-weekly',
  'quarterly',
  'other'
];

const CONTENT_TYPES = [
  'news',
  'lifestyle',
  'business', 
  'entertainment',
  'sports',
  'alternative',
  'mixed'
];

const GEOGRAPHIC_COVERAGE = [
  'local',
  'regional',
  'state',
  'national',
  'international'
];

const OWNERSHIP_TYPES = [
  'private',
  'public',
  'nonprofit',
  'family-owned',
  'cooperative',
  'other'
];

const VERIFICATION_STATUS = [
  'verified',
  'needs_verification',
  'pending',
  'outdated'
];

const PRINT_FREQUENCIES = [
  'daily',
  'weekly',
  'bi-weekly',
  'monthly',
  'quarterly',
  'annually',
  'none'
];

const COMMON_INTERESTS = [
  'Politics & Government',
  'Arts & Culture',
  'Food & Drink',
  'Travel',
  'Health Care',
  'Business',
  'Local Events',
  'Sports',
  'Entertainment',
  'Technology',
  'Education',
  'Real Estate'
];

const COMMON_TARGET_MARKETS = [
  'Educated professionals',
  'Cultural enthusiasts',
  'Local business supporters',
  'Politically engaged citizens',
  'Environmental advocates',
  'Young adults',
  'Families',
  'Seniors',
  'Students',
  'Entrepreneurs'
];

const COMMON_ADVERTISER_CATEGORIES = [
  'Restaurants & Bars',
  'Arts & Entertainment',
  'Retail',
  'Events',
  'Political Campaigns',
  'Nonprofits',
  'Healthcare',
  'Real Estate',
  'Automotive',
  'Financial Services',
  'Technology',
  'Education'
];

export const PublicationsManagement = () => {
  const [selectedPublication, setSelectedPublication] = useState<PublicationFrontend | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPublication, setEditingPublication] = useState<PublicationFrontend | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterContent, setFilterContent] = useState<string>('all');
  
  const { 
    publications, 
    categories, 
    types, 
    loading, 
    error, 
    refetch,
    createPublication,
    updatePublication,
    deletePublication 
  } = usePublications();

  const [formData, setFormData] = useState<PublicationFormData>({
    // Basic Info
    publicationName: '',
    websiteUrl: '',
    founded: '',
    publicationType: '',
    contentType: '',
    headquarters: '',
    geographicCoverage: '',
    primaryServiceArea: '',
    secondaryMarkets: [],
    numberOfPublications: 1,
    
    // Contact Info
    mainPhone: '',
    businessHours: '',
    salesContactName: '',
    salesContactTitle: '',
    salesContactEmail: '',
    salesContactPhone: '',
    editorialContactName: '',
    editorialContactTitle: '',
    editorialContactEmail: '',
    editorialContactPhone: '',
    generalManagerName: '',
    generalManagerEmail: '',
    advertisingDirectorName: '',
    advertisingDirectorEmail: '',
    
    // Audience Demographics
    totalAudience: 0,
    ageGroup25_34: 0,
    ageGroup35_44: 0,
    ageGroup45_54: 0,
    ageGroup55_64: 0,
    ageGroup65Plus: 0,
    genderMale: 0,
    genderFemale: 0,
    income35k_50k: 0,
    income50k_75k: 0,
    income75k_100k: 0,
    income100k_150k: 0,
    incomeOver150k: 0,
    educationBachelors: 0,
    educationGraduate: 0,
    targetMarkets: [],
    interests: [],
    
    // Editorial Info
    contentFocus: [],
    contentPillars: [],
    specialSections: [],
    signatureFeatures: [],
    
    // Business Info
    legalEntity: '',
    taxId: '',
    ownershipType: '',
    parentCompany: '',
    yearsInOperation: 0,
    numberOfEmployees: 0,
    topAdvertiserCategories: [],
    
    // Competitive Info
    uniqueValueProposition: '',
    keyDifferentiators: [],
    competitiveAdvantages: [],
    
    // Social Media
    facebookUrl: '',
    facebookFollowers: 0,
    instagramUrl: '',
    instagramFollowers: 0,
    twitterUrl: '',
    twitterFollowers: 0,
    linkedinUrl: '',
    
    // Website Metrics
    monthlyVisitors: 0,
    monthlyPageViews: 0,
    averageSessionDuration: 0,
    pagesPerSession: 0,
    bounceRate: 0,
    mobilePercentage: 0,
    
    // Print Info
    printFrequency: '',
    circulation: 0,
    paidCirculation: 0,
    freeCirculation: 0,
    distributionArea: '',
    
    // Newsletter Info
    newsletterSubscribers: 0,
    newsletterOpenRate: 0,
    
    // Metadata
    verificationStatus: 'needs_verification',
    dataCompleteness: 0
  });

  const resetForm = () => {
    setFormData({
      publicationName: '',
      websiteUrl: '',
      founded: '',
      publicationType: '',
      contentType: '',
      headquarters: '',
      geographicCoverage: '',
      primaryServiceArea: '',
      mainPhone: '',
      businessHours: '',
      salesContactName: '',
      salesContactTitle: '',
      salesContactEmail: '',
      salesContactPhone: '',
      editorialContactName: '',
      editorialContactTitle: '',
      editorialContactEmail: '',
      editorialContactPhone: '',
    });
  };

  const handleEdit = (publication: PublicationFrontend) => {
    setEditingPublication(publication);
    setFormData({
      publicationName: publication.basicInfo.publicationName,
      websiteUrl: publication.basicInfo.websiteUrl || '',
      founded: publication.basicInfo.founded?.toString() || '',
      publicationType: publication.basicInfo.publicationType || '',
      contentType: publication.basicInfo.contentType || '',
      headquarters: publication.basicInfo.headquarters || '',
      geographicCoverage: publication.basicInfo.geographicCoverage || '',
      primaryServiceArea: publication.basicInfo.primaryServiceArea || '',
      mainPhone: publication.contactInfo?.mainPhone || '',
      businessHours: publication.contactInfo?.businessHours || '',
      salesContactName: publication.contactInfo?.salesContact?.name || '',
      salesContactTitle: publication.contactInfo?.salesContact?.title || '',
      salesContactEmail: publication.contactInfo?.salesContact?.email || '',
      salesContactPhone: publication.contactInfo?.salesContact?.phone || '',
      editorialContactName: publication.contactInfo?.editorialContact?.name || '',
      editorialContactTitle: publication.contactInfo?.editorialContact?.title || '',
      editorialContactEmail: publication.contactInfo?.editorialContact?.email || '',
      editorialContactPhone: publication.contactInfo?.editorialContact?.phone || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const publicationData: PublicationInsertFrontend | PublicationUpdateFrontend = {
        publicationId: editingPublication?.publicationId || Date.now(),
        basicInfo: {
          publicationName: formData.publicationName,
          websiteUrl: formData.websiteUrl || undefined,
          founded: formData.founded || undefined,
          publicationType: formData.publicationType as any,
          contentType: formData.contentType as any,
          headquarters: formData.headquarters || undefined,
          geographicCoverage: formData.geographicCoverage as any,
          primaryServiceArea: formData.primaryServiceArea || undefined,
        },
        contactInfo: {
          mainPhone: formData.mainPhone || undefined,
          businessHours: formData.businessHours || undefined,
          primaryContact: formData.salesContactName ? {
            name: formData.salesContactName,
            title: formData.salesContactTitle || undefined,
            email: formData.salesContactEmail || undefined,
            phone: formData.salesContactPhone || undefined,
          } : undefined,
          salesContact: formData.salesContactName ? {
            name: formData.salesContactName,
            title: formData.salesContactTitle || undefined,
            email: formData.salesContactEmail || undefined,
            phone: formData.salesContactPhone || undefined,
          } : undefined,
          editorialContact: formData.editorialContactName ? {
            name: formData.editorialContactName,
            title: formData.editorialContactTitle || undefined,
            email: formData.editorialContactEmail || undefined,
            phone: formData.editorialContactPhone || undefined,
          } : undefined,
        },
      };

      if (editingPublication) {
        await updatePublication(editingPublication._id!, publicationData);
        toast.success('Publication updated successfully');
      } else {
        await createPublication(publicationData as PublicationInsertFrontend);
        toast.success('Publication created successfully');
      }

      setShowForm(false);
      setEditingPublication(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error saving publication:', error);
      toast.error('Failed to save publication');
    }
  };

  const handleDelete = async (publication: PublicationFrontend) => {
    if (!confirm(`Are you sure you want to delete ${publication.basicInfo.publicationName}?`)) return;

    try {
      await deletePublication(publication._id!);
      toast.success('Publication deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting publication:', error);
      toast.error('Failed to delete publication');
    }
  };

  // Filter publications based on search and filters
  const filteredPublications = publications.filter(pub => {
    const matchesSearch = pub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pub.primaryServiceArea?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || pub.type === filterType;
    const matchesContent = filterContent === 'all' || pub.contentType === filterContent;
    
    return matchesSearch && matchesType && matchesContent;
  });

  if (loading) {
    return <div className="p-6">Loading publications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Publications Management</h2>
          <p className="text-muted-foreground">Manage your publication database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingPublication(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Publication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPublication ? 'Edit Publication' : 'Create New Publication'}
                </DialogTitle>
                <DialogDescription>
                  {editingPublication 
                    ? 'Update the publication information below.'
                    : 'Enter the details for the new publication.'}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact Info</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="publicationName">Publication Name *</Label>
                      <Input
                        id="publicationName"
                        value={formData.publicationName}
                        onChange={(e) => setFormData({ ...formData, publicationName: e.target.value })}
                        placeholder="Chicago Tribune"
                      />
                    </div>
                    <div>
                      <Label htmlFor="websiteUrl">Website URL</Label>
                      <Input
                        id="websiteUrl"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="publicationType">Publication Type</Label>
                      <Select value={formData.publicationType} onValueChange={(value) => setFormData({ ...formData, publicationType: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PUBLICATION_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
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
                          {CONTENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="geographicCoverage">Geographic Coverage</Label>
                      <Select value={formData.geographicCoverage} onValueChange={(value) => setFormData({ ...formData, geographicCoverage: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select coverage" />
                        </SelectTrigger>
                        <SelectContent>
                          {GEOGRAPHIC_COVERAGE.map(coverage => (
                            <SelectItem key={coverage} value={coverage}>{coverage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="founded">Founded</Label>
                      <Input
                        id="founded"
                        value={formData.founded}
                        onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                        placeholder="1995"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mainPhone">Main Phone</Label>
                      <Input
                        id="mainPhone"
                        value={formData.mainPhone}
                        onChange={(e) => setFormData({ ...formData, mainPhone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessHours">Business Hours</Label>
                      <Input
                        id="businessHours"
                        value={formData.businessHours}
                        onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
                        placeholder="9 AM - 5 PM"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-3">Sales Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="salesContactName">Name</Label>
                        <Input
                          id="salesContactName"
                          value={formData.salesContactName}
                          onChange={(e) => setFormData({ ...formData, salesContactName: e.target.value })}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salesContactTitle">Title</Label>
                        <Input
                          id="salesContactTitle"
                          value={formData.salesContactTitle}
                          onChange={(e) => setFormData({ ...formData, salesContactTitle: e.target.value })}
                          placeholder="Sales Manager"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salesContactEmail">Email</Label>
                        <Input
                          id="salesContactEmail"
                          type="email"
                          value={formData.salesContactEmail}
                          onChange={(e) => setFormData({ ...formData, salesContactEmail: e.target.value })}
                          placeholder="sales@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salesContactPhone">Phone</Label>
                        <Input
                          id="salesContactPhone"
                          value={formData.salesContactPhone}
                          onChange={(e) => setFormData({ ...formData, salesContactPhone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-3">Editorial Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editorialContactName">Name</Label>
                        <Input
                          id="editorialContactName"
                          value={formData.editorialContactName}
                          onChange={(e) => setFormData({ ...formData, editorialContactName: e.target.value })}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editorialContactTitle">Title</Label>
                        <Input
                          id="editorialContactTitle"
                          value={formData.editorialContactTitle}
                          onChange={(e) => setFormData({ ...formData, editorialContactTitle: e.target.value })}
                          placeholder="Editor-in-Chief"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editorialContactEmail">Email</Label>
                        <Input
                          id="editorialContactEmail"
                          type="email"
                          value={formData.editorialContactEmail}
                          onChange={(e) => setFormData({ ...formData, editorialContactEmail: e.target.value })}
                          placeholder="editor@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editorialContactPhone">Phone</Label>
                        <Input
                          id="editorialContactPhone"
                          value={formData.editorialContactPhone}
                          onChange={(e) => setFormData({ ...formData, editorialContactPhone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="headquarters">Headquarters</Label>
                      <Input
                        id="headquarters"
                        value={formData.headquarters}
                        onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                        placeholder="Chicago, IL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="primaryServiceArea">Primary Service Area</Label>
                      <Input
                        id="primaryServiceArea"
                        value={formData.primaryServiceArea}
                        onChange={(e) => setFormData({ ...formData, primaryServiceArea: e.target.value })}
                        placeholder="Greater Chicago Area"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingPublication ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search publications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PUBLICATION_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterContent} onValueChange={setFilterContent}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by content" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            {CONTENT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Publications List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Publications ({filteredPublications.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPublications.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No publications found
              </p>
            ) : (
              filteredPublications.map((publication) => (
                <div
                  key={publication.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPublication?.id === publication.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPublication(publication as any)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{publication.name}</h4>
                      <p className="text-xs text-muted-foreground">{publication.type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {publication.contentType}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(publication as any);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(publication as any);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Publication Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedPublication ? selectedPublication.name : 'Select a Publication'}
            </CardTitle>
            {selectedPublication && (
              <CardDescription>
                {selectedPublication.type} • {selectedPublication.contentType}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedPublication ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Website</h4>
                    {selectedPublication.website ? (
                      <a href={selectedPublication.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        {selectedPublication.website}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Coverage</h4>
                    <p className="text-muted-foreground">{selectedPublication.geographicCoverage}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Service Area</h4>
                  <p className="text-muted-foreground">{selectedPublication.primaryServiceArea}</p>
                </div>
                
                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm mb-1">Sales Contact</h5>
                      <div className="space-y-1">
                        <p className="text-sm">John Smith</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          sales@example.com
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">Editorial Contact</h5>
                      <div className="space-y-1">
                        <p className="text-sm">Jane Doe</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          editor@example.com
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium">Select a Publication</h3>
                <p className="text-muted-foreground">Choose a publication from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicationsManagement;
