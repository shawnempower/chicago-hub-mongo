/**
 * Hub Payouts View Component
 * 
 * Displays publisher payout management and platform billing for a hub.
 * Hub admins can view what they owe publishers and what they owe the platform.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Building2,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { API_BASE_URL } from '@/config/api';

interface HubPayoutsViewProps {
  hubId: string;
}

interface PublisherEarning {
  _id: string;
  publicationId: number;
  publicationName: string;
  campaignId: string;
  campaignName?: string;
  estimated: { total: number };
  actual: { total: number };
  variance: { percentage: number };
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  amountPaid: number;
  amountOwed: number;
  finalized: boolean;
}

interface HubBilling {
  _id: string;
  campaignId: string;
  campaignName?: string;
  publisherPayouts: { estimated: number; actual: number };
  revenueShareFee: { rate: number; estimated: number; actual: number };
  platformCpmFee: { rate: number; estimated: number; actual: number };
  totalFees: { estimated: number; actual: number };
  paymentStatus: 'pending' | 'invoiced' | 'partially_paid' | 'paid';
  amountPaid: number;
  amountOwed: number;
  finalized: boolean;
}

interface PublisherSummary {
  publicationId: number;
  publicationName: string;
  totalEarned: number;
  totalPaid: number;
  totalOwed: number;
  campaignCount: number;
}

export function HubPayoutsView({ hubId }: HubPayoutsViewProps) {
  const [earnings, setEarnings] = useState<PublisherEarning[]>([]);
  const [billing, setBilling] = useState<HubBilling[]>([]);
  const [publisherSummary, setPublisherSummary] = useState<PublisherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{
    type: 'publisher' | 'platform';
    id: string;
    name: string;
    amountOwed: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('ach');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Totals
  const [publisherTotals, setPublisherTotals] = useState({
    totalOwed: 0,
    totalPaid: 0,
    totalEarned: 0,
  });
  const [platformTotals, setPlatformTotals] = useState({
    totalFees: 0,
    totalPaid: 0,
    totalOwed: 0,
    revenueShare: 0,
    cpmFees: 0,
  });

  const fetchData = async () => {
    if (!hubId) return;
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [earningsRes, billingRes, summaryRes, billingSummaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/earnings/hub/${hubId}`, { headers }),
        fetch(`${API_BASE_URL}/hub-billing/${hubId}`, { headers }),
        fetch(`${API_BASE_URL}/earnings/hub/${hubId}/summary`, { headers }),
        fetch(`${API_BASE_URL}/hub-billing/${hubId}/summary`, { headers }),
      ]);

      if (!earningsRes.ok || !billingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const earningsData = await earningsRes.json();
      const billingData = await billingRes.json();
      const summaryData = await summaryRes.json();
      const billingSummaryData = await billingSummaryRes.json();

      setEarnings(earningsData.earnings || []);
      setBilling(billingData.billing || []);
      setPublisherSummary(summaryData.byPublication || []);
      
      setPublisherTotals({
        totalOwed: earningsData.totals?.amountOwed || summaryData.totalOwed || 0,
        totalPaid: earningsData.totals?.amountPaid || summaryData.totalPaid || 0,
        totalEarned: earningsData.totals?.actualTotal || summaryData.totalEarned || 0,
      });
      
      setPlatformTotals({
        totalFees: billingSummaryData.totalFees || 0,
        totalPaid: billingSummaryData.totalPaid || 0,
        totalOwed: billingSummaryData.totalOutstanding || 0,
        revenueShare: billingSummaryData.revenueShareTotal || 0,
        cpmFees: billingSummaryData.platformCpmTotal || 0,
      });
    } catch (err) {
      console.error('Error fetching payouts data:', err);
      setError('Failed to load payouts data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hubId]);

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

  const openPaymentDialog = (
    type: 'publisher' | 'platform',
    id: string,
    name: string,
    amountOwed: number
  ) => {
    setSelectedPayment({ type, id, name, amountOwed });
    setPaymentAmount(amountOwed.toFixed(2));
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentMethod('ach');
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPayment) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      const endpoint = selectedPayment.type === 'publisher'
        ? `/api/earnings/${selectedPayment.id}/payment`
        : `/api/hub-billing/${selectedPayment.id}/payment`;

      const token = localStorage.getItem('auth_token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          reference: paymentReference,
          method: paymentMethod,
          notes: paymentNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      toast({
        title: 'Payment recorded',
        description: `Successfully recorded ${formatCurrency(amount)} payment`,
      });

      setPaymentDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading && earnings.length === 0) {
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
      <Tabs defaultValue="publishers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="publishers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Publisher Payouts
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Platform Billing
          </TabsTrigger>
        </TabsList>

        {/* Publisher Payouts Tab */}
        <TabsContent value="publishers" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(publisherTotals.totalEarned)}</div>
                <p className="text-xs text-muted-foreground">By all publishers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(publisherTotals.totalPaid)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Owed to Publishers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(publisherTotals.totalOwed)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Publishers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{publisherSummary.length}</div>
                <p className="text-xs text-muted-foreground">With earnings</p>
              </CardContent>
            </Card>
          </div>

          {/* Publisher Summary Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Publisher Earnings</CardTitle>
                  <CardDescription>
                    Summary of earnings by publisher
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {publisherSummary.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No publisher earnings yet</p>
                  <p className="text-muted-foreground">
                    Earnings will appear here once campaigns are confirmed.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Publisher</TableHead>
                      <TableHead className="text-right">Campaigns</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Owed</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publisherSummary.map((pub) => (
                      <TableRow key={pub.publicationId}>
                        <TableCell className="font-medium">{pub.publicationName}</TableCell>
                        <TableCell className="text-right">{pub.campaignCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pub.totalEarned)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(pub.totalPaid)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatCurrency(pub.totalOwed)}</TableCell>
                        <TableCell>
                          {pub.totalOwed > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Find the first pending earnings record for this publisher
                                const record = earnings.find(
                                  e => e.publicationId === pub.publicationId && e.amountOwed > 0
                                );
                                if (record) {
                                  openPaymentDialog('publisher', record._id, pub.publicationName, record.amountOwed);
                                }
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Billing Tab */}
        <TabsContent value="platform" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Total Platform Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(platformTotals.totalFees)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(platformTotals.revenueShare)}</div>
                <p className="text-xs text-muted-foreground">% of publisher payouts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CPM Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(platformTotals.cpmFees)}</div>
                <p className="text-xs text-muted-foreground">Digital impressions</p>
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
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(platformTotals.totalOwed)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Billing Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Platform Fees by Campaign</CardTitle>
                  <CardDescription>
                    Fees owed to the platform for each campaign
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {billing.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No platform fees yet</p>
                  <p className="text-muted-foreground">
                    Fees will appear here once campaigns are active.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Rev Share</TableHead>
                      <TableHead className="text-right">CPM Fee</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <div className="font-medium">{record.campaignName || 'Unnamed Campaign'}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.finalized ? 'Finalized' : 'Active'}
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
                        <TableCell>
                          {record.amountOwed > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentDialog(
                                'platform',
                                record._id,
                                record.campaignName || 'Campaign',
                                record.amountOwed
                              )}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment {selectedPayment?.type === 'publisher' ? 'to' : 'for'}{' '}
              {selectedPayment?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Amount owed: {formatCurrency(selectedPayment?.amountOwed || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Check #, wire ref, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPayment} disabled={submittingPayment}>
              {submittingPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HubPayoutsView;
