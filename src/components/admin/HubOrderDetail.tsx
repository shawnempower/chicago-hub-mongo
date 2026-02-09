/**
 * Hub Order Detail
 * 
 * Admin view for a specific publication's order with messaging capability
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderMessaging } from '../orders/OrderMessaging';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { 
  FileText, 
  Loader2, 
  ExternalLink,
  Building2,
  Calendar,
  DollarSign,
  Package,
  BarChart3,
  ClipboardList,
  Code,
  Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { format } from 'date-fns';
import { OrderPerformanceView } from '../dashboard/OrderPerformanceView';
import { TrackingScriptGenerator } from './TrackingScriptGenerator';
import { formatDimensionsForDisplay } from '@/utils/dimensionValidation';

interface OrderDetailData {
  _id?: string;
  campaignId: string;
  campaignObjectId?: string;
  campaignName: string;
  hubId: string;
  publicationId: number;
  publicationName: string;
  generatedAt: Date;
  status: string;
  sentAt?: Date;
  confirmationDate?: Date;
  publicationNotes?: string;
  hubNotes?: string;
  messages?: Array<{
    id: string;
    content: string;
    sender: 'hub' | 'publication';
    senderName: string;
    senderId: string;
    timestamp: Date;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
    }>;
  }>;
  assetStatus?: {
    totalPlacements: number;
    placementsWithAssets: number;
    allAssetsReady: boolean;
  };
  placementStatuses?: Record<string, string>;
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    changedBy: string;
    notes?: string;
  }>;
  campaignData?: {
    selectedInventory?: any;
    timeline?: any;
    basicInfo?: any;
    pricing?: any;
  };
}

export function HubOrderDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaignId');
  const publicationId = searchParams.get('publicationId');

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [showRescindDialog, setShowRescindDialog] = useState(false);

  useEffect(() => {
    if (campaignId && publicationId) {
      fetchOrderDetail();
      fetchCreatives();
      markOrderAsViewed();
    }
  }, [campaignId, publicationId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch order');

      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Mark the order as viewed by hub user (clears unread indicator)
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
      // Silent fail - this is not critical
      console.debug('Error marking order as viewed:', error);
    }
  };

  const fetchCreatives = async () => {
    if (!campaignId) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/creative-assets?campaignId=${campaignId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCreatives(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching creatives:', error);
    }
  };

  const handleRescindOrder = async () => {
    if (!campaignId || !publicationId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${campaignId}/${publicationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rescind order');
      }
      
      const isDraft = order?.status === 'draft';
      toast({
        title: isDraft ? 'Order Removed' : 'Order Rescinded',
        description: isDraft
          ? `Draft order for ${order?.publicationName} has been removed.`
          : `Order for ${order?.publicationName} has been rescinded.`,
      });
      
      setShowRescindDialog(false);
      // Navigate back to orders list
      navigate('/hubcentral?tab=orders');
    } catch (error) {
      console.error('Error rescinding order:', error);
      const isDraftError = order?.status === 'draft';
      toast({
        title: isDraftError ? 'Remove Failed' : 'Rescind Failed',
        description: error instanceof Error ? error.message : `Failed to ${isDraftError ? 'remove' : 'rescind'} order. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  // Check if order has live placements
  const hasLivePlacements = () => {
    if (!order?.placementStatuses) return false;
    const statuses = Object.values(order.placementStatuses);
    return statuses.some(s => s === 'in_production' || s === 'delivered');
  };

  const handleSendMessage = async (content: string, attachments?: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize?: number }>) => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            attachments
          })
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Optimistically add the new message to local state (no full refresh)
      if (data.message && order) {
        setOrder({
          ...order,
          messages: [...(order.messages || []), data.message]
        });
      }

      toast({
        title: 'Message sent',
        description: 'Your message has been delivered to the publication'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const campaign = order.campaignData;
  // Use order.selectedInventory as source of truth (not campaign.selectedInventory which may be stale)
  const publication = order?.selectedInventory?.publications?.[0];

  // Calculate placement stats
  const placementStats = {
    total: publication?.inventoryItems?.length || 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    in_production: 0,
    delivered: 0
  };

  if (order.placementStatuses) {
    Object.values(order.placementStatuses).forEach((status: any) => {
      if (status === 'accepted') placementStats.accepted++;
      else if (status === 'rejected') placementStats.rejected++;
      else if (status === 'in_production') placementStats.in_production++;
      else if (status === 'delivered') placementStats.delivered++;
      else placementStats.pending++;
    });
  } else {
    placementStats.pending = placementStats.total;
  }

  // Helper to format numbers
  const formatNumber = (num: number) => num?.toLocaleString() || '0';

  // Helper to get campaign duration in months
  const getDurationMonths = () => {
    if (!campaign?.timeline?.startDate || !campaign?.timeline?.endDate) return 1;
    const start = new Date(campaign.timeline.startDate);
    const end = new Date(campaign.timeline.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 30));
  };

  // Helper to get delivery instructions for an inventory item
  const getDeliveryInstructions = (item: any): string[] => {
    if (!item) return [];
    
    const instructions: string[] = [];
    const ch = (item.channel || '').toLowerCase();
    const metrics = item.audienceMetrics || {};
    const perfMetrics = item.performanceMetrics || {};
    const frequency = item.currentFrequency || item.quantity || 1;
    const durationMonths = getDurationMonths();
    
    if (ch === 'website' || ch === 'display') {
      // Website: Impressions are the unit
      if (item.monthlyImpressions || perfMetrics.impressionsPerMonth) {
        const monthlyImpressions = item.monthlyImpressions || perfMetrics.impressionsPerMonth;
        const pricingModel = item.itemPricing?.pricingModel || 'flat';
        
        // For CPM/CPV/CPC, frequency is percentage share (25, 50, 75, 100)
        let actualMonthlyImpressions = monthlyImpressions;
        if (['cpm', 'cpv', 'cpc'].includes(pricingModel)) {
          actualMonthlyImpressions = Math.round(monthlyImpressions * (frequency / 100));
        }
        
        const totalImpressions = actualMonthlyImpressions * durationMonths;
        instructions.push(`Deliver: ${formatNumber(totalImpressions)} impressions`);
      }
      if (metrics.monthlyVisitors) {
        instructions.push(`Audience: ${formatNumber(metrics.monthlyVisitors)} visitors/mo`);
      }
    } else if (ch.includes('newsletter')) {
      // Newsletter: Sends are the unit
      instructions.push(`Sends: ${frequency} newsletter${frequency > 1 ? 's' : ''}`);
      if (metrics.subscribers) {
        instructions.push(`Subscribers: ${formatNumber(metrics.subscribers)}`);
      }
    } else if (ch === 'print') {
      // Print: Insertions are the unit
      instructions.push(`Insertions: ${frequency} issue${frequency > 1 ? 's' : ''}`);
      if (metrics.circulation) {
        instructions.push(`Circulation: ${formatNumber(metrics.circulation)}/issue`);
      }
    } else if (ch === 'radio') {
      // Radio: Spots are the unit
      instructions.push(`Spots: ${frequency} airing${frequency > 1 ? 's' : ''}`);
      if (metrics.listeners) {
        instructions.push(`Est. Listeners: ${formatNumber(metrics.listeners)}/spot`);
      }
    } else if (ch === 'podcast') {
      // Podcast: Episodes are the unit
      instructions.push(`Episodes: ${frequency} episode${frequency > 1 ? 's' : ''}`);
      if (metrics.listeners || perfMetrics.audienceSize) {
        instructions.push(`Downloads: ${formatNumber(metrics.listeners || perfMetrics.audienceSize)}/ep`);
      }
    } else if (ch === 'streaming') {
      // Streaming: Views are the unit
      if (item.monthlyImpressions || perfMetrics.impressionsPerMonth) {
        instructions.push(`Deliver: ${formatNumber(item.monthlyImpressions || perfMetrics.impressionsPerMonth)} views`);
      }
    } else if (ch === 'events') {
      // Events: Sponsorships
      instructions.push(`Event: ${frequency} sponsorship${frequency > 1 ? 's' : ''}`);
      if (metrics.expectedAttendees || metrics.averageAttendance) {
        instructions.push(`Attendance: ${formatNumber(metrics.expectedAttendees || metrics.averageAttendance)}`);
      }
    } else if (ch === 'social_media' || ch === 'social') {
      // Social: Posts are the unit
      instructions.push(`Posts: ${frequency} post${frequency > 1 ? 's' : ''}`);
      if (metrics.followers) {
        instructions.push(`Followers: ${formatNumber(metrics.followers)}`);
      }
    }
    
    return instructions;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs and Controls */}
      <div className="flex items-center justify-between">
        <Breadcrumb
          rootLabel="Orders"
          rootIcon={FileText}
          currentLabel={order.publicationName}
          onBackClick={() => navigate('/hubcentral?tab=orders')}
        />
        <div className="flex items-center gap-2">
          {!hasLivePlacements() && (
            <Button 
              variant="outline" 
              size="sm" 
              className={order.status === 'draft'
                ? "text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                : "text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"}
              onClick={() => setShowRescindDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {order.status === 'draft' ? 'Remove Order' : 'Rescind Order'}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/campaigns/${order.campaignId}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Campaign
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Order Details
          </TabsTrigger>
          <TabsTrigger
            value="trafficking"
            className="flex items-center gap-2"
          >
            <Code className="h-4 w-4" />
            Trafficking
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center gap-2"
            disabled={!['confirmed', 'in_production', 'delivered'].includes(order.status)}
          >
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg font-sans flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order For</p>
                  <p className="font-medium">{order.campaignName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <OrderStatusBadge status={order.status as any} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Publication</p>
                  <p className="font-medium">{order.publicationName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Generated</p>
                  <p className="font-medium">
                    {format(new Date(order.generatedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                {campaign?.timeline && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Campaign Start</p>
                      <p className="font-medium">
                        {format(new Date(campaign.timeline.startDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campaign End</p>
                      <p className="font-medium">
                        {format(new Date(campaign.timeline.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </>
                )}
                {publication?.inventoryItems && publication.inventoryItems.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Publication Total</p>
                    <p className="font-medium text-green-600">
                      ${publication.inventoryItems.reduce((sum: number, item: any) => sum + (item.itemPricing?.totalCost || item.itemPricing?.hubPrice || 0), 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Placement Status */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg font-sans flex items-center gap-2">
                <Package className="h-5 w-5" />
                Placement Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-700">{placementStats.pending}</p>
                  <p className="text-xs text-yellow-600">Pending</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{placementStats.accepted}</p>
                  <p className="text-xs text-green-600">Accepted</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{placementStats.in_production}</p>
                  <p className="text-xs text-blue-600">In Production</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-2xl font-bold text-purple-700">{placementStats.delivered}</p>
                  <p className="text-xs text-purple-600">Delivered</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{placementStats.rejected}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </div>

              {/* Asset Status */}
              {order.assetStatus && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Creative Assets</span>
                    <Badge variant={order.assetStatus.allAssetsReady ? 'default' : 'secondary'}>
                      {order.assetStatus.placementsWithAssets}/{order.assetStatus.totalPlacements} Ready
                    </Badge>
                  </div>
                </div>
              )}

              {/* Inventory Items */}
              {publication?.inventoryItems && publication.inventoryItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Placements</p>
                  {publication.inventoryItems.map((item: any, idx: number) => {
                    const placementId = item.itemPath || item.sourcePath || `placement-${idx}`;
                    const status = order.placementStatuses?.[placementId] || 'pending';
                    const deliveryInstructions = getDeliveryInstructions(item);
                    
                    return (
                      <div 
                        key={idx}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.itemName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.channel}
                              </Badge>
                              {item.format?.dimensions && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDimensionsForDisplay(item.format.dimensions)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={
                              status === 'delivered' ? 'bg-purple-50 text-purple-700 border border-purple-200 pointer-events-none' :
                              status === 'in_production' ? 'bg-blue-50 text-blue-700 border border-blue-200 pointer-events-none' :
                              status === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200 pointer-events-none' :
                              status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200 pointer-events-none' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-200 pointer-events-none'
                            }
                          >
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                          </Badge>
                        </div>
                        {/* Delivery Instructions */}
                        {deliveryInstructions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-dashed">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {deliveryInstructions.map((instruction, i) => (
                                <span key={i} className="whitespace-nowrap">
                                  {instruction}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Messaging */}
          <OrderMessaging
            publicationNotes={order.publicationNotes}
            hubNotes={order.hubNotes}
            messages={order.messages?.map(m => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))}
            userType="hub"
            readOnly={order.status === 'delivered'}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
        </TabsContent>

        <TabsContent value="trafficking" className="mt-0">
          {order._id ? (
            <TrackingScriptGenerator
              campaignId={order.campaignId}
              campaignName={order.campaignName}
              advertiserName={order.campaignData?.basicInfo?.advertiserName}
              publicationId={order.publicationId}
              publicationCode={publication?.publicationCode || `pub${order.publicationId}`}
              publicationName={order.publicationName}
              creatives={creatives.map((c: any) => ({
                _id: c._id,
                name: c.name,
                type: c.type,
                format: c.format,
                clickUrl: c.clickUrl,
                imageUrl: c.fileUrl || c.imageUrl,
                altText: c.altText,
                headline: c.headline,
                body: c.body,
                ctaText: c.ctaText
              }))}
              placements={publication?.inventoryItems?.filter((item: any) => 
                ['website', 'newsletter', 'streaming'].includes(item.channel)
              ).map((item: any, idx: number) => ({
                itemPath: item.itemPath || item.sourcePath || `placement-${idx}`,
                itemName: item.itemName,
                channel: item.channel,
                dimensions: item.format?.dimensions,
              })) || []}
              espCompatibility={publication?.espCompatibility || 'full'}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Loading order details...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          {order._id && ['confirmed', 'in_production', 'delivered'].includes(order.status) ? (
            <OrderPerformanceView
              orderId={order._id}
              campaignId={order.campaignId}
              publicationId={order.publicationId}
              publicationName={order.publicationName}
              placements={publication?.inventoryItems?.map((item: any, idx: number) => ({
                itemPath: item.itemPath || item.sourcePath || `placement-${idx}`,
                itemName: item.itemName,
                channel: item.channel,
                dimensions: item.format?.dimensions,
              })) || []}
              isHubView={true}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Performance tracking is available once the order is confirmed.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rescind/Remove Order Confirmation Dialog */}
      <AlertDialog open={showRescindDialog} onOpenChange={setShowRescindDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {order?.status === 'draft' ? 'Remove Draft Order?' : 'Rescind Publication Order?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {order?.status === 'draft' ? (
                <>
                  <p>This will remove the draft order for <strong>{order?.publicationName}</strong> from campaign <strong>{order?.campaignName}</strong>.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    The publication has not seen this order yet, so no notification will be sent.
                  </p>
                </>
              ) : (
                <>
                  <p>This will remove the insertion order for <strong>{order?.publicationName}</strong> from campaign <strong>{order?.campaignName}</strong>.</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>The publication will no longer see this order</li>
                    <li>Any confirmations or status updates will be lost</li>
                    <li>Messages with this publication will be removed</li>
                  </ul>
                  <p className="text-amber-600 font-medium mt-3">This cannot be undone.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRescindOrder}
              className={order?.status === 'draft' 
                ? "bg-gray-600 hover:bg-gray-700" 
                : "bg-red-600 hover:bg-red-700"}
            >
              {order?.status === 'draft' ? 'Yes, Remove Order' : 'Yes, Rescind Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
