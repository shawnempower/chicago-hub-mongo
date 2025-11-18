import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadManagement } from './LeadManagement';
import { HubPackageManagement } from './HubPackageManagement';
import { HubDataQuality } from './HubDataQuality';
import { HubTeamManagement } from './HubTeamManagement';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useHubContext } from '@/contexts/HubContext';
import { useHubPublications } from '@/hooks/useHubs';
import { CHANNEL_COLORS } from '@/constants/channelColors';
import { Users, Package, Radio, Bot, UserCog, BookOpen, ArrowRightLeft, Target, Search, Loader2, DollarSign, TrendingUp, MapPin, Eye, Info, HelpCircle, Download, Megaphone, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { exportHubInventoryToCSV } from '@/utils/hubInventoryExport';
import { toast } from '@/components/ui/use-toast';
import { calculateDataQuality } from './PublicationDataQuality';

interface HubCentralDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HubCentralDashboard = ({ activeTab, onTabChange }: HubCentralDashboardProps) => {
  const { selectedHub, selectedHubId } = useHubContext();
  const { stats, loading, error } = useDashboardStats(selectedHubId);
  const { publications, loading: loadingPubs } = useHubPublications(selectedHubId);
  const [pricingTimeframe, setPricingTimeframe] = useState<'day' | 'month' | 'quarter'>('month');
  const inventoryQualityRef = useRef<HTMLDivElement>(null);

  // Helper to convert monthly values to selected timeframe
  const convertToTimeframe = (monthlyValue: number): number => {
    switch (pricingTimeframe) {
      case 'day':
        return monthlyValue / 30; // Approximate days per month
      case 'quarter':
        return monthlyValue * 3;
      case 'month':
      default:
        return monthlyValue;
    }
  };

  // Helper to get timeframe label
  const getTimeframeLabel = (): string => {
    switch (pricingTimeframe) {
      case 'day':
        return '/day';
      case 'quarter':
        return '/qtr';
      case 'month':
      default:
        return '/mo';
    }
  };

  const scrollToInventoryQuality = () => {
    inventoryQualityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Calculate inventory quality score across all hub publications
  // Uses the same calculation logic as the detailed HubDataQuality component
  const calculateHubInventoryQuality = useMemo(() => {
    if (!publications || publications.length === 0) {
      return { score: 0, totalItems: 0, completeItems: 0 };
    }

    let totalItems = 0;
    let completeItems = 0;

    // Use calculateDataQuality for each publication and aggregate the results
    publications.forEach((publication: any) => {
      const quality = calculateDataQuality(publication);
      totalItems += quality.totalItems;
      completeItems += quality.completeItems;
    });

    const score = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
    return { score, totalItems, completeItems };
  }, [publications]);

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Handle CSV export
  const handleExportInventory = () => {
    if (!selectedHub || !selectedHubId) {
      toast({
        title: 'No hub selected',
        description: 'Please select a hub to export inventory.',
        variant: 'destructive',
      });
      return;
    }

    if (publications.length === 0) {
      toast({
        title: 'No data available',
        description: 'No publications found for this hub.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportHubInventoryToCSV(publications, selectedHubId, selectedHub.basicInfo.name);
      toast({
        title: 'Export successful',
        description: `Inventory data for ${selectedHub.basicInfo.name} has been downloaded.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the inventory data.',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          {/* Hub Header Banner */}
          <div 
            className="rounded-xl p-6 border shadow-sm"
            style={{
              backgroundColor: `${selectedHub?.branding?.primaryColor || '#0066cc'}1A`, // Hub color at 10% opacity
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {selectedHub?.basicInfo.name || 'Loading...'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="font-semibold">Generated</strong> {new Date().toLocaleDateString()}
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    <strong className="font-semibold">Status</strong> Internal Reference
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    <strong className="font-semibold">ID</strong> {selectedHub?.hubId || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportInventory}
                        disabled={loadingPubs || publications.length === 0}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export all inventory and pricing for this hub</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-red-600 text-sm">
                  Error loading dashboard statistics: {error}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.leads ?? 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Publications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.publications ?? 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.conversations ?? 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={scrollToInventoryQuality}
            >
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Inventory Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-3">
                  <div className={`text-2xl font-bold ${getQualityScoreColor(calculateHubInventoryQuality.score)}`}>
                    {loadingPubs ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `${calculateHubInventoryQuality.score}%`
                    )}
                  </div>
                  {!loadingPubs && (
                    <p className="text-xs text-muted-foreground">
                      {calculateHubInventoryQuality.completeItems} of {calculateHubInventoryQuality.totalItems} items complete
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marketplace Insights Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inventory Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <Target className="h-5 w-5" />
                  Inventory Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (() => {
                  // Prepare data for the chart (all channels, including zeros for legend)
                  const allChannels = [
                    { name: 'website', value: stats?.inventoryByType?.website ?? 0, color: CHANNEL_COLORS.website.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.website.label },
                    { name: 'newsletter', value: stats?.inventoryByType?.newsletter ?? 0, color: CHANNEL_COLORS.newsletter.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.newsletter.label },
                    { name: 'print', value: stats?.inventoryByType?.print ?? 0, color: CHANNEL_COLORS.print.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.print.label },
                    { name: 'events', value: stats?.inventoryByType?.events ?? 0, color: CHANNEL_COLORS.events.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.events.label },
                    { name: 'socialMedia', value: stats?.inventoryByType?.social ?? 0, color: CHANNEL_COLORS.socialMedia.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.socialMedia.label },
                    { name: 'crossChannel', value: stats?.inventoryByType?.crossChannel ?? 0, color: CHANNEL_COLORS.crossChannel.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.crossChannel.label },
                    { name: 'podcasts', value: stats?.inventoryByType?.podcasts ?? 0, color: CHANNEL_COLORS.podcasts.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.podcasts.label },
                    { name: 'streamingVideo', value: stats?.inventoryByType?.streamingVideo ?? 0, color: CHANNEL_COLORS.streamingVideo.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.streamingVideo.label },
                    { name: 'radioStations', value: stats?.inventoryByType?.radioStations ?? 0, color: CHANNEL_COLORS.radioStations.bgColor.replace('bg-', ''), label: CHANNEL_COLORS.radioStations.label },
                  ];

                  // Chart data excludes zeros
                  const chartData = allChannels.filter(item => item.value > 0);
                  const total = allChannels.reduce((sum, item) => sum + item.value, 0);

                  // Map Tailwind colors to hex values
                  const colorMap: Record<string, string> = {
                    'blue-500': '#3b82f6',
                    'green-500': '#22c55e',
                    'purple-500': '#a855f7',
                    'yellow-500': '#eab308',
                    'orange-500': '#f97316',
                    'pink-500': '#ec4899',
                    'red-500': '#ef4444',
                    'indigo-500': '#6366f1',
                  };

                  // Custom tooltip component
                  const CustomTooltip = ({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                      return (
                        <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 relative z-50">
                          <p className="text-sm">
                            <span className="font-normal">{data.label} </span>
                            <span className="font-semibold">{percentage}%</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Chart on the left */}
                      <div className="relative h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={0}
                              dataKey="value"
                              stroke="#ffffff"
                              strokeWidth={3}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colorMap[entry.color] || '#666'} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              content={<CustomTooltip />}
                              offset={50}
                              wrapperStyle={{ zIndex: 100 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center total */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="text-center">
                            <div className="text-3xl font-bold">{total}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Legend on the right - all 8 channels stacked vertically */}
                      <div className="flex flex-col justify-center space-y-2">
                        {allChannels.map((item) => {
                          const channelConfig = CHANNEL_COLORS[item.name];
                          const Icon = channelConfig?.icon;
                          return (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {Icon && <Icon className={`h-4 w-4 ${channelConfig.iconColor}`} />}
                                <span className="text-xs">{item.label}</span>
                              </div>
                              <span className="font-semibold text-sm">{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Audience Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <Eye className="h-5 w-5" />
                  Audience Reach
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.website.icon className={`h-5 w-5 ${CHANNEL_COLORS.website.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Website</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalWebsiteVisitors ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.newsletter.icon className={`h-5 w-5 ${CHANNEL_COLORS.newsletter.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Newsletter</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalNewsletterSubscribers ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.print.icon className={`h-5 w-5 ${CHANNEL_COLORS.print.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Print</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalPrintCirculation ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.socialMedia.icon className={`h-5 w-5 ${CHANNEL_COLORS.socialMedia.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Social Media</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalSocialFollowers ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.podcasts.icon className={`h-5 w-5 ${CHANNEL_COLORS.podcasts.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Podcasts</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalPodcastListeners ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.streamingVideo.icon className={`h-5 w-5 ${CHANNEL_COLORS.streamingVideo.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Streaming</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalStreamingSubscribers ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CHANNEL_COLORS.radioStations.icon className={`h-5 w-5 ${CHANNEL_COLORS.radioStations.iconColor}`} />
                      <span className="text-xs text-muted-foreground">Radio</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                        (stats?.audienceMetrics?.totalRadioListeners ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Insights */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-sans text-base">
                    <DollarSign className="h-5 w-5" />
                    Default Potential
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-help">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-normal">How is this calculated?</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm" sideOffset={5}>
                          <div className="space-y-2">
                            <p className="font-semibold">Pricing Assumptions:</p>
                            <ul className="space-y-1 text-xs list-disc ml-4">
                              <li>Default pricing only (excludes hub-specific rates)</li>
                              <li>Uses 1x tier (full-price baseline)</li>
                              <li>Website: Flat rate or CPM × impressions</li>
                              <li>Newsletter: Per-send × frequency (daily/weekly/monthly)</li>
                              <li>Print: Frequency-based rates normalized</li>
                              <li>Podcast/Radio/Streaming: Episode/spot frequency</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <Select value={pricingTimeframe} onValueChange={(value: any) => setPricingTimeframe(value)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Per Day</SelectItem>
                      <SelectItem value="month">Per Month</SelectItem>
                      <SelectItem value="quarter">Per Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Website Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalWebsiteAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Newsletter Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalNewsletterAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Print Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalPrintAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Podcast Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalPodcastAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Streaming Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalStreamingAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Radio Ads</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalRadioAdValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Total Value</span>
                      <span className="font-bold text-sm text-green-600">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                          `$${Math.round(convertToTimeframe(stats?.pricingInsights?.totalInventoryValue ?? 0)).toLocaleString()}${getTimeframeLabel()}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Sum of all inventory above
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hub Pricing */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-sans text-base">
                    <TrendingUp className="h-5 w-5" />
                    Hub Potential
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                          <p className="text-xs mb-2">Revenue forecasts for hub-specific pricing across all inventory</p>
                          <a 
                            href="/pricing-formulas.html#hub-pricing" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 underline inline-block font-medium"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            View pricing formulas →
                          </a>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <Select value={pricingTimeframe} onValueChange={(value: any) => setPricingTimeframe(value)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Per Day</SelectItem>
                      <SelectItem value="month">Per Month</SelectItem>
                      <SelectItem value="quarter">Per Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedHubId && stats?.hubPricingInsights?.[selectedHubId] ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Website Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalWebsiteAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Newsletter Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalNewsletterAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Print Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalPrintAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Podcast Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalPodcastAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Streaming Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalStreamingAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Radio Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalRadioAdValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium flex items-center gap-1">
                            Total Hub Value
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex items-center">
                                    <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                                  <p className="text-xs mb-2">Total forecasted revenue at hub pricing rates</p>
                                  <a 
                                    href="/pricing-formulas.html#revenue-forecasting" 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-700 underline inline-block font-medium"
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    View pricing formulas →
                                  </a>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                          <span className="font-bold text-sm text-green-600">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                              `$${Math.round(convertToTimeframe(stats.hubPricingInsights[selectedHubId].totalInventoryValue || 0)).toLocaleString()}${getTimeframeLabel()}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Sum of all inventory above
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <p>No pricing data available for {selectedHub?.basicInfo.name || 'this hub'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <Package className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  onClick={() => onTabChange('packages')}
                >
                  <Package className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Create Package</div>
                    <div className="text-xs text-muted-foreground">Add new advertising package</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  onClick={() => onTabChange('leads')}
                >
                  <Users className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Review Leads</div>
                    <div className="text-xs text-muted-foreground">Check new inquiries</div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <Users className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New lead from Chicago Bakery</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Package updated: Radio Premium</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New outlet added: WCPT 820</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Geographic & Content Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <MapPin className="h-5 w-5" />
                  Geographic Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">Local</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.local ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">Regional</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.regional ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">State</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.state ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">National</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.national ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-base">
                  <BookOpen className="h-5 w-5" />
                  Content Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">News</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.news ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">Business</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.business ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">Lifestyle</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.lifestyle ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium">Mixed</span>
                    <span className="font-semibold text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.mixed ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Quality - Full Width at Bottom */}
          <div ref={inventoryQualityRef}>
            {loadingPubs ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : (
              <HubDataQuality 
                publications={publications} 
                hubName={selectedHub?.basicInfo.name || "Hub"}
                preCalculatedQuality={calculateHubInventoryQuality}
              />
            )}
          </div>
        </div>
      );
    }
    
    if (activeTab === 'leads') {
      return <LeadManagement />;
    }
    
    if (activeTab === 'packages') {
      return <HubPackageManagement />;
    }
    
    if (activeTab === 'team') {
      return <HubTeamManagement />;
    }
    
    if (activeTab === 'campaigns') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Builder</CardTitle>
              <CardDescription>
                Create AI-powered campaigns with intelligent inventory selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🚀 AI-Powered Campaign Builder</h4>
                <p className="text-sm text-blue-800 mb-4">
                  The Campaign Builder uses AI to automatically select optimal publication inventory 
                  based on your budget, goals, and target audience. It follows Press Forward principles 
                  to support the entire local news ecosystem.
                </p>
                <ul className="text-sm text-blue-800 space-y-1 mb-4">
                  <li>✓ Intelligent inventory selection using OpenAI</li>
                  <li>✓ Multi-channel coverage (print, digital, newsletter, radio, podcast)</li>
                  <li>✓ Automatic cost calculations with hub discounts</li>
                  <li>✓ Professional insertion order generation</li>
                  <li>✓ Performance estimates (reach, impressions, CPM)</li>
                </ul>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex gap-3">
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = '/campaigns/new'}
                  >
                    <Megaphone className="mr-2 h-5 w-5" />
                    Create New Campaign
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => window.location.href = '/campaigns'}
                  >
                    View All Campaigns
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Launch the 5-step Campaign Builder wizard or view existing campaigns
                </p>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-2">How It Works:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                  <li>Enter campaign details (name, advertiser, goals, budget, timeline)</li>
                  <li>Select desired channels (print, website, newsletter, etc.)</li>
                  <li>Choose "Include all outlets" for Press Forward ecosystem support</li>
                  <li>AI analyzes requirements and selects optimal inventory</li>
                  <li>Review selections, pricing, and performance estimates</li>
                  <li>Create campaign and generate professional insertion order</li>
                </ol>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-2">Example Use Case:</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Summer Brand Awareness Campaign</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Budget: $50,000/month for 6 months</li>
                    <li>• Channels: Print, Website, Newsletter, Radio, Podcast</li>
                    <li>• Target: All Chicago residents</li>
                    <li>• Approach: Include all outlets (Press Forward)</li>
                  </ul>
                  <p className="mt-3 text-muted-foreground">
                    → AI selects ~25 publications, 150+ ad placements, estimates 500K-750K reach
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return null;
  };

  return renderContent();
};

