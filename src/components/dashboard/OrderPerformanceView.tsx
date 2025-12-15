/**
 * Order Performance View
 * 
 * Displays delivery progress, performance history, and pacing for an order.
 * Used by publications to track their delivery against campaign goals.
 * Provides quick entry options for offline channels.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Zap,
  Newspaper,
  Radio,
  Mic,
  ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ReportResultsForm } from './ReportResultsForm';
import { PACING_STATUS_LABELS, PacingStatus } from '@/integrations/mongodb/dailyAggregateSchema';
import { PerformanceEntry } from '@/integrations/mongodb/performanceEntrySchema';
import { PROOF_FILE_TYPE_LABELS, ProofOfPerformance, formatFileSize } from '@/integrations/mongodb/proofOfPerformanceSchema';
import { isDigitalChannel, getChannelConfig } from '@/config/inventoryChannels';

interface OrderPerformanceViewProps {
  orderId: string;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  placements: Array<{
    itemPath: string;
    itemName: string;
    channel: string;
    dimensions?: string;
  }>;
  deliveryGoals?: Record<string, {
    goalType: 'impressions' | 'clicks' | 'units';
    goalValue: number;
    description?: string;
  }>;
  deliverySummary?: {
    totalGoalValue: number;
    totalDelivered: number;
    percentComplete: number;
    byChannel?: Record<string, { goal: number; delivered: number; percent: number }>;
    lastUpdated: Date;
  };
  /** When true, show hub admin controls (e.g., delete entries) */
  isHubView?: boolean;
}

export function OrderPerformanceView({
  orderId,
  campaignId,
  publicationId,
  publicationName,
  placements,
  deliveryGoals,
  deliverySummary,
  isHubView = false,
}: OrderPerformanceViewProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [proofs, setProofs] = useState<ProofOfPerformance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [quickEntryPlacement, setQuickEntryPlacement] = useState<typeof placements[0] | null>(null);

  // Identify offline placements that would benefit from quick entry
  const offlinePlacements = useMemo(() => {
    return placements.filter(p => !isDigitalChannel(p.channel));
  }, [placements]);

  const hasOfflinePlacements = offlinePlacements.length > 0;

  const getPlacementIcon = (channel: string) => {
    switch (channel) {
      case 'print': return <Newspaper className="w-4 h-4" />;
      case 'radio': return <Radio className="w-4 h-4" />;
      case 'podcast': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch performance entries
      const entriesRes = await fetch(`${API_BASE_URL}/performance-entries/order/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch proofs
      const proofsRes = await fetch(`${API_BASE_URL}/proof-of-performance/order/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch summary
      const summaryRes = await fetch(`${API_BASE_URL}/reporting/order/${orderId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
      }
      
      if (proofsRes.ok) {
        const data = await proofsRes.json();
        setProofs(data.proofs || []);
      }
      
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance data',
        variant: 'destructive',
      });
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const overallPercent = deliverySummary?.percentComplete || 0;
  const overallStatus = getPacingStatus(overallPercent);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Delivery Progress
              </CardTitle>
              <CardDescription>
                Overall campaign delivery against goals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Report Results for Offline Channels */}
              {hasOfflinePlacements && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      <Zap className="w-4 h-4 mr-2" />
                      Report Results
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>What are you reporting?</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {offlinePlacements.map((placement) => {
                      const config = getChannelConfig(placement.channel);
                      return (
                        <DropdownMenuItem
                          key={placement.itemPath}
                          onClick={() => {
                            setQuickEntryPlacement(placement);
                            setShowQuickEntry(true);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 w-full">
                            {getPlacementIcon(placement.channel)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{placement.itemName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{config.label}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Delivery</span>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold", getPacingColor(overallStatus))}>
                  {overallPercent}%
                </span>
                <Badge className={cn(getPacingBg(overallStatus), getPacingColor(overallStatus), "border-0")}>
                  {PACING_STATUS_LABELS[overallStatus]}
                </Badge>
              </div>
            </div>
            <Progress value={Math.min(overallPercent, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {deliverySummary?.totalDelivered?.toLocaleString() || 0} delivered
              </span>
              <span>
                Goal: {deliverySummary?.totalGoalValue?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* By Channel */}
          {deliverySummary?.byChannel && Object.keys(deliverySummary.byChannel).length > 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-medium">By Channel</h4>
              <div className="grid gap-3">
                {Object.entries(deliverySummary.byChannel).map(([channel, data]) => {
                  const status = getPacingStatus(data.percent);
                  return (
                    <div key={channel} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{channel}</span>
                        <span className={cn("font-medium", getPacingColor(status))}>
                          {data.percent}%
                        </span>
                      </div>
                      <Progress value={Math.min(data.percent, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{data.delivered.toLocaleString()}</span>
                        <span>{data.goal.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Stats - computed from entries */}
          {entries.length > 0 && (
            <>
              <Separator />
              {(() => {
                // Compute totals from entries
                const totals = entries.reduce((acc, entry) => {
                  const m = entry.metrics;
                  return {
                    impressions: acc.impressions + (m.impressions || 0),
                    clicks: acc.clicks + (m.clicks || 0),
                    insertions: acc.insertions + (m.insertions || 0),
                    circulation: acc.circulation + (m.circulation || 0),
                    spotsAired: acc.spotsAired + (m.spotsAired || 0),
                    estimatedReach: acc.estimatedReach + (m.estimatedReach || 0),
                    downloads: acc.downloads + (m.downloads || 0),
                  };
                }, { impressions: 0, clicks: 0, insertions: 0, circulation: 0, spotsAired: 0, estimatedReach: 0, downloads: 0 });
                
                // Determine which stats to show based on what has data
                const hasDigital = totals.impressions > 0 || totals.clicks > 0;
                const hasPrint = totals.insertions > 0 || totals.circulation > 0;
                const hasRadio = totals.spotsAired > 0 || totals.estimatedReach > 0;
                const hasPodcast = totals.downloads > 0;
                
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Always show entries count */}
                    <div className="text-center">
                      <p className="text-2xl font-bold">{entries.length}</p>
                      <p className="text-xs text-muted-foreground">Reports</p>
                    </div>
                    
                    {/* Digital stats */}
                    {hasDigital && (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.impressions.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                        </div>
                        {totals.clicks > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Clicks</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Print stats */}
                    {hasPrint && (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.insertions}</p>
                          <p className="text-xs text-muted-foreground">Issues</p>
                        </div>
                        {totals.circulation > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">{totals.circulation.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Circulation</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Radio stats */}
                    {hasRadio && (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.spotsAired}</p>
                          <p className="text-xs text-muted-foreground">Spots Aired</p>
                        </div>
                        {totals.estimatedReach > 0 && (
                          <div className="text-center">
                            <p className="text-2xl font-bold">~{totals.estimatedReach.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Est. Reach</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Podcast stats */}
                    {hasPodcast && (
                      <div className="text-center">
                        <p className="text-2xl font-bold">{totals.downloads.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Downloads</p>
                      </div>
                    )}
                    
                    {/* Proofs count */}
                    <div className="text-center">
                      <p className="text-2xl font-bold">{proofs.length}</p>
                      <p className="text-xs text-muted-foreground">Proofs</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Entries and Proofs */}
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">
            Performance Entries ({entries.length})
          </TabsTrigger>
          <TabsTrigger value="proofs">
            Proof of Performance ({proofs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                  <p>No performance entries yet</p>
                  {hasOfflinePlacements && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setQuickEntryPlacement(offlinePlacements[0]);
                        setShowQuickEntry(true);
                      }}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Report Results
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Reported Metrics</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      // Build channel-appropriate metrics display
                      const getMetricsDisplay = () => {
                        const metrics = entry.metrics;
                        const parts: string[] = [];
                        
                        // Digital metrics
                        if (metrics.impressions) parts.push(`${metrics.impressions.toLocaleString()} impressions`);
                        if (metrics.clicks) parts.push(`${metrics.clicks.toLocaleString()} clicks`);
                        if (metrics.ctr) parts.push(`${metrics.ctr.toFixed(2)}% CTR`);
                        
                        // Print metrics
                        if (metrics.insertions) parts.push(`${metrics.insertions} issue${metrics.insertions > 1 ? 's' : ''}`);
                        if (metrics.circulation) parts.push(`${metrics.circulation.toLocaleString()} circulation`);
                        if (metrics.readers) parts.push(`${metrics.readers.toLocaleString()} readers`);
                        
                        // Radio metrics
                        if (metrics.spotsAired) parts.push(`${metrics.spotsAired} spot${metrics.spotsAired > 1 ? 's' : ''} aired`);
                        if (metrics.frequency) parts.push(`${metrics.frequency}x frequency`);
                        if (metrics.estimatedReach) parts.push(`~${metrics.estimatedReach.toLocaleString()} reach`);
                        
                        // Podcast metrics
                        if (metrics.downloads) parts.push(`${metrics.downloads.toLocaleString()} downloads`);
                        if (metrics.listens) parts.push(`${metrics.listens.toLocaleString()} listens`);
                        if (metrics.completionRate) parts.push(`${metrics.completionRate}% completion`);
                        
                        // Social metrics
                        if (metrics.posts) parts.push(`${metrics.posts} post${metrics.posts > 1 ? 's' : ''}`);
                        if (metrics.engagement) parts.push(`${metrics.engagement.toLocaleString()} engagements`);
                        
                        return parts.length > 0 ? parts : ['No metrics reported'];
                      };
                      
                      const metricsDisplay = getMetricsDisplay();
                      
                      return (
                        <TableRow key={entry._id?.toString()}>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(entry.dateStart), 'MMM d, yyyy')}
                              {entry.dateEnd && (
                                <> - {format(new Date(entry.dateEnd), 'MMM d')}</>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={entry.itemName}>
                              {entry.itemName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entry.channel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {metricsDisplay.map((metric, idx) => (
                                <div key={idx} className="text-sm">
                                  {metric}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate text-muted-foreground text-xs" title={entry.notes}>
                              {entry.notes || '-'}
                            </div>
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

        <TabsContent value="proofs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>No proofs uploaded yet</p>
                  {hasOfflinePlacements && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setQuickEntryPlacement(offlinePlacements[0]);
                        setShowQuickEntry(true);
                      }}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Report Results
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Run Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proofs.map((proof) => (
                      <TableRow key={proof._id?.toString()}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium truncate max-w-[200px]" title={proof.fileName}>
                                {proof.fileName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(proof.fileSize)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PROOF_FILE_TYPE_LABELS[proof.fileType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proof.runDate ? format(new Date(proof.runDate), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {proof.verificationStatus === 'verified' ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : proof.verificationStatus === 'rejected' ? (
                            <Badge className="bg-red-100 text-red-700 border-0">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-0">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(proof.uploadedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
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

      {/* Report Results Dialog */}
      {quickEntryPlacement && (
        <Dialog open={showQuickEntry} onOpenChange={(open) => {
          setShowQuickEntry(open);
          if (!open) setQuickEntryPlacement(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Report Results
              </DialogTitle>
            </DialogHeader>
            <ReportResultsForm
              orderId={orderId}
              campaignId={campaignId}
              publicationId={publicationId}
              publicationName={publicationName}
              placement={quickEntryPlacement}
              onSuccess={() => {
                setShowQuickEntry(false);
                setQuickEntryPlacement(null);
                fetchData();
              }}
              onCancel={() => {
                setShowQuickEntry(false);
                setQuickEntryPlacement(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default OrderPerformanceView;
