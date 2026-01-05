/**
 * Campaign List Page
 * 
 * Displays all campaigns with filtering and status management
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { API_BASE_URL } from '@/config/api';
import { useHubContext } from '@/contexts/HubContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Loader2,
  LayoutDashboard,
  Users,
  Package,
  Megaphone,
  UserPlus,
  DollarSign,
  Bot,
  FileText,
  AlertCircle,
  Copy,
  Check,
  AlertTriangle,
  Skull
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/CustomAuthContext';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  paused: 'bg-amber-100 text-amber-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-600',
  // Legacy statuses (for backwards compatibility)
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
  // Legacy statuses (for backwards compatibility)
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function CampaignList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const { selectedHubId, loading: hubLoading, error: hubError } = useHubContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Copy campaign ID to clipboard
  const handleCopyId = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(campaignId);
      setCopiedId(campaignId);
      toast({
        title: 'Copied!',
        description: 'Campaign ID copied to clipboard',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Permanently delete campaign and all related records
  const handlePermanentDelete = async () => {
    if (!deleteTarget || confirmText !== 'DELETE') return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/campaigns/${deleteTarget.id}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Campaign Permanently Deleted',
        description: `"${deleteTarget.name}" and ${result.totalDeleted} related records have been permanently removed.`,
      });
      
      setDeleteTarget(null);
      setConfirmText('');
      
      // Refresh the page to show updated list
      window.location.reload();
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Could not delete campaign',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };
  
  const { campaigns, loading, error, refetch } = useCampaigns({
    hubId: selectedHubId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    searchTerm: searchTerm || undefined,
    summaryOnly: true,
  });

  const handleViewCampaign = (id: string) => {
    navigate(`/campaigns/${id}`);
  };

  const handleEditCampaign = (id: string) => {
    // Navigate to campaign detail page where inline editing is available
    navigate(`/campaigns/${id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header 
          onSurveyClick={() => {}}
          showDashboardNav={true}
        />
        
        <main className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Vertical Left Navigation */}
            <aside className="w-24 flex-shrink-0">
              <nav className="p-2 sticky top-6">
                <div className="space-y-1">
                  {[
                    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/hubcentral?tab=overview' },
                    { id: 'leads', label: 'Leads', icon: Users, href: '/hubcentral?tab=leads' },
                    { id: 'packages', label: 'Packages', icon: Package, href: '/hubcentral?tab=packages' },
                    { id: 'campaigns', label: 'Campaigns', icon: Megaphone, href: '/campaigns', isActive: true },
                    { id: 'orders', label: 'Orders', icon: FileText, href: '/hubcentral?tab=orders' },
                    { id: 'pricing', label: 'Pricing', icon: DollarSign, href: '/hubcentral?tab=pricing' },
                    { id: 'inventory-chat', label: 'AI Chat', icon: Bot, href: '/hubcentral?tab=inventory-chat' },
                    { id: 'team', label: 'Team', icon: UserPlus, href: '/hubcentral?tab=team' },
                  ].map((item) => {
                    const Icon = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.href)}
                        className={cn(
                          "w-full flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors",
                          item.isActive
                            ? "bg-[#EDEAE1] font-bold"
                            : "hover:bg-[#E2E0D8] font-bold"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Hub Loading/Error State */}
              {hubLoading && !selectedHubId ? (
                <Card className="border-blue-200 bg-blue-50 mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Loading hubs...</p>
                        <p className="text-sm text-blue-700">Please wait while we fetch available hubs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : hubError ? (
                <Card className="border-red-200 bg-red-50 mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900 mb-1">Unable to load hubs</p>
                        <p className="text-sm text-red-700 mb-3">{hubError}</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="text-red-700 border-red-300 hover:bg-red-100"
                        >
                          Reload Page
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : !selectedHubId ? (
                <Card className="border-yellow-200 bg-yellow-50 mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900 mb-1">No hub selected</p>
                        <p className="text-sm text-yellow-700">Please select a hub from the navigation to view campaigns</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold font-sans">
                    Campaigns ({campaigns.length})
                  </h1>
                </div>

                {/* Filters and search row */}
                <div className="flex items-center justify-between gap-4">
                  {/* Search Bar - Left */}
                  <div className="relative min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9 border-input bg-white hover:bg-[#F9F8F3] shadow-sm transition-all duration-200"
                    />
                  </div>

                  {/* Filters - Right */}
                  <div className="flex items-center gap-2">
                  {/* Status Filter Dropdown */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[180px] border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Create Campaign Button */}
                  <Button onClick={() => navigate('/campaigns/new')} size="sm" className="h-9">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                  </div>
                </div>

                {/* Campaign List */}
                {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-800">Error loading campaigns: {error}</p>
                  </CardContent>
                </Card>
              ) : campaigns.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No campaigns found matching your filters' 
                        : 'No campaigns yet. Create your first campaign!'}
                    </p>
                    <Button onClick={() => navigate('/campaigns/new')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card 
                      key={campaign._id?.toString()} 
                      className="group cursor-pointer transition-all duration-200 hover:shadow-lg border-gray-200"
                      onClick={() => handleViewCampaign(campaign._id?.toString() || '')}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold font-sans">
                                {campaign.basicInfo?.name || 'Untitled Campaign'}
                              </h3>
                              <Badge className={STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS]}>
                                {STATUS_LABELS[campaign.status as keyof typeof STATUS_LABELS]}
                              </Badge>
                            </div>
                            {/* Copyable Campaign ID */}
                            <button
                              onClick={(e) => handleCopyId(e, campaign._id?.toString() || '')}
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono bg-muted/50 hover:bg-muted px-2 py-0.5 rounded transition-colors mb-2"
                              title="Click to copy campaign ID"
                            >
                              <span className="truncate max-w-[180px]">{campaign._id?.toString()}</span>
                              {copiedId === campaign._id?.toString() ? (
                                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <Copy className="h-3 w-3 flex-shrink-0" />
                              )}
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground mt-2">
                              <div>
                                <p className="font-medium text-foreground">Advertiser</p>
                                <p>{campaign.basicInfo?.advertiserName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">Timeline</p>
                                <p>
                                  {campaign.timeline?.startDate 
                                    ? format(new Date(campaign.timeline.startDate), 'MMM d, yyyy')
                                    : 'N/A'} - {campaign.timeline?.endDate 
                                    ? format(new Date(campaign.timeline.endDate), 'MMM d, yyyy')
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">Investment</p>
                                <p className="text-green-600 font-semibold">
                                  ${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">Created</p>
                                <p>
                                  {campaign.metadata?.createdAt 
                                    ? format(new Date(campaign.metadata.createdAt), 'MMM d, yyyy')
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action buttons - appear on hover */}
                          <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 ml-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewCampaign(campaign._id?.toString() || '')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(campaign.status === 'draft' || campaign.status === 'rejected') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCampaign(campaign._id?.toString() || '')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Permanent Delete - Admin Only */}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    id: campaign._id?.toString() || '',
                                    name: campaign.basicInfo?.name || 'Untitled Campaign'
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </main>

        {/* Permanent Delete Confirmation Modal */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmText('');
          }
        }}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Skull className="h-6 w-6" />
                Permanently Delete Campaign
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 mb-1">⚠️ This action is IRREVERSIBLE</p>
                        <p className="text-sm text-red-800">
                          You are about to permanently delete <strong>"{deleteTarget?.name}"</strong> and ALL related data.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-2">This will permanently remove:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>The campaign and all its settings</li>
                      <li>All publication insertion orders</li>
                      <li>All creative assets and uploads</li>
                      <li>All tracking scripts and pixels</li>
                      <li>All performance data and metrics</li>
                      <li>All proof of performance records</li>
                      <li>All notifications related to this campaign</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-red-600">DELETE</span> to confirm:
                    </label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}

