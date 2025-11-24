import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { Eye, Search, Filter, Calendar } from 'lucide-react';
import { usePublication } from '@/contexts/PublicationContext';
import { toast } from '@/hooks/use-toast';

interface InsertionOrder {
  _id?: string;
  publicationId: number;
  publicationName: string;
  campaignId: string;
  campaignName: string;
  generatedAt: Date;
  status: OrderStatus;
  sentAt?: Date;
  confirmationDate?: Date;
}

export function PublicationOrders() {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<InsertionOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<InsertionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Fetch orders
  useEffect(() => {
    if (selectedPublication) {
      fetchOrders();
    }
  }, [selectedPublication]);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Add publication ID filter if a publication is selected
      const url = selectedPublication 
        ? `/api/publication-orders?publicationId=${selectedPublication.publicationId}`
        : '/api/publication-orders';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load insertion orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order: InsertionOrder) => {
    navigate(`/dashboard?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusCounts = () => {
    return {
      all: orders.length,
      draft: orders.filter(o => o.status === 'draft').length,
      sent: orders.filter(o => o.status === 'sent').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      in_production: orders.filter(o => o.status === 'in_production').length,
      delivered: orders.filter(o => o.status === 'delivered').length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Insertion Orders</h2>
        <p className="text-muted-foreground">
          View and manage your advertising insertion orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.sent}</div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{statusCounts.confirmed}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.in_production}</div>
            <p className="text-xs text-muted-foreground">In Production</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{statusCounts.delivered}</div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by campaign name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({statusCounts.all})
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('sent')}
              >
                Pending ({statusCounts.sent})
              </Button>
              <Button
                variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('confirmed')}
              >
                Confirmed ({statusCounts.confirmed})
              </Button>
              <Button
                variant={statusFilter === 'in_production' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('in_production')}
              >
                In Production ({statusCounts.in_production})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {orders.length === 0 
                ? 'No insertion orders yet'
                : 'No orders match your filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={`${order.campaignId}-${order.publicationId}`} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{order.campaignName}</h3>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Received: {formatDate(order.generatedAt)}</span>
                      </div>
                      {order.sentAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Sent: {formatDate(order.sentAt)}</span>
                        </div>
                      )}
                      {order.confirmationDate && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Calendar className="h-4 w-4" />
                          <span>Confirmed: {formatDate(order.confirmationDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewOrder(order)}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

