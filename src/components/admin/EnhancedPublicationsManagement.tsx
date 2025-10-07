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
import { API_BASE_URL } from '@/config/api';
import { 
  Trash2, Edit, Plus, Eye, Users, TrendingUp, Award, Building, 
  RefreshCw, Save, X, ExternalLink, Globe, Mail, Phone, Search,
  BarChart3, PieChart, Target, Briefcase, Share2, FileText,
  Calendar, MapPin, Star, Zap, Upload, Download, AlertCircle,
  CheckCircle, Clock, FileJson
} from 'lucide-react';

import { usePublications, usePublication } from '@/hooks/usePublications';
import { PublicationFrontend, PublicationInsertFrontend } from '@/types/publication';

interface EnhancedPublicationFormData {
  // Basic Info
  publicationName: string;
  websiteUrl: string;
  founded: string;
  publicationType: string;
  contentType: string;
  headquarters: string;
  geographicCoverage: string;
  primaryServiceArea: string;
  secondaryMarkets: string;
  numberOfPublications: number;
  
  // Contact Info
  mainPhone: string;
  businessHours: string;
  salesContactName: string;
  salesContactEmail: string;
  salesContactPhone: string;
  editorialContactName: string;
  editorialContactEmail: string;
  generalManagerName: string;
  generalManagerEmail: string;
  
  // Audience Demographics
  totalAudience: number;
  ageGroup25_34: number;
  ageGroup35_44: number;
  ageGroup45_54: number;
  ageGroup55_64: number;
  ageGroup65Plus: number;
  genderMale: number;
  genderFemale: number;
  income50k_75k: number;
  income75k_100k: number;
  income100k_150k: number;
  incomeOver150k: number;
  educationBachelors: number;
  educationGraduate: number;
  targetMarkets: string;
  interests: string;
  
  // Editorial Info
  contentFocus: string;
  contentPillars: string;
  specialSections: string;
  signatureFeatures: string;
  
  // Business Info
  ownershipType: string;
  parentCompany: string;
  yearsInOperation: number;
  numberOfEmployees: number;
  topAdvertiserCategories: string;
  
  // Competitive Info
  uniqueValueProposition: string;
  keyDifferentiators: string;
  competitiveAdvantages: string;
  
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

const PUBLICATION_TYPES = ['daily', 'weekly', 'monthly', 'bi-weekly', 'quarterly', 'other'];
const CONTENT_TYPES = ['news', 'lifestyle', 'business', 'entertainment', 'sports', 'alternative', 'mixed'];
const GEOGRAPHIC_COVERAGE = ['local', 'regional', 'state', 'national', 'international'];
const OWNERSHIP_TYPES = ['private', 'public', 'nonprofit', 'family-owned', 'cooperative', 'other'];
const VERIFICATION_STATUS = ['verified', 'needs_verification', 'pending', 'outdated'];
const PRINT_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually', 'none'];

export const EnhancedPublicationsManagement = () => {
  const [selectedPublication, setSelectedPublication] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPublication, setEditingPublication] = useState<any | null>(null);
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

  const [formData, setFormData] = useState<EnhancedPublicationFormData>({
    // Basic Info
    publicationName: '',
    websiteUrl: '',
    founded: '',
    publicationType: '',
    contentType: '',
    headquarters: '',
    geographicCoverage: '',
    primaryServiceArea: '',
    secondaryMarkets: '',
    numberOfPublications: 1,
    
    // Contact Info
    mainPhone: '',
    businessHours: '',
    salesContactName: '',
    salesContactEmail: '',
    salesContactPhone: '',
    editorialContactName: '',
    editorialContactEmail: '',
    generalManagerName: '',
    generalManagerEmail: '',
    
    // Audience Demographics
    totalAudience: 0,
    ageGroup25_34: 0,
    ageGroup35_44: 0,
    ageGroup45_54: 0,
    ageGroup55_64: 0,
    ageGroup65Plus: 0,
    genderMale: 0,
    genderFemale: 0,
    income50k_75k: 0,
    income75k_100k: 0,
    income100k_150k: 0,
    incomeOver150k: 0,
    educationBachelors: 0,
    educationGraduate: 0,
    targetMarkets: '',
    interests: '',
    
    // Editorial Info
    contentFocus: '',
    contentPillars: '',
    specialSections: '',
    signatureFeatures: '',
    
    // Business Info
    ownershipType: '',
    parentCompany: '',
    yearsInOperation: 0,
    numberOfEmployees: 0,
    topAdvertiserCategories: '',
    
    // Competitive Info
    uniqueValueProposition: '',
    keyDifferentiators: '',
    competitiveAdvantages: '',
    
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
      secondaryMarkets: '',
      numberOfPublications: 1,
      mainPhone: '',
      businessHours: '',
      salesContactName: '',
      salesContactEmail: '',
      salesContactPhone: '',
      editorialContactName: '',
      editorialContactEmail: '',
      generalManagerName: '',
      generalManagerEmail: '',
      totalAudience: 0,
      ageGroup25_34: 0,
      ageGroup35_44: 0,
      ageGroup45_54: 0,
      ageGroup55_64: 0,
      ageGroup65Plus: 0,
      genderMale: 0,
      genderFemale: 0,
      income50k_75k: 0,
      income75k_100k: 0,
      income100k_150k: 0,
      incomeOver150k: 0,
      educationBachelors: 0,
      educationGraduate: 0,
      targetMarkets: '',
      interests: '',
      contentFocus: '',
      contentPillars: '',
      specialSections: '',
      signatureFeatures: '',
      ownershipType: '',
      parentCompany: '',
      yearsInOperation: 0,
      numberOfEmployees: 0,
      topAdvertiserCategories: '',
      uniqueValueProposition: '',
      keyDifferentiators: '',
      competitiveAdvantages: '',
      facebookUrl: '',
      facebookFollowers: 0,
      instagramUrl: '',
      instagramFollowers: 0,
      twitterUrl: '',
      twitterFollowers: 0,
      linkedinUrl: '',
      monthlyVisitors: 0,
      monthlyPageViews: 0,
      averageSessionDuration: 0,
      pagesPerSession: 0,
      bounceRate: 0,
      mobilePercentage: 0,
      printFrequency: '',
      circulation: 0,
      paidCirculation: 0,
      freeCirculation: 0,
      distributionArea: '',
      newsletterSubscribers: 0,
      newsletterOpenRate: 0,
      verificationStatus: 'needs_verification',
      dataCompleteness: 0
    });
  };

  const handleSave = async () => {
    try {
      // Convert form data to Publication format
      const publicationData: PublicationInsertFrontend = {
        publicationId: editingPublication?.publicationId || Date.now(),
        basicInfo: {
          publicationName: formData.publicationName,
          websiteUrl: formData.websiteUrl,
          founded: formData.founded,
          publicationType: formData.publicationType,
          contentType: formData.contentType,
          headquarters: formData.headquarters,
          geographicCoverage: formData.geographicCoverage,
          primaryServiceArea: formData.primaryServiceArea,
          secondaryMarkets: formData.secondaryMarkets ? formData.secondaryMarkets.split(',').map(s => s.trim()) : [],
          numberOfPublications: formData.numberOfPublications
        },
        contactInfo: {
          mainPhone: formData.mainPhone,
          businessHours: formData.businessHours,
          salesContact: {
            name: formData.salesContactName,
            email: formData.salesContactEmail,
            phone: formData.salesContactPhone,
            preferredContact: 'email'
          },
          editorialContact: {
            name: formData.editorialContactName,
            email: formData.editorialContactEmail
          },
          generalManager: {
            name: formData.generalManagerName,
            email: formData.generalManagerEmail
          }
        },
        audienceDemographics: {
          totalAudience: formData.totalAudience,
          ageGroups: {
            '25-34': formData.ageGroup25_34,
            '35-44': formData.ageGroup35_44,
            '45-54': formData.ageGroup45_54,
            '55-64': formData.ageGroup55_64,
            '65+': formData.ageGroup65Plus
          },
          gender: {
            male: formData.genderMale,
            female: formData.genderFemale
          },
          householdIncome: {
            '50k-75k': formData.income50k_75k,
            '75k-100k': formData.income75k_100k,
            '100k-150k': formData.income100k_150k,
            'over150k': formData.incomeOver150k
          },
          education: {
            bachelors: formData.educationBachelors,
            graduate: formData.educationGraduate
          },
          targetMarkets: formData.targetMarkets ? formData.targetMarkets.split(',').map(s => s.trim()) : [],
          interests: formData.interests ? formData.interests.split(',').map(s => s.trim()) : []
        },
        editorialInfo: {
          contentFocus: formData.contentFocus ? formData.contentFocus.split(',').map(s => s.trim()) : [],
          contentPillars: formData.contentPillars ? formData.contentPillars.split(',').map(s => s.trim()) : [],
          specialSections: formData.specialSections ? formData.specialSections.split(',').map(s => s.trim()) : [],
          signatureFeatures: formData.signatureFeatures ? formData.signatureFeatures.split(',').map(s => s.trim()) : []
        },
        businessInfo: {
          ownershipType: formData.ownershipType,
          parentCompany: formData.parentCompany,
          yearsInOperation: formData.yearsInOperation,
          numberOfEmployees: formData.numberOfEmployees,
          topAdvertiserCategories: formData.topAdvertiserCategories ? formData.topAdvertiserCategories.split(',').map(s => s.trim()) : []
        },
        competitiveInfo: {
          uniqueValueProposition: formData.uniqueValueProposition,
          keyDifferentiators: formData.keyDifferentiators ? formData.keyDifferentiators.split(',').map(s => s.trim()) : [],
          competitiveAdvantages: formData.competitiveAdvantages ? formData.competitiveAdvantages.split(',').map(s => s.trim()) : []
        },
        socialMediaProfiles: [
          ...(formData.facebookUrl ? [{
            platform: 'facebook' as const,
            url: formData.facebookUrl,
            metrics: { followers: formData.facebookFollowers }
          }] : []),
          ...(formData.instagramUrl ? [{
            platform: 'instagram' as const,
            url: formData.instagramUrl,
            metrics: { followers: formData.instagramFollowers }
          }] : []),
          ...(formData.twitterUrl ? [{
            platform: 'twitter' as const,
            url: formData.twitterUrl,
            metrics: { followers: formData.twitterFollowers }
          }] : []),
          ...(formData.linkedinUrl ? [{
            platform: 'linkedin' as const,
            url: formData.linkedinUrl
          }] : [])
        ],
        distributionChannels: {
          website: formData.monthlyVisitors ? {
            url: formData.websiteUrl,
            metrics: {
              monthlyVisitors: formData.monthlyVisitors,
              monthlyPageViews: formData.monthlyPageViews,
              averageSessionDuration: formData.averageSessionDuration,
              pagesPerSession: formData.pagesPerSession,
              bounceRate: formData.bounceRate,
              mobilePercentage: formData.mobilePercentage
            }
          } : undefined,
          print: formData.circulation ? {
            frequency: formData.printFrequency,
            circulation: formData.circulation,
            paidCirculation: formData.paidCirculation,
            freeCirculation: formData.freeCirculation,
            distributionArea: formData.distributionArea
          } : undefined,
          newsletters: formData.newsletterSubscribers ? [{
            name: 'Main Newsletter',
            subscribers: formData.newsletterSubscribers,
            openRate: formData.newsletterOpenRate
          }] : []
        },
        metadata: {
          extractedFrom: ['manual_entry'],
          confidence: 0.95,
          verificationStatus: formData.verificationStatus,
          dataCompleteness: formData.dataCompleteness,
          lastAnalyzed: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      };

      if (editingPublication) {
        await updatePublication(editingPublication._id!, publicationData);
        toast.success('Publication updated successfully');
      } else {
        await createPublication(publicationData);
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

  const handleEdit = async (publication: any) => {
    setEditingPublication(publication);
    
    try {
      // Fetch full publication data for editing
      const response = await fetch(`${API_BASE_URL}/publications/${publication.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch publication details');
      }
      const fullPublication: PublicationFrontend = await response.json();
      
      // Populate form with full publication data
      setFormData({
        publicationName: fullPublication.basicInfo?.publicationName || '',
        websiteUrl: fullPublication.basicInfo?.websiteUrl || '',
        founded: fullPublication.basicInfo?.founded?.toString() || '',
        publicationType: fullPublication.basicInfo?.publicationType || '',
        contentType: fullPublication.basicInfo?.contentType || '',
        headquarters: fullPublication.basicInfo?.headquarters || '',
        geographicCoverage: fullPublication.basicInfo?.geographicCoverage || '',
        primaryServiceArea: fullPublication.basicInfo?.primaryServiceArea || '',
        secondaryMarkets: fullPublication.basicInfo?.secondaryMarkets?.join(', ') || '',
        numberOfPublications: fullPublication.basicInfo?.numberOfPublications || 1,
        mainPhone: fullPublication.contactInfo?.mainPhone || '',
        businessHours: fullPublication.contactInfo?.businessHours || '',
        salesContactName: fullPublication.contactInfo?.salesContact?.name || '',
        salesContactEmail: fullPublication.contactInfo?.salesContact?.email || '',
        salesContactPhone: fullPublication.contactInfo?.salesContact?.phone || '',
        editorialContactName: fullPublication.contactInfo?.editorialContact?.name || '',
        editorialContactEmail: fullPublication.contactInfo?.editorialContact?.email || '',
        generalManagerName: fullPublication.contactInfo?.generalManager?.name || '',
        generalManagerEmail: fullPublication.contactInfo?.generalManager?.email || '',
        totalAudience: fullPublication.audienceDemographics?.totalAudience || 0,
        ageGroup25_34: fullPublication.audienceDemographics?.ageGroups?.['25-34'] || 0,
        ageGroup35_44: fullPublication.audienceDemographics?.ageGroups?.['35-44'] || 0,
        ageGroup45_54: fullPublication.audienceDemographics?.ageGroups?.['45-54'] || 0,
        ageGroup55_64: fullPublication.audienceDemographics?.ageGroups?.['55-64'] || 0,
        ageGroup65Plus: fullPublication.audienceDemographics?.ageGroups?.['65+'] || 0,
        genderMale: fullPublication.audienceDemographics?.gender?.male || 0,
        genderFemale: fullPublication.audienceDemographics?.gender?.female || 0,
        income50k_75k: fullPublication.audienceDemographics?.householdIncome?.['50k-75k'] || 0,
        income75k_100k: fullPublication.audienceDemographics?.householdIncome?.['75k-100k'] || 0,
        income100k_150k: fullPublication.audienceDemographics?.householdIncome?.['100k-150k'] || 0,
        incomeOver150k: fullPublication.audienceDemographics?.householdIncome?.['over150k'] || 0,
        educationBachelors: fullPublication.audienceDemographics?.education?.bachelors || 0,
        educationGraduate: fullPublication.audienceDemographics?.education?.graduate || 0,
        targetMarkets: fullPublication.audienceDemographics?.targetMarkets?.join(', ') || '',
        interests: fullPublication.audienceDemographics?.interests?.join(', ') || '',
        contentFocus: fullPublication.editorialInfo?.contentFocus?.join(', ') || '',
        contentPillars: fullPublication.editorialInfo?.contentPillars?.join(', ') || '',
        specialSections: fullPublication.editorialInfo?.specialSections?.join(', ') || '',
        signatureFeatures: fullPublication.editorialInfo?.signatureFeatures?.join(', ') || '',
        ownershipType: fullPublication.businessInfo?.ownershipType || '',
        parentCompany: fullPublication.businessInfo?.parentCompany || '',
        yearsInOperation: fullPublication.businessInfo?.yearsInOperation || 0,
        numberOfEmployees: fullPublication.businessInfo?.numberOfEmployees || 0,
        topAdvertiserCategories: fullPublication.businessInfo?.topAdvertiserCategories?.join(', ') || '',
        uniqueValueProposition: fullPublication.competitiveInfo?.uniqueValueProposition || '',
        keyDifferentiators: fullPublication.competitiveInfo?.keyDifferentiators?.join(', ') || '',
        competitiveAdvantages: fullPublication.competitiveInfo?.competitiveAdvantages?.join(', ') || '',
        facebookUrl: fullPublication.socialMediaProfiles?.find(p => p.platform === 'facebook')?.url || '',
        facebookFollowers: fullPublication.socialMediaProfiles?.find(p => p.platform === 'facebook')?.metrics?.followers || 0,
        instagramUrl: fullPublication.socialMediaProfiles?.find(p => p.platform === 'instagram')?.url || '',
        instagramFollowers: fullPublication.socialMediaProfiles?.find(p => p.platform === 'instagram')?.metrics?.followers || 0,
        twitterUrl: fullPublication.socialMediaProfiles?.find(p => p.platform === 'twitter')?.url || '',
        twitterFollowers: fullPublication.socialMediaProfiles?.find(p => p.platform === 'twitter')?.metrics?.followers || 0,
        linkedinUrl: fullPublication.socialMediaProfiles?.find(p => p.platform === 'linkedin')?.url || '',
        monthlyVisitors: fullPublication.distributionChannels?.website?.metrics?.monthlyVisitors || 0,
        monthlyPageViews: fullPublication.distributionChannels?.website?.metrics?.monthlyPageViews || 0,
        averageSessionDuration: fullPublication.distributionChannels?.website?.metrics?.averageSessionDuration || 0,
        pagesPerSession: fullPublication.distributionChannels?.website?.metrics?.pagesPerSession || 0,
        bounceRate: fullPublication.distributionChannels?.website?.metrics?.bounceRate || 0,
        mobilePercentage: fullPublication.distributionChannels?.website?.metrics?.mobilePercentage || 0,
        printFrequency: fullPublication.distributionChannels?.print?.frequency || '',
        circulation: fullPublication.distributionChannels?.print?.circulation || 0,
        paidCirculation: fullPublication.distributionChannels?.print?.paidCirculation || 0,
        freeCirculation: fullPublication.distributionChannels?.print?.freeCirculation || 0,
        distributionArea: fullPublication.distributionChannels?.print?.distributionArea || '',
        newsletterSubscribers: fullPublication.distributionChannels?.newsletters?.[0]?.subscribers || 0,
        newsletterOpenRate: fullPublication.distributionChannels?.newsletters?.[0]?.openRate || 0,
        verificationStatus: fullPublication.metadata?.verificationStatus || 'needs_verification',
        dataCompleteness: fullPublication.metadata?.dataCompleteness || 0
      });
      
    } catch (error) {
      console.error('Error fetching publication details:', error);
      toast.error('Failed to load publication details for editing');
      // Fall back to basic data
      setFormData({
        publicationName: publication.name || '',
        websiteUrl: publication.website || '',
        founded: publication.founded?.toString() || '',
        publicationType: publication.type || '',
        contentType: publication.contentType || '',
        headquarters: '',
        geographicCoverage: publication.geographicCoverage || '',
        primaryServiceArea: publication.primaryServiceArea || '',
        secondaryMarkets: '',
        numberOfPublications: 1,
        mainPhone: '',
        businessHours: '',
        salesContactName: '',
        salesContactEmail: '',
        salesContactPhone: '',
        editorialContactName: '',
        editorialContactEmail: '',
        generalManagerName: '',
        generalManagerEmail: '',
        totalAudience: publication.audienceDemographics?.totalAudience || 0,
        ageGroup25_34: 0,
        ageGroup35_44: 0,
        ageGroup45_54: 0,
        ageGroup55_64: 0,
        ageGroup65Plus: 0,
        genderMale: 0,
        genderFemale: 0,
        income50k_75k: 0,
        income75k_100k: 0,
        income100k_150k: 0,
        incomeOver150k: 0,
        educationBachelors: 0,
        educationGraduate: 0,
        targetMarkets: publication.audienceDemographics?.targetMarkets?.join(', ') || '',
        interests: '',
        contentFocus: '',
        contentPillars: '',
        specialSections: '',
        signatureFeatures: '',
        ownershipType: publication.businessInfo?.ownershipType || '',
        parentCompany: '',
        yearsInOperation: publication.businessInfo?.yearsInOperation || 0,
        numberOfEmployees: publication.businessInfo?.numberOfEmployees || 0,
        topAdvertiserCategories: '',
        uniqueValueProposition: '',
        keyDifferentiators: '',
        competitiveAdvantages: '',
        facebookUrl: '',
        facebookFollowers: 0,
        instagramUrl: '',
        instagramFollowers: 0,
        twitterUrl: '',
        twitterFollowers: 0,
        linkedinUrl: '',
        monthlyVisitors: 0,
        monthlyPageViews: 0,
        averageSessionDuration: 0,
        pagesPerSession: 0,
        bounceRate: 0,
        mobilePercentage: 0,
        printFrequency: '',
        circulation: 0,
        paidCirculation: 0,
        freeCirculation: 0,
        distributionArea: '',
        newsletterSubscribers: 0,
        newsletterOpenRate: 0,
        verificationStatus: 'needs_verification',
        dataCompleteness: 0
      });
    }
    
    setShowForm(true);
  };

  const handleDelete = async (publication: any) => {
    if (confirm(`Are you sure you want to delete "${publication.name}"?`)) {
      try {
        await deletePublication(publication.id);
        toast.success('Publication deleted successfully');
        refetch();
      } catch (error) {
        console.error('Error deleting publication:', error);
        toast.error('Failed to delete publication');
      }
    }
  };

  const filteredPublications = publications.filter(publication => {
    const matchesSearch = !searchTerm || publication.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || publication.type === filterType;
    const matchesContent = filterContent === 'all' || publication.contentType === filterContent;
    return matchesSearch && matchesType && matchesContent;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading publications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading publications: {error}
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Publications Management</h2>
          <p className="text-muted-foreground">Comprehensive publication data management ({publications.length} publications loaded)</p>
        </div>
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
                {editingPublication ? 'Edit Publication' : 'Add New Publication'}
              </DialogTitle>
              <DialogDescription>
                Complete publication information with comprehensive data fields
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="basic" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Contact
                </TabsTrigger>
                <TabsTrigger value="audience" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Audience
                </TabsTrigger>
                <TabsTrigger value="editorial" className="flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  Editorial
                </TabsTrigger>
                <TabsTrigger value="distribution" className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  Distribution
                </TabsTrigger>
                <TabsTrigger value="business" className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="competitive" className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Competitive
                </TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publicationName">Publication Name *</Label>
                    <Input
                      id="publicationName"
                      value={formData.publicationName}
                      onChange={(e) => setFormData({ ...formData, publicationName: e.target.value })}
                      placeholder="Chicago Tribune"
                      required
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
                  <div>
                    <Label htmlFor="founded">Founded</Label>
                    <Input
                      id="founded"
                      value={formData.founded}
                      onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                      placeholder="1847"
                    />
                  </div>
                  <div>
                    <Label htmlFor="publicationType">Publication Type</Label>
                    <Select value={formData.publicationType} onValueChange={(value) => setFormData({ ...formData, publicationType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICATION_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
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
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
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
                        {GEOGRAPHIC_COVERAGE.map(coverage => (
                          <SelectItem key={coverage} value={coverage}>
                            {coverage.charAt(0).toUpperCase() + coverage.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div>
                    <Label htmlFor="secondaryMarkets">Secondary Markets (comma-separated)</Label>
                    <Input
                      id="secondaryMarkets"
                      value={formData.secondaryMarkets}
                      onChange={(e) => setFormData({ ...formData, secondaryMarkets: e.target.value })}
                      placeholder="Suburbs, Nearby counties"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfPublications">Number of Publications</Label>
                    <Input
                      id="numberOfPublications"
                      type="number"
                      value={formData.numberOfPublications}
                      onChange={(e) => setFormData({ ...formData, numberOfPublications: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Contact Info Tab */}
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
                      placeholder="Monday-Friday 9AM-5PM"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Sales Contact</h4>
                <div className="grid grid-cols-3 gap-4">
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
                
                <Separator />
                <h4 className="font-medium">Editorial Contact</h4>
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
                    <Label htmlFor="editorialContactEmail">Email</Label>
                    <Input
                      id="editorialContactEmail"
                      type="email"
                      value={formData.editorialContactEmail}
                      onChange={(e) => setFormData({ ...formData, editorialContactEmail: e.target.value })}
                      placeholder="editor@example.com"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Management</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="generalManagerName">General Manager</Label>
                    <Input
                      id="generalManagerName"
                      value={formData.generalManagerName}
                      onChange={(e) => setFormData({ ...formData, generalManagerName: e.target.value })}
                      placeholder="Manager Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="generalManagerEmail">GM Email</Label>
                    <Input
                      id="generalManagerEmail"
                      type="email"
                      value={formData.generalManagerEmail}
                      onChange={(e) => setFormData({ ...formData, generalManagerEmail: e.target.value })}
                      placeholder="gm@example.com"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Audience Demographics Tab */}
              <TabsContent value="audience" className="space-y-4">
                <div>
                  <Label htmlFor="totalAudience">Total Audience</Label>
                  <Input
                    id="totalAudience"
                    type="number"
                    value={formData.totalAudience}
                    onChange={(e) => setFormData({ ...formData, totalAudience: parseInt(e.target.value) || 0 })}
                    placeholder="1000000"
                  />
                </div>
                
                <Separator />
                <h4 className="font-medium">Age Groups (%)</h4>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="ageGroup25_34">25-34</Label>
                    <Input
                      id="ageGroup25_34"
                      type="number"
                      value={formData.ageGroup25_34}
                      onChange={(e) => setFormData({ ...formData, ageGroup25_34: parseInt(e.target.value) || 0 })}
                      placeholder="25"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageGroup35_44">35-44</Label>
                    <Input
                      id="ageGroup35_44"
                      type="number"
                      value={formData.ageGroup35_44}
                      onChange={(e) => setFormData({ ...formData, ageGroup35_44: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageGroup45_54">45-54</Label>
                    <Input
                      id="ageGroup45_54"
                      type="number"
                      value={formData.ageGroup45_54}
                      onChange={(e) => setFormData({ ...formData, ageGroup45_54: parseInt(e.target.value) || 0 })}
                      placeholder="25"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageGroup55_64">55-64</Label>
                    <Input
                      id="ageGroup55_64"
                      type="number"
                      value={formData.ageGroup55_64}
                      onChange={(e) => setFormData({ ...formData, ageGroup55_64: parseInt(e.target.value) || 0 })}
                      placeholder="15"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageGroup65Plus">65+</Label>
                    <Input
                      id="ageGroup65Plus"
                      type="number"
                      value={formData.ageGroup65Plus}
                      onChange={(e) => setFormData({ ...formData, ageGroup65Plus: parseInt(e.target.value) || 0 })}
                      placeholder="5"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Gender (%)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genderMale">Male</Label>
                    <Input
                      id="genderMale"
                      type="number"
                      value={formData.genderMale}
                      onChange={(e) => setFormData({ ...formData, genderMale: parseInt(e.target.value) || 0 })}
                      placeholder="50"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="genderFemale">Female</Label>
                    <Input
                      id="genderFemale"
                      type="number"
                      value={formData.genderFemale}
                      onChange={(e) => setFormData({ ...formData, genderFemale: parseInt(e.target.value) || 0 })}
                      placeholder="50"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Household Income (%)</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="income50k_75k">$50k-75k</Label>
                    <Input
                      id="income50k_75k"
                      type="number"
                      value={formData.income50k_75k}
                      onChange={(e) => setFormData({ ...formData, income50k_75k: parseInt(e.target.value) || 0 })}
                      placeholder="25"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="income75k_100k">$75k-100k</Label>
                    <Input
                      id="income75k_100k"
                      type="number"
                      value={formData.income75k_100k}
                      onChange={(e) => setFormData({ ...formData, income75k_100k: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="income100k_150k">$100k-150k</Label>
                    <Input
                      id="income100k_150k"
                      type="number"
                      value={formData.income100k_150k}
                      onChange={(e) => setFormData({ ...formData, income100k_150k: parseInt(e.target.value) || 0 })}
                      placeholder="25"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="incomeOver150k">$150k+</Label>
                    <Input
                      id="incomeOver150k"
                      type="number"
                      value={formData.incomeOver150k}
                      onChange={(e) => setFormData({ ...formData, incomeOver150k: parseInt(e.target.value) || 0 })}
                      placeholder="20"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Education (%)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="educationBachelors">Bachelor's Degree</Label>
                    <Input
                      id="educationBachelors"
                      type="number"
                      value={formData.educationBachelors}
                      onChange={(e) => setFormData({ ...formData, educationBachelors: parseInt(e.target.value) || 0 })}
                      placeholder="54"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="educationGraduate">Graduate Degree</Label>
                    <Input
                      id="educationGraduate"
                      type="number"
                      value={formData.educationGraduate}
                      onChange={(e) => setFormData({ ...formData, educationGraduate: parseInt(e.target.value) || 0 })}
                      placeholder="37"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetMarkets">Target Markets (comma-separated)</Label>
                    <Textarea
                      id="targetMarkets"
                      value={formData.targetMarkets}
                      onChange={(e) => setFormData({ ...formData, targetMarkets: e.target.value })}
                      placeholder="Educated professionals, Cultural enthusiasts, Local business supporters"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                    <Textarea
                      id="interests"
                      value={formData.interests}
                      onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                      placeholder="Politics & Government, Arts & Culture, Food & Drink"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Editorial Info Tab */}
              <TabsContent value="editorial" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contentFocus">Content Focus (comma-separated)</Label>
                    <Textarea
                      id="contentFocus"
                      value={formData.contentFocus}
                      onChange={(e) => setFormData({ ...formData, contentFocus: e.target.value })}
                      placeholder="Politics & Government, Arts & Culture, Local News"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contentPillars">Content Pillars (comma-separated)</Label>
                    <Textarea
                      id="contentPillars"
                      value={formData.contentPillars}
                      onChange={(e) => setFormData({ ...formData, contentPillars: e.target.value })}
                      placeholder="Investigative journalism, Cultural coverage, Community events"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialSections">Special Sections (comma-separated)</Label>
                    <Textarea
                      id="specialSections"
                      value={formData.specialSections}
                      onChange={(e) => setFormData({ ...formData, specialSections: e.target.value })}
                      placeholder="Sports, Business, Entertainment, Opinion"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signatureFeatures">Signature Features (comma-separated)</Label>
                    <Textarea
                      id="signatureFeatures"
                      value={formData.signatureFeatures}
                      onChange={(e) => setFormData({ ...formData, signatureFeatures: e.target.value })}
                      placeholder="Political endorsements, Restaurant reviews, Event listings"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Distribution Channels Tab */}
              <TabsContent value="distribution" className="space-y-4">
                <h4 className="font-medium">Website Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="monthlyVisitors">Monthly Visitors</Label>
                    <Input
                      id="monthlyVisitors"
                      type="number"
                      value={formData.monthlyVisitors}
                      onChange={(e) => setFormData({ ...formData, monthlyVisitors: parseInt(e.target.value) || 0 })}
                      placeholder="730000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlyPageViews">Monthly Page Views</Label>
                    <Input
                      id="monthlyPageViews"
                      type="number"
                      value={formData.monthlyPageViews}
                      onChange={(e) => setFormData({ ...formData, monthlyPageViews: parseInt(e.target.value) || 0 })}
                      placeholder="2500000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="averageSessionDuration">Avg Session Duration (min)</Label>
                    <Input
                      id="averageSessionDuration"
                      type="number"
                      step="0.1"
                      value={formData.averageSessionDuration}
                      onChange={(e) => setFormData({ ...formData, averageSessionDuration: parseFloat(e.target.value) || 0 })}
                      placeholder="3.2"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pagesPerSession">Pages per Session</Label>
                    <Input
                      id="pagesPerSession"
                      type="number"
                      step="0.1"
                      value={formData.pagesPerSession}
                      onChange={(e) => setFormData({ ...formData, pagesPerSession: parseFloat(e.target.value) || 0 })}
                      placeholder="2.8"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bounceRate">Bounce Rate (%)</Label>
                    <Input
                      id="bounceRate"
                      type="number"
                      value={formData.bounceRate}
                      onChange={(e) => setFormData({ ...formData, bounceRate: parseInt(e.target.value) || 0 })}
                      placeholder="45"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobilePercentage">Mobile Traffic (%)</Label>
                    <Input
                      id="mobilePercentage"
                      type="number"
                      value={formData.mobilePercentage}
                      onChange={(e) => setFormData({ ...formData, mobilePercentage: parseInt(e.target.value) || 0 })}
                      placeholder="68"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Print Distribution</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="printFrequency">Print Frequency</Label>
                    <Select value={formData.printFrequency} onValueChange={(value) => setFormData({ ...formData, printFrequency: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_FREQUENCIES.map(freq => (
                          <SelectItem key={freq} value={freq}>
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="circulation">Total Circulation</Label>
                    <Input
                      id="circulation"
                      type="number"
                      value={formData.circulation}
                      onChange={(e) => setFormData({ ...formData, circulation: parseInt(e.target.value) || 0 })}
                      placeholder="25000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paidCirculation">Paid Circulation</Label>
                    <Input
                      id="paidCirculation"
                      type="number"
                      value={formData.paidCirculation}
                      onChange={(e) => setFormData({ ...formData, paidCirculation: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freeCirculation">Free Circulation</Label>
                    <Input
                      id="freeCirculation"
                      type="number"
                      value={formData.freeCirculation}
                      onChange={(e) => setFormData({ ...formData, freeCirculation: parseInt(e.target.value) || 0 })}
                      placeholder="25000"
                      min="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="distributionArea">Distribution Area</Label>
                    <Input
                      id="distributionArea"
                      value={formData.distributionArea}
                      onChange={(e) => setFormData({ ...formData, distributionArea: e.target.value })}
                      placeholder="Portland Metro Area"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Newsletter</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newsletterSubscribers">Newsletter Subscribers</Label>
                    <Input
                      id="newsletterSubscribers"
                      type="number"
                      value={formData.newsletterSubscribers}
                      onChange={(e) => setFormData({ ...formData, newsletterSubscribers: parseInt(e.target.value) || 0 })}
                      placeholder="89000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newsletterOpenRate">Newsletter Open Rate (%)</Label>
                    <Input
                      id="newsletterOpenRate"
                      type="number"
                      value={formData.newsletterOpenRate}
                      onChange={(e) => setFormData({ ...formData, newsletterOpenRate: parseInt(e.target.value) || 0 })}
                      placeholder="40"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <Separator />
                <h4 className="font-medium">Social Media</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/publication"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookFollowers">Facebook Followers</Label>
                    <Input
                      id="facebookFollowers"
                      type="number"
                      value={formData.facebookFollowers}
                      onChange={(e) => setFormData({ ...formData, facebookFollowers: parseInt(e.target.value) || 0 })}
                      placeholder="103000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                    <Input
                      id="instagramUrl"
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/publication"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagramFollowers">Instagram Followers</Label>
                    <Input
                      id="instagramFollowers"
                      type="number"
                      value={formData.instagramFollowers}
                      onChange={(e) => setFormData({ ...formData, instagramFollowers: parseInt(e.target.value) || 0 })}
                      placeholder="81000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterUrl">Twitter URL</Label>
                    <Input
                      id="twitterUrl"
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      placeholder="https://twitter.com/publication"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterFollowers">Twitter Followers</Label>
                    <Input
                      id="twitterFollowers"
                      type="number"
                      value={formData.twitterFollowers}
                      onChange={(e) => setFormData({ ...formData, twitterFollowers: parseInt(e.target.value) || 0 })}
                      placeholder="211000"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/company/publication"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Business Info Tab */}
              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ownershipType">Ownership Type</Label>
                    <Select value={formData.ownershipType} onValueChange={(value) => setFormData({ ...formData, ownershipType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ownership type" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="parentCompany">Parent Company</Label>
                    <Input
                      id="parentCompany"
                      value={formData.parentCompany}
                      onChange={(e) => setFormData({ ...formData, parentCompany: e.target.value })}
                      placeholder="Tribune Publishing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearsInOperation">Years in Operation</Label>
                    <Input
                      id="yearsInOperation"
                      type="number"
                      value={formData.yearsInOperation}
                      onChange={(e) => setFormData({ ...formData, yearsInOperation: parseInt(e.target.value) || 0 })}
                      placeholder="50"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                    <Input
                      id="numberOfEmployees"
                      type="number"
                      value={formData.numberOfEmployees}
                      onChange={(e) => setFormData({ ...formData, numberOfEmployees: parseInt(e.target.value) || 0 })}
                      placeholder="150"
                      min="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="topAdvertiserCategories">Top Advertiser Categories (comma-separated)</Label>
                  <Textarea
                    id="topAdvertiserCategories"
                    value={formData.topAdvertiserCategories}
                    onChange={(e) => setFormData({ ...formData, topAdvertiserCategories: e.target.value })}
                    placeholder="Restaurants & Bars, Arts & Entertainment, Retail, Events"
                    rows={3}
                  />
                </div>
                
                <Separator />
                <h4 className="font-medium">Competitive Information</h4>
                <div>
                  <Label htmlFor="uniqueValueProposition">Unique Value Proposition</Label>
                  <Textarea
                    id="uniqueValueProposition"
                    value={formData.uniqueValueProposition}
                    onChange={(e) => setFormData({ ...formData, uniqueValueProposition: e.target.value })}
                    placeholder="Chicago's only Pulitzer Prize-winning alternative weekly with 50 years of trusted journalism"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyDifferentiators">Key Differentiators (comma-separated)</Label>
                    <Textarea
                      id="keyDifferentiators"
                      value={formData.keyDifferentiators}
                      onChange={(e) => setFormData({ ...formData, keyDifferentiators: e.target.value })}
                      placeholder="Investigative journalism, Community focus, Digital innovation"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="competitiveAdvantages">Competitive Advantages (comma-separated)</Label>
                    <Textarea
                      id="competitiveAdvantages"
                      value={formData.competitiveAdvantages}
                      onChange={(e) => setFormData({ ...formData, competitiveAdvantages: e.target.value })}
                      placeholder="Trusted independent voice, Premium educated audience"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Competitive Info Tab */}
              <TabsContent value="competitive" className="space-y-4">
                <div>
                  <Label htmlFor="uniqueValueProposition">Unique Value Proposition</Label>
                  <Textarea
                    id="uniqueValueProposition"
                    value={formData.uniqueValueProposition}
                    onChange={(e) => setFormData({ ...formData, uniqueValueProposition: e.target.value })}
                    placeholder="Portland's only Pulitzer Prize-winning alternative weekly with 50 years of trusted journalism"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyDifferentiators">Key Differentiators (comma-separated)</Label>
                    <Textarea
                      id="keyDifferentiators"
                      value={formData.keyDifferentiators}
                      onChange={(e) => setFormData({ ...formData, keyDifferentiators: e.target.value })}
                      placeholder="Investigative journalism, Community focus, Digital innovation"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="competitiveAdvantages">Competitive Advantages (comma-separated)</Label>
                    <Textarea
                      id="competitiveAdvantages"
                      value={formData.competitiveAdvantages}
                      onChange={(e) => setFormData({ ...formData, competitiveAdvantages: e.target.value })}
                      placeholder="Trusted independent voice, Premium educated audience"
                      rows={4}
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

      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search publications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.name} ({type.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterContent} onValueChange={setFilterContent}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by content" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Publications List */}
      <div className="grid gap-4">
        {filteredPublications.map((publication) => (
          <Card key={publication._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{publication.name}</h3>
                    <Badge variant={publication.metadata?.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                      {publication.metadata?.verificationStatus?.replace('_', ' ') || 'needs verification'}
                    </Badge>
                    {publication.website && (
                      <a 
                        href={publication.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {publication.type || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {publication.contentType || 'Mixed'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {publication.geographicCoverage || 'Local'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {publication.audienceDemographics?.totalAudience?.toLocaleString() || 'Unknown'} audience
                    </div>
                  </div>
                  
                  {publication.businessInfo?.uniqueValueProposition && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {publication.businessInfo.uniqueValueProposition}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPublication(publication)}>
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(publication)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(publication)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Publication Details Modal */}
      {selectedPublication && (
        <Dialog open={!!selectedPublication} onOpenChange={() => setSelectedPublication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedPublication.name}
                <Badge variant={selectedPublication.metadata?.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                  {selectedPublication.metadata?.verificationStatus?.replace('_', ' ') || 'needs verification'}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Comprehensive publication information
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <dl className="space-y-1 text-sm">
                  <div><dt className="inline font-medium">Type:</dt> <dd className="inline ml-1">{selectedPublication.type}</dd></div>
                  <div><dt className="inline font-medium">Content:</dt> <dd className="inline ml-1">{selectedPublication.contentType}</dd></div>
                  <div><dt className="inline font-medium">Founded:</dt> <dd className="inline ml-1">{selectedPublication.founded}</dd></div>
                  <div><dt className="inline font-medium">Coverage:</dt> <dd className="inline ml-1">{selectedPublication.geographicCoverage}</dd></div>
                  <div><dt className="inline font-medium">Service Area:</dt> <dd className="inline ml-1">{selectedPublication.primaryServiceArea}</dd></div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <dl className="space-y-1 text-sm">
                  <div><dt className="inline font-medium">Phone:</dt> <dd className="inline ml-1">{selectedPublication.contactInfo?.mainPhone || 'N/A'}</dd></div>
                  <div><dt className="inline font-medium">Sales:</dt> <dd className="inline ml-1">{selectedPublication.contactInfo?.salesContact?.email || 'N/A'}</dd></div>
                  <div><dt className="inline font-medium">Editorial:</dt> <dd className="inline ml-1">{selectedPublication.contactInfo?.editorialContact?.email || 'N/A'}</dd></div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Audience</h4>
                <dl className="space-y-1 text-sm">
                  <div><dt className="inline font-medium">Total:</dt> <dd className="inline ml-1">{selectedPublication.audienceDemographics?.totalAudience?.toLocaleString() || 'N/A'}</dd></div>
                  <div><dt className="inline font-medium">Markets:</dt> <dd className="inline ml-1">{selectedPublication.audienceDemographics?.targetMarkets?.join(', ') || 'N/A'}</dd></div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Digital Presence</h4>
                <dl className="space-y-1 text-sm">
                  <div><dt className="inline font-medium">Website:</dt> <dd className="inline ml-1">{selectedPublication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || 'N/A'} monthly visitors</dd></div>
                  <div><dt className="inline font-medium">Social:</dt> <dd className="inline ml-1">{selectedPublication.socialMediaProfiles?.length || 0} platforms</dd></div>
                </dl>
              </div>
            </div>
            
            {selectedPublication.businessInfo?.uniqueValueProposition && (
              <div>
                <h4 className="font-semibold mb-2">Value Proposition</h4>
                <p className="text-sm text-gray-600">{selectedPublication.businessInfo.uniqueValueProposition}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {filteredPublications.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No publications found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};
