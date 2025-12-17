/**
 * MetricExplainer Component
 * 
 * Provides contextual help and guidance for performance metrics.
 * Used in self-reporting forms to help publications understand what to report.
 */

import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Lightbulb,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  MetricDefinition, 
  getMetricDefinitions,
  getChannelConfig,
} from '@/config/inventoryChannels';

interface MetricExplainerProps {
  /** The metric key to explain */
  metricKey: string;
  /** The channel context (affects the explanation) */
  channel: string;
  /** Show as inline tooltip (default) or expanded card */
  variant?: 'tooltip' | 'inline' | 'card';
  /** Additional class names */
  className?: string;
}

/**
 * Single metric explainer - shows help for one metric
 */
export function MetricExplainer({ 
  metricKey, 
  channel, 
  variant = 'tooltip',
  className 
}: MetricExplainerProps) {
  const definitions = getMetricDefinitions(channel);
  const definition = definitions.find(d => d.key === metricKey);

  if (!definition) {
    return null;
  }

  if (variant === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-5 w-5 p-0 text-muted-foreground hover:text-foreground", className)}>
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-3" side="right">
            <div className="space-y-2">
              <p className="font-medium text-sm">{definition.label}</p>
              <p className="text-xs text-muted-foreground">{definition.description}</p>
              {definition.example && (
                <div className="flex items-start gap-1.5 text-xs">
                  <Lightbulb className="h-3 w-3 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span className="text-muted-foreground">{definition.example}</span>
                </div>
              )}
              {definition.required && (
                <Badge variant="secondary" className="text-[10px]">Required</Badge>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Info className="h-3 w-3" />
        {definition.helpText || definition.description}
      </span>
    );
  }

  // Card variant
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{definition.label}</span>
        {definition.required && (
          <Badge variant="secondary" className="text-[10px]">Required</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{definition.description}</p>
      {definition.example && (
        <div className="flex items-start gap-2 p-2 bg-background rounded border">
          <Calculator className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
          <span className="text-xs">{definition.example}</span>
        </div>
      )}
    </div>
  );
}

interface ChannelMetricsGuideProps {
  /** The channel to show metrics guide for */
  channel: string;
  /** Start expanded or collapsed */
  defaultExpanded?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Full metrics guide for a channel
 * Shows all metrics with explanations and examples
 */
export function ChannelMetricsGuide({ 
  channel, 
  defaultExpanded = false,
  className 
}: ChannelMetricsGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const channelConfig = getChannelConfig(channel);
  const definitions = getMetricDefinitions(channel);

  if (definitions.length === 0) {
    return null;
  }

  const requiredMetrics = definitions.filter(d => d.required);
  const optionalMetrics = definitions.filter(d => !d.required);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between p-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">What should I report for {channelConfig.label}?</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Required Metrics */}
          {requiredMetrics.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                Required Metrics
                <Badge variant="destructive" className="text-[10px]">Must provide</Badge>
              </h4>
              <div className="space-y-3">
                {requiredMetrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Optional Metrics */}
          {optionalMetrics.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Optional Metrics
              </h4>
              <div className="space-y-3">
                {optionalMetrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Individual metric card with full details
 */
function MetricCard({ metric }: { metric: MetricDefinition }) {
  return (
    <div className="rounded border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{metric.label}</span>
        {metric.unit && (
          <span className="text-xs text-muted-foreground">({metric.unit})</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{metric.description}</p>
      {metric.example && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-amber-800 dark:text-amber-200">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span className="text-xs">{metric.example}</span>
        </div>
      )}
      {metric.helpText && (
        <p className="text-xs text-muted-foreground italic">{metric.helpText}</p>
      )}
    </div>
  );
}

interface QuickReferenceCardProps {
  /** The channel to show reference for */
  channel: string;
  /** Additional class names */
  className?: string;
}

/**
 * Compact quick reference card
 * Shows a summary of what to report
 */
export function QuickReferenceCard({ channel, className }: QuickReferenceCardProps) {
  const channelConfig = getChannelConfig(channel);
  const definitions = getMetricDefinitions(channel);

  if (definitions.length === 0) {
    return null;
  }

  const requiredMetrics = definitions.filter(d => d.required);

  return (
    <div className={cn("rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3", className)}>
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Reporting {channelConfig.label} Performance
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {requiredMetrics.length > 0 ? (
              <>Required: {requiredMetrics.map(m => m.label).join(', ')}</>
            ) : (
              <>Enter any metrics you have available</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MetricExplainer;

