import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PricingAnalytics, ChannelPricingAnalytics } from '@/hooks/useDashboardStats';
import { CHANNEL_COLORS } from '@/constants/channelColors';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';

interface HubPricingAnalyticsProps {
  pricingAnalytics?: PricingAnalytics;
  loading?: boolean;
}

// Format currency
const formatCurrency = (value: number): string => {
  if (value === 0) return '$0';
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${Math.round(value).toLocaleString()}`;
};

// Format percentage for cost per reach
const formatCPR = (value: number): string => {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
};

// Format large numbers with K/M suffix
const formatAudience = (value: number): string => {
  if (value === 0) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
};

// Friendly pricing model names
const PRICING_MODEL_LABELS: Record<string, string> = {
  cpm: 'CPM (Cost Per 1000)',
  cpv: 'CPV (Cost Per View)',
  flat: 'Flat Rate',
  per_ad: 'Per Ad',
  per_spot: 'Per Spot',
  per_episode: 'Per Episode',
  per_post: 'Per Post',
  per_story: 'Per Story',
  per_send: 'Per Send',
  monthly: 'Monthly',
  contact: 'Contact for Pricing',
  unknown: 'Unknown Model'
};

// Get variance color based on coefficient of variation (std dev / mean)
const getVarianceColor = (stdDev: number, avg: number): string => {
  if (avg === 0) return 'text-gray-500';
  const cv = stdDev / avg;
  if (cv < 0.2) return 'text-green-600'; // Low variance
  if (cv < 0.5) return 'text-yellow-600'; // Medium variance
  return 'text-red-600'; // High variance
};

// Get audience metric label by channel
const getAudienceMetricLabel = (channel: string): string => {
  const labels: Record<string, string> = {
    website: 'Monthly Visitors',
    newsletter: 'Subscribers',
    print: 'Circulation',
    podcast: 'Avg Listeners',
    radio: 'Listeners',
    streaming: 'Subscribers/Viewers'
  };
  return labels[channel] || 'Audience';
};

// Channel configurations
const CHANNELS = [
  { key: 'website', label: 'Website', icon: CHANNEL_COLORS.website.icon },
  { key: 'newsletter', label: 'Newsletter', icon: CHANNEL_COLORS.newsletter.icon },
  { key: 'print', label: 'Print', icon: CHANNEL_COLORS.print.icon },
  { key: 'podcast', label: 'Podcast', icon: CHANNEL_COLORS.podcasts.icon },
  { key: 'radio', label: 'Radio', icon: CHANNEL_COLORS.radioStations.icon },
  { key: 'streaming', label: 'Streaming', icon: CHANNEL_COLORS.streamingVideo.icon }
];

export const HubPricingAnalytics: React.FC<HubPricingAnalyticsProps> = ({ 
  pricingAnalytics, 
  loading 
}) => {
  const [activeChannel, setActiveChannel] = useState('website');

  // Get channel data
  const channelData = useMemo(() => {
    if (!pricingAnalytics) return null;
    return pricingAnalytics[activeChannel as keyof PricingAnalytics] as ChannelPricingAnalytics;
  }, [pricingAnalytics, activeChannel]);

  // Sort pricing models by sample size (descending)
  const sortedModels = useMemo(() => {
    if (!channelData) return [];
    return Object.entries(channelData).sort((a, b) => b[1].sampleSize - a[1].sampleSize);
  }, [channelData]);

  // Calculate channel summary stats based on unit prices
  const channelSummary = useMemo(() => {
    if (!channelData || sortedModels.length === 0) return null;
    
    let totalSamples = 0;
    let allUnitPrices: number[] = [];
    
    sortedModels.forEach(([_, data]) => {
      totalSamples += data.sampleSize;
      // Collect unit prices for overall stats
      if (data.unitPrice.count > 0) {
        allUnitPrices.push(data.unitPrice.avg);
      }
    });
    
    if (allUnitPrices.length === 0) {
      return {
        totalSamples,
        models: sortedModels.length,
        avgUnitPrice: 0,
        minUnitPrice: 0,
        maxUnitPrice: 0
      };
    }
    
    const avgUnitPrice = allUnitPrices.reduce((sum, p) => sum + p, 0) / allUnitPrices.length;
    const minUnitPrice = Math.min(...sortedModels.filter(([_, d]) => d.unitPrice.count > 0).map(([_, d]) => d.unitPrice.min));
    const maxUnitPrice = Math.max(...sortedModels.filter(([_, d]) => d.unitPrice.count > 0).map(([_, d]) => d.unitPrice.max));
    
    return {
      totalSamples,
      models: sortedModels.length,
      avgUnitPrice,
      minUnitPrice,
      maxUnitPrice
    };
  }, [channelData, sortedModels]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Analytics</CardTitle>
          <CardDescription>Loading statistical analysis...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pricingAnalytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Analytics</CardTitle>
          <CardDescription>No pricing data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pricing analytics data found for this hub.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pricing Analytics by Channel
          </CardTitle>
          <CardDescription>
            Unit economics analysis showing cost per 1000 audience reach for each pricing model.
            Compare pricing models fairly by normalizing to audience size.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Channel Summary (if data available) */}
      {channelSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{channelSummary.totalSamples}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {channelSummary.models} pricing model{channelSummary.models !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Unit Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCPR(channelSummary.avgUnitPrice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unit Price Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCPR(channelSummary.minUnitPrice)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                to {formatCPR(channelSummary.maxUnitPrice)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = CHANNEL_COLORS[activeChannel]?.icon || Info;
                  return <Icon className="h-6 w-6" />;
                })()}
                <span className="text-xl font-bold capitalize">{activeChannel}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeChannel} onValueChange={setActiveChannel}>
            <TabsList className="grid w-full grid-cols-6">
              {CHANNELS.map(channel => {
                const Icon = channel.icon;
                const hasData = pricingAnalytics[channel.key as keyof PricingAnalytics] && 
                  Object.keys(pricingAnalytics[channel.key as keyof PricingAnalytics]).length > 0;
                
                return (
                  <TabsTrigger 
                    key={channel.key} 
                    value={channel.key}
                    disabled={!hasData}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{channel.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CHANNELS.map(channel => (
              <TabsContent key={channel.key} value={channel.key} className="mt-6">
                {sortedModels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pricing data available for {channel.label} channel.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pricing Models Table */}
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pricing Model</TableHead>
                            <TableHead className="text-center">Sample Size</TableHead>
                            <TableHead className="text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                    Audience Size
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Average {getAudienceMetricLabel(activeChannel).toLowerCase()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Unit Price (avg)
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Average price per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Median
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Middle unit price value (less affected by outliers)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Std Dev
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Unit price variability</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">Min</TableHead>
                            <TableHead className="text-right">Max</TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Total (avg)
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Average total monthly price (for reference)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedModels.map(([model, data]) => (
                            <TableRow key={model}>
                              <TableCell className="font-medium">
                                {PRICING_MODEL_LABELS[model] || model}
                              </TableCell>
                              <TableCell className="text-center">
                                {data.sampleSize}
                              </TableCell>
                              <TableCell className="text-center">
                                {data.audienceSize.count > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="text-sm">
                                          <div className="font-medium">{formatAudience(data.audienceSize.avg)}</div>
                                          <div className="text-[10px] text-muted-foreground">{getAudienceMetricLabel(activeChannel)}</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1 text-xs">
                                          <p className="font-semibold">{getAudienceMetricLabel(activeChannel)} Stats:</p>
                                          <p>Average: {formatAudience(data.audienceSize.avg)}</p>
                                          <p>Median: {formatAudience(data.audienceSize.median)}</p>
                                          <p>Min: {formatAudience(data.audienceSize.min)}</p>
                                          <p>Max: {formatAudience(data.audienceSize.max)}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">
                                    {data.isAlreadyNormalized ? 'N/A' : 'No data'}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {data.unitPrice.count > 0 ? (
                                  formatCPR(data.unitPrice.avg)
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.unitPrice.count > 0 ? (
                                  formatCPR(data.unitPrice.median)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.unitPrice.count > 0 ? (
                                  <span className={getVarianceColor(data.unitPrice.stdDev, data.unitPrice.avg)}>
                                    {formatCPR(data.unitPrice.stdDev)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {data.unitPrice.count > 0 ? formatCPR(data.unitPrice.min) : '—'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {data.unitPrice.count > 0 ? formatCPR(data.unitPrice.max) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.totalPrice.count > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-sm text-muted-foreground">
                                          {formatCurrency(data.totalPrice.avg)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1 text-xs">
                                          <p className="font-semibold">Total Monthly Price:</p>
                                          <p>Average: {formatCurrency(data.totalPrice.avg)}</p>
                                          <p>Median: {formatCurrency(data.totalPrice.median)}</p>
                                          <p>Min: {formatCurrency(data.totalPrice.min)}</p>
                                          <p>Max: {formatCurrency(data.totalPrice.max)}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Legend */}
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-xs space-y-2">
                          <p className="font-semibold mb-2">📊 Understanding Unit Economics:</p>
                          <ul className="space-y-1 ml-4">
                            <li><strong>Unit Price:</strong> Cost per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()} - this is the key metric for comparing pricing models fairly</li>
                            <li><strong>Audience Size:</strong> Average {getAudienceMetricLabel(activeChannel).toLowerCase()} for inventory in this pricing model</li>
                            <li><strong>Statistics:</strong>
                              <ul className="ml-4 mt-1">
                                <li>• <strong>Average:</strong> Mean unit price across all items</li>
                                <li>• <strong>Median:</strong> Middle value (less affected by outliers)</li>
                                <li>• <strong>Std Dev:</strong> Price variability (<span className="text-green-600">green = consistent</span>, <span className="text-yellow-600">yellow = moderate</span>, <span className="text-red-600">red = high variance</span>)</li>
                              </ul>
                            </li>
                            <li><strong>Total (avg):</strong> Average total monthly price for reference - useful to see actual costs</li>
                          </ul>
                          <p className="mt-2 italic text-muted-foreground">
                            💡 Example: If per_send shows $20 unit price with 50K subscribers, you're paying $20 per 1000 subscribers reached.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

