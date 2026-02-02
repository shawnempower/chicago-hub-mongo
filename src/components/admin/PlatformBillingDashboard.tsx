/**
 * Platform Billing Dashboard Component
 * 
 * Platform admin view showing billing across all hubs.
 * Displays total platform revenue, fees by hub, and outstanding amounts.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/config/api';

interface HubBillingSummary {
  hubId: string;
  hubName: string;
  totalFees: number;
  paid: number;
  outstanding: number;
}

interface PlatformSummary {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  hubCount: number;
  campaignCount: number;
  byHub: HubBillingSummary[];
}

interface BillingRecord {
  _id: string;
  hubId: string;
  hubName?: string;
  campaignId: string;
  campaignName?: string;
  revenueShareFee: { rate: number; actual: number; estimated: number };
  platformCpmFee: { rate: number; actual: number; estimated: number };
  totalFees: { actual: number; estimated: number };
  paymentStatus: 'pending' | 'invoiced' | 'partially_paid' | 'paid';
  amountPaid: number;
  amountOwed: number;
  finalized: boolean;
  createdAt: string;
}

export function PlatformBillingDashboard() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('paymentStatus', statusFilter);
      }

      const [summaryRes, billingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/hub-billing/platform/summary`, { headers }),
        fetch(`${API_BASE_URL}/hub-billing/platform/all?${params}`, { headers }),
      ]);

      if (!summaryRes.ok || !billingRes.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const summaryData = await summaryRes.json();
      const billingData = await billingRes.json();

      setSummary(summaryData);
      setBilling(billingData.billing || []);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      case 'invoiced':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Invoiced</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Platform fees earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalCollected || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.totalOutstanding || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Active Hubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.hubCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.campaignCount || 0}</div>
            <p className="text-xs text-muted-foreground">With billing</p>
          </CardContent>
        </Card>
      </div>

      {/* Hub Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Billing by Hub</CardTitle>
          <CardDescription>
            Summary of platform fees by hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.byHub && summary.byHub.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hub</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byHub.map((hub) => (
                  <TableRow key={hub.hubId}>
                    <TableCell className="font-medium">{hub.hubName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(hub.totalFees)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(hub.paid)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(hub.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hub billing data yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Billing Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Billing Records</CardTitle>
              <CardDescription>
                Campaign-level billing across all hubs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {billing.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No billing records</p>
              <p className="text-muted-foreground">
                Billing records will appear here once campaigns are active.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hub</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Rev Share</TableHead>
                  <TableHead className="text-right">CPM Fee</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium">{record.hubName || record.hubId}</TableCell>
                    <TableCell>
                      <div>
                        <div>{record.campaignName || 'Unnamed Campaign'}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.finalized ? 'Finalized' : 'Active'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.revenueShareFee.actual || record.revenueShareFee.estimated)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.platformCpmFee.actual || record.platformCpmFee.estimated)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(record.totalFees.actual || record.totalFees.estimated)}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(record.paymentStatus)}</TableCell>
                    <TableCell className="text-right text-amber-600">
                      {record.amountOwed > 0 ? formatCurrency(record.amountOwed) : '-'}
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

export default PlatformBillingDashboard;
