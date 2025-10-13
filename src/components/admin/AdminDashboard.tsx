import React, { useState, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadManagement } from './LeadManagement';
import { PackageManagement } from './PackageManagement';
import { AssistantManagement } from './AssistantManagement';
import { MediaImportInterface } from './MediaImportInterface';
import { UserManagement } from './UserManagement';
import { EnhancedPublicationsManagement } from './EnhancedPublicationsManagement';
import { PublicationsImport } from './PublicationsImport';
import { PublicationInventoryManager } from './PublicationInventoryManager';
import PublicationFilesSearch from './PublicationFilesSearch';
import SurveyManagement from './SurveyManagement';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Users, Package, Radio, Bot, UserCog, BookOpen, ArrowRightLeft, Target, Search, Loader2, Globe, Mail, Printer, Calendar, DollarSign, TrendingUp, MapPin, Eye } from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { stats, loading, error } = useDashboardStats();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your EmpowerLocal platform</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="files">Knowledge Base</TabsTrigger>
          <TabsTrigger value="inventory">Ad Inventory</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-red-600 text-sm">
                  Error loading dashboard statistics: {error}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.leads ?? 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Total inquiries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Publications</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.publications ?? 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Universal profiles</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ad Inventory</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.adInventory ?? 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Opportunities available</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats?.conversations ?? 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.conversations === 0 ? 'Tracking not implemented' : 'This week'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Marketplace Insights Section */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Inventory Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Inventory Breakdown
                </CardTitle>
                <CardDescription>Ad opportunities by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Website</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.website ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Newsletter</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.newsletter ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Printer className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Print</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.print ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Events</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.events ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Cross-Channel</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.crossChannel ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm">Podcasts</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.podcasts ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Streaming</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.streamingVideo ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-rose-500" />
                      <span className="text-sm">Radio</span>
                    </div>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.inventoryByType?.radioStations ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Audience Reach
                </CardTitle>
                <CardDescription>Total audience across all channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalWebsiteVisitors ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Monthly Website Visitors</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalNewsletterSubscribers ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Newsletter Subscribers</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalSocialFollowers ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Social Media Followers</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalPodcastListeners ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Podcast Listeners</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalStreamingSubscribers ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Streaming Subscribers</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-rose-600">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 
                        (stats?.audienceMetrics?.totalRadioListeners ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Radio Listeners</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Insights
                </CardTitle>
                <CardDescription>Average ad pricing by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Website Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averageWebsiteAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Newsletter Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averageNewsletterAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Print Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averagePrintAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Podcast Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averagePodcastAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Streaming Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averageStreamingAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Radio Ads</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        `$${(stats?.pricingInsights?.averageRadioAdPrice ?? 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Value</span>
                      <span className="font-bold text-green-600">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                          `$${(stats?.pricingInsights?.totalInventoryValue ?? 0).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic & Content Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Geographic Coverage
                </CardTitle>
                <CardDescription>Publications by geographic reach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Local</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.local ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Regional</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.regional ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">State</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.state ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">National</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.geographicCoverage?.national ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Content Types
                </CardTitle>
                <CardDescription>Publications by content focus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">News</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.news ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Business</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.business ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lifestyle</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.lifestyle ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mixed</span>
                    <span className="font-semibold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.contentTypes?.mixed ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New lead from Chicago Bakery</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Package updated: Radio Premium</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New outlet added: WCPT 820</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common admin tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <button 
                  onClick={() => setActiveTab('publications')}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Manage Publications</div>
                  <div className="text-sm text-muted-foreground">Add, edit, and manage your publications database</div>
                </button>
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Advertising Inventory</div>
                  <div className="text-sm text-muted-foreground">Manage website, newsletter, print, and event advertising opportunities</div>
                </button>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Import Publications</div>
                  <div className="text-sm text-muted-foreground">Import publication data from JSON with preview</div>
                </button>
                <button 
                  onClick={() => setActiveTab('packages')}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Create Package</div>
                  <div className="text-sm text-muted-foreground">Add new advertising package</div>
                </button>
                <button 
                  onClick={() => setActiveTab('leads')}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">Review Leads</div>
                  <div className="text-sm text-muted-foreground">Check new inquiries</div>
                </button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="leads">
          <LeadManagement />
        </TabsContent>

        <TabsContent value="surveys">
          <ErrorBoundary>
            <SurveyManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="publications">
          <EnhancedPublicationsManagement />
        </TabsContent>

        <TabsContent value="files">
          <ErrorBoundary>
            <PublicationFilesSearch />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="inventory">
          <PublicationInventoryManager />
        </TabsContent>

        <TabsContent value="packages">
          <PackageManagement />
        </TabsContent>

        <TabsContent value="import">
          <PublicationsImport />
        </TabsContent>

        <TabsContent value="assistant">
          <AssistantManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};