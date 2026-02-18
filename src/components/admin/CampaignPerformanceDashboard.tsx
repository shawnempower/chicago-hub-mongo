/**
 * Campaign Performance Dashboard
 * 
 * Displays campaign-level metrics, pacing, and breakdowns by publication/channel.
 * Used by hub admins to monitor overall campaign delivery.
 * Separates digital (tracked) vs offline (self-reported) metrics for clarity.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TrendingDown,
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
  Download,
  DollarSign,
  Clock,
  Target,
  BarChart,
  LineChart as LineChartIcon,
  TableIcon,
} from 'lucide-react';
import { format, subDays, differenceInDays, startOfMonth } from 'date-fns';
import { 
  Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  ComposedChart,
} from 'recharts';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  PacingStatus, 
  PACING_STATUS_LABELS, 
} from '@/integrations/mongodb/dailyAggregateSchema';
import { isDigitalChannel, getChannelConfig } from '@/config/inventoryChannels';
import { PublicationPerformanceCard } from './PublicationPerformanceCard';

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

export interface PublicationContext {
  publicationType?: string;
  contentType?: string;
  websiteUrl?: string;
  founded?: string | number;
  geographicCoverage?: string;
  primaryServiceArea?: string;
  secondaryMarkets?: string[];
  audienceDemographics?: {
    totalAudience?: number;
    ageGroups?: Record<string, number>;
    gender?: Record<string, number>;
    householdIncome?: Record<string, number>;
    education?: Record<string, number>;
    interests?: string[];
    targetMarkets?: string[];
  };
  editorialInfo?: {
    contentFocus?: string[];
    contentPillars?: string[];
    specialSections?: string[];
  };
  competitiveInfo?: {
    uniqueValueProposition?: string;
    keyDifferentiators?: string[];
  };
  awards?: Array<{ award?: string; organization?: string; year?: number }>;
  channelAudience?: Record<string, any>;
  aiProfile?: {
    summary: string;
    fullProfile: string;
    audienceInsight: string;
    communityRole: string;
    citations: string[];
    generatedAt: Date;
    version: number;
  };
}

export interface PublicationActivity {
  orderStatus?: string;
  deliveryGoals?: Record<string, { goalType: string; goalValue: number; description?: string }>;
  deliverySummary?: {
    totalGoalValue: number;
    totalDelivered: number;
    percentComplete: number;
    byChannel?: Record<string, { goal: number; delivered: number; percent: number }>;
  };
  assetStatus?: {
    totalPlacements: number;
    placementsWithAssets: number;
    allAssetsReady: boolean;
  };
  proofStatus?: {
    complete: boolean;
    proofCount: number;
  };
  orderTotal?: number;
  channelMix?: Array<{
    channel: string;
    itemName: string;
    itemPath: string;
    placementStatus?: string;
  }>;
}

export interface PublicationPerformance {
  publicationId: number;
  publicationName: string;
  entries: number;
  impressions: number;
  clicks: number;
  ctr: number;
  reach: number;
  units: number;
  context?: PublicationContext;
  activity?: PublicationActivity;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  advertiserName?: string;
  status?: string;
  dateRange: { start: string; end: string };
  budget?: {
    totalBudget?: number;
    monthlyBudget?: number;
    currency?: string;
  };
  pricing?: {
    total?: number;
    monthlyTotal?: number;
  };
  performanceRange: { earliest: Date | null; latest: Date | null };
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
  byPublication: PublicationPerformance[];
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

type DatePreset = 'last7' | 'last30' | 'thisMonth' | 'fullCampaign';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'fullCampaign', label: 'Full campaign' },
];

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
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  const [dailyViewMode, setDailyViewMode] = useState<'chart' | 'table'>('chart');

  const applyDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'last7':
        setDateFrom(subDays(now, 7));
        setDateTo(now);
        break;
      case 'last30':
        setDateFrom(subDays(now, 30));
        setDateTo(now);
        break;
      case 'thisMonth':
        setDateFrom(startOfMonth(now));
        setDateTo(now);
        break;
      case 'fullCampaign':
        setDateFrom(startDate ? new Date(startDate) : undefined);
        setDateTo(endDate ? new Date(endDate) : now);
        break;
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  // Refetch daily data when date range changes
  useEffect(() => {
    if (summary) {
      fetchDailyData();
    }
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch summary and daily data in parallel
      const [summaryRes, dailyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reporting/campaign/${campaignId}/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(
          `${API_BASE_URL}/reporting/campaign/${campaignId}/daily?dateFrom=${dateFrom?.toISOString()}&dateTo=${dateTo?.toISOString()}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        ),
      ]);

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

  const fetchDailyData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const dailyRes = await fetch(
        `${API_BASE_URL}/reporting/campaign/${campaignId}/daily?dateFrom=${dateFrom?.toISOString()}&dateTo=${dateTo?.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyData(data.daily || []);
      }
    } catch (error) {
      console.error('Error fetching daily data:', error);
    }
  };

  // Computed cost efficiency metrics
  const costMetrics = useMemo(() => {
    if (!summary) return null;
    const totalSpend = summary.pricing?.total || summary.budget?.totalBudget || 0;
    if (!totalSpend) return null;
    
    return {
      totalSpend,
      effectiveCPM: summary.totals.impressions > 0 
        ? (totalSpend / summary.totals.impressions) * 1000 
        : 0,
      effectiveCPC: summary.totals.clicks > 0 
        ? totalSpend / summary.totals.clicks 
        : 0,
    };
  }, [summary]);

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
      {/* Executive Summary Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-sans">
                {summary.campaignName || 'Campaign Performance'}
              </CardTitle>
              {summary.advertiserName && (
                <CardDescription className="text-sm mt-1">
                  Advertiser: {summary.advertiserName}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {summary.status && (
                <Badge variant="outline" className="capitalize">{summary.status}</Badge>
              )}
              {summary.pacing && getPacingBadge(summary.pacing.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {summary.dateRange.start && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  {format(new Date(summary.dateRange.start), 'MMM d, yyyy')} 
                  {summary.dateRange.end && ` – ${format(new Date(summary.dateRange.end), 'MMM d, yyyy')}`}
                </span>
              </div>
            )}
            {summary.pacing && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Day {summary.pacing.daysPassed} of {summary.pacing.totalDays} ({summary.pacing.daysRemaining} remaining)</span>
              </div>
            )}
            {summary.totals.publications > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{summary.totals.publications} publication{summary.totals.publications !== 1 ? 's' : ''}</span>
              </div>
            )}
            {costMetrics && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>${costMetrics.totalSpend.toLocaleString()} total investment</span>
              </div>
            )}
          </div>
          {/* Executive summary line */}
          {summary.deliveryProgress && summary.pacing && (
            <p className="text-sm mt-3 text-foreground">
              Campaign has delivered <strong>{summary.deliveryProgress.overallPercent}%</strong> of goals
              {summary.pacing.daysRemaining > 0 && <> with <strong>{summary.pacing.daysRemaining} days</strong> remaining</>}.
              {' '}Pacing is <strong>{PACING_STATUS_LABELS[summary.pacing.status]?.toLowerCase()}</strong>.
              {summary.totals.impressions > 0 && (
                <> Total reach: <strong>{summary.totals.impressions.toLocaleString()}</strong> impressions, <strong>{summary.totals.clicks.toLocaleString()}</strong> clicks ({summary.totals.ctr?.toFixed(2)}% CTR).</>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Date Range Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <span className="text-sm text-muted-foreground font-medium">Period:</span>
        {DATE_PRESETS.map(preset => (
          <Button
            key={preset.value}
            variant={datePreset === preset.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyDatePreset(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, 'MMM d') : 'From'} – {dateTo ? format(dateTo, 'MMM d') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateFrom, to: dateTo }}
              onSelect={(range) => {
                setDateFrom(range?.from);
                setDateTo(range?.to);
                setDatePreset('fullCampaign');
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 print:hidden"
            onClick={() => window.print()}
          >
            <Download className="w-3.5 h-3.5" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Campaign Pacing */}
      {summary.pacing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2 font-sans">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Campaign Pacing
              </div>
              {getPacingBadge(summary.pacing.status)}
            </CardTitle>
            <CardDescription>
              Day {summary.pacing.daysPassed} of {summary.pacing.totalDays} &bull; {summary.pacing.daysRemaining} days remaining
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Delivery Progress</span>
                <span className="font-medium font-mono">{summary.pacing.percentComplete}%</span>
              </div>
              <div className="relative">
                <Progress value={Math.min(summary.pacing.percentComplete, 100)} className="h-4" />
                {/* Expected delivery marker */}
                <div 
                  className="absolute top-0 w-0.5 h-4 bg-foreground/70 rounded-full"
                  style={{ left: `${Math.min(summary.pacing.expectedPercent, 100)}%` }}
                  title={`Expected: ${summary.pacing.expectedPercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Expected at this point: {summary.pacing.expectedPercent}%
                </span>
                <span className={cn(
                  "font-medium",
                  summary.pacing.percentComplete >= summary.pacing.expectedPercent ? "text-green-600" : "text-yellow-600"
                )}>
                  {summary.pacing.percentComplete > summary.pacing.expectedPercent 
                    ? `+${(summary.pacing.percentComplete - summary.pacing.expectedPercent).toFixed(0)}% ahead`
                    : `${(summary.pacing.percentComplete - summary.pacing.expectedPercent).toFixed(0)}% behind`
                  }
                </span>
              </div>
            </div>
            {/* Timeline bar */}
            {summary.dateRange.start && summary.dateRange.end && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>{format(new Date(summary.dateRange.start), 'MMM d, yyyy')}</span>
                <div className="flex-1 mx-3 h-1 bg-muted rounded-full relative">
                  <div 
                    className="absolute top-0 left-0 h-1 bg-primary rounded-full" 
                    style={{ width: `${Math.min((summary.pacing.daysPassed / summary.pacing.totalDays) * 100, 100)}%` }}
                  />
                </div>
                <span>{format(new Date(summary.dateRange.end), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Progress - by channel */}
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
                        {data.deliveryPercent}%{isOverDelivered && " (over-delivered)"}
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

      {/* Summary Cards with Cost Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{summary.totals.impressions.toLocaleString()}</p>
              </div>
              <Eye className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{summary.totals.clicks.toLocaleString()}</p>
              </div>
              <MousePointerClick className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall CTR</p>
                <p className="text-2xl font-bold">{summary.totals.ctr?.toFixed(2) || '0.00'}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Publications</p>
                <p className="text-2xl font-bold">{summary.totals.publications}</p>
              </div>
              <Users className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        {costMetrics && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Effective CPM</p>
                    <p className="text-2xl font-bold">${costMetrics.effectiveCPM.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Effective CPC</p>
                    <p className="text-2xl font-bold">${costMetrics.effectiveCPC.toFixed(2)}</p>
                  </div>
                  <MousePointerClick className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

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
          {summary.byPublication.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p>No publication data available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {summary.byPublication.map((pub) => (
                <PublicationPerformanceCard key={pub.publicationId} publication={pub} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-sans">Daily Performance</CardTitle>
                <div className="flex items-center gap-1 border rounded-md p-0.5">
                  <Button 
                    variant={dailyViewMode === 'chart' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 px-2"
                    onClick={() => setDailyViewMode('chart')}
                  >
                    <BarChart className="w-3.5 h-3.5 mr-1" />
                    Chart
                  </Button>
                  <Button 
                    variant={dailyViewMode === 'table' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 px-2"
                    onClick={() => setDailyViewMode('table')}
                  >
                    <TableIcon className="w-3.5 h-3.5 mr-1" />
                    Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No daily data available</p>
              ) : dailyViewMode === 'chart' ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="impressionsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(new Date(val), 'M/d')}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        interval={Math.max(0, Math.floor(dailyData.length / 8) - 1)}
                        axisLine={false}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis 
                        yAxisId="impressions"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        label={{ value: 'Impressions', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 10, fill: 'hsl(217, 91%, 60%)' } }}
                      />
                      <YAxis 
                        yAxisId="clicks"
                        orientation="right"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        label={{ value: 'Clicks', angle: 90, position: 'insideRight', offset: 8, style: { fontSize: 10, fill: 'hsl(142, 76%, 36%)' } }}
                      />
                      <RechartsTooltip 
                        labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const impressions = payload.find(p => p.dataKey === 'impressions')?.value as number ?? 0;
                          const clicks = payload.find(p => p.dataKey === 'clicks')?.value as number ?? 0;
                          const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
                          return (
                            <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                {format(new Date(label), 'MMM d, yyyy')}
                              </p>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between gap-6">
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
                                    Impressions
                                  </span>
                                  <span className="font-mono font-medium">{impressions.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
                                    Clicks
                                  </span>
                                  <span className="font-mono font-medium">{clicks.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-6 pt-1 border-t">
                                  <span className="text-muted-foreground">CTR</span>
                                  <span className="font-mono font-medium">{ctr}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend 
                        formatter={(value) => value === 'impressions' ? 'Impressions' : 'Clicks'}
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Area 
                        yAxisId="impressions"
                        type="monotone" 
                        dataKey="impressions" 
                        fill="url(#impressionsFill)"
                        stroke="hsl(217, 91%, 60%)" 
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="clicks"
                        type="monotone"
                        dataKey="clicks"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        dot={dailyData.length <= 31 ? { r: 2.5, fill: 'hsl(142, 76%, 36%)', strokeWidth: 0 } : false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
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
