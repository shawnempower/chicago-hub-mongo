import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePublication } from '@/contexts/PublicationContext';
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
import { PixelHealthAlert } from '../orders/PixelHealthBadge';
import { OrderPerformanceView } from './OrderPerformanceView';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, Check, X, AlertCircle, FileText, AlertTriangle, 
  Loader2, CheckCircle2, BarChart3, Code, Copy, ExternalLink,
  Calendar, DollarSign, Layers, MessageSquare, Download,
  ChevronDown, ChevronUp, ChevronRight, Clock, Package, RefreshCw,
  Eye, Users, Newspaper, Radio, Headphones, CalendarDays, Target,
  Lock, XCircle, PlayCircle, Timer, Megaphone, MoreVertical,
  Globe, Mail, Tv, PauseCircle
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
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { PublicationInsertionOrderDocument } from '@/integrations/mongodb/insertionOrderSchema';
import { TrackingScript } from '@/integrations/mongodb/trackingScriptSchema';
import { HubAdvertisingTerms } from '@/integrations/mongodb/hubSchema';
import { API_BASE_URL } from '@/config/api';
import { getChannelConfig, isDigitalChannel } from '@/config/inventoryChannels';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { forceDownloadFile, downloadCreativeAsset } from '@/utils/fileUpload';
import { cn } from '@/lib/utils';
import { DEFAULT_REJECTION_REASONS } from '@/constants/rejectionReasons';

interface OrderDetailData extends PublicationInsertionOrderDocument {}

export function PublicationOrderDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedPublication } = usePublication();
  const { isAdmin } = useAdminAuth();
  const campaignId = searchParams.get('campaignId');
  const publicationId = searchParams.get('publicationId');
  
  // Track the initial publication ID to detect changes from the dropdown
  const initialPublicationIdRef = useRef<string | null>(publicationId);

  // When selected publication changes via the dropdown and doesn't match the order's publication,
  // navigate back to the orders list since we're viewing a different publication's order
  useEffect(() => {
    if (!selectedPublication || !publicationId) return;
    
    const selectedPubId = selectedPublication.publicationId?.toString() || selectedPublication._id;
    
    // If the selected publication has changed from what we initially loaded
    // and doesn't match the order's publication, go back to orders list
    if (initialPublicationIdRef.current && 
        selectedPubId !== publicationId && 
        selectedPubId !== initialPublicationIdRef.current) {
      navigate('/dashboard?tab=orders');
    }
  }, [selectedPublication?.publicationId, selectedPublication?._id, publicationId, navigate]);

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [placementStatuses, setPlacementStatuses] = useState<Record<string, 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered' | 'suspended'>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPlacementId, setRejectingPlacementId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Proof prompt state - REMOVED: Manual completion is now automated
  // See PlacementCompletionService for auto-completion logic
  // const [proofPromptOpen, setProofPromptOpen] = useState(false);
  // const [proofPromptPlacement, setProofPromptPlacement] = useState<{
  //   itemPath: string;
  //   itemName: string;
  //   channel: string;
  // } | null>(null);
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
  
  // Hub advertising terms
  const [hubTerms, setHubTerms] = useState<HubAdvertisingTerms | null>(null);
  
  // Earnings data for this order
  const [orderEarnings, setOrderEarnings] = useState<{
    estimatedTotal: number;
    actualTotal: number;
    amountPaid: number;
    amountOwed: number;
    paymentStatus: 'pending' | 'partially_paid' | 'paid';
    deliveryPercent: number;
  } | null>(null);

  useEffect(() => {
    if (campaignId && publicationId) {
      fetchOrderDetail();
      fetchFreshAssets();
      fetchTrackingScripts();
      fetchPerformanceData();
      markOrderAsViewed();
    }
  }, [campaignId, publicationId]);
  
  // Fetch earnings when order loads
  useEffect(() => {
    if (order?._id) {
      fetchOrderEarnings();
    }
  }, [order?._id]);
  
  // Mark the order as viewed by publication user (clears unread indicator)
  const markOrderAsViewed = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/mark-viewed`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
    } catch (error) {
      // Silently fail - not critical
      console.error('Error marking order as viewed:', error);
    }
  };

  // Re-fetch performance data when switching to placements tab (in case user just reported)
  useEffect(() => {
    if (activeTab === 'placements' && campaignId && publicationId) {
      fetchPerformanceData();
    }
  }, [activeTab]);

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
      
      // Set hub advertising terms if available
      if (data.hubTerms) {
        setHubTerms(data.hubTerms);
      }
      
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
  
  // Fetch earnings data for this specific order
  const fetchOrderEarnings = async () => {
    if (!order?._id) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/earnings/order/${order._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.earnings) {
          const e = data.earnings;
          const estTotal = e.estimated?.total ?? 0;
          const actTotal = e.actual?.total ?? 0;
          const deliveryPercent = estTotal > 0
            ? Math.min(100, Math.round((actTotal / estTotal) * 100))
            : 0;
          setOrderEarnings({
            estimatedTotal: estTotal,
            actualTotal: actTotal,
            amountPaid: e.amountPaid || 0,
            amountOwed: e.amountOwed || 0,
            paymentStatus: e.paymentStatus || 'pending',
            deliveryPercent,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching order earnings:', error);
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
    // Get campaign and inventory data for trafficking instructions
    const campaignDataForDownload = (order as any)?.campaignData;
    // Use order.selectedInventory as source of truth for downloads
    const orderPublicationForDownload = order?.selectedInventory?.publications?.[0];
    const inventoryItemsForDownload = orderPublicationForDownload?.inventoryItems || [];
    
    // Get campaign dates
    const campaignStartDate = campaignDataForDownload?.timeline?.startDate 
      ? new Date(campaignDataForDownload.timeline.startDate) : null;
    const campaignEndDate = campaignDataForDownload?.timeline?.endDate 
      ? new Date(campaignDataForDownload.timeline.endDate) : null;
    const formatDate = (date: Date | null) => date 
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
      : 'TBD';
    
    // Helper to find matching inventory item for a script
    const findInventoryItem = (script: TrackingScript) => {
      const scriptItemPath = script.itemPath || '';
      // Scripts may have _dim suffix, match base path
      const baseItemPath = scriptItemPath.replace(/_dim\d+$/, '');
      return inventoryItemsForDownload.find((item: any) => {
        const itemPath = item.itemPath || item.sourcePath || '';
        return itemPath === baseItemPath || itemPath === scriptItemPath;
      });
    };
    
    // Helper to get trafficking instructions for an inventory item
    // Uses same logic as getDeliveryExpectations in the UI
    const getTraffickingInstructions = (item: any, channel: string): string => {
      if (!item) return '';
      
      const instructions: string[] = [];
      const ch = channel.toLowerCase();
      const metrics = item.audienceMetrics || {};
      const perfMetrics = item.performanceMetrics || {};
      const frequency = item.currentFrequency || item.quantity || 1;
      const durationMonths = getDurationMonths();
      
      // Calculate earnings using existing utility
      const earnings = calculateItemCost(item, frequency, durationMonths);
      
      // Campaign dates
      instructions.push(`<strong>Campaign Period:</strong> ${formatDate(campaignStartDate)} - ${formatDate(campaignEndDate)}`);
      
      // Add earnings (important for publications)
      if (earnings > 0) {
        instructions.push(`<strong>Earn:</strong> ${formatCurrency(earnings)}`);
      }
      
      if (ch === 'website' || ch === 'display') {
        // Website: Read delivery goal from stored deliveryGoals
        const itemPath = item.itemPath || item.sourcePath;
        const storedGoal = order?.deliveryGoals?.[itemPath];
        if (storedGoal && storedGoal.goalValue > 0) {
          instructions.push(`<strong>Deliver:</strong> ${formatNumber(storedGoal.goalValue)} impressions`);
        }
        if (metrics.monthlyVisitors) {
          instructions.push(`<strong>Audience:</strong> ${formatNumber(metrics.monthlyVisitors)} visitors/mo`);
        }
      } else if (ch.includes('newsletter')) {
        // Newsletter friendly name
        if (item.sourceName) {
          instructions.push(`<strong>Newsletter:</strong> ${item.sourceName}`);
        }
        // Newsletter: Sends are the unit
        instructions.push(`<strong>Sends:</strong> ${frequency} newsletter${frequency > 1 ? 's' : ''}`);
        if (metrics.subscribers) {
          instructions.push(`<strong>Subscribers:</strong> ${formatNumber(metrics.subscribers)}`);
        }
        if (item.openRate) {
          instructions.push(`<strong>Open Rate:</strong> ${item.openRate}%`);
        }
      } else if (ch === 'print') {
        // Print: Insertions are the unit
        instructions.push(`<strong>Insertions:</strong> ${frequency} issue${frequency > 1 ? 's' : ''}`);
        if (metrics.circulation) {
          instructions.push(`<strong>Circulation:</strong> ${formatNumber(metrics.circulation)}/issue`);
          const totalCirculation = metrics.circulation * frequency;
          instructions.push(`<strong>Total Reach:</strong> ~${formatNumber(totalCirculation * 2.5)} readers`);
        }
      } else if (ch === 'radio') {
        // Radio: Spots are the unit
        instructions.push(`<strong>Spots:</strong> ${frequency} airing${frequency > 1 ? 's' : ''}`);
        if (metrics.listeners) {
          instructions.push(`<strong>Est. Listeners:</strong> ${formatNumber(metrics.listeners)}/spot`);
        }
      } else if (ch === 'podcast') {
        // Podcast: Episodes are the unit
        instructions.push(`<strong>Episodes:</strong> ${frequency} episode${frequency > 1 ? 's' : ''}`);
        if (metrics.listeners || perfMetrics.audienceSize) {
          instructions.push(`<strong>Downloads:</strong> ${formatNumber(metrics.listeners || perfMetrics.audienceSize)}/ep`);
        }
      } else if (ch === 'streaming') {
        const itemPath = item.itemPath || item.sourcePath;
        const streamGoal = order?.deliveryGoals?.[itemPath];
        if (streamGoal && streamGoal.goalValue > 0) {
          instructions.push(`<strong>Deliver:</strong> ${formatNumber(streamGoal.goalValue)} views`);
        }
        if (metrics.subscribers) {
          instructions.push(`<strong>Subscribers:</strong> ${formatNumber(metrics.subscribers)}`);
        }
      } else if (ch === 'events') {
        // Events: Sponsorships
        instructions.push(`<strong>Event:</strong> ${frequency} sponsorship${frequency > 1 ? 's' : ''}`);
        if (metrics.expectedAttendees || metrics.averageAttendance) {
          instructions.push(`<strong>Attendance:</strong> ${formatNumber(metrics.expectedAttendees || metrics.averageAttendance)}`);
        }
      } else if (ch === 'social_media' || ch === 'social') {
        // Social: Posts are the unit
        instructions.push(`<strong>Posts:</strong> ${frequency} post${frequency > 1 ? 's' : ''}`);
        if (metrics.followers) {
          instructions.push(`<strong>Followers:</strong> ${formatNumber(metrics.followers)}`);
        }
      }
      
      return instructions.length > 0 
        ? `<div class="trafficking-info">${instructions.join('<br>')}</div>` 
        : '';
    };
    
    // Group scripts by placement (base itemPath without _dim suffix)
    const placementGroups: Record<string, { item: any; scripts: typeof trackingScripts }> = {};
    trackingScripts.forEach(script => {
      const scriptItemPath = script.itemPath || '';
      const baseItemPath = scriptItemPath.replace(/_dim\d+$/, '') || 'default';
      
      if (!placementGroups[baseItemPath]) {
        const item = findInventoryItem(script);
        placementGroups[baseItemPath] = { item, scripts: [] };
      }
      placementGroups[baseItemPath].scripts.push(script);
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
    <p style="color:#d4903a;margin-bottom:8px;">⚠️ No ad server or ESP configured in your publication profile. Set these in Settings for pre-formatted tags.</p>
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
  <title>Creative Assets - ${campaignName} - ${pubName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a6b6b; }
    h2 { color: #2a2a2a; border-bottom: 2px solid #e7e5e4; padding-bottom: 8px; margin-top: 32px; }
    h3 { color: #737373; margin-top: 16px; }
    .meta { color: #737373; font-size: 14px; margin-bottom: 24px; }
    .placement-block { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .asset-block { background: #ffffff; border: 1px solid #e7e5e4; border-radius: 6px; padding: 12px; margin: 8px 0; }
    .asset-name { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
    .asset-size { font-size: 12px; color: #737373; margin-bottom: 8px; }
    pre { background: #2a2a2a; color: #fdfcfa; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
    .instructions { background: #fef3c7; border: 1px solid #d4903a; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .trafficking-info { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Creative Assets</h1>
  <div class="meta">
    <strong>Campaign:</strong> ${campaignName}<br>
    <strong>Publication:</strong> ${pubName}<br>
    <strong>Generated:</strong> ${dateStr}<br>
    <strong>Total Creative:</strong> ${trackingScripts.length}
  </div>

  ${instructionsHtml}
`;

    // Add each placement group
    Object.entries(placementGroups).forEach(([_placementPath, { item, scripts }]) => {
      // Get placement name and channel from first script or item
      const placementName = item?.itemName || item?.sourceName || scripts[0]?.placementName || 'Ad Placement';
      const channel = scripts[0]?.channel || 'website';
      const traffickingHtml = getTraffickingInstructions(item, channel);
      
      htmlContent += `
  <div class="placement-block">
    <h2 style="margin-top:0;border:none;padding:0;">${placementName}</h2>
    ${traffickingHtml}
    <h3>Creative Assets (${scripts.length})</h3>
`;

      scripts.forEach(script => {
        const isNewsletter = script.channel?.includes('newsletter');
        const size = script.creative.width && script.creative.height
          ? `${script.creative.width}x${script.creative.height}`
          : 'auto';
        
        // Transform tag based on publication settings
        let transformedTag = script.tags.fullTag;
        if (isNewsletter && esp) {
          transformedTag = transformForESP(script.tags.fullTag, esp, espCustomTags);
        } else if (!isNewsletter && adServer) {
          transformedTag = transformForAdServer(script.tags.fullTag, adServer, script.creative.clickUrl);
        }
        
        htmlContent += `
    <div class="asset-block">
      <div class="asset-name">${script.creative.name}</div>
      <div class="asset-size">${size}${adServer || esp ? ` • ${isNewsletter && esp ? getESPName(esp) : adServer ? getAdServerName(adServer) : 'Base'} format` : ''}</div>
      <pre>${transformedTag.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
`;
      });

      htmlContent += `  </div>\n`;
    });

    htmlContent += `
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creative-assets-${pubName.toLowerCase().replace(/\s+/g, '-')}-${dateStr.replace(/\//g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: 'Downloaded!', 
      description: `${trackingScripts.length} creative assets saved to HTML file` 
    });
  };


  // isDigitalChannel is now imported from config/inventoryChannels

  // REMOVED: Manual order status updates - order status is now derived from placement statuses
  // Order becomes 'in_production' when any placement is in_production
  // Order becomes 'delivered' when all placements are delivered (auto-completed)
  // const handleUpdateStatus = async (newStatus: OrderStatus) => { ... };

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
      } else if (result.orderRejected) {
        toast({ title: 'Order Rejected', description: 'All placements have been rejected. The hub has been notified.' });
        setOrder(prev => prev ? { ...prev, status: 'rejected' } : prev);
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

  /**
   * Accept all pending placements within a specific channel/inventory type.
   * This allows publishers to quickly accept all placements at once instead of one by one.
   */
  const handleAcceptAllInChannel = async (channelItems: any[]) => {
    // Get all pending placements in this channel
    const pendingItems = channelItems.filter(item => {
      const itemPath = item.itemPath || item.sourcePath || `placement-${item._idx}`;
      const status = placementStatuses[itemPath] || 'pending';
      return status === 'pending';
    });

    if (pendingItems.length === 0) {
      toast({ title: 'No pending placements', description: 'All placements in this channel have already been processed.' });
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('auth_token');
      let orderConfirmed = false;
      let successCount = 0;
      let errorCount = 0;

      // Process all pending placements
      for (const item of pendingItems) {
        const itemPath = item.itemPath || item.sourcePath || `placement-${item._idx}`;
        try {
          const response = await fetch(
            `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/placement-status`,
            {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ placementId: itemPath, status: 'accepted', autoConfirmIfAllAccepted: true })
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            setPlacementStatuses(prev => ({ ...prev, [itemPath]: 'accepted' }));
            successCount++;
            if (result.orderConfirmed) {
              orderConfirmed = true;
            }
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      // Show appropriate feedback
      if (orderConfirmed) {
        toast({ 
          title: 'Order Confirmed!', 
          description: `All ${successCount} placements accepted. You can now access scripts and report performance.` 
        });
        setOrder(prev => prev ? { ...prev, status: 'confirmed' } : prev);
      } else if (errorCount === 0) {
        toast({ 
          title: 'All placements accepted', 
          description: `Successfully accepted ${successCount} placement${successCount !== 1 ? 's' : ''}.` 
        });
      } else {
        toast({ 
          title: 'Partially completed', 
          description: `Accepted ${successCount} placement${successCount !== 1 ? 's' : ''}, ${errorCount} failed.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to accept placements', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  /**
   * DEPRECATED: Manual completion removed - placements auto-complete based on inventory type:
   * - Digital (website, newsletter, streaming): Impressions goal achieved OR campaign ends
   * - Offline (print, radio, podcast, etc.): All expected proofs uploaded
   * 
   * The PlacementCompletionService handles auto-completion when:
   * - Performance entries are submitted
   * - Proofs of performance are uploaded
   * - Order detail is loaded (checks campaign end date for digital)
   */
  // const handleCompleteClick = (itemPath: string, itemName: string, channel: string) => {
  //   // Removed - completion is now automatic
  // };

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
  // Use order.selectedInventory as source of truth (not campaign.selectedInventory which may be stale)
  const orderPublication = order?.selectedInventory?.publications?.[0];
  const inventoryItems = orderPublication?.inventoryItems || [];
  const totalPlacements = inventoryItems.length;
  const acceptedCount = Object.values(placementStatuses).filter(s => s === 'accepted').length;
  const inProductionCount = Object.values(placementStatuses).filter(s => s === 'in_production').length;
  const deliveredCount = Object.values(placementStatuses).filter(s => s === 'delivered').length;
  const rejectedCount = Object.values(placementStatuses).filter(s => s === 'rejected').length;
  const suspendedCount = Object.values(placementStatuses).filter(s => s === 'suspended').length;
  const pendingCount = totalPlacements - acceptedCount - inProductionCount - deliveredCount - rejectedCount - suspendedCount;
  
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
    // Use stored duration if available (already calculated at campaign creation)
    if (campaignData?.timeline?.durationMonths !== undefined) {
      return campaignData.timeline.durationMonths;
    }
    
    // Fallback: calculate from dates
    const startDate = campaignData?.timeline?.startDate ? new Date(campaignData.timeline.startDate) : null;
    const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
    if (!startDate || !endDate) return 1;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // For sub-month campaigns, return fractional months (e.g., 0.5 for 2 weeks)
    if (diffDays < 28) {
      const weeks = Math.ceil(diffDays / 7);
      return weeks / 4; // e.g., 2 weeks = 0.5 months
    }
    
    // For longer campaigns, round to nearest month (minimum 1)
    return Math.max(1, Math.round(diffDays / 30));
  };

  // Calculate campaign duration in weeks
  const getDurationWeeks = () => {
    // Use stored duration if available
    if (campaignData?.timeline?.durationWeeks !== undefined) {
      return campaignData.timeline.durationWeeks;
    }
    
    // Fallback: calculate from dates
    const startDate = campaignData?.timeline?.startDate ? new Date(campaignData.timeline.startDate) : null;
    const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
    if (!startDate || !endDate) return undefined;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.ceil(diffDays / 7);
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
        icon: <DollarSign className="h-3.5 w-3.5 text-green-600" />
      });
    }
    
    // Channel-specific UNIT OF DELIVERY (primary trafficking info)
    if (channel === 'website') {
      const itemPath = item.itemPath || item.sourcePath;
      const storedGoal = order?.deliveryGoals?.[itemPath];
      if (storedGoal && storedGoal.goalValue > 0) {
        expectations.push({
          label: 'Deliver',
          value: `${formatNumber(storedGoal.goalValue)} impressions`,
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
      // Newsletter friendly name
      if (item.sourceName) {
        expectations.push({
          label: 'Newsletter',
          value: item.sourceName,
          icon: <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        });
      }
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
      const itemPath = item.itemPath || item.sourcePath;
      const streamGoal = order?.deliveryGoals?.[itemPath];
      if (streamGoal && streamGoal.goalValue > 0) {
        expectations.push({
          label: 'Deliver',
          value: `${formatNumber(streamGoal.goalValue)} views`,
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
                <p className="font-semibold text-green-600">${inventoryItems.reduce((sum: number, item: any) => sum + (item.itemPricing?.totalCost || item.itemPricing?.hubPrice || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">
                  {campaignData?.timeline?.startDate && campaignData?.timeline?.endDate 
                    ? `${new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(campaignData.timeline.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Dates TBD'}
                </p>
              </div>
              <OrderStatusBadge status={order.status as OrderStatus} />
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
        <TabsContent value="overview" className="mt-0">
          {(() => {
            // Calculate publication total in real-time from inventory items (more reliable)
            const publicationTotal = inventoryItems.reduce((sum: number, item: any) => {
              return sum + (item.itemPricing?.totalCost || item.itemPricing?.hubPrice || 0);
            }, 0);
            
            // Calculate channel breakdown
            const channelBreakdown: Record<string, { total: number; count: number }> = {};
            inventoryItems.forEach((item: any) => {
              const channel = item.channel || 'other';
              if (!channelBreakdown[channel]) {
                channelBreakdown[channel] = { total: 0, count: 0 };
              }
              const itemTotal = item.itemPricing?.totalCost || item.itemPricing?.hubPrice || 0;
              channelBreakdown[channel].total += itemTotal;
              channelBreakdown[channel].count += 1;
            });
            
            const startDate = campaignData?.timeline?.startDate ? new Date(campaignData.timeline.startDate) : null;
            const endDate = campaignData?.timeline?.endDate ? new Date(campaignData.timeline.endDate) : null;
            const durationWeeks = campaignData?.timeline?.durationWeeks;
            
            // Check if there's a pending action
            const hasPendingAction = pendingCount > 0;
            const liveWithoutPerf = inventoryItems.filter((item: any, idx: number) => {
              const itemPath = item.itemPath || item.sourcePath || `placement-${idx}`;
              const status = placementStatuses[itemPath];
              const config = getChannelConfig(item.channel);
              return !config.isDigital && ['in_production', 'delivered'].includes(status) && 
                !performanceEntries.some(e => e.itemPath === itemPath);
            });
            
            return (
              <div className="space-y-6">
                {/* Earnings Overview Card */}
                <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-green-50 overflow-hidden">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Potential Earnings</p>
                        <p className="text-3xl font-bold text-emerald-700">
                          ${publicationTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-600">
                          {inventoryItems.length} placement{inventoryItems.length !== 1 ? 's' : ''}
                        </p>
                        {Object.keys(channelBreakdown).length > 1 && (
                          <p className="text-xs text-emerald-600/80">
                            across {Object.keys(channelBreakdown).length} channels
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Earnings Progress Section */}
                    {orderEarnings && (
                      <div className="mt-4 pt-4 border-t border-emerald-200/50 space-y-3">
                        {/* Delivery Progress */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-emerald-700 font-medium">Delivery Progress</span>
                            <span className="text-emerald-600">{orderEarnings.deliveryPercent}%</span>
                          </div>
                          <div className="h-2 bg-emerald-200/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${orderEarnings.deliveryPercent}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Actual Earnings */}
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <div>
                            <p className="text-xs text-emerald-600 mb-0.5">Earned</p>
                            <p className="text-lg font-semibold text-emerald-700">
                              ${orderEarnings.actualTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-emerald-600 mb-0.5">Paid</p>
                            <p className="text-lg font-semibold text-emerald-700">
                              ${orderEarnings.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-emerald-600 mb-0.5">Status</p>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                orderEarnings.paymentStatus === 'paid' && "bg-green-100 text-green-700 border-green-300",
                                orderEarnings.paymentStatus === 'partially_paid' && "bg-amber-100 text-amber-700 border-amber-300",
                                orderEarnings.paymentStatus === 'pending' && "bg-slate-100 text-slate-600 border-slate-300"
                              )}
                            >
                              {orderEarnings.paymentStatus === 'partially_paid' ? 'Partial' : 
                               orderEarnings.paymentStatus.charAt(0).toUpperCase() + orderEarnings.paymentStatus.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Payment Progress Bar */}
                        {orderEarnings.actualTotal > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
                              <span>Payment Progress</span>
                              <span>{Math.round((orderEarnings.amountPaid / orderEarnings.actualTotal) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-emerald-200/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (orderEarnings.amountPaid / orderEarnings.actualTotal) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Banner - Only shows when there's something to do */}
                {hasPendingAction && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Review {pendingCount} Placement{pendingCount !== 1 ? 's' : ''}</p>
                        <p className="text-sm text-blue-700">Accept or reject to confirm this order</p>
                      </div>
                    </div>
                    <Button onClick={() => setActiveTab('placements')} className="bg-blue-600 hover:bg-blue-700">
                      Review Now
                    </Button>
                  </div>
                )}

                {!hasPendingAction && liveWithoutPerf.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Report Your Results</p>
                        <p className="text-sm text-purple-700">{liveWithoutPerf.length} placement{liveWithoutPerf.length !== 1 ? 's' : ''} need performance data</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('performance')} className="border-purple-300 text-purple-700 hover:bg-purple-100">
                      Report Results
                    </Button>
                  </div>
                )}


                {/* Terms & Conditions - Legal Style */}
                <div className="rounded-lg border-2 border-slate-300 bg-gradient-to-b from-slate-50 to-white overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-slate-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white tracking-wide">TERMS & CONDITIONS</h3>
                        <p className="text-xs text-slate-400">Advertising Insertion Order Agreement</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Order #{order._id?.toString().slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  
                  {/* Terms Content */}
                  <div className="p-5">
                    {hubTerms?.standardTerms ? (
                      <div className="space-y-4">
                        {/* Terms List */}
                        <div className="space-y-2 text-sm">
                          {hubTerms.standardTerms.paymentTerms && (
                            <p>
                              <span className="font-semibold text-slate-800">Payment Terms:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.paymentTerms}</span>
                            </p>
                          )}
                          {hubTerms.standardTerms.materialDeadline && (
                            <p>
                              <span className="font-semibold text-slate-800">Material Deadline:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.materialDeadline}</span>
                            </p>
                          )}
                          {hubTerms.standardTerms.leadTime && (
                            <p>
                              <span className="font-semibold text-slate-800">Lead Time Required:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.leadTime}</span>
                            </p>
                          )}
                          {hubTerms.standardTerms.cancellationPolicy && (
                            <p>
                              <span className="font-semibold text-slate-800">Cancellation Policy:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.cancellationPolicy}</span>
                            </p>
                          )}
                          {hubTerms.standardTerms.modificationPolicy && (
                            <p>
                              <span className="font-semibold text-slate-800">Modification Policy:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.modificationPolicy}</span>
                            </p>
                          )}
                          {hubTerms.standardTerms.agencyCommission && (
                            <p>
                              <span className="font-semibold text-slate-800">Agency Commission:</span>
                              <span className="text-slate-600 ml-1">{hubTerms.standardTerms.agencyCommission}</span>
                            </p>
                          )}
                        </div>

                        {/* Additional Terms */}
                        {hubTerms.customTerms && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Additional Terms</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{hubTerms.customTerms}</p>
                          </div>
                        )}

                        {/* Legal Disclaimer */}
                        {hubTerms.legalDisclaimer && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap">{hubTerms.legalDisclaimer}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold text-slate-800">Payment Terms:</span>
                          <span className="text-slate-600 ml-1">Net 30 days from invoice date</span>
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Material Deadline:</span>
                          <span className="text-slate-600 ml-1">5 business days before campaign start</span>
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Cancellation & Modifications:</span>
                          <span className="text-slate-600 ml-1">Contact hub for policies</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-slate-100 px-5 py-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 text-center">
                      By accepting placements in this order, you agree to these terms and conditions.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* PLACEMENTS TAB (organized by channel type) */}
        <TabsContent value="placements" className="mt-0 space-y-4">
          {/* Filter scripts to only count those for accepted/in_production/delivered placements */}
          {(() => {
            const acceptedStatuses = ['accepted', 'in_production', 'delivered', 'suspended'];
            const visibleScripts = trackingScripts.filter(s => {
              const scriptItemPath = s.itemPath || '';
              const baseItemPath = scriptItemPath.replace(/_dim\d+$/, '');
              const status = placementStatuses[scriptItemPath] || placementStatuses[baseItemPath] || 'pending';
              return acceptedStatuses.includes(status);
            });
            const hasAnyScripts = trackingScripts.length > 0;
            const hasVisibleScripts = visibleScripts.length > 0;

            return (
              <>
                {/* Info banner when no scripts at all - explain auto-generation */}
                {!hasAnyScripts && (
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
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Scripts exist but none are for accepted placements */}
                {hasAnyScripts && !hasVisibleScripts && (
                  <Card className="border bg-white shadow-none">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lock className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium">Tracking Scripts Available After Acceptance</p>
                            <p className="text-sm text-muted-foreground">Accept placements below to access tracking scripts and implementation tags</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions for Digital - when accepted scripts exist */}
                {hasVisibleScripts && (
                  <Card className="border bg-white shadow-none">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Code className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{visibleScripts.length} Tracking Script{visibleScripts.length !== 1 ? 's' : ''} Ready</p>
                            <p className="text-sm text-muted-foreground">Copy the code below and paste into your ad server</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleDownloadAllScripts} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download All Creative
                          </Button>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => visibleScripts.length > 0 && handleTestScript(visibleScripts[0])}
                                  disabled={visibleScripts.length === 0}
                                >
                                  <Target className="h-4 w-4 mr-2" />
                                  Test Tags
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

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

            // Channel color configurations for visual distinction
            const channelColors: Record<string, { border: string; bg: string; iconBg: string; iconColor: string; badge: string }> = {
              website: { border: 'border-l-blue-500', bg: 'bg-blue-50/30', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
              newsletter: { border: 'border-l-indigo-500', bg: 'bg-indigo-50/30', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
              print: { border: 'border-l-purple-500', bg: 'bg-purple-50/30', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
              radio: { border: 'border-l-orange-500', bg: 'bg-orange-50/30', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
              podcast: { border: 'border-l-pink-500', bg: 'bg-pink-50/30', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', badge: 'bg-pink-100 text-pink-700' },
              streaming: { border: 'border-l-cyan-500', bg: 'bg-cyan-50/30', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
              other: { border: 'border-l-border', bg: 'bg-muted/30', iconBg: 'bg-muted', iconColor: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
            };

            return sortedChannels.map(channel => {
              const items = channelGroups[channel];
              const config = getChannelConfig(channel);
              const isDigital = config.isDigital;
              const colors = channelColors[channel] || channelColors.other;
              
              // Count pending placements in this channel
              const pendingCount = items.filter((item: any) => {
                const itemPath = item.itemPath || item.sourcePath || `placement-${item._idx}`;
                return (placementStatuses[itemPath] || 'pending') === 'pending';
              }).length;

              return (
                <Card key={channel} className={cn("border-l-4 shadow-none overflow-hidden", colors.border)}>
                  <CardHeader className={cn("pb-2", colors.bg)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-sans flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors.iconBg)}>
                          {config.icon === 'globe' && <Globe className={cn("h-4 w-4", colors.iconColor)} />}
                          {config.icon === 'mail' && <Mail className={cn("h-4 w-4", colors.iconColor)} />}
                          {config.icon === 'newspaper' && <Newspaper className={cn("h-4 w-4", colors.iconColor)} />}
                          {config.icon === 'radio' && <Radio className={cn("h-4 w-4", colors.iconColor)} />}
                          {config.icon === 'headphones' && <Headphones className={cn("h-4 w-4", colors.iconColor)} />}
                          {config.icon === 'tv' && <Tv className={cn("h-4 w-4", colors.iconColor)} />}
                          {!['globe', 'mail', 'newspaper', 'radio', 'headphones', 'tv'].includes(config.icon || '') && <Layers className={cn("h-4 w-4", colors.iconColor)} />}
                        </div>
                        {config.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {/* Accept All button - only show when there are pending placements */}
                        {pendingCount > 0 && (
                          <Button
                            onClick={() => handleAcceptAllInChannel(items)}
                            disabled={updating}
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          >
                            {updating ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Accept All {config.label} ({pendingCount})
                          </Button>
                        )}
                        <Badge className={cn("font-medium", colors.badge)}>{items.length} placement{items.length !== 1 ? 's' : ''}</Badge>
                      </div>
                    </div>
                    
                    {/* Implementation Instructions */}
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border text-sm">
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
                      
                      // Filter scripts for this placement - match by itemPath or _dim suffix variants
                      // Scripts have itemPath like "basePath_dim0", "basePath_dim2" while placement has "basePath"
                      const scripts = isDigital ? trackingScripts.filter(s => 
                        s.itemPath === itemPath || 
                        (s.itemPath && s.itemPath.startsWith(itemPath + '_dim'))
                      ) : [];
                      // Show assets for ALL placements (digital and non-digital)
                      // Assets may have placementId with _dim suffix variants
                      const placementAssets = freshAssets
                        .filter(fa => (fa.placementId === itemPath || (fa.placementId && fa.placementId.startsWith(itemPath + '_dim'))) && fa.hasAsset && fa.asset)
                        .map(fa => ({ ...fa.asset!, dimensions: fa.dimensions }));

                      // Get delivery expectations for this placement
                      const deliveryExpectations = getDeliveryExpectations(item);

                      return (
                        <AccordionItem 
                          key={itemPath} 
                          value={itemPath}
                          className={cn(
                            "border rounded-lg overflow-hidden bg-white",
                            placementStatus === 'rejected' && "border-red-300 bg-red-50/50"
                          )}
                        >
                          {/* Header Row - Trigger + Actions */}
                          <div className="flex items-center">
                            {/* Collapsed Header - shows key info at a glance */}
                            <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]>svg]:rotate-90">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                  <span className="font-serif font-semibold text-slate-800">{item.itemName || item.sourceName}</span>
                                  {(() => {
                                    const dims = parseDimensions(item.format?.dimensions || item.format?.size);
                                    return dims.length > 0 && dims[0] ? (
                                      <Badge variant="outline" className="text-xs font-mono bg-slate-100">
                                        {dims[0]}
                                        {dims.length > 1 && ` +${dims.length - 1}`}
                                      </Badge>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            {/* Quick Actions - Always Visible */}
                            <div className="flex items-center gap-2 px-3 border-l">
                              {placementStatus === 'pending' && (
                                <>
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); handlePlacementAction(itemPath, 'accepted'); }}
                                    disabled={updating}
                                    size="sm"
                                    className="h-8 bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                                  </Button>
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); setRejectingPlacementId(itemPath); setRejectDialogOpen(true); }}
                                    disabled={updating}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              {placementStatus === 'accepted' && (
                                <span className="text-xs text-green-700 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" /> Accepted
                                </span>
                              )}
                              {placementStatus === 'in_production' && (
                                <span className="text-xs text-blue-700 flex items-center gap-1">
                                  <PlayCircle className="h-4 w-4" /> Live
                                </span>
                              )}
                              {placementStatus === 'delivered' && (
                                <span className="text-xs text-purple-700 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" /> Delivered
                                </span>
                              )}
                              {placementStatus === 'rejected' && (
                                <span className="text-xs text-red-700 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" /> Rejected
                                </span>
                              )}
                              {placementStatus === 'suspended' && (
                                <span className="text-xs text-orange-700 flex items-center gap-1">
                                  <PauseCircle className="h-4 w-4" /> Suspended
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Delivery Expectations - Always Visible */}
                          {deliveryExpectations.length > 0 && (
                            <div className="px-4 py-2 border-t bg-muted/50">
                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                {deliveryExpectations.map((exp, i) => (
                                  <div 
                                    key={i} 
                                    className={cn(
                                      "flex items-center gap-1.5",
                                      exp.highlight && "bg-blue-100 border border-blue-300 rounded-md px-3 py-1.5 shadow-sm"
                                    )}
                                  >
                                    {exp.icon}
                                    <span className={cn(
                                      exp.highlight ? "text-blue-700 font-semibold" : "text-slate-500"
                                    )}>{exp.label}:</span>
                                    <span className={cn(
                                      "font-medium",
                                      exp.label === 'Earn' ? "text-green-700" : 
                                      exp.highlight ? "text-blue-900 font-bold text-sm" : "text-slate-700"
                                    )}>
                                      {exp.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <AccordionContent>

                            <div className="p-3 space-y-3">
                            
                            {/* Website: Note about grouped impressions */}
                            {channel === 'website' && scripts.length > 1 && ['accepted', 'in_production', 'delivered', 'suspended'].includes(placementStatus) && (
                              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                                <strong>Note:</strong> Distribute impressions across sizes as needed. Use the scripts below to traffic each ad size.
                              </p>
                            )}

                            {/* Digital: Show asset preview for pending placements (so publishers can see what they're accepting) */}
                            {isDigital && placementStatus === 'pending' && placementAssets.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Creative Preview:</p>
                                {placementAssets.map((asset: any) => (
                                  <CreativeAssetCard
                                    key={asset.assetId}
                                    asset={{ ...asset, uploadedAt: new Date(asset.uploadedAt) }}
                                    onPreview={(a) => window.open(a.fileUrl, '_blank')}
                                    showActions={true}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Digital: Gated message for pending placements with scripts */}
                            {isDigital && scripts.length > 0 && placementStatus === 'pending' && (
                              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <Lock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-amber-900">Tracking scripts available after acceptance</p>
                                  <p className="text-xs text-amber-700 mt-0.5">Accept this placement to access implementation tags and tracking code</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Digital: Show Scripts (for accepted/in_production/delivered/suspended) */}
                            {isDigital && scripts.length > 0 && ['accepted', 'in_production', 'delivered', 'suspended'].includes(placementStatus) && (
                              <Accordion type="single" collapsible className="space-y-1">
                                {scripts.map((script) => (
                                      <AccordionItem 
                                        key={script._id?.toString()} 
                                        value={script._id?.toString() || ''} 
                                        className="border rounded bg-muted/50"
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
                                                    Uses [timestamp] cache buster. Click tracking is handled by Broadstreet.
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

                                          {script.urls?.clickTracker && (
                                            <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-muted-foreground">
                                              <span>Destination:</span>
                                              <a href={script.urls.clickTracker} target="_blank" rel="noopener noreferrer" 
                                                 className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[250px]">
                                                {script.urls.clickTracker}
                                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                              </a>
                                            </div>
                                          )}
                                        </AccordionContent>
                                      </AccordionItem>
                                    ))}
                              </Accordion>
                            )}

                            {/* Digital: No scripts yet - show awaiting message */}
                            {isDigital && scripts.length === 0 && placementStatus !== 'rejected' && (
                              <div className="text-center py-3 text-muted-foreground text-sm bg-muted/50 rounded">
                                <Code className="h-5 w-5 mx-auto mb-1 opacity-50" />
                                Scripts will appear when assets are uploaded
                              </div>
                            )}

                            {/* Digital: Show asset preview for rejected placements (for reference) */}
                            {isDigital && placementStatus === 'rejected' && placementAssets.length > 0 && (
                              <div className="space-y-2 opacity-60">
                                <p className="text-xs font-medium text-muted-foreground">Creative Assets:</p>
                                {placementAssets.map((asset: any) => (
                                  <CreativeAssetCard
                                    key={asset.assetId}
                                    asset={{ ...asset, uploadedAt: new Date(asset.uploadedAt) }}
                                    onPreview={(a) => window.open(a.fileUrl, '_blank')}
                                    showActions={true}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Non-Digital: Show Assets */}
                            {!isDigital && placementAssets.length > 0 && (
                              <div className="space-y-2">
                                {placementAssets.map((asset: any) => (
                                  <CreativeAssetCard
                                    key={asset.assetId}
                                    asset={{ ...asset, uploadedAt: new Date(asset.uploadedAt) }}
                                    onDownload={(a) => a.assetId ? downloadCreativeAsset(a.assetId) : forceDownloadFile(a.fileUrl, a.fileName)}
                                    showActions={true}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Non-Digital: No assets yet - show awaiting message */}
                            {!isDigital && placementAssets.length === 0 && (
                              <div className="text-center py-3 text-muted-foreground text-sm bg-muted/50 rounded">
                                <Clock className="h-5 w-5 mx-auto mb-1 opacity-50" />
                                Awaiting creative assets from hub
                              </div>
                            )}

                            {/* Execution Instructions for non-digital */}
                            {!isDigital && (
                              <div className="p-2 bg-blue-50/50 rounded border border-blue-100 text-sm">
                                <span className="text-blue-700">{getExecutionInstructions(item, getDurationMonths(), getDurationWeeks())}</span>
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

                              {/* Accepted: Mark In Production - requires assets/scripts AND within campaign window */}
                              {placementStatus === 'accepted' && (() => {
                                const hasRequiredAsset = isDigital ? scripts.length > 0 : placementAssets.length > 0;
                                const missingText = isDigital ? 'Needs tracking script' : 'Needs creative asset';
                                
                                // Check campaign start date (allow 7-day grace period before start)
                                const campaignStart = campaignData?.timeline?.startDate 
                                  ? new Date(campaignData.timeline.startDate) : null;
                                const gracePeriodDays = 7;
                                const now = new Date();
                                const earliestAllowedDate = campaignStart 
                                  ? new Date(campaignStart.getTime() - (gracePeriodDays * 24 * 60 * 60 * 1000))
                                  : null;
                                const withinCampaignWindow = !earliestAllowedDate || now >= earliestAllowedDate;
                                
                                if (!hasRequiredAsset) {
                                  return (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                      <AlertCircle className="h-3.5 w-3.5" /> {missingText}
                                    </span>
                                  );
                                }
                                
                                if (!withinCampaignWindow && campaignStart) {
                                  const daysUntilStart = Math.ceil((earliestAllowedDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                                  return (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" /> Available in {daysUntilStart} days
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
                                  {/* Completion progress indicator - replaces manual Complete button */}
                                  {(() => {
                                    const config = getChannelConfig(item.channel);
                                    if (config.isDigital) {
                                      // Digital: show impressions progress or campaign end info
                                      const goal = item.performanceMetrics?.impressionsPerMonth || 0;
                                      const delivered = order.deliverySummary?.byChannel?.[item.channel?.toLowerCase()]?.delivered || 0;
                                      const percent = goal > 0 ? Math.min(100, Math.round((delivered / goal) * 100)) : 0;
                                      return (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Timer className="h-3 w-3" />
                                          {goal > 0 ? (
                                            <span>{percent}% of impressions</span>
                                          ) : (
                                            <span>Completes at campaign end</span>
                                          )}
                                        </span>
                                      );
                                    } else {
                                      // Offline: show proof count vs expected
                                      const expected = item.currentFrequency || item.quantity || 1;
                                      const proofCount = order.proofCount || 0;
                                      return (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <FileText className="h-3 w-3" />
                                          <span>{proofCount}/{expected} proofs</span>
                                        </span>
                                      );
                                    }
                                  })()}
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

                              {/* Suspended: Show suspension status with reason */}
                              {placementStatus === 'suspended' && (() => {
                                const detail = (order as any).suspensionDetails?.[itemPath];
                                return (
                                  <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs text-orange-700">
                                      <PauseCircle className="h-3.5 w-3.5" /> Suspended
                                    </span>
                                    {detail?.reason && (
                                      <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                                        <span className="font-medium">Reason:</span> {detail.reason}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
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

          {/* Order Status Actions - REMOVED: Status is now derived from placement statuses
              - Order becomes 'in_production' when any placement is in_production
              - Order becomes 'delivered' when all placements are delivered
              - Placements auto-complete via PlacementCompletionService based on inventory type */}
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="mt-0">
          {canShowPerformance ? (
            <div className="space-y-4">
              <PixelHealthAlert pixelHealth={order.deliverySummary?.pixelHealth} />
              <OrderPerformanceView
              orderId={order._id?.toString() || ''}
              campaignId={order.campaignId}
              publicationId={order.publicationId}
              publicationName={order.publicationName}
              placements={placementsForPerformance}
              deliveryGoals={order.deliveryGoals}
            />
            </div>
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
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { setRejectDialogOpen(open); if (!open) setRejectionReason(''); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Placement
            </DialogTitle>
            <DialogDescription>
              Select a reason or provide a custom explanation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  if (reason === 'Other (specify below)') {
                    setRejectionReason('');
                  } else {
                    setRejectionReason(reason);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border transition-colors',
                  rejectionReason === reason
                    ? 'bg-red-100 border-red-300 text-red-800 font-medium'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {reason}
              </button>
            ))}
          </div>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Provide additional details or a custom reason..."
            rows={3}
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

      {/* Proof Required Prompt Dialog - REMOVED: Manual completion is now automated
          Placements auto-complete based on inventory type:
          - Digital: When impressions goal met OR campaign ends
          - Offline: When all expected proofs are uploaded
          See PlacementCompletionService for auto-completion logic */}

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
              <div className="p-3 bg-muted/50 rounded-lg">
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
              {testingScript.urls?.clickTracker && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">Landing Page:</p>
                  <a 
                    href={testingScript.urls.clickTracker} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {testingScript.urls.clickTracker}
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
// Also handles arrays of dimensions
function parseDimensions(dimInput: string | string[] | undefined): string[] {
  if (!dimInput) return [];
  
  // If it's already an array, filter out empties and return
  if (Array.isArray(dimInput)) {
    return dimInput.map(d => String(d).trim()).filter(Boolean);
  }
  
  // Convert to string if not already
  const dimStr = String(dimInput);
  if (!dimStr) return [];
  
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
  return dimStr.trim() ? [dimStr.trim()] : [];
}

// PlacementStatusBadge is now imported from '../orders/PlacementStatusBadge'

// Helper function for execution instructions
// Uses campaign duration to provide accurate wording (e.g., "2 issues during campaign" vs "2 issues per month")
function getExecutionInstructions(item: any, durationMonths?: number, durationWeeks?: number): string {
  const pricingModel = item.itemPricing?.pricingModel;
  const freq = item.currentFrequency || item.quantity || 1;
  
  // Determine the right time period label based on campaign duration
  const isSubMonth = durationMonths !== undefined && durationMonths < 1;
  const periodLabel = isSubMonth 
    ? 'during campaign' 
    : durationMonths === 1 
      ? 'this month' 
      : 'per month';
  
  // For very short campaigns, show total count instead of rate
  const useTotal = isSubMonth || (durationWeeks !== undefined && durationWeeks <= 4);
  
  if (pricingModel === 'per_send') {
    return useTotal
      ? `Include in ${freq} newsletter${freq > 1 ? 's' : ''} total`
      : `Include in ${freq} newsletter${freq > 1 ? 's' : ''} ${periodLabel}`;
  }
  if (pricingModel === 'per_spot') {
    if (item.channel === 'radio') {
      return useTotal
        ? `Air ${freq} spot${freq > 1 ? 's' : ''} total`
        : `Air ${freq} spot${freq > 1 ? 's' : ''} ${periodLabel}`;
    }
    return useTotal
      ? `Run ${freq} time${freq > 1 ? 's' : ''} total`
      : `Run ${freq} time${freq > 1 ? 's' : ''} ${periodLabel}`;
  }
  if (pricingModel === 'per_ad' && item.channel === 'print') {
    return useTotal
      ? `Publish in ${freq} issue${freq > 1 ? 's' : ''} total`
      : `Publish in ${freq} issue${freq > 1 ? 's' : ''} ${periodLabel}`;
  }
  if (pricingModel === 'cpm' || pricingModel === 'cpv') {
    return `Display continuously on ${item.channel}`;
  }
  return useTotal
    ? `Run ${freq}× total as scheduled`
    : `Run ${freq}× ${periodLabel} as scheduled`;
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
  campaignStartDate?: Date | null;  // For validation
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
  campaignStartDate,
}: PlacementWorkflowProps) {
  // Check if within campaign window (7-day grace period before start)
  const gracePeriodDays = 7;
  const now = new Date();
  const earliestAllowedDate = campaignStartDate 
    ? new Date(campaignStartDate.getTime() - (gracePeriodDays * 24 * 60 * 60 * 1000))
    : null;
  const withinCampaignWindow = !earliestAllowedDate || now >= earliestAllowedDate;
  
  const isSuspended = placementStatus === 'suspended';

  // Determine if "Go Live" action should be available
  const hasRequiredAssets = isDigital ? hasScripts : hasAssets;
  const canGoLive = !isSuspended && placementStatus === 'accepted' && hasRequiredAssets && withinCampaignWindow;
  
  // For suspended placements, show historical progress but disable all actions
  const wasLive = isSuspended && (hasPerformanceEntry || hasProof);
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
      done: ['accepted', 'in_production', 'delivered', 'suspended'].includes(placementStatus),
      icon: Check,
    },
    {
      id: 'live',
      label: 'Go Live',
      done: ['in_production', 'delivered'].includes(placementStatus) || wasLive,
      icon: PlayCircle,
      action: canGoLive ? onMarkInProduction : undefined,
      actionLabel: 'Mark Live',
    },
    {
      id: 'report',
      label: 'Report Performance',
      done: hasPerformanceEntry,
      icon: BarChart3,
      action: !isSuspended && ['in_production', 'delivered'].includes(placementStatus) && !hasPerformanceEntry ? onReportPerformance : undefined,
      actionLabel: 'Report',
    },
    {
      id: 'proof',
      label: 'Upload Proof',
      done: hasProof,
      icon: FileText,
      action: !isSuspended && ['in_production', 'delivered'].includes(placementStatus) && !hasProof ? onReportPerformance : undefined,
      actionLabel: 'Upload',
    },
    {
      id: 'complete',
      label: isSuspended ? 'Suspended' : 'Complete',
      done: placementStatus === 'delivered',
      icon: isSuspended ? PauseCircle : CheckCircle2,
      action: !isSuspended && placementStatus === 'in_production' ? onMarkDelivered : undefined,
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
