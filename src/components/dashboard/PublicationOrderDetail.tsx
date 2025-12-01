import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { OrderTimeline } from '../orders/OrderTimeline';
import { CreativeAssetCard } from '../orders/CreativeAssetCard';
import { AdSpecsForm } from '../orders/AdSpecsForm';
import { OrderMessaging } from '../orders/OrderMessaging';
import { ArrowLeft, Check, X, AlertCircle, FileText, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { PublicationInsertionOrder, AdSpecification } from '@/integrations/mongodb/campaignSchema';
import { API_BASE_URL } from '@/config/api';

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
  const [placementStatuses, setPlacementStatuses] = useState<Record<string, 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered'>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPlacementId, setRejectingPlacementId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch order');

      const data = await response.json();
      console.log('Fetched order data:', { 
        placementStatuses: data.order?.placementStatuses,
        publicationId: data.order?.publicationId 
      });
      
      setOrder(data.order);
      
      // Initialize placement statuses from order data or create default 'pending' for all
      if (data.order?.placementStatuses) {
        console.log('Setting placement statuses from order:', data.order.placementStatuses);
        setPlacementStatuses(data.order.placementStatuses);
      } else {
        // Initialize all placements as pending if no statuses exist yet
        console.log('No placement statuses in order, initializing as pending');
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
          console.log('Initialized placement statuses:', initialStatuses);
          setPlacementStatuses(initialStatuses);
        }
      }
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


  const handleUpdateStatus = async (newStatus: OrderStatus, notes?: string) => {
    if (!order) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/status`,
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
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/ad-specs`,
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
        `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/notes`,
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

  const handlePlacementAction = async (
    placementId: string, 
    newStatus: 'accepted' | 'rejected' | 'in_production' | 'delivered', 
    reason?: string
  ) => {
    console.log('handlePlacementAction called:', { placementId, newStatus, reason });
    
    try {
      setUpdating(true);
      const token = localStorage.getItem('auth_token');

      const url = `${API_BASE_URL}/publication-orders/${campaignId}/${publicationId}/placement-status`;
      console.log('Calling API:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          placementId,
          status: newStatus,
          notes: reason,
          autoConfirmIfAllAccepted: true // Flag to auto-confirm order when all placements accepted
        })
      });

      console.log('API response:', { ok: response.ok, status: response.status });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error('Failed to update placement status');
      }

      const result = await response.json();

      // Update local state immediately for responsive UI
      console.log('Updating placement status locally:', { placementId, newStatus });
      setPlacementStatuses(prev => {
        const updated = {
          ...prev,
          [placementId]: newStatus
        };
        console.log('Updated placement statuses:', updated);
        return updated;
      });

      // Show appropriate message
      if (result.orderConfirmed) {
        toast({
          title: '🎉 All Placements Accepted!',
          description: 'Order has been automatically confirmed. The hub team has been notified.'
        });
      } else {
        const messages = {
          accepted: 'Placement Accepted',
          rejected: 'Placement Rejected',
          in_production: 'Marked In Production',
          delivered: 'Marked as Delivered'
        };
        const descriptions = {
          accepted: 'You have accepted this ad placement.',
          rejected: 'The hub team has been notified of your concerns.',
          in_production: 'This placement is now in production.',
          delivered: 'This placement has been marked as delivered.'
        };
        
        toast({
          title: messages[newStatus],
          description: descriptions[newStatus]
        });
      }

      fetchOrderDetail();
    } catch (error) {
      console.error('Error updating placement status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update placement status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
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

      {/* Status Update Actions for Confirmed Orders */}
      {(canMarkInProduction || canMarkDelivered) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
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

      {/* Placement Review Status */}
      {order.status === 'sent' && (() => {
        const campaignData = (order as any).campaignData;
        const publication = campaignData?.selectedInventory?.publications?.find(
          (pub: any) => pub.publicationId === order.publicationId
        );
        const totalPlacements = publication?.inventoryItems?.length || 0;
        const acceptedCount = Object.values(placementStatuses).filter(s => s === 'accepted').length;
        const inProductionCount = Object.values(placementStatuses).filter(s => s === 'in_production').length;
        const deliveredCount = Object.values(placementStatuses).filter(s => s === 'delivered').length;
        const rejectedCount = Object.values(placementStatuses).filter(s => s === 'rejected').length;
        const pendingCount = totalPlacements - acceptedCount - inProductionCount - deliveredCount - rejectedCount;

        return (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Review Individual Placements</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Please review and accept or reject each ad placement below. Once all placements are accepted, your order will be automatically confirmed.
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="bg-green-100 p-2 rounded border border-green-300">
                      <div className="font-bold text-green-900">{acceptedCount}</div>
                      <div className="text-green-700">Accepted</div>
                    </div>
                    <div className="bg-blue-100 p-2 rounded border border-blue-300">
                      <div className="font-bold text-blue-900">{inProductionCount}</div>
                      <div className="text-blue-700">In Production</div>
                    </div>
                    <div className="bg-purple-100 p-2 rounded border border-purple-300">
                      <div className="font-bold text-purple-900">{deliveredCount}</div>
                      <div className="text-purple-700">Delivered</div>
                    </div>
                    <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                      <div className="font-bold text-yellow-900">{pendingCount}</div>
                      <div className="text-yellow-700">Pending</div>
                    </div>
                    <div className="bg-red-100 p-2 rounded border border-red-300">
                      <div className="font-bold text-red-900">{rejectedCount}</div>
                      <div className="text-red-700">Rejected</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
                          <div className="space-y-4">
                            {inventoryItems.map((item: any, index: number) => {
                              // Find creative assets for this specific placement
                              const itemPath = item.itemPath || item.sourcePath;
                              const placementAssets = order.creativeAssets?.filter((asset: any) => 
                                asset.placementId === itemPath
                              ) || [];

                              // Format with action-oriented language for publishers
                              const pricingModel = item.itemPricing?.pricingModel;
                              const monthlyImpressions = (item as any).monthlyImpressions;
                              const currentFreq = item.currentFrequency || item.quantity || 1;
                              
                              let executionInstructions = '';
                              let deliveryTarget = '';
                              
                              if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
                                if (monthlyImpressions) {
                                  const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
                                  const metric = pricingModel === 'cpv' ? 'views' : pricingModel === 'cpc' ? 'clicks' : 'impressions';
                                  executionInstructions = `Display continuously on your ${item.channel}`;
                                  deliveryTarget = `Deliver ${actualShare.toLocaleString()} ${metric} per month`;
                                } else {
                                  executionInstructions = `Allocate ${currentFreq}% of ${item.channel} inventory`;
                                  deliveryTarget = 'Run continuously';
                                }
                              } else if (pricingModel === 'per_send') {
                                const subscribers = item.audienceMetrics?.subscribers;
                                executionInstructions = `Include in ${currentFreq} newsletter${currentFreq > 1 ? 's' : ''} per month`;
                                if (subscribers) {
                                  deliveryTarget = `Send to all ${subscribers.toLocaleString()} subscribers`;
                                } else {
                                  deliveryTarget = `Send to your full subscriber list`;
                                }
                              } else if (pricingModel === 'per_spot' || pricingModel === 'per_ad') {
                                const audienceSize = item.audienceMetrics?.listeners || item.audienceMetrics?.viewers;
                                if (item.channel === 'radio' || item.channel === 'podcast') {
                                  executionInstructions = `Air ${currentFreq} spot${currentFreq > 1 ? 's' : ''} per month`;
                                } else if (item.channel === 'print') {
                                  executionInstructions = `Publish in ${currentFreq} issue${currentFreq > 1 ? 's' : ''} per month`;
                                } else {
                                  executionInstructions = `Run ${currentFreq} time${currentFreq > 1 ? 's' : ''} per month`;
                                }
                                if (audienceSize) {
                                  deliveryTarget = `Reach ${audienceSize.toLocaleString()} ${item.audienceMetrics?.listeners ? 'listeners' : 'viewers'}`;
                                } else {
                                  deliveryTarget = 'Run as scheduled';
                                }
                              } else if (pricingModel === 'per_week') {
                                executionInstructions = `Display for ${currentFreq} week${currentFreq > 1 ? 's' : ''}`;
                                const visitors = item.audienceMetrics?.monthlyVisitors;
                                if (visitors) {
                                  deliveryTarget = `${visitors.toLocaleString()} monthly visitors`;
                                } else {
                                  deliveryTarget = 'Run continuously during period';
                                }
                              } else {
                                executionInstructions = `Run ${currentFreq}× per month`;
                                deliveryTarget = 'As scheduled';
                              }

                              const unitCost = item.itemPricing?.hubPrice || 0;
                              const lineTotal = item.itemPricing?.totalCost || (unitCost * currentFreq);
                              const placementId = itemPath || `placement-${index}`;
                              const placementStatus = placementStatuses[placementId] || 'pending';

                              // Determine border and header colors based on status
                              const borderColor = 
                                placementStatus === 'delivered' ? 'border-purple-300' :
                                placementStatus === 'in_production' ? 'border-blue-300' :
                                placementStatus === 'accepted' ? 'border-green-300' : 
                                placementStatus === 'rejected' ? 'border-red-300' : 
                                'border-gray-200';
                              const headerGradient = 
                                placementStatus === 'delivered' ? 'from-purple-50 to-purple-100' :
                                placementStatus === 'in_production' ? 'from-blue-50 to-blue-100' :
                                placementStatus === 'accepted' ? 'from-green-50 to-green-100' : 
                                placementStatus === 'rejected' ? 'from-red-50 to-red-100' : 
                                'from-blue-50 to-blue-100';
                              const headerBorder = 
                                placementStatus === 'delivered' ? 'border-purple-200' :
                                placementStatus === 'in_production' ? 'border-blue-200' :
                                placementStatus === 'accepted' ? 'border-green-200' : 
                                placementStatus === 'rejected' ? 'border-red-200' : 
                                'border-blue-200';

                              return (
                                <div key={index} className={`border-2 ${borderColor} rounded-lg overflow-hidden bg-white`}>
                                  {/* Header */}
                                  <div className={`bg-gradient-to-r ${headerGradient} px-5 py-4 border-b-2 ${headerBorder}`}>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded uppercase">
                                            {item.channel}
                                          </span>
                                          {placementStatus === 'delivered' && (
                                            <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                                              ✓ Delivered
                                            </span>
                                          )}
                                          {placementStatus === 'in_production' && (
                                            <span className="inline-block px-2 py-1 bg-blue-700 text-white text-xs font-semibold rounded">
                                              ⚙ In Production
                                            </span>
                                          )}
                                          {placementStatus === 'accepted' && (
                                            <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                                              ✓ Accepted
                                            </span>
                                          )}
                                          {placementStatus === 'rejected' && (
                                            <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                                              ✗ Rejected
                                            </span>
                                          )}
                                          {placementStatus === 'pending' && (
                                            <Badge variant="outline" className="text-xs">Pending Review</Badge>
                                          )}
                                        </div>
                                        <h4 className="font-bold text-xl text-gray-900">
                                          {item.itemName || item.sourceName || 'Ad Placement'}
                                        </h4>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-600 mb-1">Your Payment</p>
                                        <p className="font-bold text-2xl text-green-600">${lineTotal.toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Execution Details */}
                                  <div className="px-5 py-4">
                                    <div className="grid grid-cols-1 gap-3 mb-4">
                                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                                        <p className="text-xs font-bold text-blue-900 uppercase mb-2">📅 What to Do</p>
                                        <p className="text-base font-bold text-blue-900">{executionInstructions}</p>
                                      </div>
                                      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                                        <p className="text-xs font-bold text-purple-900 uppercase mb-2">🎯 Delivery Target</p>
                                        <p className="text-base font-bold text-purple-900">{deliveryTarget}</p>
                                      </div>
                                    </div>

                                    {/* Technical Specifications */}
                                    {item.specifications && Object.keys(item.specifications).length > 0 && (
                                      <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200">
                                        <p className="text-xs font-bold text-amber-900 uppercase mb-2 flex items-center gap-1">
                                          📋 Technical Requirements
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(item.specifications).map(([key, value]) => (
                                            <div key={key} className="text-sm">
                                              <span className="font-semibold text-gray-700">{key}:</span>{' '}
                                              <span className="text-gray-900">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Creative Assets */}
                                    {placementAssets.length > 0 ? (
                                      <div className="p-3 bg-green-50 rounded border border-green-200">
                                        <p className="text-xs font-bold text-green-900 uppercase mb-2 flex items-center gap-1">
                                          <FileText className="h-4 w-4" />
                                          Creative Assets Ready ({placementAssets.length})
                                        </p>
                                        <div className="space-y-2">
                                          {placementAssets.map((asset: any) => (
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
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                                        <p className="text-sm text-yellow-800">
                                          ⚠️ Awaiting creative assets from advertiser
                                        </p>
                                      </div>
                                    )}

                                    {/* Placement Actions Based on Status */}
                                    <div className="mt-4 pt-4 border-t">
                                      {placementStatus === 'pending' && (
                                        <div className="flex gap-3">
                                          <Button
                                            onClick={() => handlePlacementAction(placementId, 'accepted')}
                                            disabled={updating}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                          >
                                            <Check className="h-4 w-4 mr-2" />
                                            Accept This Placement
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              setRejectingPlacementId(placementId);
                                              setRejectDialogOpen(true);
                                            }}
                                            disabled={updating}
                                            variant="outline"
                                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                                          >
                                            <X className="h-4 w-4 mr-2" />
                                            Reject This Placement
                                          </Button>
                                        </div>
                                      )}
                                      
                                      {placementStatus === 'accepted' && (
                                        <Button
                                          onClick={() => handlePlacementAction(placementId, 'in_production')}
                                          disabled={updating}
                                          className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                          <Loader2 className="h-4 w-4 mr-2" />
                                          Mark In Production
                                        </Button>
                                      )}
                                      
                                      {placementStatus === 'in_production' && (
                                        <Button
                                          onClick={() => handlePlacementAction(placementId, 'delivered')}
                                          disabled={updating}
                                          className="w-full bg-purple-600 hover:bg-purple-700"
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Mark as Delivered
                                        </Button>
                                      )}
                                      
                                      {placementStatus === 'delivered' && (
                                        <div className="text-center text-sm text-green-700 font-semibold py-2">
                                          ✓ Delivered Successfully
                                        </div>
                                      )}
                                      
                                      {placementStatus === 'rejected' && (
                                        <div className="text-center text-sm text-red-700 font-semibold py-2">
                                          ✗ Rejected - Hub team notified
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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

      {/* Reject Placement Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Ad Placement
            </DialogTitle>
            <DialogDescription>
              Please explain why you cannot run this placement. The hub team will review your feedback and may offer alternatives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Rejection
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Example: This placement doesn't align with our editorial standards, we don't have technical capability for this ad format, scheduling conflict with other advertisers..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Being specific helps the hub team find a solution or alternative placement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingPlacementId(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectionReason.trim() && rejectingPlacementId) {
                  handlePlacementAction(rejectingPlacementId, 'rejected', rejectionReason);
                  setRejectDialogOpen(false);
                  setRejectingPlacementId(null);
                  setRejectionReason('');
                } else {
                  toast({
                    title: 'Reason Required',
                    description: 'Please provide a reason for rejecting this placement',
                    variant: 'destructive'
                  });
                }
              }}
              disabled={!rejectionReason.trim()}
            >
              <X className="h-4 w-4 mr-2" />
              Reject Placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

