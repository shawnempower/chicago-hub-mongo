/**
 * Publication Earnings Component
 * 
 * Displays earnings for a publication across all campaigns.
 * Shows estimated vs actual earnings, payment status, and allows viewing details.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/config/api';

interface PublicationEarningsProps {
  publicationId: number;
}

interface EarningsRecord {
  _id: string;
  orderId: string;
  campaignId: string;
  campaignName?: string;
  publicationName: string;
  hubId: string;
  estimated: {
    total: number;
    byChannel: Record<string, number>;
  };
  actual: {
    total: number;
    byChannel: Record<string, number>;
  };
  variance: {
    amount: number;
    percentage: number;
  };
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  amountPaid: number;
  amountOwed: number;
  finalized: boolean;
  createdAt: string;
  campaignEndDate?: string;
}

interface EarningsSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  campaignCount: number;
  byPaymentStatus: Record<string, number>;
}

export function PublicationEarnings({ publicationId }: PublicationEarningsProps) {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch earnings list
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('paymentStatus', statusFilter);
      }
      
      const [earningsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/earnings/publication/${publicationId}?${params}`, { headers }),
        fetch(`${API_BASE_URL}/earnings/publication/${publicationId}/summary`, { headers }),
      ]);

      if (!earningsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch earnings data');
      }

      const earningsData = await earningsRes.json();
      const summaryData = await summaryRes.json();

      setEarnings(earningsData.earnings || []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [publicationId, statusFilter]);

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
      case 'pending':
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getVarianceIndicator = (percentage: number) => {
    if (Math.abs(percentage) < 1) {
      return <span className="text-muted-foreground">On track</span>;
    }
    if (percentage > 0) {
      return (
        <span className="text-green-600 flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          +{percentage.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-amber-600 flex items-center gap-1">
        <TrendingDown className="h-4 w-4" />
        {percentage.toFixed(1)}%
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Campaign', 'Status', 'Estimated', 'Actual', 'Variance', 'Paid', 'Owed', 'Payment Status'];
    const rows = earnings.map(e => [
      e.campaignName || e.campaignId,
      e.finalized ? 'Finalized' : 'Active',
      e.estimated.total.toFixed(2),
      e.actual.total.toFixed(2),
      e.variance.percentage.toFixed(1) + '%',
      e.amountPaid.toFixed(2),
      e.amountOwed.toFixed(2),
      e.paymentStatus,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${publicationId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <Button variant="outline" className="mt-4" onClick={fetchEarnings}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalEarned || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary?.campaignCount || 0} campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalPaid || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.totalPending || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {summary?.byPaymentStatus?.pending && (
                <Badge variant="outline">{summary.byPaymentStatus.pending} Pending</Badge>
              )}
              {summary?.byPaymentStatus?.partially_paid && (
                <Badge className="bg-yellow-100 text-yellow-800">{summary.byPaymentStatus.partially_paid} Partial</Badge>
              )}
              {summary?.byPaymentStatus?.paid && (
                <Badge className="bg-green-100 text-green-800">{summary.byPaymentStatus.paid} Paid</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Earnings</CardTitle>
              <CardDescription>
                View your earnings from each campaign
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
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={fetchEarnings}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No earnings yet</p>
              <p className="text-muted-foreground">
                Earnings will appear here once campaigns are confirmed and delivery begins.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((record) => (
                  <TableRow key={record.orderId || record._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.campaignName || 'Unnamed Campaign'}</div>
                        <div className="text-sm text-muted-foreground">
                          {record.campaignEndDate 
                            ? `Ends ${format(new Date(record.campaignEndDate), 'MMM d, yyyy')}`
                            : 'Active'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.finalized ? (
                        <Badge className="bg-blue-100 text-blue-800">Finalized</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(record.estimated.total)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(record.actual.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getVarianceIndicator(record.variance.percentage)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        {getPaymentStatusBadge(record.paymentStatus)}
                        {record.amountOwed > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(record.amountOwed)} owed
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/dashboard?tab=order-detail&campaignId=${record.campaignId}&publicationId=${record.publicationId}`)}
                      >
                        <ChevronRight className="h-4 w-4" />
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

export default PublicationEarnings;
