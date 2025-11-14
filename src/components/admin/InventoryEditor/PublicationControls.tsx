/**
 * Publication Controls Component
 * 
 * Provides publication-level pruning/scaling controls inspired by LLM's pruning process.
 * Allows users to scale entire publications up/down to manage costs.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  X,
  Info
} from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import {
  scalePublication,
  validatePublicationConstraints,
  calculatePublicationTotal
} from '@/utils/inventoryPricing';
import { getFrequencyUnit, formatFrequency } from '@/utils/frequencyLabels';
import { formatCampaignTotal, getRateInfo } from '@/utils/durationFormatting';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PublicationControlsProps {
  publication: HubPackagePublication;
  originalPublication?: HubPackagePublication; // For restore functionality
  totalBudget?: number;
  constraints?: {
    minPublicationSpend?: number;
    maxPublicationPercent?: number;
  };
  onChange: (publication: HubPackagePublication) => void;
  onRemove?: () => void;
  durationMonths?: number;
}

export function PublicationControls({
  publication,
  originalPublication,
  totalBudget,
  constraints = { minPublicationSpend: 500, maxPublicationPercent: 0.25 },
  onChange,
  onRemove,
  durationMonths = 1
}: PublicationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleValue, setScaleValue] = useState(100); // 100% = no change
  const [baseline, setBaseline] = useState<HubPackagePublication>(publication); // Store baseline for scaling
  
  // Initialize baseline on first mount or when original changes
  useEffect(() => {
    if (originalPublication) {
      setBaseline(originalPublication);
      setScaleValue(100);
    }
  }, [originalPublication]);
  
  // Reset scale to 100% when publication ID changes (different publication loaded)
  useEffect(() => {
    setScaleValue(100);
    setBaseline(publication);
  }, [publication.publicationId]);

  // Calculate current stats
  const monthlyCost = publication.publicationTotal || calculatePublicationTotal(publication, 1); // Always calculate monthly
  const campaignTotal = monthlyCost * durationMonths;
  const itemCount = publication.inventoryItems?.length || 0;
  const channels = new Set(publication.inventoryItems?.map(item => item.channel) || []);
  
  // Format cost with duration context
  const costDisplay = formatCampaignTotal(monthlyCost, durationMonths);
  const rateInfo = getRateInfo(monthlyCost, durationMonths);
  
  // Calculate percentage of total budget (use monthly for comparison)
  const percentOfBudget = totalBudget && totalBudget > 0 
    ? (monthlyCost / totalBudget) * 100 
    : 0;

  // Build calculation breakdown for tooltip
  const getCalculationBreakdown = () => {
    if (!publication.inventoryItems) return '';
    
    return publication.inventoryItems.map((item, idx) => {
      const freq = item.currentFrequency || item.quantity || 1;
      const price = item.itemPricing?.hubPrice || 0;
      const model = item.itemPricing?.pricingModel || 'flat';
      let formula = '';
      
      const unit = getFrequencyUnit(model);
      
      switch (model) {
        case 'cpm':
          // For CPM, we need to show the actual calculation
          // The monthlyCost is the actual calculated value
          const actualMonthlyCost = item.monthlyCost || (freq * price);
          
          // Try to reverse-engineer the impressions from the actual cost
          // actualCost = (impressions / 1000) × CPM, so impressions = (actualCost / CPM) × 1000
          const actualImpressions = (actualMonthlyCost / price) * 1000;
          
          // Show specifications impressions if available, otherwise show calculated
          const displayImpressions = item.specifications?.impressions || actualImpressions;
          
          formula = `(${Math.round(displayImpressions).toLocaleString()} impressions ÷ 1,000) × $${price} CPM = $${actualMonthlyCost.toFixed(2)}`;
          break;
        case 'per_week':
          formula = `${freq} ${unit} × $${price} × 4.33 weeks/mo = $${(freq * price * 4.33).toFixed(2)}`;
          break;
        case 'per_day':
          formula = `${freq} ${unit} × $${price} × 30 days/mo = $${(freq * price * 30).toFixed(2)}`;
          break;
        case 'flat':
        case 'monthly':
          formula = freq === 1 ? `$${price} (one-time)` : `$${price} × ${freq} = $${(price * freq).toFixed(2)}`;
          break;
        default: // per_send, per_ad, per_post, etc.
          formula = `${freq} ${unit} × $${price} = $${(freq * price).toFixed(2)}`;
      }
      
      return `${idx + 1}. ${item.itemName}: ${formula}`;
    }).join('\n');
  };

  // Validate against constraints
  const validation = totalBudget
    ? validatePublicationConstraints(publication, constraints, totalBudget)
    : { valid: true, warnings: [], belowMinimum: false, aboveMaximum: false };

  // Handle scale change - always scale from baseline
  const handleScaleChange = (value: number[]) => {
    const newScale = value[0];
    setScaleValue(newScale);
    
    // Apply scale factor (convert percentage to decimal) FROM BASELINE
    const scaleFactor = newScale / 100;
    const scaledPublication = scalePublication(baseline, scaleFactor, durationMonths);
    onChange(scaledPublication);
  };

  // Quick action handlers - always scale from baseline
  const handleQuickScale = (factor: number) => {
    const scaledPublication = scalePublication(baseline, factor, durationMonths);
    setScaleValue(factor * 100);
    onChange(scaledPublication);
  };

  const handleRestore = () => {
    if (originalPublication) {
      setScaleValue(100);
      onChange(originalPublication);
    }
  };

  // Get color for budget percentage
  const getBudgetColor = () => {
    if (!totalBudget) return 'text-foreground';
    if (validation.aboveMaximum) return 'text-red-600';
    if (percentOfBudget > 20) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                {publication.publicationName || 'Unknown Publication'}
              </CardTitle>
              {publication.publicationFrequencyType && (
                <Badge variant="outline" className="text-xs">
                  {publication.publicationFrequencyType}
                </Badge>
              )}
            </div>
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{itemCount} items</span>
                <span>{channels.size} channels</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`font-bold ${getBudgetColor()} cursor-help border-b border-dashed text-lg`}>
                        {costDisplay.main}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <div className="space-y-1 text-xs font-mono whitespace-pre-line">
                        <p className="font-bold text-sm mb-2">Cost Breakdown:</p>
                        {getCalculationBreakdown()}
                        <div className="pt-2 mt-2 border-t font-bold">
                          Monthly: ${monthlyCost.toFixed(2)}/mo
                        </div>
                        <div className="font-bold">
                          Campaign Total: ${campaignTotal.toFixed(2)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {totalBudget && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`${getBudgetColor()} cursor-help border-b border-dashed text-xs`}>
                          {percentOfBudget.toFixed(1)}% of monthly budget
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">Budget Calculation:</p>
                          <p className="font-mono">${monthlyCost.toFixed(2)} ÷ ${totalBudget.toFixed(2)} × 100</p>
                          <p className="font-mono">= {percentOfBudget.toFixed(2)}%</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {costDisplay.subtitle && (
                <div className="text-xs text-muted-foreground">
                  {costDisplay.subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Remove publication"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Validation warnings */}
        {validation.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              {validation.warnings.map((warning, idx) => (
                <p key={idx}>{warning}</p>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Scale Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1">
                Volume Scale
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Scale all inventory items in this publication proportionally.
                        50% = half frequency, 150% = 50% more.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <span className="text-sm font-semibold">{scaleValue}%</span>
            </div>
            <Slider
              value={[scaleValue]}
              onValueChange={handleScaleChange}
              min={25}
              max={150}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25%</span>
              <span>50%</span>
              <span>100%</span>
              <span>125%</span>
              <span>150%</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Actions</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickScale(0.5)}
                className="text-xs"
              >
                <TrendingDown className="mr-1 h-3 w-3" />
                Cut in Half (50%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickScale(0.25)}
                className="text-xs"
              >
                <TrendingDown className="mr-1 h-3 w-3" />
                Quarter (25%)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickScale(1.0)}
                className="text-xs"
                disabled={scaleValue === 100}
              >
                <TrendingUp className="mr-1 h-3 w-3" />
                Standard (100%)
              </Button>
              {originalPublication && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  className="text-xs"
                  disabled={scaleValue === 100}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Restore Original
                </Button>
              )}
            </div>
          </div>

          {/* Channel Breakdown */}
          {channels.size > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Channels</label>
              <div className="flex flex-wrap gap-1">
                {Array.from(channels).map(channel => (
                  <Badge key={channel} variant="secondary" className="text-xs capitalize">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Cost Formula Breakdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cost Calculations {scaleValue !== 100 && <span className="text-blue-600">({scaleValue}% scale applied)</span>}</label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-xs font-mono">
              {publication.inventoryItems?.map((item, idx) => {
                const freq = item.currentFrequency || item.quantity || 1;
                const price = item.itemPricing?.hubPrice || 0;
                const model = item.itemPricing?.pricingModel || 'flat';
                const itemCost = item.monthlyCost || (freq * price);
                const unit = getFrequencyUnit(model);
                
                // Get baseline for comparison
                const baselineItem = baseline.inventoryItems?.[idx];
                const baselineFreq = baselineItem?.currentFrequency || baselineItem?.quantity || 1;
                const baselineImpressions = baselineItem?.specifications?.impressions;
                const currentImpressions = item.specifications?.impressions;
                
                let formula = '';
                let showChange = scaleValue !== 100;
                
                switch (model) {
                  case 'cpm':
                    // Use actual monthly cost to calculate impressions
                    const actualImpressions = (itemCost / price) * 1000;
                    const displayImpressions = item.specifications?.impressions || actualImpressions;
                    formula = `(${Math.round(displayImpressions).toLocaleString()} / 1,000) × $${price}`;
                    
                    if (showChange && baselineImpressions) {
                      // Calculate baseline impressions from baseline cost if needed
                      const baselineItem = baseline.inventoryItems?.[idx];
                      const baselineCost = baselineItem?.monthlyCost || (baselineFreq * price);
                      const calcBaselineImpr = (baselineCost / price) * 1000;
                      const displayBaselineImpr = baselineImpressions || calcBaselineImpr;
                      formula += ` [was ${Math.round(displayBaselineImpr).toLocaleString()}]`;
                    }
                    break;
                  case 'per_week':
                    formula = `${freq} ${unit} × $${price} × 4.33`;
                    if (showChange) formula += ` [was ${baselineFreq} ${unit}]`;
                    break;
                  case 'per_day':
                    formula = `${freq} ${unit} × $${price} × 30`;
                    if (showChange) formula += ` [was ${baselineFreq} ${unit}]`;
                    break;
                  case 'flat':
                  case 'monthly':
                    formula = freq === 1 ? `$${price} (one-time)` : `$${price} × ${freq}`;
                    if (showChange && freq > 1) formula += ` [was ${baselineFreq}]`;
                    break;
                  default:
                    formula = `${freq} ${unit} × $${price}`;
                    if (showChange) formula += ` [was ${baselineFreq} ${unit}]`;
                }
                
                return (
                  <div key={idx} className="flex justify-between items-start pb-1 border-b border-blue-200 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-0.5">{item.itemName}</p>
                      <p className="text-blue-700">
                        <span className="text-blue-600 font-semibold">{model}</span>: {formula}
                      </p>
                    </div>
                    <p className="font-bold text-blue-900">${itemCost.toFixed(2)}</p>
                  </div>
                );
              })}
              <div className="pt-2 border-t-2 border-blue-300 space-y-1">
                <div className="flex justify-between items-center font-bold text-sm">
                  <span className="text-blue-900">Monthly Rate:</span>
                  <span className="text-blue-900">${monthlyCost.toFixed(2)}/mo</span>
                </div>
                {durationMonths !== 1 && (
                  <div className="flex justify-between items-center font-bold text-base">
                    <span className="text-blue-900">Campaign Total ({durationMonths} {durationMonths === 1 ? 'month' : durationMonths < 1 ? `weeks` : 'months'}):</span>
                    <span className="text-green-600">${campaignTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

