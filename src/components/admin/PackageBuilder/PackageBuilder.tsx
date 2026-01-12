import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Target,
  MapPin,
  Calendar,
  Package as PackageIcon,
  HelpCircle,
  Sparkles,
  Loader2,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BuilderFilters, packageBuilderService, PublicationData } from '@/services/packageBuilderService';
import { useHubContext } from '@/contexts/HubContext';
import { formatPrice } from '@/utils/pricingCalculations';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface PackageBuilderProps {
  onAnalyze: (filters: BuilderFilters) => Promise<void>;
  loading?: boolean;
  onBack?: () => void;
}

// Available channels
const CHANNELS = [
  { id: 'newsletter', label: 'Newsletter', description: 'Email newsletters' },
  { id: 'website', label: 'Website', description: 'Digital display ads' },
  { id: 'print', label: 'Print', description: 'Newspaper ads' },
  { id: 'radio', label: 'Radio', description: 'Radio spots' },
  { id: 'podcast', label: 'Podcast', description: 'Podcast ads' },
  { id: 'social', label: 'Social Media', description: 'Social media posts' },
  { id: 'streaming', label: 'Streaming', description: 'Video streaming ads' },
  { id: 'events', label: 'Events', description: 'Event sponsorships' }
];

// Geographic filters
const GEOGRAPHY_OPTIONS = [
  { id: 'South Side', label: 'South Side' },
  { id: 'North Side', label: 'North Side' },
  { id: 'Citywide', label: 'Citywide' },
  { id: 'West Side', label: 'West Side' },
  { id: 'Downtown', label: 'Downtown' }
];

// Inventory item for display - extends HubPackageInventoryItem for proper pricing
interface InventoryDisplay {
  channel: string;
  itemName: string;
  itemPath: string;
  hubPrice: number; // Hub-specific pricing only
  specifications?: Record<string, unknown>;
  frequency?: number;
  isExcluded?: boolean; // Excluded from package but not deleted
  // Additional fields needed for proper CPM/impression-based pricing
  itemPricing?: {
    hubPrice: number;
    pricingModel?: string;
  };
  monthlyImpressions?: number;
  currentFrequency?: number;
}

// Publication with inventory for display
interface PublicationWithInventory extends PublicationData {
  inventory: InventoryDisplay[];
  expanded: boolean;
  totalPrice: number;
  publicationName?: string; // Allow direct access for backwards compatibility
}

export function PackageBuilder({ onAnalyze, loading, onBack }: PackageBuilderProps) {
  const hubContext = useHubContext();
  const selectedHubId = hubContext?.selectedHubId;
  
  // Convert camelCase to Title Case
  const camelToTitleCase = (str: string): string => {
    const specialCases: Record<string, string> = {
      'fileSize': 'File Size',
      'thirdPartyTags': 'Third Party Tags',
      'adFormat': 'Ad Format',
      'bitrate': 'Bitrate',
      'duration': 'Duration',
      'format': 'Format',
      'placement': 'Placement',
      'size': 'Size',
      'animationAllowed': 'Animation Allowed'
    };
    
    if (specialCases[str]) {
      return specialCases[str];
    }
    
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };
  
  // Publications state
  const [publications, setPublications] = useState<PublicationWithInventory[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [selectedPublications, setSelectedPublications] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Duration
  const [duration, setDuration] = useState<string>('6');
  
  // Geography filters
  const [selectedGeography, setSelectedGeography] = useState<string[]>([]);
  
  // Channel selection
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['newsletter', 'website', 'print']);

  // Load publications when hub or channels change
  useEffect(() => {
    const loadPublications = async () => {
    if (!selectedHubId) {
      setPublications([]);
      return;
    }
    
    setLoadingPublications(true);
    try {
      const pubs = await packageBuilderService.fetchPublicationsForBuilder(
        selectedHubId,
        selectedChannels,
        selectedGeography.length > 0 ? selectedGeography : undefined
      );

      // Extract inventory for each publication
      const pubsWithInventory: PublicationWithInventory[] = pubs.map(pub => {
        try {
          const items = packageBuilderService.extractInventoryFromPublication(
            pub,
            selectedChannels,
            'standard', // Using standard for display purposes
            selectedHubId || undefined
          );

                          const inventory: InventoryDisplay[] = items.map(item => ({
                            channel: item.channel || '',
                            itemName: item.itemName || 'Unnamed Item',
                            itemPath: item.itemPath || '',
                            hubPrice: item.itemPricing?.hubPrice || 0, // Hub pricing only
                            format: item.format || {},
                            frequency: item.currentFrequency || 1,
                            isExcluded: item.isExcluded || false,
                            // Include pricing details for proper CPM calculations
                            itemPricing: item.itemPricing,
                            monthlyImpressions: item.monthlyImpressions,
                            currentFrequency: item.currentFrequency || 1
                          }));

                          const totalPrice = inventory
                            .filter(item => !item.isExcluded) // Exclude items marked as excluded
                            .reduce((sum, item) => 
                              sum + calculateItemCost(item as HubPackageInventoryItem, item.frequency || 1), 0
                            );

          return {
            ...pub,
            inventory,
            expanded: false,
            totalPrice,
            publicationName: pub.basicInfo?.publicationName || (pub as any).publicationName || 'Unknown'
          };
        } catch (error) {
          console.error('Error extracting inventory for publication:', pub.basicInfo?.publicationName || (pub as any).publicationName, error);
          return {
            ...pub,
            inventory: [],
            expanded: false,
            totalPrice: 0,
            publicationName: pub.basicInfo?.publicationName || (pub as any).publicationName || 'Unknown'
          };
        }
      });

      setPublications(pubsWithInventory);
      setError(null);
    } catch (error) {
      console.error('Error loading publications:', error);
      setError(error instanceof Error ? error.message : 'Failed to load publications');
      setPublications([]);
    } finally {
      setLoadingPublications(false);
    }
  };

    if (selectedHubId) {
      loadPublications();
    } else {
      setPublications([]);
      setError(null);
    }
  }, [selectedHubId, selectedChannels, selectedGeography]);

  const handleGeographyToggle = (geoId: string) => {
    setSelectedGeography(prev =>
      prev.includes(geoId)
        ? prev.filter(id => id !== geoId)
        : [...prev, geoId]
    );
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handlePublicationToggle = (pubId: number) => {
    setSelectedPublications(prev =>
      prev.includes(pubId)
        ? prev.filter(id => id !== pubId)
        : [...prev, pubId]
    );
  };

  const handleSelectAllPublications = () => {
    try {
      if (selectedPublications.length === publications.length) {
        setSelectedPublications([]);
      } else {
        const validIds = publications
          .filter(p => p && p.publicationId != null)
          .map(p => p.publicationId);
        setSelectedPublications(validIds);
      }
    } catch (error) {
      console.error('[PackageBuilder] Error in handleSelectAllPublications:', error);
      setError(error instanceof Error ? error.message : 'Error selecting publications');
    }
  };

  const togglePublicationExpand = (pubId: number) => {
    setPublications(prev =>
      prev.map(p =>
        p.publicationId === pubId
          ? { ...p, expanded: !p.expanded }
          : p
      )
    );
  };

  const handleBuildPackage = async () => {
    if (!selectedHubId) {
      alert('Please select a hub first');
      return;
    }

    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    if (selectedPublications.length === 0) {
      alert('Please select at least one publication');
      return;
    }

    const filters: BuilderFilters = {
      mode: 'specification-first',
      duration: parseInt(duration),
      geography: selectedGeography.length > 0 ? selectedGeography : undefined,
      channels: selectedChannels,
      publications: selectedPublications,
      frequencyStrategy: 'standard'
    };

    await onAnalyze(filters);
  };

  // Calculate totals with safety checks
  const selectedPubs = publications.filter(p => 
    p && 
    p.publicationId != null && 
    selectedPublications.includes(p.publicationId)
  );
  // Recalculate total dynamically based on current excluded status
  const totalMonthly = selectedPubs.reduce((sum, p) => {
    const pubTotal = (p.inventory || [])
      .filter(item => !item.isExcluded)
      .reduce((itemSum, item) => 
        itemSum + calculateItemCost(item as HubPackageInventoryItem, item.frequency || 1), 0
      );
    return sum + pubTotal;
  }, 0);
  const totalCampaign = totalMonthly * (parseInt(duration) || 1);
  const totalInventoryItems = selectedPubs.reduce((sum, p) => 
    sum + ((p.inventory || []).filter(item => !item.isExcluded).length), 0);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumb
        rootLabel="Packages"
        rootIcon={PackageIcon}
        currentLabel="Create Package"
        onBackClick={onBack || (() => {})}
      />

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Filters and Publications */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Card */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Campaign Duration
                </Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Geography Filters */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Target Geography <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {GEOGRAPHY_OPTIONS.map((geo) => (
                    <label
                      key={geo.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                        selectedGeography.includes(geo.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGeography.includes(geo.id)}
                        onChange={() => handleGeographyToggle(geo.id)}
                        className="sr-only"
                      />
                      <span className="text-sm">{geo.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Channel Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Channels to Include
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((channel) => (
                    <label
                      key={channel.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                        selectedChannels.includes(channel.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.id)}
                        onChange={() => handleChannelToggle(channel.id)}
                        className="sr-only"
                      />
                      <span className="text-sm">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!selectedHubId && (
                <p className="text-sm text-center text-destructive mt-4">
                  Please select a hub to continue
                </p>
              )}

              <Separator />

              {/* Publications & Inventory - Integrated in same card */}
              {selectedHubId && (
                <div className="space-y-3">
                  <CardDescription className="font-sans text-sm text-foreground">
                    What publications would you like to include in your package?
                  </CardDescription>
                  
                  {loadingPublications && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                      <p className="text-sm text-destructive font-medium">Error loading publications:</p>
                      <p className="text-sm text-destructive mt-1">{error}</p>
                    </div>
                  )}
                  
                  {publications.length > 0 ? (
                    <>
                      {/* Check if any publications have inventory */}
                      {publications.every(pub => (pub.inventory || []).length === 0) ? (
                        <div className="text-center py-8 px-4">
                          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                            <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Inventory with Hub Pricing</h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                            {publications.length} publication{publications.length !== 1 ? 's' : ''} found, but none have pricing configured for this hub.
                          </p>
                          <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
                            <p className="text-sm font-medium text-foreground mb-2">To add inventory:</p>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                              <li>Go to <span className="font-medium">Inventory Manager</span></li>
                              <li>Select a publication</li>
                              <li>Enable pricing for this hub on each ad unit</li>
                            </ol>
                          </div>
                        </div>
                      ) : (
                      <>
                      {/* Select All */}
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <Checkbox
                            id="select-all"
                            checked={selectedPublications.length === publications.length}
                            onCheckedChange={handleSelectAllPublications}
                          />
                          <span className="font-medium font-sans">
                            Select All Publications 
                            <span className="text-muted-foreground ml-1">({publications.length} available)</span>
                          </span>
                        </label>
                        {selectedPublications.length > 0 && (
                          <Badge variant="default" className="px-2.5 py-0.5">
                            {selectedPublications.length} selected
                          </Badge>
                        )}
                      </div>

                      {/* Publication List */}
                      <div className="space-y-3">
                        {publications.map((pub) => {
                          const isSelected = selectedPublications.includes(pub.publicationId);
                          // Group by channel (keep all items for display, they'll be styled if excluded)
                          const inventoryByChannel = (pub.inventory || []).reduce((acc, item) => {
                            if (!item || !item.channel) return acc;
                            if (!acc[item.channel]) {
                              acc[item.channel] = [];
                            }
                            acc[item.channel].push(item);
                            return acc;
                          }, {} as Record<string, InventoryDisplay[]>);

                          return (
                            <Card 
                              key={pub.publicationId}
                              className={`transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-muted-foreground/30'}`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id={`pub-${pub.publicationId}`}
                                    checked={isSelected}
                                    onCheckedChange={() => handlePublicationToggle(pub.publicationId)}
                                    className="mt-0.5"
                                  />
                                  <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => togglePublicationExpand(pub.publicationId)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-base leading-none font-sans">
                                            {pub.basicInfo?.publicationName || pub.publicationName || 'Unknown Publication'}
                                          </h4>
                                          {isSelected && (
                                            <Badge variant="default" className="h-5 px-1.5 text-xs">
                                              Selected
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <PackageIcon className="h-3 w-3" />
                                            {(() => {
                                              const activeItems = (pub.inventory || []).filter(item => !item.isExcluded).length;
                                              const excludedItems = (pub.inventory || []).filter(item => item.isExcluded).length;
                                              return excludedItems > 0 
                                                ? `${activeItems} items (${excludedItems} excluded)`
                                                : `${activeItems} items`;
                                            })()}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Sparkles className="h-3 w-3" />
                                            {Object.keys(inventoryByChannel).length} channels
                                          </span>
                                        </div>
                                      </div>
                                      {pub.expanded ? (
                                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>

                        {pub.expanded && (
                          <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            {(pub.inventory || []).length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <p>No inventory with hub pricing for the selected channels.</p>
                                <p className="text-xs mt-2">Configure pricing in the Inventory Manager to include this publication.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {Object.entries(inventoryByChannel).map(([channel, items]) => {
                                  const channelTotal = items
                                    .filter(item => !item.isExcluded) // Exclude items marked as excluded
                                    .reduce((sum, item) => 
                                      sum + calculateItemCost(item as HubPackageInventoryItem, item.frequency || 1), 0
                                    );
                                  
                                  // Group items by source (e.g., newsletter name, radio show name)
                                  // Keep all items for display - they'll be styled if excluded
                                  const itemsBySource = items.reduce((acc, item) => {
                                    // Extract source name from item path (e.g., "Newsletter Name" from path)
                                    const pathParts = item.itemPath.split('.');
                                    let sourceName = 'Other';
                                    
                                    // For channels with arrays (newsletters, podcasts, radio shows), extract the name
                                    if (channel === 'newsletter' && pathParts.includes('newsletters')) {
                                      const idx = pathParts.indexOf('newsletters');
                                      sourceName = item.itemName.split(' - ')[0] || 'Newsletter';
                                    } else if (channel === 'radio' && pathParts.includes('shows')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Radio Show';
                                    } else if (channel === 'podcast' && pathParts.includes('podcasts')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Podcast';
                                    } else if (channel === 'social' && pathParts.includes('socialMedia')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Social Media';
                                    } else if (channel === 'streaming' && pathParts.includes('streamingVideo')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Streaming';
                                    } else if (channel === 'events' && pathParts.includes('events')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Event';
                                    } else if (channel === 'print' && pathParts.includes('print')) {
                                      sourceName = item.itemName.split(' - ')[0] || 'Print';
                                    } else {
                                      // For website and other flat structures
                                      sourceName = channel === 'website' ? 'Website Ads' : 'Ads';
                                    }
                                    
                                    if (!acc[sourceName]) {
                                      acc[sourceName] = [];
                                    }
                                    acc[sourceName].push(item);
                                    return acc;
                                  }, {} as Record<string, typeof items>);
                                  
                                  return (
                                    <div key={channel} className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="capitalize">
                                            {channel}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {items.length} {items.length === 1 ? 'Ad Slot' : 'Ad Slots'}
                                          </span>
                                        </div>
                                        <div className="text-sm font-semibold">
                                          {formatPrice(channelTotal)}/mo
                                        </div>
                                      </div>
                                      
                                      <div className="ml-4 space-y-3">
                                        {Object.entries(itemsBySource).map(([sourceName, sourceItems]) => {
                                          const sourceTotal = sourceItems
                                            .filter(item => !item.isExcluded) // Exclude items marked as excluded
                                            .reduce((sum, item) => 
                                              sum + calculateItemCost(item as HubPackageInventoryItem, item.frequency || 1), 0
                                            );
                                          
                                          return (
                                            <div key={sourceName} className="space-y-2">
                                              {/* Source header (Newsletter name, Radio show, etc.) */}
                                              {Object.keys(itemsBySource).length > 1 && (
                                                <div className="flex items-center justify-between p-2 bg-background rounded-md">
                                                  <div className="font-medium text-sm">{sourceName}</div>
                                                  <div className="text-xs font-semibold">{formatPrice(sourceTotal)}/mo</div>
                                                </div>
                                              )}
                                              
                                              {/* Ad Slots under this source */}
                                              <div className={Object.keys(itemsBySource).length > 1 ? "ml-3 space-y-2" : "space-y-2"}>
                                                {sourceItems.map((item, idx) => {
                                                  const isExcluded = item.isExcluded || false;
                                                  return (
                                                    <div 
                                                      key={`${item.itemPath}-${idx}`}
                                                      className={`flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-sm ${isExcluded ? 'opacity-30' : ''}`}
                                                    >
                                                      {/* Left Section: Item Name & Specs */}
                                                      <div className="flex-1 flex items-center gap-3 flex-wrap">
                                                        <span className={`font-medium ${isExcluded ? 'line-through' : ''}`}>
                                                          {Object.keys(itemsBySource).length > 1 
                                                            ? item.itemName.replace(sourceName + ' - ', '') 
                                                            : item.itemName
                                                          }
                                                        </span>
                                                        {isExcluded && (
                                                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                                                            Excluded
                                                          </Badge>
                                                        )}
                                                      {item.format && Object.keys(item.format).length > 0 && (
                                                        <>
                                                          {Object.entries(item.format)
                                                            .filter(([_, value]) => value)
                                                            .slice(0, 3)
                                                            .map(([key, value], specIdx) => (
                                                              <span key={specIdx} className="flex items-center gap-1 text-xs">
                                                                <span className="text-gray-400 font-light">{camelToTitleCase(key)}</span>
                                                                <span className="text-gray-700 font-normal">{value}</span>
                                                              </span>
                                                            ))}
                                                        </>
                                                      )}
                                                    </div>
                                                    
                                                    {/* Divider */}
                                                    <div className="h-8 w-px bg-gray-200"></div>
                                                    
                                                    {/* Right Section: Pricing & Frequency */}
                                                    <div className="flex items-center gap-4 text-xs">
                                                      <span className="text-muted-foreground">
                                                        {formatPrice(item.hubPrice)} / unit
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        {item.frequency}x per month
                                                      </span>
                                                    </div>
                                                  </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}
                                        
                                        {/* Channel Summary */}
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                                          <div className="text-sm font-medium">
                                            {channel.charAt(0).toUpperCase() + channel.slice(1)} Channel
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm text-muted-foreground">
                                              {items.length} {items.length === 1 ? 'Ad Slot' : 'Ad Slots'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                          );
                        })}
                      </div>
                    </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {loadingPublications ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading publications...
                        </div>
                      ) : (
                        'No publications found. Try adjusting your filters.'
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Build - Always Visible */}
        <Card className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start border-primary/20 bg-gradient-to-b from-primary/5 to-background">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
              <Target className="h-4 w-4" />
              Package Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {selectedPublications.length > 0 ? (
              <>
                {/* Compact Stats Grid */}
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outlets</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{selectedPublications.length}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Channels</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {[...new Set(selectedPubs.flatMap(p => (p.inventory || []).map(i => i.channel)))].length}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad Slots</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{totalInventoryItems}</div>
                  </div>
                </div>

                <Button
                  onClick={handleBuildPackage}
                  disabled={loading || selectedPublications.length === 0}
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Building Package...
                    </>
                  ) : (
                    <>
                      <PackageIcon className="mr-2 h-5 w-5" />
                      Build Package
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Select publications to see package summary</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

