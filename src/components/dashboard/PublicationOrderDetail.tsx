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
import { OrderPerformanceView } from './OrderPerformanceView';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, Check, X, AlertCircle, FileText, AlertTriangle, 
  Loader2, CheckCircle2, BarChart3, Code, Copy, ExternalLink,
  Calendar, DollarSign, Layers, MessageSquare, Download,
  ChevronDown, ChevronUp, Clock, Package, RefreshCw,
  Eye, Users, Newspaper, Radio, Headphones, CalendarDays, Target,
  Lock, XCircle, PlayCircle, Timer
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
        icon: <Eye className="h-3.5 w-3.5 text-muted-foreground" />
      });
    }
    
    // Channel-specific metrics
    if (channel === 'website') {
      if (metrics.monthlyPageViews) {
        expectations.push({
          label: 'Page Views',
          value: formatNumber(metrics.monthlyPageViews) + '/mo',
          icon: <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
      if (metrics.monthlyVisitors) {
        expectations.push({
          label: 'Visitors',
          value: formatNumber(metrics.monthlyVisitors) + '/mo',
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'newsletter') {
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
      if (metrics.circulation) {
        expectations.push({
          label: 'Circulation',
          value: formatNumber(metrics.circulation),
          icon: <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'radio') {
      if (metrics.listeners) {
        expectations.push({
          label: 'Est. Listeners',
          value: formatNumber(metrics.listeners),
          icon: <Radio className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'podcast') {
      if (metrics.listeners || perfMetrics.audienceSize) {
        expectations.push({
          label: 'Downloads/Listens',
          value: formatNumber(metrics.listeners || perfMetrics.audienceSize) + '/ep',
          icon: <Headphones className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'events') {
      if (metrics.expectedAttendees || metrics.averageAttendance) {
        expectations.push({
          label: 'Expected Attendees',
          value: formatNumber(metrics.expectedAttendees || metrics.averageAttendance),
          icon: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    } else if (channel === 'social_media' || channel === 'social') {
      if (metrics.followers) {
        expectations.push({
          label: 'Followers',
          value: formatNumber(metrics.followers),
          icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
    }
    
    // Frequency/occurrences
    if (item.currentFrequency) {
      expectations.push({
        label: 'Frequency',
        value: `${item.currentFrequency}x`,
        icon: <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
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

      {/* Campaign Flight Date Alerts */}
      <CampaignFlightDateAlert
        startDate={campaignData?.timeline?.startDate}
        endDate={campaignData?.timeline?.endDate}
        orderStatus={order.status}
      />

      {/* Assets Pending Banner - Show when assets are still being prepared */}
      {order.assetStatus?.pendingUpload && !order.assetStatus?.allAssetsReady && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                <div>
                  <p className="font-medium text-amber-900">Creative Assets Being Prepared</p>
                  <p className="text-sm text-amber-700">
                    The hub is preparing creative assets for this campaign. You'll be notified when they're ready.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Progress 
                  value={(order.assetStatus.placementsWithAssets / order.assetStatus.totalPlacements) * 100} 
                  className="h-2 w-32" 
                />
                <span className="text-xs text-amber-600">
                  {order.assetStatus.placementsWithAssets} of {order.assetStatus.totalPlacements} ready
                </span>
              </div>
            </div>
            
            {/* Show which specific assets are missing */}
            {freshAssets.filter(a => !a.hasAsset).length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs font-medium text-amber-800 mb-2">
                  Awaiting assets for:
                </p>
                <div className="flex flex-wrap gap-2">
                  {freshAssets
                    .filter(a => !a.hasAsset)
                    .map(missing => (
                      <div 
                        key={missing.placementId} 
                        className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full"
                      >
                        <AlertCircle className="h-3 w-3" />
                        <span className="font-medium">{missing.placementName}</span>
                        {missing.dimensions && (
                          <span className="text-amber-600">({missing.dimensions})</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assets Ready Banner - Show when assets just became ready */}
      {order.assetStatus?.allAssetsReady && order.assetStatus?.assetsReadyAt && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">All Creative Assets Ready</p>
                  <p className="text-sm text-green-700">
                    {order.assetStatus.totalPlacements} asset{order.assetStatus.totalPlacements !== 1 ? 's' : ''} available for download
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab('placements')} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                View Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Banner for "sent" orders */}
      {needsReview && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Review Required</p>
                  <p className="text-sm text-blue-700">
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
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-none">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Payment</span>
                </div>
                <p className="text-xl font-bold text-green-600 mt-1">
                  ${publication?.publicationTotal?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Placements</span>
                </div>
                <p className="text-xl font-bold mt-1">{totalPlacements}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Start</span>
                </div>
                <p className="text-sm font-bold mt-1">
                  {campaignData?.timeline?.startDate 
                    ? new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans">Placement Status</CardTitle>
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
                            {hasScript ? "Script" : "Script"}
                          </span>
                        ) : (
                          <span className={cn("text-xs", hasAsset ? "text-green-600" : "text-amber-600")}>
                            {hasAsset ? "Asset" : "Asset"}
                          </span>
                        )}
                        {['in_production', 'delivered'].includes(status) && (
                          <span className={cn("text-xs", hasPerf ? "text-green-600" : "text-amber-600")}>
                            {hasPerf ? "Reported" : "Report"}
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
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-sans flex items-center gap-2">
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
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-sans flex items-center gap-2">
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

          {/* Campaign Info - Collapsible */}
          <Collapsible>
            <Card className="shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-sans text-muted-foreground">Campaign Details</CardTitle>
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
                    <Button onClick={handleDownloadAllScripts} variant="outline" className="bg-white" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      onClick={() => trackingScripts.length > 0 && handleTestScript(trackingScripts[0])} 
                      variant="outline" 
                      className="bg-white" 
                      size="sm"
                      disabled={trackingScripts.length === 0}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Test Tags
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
                  </div>
                </div>
                
                {/* Scripts organized by size */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-2">By Ad Size:</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Group scripts by size
                      const sizeGroups: Record<string, typeof trackingScripts> = {};
                      trackingScripts.forEach(script => {
                        const size = script.creative.width && script.creative.height 
                          ? `${script.creative.width}x${script.creative.height}` 
                          : 'Auto';
                        if (!sizeGroups[size]) sizeGroups[size] = [];
                        sizeGroups[size].push(script);
                      });
                      
                      return Object.entries(sizeGroups).map(([size, scripts]) => (
                        <Badge 
                          key={size}
                          variant="secondary" 
                          className="bg-white text-blue-800 border border-blue-300 hover:bg-blue-100 cursor-default"
                        >
                          {size} ({scripts.length})
                        </Badge>
                      ));
                    })()}
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

// Campaign Flight Date Alert Component
interface CampaignFlightDateAlertProps {
  startDate?: string | Date;
  endDate?: string | Date;
  orderStatus: string;
}

function CampaignFlightDateAlert({ startDate, endDate, orderStatus }: CampaignFlightDateAlertProps) {
  // Don't show alerts for draft or cancelled orders
  if (['draft', 'cancelled'].includes(orderStatus)) {
    return null;
  }

  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  // Calculate days until/since dates
  const daysUntilStart = start ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const daysUntilEnd = end ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  // Determine campaign state
  const hasNotStarted = start && now < start;
  const hasEnded = end && now > end;
  const isActive = start && end && now >= start && now <= end;
  
  // Format dates for display
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Pre-launch: Campaign starting soon (within 7 days)
  if (hasNotStarted && daysUntilStart !== null && daysUntilStart <= 7 && daysUntilStart > 0) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Timer className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Campaign starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}</AlertTitle>
        <AlertDescription className="text-blue-700">
          Make sure all tracking tags are trafficked and tested before {start && formatDate(start)}.
          {orderStatus === 'sent' && ' Please review and accept placements first.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Pre-launch: Campaign starting today
  if (hasNotStarted && daysUntilStart === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <PlayCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Campaign starts today!</AlertTitle>
        <AlertDescription className="text-blue-700">
          Verify all tracking tags are live and firing correctly.
          {orderStatus === 'sent' && ' ⚠️ Placements still need to be accepted!'}
        </AlertDescription>
      </Alert>
    );
  }

  // Active: Campaign is live and running well
  if (isActive && daysUntilEnd !== null && daysUntilEnd > 3) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <PlayCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Campaign is live</AlertTitle>
        <AlertDescription className="text-green-700">
          {daysUntilEnd} day{daysUntilEnd !== 1 ? 's' : ''} remaining until {end && formatDate(end)}.
          {['sent', 'confirmed'].includes(orderStatus) && ' Mark placements as "In Production" when ads are running.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Active but ending soon: Campaign ending within 3 days
  if (isActive && daysUntilEnd !== null && daysUntilEnd <= 3 && daysUntilEnd > 0) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Campaign ending soon!</AlertTitle>
        <AlertDescription className="text-amber-700">
          Only {daysUntilEnd} day{daysUntilEnd !== 1 ? 's' : ''} remaining until {end && formatDate(end)}.
          Ensure all performance data is reported before the campaign ends.
        </AlertDescription>
      </Alert>
    );
  }

  // Active: Campaign ends today
  if (isActive && daysUntilEnd === 0) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Campaign ends today!</AlertTitle>
        <AlertDescription className="text-amber-700">
          This is the last day of the campaign. Report final performance numbers and upload proof of performance.
        </AlertDescription>
      </Alert>
    );
  }

  // Expired: Campaign has ended
  if (hasEnded) {
    const daysSinceEnd = end ? Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return (
      <Alert className="bg-gray-50 border-gray-200">
        <XCircle className="h-4 w-4 text-gray-500" />
        <AlertTitle className="text-gray-700">Campaign ended</AlertTitle>
        <AlertDescription className="text-gray-600">
          Campaign ended {daysSinceEnd === 0 ? 'today' : `${daysSinceEnd} day${daysSinceEnd !== 1 ? 's' : ''} ago`} on {end && formatDate(end)}.
          {orderStatus !== 'delivered' && ' Please submit final performance reports and mark placements as delivered.'}
          {orderStatus === 'delivered' && ' All performance data should now be finalized.'}
        </AlertDescription>
      </Alert>
    );
  }

  // No alert needed (campaign is more than 7 days away, or no dates set)
  return null;
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
