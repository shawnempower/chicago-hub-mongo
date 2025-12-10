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
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderTimeline } from '../orders/OrderTimeline';
import { OrderMessaging } from '../orders/OrderMessaging';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  Loader2, 
  ExternalLink,
  Building2,
  Calendar,
  DollarSign,
  Package,
  BarChart3,
  ClipboardList,
  Code
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { format } from 'date-fns';
import { OrderPerformanceView } from '../dashboard/OrderPerformanceView';
import { TrackingScriptGenerator } from './TrackingScriptGenerator';

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

  useEffect(() => {
    if (campaignId && publicationId) {
      fetchOrderDetail();
      fetchCreatives();
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

  const handleViewPrint = () => {
    window.open(`${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/print`, '_blank');
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
  const publication = campaign?.selectedInventory?.publications?.find(
    (p: any) => p.publicationId === order.publicationId
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold font-sans">{order.publicationName}</h1>
            <p className="text-sm text-muted-foreground">
              Order for: {order.campaignName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status as any} />
          <Button variant="outline" size="sm" onClick={handleViewPrint}>
            <FileText className="h-4 w-4 mr-2" />
            View Printable
          </Button>
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
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
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

        <TabsContent value="details" className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                {publication?.publicationTotal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Publication Total</p>
                    <p className="font-medium text-green-600">
                      ${publication.publicationTotal.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Placement Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
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
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
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
                    
                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.itemName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.channel}
                            </Badge>
                            {item.format?.dimensions && (
                              <span className="text-xs text-muted-foreground">
                                {item.format.dimensions}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          className={
                            status === 'delivered' ? 'bg-purple-600' :
                            status === 'in_production' ? 'bg-blue-600' :
                            status === 'accepted' ? 'bg-green-600' :
                            status === 'rejected' ? 'bg-red-600' :
                            'bg-yellow-600'
                          }
                        >
                          {status.replace('_', ' ')}
                        </Badge>
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
          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline
                currentStatus={order.status as any}
                statusHistory={order.statusHistory?.map(h => ({
                  ...h,
                  timestamp: new Date(h.timestamp)
                }))}
              />
            </CardContent>
          </Card>

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

        <TabsContent value="trafficking" className="mt-6">
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

        <TabsContent value="performance" className="mt-6">
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
    </div>
  );
}
