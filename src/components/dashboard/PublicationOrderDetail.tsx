import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { OrderTimeline } from '../orders/OrderTimeline';
import { CreativeAssetCard } from '../orders/CreativeAssetCard';
import { OrderMessaging } from '../orders/OrderMessaging';
import { OrderPerformanceView } from './OrderPerformanceView';
import { 
  ArrowLeft, Check, X, AlertCircle, FileText, AlertTriangle, 
  Loader2, CheckCircle2, BarChart3, Code, Copy, ExternalLink,
  Calendar, DollarSign, Layers, MessageSquare, Download,
  ChevronDown, ChevronUp, Clock, Package, RefreshCw,
  Eye, Users, Newspaper, Radio, Headphones, CalendarDays, Target
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { PublicationInsertionOrderDocument } from '@/integrations/mongodb/insertionOrderSchema';
import { TrackingScript } from '@/integrations/mongodb/trackingScriptSchema';
import { API_BASE_URL } from '@/config/api';
import { getChannelConfig, isDigitalChannel } from '@/config/inventoryChannels';
import { cn } from '@/lib/utils';

interface OrderDetailData extends PublicationInsertionOrderDocument {}

export function PublicationOrderDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaignId');
  const publicationId = searchParams.get('publicationId');

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [placementStatuses, setPlacementStatuses] = useState<Record<string, 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered'>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPlacementId, setRejectingPlacementId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  
  // Fresh assets and tracking scripts
  const [freshAssets, setFreshAssets] = useState<Array<{
    specGroupId: string;
    placementId: string;
    placementName: string;
    channel: string;
    dimensions?: string;
    hasAsset: boolean;
    asset?: {
      assetId: string;
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      uploadedAt: Date;
      thumbnailUrl?: string;
    };
  }>>([]);
  const [trackingScripts, setTrackingScripts] = useState<TrackingScript[]>([]);
  
  // Performance entries and proofs for workflow tracking
  const [performanceEntries, setPerformanceEntries] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);

  useEffect(() => {
    if (campaignId && publicationId) {
      fetchOrderDetail();
      fetchFreshAssets();
      fetchTrackingScripts();
      fetchPerformanceData();
    }
  }, [campaignId, publicationId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setOrder(data.order);
      
      if (data.order?.placementStatuses) {
        setPlacementStatuses(data.order.placementStatuses);
      } else {
        const campaignData = data.order?.campaignData;
        const publication = campaignData?.selectedInventory?.publications?.find(
          (pub: any) => pub.publicationId === data.order.publicationId
        );
        if (publication?.inventoryItems) {
          const initialStatuses: Record<string, 'pending'> = {};
          publication.inventoryItems.forEach((item: any, idx: number) => {
            const placementId = item.itemPath || item.sourcePath || `placement-${idx}`;
            initialStatuses[placementId] = 'pending';
          });
          setPlacementStatuses(initialStatuses);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({ title: 'Error', description: 'Failed to load order details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFreshAssets = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/fresh-assets`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) setFreshAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching fresh assets:', error);
    }
  };

  const fetchTrackingScripts = async () => {
    if (!campaignId || !publicationId) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/tracking-scripts?campaignId=${campaignId}&publicationId=${publicationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setTrackingScripts(data.scripts || []);
      }
    } catch (error) {
      console.error('Error fetching tracking scripts:', error);
    }
  };

  const fetchPerformanceData = async () => {
    if (!campaignId || !publicationId) return;
    try {
      const token = localStorage.getItem('auth_token');
      // We need orderId, which we'll get after order loads
      // For now, fetch by campaign and publication
      const [entriesRes, proofsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/performance-entries?campaignId=${campaignId}&publicationId=${publicationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/proof-of-performance?campaignId=${campaignId}&publicationId=${publicationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setPerformanceEntries(data.entries || []);
      }
      if (proofsRes.ok) {
        const data = await proofsRes.json();
        setProofs(data.proofs || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const handleCopyScript = async (text: string, scriptId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScriptId(scriptId);
      setTimeout(() => setCopiedScriptId(null), 2000);
      toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    } catch (error) {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  const handleCopyAllScripts = async () => {
    const allScripts = trackingScripts.map(s =>
      `<!-- ${s.creative.name} (${s.creative.width}x${s.creative.height}) -->\n${s.tags.fullTag}`
    ).join('\n\n');
    try {
      await navigator.clipboard.writeText(allScripts);
      toast({ title: 'All Scripts Copied!', description: `${trackingScripts.length} tracking scripts copied to clipboard` });
    } catch (error) {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  const [refreshingScripts, setRefreshingScripts] = useState(false);
  
  const handleRefreshScripts = async () => {
    if (!order?.campaignId || !order?.publicationId) return;
    
    try {
      setRefreshingScripts(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/tracking-scripts/refresh/${order.campaignId}/${order.publicationId}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate scripts');
      }
      
      if (result.scriptsGenerated === 0) {
        toast({ 
          title: 'No Scripts Generated', 
          description: result.error || 'No digital creative assets found. Make sure image assets are uploaded for digital placements.',
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Scripts Generated!', 
          description: `Created ${result.scriptsGenerated} tracking scripts from uploaded creatives` 
        });
      }
      
      // Re-fetch tracking scripts
      fetchTrackingScripts();
    } catch (error) {
      toast({ 
        title: 'Generation Failed', 
        description: error instanceof Error ? error.message : 'Could not generate scripts', 
        variant: 'destructive' 
      });
    } finally {
      setRefreshingScripts(false);
    }
  };

  // isDigitalChannel is now imported from config/inventoryChannels

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/status`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }
      );
      if (!response.ok) throw new Error('Failed to update status');
      toast({ title: 'Success', description: 'Status updated successfully' });
      fetchOrderDetail();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handlePlacementAction = async (
    placementId: string, 
    newStatus: 'accepted' | 'rejected' | 'in_production' | 'delivered', 
    reason?: string
  ) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/placement-status`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ placementId, status: newStatus, notes: reason, autoConfirmIfAllAccepted: true })
        }
      );
      if (!response.ok) throw new Error('Failed to update placement status');
      const result = await response.json();
      
      setPlacementStatuses(prev => ({ ...prev, [placementId]: newStatus }));

      if (result.orderConfirmed) {
        toast({ title: '🎉 Order Confirmed!', description: 'All placements accepted. You can now access scripts and report performance.' });
        // Update order status locally instead of full refresh
        setOrder(prev => prev ? { ...prev, status: 'confirmed' } : prev);
      } else {
        const messages: Record<string, string> = {
          accepted: 'Placement accepted',
          rejected: 'Placement rejected - hub notified',
          in_production: 'Marked in production',
          delivered: 'Marked as delivered'
        };
        toast({ title: messages[newStatus] });
      }
      // Don't call fetchOrderDetail() - we've already updated local state
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update placement', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize?: number }>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, attachments })
        }
      );
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      if (data.message && order) {
        setOrder({ ...order, messages: [...(order.messages || []), data.message] });
      }
      toast({ title: 'Message sent' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      throw error;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Order not found</p>
          <Button variant="outline" onClick={() => navigate('/dashboard?tab=orders')} className="mt-4">
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Extract data
  const campaignData = (order as any).campaignData;
  const publication = campaignData?.selectedInventory?.publications?.find(
    (pub: any) => pub.publicationId === order.publicationId
  );
  const inventoryItems = publication?.inventoryItems || [];
  const totalPlacements = inventoryItems.length;
  const acceptedCount = Object.values(placementStatuses).filter(s => s === 'accepted').length;
  const inProductionCount = Object.values(placementStatuses).filter(s => s === 'in_production').length;
  const deliveredCount = Object.values(placementStatuses).filter(s => s === 'delivered').length;
  const rejectedCount = Object.values(placementStatuses).filter(s => s === 'rejected').length;
  const pendingCount = totalPlacements - acceptedCount - inProductionCount - deliveredCount - rejectedCount;
  
  // Channel types are now grouped dynamically in the Scripts tab
  
  const canShowPerformance = ['confirmed', 'in_production', 'delivered'].includes(order.status);
  const needsReview = order.status === 'sent';

  // Placements data for performance view
  const placementsForPerformance = inventoryItems.map((item: any, idx: number) => ({
    itemPath: item.itemPath || item.sourcePath || `placement-${idx}`,
    itemName: item.itemName || item.sourceName || 'Ad Placement',
    channel: item.channel || 'unknown',
    dimensions: item.format?.dimensions || item.format?.size,
  }));

  // Helper function to format numbers with commas
  const formatNumber = (num: number | undefined): string => {
    if (!num) return '—';
    return num.toLocaleString();
  };

  // Helper function to get delivery expectations for a placement
  const getDeliveryExpectations = (item: any): Array<{ label: string; value: string; icon: React.ReactNode }> => {
    const expectations: Array<{ label: string; value: string; icon: React.ReactNode }> = [];
    const channel = (item.channel || '').toLowerCase();
    const metrics = item.audienceMetrics || {};
    const perfMetrics = item.performanceMetrics || {};
    
    // Monthly impressions (for digital)
    if (item.monthlyImpressions || perfMetrics.impressionsPerMonth) {
      expectations.push({
        label: 'Est. Impressions',
        value: formatNumber(item.monthlyImpressions || perfMetrics.impressionsPerMonth) + '/mo',
        icon: <Eye className="h-3.5 w-3.5 text-blue-500" />
      });
    }
    
    // Channel-specific metrics
    if (channel === 'website') {
      if (metrics.monthlyPageViews) {
        expectations.push({
          label: 'Page Views',
          value: formatNumber(metrics.monthlyPageViews) + '/mo',
          icon: <Eye className="h-3.5 w-3.5 text-blue-500" />
        });
      }
      if (metrics.monthlyVisitors) {
        expectations.push({
          label: 'Visitors',
          value: formatNumber(metrics.monthlyVisitors) + '/mo',
          icon: <Users className="h-3.5 w-3.5 text-green-500" />
        });
      }
    } else if (channel === 'newsletter') {
      if (metrics.subscribers) {
        expectations.push({
          label: 'Subscribers',
          value: formatNumber(metrics.subscribers),
          icon: <Users className="h-3.5 w-3.5 text-purple-500" />
        });
      }
      if (item.openRate) {
        expectations.push({
          label: 'Open Rate',
          value: `${item.openRate}%`,
          icon: <Target className="h-3.5 w-3.5 text-orange-500" />
        });
      }
    } else if (channel === 'print') {
      if (metrics.circulation) {
        expectations.push({
          label: 'Circulation',
          value: formatNumber(metrics.circulation),
          icon: <Newspaper className="h-3.5 w-3.5 text-gray-600" />
        });
      }
    } else if (channel === 'radio') {
      if (metrics.listeners) {
        expectations.push({
          label: 'Est. Listeners',
          value: formatNumber(metrics.listeners),
          icon: <Radio className="h-3.5 w-3.5 text-red-500" />
        });
      }
    } else if (channel === 'podcast') {
      if (metrics.listeners || perfMetrics.audienceSize) {
        expectations.push({
          label: 'Downloads/Listens',
          value: formatNumber(metrics.listeners || perfMetrics.audienceSize) + '/ep',
          icon: <Headphones className="h-3.5 w-3.5 text-indigo-500" />
        });
      }
    } else if (channel === 'events') {
      if (metrics.expectedAttendees || metrics.averageAttendance) {
        expectations.push({
          label: 'Expected Attendees',
          value: formatNumber(metrics.expectedAttendees || metrics.averageAttendance),
          icon: <CalendarDays className="h-3.5 w-3.5 text-pink-500" />
        });
      }
    } else if (channel === 'social_media' || channel === 'social') {
      if (metrics.followers) {
        expectations.push({
          label: 'Followers',
          value: formatNumber(metrics.followers),
          icon: <Users className="h-3.5 w-3.5 text-cyan-500" />
        });
      }
    }
    
    // Frequency/occurrences
    if (item.currentFrequency) {
      expectations.push({
        label: 'Frequency',
        value: `${item.currentFrequency}x`,
        icon: <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
      });
    }
    
    return expectations;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard?tab=orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{order.campaignName}</h2>
            <p className="text-sm text-muted-foreground">{order.publicationName}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {/* Review Banner for "sent" orders */}
      {needsReview && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Review Required</p>
                  <p className="text-sm text-amber-700">
                    Accept or reject {pendingCount} placement{pendingCount !== 1 ? 's' : ''} to confirm this order
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {acceptedCount > 0 && <Badge className="bg-green-100 text-green-800">{acceptedCount} accepted</Badge>}
                  {rejectedCount > 0 && <Badge className="bg-red-100 text-red-800">{rejectedCount} rejected</Badge>}
                  {pendingCount > 0 && <Badge variant="outline">{pendingCount} pending</Badge>}
                </div>
                <Button size="sm" onClick={() => setActiveTab('placements')}>
                  Review Placements
                </Button>
              </div>
            </div>
            <Progress value={(acceptedCount / totalPlacements) * 100} className="h-2 mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="placements" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Placements</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="flex items-center gap-1.5"
            disabled={!canShowPerformance}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
            {(order.messages?.length || 0) > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {order.messages?.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Payment</span>
                </div>
                <p className="text-xl font-bold text-green-600 mt-1">
                  ${publication?.publicationTotal?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Placements</span>
                </div>
                <p className="text-xl font-bold mt-1">{totalPlacements}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Start</span>
                </div>
                <p className="text-sm font-bold mt-1">
                  {campaignData?.timeline?.startDate 
                    ? new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">End</span>
                </div>
                <p className="text-sm font-bold mt-1">
                  {campaignData?.timeline?.endDate 
                    ? new Date(campaignData.timeline.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Placement Status Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Placement Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 mb-4">
                <div className={cn("text-center p-2 rounded-lg", pendingCount > 0 ? "bg-amber-50 border border-amber-200" : "bg-gray-50")}>
                  <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
                <div className={cn("text-center p-2 rounded-lg", acceptedCount > 0 ? "bg-green-50 border border-green-200" : "bg-gray-50")}>
                  <p className="text-lg font-bold text-green-700">{acceptedCount}</p>
                  <p className="text-xs text-green-600">Accepted</p>
                </div>
                <div className={cn("text-center p-2 rounded-lg", inProductionCount > 0 ? "bg-blue-50 border border-blue-200" : "bg-gray-50")}>
                  <p className="text-lg font-bold text-blue-700">{inProductionCount}</p>
                  <p className="text-xs text-blue-600">Live</p>
                </div>
                <div className={cn("text-center p-2 rounded-lg", deliveredCount > 0 ? "bg-purple-50 border border-purple-200" : "bg-gray-50")}>
                  <p className="text-lg font-bold text-purple-700">{deliveredCount}</p>
                  <p className="text-xs text-purple-600">Delivered</p>
                </div>
                <div className={cn("text-center p-2 rounded-lg", rejectedCount > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50")}>
                  <p className="text-lg font-bold text-red-700">{rejectedCount}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </div>
              
              {/* Line Item Status List */}
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {inventoryItems.map((item: any, idx: number) => {
                  const itemPath = item.itemPath || item.sourcePath || `placement-${idx}`;
                  const status = placementStatuses[itemPath] || 'pending';
                  const config = getChannelConfig(item.channel);
                  const hasScript = config.isDigital && trackingScripts.some(s => {
                    const dimStr = typeof item.format?.dimensions === 'string' ? item.format.dimensions : 
                                   typeof item.format?.size === 'string' ? item.format.size : '';
                    const dims = dimStr ? dimStr.split(/x/i).map((d: string) => parseInt(d?.trim())) : null;
                    return dims && dims.length === 2 && s.creative.width === dims[0] && s.creative.height === dims[1];
                  });
                  const hasAsset = !config.isDigital && freshAssets.some(a => a.placementId === itemPath && a.hasAsset);
                  const hasPerf = performanceEntries.some(e => e.itemPath === itemPath);
                  
                  return (
                    <div key={itemPath} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{config.icon}</span>
                        <span className="truncate font-medium">{item.itemName || item.sourceName}</span>
                        {item.format?.dimensions && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({parseDimensions(item.format.dimensions).join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status indicators */}
                        {config.isDigital ? (
                          <span className={cn("text-xs", hasScript ? "text-green-600" : "text-amber-600")}>
                            {hasScript ? "✓ Script" : "⏳ Script"}
                          </span>
                        ) : (
                          <span className={cn("text-xs", hasAsset ? "text-green-600" : "text-amber-600")}>
                            {hasAsset ? "✓ Asset" : "⏳ Asset"}
                          </span>
                        )}
                        {['in_production', 'delivered'].includes(status) && (
                          <span className={cn("text-xs", hasPerf ? "text-green-600" : "text-amber-600")}>
                            {hasPerf ? "✓ Reported" : "⏳ Report"}
                          </span>
                        )}
                        <PlacementStatusBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Items / To-Do */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const actions: Array<{ priority: 'high' | 'medium' | 'low'; text: string; action?: () => void; actionLabel?: string }> = [];
                
                // High priority actions
                if (pendingCount > 0) {
                  actions.push({
                    priority: 'high',
                    text: `Review and accept ${pendingCount} pending placement${pendingCount !== 1 ? 's' : ''}`,
                    action: () => setActiveTab('placements'),
                    actionLabel: 'Review'
                  });
                }
                
                // Check for missing scripts/assets
                const digitalWithoutScripts = inventoryItems.filter((item: any) => {
                  const config = getChannelConfig(item.channel);
                  if (!config.isDigital) return false;
                  const dimStr = typeof item.format?.dimensions === 'string' ? item.format.dimensions : 
                                 typeof item.format?.size === 'string' ? item.format.size : '';
                  const dims = dimStr ? dimStr.split(/x/i).map((d: string) => parseInt(d?.trim())) : null;
                  return !trackingScripts.some(s => dims && dims.length === 2 && s.creative.width === dims[0] && s.creative.height === dims[1]);
                });
                if (digitalWithoutScripts.length > 0 && ['confirmed', 'in_production'].includes(order.status)) {
                  actions.push({
                    priority: 'medium',
                    text: `${digitalWithoutScripts.length} digital placement${digitalWithoutScripts.length !== 1 ? 's' : ''} awaiting tracking scripts from hub`,
                  });
                }
                
                // Check for placements ready to go live
                if (acceptedCount > 0) {
                  actions.push({
                    priority: 'medium',
                    text: `${acceptedCount} placement${acceptedCount !== 1 ? 's' : ''} accepted - mark as live when running`,
                    action: () => setActiveTab('placements'),
                    actionLabel: 'View'
                  });
                }
                
                // Check for performance reporting needed
                const liveWithoutPerf = inventoryItems.filter((item: any, idx: number) => {
                  const itemPath = item.itemPath || item.sourcePath || `placement-${idx}`;
                  const status = placementStatuses[itemPath];
                  return ['in_production', 'delivered'].includes(status) && 
                    !performanceEntries.some(e => e.itemPath === itemPath);
                });
                if (liveWithoutPerf.length > 0) {
                  actions.push({
                    priority: 'medium',
                    text: `Report performance for ${liveWithoutPerf.length} live placement${liveWithoutPerf.length !== 1 ? 's' : ''}`,
                    action: () => setActiveTab('performance'),
                    actionLabel: 'Report'
                  });
                }
                
                // Check for proofs needed
                const needsProof = ['in_production', 'delivered'].includes(order.status) && proofs.length === 0;
                if (needsProof) {
                  actions.push({
                    priority: 'low',
                    text: 'Upload proof of performance documentation',
                    action: () => setActiveTab('performance'),
                    actionLabel: 'Upload'
                  });
                }
                
                // No actions - all good!
                if (actions.length === 0) {
                  return (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700 font-medium">All caught up! No pending actions.</span>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {actions.map((action, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border",
                          action.priority === 'high' ? "bg-red-50 border-red-200" :
                          action.priority === 'medium' ? "bg-amber-50 border-amber-200" :
                          "bg-blue-50 border-blue-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            action.priority === 'high' ? "bg-red-500" :
                            action.priority === 'medium' ? "bg-amber-500" :
                            "bg-blue-500"
                          )} />
                          <span className="text-sm">{action.text}</span>
                        </div>
                        {action.action && (
                          <Button size="sm" variant="ghost" className="h-7" onClick={action.action}>
                            {action.actionLabel}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Performance Summary (if data exists) */}
          {performanceEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {performanceEntries.reduce((sum, e) => sum + (e.metrics?.impressions || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {performanceEntries.reduce((sum, e) => sum + (e.metrics?.clicks || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{performanceEntries.length}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{proofs.length}</p>
                    <p className="text-xs text-muted-foreground">Proofs</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => setActiveTab('performance')}
                >
                  View Full Performance
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline
                currentStatus={order.status as OrderStatus}
                statusHistory={order.statusHistory?.map(h => ({ ...h, timestamp: new Date(h.timestamp) }))}
              />
            </CardContent>
          </Card>

          {/* Campaign Info - Collapsible */}
          <Collapsible>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">Campaign Details</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Campaign</p>
                      <p className="font-medium">{order.campaignName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {campaignData?.timeline?.durationWeeks || '—'} weeks
                      </p>
                    </div>
                    {campaignData?.objectives?.primaryGoal && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Primary Goal</p>
                        <p className="font-medium capitalize">{campaignData.objectives.primaryGoal.replace(/_/g, ' ')}</p>
                      </div>
                    )}
                    {campaignData?.objectives?.targetAudience && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Target Audience</p>
                        <p className="font-medium">{campaignData.objectives.targetAudience}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* PLACEMENTS TAB (organized by channel type) */}
        <TabsContent value="placements" className="mt-4 space-y-4">
          {/* Info banner when no scripts - explain auto-generation */}
          {trackingScripts.length === 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Awaiting Creative Assets</p>
                      <p className="text-sm text-amber-700">Tracking scripts will appear automatically when the hub uploads assets for digital placements</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleRefreshScripts} 
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    disabled={refreshingScripts}
                    size="sm"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1", refreshingScripts && "animate-spin")} />
                    {refreshingScripts ? 'Checking...' : 'Check for Scripts'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions for Digital - when scripts exist */}
          {trackingScripts.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{trackingScripts.length} Tracking Script{trackingScripts.length !== 1 ? 's' : ''} Ready</p>
                      <p className="text-sm text-blue-700">Copy the code below and paste into your ad server</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopyAllScripts} variant="outline" className="bg-white" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy All
                    </Button>
                    <Button 
                      onClick={handleRefreshScripts} 
                      variant="outline" 
                      className="bg-white" 
                      size="sm"
                      disabled={refreshingScripts}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-1", refreshingScripts && "animate-spin")} />
                      {refreshingScripts ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organize placements by channel type */}
          {(() => {
            // Group placements by channel
            const channelGroups: Record<string, any[]> = {};
            inventoryItems.forEach((item: any, idx: number) => {
              const channel = (item.channel || 'other').toLowerCase();
              if (!channelGroups[channel]) channelGroups[channel] = [];
              channelGroups[channel].push({ ...item, _idx: idx });
            });

            // Sort channels by config order (digital first, then offline)
            const sortedChannels = Object.keys(channelGroups).sort((a, b) => {
              const configA = getChannelConfig(a);
              const configB = getChannelConfig(b);
              return configA.order - configB.order;
            });

            // Get campaign dates
            const startDate = campaignData?.timeline?.startDate 
              ? new Date(campaignData.timeline.startDate) : null;
            const endDate = campaignData?.timeline?.endDate 
              ? new Date(campaignData.timeline.endDate) : null;

            return sortedChannels.map(channel => {
              const items = channelGroups[channel];
              const config = getChannelConfig(channel);
              const isDigital = config.isDigital;

              return (
                <Card key={channel} className={cn("border", config.bgColor)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className={cn("text-base flex items-center gap-2", config.color)}>
                        <span>{config.icon}</span>
                        {config.label}
                      </CardTitle>
                      <Badge variant="secondary">{items.length} placement{items.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    
                    {/* Implementation Instructions */}
                    <div className="mt-3 p-3 bg-white/70 rounded-lg border border-white/50 text-sm">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Start Date</p>
                            <p className="font-medium text-green-700">
                              {startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">End Date</p>
                            <p className="font-medium text-red-700">
                              {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Implementation instructions */}
                      <p className="text-sm text-muted-foreground">{config.instructions.howTo}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {items.map((item: any) => {
                      const itemPath = item.itemPath || item.sourcePath || `placement-${item._idx}`;
                      const placementStatus = placementStatuses[itemPath] || 'pending';
                      
                      // Get scripts for digital, assets for non-digital
                      // Filter scripts by channel AND dimensions to match the right placement
                      const dimValue = item.format?.dimensions || item.format?.size || '';
                      const placementDimensions = typeof dimValue === 'string' ? dimValue : '';
                      const dimParts = placementDimensions ? placementDimensions.split(/x/i).map((d: string) => parseInt(d?.trim())) : [];
                      const [placementWidth, placementHeight] = dimParts.length === 2 ? dimParts : [0, 0];
                      
                      // Filter scripts for this placement
                      const channelScripts = isDigital ? trackingScripts.filter(s => {
                        // Match channels - 'display' is used for website ads
                        const channelMatch = s.channel === channel ||
                          (channel === 'website' && s.channel === 'display') ||
                          (channel === 'newsletter' && ['newsletter_image', 'newsletter_text'].includes(s.channel)) ||
                          (channel === 'streaming' && s.channel === 'streaming');
                        return channelMatch;
                      }) : [];

                      // Try to match by dimensions first
                      let matchedScripts = channelScripts;
                      if (placementWidth && placementHeight) {
                        const dimensionMatched = channelScripts.filter(s => 
                          s.creative.width === placementWidth && s.creative.height === placementHeight
                        );
                        // Only use dimension filtering if we found matches
                        if (dimensionMatched.length > 0) {
                          matchedScripts = dimensionMatched;
                        }
                        // Otherwise show all scripts for this channel (better than showing nothing)
                      }

                      // Deduplicate by creativeId (in case of duplicate scripts)
                      const scripts = matchedScripts.filter((script, index, self) =>
                        index === self.findIndex(s => s.creativeId === script.creativeId)
                      );
                      // Show assets for ALL placements (digital and non-digital)
                      const placementAssets = freshAssets
                        .filter(fa => fa.placementId === itemPath && fa.hasAsset && fa.asset)
                        .map(fa => fa.asset!);

                      // Get delivery expectations for this placement
                      const deliveryExpectations = getDeliveryExpectations(item);

                      return (
                        <div key={itemPath} className={cn(
                          "border rounded-lg overflow-hidden bg-white",
                          placementStatus === 'rejected' && "border-red-300 bg-red-50/50"
                        )}>
                          {/* Placement Header */}
                          <div className="px-4 py-2 bg-white/80 border-b">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{item.itemName || item.sourceName}</span>
                                {item.format?.dimensions && (
                                  <div className="flex flex-wrap gap-1">
                                    {parseDimensions(item.format.dimensions).map((dim, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">{dim}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <PlacementStatusBadge status={placementStatus} />
                            </div>
                            
                            {/* Delivery Expectations */}
                            {deliveryExpectations.length > 0 && (
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {deliveryExpectations.map((exp, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    {exp.icon}
                                    <span className="text-gray-600">{exp.label}:</span>
                                    <span className="font-medium text-gray-900">{exp.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="p-3 space-y-3">
                            {/* Digital: Show Scripts only */}
                            {isDigital && scripts.length > 0 && (
                              <Accordion type="single" collapsible className="space-y-1">
                                {scripts.map((script) => (
                                      <AccordionItem 
                                        key={script._id?.toString()} 
                                        value={script._id?.toString() || ''} 
                                        className="border rounded bg-gray-50"
                                      >
                                        <div className="flex items-center">
                                          <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
                                            <div className="flex items-center gap-2 text-left">
                                              <Code className="h-3.5 w-3.5 text-muted-foreground" />
                                              <span className="text-sm font-medium">{script.creative.name}</span>
                                              {script.creative.width && (
                                                <Badge variant="outline" className="text-xs h-5">
                                                  {script.creative.width}×{script.creative.height}
                                                </Badge>
                                              )}
                                            </div>
                                          </AccordionTrigger>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 mr-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopyScript(script.tags.fullTag, `${script._id}-quick`);
                                            }}
                                          >
                                            {copiedScriptId === `${script._id}-quick` ? (
                                              <><Check className="h-3 w-3 mr-1 text-green-600" /> Copied</>
                                            ) : (
                                              <><Copy className="h-3 w-3 mr-1" /> Quick Copy</>
                                            )}
                                          </Button>
                                        </div>
                                        <AccordionContent className="px-3 pb-3 pt-0">
                                          <Tabs defaultValue="full" className="w-full">
                                            <TabsList className="grid w-full grid-cols-3 h-8">
                                              <TabsTrigger value="full" className="text-xs">Full Tag</TabsTrigger>
                                              <TabsTrigger value="urls" className="text-xs">URLs Only</TabsTrigger>
                                              {script.tags.simplifiedTag && (
                                                <TabsTrigger value="simplified" className="text-xs">Simplified</TabsTrigger>
                                              )}
                                            </TabsList>

                                            <TabsContent value="full" className="mt-2">
                                              <div className="relative">
                                                <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                  <code>{script.tags.fullTag}</code>
                                                </pre>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                  onClick={() => handleCopyScript(script.tags.fullTag, `${script._id}-full`)}
                                                >
                                                  {copiedScriptId === `${script._id}-full` ? (
                                                    <Check className="h-3 w-3 text-green-400" />
                                                  ) : (
                                                    <Copy className="h-3 w-3" />
                                                  )}
                                                </Button>
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Full HTML tag with tracking - paste directly into your site
                                              </p>
                                            </TabsContent>

                                            <TabsContent value="urls" className="mt-2 space-y-2">
                                              <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Impression Pixel URL</label>
                                                <div className="relative">
                                                  <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                                    <code>{script.urls.impressionPixel}</code>
                                                  </pre>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                    onClick={() => handleCopyScript(script.urls.impressionPixel, `${script._id}-imp`)}
                                                  >
                                                    {copiedScriptId === `${script._id}-imp` ? (
                                                      <Check className="h-3 w-3 text-green-400" />
                                                    ) : (
                                                      <Copy className="h-3 w-3" />
                                                    )}
                                                  </Button>
                                                </div>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Click Tracker URL</label>
                                                <div className="relative">
                                                  <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                                    <code>{script.urls.clickTracker}</code>
                                                  </pre>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                    onClick={() => handleCopyScript(script.urls.clickTracker, `${script._id}-click`)}
                                                  >
                                                    {copiedScriptId === `${script._id}-click` ? (
                                                      <Check className="h-3 w-3 text-green-400" />
                                                    ) : (
                                                      <Copy className="h-3 w-3" />
                                                    )}
                                                  </Button>
                                                </div>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Creative URL</label>
                                                <div className="relative">
                                                  <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                                    <code>{script.urls.creativeUrl}</code>
                                                  </pre>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                    onClick={() => handleCopyScript(script.urls.creativeUrl, `${script._id}-creative`)}
                                                  >
                                                    {copiedScriptId === `${script._id}-creative` ? (
                                                      <Check className="h-3 w-3 text-green-400" />
                                                    ) : (
                                                      <Copy className="h-3 w-3" />
                                                    )}
                                                  </Button>
                                                </div>
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                Use these URLs in your ad server or email platform
                                              </p>
                                            </TabsContent>

                                            {script.tags.simplifiedTag && (
                                              <TabsContent value="simplified" className="mt-2">
                                                <div className="relative">
                                                  <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                    <code>{script.tags.simplifiedTag}</code>
                                                  </pre>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                    onClick={() => handleCopyScript(script.tags.simplifiedTag || '', `${script._id}-simple`)}
                                                  >
                                                    {copiedScriptId === `${script._id}-simple` ? (
                                                      <Check className="h-3 w-3 text-green-400" />
                                                    ) : (
                                                      <Copy className="h-3 w-3" />
                                                    )}
                                                  </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  For ESPs with limited HTML support (no JavaScript)
                                                </p>
                                              </TabsContent>
                                            )}
                                          </Tabs>

                                          {script.creative.clickUrl && (
                                            <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-muted-foreground">
                                              <span>Destination:</span>
                                              <a href={script.creative.clickUrl} target="_blank" rel="noopener noreferrer" 
                                                 className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[250px]">
                                                {script.creative.clickUrl}
                                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                              </a>
                                            </div>
                                          )}
                                        </AccordionContent>
                                      </AccordionItem>
                                    ))}
                              </Accordion>
                            )}

                            {/* Digital: No scripts yet */}
                            {isDigital && scripts.length === 0 && (
                              <div className="text-center py-3 text-muted-foreground text-sm bg-gray-50 rounded">
                                <Code className="h-5 w-5 mx-auto mb-1 opacity-50" />
                                Scripts will appear when assets are uploaded
                              </div>
                            )}

                            {/* Non-Digital: Show Assets */}
                            {!isDigital && placementAssets.length > 0 && (
                              <div className="space-y-2">
                                {placementAssets.map((asset: any) => (
                                  <CreativeAssetCard
                                    key={asset.assetId}
                                    asset={{ ...asset, uploadedAt: new Date(asset.uploadedAt) }}
                                    onDownload={(a) => window.open(a.fileUrl, '_blank')}
                                    showActions={true}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Non-Digital: No assets yet */}
                            {!isDigital && placementAssets.length === 0 && (
                              <div className="text-center py-3 text-muted-foreground text-sm bg-gray-50 rounded">
                                <Clock className="h-5 w-5 mx-auto mb-1 opacity-50" />
                                Awaiting creative assets from hub
                              </div>
                            )}

                            {/* Execution Instructions for non-digital */}
                            {!isDigital && (
                              <div className="p-2 bg-blue-50/50 rounded border border-blue-100 text-sm">
                                <span className="font-medium text-blue-800">📋 </span>
                                <span className="text-blue-700">{getExecutionInstructions(item)}</span>
                              </div>
                            )}

                            {/* Status Actions */}
                            <div className="mt-2 pt-2 border-t flex items-center gap-2">
                              {/* Pending: Accept/Reject */}
                              {placementStatus === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handlePlacementAction(itemPath, 'accepted')}
                                    disabled={updating}
                                    className="bg-green-600 hover:bg-green-700 h-7 text-xs px-3"
                                    size="sm"
                                  >
                                    <Check className="h-3 w-3 mr-1" /> Accept
                                  </Button>
                                  <Button
                                    onClick={() => { setRejectingPlacementId(itemPath); setRejectDialogOpen(true); }}
                                    disabled={updating}
                                    variant="outline"
                                    className="border-red-300 text-red-700 hover:bg-red-50 h-7 text-xs px-3"
                                    size="sm"
                                  >
                                    <X className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}

                              {/* Accepted: Mark In Production */}
                              {placementStatus === 'accepted' && (
                                <Button
                                  onClick={() => handlePlacementAction(itemPath, 'in_production')}
                                  disabled={updating}
                                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3"
                                  size="sm"
                                >
                                  <Loader2 className="h-3 w-3 mr-1" /> Mark Live
                                </Button>
                              )}

                              {/* In Production: Mark Delivered + Report */}
                              {placementStatus === 'in_production' && (
                                <>
                                  <Button
                                    onClick={() => setActiveTab('performance')}
                                    variant="outline"
                                    className="h-7 text-xs px-3"
                                    size="sm"
                                  >
                                    <BarChart3 className="h-3 w-3 mr-1" /> Report
                                  </Button>
                                  <Button
                                    onClick={() => handlePlacementAction(itemPath, 'delivered')}
                                    disabled={updating}
                                    className="bg-purple-600 hover:bg-purple-700 h-7 text-xs px-3"
                                    size="sm"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                                  </Button>
                                </>
                              )}

                              {/* Delivered: Show completion status */}
                              {placementStatus === 'delivered' && (
                                <span className="flex items-center gap-1 text-xs text-purple-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                                </span>
                              )}

                              {/* Rejected: Show rejection status */}
                              {placementStatus === 'rejected' && (
                                <span className="flex items-center gap-1 text-xs text-red-700">
                                  <X className="h-3.5 w-3.5" /> Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            });
          })()}

          {/* Update Status Actions */}
          {(order.status === 'confirmed' || order.status === 'in_production') && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Update Order Status</p>
                    <p className="text-sm text-muted-foreground">
                      {order.status === 'confirmed' && 'Mark as in production when you start running ads'}
                      {order.status === 'in_production' && 'Mark as delivered when the campaign is complete'}
                    </p>
                  </div>
                  {order.status === 'confirmed' && (
                    <Button onClick={() => handleUpdateStatus('in_production')} disabled={updating}>
                      <Loader2 className={cn("h-4 w-4 mr-2", updating && "animate-spin")} />
                      Mark In Production
                    </Button>
                  )}
                  {order.status === 'in_production' && (
                    <Button onClick={() => handleUpdateStatus('delivered')} disabled={updating}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="mt-4">
          {canShowPerformance ? (
            <OrderPerformanceView
              orderId={order._id?.toString() || ''}
              campaignId={order.campaignId}
              publicationId={order.publicationId}
              publicationName={order.publicationName}
              placements={placementsForPerformance}
              deliveryGoals={order.deliveryGoals}
              deliverySummary={order.deliverySummary}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Performance tracking available after order is confirmed
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="mt-4">
          <OrderMessaging
            publicationNotes={order.publicationNotes}
            hubNotes={order.hubNotes}
            messages={order.messages?.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))}
            userType="publication"
            readOnly={order.status === 'delivered'}
            onSendMessage={handleSendMessage}
          />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Placement
            </DialogTitle>
            <DialogDescription>
              Please explain why you cannot run this placement.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Scheduling conflict, doesn't align with editorial standards..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={() => {
                if (rejectionReason.trim() && rejectingPlacementId) {
                  handlePlacementAction(rejectingPlacementId, 'rejected', rejectionReason);
                  setRejectDialogOpen(false);
                  setRejectingPlacementId(null);
                  setRejectionReason('');
                }
              }}
            >
              Reject Placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to parse dimensions (handles concatenated values like "728x90300x600320x50970x90")
function parseDimensions(dimStr: string | undefined): string[] {
  if (!dimStr || typeof dimStr !== 'string') return [];
  
  // First try splitting by common delimiters
  if (dimStr.includes(',') || dimStr.includes(' ') || dimStr.includes('/')) {
    return dimStr.split(/[,\s\/]+/).map(d => d.trim()).filter(Boolean);
  }
  
  // Handle concatenated dimensions like "728x90300x600320x50970x90"
  // Pattern: match NNNxNNN patterns
  const matches = dimStr.match(/\d+x\d+/gi);
  if (matches && matches.length > 1) {
    return matches;
  }
  
  // Single dimension or simple format
  return [dimStr];
}

// Helper component for placement status
function PlacementStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'accepted':
      return <Badge className="bg-green-100 text-green-800 border-0"><Check className="h-3 w-3 mr-1" /> Accepted</Badge>;
    case 'in_production':
      return <Badge className="bg-blue-100 text-blue-800 border-0"><Loader2 className="h-3 w-3 mr-1" /> In Production</Badge>;
    case 'delivered':
      return <Badge className="bg-purple-100 text-purple-800 border-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Delivered</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 border-0"><X className="h-3 w-3 mr-1" /> Rejected</Badge>;
    default:
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
  }
}

// Helper function for execution instructions
function getExecutionInstructions(item: any): string {
  const pricingModel = item.itemPricing?.pricingModel;
  const freq = item.currentFrequency || item.quantity || 1;
  
  if (pricingModel === 'per_send') {
    return `Include in ${freq} newsletter${freq > 1 ? 's' : ''} per month`;
  }
  if (pricingModel === 'per_spot') {
    return item.channel === 'radio' 
      ? `Air ${freq} spot${freq > 1 ? 's' : ''} per month`
      : `Run ${freq} time${freq > 1 ? 's' : ''} per month`;
  }
  if (pricingModel === 'per_ad' && item.channel === 'print') {
    return `Publish in ${freq} issue${freq > 1 ? 's' : ''} per month`;
  }
  if (pricingModel === 'cpm' || pricingModel === 'cpv') {
    return `Display continuously on ${item.channel}`;
  }
  return `Run ${freq}× per month as scheduled`;
}

// Workflow progress component for each placement
interface PlacementWorkflowProps {
  placementId: string;
  placementStatus: string;
  isDigital: boolean;
  hasScripts: boolean;
  hasAssets: boolean;
  hasPerformanceEntry: boolean;
  hasProof: boolean;
  onMarkInProduction: () => void;
  onMarkDelivered: () => void;
  onReportPerformance: () => void;
  updating: boolean;
}

function PlacementWorkflow({
  placementStatus,
  isDigital,
  hasScripts,
  hasAssets,
  hasPerformanceEntry,
  hasProof,
  onMarkInProduction,
  onMarkDelivered,
  onReportPerformance,
  updating,
}: PlacementWorkflowProps) {
  // Determine step completion
  const steps = [
    {
      id: 'materials',
      label: isDigital ? 'Get Scripts' : 'Get Assets',
      done: isDigital ? hasScripts : hasAssets,
      icon: isDigital ? Code : FileText,
    },
    {
      id: 'accepted',
      label: 'Accepted',
      done: ['accepted', 'in_production', 'delivered'].includes(placementStatus),
      icon: Check,
    },
    {
      id: 'live',
      label: 'Go Live',
      done: ['in_production', 'delivered'].includes(placementStatus),
      icon: Loader2,
      action: placementStatus === 'accepted' ? onMarkInProduction : undefined,
      actionLabel: 'Mark Live',
    },
    {
      id: 'report',
      label: 'Report Performance',
      done: hasPerformanceEntry,
      icon: BarChart3,
      action: ['in_production', 'delivered'].includes(placementStatus) && !hasPerformanceEntry ? onReportPerformance : undefined,
      actionLabel: 'Report',
    },
    {
      id: 'proof',
      label: 'Upload Proof',
      done: hasProof,
      icon: FileText,
      action: ['in_production', 'delivered'].includes(placementStatus) && !hasProof ? onReportPerformance : undefined,
      actionLabel: 'Upload',
    },
    {
      id: 'complete',
      label: 'Complete',
      done: placementStatus === 'delivered',
      icon: CheckCircle2,
      action: placementStatus === 'in_production' ? onMarkDelivered : undefined,
      actionLabel: 'Mark Complete',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progressPercent = (completedCount / steps.length) * 100;

  // Find current step (first incomplete)
  const currentStepIndex = steps.findIndex(s => !s.done);

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
        <span className="text-xs text-muted-foreground">{completedCount}/{steps.length}</span>
      </div>
      <Progress value={progressPercent} className="h-1.5 mb-3" />
      
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = idx === currentStepIndex;
          const isComplete = step.done;
          
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div className={cn(
                  "flex-1 h-0.5",
                  isComplete || (idx <= currentStepIndex) ? "bg-green-400" : "bg-gray-200"
                )} />
              )}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  isComplete ? "bg-green-100 text-green-700" :
                  isCurrent ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" :
                  "bg-gray-100 text-gray-400"
                )}>
                  {isComplete ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 text-center max-w-[50px] leading-tight",
                  isComplete ? "text-green-700" :
                  isCurrent ? "text-blue-700 font-medium" :
                  "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Show action button for current step */}
      {currentStepIndex >= 0 && steps[currentStepIndex]?.action && (
        <Button
          size="sm"
          className="w-full mt-3 h-7"
          onClick={steps[currentStepIndex].action}
          disabled={updating}
        >
          {steps[currentStepIndex].actionLabel}
        </Button>
      )}
    </div>
  );
}
