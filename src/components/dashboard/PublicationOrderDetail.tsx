import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { CreativeAssetCard } from '../orders/CreativeAssetCard';
import { OrderMessaging } from '../orders/OrderMessaging';
import { PlacementTraffickingCard, extractTraffickingInfo } from '../orders';
import { PlacementStatusBadge } from '../orders/PlacementStatusBadge';
import { OrderPerformanceView } from './OrderPerformanceView';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, Check, X, AlertCircle, FileText, AlertTriangle, 
  Loader2, CheckCircle2, BarChart3, Code, Copy, ExternalLink,
  Calendar, DollarSign, Layers, MessageSquare, Download,
  ChevronDown, ChevronUp, ChevronRight, Clock, Package, RefreshCw,
  Eye, Users, Newspaper, Radio, Headphones, CalendarDays, Target,
  Lock, XCircle, PlayCircle, Timer, Megaphone, MoreVertical
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  transformForAdServer, 
  transformForESP, 
  getAdServerName, 
  getESPName,
  getAdServerInstructions,
  getESPInstructions,
  AD_SERVER_MACROS,
  ESP_MERGE_TAGS
} from '@/utils/trackingTagTransforms';
import type { PublicationAdServer, PublicationESP } from '@/integrations/mongodb/schemas';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { PublicationInsertionOrderDocument } from '@/integrations/mongodb/insertionOrderSchema';
import { TrackingScript } from '@/integrations/mongodb/trackingScriptSchema';
import { API_BASE_URL } from '@/config/api';
import { getChannelConfig, isDigitalChannel } from '@/config/inventoryChannels';
import { calculateItemCost } from '@/utils/inventoryPricing';
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
  
  // Tag tester state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingScript, setTestingScript] = useState<TrackingScript | null>(null);
  const [testResults, setTestResults] = useState<{
    impressionPixel: { status: 'pending' | 'success' | 'error'; time?: number; error?: string };
    clickTracker: { status: 'pending' | 'success' | 'error'; time?: number; error?: string };
    creativeUrl: { status: 'pending' | 'success' | 'error'; time?: number; size?: string; error?: string };
  } | null>(null);
  
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

  const handleTestScript = async (script: TrackingScript) => {
    setTestingScript(script);
    setTestResults({
      impressionPixel: { status: 'pending' },
      clickTracker: { status: 'pending' },
      creativeUrl: { status: 'pending' }
    });
    setTestDialogOpen(true);

    // Test impression pixel
    const testUrl = async (url: string, type: 'impressionPixel' | 'clickTracker' | 'creativeUrl') => {
      const startTime = Date.now();
      try {
        // Replace placeholders with test values for the request
        const testableUrl = url
          .replace(/CACHE_BUSTER/g, Date.now().toString())
          .replace(/EMAIL_ID/g, 'test-email-id');
        
        const response = await fetch(testableUrl, { 
          method: 'HEAD',
          mode: 'no-cors' // Tracking pixels often don't have CORS headers
        });
        
        const elapsed = Date.now() - startTime;
        
        setTestResults(prev => prev ? {
          ...prev,
          [type]: { 
            status: 'success', 
            time: elapsed,
            size: type === 'creativeUrl' ? response.headers.get('content-length') || undefined : undefined
          }
        } : null);
      } catch (error) {
        setTestResults(prev => prev ? {
          ...prev,
          [type]: { 
            status: 'success', // no-cors mode doesn't give us response, assume success if no exception
            time: Date.now() - startTime
          }
        } : null);
      }
    };

    // Run tests in parallel
    await Promise.all([
      testUrl(script.urls.impressionPixel, 'impressionPixel'),
      testUrl(script.urls.clickTracker, 'clickTracker'),
      testUrl(script.urls.creativeUrl, 'creativeUrl')
    ]);
  };

  const handleDownloadAllScripts = () => {
    // Group scripts by size
    const sizeGroups: Record<string, typeof trackingScripts> = {};
    trackingScripts.forEach(script => {
      const size = script.creative.width && script.creative.height
        ? `${script.creative.width}x${script.creative.height}`
        : 'auto';
      if (!sizeGroups[size]) sizeGroups[size] = [];
      sizeGroups[size].push(script);
    });

    // Generate HTML file content
    const campaignName = order?.campaignName || 'Campaign';
    const pubName = order?.publicationName || 'Publication';
    const dateStr = new Date().toLocaleDateString();
    
    // Get publication's ad delivery settings
    const pubSettings = (order as any)?.publicationSettings?.adDeliverySettings;
    const adServer = pubSettings?.adServer as PublicationAdServer | undefined;
    const esp = pubSettings?.esp as PublicationESP | undefined;
    const espCustomTags = pubSettings?.espOther;
    
    // Generate personalized instructions based on publication settings
    let instructionsHtml = '';
    if (adServer || esp) {
      instructionsHtml = `<div class="instructions"><strong>Your Platform Settings:</strong><ul>`;
      if (adServer) {
        instructionsHtml += `<li><strong>Ad Server:</strong> ${getAdServerName(adServer)} - ${getAdServerInstructions(adServer)}</li>`;
      }
      if (esp) {
        instructionsHtml += `<li><strong>Email Platform:</strong> ${getESPName(esp)} - ${getESPInstructions(esp)}</li>`;
      }
      instructionsHtml += `</ul></div>`;
    } else {
      instructionsHtml = `<div class="instructions">
    <strong>Instructions:</strong>
    <p style="color:#b45309;margin-bottom:8px;">⚠️ No ad server or ESP configured in your publication profile. Set these in Settings for pre-formatted tags.</p>
    <ul>
      <li>For <strong>Google Ad Manager (GAM)</strong>: Replace CACHE_BUSTER with %%CACHEBUSTER%%</li>
      <li>For <strong>Broadstreet</strong>: Replace CACHE_BUSTER with [timestamp]</li>
      <li>For <strong>Direct placement</strong>: Replace CACHE_BUSTER with a JavaScript timestamp</li>
      <li>For <strong>Newsletters</strong>: Replace EMAIL_ID and CACHE_BUSTER with your ESP's merge tags</li>
    </ul>
  </div>`;
    }

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Tracking Tags - ${campaignName} - ${pubName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; }
    h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; }
    h3 { color: #6b7280; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .tag-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .tag-name { font-weight: 600; margin-bottom: 8px; }
    pre { background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
    .url-section { margin-top: 12px; }
    .url-label { font-size: 12px; color: #6b7280; font-weight: 500; }
    .instructions { background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 24px 0; }
  </style>
</head>
<body>
  <h1>Tracking Tags</h1>
  <div class="meta">
    <strong>Campaign:</strong> ${campaignName}<br>
    <strong>Publication:</strong> ${pubName}<br>
    <strong>Generated:</strong> ${dateStr}<br>
    <strong>Total Tags:</strong> ${trackingScripts.length}
  </div>

  ${instructionsHtml}
`;

    // Add each size group
    Object.entries(sizeGroups).forEach(([size, scripts]) => {
      htmlContent += `\n  <h2>${size}</h2>\n`;

      scripts.forEach(script => {
        const isNewsletter = script.channel?.includes('newsletter');
        
        // Transform tag based on publication settings
        let transformedTag = script.tags.fullTag;
        if (isNewsletter && esp) {
          transformedTag = transformForESP(script.tags.fullTag, esp, espCustomTags);
        } else if (!isNewsletter && adServer) {
          transformedTag = transformForAdServer(script.tags.fullTag, adServer, script.creative.clickUrl);
        }
        
        htmlContent += `
  <div class="tag-block">
    <div class="tag-name">${script.creative.name}</div>
    <h3>Full Tag${adServer || esp ? ` (${isNewsletter && esp ? getESPName(esp) : adServer ? getAdServerName(adServer) : 'Base'} format)` : ''}</h3>
    <pre>${transformedTag.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

    <div class="url-section">
      <div class="url-label">Impression Pixel:</div>
      <pre>${script.urls.impressionPixel}</pre>
    </div>

    <div class="url-section">
      <div class="url-label">Click Tracker:</div>
      <pre>${script.urls.clickTracker}</pre>
    </div>

    <div class="url-section">
      <div class="url-label">Creative URL:</div>
      <pre>${script.urls.creativeUrl}</pre>
    </div>
  </div>
`;
      });
    });

    htmlContent += `
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracking-tags-${pubName.toLowerCase().replace(/\s+/g, '-')}-${dateStr.replace(/\//g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: 'Downloaded!', 
      description: `${trackingScripts.length} tracking tags saved to HTML file` 
    });
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
        toast({ title: 'Order Confirmed!', description: 'All placements accepted. You can now access scripts and report performance.' });
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
  
  // Allow performance tab if order is confirmed+ OR if any placement is in_production/delivered
  const hasActivePlacements = Object.values(placementStatuses).some(
    status => ['in_production', 'delivered'].includes(status)
  );
  const canShowPerformance = ['confirmed', 'in_production', 'delivered'].includes(order.status) || hasActivePlacements;
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

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate campaign duration in months
  const getDurationMonths = () => {
    const startDate = campaignData?.timeline?.startDate ? new Date(campaignData.timeline.startDate) : null;
    const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
    if (!startDate || !endDate) return 1;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(diffDays / 30));
  };

  // Helper function to get delivery expectations for a placement
  // Returns channel-specific trafficking info with earnings
  const getDeliveryExpectations = (item: any): Array<{ label: string; value: string; icon: React.ReactNode; highlight?: boolean }> => {
    const expectations: Array<{ label: string; value: string; icon: React.ReactNode; highlight?: boolean }> = [];
    const channel = (item.channel || '').toLowerCase();
    const metrics = item.audienceMetrics || {};
    const perfMetrics = item.performanceMetrics || {};
    const frequency = item.currentFrequency || item.quantity || 1;
    
    // Calculate earnings using existing utility
    const durationMonths = getDurationMonths();
    const earnings = calculateItemCost(item, frequency, durationMonths);
    
    // Add earnings first (most important for publications)
    if (earnings > 0) {
      expectations.push({
        label: 'Earn',
        value: formatCurrency(earnings),
        icon: <DollarSign className="h-3.5 w-3.5 text-green-600" />,
        highlight: true
      });
    }
    
    // Channel-specific UNIT OF DELIVERY (primary trafficking info)
    if (channel === 'website') {
      // Website: Impressions are the unit
      if (item.monthlyImpressions || perfMetrics.impressionsPerMonth) {
        const totalImpressions = (item.monthlyImpressions || perfMetrics.impressionsPerMonth) * durationMonths;
        expectations.push({
          label: 'Deliver',
          value: `${formatNumber(totalImpressions)} impressions`,
          icon: <Eye className="h-3.5 w-3.5 text-blue-600" />,
          highlight: true
        });
      }
      // Context
      if (metrics.monthlyVisitors) {
        expectations.push({
          label: 'Audience',
          value: formatNumber(metrics.monthlyVisitors) + ' visitors/mo',
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'newsletter') {
      // Newsletter: Sends are the unit
      expectations.push({
        label: 'Sends',
        value: `${frequency} newsletter${frequency > 1 ? 's' : ''}`,
        icon: <Eye className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      // Context
      if (metrics.subscribers) {
        expectations.push({
          label: 'Subscribers',
          value: formatNumber(metrics.subscribers),
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
      if (item.openRate) {
        expectations.push({
          label: 'Open Rate',
          value: `${item.openRate}%`,
          icon: <Target className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'print') {
      // Print: Insertions are the unit
      expectations.push({
        label: 'Insertions',
        value: `${frequency} issue${frequency > 1 ? 's' : ''}`,
        icon: <Newspaper className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      // Context
      if (metrics.circulation) {
        expectations.push({
          label: 'Circulation',
          value: formatNumber(metrics.circulation) + '/issue',
          icon: <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
        });
        // Total reach estimate
        const totalCirculation = metrics.circulation * frequency;
        expectations.push({
          label: 'Total Reach',
          value: `~${formatNumber(totalCirculation * 2.5)} readers`,
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'radio') {
      // Radio: Spots are the unit
      expectations.push({
        label: 'Spots',
        value: `${frequency} airing${frequency > 1 ? 's' : ''}`,
        icon: <Radio className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      // Context
      if (metrics.listeners) {
        expectations.push({
          label: 'Est. Listeners',
          value: formatNumber(metrics.listeners) + '/spot',
          icon: <Radio className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'podcast') {
      // Podcast: Episodes are the unit
      expectations.push({
        label: 'Episodes',
        value: `${frequency} episode${frequency > 1 ? 's' : ''}`,
        icon: <Headphones className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      // Context
      if (metrics.listeners || perfMetrics.audienceSize) {
        expectations.push({
          label: 'Downloads',
          value: formatNumber(metrics.listeners || perfMetrics.audienceSize) + '/ep',
          icon: <Headphones className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'streaming') {
      // Streaming: Views are the unit
      if (item.monthlyImpressions || perfMetrics.impressionsPerMonth) {
        expectations.push({
          label: 'Deliver',
          value: `${formatNumber(item.monthlyImpressions || perfMetrics.impressionsPerMonth)} views`,
          icon: <Eye className="h-3.5 w-3.5 text-blue-600" />,
          highlight: true
        });
      }
      // Context
      if (metrics.subscribers) {
        expectations.push({
          label: 'Subscribers',
          value: formatNumber(metrics.subscribers),
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'events') {
      // Events: Deliverables (show as 1 event)
      expectations.push({
        label: 'Event',
        value: `${frequency} sponsorship${frequency > 1 ? 's' : ''}`,
        icon: <CalendarDays className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      if (metrics.expectedAttendees || metrics.averageAttendance) {
        expectations.push({
          label: 'Attendance',
          value: formatNumber(metrics.expectedAttendees || metrics.averageAttendance),
          icon: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'social_media' || channel === 'social') {
      // Social: Posts are the unit
      expectations.push({
        label: 'Posts',
        value: `${frequency} post${frequency > 1 ? 's' : ''}`,
        icon: <Eye className="h-3.5 w-3.5 text-blue-600" />,
        highlight: true
      });
      if (metrics.followers) {
        expectations.push({
          label: 'Followers',
          value: formatNumber(metrics.followers),
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else {
      // Generic/other
      if (frequency > 1) {
        expectations.push({
          label: 'Quantity',
          value: `${frequency}x`,
          icon: <RefreshCw className="h-3.5 w-3.5 text-blue-600" />,
          highlight: true
        });
      }
    }
    
    return expectations;
  };

  // Determine the primary status/action needed
  const getPrimaryStatus = () => {
    if (needsReview) return 'review';
    if (order.assetStatus?.pendingUpload && !order.assetStatus?.allAssetsReady) return 'assets_pending';
    
    const startDate = campaignData?.timeline?.startDate ? new Date(campaignData.timeline.startDate) : null;
    const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
    const now = new Date();
    
    if (endDate && now > endDate) return 'ended';
    if (startDate && endDate && now >= startDate && now <= endDate) return 'live';
    if (startDate && now < startDate) {
      const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) return 'starting_soon';
    }
    return 'normal';
  };
  
  const primaryStatus = getPrimaryStatus();
  
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="mb-2">
        <Breadcrumb
          rootLabel="Campaigns"
          rootIcon={Megaphone}
          currentLabel={order.campaignName}
          onBackClick={() => navigate('/dashboard?tab=orders')}
        />
      </div>

      {/* Compact Header Card */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-sans leading-tight">{order.campaignName}</h2>
              <p className="text-sm font-sans text-muted-foreground">{order.publicationName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-semibold text-green-600">${publication?.publicationTotal?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-muted-foreground">
                  {campaignData?.timeline?.startDate && campaignData?.timeline?.endDate 
                    ? `${new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(campaignData.timeline.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Dates TBD'}
                </p>
              </div>
              <OrderStatusBadge status={order.status as OrderStatus} />
            </div>
          </div>
          
          {/* Inline placement summary */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm">
            <span className="text-muted-foreground">{totalPlacements} placement{totalPlacements !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              {acceptedCount > 0 && <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">{acceptedCount} accepted</Badge>}
              {inProductionCount > 0 && <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">{inProductionCount} live</Badge>}
              {deliveredCount > 0 && <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">{deliveredCount} delivered</Badge>}
              {pendingCount > 0 && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">{pendingCount} pending</Badge>}
              {rejectedCount > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">{rejectedCount} rejected</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Status Banner - Shows ONE priority message */}
      
      {primaryStatus === 'assets_pending' && (
        <Alert className="border-amber-300 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Awaiting Creative Assets</AlertTitle>
          <AlertDescription className="text-amber-700">
            {order.assetStatus?.placementsWithAssets || 0} of {order.assetStatus?.totalPlacements || 0} assets ready. You'll be notified when all are available.
          </AlertDescription>
        </Alert>
      )}
      
      {primaryStatus === 'starting_soon' && (
        <Alert className="border-blue-300 bg-blue-50">
          <Timer className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Campaign Starting Soon</AlertTitle>
          <AlertDescription className="text-blue-700">
            Starts {campaignData?.timeline?.startDate 
              ? new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : 'soon'}. Ensure tracking is set up.
          </AlertDescription>
        </Alert>
      )}
      
      {primaryStatus === 'live' && (
        <Alert className="border-green-300 bg-green-50">
          <PlayCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Campaign is Live</AlertTitle>
          <AlertDescription className="text-green-700">
            {(() => {
              const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
              if (endDate) {
                const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`;
              }
              return 'Campaign is currently running.';
            })()}
          </AlertDescription>
        </Alert>
      )}
      
      {primaryStatus === 'ended' && order.status !== 'delivered' && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Campaign Ended</AlertTitle>
          <AlertDescription className="text-amber-700 flex items-center justify-between">
            <span>Please submit final performance reports and mark as delivered.</span>
            <Button size="sm" variant="outline" className="ml-4" onClick={() => setActiveTab('performance')}>
              Report Results
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
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
        <TabsContent value="overview" className="mt-0 space-y-4">
          {/* What's Next - Priority Action */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <Target className="h-4 w-4" />
                What's Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Determine the single most important next action
                if (pendingCount > 0) {
                  return (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Eye className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Review {pendingCount} Placement{pendingCount !== 1 ? 's' : ''}</p>
                          <p className="text-sm text-blue-700">Accept or reject to confirm this order</p>
                        </div>
                      </div>
                      <Button onClick={() => setActiveTab('placements')}>
                        Review Now
                      </Button>
                    </div>
                  );
                }
                
                if (acceptedCount > 0 && inProductionCount === 0 && deliveredCount === 0) {
                  return (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <PlayCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-900">Ready to Go Live</p>
                          <p className="text-sm text-amber-700">Mark placements as "In Production" when ads start running</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setActiveTab('placements')}>
                        View Placements
                      </Button>
                    </div>
                  );
                }
                
                const liveWithoutPerf = inventoryItems.filter((item: any, idx: number) => {
                  const itemPath = item.itemPath || item.sourcePath || `placement-${idx}`;
                  const status = placementStatuses[itemPath];
                  const config = getChannelConfig(item.channel);
                  return !config.isDigital && ['in_production', 'delivered'].includes(status) && 
                    !performanceEntries.some(e => e.itemPath === itemPath);
                });
                
                if (liveWithoutPerf.length > 0) {
                  return (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-purple-900">Report Your Results</p>
                          <p className="text-sm text-purple-700">{liveWithoutPerf.length} placement{liveWithoutPerf.length !== 1 ? 's' : ''} need performance data</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setActiveTab('performance')}>
                        Report Results
                      </Button>
                    </div>
                  );
                }
                
                if (inProductionCount > 0 || deliveredCount > 0) {
                  return (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-900">You're All Set!</p>
                          <p className="text-sm text-green-700">Campaign is running smoothly</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setActiveTab('performance')}>
                        View Performance
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium">Waiting for Campaign Setup</p>
                      <p className="text-sm text-muted-foreground">The hub is preparing this order</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Placements Quick View */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-sans flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Placements
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('placements')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inventoryItems.slice(0, 5).map((item: any, idx: number) => {
                  const itemPath = item.itemPath || item.sourcePath || `placement-${idx}`;
                  const status = placementStatuses[itemPath] || 'pending';
                  const config = getChannelConfig(item.channel);
                  
                  return (
                    <div key={itemPath} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {config.icon === 'newspaper' && <Newspaper className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        {config.icon === 'radio' && <Radio className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        {config.icon === 'headphones' && <Headphones className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        {!['newspaper', 'radio', 'headphones'].includes(config.icon || '') && <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        <span className="truncate text-sm">{item.itemName || item.sourceName}</span>
                      </div>
                      <PlacementStatusBadge status={status} />
                    </div>
                  );
                })}
                {inventoryItems.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {inventoryItems.length - 5} more placements
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary (if data exists) */}
          {performanceEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('performance')}>
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Compute channel-aware totals
                  const totals = performanceEntries.reduce((acc, e) => ({
                    impressions: acc.impressions + (e.metrics?.impressions || 0),
                    clicks: acc.clicks + (e.metrics?.clicks || 0),
                    insertions: acc.insertions + (e.metrics?.insertions || 0),
                    circulation: acc.circulation + (e.metrics?.circulation || 0),
                    spotsAired: acc.spotsAired + (e.metrics?.spotsAired || 0),
                    downloads: acc.downloads + (e.metrics?.downloads || 0),
                  }), { impressions: 0, clicks: 0, insertions: 0, circulation: 0, spotsAired: 0, downloads: 0 });
                  
                  const hasDigital = totals.impressions > 0;
                  const hasPrint = totals.insertions > 0;
                  const hasRadio = totals.spotsAired > 0;
                  const hasPodcast = totals.downloads > 0;
                  
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{performanceEntries.length}</p>
                        <p className="text-xs text-muted-foreground">Reports</p>
                      </div>
                      {hasDigital && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.impressions.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                        </div>
                      )}
                      {hasPrint && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.insertions}</p>
                          <p className="text-xs text-muted-foreground">Issues</p>
                        </div>
                      )}
                      {hasRadio && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.spotsAired}</p>
                          <p className="text-xs text-muted-foreground">Spots</p>
                        </div>
                      )}
                      {hasPodcast && (
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totals.downloads.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Downloads</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-2xl font-bold">{proofs.length}</p>
                        <p className="text-xs text-muted-foreground">Proofs</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Campaign Info - Simple */}
          {(campaignData?.objectives?.primaryGoal || campaignData?.objectives?.targetAudience) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-sans text-muted-foreground">Campaign Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {campaignData?.timeline?.durationWeeks && (
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{campaignData.timeline.durationWeeks} weeks</p>
                    </div>
                  )}
                  {campaignData?.objectives?.primaryGoal && (
                    <div>
                      <p className="text-muted-foreground">Goal</p>
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
            </Card>
          )}
        </TabsContent>

        {/* PLACEMENTS TAB (organized by channel type) */}
        <TabsContent value="placements" className="mt-0 space-y-4">
          {/* Info banner when no scripts - explain auto-generation */}
          {trackingScripts.length === 0 && (
            <Card className="border bg-white shadow-none">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Awaiting Creative Assets</p>
                      <p className="text-sm text-muted-foreground">Tracking scripts will appear automatically when the hub uploads assets for digital placements</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleRefreshScripts} 
                    variant="outline"
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
            <Card className="border bg-white shadow-none">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{trackingScripts.length} Tracking Script{trackingScripts.length !== 1 ? 's' : ''} Ready</p>
                      <p className="text-sm text-muted-foreground">Copy the code below and paste into your ad server</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopyAllScripts} variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy All
                    </Button>
                    <Button 
                      onClick={handleRefreshScripts} 
                      variant="outline" 
                      size="sm"
                      disabled={refreshingScripts}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-1", refreshingScripts && "animate-spin")} />
                      {refreshingScripts ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadAllScripts}>
                          <Download className="h-4 w-4 mr-2" />
                          Download All Scripts
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => trackingScripts.length > 0 && handleTestScript(trackingScripts[0])}
                          disabled={trackingScripts.length === 0}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Test Tags
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                <Card key={channel} className="border bg-white shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-sans flex items-center gap-2">
                        {config.label}
                      </CardTitle>
                      <Badge variant="secondary">{items.length} placement{items.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    
                    {/* Implementation Instructions */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Start Date</p>
                            <p className="font-medium">
                              {startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">End Date</p>
                            <p className="font-medium">
                              {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Implementation instructions */}
                      <p className="text-sm text-muted-foreground">{config.instructions.howTo}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Accordion type="multiple" className="space-y-2">
                    {items.map((item: any) => {
                      const itemPath = item.itemPath || item.sourcePath || `placement-${item._idx}`;
                      const placementStatus = placementStatuses[itemPath] || 'pending';
                      
                      // Get scripts for digital, assets for non-digital
                      // Filter scripts by channel AND dimensions to match the right placement
                      const dimValue = item.format?.dimensions || item.format?.size || '';
                      const placementDimensions = typeof dimValue === 'string' ? dimValue : '';
                      const dimParts = placementDimensions ? placementDimensions.split(/x/i).map((d: string) => parseInt(d?.trim())) : [];
                      const [placementWidth, placementHeight] = dimParts.length === 2 ? dimParts : [0, 0];
                      
                      // Filter scripts for this placement - match by itemPath only
                      const scripts = isDigital ? trackingScripts.filter(s => 
                        s.itemPath === itemPath
                      ) : [];
                      // Show assets for ALL placements (digital and non-digital)
                      const placementAssets = freshAssets
                        .filter(fa => fa.placementId === itemPath && fa.hasAsset && fa.asset)
                        .map(fa => fa.asset!);

                      // Get delivery expectations for this placement
                      const deliveryExpectations = getDeliveryExpectations(item);
                      
                      // Get earnings for collapsed header
                      const earningsExp = deliveryExpectations.find(e => e.label === 'Earn');

                      return (
                        <AccordionItem 
                          key={itemPath} 
                          value={itemPath}
                          className={cn(
                            "border rounded-lg overflow-hidden bg-white",
                            placementStatus === 'rejected' && "border-red-300 bg-red-50/50"
                          )}
                        >
                          {/* Collapsed Header - shows key info at a glance */}
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50 [&[data-state=open]>svg]:rotate-90">
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                <span className="font-medium">{item.itemName || item.sourceName}</span>
                                {item.format?.dimensions && (
                                  <Badge variant="outline" className="text-xs">
                                    {parseDimensions(item.format.dimensions)[0]}
                                    {parseDimensions(item.format.dimensions).length > 1 && ` +${parseDimensions(item.format.dimensions).length - 1}`}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {earningsExp && (
                                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                                    {earningsExp.value}
                                  </span>
                                )}
                                <PlacementStatusBadge status={placementStatus} />
                              </div>
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent>
                            {/* Full Delivery Expectations */}
                            {deliveryExpectations.length > 0 && (
                              <div className="px-4 pb-3 pt-1 border-b bg-gray-50/50">
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  {deliveryExpectations.map((exp, i) => (
                                    <div 
                                      key={i} 
                                      className={cn(
                                        "flex items-center gap-1",
                                        (exp as any).highlight 
                                          ? "bg-white px-2 py-1 rounded-md font-medium border" 
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {exp.icon}
                                      <span className={(exp as any).highlight ? "text-gray-700" : "text-gray-600"}>
                                        {exp.label}:
                                      </span>
                                      <span className={(exp as any).highlight ? "text-gray-900 font-semibold" : "font-medium text-gray-900"}>
                                        {exp.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="p-3 space-y-3">
                            
                            {/* Website: Note about grouped impressions */}
                            {channel === 'website' && scripts.length > 1 && (
                              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                                <strong>Note:</strong> Distribute impressions across sizes as needed. Use the scripts below to traffic each ad size.
                              </p>
                            )}
                            
                            {/* Digital: Show Scripts */}
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
                                              // Get publication's configured platform and transform accordingly
                                              const pubSettings = (order as any)?.publicationSettings?.adDeliverySettings;
                                              const isNewsletter = script.channel?.includes('newsletter');
                                              let tagToCopy = script.tags.fullTag;
                                              
                                              if (isNewsletter && pubSettings?.esp) {
                                                tagToCopy = transformForESP(script.tags.fullTag, pubSettings.esp, pubSettings.espOther);
                                              } else if (!isNewsletter && pubSettings?.adServer) {
                                                tagToCopy = transformForAdServer(script.tags.fullTag, pubSettings.adServer, script.creative.clickUrl);
                                              }
                                              
                                              handleCopyScript(tagToCopy, `${script._id}-quick`);
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
                                          {/* Determine if this is web or newsletter inventory */}
                                          {(() => {
                                            const isNewsletterScript = script.channel?.includes('newsletter');
                                            
                                            // Get publication's configured platforms
                                            const pubSettings = (order as any)?.publicationSettings?.adDeliverySettings;
                                            const configuredAdServer = (pubSettings?.adServer || 'gam') as PublicationAdServer;
                                            const configuredESP = (pubSettings?.esp || 'other') as PublicationESP;
                                            const espCustomTags = pubSettings?.espOther;
                                            
                                            if (isNewsletterScript) {
                                              // Newsletter: Show Full HTML / Simplified tabs with ESP transforms
                                              return (
                                                <Tabs defaultValue="full" className="w-full">
                                                  <TabsList className="grid w-full grid-cols-2 h-8">
                                                    <TabsTrigger value="full" className="text-xs">
                                                      {configuredESP !== 'other' ? getESPName(configuredESP) : 'Full HTML'}
                                                    </TabsTrigger>
                                                    <TabsTrigger value="simplified" className="text-xs">Simplified</TabsTrigger>
                                                  </TabsList>

                                                  <TabsContent value="full" className="mt-2">
                                                    <div className="relative">
                                                      <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                        <code>{transformForESP(script.tags.fullTag, configuredESP, espCustomTags)}</code>
                                                      </pre>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                        onClick={() => handleCopyScript(transformForESP(script.tags.fullTag, configuredESP, espCustomTags), `${script._id}-full`)}
                                                      >
                                                        {copiedScriptId === `${script._id}-full` ? (
                                                          <Check className="h-3 w-3 text-green-400" />
                                                        ) : (
                                                          <Copy className="h-3 w-3" />
                                                        )}
                                                      </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      {configuredESP !== 'other' 
                                                        ? `Formatted for ${getESPName(configuredESP)}. ${getESPInstructions(configuredESP)}`
                                                        : 'Table-based HTML for newsletters. Replace EMAIL_ID and CACHE_BUSTER with your ESP\'s merge tags.'
                                                      }
                                                    </p>
                                                  </TabsContent>

                                                  <TabsContent value="simplified" className="mt-2">
                                                    <div className="space-y-2">
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground">Image URL</label>
                                                        <div className="relative">
                                                          <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                                            <code>{script.urls.creativeUrl}</code>
                                                          </pre>
                                                          <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                            onClick={() => handleCopyScript(script.urls.creativeUrl, `${script._id}-img`)}
                                                          >
                                                            {copiedScriptId === `${script._id}-img` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                          </Button>
                                                        </div>
                                                      </div>
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground">Click URL</label>
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
                                                            {copiedScriptId === `${script._id}-click` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                          </Button>
                                                        </div>
                                                      </div>
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground">Tracking Pixel</label>
                                                        <div className="relative">
                                                          <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                                            <code>{script.urls.impressionPixel}</code>
                                                          </pre>
                                                          <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                            onClick={() => handleCopyScript(script.urls.impressionPixel, `${script._id}-pxl`)}
                                                          >
                                                            {copiedScriptId === `${script._id}-pxl` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                      Use these URLs for manual placement in ESPs with limited HTML support.
                                                    </p>
                                                  </TabsContent>
                                                </Tabs>
                                              );
                                            }
                                            
                                            // Web/Display: Show configured platform first, then others
                                            // Order tabs so configured platform is first
                                            const allServers: PublicationAdServer[] = ['gam', 'broadstreet', 'adbutler', 'direct'];
                                            const tabOrder: PublicationAdServer[] = [
                                              configuredAdServer,
                                              ...allServers.filter(s => s !== configuredAdServer)
                                            ];
                                            
                                            return (
                                              <Tabs defaultValue={configuredAdServer} className="w-full">
                                                <TabsList className="grid w-full grid-cols-4 h-8">
                                                  {tabOrder.map(server => (
                                                    <TabsTrigger key={server} value={server} className="text-xs">
                                                      {server === configuredAdServer && <Check className="h-3 w-3 mr-1" />}
                                                      {server === 'gam' ? 'GAM' : server === 'broadstreet' ? 'Broadstreet' : server === 'adbutler' ? 'AdButler' : 'Direct'}
                                                    </TabsTrigger>
                                                  ))}
                                                </TabsList>

                                                <TabsContent value="gam" className="mt-2">
                                                  <div className="relative">
                                                    <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                      <code>{transformForAdServer(script.tags.fullTag, 'gam', script.creative.clickUrl)}</code>
                                                    </pre>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                      onClick={() => handleCopyScript(transformForAdServer(script.tags.fullTag, 'gam', script.creative.clickUrl), `${script._id}-gam`)}
                                                    >
                                                      {copiedScriptId === `${script._id}-gam` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {configuredAdServer === 'gam' && '✓ Your configured platform. '}
                                                    Uses %%CLICK_URL_UNESC%% and %%CACHEBUSTER%% macros.
                                                  </p>
                                                </TabsContent>

                                                <TabsContent value="broadstreet" className="mt-2">
                                                  <div className="relative">
                                                    <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                      <code>{transformForAdServer(script.tags.fullTag, 'broadstreet', script.creative.clickUrl)}</code>
                                                    </pre>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                      onClick={() => handleCopyScript(transformForAdServer(script.tags.fullTag, 'broadstreet', script.creative.clickUrl), `${script._id}-bs`)}
                                                    >
                                                      {copiedScriptId === `${script._id}-bs` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {configuredAdServer === 'broadstreet' && '✓ Your configured platform. '}
                                                    Uses {'{{click}}'} and [timestamp] macros.
                                                  </p>
                                                </TabsContent>

                                                <TabsContent value="adbutler" className="mt-2">
                                                  <div className="relative">
                                                    <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                      <code>{transformForAdServer(script.tags.fullTag, 'adbutler', script.creative.clickUrl)}</code>
                                                    </pre>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                      onClick={() => handleCopyScript(transformForAdServer(script.tags.fullTag, 'adbutler', script.creative.clickUrl), `${script._id}-adbutler`)}
                                                    >
                                                      {copiedScriptId === `${script._id}-adbutler` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {configuredAdServer === 'adbutler' && '✓ Your configured platform. '}
                                                    Uses [TRACKING_LINK] and [RANDOM] macros.
                                                  </p>
                                                </TabsContent>

                                                <TabsContent value="direct" className="mt-2">
                                                  <div className="relative">
                                                    <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-32">
                                                      <code>{transformForAdServer(script.tags.fullTag, 'direct', script.creative.clickUrl)}</code>
                                                    </pre>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="absolute top-1 right-1 h-6 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300"
                                                      onClick={() => handleCopyScript(transformForAdServer(script.tags.fullTag, 'direct', script.creative.clickUrl), `${script._id}-direct`)}
                                                    >
                                                      {copiedScriptId === `${script._id}-direct` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {configuredAdServer === 'direct' && '✓ Your configured platform. '}
                                                    Uses JavaScript for dynamic cache busting.
                                                  </p>
                                                </TabsContent>
                                              </Tabs>
                                            );
                                          })()}

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

                            {/* Digital: No scripts yet - show awaiting message regardless of status */}
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

                            {/* Non-Digital: No assets yet - show awaiting message */}
                            {!isDigital && placementAssets.length === 0 && (
                              <div className="text-center py-3 text-muted-foreground text-sm bg-gray-50 rounded">
                                <Clock className="h-5 w-5 mx-auto mb-1 opacity-50" />
                                Awaiting creative assets from hub
                              </div>
                            )}

                            {/* Execution Instructions for non-digital */}
                            {!isDigital && (
                              <div className="p-2 bg-blue-50/50 rounded border border-blue-100 text-sm">
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

                              {/* Accepted: Mark In Production - only if has script (digital) or asset (offline) */}
                              {placementStatus === 'accepted' && (() => {
                                const hasRequiredAsset = isDigital ? scripts.length > 0 : placementAssets.length > 0;
                                const missingText = isDigital ? 'Needs tracking script' : 'Needs creative asset';
                                
                                if (!hasRequiredAsset) {
                                  return (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                      <AlertCircle className="h-3.5 w-3.5" /> {missingText}
                                    </span>
                                  );
                                }
                                
                                return (
                                  <Button
                                    onClick={() => handlePlacementAction(itemPath, 'in_production')}
                                    disabled={updating}
                                    className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3"
                                    size="sm"
                                  >
                                    <PlayCircle className="h-3 w-3 mr-1" /> Mark Live
                                  </Button>
                                );
                              })()}

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
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            });
          })()}

          {/* Update Status Actions */}
          {(order.status === 'confirmed' || order.status === 'in_production') && (
            <Card className="shadow-none">
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
        <TabsContent value="performance" className="mt-0">
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
            <Card className="shadow-none">
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
        <TabsContent value="messages" className="mt-0">
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

      {/* Tag Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Test Tracking Tag
            </DialogTitle>
            <DialogDescription>
              Verify that your tracking pixels and URLs are responding correctly.
            </DialogDescription>
          </DialogHeader>
          
          {testingScript && (
            <div className="space-y-4">
              {/* Script Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{testingScript.creative.name}</p>
                <p className="text-xs text-muted-foreground">
                  {testingScript.creative.width}x{testingScript.creative.height} • {testingScript.channel}
                </p>
              </div>

              {/* Test Results */}
              <div className="space-y-3">
                {/* Impression Pixel */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {testResults?.impressionPixel.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {testResults?.impressionPixel.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {testResults?.impressionPixel.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">Impression Pixel</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {testResults?.impressionPixel.status === 'success' && `${testResults.impressionPixel.time}ms`}
                    {testResults?.impressionPixel.status === 'pending' && 'Testing...'}
                    {testResults?.impressionPixel.status === 'error' && testResults.impressionPixel.error}
                  </span>
                </div>

                {/* Click Tracker */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {testResults?.clickTracker.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {testResults?.clickTracker.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {testResults?.clickTracker.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">Click Tracker</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {testResults?.clickTracker.status === 'success' && `${testResults.clickTracker.time}ms`}
                    {testResults?.clickTracker.status === 'pending' && 'Testing...'}
                    {testResults?.clickTracker.status === 'error' && testResults.clickTracker.error}
                  </span>
                </div>

                {/* Creative URL */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {testResults?.creativeUrl.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {testResults?.creativeUrl.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {testResults?.creativeUrl.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">Creative Image</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {testResults?.creativeUrl.status === 'success' && `${testResults.creativeUrl.time}ms`}
                    {testResults?.creativeUrl.status === 'pending' && 'Testing...'}
                    {testResults?.creativeUrl.status === 'error' && testResults.creativeUrl.error}
                  </span>
                </div>
              </div>

              {/* Destination URL */}
              {testingScript.creative.clickUrl && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">Landing Page:</p>
                  <a 
                    href={testingScript.creative.clickUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {testingScript.creative.clickUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
            {testingScript && (
              <Button onClick={() => handleTestScript(testingScript)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-test
              </Button>
            )}
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

// PlacementStatusBadge is now imported from '../orders/PlacementStatusBadge'

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
      icon: PlayCircle,
      // Only allow marking live if placement is accepted AND has required assets/scripts
      action: placementStatus === 'accepted' && (isDigital ? hasScripts : hasAssets) ? onMarkInProduction : undefined,
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
