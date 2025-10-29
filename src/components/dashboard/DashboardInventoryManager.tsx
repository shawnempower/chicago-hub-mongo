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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, DollarSign, Target, BarChart3, 
  Globe, Mail, Printer, Calendar, Package, Search,
  RefreshCw, Save, X, TrendingUp, Users, Mic, Radio, Video, Tv, Copy
} from 'lucide-react';

import { usePublication } from '@/contexts/PublicationContext';
import { PublicationFrontend } from '@/types/publication';
import { updatePublication, getPublicationById } from '@/api/publications';
import { HubPricingEditor, HubPrice } from './HubPricingEditor';
import { GeneralTermsEditor, GeneralTerms } from './GeneralTermsEditor';
import { FieldError } from '@/components/ui/field-error';
import { AdFormatSelector } from '@/components/AdFormatSelector';
import { NewsletterAdFormat } from '@/types/newsletterAdFormat';
import { WebsiteAdFormatSelector } from '@/components/WebsiteAdFormatSelector';
import { 
  validatePositiveInteger,
  validatePositiveNumber,
  validatePercentage,
  getValidationClass
} from '@/utils/fieldValidation';

// Helper function to validate inventory item data
const validateInventoryItem = (item: any, type: string): boolean => {
  if (!item) return false;
  
  // Basic validation for all types
  if (type.includes('-container')) {
    return true; // Container validation is less strict
  }
  
  // Validate advertising opportunities
  // Event sponsorships use 'level' field instead of 'name' or 'title'
  if (type === 'event') {
    if (!item.level) return false;
  } else {
    if (!item.name && !item.title) return false;
  }
  
  return true;
};

export const DashboardInventoryManager = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('website');
  const [currentPublication, setCurrentPublication] = useState<PublicationFrontend | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Helper function to get session storage key for temporarily shown tabs
  const getTempVisibilityStorageKey = (publicationId: string) => {
    return `inventory_temp_shown_${publicationId}`;
  };

  // Get temporarily shown tabs (user manually added, no data yet)
  const getTempShownTabs = (publicationId: string) => {
    try {
      const stored = sessionStorage.getItem(getTempVisibilityStorageKey(publicationId));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Set temporarily shown tab
  const setTempShownTab = (publicationId: string, channel: string, shown: boolean) => {
    try {
      const tempTabs = getTempShownTabs(publicationId);
      if (shown) {
        tempTabs[channel] = true;
      } else {
        delete tempTabs[channel];
      }
      sessionStorage.setItem(getTempVisibilityStorageKey(publicationId), JSON.stringify(tempTabs));
    } catch (error) {
      console.error('Error saving temp visibility:', error);
    }
  };
  
  // Tab visibility state - always start with all hidden (data-driven)
  const [visibleTabs, setVisibleTabs] = useState({
    website: false,
    newsletters: false,
    print: false,
    events: false,
    podcasts: false,
    radio: false,
    streaming: false,
    television: false,
    social: false,
  });
  
  // Edit dialog states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'podcast' | 'radio' | 'streaming' | 'television' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | 'podcast-container' | 'radio-container' | 'streaming-container' | 'social-media-container' | 'television-container' | 'podcast-ad' | 'radio-ad' | 'streaming-ad' | 'television-ad' | 'social-media-ad' | 'print-ad' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingSubIndex, setEditingSubIndex] = useState<number>(-1); // for newsletter ads within newsletters
  const [editingParentIndex, setEditingParentIndex] = useState<number>(-1); // for event parent index
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1); // for event sponsorship index
  const [isAdding, setIsAdding] = useState<boolean>(false); // Track if we're adding new (vs editing existing)

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string>('');
  const [deleteItemType, setDeleteItemType] = useState<string>('');

  // Helper function to format pricing model labels
  const formatPricingModel = (model: string) => {
    if (!model) return 'N/A';
    
    switch(model) {
      // Website models
      case 'flat_rate': return 'Flat Rate';
      case 'flat': return '/month';
      case 'per_week': return '/week';
      case 'per_day': return '/day';
      case 'cpm': return '/1000 impressions';
      case 'cpc': return '/click';
      
      // Newsletter models
      case 'per_send': return '/send';
      
      // Print models
      case 'per_ad': return '/ad';
      case 'per_line': return '/line';
      
      // Podcast models
      case 'cpd': return '/1000 downloads';  // Cost per thousand downloads
      case 'per_episode': return '/episode';
      
      // Radio models
      case 'per_spot': return '/spot';
      
      // Social media models
      case 'per_post': return '/post';
      case 'per_story': return '/story';
      case 'monthly': return '/month';
      
      // Streaming models
      case 'cpv': return '/1000 views';  // Cost per thousand views
      case 'per_video': return '/video';
      
      // General
      case 'contact': return 'Contact for pricing';
      
      // If we get something unexpected, return it as-is
      default: return model;
    }
  };

  // Validation helper functions
  const validateAndSetField = (fieldName: string, value: any, validationType: 'integer' | 'number' | 'percentage') => {
    let validationResult;
    
    switch(validationType) {
      case 'integer':
        validationResult = validatePositiveInteger(value);
        break;
      case 'number':
        validationResult = validatePositiveNumber(value);
        break;
      case 'percentage':
        validationResult = validatePercentage(value);
        break;
      default:
        validationResult = { isValid: true };
    }
    
    if (validationResult.error) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: validationResult.error! }));
    } else {
      setFieldErrors(prev => {
        const { [fieldName]: removed, ...rest } = prev;
        return rest;
      });
    }
    
    return validationResult.isValid;
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors(prev => {
      const { [fieldName]: removed, ...rest } = prev;
      return rest;
    });
  };

  const clearAllErrors = () => {
    setFieldErrors({});
  };

  // Helper function to open delete confirmation dialog
  const confirmDelete = (itemName: string, itemType: string, onConfirm: () => void) => {
    setDeleteItemName(itemName);
    setDeleteItemType(itemType);
    setDeleteAction(() => onConfirm);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteAction) {
      deleteAction();
    }
    setDeleteConfirmOpen(false);
    setDeleteAction(null);
    setDeleteItemName('');
    setDeleteItemType('');
  };

  // Helper component to render pricing display
  const renderPricingDisplay = (pricing: any) => {
    // Helper to get price value and field name from pricing object
    const getPriceInfo = (pricingObj: any) => {
      if (!pricingObj) return { value: null, field: null };
      // Try all possible price field names
      const priceFields = ['flatRate', 'perPost', 'perStory', 'monthly', 'perSpot', 'per30Second', 'per60Second', 'perSend', 'cpm', 'cpc', 'weekly'];
      for (const field of priceFields) {
        if (pricingObj[field] !== undefined && pricingObj[field] !== null) {
          return { value: pricingObj[field], field };
        }
      }
      return { value: null, field: null };
    };

    // Infer pricing model from field name if pricingModel is missing
    const inferPricingModel = (pricingObj: any, priceField: string | null) => {
      // If pricingModel is explicitly set, use it
      if (pricingObj?.pricingModel) {
        return pricingObj.pricingModel;
      }
      // Otherwise, infer from the price field name
      if (!priceField) return null;
      
      const fieldToModel: Record<string, string> = {
        'flatRate': 'flat',
        'perPost': 'per_post',
        'perStory': 'per_story',
        'monthly': 'monthly',
        'perSpot': 'per_spot',
        'per30Second': 'per_spot',  // Radio ads
        'per60Second': 'per_spot',  // Radio ads
        'perSend': 'per_send',
        'cpm': 'cpm',
        'cpc': 'cpc',
        'weekly': 'per_week'
      };
      
      return fieldToModel[priceField] || null;
    };

    // Check if pricing is an array (multiple tiers)
    if (Array.isArray(pricing)) {
      return (
        <div className="space-y-1">
          {pricing.map((priceTier: any, idx: number) => {
            const { value: priceValue, field: priceField } = getPriceInfo(priceTier.pricing);
            const pricingModel = inferPricingModel(priceTier.pricing, priceField);
            
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-900">
                  {pricingModel === 'contact' 
                    ? 'Contact' 
                    : priceValue 
                      ? `$${priceValue}`
                      : 'N/A'}
                </span>
                <span className="text-gray-600">
                  {formatPricingModel(pricingModel)}
                </span>
              </div>
            );
          })}
        </div>
      );
    } else {
      // Single pricing tier
      const pricingObj = pricing || {};
      
      // NEW CLEAN SCHEMA: If pricingModel is explicitly set, use flatRate + pricingModel
      if (pricingObj.pricingModel) {
        const priceValue = pricingObj.flatRate || pricingObj.cpm || 0;
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-900">
              {pricingObj.pricingModel === 'contact' 
                ? 'Contact' 
                : priceValue 
                  ? `$${priceValue}`
                  : 'N/A'}
            </span>
            <span className="text-gray-600">
              {formatPricingModel(pricingObj.pricingModel)}
            </span>
          </div>
        );
      }
      
      // LEGACY FORMAT: Handle case where there are multiple price fields without pricingModel
      const priceFields = ['flatRate', 'perPost', 'perStory', 'monthly', 'perSpot', 'perSend', 'cpm', 'cpc', 'weekly'];
      const availablePrices = priceFields
        .map(field => ({ field, value: pricingObj[field] }))
        .filter(item => item.value !== undefined && item.value !== null && item.value !== 0); // Filter out 0 values
      
      if (availablePrices.length > 1) {
        // Multiple prices without explicit tiers - show each one (LEGACY DATA)
        return (
          <div className="space-y-1">
            {availablePrices.map((item, idx) => {
              const pricingModel = inferPricingModel(pricingObj, item.field);
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-900">${item.value}</span>
                  <span className="text-gray-600">{formatPricingModel(pricingModel)}</span>
                </div>
              );
            })}
          </div>
        );
      } else if (availablePrices.length === 1) {
        // Single price (LEGACY DATA)
        const item = availablePrices[0];
        const pricingModel = inferPricingModel(pricingObj, item.field);
        
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-900">${item.value}</span>
            <span className="text-gray-600">{formatPricingModel(pricingModel)}</span>
          </div>
        );
      } else {
        // No price found
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-gray-900">N/A</span>
            <span className="text-gray-600">N/A</span>
          </div>
        );
      }
    }
  };

  // Helper function to check if inventory type has data (channel exists)
  const hasActiveOpportunities = (type: keyof typeof visibleTabs): boolean => {
    if (!currentPublication) return false;
    
    switch(type) {
      case 'website':
        // Show if website object exists (regardless of ads)
        return !!currentPublication.distributionChannels?.website;
      case 'newsletters': {
        const newsletters = currentPublication.distributionChannels?.newsletters;
        // Show if newsletters array exists and has at least one newsletter
        return !!(newsletters && newsletters.length > 0);
      }
      case 'print': {
        // Print can be either a single object OR an array
        const printData = currentPublication.distributionChannels?.print;
        if (!printData) return false;
        
        if (Array.isArray(printData)) {
          // Show if array has at least one print publication
          return printData.length > 0;
        } else {
          // Show if print object exists
          return true;
        }
      }
      case 'events': {
        const events = currentPublication.distributionChannels?.events;
        // Show if events array exists and has at least one event
        return !!(events && events.length > 0);
      }
      case 'podcasts': {
        const podcasts = currentPublication.distributionChannels?.podcasts;
        // Show if podcasts array exists and has at least one podcast
        return !!(podcasts && podcasts.length > 0);
      }
      case 'radio': {
        const radioStations = currentPublication.distributionChannels?.radioStations;
        // Show if radio stations array exists and has at least one station
        return !!(radioStations && radioStations.length > 0);
      }
      case 'streaming': {
        const streamingVideo = currentPublication.distributionChannels?.streamingVideo;
        // Show if streaming video array exists and has at least one channel
        return !!(streamingVideo && streamingVideo.length > 0);
      }
      case 'television': {
        const television = currentPublication.distributionChannels?.television;
        // Show if television array exists and has at least one station
        return !!(television && television.length > 0);
      }
      case 'social': {
        const socialMedia = currentPublication.distributionChannels?.socialMedia;
        // Show if social media array exists and has at least one platform
        return !!(socialMedia && socialMedia.length > 0);
      }
      default:
        return false;
    }
  };

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
          console.log('📄 Publication loaded in inventory manager:', publicationData._id);
        } else {
          console.error('❌ Publication not found:', selectedPublication._id);
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

  // Reset editing states when publication changes
  useEffect(() => {
    console.log('Publication changed, resetting editing states. Publication ID:', selectedPublication?._id);
    
    // Clear all editing states to prevent cross-publication contamination
    setEditingItem(null);
    setEditingType(null);
    setEditingIndex(-1);
    setEditingSubIndex(-1);
    setEditingParentIndex(-1);
    setEditingItemIndex(-1);
    
    // DON'T reset activeTab here - let the visibility logic handle it below
  }, [selectedPublication?._id]);

  // Data-driven visibility with temporary manual overrides
  // Tabs show if: 1) they have data, OR 2) user manually showed them (temp, session only)
  useEffect(() => {
    if (currentPublication && selectedPublication?._id) {
      const tempShownTabs = getTempShownTabs(selectedPublication._id);
      
      // Clean up sessionStorage: remove temp tabs that now have data (no longer need temp flag)
      const cleanedTempTabs = { ...tempShownTabs };
      Object.keys(cleanedTempTabs).forEach(key => {
        if (hasActiveOpportunities(key as keyof typeof visibleTabs)) {
          delete cleanedTempTabs[key];
        }
      });
      if (JSON.stringify(cleanedTempTabs) !== JSON.stringify(tempShownTabs)) {
        sessionStorage.setItem(getTempVisibilityStorageKey(selectedPublication._id), JSON.stringify(cleanedTempTabs));
      }
      
      // Determine visibility: data-driven OR temporarily shown by user
      const updatedState = {
        website: hasActiveOpportunities('website') || cleanedTempTabs.website === true,
        newsletters: hasActiveOpportunities('newsletters') || cleanedTempTabs.newsletters === true,
        print: hasActiveOpportunities('print') || cleanedTempTabs.print === true,
        events: hasActiveOpportunities('events') || cleanedTempTabs.events === true,
        podcasts: hasActiveOpportunities('podcasts') || cleanedTempTabs.podcasts === true,
        radio: hasActiveOpportunities('radio') || cleanedTempTabs.radio === true,
        streaming: hasActiveOpportunities('streaming') || cleanedTempTabs.streaming === true,
        television: hasActiveOpportunities('television') || cleanedTempTabs.television === true,
        social: hasActiveOpportunities('social') || cleanedTempTabs.social === true,
      };
      
      console.log('Tab visibility (data-driven + temp shown):', updatedState);
      console.log('Has data:', {
        website: hasActiveOpportunities('website'),
        newsletters: hasActiveOpportunities('newsletters'),
        print: hasActiveOpportunities('print'),
        events: hasActiveOpportunities('events'),
        podcasts: hasActiveOpportunities('podcasts'),
        radio: hasActiveOpportunities('radio'),
        streaming: hasActiveOpportunities('streaming'),
        television: hasActiveOpportunities('television'),
        social: hasActiveOpportunities('social'),
      });
      console.log('Temp shown:', tempShownTabs);
      
      setVisibleTabs(updatedState);
      
      // Set activeTab to the first visible tab
      const firstVisibleTab = Object.entries(updatedState).find(([_, visible]) => visible)?.[0];
      if (firstVisibleTab) {
        console.log('Setting active tab to first visible:', firstVisibleTab);
        setActiveTab(firstVisibleTab);
      }
    }
  }, [currentPublication?._id, selectedPublication?._id]);

  // No longer saving to localStorage - tabs are data-driven!
  // Temporary manual shows are in sessionStorage and clear on page refresh

  // Debug tab changes
  const handleTabChange = (value: string) => {
    console.log('Tab changing from', activeTab, 'to', value);
    setActiveTab(value);
  };

  const handleUpdatePublication = async (updatedData: Partial<PublicationFrontend>) => {
    if (!currentPublication?._id) return;

    setLoading(true);
    try {
      // Ensure we're sending the full publication data, not just a partial update
      // Remove system-managed fields that shouldn't be updated
      const { metadata, _id, createdAt, updatedAt, ...cleanUpdatedData } = updatedData;
      const { _id: currentId, createdAt: currentCreatedAt, updatedAt: currentUpdatedAt, ...currentData } = currentPublication;
      
      const fullUpdateData = {
        ...currentData,
        ...cleanUpdatedData,
        // Merge metadata properly if it exists
        ...(metadata && {
          metadata: {
            ...currentPublication.metadata,
            ...metadata
          }
        })
      };

      const updated = await updatePublication(currentPublication._id, fullUpdateData);
      if (updated) {
        // Update both local state and context to keep them in sync
        setCurrentPublication(updated);
        setSelectedPublication(updated);
        
        console.log('✅ Publication updated successfully:', updated._id);
        toast({
          title: "Success",
          description: "Inventory updated successfully"
        });
        return updated;
      } else {
        throw new Error('No updated publication returned from API');
      }
    } catch (error) {
      console.error('❌ Error updating publication:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update publication';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Re-throw the error so calling functions can handle it
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // General Terms Handlers
  const handleSaveWebsiteGeneralTerms = async (terms: GeneralTerms) => {
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        website: {
          ...currentPublication.distributionChannels?.website,
          generalTerms: terms
        }
      }
    });
  };

  const handleSaveNewsletterGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const newsletters = [...(currentPublication.distributionChannels?.newsletters || [])];
    newsletters[index] = {
      ...newsletters[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        newsletters
      }
    });
  };

  const handleSavePrintGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const print = [...(currentPublication.distributionChannels?.print || [])];
    print[index] = {
      ...print[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        print
      }
    });
  };

  const handleSaveEventGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const events = [...(currentPublication.distributionChannels?.events || [])];
    events[index] = {
      ...events[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        events
      }
    });
  };

  const handleSavePodcastGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const podcasts = [...(currentPublication.distributionChannels?.podcasts || [])];
    podcasts[index] = {
      ...podcasts[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        podcasts
      }
    });
  };

  const handleSaveRadioGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const radioStations = [...(currentPublication.distributionChannels?.radioStations || [])];
    radioStations[index] = {
      ...radioStations[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        radioStations
      }
    });
  };

  const handleSaveStreamingGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const streamingVideo = [...(currentPublication.distributionChannels?.streamingVideo || [])];
    streamingVideo[index] = {
      ...streamingVideo[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        streamingVideo
      }
    });
  };

  const handleSaveTelevisionGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const television = [...(currentPublication.distributionChannels?.television || [])];
    television[index] = {
      ...television[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        television
      }
    });
  };

  const handleSaveSocialMediaGeneralTerms = async (index: number, terms: GeneralTerms) => {
    const socialMedia = [...(currentPublication.distributionChannels?.socialMedia || [])];
    socialMedia[index] = {
      ...socialMedia[index],
      generalTerms: terms
    };
    await handleUpdatePublication({
      distributionChannels: {
        ...currentPublication.distributionChannels,
        socialMedia
      }
    });
  };

  // Edit dialog handlers
  const openEditDialog = (item: any, type: 'website' | 'newsletter' | 'print' | 'event' | 'package' | 'social-media' | 'newsletter-container' | 'event-container' | 'website-container' | 'print-container' | 'podcast' | 'radio' | 'streaming' | 'podcast-container' | 'radio-container' | 'streaming-container' | 'podcast-ad' | 'radio-ad' | 'streaming-ad' | 'social-media-ad' | 'print-ad', index: number, subIndex: number = -1, adding: boolean = false) => {
    // Use deep copy to preserve nested objects and arrays like advertisingOpportunities
    const itemCopy = JSON.parse(JSON.stringify(item));
    console.log('📝 Opening edit dialog:', {
      type,
      index,
      subIndex,
      adding,
      originalItem: item,
      itemCopy: itemCopy,
      hasAdvertisingOpportunities: itemCopy.advertisingOpportunities?.length > 0,
      advertisingOpportunitiesCount: itemCopy.advertisingOpportunities?.length || 0
    });
    setEditingItem(itemCopy);
    setEditingType(type);
    setEditingIndex(index);
    setEditingSubIndex(subIndex);
    setIsAdding(adding);
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditingType(null);
    setIsAdding(false);
    setEditingIndex(-1);
    setEditingSubIndex(-1);
    setEditingParentIndex(-1);
    setEditingItemIndex(-1);
  };

  const saveEditedItem = async () => {
    if (!currentPublication || !editingItem || !editingType) return;
    
    // For container types, we don't need editingIndex since we're editing the container itself
    const isContainerType = editingType?.includes('-container');
    // For events, we use editingParentIndex and editingItemIndex instead of editingIndex
    const isEventSponsorship = editingType === 'event';
    // Allow editingIndex < 0 when adding new items
    if (!isContainerType && !isEventSponsorship && !isAdding && editingIndex < 0) return;

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
      editingItem: editingItem,
      hasAdvertisingOpportunities: editingItem.advertisingOpportunities?.length > 0,
      advertisingOpportunitiesCount: editingItem.advertisingOpportunities?.length || 0,
      hasHubPricing: editingItem.hubPricing?.length > 0,
      hubPricingCount: editingItem.hubPricing?.length || 0
    });

    // Validate the item before saving
    if (!validateInventoryItem(editingItem, editingType)) {
      console.error('❌ Validation failed:', {
        editingType,
        editingItem,
        hasLevel: editingItem.level,
        hasName: editingItem.name,
        hasTitle: editingItem.title
      });
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a deep copy to avoid mutation issues
      const updatedPublication = JSON.parse(JSON.stringify(currentPublication));

      // Ensure distributionChannels exists
      if (!updatedPublication.distributionChannels) {
        updatedPublication.distributionChannels = {};
      }

      switch (editingType) {
        case 'website':
          if (isAdding) {
            // Adding new opportunity
            if (!updatedPublication.distributionChannels.website) {
              updatedPublication.distributionChannels.website = {};
            }
            if (!updatedPublication.distributionChannels.website.advertisingOpportunities) {
              updatedPublication.distributionChannels.website.advertisingOpportunities = [];
            }
            updatedPublication.distributionChannels.website.advertisingOpportunities.push(editingItem);
          } else {
            // Editing existing opportunity
            if (updatedPublication.distributionChannels?.website?.advertisingOpportunities) {
              updatedPublication.distributionChannels.website.advertisingOpportunities[editingIndex] = editingItem;
            }
          }
          break;

        case 'newsletter':
          if (isAdding) {
            // Adding new newsletter ad
            if (updatedPublication.distributionChannels?.newsletters?.[editingIndex]) {
              if (!updatedPublication.distributionChannels.newsletters[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.newsletters[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.newsletters[editingIndex].advertisingOpportunities.push(editingItem);
            }
          } else {
            // Editing existing newsletter ad
            if (updatedPublication.distributionChannels?.newsletters && 
                editingSubIndex >= 0 && 
                updatedPublication.distributionChannels.newsletters[editingIndex]?.advertisingOpportunities) {
              updatedPublication.distributionChannels.newsletters[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
            }
          }
          break;

        case 'print-ad':
          console.log('💾 Saving print-ad:', {
            editingIndex,
            editingSubIndex,
            isAdding,
            editingItem,
            hasPrint: !!updatedPublication.distributionChannels?.print,
            isArray: Array.isArray(updatedPublication.distributionChannels?.print),
            printType: typeof updatedPublication.distributionChannels?.print
          });
          
          if (updatedPublication.distributionChannels?.print) {
            // Handle both array format (new) and single object format (legacy)
            if (Array.isArray(updatedPublication.distributionChannels.print)) {
              // Array format - multiple print publications
              if (isAdding) {
                // Adding new print ad
                if (!updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities) {
                  updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities = [];
                }
                updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities.push(editingItem);
                console.log('✅ Print ad added successfully (array format)');
              } else {
                // Editing existing print ad
                if (editingSubIndex >= 0 && updatedPublication.distributionChannels.print[editingIndex]?.advertisingOpportunities) {
                  updatedPublication.distributionChannels.print[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
                  console.log('✅ Print ad saved successfully (array format)');
                }
              }
            } else if (typeof updatedPublication.distributionChannels.print === 'object') {
              // Single object format - one print publication
              if (isAdding) {
                // Adding new print ad
                if (!updatedPublication.distributionChannels.print.advertisingOpportunities) {
                  updatedPublication.distributionChannels.print.advertisingOpportunities = [];
                }
                updatedPublication.distributionChannels.print.advertisingOpportunities.push(editingItem);
                console.log('✅ Print ad added successfully (object format)');
              } else {
                // Editing existing print ad
                if (editingIndex === 0 && editingSubIndex >= 0 && updatedPublication.distributionChannels.print.advertisingOpportunities) {
                  updatedPublication.distributionChannels.print.advertisingOpportunities[editingSubIndex] = editingItem;
                  console.log('✅ Print ad saved successfully (object format)');
                }
              }
            }
          }
          break;

        case 'podcast-ad':
          if (updatedPublication.distributionChannels?.podcasts) {
            if (isAdding) {
              // Adding new podcast ad
              if (!updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities.push(editingItem);
            } else {
              // Editing existing podcast ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.podcasts[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
              }
            }
          }
          break;

        case 'radio-ad':
          if (updatedPublication.distributionChannels?.radioStations) {
            if (isAdding) {
              // Adding new radio ad
              if (!updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities.push(editingItem);
            } else {
              // Editing existing radio ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.radioStations[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.radioStations[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
              }
            }
          }
          break;

        case 'streaming-ad':
          if (updatedPublication.distributionChannels?.streamingVideo) {
            if (isAdding) {
              // Adding new streaming ad
              if (!updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities.push(editingItem);
            } else {
              // Editing existing streaming ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.streamingVideo[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.streamingVideo[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
              }
            }
          }
          break;

        case 'social-media-ad':
          if (updatedPublication.distributionChannels?.socialMedia) {
            if (isAdding) {
              // Adding new social media ad
              if (!updatedPublication.distributionChannels.socialMedia[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.socialMedia[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.socialMedia[editingIndex].advertisingOpportunities.push(editingItem);
            } else {
              // Editing existing social media ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.socialMedia[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.socialMedia[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
              }
            }
          }
          break;

        case 'event':
          if (updatedPublication.distributionChannels?.events && editingParentIndex >= 0) {
            // Convert benefits from string to array before saving
            const itemToSave = { ...editingItem };
            if (typeof itemToSave.benefits === 'string') {
              itemToSave.benefits = itemToSave.benefits
                .split(',')
                .map(b => b.trim())
                .filter(Boolean);
            }
            
            if (isAdding) {
              // Adding new event sponsorship
              if (!updatedPublication.distributionChannels.events[editingParentIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.events[editingParentIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.events[editingParentIndex].advertisingOpportunities.push(itemToSave);
            } else {
              // Editing existing event sponsorship
              if (editingItemIndex >= 0 && updatedPublication.distributionChannels.events[editingParentIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.events[editingParentIndex].advertisingOpportunities[editingItemIndex] = itemToSave;
              }
            }
          }
          break;

        case 'event-container':
          if (updatedPublication.distributionChannels?.events && editingItemIndex >= 0) {
            updatedPublication.distributionChannels.events[editingItemIndex] = editingItem;
          }
          break;

        // Container types - these update entire channel objects
        case 'website-container':
          updatedPublication.distributionChannels.website = editingItem;
          break;

        case 'newsletter-container':
          if (updatedPublication.distributionChannels?.newsletters && editingIndex >= 0) {
            updatedPublication.distributionChannels.newsletters[editingIndex] = editingItem;
          }
          break;

        case 'print-container':
          if (updatedPublication.distributionChannels?.print) {
            // Handle both array format (new) and single object format (legacy)
            if (Array.isArray(updatedPublication.distributionChannels.print)) {
              if (editingIndex >= 0) {
                console.log('📋 Updating print container at index', editingIndex, ':', {
                  before: updatedPublication.distributionChannels.print[editingIndex],
                  after: editingItem
                });
                updatedPublication.distributionChannels.print[editingIndex] = editingItem;
              }
            } else {
              // Legacy single object format - update directly
              console.log('📋 Updating print container (single object format):', {
                before: updatedPublication.distributionChannels.print,
                after: editingItem
              });
              updatedPublication.distributionChannels.print = editingItem;
            }
          }
          break;

        case 'podcast-container':
          if (updatedPublication.distributionChannels?.podcasts && editingIndex >= 0) {
            updatedPublication.distributionChannels.podcasts[editingIndex] = editingItem;
          }
          break;

        case 'radio-container':
          if (updatedPublication.distributionChannels?.radioStations && editingIndex >= 0) {
            updatedPublication.distributionChannels.radioStations[editingIndex] = editingItem;
          }
          break;

        case 'streaming-container':
          if (updatedPublication.distributionChannels?.streamingVideo && editingIndex >= 0) {
            updatedPublication.distributionChannels.streamingVideo[editingIndex] = editingItem;
          }
          break;

        case 'social-media-container':
          if (updatedPublication.distributionChannels?.socialMedia && editingIndex >= 0) {
            updatedPublication.distributionChannels.socialMedia[editingIndex] = editingItem;
          }
          break;

        default:
          console.warn('Unknown editing type:', editingType);
          return;
      }

      // Send the complete updated publication to the API
      const result = await handleUpdatePublication(updatedPublication);
      
      // Update editingItem with the saved data from the response
      // This ensures the form shows the latest saved values
      if (result) {
        let savedItem = null;
        
        switch (editingType) {
          case 'website':
            savedItem = result.distributionChannels?.website?.advertisingOpportunities?.[editingIndex];
            break;
          case 'newsletter':
            savedItem = result.distributionChannels?.newsletters?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            break;
          case 'print-ad':
            if (Array.isArray(result.distributionChannels?.print)) {
              savedItem = result.distributionChannels.print[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            } else if (editingIndex === 0) {
              savedItem = result.distributionChannels?.print?.advertisingOpportunities?.[editingSubIndex];
            }
            break;
          case 'podcast-ad':
            savedItem = result.distributionChannels?.podcasts?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            break;
          case 'radio-ad':
            savedItem = result.distributionChannels?.radioStations?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            break;
          case 'streaming-ad':
            savedItem = result.distributionChannels?.streamingVideo?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            break;
          case 'social-media-ad':
            savedItem = result.distributionChannels?.socialMedia?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
            break;
          case 'event':
            savedItem = result.distributionChannels?.events?.[editingParentIndex]?.advertisingOpportunities?.[editingItemIndex];
            break;
          case 'event-container':
            savedItem = result.distributionChannels?.events?.[editingItemIndex];
            break;
          case 'website-container':
            savedItem = result.distributionChannels?.website;
            break;
          case 'newsletter-container':
            savedItem = result.distributionChannels?.newsletters?.[editingIndex];
            break;
          case 'print-container':
            if (Array.isArray(result.distributionChannels?.print)) {
              savedItem = result.distributionChannels.print[editingIndex];
            } else if (editingIndex === 0) {
              savedItem = result.distributionChannels?.print;
            }
            break;
          case 'podcast-container':
            savedItem = result.distributionChannels?.podcasts?.[editingIndex];
            break;
          case 'radio-container':
            savedItem = result.distributionChannels?.radioStations?.[editingIndex];
            break;
          case 'streaming-container':
            savedItem = result.distributionChannels?.streamingVideo?.[editingIndex];
            break;
          case 'social-media-container':
            savedItem = result.distributionChannels?.socialMedia?.[editingIndex];
            break;
        }
        
        if (savedItem) {
          setEditingItem(JSON.parse(JSON.stringify(savedItem)));
        }
      }
      
      // If adding a new item, close the modal automatically
      // If editing an existing item, keep it open for additional changes
      if (isAdding) {
        closeEditDialog();
      }
    } catch (error) {
      console.error('Error saving edited item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
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
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      adFormat: '300x250 banner',
      location: '',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const,
        minimumCommitment: '1 month'
      },
      specifications: {
        format: 'JPG, PNG, GIF',
        animationAllowed: true,
        thirdPartyTags: true
      },
      monthlyImpressions: 0,
      available: true
    };
    
    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'website', -1, -1, true);
  };

  const addNewsletterOpportunity = async (newsletterIndex: number) => {
    if (!currentPublication?.distributionChannels?.newsletters?.[newsletterIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      position: 'inline' as const,
      dimensions: '',
      pricing: {
        perSend: 0,
        monthly: 0
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'newsletter', newsletterIndex, -1, true);
  };

  const removeNewsletterOpportunity = async (newsletterIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.newsletters?.[newsletterIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const ad = currentPublication.distributionChannels.newsletters[newsletterIndex].advertisingOpportunities[adIndex];
    const adName = ad?.name || `Newsletter Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Newsletter advertising opportunity', executeDelete);
  };

  const cloneNewsletterOpportunity = async (newsletterIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.newsletters?.[newsletterIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.newsletters[newsletterIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedNewsletters = [...currentPublication.distributionChannels.newsletters];
    const updatedOpportunities = [
      ...(updatedNewsletters[newsletterIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Newsletter ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning newsletter opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone newsletter ad",
        variant: "destructive"
      });
    }
  };

  const addPrintOpportunity = async (printIndex: number) => {
    if (!currentPublication?.distributionChannels?.print) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      adFormat: 'full page' as const,
      dimensions: '',
      color: 'color' as const,
      location: '',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      },
      specifications: {
        format: 'PDF',
        resolution: '300 DPI',
        bleed: '0.125 inch'
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'print-ad', printIndex, -1, true);
  };

  const removePrintOpportunity = async (printIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.print) return;
    
    const updatedPrint = Array.isArray(currentPublication.distributionChannels.print) 
      ? [...currentPublication.distributionChannels.print]
      : [currentPublication.distributionChannels.print];
      
    if (!updatedPrint[printIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const ad = updatedPrint[printIndex].advertisingOpportunities[adIndex];
    const adName = ad?.name || `Print Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Print advertising opportunity', executeDelete);
  };

  const clonePrintOpportunity = async (printIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.print) return;
    
    const updatedPrint = Array.isArray(currentPublication.distributionChannels.print) 
      ? [...currentPublication.distributionChannels.print]
      : [currentPublication.distributionChannels.print];
      
    const originalAd = updatedPrint[printIndex]?.advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedOpportunities = [
      ...(updatedPrint[printIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Print ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning print opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone print ad",
        variant: "destructive"
      });
    }
  };

  const addEvent = async () => {
    if (!currentPublication) return;
    
    const newEvent = {
      name: 'New Event',
      type: 'Community Event',
      frequency: 'monthly',
      averageAttendance: 0,
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
      toast({
        title: "Success",
        description: "Event added successfully"
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Error",
        description: "Failed to add event",
        variant: "destructive"
      });
    }
  };

  const removeEvent = async (eventIndex: number) => {
    if (!currentPublication?.distributionChannels?.events) return;
    
    const event = currentPublication.distributionChannels.events[eventIndex];
    const eventName = event?.name || `Event #${eventIndex + 1}`;

    const executeDelete = async () => {
      const updatedEvents = currentPublication.distributionChannels.events.filter((_, index) => index !== eventIndex);

      try {
        await handleUpdatePublication({
          distributionChannels: {
            ...currentPublication.distributionChannels,
            events: updatedEvents
          }
        });
        toast({
          title: "Success",
          description: "Event removed successfully"
        });
      } catch (error) {
        console.error('Error removing event:', error);
        toast({
          title: "Error",
          description: "Failed to remove event",
          variant: "destructive"
        });
      }
    };

    confirmDelete(eventName, 'Event', executeDelete);
  };

  const addEventOpportunity = async (eventIndex: number) => {
    if (!currentPublication?.distributionChannels?.events?.[eventIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      level: 'sponsor' as const,
      benefits: [],
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      }
    };

    // Open modal for user to fill in details (events use different state pattern)
    setEditingType('event');
    setEditingParentIndex(eventIndex);
    setEditingItemIndex(-1); // -1 indicates adding new
    setEditingItem(newOpportunity);
    setIsAdding(true);
  };

  const removeEventOpportunity = async (eventIndex: number, oppIndex: number) => {
    if (!currentPublication?.distributionChannels?.events) return;
    
    const updatedEvents = [...currentPublication.distributionChannels.events];
    if (!updatedEvents[eventIndex]?.advertisingOpportunities?.[oppIndex]) return;
    
    const opp = updatedEvents[eventIndex].advertisingOpportunities[oppIndex];
    const oppName = opp?.level || `Sponsorship #${oppIndex + 1}`;

    const executeDelete = async () => {
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        advertisingOpportunities: updatedEvents[eventIndex].advertisingOpportunities!.filter((_, index) => index !== oppIndex)
      };

      try {
        await handleUpdatePublication({
          distributionChannels: {
            ...currentPublication.distributionChannels,
            events: updatedEvents
          }
        });
        toast({
          title: "Success",
          description: "Sponsorship opportunity removed successfully"
        });
      } catch (error) {
        console.error('Error removing event opportunity:', error);
        toast({
          title: "Error",
          description: "Failed to remove sponsorship opportunity",
          variant: "destructive"
        });
      }
    };

    confirmDelete(oppName, 'Sponsorship opportunity', executeDelete);
  };

  const addSocialMediaOpportunity = async (socialIndex: number) => {
    if (!currentPublication?.distributionChannels?.socialMedia?.[socialIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      adType: 'sponsored-post' as const,
      duration: '24h',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'social-media-ad', socialIndex, -1, true);
  };

  const removeSocialMediaOpportunity = async (socialIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.socialMedia?.[socialIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const ad = currentPublication.distributionChannels.socialMedia[socialIndex].advertisingOpportunities[adIndex];
    const adName = ad?.name || `Social Media Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Social media advertising opportunity', executeDelete);
  };

  const cloneSocialMediaOpportunity = async (socialIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.socialMedia?.[socialIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.socialMedia[socialIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedSocialMedia = [...currentPublication.distributionChannels.socialMedia];
    const updatedOpportunities = [
      ...(updatedSocialMedia[socialIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Social media ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning social media opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone social media ad",
        variant: "destructive"
      });
    }
  };

  // Television functions
  const addTelevisionStation = async () => {
    if (!currentPublication) return;
    
    const newStation = {
      stationId: `tv-${Date.now()}`,
      callSign: 'NEW-TV',
      channel: '',
      network: 'independent' as const,
      coverageArea: '',
      viewers: 0,
      advertisingOpportunities: []
    };

    const updatedTelevision = [...(currentPublication.distributionChannels?.television || []), newStation];

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          television: updatedTelevision
        }
      });
      toast({
        title: "Success",
        description: "TV station added successfully"
      });
    } catch (error) {
      console.error('Error adding TV station:', error);
      toast({
        title: "Error",
        description: "Failed to add TV station",
        variant: "destructive"
      });
    }
  };

  const removeTelevisionStation = async (index: number) => {
    if (!currentPublication?.distributionChannels?.television) return;
    
    const station = currentPublication.distributionChannels.television[index];
    const stationName = station?.callSign || `TV Station #${index + 1}`;

    const executeDelete = async () => {
      const updatedTelevision = currentPublication.distributionChannels.television.filter((_, i) => i !== index);

      try {
        await handleUpdatePublication({
          distributionChannels: {
            ...currentPublication.distributionChannels,
            television: updatedTelevision
          }
        });
        toast({
          title: "Success",
          description: "TV station removed successfully"
        });
      } catch (error) {
        console.error('Error removing TV station:', error);
        toast({
          title: "Error",
          description: "Failed to remove TV station",
          variant: "destructive"
        });
      }
    };

    confirmDelete(stationName, 'TV station', executeDelete);
  };

  const addTelevisionOpportunity = async (stationIndex: number) => {
    if (!currentPublication?.distributionChannels?.television?.[stationIndex]) return;
    
    const newOpportunity = {
      name: 'New Ad Spot',
      adFormat: '30_second_spot' as const,
      daypart: 'prime_time' as const,
      pricing: {
        perSpot: 0,
        pricingModel: 'per_spot' as const
      },
      available: true
    };

    const updatedTelevision = [...currentPublication.distributionChannels.television];
    const updatedOpportunities = [...(updatedTelevision[stationIndex].advertisingOpportunities || []), newOpportunity];
    
    updatedTelevision[stationIndex] = {
      ...updatedTelevision[stationIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          television: updatedTelevision
        }
      });
      toast({
        title: "Success",
        description: "TV ad product added successfully"
      });
    } catch (error) {
      console.error('Error adding TV opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to add TV ad product",
        variant: "destructive"
      });
    }
  };

  const removeTelevisionOpportunity = async (stationIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.television?.[stationIndex]?.advertisingOpportunities?.[adIndex]) return;
    
    const ad = currentPublication.distributionChannels.television[stationIndex].advertisingOpportunities[adIndex];
    const adName = ad?.name || `TV Ad #${adIndex + 1}`;

    const executeDelete = async () => {
      const updatedTelevision = [...currentPublication.distributionChannels.television];
      const updatedOpportunities = [...updatedTelevision[stationIndex].advertisingOpportunities];
      
      updatedOpportunities.splice(adIndex, 1);
      
      updatedTelevision[stationIndex] = {
        ...updatedTelevision[stationIndex],
        advertisingOpportunities: updatedOpportunities
      };

      try {
        await handleUpdatePublication({
          distributionChannels: {
            ...currentPublication.distributionChannels,
            television: updatedTelevision
          }
        });
        toast({
          title: "Success",
          description: "TV ad product removed successfully"
        });
      } catch (error) {
        console.error('Error removing TV opportunity:', error);
        toast({
          title: "Error",
          description: "Failed to remove TV ad product",
          variant: "destructive"
        });
      }
    };

    confirmDelete(adName, 'TV ad product', executeDelete);
  };

  const cloneTelevisionOpportunity = async (stationIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.television?.[stationIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.television[stationIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedTelevision = [...currentPublication.distributionChannels.television];
    const updatedOpportunities = [
      ...(updatedTelevision[stationIndex].advertisingOpportunities || []),
      clonedAd
    ];
    
    updatedTelevision[stationIndex] = {
      ...updatedTelevision[stationIndex],
      advertisingOpportunities: updatedOpportunities
    };

    try {
      await handleUpdatePublication({
        distributionChannels: {
          ...currentPublication.distributionChannels,
          television: updatedTelevision
        }
      });
      
      toast({
        title: "Success",
        description: "TV ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning TV opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone TV ad",
        variant: "destructive"
      });
    }
  };
  // Remove functions
  const removeWebsiteOpportunity = (index: number) => {
    if (!currentPublication?.distributionChannels?.website?.advertisingOpportunities) return;
    
    const ad = currentPublication.distributionChannels.website.advertisingOpportunities[index];
    const adName = ad?.name || `Website Ad #${index + 1}`;

    const executeDelete = () => {
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

    confirmDelete(adName, 'Website advertising opportunity', executeDelete);
  };

  const cloneWebsiteOpportunity = async (index: number) => {
    if (!currentPublication?.distributionChannels?.website?.advertisingOpportunities) return;
    
    const originalAd = currentPublication.distributionChannels.website.advertisingOpportunities[index];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedOpportunities = [
      ...currentPublication.distributionChannels.website.advertisingOpportunities,
      clonedAd
    ];

    try {
      await handleUpdatePublication({
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
        description: "Website ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning website opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone website ad",
        variant: "destructive"
      });
    }
  };

  const removeDistributionChannel = async (channelType: 'podcasts' | 'radio' | 'streaming' | 'print' | 'newsletters' | 'socialMedia' | 'television', index: number) => {
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
      case 'television':
        channelKey = 'television';
        break;
    }

    if (channelType === 'print' && !Array.isArray(currentPublication.distributionChannels?.print)) {
      // If print is an object, we can't delete it, just show a message
      toast({
        title: "Info",
        description: "Cannot delete primary print publication. Use edit to modify it.",
        variant: "default"
      });
      return;
    }

    const currentChannels = currentPublication.distributionChannels?.[channelKey as keyof typeof currentPublication.distributionChannels] as any[] || [];
    const channel = currentChannels[index];
    const channelName = channel?.name || channel?.title || channel?.callSign || `${channelType} #${index + 1}`;

    const executeDelete = async () => {
      const updatedChannels = currentChannels.filter((_, i) => i !== index);

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

    confirmDelete(channelName, `${channelType} channel`, executeDelete);
  };

  const addPodcastOpportunity = async (podcastIndex: number) => {
    if (!currentPublication?.distributionChannels?.podcasts?.[podcastIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      position: 'pre-roll' as const,
      duration: '30 seconds',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'podcast-ad', podcastIndex, -1, true);
  };

  const removePodcastOpportunity = async (podcastIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.podcasts?.[podcastIndex]) return;

    const ad = currentPublication.distributionChannels.podcasts[podcastIndex].advertisingOpportunities?.[adIndex];
    const adName = ad?.name || `Podcast Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Podcast advertising opportunity', executeDelete);
  };

  const clonePodcastOpportunity = async (podcastIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.podcasts?.[podcastIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.podcasts[podcastIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedPodcasts = [...currentPublication.distributionChannels.podcasts];
    const updatedOpportunities = [
      ...(updatedPodcasts[podcastIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Podcast ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning podcast opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone podcast ad",
        variant: "destructive"
      });
    }
  };

  const addRadioOpportunity = async (stationIndex: number) => {
    if (!currentPublication?.distributionChannels?.radioStations?.[stationIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      timeSlot: 'drive-time' as const,
      duration: '30 seconds',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'radio-ad', stationIndex, -1, true);
  };

  const removeRadioOpportunity = async (stationIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.radioStations?.[stationIndex]) return;

    const ad = currentPublication.distributionChannels.radioStations[stationIndex].advertisingOpportunities?.[adIndex];
    const adName = ad?.name || `Radio Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Radio advertising opportunity', executeDelete);
  };

  const cloneRadioOpportunity = async (stationIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.radioStations?.[stationIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.radioStations[stationIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    // Create a deep copy of the ad with "(Copy)" appended to the name
    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedStations = [...currentPublication.distributionChannels.radioStations];
    const updatedOpportunities = [
      ...(updatedStations[stationIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Radio ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning radio opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone radio ad",
        variant: "destructive"
      });
    }
  };

  const addStreamingOpportunity = async (channelIndex: number) => {
    if (!currentPublication?.distributionChannels?.streamingVideo?.[channelIndex]) return;
    
    // Create template for new opportunity
    const newOpportunity = {
      name: '',
      position: 'pre-roll' as const,
      duration: '15 seconds',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      }
    };

    // Open modal for user to fill in details
    openEditDialog(newOpportunity, 'streaming-ad', channelIndex, -1, true);
  };

  const removeStreamingOpportunity = async (channelIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.streamingVideo?.[channelIndex]) return;

    const ad = currentPublication.distributionChannels.streamingVideo[channelIndex].advertisingOpportunities?.[adIndex];
    const adName = ad?.name || `Streaming Ad #${adIndex + 1}`;

    const executeDelete = async () => {
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

    confirmDelete(adName, 'Streaming advertising opportunity', executeDelete);
  };

  const cloneStreamingOpportunity = async (channelIndex: number, adIndex: number) => {
    if (!currentPublication?.distributionChannels?.streamingVideo?.[channelIndex]) return;
    
    const originalAd = currentPublication.distributionChannels.streamingVideo[channelIndex].advertisingOpportunities?.[adIndex];
    if (!originalAd) return;

    const clonedAd = {
      ...originalAd,
      name: `${originalAd.name} (Copy)`,
      hubPricing: originalAd.hubPricing ? [...originalAd.hubPricing] : []
    };

    const updatedChannels = [...currentPublication.distributionChannels.streamingVideo];
    const updatedOpportunities = [
      ...(updatedChannels[channelIndex].advertisingOpportunities || []),
      clonedAd
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
        description: "Streaming ad cloned successfully"
      });
    } catch (error) {
      console.error('Error cloning streaming opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to clone streaming ad",
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
      {/* Header with Manage Channels Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inventory</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="w-4 h-4" />
              Manage Channels
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manage Inventory Channels
              </DialogTitle>
              <DialogDescription>
                Add or remove inventory channels. Channels with active opportunities cannot be removed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-3">
              {/* Active Channels */}
              <div>
                <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Active Channels</h3>
                <div className="space-y-1.5">
                  {Object.entries(visibleTabs).filter(([_, visible]) => visible).map(([key]) => {
                    const channelKey = key as keyof typeof visibleTabs;
                    const hasOpportunities = hasActiveOpportunities(channelKey);
                    const channelConfig = {
                      website: { icon: Globe, label: 'Website' },
                      newsletters: { icon: Mail, label: 'Newsletters' },
                      print: { icon: Printer, label: 'Print' },
                      events: { icon: Calendar, label: 'Events' },
                      podcasts: { icon: Mic, label: 'Podcasts' },
                      radio: { icon: Radio, label: 'Radio' },
                      streaming: { icon: Video, label: 'Streaming' },
                      television: { icon: Tv, label: 'Television' },
                      social: { icon: Users, label: 'Social' }
                    };
                    const config = channelConfig[channelKey];
                    const Icon = config.icon;

                    return (
                      <div key={key} className="flex items-center justify-between px-3 py-2 border rounded-md bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={hasOpportunities}
                                  onClick={() => {
                                    if (selectedPublication?._id) {
                                      // Remove from temp shown (only works if channel has no data)
                                      setTempShownTab(selectedPublication._id, channelKey, false);
                                      setVisibleTabs(prev => ({ ...prev, [channelKey]: false }));
                                    }
                                  }}
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {hasOpportunities && (
                              <TooltipContent>
                                <p>Cannot remove channels with active advertising opportunities</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Available Channels */}
              <div>
                <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Available Channels</h3>
                {Object.entries(visibleTabs).filter(([_, visible]) => !visible).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(visibleTabs).filter(([_, visible]) => !visible).map(([key]) => {
                      const channelKey = key as keyof typeof visibleTabs;
                      const channelConfig = {
                        website: { icon: Globe, label: 'Website' },
                        newsletters: { icon: Mail, label: 'Newsletters' },
                        print: { icon: Printer, label: 'Print' },
                        events: { icon: Calendar, label: 'Events' },
                        podcasts: { icon: Mic, label: 'Podcasts' },
                        radio: { icon: Radio, label: 'Radio' },
                        streaming: { icon: Video, label: 'Streaming' },
                        television: { icon: Tv, label: 'Television' },
                        social: { icon: Users, label: 'Social' }
                      };
                      const config = channelConfig[channelKey];
                      const Icon = config.icon;

                      return (
                        <div key={key} className="flex items-center justify-between px-3 py-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{config.label}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (selectedPublication?._id) {
                                // Mark as temporarily shown (until data is added or page refreshes)
                                setTempShownTab(selectedPublication._id, channelKey, true);
                                setVisibleTabs(prev => ({ ...prev, [channelKey]: true }));
                              }
                            }}
                            className="h-7 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">All channels are currently active</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Tabs */}
      <Tabs key={currentPublication._id} value={activeTab} onValueChange={handleTabChange} className="shadow-sm rounded-lg">
        <TabsList className={`grid w-full gap-0`} style={{ gridTemplateColumns: `repeat(${Object.values(visibleTabs).filter(Boolean).length}, minmax(0, 1fr))` }}>
          {visibleTabs.website && <TabsTrigger value="website">Website</TabsTrigger>}
          {visibleTabs.newsletters && <TabsTrigger value="newsletters">Newsletters</TabsTrigger>}
          {visibleTabs.print && <TabsTrigger value="print">Print</TabsTrigger>}
          {visibleTabs.events && <TabsTrigger value="events">Events</TabsTrigger>}
          {visibleTabs.podcasts && <TabsTrigger value="podcasts">Podcasts</TabsTrigger>}
          {visibleTabs.radio && <TabsTrigger value="radio">Radio</TabsTrigger>}
          {visibleTabs.streaming && <TabsTrigger value="streaming">Streaming</TabsTrigger>}
          {visibleTabs.television && <TabsTrigger value="television">TV</TabsTrigger>}
          {visibleTabs.social && <TabsTrigger value="social">Social</TabsTrigger>}
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
            {/* Specifications Container */}
            <div className="mt-3 p-3 bg-gray-50 rounded-md border">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Website URL</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.url || currentPublication.basicInfo?.websiteUrl || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CMS Platform</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.cmsplatform || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Visitors</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly Page Views</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.metrics?.monthlyPageViews?.toLocaleString() || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bounce Rate</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.metrics?.bounceRate ? `${currentPublication.distributionChannels.website.metrics.bounceRate}%` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mobile Traffic</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.metrics?.mobilePercentage ? `${currentPublication.distributionChannels.website.metrics.mobilePercentage}%` : 'Not specified'}</p>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPublication.distributionChannels?.website?.advertisingOpportunities?.map((opportunity: any, index: number) => (
                <div key={index} className="relative">
                  <div className="group border border-gray-200 rounded-lg shadow-sm p-4 bg-white transition-shadow duration-200 hover:shadow-md">
                    {/* Title and Badges */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-semibold text-gray-900">{opportunity.name}</h4>
                        {(() => {
                          // Prefer new format.dimensions
                          const dims = opportunity.format?.dimensions;
                          if (dims) {
                            const displayText = Array.isArray(dims) 
                              ? (dims.length > 2 ? `${dims.length} sizes` : dims.join(', '))
                              : dims;
                            return (
                              <Badge variant="outline" className="text-xs">
                                {displayText}
                              </Badge>
                            );
                          }
                          // Fallback to legacy sizes
                          if (opportunity.sizes && opportunity.sizes.length > 0) {
                            const sizes = opportunity.sizes.filter((s: string) => s);
                            const displayText = sizes.length > 2 
                              ? `${sizes.length} sizes` 
                              : sizes.join(', ');
                            return (
                              <Badge variant="outline" className="text-xs">
                                {displayText}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        {opportunity.adFormat && (
                          <Badge variant="secondary" className="text-xs">
                            {opportunity.adFormat}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(opportunity, 'website', index)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => cloneWebsiteOpportunity(index)}
                          title="Clone this ad"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeWebsiteOpportunity(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Card content layout */}
                    <div className="space-y-3">
                      {/* Location and Size row */}
                      <div className="grid grid-cols-2 gap-x-6">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                          <p className="text-sm text-gray-900">{opportunity.location || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {(() => {
                              const dims = opportunity.format?.dimensions;
                              const isArray = Array.isArray(dims);
                              const count = isArray ? dims.length : 0;
                              return count > 1 ? 'Sizes' : 'Size';
                            })()}
                          </p>
                          <p className="text-sm text-gray-900">
                            {(() => {
                              // Prefer new format.dimensions
                              if (opportunity.format?.dimensions) {
                                const dims = opportunity.format.dimensions;
                                return Array.isArray(dims) ? dims.join(', ') : dims;
                              }
                              // Fallback to legacy sizes
                              if (opportunity.sizes && opportunity.sizes.length > 0) {
                                return opportunity.sizes.filter((s: string) => s).join(', ');
                              }
                              return 'N/A';
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Pricing section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs font-medium text-gray-500">Pricing</p>
                          {opportunity.hubPricing && opportunity.hubPricing.length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-2 py-0.5"
                            >
                              +{opportunity.hubPricing.length} CUSTOM
                            </Badge>
                          )}
                        </div>
                        {renderPricingDisplay(opportunity.pricing)}
                      </div>
                    </div>
                  </div>
                </div>
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

          {/* General Terms */}
          <GeneralTermsEditor
            terms={currentPublication.distributionChannels?.website?.generalTerms}
            onSave={handleSaveWebsiteGeneralTerms}
            channelName="Website"
          />
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
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{podcast.name}</h4>
                        <Badge variant="secondary">{podcast.frequency?.charAt(0).toUpperCase() + podcast.frequency?.slice(1)}</Badge>
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
                    {/* Specifications Container */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Downloads</span>
                          <span className="ml-2 font-medium">{podcast.averageDownloads?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Listeners</span>
                          <span className="ml-2 font-medium">{podcast.averageListeners?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Episodes</span>
                          <span className="ml-2 font-medium">{podcast.episodeCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Platforms</span>
                          <span className="ml-2 font-medium">{podcast.platforms?.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="-mx-4 -mb-4 mt-4">
                      <div className="border-t border-gray-200"></div>
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-sans font-semibold text-sm">Advertising Opportunities</h5>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {podcast.advertisingOpportunities.map((ad: any, adIndex: number) => (
                            <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                                  {ad.adFormat && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ad.adFormat}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => clonePodcastOpportunity(index, adIndex)}
                                    title="Clone this ad"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => removePodcastOpportunity(index, adIndex)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Duration</p>
                                  <p className="text-xs text-gray-900">{ad.duration ? `${ad.duration}s` : 'N/A'}</p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-medium text-gray-500">Pricing</p>
                                    {ad.hubPricing && ad.hubPricing.length > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                      >
                                        +{ad.hubPricing.length} CUSTOM
                                      </Badge>
                                    )}
                                  </div>
                                  {renderPricingDisplay(ad.pricing)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                      )}
                      </div>
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

            {/* General Terms for Podcasts */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.podcasts?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all podcasts with the same general terms
                const podcasts = currentPublication.distributionChannels?.podcasts?.map(p => ({ ...p, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    podcasts
                  }
                });
              }}
              channelName="Podcasts"
            />
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
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{station.callSign}</h4>
                        <Badge variant="secondary">{station.frequency?.charAt(0).toUpperCase() + station.frequency?.slice(1)}</Badge>
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
                    {/* Specifications Container */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Format</span>
                          <span className="ml-2 font-medium">{station.format}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage</span>
                          <span className="ml-2 font-medium">{station.coverageArea}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Listeners</span>
                          <span className="ml-2 font-medium">{station.listeners?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ads</span>
                          <span className="ml-2 font-medium">{station.advertisingOpportunities?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="-mx-4 -mb-4 mt-4">
                      <div className="border-t border-gray-200"></div>
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-sans font-semibold text-sm">Advertising Opportunities</h5>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {station.advertisingOpportunities.map((ad: any, adIndex: number) => (
                            <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                                  {ad.adFormat && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ad.adFormat}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => cloneRadioOpportunity(index, adIndex)}
                                  title="Clone this ad"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeRadioOpportunity(index, adIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              </div>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-x-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Time Slot</p>
                                    <p className="text-xs text-gray-900">{ad.timeSlot?.replace(/_/g, ' ') || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Duration</p>
                                    <p className="text-xs text-gray-900">
                                      {ad.specifications?.duration ? `${ad.specifications.duration}s` : ad.duration ? `${ad.duration}s` : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-medium text-gray-500">Pricing</p>
                                    {ad.hubPricing && ad.hubPricing.length > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                      >
                                        +{ad.hubPricing.length} CUSTOM
                                      </Badge>
                                    )}
                                  </div>
                                  {renderPricingDisplay(ad.pricing)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                        )}
                        </div>
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

            {/* General Terms for Radio */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.radioStations?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all radio stations with the same general terms
                const radioStations = currentPublication.distributionChannels?.radioStations?.map(r => ({ ...r, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    radioStations
                  }
                });
              }}
              channelName="Radio"
            />
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
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{channel.name}</h4>
                        <Badge variant="secondary">{channel.platform?.charAt(0).toUpperCase() + channel.platform?.slice(1)}</Badge>
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
                    {/* Specifications Container */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Subscribers</span>
                          <span className="ml-2 font-medium">{channel.subscribers?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Views</span>
                          <span className="ml-2 font-medium">{channel.averageViews?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Content</span>
                          <span className="ml-2 font-medium">{channel.contentType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ads</span>
                          <span className="ml-2 font-medium">{channel.advertisingOpportunities?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Advertising Opportunities */}
                    <div className="-mx-4 -mb-4 mt-4">
                      <div className="border-t border-gray-200"></div>
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-sans font-semibold text-sm">Advertising Opportunities</h5>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {channel.advertisingOpportunities.map((ad: any, adIndex: number) => (
                            <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                                  {ad.adFormat && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ad.adFormat}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => cloneStreamingOpportunity(index, adIndex)}
                                  title="Clone this ad"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeStreamingOpportunity(index, adIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-x-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Duration</p>
                                    <p className="text-xs text-gray-900">{ad.duration ? `${ad.duration}s` : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Resolution</p>
                                    <p className="text-xs text-gray-900">{ad.specifications?.resolution || 'N/A'}</p>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-medium text-gray-500">Pricing</p>
                                    {ad.hubPricing && ad.hubPricing.length > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                      >
                                        +{ad.hubPricing.length} CUSTOM
                                      </Badge>
                                    )}
                                  </div>
                                  {renderPricingDisplay(ad.pricing)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                        )}
                        </div>
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

            {/* General Terms for Streaming */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.streamingVideo?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all streaming channels with the same general terms
                const streamingVideo = currentPublication.distributionChannels?.streamingVideo?.map(s => ({ ...s, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    streamingVideo
                  }
                });
              }}
              channelName="Streaming"
            />
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
                    <Card key={index} className="p-4 shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{publication.name}</h4>
                          <Badge variant="secondary">{publication.frequency?.charAt(0).toUpperCase() + publication.frequency?.slice(1)}</Badge>
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
                      {/* Specifications Container */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Circulation</span>
                            <span className="ml-2 font-medium">{publication.circulation?.toLocaleString()}</span>
                          </div>
                          <div>
                          <span className="text-muted-foreground">Frequency</span>
                          <span className="ml-2 font-medium">{publication.frequency?.charAt(0).toUpperCase() + publication.frequency?.slice(1)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ads</span>
                            <span className="ml-2 font-medium">{publication.advertisingOpportunities?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Advertising Opportunities */}
                      <div className="-mx-4 -mb-4 mt-4">
                        <div className="border-t border-gray-200"></div>
                        <div className="p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-sans font-semibold text-sm">Advertising Opportunities</h5>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {publication.advertisingOpportunities.map((ad: any, adIndex: number) => (
                              <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                                    {ad.adFormat && (
                                      <Badge variant="secondary" className="text-xs">
                                        {ad.adFormat}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => clonePrintOpportunity(index, adIndex)}
                                    title="Clone this ad"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => removePrintOpportunity(index, adIndex)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-x-4">
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-0.5">Dimensions</p>
                                      <p className="text-xs text-gray-900">{ad.dimensions || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-0.5">Color</p>
                                      <p className="text-xs text-gray-900">{ad.color || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-xs font-medium text-gray-500">Pricing</p>
                                      {ad.hubPricing && ad.hubPricing.length > 0 && (
                                        <Badge 
                                          variant="secondary" 
                                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                        >
                                          +{ad.hubPricing.length} CUSTOM
                                        </Badge>
                                      )}
                                    </div>
                                    {renderPricingDisplay(ad.pricing)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                          )}
                          </div>
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

            {/* General Terms for Print */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.print?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all print publications with the same general terms
                const print = currentPublication.distributionChannels?.print?.map(p => ({ ...p, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    print
                  }
                });
              }}
              channelName="Print"
            />
          </div>
        </TabsContent>

        {/* Events */}
        <TabsContent value="events" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Calendar className="w-5 h-5" />
              Event Sponsorships
            </h3>
            <Button
              onClick={addEvent}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>

          {currentPublication.distributionChannels?.events && currentPublication.distributionChannels.events.length > 0 ? (
            currentPublication.distributionChannels.events.map((event, eventIndex) => (
              <Card key={eventIndex} className="p-6 shadow-lg">
                <div className="space-y-4">
                  {/* Event Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-base mb-1">{event.name || `Event ${eventIndex + 1}`}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                        <div>
                          <span className="font-medium">Type:</span> {event.type || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {event.frequency || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Avg Attendance:</span> {event.averageAttendance?.toLocaleString() || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {event.location || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingType('event-container');
                          setEditingItemIndex(eventIndex);
                          setEditingItem({ ...event });
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeEvent(eventIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sponsorship Opportunities */}
                  <div className="-mx-6 -mb-6 mt-4">
                    <div className="border-t border-gray-200"></div>
                    <div className="p-6 bg-gray-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold">Sponsorship Levels</h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addEventOpportunity(eventIndex)}
                        className="gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        Add Sponsorship
                      </Button>
                    </div>
                    {event.advertisingOpportunities && event.advertisingOpportunities.length > 0 ? (
                      event.advertisingOpportunities.map((opportunity, oppIndex) => (
                        <div key={oppIndex} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium capitalize">{opportunity.level || 'Sponsorship'}</h6>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingType('event');
                                  setEditingParentIndex(eventIndex);
                                  setEditingItemIndex(oppIndex);
                                  setEditingItem({ ...opportunity });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeEventOpportunity(eventIndex, oppIndex)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Benefits */}
                          {opportunity.benefits && opportunity.benefits.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Benefits</p>
                              <ul className="text-xs text-gray-700 space-y-0.5">
                                {opportunity.benefits.map((benefit, idx) => (
                                  <li key={idx}>• {benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Pricing */}
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">Sponsorship Fee</p>
                            <div className="flex items-center gap-2">
                              {(() => {
                                // Handle different pricing formats
                                if (typeof opportunity.pricing === 'number') {
                                  // Legacy: direct number
                                  return <p className="text-sm font-semibold text-gray-900">${opportunity.pricing.toLocaleString()}</p>;
                                } else if (opportunity.pricing?.flatRate && opportunity.pricing?.pricingModel) {
                                  // New clean schema
                                  return (
                                    <>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {opportunity.pricing.pricingModel === 'contact' ? 'Contact' : `$${opportunity.pricing.flatRate.toLocaleString()}`}
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        {opportunity.pricing.pricingModel === 'contact' ? 'for pricing' : ''}
                                      </span>
                                    </>
                                  );
                                } else if (opportunity.pricing?.sponsorshipFee) {
                                  // Legacy: sponsorshipFee field
                                  return <p className="text-sm font-semibold text-gray-900">${opportunity.pricing.sponsorshipFee.toLocaleString()}</p>;
                                } else {
                                  return <p className="text-sm font-semibold text-gray-900">Contact for pricing</p>;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No sponsorship opportunities defined</p>
                    )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No events added yet</p>
              <p className="text-sm mt-1">Click "Add Event" to create an event sponsorship opportunity</p>
            </Card>
          )}
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
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{newsletter.name}</h4>
                    <Badge variant="secondary">{newsletter.frequency?.charAt(0).toUpperCase() + newsletter.frequency?.slice(1)}</Badge>
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
                {/* Specifications Container */}
                <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject</span>
                      <span className="ml-2 font-medium">{newsletter.subject}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subscribers</span>
                      <span className="ml-2 font-medium">{newsletter.subscribers?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Open Rate</span>
                      <span className="ml-2 font-medium">{newsletter.openRate ? `${newsletter.openRate}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency</span>
                      <span className="ml-2 font-medium">{newsletter.frequency?.charAt(0).toUpperCase() + newsletter.frequency?.slice(1)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ads</span>
                      <span className="ml-2 font-medium">{newsletter.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Advertising Opportunities */}
                <div className="-mx-4 -mb-4 mt-4">
                  <div className="border-t border-gray-200"></div>
                  <div className="p-4 bg-gray-50">
                    <h5 className="font-sans font-semibold text-sm mb-3">Advertising Opportunities</h5>
                    {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {newsletter.advertisingOpportunities.map((ad: any, adIndex: number) => (
                        <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                              {(() => {
                                // Show dimensions badge
                                const dims = ad.format?.dimensions;
                                if (dims) {
                                  const displayText = Array.isArray(dims) 
                                    ? (dims.length > 2 ? `${dims.length} sizes` : dims.join(', '))
                                    : dims;
                                  return (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {displayText}
                                    </Badge>
                                  );
                                }
                                // Fallback to legacy dimensions
                                if (ad.dimensions) {
                                  return (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {ad.dimensions}
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                              {ad.position && (
                                <Badge variant="secondary" className="text-xs">
                                  {ad.position}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => cloneNewsletterOpportunity(index, adIndex)}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeNewsletterOpportunity(index, adIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">
                                {(() => {
                                  const dims = ad.format?.dimensions;
                                  const isArray = Array.isArray(dims);
                                  const count = isArray ? dims.length : 0;
                                  return count > 1 ? 'Dimensions' : 'Dimensions';
                                })()}
                              </p>
                              <p className="text-xs text-gray-900">
                                {(() => {
                                  // Prefer new format.dimensions
                                  if (ad.format?.dimensions) {
                                    const dims = ad.format.dimensions;
                                    return Array.isArray(dims) ? dims.join(', ') : dims;
                                  }
                                  // Fallback to legacy dimensions
                                  return ad.dimensions || 'N/A';
                                })()}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-medium text-gray-500">Pricing</p>
                                {ad.hubPricing && ad.hubPricing.length > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                  >
                                    +{ad.hubPricing.length} CUSTOM
                                  </Badge>
                                )}
                              </div>
                              {renderPricingDisplay(ad.pricing)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                  </div>
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

            {/* General Terms for Newsletters */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.newsletters?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all newsletters with the same general terms
                const newsletters = currentPublication.distributionChannels?.newsletters?.map(n => ({ ...n, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    newsletters
                  }
                });
              }}
              channelName="Newsletters"
            />
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
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
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
                {/* Specifications Container */}
                <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Followers</span>
                      <span className="ml-2 font-medium">{profile.metrics?.followers?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verified</span>
                      <span className="ml-2 font-medium">{profile.verified ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ads</span>
                      <span className="ml-2 font-medium">{profile.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                {profile.specifications && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-fit">Specifications:</span>
                      <span className="text-sm">{profile.specifications}</span>
                    </div>
                  </div>
                )}

                {/* Advertising Opportunities */}
                <div className="-mx-4 -mb-4 mt-4">
                  <div className="border-t border-gray-200"></div>
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-sans font-semibold text-sm">Advertising Opportunities</h5>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profile.advertisingOpportunities.map((ad: any, adIndex: number) => (
                        <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                              {ad.adFormat && (
                                <Badge variant="secondary" className="text-xs">
                                  {ad.adFormat}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
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
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => cloneSocialMediaOpportunity(index, adIndex)}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeSocialMediaOpportunity(index, adIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-x-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">Post Type</p>
                                <p className="text-xs text-gray-900">{ad.postType || ad.adFormat || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">Duration</p>
                                <p className="text-xs text-gray-900">{ad.duration || 'N/A'}</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-medium text-gray-500">Pricing</p>
                                {ad.hubPricing && ad.hubPricing.length > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                  >
                                    +{ad.hubPricing.length} CUSTOM
                                  </Badge>
                                )}
                              </div>
                              {renderPricingDisplay(ad.pricing)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                  </div>
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

            {/* General Terms for Social Media */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.socialMedia?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all social media profiles with the same general terms
                const socialMedia = currentPublication.distributionChannels?.socialMedia?.map(s => ({ ...s, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    socialMedia
                  }
                });
              }}
              channelName="Social Media"
            />
          </div>
        </TabsContent>

        {/* Television Advertising */}
        <TabsContent value="television" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
              <Tv className="w-5 h-5" />
              Television Advertising
            </h3>
            <Button onClick={() => addTelevisionStation()} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add TV Station
            </Button>
          </div>

          <div className="space-y-4">
            {currentPublication.distributionChannels?.television?.map((station, index) => (
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-base">{station.callSign || `TV Station ${index + 1}`}</h4>
                    {/* Specifications Container */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {station.channel && (
                          <div>
                            <span className="text-muted-foreground">Channel</span>
                            <span className="ml-2 font-medium">{station.channel}</span>
                          </div>
                        )}
                        {station.network && (
                          <div>
                            <span className="text-muted-foreground">Network</span>
                            <span className="ml-2 font-medium">{station.network}</span>
                          </div>
                        )}
                        {station.viewers && (
                          <div>
                            <span className="text-muted-foreground">Viewers</span>
                            <span className="ml-2 font-medium">{station.viewers.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(station, 'television-container', index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeTelevisionStation(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="-mx-4 -mb-4 mt-4">
                  <div className="border-t border-gray-200"></div>
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-sans text-sm font-semibold">Ad Products</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addTelevisionOpportunity(index)}
                      >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Ad Product
                    </Button>
                  </div>
                  
                  {station.advertisingOpportunities && station.advertisingOpportunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {station.advertisingOpportunities.map((ad: any, adIndex: number) => (
                        <div key={adIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                              {ad.adFormat && (
                                <Badge variant="secondary" className="text-xs">
                                  {ad.adFormat}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditDialog(ad, 'television-ad', index, adIndex)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => cloneTelevisionOpportunity(index, adIndex)}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeTelevisionOpportunity(index, adIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-x-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">Daypart</p>
                                <p className="text-xs text-gray-900">{ad.daypart || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-0.5">Duration</p>
                                <p className="text-xs text-gray-900">{ad.specifications?.duration ? `${ad.specifications.duration}s` : 'N/A'}</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-medium text-gray-500">Pricing</p>
                                {ad.hubPricing && ad.hubPricing.length > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                  >
                                    +{ad.hubPricing.length} CUSTOM
                                  </Badge>
                                )}
                              </div>
                              {renderPricingDisplay(ad.pricing)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No ad products yet</p>
                  )}
                  </div>
                </div>

              </Card>
            ))}
            
            {(!currentPublication.distributionChannels?.television || 
              currentPublication.distributionChannels.television.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No TV Stations</h3>
                <p className="mb-4">Add your first television station.</p>
              </div>
            )}

            {/* General Terms for Television */}
            <GeneralTermsEditor
              terms={currentPublication.distributionChannels?.television?.[0]?.generalTerms}
              onSave={(terms) => {
                // Update all TV stations with the same general terms
                const television = currentPublication.distributionChannels?.television?.map(t => ({ ...t, generalTerms: terms })) || [];
                handleUpdatePublication({
                  distributionChannels: {
                    ...currentPublication.distributionChannels,
                    television
                  }
                });
              }}
              channelName="Television"
            />
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
                   editingType === 'event' ? 'Event Sponsorship' :
                   editingType === 'event-container' ? 'Event Properties' :
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
                  
                  {/* Website Ad Format Selector */}
                  <WebsiteAdFormatSelector
                    value={editingItem.format || null}
                    onChange={(format) => setEditingItem({ ...editingItem, format })}
                    allowMultiple={true}
                    legacyDimensions={editingItem.sizes ? editingItem.sizes.join(', ') : undefined}
                  />

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'flat_rate', label: 'Flat Rate' },
                      { value: 'flat', label: '/month' },
                      { value: 'per_week', label: '/week' },
                      { value: 'per_day', label: '/day' },
                      { value: 'cpm', label: '/1000 impressions' },
                      { value: 'cpc', label: '/click' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    allowMultipleDefaultPricing={true}
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
                      <Select
                        value={editingItem.position || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position..." />
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
                    value={editingItem.format || null}
                    onChange={(format) => setEditingItem({ ...editingItem, format })}
                    allowMultiple={true}
                    legacyDimensions={editingItem.dimensions}
                  />

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
                        placeholder: 'e.g., 1x, 2x, 3x, etc',
                        pattern: '^\\d+x$',
                        patternMessage: 'Enter a frequency like "1x", "2x", "12x", etc.'
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
                      { key: 'flatRate', label: 'Price', placeholder: '500' }
                    ]}
                    pricingModels={[
                      { value: 'per_ad', label: '/ad' },
                      { value: 'per_line', label: '/line' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    conditionalFields={[
                      {
                        key: 'frequency',
                        label: 'Frequency',
                        type: 'text',
                        showWhen: ['per_ad', 'per_line'],
                        placeholder: 'e.g., 1x, 2x, 3x, etc',
                        pattern: '^\\d+x$',
                        patternMessage: 'Enter a frequency like "1x", "2x", "12x", etc.'
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
                    <Label htmlFor="duration">Duration</Label>
                    <Select 
                      value={
                        editingItem.duration && [15, 30, 60, 90, 120].includes(editingItem.duration)
                          ? String(editingItem.duration)
                          : 'custom'
                      }
                      onValueChange={(value) => {
                        if (value === 'custom') return;
                        const duration = parseInt(value);
                        setEditingItem({ ...editingItem, duration });
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
                  </div>
                  
                  {/* Custom duration input - shown for non-standard durations */}
                  {(!editingItem.duration || ![15, 30, 60, 90, 120].includes(editingItem.duration)) && (
                    <div>
                      <Label htmlFor="customDuration">Custom Duration (seconds)</Label>
                      <Input
                        id="customDuration"
                        type="number"
                        value={editingItem.duration || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || undefined })}
                        placeholder="Enter seconds"
                      />
                    </div>
                  )}

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'cpd', label: '/1000 downloads' },
                      { value: 'cpm', label: '/1000 impressions' },
                      { value: 'per_episode', label: '/episode' },
                      { value: 'flat', label: '/month' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    conditionalFields={[
                      {
                        key: 'frequency',
                        label: 'Frequency',
                        type: 'text',
                        showWhen: ['cpd', 'cpm', 'per_episode'],
                        placeholder: 'e.g., 1x, 2x, 3x, etc',
                        pattern: '^\\d+x$',
                        patternMessage: 'Enter a frequency like "1x", "2x", "12x", etc.'
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
                    <Select 
                      value={
                        editingItem.specifications?.duration && [15, 30, 60, 90, 120].includes(editingItem.specifications.duration)
                          ? String(editingItem.specifications.duration)
                          : 'custom'
                      }
                      onValueChange={(value) => {
                        if (value === 'custom') return;
                        const duration = parseInt(value);
                        setEditingItem({ 
                          ...editingItem, 
                          specifications: {
                            ...editingItem.specifications,
                            duration
                          }
                        });
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
                  </div>
                  
                  {/* Custom duration input - shown for non-standard durations */}
                  {(!editingItem.specifications?.duration || ![15, 30, 60, 90, 120].includes(editingItem.specifications.duration)) && (
                    <div>
                      <Label htmlFor="customDuration">Custom Duration (seconds)</Label>
                      <Input
                        id="customDuration"
                        type="number"
                        value={editingItem.specifications?.duration || ''}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          specifications: {
                            ...editingItem.specifications,
                            duration: parseInt(e.target.value) || undefined
                          }
                        })}
                        placeholder="Enter seconds (e.g., 20, 1320)"
                      />
                    </div>
                  )}

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
                        placeholder: 'e.g., 1x, 2x, 3x, etc',
                        pattern: '^\\d+x$',
                        patternMessage: 'Enter a frequency like "1x", "2x", "12x", etc.'
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
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'cpv', label: '/1000 views' },
                      { value: 'per_video', label: '/video' },
                      { value: 'flat', label: '/month' },
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
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, subscribers: val });
                        }}
                        onBlur={(e) => validateAndSetField('subscribers', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="10000"
                        className={getValidationClass(!!fieldErrors['subscribers'])}
                      />
                      <FieldError error={fieldErrors['subscribers']} />
                    </div>
                    <div>
                      <Label htmlFor="openRate">Open Rate (%)</Label>
                      <Input
                        id="openRate"
                        type="number"
                        value={editingItem.openRate || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItem({ ...editingItem, openRate: val });
                        }}
                        onBlur={(e) => validateAndSetField('openRate', parseFloat(e.target.value) || 0, 'percentage')}
                        placeholder="25"
                        className={getValidationClass(!!fieldErrors['openRate'])}
                      />
                      <FieldError error={fieldErrors['openRate']} />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select
                        value={editingItem.frequency || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
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
                  </div>
                </>
              )}

              {/* Event Sponsorship Fields */}
              {editingType === 'event' && (
                <>
                  <div>
                    <Label htmlFor="level">Sponsorship Level</Label>
                    <Input
                      id="level"
                      value={editingItem.level || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, level: e.target.value })}
                      placeholder="e.g., Title, Presenting, Supporting"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="benefits">Benefits (comma-separated)</Label>
                    <Textarea
                      id="benefits"
                      value={
                        typeof editingItem.benefits === 'string'
                          ? editingItem.benefits
                          : editingItem.benefits?.join(', ') || ''
                      }
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        benefits: e.target.value  // Store as string during editing
                      })}
                      placeholder="Logo placement, Speaking opportunity, VIP access"
                      rows={3}
                    />
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    pricingFields={[
                      { key: 'flatRate', label: 'Sponsorship Fee', placeholder: '2500' }
                    ]}
                    pricingModels={[
                      { value: 'flat', label: 'Flat rate' },
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
                        placeholder="Annual Gala"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Input
                        id="eventType"
                        value={editingItem.type || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                        placeholder="Community Event, Gala, Conference"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input
                        id="frequency"
                        value={editingItem.frequency || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, frequency: e.target.value })}
                        placeholder="Annual, Monthly"
                      />
                    </div>
                    <div>
                      <Label htmlFor="averageAttendance">Avg Attendance</Label>
                      <Input
                        id="averageAttendance"
                        type="number"
                        value={editingItem.averageAttendance || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, averageAttendance: val });
                        }}
                        onBlur={(e) => validateAndSetField('averageAttendance', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="500"
                        className={getValidationClass(!!fieldErrors['averageAttendance'])}
                      />
                      <FieldError error={fieldErrors['averageAttendance']} />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editingItem.location || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                        placeholder="Downtown Chicago"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Textarea
                      id="targetAudience"
                      value={editingItem.targetAudience || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, targetAudience: e.target.value })}
                      placeholder="Community leaders, business owners, residents"
                      rows={2}
                    />
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
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          console.log('📊 Circulation changed:', {
                            oldValue: editingItem.circulation,
                            newValue: newValue,
                            inputValue: e.target.value,
                            currentEditingItem: editingItem
                          });
                          setEditingItem({ ...editingItem, circulation: newValue });
                        }}
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, paidCirculation: val });
                        }}
                        onBlur={(e) => validateAndSetField('paidCirculation', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="30000"
                        className={getValidationClass(!!fieldErrors['paidCirculation'])}
                      />
                      <FieldError error={fieldErrors['paidCirculation']} />
                    </div>
                    <div>
                      <Label htmlFor="freeCirculation">Free Circulation</Label>
                      <Input
                        id="freeCirculation"
                        type="number"
                        value={editingItem.freeCirculation || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, freeCirculation: val });
                        }}
                        onBlur={(e) => validateAndSetField('freeCirculation', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="20000"
                        className={getValidationClass(!!fieldErrors['freeCirculation'])}
                      />
                      <FieldError error={fieldErrors['freeCirculation']} />
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
                      <Select
                        value={editingItem.frequency || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency..." />
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, averageDownloads: val });
                        }}
                        onBlur={(e) => validateAndSetField('averageDownloads', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="50000"
                        className={getValidationClass(!!fieldErrors['averageDownloads'])}
                      />
                      <FieldError error={fieldErrors['averageDownloads']} />
                    </div>
                    <div>
                      <Label htmlFor="averageListeners">Average Listeners</Label>
                      <Input
                        id="averageListeners"
                        type="number"
                        value={editingItem.averageListeners || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, averageListeners: val });
                        }}
                        onBlur={(e) => validateAndSetField('averageListeners', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="25000"
                        className={getValidationClass(!!fieldErrors['averageListeners'])}
                      />
                      <FieldError error={fieldErrors['averageListeners']} />
                    </div>
                    <div>
                      <Label htmlFor="episodeCount">Episode Count</Label>
                      <Input
                        id="episodeCount"
                        type="number"
                        value={editingItem.episodeCount || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ ...editingItem, episodeCount: val });
                        }}
                        onBlur={(e) => validateAndSetField('episodeCount', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="100"
                        className={getValidationClass(!!fieldErrors['episodeCount'])}
                      />
                      <FieldError error={fieldErrors['episodeCount']} />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="platforms">Platforms</Label>
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
                            checked={editingItem.platforms?.includes(platform.value) || false}
                            onChange={(e) => {
                              const currentPlatforms = editingItem.platforms || [];
                              const newPlatforms = e.target.checked
                                ? [...currentPlatforms, platform.value]
                                : currentPlatforms.filter((p: string) => p !== platform.value);
                              setEditingItem({ ...editingItem, platforms: newPlatforms });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{platform.label}</span>
                        </label>
                      ))}
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              followers: val 
                            } 
                          });
                        }}
                        onBlur={(e) => validateAndSetField('followers', parseInt(e.target.value) || 0, 'integer')}
                        placeholder="10000"
                        className={getValidationClass(!!fieldErrors['followers'])}
                      />
                      <FieldError error={fieldErrors['followers']} />
                    </div>
                    <div>
                      <Label htmlFor="engagementRate">Engagement Rate (%)</Label>
                      <Input
                        id="engagementRate"
                        type="number"
                        step="0.1"
                        value={editingItem.metrics?.engagementRate || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItem({ 
                            ...editingItem, 
                            metrics: { 
                              ...editingItem.metrics, 
                              engagementRate: val 
                            } 
                          });
                        }}
                        onBlur={(e) => validateAndSetField('engagementRate', parseFloat(e.target.value) || 0, 'percentage')}
                        placeholder="2.5"
                        className={getValidationClass(!!fieldErrors['engagementRate'])}
                      />
                      <FieldError error={fieldErrors['engagementRate']} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="specifications">Specifications</Label>
                    <Input
                      id="specifications"
                      value={editingItem.specifications || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, specifications: e.target.value })}
                      placeholder="e.g., Image, Carousel, or Video, 1080x1080 (1:1 ratio), JPG, PNG, MP4"
                    />
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
              {!['website', 'newsletter', 'print-ad', 'podcast-ad', 'radio-ad', 'streaming-ad', 'social-media-ad', 'newsletter-container', 'print-container', 'podcast-container', 'radio-container', 'streaming-container', 'social-media-container', 'website-container'].includes(editingType) && (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItemName}</strong>?
              <br />
              <br />
              This {deleteItemType} will be permanently removed and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
