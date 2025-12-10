/**
 * Campaign Performance Dashboard
 * 
 * Displays campaign-level metrics, pacing, and breakdowns by publication/channel.
 * Used by hub admins to monitor overall campaign delivery.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointerClick, 
  Eye, 
  Loader2,
  CalendarIcon,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  PacingStatus, 
  PACING_STATUS_LABELS, 
  PACING_STATUS_COLORS,
  getDateRange
} from '@/integrations/mongodb/dailyAggregateSchema';

interface CampaignPerformanceDashboardProps {
  campaignId: string;
  campaignName?: string;
  startDate?: Date;
  endDate?: Date;
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
      {/* Header with Campaign Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{summary.campaignName || campaignName || 'Campaign Performance'}</h2>
          <p className="text-muted-foreground">
            {summary.dateRange.start && format(new Date(summary.dateRange.start), 'MMM d, yyyy')} - 
            {summary.dateRange.end && format(new Date(summary.dateRange.end), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.pacing && getPacingBadge(summary.pacing.status)}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
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
                <p className="text-sm text-muted-foreground">Clicks</p>
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
                <p className="text-sm text-muted-foreground">CTR</p>
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

      {/* Pacing Progress */}
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
                {/* Expected marker */}
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

      {/* Tabs for Breakdowns */}
      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">By Channel</TabsTrigger>
          <TabsTrigger value="publications">By Publication</TabsTrigger>
          <TabsTrigger value="daily">Daily Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Channel Performance</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {summary.byChannel.map((channel) => (
                      <TableRow key={channel.channel}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", getChannelColor(channel.channel))} />
                            <span className="capitalize font-medium">{channel.channel}</span>
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publication Performance</CardTitle>
            </CardHeader>
            <CardContent>
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Daily Performance</CardTitle>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFrom && format(dateFrom, 'MMM d')} - {dateTo && format(dateTo, 'MMM d')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{ from: dateFrom, to: dateTo }}
                        onSelect={(range) => {
                          setDateFrom(range?.from);
                          setDateTo(range?.to);
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
