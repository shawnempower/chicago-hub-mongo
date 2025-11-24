import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { OrderTimeline } from '../orders/OrderTimeline';
import { CreativeAssetCard } from '../orders/CreativeAssetCard';
import { AdSpecsForm } from '../orders/AdSpecsForm';
import { OrderMessaging } from '../orders/OrderMessaging';
import { ArrowLeft, Check, X, AlertCircle, FileText } from 'lucide-react';
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
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch order');

      const data = await response.json();
      console.log('Fetched order data:', data.order);
      console.log('Campaign data present:', !!data.order?.campaignData);
      console.log('Campaign data details:', data.order?.campaignData);
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
      const token = localStorage.getItem('auth_token');

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
      const token = localStorage.getItem('auth_token');

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
      const token = localStorage.getItem('auth_token');

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

  const handleSendMessage = async (message: string, type: 'hub' | 'publication') => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `/api/publication-orders/${campaignId}/${publicationId}/notes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: message,
            noteType: type
          })
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      toast({
        title: 'Success',
        description: 'Message sent successfully'
      });

      fetchOrderDetail();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      throw error; // Re-throw so component can handle the error state
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Insertion Order Details</CardTitle>
              {order.content && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const blob = new Blob([order.content], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setTimeout(() => URL.revokeObjectURL(url), 100);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Printable
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const campaignData = (order as any).campaignData;
                
                if (!campaignData) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Order details will be available once the campaign is fully configured.
                    </p>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Campaign Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-primary">Campaign Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Campaign:</span>
                          <p className="font-medium">{order.campaignName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Publication:</span>
                          <p className="font-medium">{order.publicationName}</p>
                        </div>
                        {campaignData.timeline && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Start Date:</span>
                              <p className="font-medium">
                                {new Date(campaignData.timeline.startDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End Date:</span>
                              <p className="font-medium">
                                {new Date(campaignData.timeline.endDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <p className="font-medium">
                                {campaignData.timeline.durationWeeks} weeks ({campaignData.timeline.durationMonths} months)
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-muted-foreground">Generated:</span>
                          <p className="font-medium">
                            {new Date(order.generatedAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Objectives */}
                    {campaignData.objectives && (
                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-lg mb-3 text-primary">Campaign Objectives</h3>
                        <div className="space-y-2 text-sm">
                          {campaignData.objectives.primaryGoal && (
                            <div>
                              <span className="text-muted-foreground">Primary Goal:</span>
                              <p className="font-medium capitalize">{campaignData.objectives.primaryGoal.replace(/_/g, ' ')}</p>
                            </div>
                          )}
                          {campaignData.objectives.targetAudience && (
                            <div>
                              <span className="text-muted-foreground">Target Audience:</span>
                              <p>{campaignData.objectives.targetAudience}</p>
                            </div>
                          )}
                          {campaignData.objectives.keyMessage && (
                            <div>
                              <span className="text-muted-foreground">Key Message:</span>
                              <p>{campaignData.objectives.keyMessage}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inventory Items for this Publication */}
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-lg mb-3 text-primary">Selected Ad Placements</h3>
                      {(() => {
                        const publication = campaignData.selectedInventory?.publications?.find(
                          (pub: any) => pub.publicationId === order.publicationId
                        );
                        const inventoryItems = publication?.inventoryItems || [];

                        if (inventoryItems.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground">No inventory items selected for this publication.</p>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {inventoryItems.map((item: any, index: number) => (
                              <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base">
                                      {item.itemName || item.sourceName || 'Ad Placement'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {item.channel} {item.sourceName ? `• ${item.sourceName}` : ''}
                                    </p>
                                  </div>
                                  {item.campaignCost && (
                                    <div className="text-right">
                                      <p className="font-semibold text-lg">${item.campaignCost.toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground">Campaign Total</p>
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                                  {item.quantity && (
                                    <div>
                                      <span className="text-muted-foreground">Quantity:</span>
                                      <p className="font-medium">{item.quantity}</p>
                                    </div>
                                  )}
                                  {item.duration && (
                                    <div>
                                      <span className="text-muted-foreground">Duration:</span>
                                      <p className="font-medium">{item.duration}</p>
                                    </div>
                                  )}
                                  {item.frequency && (
                                    <div>
                                      <span className="text-muted-foreground">Frequency:</span>
                                      <p className="font-medium capitalize">{item.frequency}</p>
                                    </div>
                                  )}
                                </div>
                                {item.specifications && Object.keys(item.specifications).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-muted-foreground mb-1">Specifications:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(item.specifications).map(([key, value]) => (
                                        <span key={key} className="text-xs bg-white px-2 py-1 rounded border">
                                          {key}: {String(value)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {publication?.publicationTotal && (
                              <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                                <span className="font-semibold text-lg">Total for {order.publicationName}:</span>
                                <span className="font-bold text-2xl text-primary">
                                  ${publication.publicationTotal.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
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
            {/* Get inventory items from order */}
            {(() => {
              // Try to get inventory items from the order
              // The order may have been generated with actual inventory selection
              const campaignData = (order as any).campaignData;
              
              // Debug logging
              console.log('Order publicationId:', order.publicationId);
              console.log('Campaign data:', campaignData);
              console.log('Selected inventory:', campaignData?.selectedInventory);
              console.log('Publications:', campaignData?.selectedInventory?.publications);
              
              const inventoryItems = campaignData?.selectedInventory?.publications?.find(
                (pub: any) => pub.publicationId === order.publicationId
              )?.inventoryItems || [];
              
              console.log('Found inventory items:', inventoryItems);
              
              if (inventoryItems.length === 0) {
                return (
                  <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-muted-foreground">
                      No inventory items found for this order. Ad specifications will be available once the campaign is fully configured.
                    </p>
                    {campaignData && (
                      <p className="text-xs text-gray-500 mt-2">
                        Debug: Campaign has {campaignData.selectedInventory?.publications?.length || 0} publications
                      </p>
                    )}
                  </div>
                );
              }
              
              return (
                <div className="space-y-6">
                  {inventoryItems.map((item: any, index: number) => {
                    // Use itemPath as unique ID, fallback to index
                    const placementId = item.itemPath || `item-${index}`;
                    
                    // Find existing spec for this item
                    const existingSpec = order.adSpecifications?.find(
                      spec => spec.placementId === placementId
                    );
                    
                    return (
                      <AdSpecsForm
                        key={placementId}
                        placementId={placementId}
                        placementName={item.itemName || item.sourceName || `${item.channel} Placement`}
                        channel={item.channel || 'general'}
                        existingSpecs={existingSpec}
                        onSave={handleSaveAdSpecs}
                        readOnly={order.status === 'delivered'}
                      />
                    );
                  })}
                </div>
              );
            })()}
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
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}

