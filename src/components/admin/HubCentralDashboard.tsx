import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadManagement } from './LeadManagement';
import { HubPackageManagement } from './HubPackageManagement';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { CHANNEL_COLORS } from '@/constants/channelColors';
import { Users, Package, Radio, Bot, UserCog, BookOpen, ArrowRightLeft, Target, Search, Loader2, DollarSign, TrendingUp, MapPin, Eye, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface HubCentralDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const HubCentralDashboard = ({ activeTab, onTabChange }: HubCentralDashboardProps) => {
  const { stats, loading, error } = useDashboardStats();
  const [pricingTimeframe, setPricingTimeframe] = useState<'day' | 'month' | 'quarter'>('month');

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

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          {/* Hub Header Banner */}
          <div 
            className="rounded-xl p-6 border shadow-sm"
            style={{
              backgroundColor: '#0066cc1A', // Chicago blue at 10% opacity
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  Chicago Hub
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
                    <strong className="font-semibold">ID</strong> chicago-hub
                  </span>
                </div>
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
                <Target className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Ad Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.adInventory ?? 0
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
                    Default Pricing
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
                    Hub Pricing
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
                  {stats?.hubPricingInsights?.['chicago-hub'] ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Website Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalWebsiteAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Newsletter Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalNewsletterAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Print Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalPrintAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Podcast Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalPodcastAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Streaming Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalStreamingAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Radio Ads</span>
                        <span className="font-semibold text-sm">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                            `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalRadioAdValue)).toLocaleString()}${getTimeframeLabel()}`}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Total Hub Value</span>
                          <span className="font-bold text-sm text-green-600">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                              `$${Math.round(convertToTimeframe(stats.hubPricingInsights['chicago-hub'].totalInventoryValue)).toLocaleString()}${getTimeframeLabel()}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Sum of all inventory above
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <p>No Chicago Hub pricing data available</p>
                    </div>
                  )}
                </div>
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

          <div className="grid gap-6 md:grid-cols-2">
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
    
    return null;
  };

  return renderContent();
};

