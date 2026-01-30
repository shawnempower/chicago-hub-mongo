/**
 * Publication Delivery Progress
 * 
 * Displays aggregated delivery progress across all active orders for a publication.
 * Shows overall delivery percentage, pacing status, and breakdown by channel.
 * Similar to the hub's CampaignPerformanceDashboard delivery section.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  Loader2,
  FileText,
  Newspaper,
  Radio,
  Mic,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { PacingStatus, PACING_STATUS_LABELS } from '@/integrations/mongodb/dailyAggregateSchema';

interface PublicationDeliveryProgressProps {
  publicationId?: number;
  compact?: boolean;
}

interface DeliverySummary {
  overallDeliveryPercent: number;
  totalExpectedReports: number;
  totalReportsSubmitted: number;
  totalOrders: number;
  activeOrders: number;
  byChannel: Record<string, {
    goal: number;
    delivered: number;
    deliveryPercent: number;
    goalType: string;
    volumeLabel: string;
  }>;
  totals: {
    reports: number;
    impressions: number;
    clicks: number;
    insertions: number;
    circulation: number;
    spotsAired: number;
    downloads: number;
    proofs: number;
  };
  statusBreakdown: {
    on_track: number;
    ahead: number;
    behind: number;
    at_risk: number;
  };
}

export function PublicationDeliveryProgress({ 
  publicationId,
  compact = false 
}: PublicationDeliveryProgressProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DeliverySummary | null>(null);

  useEffect(() => {
    fetchDeliverySummary();
  }, [publicationId]);

  const fetchDeliverySummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = publicationId
        ? `${API_BASE_URL}/publication-orders/delivery-summary?publicationId=${publicationId}`
        : `${API_BASE_URL}/publication-orders/delivery-summary`;
        
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delivery summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching delivery summary:', error);
      // Fail silently - not critical for dashboard
    } finally {
      setLoading(false);
    }
  };

  const getPacingStatus = (percent: number): PacingStatus => {
    if (percent >= 110) return 'ahead';
    if (percent >= 90) return 'on_track';
    if (percent >= 70) return 'behind';
    return 'at_risk';
  };

  const getPacingColor = (status: PacingStatus) => {
    switch (status) {
      case 'ahead': return 'text-blue-600';
      case 'on_track': return 'text-green-600';
      case 'behind': return 'text-yellow-600';
      case 'at_risk': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPacingBg = (status: PacingStatus) => {
    switch (status) {
      case 'ahead': return 'bg-blue-100';
      case 'on_track': return 'bg-green-100';
      case 'behind': return 'bg-yellow-100';
      case 'at_risk': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getPacingIcon = (status: PacingStatus) => {
    switch (status) {
      case 'ahead': return <TrendingUp className="w-3 h-3 mr-1" />;
      case 'on_track': return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'behind': return <AlertTriangle className="w-3 h-3 mr-1" />;
      case 'at_risk': return <AlertTriangle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'print': return <Newspaper className="w-4 h-4" />;
      case 'radio': return <Radio className="w-4 h-4" />;
      case 'podcast': return <Mic className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no active orders
  if (!summary || summary.activeOrders === 0) {
    return null;
  }

  const overallStatus = getPacingStatus(summary.overallDeliveryPercent);
  const hasChannels = Object.keys(summary.byChannel).length > 0;

  // Determine which totals to show based on what has data
  const hasDigital = summary.totals.impressions > 0 || summary.totals.clicks > 0;
  const hasPrint = summary.totals.insertions > 0;
  const hasRadio = summary.totals.spotsAired > 0;
  const hasPodcast = summary.totals.downloads > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2 font-sans">
              <BarChart3 className="w-5 h-5" />
              Delivery Progress
            </CardTitle>
            <CardDescription>
              Overall campaign delivery against goals
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard?tab=orders')}
          >
            View Orders
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Delivery Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Delivery</span>
            <div className="flex items-center gap-2">
              <span className={cn("font-bold text-lg", getPacingColor(overallStatus))}>
                {summary.overallDeliveryPercent}%
              </span>
              <Badge className={cn(getPacingBg(overallStatus), getPacingColor(overallStatus), "border-0")}>
                {getPacingIcon(overallStatus)}
                {PACING_STATUS_LABELS[overallStatus]}
              </Badge>
            </div>
          </div>
          <Progress 
            value={Math.min(summary.overallDeliveryPercent, 100)} 
            className="h-3" 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {summary.totalReportsSubmitted} of {summary.totalExpectedReports} placements reported
            </span>
            <span>{summary.activeOrders} active order{summary.activeOrders !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <Separator />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{summary.totals.reports}</p>
            <p className="text-xs text-muted-foreground">Reports</p>
          </div>
          
          {hasPrint && (
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totals.insertions}</p>
              <p className="text-xs text-muted-foreground">Issues</p>
            </div>
          )}
          
          {hasPrint && summary.totals.circulation > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totals.circulation.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Circulation</p>
            </div>
          )}

          {hasDigital && (
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totals.impressions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
          )}
          
          {hasRadio && (
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totals.spotsAired}</p>
              <p className="text-xs text-muted-foreground">Spots Aired</p>
            </div>
          )}
          
          {hasPodcast && (
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totals.downloads.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-2xl font-bold">{summary.totals.proofs}</p>
            <p className="text-xs text-muted-foreground">Proofs</p>
          </div>
        </div>

        {/* By Channel Breakdown */}
        {hasChannels && !compact && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">By Channel</h4>
              {Object.entries(summary.byChannel).map(([channel, data]) => {
                const isOverDelivered = data.deliveryPercent > 100;
                const status = getPacingStatus(data.deliveryPercent);
                const statusColor = isOverDelivered ? "text-blue-600" : getPacingColor(status);
                
                // Format goal label based on channel
                const goalLabel = data.goalType === 'impressions' ? data.volumeLabel : 
                  (channel === 'podcast' ? 'Episodes' : 
                   channel === 'radio' ? 'Spots' : 
                   channel === 'print' ? 'Insertions' : 'Units');
                
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel)}
                        <span className="capitalize font-medium">{channel}</span>
                      </div>
                      <span className={cn("font-medium", statusColor)}>
                        {data.delivered.toLocaleString()} / {data.goal.toLocaleString()} {goalLabel}
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
          </>
        )}

        {/* Order Status Breakdown */}
        {!compact && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Pacing:</span>
              <div className="flex gap-2">
                {summary.statusBreakdown.ahead > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    {summary.statusBreakdown.ahead} Ahead
                  </Badge>
                )}
                {summary.statusBreakdown.on_track > 0 && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    {summary.statusBreakdown.on_track} On Track
                  </Badge>
                )}
                {summary.statusBreakdown.behind > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-0">
                    {summary.statusBreakdown.behind} Behind
                  </Badge>
                )}
                {summary.statusBreakdown.at_risk > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-0">
                    {summary.statusBreakdown.at_risk} At Risk
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PublicationDeliveryProgress;
