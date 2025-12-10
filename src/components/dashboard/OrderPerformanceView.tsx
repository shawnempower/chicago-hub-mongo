/**
 * Order Performance View
 * 
 * Displays delivery progress, performance history, and pacing for an order.
 * Used by publications to track their delivery against campaign goals.
 */

import React, { useState, useEffect } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  FileText, 
  Image, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PerformanceEntryForm } from './PerformanceEntryForm';
import { ProofOfPerformanceUploader } from './ProofOfPerformanceUploader';
import { PACING_STATUS_COLORS, PACING_STATUS_LABELS, PacingStatus } from '@/integrations/mongodb/dailyAggregateSchema';
import { METRIC_LABELS, PerformanceEntry } from '@/integrations/mongodb/performanceEntrySchema';
import { PROOF_FILE_TYPE_LABELS, ProofOfPerformance, formatFileSize } from '@/integrations/mongodb/proofOfPerformanceSchema';

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
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddProof, setShowAddProof] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PerformanceEntry | null>(null);

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
              <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Performance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Report Performance</DialogTitle>
                  </DialogHeader>
                  <PerformanceEntryForm
                    orderId={orderId}
                    campaignId={campaignId}
                    publicationId={publicationId}
                    publicationName={publicationName}
                    placements={placements}
                    onSuccess={() => {
                      setShowAddEntry(false);
                      fetchData();
                    }}
                    onCancel={() => setShowAddEntry(false)}
                  />
                </DialogContent>
              </Dialog>
              
              <Dialog open={showAddProof} onOpenChange={setShowAddProof}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Proof
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Proof</DialogTitle>
                  </DialogHeader>
                  <ProofOfPerformanceUploader
                    orderId={orderId}
                    campaignId={campaignId}
                    publicationId={publicationId}
                    publicationName={publicationName}
                    placements={placements}
                    onSuccess={() => {
                      setShowAddProof(false);
                      fetchData();
                    }}
                    onCancel={() => setShowAddProof(false)}
                  />
                </DialogContent>
              </Dialog>
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

          {/* Summary Stats */}
          {summary && (
            <>
              <Separator />
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.totals?.impressions?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.totals?.clicks?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.totals?.ctr?.toFixed(2) || '0.00'}%</p>
                  <p className="text-xs text-muted-foreground">CTR</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.totals?.entries || 0}</p>
                  <p className="text-xs text-muted-foreground">Entries</p>
                </div>
              </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowAddEntry(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Entry
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
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
                        <TableCell className="text-right font-mono">
                          {entry.metrics.impressions?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.metrics.clicks?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(entry.metrics.insertions || 
                            entry.metrics.spotsAired || 
                            entry.metrics.posts || 
                            entry.metrics.downloads)?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate text-muted-foreground text-xs" title={entry.notes}>
                            {entry.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEntry(entry);
                              setShowAddEntry(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
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

        <TabsContent value="proofs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>No proofs uploaded yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowAddProof(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload First Proof
                  </Button>
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

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Entry</DialogTitle>
            </DialogHeader>
            <PerformanceEntryForm
              orderId={orderId}
              campaignId={campaignId}
              publicationId={publicationId}
              publicationName={publicationName}
              placements={placements}
              existingEntry={editingEntry}
              onSuccess={() => {
                setEditingEntry(null);
                fetchData();
              }}
              onCancel={() => setEditingEntry(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default OrderPerformanceView;
