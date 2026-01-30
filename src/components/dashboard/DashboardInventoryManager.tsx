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
import { RadioShowEditor } from '@/components/admin/RadioShowEditor';
import { EventFrequencySelectorInline } from '@/components/dashboard/EventFrequencySelector';
import { EventFrequency } from '@/types/publication';
import { 
  validatePositiveInteger,
  validatePositiveNumber,
  validatePercentage,
  getValidationClass
} from '@/utils/fieldValidation';
import { calculateRevenue } from '@/utils/pricingCalculations';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';
import { useWebAnalytics } from '@/hooks/useWebAnalytics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

// Standard print format defaults - maps adFormat to default dimensions
const PRINT_FORMAT_DEFAULTS: Record<string, string> = {
  'tall full page': '10" x 15.5"',
  'tall portrait full page': '10.5" x 13.5"',
  'upper portrait full page': '10" x 12.75"',
  'square full page': '10" x 10"',
  'narrow full page': '8.5" x 10.85"',
  'half page horizontal': '10" x 5"',
  'half page vertical': '5" x 10"',
  'quarter page': '5" x 5"',
  'eighth page': '5" x 3.25"',
  'business card': '3.5" x 2"',
  'classified': '2" x 2"',
  'insert': 'Variable',
};

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
  
  // Get the website URL for analytics
  const websiteUrl = currentPublication?.distributionChannels?.website?.url || 
                     currentPublication?.basicInfo?.websiteUrl || null;
  
  // Fetch real-time web analytics
  const {
    analytics: webAnalytics,
    loading: analyticsLoading,
    hasData: hasAnalyticsData,
    visitors: trackedVisitors,
    pageViews: trackedPageViews,
    mobilePercentage: trackedMobilePercentage,
    trackingScript,
    copyTrackingScript,
    formatNumber,
    getDateRangeString,
    daysWithData,
  } = useWebAnalytics(websiteUrl);
  
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
  const [customDurationMode, setCustomDurationMode] = useState<boolean>(false); // Track if duration is in custom mode

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);
  const [deleteItemName, setDeleteItemName] = useState<string>('');
  const [deleteItemType, setDeleteItemType] = useState<string>('');
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Helper function to format pricing model labels
  const formatPricingModel = (model: string, channel?: string) => {
    if (!model) return 'N/A';
    
    switch(model) {
      // Website models
      case 'flat_rate': return 'Flat Rate';
      case 'flat': 
        // Context-dependent: website ads use flat for monthly, events use it for per-occurrence
        if (channel === 'event' || channel === 'events') {
          return '/occurrence';
        }
        return '/month';  // Default for website ads and other channels
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
      case 'cpd': return '/1000 downloads';
      case 'per_episode': return '/episode';
      
      // Radio models
      case 'per_spot': return '/spot';
      
      // Social media models
      case 'per_post': return '/post';
      case 'per_story': return '/story';
      case 'monthly': return '/month';  // Monthly recurring pricing
      
      // Streaming models
      case 'cpv': return '/1000 views';
      case 'per_video': return '/video';
      
      // General
      case 'contact': return 'Contact for pricing';
      
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
  const renderPricingDisplay = (pricing: any, channel?: string) => {
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
                  {formatPricingModel(pricingModel, channel)}
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
              {formatPricingModel(pricingObj.pricingModel, channel)}
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
                  <span className="text-gray-600">{formatPricingModel(pricingModel, channel)}</span>
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
            <span className="text-gray-600">{formatPricingModel(pricingModel, channel)}</span>
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
      // Only send distributionChannels - partial update is safer and more efficient
      // The backend uses MongoDB $set which only updates the fields we send
      // This prevents race conditions if two users edit different sections simultaneously
      const partialUpdateData = {
        distributionChannels: {
          ...currentPublication.distributionChannels,
          ...updatedData.distributionChannels
        }
      };

      const updated = await updatePublication(currentPublication._id, partialUpdateData);
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
    
    // Set custom duration mode if duration is not a standard value
    if (type === 'podcast-ad' || type === 'radio-ad') {
      const duration = itemCopy.format?.duration || itemCopy.duration;
      setCustomDurationMode(!duration || ![15, 30, 60, 90, 120].includes(duration));
    }
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditingType(null);
    setIsAdding(false);
    setEditingIndex(-1);
    setEditingSubIndex(-1);
    setEditingParentIndex(-1);
    setEditingItemIndex(-1);
    setCustomDurationMode(false); // Reset custom duration mode
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
            // Derive standard fields from position and duration for asset matching
            const enrichedPodcastAd = { ...editingItem };
            const position = (editingItem.position || '').toLowerCase();
            const duration = editingItem.duration;
            
            // Determine adFormat from position/duration
            if (!enrichedPodcastAd.adFormat) {
              if (position.includes('pre-roll') || position.includes('preroll') || position.includes('pre roll')) {
                enrichedPodcastAd.adFormat = 'pre_roll';
              } else if (position.includes('post-roll') || position.includes('postroll') || position.includes('post roll')) {
                enrichedPodcastAd.adFormat = 'post_roll';
              } else if (position.includes('host read') || position.includes('host-read')) {
                enrichedPodcastAd.adFormat = 'host_read';
              } else if (position.includes('sponsor') || position.includes('takeover')) {
                enrichedPodcastAd.adFormat = 'sponsorship';
              } else if (duration === 30) {
                enrichedPodcastAd.adFormat = 'mid_roll_30';
              } else if (duration === 60) {
                enrichedPodcastAd.adFormat = 'mid_roll_60';
              } else {
                enrichedPodcastAd.adFormat = 'mid_roll_30'; // Default
              }
            }
            
            // Set format.dimensions for creative asset matching
            if (!enrichedPodcastAd.format?.dimensions) {
              let dimensions: string;
              if (position.includes('pre-roll') || position.includes('preroll')) {
                dimensions = 'pre-roll';
              } else if (position.includes('post-roll') || position.includes('postroll')) {
                dimensions = 'post-roll';
              } else if (position.includes('host read') || position.includes('host-read')) {
                dimensions = 'host-read';
              } else if (position.includes('sponsor') || position.includes('takeover')) {
                dimensions = 'sponsorship';
              } else if (duration) {
                dimensions = `${duration}s`;
              } else {
                dimensions = '30s'; // Default
              }
              enrichedPodcastAd.format = { ...enrichedPodcastAd.format, dimensions };
            }
            
            // Set format with duration and fileFormats
            if (!enrichedPodcastAd.format?.fileFormats) {
              const isTextBased = enrichedPodcastAd.adFormat === 'host_read';
              enrichedPodcastAd.format = {
                ...enrichedPodcastAd.format,
                duration: duration,
                fileFormats: isTextBased ? ['TXT'] : ['MP3', 'WAV']
              };
            } else if (duration && !enrichedPodcastAd.format?.duration) {
              enrichedPodcastAd.format = { ...enrichedPodcastAd.format, duration: duration };
            }
            
            if (isAdding) {
              // Adding new podcast ad
              if (!updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities.push(enrichedPodcastAd);
            } else {
              // Editing existing podcast ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.podcasts[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.podcasts[editingIndex].advertisingOpportunities[editingSubIndex] = enrichedPodcastAd;
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

        case 'television-ad':
          if (updatedPublication.distributionChannels?.television) {
            if (isAdding) {
              // Adding new television ad
              if (!updatedPublication.distributionChannels.television[editingIndex].advertisingOpportunities) {
                updatedPublication.distributionChannels.television[editingIndex].advertisingOpportunities = [];
              }
              updatedPublication.distributionChannels.television[editingIndex].advertisingOpportunities.push(editingItem);
            } else {
              // Editing existing television ad
              if (editingSubIndex >= 0 && updatedPublication.distributionChannels.television[editingIndex]?.advertisingOpportunities) {
                updatedPublication.distributionChannels.television[editingIndex].advertisingOpportunities[editingSubIndex] = editingItem;
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

        case 'television-container':
          if (updatedPublication.distributionChannels?.television && editingIndex >= 0) {
            updatedPublication.distributionChannels.television[editingIndex] = editingItem;
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
          case 'television-ad':
            savedItem = result.distributionChannels?.television?.[editingIndex]?.advertisingOpportunities?.[editingSubIndex];
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
          case 'television-container':
            savedItem = result.distributionChannels?.television?.[editingIndex];
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
      format: {
        dimensions: '300x250',
        fileFormats: ['JPG', 'PNG', 'GIF']
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
    // Note: dimensions are set via format.dimensions (canonical), not legacy dimensions field
    const newOpportunity = {
      name: '',
      position: 'inline' as const,
      format: null,  // Will be set by AdFormatSelector → format.dimensions
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
      adFormat: 'tall full page' as const,
      color: 'color' as const,
      location: '',
      pricing: {
        flatRate: 0,
        pricingModel: 'flat' as const
      },
      format: {
        dimensions: PRINT_FORMAT_DEFAULTS['tall full page'], // Auto-populate from default
        fileFormats: ['PDF'],
        resolution: '300dpi',
        colorSpace: 'CMYK'
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
      frequency: 'annual' as EventFrequency,
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
          platform: ['youtube'],
          subscribers: 0,
          averageViews: 0,
          contentType: 'mixed',
          frequency: 'weekly',
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
        <div className="flex items-center gap-2">
          <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
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
            {/* Website URL and CMS */}
            <div className="mt-3 p-3 bg-gray-50 rounded-md border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Website URL</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.url || currentPublication.basicInfo?.websiteUrl || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CMS Platform</span>
                  <p className="font-medium mt-1">{currentPublication.distributionChannels?.website?.cmsplatform || 'Not specified'}</p>
                </div>
              </div>
            </div>
            
            {/* Real-Time Analytics Section */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Real-Time Analytics
                {analyticsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </h4>
              
              {/* Show tracked data when available */}
              {!analyticsLoading && hasAnalyticsData && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-semibold text-emerald-800 text-sm">
                      Tracked Data
                      {daysWithData && (
                        <span className="font-normal text-emerald-600 ml-1">({getDateRangeString()})</span>
                      )}
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-emerald-700">Monthly Visitors</span>
                      <p className="font-semibold text-emerald-900 text-lg">{formatNumber(trackedVisitors)}</p>
                    </div>
                    <div>
                      <span className="text-emerald-700">Monthly Page Views</span>
                      <p className="font-semibold text-emerald-900 text-lg">{formatNumber(trackedPageViews)}</p>
                    </div>
                    <div>
                      <span className="text-emerald-700">Mobile Traffic</span>
                      <p className="font-semibold text-emerald-900 text-lg">{trackedMobilePercentage !== undefined ? `${trackedMobilePercentage}%` : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-emerald-700">Days Tracked</span>
                      <p className="font-semibold text-emerald-900 text-lg">{daysWithData || 0}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading state */}
              {analyticsLoading && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                    <span className="ml-2 text-sm text-slate-600">Loading analytics...</span>
                  </div>
                </div>
              )}
              
              {/* Tracking Script Alert - Show when no analytics data available */}
              {!analyticsLoading && !hasAnalyticsData && websiteUrl && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">No Tracking Data Available</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <p className="mb-3">
                      Add this script to your website's <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> section to enable real-time analytics tracking:
                    </p>
                    <div className="relative bg-slate-800 rounded-md p-3 pr-20">
                      <code className="text-green-400 text-xs font-mono break-all whitespace-pre-wrap block">
                        {trackingScript}
                      </code>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={copyTrackingScript}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    
                    {/* Self-Reported Data Summary */}
                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <p className="text-sm text-amber-800">
                        <span className="font-medium">Self-Reported:</span>{' '}
                        {currentPublication.distributionChannels?.website?.metrics?.monthlyVisitors?.toLocaleString() || '—'} visitors | {' '}
                        {currentPublication.distributionChannels?.website?.metrics?.monthlyPageViews?.toLocaleString() || '—'} pageviews | {' '}
                        {currentPublication.distributionChannels?.website?.metrics?.mobilePercentage ? `${currentPublication.distributionChannels.website.metrics.mobilePercentage}%` : '—'} mobile
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Separator />

          {/* Website Advertising Opportunities */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h3 className="flex items-center gap-2 font-sans font-semibold" style={{ fontSize: '1.0rem' }}>
                  <Target className="w-5 h-5" />
                  Advertising Opportunities
                </h3>
                {(() => {
                  const totalRevenue = (currentPublication.distributionChannels?.website?.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                    return sum + calculateRevenue(ad, 'month');
                  }, 0);
                  return totalRevenue > 0 ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ${Math.round(totalRevenue).toLocaleString()}/mo
                    </Badge>
                  ) : null;
                })()}
              </div>
              <Button onClick={addWebsiteOpportunity}>
                <Plus className="w-4 h-4 mr-2" />
                Add Ad Slot
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPublication.distributionChannels?.website?.advertisingOpportunities?.map((opportunity: any, index: number) => {
                // Calculate revenue and metrics for this website ad
                const adRevenue = calculateRevenue(opportunity, 'month');
                const impressions = opportunity.performanceMetrics?.impressionsPerMonth || 0;
                
                return (
                <div key={index} className="relative">
                  <div 
                    className="group border border-gray-200 rounded-lg shadow-sm p-4 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                    onClick={() => openEditDialog(opportunity, 'website', index)}
                  >
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
                        {/* Only show adFormat badge if no format.dimensions exists (legacy fallback) */}
                        {opportunity.adFormat && !opportunity.format?.dimensions && (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(opportunity, 'website', index);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            cloneWebsiteOpportunity(index);
                          }}
                          title="Clone this ad"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWebsiteOpportunity(index);
                          }}
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

                      {/* Revenue & Metrics */}
                      {(adRevenue > 0 || impressions > 0 || opportunity.pricing) && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                            <p className="text-sm font-bold text-green-800">
                              {adRevenue > 0 ? `$${Math.round(adRevenue).toLocaleString()}` : 'Not calculated'}
                            </p>
                          </div>
                          {impressions > 0 && (
                            <div className="flex items-center justify-between text-xs text-green-700">
                              <span>Impressions/Month</span>
                              <span className="font-medium">{Math.round(impressions).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

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
                        {renderPricingDisplay(opportunity.pricing, 'website')}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              
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
            {currentPublication.distributionChannels?.podcasts?.map((podcast, index) => {
              // Calculate total monthly revenue for this podcast
              const totalRevenue = (podcast.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month', podcast.frequency);
              }, 0);
              
              return (
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{podcast.name}</h4>
                        <Badge variant="secondary">{podcast.frequency?.charAt(0).toUpperCase() + podcast.frequency?.slice(1)}</Badge>
                        {totalRevenue > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ${Math.round(totalRevenue).toLocaleString()}/mo
                          </Badge>
                        )}
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
                          {podcast.advertisingOpportunities.map((ad: any, adIndex: number) => {
                            // Calculate revenue and metrics for this podcast ad
                            const adRevenue = calculateRevenue(ad, 'month', podcast.frequency);
                            const occurrences = ad.performanceMetrics?.occurrencesPerMonth || 0;
                            const impressions = ad.performanceMetrics?.impressionsPerMonth || 0;
                            
                            return (
                            <div 
                              key={adIndex} 
                              className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                              onClick={() => openEditDialog(ad, 'podcast-ad', index, adIndex)}
                            >
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(ad, 'podcast-ad', index, adIndex);
                                    }}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clonePodcastOpportunity(index, adIndex);
                                    }}
                                    title="Clone this ad"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePodcastOpportunity(index, adIndex);
                                    }}
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
                                {/* Revenue & Metrics */}
                                {(adRevenue > 0 || occurrences > 0 || impressions > 0) && (
                                  <div className="bg-green-50 border border-green-200 rounded p-2">
                                    {adRevenue > 0 && (
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                        <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                      </div>
                                    )}
                                    {occurrences > 0 && (
                                      <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Episodes/Month</span>
                                        <span className="font-medium">{Math.round(occurrences).toLocaleString()}</span>
                                      </div>
                                    )}
                                    {impressions > 0 && (
                                      <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Downloads/Month</span>
                                        <span className="font-medium">{Math.round(impressions).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                                  {renderPricingDisplay(ad.pricing, 'podcast')}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                      )}
                      </div>
                    </div>

                  </Card>
                  );
                })}
                
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
            {currentPublication.distributionChannels?.radioStations?.map((station, index) => {
              // Calculate total monthly revenue for this radio station (all shows)
              const totalRevenue = (station.shows || []).reduce((stationSum: number, show: any) => {
                const showRevenue = (show.advertisingOpportunities || []).reduce((showSum: number, ad: any) => {
                  return showSum + calculateRevenue(ad, 'month', show.frequency);
                }, 0);
                return stationSum + showRevenue;
              }, 0);
              
              return (
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{station.callSign}</h4>
                        <Badge variant="secondary">{station.frequency?.charAt(0).toUpperCase() + station.frequency?.slice(1)}</Badge>
                        {totalRevenue > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ${Math.round(totalRevenue).toLocaleString()}/mo
                          </Badge>
                        )}
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                          <span className="text-muted-foreground">Shows</span>
                          <span className="ml-2 font-medium">{station.shows?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Ads</span>
                          <span className="ml-2 font-medium">{station.shows?.reduce((sum: number, show: any) => sum + (show.advertisingOpportunities?.length || 0), 0) || 0}</span>
                        </div>
                      </div>
                    </div>

                                    {/* Radio Shows */}
                    <div className="-mx-4 -mb-4 mt-4">
                      <div className="border-t border-gray-200"></div>
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-sans font-semibold text-sm">Radio Shows</h5>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Add a new show
                              const newShow = {
                                showId: `show-${Date.now()}`,
                                name: 'New Show',
                                frequency: 'weekdays',
                                daysPerWeek: 5,
                                timeSlot: '',
                                averageListeners: station.listeners || 0,
                                advertisingOpportunities: []
                              };
                              const updatedStations = [...(currentPublication.distributionChannels?.radioStations || [])];
                              updatedStations[index] = {
                                ...station,
                                shows: [...(station.shows || []), newShow]
                              };
                              handleUpdatePublication({
                                distributionChannels: {
                                  ...currentPublication.distributionChannels,
                                  radioStations: updatedStations
                                }
                              });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Show
                          </Button>
                        </div>
                        
                        {station.shows && station.shows.length > 0 ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {station.shows.map((show: any, showIndex: number) => {
                                // Calculate show revenue
                                const showRevenue = (show.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                                  return sum + calculateRevenue(ad, 'month', show.frequency);
                                }, 0);
                                
                                // Count custom pricing across all ads in this show
                                const customPricingCount = (show.advertisingOpportunities || []).reduce((count: number, ad: any) => {
                                  return count + (ad.hubPricing?.length || 0);
                                }, 0);
                                
                                // Calculate total impressions and occurrences for this show
                                const totalImpressions = (show.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                                  return sum + (ad.performanceMetrics?.impressionsPerMonth || 0);
                                }, 0);
                                
                                const totalOccurrences = (show.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                                  return sum + (ad.performanceMetrics?.occurrencesPerMonth || 0);
                                }, 0);
                                
                                return (
                                  <div key={showIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="text-sm font-semibold text-gray-900">{show.name}</h5>
                                        <Badge variant="secondary" className="text-xs">
                                          {show.frequency}
                                        </Badge>
                                        {showRevenue > 0 && (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            ${Math.round(showRevenue).toLocaleString()}/mo
                                          </Badge>
                                        )}
                                        {customPricingCount > 0 && (
                                          <Badge 
                                            variant="secondary" 
                                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                          >
                                            +{customPricingCount} CUSTOM
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            // Store which show to edit and trigger RadioShowEditor
                                            (window as any)[`openRadioShow_${station.callSign}_${showIndex}`]?.();
                                          }}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          onClick={() => {
                                            // Clone this show
                                            const clonedShow = {
                                              ...JSON.parse(JSON.stringify(show)),
                                              showId: `show-${Date.now()}`,
                                              name: `${show.name} (Copy)`
                                            };
                                            const updatedStations = [...(currentPublication.distributionChannels?.radioStations || [])];
                                            updatedStations[index] = {
                                              ...station,
                                              shows: [...(station.shows || []), clonedShow]
                                            };
                                            handleUpdatePublication({
                                              distributionChannels: {
                                                ...currentPublication.distributionChannels,
                                                radioStations: updatedStations
                                              }
                                            });
                                          }}
                                          title="Clone this show"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            const updatedStations = [...(currentPublication.distributionChannels?.radioStations || [])];
                                            updatedStations[index] = {
                                              ...station,
                                              shows: station.shows.filter((_: any, i: number) => i !== showIndex)
                                            };
                                            handleUpdatePublication({
                                              distributionChannels: {
                                                ...currentPublication.distributionChannels,
                                                radioStations: updatedStations
                                              }
                                            });
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-x-4">
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 mb-0.5">Time Slot</p>
                                          <p className="text-xs text-gray-900">{show.timeSlot || 'Not specified'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 mb-0.5">Days/Week</p>
                                          <p className="text-xs text-gray-900">{show.daysPerWeek}</p>
                                        </div>
                                      </div>
                                      
                                      {/* Revenue & Metrics Summary */}
                                      {(showRevenue > 0 || totalImpressions > 0 || totalOccurrences > 0) && (
                                        <div className="bg-green-50 border border-green-200 rounded p-2">
                                          {showRevenue > 0 && (
                                            <div className="flex items-center justify-between mb-1">
                                              <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                              <p className="text-sm font-bold text-green-800">${Math.round(showRevenue).toLocaleString()}</p>
                                            </div>
                                          )}
                                          {totalOccurrences > 0 && (
                                            <div className="flex items-center justify-between text-xs text-green-700">
                                              <span>Spots/Month</span>
                                              <span className="font-medium">{Math.round(totalOccurrences).toLocaleString()}</span>
                                            </div>
                                          )}
                                          {totalImpressions > 0 && (
                                            <div className="flex items-center justify-between text-xs text-green-700">
                                              <span>Impressions/Month</span>
                                              <span className="font-medium">{Math.round(totalImpressions).toLocaleString()}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-0.5">Advertising Opportunities</p>
                                        <p className="text-xs text-gray-900">{show.advertisingOpportunities?.length || 0} ads</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Hidden RadioShowEditor - only renders modal */}
                            <div style={{ position: 'absolute', left: '-9999px' }}>
                              <RadioShowEditor
                                key={`radio-editor-${station.callSign}-${index}`}
                                station={station}
                                onChange={async (updatedStation) => {
                                  const updatedStations = [...(currentPublication.distributionChannels?.radioStations || [])];
                                  updatedStations[index] = updatedStation;
                                  await handleUpdatePublication({
                                    distributionChannels: {
                                      ...currentPublication.distributionChannels,
                                      radioStations: updatedStations
                                    }
                                  });
                                }}
                                ref={(ref: any) => {
                                  // Store reference to trigger modal
                                  if (ref && station.shows) {
                                    station.shows.forEach((show: any, showIdx: number) => {
                                      (window as any)[`openRadioShow_${station.callSign}_${showIdx}`] = () => {
                                        ref.openShowDialog?.(show);
                                      };
                                    });
                                  }
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">No shows yet</p>
                        )}
                      </div>
                    </div>

                    </Card>
                    );
                  })}
                  
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
            {currentPublication.distributionChannels?.streamingVideo?.map((channel, index) => {
              // Calculate total monthly revenue for this streaming channel
              const totalRevenue = (channel.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month', channel.frequency);
              }, 0);
              
              return (
                  <Card key={index} className="p-4 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-semibold">{channel.name}</h4>
                        {Array.isArray(channel.platform) && channel.platform.length > 0 ? (
                          channel.platform.map((p) => (
                            <Badge key={p} variant="secondary" className="capitalize">
                              {p.replace('_', ' ')}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary">Not Set</Badge>
                        )}
                        {totalRevenue > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ${Math.round(totalRevenue).toLocaleString()}/mo
                          </Badge>
                        )}
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
                          <span className="ml-2 font-medium">{channel.subscribers?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Views/Video</span>
                          <span className="ml-2 font-medium">{channel.averageViews?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequency</span>
                          <span className="ml-2 font-medium">
                            {channel.frequency ? (
                              <span className="capitalize">{channel.frequency}</span>
                            ) : (
                              <span className="text-orange-500">⚠️ Not Set</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Content</span>
                          <span className="ml-2 font-medium">{channel.contentType || 'N/A'}</span>
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
                          {channel.advertisingOpportunities.map((ad: any, adIndex: number) => {
                            // Calculate occurrences from frequency
                            const getOccurrencesFromFrequency = (freq: string) => {
                              if (!freq) return 0;
                              switch(freq.toLowerCase()) {
                                case 'daily': return 30;
                                case 'weekly': return 4.33;
                                case 'bi-weekly': return 2.17;
                                case 'monthly': return 1;
                                default: return 0;
                              }
                            };
                            
                            const occurrences = getOccurrencesFromFrequency(channel.frequency);
                            const impressions = channel.averageViews ? channel.averageViews * occurrences : 0;
                            const audienceSize = channel.subscribers || channel.averageViews || 0;
                            
                            // Account for multiple spots per video (e.g., 2 mid-rolls = 2x impressions)
                            const spotsPerShow = ad.spotsPerShow || 1;
                            const totalOccurrences = occurrences * spotsPerShow;
                            const totalImpressions = impressions * spotsPerShow;
                            
                            // Populate performanceMetrics for revenue calculation
                            // This allows calculateRevenue to work with CPM/CPV pricing
                            const adWithMetrics = {
                              ...ad,
                              performanceMetrics: {
                                impressionsPerMonth: totalImpressions,
                                occurrencesPerMonth: totalOccurrences,
                                audienceSize: audienceSize
                              }
                            };
                            
                            // Calculate revenue with the enriched ad data
                            const adRevenue = calculateRevenue(adWithMetrics, 'month', channel.frequency);
                            
                            return (
                            <div 
                              key={adIndex} 
                              className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                              onClick={() => openEditDialog(ad, 'streaming-ad', index, adIndex)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-semibold text-gray-900">{ad.name}</h5>
                                  {ad.position && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {ad.position}
                                    </Badge>
                                  )}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(ad, 'streaming-ad', index, adIndex);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cloneStreamingOpportunity(index, adIndex);
                                  }}
                                  title="Clone this ad"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStreamingOpportunity(index, adIndex);
                                  }}
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
                                    <p className="text-xs font-medium text-gray-500 mb-0.5">Audience</p>
                                    <p className="text-xs text-gray-900">{audienceSize > 0 ? audienceSize.toLocaleString() : 'N/A'}</p>
                                  </div>
                                </div>
                                {/* Revenue & Metrics - Show if we have pricing and channel data */}
                                {(adRevenue > 0 || (channel.frequency && (occurrences > 0 || impressions > 0))) && (
                                  <div className="bg-green-50 border border-green-200 rounded p-2">
                                    {adRevenue > 0 && (
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-green-700">Est. Monthly Potential</p>
                                        <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                      </div>
                                    )}
                                    {occurrences > 0 && (
                                      <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Videos/Month{spotsPerShow > 1 ? ` (×${spotsPerShow} spots)` : ''}</span>
                                        <span className="font-medium">{spotsPerShow > 1 ? totalOccurrences.toFixed(1) : occurrences.toFixed(1)}</span>
                                      </div>
                                    )}
                                    {impressions > 0 && (
                                      <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Est. Impressions/Month</span>
                                        <span className="font-medium">{Math.round(totalImpressions).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                                  {renderPricingDisplay(ad.pricing, 'streaming')}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                        )}
                      </div>
                    </div>

                    </Card>
                    );
                  })}
                  
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
                  
                  return printArray.map((publication, index) => {
                    // Calculate total monthly revenue for this print publication
                    const totalRevenue = (publication.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                      return sum + calculateRevenue(ad, 'month', publication.frequency);
                    }, 0);
                    
                    return (
                    <Card key={index} className="p-4 shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{publication.name}</h4>
                          <Badge variant="secondary">{publication.frequency?.charAt(0).toUpperCase() + publication.frequency?.slice(1)}</Badge>
                          {totalRevenue > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              ${Math.round(totalRevenue).toLocaleString()}/mo
                            </Badge>
                          )}
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
                            {publication.advertisingOpportunities.map((ad: any, adIndex: number) => {
                              // Calculate revenue and metrics for this print ad
                              const adRevenue = calculateRevenue(ad, 'month', publication.frequency);
                              const occurrences = ad.performanceMetrics?.occurrencesPerMonth || 0;
                              const impressions = ad.performanceMetrics?.impressionsPerMonth || 0;
                              
                              return (
                              <div 
                                key={adIndex} 
                                className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                                onClick={() => openEditDialog(ad, 'print-ad', index, adIndex)}
                              >
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(ad, 'print-ad', index, adIndex);
                                    }}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clonePrintOpportunity(index, adIndex);
                                    }}
                                    title="Clone this ad"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePrintOpportunity(index, adIndex);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-x-4">
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-0.5">Dimensions</p>
                                      <p className="text-xs text-gray-900">{ad.format?.dimensions || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-0.5">Color</p>
                                      <p className="text-xs text-gray-900">{ad.color || 'N/A'}</p>
                                    </div>
                                  </div>
                                  {/* Revenue & Metrics */}
                                  {(adRevenue > 0 || occurrences > 0 || impressions > 0) && (
                                    <div className="bg-green-50 border border-green-200 rounded p-2">
                                      {adRevenue > 0 && (
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                          <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                        </div>
                                      )}
                                      {occurrences > 0 && (
                                        <div className="flex items-center justify-between text-xs text-green-700">
                                          <span>Issues/Month</span>
                                          <span className="font-medium">{Math.round(occurrences).toLocaleString()}</span>
                                        </div>
                                      )}
                                      {impressions > 0 && (
                                        <div className="flex items-center justify-between text-xs text-green-700">
                                          <span>Circulation/Month</span>
                                          <span className="font-medium">{Math.round(impressions).toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
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
                                    {renderPricingDisplay(ad.pricing, 'print')}
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                          )}
                        </div>
                      </div>

                      </Card>
                      );
                    });
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
            currentPublication.distributionChannels.events.map((event, eventIndex) => {
              // Calculate total monthly revenue for this event
              const totalRevenue = (event.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month', event.frequency);
              }, 0);
              
              return (
              <Card key={eventIndex} className="p-6 shadow-lg">
                <div className="space-y-4">
                  {/* Event Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-base">{event.name || `Event ${eventIndex + 1}`}</h4>
                        {totalRevenue > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ${Math.round(totalRevenue).toLocaleString()}/mo
                          </Badge>
                        )}
                      </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {event.advertisingOpportunities.map((opportunity, oppIndex) => {
                          // Calculate revenue and metrics for this sponsorship
                          const adRevenue = calculateRevenue(opportunity, 'month', event.frequency);
                          const occurrences = opportunity.performanceMetrics?.occurrencesPerMonth || 0;
                          const attendance = event.averageAttendance || 0;
                          
                          // Format occurrences - only show decimals if < 1
                          const formatOccurrences = (val: number) => {
                            if (val === 0) return '0';
                            if (val >= 1) return Math.round(val).toString();
                            return val.toFixed(2);
                          };
                          
                          return (
                          <div key={oppIndex} className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h6 className="text-sm font-semibold text-gray-900 capitalize">
                                {opportunity.name || `${opportunity.level || 'Sponsorship'}`}
                              </h6>
                              {opportunity.level && (
                                <Badge variant="secondary" className="text-xs">
                                  {opportunity.level}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingType('event');
                                  setEditingParentIndex(eventIndex);
                                  setEditingItemIndex(oppIndex);
                                  setEditingItem({ ...opportunity });
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  // Clone functionality
                                  const clonedOpportunity = { 
                                    ...opportunity, 
                                    name: `${opportunity.name || opportunity.level} (Copy)`
                                  };
                                  const updatedEvents = [...(currentPublication.distributionChannels?.events || [])];
                                  updatedEvents[eventIndex].advertisingOpportunities = [
                                    ...(updatedEvents[eventIndex].advertisingOpportunities || []),
                                    clonedOpportunity
                                  ];
                                  handleUpdatePublication({
                                    distributionChannels: {
                                      ...currentPublication.distributionChannels,
                                      events: updatedEvents
                                    }
                                  });
                                }}
                                title="Clone this sponsorship"
                              >
                                <Copy className="w-3 h-3" />
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
                                {opportunity.benefits.slice(0, 3).map((benefit, idx) => (
                                  <li key={idx}>• {benefit}</li>
                                ))}
                                {opportunity.benefits.length > 3 && (
                                  <li className="text-gray-500 italic">+{opportunity.benefits.length - 3} more...</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Revenue & Metrics */}
                          {(adRevenue > 0 || occurrences > 0 || attendance > 0) && (
                            <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                              {adRevenue > 0 && (
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                  <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                </div>
                              )}
                              {occurrences > 0 && (
                                <div className="flex items-center justify-between text-xs text-green-700">
                                  <span>Events/Month</span>
                                  <span className="font-medium">{formatOccurrences(occurrences)}</span>
                                </div>
                              )}
                              {attendance > 0 && (
                                <div className="flex items-center justify-between text-xs text-green-700">
                                  <span>Avg Attendance</span>
                                  <span className="font-medium">{attendance.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pricing - always show (matches podcast/newsletter pattern) */}
                          <div className="mt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium text-gray-500">Pricing</p>
                              {opportunity.hubPricing && opportunity.hubPricing.length > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-normal px-1.5 py-0.5"
                                >
                                  +{opportunity.hubPricing.length} CUSTOM
                                </Badge>
                              )}
                            </div>
                            {renderPricingDisplay(opportunity.pricing, 'event')}
                          </div>
                        </div>
                        );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No sponsorship opportunities defined</p>
                    )}
                    </div>
                  </div>
                </div>
              </Card>
              );
            })
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
            {currentPublication.distributionChannels?.newsletters?.map((newsletter, index) => {
              // Calculate total monthly revenue for this newsletter
              const totalRevenue = (newsletter.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month', newsletter.frequency);
              }, 0);
              
              return (
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{newsletter.name}</h4>
                    <Badge variant="secondary">{newsletter.frequency?.charAt(0).toUpperCase() + newsletter.frequency?.slice(1)}</Badge>
                    {totalRevenue > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ${Math.round(totalRevenue).toLocaleString()}/mo
                      </Badge>
                    )}
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
                      {newsletter.advertisingOpportunities.map((ad: any, adIndex: number) => {
                        // Calculate revenue and metrics for this ad
                        const adRevenue = calculateRevenue(ad, 'month', newsletter.frequency);
                        const occurrences = ad.performanceMetrics?.occurrencesPerMonth || 0;
                        const impressions = ad.performanceMetrics?.impressionsPerMonth || 0;
                        
                        return (
                        <div 
                          key={adIndex} 
                          className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                          onClick={() => openEditDialog(ad, 'newsletter', index, adIndex)}
                        >
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
                                // Display dimensions from format
                                if (ad.format?.dimensions) {
                                  return (
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {ad.format.dimensions}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(ad, 'newsletter', index, adIndex);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneNewsletterOpportunity(index, adIndex);
                              }}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNewsletterOpportunity(index, adIndex);
                              }}
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
                                  // Display dimensions from format
                                  return ad.format?.dimensions || 'N/A';
                                })()}
                              </p>
                            </div>
                            {/* Revenue & Metrics */}
                            {(adRevenue > 0 || occurrences > 0 || impressions > 0) && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                {adRevenue > 0 && (
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                    <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                  </div>
                                )}
                                {occurrences > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Sends/Month</span>
                                    <span className="font-medium">{Math.round(occurrences).toLocaleString()}</span>
                                  </div>
                                )}
                                {impressions > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Impressions/Month</span>
                                    <span className="font-medium">{Math.round(impressions).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
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
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                  </div>
                </div>

              </Card>
              );
            })}
            
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
            {currentPublication.distributionChannels?.socialMedia?.map((profile, index) => {
              // Calculate total monthly revenue for this social media profile
              const totalRevenue = (profile.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month');
              }, 0);
              
              return (
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold capitalize">{profile.platform}</h4>
                    <Badge variant="secondary">@{profile.handle}</Badge>
                    {totalRevenue > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ${Math.round(totalRevenue).toLocaleString()}/mo
                      </Badge>
                    )}
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
                      {profile.advertisingOpportunities.map((ad: any, adIndex: number) => {
                        // Calculate revenue and metrics for this social media ad
                        const adRevenue = calculateRevenue(ad, 'month');
                        const occurrences = ad.performanceMetrics?.occurrencesPerMonth || 0;
                        const impressions = ad.performanceMetrics?.impressionsPerMonth || 0;
                        
                        return (
                        <div 
                          key={adIndex} 
                          className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                          onClick={() => openEditDialog(ad, 'social-media-ad', index, adIndex)}
                        >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(ad, 'social-media-ad', index, adIndex);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneSocialMediaOpportunity(index, adIndex);
                              }}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSocialMediaOpportunity(index, adIndex);
                              }}
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
                            {/* Revenue & Metrics */}
                            {(adRevenue > 0 || occurrences > 0 || impressions > 0) && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                {adRevenue > 0 && (
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                    <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                  </div>
                                )}
                                {occurrences > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Posts/Month</span>
                                    <span className="font-medium">{Math.round(occurrences).toLocaleString()}</span>
                                  </div>
                                )}
                                {impressions > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Impressions/Month</span>
                                    <span className="font-medium">{Math.round(impressions).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
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
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities yet</p>
                  )}
                  </div>
                </div>

              </Card>
              );
            })}
            
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
            {currentPublication.distributionChannels?.television?.map((station, index) => {
              // Calculate total monthly revenue for this TV station
              const totalRevenue = (station.advertisingOpportunities || []).reduce((sum: number, ad: any) => {
                return sum + calculateRevenue(ad, 'month', station.frequency);
              }, 0);
              
              return (
              <Card key={index} className="p-4 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-base">{station.callSign || `TV Station ${index + 1}`}</h4>
                      {totalRevenue > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ${Math.round(totalRevenue).toLocaleString()}/mo
                        </Badge>
                      )}
                    </div>
                    {/* Specifications Container */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                        <div>
                          <span className="text-muted-foreground">Total Spots</span>
                          <span className="ml-2 font-medium">{station.advertisingOpportunities?.length || 0}</span>
                        </div>
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
                      {station.advertisingOpportunities.map((ad: any, adIndex: number) => {
                        // Calculate revenue and metrics for this TV ad
                        const adRevenue = calculateRevenue(ad, 'month', station.frequency);
                        const occurrences = ad.performanceMetrics?.occurrencesPerMonth || 0;
                        const viewersPerSpot = ad.performanceMetrics?.audienceSize || 0;
                        
                        return (
                        <div 
                          key={adIndex} 
                          className="group border border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-200 hover:shadow-md cursor-pointer"
                          onClick={() => openEditDialog(ad, 'television-ad', index, adIndex)}
                        >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(ad, 'television-ad', index, adIndex);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneTelevisionOpportunity(index, adIndex);
                              }}
                              title="Clone this ad"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTelevisionOpportunity(index, adIndex);
                              }}
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
                                <p className="text-xs text-gray-900">{ad.format?.duration ? `${ad.format.duration}s` : 'N/A'}</p>
                              </div>
                            </div>
                            {/* Revenue & Metrics */}
                            {(adRevenue > 0 || occurrences > 0 || viewersPerSpot > 0) && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                {adRevenue > 0 && (
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-green-700">Monthly Potential</p>
                                    <p className="text-sm font-bold text-green-800">${Math.round(adRevenue).toLocaleString()}</p>
                                  </div>
                                )}
                                {occurrences > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Spots/Month</span>
                                    <span className="font-medium">{Math.round(occurrences).toLocaleString()}</span>
                                  </div>
                                )}
                                {viewersPerSpot > 0 && (
                                  <div className="flex items-center justify-between text-xs text-green-700">
                                    <span>Viewers/Spot</span>
                                    <span className="font-medium">{Math.round(viewersPerSpot).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
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
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No ad products yet</p>
                  )}
                  </div>
                </div>

              </Card>
              );
            })}
            
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
        <DialogContent className="w-[900px] max-w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col overflow-x-hidden p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-4 pb-3 border-b bg-gray-50">
            <DialogTitle className="text-base font-sans">
              {editingType === 'radio-show' ? 'Edit Radio Show' :
               `Edit ${editingType === 'website' ? 'Website' : 
                   editingType === 'newsletter' ? 'Newsletter' :
                   editingType === 'print-ad' ? 'Print' :
                   editingType === 'podcast-ad' ? 'Podcast' :
                   editingType === 'radio-ad' ? 'Radio' :
                   editingType === 'streaming-ad' ? 'Streaming Video' :
                   editingType === 'television-ad' ? 'Television' :
                   editingType === 'social-media-ad' ? 'Social Media' :
                   editingType === 'event' ? 'Event Sponsorship' :
                   editingType === 'event-container' ? 'Event Properties' :
                   editingType === 'newsletter-container' ? 'Newsletter Properties' :
                   editingType === 'print-container' ? 'Print Properties' :
                   editingType === 'podcast-container' ? 'Podcast Properties' :
                   editingType === 'radio-container' ? 'Radio Properties' :
                   editingType === 'streaming-container' ? 'Streaming Properties' :
                   editingType === 'television-container' ? 'TV Station Properties' :
                   editingType === 'social-media-container' ? 'Social Media Properties' :
                   'Item'} ${editingType?.includes('-container') ? '' : editingType?.includes('-ad') ? 'Advertising Opportunity' : 'Advertising Opportunity'}`}
            </DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 px-6 py-4 bg-white">
              
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
                  />

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
                    pricingFields={[
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'flat_rate', label: 'Flat Rate' },
                      { value: 'monthly', label: '/month' },
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
                  />

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
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
                        label: 'Buy Frequency',
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
                        value={editingItem.adFormat || 'tall full page'}
                        onValueChange={(value) => {
                          // Auto-populate dimensions when adFormat changes
                          const defaultDimensions = PRINT_FORMAT_DEFAULTS[value] || '';
                          setEditingItem({ 
                            ...editingItem, 
                            adFormat: value,
                            format: {
                              ...editingItem.format,
                              dimensions: defaultDimensions
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tall full page">Tall Full Page (10" x 15.5")</SelectItem>
                          <SelectItem value="tall portrait full page">Tall Portrait Full Page (10.5" x 13.5")</SelectItem>
                          <SelectItem value="upper portrait full page">Upper Portrait Full Page (10" x 12.75")</SelectItem>
                          <SelectItem value="square full page">Square/Short Full Page (10" x 10")</SelectItem>
                          <SelectItem value="narrow full page">Narrow Full Page (8.5" x 10.85")</SelectItem>
                          <SelectItem value="half page horizontal">Half Page Horizontal (10" x 5")</SelectItem>
                          <SelectItem value="half page vertical">Half Page Vertical (5" x 10")</SelectItem>
                          <SelectItem value="quarter page">Quarter Page (5" x 5")</SelectItem>
                          <SelectItem value="eighth page">Eighth Page (5" x 3.25")</SelectItem>
                          <SelectItem value="business card">Business Card (3.5" x 2")</SelectItem>
                          <SelectItem value="classified">Classified</SelectItem>
                          <SelectItem value="insert">Insert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dimensions">
                        Dimensions *
                        {editingItem.format?.dimensions && (() => {
                          // Validate dimension format
                          const isValid = /^\d+(?:\.\d+)?["']?\s*[x×]\s*\d+(?:\.\d+)?["']?/.test(editingItem.format.dimensions);
                          return isValid ? (
                            <span className="ml-2 text-xs text-green-600">✓ Valid</span>
                          ) : (
                            <span className="ml-2 text-xs text-amber-600">Check format</span>
                          );
                        })()}
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="dimensions"
                          value={editingItem.format?.dimensions || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            format: { ...editingItem.format, dimensions: e.target.value }
                          })}
                          placeholder='Example: 10.5" x 13.5" or 8.5 x 11'
                          className={!editingItem.format?.dimensions ? 'border-amber-300' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                          Format: Width x Height with units (e.g., 8.5" x 11" or 10 x 12.625 inches)
                        </p>
                        {/* Custom size warning */}
                        {editingItem.format?.dimensions && 
                         editingItem.adFormat && 
                         PRINT_FORMAT_DEFAULTS[editingItem.adFormat] &&
                         editingItem.format.dimensions !== PRINT_FORMAT_DEFAULTS[editingItem.adFormat] && (
                          <Alert variant="default" className="py-2 bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-xs text-amber-800">
                              Custom dimensions may limit this inventory's availability for campaigns. 
                              Standard sizes are preferred for campaign matching.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
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
                    publicationHubIds={currentPublication?.hubIds}
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
                        label: 'Buy Frequency',
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
                        <Label htmlFor="fileFormats">File Formats</Label>
                        <Input
                          id="fileFormats"
                          value={editingItem.format?.fileFormats?.join(', ') || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            format: { 
                              ...editingItem.format, 
                              fileFormats: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                            } 
                          })}
                          placeholder="PDF, JPEG, PNG"
                        />
                      </div>
                      <div>
                        <Label htmlFor="resolution">Resolution</Label>
                        <Input
                          id="resolution"
                          value={editingItem.format?.resolution || ''}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            format: { 
                              ...editingItem.format, 
                              resolution: e.target.value 
                            } 
                          })}
                          placeholder="300dpi"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={editingItem.format?.colorSpace || ''}
                        onValueChange={(value) => setEditingItem({ 
                          ...editingItem, 
                          format: { 
                            ...editingItem.format, 
                            colorSpace: value 
                          } 
                        })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Color Space" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CMYK">CMYK</SelectItem>
                          <SelectItem value="RGB">RGB</SelectItem>
                          <SelectItem value="Grayscale">Grayscale</SelectItem>
                        </SelectContent>
                      </Select>
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
                        customDurationMode
                          ? 'custom'
                          : (editingItem.duration && [15, 30, 60, 90, 120].includes(editingItem.duration)
                            ? String(editingItem.duration)
                            : 'custom')
                      }
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          // Enter custom mode and clear duration
                          setCustomDurationMode(true);
                          setEditingItem({ ...editingItem, duration: undefined });
                          return;
                        }
                        // Exit custom mode and set standard duration
                        setCustomDurationMode(false);
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
                  {(customDurationMode || (!editingItem.duration || ![15, 30, 60, 90, 120].includes(editingItem.duration))) && (
                    <div>
                      <Label htmlFor="customDuration">Custom Duration (seconds)</Label>
                      <Input
                        id="customDuration"
                        type="number"
                        value={editingItem.duration || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = val === '' ? undefined : parseInt(val, 10);
                          setEditingItem({ ...editingItem, duration: isNaN(numVal) ? undefined : numVal });
                        }}
                        placeholder="Enter seconds (e.g., 45, 180, 600)"
                      />
                    </div>
                  )}

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
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
                        label: 'Buy Frequency',
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
                        customDurationMode
                          ? 'custom'
                          : (editingItem.format?.duration && [15, 30, 60, 90, 120].includes(editingItem.format.duration)
                            ? String(editingItem.format.duration)
                            : 'custom')
                      }
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          // Enter custom mode and clear duration
                          setCustomDurationMode(true);
                          setEditingItem({ 
                            ...editingItem, 
                            format: {
                              ...editingItem.format,
                              duration: undefined
                            }
                          });
                          return;
                        }
                        // Exit custom mode and set standard duration
                        setCustomDurationMode(false);
                        const duration = parseInt(value);
                        setEditingItem({ 
                          ...editingItem, 
                          format: {
                            ...editingItem.format,
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
                  {(customDurationMode || (!editingItem.format?.duration || ![15, 30, 60, 90, 120].includes(editingItem.format.duration))) && (
                    <div>
                      <Label htmlFor="customDuration">Custom Duration (seconds)</Label>
                      <Input
                        id="customDuration"
                        type="number"
                        value={editingItem.format?.duration || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = val === '' ? undefined : parseInt(val, 10);
                          setEditingItem({ 
                            ...editingItem, 
                            format: {
                              ...editingItem.format,
                              duration: isNaN(numVal) ? undefined : numVal
                            }
                          });
                        }}
                        placeholder="Enter seconds (e.g., 45, 180, 600, 1320)"
                      />
                    </div>
                  )}

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
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
                        label: 'Buy Frequency',
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
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre-roll">Pre-roll</SelectItem>
                          <SelectItem value="mid-roll">Mid-roll</SelectItem>
                          <SelectItem value="post-roll">Post-roll</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="sponsored_content">Sponsored Content</SelectItem>
                          <SelectItem value="product_placement">Product Placement</SelectItem>
                          <SelectItem value="live_mention">Live Mention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Position *</Label>
                      <Select
                        value={editingItem.position || editingItem.adFormat || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre-roll">Pre-roll (before content)</SelectItem>
                          <SelectItem value="mid-roll">Mid-roll (during content)</SelectItem>
                          <SelectItem value="post-roll">Post-roll (after content)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Where the ad appears in the video</p>
                    </div>
                        <div>
                          <Label htmlFor="duration">Duration (seconds)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={editingItem.duration || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 0 })}
                            placeholder="15"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="spotsPerShow">Spots Per Video</Label>
                        <Input
                          id="spotsPerShow"
                          type="number"
                          value={editingItem.spotsPerShow || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, spotsPerShow: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          How many times this ad appears per video (e.g., 2 mid-rolls = 2 spots)
                        </p>
                      </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Technical Specifications</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="fileFormats">Video Format</Label>
                        <Select
                          value={editingItem.format?.fileFormats?.[0] || ''}
                          onValueChange={(value) => setEditingItem({
                            ...editingItem,
                            format: {
                              ...editingItem.format,
                              fileFormats: [value]
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select format..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MP4">MP4</SelectItem>
                            <SelectItem value="MOV">MOV</SelectItem>
                            <SelectItem value="AVI">AVI</SelectItem>
                            <SelectItem value="TXT">Script/Copy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="resolution">Resolution</Label>
                        <Select
                          value={editingItem.format?.resolution || ''}
                          onValueChange={(value) => setEditingItem({
                            ...editingItem,
                            format: {
                              ...editingItem.format,
                              resolution: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resolution..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4k">4K</SelectItem>
                            <SelectItem value="1080p">1080p</SelectItem>
                            <SelectItem value="720p">720p</SelectItem>
                            <SelectItem value="480p">480p</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dimensions">Aspect Ratio</Label>
                        <Select
                          value={editingItem.format?.dimensions || ''}
                          onValueChange={(value) => setEditingItem({
                            ...editingItem,
                            format: {
                              ...editingItem.format,
                              dimensions: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ratio..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                            <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>


                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
                    pricingFields={[
                      { key: 'flatRate', label: 'Price', placeholder: '100' }
                    ]}
                    pricingModels={[
                      { value: 'cpm', label: 'CPM (/1000 views)' },
                      { value: 'cpv', label: 'CPV (/100 views)' },
                      { value: 'flat', label: 'Flat Rate' },
                      { value: 'per_spot', label: 'Per Spot' },
                      { value: 'monthly', label: 'Monthly' },
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

              {/* Television Ad Fields */}
              {editingType === 'television-ad' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ad Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="Prime Time 30-Second Spot"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adFormat">Ad Format</Label>
                      <Select
                        value={editingItem.adFormat || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, adFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30_second_spot">30 Second Spot</SelectItem>
                          <SelectItem value="60_second_spot">60 Second Spot</SelectItem>
                          <SelectItem value="15_second_spot">15 Second Spot</SelectItem>
                          <SelectItem value="sponsored_segment">Sponsored Segment</SelectItem>
                          <SelectItem value="product_placement">Product Placement</SelectItem>
                          <SelectItem value="billboard">Billboard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="daypart">Daypart</Label>
                      <Select
                        value={editingItem.daypart || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, daypart: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select daypart..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prime_time">Prime Time (8pm-11pm)</SelectItem>
                          <SelectItem value="daytime">Daytime (9am-4pm)</SelectItem>
                          <SelectItem value="early_morning">Early Morning (6am-9am)</SelectItem>
                          <SelectItem value="late_night">Late Night (11pm-2am)</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Select
                        value={String(editingItem.format?.duration || '')}
                        onValueChange={(value) => setEditingItem({
                          ...editingItem,
                          format: {
                            ...editingItem.format,
                            duration: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="90">90 seconds</SelectItem>
                          <SelectItem value="120">120 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Technical Specifications</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fileFormats">Video Format</Label>
                        <Select
                          value={editingItem.format?.fileFormats?.[0] || ''}
                          onValueChange={(value) => setEditingItem({
                            ...editingItem,
                            format: {
                              ...editingItem.format,
                              fileFormats: [value]
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select format..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MPEG2">MPEG2 (Broadcast)</SelectItem>
                            <SelectItem value="H264">H.264 (Digital)</SelectItem>
                            <SelectItem value="ProRes">ProRes (Production)</SelectItem>
                            <SelectItem value="TXT">Live Script (Host Read)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="resolution">Resolution</Label>
                        <Select
                          value={editingItem.format?.resolution || ''}
                          onValueChange={(value) => setEditingItem({
                            ...editingItem,
                            format: {
                              ...editingItem.format,
                              resolution: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resolution..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                            <SelectItem value="720p">720p (HD)</SelectItem>
                            <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Performance Metrics</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="occurrencesPerMonth">Spots Per Month</Label>
                        <Input
                          id="occurrencesPerMonth"
                          type="number"
                          value={editingItem.performanceMetrics?.occurrencesPerMonth || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            performanceMetrics: {
                              ...editingItem.performanceMetrics,
                              occurrencesPerMonth: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          })}
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="audienceSize">Viewers Per Spot</Label>
                        <Input
                          id="audienceSize"
                          type="number"
                          value={editingItem.performanceMetrics?.audienceSize || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            performanceMetrics: {
                              ...editingItem.performanceMetrics,
                              audienceSize: e.target.value ? parseInt(e.target.value) : undefined
                            }
                          })}
                          placeholder="50000"
                        />
                      </div>
                    </div>
                  </div>

                  <HubPricingEditor
                    defaultPricing={editingItem.pricing || {}}
                    hubPricing={editingItem.hubPricing || []}
                    publicationHubIds={currentPublication?.hubIds}
                    pricingFields={[
                      { key: 'flatRate', label: 'Price', placeholder: '2500' }
                    ]}
                    pricingModels={[
                      { value: 'per_spot', label: '/spot' },
                      { value: 'weekly', label: '/week' },
                      { value: 'monthly', label: '/month' },
                      { value: 'contact', label: 'Contact for pricing' }
                    ]}
                    conditionalFields={[
                      {
                        key: 'frequency',
                        label: 'Buy Frequency',
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
                    publicationHubIds={currentPublication?.hubIds}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Sponsorship Name</Label>
                      <Input
                        id="name"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="e.g., Annual Gala - Title Sponsor"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level">Sponsorship Level</Label>
                      <Select
                        value={editingItem.level || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="title">Title Sponsor</SelectItem>
                          <SelectItem value="presenting">Presenting Sponsor</SelectItem>
                          <SelectItem value="supporting">Supporting Sponsor</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="booth">Booth Space</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    publicationHubIds={currentPublication?.hubIds}
                    pricingFields={[
                      { key: 'flatRate', label: 'Sponsorship Fee', placeholder: '2500' }
                    ]}
                    pricingModels={[
                      { value: 'flat', label: 'Flat rate' },
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
                      <EventFrequencySelectorInline
                        value={editingItem.frequency as EventFrequency}
                        onChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
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
                      <Label htmlFor="frequency">Frequency *</Label>
                      <Select 
                        value={editingItem.frequency || ''} 
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
                      >
                        <SelectTrigger className={!editingItem.frequency ? 'border-orange-300' : ''}>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      {!editingItem.frequency && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Required for accurate revenue forecasting</p>
                      )}
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
                  </div>
                  
                  <div>
                    <Label htmlFor="platform">Platforms (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                      {[
                        { value: 'youtube', label: 'YouTube' },
                        { value: 'twitch', label: 'Twitch' },
                        { value: 'facebook_live', label: 'Facebook Live' },
                        { value: 'instagram_live', label: 'Instagram Live' },
                        { value: 'linkedin_live', label: 'LinkedIn Live' },
                        { value: 'custom_streaming', label: 'Custom Platform' },
                        { value: 'other', label: 'Other' }
                      ].map((platform) => (
                        <label key={platform.value} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Array.isArray(editingItem.platform) ? editingItem.platform.includes(platform.value) : false}
                            onChange={(e) => {
                              const currentPlatforms = Array.isArray(editingItem.platform) ? editingItem.platform : [];
                              const newPlatforms = e.target.checked
                                ? [...currentPlatforms, platform.value]
                                : currentPlatforms.filter(p => p !== platform.value);
                              setEditingItem({ ...editingItem, platform: newPlatforms });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{platform.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select if you stream to multiple platforms simultaneously
                    </p>
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
                      <Label htmlFor="averageViews">Avg Views (per video)</Label>
                      <Input
                        id="averageViews"
                        type="number"
                        value={editingItem.averageViews || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, averageViews: parseInt(e.target.value) || 0 })}
                        placeholder="5000"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Per video/stream</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="frequency">Publishing Frequency *</Label>
                      <Select
                        value={editingItem.frequency || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, frequency: value })}
                      >
                        <SelectTrigger className={!editingItem.frequency ? 'border-orange-300' : ''}>
                          <SelectValue placeholder="Select frequency..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="irregular">Irregular</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        How often you publish new content (required for revenue calculations)
                      </p>
                      {!editingItem.frequency && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Required for accurate revenue forecasting</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="contentType">Content Type</Label>
                      <Select
                        value={editingItem.contentType || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, contentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type..." />
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
                  </div>
                </>
              )}

              {/* Television Station Container Fields */}
              {editingType === 'television-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="callSign">Call Sign</Label>
                      <Input
                        id="callSign"
                        value={editingItem.callSign || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, callSign: e.target.value })}
                        placeholder="WLS-TV"
                      />
                    </div>
                    <div>
                      <Label htmlFor="channel">Channel</Label>
                      <Input
                        id="channel"
                        value={editingItem.channel || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, channel: e.target.value })}
                        placeholder="7"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="network">Network</Label>
                      <Select
                        value={editingItem.network || ''}
                        onValueChange={(value) => setEditingItem({ ...editingItem, network: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select network..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="abc">ABC</SelectItem>
                          <SelectItem value="nbc">NBC</SelectItem>
                          <SelectItem value="cbs">CBS</SelectItem>
                          <SelectItem value="fox">Fox</SelectItem>
                          <SelectItem value="pbs">PBS</SelectItem>
                          <SelectItem value="cw">The CW</SelectItem>
                          <SelectItem value="independent">Independent</SelectItem>
                          <SelectItem value="cable">Cable</SelectItem>
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
                        placeholder="Chicago DMA"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stationId">Station ID</Label>
                      <Input
                        id="stationId"
                        value={editingItem.stationId || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, stationId: e.target.value })}
                        placeholder="wls-abc7-chicago"
                      />
                    </div>
                    <div>
                      <Label htmlFor="viewers">Average Weekly Viewers</Label>
                      <Input
                        id="viewers"
                        type="number"
                        value={editingItem.viewers || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, viewers: parseInt(e.target.value) || 0 })}
                        placeholder="2500000"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Social Media Container Fields */}
              {editingType === 'social-media-container' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="platform">Platform *</Label>
                      <Select 
                        value={editingItem.platform || ''} 
                        onValueChange={(value) => setEditingItem({ ...editingItem, platform: value })}
                      >
                        <SelectTrigger className={!editingItem.platform ? 'border-orange-300' : ''}>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="twitter">Twitter/X</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="pinterest">Pinterest</SelectItem>
                          <SelectItem value="snapchat">Snapchat</SelectItem>
                          <SelectItem value="threads">Threads</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {!editingItem.platform && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Platform required</p>
                      )}
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
              {!['website', 'newsletter', 'print-ad', 'podcast-ad', 'radio-ad', 'streaming-ad', 'television-ad', 'social-media-ad', 'event', 'newsletter-container', 'print-container', 'podcast-container', 'radio-container', 'streaming-container', 'television-container', 'social-media-container', 'website-container', 'event-container', 'radio-show'].includes(editingType) && (
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
          
          {editingItem && editingType !== 'radio-show' && (
            <div className="flex justify-end space-x-2 px-6 py-4 border-t flex-shrink-0 bg-gray-50">
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

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Inventory"
        activityTypes={['inventory_update']}
        publicationId={selectedPublication?._id?.toString()}
      />
    </div>
  );
};
