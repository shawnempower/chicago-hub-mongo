import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge, OrderStatus } from '../orders/OrderStatusBadge';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Eye, X, Image, AlertCircle, CheckCircle2, Calendar, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';

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
  uploadedAssetCount?: number;
  placementStatuses?: Record<string, 'pending' | 'accepted' | 'rejected' | 'in_production' | 'delivered'>;
  placementCount?: number;
  campaignStartDate?: Date;
  campaignEndDate?: Date;
  messageCount?: number;
  hasUnreadMessages?: boolean;
}

interface PlacementStats {
  accepted: number;
  rejected: number;
  pending: number;
  in_production: number;
  delivered: number;
}

interface OrderStats {
  total: number;
  totalPlacements: number;
  placementStats: PlacementStats;
  ordersWithIssues: number;
  ordersWithMissingAssets: number;
}

type SortKey = 'campaignName' | 'publicationName' | 'generatedAt' | 'issues';

export function HubOrdersManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<InsertionOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [issueFilter, setIssueFilter] = useState<string[]>([]);
  const [issueFilterDraft, setIssueFilterDraft] = useState<string[]>([]);
  const [issuePopoverOpen, setIssuePopoverOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const issueOptions = [
    { value: 'rejected', label: 'Has Rejections' },
    { value: 'pending', label: 'Has Pending' },
    { value: 'no_assets', label: 'Missing Assets' },
  ] as const;

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (issuePopoverOpen) {
      setIssueFilterDraft(issueFilter);
    }
  }, [issuePopoverOpen, issueFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);
      
      // Calculate stats from orders
      const calculatedStats = calculateStats(fetchedOrders);
      setStats(calculatedStats);
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

  // Get unique campaigns for filter dropdown
  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Map<string, { id: string; name: string; startDate?: Date; endDate?: Date }>();
    orders.forEach(order => {
      if (!campaigns.has(order.campaignId)) {
        campaigns.set(order.campaignId, {
          id: order.campaignId,
          name: order.campaignName,
          startDate: order.campaignStartDate,
          endDate: order.campaignEndDate
        });
      }
    });
    return Array.from(campaigns.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const getOrderIssues = (order: InsertionOrder) => {
    const issues: string[] = [];
    const statuses = Object.values(order.placementStatuses || {});
    
    if (statuses.includes('rejected')) {
      issues.push('rejected');
    }
    if (statuses.includes('pending')) {
      issues.push('pending');
    }
    if (!order.uploadedAssetCount || order.uploadedAssetCount === 0) {
      issues.push('no_assets');
    }
    
    return issues;
  };

  const getPlacementStatusCounts = (order: InsertionOrder) => {
    const statuses = Object.values(order.placementStatuses || {});
    return {
      accepted: statuses.filter(s => s === 'accepted').length,
      rejected: statuses.filter(s => s === 'rejected').length,
      pending: statuses.filter(s => s === 'pending').length,
      in_production: statuses.filter(s => s === 'in_production').length,
      delivered: statuses.filter(s => s === 'delivered').length,
      total: statuses.length
    };
  };

  const calculateStats = (ordersList: InsertionOrder[]): OrderStats => {
    const placementStats: PlacementStats = {
      accepted: 0,
      rejected: 0,
      pending: 0,
      in_production: 0,
      delivered: 0
    };

    let totalPlacements = 0;
    let ordersWithIssues = 0;
    let ordersWithMissingAssets = 0;

    ordersList.forEach(order => {
      const statuses = Object.values(order.placementStatuses || {});
      totalPlacements += statuses.length;

      statuses.forEach(status => {
        if (status in placementStats) {
          placementStats[status as keyof PlacementStats]++;
        }
      });

      // Check for issues
      const hasRejections = statuses.includes('rejected');
      if (hasRejections) ordersWithIssues++;
      
      // Check for missing assets
      if (!order.uploadedAssetCount || order.uploadedAssetCount === 0) {
        ordersWithMissingAssets++;
      }
    });

    return {
      total: ordersList.length,
      totalPlacements,
      placementStats,
      ordersWithIssues,
      ordersWithMissingAssets
    };
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getIssueFilterLabel = () => {
    if (issueFilter.length === 0) {
      return 'Filter Issues';
    }

    const labels = issueFilter
      .map(value => issueOptions.find(option => option.value === value)?.label)
      .filter(Boolean) as string[];

    if (labels.length === 1) return labels[0];
    if (labels.length === issueOptions.length) return 'All Issues';
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  };

  const applyIssueFilter = () => {
    setIssueFilter(issueFilterDraft);
    setIssuePopoverOpen(false);
  };

  const getSortValue = (order: InsertionOrder, key: SortKey) => {
    switch (key) {
      case 'campaignName':
        return order.campaignName || '';
      case 'publicationName':
        return order.publicationName || '';
      case 'generatedAt':
        return order.generatedAt || '';
      case 'issues':
        return getOrderIssues(order).length;
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
      // Campaign filter
      if (selectedCampaign !== 'all' && order.campaignId !== selectedCampaign) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          order.campaignName?.toLowerCase().includes(search) ||
          order.publicationName?.toLowerCase().includes(search);

        if (!matchesSearch) {
          return false;
        }
      }

      // Issue filter
      if (issueFilter.length > 0) {
        const orderIssues = getOrderIssues(order);
        const hasMatchingIssue = issueFilter.some(filter => orderIssues.includes(filter));
        if (!hasMatchingIssue) {
          return false;
        }
      }

      return true;
    });
  }, [sortedOrders, searchTerm, issueFilter, selectedCampaign]);

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

  const hasActiveFilters = issueFilter.length > 0 || selectedCampaign !== 'all';
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="shadow-none border-l-4 border-l-slate-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalPlacements}</div>
              <p className="text-xs text-muted-foreground">Total Placements</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.placementStats.accepted}</div>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.placementStats.in_production}</div>
              <p className="text-xs text-muted-foreground">In Production</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats.placementStats.delivered}</div>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{stats.placementStats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.placementStats.rejected}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
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
              <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
              {/* Campaign Filter */}
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger 
                  className={`${filterTriggerClass} w-[200px] ${
                    selectedCampaign !== 'all' ? 'border-primary/40 bg-primary/10 text-primary' : ''
                  }`}
                >
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {uniqueCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Issue Filter */}
              <Popover open={issuePopoverOpen} onOpenChange={setIssuePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${filterTriggerClass} ${
                      issueFilter.length > 0 ? 'border-primary/40 bg-primary/10 text-primary' : ''
                    }`}
                  >
                    {getIssueFilterLabel()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-4">
                  <div className="space-y-3">
                    {issueOptions.map(option => {
                      const checked = issueFilterDraft.includes(option.value);
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setIssueFilterDraft(prev =>
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
                        setIssueFilter([]);
                        setIssueFilterDraft([]);
                        setIssuePopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={applyIssueFilter}>
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
                  <TableHead className="w-[15%]">
                    <button
                      type="button"
                      onClick={() => handleSort('campaignName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Campaign
                      {renderSortIcon('campaignName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <button
                      type="button"
                      onClick={() => handleSort('publicationName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Publication
                      {renderSortIcon('publicationName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <span className="text-sm font-medium text-muted-foreground">
                      Campaign Dates
                    </span>
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <span className="text-sm font-medium text-muted-foreground">
                      Placement Status
                    </span>
                  </TableHead>
                  <TableHead className="w-[8%]">
                    <span className="text-sm font-medium text-muted-foreground">
                      Assets
                    </span>
                  </TableHead>
                  <TableHead className="w-[6%]">
                    <span className="text-sm font-medium text-muted-foreground">
                      Messages
                    </span>
                  </TableHead>
                  <TableHead className="w-[8%]">
                    <button
                      type="button"
                      onClick={() => handleSort('issues')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Issues
                      {renderSortIcon('issues')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[8%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const placementCounts = getPlacementStatusCounts(order);
                  const issues = getOrderIssues(order);
                  
                  return (
                    <TableRow
                      key={`${order.campaignId}-${order.publicationId}`}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/hubcentral?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{order.campaignName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Generated {formatDistanceToNow(new Date(order.generatedAt), { addSuffix: true })}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{order.publicationName}</TableCell>
                      <TableCell>
                        {order.campaignStartDate && order.campaignEndDate ? (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(order.campaignStartDate), 'MMM d')}</span>
                            </div>
                            <div className="text-muted-foreground mt-0.5">
                              to {format(new Date(order.campaignEndDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {placementCounts.accepted > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              {placementCounts.accepted} Accepted
                            </Badge>
                          )}
                          {placementCounts.in_production > 0 && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              {placementCounts.in_production} In Prod
                            </Badge>
                          )}
                          {placementCounts.delivered > 0 && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              {placementCounts.delivered} Delivered
                            </Badge>
                          )}
                          {placementCounts.pending > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              {placementCounts.pending} Pending
                            </Badge>
                          )}
                          {placementCounts.rejected > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                              {placementCounts.rejected} Rejected
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.uploadedAssetCount && order.uploadedAssetCount > 0 ? (
                          <div className="flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-green-700 font-medium">
                              {order.uploadedAssetCount}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-600 font-medium">0</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.messageCount && order.messageCount > 0 ? (
                          <div className="flex items-center gap-1 text-xs">
                            <MessageCircle className={`h-3.5 w-3.5 ${order.hasUnreadMessages ? 'text-blue-600 fill-blue-100' : 'text-gray-500'}`} />
                            <span className={order.hasUnreadMessages ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                              {order.messageCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {issues.includes('rejected') && (
                              <Badge variant="destructive" className="text-xs">
                                Rejections
                              </Badge>
                            )}
                            {issues.includes('no_assets') && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                No Assets
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/hubcentral?tab=order-detail&campaignId=${order.campaignId}&publicationId=${order.publicationId}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Orders"
        activityTypes={['order_create', 'order_update', 'order_delete']}
        hubId={undefined}
      />
    </div>
  );
}
