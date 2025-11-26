/**
 * Campaign Detail Page
 * 
 * Displays full campaign details with insertion order viewer
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useCampaign, useGenerateInsertionOrder, useUpdateCampaignStatus, useDeleteCampaign, useGeneratePublicationOrders } from '@/hooks/useCampaigns';
import { format } from 'date-fns';
import { 
  Download, 
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
  Bot
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { API_BASE_URL } from '@/config/api';
import { CreativeRequirementsChecklist } from '@/components/campaign/CreativeRequirementsChecklist';
import { CampaignCreativeAssetsUploader } from '@/components/campaign/CampaignCreativeAssetsUploader';
import { extractRequirementsForSelectedInventory } from '@/utils/creativeSpecsExtractor';
import { formatInsertionOrderQuantity, formatInsertionOrderAudienceWithBadge } from '@/utils/insertionOrderFormatting';
import { calculateItemCost } from '@/utils/inventoryPricing';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { campaign, loading, refetch } = useCampaign(id || null);
  const { generate, generating } = useGenerateInsertionOrder();
  const { generateOrders, generating: generatingOrders } = useGeneratePublicationOrders();
  const { updateStatus, updating } = useUpdateCampaignStatus();
  const { deleteCampaign, deleting } = useDeleteCampaign();
  const [ioFormat, setIoFormat] = useState<'html' | 'markdown'>('html');
  const [uploadedAssets, setUploadedAssets] = useState<Map<string, any>>(new Map());

  const handleGenerateIO = async () => {
    if (!id) return;
    
    try {
      const result = await generate(id, ioFormat);
      toast({
        title: 'Insertion Order Generated',
        description: `IO has been generated successfully in ${ioFormat.toUpperCase()} format.`,
      });
      refetch(); // Refresh campaign data
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate insertion order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGeneratePublicationOrders = async () => {
    if (!id) return;
    
    try {
      const result = await generateOrders(id);
      toast({
        title: 'Publication Orders Generated',
        description: `${result.ordersGenerated} publication insertion orders have been created and are now visible to publications.`,
      });
      refetch(); // Refresh campaign data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate publication orders';
      toast({
        title: 'Generation Failed',
        description: errorMessage,
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


  const downloadInsertionOrder = () => {
    if (!campaign?.insertionOrder) return;
    
    const blob = new Blob([campaign.insertionOrder.content], { 
      type: campaign.insertionOrder.format === 'html' ? 'text/html' : 'text/markdown' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insertion-order-${campaign.basicInfo.name.replace(/\s+/g, '-').toLowerCase()}.${campaign.insertionOrder.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <Header onAssistantClick={() => {}} onSurveyClick={() => {}} showDashboardNav={true} />
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
        <Header onAssistantClick={() => {}} onSurveyClick={() => {}} showDashboardNav={true} />
        
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

              {/* Header */}
              <div className="mb-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{campaign.basicInfo.name}</h1>
                    <p className="text-muted-foreground mb-2">
                      {campaign.basicInfo.advertiserName}
                    </p>
                    {campaign.algorithm && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">
                          {campaign.algorithm.id === 'all-inclusive' ? '🌍' : 
                           campaign.algorithm.id === 'budget-friendly' ? '💰' : 
                           campaign.algorithm.id === 'little-guys' ? '🏘️' : '✨'}
                        </span>
                        <span className="text-sm text-purple-700 font-medium bg-purple-100 px-2 py-1 rounded-md">
                          {campaign.algorithm.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Badge className={STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS]}>
                    {STATUS_LABELS[campaign.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Investment</p>
                    <p className="text-xl font-bold">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Publications</p>
                    <p className="text-xl font-bold">{campaign.selectedInventory?.totalPublications || campaign.selectedInventory?.publications?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Placements</p>
                    <p className="text-xl font-bold">{campaign.selectedInventory?.totalInventoryItems || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Reach</p>
                    <p className="text-xl font-bold">
                      {campaign.estimatedPerformance?.reach?.min?.toLocaleString() || 'N/A'}+
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-xl font-bold">{campaign.timeline.durationMonths} months</p>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="creative-requirements">Creative Requirements</TabsTrigger>
              <TabsTrigger value="insertion-order">Insertion Order</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Campaign Name</p>
                      <p className="font-semibold">{campaign.basicInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Advertiser</p>
                      <p className="font-semibold">{campaign.basicInfo.advertiserName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Primary Goal</p>
                      <p className="font-semibold capitalize">{campaign.objectives?.primaryGoal || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hub</p>
                      <p className="font-semibold">{campaign.hubName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-semibold">{format(new Date(campaign.timeline.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-semibold">{format(new Date(campaign.timeline.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {campaign.basicInfo.description && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{campaign.basicInfo.description}</p>
                    </div>
                  )}

                  {campaign.objectives?.targetAudience && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Target Audience</p>
                      <p className="text-sm">{campaign.objectives.targetAudience}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Algorithm Info */}
              {campaign.algorithm && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {campaign.algorithm.id === 'all-inclusive' ? '🌍' : 
                         campaign.algorithm.id === 'budget-friendly' ? '💰' : 
                         campaign.algorithm.id === 'little-guys' ? '🏘️' : 
                         campaign.algorithm.id === 'package-based' ? '📦' : '✨'}
                      </span>
                      <CardTitle>{campaign.algorithm.id === 'package-based' ? 'Package-Based Campaign' : 'AI Campaign Strategy'}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-purple-900 mb-1">{campaign.algorithm.name}</p>
                        <p className="text-sm text-purple-800 mb-2">
                          Version {campaign.algorithm.version}
                          {campaign.algorithm.executedAt && (
                            <> • Generated on {format(new Date(campaign.algorithm.executedAt), 'MMM d, yyyy \'at\' h:mm a')}</>
                          )}
                        </p>
                        <div className="bg-white/60 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs text-purple-700 font-medium mb-1">Strategy Used:</p>
                          <p className="text-sm text-gray-700">
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
                  <CardTitle>Pricing & Performance</CardTitle>
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
                      <h4 className="font-semibold mb-3">Performance Estimates</h4>
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

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Status Update Actions */}
                    <div className="flex flex-wrap gap-2">
                      {campaign.status === 'draft' && (
                        <Button
                          onClick={() => handleStatusUpdate('pending_review')}
                          disabled={updating}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Submit for Review
                        </Button>
                      )}
                      {campaign.status === 'pending_review' && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate('approved')}
                            disabled={updating}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleStatusUpdate('rejected')}
                            disabled={updating}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}
                      {campaign.status === 'approved' && (
                        <Button
                          onClick={() => handleStatusUpdate('active')}
                          disabled={updating}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Active
                        </Button>
                      )}
                    </div>

                    {/* Delete Campaign Button with Warning */}
                    <div className="pt-3 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={deleting}
                            className="w-full sm:w-auto"
                          >
                            {deleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Campaign
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
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Creative Assets Tab */}
            <TabsContent value="creative-requirements">
              <div className="space-y-6">
                {/* Requirements Overview - Collapsible */}
                <CreativeRequirementsChecklist 
                  campaign={campaign}
                  compact={true}
                  uploadedAssets={uploadedAssets}
                />
                
                {/* Asset Upload & Management */}
                <CampaignCreativeAssetsUploader
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
                />
              </div>
            </TabsContent>

            {/* Insertion Order Tab */}
            <TabsContent value="insertion-order">
              {/* Publication Orders Alert */}
              {!campaign.publicationInsertionOrders || campaign.publicationInsertionOrders.length === 0 ? (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-900 mb-2">Publication Orders Not Generated</h3>
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
                        <h3 className="font-semibold text-green-900 mb-1">Publication Orders Generated</h3>
                        <p className="text-sm text-green-800 mb-3">
                          {campaign.publicationInsertionOrders.length} publication orders have been created and are visible to publications.
                        </p>
                        
                        {/* Placement Status Summary */}
                        <div className="mb-3 grid grid-cols-5 gap-2 text-xs">
                          {(() => {
                            let totalPlacements = 0;
                            let acceptedCount = 0;
                            let inProductionCount = 0;
                            let deliveredCount = 0;
                            let rejectedCount = 0;
                            
                            campaign.publicationInsertionOrders.forEach((order: any) => {
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
                            
                            return (
                              <>
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
                              </>
                            );
                          })()}
                        </div>
                        <Button 
                          onClick={async () => {
                            if (!id) return;
                            // Delete existing orders first
                            try {
                              const token = localStorage.getItem('auth_token');
                              await fetch(`${API_BASE_URL}/admin/orders/${id}/publication-orders`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              // Then regenerate
                              await handleGeneratePublicationOrders();
                            } catch (error) {
                              console.error('Error regenerating publication orders:', error);
                              toast({
                                title: 'Regeneration Failed',
                                description: 'Failed to regenerate publication orders. Please try again.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={generatingOrders}
                          variant="outline"
                          size="sm"
                          className="border-green-600 text-green-700 hover:bg-green-100"
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Insertion Order</CardTitle>
                      <CardDescription>
                        Professional insertion order document for this campaign
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {!campaign.insertionOrder && (
                        <div className="flex gap-2">
                          <select
                            value={ioFormat}
                            onChange={(e) => setIoFormat(e.target.value as 'html' | 'markdown')}
                            className="border rounded px-3 py-1 text-sm"
                          >
                            <option value="html">HTML</option>
                            <option value="markdown">Markdown</option>
                          </select>
                          <Button onClick={handleGenerateIO} disabled={generating}>
                            {generating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate IO
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {campaign.insertionOrder && (
                        <>
                          <Button onClick={handleGenerateIO} disabled={generating} variant="outline">
                            {generating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-2 h-4 w-4" />
                                Regenerate
                              </>
                            )}
                          </Button>
                          <Button onClick={downloadInsertionOrder}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.insertionOrder ? (
                    <div className="space-y-6">
                      {/* Campaign Info Section */}
                      <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <h3 className="text-xl font-bold mb-4">Campaign Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Campaign Name</p>
                            <p className="text-base font-semibold">{campaign.basicInfo.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Advertiser</p>
                            <p className="text-base font-semibold">{campaign.basicInfo.advertiserName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Start Date</p>
                            <p className="text-base">{new Date(campaign.timeline.startDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">End Date</p>
                            <p className="text-base">{new Date(campaign.timeline.endDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Duration</p>
                            <p className="text-base">{campaign.timeline.durationMonths} {campaign.timeline.durationMonths === 1 ? 'month' : 'months'} ({campaign.timeline.durationWeeks} weeks)</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Investment</p>
                            <p className="text-xl font-bold text-blue-600">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Objectives */}
                      {campaign.objectives && (
                        <div className="border rounded-lg p-6">
                          <h3 className="text-lg font-bold mb-4">Campaign Objectives</h3>
                          <div className="space-y-3">
                            {campaign.objectives.primaryGoal && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">Primary Goal</p>
                                <p className="text-base">{campaign.objectives.primaryGoal}</p>
                              </div>
                            )}
                            {campaign.objectives.targetAudience && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">Target Audience</p>
                                <p className="text-base">{campaign.objectives.targetAudience}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Selected Publications & Inventory */}
                      <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4">Selected Publications & Inventory</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {campaign.selectedInventory?.totalInventoryItems || 
                            (campaign.selectedInventory?.publications || []).reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) ||
                            0} placements across{' '}
                          {campaign.selectedInventory?.totalPublications || (campaign.selectedInventory?.publications || []).length || 0} publications
                        </p>
                        
                        <div className="space-y-4">
                          {(campaign.selectedInventory?.publications || []).map((pub) => (
                            <div key={pub.publicationId} className="border-2 border-gray-300 rounded-lg p-5 bg-gradient-to-r from-gray-50 to-white shadow-sm">
                              <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-gray-200">
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg text-gray-900">{pub.publicationName}</h4>
                                  <Badge variant="outline" className="mt-2">
                                    {pub.inventoryItems?.length || 0} ad placements
                                  </Badge>
                                </div>
                                {pub.publicationTotal && (
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Publication Total</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                      ${pub.publicationTotal.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <table className="w-full text-sm">
                                <thead className="bg-white">
                                  <tr className="border-b-2 border-gray-300">
                                    <th className="text-left py-3 px-3 font-bold">Channel</th>
                                    <th className="text-left py-3 px-3 font-bold">Ad Placement</th>
                                    <th className="text-center py-3 px-3 font-bold">Quantity</th>
                                    <th className="text-center py-3 px-3 font-bold">Audience Estimate</th>
                                    <th className="text-right py-3 px-3 font-bold">Item Cost</th>
                                    <th className="text-right py-3 px-3 font-bold">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
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
                                    const publicationOrder = campaign.publicationInsertionOrders?.find((order: any) => order.publicationId === pub.publicationId);
                                    const placementId = item.itemPath || item.sourcePath || `placement-${idx}`;
                                    const placementStatus = publicationOrder?.placementStatuses?.[placementId] || 'pending';
                                    
                                    return (
                                      <tr key={idx} className={cn(
                                        "border-b last:border-0 hover:bg-blue-50",
                                        placementStatus === 'delivered' && "bg-purple-50/50",
                                        placementStatus === 'in_production' && "bg-blue-50/50",
                                        placementStatus === 'accepted' && "bg-green-50/50",
                                        placementStatus === 'rejected' && "bg-red-50/50"
                                      )}>
                                        <td className="py-3 px-3">
                                          <Badge variant="secondary" className="capitalize text-xs">
                                            {item.channel}
                                          </Badge>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.itemName}</span>
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
                                        </td>
                                        <td className="py-3 px-3 text-center text-gray-600">
                                          {quantityDisplay}
                                        </td>
                                        <td className="py-3 px-3 text-center text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: audienceInfo }}>
                                        </td>
                                        <td className="py-3 px-3 text-right text-gray-600">
                                          ${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-right font-bold text-green-600">
                                          ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Performance Estimates */}
                      {campaign.estimatedPerformance && (
                        <div className="border rounded-lg p-6 bg-green-50">
                          <h3 className="text-lg font-bold mb-4">Estimated Performance</h3>
                          <div className="grid grid-cols-3 gap-4">
                            {campaign.estimatedPerformance.reach && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">Estimated Reach</p>
                                <p className="text-lg font-semibold">
                                  {campaign.estimatedPerformance.reach.min?.toLocaleString()} - {campaign.estimatedPerformance.reach.max?.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {campaign.estimatedPerformance.impressions && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">Estimated Impressions</p>
                                <p className="text-lg font-semibold">
                                  {campaign.estimatedPerformance.impressions.min?.toLocaleString()} - {campaign.estimatedPerformance.impressions.max?.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {campaign.estimatedPerformance.cpm && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">Cost Per Thousand (CPM)</p>
                                <p className="text-lg font-semibold">${campaign.estimatedPerformance.cpm.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Investment Summary */}
                      <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50">
                        <h3 className="text-lg font-bold mb-4">Investment Summary</h3>
                        <div className="space-y-2">
                          {(campaign.pricing?.monthlyTotal || campaign.pricing?.monthlyPrice) && (
                            <div className="flex justify-between text-base">
                              <span className="font-medium">Monthly Total:</span>
                              <span className="font-semibold">${(campaign.pricing?.monthlyTotal || campaign.pricing?.monthlyPrice || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {campaign.timeline.durationMonths && (
                            <div className="flex justify-between text-base">
                              <span className="font-medium">Campaign Duration:</span>
                              <span className="font-semibold">{campaign.timeline.durationMonths} {campaign.timeline.durationMonths === 1 ? 'month' : 'months'}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xl pt-3 border-t border-purple-200">
                            <span className="font-bold">Total Campaign Investment:</span>
                            <span className="font-bold text-purple-600">${(campaign.pricing?.total || campaign.pricing?.finalPrice || campaign.pricing?.totalHubPrice || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No insertion order generated yet
                      </p>
                      <Button onClick={handleGenerateIO} disabled={generating}>
                        {generating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Insertion Order
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

