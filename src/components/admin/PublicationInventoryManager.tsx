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
  Plus, Edit, Trash2, Eye, DollarSign, Target, BarChart3, 
  Globe, Mail, Printer, Calendar, Package, Search,
  RefreshCw, Save, X, TrendingUp, Users
} from 'lucide-react';

import { usePublications } from '@/hooks/usePublications';
import { PublicationFrontend } from '@/types/publication';
import { getPublicationById } from '@/api/publications';

export const PublicationInventoryManager = () => {
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('');
  const [currentPublication, setCurrentPublication] = useState<PublicationFrontend | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('website');
  
  // Edit dialog states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingSubIndex, setEditingSubIndex] = useState<number>(-1); // for newsletter ads within newsletters

  const { publications, updatePublication } = usePublications();


  // Load full publication data when selected
  useEffect(() => {
    const loadPublicationData = async () => {
      if (!selectedPublicationId) {
        setCurrentPublication(null);
        return;
      }

      setLoading(true);
      
      try {
        const publicationData = await getPublicationById(selectedPublicationId);
        
        if (publicationData) {
          setCurrentPublication(publicationData);
          toast.success(`Loaded ${publicationData.basicInfo.publicationName}`);
        } else {
          toast.error('Publication not found');
          setCurrentPublication(null);
        }
      } catch (error) {
        console.error('Error loading publication data:', error);
        toast.error(`Failed to load publication data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCurrentPublication(null);
      } finally {
        setLoading(false);
      }
    };

    loadPublicationData();
  }, [selectedPublicationId]);

  const handleUpdatePublication = async (updatedData: Partial<PublicationFrontend>) => {
    if (!currentPublication?._id) return;

    try {
      await updatePublication(currentPublication._id, updatedData);
      setCurrentPublication({ ...currentPublication, ...updatedData });
      toast.success('Publication updated successfully');
    } catch (error) {
      console.error('Error updating publication:', error);
      toast.error('Failed to update publication');
    }
  };

  // Edit dialog handlers
  const openEditDialog = (item: any, type: 'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container', index: number, subIndex: number = -1) => {
    setEditingItem({ ...item });
    setEditingType(type);
    setEditingIndex(index);
    setEditingSubIndex(subIndex);
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditingType(null);
    setEditingIndex(-1);
    setEditingSubIndex(-1);
  };

  const saveEditedItem = async () => {
    if (!currentPublication || !editingItem || !editingType) return;
    
    // For container types, we don't need editingIndex since we're editing the container itself
    const isContainerType = editingType?.includes('-container');
    if (!isContainerType && editingIndex < 0) return;

    try {
      let updatedPublication = { ...currentPublication };

      switch (editingType) {
        case 'website':
          if (updatedPublication.distributionChannels?.website?.advertisingOpportunities) {
            updatedPublication.distributionChannels.website.advertisingOpportunities[editingIndex] = editingItem;
          }
          break;

        case 'newsletter':
          if (updatedPublication.distributionChannels?.newsletters && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.newsletters[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'print':
          if (updatedPublication.distributionChannels?.print?.advertisingOpportunities) {
            updatedPublication.distributionChannels.print.advertisingOpportunities[editingIndex] = editingItem;
          }
          break;

        case 'event':
          if (updatedPublication.distributionChannels?.events && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.events[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'package':
          if (updatedPublication.crossChannelPackages) {
            updatedPublication.crossChannelPackages[editingIndex] = editingItem;
          }
          break;

        case 'social-media':
          if (updatedPublication.socialMediaProfiles) {
            updatedPublication.socialMediaProfiles[editingIndex] = editingItem;
          }
          break;

        case 'newsletter-container':
          if (updatedPublication.distributionChannels?.newsletters) {
            updatedPublication.distributionChannels.newsletters[editingIndex] = editingItem;
          }
          break;

        case 'event-container':
          if (updatedPublication.distributionChannels?.events) {
            updatedPublication.distributionChannels.events[editingIndex] = editingItem;
          }
          break;

        case 'website-container':
          if (updatedPublication.distributionChannels?.website) {
            updatedPublication.distributionChannels.website = { ...updatedPublication.distributionChannels.website, ...editingItem };
          }
          break;

        case 'print-container':
          if (updatedPublication.distributionChannels?.print) {
            updatedPublication.distributionChannels.print = { ...updatedPublication.distributionChannels.print, ...editingItem };
          }
          break;
      }

      await handleUpdatePublication(updatedPublication);
      closeEditDialog();
      
      const successMessage = editingType?.includes('-container') 
        ? `${editingType.replace('-container', '').charAt(0).toUpperCase() + editingType.replace('-container', '').slice(1)} properties updated successfully`
        : 'Advertising opportunity updated successfully';
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Error saving edited item:', error);
      toast.error('Failed to update advertising opportunity');
    }
  };

  const addWebsiteOpportunity = async () => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Website Ad',
      adFormat: '300x250 banner',
      location: 'Homepage',
      pricing: {
        flatRate: 100,
        pricingModel: 'flat' as const,
        minimumCommitment: '1 week'
      },
      specifications: {
        size: '300x250',
        format: 'JPG, PNG, GIF',
        animationAllowed: true,
        thirdPartyTags: true
      },
      monthlyImpressions: 1000,
      available: true
    };

    const updatedOpportunities = [
      ...(currentPublication.distributionChannels?.website?.advertisingOpportunities || []),
      newOpportunity
    ];

    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        website: {
          ...currentPublication.distributionChannels?.website,
          advertisingOpportunities: updatedOpportunities
        }
      }
    });
  };

  const addNewsletterOpportunity = async (newsletterIndex: number) => {
    if (!currentPublication?.distributionChannels?.newsletters?.[newsletterIndex]) return;
    
    const newOpportunity = {
      name: 'New Newsletter Ad',
      position: 'inline',
      dimensions: '300x250',
      pricing: {
        perSend: 50
      }
    };

    const updatedNewsletters = [...currentPublication.distributionChannels.newsletters];
    const updatedOpportunities = [
      ...(updatedNewsletters[newsletterIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedNewsletters[newsletterIndex] = {
      ...updatedNewsletters[newsletterIndex],
      advertisingOpportunities: updatedOpportunities
    };

    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        newsletters: updatedNewsletters
      }
    });
  };

  const addPrintOpportunity = async () => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Print Ad',
      adFormat: 'display ad',
      dimensions: '4\" x 6\"',
      color: 'color',
      pricing: {
        oneTime: 500,
        fourTimes: 400,
        twelveTimes: 300,
        openRate: 500
      }
    };

    const updatedOpportunities = [
      ...(currentPublication.distributionChannels?.print?.advertisingOpportunities || []),
      newOpportunity
    ];

    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        print: {
          ...currentPublication.distributionChannels?.print,
          advertisingOpportunities: updatedOpportunities
        }
      }
    });
  };

  const addEventOpportunity = async (eventIndex: number) => {
    if (!currentPublication?.distributionChannels?.events?.[eventIndex]) return;
    
    const newOpportunity = {
      level: 'sponsor',
      benefits: ['Logo placement', 'Event listing'],
      pricing: 250
    };

    const updatedEvents = [...currentPublication.distributionChannels.events];
    const updatedOpportunities = [
      ...(updatedEvents[eventIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      advertisingOpportunities: updatedOpportunities
    };

    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        events: updatedEvents
      }
    });
  };

  const updateWebsiteOpportunity = (index: number, updatedOpp: any) => {
    if (!currentPublication?.distributionChannels?.website?.advertisingOpportunities) return;

    const updatedOpportunities = [...currentPublication.distributionChannels.website.advertisingOpportunities];
    updatedOpportunities[index] = updatedOpp;

    handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        website: {
          ...currentPublication.distributionChannels.website,
          advertisingOpportunities: updatedOpportunities
        }
      }
    });
  };

  const removeWebsiteOpportunity = (index: number) => {
    if (!currentPublication?.distributionChannels?.website?.advertisingOpportunities) return;

    const updatedOpportunities = currentPublication.distributionChannels.website.advertisingOpportunities.filter((_, i) => i !== index);

    handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        website: {
          ...currentPublication.distributionChannels.website,
          advertisingOpportunities: updatedOpportunities
        }
      }
    });
  };

  const addCrossChannelPackage = async () => {
    if (!currentPublication) return;
    
    const newPackage = {
      name: 'New Package',
      packageName: 'Custom Package',
      includedChannels: ['website'] as Array<'website' | 'print' | 'newsletter' | 'social' | 'events' | 'email'>,
      pricing: '$0',
      details: 'Package details',
      duration: 'Monthly',
      savings: 0
    };

    const updatedPackages = [
      ...(currentPublication.crossChannelPackages || []),
      newPackage
    ];

    try {
      await handleUpdatePublication({
        crossChannelPackages: updatedPackages
      });
      toast.success('Cross-channel package added successfully');
    } catch (error) {
      console.error('Error adding package:', error);
      toast.error('Failed to add cross-channel package');
    }
  };

  const addSocialMediaProfile = async () => {
    if (!currentPublication) return;
    
    const newProfile = {
      platform: 'facebook',
      handle: 'newhandle',
      url: 'https://facebook.com/newhandle',
      verified: false,
      metrics: {
        followers: 0,
        engagementRate: 0
      },
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    const updatedProfiles = [
      ...(currentPublication.socialMediaProfiles || []),
      newProfile
    ];

    try {
      await handleUpdatePublication({
        socialMediaProfiles: updatedProfiles
      });
      toast.success('Social media profile added successfully');
    } catch (error) {
      console.error('Error adding social media profile:', error);
      toast.error('Failed to add social media profile');
    }
  };

  const formatPrice = (pricing: any) => {
    if (pricing?.flatRate) return `$${pricing.flatRate.toLocaleString()}`;
    if (pricing?.cpm) return `$${pricing.cpm} CPM`;
    if (pricing?.perSend) return `$${pricing.perSend} per send`;
    return 'Contact for pricing';
  };

  if (!selectedPublicationId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Advertising Inventory Manager</h2>
          <p className="text-muted-foreground mb-6">
            Select a publication to manage its advertising opportunities and packages
          </p>
          <Select value={selectedPublicationId} onValueChange={setSelectedPublicationId}>
            <SelectTrigger className="w-80 mx-auto">
              <SelectValue placeholder="Select a Publication" />
            </SelectTrigger>
            <SelectContent>
              {publications.length === 0 ? (
                <SelectItem value="no-pubs" disabled>No publications available</SelectItem>
              ) : (
                publications.map(pub => (
                  <SelectItem key={pub.id} value={pub.id}>
                    {pub.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (loading || !currentPublication) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading publication data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{currentPublication.basicInfo.publicationName}</h2>
          <p className="text-muted-foreground">Advertising Inventory & Packages</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPublicationId} onValueChange={setSelectedPublicationId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Publication" />
            </SelectTrigger>
            <SelectContent>
              {publications.map(pub => (
                <SelectItem key={pub.id} value={pub.id}>
                  {pub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inventory Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="website" className="flex items-center gap-1 text-sm">
            <Globe className="w-3 h-3" />
            Web ({currentPublication.distributionChannels?.website?.advertisingOpportunities?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-1 text-sm">
            <Mail className="w-3 h-3" />
            News ({currentPublication.distributionChannels?.newsletters?.reduce((sum, n) => sum + (n.advertisingOpportunities?.length || 0), 0) || 0})
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-1 text-sm">
            <Printer className="w-3 h-3" />
            Print ({currentPublication.distributionChannels?.print?.advertisingOpportunities?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1 text-sm">
            <Calendar className="w-3 h-3" />
            Events ({currentPublication.distributionChannels?.events?.reduce((sum, e) => sum + (e.advertisingOpportunities?.length || 0), 0) || 0})
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-1 text-sm">
            <Package className="w-3 h-3" />
            Packages ({currentPublication.crossChannelPackages?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1 text-sm">
            <Users className="w-3 h-3" />
            Social ({currentPublication.socialMediaProfiles?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Website Advertising */}
        <TabsContent value="website" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Website Advertising Opportunities</h3>
              {currentPublication.distributionChannels?.website && (
                <p className="text-sm text-muted-foreground">
                  {currentPublication.distributionChannels.website.url} • {currentPublication.distributionChannels.website.metrics?.monthlyVisitors?.toLocaleString()} monthly visitors
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {currentPublication.distributionChannels?.website && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditDialog(currentPublication.distributionChannels!.website!, 'website-container', 0)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Edit Website Info
                </Button>
              )}
              <Button onClick={addWebsiteOpportunity}>
                <Plus className="w-4 h-4 mr-2" />
                Add Website Ad
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.website?.advertisingOpportunities?.map((opportunity, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{opportunity.name || 'Unnamed Ad'}</h4>
                        <Badge variant={opportunity.available ? "default" : "secondary"}>
                          {opportunity.available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <strong>Format:</strong> {opportunity.adFormat || 'N/A'}
                        </div>
                        <div>
                          <strong>Location:</strong> {opportunity.location || 'N/A'}
                        </div>
                        <div>
                          <strong>Price:</strong> {formatPrice(opportunity.pricing)}
                        </div>
                        <div>
                          <strong>Impressions:</strong> {opportunity.monthlyImpressions?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      
                      {opportunity.specifications && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Specs:</strong> {opportunity.specifications.size} • {opportunity.specifications.format}
                          {opportunity.specifications.animationAllowed && ' • Animation OK'}
                          {opportunity.specifications.thirdPartyTags && ' • 3rd Party Tags OK'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(opportunity, 'website', index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeWebsiteOpportunity(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Website Advertising</h3>
                    <p className="text-gray-600 mb-4">Create your first website advertising opportunity.</p>
                    <Button onClick={addWebsiteOpportunity}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Website Ad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Newsletter Advertising */}
        <TabsContent value="newsletter" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Newsletter Advertising</h3>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.newsletters?.map((newsletter, newsletterIndex) => (
              <Card key={newsletterIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        {newsletter.name || 'Newsletter'}
                      </CardTitle>
                      <CardDescription>
                        {newsletter.subscribers?.toLocaleString()} subscribers • {newsletter.openRate}% open rate • {newsletter.frequency}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(newsletter, 'newsletter-container', newsletterIndex)}
                      className="ml-2"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                    {newsletter.advertisingOpportunities?.map((opp, oppIndex) => (
                      <div key={oppIndex} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h5 className="font-medium">{opp.name}</h5>
                          <div className="text-sm text-muted-foreground">
                            {opp.position} • {opp.dimensions} • ${opp.pricing?.perSend}/send
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(opp, 'newsletter', newsletterIndex, oppIndex)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No advertising opportunities configured
                      </div>
                    )}
                    
                    {/* Add button for this specific newsletter */}
                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addNewsletterOpportunity(newsletterIndex)}
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        Add Ad to {newsletter.name}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Newsletters</h3>
                    <p className="text-gray-600 mb-4">Configure newsletters first to add advertising opportunities.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Cross-Channel Packages */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cross-Channel Packages</h3>
            <Button onClick={addCrossChannelPackage}>
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.crossChannelPackages?.map((pkg, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{pkg.name || pkg.packageName}</h4>
                        {pkg.savings > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {pkg.savings}% savings
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {pkg.duration}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <strong>Price:</strong> {pkg.pricing}
                        </div>
                        <div>
                          <strong>Duration:</strong> {pkg.duration}
                        </div>
                        <div className="col-span-full">
                          <strong>Channels:</strong> 
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.includedChannels?.map((channel, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {channel}
                              </Badge>
                            )) || <span className="text-gray-400">None specified</span>}
                          </div>
                        </div>
                      </div>
                      
                      {pkg.details && (
                        <p className="text-sm text-gray-600">{pkg.details}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(pkg, 'package', index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          const updatedPackages = currentPublication.crossChannelPackages?.filter((_, i) => i !== index) || [];
                          handleUpdatePublication({ crossChannelPackages: updatedPackages });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Cross-Channel Packages</h3>
                    <p className="text-gray-600 mb-4">Create bundled advertising packages for better value.</p>
                    <Button onClick={addCrossChannelPackage}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Print Advertising */}
        <TabsContent value="print" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Print Advertising</h3>
              {currentPublication.distributionChannels?.print && (
                <p className="text-sm text-muted-foreground">
                  {currentPublication.distributionChannels.print.frequency} • {currentPublication.distributionChannels.print.circulation?.toLocaleString()} circulation • {currentPublication.distributionChannels.print.distributionArea}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {currentPublication.distributionChannels?.print && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditDialog(currentPublication.distributionChannels!.print!, 'print-container', 0)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Edit Print Info
                </Button>
              )}
              <Button onClick={addPrintOpportunity}>
                <Plus className="w-4 h-4 mr-2" />
                Add Print Ad
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.print?.advertisingOpportunities?.map((opportunity, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Printer className="w-5 h-5 text-blue-600" />
                        <h4 className="text-lg font-semibold">{opportunity.name}</h4>
                        <Badge variant="outline">{opportunity.color}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <strong>Size:</strong> {opportunity.dimensions}
                        </div>
                        <div>
                          <strong>Format:</strong> {opportunity.adFormat}
                        </div>
                        <div>
                          <strong>Circulation:</strong> {currentPublication.distributionChannels?.print?.circulation?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      
                      {opportunity.pricing && (
                        <div className="text-sm text-muted-foreground mb-2">
                          <strong>Pricing:</strong>
                          {opportunity.pricing.oneTime && ` One-time: $${opportunity.pricing.oneTime}`}
                          {opportunity.pricing.fourTimes && ` • 4x: $${opportunity.pricing.fourTimes}`}
                          {opportunity.pricing.twelveTimes && ` • 12x: $${opportunity.pricing.twelveTimes}`}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(opportunity, 'print', index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Print Advertising</h3>
                    <p className="text-gray-600 mb-4">Create your first print advertising opportunity.</p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Print Ad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Event Sponsorships */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Event Sponsorships</h3>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.events?.map((event, eventIndex) => (
              <Card key={eventIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {event.name}
                      </CardTitle>
                      <CardDescription>
                        {event.type} • {event.frequency} • {event.location}
                        {event.averageAttendance && ` • ${event.averageAttendance.toLocaleString()} attendees`}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(event, 'event-container', eventIndex)}
                      className="ml-2"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {event.advertisingOpportunities?.map((opp, oppIndex) => (
                      <div key={oppIndex} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h5 className="font-medium capitalize">{opp.level} Sponsor</h5>
                          <div className="text-sm text-muted-foreground">
                            {opp.benefits?.join(' • ')}
                            {opp.pricing && ` • $${opp.pricing}`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(opp, 'event', eventIndex, oppIndex)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No sponsorship opportunities defined for this event.
                      </div>
                    )}
                    
                    {/* Add button for this specific event */}
                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addEventOpportunity(eventIndex)}
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        Add Sponsorship to {event.name}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Events</h3>
                    <p className="text-gray-600 mb-4">Create your first event sponsorship opportunity.</p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Social Media Management */}
        <TabsContent value="social" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Social Media Profiles</h3>
            <Button onClick={addSocialMediaProfile}>
              <Plus className="w-4 h-4 mr-2" />
              Add Profile
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.socialMediaProfiles?.map((profile, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold capitalize">{profile.platform}</h4>
                        {profile.verified && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Verified
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          @{profile.handle}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <strong>Followers:</strong> {profile.metrics?.followers?.toLocaleString() || 'N/A'}
                        </div>
                        {profile.metrics?.engagementRate && (
                          <div>
                            <strong>Engagement:</strong> {profile.metrics.engagementRate}%
                          </div>
                        )}
                        <div>
                          <strong>URL:</strong> 
                          <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">
                            Link
                          </a>
                        </div>
                        <div>
                          <strong>Updated:</strong> {profile.lastUpdated ? new Date(profile.lastUpdated).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(profile, 'social-media', index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          const updatedProfiles = currentPublication.socialMediaProfiles?.filter((_, i) => i !== index) || [];
                          handleUpdatePublication({ socialMediaProfiles: updatedProfiles });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Social Media Profiles</h3>
                    <p className="text-gray-500 mb-4">Add social media profiles to track audience engagement and reach.</p>
                    <Button onClick={addSocialMediaProfile}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingType === 'website' ? 'Website' : 
                   editingType === 'newsletter' ? 'Newsletter' :
                   editingType === 'print' ? 'Print' :
                   editingType === 'event' ? 'Event' :
                   editingType === 'package' ? 'Package' :
                   editingType === 'social-media' ? 'Social Media Profile' :
                   editingType === 'newsletter-container' ? 'Newsletter Properties' :
                   editingType === 'event-container' ? 'Event Properties' :
                   editingType === 'website-container' ? 'Website Properties' :
                   editingType === 'print-container' ? 'Print Properties' :
                   'Item'} {editingType?.includes('-container') || editingType === 'package' || editingType === 'social-media' ? '' : 'Advertising Opportunity'}
            </DialogTitle>
            <DialogDescription>
              {editingType?.includes('-container') 
                ? 'Update the properties and metrics for this channel.'
                : editingType === 'package' 
                ? 'Update the cross-channel package details and pricing.'
                : editingType === 'social-media'
                ? 'Update the social media profile information and metrics.'
                : 'Update the details for this advertising opportunity.'
              }
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              
              {/* Newsletter Container Fields */}
              {editingType === 'newsletter-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newsletterName">Newsletter Name</Label>
                      <Input
                        id="newsletterName"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={editingItem.subject || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, subject: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="subscribers">Subscribers</Label>
                      <Input
                        id="subscribers"
                        type="number"
                        value={editingItem.subscribers || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, subscribers: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="openRate">Open Rate (%)</Label>
                      <Input
                        id="openRate"
                        type="number"
                        value={editingItem.openRate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, openRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Event Container Fields */}
              {editingType === 'event-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input
                        id="eventName"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Input
                        id="eventType"
                        value={editingItem.type || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventLocation">Location</Label>
                      <Input
                        id="eventLocation"
                        value={editingItem.location || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="averageAttendance">Average Attendance</Label>
                      <Input
                        id="averageAttendance"
                        type="number"
                        value={editingItem.averageAttendance || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, averageAttendance: parseInt(e.target.value) || null })}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Print Container Fields */}
              {editingType === 'print-container' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="printFrequency">Frequency</Label>
                      <Select 
                        value={editingItem.frequency || ''} 
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="circulation">Total Circulation</Label>
                      <Input
                        id="circulation"
                        type="number"
                        value={editingItem.circulation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, circulation: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="printSchedule">Print Schedule</Label>
                      <Input
                        id="printSchedule"
                        value={editingItem.printSchedule || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, printSchedule: e.target.value })}
                        placeholder="e.g., Every Wednesday"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paidCirculation">Paid Circulation</Label>
                      <Input
                        id="paidCirculation"
                        type="number"
                        value={editingItem.paidCirculation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, paidCirculation: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="freeCirculation">Free Circulation</Label>
                      <Input
                        id="freeCirculation"
                        type="number"
                        value={editingItem.freeCirculation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, freeCirculation: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="distributionArea">Distribution Area</Label>
                    <Input
                      id="distributionArea"
                      value={editingItem.distributionArea || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, distributionArea: e.target.value })}
                      placeholder="e.g., Portland Metro Area"
                    />
                  </div>
                  <div>
                    <Label htmlFor="distributionPoints">Distribution Points (comma-separated)</Label>
                    <Textarea
                      id="distributionPoints"
                      value={editingItem.distributionPoints?.join(', ') || ''}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        distributionPoints: e.target.value.split(',').map(point => point.trim()).filter(point => point) 
                      })}
                      placeholder="600+ locations throughout Portland, Blue boxes, Retail locations, Libraries, Coffee shops"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Website Container Fields */}
              {editingType === 'website-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="websiteUrl">Website URL</Label>
                      <Input
                        id="websiteUrl"
                        value={editingItem.url || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cmsplatform">CMS Platform</Label>
                      <Input
                        id="cmsplatform"
                        value={editingItem.cmsplatform || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, cmsplatform: e.target.value })}
                        placeholder="WordPress, Drupal, etc."
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Website Metrics</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="monthlyVisitors">Monthly Visitors</Label>
                        <Input
                          id="monthlyVisitors"
                          type="number"
                          value={editingItem.metrics?.monthlyVisitors || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              monthlyVisitors: parseInt(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthlyPageViews">Monthly Page Views</Label>
                        <Input
                          id="monthlyPageViews"
                          type="number"
                          value={editingItem.metrics?.monthlyPageViews || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              monthlyPageViews: parseInt(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="averageSessionDuration">Average Session Duration (minutes)</Label>
                        <Input
                          id="averageSessionDuration"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.averageSessionDuration || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              averageSessionDuration: parseFloat(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pagesPerSession">Pages Per Session</Label>
                        <Input
                          id="pagesPerSession"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.pagesPerSession || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              pagesPerSession: parseFloat(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bounceRate">Bounce Rate (%)</Label>
                        <Input
                          id="bounceRate"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.bounceRate || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              bounceRate: parseFloat(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobilePercentage">Mobile Percentage (%)</Label>
                        <Input
                          id="mobilePercentage"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.mobilePercentage || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              mobilePercentage: parseFloat(e.target.value) || null 
                            } 
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Package Fields */}
              {editingType === 'package' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="packageName">Package Name</Label>
                      <Input
                        id="packageName"
                        value={editingItem.name || editingItem.packageName || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          name: e.target.value,
                          packageName: e.target.value 
                        })}
                        placeholder="Digital Focus Package"
                      />
                    </div>
                    <div>
                      <Label htmlFor="packagePricing">Pricing</Label>
                      <Input
                        id="packagePricing"
                        value={editingItem.pricing || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, pricing: e.target.value })}
                        placeholder="$2,500/month"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="packageDuration">Duration</Label>
                      <Select
                        value={editingItem.duration || 'Monthly'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="One-time">One-time</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="packageSavings">Savings (%)</Label>
                      <Input
                        id="packageSavings"
                        type="number"
                        min="0"
                        max="100"
                        value={editingItem.savings || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, savings: parseInt(e.target.value) || 0 })}
                        placeholder="15"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="includedChannels">Included Channels</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['website', 'newsletter', 'print', 'events', 'social', 'email'].map((channel) => (
                        <div key={channel} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`channel-${channel}`}
                            checked={editingItem.includedChannels?.includes(channel) || false}
                            onChange={(e) => {
                              const currentChannels = editingItem.includedChannels || [];
                              const updatedChannels = e.target.checked
                                ? [...currentChannels, channel]
                                : currentChannels.filter((c: string) => c !== channel);
                              setEditingItem({ ...editingItem, includedChannels: updatedChannels });
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`channel-${channel}`} className="text-sm capitalize">
                            {channel}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="packageDetails">Package Details</Label>
                    <Textarea
                      id="packageDetails"
                      value={editingItem.details || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, details: e.target.value })}
                      placeholder="First Look web advertising, newsletter takeover, social media campaign"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Social Media Profile Fields */}
              {editingType === 'social-media' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Select
                        value={editingItem.platform || 'facebook'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, platform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="snapchat">Snapchat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="handle">Handle/Username</Label>
                      <Input
                        id="handle"
                        value={editingItem.handle || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, handle: e.target.value })}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="socialUrl">Profile URL</Label>
                    <Input
                      id="socialUrl"
                      value={editingItem.url || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                      placeholder="https://facebook.com/username"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="verified"
                      checked={editingItem.verified || false}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, verified: checked })}
                    />
                    <Label htmlFor="verified">Verified Account</Label>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Metrics</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="followers">Followers</Label>
                        <Input
                          id="followers"
                          type="number"
                          value={editingItem.metrics?.followers || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              followers: parseInt(e.target.value) || 0 
                            } 
                          })}
                          placeholder="10000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="engagementRate">Engagement Rate (%)</Label>
                        <Input
                          id="engagementRate"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.engagementRate || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              engagementRate: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          placeholder="2.5"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastUpdated">Last Updated</Label>
                    <Input
                      id="lastUpdated"
                      type="date"
                      value={editingItem.lastUpdated ? editingItem.lastUpdated.split('T')[0] : ''}
                      onChange={(e) => setEditingItem({ ...editingItem, lastUpdated: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Regular advertising opportunity fields (only show for non-container, non-package, and non-social-media types) */}
              {!editingType?.includes('-container') && editingType !== 'package' && editingType !== 'social-media' && (
                <>
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      />
                    </div>
                {editingType === 'website' && (
                  <div>
                    <Label htmlFor="adFormat">Ad Format</Label>
                    <Input
                      id="adFormat"
                      value={editingItem.adFormat || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, adFormat: e.target.value })}
                    />
                  </div>
                )}
                {editingType === 'print' && (
                  <div>
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      value={editingItem.dimensions || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, dimensions: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Location/Position */}
              {(editingType === 'website' || editingType === 'newsletter') && (
                <div>
                  <Label htmlFor="location">{editingType === 'website' ? 'Location' : 'Position'}</Label>
                  <Input
                    id="location"
                    value={editingItem.location || editingItem.position || ''}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      [editingType === 'website' ? 'location' : 'position']: e.target.value 
                    })}
                  />
                </div>
              )}

              {/* Pricing Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Pricing</Label>
                
                {editingType === 'website' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="flatRate">Flat Rate ($)</Label>
                      <Input
                        id="flatRate"
                        type="number"
                        value={editingItem.pricing?.flatRate || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            flatRate: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cpm">CPM ($)</Label>
                      <Input
                        id="cpm"
                        type="number"
                        value={editingItem.pricing?.cpm || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            cpm: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                  </div>
                )}

                {editingType === 'newsletter' && (
                  <div>
                    <Label htmlFor="perSend">Per Send ($)</Label>
                    <Input
                      id="perSend"
                      type="number"
                      value={editingItem.pricing?.perSend || ''}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        pricing: { 
                          ...editingItem.pricing, 
                          perSend: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                  </div>
                )}

                {editingType === 'print' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oneTime">One Time ($)</Label>
                      <Input
                        id="oneTime"
                        type="number"
                        value={editingItem.pricing?.oneTime || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            oneTime: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fourTimes">4 Times ($)</Label>
                      <Input
                        id="fourTimes"
                        type="number"
                        value={editingItem.pricing?.fourTimes || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            fourTimes: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Impressions */}
              {(editingType === 'website') && (
                <div>
                  <Label htmlFor="monthlyImpressions">Monthly Impressions</Label>
                  <Input
                    id="monthlyImpressions"
                    type="number"
                    value={editingItem.monthlyImpressions || ''}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      monthlyImpressions: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>
              )}

              {/* Specifications for Website */}
              {editingType === 'website' && editingItem.specifications && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Specifications</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="size">Size</Label>
                      <Input
                        id="size"
                        value={editingItem.specifications?.size || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            size: e.target.value 
                          } 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="format">Format</Label>
                      <Input
                        id="format"
                        value={editingItem.specifications?.format || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            format: e.target.value 
                          } 
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="animationAllowed"
                        checked={editingItem.specifications?.animationAllowed || false}
                        onCheckedChange={(checked) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            animationAllowed: checked 
                          } 
                        })}
                      />
                      <Label htmlFor="animationAllowed">Animation Allowed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="thirdPartyTags"
                        checked={editingItem.specifications?.thirdPartyTags || false}
                        onCheckedChange={(checked) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            thirdPartyTags: checked 
                          } 
                        })}
                      />
                      <Label htmlFor="thirdPartyTags">Third Party Tags</Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Benefits */}
              {editingType === 'event' && (
                <div>
                  <Label htmlFor="benefits">Benefits (comma-separated)</Label>
                  <Textarea
                    id="benefits"
                    value={editingItem.benefits?.join(', ') || ''}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      benefits: e.target.value.split(',').map(b => b.trim()).filter(b => b) 
                    })}
                  />
                </div>
              )}

              {/* Available Toggle */}
              {(editingType === 'website') && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="available"
                    checked={editingItem.available || false}
                    onCheckedChange={(checked) => setEditingItem({ 
                      ...editingItem, 
                      available: checked 
                    })}
                  />
                  <Label htmlFor="available">Available</Label>
                </div>
              )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={saveEditedItem}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicationInventoryManager;
