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
  ArrowLeft, 
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
  Edit,
  Save,
  X as CloseIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { HubPackagePublication } from '@/integrations/mongodb/hubPackageSchema';
import { API_BASE_URL } from '@/config/api';
import { CreativeRequirementsChecklist } from '@/components/campaign/CreativeRequirementsChecklist';

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
  const [isEditingInventory, setIsEditingInventory] = useState(false);
  const [editedPublications, setEditedPublications] = useState<HubPackagePublication[] | null>(null);
  const [savingInventory, setSavingInventory] = useState(false);

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

  const handleEditInventoryClick = () => {
    if (campaign?.selectedInventory?.publications) {
      setEditedPublications(campaign.selectedInventory.publications as HubPackagePublication[]);
      setIsEditingInventory(true);
    }
  };

  const handleCancelEditInventory = () => {
    setIsEditingInventory(false);
    setEditedPublications(null);
  };

  const handleSaveInventory = async () => {
    if (!id || !editedPublications) return;

    setSavingInventory(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}/inventory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          publications: editedPublications,
          recalculatePricing: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update inventory');
      }

      toast({
        title: 'Inventory Updated',
        description: 'Campaign inventory has been updated successfully.',
      });

      // Refetch campaign data
      refetch();
      setIsEditingInventory(false);
      setEditedPublications(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update campaign inventory. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingInventory(false);
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
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-800">Campaign not found</p>
                <Button onClick={() => navigate('/hubcentral?tab=campaigns')} className="mt-4">
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
        
        <main className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/hubcentral?tab=campaigns')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
            
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
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
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
                    {/* Edit Inventory Button */}
                    {(campaign.status === 'draft' || campaign.status === 'pending_review') && (
                      <div className="pb-3 border-b">
                        <Button
                          onClick={handleEditInventoryClick}
                          disabled={isEditingInventory}
                          className="w-full sm:w-auto"
                          variant="outline"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Inventory
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adjust publication volumes and frequencies to manage costs
                        </p>
                      </div>
                    )}

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

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              {isEditingInventory && editedPublications ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Edit Inventory</CardTitle>
                        <CardDescription>
                          Adjust publication volumes and frequencies to manage costs
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveInventory}
                          disabled={savingInventory}
                        >
                          {savingInventory ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEditInventory}
                          disabled={savingInventory}
                        >
                          <CloseIcon className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <InventoryEditor
                      publications={editedPublications}
                      originalPublications={campaign.selectedInventory?.publications as HubPackagePublication[]}
                      budget={campaign.objectives?.budget?.totalBudget || campaign.objectives?.budget?.monthlyBudget}
                      duration={campaign.timeline?.durationMonths || 1}
                      onChange={setEditedPublications}
                      showSummary={true}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Inventory</CardTitle>
                    <CardDescription>
                      {campaign.selectedInventory?.totalInventoryItems || 
                        (campaign.selectedInventory?.publications || []).reduce((sum, pub) => sum + (pub.inventoryItems?.length || 0), 0) ||
                        0} placements across{' '}
                      {campaign.selectedInventory?.totalPublications || (campaign.selectedInventory?.publications || []).length || 0} publications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                              <p className="text-3xl font-bold text-blue-600">
                                ${pub.publicationTotal.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(pub.inventoryItems || []).map((item, idx) => (
                            <div key={idx} className="border border-gray-200 bg-white hover:bg-gray-50 p-4 rounded-lg transition-colors">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  {/* Item Name - Make it prominent */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-semibold text-base text-gray-900">{item.itemName}</h5>
                                    {/* Channel badge */}
                                    <Badge variant="secondary" className="capitalize">
                                      {item.channel}
                                    </Badge>
                                  </div>
                                  
                                  {/* Key details */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Qty:</span> {item.quantity}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Frequency:</span> {item.frequency || 'One-time'}
                                    </span>
                                    {item.duration && (
                                      <span className="flex items-center gap-1">
                                        <span className="font-medium">Duration:</span> {item.duration}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Cost Calculation */}
                                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                                    <p className="text-xs font-semibold text-blue-900 mb-1">Cost Calculation:</p>
                                    <div className="text-xs text-blue-800 space-y-0.5">
                                      {item.itemPricing?.pricingModel === 'cpm' && (
                                        <>
                                          <div>Base CPM Rate: ${item.itemPricing.hubPrice}</div>
                                          <div>Monthly Impressions: {((item as any).monthlyImpressions)?.toLocaleString() || 'N/A'}</div>
                                          <div>Campaign Duration: {item.duration || 'N/A'}</div>
                                          {(item as any).monthlyCost && (
                                            <div>Monthly Cost: ${((item as any).monthlyCost).toLocaleString()}</div>
                                          )}
                                          <div className="font-semibold pt-1 border-t border-blue-200">
                                            Campaign Total: ${(item.itemPricing.totalCost || (item as any).campaignCost || 0).toLocaleString()}
                                          </div>
                                        </>
                                      )}
                                      {item.itemPricing?.pricingModel === 'per_send' && (
                                        <>
                                          <div>Rate per send: ${item.itemPricing.hubPrice}</div>
                                          <div>Number of sends: {item.quantity}</div>
                                          <div>Frequency: {item.frequency || 'one-time'}</div>
                                          <div className="font-semibold pt-1 border-t border-blue-200">
                                            Campaign Total: ${(item.itemPricing.totalCost || (item.quantity * item.itemPricing.hubPrice)).toLocaleString()}
                                          </div>
                                        </>
                                      )}
                                      {item.itemPricing?.pricingModel === 'flat' && (
                                        <>
                                          <div>Flat rate for {item.duration || 'campaign duration'}</div>
                                          <div className="font-semibold pt-1 border-t border-blue-200">
                                            Campaign Total: ${(item.itemPricing.totalCost || item.itemPricing.hubPrice).toLocaleString()}
                                          </div>
                                        </>
                                      )}
                                      {item.itemPricing?.pricingModel === 'per_ad' && (
                                        <>
                                          <div>Rate per ad: ${item.itemPricing.hubPrice}</div>
                                          <div>Number of ads: {item.quantity}</div>
                                          <div className="font-semibold pt-1 border-t border-blue-200">
                                            Campaign Total: ${(item.itemPricing.totalCost || (item.quantity * item.itemPricing.hubPrice)).toLocaleString()}
                                          </div>
                                        </>
                                      )}
                                      {item.itemPricing?.pricingModel === 'per_week' && (
                                        <>
                                          <div>Rate per week: ${item.itemPricing.hubPrice}</div>
                                          <div>Number of weeks: {item.quantity}</div>
                                          <div className="font-semibold pt-1 border-t border-blue-200">
                                            Campaign Total: ${(item.itemPricing.totalCost || (item.quantity * item.itemPricing.hubPrice)).toLocaleString()}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Specifications */}
                                  {item.specifications && Object.keys(item.specifications).length > 0 && (
                                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                      {Object.entries(item.specifications)
                                        .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                                        .map(([key, value]) => (
                                          <span key={key} className="inline-block mr-3 mb-1">
                                            <span className="font-medium">{key}:</span> {String(value)}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Pricing section - PHASE 4: Display calculated values */}
                                <div className="text-right flex-shrink-0">
                                  {(() => {
                                    // Try to use pre-calculated values first
                                    let totalCost = item.itemPricing?.totalCost || (item as any).campaignCost;
                                    
                                    // If not available, calculate on-the-fly using shared utility
                                    if (totalCost === undefined || totalCost === null || totalCost === 0) {
                                      try {
                                        const { calculateItemCost } = require('@/utils/inventoryPricing');
                                        const frequency = (item as any).currentFrequency || (item as any).quantity || 1;
                                        
                                        // Check if item has proper pricing structure
                                        if (!item.itemPricing || !item.itemPricing.hubPrice) {
                                          console.warn('Item missing pricing data:', {
                                            itemName: item.itemName,
                                            hasItemPricing: !!item.itemPricing,
                                            hubPrice: item.itemPricing?.hubPrice,
                                            pricingModel: item.itemPricing?.pricingModel,
                                            fullItem: item
                                          });
                                          
                                          // Try to use standardPrice as fallback
                                          const fallbackPrice = item.itemPricing?.standardPrice || (item as any).standardPrice;
                                          if (fallbackPrice) {
                                            totalCost = fallbackPrice * frequency;
                                            console.log('Using fallback standardPrice calculation:', totalCost);
                                          } else {
                                            totalCost = 0;
                                          }
                                        } else {
                                          totalCost = calculateItemCost(item, frequency);
                                          
                                          if (totalCost === 0) {
                                            console.warn('Calculated cost is 0 for item:', item.itemName);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error calculating item cost:', error);
                                        totalCost = 0;
                                      }
                                    }
                                    
                                    return (
                                      <>
                                        <p className="text-xs text-gray-500 mb-1">Item Total</p>
                                        <p className="text-2xl font-bold text-green-600">
                                          ${(totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              )}
            </TabsContent>

            {/* Creative Requirements Tab */}
            <TabsContent value="creative-requirements">
              <CreativeRequirementsChecklist 
                campaign={campaign}
                onUploadAssets={() => {
                  toast({
                    title: 'Coming Soon',
                    description: 'Creative asset upload functionality will be available soon.',
                  });
                }}
              />
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
                        <p className="text-sm text-green-800">
                          {campaign.publicationInsertionOrders.length} publication orders have been created and are visible to publications.
                        </p>
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
                        <Button onClick={downloadInsertionOrder}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
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
                                    <th className="text-center py-3 px-3 font-bold">Duration</th>
                                    <th className="text-right py-3 px-3 font-bold">Item Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(pub.inventoryItems || []).map((item, idx) => {
                                    // Calculate item total
                                    let itemTotal = 0;
                                    const model = item.itemPricing?.pricingModel;
                                    const rate = item.itemPricing?.hubPrice || 0;
                                    const qty = item.quantity || 0;
                                    
                                    if (model === 'cpm') {
                                      itemTotal = (qty / 1000) * rate;
                                    } else if (model === 'flat') {
                                      itemTotal = rate;
                                    } else {
                                      itemTotal = qty * rate;
                                    }
                                    
                                    return (
                                      <tr key={idx} className="border-b last:border-0 hover:bg-blue-50">
                                        <td className="py-3 px-3">
                                          <Badge variant="secondary" className="capitalize text-xs">
                                            {item.channel}
                                          </Badge>
                                        </td>
                                        <td className="py-3 px-3 font-medium">{item.itemName}</td>
                                        <td className="py-3 px-3 text-center text-gray-600">{item.quantity}× {item.frequency || 'one-time'}</td>
                                        <td className="py-3 px-3 text-center text-gray-600">{item.duration || 'Campaign duration'}</td>
                                        <td className="py-3 px-3 text-right font-bold text-green-600">
                                          ${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </main>
      </div>
    </ProtectedRoute>
  );
}

