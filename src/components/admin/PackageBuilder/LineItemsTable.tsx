import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';
import {
  getFrequencyOptionsWithLabels,
  isAtMaxFrequency
} from '@/utils/frequencyEngine';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { getFrequencyLabel } from '@/utils/frequencyLabels';

interface LineItemsTableProps {
  title: string; // e.g., "Website", "Newsletter", or publication name
  items: HubPackageInventoryItem[];
  publicationId: number;
  onFrequencyChange: (pubId: number, itemIndex: number, newFrequency: number) => void;
  defaultExpanded?: boolean;
  totalCost: number;
}

export function LineItemsTable({
  title,
  items,
  publicationId,
  onFrequencyChange,
  defaultExpanded = true,
  totalCost
}: LineItemsTableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
            <td colSpan={5} className="px-4 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{title}</span>
                  <span className="text-xs font-light text-gray-400">
                    {items.length} {items.length === 1 ? 'Ad Slot' : 'Ad Slots'}
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
            
            return (
              <tr key={item.itemPath || itemIndex} className="border-t hover:bg-gray-50">
                {/* Item Name & Non-Pricing Specs */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Item Name */}
                    <span className="font-normal text-sm">{item.itemName}</span>
                    
                    {/* Source Name Badge */}
                    {(item as any).sourceName && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        {(item as any).sourceName}
                      </Badge>
                    )}
                    
                    {/* Non-Pricing Specifications */}
                    {item.specifications && Object.keys(item.specifications).length > 0 && (
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {Object.entries(item.specifications)
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
                  <div className="flex items-center gap-3 flex-wrap">
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
                
                {/* Monthly Cost */}
                <td className="px-4 py-3 text-right w-32">
                  <div className="text-sm font-medium">
                    ${monthlyCost.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal">
                    /month
                  </div>
                </td>
                
                {/* Actions placeholder for consistency */}
                <td className="px-4 py-3 w-12">
                  {/* Could add delete button here if needed */}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

