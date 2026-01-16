import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Info, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatReachNumber, getChannelLabel } from '@/utils/reachCalculations';

interface ReachSummaryProps {
  totalMonthlyImpressions?: number;
  totalMonthlyExposures?: number;
  estimatedTotalReach?: number;
  estimatedUniqueReach?: number;
  channelAudiences?: {
    website?: number;
    print?: number;
    newsletter?: number;
    social?: number;
    podcast?: number;
    radio?: number;
    streaming?: number;
    events?: number;
  };
  calculationMethod?: 'impressions' | 'audience' | 'mixed';
  overlapFactor?: number;
  publicationsCount?: number;
  channelsCount?: number;
  compact?: boolean;
  durationInMonths?: number; // Package duration in months for scaling reach
  durationDisplay?: string; // Formatted duration string like "3 Weeks" or "6 Months"
}

export function ReachSummary({
  totalMonthlyImpressions,
  totalMonthlyExposures,
  estimatedTotalReach = 0,
  estimatedUniqueReach = 0,
  channelAudiences,
  calculationMethod = 'audience',
  overlapFactor = 0.70,
  publicationsCount = 0,
  channelsCount = 0,
  compact = false,
  durationInMonths,
  durationDisplay
}: ReachSummaryProps) {
  const overlapPercent = Math.round((1 - overlapFactor) * 100);
  const hasData = estimatedTotalReach > 0 || totalMonthlyImpressions || totalMonthlyExposures;
  
  // Calculate package-scaled reach metrics
  const durationMultiplier = durationInMonths || 1;
  const packageImpressions = totalMonthlyImpressions ? Math.round(totalMonthlyImpressions * durationMultiplier) : undefined;
  const packageExposures = totalMonthlyExposures ? Math.round(totalMonthlyExposures * durationMultiplier) : undefined;
  // Note: Unique reach doesn't scale linearly with duration - it's more of a ceiling
  // We use a diminishing returns formula: uniqueReach * (1 + ln(duration)/2) for longer durations
  const packageUniqueReach = estimatedUniqueReach > 0 
    ? Math.round(estimatedUniqueReach * (durationMultiplier <= 1 ? durationMultiplier : Math.min(1 + Math.log(durationMultiplier) / 2, durationMultiplier)))
    : 0;
  
  // Duration label for display
  const durationLabel = durationDisplay ? `for ${durationDisplay.toLowerCase()}` : 'monthly';

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Estimated Reach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Reach data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {packageUniqueReach > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Unique Reach:</span>
            <span className="font-semibold">~{formatReachNumber(packageUniqueReach)}</span>
          </div>
        )}
        {packageExposures && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Exposures:</span>
            <span className="font-semibold">{formatReachNumber(packageExposures)} {durationLabel}</span>
          </div>
        )}
        {packageImpressions && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Impressions:</span>
            <span className="font-semibold">{packageImpressions.toLocaleString()} {durationLabel}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Estimated Reach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Primary Metrics */}
        <div className="space-y-3">
          {/* Unique Reach */}
          {packageUniqueReach > 0 && (
            <div>
              <div className="text-2xl font-bold flex items-baseline gap-2">
                <span>~{formatReachNumber(packageUniqueReach)}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Estimated unique individuals reached {durationLabel}, 
                        adjusted for {overlapPercent}% audience overlap across channels.
                        {durationMultiplier > 1 && ' Unique reach grows slower than duration due to audience overlap.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Unique Reach {durationDisplay ? `(${durationDisplay})` : '(People)'}
              </div>
            </div>
          )}
          
          {/* Total Exposures */}
          {packageExposures && packageExposures > 0 && (
            <div>
              <div className="text-xl font-bold flex items-baseline gap-2">
                <span>{formatReachNumber(packageExposures)}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Total touchpoints/exposures {durationLabel} accounting for frequency. 
                        Same person may see your message multiple times.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Total Exposures {durationDisplay ? `(${durationDisplay})` : '(Frequency-Adjusted)'}
              </div>
            </div>
          )}
          
          {/* Impressions (for pure CPM campaigns) */}
          {packageImpressions && calculationMethod === 'impressions' && (
            <div>
              <div className="text-xl font-bold">
                {packageImpressions.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Total Impressions {durationDisplay ? `(${durationDisplay})` : ''}
              </div>
            </div>
          )}
        </div>

        {/* Channel Breakdown */}
        {channelAudiences && Object.keys(channelAudiences).length > 0 && (
          <div className="border-t pt-3">
            <div className="text-[11px] font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              By Channel
            </div>
            <div className="space-y-1.5">
              {Object.entries(channelAudiences)
                .filter(([_, audience]) => audience && audience > 0)
                .sort(([_, a], [__, b]) => (b || 0) - (a || 0))
                .map(([channel, audience]) => (
                  <div key={channel} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground capitalize">
                      {getChannelLabel(channel)}
                    </span>
                    <span className="font-mono font-medium">
                      {audience?.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

