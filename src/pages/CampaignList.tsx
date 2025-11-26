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
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function CampaignList() {
  const navigate = useNavigate();
  const { selectedHubId } = useHubContext();
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
          onAssistantClick={() => {}}
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
              {/* Header */}
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
                  <p className="text-muted-foreground">
                    Manage and review all campaigns
                  </p>
                </div>
                
                <Button onClick={() => navigate('/campaigns/new')} size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Campaign
                </Button>
              </div>

              {/* Filters */}
              <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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
                    <Card key={campaign._id?.toString()} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">
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
                          
                          <div className="flex gap-2 ml-4">
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
        </main>
      </div>
    </ProtectedRoute>
  );
}

