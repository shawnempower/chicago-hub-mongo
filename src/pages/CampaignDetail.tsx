/**
 * Campaign Detail Page
 * 
 * Displays full campaign details with insertion order viewer
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCampaign, useUpdateCampaignStatus, useDeleteCampaign, useGeneratePublicationOrders } from '@/hooks/useCampaigns';
import { format } from 'date-fns';
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  DollarSign,
  Target,
  Calendar,
  Building2,
  Package,
  Trash2,
  AlertTriangle,
  Megaphone,
  LayoutDashboard,
  Users,
  UserPlus,
  Bot,
  BarChart3,
  Play,
  Pause,
  Copy,
  Check
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { API_BASE_URL } from '@/config/api';
import { CreativeAssetsManager } from '@/components/campaign/CreativeAssetsManager';
import { extractRequirementsForSelectedInventory } from '@/utils/creativeSpecsExtractor';
import { formatInsertionOrderQuantity, formatInsertionOrderAudienceWithBadge } from '@/utils/insertionOrderFormatting';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';
import { CampaignPerformanceDashboard } from '@/components/admin/CampaignPerformanceDashboard';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-100',
  active: 'bg-blue-100 text-blue-800',
  paused: 'bg-amber-100 text-amber-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-600',
  // Legacy statuses (for backwards compatibility with existing data)
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  draft: 'Pending Orders',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
  // Legacy statuses (for backwards compatibility with existing data)
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { campaign, loading, refetch } = useCampaign(id || null);
  const { generateOrders, generating: generatingOrders } = useGeneratePublicationOrders();
  const { updateStatus, updating } = useUpdateCampaignStatus();
  const { deleteCampaign, deleting } = useDeleteCampaign();
  const [uploadedAssets, setUploadedAssets] = useState<Map<string, any>>(new Map());
  const [publicationOrders, setPublicationOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Copy campaign ID to clipboard
  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const idToCopy = campaign?._id?.toString() || id || '';
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      toast({
        title: 'Copied!',
        description: 'Campaign ID copied to clipboard',
      });
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };
  const [rescindTarget, setRescindTarget] = useState<{ publicationId: number; publicationName: string } | null>(null);
  const [rescindPlacementTarget, setRescindPlacementTarget] = useState<{ 
    publicationId: number; 
    publicationName: string;
    placementId: string;
    placementName: string;
  } | null>(null);
  
  // Read tab from URL query params (e.g., ?tab=orders maps to insertion-order)
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl === 'orders' ? 'insertion-order' : 
                     tabFromUrl === 'creative' ? 'creative-requirements' :
                     tabFromUrl === 'performance' ? 'performance' :
                     'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch publication insertion orders from the new collection
  useEffect(() => {
    const fetchPublicationOrders = async () => {
      if (!campaign?.campaignId) return;
      
      setOrdersLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/admin/orders?campaignId=${campaign.campaignId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPublicationOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching publication orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchPublicationOrders();
  }, [campaign?.campaignId]);

  const handleGeneratePublicationOrders = async () => {
    if (!id || !campaign?.campaignId) return;
    
    try {
      const result = await generateOrders(id);
      toast({
        title: 'Publication Orders Generated',
        description: `${result.ordersGenerated} publication insertion orders have been created and are now visible to publications.`,
      });
      
      // Refetch orders from the new collection
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/orders?campaignId=${campaign.campaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPublicationOrders(data.orders || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate publication orders';
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateOrders = async () => {
    if (!id || !campaign?.campaignId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      // Delete existing orders first
      await fetch(`${API_BASE_URL}/admin/orders/${id}/publication-orders`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Then regenerate
      await handleGeneratePublicationOrders();
      setShowRegenerateDialog(false);
    } catch (error) {
      console.error('Error regenerating publication orders:', error);
      toast({
        title: 'Regeneration Failed',
        description: 'Failed to regenerate publication orders. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRescindOrder = async () => {
    if (!campaign?.campaignId || !rescindTarget) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${campaign.campaignId}/${rescindTarget.publicationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to rescind order');
      
      // Remove from local state
      setPublicationOrders(prev => 
        prev.filter(o => o.publicationId !== rescindTarget.publicationId)
      );
      
      toast({
        title: 'Order Rescinded',
        description: `Publication order for ${rescindTarget.publicationName} has been rescinded.`,
      });
      setRescindTarget(null);
    } catch (error) {
      console.error('Error rescinding order:', error);
      toast({
        title: 'Rescind Failed',
        description: 'Failed to rescind publication order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRescindPlacement = async () => {
    if (!campaign?.campaignId || !rescindPlacementTarget) return;

    try {
      const token = localStorage.getItem('auth_token');
      const encodedPlacementId = encodeURIComponent(rescindPlacementTarget.placementId);
      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${campaign.campaignId}/${rescindPlacementTarget.publicationId}/placement/${encodedPlacementId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rescind placement');
      }

      const data = await response.json();

      // Update local state with the updated order
      if (data.updatedOrder) {
        setPublicationOrders(prev => 
          prev.map(o => o.publicationId === rescindPlacementTarget.publicationId 
            ? data.updatedOrder 
            : o
          )
        );
      }

      toast({
        title: 'Placement Removed',
        description: `"${rescindPlacementTarget.placementName}" has been removed from ${rescindPlacementTarget.publicationName}'s order.`,
      });
      setRescindPlacementTarget(null);
      
      // Refetch to ensure everything is in sync
      refetch();
    } catch (error) {
      console.error('Error rescinding placement:', error);
      toast({
        title: 'Rescind Failed',
        description: error instanceof Error ? error.message : 'Failed to rescind placement. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    
    try {
      await updateStatus(id, newStatus as any);
      toast({
        title: 'Status Updated',
        description: `Campaign status changed to ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}.`,
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update campaign status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteCampaign(id);
      toast({
        title: 'Campaign Deleted',
        description: 'The campaign has been permanently deleted.',
      });
      navigate('/campaigns');
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!campaign) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header onSurveyClick={() => {}} showDashboardNav={true} />
          <main className="container mx-auto px-6 py-8">
            <Breadcrumb
              rootLabel="Campaigns"
              rootIcon={Megaphone}
              currentLabel="Campaign Not Found"
              onBackClick={() => navigate('/campaigns')}
            />
            <Card className="border-red-200 bg-red-50 mt-6">
              <CardContent className="pt-6">
                <p className="text-red-800">Campaign not found</p>
                <Button onClick={() => navigate('/campaigns')} className="mt-4">
                  Back to Campaigns
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header onSurveyClick={() => {}} showDashboardNav={true} />
        
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
            <div className="flex-1 min-w-0 max-w-6xl">
              {/* Breadcrumbs */}
              <div className="mb-6">
                <Breadcrumb
                  rootLabel="Campaigns"
                  rootIcon={Megaphone}
                  currentLabel={campaign.basicInfo?.name || 'Campaign Details'}
                  onBackClick={() => navigate('/campaigns')}
                />
              </div>

              {/* Unified Header Container */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
                {/* Title Row with Actions */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-lg font-semibold font-sans">{campaign.basicInfo.name}</h1>
                      <span className="text-lg font-sans text-muted-foreground">
                        {campaign.basicInfo.advertiserName}
                      </span>
                    </div>
                    {/* Copyable Campaign ID */}
                    <button
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono bg-muted/50 hover:bg-muted px-2 py-0.5 rounded transition-colors"
                      title="Click to copy campaign ID"
                    >
                      <span className="truncate max-w-[200px]">{campaign._id?.toString() || id}</span>
                      {copiedId ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    {campaign.algorithm && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-purple-700 font-medium font-sans bg-purple-100 px-2 py-1 rounded-md">
                          {campaign.algorithm.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
                    <Badge className={STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[campaign.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                    
                    {/* Status-based Action Buttons - Simplified Workflow */}
                    {/* Draft campaigns auto-activate when insertion orders are generated */}
                    
                    {campaign.status === 'active' && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate('paused')}
                          disabled={updating}
                          size="sm"
                          variant="outline"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate('completed')}
                          disabled={updating}
                          size="sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'paused' && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate('active')}
                          disabled={updating}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleStatusUpdate('cancelled')}
                          disabled={updating}
                          size="sm"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )}
                    
                    {/* Delete Button - Icon Only */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleting}
                          className="px-2"
                        >
                          {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the campaign
                            <strong className="text-foreground"> "{campaign.basicInfo?.name || 'Unnamed Campaign'}"</strong> and
                            all associated data including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Selected inventory and placements</li>
                              <li>Pricing and budget information</li>
                              <li>Performance estimates</li>
                              <li>Insertion orders (if generated)</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Campaign
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground font-sans">Investment</p>
                    </div>
                    <p className="text-lg font-bold font-sans">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</p>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground font-sans">Publications</p>
                    </div>
                    <p className="text-lg font-bold font-sans">{campaign.selectedInventory?.totalPublications || campaign.selectedInventory?.publications?.length || 0}</p>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground font-sans">Placements</p>
                    </div>
                    <p className="text-lg font-bold font-sans">{campaign.selectedInventory?.totalInventoryItems || 0}</p>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground font-sans">Est. Reach</p>
                    </div>
                    <p className="text-lg font-bold font-sans">
                      {campaign.estimatedPerformance?.reach?.min?.toLocaleString() || 'N/A'}+
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground font-sans">Duration</p>
                    </div>
                    <p className="text-lg font-bold font-sans">{campaign.timeline.durationMonths} months</p>
                  </div>
                </div>
              </div>

              {/* Main Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 gap-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="creative-requirements">Creative Requirements</TabsTrigger>
              <TabsTrigger value="insertion-order">Insertion Order</TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Performance
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground font-sans">Campaign Name</p>
                      <p className="font-semibold font-sans">{campaign.basicInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-sans">Advertiser</p>
                      <p className="font-semibold font-sans">{campaign.basicInfo.advertiserName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-sans">Primary Goal</p>
                      <p className="font-semibold font-sans capitalize">{campaign.objectives?.primaryGoal || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-sans">Hub</p>
                      <p className="font-semibold font-sans">{campaign.hubName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-sans">Start Date</p>
                      <p className="font-semibold font-sans">{format(new Date(campaign.timeline.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-sans">End Date</p>
                      <p className="font-semibold font-sans">{format(new Date(campaign.timeline.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {campaign.basicInfo.description && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground font-sans mb-1">Description</p>
                      <p className="text-sm font-sans">{campaign.basicInfo.description}</p>
                    </div>
                  )}

                  {campaign.objectives?.targetAudience && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground font-sans mb-1">Target Audience</p>
                      <p className="text-sm font-sans">{campaign.objectives.targetAudience}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Algorithm Info */}
              {campaign.algorithm && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-sans text-lg">{campaign.algorithm.id === 'package-based' ? 'Package-Based Campaign' : 'AI Campaign Strategy'}</CardTitle>
                      <p className="text-sm font-sans text-muted-foreground">
                        Version {campaign.algorithm.version}
                        {campaign.algorithm.executedAt && (
                          <> • Generated on {format(new Date(campaign.algorithm.executedAt), 'MMM d, yyyy \'at\' h:mm a')}</>
                        )}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-semibold font-sans text-purple-900 mb-2">{campaign.algorithm.name}</p>
                        <div className="bg-white/60 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs font-sans text-purple-700 font-medium mb-1">Strategy Used:</p>
                          <p className="text-sm font-sans text-gray-700">
                            {campaign.algorithm.id === 'all-inclusive' 
                              ? 'This campaign was generated using the All-Inclusive strategy, which prioritizes supporting the entire local news ecosystem by including as many publications as possible while maintaining quality and effectiveness.'
                              : campaign.algorithm.id === 'budget-friendly'
                              ? 'This campaign was generated using the Budget-Friendly strategy, which focuses on maximizing reach and value while staying strictly within budget constraints through cost-effective placements.'
                              : campaign.algorithm.id === 'little-guys'
                              ? 'This campaign was generated using The Little Guys strategy, which champions smaller, independent publications serving tight-knit communities. Perfect for hyper-local campaigns and supporting emerging outlets with highly engaged niche audiences.'
                              : campaign.algorithm.id === 'package-based'
                              ? campaign.algorithm.description || 'This campaign was created from a pre-built hub package with curated publication combinations and pricing.'
                              : 'This campaign was generated using a custom AI strategy tailored to your specific requirements.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Pricing & Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Standard Price</p>
                      <p className="text-lg font-bold">${(campaign.pricing?.subtotal || campaign.pricing?.totalStandardPrice || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Hub Price</p>
                      <p className="text-lg font-bold text-green-600">${(campaign.pricing?.total || campaign.pricing?.totalHubPrice || campaign.pricing?.finalPrice || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Discount</p>
                      <p className="text-lg font-bold text-blue-600">{(campaign.pricing?.hubDiscount || campaign.pricing?.packageDiscount || 0).toFixed(1)}%</p>
                    </div>
                  </div>

                  {campaign.estimatedPerformance && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold font-sans mb-3">Performance Estimates</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Estimated Reach</p>
                          <p className="font-semibold">
                            {campaign.estimatedPerformance.reach?.min?.toLocaleString() || 'N/A'} - {campaign.estimatedPerformance.reach?.max?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Est. Impressions</p>
                          <p className="font-semibold">
                            {campaign.estimatedPerformance.impressions?.min?.toLocaleString() || 'N/A'} - {campaign.estimatedPerformance.impressions?.max?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CPM</p>
                          <p className="font-semibold">${campaign.estimatedPerformance.cpm?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* Creative Assets Tab */}
            <TabsContent value="creative-requirements" className="mt-0">
              <CreativeAssetsManager
                requirements={(() => {
                  // Extract requirements from campaign inventory
                  const allInventoryItems: any[] = [];
                  
                  if (campaign?.selectedInventory?.publications) {
                    campaign.selectedInventory.publications.forEach((pub: any) => {
                      if (pub.inventoryItems) {
                        pub.inventoryItems.forEach((item: any) => {
                          // Skip excluded items
                          if (item.isExcluded) return;
                          
                          allInventoryItems.push({
                            ...item,
                            publicationId: pub.publicationId,
                            publicationName: pub.publicationName,
                            channel: item.channel || 'general'
                          });
                        });
                      }
                    });
                  }
                  
                  const requirements = extractRequirementsForSelectedInventory(allInventoryItems);
                  return requirements;
                })()}
                uploadedAssets={uploadedAssets}
                onAssetsChange={setUploadedAssets}
                campaignId={campaign?.campaignId}
                campaignInfo={{
                  name: campaign?.basicInfo?.name,
                  advertiserName: campaign?.basicInfo?.advertiserName,
                  startDate: campaign?.timeline?.startDate,
                  endDate: campaign?.timeline?.endDate,
                }}
              />
            </TabsContent>

            {/* Insertion Order Tab */}
            <TabsContent value="insertion-order" className="mt-0">
              {/* Publication Orders Alert */}
              {publicationOrders.length === 0 ? (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold font-sans text-amber-900 mb-2">Publication Orders Not Generated</h3>
                        <p className="text-sm text-amber-800 mb-4">
                          Publication insertion orders create individual order records for each publication in this campaign. 
                          Once generated, these orders will be visible to publications in their dashboard where they can review, 
                          confirm, and provide ad specifications.
                        </p>
                        <Button 
                          onClick={handleGeneratePublicationOrders} 
                          disabled={generatingOrders}
                          variant="default"
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          {generatingOrders ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Publication Orders...
                            </>
                          ) : (
                            <>
                              <Package className="mr-2 h-4 w-4" />
                              Generate Publication Orders ({campaign.selectedInventory?.publications?.length || 0} publications)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="mb-6 border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold font-sans text-green-900 mb-1">Publication Orders Generated</h3>
                        <p className="text-sm text-green-800 mb-3">
                          {publicationOrders.length} publication orders have been created and are visible to publications.
                        </p>
                        
                        {/* Placement Status Summary */}
                        {(() => {
                          let totalPlacements = 0;
                          let acceptedCount = 0;
                          let inProductionCount = 0;
                          let deliveredCount = 0;
                          let rejectedCount = 0;
                          
                          publicationOrders.forEach((order: any) => {
                            const statuses = order.placementStatuses || {};
                            const pub = campaign.selectedInventory?.publications?.find((p: any) => p.publicationId === order.publicationId);
                            const placementCount = pub?.inventoryItems?.length || 0;
                            totalPlacements += placementCount;
                            
                            Object.values(statuses).forEach((status: any) => {
                              if (status === 'accepted') acceptedCount++;
                              if (status === 'in_production') inProductionCount++;
                              if (status === 'delivered') deliveredCount++;
                              if (status === 'rejected') rejectedCount++;
                            });
                          });
                          
                          const pendingCount = totalPlacements - acceptedCount - inProductionCount - deliveredCount - rejectedCount;
                          const hasLivePlacements = inProductionCount > 0 || deliveredCount > 0;
                          
                          return (
                            <>
                              <div className="mb-3 grid grid-cols-5 gap-2 text-xs">
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
                              <div className="flex items-center gap-3">
                                <Button 
                                  onClick={() => setShowRegenerateDialog(true)}
                                  disabled={generatingOrders || hasLivePlacements}
                                  variant="outline"
                                  size="sm"
                                  className={hasLivePlacements 
                                    ? "border-gray-300 text-gray-400 cursor-not-allowed" 
                                    : "border-amber-600 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {generatingOrders ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Regenerating...
                                    </>
                                  ) : (
                                    <>
                                      <Package className="mr-2 h-4 w-4" />
                                      Regenerate Publication Orders
                                    </>
                                  )}
                                </Button>
                                {hasLivePlacements && (
                                  <span className="text-xs text-muted-foreground italic">
                                    Cannot regenerate: {inProductionCount + deliveredCount} placement(s) are live
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-6">
                {/* Campaign Info & Objectives */}
                      <div className="border rounded-lg p-6 bg-white space-y-4">
                        {/* Campaign Information */}
                        <div>
                          <h3 className="text-base font-semibold font-sans mb-3">Campaign Information</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground font-sans">Campaign Name</p>
                              <p className="font-semibold font-sans">{campaign.basicInfo.name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-sans">Advertiser</p>
                              <p className="font-semibold font-sans">{campaign.basicInfo.advertiserName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-sans">Start Date</p>
                              <p className="font-semibold font-sans">{format(new Date(campaign.timeline.startDate), 'MMM d, yyyy')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-sans">End Date</p>
                              <p className="font-semibold font-sans">{format(new Date(campaign.timeline.endDate), 'MMM d, yyyy')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-sans">Duration</p>
                              <p className="font-semibold font-sans">{campaign.timeline.durationMonths} {campaign.timeline.durationMonths === 1 ? 'month' : 'months'} ({campaign.timeline.durationWeeks} weeks)</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-sans">Total Investment</p>
                              <p className="font-semibold font-sans text-blue-600">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Campaign Objectives */}
                        {campaign.objectives && (
                          <div className="border-t pt-4">
                            <h3 className="text-base font-semibold font-sans mb-3">Campaign Objectives</h3>
                            <div className="grid grid-cols-2 gap-4">
                              {campaign.objectives.primaryGoal && (
                                <div>
                                  <p className="text-sm text-muted-foreground font-sans mb-1">Primary Goal</p>
                                  <p className="text-sm font-semibold font-sans capitalize">{campaign.objectives.primaryGoal}</p>
                                </div>
                              )}
                              {campaign.objectives.targetAudience && (
                                <div>
                                  <p className="text-sm text-muted-foreground font-sans mb-1">Target Audience</p>
                                  <p className="text-sm font-sans">{campaign.objectives.targetAudience}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selected Publications & Inventory */}
                      <div className="border rounded-lg p-6">
                        <div className="flex items-baseline justify-between mb-4">
                          <h3 className="text-base font-semibold font-sans">Selected Publications & Inventory</h3>
                          <span className="text-sm text-muted-foreground">
                            {campaign.selectedInventory?.totalInventoryItems || 
                              (campaign.selectedInventory?.publications || []).reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) ||
                              0} placements across{' '}
                            {campaign.selectedInventory?.totalPublications || (campaign.selectedInventory?.publications || []).length || 0} publications
                          </span>
                        </div>
                        
                        <div className="space-y-6">
                          {(campaign.selectedInventory?.publications || []).map((pub) => (
                            <Card key={pub.publicationId} className="bg-white">
                              <CardContent className="p-0">
                                <Table>
                                  <TableHeader>
                                    {/* Publication Header Row */}
                                    <TableRow className="border-b bg-gray-50/50 hover:bg-gray-50/50">
                                      <TableHead colSpan={4} className="py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-foreground text-base">{pub.publicationName}</span>
                                            <span className="text-xs text-muted-foreground font-normal">
                                              {pub.inventoryItems?.length || 0} placements
                                            </span>
                                          </div>
                                          {(() => {
                                            const pubOrder = publicationOrders.find((o: any) => o.publicationId === pub.publicationId);
                                            if (!pubOrder) return null;
                                            
                                            // Check if any placements are live
                                            const statuses = Object.values(pubOrder.placementStatuses || {});
                                            const hasLivePlacements = statuses.some(
                                              (s: any) => s === 'in_production' || s === 'delivered'
                                            );
                                            
                                            return hasLivePlacements ? (
                                              <span className="text-xs text-muted-foreground italic">
                                                (Has live placements)
                                              </span>
                                            ) : (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setRescindTarget({ 
                                                  publicationId: pub.publicationId, 
                                                  publicationName: pub.publicationName 
                                                })}
                                              >
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Rescind Order
                                              </Button>
                                            );
                                          })()}
                                        </div>
                                      </TableHead>
                                      <TableHead colSpan={2} className="py-4 text-right">
                                        {pub.publicationTotal && (
                                          <div className="flex items-baseline justify-end gap-2">
                                            <span className="text-xs text-muted-foreground font-normal">Total</span>
                                            <span className="font-semibold text-foreground text-base">
                                              ${pub.publicationTotal.toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                      </TableHead>
                                    </TableRow>
                                    {/* Column Labels Row */}
                                    <TableRow>
                                      <TableHead className="w-[10%]">Channel</TableHead>
                                      <TableHead className="w-[28%]">Ad Placement</TableHead>
                                      <TableHead className="w-[12%] text-center">Quantity</TableHead>
                                      <TableHead className="w-[16%] text-center">Audience</TableHead>
                                      <TableHead className="w-[11%] text-right">Unit Cost</TableHead>
                                      <TableHead className="w-[11%] text-right">Total</TableHead>
                                      <TableHead className="w-[12%] text-center">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                    <TableBody>
                                      {(pub.inventoryItems || []).map((item, idx) => {
                                        const rate = item.itemPricing?.hubPrice || 0;
                                        const currentFreq = (item as any).currentFrequency || item.quantity || 1;
                                        
                                        // Calculate line total using shared utility
                                        const lineTotal = calculateItemCost(item, currentFreq, 1);
                                        
                                        // Use standardized formatting utilities (same as packages)
                                        const quantityDisplay = formatInsertionOrderQuantity(item);
                                        
                                        // Prepare metrics for audience formatting
                                        const performanceMetrics = {
                                          impressionsPerMonth: (item as any).monthlyImpressions,
                                          audienceSize: item.audienceMetrics?.subscribers || item.audienceMetrics?.listeners || item.audienceMetrics?.viewers || (item as any).circulation,
                                          guaranteed: (item.performanceMetrics as any)?.guaranteed || false
                                        };
                                        
                                        const channelMetrics = {
                                          monthlyVisitors: item.audienceMetrics?.monthlyVisitors,
                                          subscribers: item.audienceMetrics?.subscribers,
                                          circulation: (item as any).circulation,
                                          listeners: item.audienceMetrics?.listeners,
                                          viewers: item.audienceMetrics?.viewers
                                        };
                                        
                                        // Format audience with badge using utility
                                        const audienceInfo = formatInsertionOrderAudienceWithBadge(item, performanceMetrics, channelMetrics);
                                        
                                        // Get placement status from publication order if exists
                                        const publicationOrder = publicationOrders.find((order: any) => order.publicationId === pub.publicationId);
                                        const placementId = item.itemPath || item.sourcePath || `placement-${idx}`;
                                        const placementStatus = publicationOrder?.placementStatuses?.[placementId] || 'pending';
                                        
                                        return (
                                          <TableRow 
                                            key={idx} 
                                            className={cn(
                                              "hover:bg-gray-50 transition-colors",
                                              placementStatus === 'delivered' && "bg-purple-50/50",
                                              placementStatus === 'in_production' && "bg-blue-50/50",
                                              placementStatus === 'accepted' && "bg-green-50/50",
                                              placementStatus === 'rejected' && "bg-red-50/50"
                                            )}
                                          >
                                            <TableCell>
                                              <Badge variant="secondary" className="capitalize text-xs">
                                                {item.channel}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{item.itemName}</span>
                                                {placementStatus === 'delivered' && (
                                                  <Badge className="bg-purple-600 text-white text-xs">✓ Delivered</Badge>
                                                )}
                                                {placementStatus === 'in_production' && (
                                                  <Badge className="bg-blue-600 text-white text-xs">⚙ In Production</Badge>
                                                )}
                                                {placementStatus === 'accepted' && (
                                                  <Badge className="bg-green-600 text-white text-xs">✓ Accepted</Badge>
                                                )}
                                                {placementStatus === 'rejected' && (
                                                  <Badge className="bg-red-600 text-white text-xs">✗ Rejected</Badge>
                                                )}
                                                {placementStatus === 'pending' && publicationOrder && (
                                                  <Badge variant="outline" className="text-xs">Pending</Badge>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center text-sm text-muted-foreground">
                                              {quantityDisplay}
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: audienceInfo }}>
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                              ${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-semibold">
                                              ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {publicationOrder && !['in_production', 'delivered'].includes(placementStatus) && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                  onClick={() => setRescindPlacementTarget({
                                                    publicationId: pub.publicationId,
                                                    publicationName: pub.publicationName,
                                                    placementId,
                                                    placementName: item.itemName
                                                  })}
                                                >
                                                  <XCircle className="h-3 w-3 mr-1" />
                                                  Remove
                                                </Button>
                                              )}
                                              {['in_production', 'delivered'].includes(placementStatus) && (
                                                <span className="text-xs text-muted-foreground">Live</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                          ))}
                        </div>
                      </div>

                      {/* Performance & Investment Summary */}
                      <div className="border rounded-lg p-6 bg-white space-y-6">
                        {/* Estimated Performance */}
                        {campaign.estimatedPerformance && (
                          <div>
                            <h3 className="text-base font-semibold font-sans mb-4">Estimated Performance</h3>
                            <div className="grid grid-cols-3 gap-4">
                              {campaign.estimatedPerformance.reach && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Estimated Reach</p>
                                  <p className="text-lg font-semibold">
                                    {campaign.estimatedPerformance.reach.min?.toLocaleString()} - {campaign.estimatedPerformance.reach.max?.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {campaign.estimatedPerformance.impressions && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Estimated Impressions</p>
                                  <p className="text-lg font-semibold">
                                    {campaign.estimatedPerformance.impressions.min?.toLocaleString()} - {campaign.estimatedPerformance.impressions.max?.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {campaign.estimatedPerformance.cpm && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Cost Per Thousand (CPM)</p>
                                  <p className="text-lg font-semibold">${campaign.estimatedPerformance.cpm.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Divider */}
                        <hr className="border-t" />

                        {/* Investment Summary */}
                        <Card className="bg-white">
                          <CardContent className="p-0">
                            {/* Header */}
                            <div className="flex justify-between items-center px-4 py-3 bg-gray-50/50 border-b">
                              <span className="font-semibold text-foreground text-base">Investment Summary</span>
                            </div>
                            {/* Content */}
                            <div className="px-4 py-3 space-y-3">
                              {(campaign.pricing?.monthlyTotal || campaign.pricing?.monthlyPrice) && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Monthly Total</span>
                                  <span className="font-medium">${(campaign.pricing?.monthlyTotal || campaign.pricing?.monthlyPrice || 0).toLocaleString()}</span>
                                </div>
                              )}
                              {campaign.timeline.durationMonths && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Campaign Duration</span>
                                  <span className="font-medium">{campaign.timeline.durationMonths} {campaign.timeline.durationMonths === 1 ? 'month' : 'months'}</span>
                                </div>
                              )}
                            </div>
                            {/* Total Row */}
                            <div className="flex justify-between items-center px-4 py-3 bg-gray-50/50 border-t">
                              <span className="font-semibold text-sm">Total Campaign Investment</span>
                              <span className="font-bold text-base">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="mt-0">
              <CampaignPerformanceDashboard
                campaignId={campaign.campaignId || id || ''}
                campaignName={campaign.basicInfo?.name}
                startDate={campaign.timeline?.startDate ? new Date(campaign.timeline.startDate) : undefined}
                endDate={campaign.timeline?.endDate ? new Date(campaign.timeline.endDate) : undefined}
              />
            </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>

        {/* Regenerate Orders Confirmation Dialog */}
        <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate Publication Orders?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will <strong>delete all existing publication orders</strong> and create new ones. This action:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Resets all placement statuses to "Pending"</li>
                  <li>Removes any messages/conversations with publications</li>
                  <li>Clears confirmation dates and status history</li>
                  <li>Publications will see new orders and need to re-confirm</li>
                </ul>
                <p className="text-amber-600 font-medium mt-3">This cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRegenerateOrders}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {generatingOrders ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  'Yes, Regenerate Orders'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rescind Order Confirmation Dialog */}
        <AlertDialog open={!!rescindTarget} onOpenChange={(open) => !open && setRescindTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rescind Publication Order?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will remove the insertion order for <strong>{rescindTarget?.publicationName}</strong>.</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>The publication will no longer see this order</li>
                  <li>Any confirmations or status updates will be lost</li>
                  <li>Messages with this publication will be removed</li>
                </ul>
                <p className="text-amber-600 font-medium mt-3">You can regenerate orders later if needed.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRescindOrder}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Rescind Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rescind Placement Confirmation Dialog */}
        <AlertDialog open={!!rescindPlacementTarget} onOpenChange={(open) => !open && setRescindPlacementTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Placement?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will remove <strong>"{rescindPlacementTarget?.placementName}"</strong> from <strong>{rescindPlacementTarget?.publicationName}</strong>'s order.</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>The placement will be removed from the order</li>
                  <li>Order total will be adjusted accordingly</li>
                  <li>The publication will be notified</li>
                </ul>
                <p className="text-muted-foreground text-sm mt-3">Other placements in this order will remain unchanged.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRescindPlacement}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Remove Placement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Activity Log Dialog */}
        <ActivityLogDialog
          isOpen={showActivityLog}
          onClose={() => setShowActivityLog(false)}
          sectionName="Campaign"
          activityTypes={['campaign_create', 'campaign_update', 'campaign_delete']}
          hubId={campaign?.hubId}
        />
      </div>
    </ProtectedRoute>
  );
}

