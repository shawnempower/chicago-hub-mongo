import React from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PerformanceMetrics } from '@/integrations/mongodb/schemas';

interface PerformanceMetricsEditorProps {
  performanceMetrics?: PerformanceMetrics;
  pricingModel?: string;
  onChange: (metrics: PerformanceMetrics) => void;
}

/**
 * Component for editing performance metrics used in revenue forecasting
 * Shows different fields based on pricing model:
 * - Occurrence-based (per_send, per_spot, etc): shows occurrencesPerMonth
 * - Impression-based (cpm, cpd, cpv): shows impressionsPerMonth
 * - Both types: shows audienceSize and guaranteed
 */
export const PerformanceMetricsEditor: React.FC<PerformanceMetricsEditorProps> = ({
  performanceMetrics = {},
  pricingModel,
  onChange,
}) => {
  const handleChange = (field: keyof PerformanceMetrics, value: any) => {
    onChange({
      ...performanceMetrics,
      [field]: value,
    });
  };

  // Determine which fields to show based on pricing model
  const showOccurrences = [
    'per_send',
    'per_spot',
    'per_post',
    'per_ad',
    'per_episode',
    'per_story',
  ].includes(pricingModel || '');

  const showImpressions = [
    'cpm',
    'cpd',
    'cpv',
  ].includes(pricingModel || '');

  // If no specific model, show both
  const showBoth = !pricingModel || (!showOccurrences && !showImpressions);

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Performance Metrics</h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Used for accurate revenue forecasting. Enter monthly values for
                how often this ad runs and/or how many impressions it receives.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(showOccurrences || showBoth) && (
          <div className="space-y-2">
            <Label htmlFor="occurrencesPerMonth" className="flex items-center gap-2">
              Occurrences per Month
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      How many times this inventory runs per month.
                      <br />
                      Examples:
                      <br />• Weekly newsletter: 4
                      <br />• Daily radio spot: 30
                      <br />• Bi-weekly print: 2
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="occurrencesPerMonth"
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g., 4 for weekly"
              value={performanceMetrics.occurrencesPerMonth || ''}
              onChange={(e) =>
                handleChange('occurrencesPerMonth', parseFloat(e.target.value) || undefined)
              }
            />
          </div>
        )}

        {(showImpressions || showBoth) && (
          <div className="space-y-2">
            <Label htmlFor="impressionsPerMonth" className="flex items-center gap-2">
              Impressions per Month
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Total monthly impressions, views, or downloads.
                      <br />
                      Used for CPM, CPV, and CPD pricing calculations.
                      <br />
                      <br />
                      Tip: This is often audience size × occurrences per month.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="impressionsPerMonth"
              type="number"
              min="0"
              placeholder="e.g., 450000"
              value={performanceMetrics.impressionsPerMonth || ''}
              onChange={(e) =>
                handleChange('impressionsPerMonth', parseInt(e.target.value) || undefined)
              }
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="audienceSize" className="flex items-center gap-2">
            Audience Size
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Base audience size for reference.
                    <br />
                    Examples:
                    <br />• Newsletter: subscribers
                    <br />• Print: circulation
                    <br />• Website: monthly visitors
                    <br />• Social: followers
                    <br />• Radio/Podcast: listeners
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="audienceSize"
            type="number"
            min="0"
            placeholder="e.g., 15000"
            value={performanceMetrics.audienceSize || ''}
            onChange={(e) =>
              handleChange('audienceSize', parseInt(e.target.value) || undefined)
            }
          />
        </div>

        <div className="space-y-2 flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="guaranteed"
              checked={performanceMetrics.guaranteed || false}
              onCheckedChange={(checked) => handleChange('guaranteed', checked as boolean)}
            />
            <Label htmlFor="guaranteed" className="flex items-center gap-2 cursor-pointer">
              Guaranteed Metrics
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Check this if the metrics are guaranteed (contractually promised)
                      rather than estimated. This affects forecasting confidence ranges.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
        <p className="font-medium mb-1">💡 Quick Guide:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          {showOccurrences && (
            <li>For occurrence-based pricing ({pricingModel}): Enter how many times per month</li>
          )}
          {showImpressions && (
            <li>For impression-based pricing ({pricingModel}): Enter total monthly impressions</li>
          )}
          <li>These values are used for revenue forecasting and reporting</li>
          <li>You can auto-populate these from channel-level data using the migration script</li>
        </ul>
      </div>
    </div>
  );
};

export default PerformanceMetricsEditor;

