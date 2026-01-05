/**
 * Campaign Performance Dashboard
 * 
 * Displays campaign-level metrics, pacing, and breakdowns by publication/channel.
 * Used by hub admins to monitor overall campaign delivery.
 * Separates digital (tracked) vs offline (self-reported) metrics for clarity.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointerClick, 
  Eye, 
  Loader2,
  CalendarIcon,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Newspaper,
  Radio,
  Mic,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  PacingStatus, 
  PACING_STATUS_LABELS, 
} from '@/integrations/mongodb/dailyAggregateSchema';
import { isDigitalChannel, getChannelConfig } from '@/config/inventoryChannels';

interface CampaignPerformanceDashboardProps {
  campaignId: string;
  campaignName?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ChannelDelivery {
  goal: number;
  delivered: number;
  deliveryPercent: number;
  goalType: 'impressions' | 'frequency';
  volumeLabel: string;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  dateRange: { start: string; end: string };
  performanceRange: { earliest: Date; latest: Date };
  totals: {
    entries: number;
    impressions: number;
    clicks: number;
    ctr: number;
    reach: number;
    insertions: number;
    spotsAired: number;
    downloads: number;
    posts: number;
    publications: number;
  };
  deliveryProgress?: {
    overallPercent: number;
    totalExpectedReports: number;
    totalReportsSubmitted: number;
    byChannel: Record<string, ChannelDelivery>;
  };
  byChannel: Array<{
    channel: string;
    entries: number;
    impressions: number;
    clicks: number;
    ctr: number;
    reach: number;
    units: number;
  }>;
  byPublication: Array<{
    publicationId: number;
    publicationName: string;
    entries: number;
    impressions: number;
    clicks: number;
    ctr: number;
    reach: number;
    units: number;
  }>;
  pacing: {
    status: PacingStatus;
    percentComplete: number;
    expectedPercent: number;
    totalDays: number;
    daysPassed: number;
    daysRemaining: number;
  } | null;
}

interface DailyData {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  reach: number;
  units: number;
  entries: number;
}

export function CampaignPerformanceDashboard({
  campaignId,
  campaignName,
  startDate,
  endDate,
}: CampaignPerformanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startDate || subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(endDate || new Date());

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch summary
      const summaryRes = await fetch(`${API_BASE_URL}/reporting/campaign/${campaignId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch daily data for chart
      const dailyRes = await fetch(
        `${API_BASE_URL}/reporting/campaign/${campaignId}/daily?dateFrom=${dateFrom?.toISOString()}&dateTo=${dateTo?.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyData(data.daily || []);
      }
    } catch (error) {
      console.error('Error fetching campaign performance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign performance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPacingBadge = (status: PacingStatus | undefined) => {
    if (!status) return null;
    
    const colors: Record<PacingStatus, string> = {
      ahead: 'bg-blue-100 text-blue-700',
      on_track: 'bg-green-100 text-green-700',
      behind: 'bg-yellow-100 text-yellow-700',
      at_risk: 'bg-red-100 text-red-700',
    };
    
    const icons: Record<PacingStatus, React.ReactNode> = {
      ahead: <TrendingUp className="w-3 h-3 mr-1" />,
      on_track: <CheckCircle className="w-3 h-3 mr-1" />,
      behind: <AlertTriangle className="w-3 h-3 mr-1" />,
      at_risk: <AlertTriangle className="w-3 h-3 mr-1" />,
    };
    
    return (
      <Badge className={cn(colors[status], "border-0")}>
        {icons[status]}
        {PACING_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getChannelColor = (channel: string): string => {
    const colors: Record<string, string> = {
      website: 'bg-blue-500',
      newsletter: 'bg-purple-500',
      print: 'bg-orange-500',
      radio: 'bg-green-500',
      podcast: 'bg-pink-500',
      events: 'bg-yellow-500',
      social: 'bg-cyan-500',
      streaming: 'bg-red-500',
    };
    return colors[channel] || 'bg-gray-500';
  };

  // Separate channels into digital (tracked) and offline (self-reported)
  const { digitalChannels, offlineChannels, digitalTotals, offlineTotals } = useMemo(() => {
    if (!summary) {
      return { 
        digitalChannels: [], 
        offlineChannels: [], 
        digitalTotals: { impressions: 0, clicks: 0, ctr: 0 },
        offlineTotals: { insertions: 0, spotsAired: 0, downloads: 0, reach: 0, circulation: 0 }
      };
    }

    const digital = summary.byChannel.filter(c => isDigitalChannel(c.channel));
    const offline = summary.byChannel.filter(c => !isDigitalChannel(c.channel));

    const digitalTotals = {
      impressions: digital.reduce((sum, c) => sum + c.impressions, 0),
      clicks: digital.reduce((sum, c) => sum + c.clicks, 0),
      ctr: 0,
    };
    digitalTotals.ctr = digitalTotals.impressions > 0 
      ? (digitalTotals.clicks / digitalTotals.impressions) * 100 
      : 0;

    const offlineTotals = {
      insertions: summary.totals.insertions || 0,
      spotsAired: summary.totals.spotsAired || 0,
      downloads: summary.totals.downloads || 0,
      reach: offline.reduce((sum, c) => sum + c.reach, 0),
      circulation: offline.reduce((sum, c) => sum + c.units, 0),
    };

    return { digitalChannels: digital, offlineChannels: offline, digitalTotals, offlineTotals };
  }, [summary]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'print': return <Newspaper className="w-3.5 h-3.5" />;
      case 'radio': return <Radio className="w-3.5 h-3.5" />;
      case 'podcast': return <Mic className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getDataSourceBadge = (channel: string) => {
    const isDigital = isDigitalChannel(channel);
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-[10px] ml-2",
          isDigital ? "border-blue-300 text-blue-600" : "border-amber-300 text-amber-600"
        )}
      >
        {isDigital ? (
          <><Wifi className="w-2.5 h-2.5 mr-1" />Tracked</>
        ) : (
          <><WifiOff className="w-2.5 h-2.5 mr-1" />Self-Reported</>
        )}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
          <p>No performance data available for this campaign</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Progress - at the top */}
      {summary.deliveryProgress && Object.keys(summary.deliveryProgress.byChannel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 font-sans">
              <span>Delivery Progress</span>
              <Badge 
                className={cn(
                  "border-0",
                  summary.deliveryProgress.overallPercent >= 100 ? "bg-blue-100 text-blue-700" :
                  summary.deliveryProgress.overallPercent >= 90 ? "bg-green-100 text-green-700" :
                  summary.deliveryProgress.overallPercent >= 70 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                )}
              >
                {summary.deliveryProgress.overallPercent}% Overall
              </Badge>
            </CardTitle>
            <CardDescription>
              {summary.deliveryProgress.totalReportsSubmitted} of {summary.deliveryProgress.totalExpectedReports} placements reported
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {Object.entries(summary.deliveryProgress.byChannel).map(([channel, data]) => {
                const isOverDelivered = data.deliveryPercent > 100;
                const statusColor = isOverDelivered ? "text-blue-600" :
                  data.deliveryPercent >= 90 ? "text-green-600" :
                  data.deliveryPercent >= 70 ? "text-yellow-600" :
                  "text-red-600";
                
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{channel}</span>
                      <span className={cn("font-medium", statusColor)}>
                        {data.delivered.toLocaleString()} / {data.goal.toLocaleString()} {data.volumeLabel}
                      </span>
                    </div>
                    <Progress value={Math.min(data.deliveryPercent, 100)} className="h-2" />
                    <div className="flex justify-end text-xs text-muted-foreground">
                      <span className={cn(statusColor)}>
                        {data.deliveryPercent}%{isOverDelivered && " ✓"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Data Source */}
      <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Digital Channels (Tracked) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 font-sans">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                Digital Channels
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help">
                    <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 py-0 px-2">Tracked</Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Automatically tracked via pixels/scripts</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <div className="mx-6 border-t"></div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Impressions</p>
                <p className="text-xl font-bold font-sans">{digitalTotals.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Clicks</p>
                <p className="text-xl font-bold font-sans">{digitalTotals.clicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">CTR</p>
                <p className="text-xl font-bold font-sans">{digitalTotals.ctr.toFixed(2)}%</p>
              </div>
            </div>
            {digitalChannels.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2 font-sans">Channels:</p>
                <div className="flex flex-wrap gap-1">
                  {digitalChannels.map(c => (
                    <Badge key={c.channel} variant="secondary" className="text-xs capitalize">
                      {c.channel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Channels (Self-Reported) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 font-sans">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-600" />
                Offline Channels
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help">
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 py-0 px-2">Self-Reported</Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Reported by publications with proof</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <div className="mx-6 border-t"></div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4">
              {offlineTotals.insertions > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Print Insertions</p>
                  <p className="text-xl font-bold font-sans">{offlineTotals.insertions.toLocaleString()}</p>
                </div>
              )}
              {offlineTotals.spotsAired > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Radio Spots</p>
                  <p className="text-xl font-bold font-sans">{offlineTotals.spotsAired.toLocaleString()}</p>
                </div>
              )}
              {offlineTotals.downloads > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Podcast Downloads</p>
                  <p className="text-xl font-bold font-sans">{offlineTotals.downloads.toLocaleString()}</p>
                </div>
              )}
              {offlineTotals.reach > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Est. Reach</p>
                  <p className="text-xl font-bold font-sans">{offlineTotals.reach.toLocaleString()}</p>
                </div>
              )}
              {offlineTotals.insertions === 0 && offlineTotals.spotsAired === 0 && offlineTotals.downloads === 0 && (
                <div className="col-span-3 text-center py-2 text-muted-foreground text-sm">
                  No offline data reported yet
                </div>
              )}
            </div>
            {offlineChannels.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2 font-sans">Channels:</p>
                <div className="flex flex-wrap gap-1">
                  {offlineChannels.map(c => (
                    <Badge key={c.channel} variant="secondary" className="text-xs capitalize">
                      {c.channel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </TooltipProvider>

      {/* Combined Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{summary.totals.impressions.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{summary.totals.clicks.toLocaleString()}</p>
              </div>
              <MousePointerClick className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall CTR</p>
                <p className="text-2xl font-bold">{summary.totals.ctr?.toFixed(2) || '0.00'}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Publications</p>
                <p className="text-2xl font-bold">{summary.totals.publications}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Campaign Pacing - For Future Implementation
          This component compares campaign timeline progress vs delivery completion.
          Currently hidden until the logic and UX can be improved.
      
      {/* Pacing Progress *\/}
      {summary.pacing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Pacing</CardTitle>
            <CardDescription>
              Day {summary.pacing.daysPassed} of {summary.pacing.totalDays} • 
              {summary.pacing.daysRemaining} days remaining
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Delivery Progress</span>
                <span className="font-medium">{summary.pacing.percentComplete}%</span>
              </div>
              <div className="relative">
                <Progress value={summary.pacing.percentComplete} className="h-4" />
                {/* Expected marker *\/}
                <div 
                  className="absolute top-0 w-0.5 h-4 bg-gray-800"
                  style={{ left: `${Math.min(summary.pacing.expectedPercent, 100)}%` }}
                  title={`Expected: ${summary.pacing.expectedPercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Expected: {summary.pacing.expectedPercent}%
                </span>
                <span>
                  {summary.pacing.percentComplete > summary.pacing.expectedPercent 
                    ? `+${summary.pacing.percentComplete - summary.pacing.expectedPercent}%`
                    : `${summary.pacing.percentComplete - summary.pacing.expectedPercent}%`
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      */}

      {/* Tabs for Breakdowns */}
      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">By Channel</TabsTrigger>
          <TabsTrigger value="publications">By Publication</TabsTrigger>
          <TabsTrigger value="daily">Daily Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {summary.byChannel.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No channel data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byChannel.map((channel) => {
                      const config = getChannelConfig(channel.channel);
                      const isDigital = isDigitalChannel(channel.channel);
                      return (
                        <TableRow key={channel.channel}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-3 h-3 rounded-full", getChannelColor(channel.channel))} />
                              <span className="capitalize font-medium">{channel.channel}</span>
                              {getDataSourceBadge(channel.channel)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{channel.entries}</TableCell>
                          <TableCell className="text-right font-mono">
                            {channel.impressions.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {channel.clicks.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {channel.ctr?.toFixed(2) || '0.00'}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {channel.reach.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {channel.units.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publications" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {summary.byPublication.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No publication data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Publication</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byPublication.map((pub) => (
                      <TableRow key={pub.publicationId}>
                        <TableCell>
                          <div className="font-medium">{pub.publicationName}</div>
                          <div className="text-xs text-muted-foreground">ID: {pub.publicationId}</div>
                        </TableCell>
                        <TableCell className="text-right">{pub.entries}</TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.ctr?.toFixed(2) || '0.00'}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.units.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No daily data available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{format(new Date(day.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">{day.entries}</TableCell>
                        <TableCell className="text-right font-mono">
                          {day.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.ctr?.toFixed(2) || '0.00'}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.units.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CampaignPerformanceDashboard;
