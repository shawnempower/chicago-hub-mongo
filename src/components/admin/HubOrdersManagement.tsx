import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Eye, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

interface OrderStats {
  total: number;
  byStatus: Record<OrderStatus, number>;
}

type SortKey = 'campaignName' | 'publicationName' | 'generatedAt' | 'status';

export function HubOrdersManagement() {
  const [orders, setOrders] = useState<InsertionOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusFilterDraft, setStatusFilterDraft] = useState<string[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_production', label: 'In Production' },
    { value: 'delivered', label: 'Delivered' },
  ] as const;

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  useEffect(() => {
    if (statusPopoverOpen) {
      setStatusFilterDraft(statusFilter);
    }
  }, [statusPopoverOpen, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/orders/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusFilterLabel = () => {
    if (statusFilter.length === 0) {
      return 'Status';
    }

    const labels = statusFilter
      .map(value => statusOptions.find(option => option.value === value)?.label)
      .filter(Boolean) as string[];

    if (labels.length === 1) return labels[0];
    if (labels.length === statusOptions.length) return 'All Statuses';
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  };

  const applyStatusFilter = () => {
    setStatusFilter(statusFilterDraft);
    setStatusPopoverOpen(false);
  };

  const getSortValue = (order: InsertionOrder, key: SortKey) => {
    switch (key) {
      case 'campaignName':
        return order.campaignName || '';
      case 'publicationName':
        return order.publicationName || '';
      case 'generatedAt':
        return order.generatedAt || '';
      case 'status':
        return order.status || '';
      default:
        return '';
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig) return orders;

    const { key, direction } = sortConfig;

    return [...orders].sort((a, b) => {
      const aValue = getSortValue(a, key);
      const bValue = getSortValue(b, key);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return direction === 'asc' ? comparison : -comparison;
      }

      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      return 0;
    });
  }, [orders, sortConfig]);

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter(order => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          order.campaignName?.toLowerCase().includes(search) ||
          order.publicationName?.toLowerCase().includes(search);

        if (!matchesSearch) {
          return false;
        }
      }

      if (statusFilter.length > 0 && !statusFilter.includes(order.status ?? '')) {
        return false;
      }

      return true;
    });
  }, [sortedOrders, searchTerm, statusFilter]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { key, direction: nextDirection };
      }

      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const hasActiveFilters = statusFilter.length > 0;
  const visibleCount = filteredOrders.length;
  const filterTriggerClass =
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

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
      <h2 className="text-xl font-semibold font-sans text-slate-900">Orders Management</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus.sent}</div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.confirmed}</div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.byStatus.in_production}</div>
              <p className="text-xs text-muted-foreground">In Production</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats.byStatus.delivered}</div>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Table */}
      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold font-sans text-slate-900">
              All Orders ({visibleCount}
              {hasActiveFilters ? ` of ${orders.length}` : ''})
            </CardTitle>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${filterTriggerClass} ${
                      statusFilter.length > 0 ? 'border-primary/40 bg-primary/10 text-primary' : ''
                    }`}
                  >
                    {getStatusFilterLabel()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-4">
                  <div className="space-y-3">
                    {statusOptions.map(option => {
                      const checked = statusFilterDraft.includes(option.value);
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setStatusFilterDraft(prev =>
                                checked ? prev.filter(value => value !== option.value) : [...prev, option.value],
                              );
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter([]);
                        setStatusFilterDraft([]);
                        setStatusPopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={applyStatusFilter}>
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="relative min-w-[200px]">
                <Input
                  placeholder="Search orders…"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className={`${filterTriggerClass} pr-9 ${
                    searchTerm ? 'border-primary/40 bg-primary/10 text-primary' : ''
                  }`}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No orders available yet.</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No orders match the current filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">
                    <button
                      type="button"
                      onClick={() => handleSort('campaignName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Campaign
                      {renderSortIcon('campaignName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <button
                      type="button"
                      onClick={() => handleSort('publicationName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Publication
                      {renderSortIcon('publicationName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <button
                      type="button"
                      onClick={() => handleSort('generatedAt')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Generated
                      {renderSortIcon('generatedAt')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={`${order.campaignId}-${order.publicationId}`}
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{order.campaignName}</p>
                    </TableCell>
                    <TableCell className="text-sm">{order.publicationName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(order.generatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle view order
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
