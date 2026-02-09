import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { HubPackageInventoryItem, PublicationFrequencyType } from '@/integrations/mongodb/hubPackageSchema';
import {
  getFrequencyOptionsWithLabels,
  isAtMaxFrequency
} from '@/utils/frequencyEngine';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { getFrequencyLabel, getFrequencyUnit } from '@/utils/frequencyLabels';
import { formatInsertionOrderAudience } from '@/utils/insertionOrderFormatting';

interface LineItemEditorProps {
  item: HubPackageInventoryItem;
  publicationId: number;
  itemIndex: number;
  onFrequencyChange: (pubId: number, itemIndex: number, newFrequency: number) => void;
  compact?: boolean; // For inline table display vs expanded card
  showFormula?: boolean; // Show cost calculation breakdown
}

export function LineItemEditor({
  item,
  publicationId,
  itemIndex,
  onFrequencyChange,
  compact = true,
  showFormula = false
}: LineItemEditorProps) {
  const [showFormulaLocal, setShowFormulaLocal] = useState(showFormula);
  
  const frequency = item.currentFrequency || item.quantity || 1;
  const unitPrice = item.itemPricing?.hubPrice || 0;
  const pricingModel = item.itemPricing?.pricingModel || 'flat';
  const monthlyCost = calculateItemCost(item, frequency);
  const publicationType = item.publicationFrequencyType || 'custom';
  
  // Determine if frequency should be adjustable based on pricing model
  const fixedFrequencyModels = ['monthly', 'flat'];
  const isFrequencyLocked = fixedFrequencyModels.includes(pricingModel);
  const isImpressionBased = ['cpm', 'cpv', 'cpc'].includes(pricingModel);
  
  // Build frequency options based on pricing model
  let frequencyOptions: Array<{value: number, label: string}> = [];
  if (!isFrequencyLocked && !isImpressionBased) {
    if (pricingModel === 'per_week') {
      frequencyOptions = [
        { value: 4, label: '4 weeks (full month)' },
        { value: 3, label: '3 weeks' },
        { value: 2, label: '2 weeks' },
        { value: 1, label: '1 week' }
      ];
    } else if (pricingModel === 'per_day') {
      frequencyOptions = [
        { value: 30, label: '30 days (full month)' },
        { value: 20, label: '20 days' },
        { value: 15, label: '15 days' },
        { value: 10, label: '10 days' },
        { value: 5, label: '5 days' },
        { value: 1, label: '1 day' }
      ];
    } else if (pricingModel === 'per_spot') {
      frequencyOptions = [
        { value: 30, label: '30 spots/month (daily)' },
        { value: 22, label: '22 spots/month (weekdays)' },
        { value: 17, label: '17 spots/month (4x/week)' },
        { value: 15, label: '15 spots/month' },
        { value: 13, label: '13 spots/month (3x/week)' },
        { value: 9, label: '9 spots/month (2x/week)' },
        { value: 7, label: '7 spots/month' },
        { value: 5, label: '5 spots/month' },
        { value: 4, label: '4 spots/month (weekly)' },
        { value: 3, label: '3 spots/month' },
        { value: 2, label: '2 spots/month (bi-weekly)' },
        { value: 1, label: '1 spot/month' }
      ];
    } else {
      frequencyOptions = getFrequencyOptionsWithLabels(publicationType);
    }
  }
  
  const atMax = isAtMaxFrequency(frequency, publicationType);

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

  // Render frequency control
  const renderFrequencyControl = () => {
    // For impression-based pricing (CPM/CPV/CPC), show percentage selector
    if (isImpressionBased && (item as any).monthlyImpressions) {
      const totalImpressions = (item as any).monthlyImpressions;
      const selectedImpressions = Math.round((totalImpressions * frequency) / 100);
      
      // Format large numbers compactly (e.g., 10.5M, 105K)
      const formatCompact = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toLocaleString();
      };
      
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={frequency.toString()}
            onValueChange={(value) => onFrequencyChange(publicationId, itemIndex, parseInt(value))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1%</SelectItem>
              <SelectItem value="2">2%</SelectItem>
              <SelectItem value="3">3%</SelectItem>
              <SelectItem value="4">4%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
              <SelectItem value="15">15%</SelectItem>
              <SelectItem value="20">20%</SelectItem>
              <SelectItem value="25">25%</SelectItem>
              <SelectItem value="30">30%</SelectItem>
              <SelectItem value="35">35%</SelectItem>
              <SelectItem value="40">40%</SelectItem>
              <SelectItem value="45">45%</SelectItem>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="55">55%</SelectItem>
              <SelectItem value="60">60%</SelectItem>
              <SelectItem value="65">65%</SelectItem>
              <SelectItem value="70">70%</SelectItem>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="80">80%</SelectItem>
              <SelectItem value="85">85%</SelectItem>
              <SelectItem value="90">90%</SelectItem>
              <SelectItem value="95">95%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            ({formatCompact(selectedImpressions)} of {formatCompact(totalImpressions)})
          </span>
        </div>
      );
    }
    
    // Standard frequency control
    if (!isFrequencyLocked && frequencyOptions.length > 1) {
      return (
        <Select
          value={frequency.toString()}
          onValueChange={(value) => onFrequencyChange(publicationId, itemIndex, parseInt(value))}
        >
          <SelectTrigger className="h-8 w-40">
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
      );
    }
    
    // Locked frequency display
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>{getFrequencyLabel(frequency, pricingModel)}</span>
        {isFrequencyLocked && (
          <AlertCircle className="h-3 w-3" title="Fixed monthly rate" />
        )}
      </div>
    );
  };

  // Render cost formula
  const renderCostFormula = () => {
    const unit = getFrequencyUnit(pricingModel);
    const totalImpressions = (item as any).monthlyImpressions;
    
    let formula = '';
    switch (pricingModel) {
      case 'cpm':
        if (totalImpressions) {
          const purchasedImpressions = Math.round((totalImpressions * frequency) / 100);
          formula = `(${purchasedImpressions.toLocaleString()} impressions [${frequency}%] ÷ 1,000) × $${unitPrice} CPM = $${monthlyCost.toFixed(2)}`;
        } else {
          formula = `$${unitPrice} CPM × ${frequency}% = $${monthlyCost.toFixed(2)}`;
        }
        break;
      case 'cpv':
        if (totalImpressions) {
          const purchasedViews = Math.round((totalImpressions * frequency) / 100);
          formula = `(${purchasedViews.toLocaleString()} views [${frequency}%] ÷ 100) × $${unitPrice} CPV = $${monthlyCost.toFixed(2)}`;
        } else {
          formula = `$${unitPrice} CPV × ${frequency}% = $${monthlyCost.toFixed(2)}`;
        }
        break;
      case 'cpc':
        if (totalImpressions) {
          const purchasedImpressions = Math.round((totalImpressions * frequency) / 100);
          const estimatedClicks = Math.round(purchasedImpressions * 0.01);
          formula = `${estimatedClicks.toLocaleString()} clicks [${frequency}% × 1% CTR] × $${unitPrice} CPC = $${monthlyCost.toFixed(2)}`;
        } else {
          formula = `$${unitPrice} CPC × ${frequency}% = $${monthlyCost.toFixed(2)}`;
        }
        break;
      case 'per_week':
        formula = `$${unitPrice}/week × ${frequency} weeks/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'per_day':
        formula = `$${unitPrice}/day × ${frequency} days/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'per_spot':
        formula = `$${unitPrice}/spot × ${frequency} spots/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'per_send':
        formula = `$${unitPrice}/send × ${frequency} sends/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'per_post':
        formula = `$${unitPrice}/post × ${frequency} posts/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'per_episode':
        formula = `$${unitPrice}/episode × ${frequency} episodes/month = $${monthlyCost.toFixed(2)}`;
        break;
      case 'flat':
      case 'monthly':
        formula = `$${unitPrice}/month`;
        break;
      default:
        formula = `${frequency} ${unit} × $${unitPrice} = $${monthlyCost.toFixed(2)}`;
    }
    
    return (
      <div className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1 font-mono text-blue-900">
        {formula}
      </div>
    );
  };

  // Compact inline display for table rows
  if (compact) {
    const isExcluded = item.isExcluded || false;
    
    return (
      <div className={`flex items-start justify-between p-3 rounded-lg border group hover:border-primary/50 transition-colors ${isExcluded ? 'bg-background opacity-80' : 'bg-[#eaeaea]'}`}>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isExcluded ? 'line-through' : ''}`}>
              {item.itemName}
            </span>
            {isExcluded && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                Excluded
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {item.channel}
            </Badge>
            {getPublicationFrequencyLabel(item.publicationFrequencyType, item.frequency) && (
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                {getPublicationFrequencyLabel(item.publicationFrequencyType, item.frequency)}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {getPricingModelLabel(pricingModel)}
            </Badge>
            {(item as any).sourceName && (
              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                {(item as any).sourceName}
              </Badge>
            )}
          </div>
          
{/* Format details hidden for cleaner display */}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>${unitPrice.toFixed(2)} / unit</span>
            <span>•</span>
            <span>{formatInsertionOrderAudience(item, (item as any).performanceMetrics, (item as any).audienceMetrics)}</span>
            {!isFrequencyLocked && atMax && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-3 w-3" />
                Max frequency
              </div>
            )}
          </div>
          
          {showFormulaLocal && (
            <div className="mt-2">
              {renderCostFormula()}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          {renderFrequencyControl()}
          <div className="text-right min-w-[80px]">
            <div className="font-bold text-sm">${monthlyCost.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">/month</div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded card display (not used initially but available)
  const isExcluded = item.isExcluded || false;
  
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isExcluded ? 'opacity-80' : 'bg-[#eaeaea]'}`}>
      {/* Item Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`font-medium ${isExcluded ? 'line-through' : ''}`}>{item.itemName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isExcluded && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                Excluded
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {item.channel}
            </Badge>
            {getPublicationFrequencyLabel(item.publicationFrequencyType, item.frequency) && (
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                {getPublicationFrequencyLabel(item.publicationFrequencyType, item.frequency)}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {getPricingModelLabel(pricingModel)}
            </Badge>
            {(item as any).sourceName && (
              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                {(item as any).sourceName}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              ${unitPrice.toFixed(2)} / unit • {formatInsertionOrderAudience(item, (item as any).performanceMetrics, (item as any).audienceMetrics)}
            </span>
          </div>
        </div>
      </div>

      {/* Frequency/Impression Control */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {isImpressionBased ? 'Impression Coverage' : 'Frequency'}
          </label>
          {renderFrequencyControl()}
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

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Monthly Cost</label>
          <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
            <span className="text-sm font-semibold">${monthlyCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Cost Formula */}
      <div className="pt-2 border-t">
        <label className="text-xs text-muted-foreground mb-1 block">Cost Calculation</label>
        {renderCostFormula()}
      </div>

{/* Format specifications hidden for cleaner display */}
    </div>
  );
}

