import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronRight,
  ChevronLeft,
  Save,
  X,
  Plus,
  Trash2,
  DollarSign,
  Users,
  MapPin,
  Package,
  Sparkles,
  Target,
  TrendingUp,
  Check,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HubPackageInsert, PACKAGE_CATEGORIES } from '@/integrations/mongodb/hubPackageSchema';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

interface PackageBuilderFormProps {
  onSuccess: (packageId: string) => void;
  onCancel: () => void;
  existingPackage?: any; // For editing existing packages
}

interface Publication {
  _id: string;
  publicationId: string;
  basicInfo: {
    publicationName: string;
  };
  distributionChannels?: {
    website?: {
      advertisingOpportunities?: Array<{
        adId: string;
        title: string;
        adType: string;
        placement?: string;
      }>;
    };
    newsletters?: Array<{
      name: string;
      advertisingOpportunities?: Array<{
        adId: string;
        title: string;
        adType: string;
        placement?: string;
      }>;
    }>;
    print?: {
      advertisingOpportunities?: Array<{
        adId: string;
        title: string;
        adType: string;
        size?: string;
      }>;
    };
    socialMedia?: Array<{
      platform: string;
      advertisingOpportunities?: Array<{
        adId: string;
        name: string;
        adFormat: string;
      }>;
    }>;
    podcasts?: Array<{
      name: string;
      advertisingOpportunities?: Array<{
        adId?: string;
        name: string;
        adFormat: string;
      }>;
    }>;
    radioStations?: Array<{
      callSign: string;
      advertisingOpportunities?: Array<{
        adId?: string;
        name: string;
        adFormat: string;
      }>;
    }>;
  };
}

interface FlattenedAd {
  adId: string;
  channel: string;
  title: string;
  adType: string;
  placement?: string;
}

// Helper function to flatten all advertising opportunities from nested structure
const flattenAdvertisingOpportunities = (pub: Publication): FlattenedAd[] => {
  const ads: FlattenedAd[] = [];
  const channels = pub.distributionChannels;
  
  if (!channels) return ads;
  
  // Website ads
  if (channels.website?.advertisingOpportunities) {
    channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
      ads.push({
        adId: ad.adId || `${pub._id}-website-${idx}`,
        channel: 'website',
        title: ad.title || ad.name || ad.adType || 'Website Ad',
        adType: ad.adType || 'banner',
        placement: ad.placement || ad.size
      });
    });
  }
  
  // Newsletter ads
  if (channels.newsletters) {
    channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
      newsletter.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
        const adTitle = ad.title || ad.name || ad.adType || 'Newsletter Ad';
        ads.push({
          adId: ad.adId || `${pub._id}-newsletter-${nlIdx}-${adIdx}`,
          channel: 'newsletter',
          title: `${newsletter.name || 'Newsletter'} - ${adTitle}`,
          adType: ad.adType || ad.adFormat || 'email-ad',
          placement: ad.placement || ad.position
        });
      });
    });
  }
  
  // Print ads
  if (channels.print?.advertisingOpportunities) {
    channels.print.advertisingOpportunities.forEach((ad: any, idx: number) => {
      ads.push({
        adId: ad.adId || `${pub._id}-print-${idx}`,
        channel: 'print',
        title: ad.title || ad.name || ad.size || 'Print Ad',
        adType: ad.adType || ad.size || 'print-ad',
        placement: ad.size || ad.placement
      });
    });
  }
  
  // Social media ads
  if (channels.socialMedia) {
    channels.socialMedia.forEach((social: any, socIdx: number) => {
      social.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
        ads.push({
          adId: ad.adId || `${pub._id}-social-${socIdx}-${adIdx}`,
          channel: 'social',
          title: `${social.platform || 'Social'} - ${ad.name || ad.title || ad.adFormat}`,
          adType: ad.adFormat || ad.adType || 'sponsored-post',
          placement: social.platform
        });
      });
    });
  }
  
  // Podcast ads
  if (channels.podcasts) {
    channels.podcasts.forEach((podcast: any, podIdx: number) => {
      podcast.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
        const adName = ad.name || ad.title || ad.adFormat || 'Podcast Ad';
        ads.push({
          adId: ad.adId || `${pub._id}-podcast-${podIdx}-${adIdx}`,
          channel: 'podcast',
          title: `${podcast.name || 'Podcast'} - ${adName}`,
          adType: ad.adFormat || ad.adType || 'pre-roll',
          placement: ad.name || ad.title
        });
      });
    });
  }
  
  // Radio ads
  if (channels.radioStations) {
    channels.radioStations.forEach((station: any, stationIdx: number) => {
      station.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
        const adName = ad.name || ad.title || ad.adFormat || 'Radio Spot';
        ads.push({
          adId: ad.adId || `${pub._id}-radio-${stationIdx}-${adIdx}`,
          channel: 'radio',
          title: `${station.callSign || 'Radio'} - ${adName}`,
          adType: ad.adFormat || ad.adType || '30-second',
          placement: station.callSign
        });
      });
    });
  }
  
  return ads;
};

export const PackageBuilderForm = ({ onSuccess, onCancel, existingPackage }: PackageBuilderFormProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPublications, setLoadingPublications] = useState(true);

  // Form state
  const [formData, setFormData] = useState<Partial<HubPackageInsert>>({
    packageId: '',
    basicInfo: {
      name: '',
      tagline: '',
      description: '',
      category: 'geographic',
      subcategory: ''
    },
    hubInfo: {
      hubId: 'chicago-hub',
      hubName: 'Chicago Hub',
      isHubExclusive: true
    },
    targeting: {
      geographicTarget: {
        dmas: ['chicago-il'],
        neighborhoods: [],
        coverageDescription: ''
      },
      demographicTarget: {
        ageRanges: [],
        incomeRanges: [],
        interests: []
      },
      businessTarget: {
        industries: [],
        businessSizes: [],
        objectives: []
      }
    },
    components: {
      publications: [],
      totalPublications: 0,
      channels: [],
      inventorySummary: ''
    },
    pricing: {
      breakdown: {
        basePrice: 0,
        hubDiscount: 0,
        finalPrice: 0,
        discountPercentage: 0,
        currency: 'USD',
        billingCycle: 'monthly'
      },
      tiers: [],
      paymentOptions: ['credit-card', 'invoice']
    },
    performance: {
      estimatedReach: 0,
      estimatedImpressions: 0,
      estimatedCTR: 2.0,
      estimatedCPC: 1.5,
      estimatedCPM: 15.0
    },
    features: {
      highlights: [],
      includes: []
    },
    campaignDetails: {
      duration: {
        minimum: 1,
        recommended: 3,
        unit: 'months'
      },
      timeline: {
        setupTime: '3-5 business days',
        launchDate: 'flexible',
        bookingDeadline: '5 business days before launch'
      }
    },
    creativeRequirements: {
      formats: ['jpg', 'png', 'gif'],
      specs: [],
      designSupport: 'Available upon request'
    },
    useCases: {
      idealFor: [],
      examples: []
    },
    availability: {
      isActive: true,
      isFeatured: false,
      availableSlots: 10,
      nextAvailableDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    marketing: {
      displayOrder: 999,
      badge: '',
      tags: []
    }
  });

  // Selected publications and inventory
  const [selectedPublications, setSelectedPublications] = useState<{
    [pubId: string]: {
      selected: boolean;
      inventoryItems: string[]; // array of adIds
    }
  }>({});
  
  // UI state for inventory step
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [showSummary, setShowSummary] = useState(true);

  // Populate form when editing existing package
  useEffect(() => {
    if (existingPackage) {
      setFormData({
        packageId: existingPackage.packageId,
        basicInfo: existingPackage.basicInfo,
        hubInfo: existingPackage.hubInfo,
        targeting: existingPackage.targeting,
        components: existingPackage.components,
        pricing: existingPackage.pricing,
        performance: existingPackage.performance,
        features: existingPackage.features,
        campaignDetails: existingPackage.campaignDetails,
        creativeRequirements: existingPackage.creativeRequirements,
        useCases: existingPackage.useCases,
        availability: existingPackage.availability,
        marketing: existingPackage.marketing
      });

      // Populate selected publications and inventory
      // Note: We need to wait for publications to load to match publicationId to _id
      // This will be set after publications are fetched
      const selections: typeof selectedPublications = {};
      existingPackage.components.publications.forEach(pub => {
        // Store temporarily by publicationId, will be converted after fetch
        selections[pub.publicationId] = {
          selected: true,
          inventoryItems: pub.inventoryItems.map(item => item.inventoryId)
        };
      });
      // Store in a temp state variable that we'll use after publications load
      setSelectedPublications(selections);
    }
  }, [existingPackage]);

  // Fetch publications
  useEffect(() => {
    fetchPublications();
  }, []);

  // Convert publicationId keys to _id keys after publications load (for edit mode)
  useEffect(() => {
    if (existingPackage && publications.length > 0) {
      const selections: typeof selectedPublications = {};
      
      existingPackage.components.publications.forEach(pkgPub => {
        // Find the matching publication by publicationId
        const matchingPub = publications.find(p => p.publicationId === pkgPub.publicationId);
        
        if (matchingPub) {
          // Use the _id as the key
          selections[matchingPub._id] = {
            selected: true,
            inventoryItems: pkgPub.inventoryItems.map(item => item.inventoryId)
          };
        }
      });
      
      setSelectedPublications(selections);
    }
  }, [existingPackage, publications]);

  const fetchPublications = async () => {
    setLoadingPublications(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/publications`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch publications');
      const data = await response.json();
      setPublications(data);
    } catch (error) {
      console.error('Error fetching publications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load publications',
        variant: 'destructive'
      });
    } finally {
      setLoadingPublications(false);
    }
  };

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        ...data
      }
    }));
  };

  const togglePublication = (pubId: string, publicationId: string) => {
    setSelectedPublications(prev => ({
      ...prev,
      [pubId]: {
        selected: !prev[pubId]?.selected,
        inventoryItems: prev[pubId]?.inventoryItems || []
      }
    }));
  };

  const toggleInventoryItem = (pubId: string, adId: string) => {
    setSelectedPublications(prev => {
      const current = prev[pubId] || { selected: false, inventoryItems: [] };
      const inventoryItems = current.inventoryItems.includes(adId)
        ? current.inventoryItems.filter(id => id !== adId)
        : [...current.inventoryItems, adId];
      
      return {
        ...prev,
        [pubId]: {
          selected: inventoryItems.length > 0,
          inventoryItems
        }
      };
    });
  };

  const calculatePricing = () => {
    // Simple pricing calculation based on selected inventory
    let basePrice = 0;
    
    Object.entries(selectedPublications).forEach(([pubId, data]) => {
      if (data.selected && data.inventoryItems.length > 0) {
        // Add $500 per inventory item as base
        basePrice += data.inventoryItems.length * 500;
      }
    });

    const discountPercentage = 25; // Default 25% hub discount
    const hubDiscount = Math.round(basePrice * (discountPercentage / 100));
    const finalPrice = basePrice - hubDiscount;

    return {
      basePrice,
      hubDiscount,
      finalPrice,
      discountPercentage
    };
  };

  const buildComponentsData = () => {
    const packagePublications = Object.entries(selectedPublications)
      .filter(([_, data]) => data.selected && data.inventoryItems.length > 0)
      .map(([pubId, data]) => {
        const pub = publications.find(p => p._id === pubId);
        if (!pub) return null;

        const allAds = flattenAdvertisingOpportunities(pub);

        return {
          publicationId: pub.publicationId,
          publicationName: pub.basicInfo.publicationName || 'Unknown',
          inventoryItems: data.inventoryItems.map(adId => {
            const ad = allAds.find(a => a.adId === adId);
            return {
              inventoryId: ad?.adId || '',
              channel: ad?.channel || 'website',
              itemType: ad?.adType || 'banner-ad',
              placement: ad?.placement || ad?.title || ''
            };
          }).filter(item => item.inventoryId)
        };
      })
      .filter(Boolean);

    const channels = [...new Set(
      packagePublications.flatMap(p => 
        p?.inventoryItems.map(i => i.channel) || []
      )
    )];

    return {
      publications: packagePublications,
      totalPublications: packagePublications.length,
      channels,
      inventorySummary: `${packagePublications.reduce((sum, p) => sum + (p?.inventoryItems.length || 0), 0)} placements across ${packagePublications.length} publications`
    };
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.basicInfo?.name) {
      toast({
        title: 'Validation Error',
        description: 'Package name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.packageId) {
      // Auto-generate packageId from name
      formData.packageId = formData.basicInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Build final package data
    const pricing = calculatePricing();
    const components = buildComponentsData();

    if (components.totalPublications === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one publication and inventory item',
        variant: 'destructive'
      });
      return;
    }

    const packageData: HubPackageInsert = {
      ...formData as HubPackageInsert,
      components,
      pricing: {
        ...formData.pricing!,
        breakdown: {
          ...formData.pricing!.breakdown,
          ...pricing,
          currency: 'USD',
          billingCycle: 'monthly'
        },
        tiers: [
          { duration: '1 month', pricePerMonth: pricing.finalPrice, totalPrice: pricing.finalPrice, savings: 0 },
          { duration: '3 months', pricePerMonth: Math.round(pricing.finalPrice * 0.95), totalPrice: Math.round(pricing.finalPrice * 0.95 * 3), savings: Math.round(pricing.finalPrice * 0.05 * 3) },
          { duration: '6 months', pricePerMonth: Math.round(pricing.finalPrice * 0.90), totalPrice: Math.round(pricing.finalPrice * 0.90 * 6), savings: Math.round(pricing.finalPrice * 0.10 * 6) }
        ]
      }
    };

    setLoading(true);
    try {
      const isEditing = !!existingPackage;
      const url = isEditing 
        ? `${API_BASE_URL}/api/admin/hub-packages/${existingPackage._id}`
        : `${API_BASE_URL}/api/admin/hub-packages`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(packageData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} package`);
      }

      const result = await response.json();
      toast({
        title: 'Success!',
        description: `Package ${isEditing ? 'updated' : 'created'} successfully`
      });
      onSuccess(result._id);
    } catch (error: any) {
      console.error(`Error ${existingPackage ? 'updating' : 'creating'} package:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${existingPackage ? 'update' : 'create'} package`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: Package },
    { number: 2, title: 'Targeting', icon: Target },
    { number: 3, title: 'Publications', icon: Users },
    { number: 4, title: 'Pricing & Details', icon: DollarSign },
    { number: 5, title: 'Review', icon: Check }
  ];

  const selectedPubCount = Object.values(selectedPublications).filter(p => p.selected).length;
  const selectedInventoryCount = Object.values(selectedPublications).reduce((sum, p) => sum + p.inventoryItems.length, 0);
  const pricing = calculatePricing();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Create New Package</h1>
          <p className="text-muted-foreground">Build a custom advertising package for Chicago Hub</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isComplete = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2
                      ${isActive ? 'border-primary bg-primary text-white' : ''}
                      ${isComplete ? 'border-green-500 bg-green-500 text-white' : ''}
                      ${!isActive && !isComplete ? 'border-gray-300 text-gray-400' : ''}
                    `}>
                      {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-16 mx-4 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Give your package a name and describe what it offers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                placeholder="e.g., South Side Essentials"
                value={formData.basicInfo?.name || ''}
                onChange={(e) => updateFormData('basicInfo', { name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline *</Label>
              <Input
                id="tagline"
                placeholder="e.g., Reach 50,000+ South Side residents"
                value={formData.basicInfo?.tagline || ''}
                onChange={(e) => updateFormData('basicInfo', { tagline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what makes this package valuable..."
                rows={4}
                value={formData.basicInfo?.description || ''}
                onChange={(e) => updateFormData('basicInfo', { description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.basicInfo?.category || 'geographic'}
                  onValueChange={(value) => updateFormData('basicInfo', { category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  placeholder="e.g., south-side, digital-only"
                  value={formData.basicInfo?.subcategory || ''}
                  onChange={(e) => updateFormData('basicInfo', { subcategory: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Targeting */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
            <CardDescription>Define who this package is designed for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Geographic Targeting
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="neighborhoods">Neighborhoods (comma-separated)</Label>
                <Textarea
                  id="neighborhoods"
                  placeholder="e.g., Hyde Park, Bronzeville, South Shore"
                  rows={2}
                  value={formData.targeting?.geographicTarget?.neighborhoods?.join(', ') || ''}
                  onChange={(e) => updateFormData('targeting', {
                    geographicTarget: {
                      ...formData.targeting?.geographicTarget,
                      neighborhoods: e.target.value.split(',').map(n => n.trim()).filter(Boolean)
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage Description</Label>
                <Input
                  id="coverage"
                  placeholder="e.g., Comprehensive South Side coverage"
                  value={formData.targeting?.geographicTarget?.coverageDescription || ''}
                  onChange={(e) => updateFormData('targeting', {
                    geographicTarget: {
                      ...formData.targeting?.geographicTarget,
                      coverageDescription: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="interests">Interests (comma-separated)</Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., local-news, community-events, dining"
                  rows={2}
                  value={formData.targeting?.demographicTarget?.interests?.join(', ') || ''}
                  onChange={(e) => updateFormData('targeting', {
                    demographicTarget: {
                      ...formData.targeting?.demographicTarget,
                      interests: e.target.value.split(',').map(i => i.trim()).filter(Boolean)
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industries">Target Industries (comma-separated)</Label>
                <Textarea
                  id="industries"
                  placeholder="e.g., retail, food-beverage, healthcare"
                  rows={2}
                  value={formData.targeting?.businessTarget?.industries?.join(', ') || ''}
                  onChange={(e) => updateFormData('targeting', {
                    businessTarget: {
                      ...formData.targeting?.businessTarget,
                      industries: e.target.value.split(',').map(i => i.trim()).filter(Boolean)
                    }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Publications & Inventory */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Compact Summary Bar */}
          {selectedPubCount > 0 && (
            <Card className="bg-primary/5 border-primary">
              <CardHeader 
                className="cursor-pointer py-3"
                onClick={() => setShowSummary(!showSummary)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <div>
                      <CardTitle className="text-sm">
                        {selectedPubCount} Publications, {selectedInventoryCount} Placements Selected
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewMode(viewMode === 'selected' ? 'all' : 'selected');
                      }}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      {viewMode === 'selected' ? 'Show All' : 'Selected Only'}
                    </Button>
                    {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              {showSummary && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {publications
                      .filter(pub => selectedPublications[pub._id]?.selected)
                      .map(pub => {
                        const selectedItems = selectedPublications[pub._id]?.inventoryItems || [];
                        return (
                          <Badge 
                            key={pub._id}
                            variant="secondary" 
                            className="text-xs px-2 py-1"
                          >
                            {pub.basicInfo.publicationName || 'Unknown'} ({selectedItems.length})
                            <X 
                              className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePublication(pub._id, pub.publicationId);
                              }}
                            />
                          </Badge>
                        );
                      })}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Search & Filter Bar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search publications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Publications List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {viewMode === 'selected' ? 'Selected Publications' : 'All Publications'}
                  </CardTitle>
                  <CardDescription>
                    {viewMode === 'selected' 
                      ? `${selectedPubCount} publications with selections`
                      : `${publications.length} publications available`
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPublications ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading publications...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publications
                    .filter(pub => {
                      // Filter by view mode first
                      if (viewMode === 'selected') {
                        if (!selectedPublications[pub._id]?.selected) {
                          return false;
                        }
                      }
                      
                      // Then filter by search query
                      if (searchQuery) {
                        const name = pub.basicInfo.publicationName || '';
                        return name.toLowerCase().includes(searchQuery.toLowerCase());
                      }
                      
                      return true;
                    })
                    .map(pub => {
                      const isSelected = selectedPublications[pub._id]?.selected;
                      const selectedItems = selectedPublications[pub._id]?.inventoryItems || [];
                      const availableInventory = flattenAdvertisingOpportunities(pub);

                      return (
                        <Card 
                          key={pub._id} 
                          className={`transition-all ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePublication(pub._id, pub.publicationId)}
                                />
                                <div className="flex-1">
                                  <h3 className="font-semibold text-sm">
                                    {pub.basicInfo.publicationName || 'Unknown Publication'}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {availableInventory.length} placements • 
                                    {selectedItems.length > 0 && (
                                      <span className="text-primary font-medium ml-1">
                                        {selectedItems.length} selected
                                      </span>
                                    )}
                                    {selectedItems.length === 0 && <span className="ml-1">none selected</span>}
                                  </p>
                                </div>
                              </div>
                              {isSelected && selectedItems.length > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {selectedItems.length}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          {isSelected && (
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium text-muted-foreground">
                                    AD PLACEMENTS
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => {
                                      // Select/deselect all items
                                      const allSelected = selectedItems.length === availableInventory.length;
                                      if (allSelected) {
                                        setSelectedPublications(prev => ({
                                          ...prev,
                                          [pub._id]: { selected: true, inventoryItems: [] }
                                        }));
                                      } else {
                                        setSelectedPublications(prev => ({
                                          ...prev,
                                          [pub._id]: { 
                                            selected: true, 
                                            inventoryItems: availableInventory.map(ad => ad.adId)
                                          }
                                        }));
                                      }
                                    }}
                                  >
                                    {selectedItems.length === availableInventory.length ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                  {availableInventory.map(ad => (
                                    <div 
                                      key={ad.adId} 
                                      className="flex items-center space-x-2 p-2 border rounded hover:bg-accent text-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={selectedItems.includes(ad.adId)}
                                        onCheckedChange={(checked) => {
                                          toggleInventoryItem(pub._id, ad.adId);
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{ad.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {ad.channel}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  {publications.filter(pub => {
                    // Filter by view mode first
                    if (viewMode === 'selected') {
                      if (!selectedPublications[pub._id]?.selected) {
                        return false;
                      }
                    }
                    
                    // Then filter by search query
                    if (searchQuery) {
                      const name = pub.basicInfo.publicationName || '';
                      return name.toLowerCase().includes(searchQuery.toLowerCase());
                    }
                    
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery 
                        ? 'No publications match your search' 
                        : viewMode === 'selected' 
                          ? 'No publications selected yet'
                          : 'No publications available'
                      }
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Pricing & Details */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Calculated based on selected inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="text-2xl font-bold">${pricing.basePrice.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Hub Discount ({pricing.discountPercentage}%)</p>
                  <p className="text-2xl font-bold text-green-600">-${pricing.hubDiscount.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                <p className="text-sm text-muted-foreground">Final Monthly Price</p>
                <p className="text-3xl font-bold text-primary">${pricing.finalPrice.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features & Highlights</CardTitle>
              <CardDescription>What makes this package special?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="highlights">Key Highlights (comma-separated)</Label>
                <Textarea
                  id="highlights"
                  placeholder="e.g., Multi-channel exposure, Premium placements, Dedicated support"
                  rows={3}
                  value={formData.features?.highlights?.join(', ') || ''}
                  onChange={(e) => updateFormData('features', {
                    highlights: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="includes">What's Included (comma-separated)</Label>
                <Textarea
                  id="includes"
                  placeholder="e.g., Monthly reports, A/B testing, Creative design support"
                  rows={3}
                  value={formData.features?.includes?.join(', ') || ''}
                  onChange={(e) => updateFormData('features', {
                    includes: e.target.value.split(',').map(i => i.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge">Package Badge (optional)</Label>
                <Input
                  id="badge"
                  placeholder="e.g., Most Popular, Best Value"
                  value={formData.marketing?.badge || ''}
                  onChange={(e) => updateFormData('marketing', { badge: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.availability?.isFeatured || false}
                  onCheckedChange={(checked) => updateFormData('availability', { isFeatured: checked })}
                />
                <Label htmlFor="featured">Feature this package on homepage</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Review your package before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{formData.basicInfo?.name}</h3>
              <p className="text-muted-foreground">{formData.basicInfo?.tagline}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Publications</p>
                <p className="text-2xl font-bold">{selectedPubCount}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ad Placements</p>
                <p className="text-2xl font-bold">{selectedInventoryCount}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Monthly Price</p>
                <p className="text-2xl font-bold text-primary">${pricing.finalPrice.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Selected Publications:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedPublications)
                  .filter(([_, data]) => data.selected)
                  .map(([pubId, data]) => {
                    const pub = publications.find(p => p._id === pubId);
                    return (
                      <Badge key={pubId} variant="secondary">
                        {pub?.basicInfo.name} ({data.inventoryItems.length} placements)
                      </Badge>
                    );
                  })}
              </div>
            </div>

            {formData.features?.highlights && formData.features.highlights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Key Features:</h4>
                <ul className="space-y-1">
                  {formData.features.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Ready to create?</p>
                <p className="text-sm text-blue-700">
                  This package will be created as active and visible to users immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1 || loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Package
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

