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
  AlertCircle
} from 'lucide-react';
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
  const { selectedHubId, loading: hubLoading, error: hubError } = useHubContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { campaigns, loading, error } = useCampaigns({
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
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold font-sans">
                                {campaign.basicInfo?.name || 'Untitled Campaign'}
                              </h3>
                              <Badge className={STATUS_COLORS[campaign.status as keyof typeof STATUS_COLORS]}>
                                {STATUS_LABELS[campaign.status as keyof typeof STATUS_LABELS]}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground mt-4">
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
      </div>
    </ProtectedRoute>
  );
}

