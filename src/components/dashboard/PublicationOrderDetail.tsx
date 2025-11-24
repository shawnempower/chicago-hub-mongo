import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { OrderTimeline } from '../orders/OrderTimeline';
import { CreativeAssetCard } from '../orders/CreativeAssetCard';
import { AdSpecsForm } from '../orders/AdSpecsForm';
import { OrderMessaging } from '../orders/OrderMessaging';
import { ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PublicationInsertionOrder, AdSpecification } from '@/integrations/mongodb/campaignSchema';

interface OrderDetailData extends PublicationInsertionOrder {
  campaignId: string;
  campaignName: string;
}

export function PublicationOrderDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaignId');
  const publicationId = searchParams.get('publicationId');

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (campaignId && publicationId) {
      fetchOrderDetail();
    }
  }, [campaignId, publicationId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}`,
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

  const handleConfirm = async () => {
    if (!order) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: 'Order confirmed by publication'
          })
        }
      );

      if (!response.ok) throw new Error('Failed to confirm order');

      toast({
        title: 'Success',
        description: 'Order confirmed successfully'
      });

      fetchOrderDetail();
    } catch (error) {
      console.error('Error confirming order:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm order',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus, notes?: string) => {
    if (!order) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus, notes })
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: 'Success',
        description: 'Status updated successfully'
      });

      fetchOrderDetail();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveAdSpecs = async (specs: AdSpecification) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}/ad-specs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ specifications: [specs] })
        }
      );

      if (!response.ok) throw new Error('Failed to save specifications');

      toast({
        title: 'Success',
        description: 'Ad specifications saved'
      });

      fetchOrderDetail();
    } catch (error) {
      console.error('Error saving ad specs:', error);
      toast({
        title: 'Error',
        description: 'Failed to save ad specifications',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard?tab=orders')}
            className="mt-4"
          >
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canConfirm = order.status === 'sent';
  const canMarkInProduction = order.status === 'confirmed';
  const canMarkDelivered = order.status === 'in_production';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard?tab=orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{order.campaignName}</h2>
            <p className="text-muted-foreground">{order.publicationName}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {/* Action Buttons */}
      {(canConfirm || canMarkInProduction || canMarkDelivered) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              {canConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={updating}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Order
                </Button>
              )}
              {canMarkInProduction && (
                <Button
                  onClick={() => handleUpdateStatus('in_production')}
                  disabled={updating}
                  variant="outline"
                  className="flex-1"
                >
                  Mark In Production
                </Button>
              )}
              {canMarkDelivered && (
                <Button
                  onClick={() => handleUpdateStatus('delivered')}
                  disabled={updating}
                  variant="outline"
                  className="flex-1"
                >
                  Mark as Delivered
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Insertion Order Content */}
          <Card>
            <CardHeader>
              <CardTitle>Insertion Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {order.content ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: order.content }}
                  className="prose max-w-none"
                />
              ) : (
                <p className="text-muted-foreground">
                  Insertion order content will be displayed here
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creative Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Creative Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {order.creativeAssets && order.creativeAssets.length > 0 ? (
                <div className="space-y-4">
                  {order.creativeAssets.map((asset) => (
                    <CreativeAssetCard
                      key={asset.assetId}
                      asset={{
                        ...asset,
                        uploadedAt: new Date(asset.uploadedAt)
                      }}
                      onDownload={(asset) => {
                        window.open(asset.fileUrl, '_blank');
                      }}
                      showActions={true}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No creative assets uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ad Specifications */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ad Specifications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide your ad specifications for each placement
            </p>
            {/* In a real implementation, we'd map over the inventory items */}
            <AdSpecsForm
              placementId="example-1"
              placementName="Newsletter Banner"
              channel="newsletter"
              onSave={handleSaveAdSpecs}
              readOnly={order.status === 'delivered'}
            />
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline
                currentStatus={order.status as OrderStatus}
                statusHistory={order.statusHistory?.map(h => ({
                  ...h,
                  timestamp: new Date(h.timestamp)
                }))}
              />
            </CardContent>
          </Card>

          {/* Communication */}
          <OrderMessaging
            publicationNotes={order.publicationNotes}
            hubNotes={order.hubNotes}
            userType="publication"
            readOnly={order.status === 'delivered'}
          />
        </div>
      </div>
    </div>
  );
}

