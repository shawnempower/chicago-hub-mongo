/**
 * PixelHealthBadge
 * 
 * Displays pixel tracking health status for an order.
 * Used across order list (compact), order detail, and performance views.
 * 
 * Statuses:
 * - healthy: nothing rendered (don't clutter when things work)
 * - warning: amber icon — pixel active but low/no ad impressions
 * - no_data: gray icon — no tracking data received yet
 * - error: red icon — entries with data quality issues
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, AlertCircle, Radio } from 'lucide-react';
import type { PixelHealth } from '@/integrations/mongodb/insertionOrderSchema';

interface PixelHealthBadgeProps {
  pixelHealth: PixelHealth | undefined | null;
  /** Compact mode shows just an icon with tooltip (for order list rows) */
  compact?: boolean;
}

export function PixelHealthBadge({ pixelHealth, compact = false }: PixelHealthBadgeProps) {
  if (!pixelHealth || pixelHealth.status === 'healthy') {
    return null;
  }

  const { status, message, badEntryCount } = pixelHealth;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {status === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {status === 'warning' && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              {status === 'no_data' && (
                <Radio className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-xs">{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full badge for inline use in tables
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-normal">
        <AlertCircle className="h-3 w-3 mr-1" />
        {badEntryCount} Pixel {badEntryCount === 1 ? 'Issue' : 'Issues'}
      </Badge>
    );
  }

  if (status === 'warning') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0 font-normal pointer-events-none">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Low Data
      </Badge>
    );
  }

  if (status === 'no_data') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
        <Radio className="h-3 w-3 mr-1" />
        No Tracking
      </Badge>
    );
  }

  return null;
}

/**
 * PixelHealthAlert
 * 
 * Full-width alert banner for order detail and performance views.
 * Shows actionable guidance based on pixel health status.
 */
interface PixelHealthAlertProps {
  pixelHealth: PixelHealth | undefined | null;
}

export function PixelHealthAlert({ pixelHealth }: PixelHealthAlertProps) {
  if (!pixelHealth || pixelHealth.status === 'healthy') {
    return null;
  }

  const { status, message } = pixelHealth;

  const titleMap: Record<string, string> = {
    error: 'Pixel Tracking Issue',
    warning: 'Low Tracking Data',
    no_data: 'No Tracking Data',
  };

  const variant = status === 'error' ? 'destructive' as const : 'default' as const;
  const Icon = status === 'error' ? AlertCircle : status === 'warning' ? AlertTriangle : Radio;

  return (
    <Alert variant={variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{titleMap[status] || 'Tracking Status'}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default PixelHealthBadge;
