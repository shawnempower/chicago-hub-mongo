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
  Plus, Edit, Trash2, DollarSign, Target, BarChart3, 
  Globe, Mail, Printer, Calendar, Package, Search,
  RefreshCw, Save, X, TrendingUp, Users, Mic, Radio, Video
} from 'lucide-react';

import { usePublications } from '@/hooks/usePublications';
import { PublicationFrontend } from '@/types/publication';
import { getPublicationById } from '@/api/publications';
import { HubPricingEditor, HubPrice } from '../dashboard/HubPricingEditor';

export const PublicationInventoryManager = () => {
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('');
  const [currentPublication, setCurrentPublication] = useState<PublicationFrontend | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('website');
  
  // Edit dialog states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'podcast' | 'radio' | 'streaming' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | 'podcast-container' | 'radio-container' | 'streaming-container' | 'podcast-ad' | 'radio-ad' | 'streaming-ad' | 'social-media-ad' | 'print-ad' | null>(null);
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
          if (updatedPublication.distributionChannels?.socialMedia) {
            updatedPublication.distributionChannels.socialMedia[editingIndex] = editingItem;
          }
          break;

        case 'podcast':
          if (updatedPublication.distributionChannels?.podcasts) {
            updatedPublication.distributionChannels.podcasts[editingIndex] = editingItem;
          }
          break;

        case 'radio':
          if (updatedPublication.distributionChannels?.radioStations) {
            updatedPublication.distributionChannels.radioStations[editingIndex] = editingItem;
          }
          break;

        case 'streaming':
          if (updatedPublication.distributionChannels?.streamingVideo) {
            updatedPublication.distributionChannels.streamingVideo[editingIndex] = editingItem;
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

        case 'podcast-ad':
          if (updatedPublication.distributionChannels?.podcasts && updatedPublication.distributionChannels.podcasts[editingIndex]?.advertisingOpportunities) {
            updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'radio-ad':
          if (updatedPublication.distributionChannels?.radioStations && updatedPublication.distributionChannels.radioStations[editingIndex]?.advertisingOpportunities) {
            updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'streaming-ad':
          if (updatedPublication.distributionChannels?.streamingVideo && updatedPublication.distributionChannels.streamingVideo[editingIndex]?.advertisingOpportunities) {
            updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'social-media-ad':
          if (updatedPublication.distributionChannels?.socialMedia && updatedPublication.distributionChannels.socialMedia[editingIndex]?.advertisingOpportunities) {
            updatedPublication.distributionChannels.socialMedia[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;

        case 'print-ad':
          if (updatedPublication.distributionChannels?.print && updatedPublication.distributionChannels.print[editingIndex]?.advertisingOpportunities) {
            updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities![editingSubIndex] = editingItem;
          }
          break;
      }

      await handleUpdatePublication(updatedPublication);
      
      // Update editingItem with the saved data so the form stays in sync
      // Don't close the dialog - keep it open so user can continue editing
      setEditingItem(JSON.parse(JSON.stringify(editingItem)));
      
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

  const addPrintOpportunity = async (printIndex: number) => {
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

    // Normalize print data - handle both array and single object cases
    const currentPrint = currentPublication.distributionChannels?.print;
    let updatedPrint: any[];
    
    if (Array.isArray(currentPrint)) {
      updatedPrint = [...currentPrint];
    } else if (currentPrint) {
      // Convert single object to array
      updatedPrint = [currentPrint];
    } else {
      updatedPrint = [];
    }

    if (updatedPrint[printIndex]) {
      updatedPrint[printIndex] = {
        ...updatedPrint[printIndex],
        advertisingOpportunities: [
          ...(updatedPrint[printIndex].advertisingOpportunities || []),
          newOpportunity
        ]
      };
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          print: updatedPrint
        }
      });
      toast.success('Print advertising opportunity added successfully');
    } catch (error) {
      console.error('Error adding print opportunity:', error);
      toast.error('Failed to add print advertising opportunity');
    }
  };

  const addEvent = async () => {
    if (!currentPublication) return;
    
    const newEvent = {
      name: 'New Event',
      type: 'Community Event',
      frequency: 'monthly',
      averageAttendance: null,
      targetAudience: 'General audience',
      location: 'TBD',
      advertisingOpportunities: []
    };

    const updatedEvents = [
      ...(currentPublication.distributionChannels?.events || []),
      newEvent
    ];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          events: updatedEvents
        }
      });
      toast.success('Event added successfully');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
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

  const removePrintOpportunity = (index: number) => {
    if (!currentPublication?.distributionChannels?.print?.advertisingOpportunities) return;

    const updatedOpportunities = currentPublication.distributionChannels.print.advertisingOpportunities.filter((_, i) => i !== index);

    handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        print: {
          ...currentPublication.distributionChannels.print,
          advertisingOpportunities: updatedOpportunities
        }
      }
    });
  };

  const addNewsletter = async () => {
    if (!currentPublication) return;
    
    const newNewsletter = {
      name: 'New Newsletter',
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
      toast.success('Newsletter added successfully');
    } catch (error) {
      console.error('Error adding newsletter:', error);
      toast.error('Failed to add newsletter');
    }
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
      platform: 'facebook' as const,
      handle: 'newhandle',
      url: 'https://facebook.com/newhandle',
      verified: false,
      metrics: {
        followers: 0,
        engagementRate: 0
      },
      lastUpdated: new Date().toISOString().split('T')[0],
      advertisingOpportunities: []
    };

    const updatedProfiles = [
      ...(currentPublication.distributionChannels?.socialMedia || []),
      newProfile
    ];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          socialMedia: updatedProfiles
        }
      });
      toast.success('Social media profile added successfully');
    } catch (error) {
      console.error('Error adding social media profile:', error);
      toast.error('Failed to add social media profile');
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
          publicationId: `print_${Date.now()}`,
          name: 'New Print Publication',
          frequency: 'weekly',
          circulation: 10000,
          paidCirculation: 8000,
          freeCirculation: 2000,
          distributionArea: 'Local',
          advertisingOpportunities: []
        };
        channelKey = 'print';
        break;
    }

    const updatedChannels = [
      ...(currentPublication.distributionChannels?.[channelKey as keyof typeof currentPublication.distributionChannels] as any[] || []),
      newChannel
    ];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          [channelKey]: updatedChannels
        }
      });
      toast.success(`${channelType} channel added successfully`);
    } catch (error) {
      console.error(`Error adding ${channelType} channel:`, error);
      toast.error(`Failed to add ${channelType} channel`);
    }
  };

  const removeDistributionChannel = async (channelType: 'podcasts' | 'radio' | 'streaming' | 'print', index: number) => {
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
    }

    const currentChannels = currentPublication.distributionChannels?.[channelKey as keyof typeof currentPublication.distributionChannels] as any[] || [];
    const updatedChannels = currentChannels.filter((_, i) => i !== index);

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          [channelKey]: updatedChannels
        }
      });
      toast.success(`${channelType} channel removed successfully`);
    } catch (error) {
      console.error(`Error removing ${channelType} channel:`, error);
      toast.error(`Failed to remove ${channelType} channel`);
    }
  };

  const addPodcastOpportunity = async (podcastIndex: number) => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Podcast Ad',
      adFormat: 'mid-roll' as const,
      duration: 30,
      pricing: {
        cpm: 25,
        pricingModel: 'cpm' as const
      },
      specifications: {
        format: 'mp3',
        bitrate: '128kbps'
      },
      available: true
    };

    const updatedPodcasts = [...(currentPublication.distributionChannels?.podcasts || [])];
    if (updatedPodcasts[podcastIndex]) {
      updatedPodcasts[podcastIndex] = {
        ...updatedPodcasts[podcastIndex],
        advertisingOpportunities: [
          ...(updatedPodcasts[podcastIndex].advertisingOpportunities || []),
          newOpportunity
        ]
      };
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          podcasts: updatedPodcasts
        }
      });
      toast.success('Podcast advertising opportunity added successfully');
    } catch (error) {
      console.error('Error adding podcast opportunity:', error);
      toast.error('Failed to add podcast advertising opportunity');
    }
  };

  const addRadioOpportunity = async (radioIndex: number) => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Radio Ad',
      adFormat: '30_second_spot' as const,
      timeSlot: 'drive_time_morning' as const,
      pricing: {
        perSpot: 150,
        pricingModel: 'per_spot' as const
      },
      specifications: {
        format: 'mp3',
        duration: 30,
        bitrate: '128kbps'
      },
      available: true
    };

    const updatedRadio = [...(currentPublication.distributionChannels?.radioStations || [])];
    if (updatedRadio[radioIndex]) {
      updatedRadio[radioIndex] = {
        ...updatedRadio[radioIndex],
        advertisingOpportunities: [
          ...(updatedRadio[radioIndex].advertisingOpportunities || []),
          newOpportunity
        ]
      };
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          radioStations: updatedRadio
        }
      });
      toast.success('Radio advertising opportunity added successfully');
    } catch (error) {
      console.error('Error adding radio opportunity:', error);
      toast.error('Failed to add radio advertising opportunity');
    }
  };

  const addStreamingOpportunity = async (streamingIndex: number) => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Streaming Ad',
      adFormat: 'pre-roll' as const,
      duration: 15,
      pricing: {
        cpm: 15,
        pricingModel: 'cpm' as const
      },
      specifications: {
        format: 'mp4',
        resolution: '1080p',
        aspectRatio: '16:9'
      },
      available: true
    };

    const updatedStreaming = [...(currentPublication.distributionChannels?.streamingVideo || [])];
    if (updatedStreaming[streamingIndex]) {
      updatedStreaming[streamingIndex] = {
        ...updatedStreaming[streamingIndex],
        advertisingOpportunities: [
          ...(updatedStreaming[streamingIndex].advertisingOpportunities || []),
          newOpportunity
        ]
      };
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          streamingVideo: updatedStreaming
        }
      });
      toast.success('Streaming advertising opportunity added successfully');
    } catch (error) {
      console.error('Error adding streaming opportunity:', error);
      toast.error('Failed to add streaming advertising opportunity');
    }
  };

  const addSocialMediaOpportunity = async (socialIndex: number) => {
    if (!currentPublication) return;
    
    const newOpportunity = {
      name: 'New Social Media Ad',
      adFormat: 'sponsored_post' as const,
      pricing: {
        perPost: 100,
        pricingModel: 'per_post' as const
      },
      specifications: {
        format: 'image_video',
        aspectRatio: '1:1'
      },
      available: true
    };

    const updatedSocialMedia = [...(currentPublication.distributionChannels?.socialMedia || [])];
    if (updatedSocialMedia[socialIndex]) {
      updatedSocialMedia[socialIndex] = {
        ...updatedSocialMedia[socialIndex],
        advertisingOpportunities: [
          ...(updatedSocialMedia[socialIndex].advertisingOpportunities || []),
          newOpportunity
        ]
      };
    }

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          socialMedia: updatedSocialMedia
        }
      });
      toast.success('Social media advertising opportunity added successfully');
    } catch (error) {
      console.error('Error adding social media opportunity:', error);
      toast.error('Failed to add social media advertising opportunity');
    }
  };

  const formatPrice = (pricing: any) => {
    if (pricing?.flatRate) return `$${pricing.flatRate.toLocaleString()}`;
    if (pricing?.cpm) return `$${pricing.cpm} CPM`;
    if (pricing?.perSend) return `$${pricing.perSend} per send`;
    if (pricing?.perSpot) return `$${pricing.perSpot} per spot`;
    if (pricing?.perPost) return `$${pricing.perPost} per post`;
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="shadow-sm rounded-lg">
        <TabsList className="grid w-full grid-cols-9">
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
            Social ({currentPublication.distributionChannels?.socialMedia?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="podcasts" className="flex items-center gap-1 text-sm">
            <Mic className="w-3 h-3" />
            Podcasts ({currentPublication.distributionChannels?.podcasts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="radio" className="flex items-center gap-1 text-sm">
            <Radio className="w-3 h-3" />
            Radio ({currentPublication.distributionChannels?.radioStations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="streaming" className="flex items-center gap-1 text-sm">
            <Video className="w-3 h-3" />
            Streaming ({currentPublication.distributionChannels?.streamingVideo?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Website Advertising */}
        <TabsContent value="website" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Website Channel</h3>
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
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Newsletters</h3>
            <Button onClick={addNewsletter}>
              <Plus className="w-4 h-4 mr-2" />
              Add Newsletter
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.newsletters?.map((newsletter, newsletterIndex) => (
              <Card key={newsletterIndex} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{newsletter.name || 'Unnamed Newsletter'}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {newsletter.frequency || 'Not Set'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Subscribers:</span>
                          <span className="ml-2 font-medium">{newsletter.subscribers?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Open Rate:</span>
                          <span className="ml-2 font-medium">{newsletter.openRate ? `${newsletter.openRate}%` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subject:</span>
                          <span className="ml-2 font-medium">{newsletter.subject || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
                          <span className="ml-2 font-medium">{newsletter.advertisingOpportunities?.length || 0}</span>
                        </div>
                      </div>

                      {/* Advertising Opportunities */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addNewsletterOpportunity(newsletterIndex)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Ad
                          </Button>
                        </div>
                        
                        {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 ? (
                          <div className="space-y-2">
                            {newsletter.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                <div className="flex-1">
                                  <span className="font-medium">{ad.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {ad.position} • {ad.dimensions} • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'newsletter', newsletterIndex, adIndex)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      const updatedNewsletters = [...(currentPublication.distributionChannels?.newsletters || [])];
                                      if (updatedNewsletters[newsletterIndex]?.advertisingOpportunities) {
                                        updatedNewsletters[newsletterIndex].advertisingOpportunities = 
                                          updatedNewsletters[newsletterIndex].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            newsletters: updatedNewsletters
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(newsletter, 'newsletter-container', newsletterIndex)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          const updatedNewsletters = currentPublication.distributionChannels?.newsletters?.filter((_, i) => i !== newsletterIndex) || [];
                          handleUpdatePublication({ 
                            distributionChannels: {
                              ...currentPublication.distributionChannels,
                              newsletters: updatedNewsletters
                            }
                          });
                          toast.success('Newsletter removed successfully');
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
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Newsletters</h3>
                    <p className="text-gray-500 mb-4">Add newsletters to track email advertising opportunities.</p>
                    <Button onClick={addNewsletter}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Newsletter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Cross-Channel Packages */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Cross-Channel Packages</h3>
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
                        <Badge variant="secondary" className="text-xs">
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

        {/* Print Publications */}
        <TabsContent value="print" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Print Publications</h3>
            <Button onClick={() => addDistributionChannel('print')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Print Publication
            </Button>
          </div>
          
          <div className="grid gap-4">
            {(Array.isArray(currentPublication.distributionChannels?.print) 
              ? currentPublication.distributionChannels.print 
              : currentPublication.distributionChannels?.print 
                ? [currentPublication.distributionChannels.print] 
                : []
            )?.map((printPub, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{printPub.name || 'Unnamed Publication'}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {printPub.frequency || 'Not Set'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Circulation:</span>
                          <span className="ml-2 font-medium">{printPub.circulation?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Distribution Area:</span>
                          <span className="ml-2 font-medium">{printPub.distributionArea || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paid Circulation:</span>
                          <span className="ml-2 font-medium">{printPub.paidCirculation?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
                          <span className="ml-2 font-medium">{printPub.advertisingOpportunities?.length || 0}</span>
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
                        
                        {printPub.advertisingOpportunities && printPub.advertisingOpportunities.length > 0 ? (
                          <div className="space-y-2">
                            {printPub.advertisingOpportunities.map((ad, adIndex) => (
                              <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                <div className="flex-1">
                                  <span className="font-medium">{ad.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {ad.dimensions} • {ad.adFormat} • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'print-ad', adIndex, index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      // Normalize print data - handle both array and single object cases
                                      const currentPrint = currentPublication.distributionChannels?.print;
                                      let updatedPrint: any[];
                                      
                                      if (Array.isArray(currentPrint)) {
                                        updatedPrint = [...currentPrint];
                                      } else if (currentPrint) {
                                        updatedPrint = [currentPrint];
                                      } else {
                                        updatedPrint = [];
                                      }

                                      if (updatedPrint[index]?.advertisingOpportunities) {
                                        updatedPrint[index].advertisingOpportunities = 
                                          updatedPrint[index].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            print: updatedPrint
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(printPub, 'print-container', index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeDistributionChannel('print', index)}
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
                    <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Print Publications</h3>
                    <p className="text-gray-500 mb-4">Add print publications to track print advertising opportunities.</p>
                    <Button onClick={() => addDistributionChannel('print')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Publication
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
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Event Sponsorships</h3>
            <Button onClick={addEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
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
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(event, 'event-container', eventIndex)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          const updatedEvents = currentPublication.distributionChannels?.events?.filter((_, i) => i !== eventIndex) || [];
                          handleUpdatePublication({ 
                            distributionChannels: {
                              ...currentPublication.distributionChannels,
                              events: updatedEvents
                            }
                          });
                          toast.success('Event removed successfully');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              const updatedEvents = [...(currentPublication.distributionChannels?.events || [])];
                              if (updatedEvents[eventIndex]?.advertisingOpportunities) {
                                updatedEvents[eventIndex].advertisingOpportunities = 
                                  updatedEvents[eventIndex].advertisingOpportunities.filter((_, i) => i !== oppIndex);
                                handleUpdatePublication({
                                  distributionChannels: {
                                    ...currentPublication.distributionChannels,
                                    events: updatedEvents
                                  }
                                });
                                toast.success('Event advertising opportunity removed successfully');
                              }
                            }}
                          >
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
                    <Button onClick={addEvent}>
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
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Social Media Profiles</h3>
            <Button onClick={addSocialMediaProfile}>
              <Plus className="w-4 h-4 mr-2" />
              Add Profile
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.socialMedia?.map((profile, index) => (
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
                        <Badge variant="secondary" className="text-xs">
                          @{profile.handle}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Followers:</span>
                          <span className="ml-2 font-medium">{profile.metrics?.followers?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Engagement Rate:</span>
                          <span className="ml-2 font-medium">{profile.metrics?.engagementRate ? `${profile.metrics.engagementRate}%` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Verified:</span>
                          <span className="ml-2 font-medium">{profile.verified ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
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
                                    {ad.adFormat} • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'social-media-ad', adIndex, index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      const updatedSocialMedia = [...(currentPublication.distributionChannels?.socialMedia || [])];
                                      if (updatedSocialMedia[index]?.advertisingOpportunities) {
                                        updatedSocialMedia[index].advertisingOpportunities = 
                                          updatedSocialMedia[index].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            socialMedia: updatedSocialMedia
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2 ml-4">
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
                          const updatedProfiles = currentPublication.distributionChannels?.socialMedia?.filter((_, i) => i !== index) || [];
                          handleUpdatePublication({ 
                            distributionChannels: {
                              ...currentPublication.distributionChannels,
                              socialMedia: updatedProfiles
                            }
                          });
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

        {/* Podcasts Management */}
        <TabsContent value="podcasts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Podcast Channels</h3>
            <Button onClick={() => addDistributionChannel('podcasts')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Podcast
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.podcasts?.map((podcast, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{podcast.name || 'Unnamed Podcast'}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {podcast.frequency || 'Not Set'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Average Downloads:</span>
                          <span className="ml-2 font-medium">{podcast.averageDownloads?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Episodes:</span>
                          <span className="ml-2 font-medium">{podcast.episodeCount || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Platforms:</span>
                          <span className="ml-2 font-medium">{podcast.platforms?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
                          <span className="ml-2 font-medium">{podcast.advertisingOpportunities?.length || 0}</span>
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
                                    {ad.adFormat} • {ad.duration}s • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'podcast-ad', adIndex, index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      const updatedPodcasts = [...(currentPublication.distributionChannels?.podcasts || [])];
                                      if (updatedPodcasts[index]?.advertisingOpportunities) {
                                        updatedPodcasts[index].advertisingOpportunities = 
                                          updatedPodcasts[index].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            podcasts: updatedPodcasts
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(podcast, 'podcast' as any, index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeDistributionChannel('podcasts', index)}
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
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Podcast Channels</h3>
                    <p className="text-gray-500 mb-4">Add podcast channels to track audio advertising opportunities.</p>
                    <Button onClick={() => addDistributionChannel('podcasts')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Podcast
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Radio Management */}
        <TabsContent value="radio" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Radio Stations</h3>
            <Button onClick={() => addDistributionChannel('radio')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Radio Station
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.radioStations?.map((station, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{station.callSign || 'Unnamed Station'}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {station.frequency || 'Not Set'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Format:</span>
                          <span className="ml-2 font-medium">{station.format || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage Area:</span>
                          <span className="ml-2 font-medium">{station.coverageArea || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weekly Listeners:</span>
                          <span className="ml-2 font-medium">{station.listeners?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
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
                                    {ad.adFormat} • {ad.timeSlot} • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'radio-ad', adIndex, index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      const updatedRadio = [...(currentPublication.distributionChannels?.radioStations || [])];
                                      if (updatedRadio[index]?.advertisingOpportunities) {
                                        updatedRadio[index].advertisingOpportunities = 
                                          updatedRadio[index].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            radioStations: updatedRadio
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(station, 'radio' as any, index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeDistributionChannel('radio', index)}
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
                    <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Radio Stations</h3>
                    <p className="text-gray-500 mb-4">Add radio stations to track broadcast advertising opportunities.</p>
                    <Button onClick={() => addDistributionChannel('radio')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Station
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Streaming Video Management */}
        <TabsContent value="streaming" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-semibold" style={{ fontSize: '1.0rem' }}>Streaming Video Channels</h3>
            <Button onClick={() => addDistributionChannel('streaming')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Streaming Channel
            </Button>
          </div>
          
          <div className="grid gap-4">
            {currentPublication.distributionChannels?.streamingVideo?.map((channel, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{channel.name || 'Unnamed Channel'}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {channel.platform || 'Not Set'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Subscribers:</span>
                          <span className="ml-2 font-medium">{channel.subscribers?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Views:</span>
                          <span className="ml-2 font-medium">{channel.averageViews?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Content Type:</span>
                          <span className="ml-2 font-medium">{channel.contentType || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ad Opportunities:</span>
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
                                    {ad.adFormat} • {ad.duration}s • {formatPrice(ad.pricing)}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditDialog(ad, 'streaming-ad', adIndex, index)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      const updatedStreaming = [...(currentPublication.distributionChannels?.streamingVideo || [])];
                                      if (updatedStreaming[index]?.advertisingOpportunities) {
                                        updatedStreaming[index].advertisingOpportunities = 
                                          updatedStreaming[index].advertisingOpportunities.filter((_, i) => i !== adIndex);
                                        handleUpdatePublication({
                                          distributionChannels: {
                                            ...currentPublication.distributionChannels,
                                            streamingVideo: updatedStreaming
                                          }
                                        });
                                      }
                                    }}
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(channel, 'streaming' as any, index)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeDistributionChannel('streaming', index)}
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
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Streaming Channels</h3>
                    <p className="text-gray-500 mb-4">Add streaming video channels to track video advertising opportunities.</p>
                    <Button onClick={() => addDistributionChannel('streaming')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Channel
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Edit {editingType === 'website' ? 'Website' : 
                   editingType === 'newsletter' ? 'Newsletter' :
                   editingType === 'print' ? 'Print' :
                   editingType === 'event' ? 'Event' :
                   editingType === 'package' ? 'Package' :
                   editingType === 'social-media' ? 'Social Media Profile' :
                   editingType === 'podcast' ? 'Podcast Channel' :
                   editingType === 'radio' ? 'Radio Station' :
                   editingType === 'streaming' ? 'Streaming Channel' :
                   editingType === 'newsletter-container' ? 'Newsletter Properties' :
                   editingType === 'event-container' ? 'Event Properties' :
                   editingType === 'website-container' ? 'Website Properties' :
                   editingType === 'print-container' ? 'Print Properties' :
                   editingType === 'podcast-container' ? 'Podcast Properties' :
                   editingType === 'radio-container' ? 'Radio Properties' :
                   editingType === 'streaming-container' ? 'Streaming Properties' :
                   editingType === 'podcast-ad' ? 'Podcast' :
                   editingType === 'radio-ad' ? 'Radio' :
                   editingType === 'streaming-ad' ? 'Streaming Video' :
                   editingType === 'social-media-ad' ? 'Social Media' :
                   editingType === 'print-ad' ? 'Print' :
                   'Item'} {editingType?.includes('-container') || editingType === 'package' || editingType === 'social-media' || editingType === 'podcast' || editingType === 'radio' || editingType === 'streaming' ? '' : 'Advertising Opportunity'}
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
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              
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

              {/* Podcast Channel Fields */}
              {editingType === 'podcast' && (
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
                      <Select
                        value={editingItem.frequency || 'weekly'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="irregular">Irregular</SelectItem>
                        </SelectContent>
                      </Select>
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
                  
                  <div className="grid grid-cols-2 gap-4">
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

              {/* Radio Station Fields */}
              {editingType === 'radio' && (
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
                      <Select
                        value={editingItem.format || 'news_talk'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, format: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="news_talk">News/Talk</SelectItem>
                          <SelectItem value="classic_rock">Classic Rock</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
                          <SelectItem value="pop">Pop</SelectItem>
                          <SelectItem value="hip_hop">Hip Hop</SelectItem>
                          <SelectItem value="jazz">Jazz</SelectItem>
                          <SelectItem value="classical">Classical</SelectItem>
                          <SelectItem value="alternative">Alternative</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* Streaming Video Channel Fields */}
              {editingType === 'streaming' && (
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
                      <Select
                        value={editingItem.platform || 'youtube'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, platform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="twitch">Twitch</SelectItem>
                          <SelectItem value="facebook_live">Facebook Live</SelectItem>
                          <SelectItem value="instagram_live">Instagram Live</SelectItem>
                          <SelectItem value="linkedin_live">LinkedIn Live</SelectItem>
                          <SelectItem value="custom_streaming">Custom Streaming</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contentType">Content Type</Label>
                      <Select
                        value={editingItem.contentType || 'mixed'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, contentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live_news">Live News</SelectItem>
                          <SelectItem value="recorded_shows">Recorded Shows</SelectItem>
                          <SelectItem value="interviews">Interviews</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="streamingSchedule">Streaming Schedule</Label>
                      <Input
                        id="streamingSchedule"
                        value={editingItem.streamingSchedule || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, streamingSchedule: e.target.value })}
                        placeholder="Daily 9-11 AM"
                      />
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
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || 'mid-roll'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre-roll">Pre-roll</SelectItem>
                          <SelectItem value="mid-roll">Mid-roll</SelectItem>
                          <SelectItem value="post-roll">Post-roll</SelectItem>
                          <SelectItem value="host-read">Host-read</SelectItem>
                          <SelectItem value="programmatic">Programmatic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                            cpm: parseFloat(e.target.value) || 0,
                            pricingModel: 'cpm'
                          } 
                        })}
                        placeholder="25"
                      />
                    </div>
                  </div>
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
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || '30_second_spot'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15_second_spot">15 Second Spot</SelectItem>
                          <SelectItem value="30_second_spot">30 Second Spot</SelectItem>
                          <SelectItem value="60_second_spot">60 Second Spot</SelectItem>
                          <SelectItem value="live_read">Live Read</SelectItem>
                          <SelectItem value="sponsorship">Sponsorship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timeSlot">Time Slot</Label>
                      <Select
                        value={editingItem.timeSlot || 'drive_time_morning'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, timeSlot: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drive_time_morning">Drive Time Morning</SelectItem>
                          <SelectItem value="drive_time_evening">Drive Time Evening</SelectItem>
                          <SelectItem value="midday">Midday</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="overnight">Overnight</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="perSpot">Per Spot ($)</Label>
                      <Input
                        id="perSpot"
                        type="number"
                        value={editingItem.pricing?.perSpot || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            perSpot: parseFloat(e.target.value) || 0,
                            pricingModel: 'per_spot'
                          } 
                        })}
                        placeholder="150"
                      />
                    </div>
                  </div>
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
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || 'pre-roll'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre-roll">Pre-roll</SelectItem>
                          <SelectItem value="mid-roll">Mid-roll</SelectItem>
                          <SelectItem value="post-roll">Post-roll</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="display_banner">Display Banner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                            cpm: parseFloat(e.target.value) || 0,
                            pricingModel: 'cpm'
                          } 
                        })}
                        placeholder="15"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resolution">Resolution</Label>
                      <Select
                        value={editingItem.specifications?.resolution || '1080p'}
                        onValueChange={(value) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            resolution: value 
                          } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="1440p">1440p</SelectItem>
                          <SelectItem value="4k">4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                      <Select
                        value={editingItem.specifications?.aspectRatio || '16:9'}
                        onValueChange={(value) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            aspectRatio: value 
                          } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9</SelectItem>
                          <SelectItem value="4:3">4:3</SelectItem>
                          <SelectItem value="1:1">1:1</SelectItem>
                          <SelectItem value="9:16">9:16</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || 'sponsored_post'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sponsored_post">Sponsored Post</SelectItem>
                          <SelectItem value="story_ad">Story Ad</SelectItem>
                          <SelectItem value="video_ad">Video Ad</SelectItem>
                          <SelectItem value="carousel_ad">Carousel Ad</SelectItem>
                          <SelectItem value="collection_ad">Collection Ad</SelectItem>
                          <SelectItem value="influencer_partnership">Influencer Partnership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="perPost">Per Post ($)</Label>
                      <Input
                        id="perPost"
                        type="number"
                        value={editingItem.pricing?.perPost || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pricing: { 
                            ...editingItem.pricing, 
                            perPost: parseFloat(e.target.value) || 0,
                            pricingModel: 'per_post'
                          } 
                        })}
                        placeholder="100"
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
                            cpm: parseFloat(e.target.value) || 0,
                            pricingModel: 'cpm'
                          } 
                        })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="format">Content Format</Label>
                      <Select
                        value={editingItem.specifications?.format || 'image_video'}
                        onValueChange={(value) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            format: value 
                          } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image_only">Image Only</SelectItem>
                          <SelectItem value="video_only">Video Only</SelectItem>
                          <SelectItem value="image_video">Image & Video</SelectItem>
                          <SelectItem value="text_only">Text Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                      <Select
                        value={editingItem.specifications?.aspectRatio || '1:1'}
                        onValueChange={(value) => setEditingItem({ 
                          ...editingItem, 
                          specifications: { 
                            ...editingItem.specifications, 
                            aspectRatio: value 
                          } 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                          <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                          <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                          <SelectItem value="9:16">9:16 (Stories)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                        value={editingItem.adFormat || 'display_ad'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="display_ad">Display Ad</SelectItem>
                          <SelectItem value="classified">Classified</SelectItem>
                          <SelectItem value="insert">Insert</SelectItem>
                          <SelectItem value="advertorial">Advertorial</SelectItem>
                          <SelectItem value="business_card">Business Card</SelectItem>
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
                        placeholder='4" x 6"'
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Select
                        value={editingItem.color || 'color'}
                        onValueChange={(value) => setEditingItem({ ...editingItem, color: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select color option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="black_white">Black & White</SelectItem>
                          <SelectItem value="spot_color">Spot Color</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oneTime">One-time Price ($)</Label>
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
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fourTimes">4x Price ($)</Label>
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
                        placeholder="400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Regular advertising opportunity fields (only show for non-container, non-package, and non-social-media types) */}
              {!editingType?.includes('-container') && editingType !== 'package' && editingType !== 'social-media' && editingType !== 'podcast' && editingType !== 'radio' && editingType !== 'streaming' && editingType !== 'podcast-ad' && editingType !== 'radio-ad' && editingType !== 'streaming-ad' && editingType !== 'social-media-ad' && editingType !== 'print-ad' && (
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
                    <Select
                      value={editingItem.adFormat || 'banner'}
                      onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="takeover">Takeover</SelectItem>
                        <SelectItem value="sponsored_content">Sponsored Content</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
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

              {/* Ad Sizes - Multiple inputs (Website only) */}
              {editingType === 'website' && (
                <div className="space-y-2">
                  <Label>Ad Sizes</Label>
                  {((editingItem.sizes || []).length > 0 ? editingItem.sizes : ['']).map((size: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={size}
                        onChange={(e) => {
                          const newSizes = [...(editingItem.sizes || [''])];
                          newSizes[index] = e.target.value;
                          setEditingItem({ ...editingItem, sizes: newSizes });
                        }}
                        placeholder="e.g., 300x250, 728x90, 970x250"
                        className="flex-1"
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSizes = editingItem.sizes?.filter((_: any, i: number) => i !== index) || [];
                            setEditingItem({ ...editingItem, sizes: newSizes.length > 0 ? newSizes : undefined });
                          }}
                          className="px-3"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSizes = [...(editingItem.sizes || ['']), ''];
                      setEditingItem({ ...editingItem, sizes: newSizes });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Size
                  </Button>
                </div>
              )}

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
                </>
              )}

              {/* Pricing Section */}
                {editingType === 'website' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Flat Rate', placeholder: '100' },
                    { key: 'cpm', label: 'CPM', placeholder: '5' }
                  ]}
                  pricingModels={[
                    { value: 'flat', label: '/month' },
                    { value: 'per_week', label: '/week' },
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
                )}

                {editingType === 'newsletter' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Price', placeholder: '50' }
                  ]}
                  pricingModels={[
                    { value: 'per_send', label: '/send' },
                    { value: 'contact', label: 'Contact for pricing' }
                  ]}
                  conditionalFields={[
                    {
                      key: 'frequency',
                      label: 'Frequency',
                      type: 'text',
                      showWhen: ['per_send'],
                      placeholder: 'e.g., Weekly, Monthly, One time',
                      pattern: '^(?:One time|one time|Weekly|weekly|Monthly|monthly|Daily|daily|Bi-weekly|bi-weekly)$',
                      patternMessage: 'Enter a frequency like "Weekly", "Monthly", "Daily", "Bi-weekly", or "One time"'
                    }
                  ]}
                  onDefaultPricingChange={(pricing) => 
                    setEditingItem({ ...editingItem, pricing })
                  }
                  onHubPricingChange={(hubPricing) => 
                    setEditingItem({ ...editingItem, hubPricing })
                  }
                />
                )}

                {editingType === 'print' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Price', placeholder: '500' }
                  ]}
                  pricingModels={[
                    { value: 'per_ad', label: '/ad' },
                    { value: 'contact', label: 'Contact for pricing' }
                  ]}
                  conditionalFields={[
                    {
                      key: 'frequency',
                      label: 'Frequency',
                      type: 'text',
                      showWhen: ['per_ad'],
                      placeholder: 'e.g., 4x, 12x, One time',
                      pattern: '^(?:\\d+x|One time|one time)$',
                      patternMessage: 'Enter a frequency like "4x", "12x", or "One time"'
                    }
                  ]}
                  onDefaultPricingChange={(pricing) => 
                    setEditingItem({ ...editingItem, pricing })
                  }
                  onHubPricingChange={(hubPricing) => 
                    setEditingItem({ ...editingItem, hubPricing })
                  }
                />
              )}

              {editingType === 'podcast-ad' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Price', placeholder: '100' }
                  ]}
                  pricingModels={[
                    { value: 'per_ad', label: '/ad instance' },
                    { value: 'cpm', label: '/1000 downloads' },
                    { value: 'contact', label: 'Contact for pricing' }
                  ]}
                  conditionalFields={[
                    {
                      key: 'frequency',
                      label: 'Frequency',
                      type: 'text',
                      showWhen: ['per_ad'],
                      placeholder: 'e.g., 10x, 20x, One time',
                      pattern: '^(?:\\d+x|One time|one time)$',
                      patternMessage: 'Enter a frequency like "10x", "20x", or "One time"'
                    }
                  ]}
                  allowMultipleDefaultPricing={true}
                  onDefaultPricingChange={(pricing) => 
                    setEditingItem({ ...editingItem, pricing })
                  }
                  onHubPricingChange={(hubPricing) => 
                    setEditingItem({ ...editingItem, hubPricing })
                  }
                />
              )}

              {editingType === 'radio-ad' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Price', placeholder: '150' }
                  ]}
                  pricingModels={[
                    { value: 'per_spot', label: '/spot' },
                    { value: 'contact', label: 'Contact for pricing' }
                  ]}
                  conditionalFields={[
                    {
                      key: 'frequency',
                      label: 'Frequency',
                      type: 'text',
                      showWhen: ['per_spot'],
                      placeholder: 'e.g., Weekly, Monthly, One time',
                      pattern: '^(?:One time|one time|Weekly|weekly|Monthly|monthly|Daily|daily)$',
                      patternMessage: 'Enter a frequency like "Weekly", "Monthly", "Daily", or "One time"'
                    }
                  ]}
                  allowMultipleDefaultPricing={true}
                  onDefaultPricingChange={(pricing) => 
                    setEditingItem({ ...editingItem, pricing })
                  }
                  onHubPricingChange={(hubPricing) => 
                    setEditingItem({ ...editingItem, hubPricing })
                  }
                />
              )}

              {editingType === 'streaming-ad' && (
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
              )}

              {editingType === 'social-media-ad' && (
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
              )}

              {editingType === 'print-ad' && (
                <HubPricingEditor
                  defaultPricing={editingItem.pricing || {}}
                  hubPricing={editingItem.hubPricing || []}
                  pricingFields={[
                    { key: 'flatRate', label: 'Price', placeholder: '500' }
                  ]}
                  pricingModels={[
                    { value: 'per_ad', label: '/ad' },
                    { value: 'contact', label: 'Contact for pricing' }
                  ]}
                  conditionalFields={[
                    {
                      key: 'frequency',
                      label: 'Frequency',
                      type: 'text',
                      showWhen: ['per_ad'],
                      placeholder: 'e.g., 4x, 12x, One time',
                      pattern: '^(?:\\d+x|One time|one time)$',
                      patternMessage: 'Enter a frequency like "4x", "12x", or "One time"'
                    }
                  ]}
                  allowMultipleDefaultPricing={true}
                  onDefaultPricingChange={(pricing) => 
                    setEditingItem({ ...editingItem, pricing })
                  }
                  onHubPricingChange={(hubPricing) => 
                    setEditingItem({ ...editingItem, hubPricing })
                  }
                />
              )}

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

              {/* Event Advertising Opportunity Fields */}
              {editingType === 'event' && (
                <>
                  <div>
                    <Label htmlFor="level">Sponsorship Level</Label>
                    <Input
                      id="level"
                      value={editingItem.level || ''}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        level: e.target.value 
                      })}
                      placeholder="e.g., sponsor, premium, platinum"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="benefits">Benefits (comma-separated)</Label>
                    <Textarea
                      id="benefits"
                      value={editingItem.benefits?.join(', ') || ''}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        benefits: e.target.value.split(',').map(b => b.trim()).filter(b => b) 
                      })}
                      placeholder="Logo placement, Event listing, Social media mention"
                    />
                  </div>
                  
                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'sponsorshipFee', label: 'Sponsorship Fee', placeholder: '2500' }
                    ]}
                    pricingModels={[
                      { value: 'one_time', label: '/event' },
                      { value: 'annual', label: '/year' },
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
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
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
