import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
import { PublicationFrontend } from '@/types/publication';
import { AdFormatSelector } from '@/components/AdFormatSelector';
import { NewsletterAdFormat, getAdDimensions } from '@/types/newsletterAdFormat';
import { WebsiteAdFormatSelector } from '@/components/WebsiteAdFormatSelector';
import { RadioShowEditor } from '@/components/admin/RadioShowEditor';
import { 
  Globe, 
  Mail, 
  Newspaper,
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  Settings,
  Users,
  Calendar,
  Mic,
  Radio,
  Video
} from 'lucide-react';

interface EditableInventoryManagerProps {
  onCancel: () => void;
  onSave: (updatedPublication: PublicationFrontend) => void;
}

export const EditableInventoryManager: React.FC<EditableInventoryManagerProps> = ({ onCancel, onSave }) => {
  const { selectedPublication } = usePublication();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PublicationFrontend>>({});
  // Track which durations are in custom mode (by ad identifier)
  const [customDurationMode, setCustomDurationMode] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedPublication) {
      setFormData(selectedPublication);
    }
  }, [selectedPublication]);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedPublication?._id) return;

    setSaving(true);
    try {
      // Ensure we send the complete publication data with all changes
      // Remove system-managed fields that shouldn't be updated
      const { metadata, _id, createdAt, updatedAt, ...cleanFormData } = formData;
      const { _id: selectedId, createdAt: selectedCreatedAt, updatedAt: selectedUpdatedAt, ...selectedData } = selectedPublication;
      
      const fullUpdateData = {
        ...selectedData,
        ...cleanFormData,
        // Merge metadata properly if it exists
        ...(metadata && {
          metadata: {
            ...selectedPublication.metadata,
            ...metadata
          }
        })
      };

      console.log('💾 Saving inventory changes for publication:', selectedPublication._id);
      const updatedPublication = await updatePublication(selectedPublication._id, fullUpdateData);
      
      if (updatedPublication) {
        onSave(updatedPublication);
        toast({
          title: "Success",
          description: "Advertising inventory updated successfully."
        });
        console.log('✅ Inventory saved successfully');
      } else {
        throw new Error('No updated publication returned from API');
      }
    } catch (error) {
      console.error('❌ Error updating inventory:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update inventory.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save helper function
  const autoSave = async (updatedData: Partial<PublicationFrontend>, successMessage?: string) => {
    if (!selectedPublication?._id) return;

    try {
      // Merge the updated data with the current form data to ensure we don't lose any changes
      // Remove system-managed fields that shouldn't be updated
      const { metadata: updatedMetadata, _id: updatedId, createdAt: updatedCreatedAt, updatedAt: updatedUpdatedAt, ...cleanUpdatedData } = updatedData;
      const { metadata: formMetadata, _id: formId, createdAt: formCreatedAt, updatedAt: formUpdatedAt, ...cleanFormData } = formData;
      const { _id: selectedId, createdAt: selectedCreatedAt, updatedAt: selectedUpdatedAt, ...selectedData } = selectedPublication;
      
      const fullUpdateData = {
        ...selectedData,
        ...cleanFormData,
        ...cleanUpdatedData,
        // Merge all metadata properly
        ...((updatedMetadata || formMetadata) && {
          metadata: {
            ...selectedPublication.metadata,
            ...formMetadata,
            ...updatedMetadata
          }
        })
      };

      const updatedPublication = await updatePublication(selectedPublication._id, fullUpdateData);
      if (updatedPublication) {
        setFormData(updatedPublication);
        onSave(updatedPublication);
        
        if (successMessage) {
          toast({
            title: "Success",
            description: successMessage
          });
        }
      } else {
        throw new Error('No updated publication returned from API');
      }
    } catch (error) {
      console.error('❌ Error auto-saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const addWebsiteAd = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        website: {
          ...formData.distributionChannels?.website,
          advertisingOpportunities: [
            ...(formData.distributionChannels?.website?.advertisingOpportunities || []),
            {
              name: 'New Ad Slot',
              adFormat: '300x250 banner' as const,
              location: 'Sidebar',
              pricing: {
                pricingModel: 'flat' as const,
                flatRate: 500,
                minimumCommitment: '1 month'
              },
              specifications: {
                format: 'JPG, PNG, GIF',
                fileSize: '150KB max',
                animationAllowed: true,
                thirdPartyTags: false
              },
              monthlyImpressions: 50000,
              available: true
            }
          ]
        }
      }
    };

    await autoSave(updatedData, "Website ad slot added successfully");
  };

  const updateWebsiteAd = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: prev.distributionChannels?.website?.advertisingOpportunities?.map((ad, i) =>
            i === index ? { ...ad, [field]: value } : ad
          )
        }
      }
    }));
  };

  const updateWebsiteAdPricing = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: prev.distributionChannels?.website?.advertisingOpportunities?.map((ad, i) =>
            i === index ? { 
              ...ad, 
              pricing: { ...ad.pricing, [field]: value }
            } : ad
          )
        }
      }
    }));
  };

  const removeWebsiteAd = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        website: {
          ...formData.distributionChannels?.website,
          advertisingOpportunities: formData.distributionChannels?.website?.advertisingOpportunities?.filter((_, i) => i !== index)
        }
      }
    };

    await autoSave(updatedData, "Website ad slot removed successfully");
  };

  const addNewsletter = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        newsletters: [
          ...(formData.distributionChannels?.newsletters || []),
          {
            name: 'New Newsletter',
            frequency: 'weekly',
            subscribers: 0,
            openRate: 0,
            subject: 'Newsletter Subject',
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Newsletter channel added successfully");
  };

  const removeNewsletter = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        newsletters: formData.distributionChannels?.newsletters?.filter((_, i) => i !== index)
      }
    };

    await autoSave(updatedData, "Newsletter channel removed successfully");
  };

  const updateNewsletter = (newsletterIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, index) =>
          index === newsletterIndex ? { ...newsletter, [field]: value } : newsletter
        )
      }
    }));
  };

  const addNewsletterAd = (newsletterIndex: number) => {
    // Add to specific newsletter (no longer creates newsletters if they don't exist)
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, i) =>
          i === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: [
              ...(newsletter.advertisingOpportunities || []),
              {
                name: 'New Newsletter Ad',
                position: 'header' as const,
                dimensions: '600x100',
                pricing: {
                  flatRate: 200,
                  pricingModel: 'per_send'
                }
              }
            ]
          } : newsletter
        )
      }
    }));
  };

  const updateNewsletterAd = (newsletterIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : newsletter
        )
      }
    }));
  };

  const updateNewsletterAdPricing = (newsletterIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : newsletter
        )
      }
    }));
  };

  const removeNewsletterAd = (newsletterIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : newsletter
        )
      }
    }));
  };

  const addPrintAd = (printIndex: number) => {
    // Add to specific print publication (no longer creates publications if they don't exist)
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, i) =>
          i === printIndex ? {
            ...printPub,
            advertisingOpportunities: [
              ...(printPub.advertisingOpportunities || []),
              {
                name: 'New Print Ad',
                adFormat: 'full page' as const,
                dimensions: '8.5x11',
                color: 'color' as const,
                location: 'Inside Front Cover',
                pricing: {
                  flatRate: 1200,
                  pricingModel: 'per_ad',
                  frequency: 'One time'
                },
                specifications: {
                  format: 'PDF, AI, EPS',
                  resolution: '300 DPI',
                  bleed: true
                }
              }
            ]
          } : printPub
        )
      }
    }));
  };

  const updatePrintAd = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const updatePrintAdPricing = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const updatePrintAdSpecifications = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                specifications: { ...ad.specifications, [field]: value }
              } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const removePrintAd = (printIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : printPub
        )
      }
    }));
  };

  const updatePrintPublication = (printIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? { ...printPub, [field]: value } : printPub
        )
      }
    }));
  };

  const removePrintPublication = async (printIndex: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        print: formData.distributionChannels?.print?.filter((_, pIndex) => pIndex !== printIndex)
      }
    };

    await autoSave(updatedData, "Print publication removed successfully");
  };

  const addPrintPublication = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        print: [
          ...(Array.isArray(formData.distributionChannels?.print) ? formData.distributionChannels.print : formData.distributionChannels?.print ? [formData.distributionChannels.print] : []),
          {
            name: 'New Publication',
            frequency: 'weekly' as const,
            circulation: 5000,
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Print publication added successfully");
  };

  // Social Media functions
  const addSocialMediaProfile = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        socialMedia: [
          ...(formData.distributionChannels?.socialMedia || []),
          {
            platform: 'facebook',
            handle: '@newaccount',
            followers: 0,
            engagementRate: 0,
            verified: false,
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Social media profile added successfully");
  };

  const removeSocialMediaProfile = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        socialMedia: formData.distributionChannels?.socialMedia?.filter((_, i) => i !== index)
      }
    };

    await autoSave(updatedData, "Social media profile removed successfully");
  };

  const addSocialMediaAd = (socialIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        socialMedia: prev.distributionChannels?.socialMedia?.map((social, index) =>
          index === socialIndex ? {
            ...social,
            advertisingOpportunities: [
              ...(social.advertisingOpportunities || []),
              {
                name: 'New Social Ad',
                adFormat: 'sponsored_post',
                pricing: { flatRate: 100, pricingModel: 'per_post' }
              }
            ]
          } : social
        )
      }
    }));
  };

  // Events functions
  const addEvent = () => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: [
          ...(prev.distributionChannels?.events || []),
          {
            name: 'New Event',
            location: 'TBD',
            frequency: 'annual',
            attendance: 100,
            advertisingOpportunities: []
          }
        ]
      }
    }));
  };

  const removeEvent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.filter((_, i) => i !== index)
      }
    }));
  };

  const addEventAd = (eventIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.map((event, index) =>
          index === eventIndex ? {
            ...event,
            advertisingOpportunities: [
              ...(event.advertisingOpportunities || []),
              {
                name: 'New Event Ad',
                location: 'booth',
                pricing: { flatRate: 500 }
              }
            ]
          } : event
        )
      }
    }));
  };

  // Podcasts functions
  const addPodcast = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        podcasts: [
          ...(formData.distributionChannels?.podcasts || []),
          {
            podcastId: `podcast_${Date.now()}`,
            name: 'New Podcast',
            frequency: 'weekly',
            averageDownloads: 0,
            averageListeners: 0,
            platforms: ['spotify'],
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Podcast channel added successfully");
  };

  const removePodcast = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        podcasts: formData.distributionChannels?.podcasts?.filter((_, i) => i !== index)
      }
    };

    await autoSave(updatedData, "Podcast channel removed successfully");
  };

  const addPodcastAd = (podcastIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        podcasts: prev.distributionChannels?.podcasts?.map((podcast, index) =>
          index === podcastIndex ? {
            ...podcast,
            advertisingOpportunities: [
              ...(podcast.advertisingOpportunities || []),
              {
                name: 'New Podcast Ad',
                adFormat: 'pre-roll',
                duration: 30,
                pricing: { flatRate: 25, pricingModel: 'cpd' }
              }
            ]
          } : podcast
        )
      }
    }));
  };

  // Radio functions
  const addRadioStation = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        radioStations: [
          ...(formData.distributionChannels?.radioStations || []),
          {
            stationId: `radio_${Date.now()}`,
            callSign: 'WXYZ',
            frequency: '101.5 FM',
            format: 'news_talk',
            coverageArea: 'Metropolitan Area',
            listeners: 0,
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Radio station added successfully");
  };

  const removeRadioStation = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        radioStations: formData.distributionChannels?.radioStations?.filter((_, i) => i !== index)
      }
    };

    await autoSave(updatedData, "Radio station removed successfully");
  };

  const addRadioAd = (radioIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        radioStations: prev.distributionChannels?.radioStations?.map((radio, index) =>
          index === radioIndex ? {
            ...radio,
            advertisingOpportunities: [
              ...(radio.advertisingOpportunities || []),
              {
                name: 'New Radio Ad',
                adFormat: '30_second_spot',
                timeSlot: 'drive_time_morning',
                specifications: {
                  format: 'mp3',
                  duration: 30
                },
                pricing: { flatRate: 150, pricingModel: 'per_spot' }
              }
            ]
          } : radio
        )
      }
    }));
  };

  // Streaming functions
  const addStreamingChannel = async () => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        streamingVideo: [
          ...(formData.distributionChannels?.streamingVideo || []),
          {
            channelId: `stream_${Date.now()}`,
            name: 'New Channel',
            platform: 'youtube',
            subscribers: 0,
            averageViews: 0,
            contentType: 'mixed',
            advertisingOpportunities: []
          }
        ]
      }
    };

    await autoSave(updatedData, "Streaming channel added successfully");
  };

  const removeStreamingChannel = async (index: number) => {
    const updatedData = {
      ...formData,
      distributionChannels: {
        ...formData.distributionChannels,
        streamingVideo: formData.distributionChannels?.streamingVideo?.filter((_, i) => i !== index)
      }
    };

    await autoSave(updatedData, "Streaming channel removed successfully");
  };

  const addStreamingAd = (streamingIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        streamingVideo: prev.distributionChannels?.streamingVideo?.map((streaming, index) =>
          index === streamingIndex ? {
            ...streaming,
            advertisingOpportunities: [
              ...(streaming.advertisingOpportunities || []),
              {
                name: 'New Streaming Ad',
                adFormat: 'pre-roll',
                duration: 15,
                pricing: { flatRate: 20, pricingModel: 'cpm' }
              }
            ]
          } : streaming
        )
      }
    }));
  };

  // Update functions for channel properties
  const updateSocialMediaProfile = (profileIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        socialMedia: prev.distributionChannels?.socialMedia?.map((profile, index) =>
          index === profileIndex ? { ...profile, [field]: value } : profile
        )
      }
    }));
  };

  const updateSocialMediaAd = (profileIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        socialMedia: prev.distributionChannels?.socialMedia?.map((profile, pIndex) =>
          pIndex === profileIndex ? {
            ...profile,
            advertisingOpportunities: profile.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : profile
        )
      }
    }));
  };

  const updateSocialMediaAdPricing = (profileIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        socialMedia: prev.distributionChannels?.socialMedia?.map((profile, pIndex) =>
          pIndex === profileIndex ? {
            ...profile,
            advertisingOpportunities: profile.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : profile
        )
      }
    }));
  };

  const removeSocialMediaAd = (profileIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        socialMedia: prev.distributionChannels?.socialMedia?.map((profile, pIndex) =>
          pIndex === profileIndex ? {
            ...profile,
            advertisingOpportunities: profile.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : profile
        )
      }
    }));
  };

  const updateEvent = (eventIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.map((event, index) =>
          index === eventIndex ? { ...event, [field]: value } : event
        )
      }
    }));
  };

  const updateEventAd = (eventIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.map((event, eIndex) =>
          eIndex === eventIndex ? {
            ...event,
            advertisingOpportunities: event.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : event
        )
      }
    }));
  };

  const updateEventAdPricing = (eventIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.map((event, eIndex) =>
          eIndex === eventIndex ? {
            ...event,
            advertisingOpportunities: event.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : event
        )
      }
    }));
  };

  const removeEventAd = (eventIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        events: prev.distributionChannels?.events?.map((event, eIndex) =>
          eIndex === eventIndex ? {
            ...event,
            advertisingOpportunities: event.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : event
        )
      }
    }));
  };

  const updatePodcast = (podcastIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        podcasts: prev.distributionChannels?.podcasts?.map((podcast, index) =>
          index === podcastIndex ? { ...podcast, [field]: value } : podcast
        )
      }
    }));
  };

  const updatePodcastAd = (podcastIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        podcasts: prev.distributionChannels?.podcasts?.map((podcast, pIndex) =>
          pIndex === podcastIndex ? {
            ...podcast,
            advertisingOpportunities: podcast.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : podcast
        )
      }
    }));
  };

  const updatePodcastAdPricing = (podcastIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        podcasts: prev.distributionChannels?.podcasts?.map((podcast, pIndex) =>
          pIndex === podcastIndex ? {
            ...podcast,
            advertisingOpportunities: podcast.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : podcast
        )
      }
    }));
  };

  const removePodcastAd = (podcastIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        podcasts: prev.distributionChannels?.podcasts?.map((podcast, pIndex) =>
          pIndex === podcastIndex ? {
            ...podcast,
            advertisingOpportunities: podcast.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : podcast
        )
      }
    }));
  };

  const updateRadioStation = (radioIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        radioStations: prev.distributionChannels?.radioStations?.map((radio, index) =>
          index === radioIndex ? { ...radio, [field]: value } : radio
        )
      }
    }));
  };

  const updateRadioAd = (radioIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        radioStations: prev.distributionChannels?.radioStations?.map((radio, rIndex) =>
          rIndex === radioIndex ? {
            ...radio,
            advertisingOpportunities: radio.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : radio
        )
      }
    }));
  };

  const updateRadioAdPricing = (radioIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        radioStations: prev.distributionChannels?.radioStations?.map((radio, rIndex) =>
          rIndex === radioIndex ? {
            ...radio,
            advertisingOpportunities: radio.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : radio
        )
      }
    }));
  };

  const removeRadioAd = (radioIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        radioStations: prev.distributionChannels?.radioStations?.map((radio, rIndex) =>
          rIndex === radioIndex ? {
            ...radio,
            advertisingOpportunities: radio.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : radio
        )
      }
    }));
  };

  const updateStreamingChannel = (streamingIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        streamingVideo: prev.distributionChannels?.streamingVideo?.map((streaming, index) =>
          index === streamingIndex ? { ...streaming, [field]: value } : streaming
        )
      }
    }));
  };

  const updateStreamingAd = (streamingIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        streamingVideo: prev.distributionChannels?.streamingVideo?.map((streaming, sIndex) =>
          sIndex === streamingIndex ? {
            ...streaming,
            advertisingOpportunities: streaming.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : streaming
        )
      }
    }));
  };

  const updateStreamingAdPricing = (streamingIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        streamingVideo: prev.distributionChannels?.streamingVideo?.map((streaming, sIndex) =>
          sIndex === streamingIndex ? {
            ...streaming,
            advertisingOpportunities: streaming.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : streaming
        )
      }
    }));
  };

  const removeStreamingAd = (streamingIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        streamingVideo: prev.distributionChannels?.streamingVideo?.map((streaming, sIndex) =>
          sIndex === streamingIndex ? {
            ...streaming,
            advertisingOpportunities: streaming.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : streaming
        )
      }
    }));
  };

  const websiteAds = formData.distributionChannels?.website?.advertisingOpportunities || [];
  const newsletters = formData.distributionChannels?.newsletters || [];
  const socialMediaProfiles = formData.distributionChannels?.socialMedia || [];
  const events = formData.distributionChannels?.events || [];
  const podcasts = formData.distributionChannels?.podcasts || [];
  const radioStations = formData.distributionChannels?.radioStations || [];
  const streamingChannels = formData.distributionChannels?.streamingVideo || [];
  
  // Handle backward compatibility for print (old single object vs new array format)
  const printData = formData.distributionChannels?.print;
  let printPublications: any[] = [];
  if (printData) {
    if (Array.isArray(printData)) {
      printPublications = printData;
    } else {
      // Convert old single object format to array
      printPublications = [printData];
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Edit Advertising Inventory</h2>
          <p className="text-muted-foreground">
            Manage advertising opportunities for {selectedPublication.basicInfo.publicationName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Website Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addWebsiteAd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Website Ad
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {websiteAds.map((ad, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Website Ad #{index + 1}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeWebsiteAd(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Ad Name</Label>
                      <Input
                        value={ad.name || ''}
                        onChange={(e) => updateWebsiteAd(index, 'name', e.target.value)}
                        placeholder="Header Banner"
                      />
                    </div>
                    
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={ad.location || ''}
                        onChange={(e) => updateWebsiteAd(index, 'location', e.target.value)}
                        placeholder="Header, Sidebar, etc."
                      />
                    </div>
                  </div>

                  {/* Website Ad Format Selector */}
                  <WebsiteAdFormatSelector
                    value={ad.format || null}
                    onChange={(format) => updateWebsiteAd(index, 'format', format)}
                    allowMultiple={true}
                    legacyDimensions={ad.sizes ? ad.sizes.join(', ') : undefined}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Pricing Model</Label>
                    <Select 
                      value={ad.pricing?.pricingModel || ''} 
                      onValueChange={(value) => updateWebsiteAdPricing(index, 'pricingModel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat_rate">Flat Rate</SelectItem>
                        <SelectItem value="flat">/month</SelectItem>
                        <SelectItem value="per_week">/week</SelectItem>
                        <SelectItem value="per_day">/day</SelectItem>
                        <SelectItem value="cpm">CPM</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                        <SelectItem value="contact">Contact for Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={ad.pricing?.flatRate || ad.pricing?.cpm || ''}
                      onChange={(e) => updateWebsiteAdPricing(index, 
                        ad.pricing?.pricingModel === 'cpm' ? 'cpm' : 'flatRate', 
                        parseFloat(e.target.value)
                      )}
                      placeholder="500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={ad.available || false}
                      onCheckedChange={(checked) => updateWebsiteAd(index, 'available', checked)}
                    />
                    <Label>Available</Label>
                  </div>
                </div>
              </div>
            ))}
            
            {websiteAds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No website advertising opportunities. Click "Add Website Ad" to create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Newsletter Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addNewsletter}>
              <Plus className="w-4 h-4 mr-2" />
              Add Newsletter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {newsletters.map((newsletter, newsletterIndex) => (
              <div key={newsletterIndex} className="border rounded-lg p-4">
                {/* Newsletter Details */}
                <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Newsletter #{newsletterIndex + 1}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeNewsletter(newsletterIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Newsletter Name</Label>
                      <Input
                        value={newsletter.name || ''}
                        onChange={(e) => updateNewsletter(newsletterIndex, 'name', e.target.value)}
                        placeholder="Weekly Newsletter"
                      />
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={newsletter.frequency || ''} 
                        onValueChange={(value) => updateNewsletter(newsletterIndex, 'frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="seasonally">Seasonally</SelectItem>
                          <SelectItem value="irregular">Irregular</SelectItem>
                          <SelectItem value="on-demand">On Demand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Subscribers</Label>
                      <Input
                        type="number"
                        value={newsletter.subscribers || ''}
                        onChange={(e) => updateNewsletter(newsletterIndex, 'subscribers', parseInt(e.target.value))}
                        placeholder="5000"
                      />
                    </div>
                    
                    <div>
                      <Label>Open Rate (%)</Label>
                      <Input
                        type="number"
                        value={newsletter.openRate || ''}
                        onChange={(e) => updateNewsletter(newsletterIndex, 'openRate', parseFloat(e.target.value))}
                        placeholder="25"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Subject Line</Label>
                    <Input
                      value={newsletter.subject || ''}
                      onChange={(e) => updateNewsletter(newsletterIndex, 'subject', e.target.value)}
                      placeholder="Newsletter Subject Line"
                    />
                  </div>
                </div>

                {/* Advertising Opportunities */}
                
                <div className="space-y-4">
                  {newsletter.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Newsletter Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeNewsletterAd(newsletterIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Ad Name</Label>
                            <Input
                              value={ad.name || ''}
                              onChange={(e) => updateNewsletterAd(newsletterIndex, adIndex, 'name', e.target.value)}
                              placeholder="Header Sponsorship"
                            />
                          </div>
                          
                          <div>
                            <Label>Position</Label>
                            <Select 
                              value={ad.position || ''} 
                              onValueChange={(value) => updateNewsletterAd(newsletterIndex, adIndex, 'position', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="footer">Footer</SelectItem>
                                <SelectItem value="inline">Inline</SelectItem>
                                <SelectItem value="dedicated">Dedicated</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Ad Format Selector */}
                        <AdFormatSelector
                          value={ad.format || null}
                          onChange={(format) => updateNewsletterAd(newsletterIndex, adIndex, 'format', format)}
                          allowMultiple={true}
                          legacyDimensions={ad.dimensions}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Pricing Model</Label>
                            <Select 
                              value={ad.pricing?.pricingModel || 'per_send'} 
                              onValueChange={(value) => updateNewsletterAdPricing(newsletterIndex, adIndex, 'pricingModel', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="per_send">/send</SelectItem>
                                <SelectItem value="contact">Contact for pricing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Price ($)</Label>
                            <Input
                              type="number"
                              value={ad.pricing?.flatRate || ''}
                              onChange={(e) => updateNewsletterAdPricing(newsletterIndex, adIndex, 'flatRate', parseFloat(e.target.value))}
                              placeholder="200"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNewsletterAd(newsletterIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {newsletter.name || `Newsletter ${newsletterIndex + 1}`}
                  </Button>
                </div>
              </div>
            ))}
            
            {newsletters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No newsletters configured. Click "Add Newsletter Ad" to create your first newsletter with advertising opportunities.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Print Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addPrintPublication}>
              <Plus className="w-4 h-4 mr-2" />
              Add Publication
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {printPublications.map((printPub, printIndex) => (
              <div key={printIndex} className="border rounded-lg p-4">
                {/* Print Publication Details */}
                <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Print Publication #{printIndex + 1}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removePrintPublication(printIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Publication Name</Label>
                      <Input
                        value={printPub.name || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'name', e.target.value)}
                        placeholder="Daily Herald"
                      />
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={printPub.frequency || ''} 
                        onValueChange={(value) => updatePrintPublication(printIndex, 'frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Total Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.circulation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'circulation', parseInt(e.target.value))}
                        placeholder="10000"
                      />
                    </div>
                    
                    <div>
                      <Label>Paid Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.paidCirculation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'paidCirculation', parseInt(e.target.value))}
                        placeholder="7500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>Free Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.freeCirculation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'freeCirculation', parseInt(e.target.value))}
                        placeholder="2500"
                      />
                    </div>
                    
                    <div>
                      <Label>Distribution Area</Label>
                      <Input
                        value={printPub.distributionArea || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'distributionArea', e.target.value)}
                        placeholder="Chicago Metro Area"
                      />
                    </div>
                    
                    <div>
                      <Label>Print Schedule</Label>
                      <Input
                        value={printPub.printSchedule || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'printSchedule', e.target.value)}
                        placeholder="Tuesdays"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Advertising Opportunities */}
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-muted-foreground">Advertising Opportunities</h4>
                </div>
                
                <div className="space-y-4">
                  {printPub.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Print Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removePrintAd(printIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'name', e.target.value)}
                            placeholder="Full Page Ad"
                          />
                        </div>
                        
                        <div>
                          <Label>Ad Format</Label>
                          <Select 
                            value={ad.adFormat || ''} 
                            onValueChange={(value) => updatePrintAd(printIndex, adIndex, 'adFormat', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                        
                        <div>
                          <Label>Dimensions</Label>
                          <Input
                            value={ad.dimensions || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'dimensions', e.target.value)}
                            placeholder="8.5x11"
                          />
                        </div>
                        
                        <div>
                          <Label>Color Option</Label>
                          <Select 
                            value={ad.color || ''} 
                            onValueChange={(value) => updatePrintAd(printIndex, adIndex, 'color', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="color">Color</SelectItem>
                              <SelectItem value="black and white">Black and White</SelectItem>
                              <SelectItem value="both">Both Available</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Location</Label>
                          <Input
                            value={ad.location || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'location', e.target.value)}
                            placeholder="Inside Front Cover"
                          />
                        </div>
                        
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.flatRate || ''}
                            onChange={(e) => updatePrintAdPricing(printIndex, adIndex, 'flatRate', parseFloat(e.target.value))}
                            placeholder="1200"
                          />
                        </div>
                        
                        <div>
                          <Label>Pricing Model</Label>
                          <Select
                            value={ad.pricing?.pricingModel || 'per_ad'}
                            onValueChange={(value) => updatePrintAdPricing(printIndex, adIndex, 'pricingModel', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_ad">Per Ad</SelectItem>
                              <SelectItem value="per_line">Per Line</SelectItem>
                              <SelectItem value="contact">Contact for pricing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Frequency</Label>
                          <Input
                            value={ad.pricing?.frequency || ''}
                            onChange={(e) => updatePrintAdPricing(printIndex, adIndex, 'frequency', e.target.value)}
                            placeholder="One time, 4x, 12x, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>File Format</Label>
                          <Input
                            value={ad.specifications?.format || ''}
                            onChange={(e) => updatePrintAdSpecifications(printIndex, adIndex, 'format', e.target.value)}
                            placeholder="PDF, AI, EPS"
                          />
                        </div>
                        
                        <div>
                          <Label>Resolution</Label>
                          <Input
                            value={ad.specifications?.resolution || ''}
                            onChange={(e) => updatePrintAdSpecifications(printIndex, adIndex, 'resolution', e.target.value)}
                            placeholder="300 DPI"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={ad.specifications?.bleed || false}
                            onCheckedChange={(checked) => updatePrintAdSpecifications(printIndex, adIndex, 'bleed', checked)}
                          />
                          <Label>Bleed Required</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addPrintAd(printIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {printPub.name || `Print Publication ${printIndex + 1}`}
                  </Button>
                </div>
              </div>
            ))}
            
            {printPublications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No print publications configured. Click "Add Print Ad" to create your first print publication with advertising opportunities.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social Media Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Social Media Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addSocialMediaProfile}>
              <Plus className="w-4 h-4 mr-2" />
              Add Social Profile
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {socialMediaProfiles.map((profile, profileIndex) => (
              <div key={profileIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {profile.platform} - {profile.handle}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeSocialMediaProfile(profileIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Social Media Profile Properties */}
                <div className="p-4 bg-blue-50 rounded-lg space-y-4 mb-4">
                  <h4 className="font-medium text-blue-800">Profile Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Platform</Label>
                      <Select 
                        value={profile.platform || ''} 
                        onValueChange={(value) => updateSocialMediaProfile(profileIndex, 'platform', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Twitter">Twitter</SelectItem>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="TikTok">TikTok</SelectItem>
                          <SelectItem value="YouTube">YouTube</SelectItem>
                          <SelectItem value="Pinterest">Pinterest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Handle/Username</Label>
                      <Input
                        value={profile.handle || ''}
                        onChange={(e) => updateSocialMediaProfile(profileIndex, 'handle', e.target.value)}
                        placeholder="@yourhandle"
                      />
                    </div>
                    
                    <div>
                      <Label>Followers</Label>
                      <Input
                        type="number"
                        value={profile.followers || ''}
                        onChange={(e) => updateSocialMediaProfile(profileIndex, 'followers', parseInt(e.target.value))}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Engagement Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={profile.engagementRate || ''}
                        onChange={(e) => updateSocialMediaProfile(profileIndex, 'engagementRate', parseFloat(e.target.value))}
                        placeholder="3.5"
                      />
                    </div>
                    
                    <div>
                      <Label>Profile URL</Label>
                      <Input
                        value={profile.profileUrl || ''}
                        onChange={(e) => updateSocialMediaProfile(profileIndex, 'profileUrl', e.target.value)}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={profile.verified || false}
                        onCheckedChange={(checked) => updateSocialMediaProfile(profileIndex, 'verified', checked)}
                      />
                      <Label>Verified Account</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {profile.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Social Media Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeSocialMediaAd(profileIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updateSocialMediaAd(profileIndex, adIndex, 'name', e.target.value)}
                            placeholder="Sponsored Post"
                          />
                        </div>
                        
                        <div>
                          <Label>Ad Format</Label>
                          <Select 
                            value={ad.adFormat || ''} 
                            onValueChange={(value) => updateSocialMediaAd(profileIndex, adIndex, 'adFormat', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sponsored_post">Sponsored Post</SelectItem>
                              <SelectItem value="story_ad">Story Ad</SelectItem>
                              <SelectItem value="video_ad">Video Ad</SelectItem>
                              <SelectItem value="carousel_ad">Carousel Ad</SelectItem>
                              <SelectItem value="collection_ad">Collection Ad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Pricing Model</Label>
                          <Select 
                            value={ad.pricing?.pricingModel || 'per_post'} 
                            onValueChange={(value) => updateSocialMediaAdPricing(profileIndex, adIndex, 'pricingModel', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_post">/post</SelectItem>
                              <SelectItem value="per_story">/story</SelectItem>
                              <SelectItem value="monthly">/month</SelectItem>
                              <SelectItem value="contact">Contact for pricing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.flatRate || ''}
                            onChange={(e) => updateSocialMediaAdPricing(profileIndex, adIndex, 'flatRate', parseFloat(e.target.value))}
                            placeholder="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addSocialMediaAd(profileIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {profile.platform}
                  </Button>
                </div>
              </div>
            ))}
            
            {socialMediaProfiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No social media profiles configured. Click "Add Social Profile" to create your first profile.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {events.map((event, eventIndex) => (
              <div key={eventIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {event.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeEvent(eventIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Event Properties */}
                <div className="p-4 bg-green-50 rounded-lg space-y-4 mb-4">
                  <h4 className="font-medium text-green-800">Event Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Event Name</Label>
                      <Input
                        value={event.name || ''}
                        onChange={(e) => updateEvent(eventIndex, 'name', e.target.value)}
                        placeholder="Annual Community Festival"
                      />
                    </div>
                    
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={event.location || ''}
                        onChange={(e) => updateEvent(eventIndex, 'location', e.target.value)}
                        placeholder="Downtown Park"
                      />
                    </div>
                    
                    <div>
                      <Label>Expected Attendance</Label>
                      <Input
                        type="number"
                        value={event.expectedAttendance || ''}
                        onChange={(e) => updateEvent(eventIndex, 'expectedAttendance', parseInt(e.target.value))}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Event Date</Label>
                      <Input
                        type="date"
                        value={event.date ? new Date(event.date).toISOString().split('T')[0] : ''}
                        onChange={(e) => updateEvent(eventIndex, 'date', new Date(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label>Event Type</Label>
                      <Select 
                        value={event.eventType || ''} 
                        onValueChange={(value) => updateEvent(eventIndex, 'eventType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="festival">Festival</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                          <SelectItem value="fundraiser">Fundraiser</SelectItem>
                          <SelectItem value="community">Community Event</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={event.frequency || ''} 
                        onValueChange={(value) => updateEvent(eventIndex, 'frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {event.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Event Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEventAd(eventIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updateEventAd(eventIndex, adIndex, 'name', e.target.value)}
                            placeholder="Booth Sponsorship"
                          />
                        </div>
                        
                        <div>
                          <Label>Location</Label>
                          <Input
                            value={ad.location || ''}
                            onChange={(e) => updateEventAd(eventIndex, adIndex, 'location', e.target.value)}
                            placeholder="Main entrance"
                          />
                        </div>
                        
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.flatRate || ''}
                            onChange={(e) => updateEventAdPricing(eventIndex, adIndex, 'flatRate', parseFloat(e.target.value))}
                            placeholder="500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addEventAd(eventIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {event.name}
                  </Button>
                </div>
              </div>
            ))}
            
            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No events configured. Click "Add Event" to create your first event.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Podcasts Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Podcasts Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addPodcast}>
              <Plus className="w-4 h-4 mr-2" />
              Add Podcast
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {podcasts.map((podcast, podcastIndex) => (
              <div key={podcastIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {podcast.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removePodcast(podcastIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Podcast Properties */}
                <div className="p-4 bg-red-50 rounded-lg space-y-4 mb-4">
                  <h4 className="font-medium text-red-800">Podcast Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Podcast Name</Label>
                      <Input
                        value={podcast.name || ''}
                        onChange={(e) => updatePodcast(podcastIndex, 'name', e.target.value)}
                        placeholder="The Morning Show"
                      />
                    </div>
                    
                    <div>
                      <Label>Average Listeners</Label>
                      <Input
                        type="number"
                        value={podcast.averageListeners || ''}
                        onChange={(e) => updatePodcast(podcastIndex, 'averageListeners', parseInt(e.target.value))}
                        placeholder="25000"
                      />
                    </div>
                    
                    <div>
                      <Label>Average Downloads</Label>
                      <Input
                        type="number"
                        value={podcast.averageDownloads || ''}
                        onChange={(e) => updatePodcast(podcastIndex, 'averageDownloads', parseInt(e.target.value))}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Episode Count</Label>
                      <Input
                        type="number"
                        value={podcast.episodeCount || ''}
                        onChange={(e) => updatePodcast(podcastIndex, 'episodeCount', parseInt(e.target.value))}
                        placeholder="150"
                      />
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={podcast.frequency || ''} 
                        onValueChange={(value) => updatePodcast(podcastIndex, 'frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="irregular">Irregular</SelectItem>
                          <SelectItem value="on-demand">On Demand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Genre</Label>
                      <Input
                        value={podcast.genre || ''}
                        onChange={(e) => updatePodcast(podcastIndex, 'genre', e.target.value)}
                        placeholder="News, Business, Entertainment"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Platforms</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                      {[
                        { value: 'apple_podcasts', label: 'Apple Podcasts' },
                        { value: 'spotify', label: 'Spotify' },
                        { value: 'youtube_music', label: 'YouTube Music' },
                        { value: 'amazon_music', label: 'Amazon Music' },
                        { value: 'stitcher', label: 'Stitcher' },
                        { value: 'overcast', label: 'Overcast' },
                        { value: 'castbox', label: 'Castbox' },
                        { value: 'other', label: 'Other' }
                      ].map((platform) => (
                        <label key={platform.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={podcast.platforms?.includes(platform.value) || false}
                            onChange={(e) => {
                              const currentPlatforms = podcast.platforms || [];
                              const newPlatforms = e.target.checked
                                ? [...currentPlatforms, platform.value]
                                : currentPlatforms.filter(p => p !== platform.value);
                              updatePodcast(podcastIndex, 'platforms', newPlatforms);
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{platform.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {podcast.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Podcast Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removePodcastAd(podcastIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updatePodcastAd(podcastIndex, adIndex, 'name', e.target.value)}
                            placeholder="Pre-roll Ad"
                          />
                        </div>
                        
                        <div>
                          <Label>Ad Format</Label>
                          <Select 
                            value={ad.adFormat || ''}
                            onValueChange={(value) => updatePodcastAd(podcastIndex, adIndex, 'adFormat', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pre-roll">Pre-roll</SelectItem>
                              <SelectItem value="mid-roll">Mid-roll</SelectItem>
                              <SelectItem value="post-roll">Post-roll</SelectItem>
                              <SelectItem value="host-read">Host Read</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Duration</Label>
                          <div className="space-y-2">
                            <Select 
                              value={
                                customDurationMode[`podcast-${podcastIndex}-${adIndex}`] 
                                  ? 'custom'
                                  : (ad.duration && [15, 30, 60, 90, 120].includes(ad.duration)
                                    ? String(ad.duration)
                                    : 'custom')
                              }
                              onValueChange={(value) => {
                                const key = `podcast-${podcastIndex}-${adIndex}`;
                                if (value === 'custom') {
                                  // Enter custom mode and clear duration
                                  setCustomDurationMode({ ...customDurationMode, [key]: true });
                                  updatePodcastAd(podcastIndex, adIndex, 'duration', undefined);
                                  return;
                                }
                                // Exit custom mode and set standard duration
                                setCustomDurationMode({ ...customDurationMode, [key]: false });
                                const duration = parseInt(value);
                                updatePodcastAd(podcastIndex, adIndex, 'duration', duration);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 seconds (:15)</SelectItem>
                                <SelectItem value="30">30 seconds (:30)</SelectItem>
                                <SelectItem value="60">60 seconds (:60)</SelectItem>
                                <SelectItem value="90">90 seconds (:90)</SelectItem>
                                <SelectItem value="120">120 seconds (:120)</SelectItem>
                                <SelectItem value="custom">Custom...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(customDurationMode[`podcast-${podcastIndex}-${adIndex}`] || (!ad.duration || ![15, 30, 60, 90, 120].includes(ad.duration))) && (
                              <Input
                                type="number"
                                value={ad.duration || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const numVal = val === '' ? undefined : parseInt(val, 10);
                                  updatePodcastAd(podcastIndex, adIndex, 'duration', isNaN(numVal) ? undefined : numVal);
                                }}
                                placeholder="Enter seconds (e.g., 45, 180, 600)"
                              />
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.flatRate || ''}
                            onChange={(e) => updatePodcastAdPricing(podcastIndex, adIndex, 'flatRate', parseFloat(e.target.value))}
                            placeholder="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addPodcastAd(podcastIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {podcast.name}
                  </Button>
                </div>
              </div>
            ))}
            
            {podcasts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No podcasts configured. Click "Add Podcast" to create your first podcast.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Radio Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Radio Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addRadioStation}>
              <Plus className="w-4 h-4 mr-2" />
              Add Radio Station
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {radioStations.map((radio, radioIndex) => (
              <div key={radioIndex} className="border rounded-lg p-4 space-y-4">
                {/* Station Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {radio.callSign} - {radio.frequency}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRadioStation(radioIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Radio Station Properties */}
                <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                  <h4 className="font-medium text-yellow-800">Radio Station Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Call Sign</Label>
                      <Input
                        value={radio.callSign || ''}
                        onChange={(e) => updateRadioStation(radioIndex, 'callSign', e.target.value)}
                        placeholder="WXYZ"
                      />
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Input
                        value={radio.frequency || ''}
                        onChange={(e) => updateRadioStation(radioIndex, 'frequency', e.target.value)}
                        placeholder="101.5 FM"
                      />
                    </div>
                    
                    <div>
                      <Label>Weekly Listeners</Label>
                      <Input
                        type="number"
                        value={radio.listeners || ''}
                        onChange={(e) => updateRadioStation(radioIndex, 'listeners', parseInt(e.target.value))}
                        placeholder="75000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Format</Label>
                      <Select 
                        value={radio.format || ''} 
                        onValueChange={(value) => updateRadioStation(radioIndex, 'format', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="News/Talk">News/Talk</SelectItem>
                          <SelectItem value="Rock">Rock</SelectItem>
                          <SelectItem value="Pop">Pop</SelectItem>
                          <SelectItem value="Country">Country</SelectItem>
                          <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                          <SelectItem value="Classical">Classical</SelectItem>
                          <SelectItem value="Jazz">Jazz</SelectItem>
                          <SelectItem value="Sports">Sports</SelectItem>
                          <SelectItem value="Public Radio">Public Radio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Coverage Area</Label>
                      <Input
                        value={radio.coverageArea || ''}
                        onChange={(e) => updateRadioStation(radioIndex, 'coverageArea', e.target.value)}
                        placeholder="Chicago Metropolitan Area"
                      />
                    </div>
                    
                    <div>
                      <Label>Power (Watts)</Label>
                      <Input
                        type="number"
                        value={radio.power || ''}
                        onChange={(e) => updateRadioStation(radioIndex, 'power', parseInt(e.target.value))}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Radio Show Editor */}
                <RadioShowEditor
                  station={radio}
                  onChange={(updatedStation) => {
                    setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        radioStations: prev.distributionChannels?.radioStations?.map((s, idx) =>
                          idx === radioIndex ? updatedStation : s
                        )
                      }
                    }));
                  }}
                />
              </div>
            ))}
            
            {radioStations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No radio stations configured. Click "Add Radio Station" to create your first station.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Streaming Video Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Streaming Video Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addStreamingChannel}>
              <Plus className="w-4 h-4 mr-2" />
              Add Streaming Channel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {streamingChannels.map((streaming, streamingIndex) => (
              <div key={streamingIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {streaming.name} - {streaming.platform}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeStreamingChannel(streamingIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Streaming Channel Properties */}
                <div className="p-4 bg-indigo-50 rounded-lg space-y-4 mb-4">
                  <h4 className="font-medium text-indigo-800">Streaming Channel Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Channel Name</Label>
                      <Input
                        value={streaming.name || ''}
                        onChange={(e) => updateStreamingChannel(streamingIndex, 'name', e.target.value)}
                        placeholder="Chicago News Network"
                      />
                    </div>
                    
                    <div>
                      <Label>Platform</Label>
                      <Select 
                        value={streaming.platform || ''} 
                        onValueChange={(value) => updateStreamingChannel(streamingIndex, 'platform', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YouTube">YouTube</SelectItem>
                          <SelectItem value="Twitch">Twitch</SelectItem>
                          <SelectItem value="Facebook Live">Facebook Live</SelectItem>
                          <SelectItem value="Instagram Live">Instagram Live</SelectItem>
                          <SelectItem value="LinkedIn Live">LinkedIn Live</SelectItem>
                          <SelectItem value="Custom Platform">Custom Platform</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Subscribers</Label>
                      <Input
                        type="number"
                        value={streaming.subscribers || ''}
                        onChange={(e) => updateStreamingChannel(streamingIndex, 'subscribers', parseInt(e.target.value))}
                        placeholder="15000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Average Views</Label>
                      <Input
                        type="number"
                        value={streaming.averageViews || ''}
                        onChange={(e) => updateStreamingChannel(streamingIndex, 'averageViews', parseInt(e.target.value))}
                        placeholder="5000"
                      />
                    </div>
                    
                    <div>
                      <Label>Content Type</Label>
                      <Select 
                        value={streaming.contentType || ''} 
                        onValueChange={(value) => updateStreamingChannel(streamingIndex, 'contentType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="News">News</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Educational">Educational</SelectItem>
                          <SelectItem value="Talk Show">Talk Show</SelectItem>
                          <SelectItem value="Gaming">Gaming</SelectItem>
                          <SelectItem value="Sports">Sports</SelectItem>
                          <SelectItem value="Music">Music</SelectItem>
                          <SelectItem value="Community">Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Stream Schedule</Label>
                      <Input
                        value={streaming.streamSchedule || ''}
                        onChange={(e) => updateStreamingChannel(streamingIndex, 'streamSchedule', e.target.value)}
                        placeholder="Mon-Fri 7PM EST"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {streaming.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Streaming Ad #{adIndex + 1}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            placeholder="Pre-roll Video"
                          />
                        </div>
                        
                        <div>
                          <Label>Ad Format</Label>
                          <Select value={ad.adFormat || ''}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pre-roll">Pre-roll</SelectItem>
                              <SelectItem value="mid-roll">Mid-roll</SelectItem>
                              <SelectItem value="post-roll">Post-roll</SelectItem>
                              <SelectItem value="overlay">Overlay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={ad.duration || ''}
                            placeholder="15"
                          />
                        </div>
                        
                        <div>
                          <Label>Pricing Model</Label>
                          <Select value={ad.pricing?.pricingModel || 'cpm'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpm">/1000 views</SelectItem>
                              <SelectItem value="flat">/video</SelectItem>
                              <SelectItem value="contact">Contact for pricing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.flatRate || ''}
                            placeholder="20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addStreamingAd(streamingIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {streaming.name}
                  </Button>
                </div>
              </div>
            ))}
            
            {streamingChannels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No streaming channels configured. Click "Add Streaming Channel" to create your first channel.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
