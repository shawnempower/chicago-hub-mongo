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
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, DollarSign, Target, BarChart3, 
  Globe, Mail, Printer, Calendar, Package, Search,
  RefreshCw, Save, X, TrendingUp, Users, Mic, Radio, Video
} from 'lucide-react';

import { usePublication } from '@/contexts/PublicationContext';
import { PublicationFrontend } from '@/types/publication';
import { updatePublication, getPublicationById } from '@/api/publications';
import { HubPricingEditor, HubPrice } from './HubPricingEditor';

export const DashboardInventoryManager = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('website');
  const [currentPublication, setCurrentPublication] = useState<PublicationFrontend | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Edit dialog states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'podcast' | 'radio' | 'streaming' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | 'podcast-container' | 'radio-container' | 'streaming-container' | 'podcast-ad' | 'radio-ad' | 'streaming-ad' | 'social-media-ad' | 'print-ad' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingSubIndex, setEditingSubIndex] = useState<number>(-1); // for newsletter ads within newsletters

  // Load full publication data when selected publication changes
  useEffect(() => {
    const loadPublicationData = async () => {
      if (!selectedPublication?._id) {
        setCurrentPublication(null);
        return;
      }

      setLoading(true);
      
      try {
        const publicationData = await getPublicationById(selectedPublication._id);
        
        if (publicationData) {
          setCurrentPublication(publicationData);
        } else {
          toast({
            title: "Error",
            description: "Publication not found",
            variant: "destructive"
          });
          setCurrentPublication(null);
        }
      } catch (error) {
        console.error('Error loading publication data:', error);
        toast({
          title: "Error",
          description: `Failed to load publication data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        setCurrentPublication(null);
      } finally {
        setLoading(false);
      }
    };

    loadPublicationData();
  }, [selectedPublication?._id, toast]);

  // Reset tab to website when publication changes
  useEffect(() => {
    console.log('Publication changed, resetting tab to website. Publication ID:', selectedPublication?._id);
    setActiveTab('website');
  }, [selectedPublication?._id]);

  // Debug tab changes
  const handleTabChange = (value: string) => {
    console.log('Tab changing from', activeTab, 'to', value);
    setActiveTab(value);
  };

  const handleUpdatePublication = async (updatedData: Partial<PublicationFrontend>) => {
    if (!currentPublication?._id) return;

    try {
      const updated = await updatePublication(currentPublication._id, updatedData);
      if (updated) {
        setCurrentPublication(updated);
        setSelectedPublication(updated); // Also update the context
        toast({
          title: "Success",
          description: "Publication updated successfully"
        });
      }
    } catch (error) {
      console.error('Error updating publication:', error);
      toast({
        title: "Error",
        description: "Failed to update publication",
        variant: "destructive"
      });
    }
  };

  // Edit dialog handlers
  const openEditDialog = (item: any, type: 'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | 'podcast' | 'radio' | 'streaming' | 'podcast-container' | 'radio-container' | 'streaming-container' | 'podcast-ad' | 'radio-ad' | 'streaming-ad' | 'social-media-ad' | 'print-ad', index: number, subIndex: number = -1) => {
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

    // Clean up hub pricing - remove any invalid entries
    if (editingItem.hubPricing && Array.isArray(editingItem.hubPricing)) {
      editingItem.hubPricing = editingItem.hubPricing.filter((hp: any) => {
        // Must have a hubId and hubName
        if (!hp.hubId || !hp.hubName) return false;
        // Must have some pricing data
        if (!hp.pricing || typeof hp.pricing !== 'object') return false;
        return true;
      });
    }

    console.log('💾 Saving edited item:', {
      editingType,
      editingIndex,
      editingSubIndex,
      hasHubPricing: editingItem.hubPricing?.length > 0,
      hubPricingCount: editingItem.hubPricing?.length || 0
    });

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
          if (updatedPublication.distributionChannels?.print && Array.isArray(updatedPublication.distributionChannels.print) && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'podcast':
          if (updatedPublication.distributionChannels?.podcasts && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'radio':
          if (updatedPublication.distributionChannels?.radioStations && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'streaming':
          if (updatedPublication.distributionChannels?.streamingVideo && editingSubIndex >= 0) {
            updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        // Container types
        case 'website-container':
          updatedPublication.distributionChannels = {
            ...updatedPublication.distributionChannels,
            website: editingItem
          };
          break;

        case 'newsletter-container':
          if (updatedPublication.distributionChannels?.newsletters) {
            updatedPublication.distributionChannels.newsletters[editingIndex] = editingItem;
          }
          break;

        case 'print-container':
          if (updatedPublication.distributionChannels?.print && Array.isArray(updatedPublication.distributionChannels.print)) {
            updatedPublication.distributionChannels.print[editingIndex] = editingItem;
          }
          break;

        case 'podcast-container':
          if (updatedPublication.distributionChannels?.podcasts) {
            updatedPublication.distributionChannels.podcasts[editingIndex] = editingItem;
          }
          break;

        case 'radio-container':
          if (updatedPublication.distributionChannels?.radioStations) {
            updatedPublication.distributionChannels.radioStations[editingIndex] = editingItem;
          }
          break;

        case 'streaming-container':
          if (updatedPublication.distributionChannels?.streamingVideo) {
            updatedPublication.distributionChannels.streamingVideo[editingIndex] = editingItem;
          }
          break;
      }

      await handleUpdatePublication(updatedPublication);
      closeEditDialog();
    } catch (error) {
      console.error('Error saving edited item:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  // Add new channels
  const addNewsletter = async () => {
    if (!currentPublication) return;
    
    const newNewsletter = {
      name: 'New Newsletter',
      subject: 'Newsletter subject',
      subscribers: 0,
      frequency: 'weekly',
      openRate: 0,
      advertisingOpportunities: []
    };

    const updatedNewsletters = [
      ...(currentPublication.distributionChannels?.newsletters || []),
      newNewsletter
    ];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          newsletters: updatedNewsletters
        }
      });
      toast({
        title: "Success",
        description: "Newsletter added successfully"
      });
    } catch (error) {
      console.error('Error adding newsletter:', error);
      toast({
        title: "Error",
        description: "Failed to add newsletter",
        variant: "destructive"
      });
    }
  };

  const addSocialMediaProfile = async () => {
    if (!currentPublication) return;
    
    const newProfile = {
      platform: 'facebook',
      handle: 'newhandle',
      verified: false,
      metrics: {
        followers: 0,
        posts: 0
      },
      lastUpdated: new Date().toISOString().split('T')[0],
      advertisingOpportunities: []
    };

    const updatedSocialMedia = [
      ...(currentPublication.distributionChannels?.socialMedia || []),
      newProfile
    ];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          socialMedia: updatedSocialMedia
        }
      });
      toast({
        title: "Success",
        description: "Social media profile added successfully"
      });
    } catch (error) {
      console.error('Error adding social media profile:', error);
      toast({
        title: "Error",
        description: "Failed to add social media profile",
        variant: "destructive"
      });
    }
  };

  // Add advertising opportunities
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

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          website: {
            ...currentPublication.distributionChannels?.website,
            advertisingOpportunities: updatedOpportunities
          }
        }
      });
      toast({
        title: "Success",
        description: "Website advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding website opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add website advertising opportunity",
        variant: "destructive"
      });
    }
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

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          newsletters: updatedNewsletters
        }
      });
      toast({
        title: "Success",
        description: "Newsletter advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding newsletter opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add newsletter advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removeNewsletterOpportunity = async (newsletterIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.newsletters?.[newsletterIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const updatedNewsletters = [...currentPublication.distributionChannels.newsletters];
    const updatedOpportunities = [...updatedNewsletters[newsletterIndex].advertisingOpportunities];
    
    updatedOpportunities.splice(adIndex, 1);
    
    updatedNewsletters[newsletterIndex] = {
      ...updatedNewsletters[newsletterIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          newsletters: updatedNewsletters
        }
      });
      toast({
        title: "Success",
        description: "Newsletter advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing newsletter opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove newsletter advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const addPrintOpportunity = async (printIndex: number) => {
    if (!currentPublication?.distributionChannels?.print) return;
    
    const newOpportunity = {
      name: 'New Print Ad',
      adType: 'display',
      size: 'full-page',
      pricing: {
        flatRate: 500
      }
    };

    const updatedPrint = Array.isArray(currentPublication.distributionChannels.print) 
      ? [...currentPublication.distributionChannels.print]
      : [currentPublication.distributionChannels.print];
      
    const updatedOpportunities = [
      ...(updatedPrint[printIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedPrint[printIndex] = {
      ...updatedPrint[printIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          print: updatedPrint
        }
      });
      toast({
        title: "Success",
        description: "Print advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding print opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add print advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removePrintOpportunity = async (printIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.print) return;
    
    const updatedPrint = Array.isArray(currentPublication.distributionChannels.print) 
      ? [...currentPublication.distributionChannels.print]
      : [currentPublication.distributionChannels.print];
      
    if (!updatedPrint[printIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const updatedOpportunities = [...updatedPrint[printIndex].advertisingOpportunities];
    updatedOpportunities.splice(adIndex, 1);
    
    updatedPrint[printIndex] = {
      ...updatedPrint[printIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          print: updatedPrint
        }
      });
      toast({
        title: "Success",
        description: "Print advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing print opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove print advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const addSocialMediaOpportunity = async (socialIndex: number) => {
    if (!currentPublication?.distributionChannels?.socialMedia?.[socialIndex]) return;
    
    const newOpportunity = {
      name: 'New Social Media Ad',
      adType: 'sponsored-post',
      duration: '24h',
      pricing: {
        perPost: 100
      }
    };

    const updatedSocialMedia = [...currentPublication.distributionChannels.socialMedia];
    const updatedOpportunities = [
      ...(updatedSocialMedia[socialIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedSocialMedia[socialIndex] = {
      ...updatedSocialMedia[socialIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          socialMedia: updatedSocialMedia
        }
      });
      toast({
        title: "Success",
        description: "Social media advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding social media opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add social media advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removeSocialMediaOpportunity = async (socialIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.socialMedia?.[socialIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const updatedSocialMedia = [...currentPublication.distributionChannels.socialMedia];
    const updatedOpportunities = [...updatedSocialMedia[socialIndex].advertisingOpportunities];
    
    updatedOpportunities.splice(adIndex, 1);
    
    updatedSocialMedia[socialIndex] = {
      ...updatedSocialMedia[socialIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          socialMedia: updatedSocialMedia
        }
      });
      toast({
        title: "Success",
        description: "Social media advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing social media opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove social media advertising opportunity",
        variant: "destructive"
      });
    }
  };

  // Remove functions
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
    
    toast({
      title: "Success",
      description: "Website advertising opportunity removed successfully"
    });
  };

  const removeDistributionChannel = async (channelType: 'podcasts' | 'radio' | 'streaming' | 'print' | 'newsletters' | 'socialMedia', index: number) => {
    if (!currentPublication) return;
    
    let channelKey: string;
    
    switch (channelType) {
      case 'podcasts':
        channelKey = 'podcasts';
        break;
      case 'radio':
        channelKey = 'radioStations';
        break;
      case 'streaming':
        channelKey = 'streamingVideo';
        break;
      case 'print':
        channelKey = 'print';
        break;
      case 'newsletters':
        channelKey = 'newsletters';
        break;
      case 'socialMedia':
        channelKey = 'socialMedia';
        break;
    }

    let updatedChannels;
    if (channelType === 'print' && !Array.isArray(currentPublication.distributionChannels?.print)) {
      // If print is an object, we can't delete it, just show a message
      toast({
        title: "Info",
        description: "Cannot delete primary print publication. Use edit to modify it.",
        variant: "default"
      });
      return;
    } else {
      const currentChannels = currentPublication.distributionChannels?.[channelKey as keyof typeof currentPublication.distributionChannels] as any[] || [];
      updatedChannels = currentChannels.filter((_, i) => i !== index);
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          [channelKey]: updatedChannels
        }
      });
      toast({
        title: "Success",
        description: `${channelType} channel removed successfully`
      });
    } catch (error) {
      console.error(`Error removing ${channelType} channel:`, error);
      toast({
        title: "Error",
        description: `Failed to remove ${channelType} channel`,
        variant: "destructive"
      });
    }
  };

  const addPodcastOpportunity = async (podcastIndex: number) => {
    if (!currentPublication?.distributionChannels?.podcasts?.[podcastIndex]) return;
    
    const newOpportunity = {
      name: 'New Podcast Ad',
      position: 'pre-roll',
      duration: '30 seconds',
      pricing: {
        perEpisode: 100
      }
    };

    const updatedPodcasts = [...currentPublication.distributionChannels.podcasts];
    const updatedOpportunities = [
      ...(updatedPodcasts[podcastIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedPodcasts[podcastIndex] = {
      ...updatedPodcasts[podcastIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          podcasts: updatedPodcasts
        }
      });
      toast({
        title: "Success",
        description: "Podcast advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding podcast opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add podcast advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removePodcastOpportunity = async (podcastIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.podcasts?.[podcastIndex]) return;

    const updatedPodcasts = [...currentPublication.distributionChannels.podcasts];
    if (updatedPodcasts[podcastIndex].advertisingOpportunities) {
      updatedPodcasts[podcastIndex].advertisingOpportunities = 
        updatedPodcasts[podcastIndex].advertisingOpportunities.filter((_, i) => i !== adIndex);
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          podcasts: updatedPodcasts
        }
      });
      toast({
        title: "Success",
        description: "Podcast advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing podcast opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove podcast advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const addRadioOpportunity = async (stationIndex: number) => {
    if (!currentPublication?.distributionChannels?.radioStations?.[stationIndex]) return;
    
    const newOpportunity = {
      name: 'New Radio Ad',
      timeSlot: 'drive-time',
      duration: '30 seconds',
      pricing: {
        per30Second: 150
      }
    };

    const updatedStations = [...currentPublication.distributionChannels.radioStations];
    const updatedOpportunities = [
      ...(updatedStations[stationIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedStations[stationIndex] = {
      ...updatedStations[stationIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          radioStations: updatedStations
        }
      });
      toast({
        title: "Success",
        description: "Radio advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding radio opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add radio advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removeRadioOpportunity = async (stationIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.radioStations?.[stationIndex]) return;

    const updatedStations = [...currentPublication.distributionChannels.radioStations];
    if (updatedStations[stationIndex].advertisingOpportunities) {
      updatedStations[stationIndex].advertisingOpportunities = 
        updatedStations[stationIndex].advertisingOpportunities.filter((_, i) => i !== adIndex);
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          radioStations: updatedStations
        }
      });
      toast({
        title: "Success",
        description: "Radio advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing radio opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove radio advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const addStreamingOpportunity = async (channelIndex: number) => {
    if (!currentPublication?.distributionChannels?.streamingVideo?.[channelIndex]) return;
    
    const newOpportunity = {
      name: 'New Streaming Ad',
      position: 'pre-roll',
      duration: '15 seconds',
      pricing: {
        perThousandViews: 25
      }
    };

    const updatedChannels = [...currentPublication.distributionChannels.streamingVideo];
    const updatedOpportunities = [
      ...(updatedChannels[channelIndex].advertisingOpportunities || []),
      newOpportunity
    ];
    
    updatedChannels[channelIndex] = {
      ...updatedChannels[channelIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          streamingVideo: updatedChannels
        }
      });
      toast({
        title: "Success",
        description: "Streaming advertising opportunity added successfully"
      });
    } catch (error) {
      console.error('Error adding streaming opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add streaming advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const removeStreamingOpportunity = async (channelIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.streamingVideo?.[channelIndex]) return;

    const updatedChannels = [...currentPublication.distributionChannels.streamingVideo];
    if (updatedChannels[channelIndex].advertisingOpportunities) {
      updatedChannels[channelIndex].advertisingOpportunities = 
        updatedChannels[channelIndex].advertisingOpportunities.filter((_, i) => i !== adIndex);
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          streamingVideo: updatedChannels
        }
      });
      toast({
        title: "Success",
        description: "Streaming advertising opportunity removed successfully"
      });
    } catch (error) {
      console.error('Error removing streaming opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to remove streaming advertising opportunity",
        variant: "destructive"
      });
    }
  };

  const addDistributionChannel = async (channelType: 'podcasts' | 'radio' | 'streaming' | 'print') => {
    if (!currentPublication) return;
    
    let newChannel: any;
    let channelKey: string;
    
    switch (channelType) {
      case 'podcasts':
        newChannel = {
          podcastId: `podcast_${Date.now()}`,
          name: 'New Podcast',
          description: 'Podcast description',
          frequency: 'weekly',
          averageDownloads: 0,
          averageListeners: 0,
          episodeCount: 0,
          platforms: ['spotify'],
          advertisingOpportunities: []
        };
        channelKey = 'podcasts';
        break;
      
      case 'radio':
        newChannel = {
          stationId: `radio_${Date.now()}`,
          callSign: 'WXYZ',
          frequency: '101.5 FM',
          format: 'news_talk',
          coverageArea: 'Metropolitan Area',
          listeners: 0,
          advertisingOpportunities: []
        };
        channelKey = 'radioStations';
        break;
      
      case 'streaming':
        newChannel = {
          channelId: `stream_${Date.now()}`,
          name: 'New Channel',
          platform: 'youtube',
          subscribers: 0,
          averageViews: 0,
          contentType: 'mixed',
          streamingSchedule: 'Daily',
          advertisingOpportunities: []
        };
        channelKey = 'streamingVideo';
        break;
        
      case 'print':
        newChannel = {
          name: 'New Publication',
          frequency: 'weekly' as const,
          circulation: 5000,
          advertisingOpportunities: []
        };
        channelKey = 'print';
        break;
    }

    const currentChannels = currentPublication.distributionChannels?.[channelKey as keyof typeof currentPublication.distributionChannels] as any[] || [];
    const updatedChannels = [...currentChannels, newChannel];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          [channelKey]: updatedChannels
        }
      });
      toast({
        title: "Success",
        description: `${channelType} channel added successfully`
      });
    } catch (error) {
      console.error(`Error adding ${channelType} channel:`, error);
      toast({
        title: "Error",
        description: `Failed to add ${channelType} channel`,
        variant: "destructive"
      });
    }
  };

  if (!selectedPublication) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Publication Selected</h3>
        <p className="text-muted-foreground">
          Please select a publication to manage its advertising inventory.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">Loading Publication Data</h3>
        <p className="text-muted-foreground">
          Please wait while we load the latest inventory information...
        </p>
      </div>
    );
  }

  if (!currentPublication) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Publication Not Found</h3>
        <p className="text-muted-foreground">
          Unable to load the selected publication. Please try selecting another publication.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory Tabs */}
      <Tabs key={currentPublication._id} value={activeTab} onValueChange={handleTabChange} className="shadow-sm rounded-lg">
        <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7">
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
          <TabsTrigger value="print">Print</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
          <TabsTrigger value="radio">Radio</TabsTrigger>
          <TabsTrigger value="streaming">Streaming</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
        </TabsList>

        {/* Website Advertising */}
        <TabsContent value="website" className="space-y-6">
          {/* Website Info Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
                <Globe className="w-5 h-5" />
                Website Information
              </h3>
              <Button
                variant="outline"
                onClick={() => openEditDialog(
                  currentPublication.distributionChannels?.website || { 
                    url: currentPublication.basicInfo?.websiteUrl || '', 
                    cmsplatform: '',
                    metrics: {
                      monthlyVisitors: 0,
                      monthlyPageViews: 0,
                      averageSessionDuration: 0,
                      pagesPerSession: 0,
                      bounceRate: 0,
                      mobilePercentage: 0
                    }
                  }, 
                  'website-container', 
                  0
                )}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Website Info
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">Website URL</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.url || currentPublication.basicInfo?.websiteUrl || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">CMS Platform</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.cmsplatform || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Monthly Visitors</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Monthly Page Views</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.metrics?.monthlyPageViews?.toLocaleString() || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Bounce Rate</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.metrics?.bounceRate ? `${currentPublication.distributionChannels.website.metrics.bounceRate}%` : 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Mobile Traffic</span>
                <p className="font-medium">{currentPublication.distributionChannels?.website?.metrics?.mobilePercentage ? `${currentPublication.distributionChannels.website.metrics.mobilePercentage}%` : 'Not specified'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Website Advertising Opportunities */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
                <Target className="w-5 h-5" />
                Advertising Opportunities
              </h3>
              <Button onClick={addWebsiteOpportunity}>
                <Plus className="w-4 h-4 mr-2" />
                Add Ad Slot
              </Button>
            </div>
            <div className="space-y-4">
              {currentPublication.distributionChannels?.website?.advertisingOpportunities?.map((opportunity, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">{opportunity.name}</h4>
                      <Badge variant="secondary">{opportunity.adFormat}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(opportunity, 'website', index)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeWebsiteOpportunity(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <span className="ml-2 font-medium">{opportunity.location}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 font-medium">{opportunity.specifications?.size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="ml-2 font-medium">${opportunity.pricing?.flatRate}/month</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impressions:</span>
                      <span className="ml-2 font-medium">{opportunity.monthlyImpressions?.toLocaleString()}/month</span>
                    </div>
                  </div>
                </Card>
              ))}
              
              {(!currentPublication.distributionChannels?.website?.advertisingOpportunities || 
                currentPublication.distributionChannels.website.advertisingOpportunities.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Website Ads</h3>
                  <p className="mb-4">Create your first website advertising opportunity.</p>
                  <Button onClick={addWebsiteOpportunity}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Website Ad
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Podcasts */}
        <TabsContent value="podcasts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Mic className="w-5 h-5" />
              Podcast Channels
            </h3>
            <Button onClick={() => addDistributionChannel('podcasts')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Podcast
            </Button>
          </div>
          
          <div className="space-y-4">
            {currentPublication.distributionChannels?.podcasts?.map((podcast, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{podcast.name}</h4>
                        <Badge variant="secondary">{podcast.frequency}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(podcast, 'podcast-container', index)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDistributionChannel('podcasts', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Downloads:</span>
                        <span className="ml-2 font-medium">{podcast.averageDownloads?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Listeners:</span>
                        <span className="ml-2 font-medium">{podcast.averageListeners?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Episodes:</span>
                        <span className="ml-2 font-medium">{podcast.episodeCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Platforms:</span>
                        <span className="ml-2 font-medium">{podcast.platforms?.join(', ')}</span>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addPodcastOpportunity(index)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Ad
                        </Button>
                      </div>
                      
                      {podcast.advertisingOpportunities && podcast.advertisingOpportunities.length > 0 ? (
                        <div className="space-y-2">
                          {podcast.advertisingOpportunities.map((ad, adIndex) => (
                            <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <div className="flex-1">
                                <span className="font-medium">{ad.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {ad.position} • {ad.duration} • {ad.pricing ? `$${ad.pricing.perEpisode || ad.pricing.flatRate || 'Custom'}` : 'Custom'}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openEditDialog(ad, 'podcast-ad', index, adIndex)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => removePodcastOpportunity(index, adIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                      )}
                    </div>
                  </Card>
                ))}
                
            {(!currentPublication.distributionChannels?.podcasts || 
              currentPublication.distributionChannels.podcasts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Podcasts</h3>
                <p className="mb-4">Create your first podcast channel using the button above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Radio Stations */}
        <TabsContent value="radio" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Radio className="w-5 h-5" />
              Radio Stations
            </h3>
            <Button onClick={() => addDistributionChannel('radio')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Radio Station
            </Button>
          </div>
          
          <div className="space-y-4">
            {currentPublication.distributionChannels?.radioStations?.map((station, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{station.callSign}</h4>
                        <Badge variant="secondary">{station.frequency}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(station, 'radio-container', index)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDistributionChannel('radio', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-2 font-medium">{station.format}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Coverage:</span>
                        <span className="ml-2 font-medium">{station.coverageArea}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Listeners:</span>
                        <span className="ml-2 font-medium">{station.listeners?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ads:</span>
                        <span className="ml-2 font-medium">{station.advertisingOpportunities?.length || 0}</span>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addRadioOpportunity(index)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Ad
                        </Button>
                      </div>
                      
                      {station.advertisingOpportunities && station.advertisingOpportunities.length > 0 ? (
                        <div className="space-y-2">
                          {station.advertisingOpportunities.map((ad, adIndex) => (
                            <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <div className="flex-1">
                                <span className="font-medium">{ad.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {ad.timeSlot} • {ad.duration} • {ad.pricing ? `$${ad.pricing.per30Second || ad.pricing.flatRate || 'Custom'}` : 'Custom'}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openEditDialog(ad, 'radio-ad', index, adIndex)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => removeRadioOpportunity(index, adIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                      )}
                    </div>
                  </Card>
                ))}
                
            {(!currentPublication.distributionChannels?.radioStations || 
              currentPublication.distributionChannels.radioStations.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Radio className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Radio Stations</h3>
                <p className="mb-4">Add your first radio station using the button above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Streaming Video */}
        <TabsContent value="streaming" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Video className="w-5 h-5" />
              Streaming Channels
            </h3>
            <Button onClick={() => addDistributionChannel('streaming')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Streaming Channel
            </Button>
          </div>
          
          <div className="space-y-4">
            {currentPublication.distributionChannels?.streamingVideo?.map((channel, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{channel.name}</h4>
                        <Badge variant="secondary">{channel.platform}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(channel, 'streaming-container', index)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDistributionChannel('streaming', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Subscribers:</span>
                        <span className="ml-2 font-medium">{channel.subscribers?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Views:</span>
                        <span className="ml-2 font-medium">{channel.averageViews?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Content:</span>
                        <span className="ml-2 font-medium">{channel.contentType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ads:</span>
                        <span className="ml-2 font-medium">{channel.advertisingOpportunities?.length || 0}</span>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addStreamingOpportunity(index)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Ad
                        </Button>
                      </div>
                      
                      {channel.advertisingOpportunities && channel.advertisingOpportunities.length > 0 ? (
                        <div className="space-y-2">
                          {channel.advertisingOpportunities.map((ad, adIndex) => (
                            <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <div className="flex-1">
                                <span className="font-medium">{ad.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {ad.position} • {ad.duration} • {ad.pricing ? `$${ad.pricing.perThousandViews || ad.pricing.flatRate || 'Custom'}` : 'Custom'}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openEditDialog(ad, 'streaming-ad', index, adIndex)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => removeStreamingOpportunity(index, adIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                      )}
                    </div>
                  </Card>
                ))}
                
            {(!currentPublication.distributionChannels?.streamingVideo || 
              currentPublication.distributionChannels.streamingVideo.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Streaming Channels</h3>
                <p className="mb-4">Create your first streaming video channel using the button above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Print Publications */}
        <TabsContent value="print" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Printer className="w-5 h-5" />
              Print Publications
            </h3>
            <Button onClick={() => addDistributionChannel('print')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Print Publication
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Convert single print object to array for consistent handling */}
            {(() => {
                  let printArray = [];
                  if (currentPublication.distributionChannels?.print) {
                    if (Array.isArray(currentPublication.distributionChannels.print)) {
                      printArray = currentPublication.distributionChannels.print;
                    } else {
                      // Convert object to array format
                      printArray = [{
                        ...currentPublication.distributionChannels.print,
                        name: currentPublication.basicInfo?.publicationName || 'Print Publication'
                      }];
                    }
                  }
                  
                  return printArray.map((publication, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold">{publication.name}</h4>
                          <Badge variant="secondary">{publication.frequency}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(publication, 'print-container', index)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeDistributionChannel('print', index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Circulation:</span>
                          <span className="ml-2 font-medium">{publication.circulation?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequency:</span>
                          <span className="ml-2 font-medium">{publication.frequency}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ads:</span>
                          <span className="ml-2 font-medium">{publication.advertisingOpportunities?.length || 0}</span>
                        </div>
                      </div>

                      {/* Advertising Opportunities */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addPrintOpportunity(index)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Ad
                          </Button>
                        </div>
                        
                        {publication.advertisingOpportunities && publication.advertisingOpportunities.length > 0 ? (
                          <div className="space-y-2">
                            {publication.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                <div className="flex-1">
                                  <span className="font-medium">{ad.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {ad.adType} • {ad.size} • {ad.pricing ? `$${ad.pricing.flatRate || ad.pricing.perIssue || 'Custom'}` : 'Custom'}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'print-ad', index, adIndex)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => removePrintOpportunity(index, adIndex)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                        )}
                      </div>
                    </Card>
                  ));
                })()}
                
            {!currentPublication.distributionChannels?.print && (
              <div className="text-center py-8 text-muted-foreground">
                <Printer className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Print Publications</h3>
                <p className="mb-4">Add your first print publication using the button above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Other tabs can be implemented similarly... */}
        <TabsContent value="newsletters" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Mail className="w-5 h-5" />
              Newsletter Advertising
            </h3>
            <Button onClick={addNewsletter}>
              <Plus className="w-4 h-4 mr-2" />
              Add Newsletter
            </Button>
          </div>
          
          <div className="space-y-4">
            {currentPublication.distributionChannels?.newsletters?.map((newsletter, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold">{newsletter.name}</h4>
                    <Badge variant="secondary">{newsletter.frequency}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addNewsletterOpportunity(index)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Ad
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(newsletter, 'newsletter-container', index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeDistributionChannel('newsletters', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="ml-2 font-medium">{newsletter.subject}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subscribers:</span>
                    <span className="ml-2 font-medium">{newsletter.subscribers?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="ml-2 font-medium">{newsletter.frequency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ads:</span>
                    <span className="ml-2 font-medium">{newsletter.advertisingOpportunities?.length || 0}</span>
                  </div>
                </div>

                {/* Advertising Opportunities */}
                <div className="mt-4">
                  <h5 className="font-medium text-sm mb-2">Advertising Opportunities</h5>
                  {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 ? (
                    <div className="space-y-2">
                      {newsletter.advertisingOpportunities.map((ad, adIndex) => (
                        <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{ad.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {ad.position} • {ad.dimensions} • {ad.pricing ? `$${ad.pricing.perSend || ad.pricing.flatRate || 'Custom'}` : 'Custom'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditDialog(ad, 'newsletter', index, adIndex)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => removeNewsletterOpportunity(index, adIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                </div>
              </Card>
            ))}
            
            {(!currentPublication.distributionChannels?.newsletters || 
              currentPublication.distributionChannels.newsletters.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Newsletters</h3>
                <p className="mb-4">Create your first newsletter.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Users className="w-5 h-5" />
              Social Media Advertising
            </h3>
            <Button onClick={addSocialMediaProfile}>
              <Plus className="w-4 h-4 mr-2" />
              Add Profile
            </Button>
          </div>
          
          <div className="space-y-4">
            {currentPublication.distributionChannels?.socialMedia?.map((profile, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold capitalize">{profile.platform}</h4>
                    <Badge variant="secondary">@{profile.handle}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(profile, 'social-media-container', index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeDistributionChannel('socialMedia', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Platform:</span>
                    <span className="ml-2 font-medium capitalize">{profile.platform}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Followers:</span>
                    <span className="ml-2 font-medium">{profile.metrics?.followers?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verified:</span>
                    <span className="ml-2 font-medium">{profile.verified ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ads:</span>
                    <span className="ml-2 font-medium">{profile.advertisingOpportunities?.length || 0}</span>
                  </div>
                </div>

                {/* Advertising Opportunities */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addSocialMediaOpportunity(index)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Ad
                    </Button>
                  </div>
                  
                  {profile.advertisingOpportunities && profile.advertisingOpportunities.length > 0 ? (
                    <div className="space-y-2">
                      {profile.advertisingOpportunities.map((ad, adIndex) => (
                        <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{ad.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {ad.adType} • {ad.duration} • {ad.pricing ? `$${ad.pricing.perPost || ad.pricing.flatRate || 'Custom'}` : 'Custom'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditDialog(ad, 'social-media-ad', index, adIndex)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => removeSocialMediaOpportunity(index, adIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                </div>
              </Card>
            ))}
            
            {(!currentPublication.distributionChannels?.socialMedia || 
              currentPublication.distributionChannels.socialMedia.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Social Media</h3>
                <p className="mb-4">Add your first social media profile.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="w-auto max-w-max max-h-[90vh] flex flex-col overflow-x-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Edit {editingType === 'website' ? 'Website' : 
                   editingType === 'newsletter' ? 'Newsletter' :
                   editingType === 'print-ad' ? 'Print' :
                   editingType === 'podcast-ad' ? 'Podcast' :
                   editingType === 'radio-ad' ? 'Radio' :
                   editingType === 'streaming-ad' ? 'Streaming Video' :
                   editingType === 'social-media-ad' ? 'Social Media' :
                   editingType === 'newsletter-container' ? 'Newsletter Properties' :
                   editingType === 'print-container' ? 'Print Properties' :
                   editingType === 'podcast-container' ? 'Podcast Properties' :
                   editingType === 'radio-container' ? 'Radio Properties' :
                   editingType === 'streaming-container' ? 'Streaming Properties' :
                   editingType === 'social-media-container' ? 'Social Media Properties' :
                   'Item'} {editingType?.includes('-container') ? '' : editingType?.includes('-ad') ? 'Advertising Opportunity' : 'Advertising Opportunity'}
            </DialogTitle>
            <DialogDescription>
              {editingType?.includes('-container') 
                ? 'Update the properties and metrics for this channel.'
                : 'Update the details for this advertising opportunity.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 pr-2">
              
              {/* Website Ad Fields */}
              {editingType === 'website' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Homepage Banner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editingItem.location || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                        placeholder="Homepage, Header, Sidebar"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Input
                        id="adFormat"
                        value={editingItem.adFormat || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, adFormat: e.target.value })}
                        placeholder="Banner, Rectangle, Leaderboard"
                      />
                    </div>
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
                        placeholder="728x90, 300x250"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="monthlyImpressions">Monthly Impressions</Label>
                    <Input
                      id="monthlyImpressions"
                      type="number"
                      value={editingItem.monthlyImpressions || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, monthlyImpressions: parseInt(e.target.value) || 0 })}
                      placeholder="10000"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'flatRate', label: 'Flat Rate', placeholder: '100' },
                      { key: 'cpm', label: 'CPM', placeholder: '5' }
                    ]}
                    pricingModels={[
                      { value: 'flat', label: '/month' },
                      { value: 'cpm', label: '/1000 impressions' },
                      { value: 'cpc', label: '/click' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

              {/* Newsletter Ad Fields */}
              {editingType === 'newsletter' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Header Banner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={editingItem.position || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
                        placeholder="Header, Inline, Footer"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      value={editingItem.dimensions || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, dimensions: e.target.value })}
                      placeholder="600x200, 300x250"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'perSend', label: 'Per Send', placeholder: '50' },
                      { key: 'monthly', label: 'Monthly Rate', placeholder: '200' }
                    ]}
                    pricingModels={[
                      { value: 'per_send', label: '/send' },
                      { value: 'monthly', label: '/month' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

              {/* Print Ad Fields */}
              {editingType === 'print-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Full Page Ad"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || 'full page'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full page">Full Page</SelectItem>
                          <SelectItem value="half page">Half Page</SelectItem>
                          <SelectItem value="quarter page">Quarter Page</SelectItem>
                          <SelectItem value="eighth page">Eighth Page</SelectItem>
                          <SelectItem value="business card">Business Card</SelectItem>
                          <SelectItem value="classified">Classified</SelectItem>
                          <SelectItem value="insert">Insert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dimensions">Dimensions</Label>
                      <Input
                        id="dimensions"
                        value={editingItem.dimensions || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, dimensions: e.target.value })}
                        placeholder="10.25 x 13.75 inches"
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Color Options</Label>
                      <Select
                        value={editingItem.color || 'both'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, color: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select color option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="black and white">Black and White</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Preferred Page Placement</Label>
                    <Input
                      id="location"
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      placeholder="Front page, Back page, Inside front cover"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'oneTime', label: 'One Time', placeholder: '500' },
                      { key: 'fourTimes', label: '4 Times', placeholder: '450' },
                      { key: 'twelveTimes', label: '12 Times', placeholder: '400' },
                      { key: 'openRate', label: 'Open Rate', placeholder: '550' }
                    ]}
                    pricingModels={[
                      { value: 'one_time', label: '/issue' },
                      { value: 'package', label: '/package' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                  
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Specifications</Label>
                    <div className="grid grid-cols-2 gap-4">
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
                          placeholder="PDF, JPEG, PNG"
                        />
                      </div>
                      <div>
                        <Label htmlFor="resolution">Resolution</Label>
                        <Input
                          id="resolution"
                          value={editingItem.specifications?.resolution || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            specifications: { 
                              ...editingItem.specifications, 
                              resolution: e.target.value 
                            } 
                          })}
                          placeholder="300 DPI"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bleed"
                        checked={editingItem.specifications?.bleed || false}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            bleed: e.target.checked 
                          } 
                        })}
                      />
                      <Label htmlFor="bleed">Requires Bleed</Label>
                    </div>
                  </div>
                </>
              )}

              {/* Podcast Ad Fields */}
              {editingType === 'podcast-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Mid-roll Sponsor Spot"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={editingItem.position || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
                        placeholder="Pre-roll, Mid-roll, Post-roll"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={editingItem.duration || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 30 })}
                      placeholder="30"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'flatRate', label: 'Per Episode', placeholder: '100' },
                      { key: 'cpm', label: 'CPM', placeholder: '25' }
                    ]}
                    pricingModels={[
                      { value: 'flat', label: '/episode' },
                      { value: 'cpm', label: '/1000 downloads' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

              {/* Radio Ad Fields */}
              {editingType === 'radio-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Drive Time Spot"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeSlot">Time Slot</Label>
                      <Input
                        id="timeSlot"
                        value={editingItem.timeSlot || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, timeSlot: e.target.value })}
                        placeholder="Drive Time Morning, Midday"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={editingItem.duration || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, duration: e.target.value })}
                      placeholder="30 seconds, 60 seconds"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'perSpot', label: 'Per Spot', placeholder: '150' },
                      { key: 'weekly', label: 'Weekly', placeholder: '500' },
                      { key: 'monthly', label: 'Monthly', placeholder: '1800' }
                    ]}
                    pricingModels={[
                      { value: 'per_spot', label: '/spot' },
                      { value: 'weekly', label: '/week' },
                      { value: 'monthly', label: '/month' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

              {/* Streaming Ad Fields */}
              {editingType === 'streaming-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Pre-roll Video Ad"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={editingItem.position || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
                        placeholder="Pre-roll, Mid-roll, Overlay"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={editingItem.duration || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 15 })}
                      placeholder="15"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'cpm', label: 'CPM', placeholder: '15' },
                      { key: 'flatRate', label: 'Flat Rate', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'cpm', label: '/1000 views' },
                      { value: 'flat', label: '/video' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

              {/* Social Media Ad Fields */}
              {editingType === 'social-media-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Sponsored Post"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adType">Ad Type</Label>
                      <Input
                        id="adType"
                        value={editingItem.adType || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, adType: e.target.value })}
                        placeholder="Sponsored Post, Story Ad, Video Ad"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={editingItem.duration || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, duration: e.target.value })}
                      placeholder="24h, 1 week"
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'perPost', label: 'Per Post', placeholder: '100' },
                      { key: 'perStory', label: 'Per Story', placeholder: '75' },
                      { key: 'monthly', label: 'Monthly', placeholder: '500' }
                    ]}
                    pricingModels={[
                      { value: 'per_post', label: '/post' },
                      { value: 'per_story', label: '/story' },
                      { value: 'monthly', label: '/month' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    onDefaultPricingChange={(pricing) => 
                      setEditingItem({ ...editingItem, pricing })
                    }
                    onHubPricingChange={(hubPricing) => 
                      setEditingItem({ ...editingItem, hubPricing })
                    }
                  />
                </>
              )}

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
                        placeholder="Weekly Newsletter"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={editingItem.subject || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, subject: e.target.value })}
                        placeholder="Newsletter Subject"
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
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="openRate">Open Rate (%)</Label>
                      <Input
                        id="openRate"
                        type="number"
                        value={editingItem.openRate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, openRate: parseFloat(e.target.value) || 0 })}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                        placeholder="Weekly, Monthly"
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
                      <Label htmlFor="printName">Publication Name</Label>
                      <Input
                        id="printName"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Print Publication"
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                        placeholder="Weekly, Monthly"
                      />
                    </div>
                    <div>
                      <Label htmlFor="circulation">Total Circulation</Label>
                      <Input
                        id="circulation"
                        type="number"
                        value={editingItem.circulation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, circulation: parseInt(e.target.value) || 0 })}
                        placeholder="50000"
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
                        placeholder="30000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="freeCirculation">Free Circulation</Label>
                      <Input
                        id="freeCirculation"
                        type="number"
                        value={editingItem.freeCirculation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, freeCirculation: parseInt(e.target.value) || 0 })}
                        placeholder="20000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="distributionArea">Distribution Area</Label>
                    <Input
                      id="distributionArea"
                      value={editingItem.distributionArea || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, distributionArea: e.target.value })}
                      placeholder="Chicago Metro Area"
                    />
                  </div>
                </>
              )}

              {/* Podcast Container Fields */}
              {editingType === 'podcast-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="podcastName">Podcast Name</Label>
                      <Input
                        id="podcastName"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="The Daily Show Podcast"
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                        placeholder="Weekly, Daily"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      placeholder="Brief description of the podcast"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="averageDownloads">Average Downloads</Label>
                      <Input
                        id="averageDownloads"
                        type="number"
                        value={editingItem.averageDownloads || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, averageDownloads: parseInt(e.target.value) || 0 })}
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="averageListeners">Average Listeners</Label>
                      <Input
                        id="averageListeners"
                        type="number"
                        value={editingItem.averageListeners || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, averageListeners: parseInt(e.target.value) || 0 })}
                        placeholder="25000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="episodeCount">Episode Count</Label>
                      <Input
                        id="episodeCount"
                        type="number"
                        value={editingItem.episodeCount || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, episodeCount: parseInt(e.target.value) || 0 })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Radio Container Fields */}
              {editingType === 'radio-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="callSign">Call Sign</Label>
                      <Input
                        id="callSign"
                        value={editingItem.callSign || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, callSign: e.target.value })}
                        placeholder="WXYZ"
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                        placeholder="101.5 FM"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="format">Format</Label>
                      <Input
                        id="format"
                        value={editingItem.format || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, format: e.target.value })}
                        placeholder="News/Talk, Classic Rock"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coverageArea">Coverage Area</Label>
                      <Input
                        id="coverageArea"
                        value={editingItem.coverageArea || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, coverageArea: e.target.value })}
                        placeholder="Metropolitan Area"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="listeners">Weekly Listeners</Label>
                    <Input
                      id="listeners"
                      type="number"
                      value={editingItem.listeners || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, listeners: parseInt(e.target.value) || 0 })}
                      placeholder="250000"
                    />
                  </div>
                </>
              )}

              {/* Streaming Container Fields */}
              {editingType === 'streaming-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="channelName">Channel Name</Label>
                      <Input
                        id="channelName"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="News Channel Live"
                      />
                    </div>
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Input
                        id="platform"
                        value={editingItem.platform || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                        placeholder="YouTube, Twitch, Facebook Live"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subscribers">Subscribers</Label>
                      <Input
                        id="subscribers"
                        type="number"
                        value={editingItem.subscribers || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, subscribers: parseInt(e.target.value) || 0 })}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="averageViews">Average Views</Label>
                      <Input
                        id="averageViews"
                        type="number"
                        value={editingItem.averageViews || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, averageViews: parseInt(e.target.value) || 0 })}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="contentType">Content Type</Label>
                    <Input
                      id="contentType"
                      value={editingItem.contentType || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, contentType: e.target.value })}
                      placeholder="Live News, Recorded Shows, Mixed"
                    />
                  </div>
                </>
              )}

              {/* Social Media Container Fields */}
              {editingType === 'social-media-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Input
                        id="platform"
                        value={editingItem.platform || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                        placeholder="Facebook, Instagram, Twitter"
                      />
                    </div>
                    <div>
                      <Label htmlFor="handle">Handle</Label>
                      <Input
                        id="handle"
                        value={editingItem.handle || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, handle: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                  
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
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="verified"
                      checked={editingItem.verified || false}
                      onChange={(e) => setEditingItem({ ...editingItem, verified: e.target.checked })}
                    />
                    <Label htmlFor="verified">Verified Account</Label>
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
                        placeholder="WordPress, Drupal, Custom"
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
                              monthlyVisitors: parseInt(e.target.value) || 0 
                            } 
                          })}
                          placeholder="50000"
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
                              monthlyPageViews: parseInt(e.target.value) || 0 
                            } 
                          })}
                          placeholder="150000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="averageSessionDuration">Avg Session Duration (minutes)</Label>
                        <Input
                          id="averageSessionDuration"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.averageSessionDuration || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              averageSessionDuration: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          placeholder="3.2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pagesPerSession">Pages per Session</Label>
                        <Input
                          id="pagesPerSession"
                          type="number"
                          step="0.1"
                          value={editingItem.metrics?.pagesPerSession || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              pagesPerSession: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          placeholder="2.8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bounceRate">Bounce Rate (%)</Label>
                        <Input
                          id="bounceRate"
                          type="number"
                          min="0"
                          max="100"
                          value={editingItem.metrics?.bounceRate || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              bounceRate: parseInt(e.target.value) || 0 
                            } 
                          })}
                          placeholder="45"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobilePercentage">Mobile Traffic (%)</Label>
                        <Input
                          id="mobilePercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={editingItem.metrics?.mobilePercentage || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              mobilePercentage: parseInt(e.target.value) || 0 
                            } 
                          })}
                          placeholder="65"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Generic fallback for other types */}
              {!['website', 'newsletter', 'print-ad', 'podcast-ad', 'radio-ad', 'streaming-ad', 'social-media-ad', 'newsletter-container', 'print-container', 'podcast-container', 'radio-container', 'streaming-container', 'social-media-container'].includes(editingType) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={editingItem.name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={editingItem.pricing?.flatRate || editingItem.pricing?.perSend || editingItem.pricing?.perPost || ''}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        pricing: { 
                          ...editingItem.pricing,
                          flatRate: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="Enter price"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {editingItem && (
            <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button onClick={saveEditedItem}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
