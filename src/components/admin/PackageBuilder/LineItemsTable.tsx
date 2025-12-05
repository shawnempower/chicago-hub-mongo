import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HubPackageInventoryItem, PublicationFrequencyType } from '@/integrations/mongodb/hubPackageSchema';
import {
  getFrequencyOptionsWithLabels,
  isAtMaxFrequency
} from '@/utils/frequencyEngine';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { getFrequencyLabel } from '@/utils/frequencyLabels';
import { formatInsertionOrderAudience } from '@/utils/insertionOrderFormatting';

interface LineItemsTableProps {
  title: string; // e.g., "Website", "Newsletter", or publication name
  items: HubPackageInventoryItem[];
  publicationId: number;
  onFrequencyChange: (pubId: number, itemIndex: number, newFrequency: number) => void;
  onToggleExclude?: (pubId: number, itemIndex: number) => void;
  defaultExpanded?: boolean;
  totalCost: number;
}

export function LineItemsTable({
  title,
  items,
  publicationId,
  onFrequencyChange,
  onToggleExclude,
  defaultExpanded = true,
  totalCost
}: LineItemsTableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Calculate excluded items count
  const excludedCount = items.filter(item => item.isExcluded).length;
  const activeCount = items.length - excludedCount;

  // Convert camelCase to Title Case
  const camelToTitleCase = (str: string): string => {
    // Handle special cases
    const specialCases: Record<string, string> = {
      'fileSize': 'File Size',
      'thirdPartyTags': 'Third Party Tags',
      'adFormat': 'Ad Format',
      'bitrate': 'Bitrate',
      'duration': 'Duration',
      'format': 'Format',
      'placement': 'Placement',
      'size': 'Size'
    };
    
    if (specialCases[str]) {
      return specialCases[str];
    }
    
    // Default conversion: insert space before capital letters
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  // Get pricing model display label
  const getPricingModelLabel = (model: string) => {
    const labels: Record<string, string> = {
      'flat': 'Flat Rate',
      'monthly': 'Monthly',
      'per_week': 'Per Week',
      'per_day': 'Per Day',
      'per_send': 'Per Send',
      'per_spot': 'Per Spot',
      'per_post': 'Per Post',
      'per_ad': 'Per Ad',
      'per_episode': 'Per Episode',
      'per_story': 'Per Story',
      'cpm': 'CPM',
      'cpv': 'CPV',
      'cpc': 'CPC',
      'cpd': 'CPD'
    };
    return labels[model] || model.toUpperCase();
  };

  // Get publication frequency label
  const getPublicationFrequencyLabel = (type?: PublicationFrequencyType, frequency?: string) => {
    // Prefer the frequency string if available (more specific)
    if (frequency && frequency !== 'custom') {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
    // Fall back to publicationFrequencyType
    if (type && type !== 'custom') {
      return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
    }
    return null;
  };

  // Build frequency options based on pricing model
  const getFrequencyOptions = (item: HubPackageInventoryItem) => {
    const pricingModel = item.itemPricing?.pricingModel || 'flat';
    const publicationType = item.publicationFrequencyType || 'custom';
    
    if (pricingModel === 'per_week') {
      return [
        { value: 4, label: '4 weeks' },
        { value: 3, label: '3 weeks' },
        { value: 2, label: '2 weeks' },
        { value: 1, label: '1 week' }
      ];
    } else if (pricingModel === 'per_day') {
      return [
        { value: 30, label: '30 days' },
        { value: 20, label: '20 days' },
        { value: 15, label: '15 days' },
        { value: 10, label: '10 days' },
        { value: 5, label: '5 days' },
        { value: 1, label: '1 day' }
      ];
    } else if (pricingModel === 'per_spot') {
      return [
        { value: 30, label: '30 spots/mo' },
        { value: 22, label: '22 spots/mo' },
        { value: 17, label: '17 spots/mo' },
        { value: 13, label: '13 spots/mo' },
        { value: 9, label: '9 spots/mo' },
        { value: 4, label: '4 spots/mo' },
        { value: 2, label: '2 spots/mo' },
        { value: 1, label: '1 spot/mo' }
      ];
    } else {
      return getFrequencyOptionsWithLabels(publicationType);
    }
  };

  const renderFrequencyControl = (item: HubPackageInventoryItem, itemIndex: number) => {
    const frequency = item.currentFrequency || item.quantity || 1;
    const pricingModel = item.itemPricing?.pricingModel || 'flat';
    const publicationType = item.publicationFrequencyType || 'custom';
    
    const fixedFrequencyModels = ['monthly', 'flat'];
    const isFrequencyLocked = fixedFrequencyModels.includes(pricingModel);
    const isImpressionBased = ['cpm', 'cpv', 'cpc'].includes(pricingModel);
    
    // Calculate if at max frequency
    const atMax = isAtMaxFrequency(frequency, publicationType);
    
    // For impression-based pricing
    if (isImpressionBased && (item as any).monthlyImpressions) {
      return (
        <div className="space-y-1">
          <Select
            value={frequency.toString()}
            onValueChange={(value) => onFrequencyChange(publicationId, itemIndex, parseInt(value))}
          >
            <SelectTrigger className="w-32 border-0 bg-transparent shadow-none hover:bg-gray-100 data-[state=open]:border data-[state=open]:bg-background data-[state=open]:shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25% of impressions</SelectItem>
              <SelectItem value="50">50% of impressions</SelectItem>
              <SelectItem value="75">75% of impressions</SelectItem>
              <SelectItem value="100">100% of impressions</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {Math.round(((item as any).monthlyImpressions * frequency) / 100).toLocaleString()} impressions/mo
          </p>
        </div>
      );
    }
    
    // Standard frequency control
    const frequencyOptions = getFrequencyOptions(item);
    
    return (
      <div className="space-y-1">
        {!isFrequencyLocked && frequencyOptions.length > 1 ? (
          <Select
            value={frequency.toString()}
            onValueChange={(value) => onFrequencyChange(publicationId, itemIndex, parseInt(value))}
          >
            <SelectTrigger className="w-40 border-0 bg-transparent shadow-none hover:bg-gray-100 data-[state=open]:border data-[state=open]:bg-background data-[state=open]:shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label || getFrequencyLabel(opt.value, pricingModel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
            <span className="text-sm">{getFrequencyLabel(frequency, pricingModel)}</span>
          </div>
        )}
        {isFrequencyLocked && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Fixed monthly rate
          </div>
        )}
        {!isFrequencyLocked && atMax && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Max frequency for {publicationType} publication
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <table className="w-full">
        <thead>
          {/* Top Header with Title and Controls */}
          <tr style={{ backgroundColor: '#FAFAFA' }} className="border-b">
            <td colSpan={6} className="px-4 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{title}</span>
                  <span className="text-xs font-light text-gray-400">
                    {activeCount} {activeCount === 1 ? 'Ad Slot' : 'Ad Slots'}
                    {excludedCount > 0 && ` (${excludedCount} excluded)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    ${totalCost.toLocaleString()}/mo
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 px-2 hover:bg-gray-200 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((item, itemIndex) => {
            if (!isExpanded) return null;
            
            const frequency = item.currentFrequency || item.quantity || 1;
            const unitPrice = item.itemPricing?.hubPrice || 0;
            const pricingModel = item.itemPricing?.pricingModel || 'flat';
            const monthlyCost = calculateItemCost(item, frequency);
            
            const isExcluded = item.isExcluded || false;
            
            return (
              <tr 
                key={item.itemPath || itemIndex} 
                className={`border-t hover:bg-gray-50 ${isExcluded ? 'opacity-30' : ''}`}
              >
                {/* Item Name & Non-Pricing Specs */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Item Name */}
                    <span className={`font-normal text-sm ${isExcluded ? 'line-through' : ''}`}>
                      {item.itemName}
                    </span>
                    
                    {/* Excluded Badge */}
                    {isExcluded && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                        Excluded
                      </Badge>
                    )}
                    
                    {/* Source Name Badge */}
                    {(item as any).sourceName && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        {(item as any).sourceName}
                      </Badge>
                    )}
                    
                    {/* Original Frequency Badge (e.g., "Show: weekly") */}
                    {(item as any).originalFrequency && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        Show: {(item as any).originalFrequency}
                      </Badge>
                    )}
                    
                    {/* Non-Pricing Specifications */}
                    {item.format && Object.keys(item.format).length > 0 && (
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {Object.entries(item.format)
                          .filter(([key, value]) => value)
                          .map(([key, value], idx) => (
                            <span key={idx} className="flex items-center gap-1">
                              <span className="text-gray-400 font-light">{camelToTitleCase(key)}</span>
                              <span className="text-gray-700 font-normal">{value}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Pricing Info */}
                <td className="px-4 py-3 border-l border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {getPricingModelLabel(pricingModel)}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-normal">
                      ${unitPrice.toFixed(2)} / unit
                    </span>
                  </div>
                </td>
                
                {/* Frequency Control */}
                <td className="px-4 py-3 w-48">
                  {renderFrequencyControl(item, itemIndex)}
                </td>
                
                {/* Audience */}
                <td className="px-4 py-3 w-48">
                  <div className="text-xs text-muted-foreground">
                    {formatInsertionOrderAudience(item, (item as any).performanceMetrics, (item as any).audienceMetrics)}
                  </div>
                </td>
                
                {/* Monthly Cost */}
                <td className="px-4 py-3 text-right w-32">
                  <div className="text-sm font-medium">
                    ${monthlyCost.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal">
                    /month
                  </div>
                </td>
                
                {/* Actions */}
                <td className="px-4 py-3 w-12">
                  {onToggleExclude && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleExclude(publicationId, itemIndex)}
                            className="h-8 w-8 p-0 hover:bg-gray-200"
                          >
                            {isExcluded ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-600" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isExcluded ? 'Include in package' : 'Exclude from package'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

