/**
 * Channel Controls Component
 * 
 * Provides channel-level scaling controls to adjust all inventory items
 * of a specific channel type across all publications.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  X,
  Info
} from 'lucide-react';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { formatCampaignTotal, getRateInfo } from '@/utils/durationFormatting';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChannelControlsProps {
  channel: string;
  channelCost: number;
  publications: HubPackagePublication[];
  originalPublications: HubPackagePublication[];
  totalBudget?: number;
  onChange: (publications: HubPackagePublication[]) => void;
  onRemove?: () => void;
  durationMonths?: number;
}

export function ChannelControls({
  channel,
  channelCost,
  publications,
  originalPublications,
  totalBudget,
  onChange,
  onRemove,
  durationMonths = 1
}: ChannelControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleValue, setScaleValue] = useState(100);

  // Calculate channel stats
  const channelPubs = publications.filter(p =>
    p.inventoryItems?.some(item => item.channel === channel)
  );
  
  const channelUnits = publications.reduce((sum, pub) => {
    return sum + (pub.inventoryItems?.filter(item => item.channel === channel)
      .reduce((s, item) => s + (item.currentFrequency || item.quantity || 1), 0) || 0);
  }, 0);

  // channelCost is monthly, calculate campaign total
  const monthlyCost = channelCost;
  const campaignTotal = monthlyCost * durationMonths;
  const costDisplay = formatCampaignTotal(monthlyCost, durationMonths);

  const percentOfBudget = totalBudget && totalBudget > 0 
    ? (monthlyCost / totalBudget) * 100 
    : 0;

  // Get baseline for comparison
  const baselineChannelUnits = originalPublications.reduce((sum, pub) => {
    return sum + (pub.inventoryItems?.filter(item => item.channel === channel)
      .reduce((s, item) => s + (item.currentFrequency || item.quantity || 1), 0) || 0);
  }, 0);

  const baselineChannelCost = originalPublications.reduce((sum, pub) => {
    return sum + (pub.inventoryItems?.filter(item => item.channel === channel)
      .reduce((s, item) => s + (item.monthlyCost || 0), 0) || 0);
  }, 0);

  // Handle scale change
  const handleScaleChange = (value: number[]) => {
    const newScale = value[0];
    setScaleValue(newScale);
    
    // Import the scaleChannel function dynamically to avoid circular deps
    import('@/utils/inventoryPricing').then(({ scaleChannel }) => {
      const scaleFactor = newScale / 100;
      const scaledPublications = scaleChannel(originalPublications, channel, scaleFactor, durationMonths);
      onChange(scaledPublications);
    });
  };

  // Quick action handlers
  const handleQuickScale = (factor: number) => {
    setScaleValue(factor * 100);
    
    import('@/utils/inventoryPricing').then(({ scaleChannel }) => {
      const scaledPublications = scaleChannel(originalPublications, channel, factor, durationMonths);
      onChange(scaledPublications);
    });
  };

  const handleRestore = () => {
    setScaleValue(100);
    onChange(originalPublications);
  };

  const handleRemoveChannel = () => {
    import('@/utils/inventoryPricing').then(({ removeChannel }) => {
      const filteredPublications = removeChannel(originalPublications, channel);
      onChange(filteredPublications);
      if (onRemove) onRemove();
    });
  };

  // Get budget color
  const getBudgetColor = () => {
    if (!totalBudget) return 'text-foreground';
    if (percentOfBudget > 40) return 'text-red-600';
    if (percentOfBudget > 25) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold capitalize">
                {channel}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Channel
              </Badge>
            </div>
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{channelPubs.length} outlets</span>
                <span>{channelUnits} units</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`font-bold ${getBudgetColor()} cursor-help border-b border-dashed text-lg`}>
                        {costDisplay.main}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs space-y-1 font-mono">
                        <p className="font-semibold">Channel Total:</p>
                        <p>Across {channelPubs.length} publications</p>
                        <p>Monthly: ${monthlyCost.toFixed(2)}/mo</p>
                        <p>Campaign: ${campaignTotal.toFixed(2)}</p>
                        {scaleValue !== 100 && (
                          <p className="text-amber-600">
                            Was ${baselineChannelCost.toFixed(2)}/mo
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {totalBudget && (
                  <span className={`${getBudgetColor()} text-xs`}>
                    {percentOfBudget.toFixed(1)}% of monthly budget
                  </span>
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
                onClick={handleRemoveChannel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Remove all items from this channel"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Scale Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1">
                Channel Volume Scale
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Scale all {channel} inventory across all publications.
                        This affects {channelPubs.length} publications with {channelUnits} total units.
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
            </div>
          </div>

          {/* Affected Publications */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Affected Publications</label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="space-y-1 text-xs">
                {channelPubs.map(pub => {
                  const pubChannelItems = pub.inventoryItems?.filter(item => item.channel === channel) || [];
                  const pubChannelUnits = pubChannelItems.reduce((sum, item) => 
                    sum + (item.currentFrequency || item.quantity || 1), 0
                  );
                  const pubChannelCost = pubChannelItems.reduce((sum, item) => 
                    sum + (item.monthlyCost || 0), 0
                  );
                  
                  return (
                    <div key={pub.publicationId} className="flex justify-between items-center py-1 border-b border-blue-200 last:border-0">
                      <span className="font-medium text-blue-900">
                        {pub.publicationName}
                      </span>
                      <div className="flex items-center gap-3 text-blue-700">
                        <span>{pubChannelUnits} units</span>
                        <span className="font-semibold">${pubChannelCost.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {scaleValue !== 100 && (
                <div className="mt-3 pt-3 border-t border-blue-300 text-xs">
                  <div className="flex justify-between font-semibold text-blue-900">
                    <span>Scale Change:</span>
                    <span className="text-blue-600">
                      {baselineChannelUnits} units → {channelUnits} units
                      ({scaleValue}%)
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-blue-900 mt-1">
                    <span>Cost Change:</span>
                    <span className={scaleValue < 100 ? 'text-green-600' : 'text-amber-600'}>
                      ${baselineChannelCost.toFixed(2)} → ${channelCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

