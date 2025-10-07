import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/config/api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RefreshCw, Eye, Trash2, CheckCircle, XCircle, Loader2, Users, TrendingUp, CalendarDays, Building2, Globe, Printer, Mail, Radio, FileText, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface SurveySubmission {
  _id: string;
  metadata: {
    respondentId?: string;
    collectorId?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  contactInformation: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    title?: string;
    email?: string;
    emailAddress?: string;
    companyName?: string;
    mediaOutletNames: string;
  };
  websiteAdvertising?: {
    monthlyUniqueVisitors?: number | string;
    hasWebsiteAdvertising?: boolean;
    largestDigitalAdSize?: string;
    secondLargestDigitalAdSize?: string;
    largestAdWeeklyRate?: number | string;
    largestAdMonthlyRate?: number | string;
    secondLargestAdWeeklyRate?: number | string;
    secondLargestAdMonthlyRate?: number | string;
    websiteTakeoverCost?: number | string | null;
    mediaKitLink?: string;
  };
  printAdvertising?: {
    hasPrintProduct?: boolean;
    mainPrintProductName?: string;
    printFrequency?: string;
    averagePrintRun?: number | string;
    distributionOutlets?: number | string;
    fullPageAdSize?: string;
    halfPageAdSize?: string;
    fullPageRate1x?: number | string;
    fullPageRate6x?: number | string;
    fullPageRate12x?: number | string;
    halfPageRate1x?: number | string;
    halfPageRate6x?: number | string;
    halfPageRate12x?: number | string;
    printRatesComparable?: string;
  };
  newsletterAdvertising?: {
    hasNewsletter?: boolean;
    newsletterSubscribers?: number | string;
    newsletterFrequency?: string;
    newsletterAdSizeLargest?: string;
    newsletterAdSizeSecond?: string;
    newsletterLargestAdRate1x?: number | string;
    newsletterLargestAdRateMonthly?: number | string;
    newsletterSecondAdRate1x?: number | string;
    newsletterSecondAdRateMonthly?: number | string;
    newsletterTakeoverCost?: number | string | null;
    newsletterRatesComparable?: string;
  };
  radioPodcastAdvertising?: {
    hasRadioStation?: boolean;
    hasPodcast?: boolean;
    radio30SecondAdsCost10x?: number | string;
    radio60SecondAdsCost10x?: number | string;
    podcast30SecondAdsCost10x?: number | string;
    podcastListenersPerShow?: number | string;
    podcastSpecialTakeoversCost?: number | string;
    video30SecondAdCost?: number | string;
    video60SecondAdCost?: number | string;
    videoAverageViews?: number | string;
  };
  socialMedia?: {
    facebookFollowers?: number | string;
    instagramFollowers?: number | string;
    twitterFollowers?: number | string;
    tiktokFollowers?: number | string;
    linkedinFollowers?: number | string;
    otherSocialFollowers?: string;
    socialMediaAdvertisingOptions?: string;
  };
  eventMarketing?: {
    hostsEvents?: boolean;
    annualEventCount?: number | string;
    eventAttendanceRange?: string;
    largestSponsorshipLevel?: number | string;
    smallestSponsorshipLevel?: number | string;
    eventSponsorshipDetails?: string;
  };
  brandedContent?: {
    offersBrandedContent?: boolean;
    printBrandedContentCost?: number | string | null;
    websiteBrandedContentCost3Month?: number | string;
    shortFormContentCost?: number | string;
    brandedContentAdditionalInfo?: string;
  };
  additionalServices?: {
    offersOttMarketing?: boolean;
    offersVirtualWebinars?: boolean;
    producesOtherVideos?: boolean;
    videoProductionDetails?: string;
    customData?: string;
  };
  application?: {
    status?: 'new' | 'reviewing' | 'approved' | 'rejected' | 'follow_up_needed';
    reviewNotes?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface SurveyStats {
  total: number;
  byStatus: Record<string, number>;
  recentCount: number;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  follow_up_needed: 'bg-purple-100 text-purple-800',
};

const SurveyManagement: React.FC = () => {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SurveySubmission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editJson, setEditJson] = useState<string>('');
  const [templateJson, setTemplateJson] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [formTabOpen, setFormTabOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>(null);
  const [formSaving, setFormSaving] = useState(false);

  const openFormEditor = (submission: SurveySubmission) => {
    setSelectedSubmission(submission);
    setFormData(JSON.parse(JSON.stringify(submission)));
    setFormTabOpen(true);
  };

  const updateForm = (path: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...(prev || {}) } as any;
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur[k] = cur[k] ?? {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`${API_BASE_URL}/admin/surveys?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch survey submissions');
      }
      const data = await response.json();
      setSubmissions(data.submissions);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/surveys/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch survey statistics');
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error fetching survey stats:', err.message);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [filterStatus]);

  const handleView = (submission: SurveySubmission) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
  };

  const handleEdit = async (submission: SurveySubmission) => {
    setSelectedSubmission(submission);
    try {
      // Load template once
      if (!templateJson) {
        const tplRes = await fetch('/survey-template.json');
        if (tplRes.ok) {
          const tpl = await tplRes.json();
          setTemplateJson(JSON.stringify(tpl, null, 2));
        }
      }
    } catch {}
    // Start with current submission JSON
    setEditJson(JSON.stringify(submission, null, 2));
    setEditDialogOpen(true);
  };

  const handleEditStatus = (submission: SurveySubmission) => {
    setSelectedSubmission(submission);
    setCurrentStatus(submission.application?.status || 'new');
    setReviewNotes(submission.application?.reviewNotes || '');
    setEditStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedSubmission) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/surveys/${selectedSubmission._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: currentStatus, reviewNotes })
      });
      if (!response.ok) {
        throw new Error('Failed to update submission status');
      }
      toast.success('Submission status updated successfully!');
      setEditStatusDialogOpen(false);
      fetchSubmissions();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this survey submission? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/admin/surveys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete survey submission');
      }
      toast.success('Submission deleted successfully!');
      fetchSubmissions();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredAndSearchedSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const contact = submission.contactInformation;
      const matchesSearch = searchTerm === '' ||
        contact?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.mediaOutletNames?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [submissions, searchTerm]);

  const getContactName = (contact: any) => {
    if (!contact) return 'Unknown';
    return contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';
  };

  const getContactEmail = (contact: any) => {
    if (!contact) return 'No email provided';
    return contact.email || contact.emailAddress || 'No email provided';
  };

  const renderAdvertisingOpportunities = (submission: SurveySubmission) => {
    const opportunities = [];

    if (submission.websiteAdvertising?.hasWebsiteAdvertising) {
      opportunities.push({
        type: 'Website',
        icon: <Globe className="h-4 w-4" />,
        details: `${submission.websiteAdvertising.monthlyUniqueVisitors || 'Unknown'} monthly visitors`
      });
    }

    if (submission.printAdvertising?.hasPrintProduct) {
      opportunities.push({
        type: 'Print',
        icon: <Printer className="h-4 w-4" />,
        details: `${submission.printAdvertising.printFrequency || 'Unknown frequency'}`
      });
    }

    if (submission.newsletterAdvertising?.hasNewsletter) {
      opportunities.push({
        type: 'Newsletter',
        icon: <Mail className="h-4 w-4" />,
        details: `${submission.newsletterAdvertising.newsletterSubscribers || 'Unknown'} subscribers`
      });
    }

    if (submission.radioPodcastAdvertising?.hasRadioStation || submission.radioPodcastAdvertising?.hasPodcast) {
      const types = [];
      if (submission.radioPodcastAdvertising.hasRadioStation) types.push('Radio');
      if (submission.radioPodcastAdvertising.hasPodcast) types.push('Podcast');
      opportunities.push({
        type: types.join('/'),
        icon: <Radio className="h-4 w-4" />,
        details: types.join(' & ')
      });
    }

    return opportunities;
  };

  if (loading && !submissions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Submissions</CardTitle>
          <CardDescription>Loading submissions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Survey Overview</CardTitle>
          <CardDescription>Key statistics for your media partner applications.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardDescription>Total Submissions</CardDescription>
                  <CardTitle className="text-4xl">{stats.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    {stats.recentCount} new in last 7 days
                  </div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardDescription>By Status</CardDescription>
                  <CardTitle className="text-2xl">
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-base font-normal">
                        <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                          {status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Badge>
                        <span>{count}</span>
                      </div>
                    ))}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardDescription>Quick Actions</CardDescription>
                  <CardTitle className="text-2xl">
                    <Button onClick={fetchSubmissions} variant="outline" className="w-full mb-2">
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              {error ? <p>Error loading stats: {error}</p> : <p>No statistics available.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Submissions</CardTitle>
            <Button onClick={fetchSubmissions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
          <CardDescription>Manage advertising inventory submissions from media partners.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by name, email, outlet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(statusColors).map(status => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && filteredAndSearchedSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading submissions...</p>
            </div>
          ) : filteredAndSearchedSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submissions found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Media Outlet</TableHead>
                    <TableHead>Advertising Options</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSearchedSubmissions.map((submission) => {
                    const opportunities = renderAdvertisingOpportunities(submission);
                    return (
                      <TableRow key={submission._id}>
                        <TableCell className="font-medium">
                          {getContactName(submission.contactInformation)}
                          <p className="text-sm text-muted-foreground">{getContactEmail(submission.contactInformation)}</p>
                          {submission.contactInformation?.title && <p className="text-xs text-muted-foreground">{submission.contactInformation.title}</p>}
                        </TableCell>
                        <TableCell>
                          {submission.contactInformation?.mediaOutletNames || 'No outlet name'}
                          {submission.contactInformation?.companyName && (
                            <p className="text-sm text-muted-foreground">{submission.contactInformation.companyName}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {opportunities.map((opp, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <span className="flex items-center gap-1">
                                  {opp.icon}
                                  {opp.type}
                                </span>
                              </Badge>
                            ))}
                            {opportunities.length === 0 && <span className="text-sm text-muted-foreground">None specified</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[submission.application?.status || 'new']}>
                            {submission.application?.status?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'New'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(submission.createdAt), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleView(submission)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(submission)} title="Edit JSON">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openFormEditor(submission)} title="Edit Form">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditStatus(submission)} title="Update Status">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(submission._id)} title="Delete Submission" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advertising Inventory Survey Details</DialogTitle>
            <DialogDescription>
              Complete submission from {selectedSubmission && getContactName(selectedSubmission.contactInformation)}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {getContactName(selectedSubmission.contactInformation)}</p>
                  <p><strong>Email:</strong> {getContactEmail(selectedSubmission.contactInformation)}</p>
                  {selectedSubmission.contactInformation?.title && <p><strong>Title:</strong> {selectedSubmission.contactInformation.title}</p>}
                  <p><strong>Media Outlet(s):</strong> {selectedSubmission.contactInformation?.mediaOutletNames || 'No outlet name'}</p>
                  {selectedSubmission.contactInformation?.companyName && <p><strong>Company:</strong> {selectedSubmission.contactInformation.companyName}</p>}
                </CardContent>
              </Card>

              {selectedSubmission.websiteAdvertising?.hasWebsiteAdvertising && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" />Website Advertising</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.websiteAdvertising.monthlyUniqueVisitors && <p><strong>Monthly Visitors:</strong> {selectedSubmission.websiteAdvertising.monthlyUniqueVisitors}</p>}
                    {selectedSubmission.websiteAdvertising.largestDigitalAdSize && <p><strong>Largest Ad Size:</strong> {selectedSubmission.websiteAdvertising.largestDigitalAdSize}</p>}
                    {selectedSubmission.websiteAdvertising.largestAdMonthlyRate && <p><strong>Monthly Rate:</strong> {selectedSubmission.websiteAdvertising.largestAdMonthlyRate}</p>}
                    {selectedSubmission.websiteAdvertising.mediaKitLink && <p><strong>Media Kit:</strong> <a href={selectedSubmission.websiteAdvertising.mediaKitLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a></p>}
                  </CardContent>
                </Card>
              )}

              {selectedSubmission.printAdvertising?.hasPrintProduct && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Printer className="h-5 w-5" />Print Advertising</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.printAdvertising.mainPrintProductName && <p><strong>Publication:</strong> {selectedSubmission.printAdvertising.mainPrintProductName}</p>}
                    {selectedSubmission.printAdvertising.printFrequency && <p><strong>Frequency:</strong> {selectedSubmission.printAdvertising.printFrequency}</p>}
                    {selectedSubmission.printAdvertising.averagePrintRun && <p><strong>Print Run:</strong> {selectedSubmission.printAdvertising.averagePrintRun}</p>}
                    {selectedSubmission.printAdvertising.distributionOutlets && <p><strong>Distribution Points:</strong> {selectedSubmission.printAdvertising.distributionOutlets}</p>}
                    {selectedSubmission.printAdvertising.fullPageRate1x && <p><strong>Full Page Rate:</strong> {selectedSubmission.printAdvertising.fullPageRate1x}</p>}
                  </CardContent>
                </Card>
              )}

              {selectedSubmission.newsletterAdvertising?.hasNewsletter && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" />Newsletter Advertising</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.newsletterAdvertising.newsletterSubscribers && <p><strong>Subscribers:</strong> {selectedSubmission.newsletterAdvertising.newsletterSubscribers}</p>}
                    {selectedSubmission.newsletterAdvertising.newsletterFrequency && <p><strong>Frequency:</strong> {selectedSubmission.newsletterAdvertising.newsletterFrequency}</p>}
                    {selectedSubmission.newsletterAdvertising.newsletterLargestAdRateMonthly && <p><strong>Monthly Rate:</strong> {selectedSubmission.newsletterAdvertising.newsletterLargestAdRateMonthly}</p>}
                  </CardContent>
                </Card>
              )}

              {(selectedSubmission.radioPodcastAdvertising?.hasRadioStation || selectedSubmission.radioPodcastAdvertising?.hasPodcast) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Radio className="h-5 w-5" />Radio & Podcast</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.radioPodcastAdvertising.hasRadioStation && <p><strong>Radio Station:</strong> Yes</p>}
                    {selectedSubmission.radioPodcastAdvertising.hasPodcast && <p><strong>Podcast:</strong> Yes</p>}
                    {selectedSubmission.radioPodcastAdvertising.podcastListenersPerShow && <p><strong>Podcast Listeners:</strong> {selectedSubmission.radioPodcastAdvertising.podcastListenersPerShow}</p>}
                    {selectedSubmission.radioPodcastAdvertising.radio30SecondAdsCost10x && <p><strong>Radio 30s (10x):</strong> {selectedSubmission.radioPodcastAdvertising.radio30SecondAdsCost10x}</p>}
                  </CardContent>
                </Card>
              )}

              {(selectedSubmission.socialMedia?.facebookFollowers || 
                selectedSubmission.socialMedia?.instagramFollowers || 
                selectedSubmission.socialMedia?.twitterFollowers || 
                selectedSubmission.socialMedia?.tiktokFollowers || 
                selectedSubmission.socialMedia?.linkedinFollowers || 
                selectedSubmission.socialMedia?.socialMediaAdvertisingOptions) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Social Media</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.socialMedia.facebookFollowers && <p><strong>Facebook:</strong> {selectedSubmission.socialMedia.facebookFollowers} followers</p>}
                    {selectedSubmission.socialMedia.instagramFollowers && <p><strong>Instagram:</strong> {selectedSubmission.socialMedia.instagramFollowers} followers</p>}
                    {selectedSubmission.socialMedia.twitterFollowers && <p><strong>Twitter/X:</strong> {selectedSubmission.socialMedia.twitterFollowers} followers</p>}
                    {selectedSubmission.socialMedia.tiktokFollowers && <p><strong>TikTok:</strong> {selectedSubmission.socialMedia.tiktokFollowers} followers</p>}
                    {selectedSubmission.socialMedia.linkedinFollowers && <p><strong>LinkedIn:</strong> {selectedSubmission.socialMedia.linkedinFollowers} followers</p>}
                    {selectedSubmission.socialMedia.socialMediaAdvertisingOptions && <p><strong>Services:</strong> {selectedSubmission.socialMedia.socialMediaAdvertisingOptions}</p>}
                  </CardContent>
                </Card>
              )}

              {selectedSubmission.eventMarketing?.hostsEvents && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5" />Event Marketing</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.eventMarketing.annualEventCount && <p><strong>Events per Year:</strong> {selectedSubmission.eventMarketing.annualEventCount}</p>}
                    {selectedSubmission.eventMarketing.eventAttendanceRange && <p><strong>Attendance:</strong> {selectedSubmission.eventMarketing.eventAttendanceRange}</p>}
                    {selectedSubmission.eventMarketing.largestSponsorshipLevel && <p><strong>Top Sponsorship:</strong> {selectedSubmission.eventMarketing.largestSponsorshipLevel}</p>}
                    {selectedSubmission.eventMarketing.eventSponsorshipDetails && <p><strong>Details:</strong> {selectedSubmission.eventMarketing.eventSponsorshipDetails}</p>}
                  </CardContent>
                </Card>
              )}

              {selectedSubmission.brandedContent?.offersBrandedContent && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Branded Content</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.brandedContent.printBrandedContentCost && <p><strong>Print Content Cost:</strong> {selectedSubmission.brandedContent.printBrandedContentCost}</p>}
                    {selectedSubmission.brandedContent.websiteBrandedContentCost3Month && <p><strong>Website Content (3 months):</strong> {selectedSubmission.brandedContent.websiteBrandedContentCost3Month}</p>}
                    {selectedSubmission.brandedContent.shortFormContentCost && <p><strong>Short-form Content:</strong> {selectedSubmission.brandedContent.shortFormContentCost}</p>}
                    {selectedSubmission.brandedContent.brandedContentAdditionalInfo && <p><strong>Additional Info:</strong> {selectedSubmission.brandedContent.brandedContentAdditionalInfo}</p>}
                  </CardContent>
                </Card>
              )}

              {(selectedSubmission.additionalServices?.offersOttMarketing || 
                selectedSubmission.additionalServices?.offersVirtualWebinars || 
                selectedSubmission.additionalServices?.producesOtherVideos ||
                selectedSubmission.additionalServices?.videoProductionDetails ||
                selectedSubmission.additionalServices?.customData) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5" />Additional Services</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedSubmission.additionalServices?.offersOttMarketing && <p><strong>OTT Marketing:</strong> Yes</p>}
                    {selectedSubmission.additionalServices?.offersVirtualWebinars && <p><strong>Virtual Webinars:</strong> Yes</p>}
                    {selectedSubmission.additionalServices?.producesOtherVideos && <p><strong>Video Production:</strong> Yes</p>}
                    {selectedSubmission.additionalServices?.videoProductionDetails && <p><strong>Video Details:</strong> {selectedSubmission.additionalServices.videoProductionDetails}</p>}
                    {selectedSubmission.additionalServices?.customData && <p><strong>Additional Info:</strong> {selectedSubmission.additionalServices.customData}</p>}
                  </CardContent>
                </Card>
              )}

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-lg">Application Status</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Status:</strong> <Badge className={statusColors[selectedSubmission.application?.status || 'new']}>{selectedSubmission.application?.status?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'New'}</Badge></p>
                  {selectedSubmission.application?.reviewNotes && <p><strong>Review Notes:</strong> {selectedSubmission.application.reviewNotes}</p>}
                  {selectedSubmission.application?.reviewedBy && <p><strong>Reviewed By:</strong> {selectedSubmission.application.reviewedBy}</p>}
                  {selectedSubmission.application?.reviewedAt && <p><strong>Reviewed At:</strong> {format(new Date(selectedSubmission.application.reviewedAt), 'PPP p')}</p>}
                  <p><strong>Submitted:</strong> {format(new Date(selectedSubmission.createdAt), 'PPP p')}</p>
                  {selectedSubmission.metadata.ipAddress && <p><strong>IP Address:</strong> {selectedSubmission.metadata.ipAddress}</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={formTabOpen} onOpenChange={setFormTabOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey Submission</DialogTitle>
            <DialogDescription>
              User-friendly editor organized by sections. Required: Media outlet name.
            </DialogDescription>
          </DialogHeader>
          {formData && (
            <Tabs defaultValue="contact" className="mt-2">
              <TabsList className="flex flex-wrap gap-2">
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="print">Print</TabsTrigger>
                <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
                <TabsTrigger value="audio">Radio/Podcast/Video</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="branded">Branded</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="application">Application</TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={formData?.contactInformation?.fullName || ''} onChange={(e) => updateForm('contactInformation.fullName', e.target.value)} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={formData?.contactInformation?.title || ''} onChange={(e) => updateForm('contactInformation.title', e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData?.contactInformation?.email || ''} onChange={(e) => updateForm('contactInformation.email', e.target.value)} />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={formData?.contactInformation?.companyName || ''} onChange={(e) => updateForm('contactInformation.companyName', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Media Outlet Names (required)</Label>
                    <Input value={formData?.contactInformation?.mediaOutletNames || ''} onChange={(e) => updateForm('contactInformation.mediaOutletNames', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="website" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Monthly Unique Visitors</Label>
                    <Input value={formData?.websiteAdvertising?.monthlyUniqueVisitors || ''} onChange={(e) => updateForm('websiteAdvertising.monthlyUniqueVisitors', e.target.value)} />
                  </div>
                  <div>
                    <Label>Largest Digital Ad Size</Label>
                    <Input value={formData?.websiteAdvertising?.largestDigitalAdSize || ''} onChange={(e) => updateForm('websiteAdvertising.largestDigitalAdSize', e.target.value)} />
                  </div>
                  <div>
                    <Label>Monthly Rate (Largest)</Label>
                    <Input value={formData?.websiteAdvertising?.largestAdMonthlyRate || ''} onChange={(e) => updateForm('websiteAdvertising.largestAdMonthlyRate', e.target.value)} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Media Kit Link</Label>
                    <Input value={formData?.websiteAdvertising?.mediaKitLink || ''} onChange={(e) => updateForm('websiteAdvertising.mediaKitLink', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="print" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Has Print Product</Label>
                    <Select value={String(!!formData?.printAdvertising?.hasPrintProduct)} onValueChange={(v) => updateForm('printAdvertising.hasPrintProduct', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Main Print Product Name</Label>
                    <Input value={formData?.printAdvertising?.mainPrintProductName || ''} onChange={(e) => updateForm('printAdvertising.mainPrintProductName', e.target.value)} />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Input value={formData?.printAdvertising?.printFrequency || ''} onChange={(e) => updateForm('printAdvertising.printFrequency', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="newsletter" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Has Newsletter</Label>
                    <Select value={String(!!formData?.newsletterAdvertising?.hasNewsletter)} onValueChange={(v) => updateForm('newsletterAdvertising.hasNewsletter', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subscribers</Label>
                    <Input value={formData?.newsletterAdvertising?.newsletterSubscribers || ''} onChange={(e) => updateForm('newsletterAdvertising.newsletterSubscribers', e.target.value)} />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Input value={formData?.newsletterAdvertising?.newsletterFrequency || ''} onChange={(e) => updateForm('newsletterAdvertising.newsletterFrequency', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Has Radio Station</Label>
                    <Select value={String(!!formData?.radioPodcastAdvertising?.hasRadioStation)} onValueChange={(v) => updateForm('radioPodcastAdvertising.hasRadioStation', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Has Podcast</Label>
                    <Select value={String(!!formData?.radioPodcastAdvertising?.hasPodcast)} onValueChange={(v) => updateForm('radioPodcastAdvertising.hasPodcast', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Podcast Listeners/Show</Label>
                    <Input value={formData?.radioPodcastAdvertising?.podcastListenersPerShow || ''} onChange={(e) => updateForm('radioPodcastAdvertising.podcastListenersPerShow', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Facebook Followers</Label>
                    <Input value={formData?.socialMedia?.facebookFollowers || ''} onChange={(e) => updateForm('socialMedia.facebookFollowers', e.target.value)} />
                  </div>
                  <div>
                    <Label>Instagram Followers</Label>
                    <Input value={formData?.socialMedia?.instagramFollowers || ''} onChange={(e) => updateForm('socialMedia.instagramFollowers', e.target.value)} />
                  </div>
                  <div>
                    <Label>LinkedIn Followers</Label>
                    <Input value={formData?.socialMedia?.linkedinFollowers || ''} onChange={(e) => updateForm('socialMedia.linkedinFollowers', e.target.value)} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Advertising Options</Label>
                    <Textarea rows={3} value={formData?.socialMedia?.socialMediaAdvertisingOptions || ''} onChange={(e) => updateForm('socialMedia.socialMediaAdvertisingOptions', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="events" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Hosts Events</Label>
                    <Select value={String(!!formData?.eventMarketing?.hostsEvents)} onValueChange={(v) => updateForm('eventMarketing.hostsEvents', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Annual Event Count</Label>
                    <Input value={formData?.eventMarketing?.annualEventCount || ''} onChange={(e) => updateForm('eventMarketing.annualEventCount', e.target.value)} />
                  </div>
                  <div>
                    <Label>Attendance Range</Label>
                    <Input value={formData?.eventMarketing?.eventAttendanceRange || ''} onChange={(e) => updateForm('eventMarketing.eventAttendanceRange', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branded" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Offers Branded Content</Label>
                    <Select value={String(!!formData?.brandedContent?.offersBrandedContent)} onValueChange={(v) => updateForm('brandedContent.offersBrandedContent', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Print Branded Content Cost</Label>
                    <Input value={formData?.brandedContent?.printBrandedContentCost || ''} onChange={(e) => updateForm('brandedContent.printBrandedContentCost', e.target.value)} />
                  </div>
                  <div>
                    <Label>Website Branded Content (3 mo)</Label>
                    <Input value={formData?.brandedContent?.websiteBrandedContentCost3Month || ''} onChange={(e) => updateForm('brandedContent.websiteBrandedContentCost3Month', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>OTT Marketing</Label>
                    <Select value={String(!!formData?.additionalServices?.offersOttMarketing)} onValueChange={(v) => updateForm('additionalServices.offersOttMarketing', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Virtual Webinars</Label>
                    <Select value={String(!!formData?.additionalServices?.offersVirtualWebinars)} onValueChange={(v) => updateForm('additionalServices.offersVirtualWebinars', v === 'true')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Video Production Details</Label>
                    <Textarea rows={3} value={formData?.additionalServices?.videoProductionDetails || ''} onChange={(e) => updateForm('additionalServices.videoProductionDetails', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="application" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData?.application?.status || 'new'} onValueChange={(v) => updateForm('application.status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(statusColors).map(s => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Review Notes</Label>
                    <Textarea rows={3} value={formData?.application?.reviewNotes || ''} onChange={(e) => updateForm('application.reviewNotes', e.target.value)} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setFormTabOpen(false)}>Cancel</Button>
            <Button disabled={formSaving} onClick={async () => {
              if (!selectedSubmission || !formData) return;
              if (!formData?.contactInformation?.mediaOutletNames) { toast.error('Media outlet name is required'); return; }
              setFormSaving(true);
              try {
                const res = await fetch(`${API_BASE_URL}/admin/surveys/${selectedSubmission._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                  body: JSON.stringify(formData)
                });
                if (!res.ok) throw new Error('Failed to save');
                toast.success('Submission updated');
                setFormTabOpen(false);
                fetchSubmissions();
              } catch (e: any) {
                toast.error(e.message || 'Failed to save');
              } finally {
                setFormSaving(false);
              }
            }}>{formSaving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Status Dialog */}
      <Dialog open={editStatusDialogOpen} onOpenChange={setEditStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Submission Status</DialogTitle>
            <DialogDescription>
              Change the status and add review notes for this submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={currentStatus} onValueChange={setCurrentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusColors).map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reviewNotes">Review Notes</Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this submission..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit JSON Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey Submission (JSON)</DialogTitle>
            <DialogDescription>
              Merge with the full schema template as needed. Save to persist changes.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>
            <TabsContent value="current">
              <Label htmlFor="json">Submission JSON</Label>
              <Textarea id="json" value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={24} className="font-mono text-xs" />
            </TabsContent>
            <TabsContent value="template">
              <Label>Full Schema Template</Label>
              <Textarea value={templateJson} readOnly rows={24} className="font-mono text-xs bg-muted" />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              if (!selectedSubmission) return;
              setSaving(true);
              try {
                let parsed;
                try { parsed = JSON.parse(editJson); } catch (e: any) { toast.error('Invalid JSON: ' + e.message); setSaving(false); return; }
                // Ensure required field exists
                if (!parsed?.contactInformation?.mediaOutletNames) {
                  toast.error('contactInformation.mediaOutletNames is required');
                  setSaving(false);
                  return;
                }
                const res = await fetch(`${API_BASE_URL}/admin/surveys/${selectedSubmission._id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                  },
                  body: JSON.stringify(parsed)
                });
                if (!res.ok) throw new Error('Failed to save submission');
                toast.success('Submission updated');
                setEditDialogOpen(false);
                fetchSubmissions();
              } catch (err: any) {
                toast.error(err.message || 'Failed to save');
              } finally {
                setSaving(false);
              }
            }}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SurveyManagement;