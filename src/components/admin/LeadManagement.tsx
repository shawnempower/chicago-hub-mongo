import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadsApi, type Lead, type LeadFilters, type LeadSource, type LeadStatus } from '@/api/leads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useHubContext } from '@/contexts/HubContext';
import { formatDistanceToNow } from 'date-fns';
import { Archive, ArchiveRestore, Filter, X, MessageSquare, Mail, Phone, Globe, Database, List, LayoutGrid, Building2 } from 'lucide-react';
import { LeadNotesTimeline } from './LeadNotesTimeline';
import { API_BASE_URL } from '@/config/api';
import { getPublications, type PublicationFrontend as Publication } from '@/api/publications';

export const LeadManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const { toast } = useToast();
  const { selectedHubId } = useHubContext();

  // Filters
  const [filters, setFilters] = useState<LeadFilters>({
    hubId: selectedHubId || undefined,
    includeArchived: false,
  });

  useEffect(() => {
    // Update hub filter when selected hub changes
    if (selectedHubId) {
      setFilters(prev => ({ ...prev, hubId: selectedHubId }));
    }
  }, [selectedHubId]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Handle leadId query parameter (for deep linking from publication leads)
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l._id === leadId);
      if (lead) {
        setSelectedLead(lead);
        // Remove the query parameter after selecting the lead
        searchParams.delete('leadId');
        setSearchParams(searchParams);
      }
    }
  }, [leads, searchParams, setSearchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsResponse, pubsResponse] = await Promise.all([
        leadsApi.getAll(filters),
        getPublications()
      ]);
      setLeads(leadsResponse.leads);
      setPublications(pubsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads or publications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await leadsApi.getAll(filters);
      setLeads(response.leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    }
  };

  const deleteAllLeads = async () => {
    if (!confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) {
      return;
    }

    try {
      setSeeding(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/admin/seed-leads`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete leads');
      }

      const result = await response.json();
      
      toast({
        title: "All Leads Deleted",
        description: `Deleted ${result.deletedLeads} leads and ${result.deletedNotes} notes`,
      });

      // Refresh the leads list
      await fetchLeads();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const seedTestLeads = async () => {
    try {
      setSeeding(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/admin/seed-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to seed leads');
      }

      const result = await response.json();
      
      toast({
        title: "Test Leads Created",
        description: `Successfully created ${result.count} test leads`,
      });

      // Refresh the leads list
      await fetchLeads();
    } catch (error) {
      console.error('Error seeding leads:', error);
      toast({
        title: "Error",
        description: "Failed to create test leads",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const previousLead = leads.find(l => l._id === leadId);
      await leadsApi.update(leadId, { status });

      // Create a status change note
      if (previousLead && previousLead.status !== status) {
        await leadsApi.addNote(leadId, {
          noteContent: `Status changed from "${previousLead.status}" to "${status}"`,
          noteType: 'status_change',
          metadata: {
            previousStatus: previousLead.status,
            newStatus: status,
          },
        });
      }

      await fetchLeads();

      toast({
        title: "Status Updated",
        description: "Lead status has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  const archiveLead = async (leadId: string) => {
    try {
      await leadsApi.archive(leadId);
      await fetchLeads();

      toast({
        title: "Lead Archived",
        description: "Lead has been archived successfully",
      });
    } catch (error) {
      console.error('Error archiving lead:', error);
      toast({
        title: "Error",
        description: "Failed to archive lead",
        variant: "destructive",
      });
    }
  };

  const unarchiveLead = async (leadId: string) => {
    try {
      await leadsApi.unarchive(leadId);
      await fetchLeads();

      toast({
        title: "Lead Restored",
        description: "Lead has been restored successfully",
      });
    } catch (error) {
      console.error('Error restoring lead:', error);
      toast({
        title: "Error",
        description: "Failed to restore lead",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status?: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'qualified': return 'bg-green-500';
      case 'proposal_sent': return 'bg-purple-500';
      case 'closed_won': return 'bg-emerald-500';
      case 'closed_lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSourceBadgeColor = (source: LeadSource) => {
    switch (source) {
      case 'storefront_form': return 'bg-blue-100 text-blue-800';
      case 'ai_chat': return 'bg-purple-100 text-purple-800';
      case 'manual_entry': return 'bg-gray-100 text-gray-800';
      case 'other': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: LeadSource) => {
    switch (source) {
      case 'storefront_form': return 'Web Form';
      case 'ai_chat': return 'AI Chat';
      case 'manual_entry': return 'Manual';
      case 'other': return 'Other';
      default: return source;
    }
  };

  // Filter leads by search term
  // Helper to get publication name
  const getPublicationName = (publicationId?: string) => {
    if (!publicationId) return 'Hub-Level Lead';
    const pub = publications.find(p => p._id?.toString() === publicationId);
    return pub?.basicInfo?.publicationName || 'Unknown Publication';
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.businessName.toLowerCase().includes(search) ||
      lead.contactName.toLowerCase().includes(search) ||
      lead.contactEmail.toLowerCase().includes(search) ||
      getPublicationName(lead.publicationId).toLowerCase().includes(search)
    );
  });

  // Group leads by publication
  const groupedLeads = filteredLeads.reduce((groups, lead) => {
    const key = lead.publicationId || 'hub-level';
    if (!groups[key]) {
      groups[key] = {
        publicationId: lead.publicationId,
        publicationName: getPublicationName(lead.publicationId),
        leads: []
      };
    }
    groups[key].leads.push(lead);
    return groups;
  }, {} as Record<string, { publicationId?: string; publicationName: string; leads: Lead[] }>);

  const groupedLeadsArray = Object.values(groupedLeads).sort((a, b) => {
    // Sort: Hub-level first, then by lead count descending
    if (a.publicationId === undefined) return -1;
    if (b.publicationId === undefined) return 1;
    return b.leads.length - a.leads.length;
  });

  if (loading) {
    return <div>Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lead Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={seedTestLeads}
            disabled={seeding}
          >
            <Database className="h-4 w-4 mr-2" />
            {seeding ? 'Creating...' : 'Add Test Leads'}
          </Button>
          {leads.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAllLeads}
              disabled={seeding}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Leads
            </Button>
          )}
          <div className="border-l border-gray-300 h-8" />
          <Button
            variant={viewMode === 'list' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'grouped' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            <Building2 className="h-4 w-4 mr-2" />
            By Publication
          </Button>
          <div className="border-l border-gray-300 h-8" />
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setFilters(prev => ({ ...prev, includeArchived: !showArchived }));
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      status: value === 'all' ? undefined : (value as LeadStatus),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    <SelectItem value="closed_won">Closed Won</SelectItem>
                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Source</label>
                <Select
                  value={filters.leadSource || 'all'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      leadSource: value === 'all' ? undefined : (value as LeadSource),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="storefront_form">Web Form</SelectItem>
                    <SelectItem value="ai_chat">AI Chat</SelectItem>
                    <SelectItem value="manual_entry">Manual Entry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Publication</label>
                <Select
                  value={filters.publicationId || 'all'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      publicationId: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Publications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Publications</SelectItem>
                    <SelectItem value="hub-level">Hub-Level Only</SelectItem>
                    {publications.map(pub => (
                      <SelectItem key={pub._id?.toString()} value={pub._id?.toString() || ''}>
                        {pub.basicInfo?.publicationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leads List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                All Leads ({filteredLeads.length})
              </h3>
              
              {filteredLeads.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No leads found matching your criteria.
                  </CardContent>
                </Card>
              ) : viewMode === 'list' ? (
                // List View
                filteredLeads.map((lead) => (
                  <Card
                    key={lead._id}
                    className={`cursor-pointer transition-colors ${
                      selectedLead?._id === lead._id ? 'ring-2 ring-primary' : ''
                    } ${lead.archivedAt ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{lead.businessName}</CardTitle>
                          <CardDescription>{lead.contactName} • {lead.contactEmail}</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {lead.archivedAt && (
                            <Badge variant="outline" className="bg-gray-100">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getSourceBadgeColor(lead.leadSource)}>
                            {getSourceLabel(lead.leadSource)}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {getPublicationName(lead.publicationId)}
                          </Badge>
                        </div>
                        {lead.budgetRange && (
                          <p><span className="font-medium">Budget:</span> {lead.budgetRange}</p>
                        )}
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // Grouped View by Publication
                groupedLeadsArray.map((group) => (
                  <div key={group.publicationId || 'hub-level'} className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <h4 className="font-semibold text-sm">{group.publicationName}</h4>
                      </div>
                      <Badge variant="outline">{group.leads.length} leads</Badge>
                    </div>
                    {group.leads.map((lead) => (
                      <Card
                        key={lead._id}
                        className={`cursor-pointer transition-colors ml-4 ${
                          selectedLead?._id === lead._id ? 'ring-2 ring-primary' : ''
                        } ${lead.archivedAt ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{lead.businessName}</CardTitle>
                              <CardDescription className="text-xs">{lead.contactName}</CardDescription>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className={getStatusColor(lead.status)} className="text-xs">
                                {lead.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                              </Badge>
                              <Badge variant="outline" className={`${getSourceBadgeColor(lead.leadSource)} text-xs`}>
                                {getSourceLabel(lead.leadSource)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        {(lead.budgetRange || lead.websiteUrl) && (
                          <CardContent className="pt-0">
                            <div className="text-xs text-muted-foreground">
                              {lead.budgetRange && <span>{lead.budgetRange}</span>}
                              {lead.budgetRange && lead.websiteUrl && <span> • </span>}
                              {lead.websiteUrl && <span>{new URL(lead.websiteUrl).hostname}</span>}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Lead Details */}
            {selectedLead && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Lead Details</h3>
                  {selectedLead.archivedAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unarchiveLead(selectedLead._id!)}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveLead(selectedLead._id!)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{selectedLead.businessName}</CardTitle>
                    <CardDescription>Lead Information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      {/* Contact Information */}
                      <div>
                        <label className="text-sm font-medium">Contact</label>
                        <div className="text-sm space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedLead.contactName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedLead.contactEmail}</span>
                          </div>
                          {selectedLead.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedLead.contactPhone}</span>
                            </div>
                          )}
                          {selectedLead.websiteUrl && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={selectedLead.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {selectedLead.websiteUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Source */}
                      <div>
                        <label className="text-sm font-medium">Source</label>
                        <div className="mt-2">
                          <Badge className={getSourceBadgeColor(selectedLead.leadSource)}>
                            {getSourceLabel(selectedLead.leadSource)}
                          </Badge>
                        </div>
                      </div>

                      {/* Publication */}
                      <div>
                        <label className="text-sm font-medium">Publication</label>
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {getPublicationName(selectedLead.publicationId)}
                          </Badge>
                        </div>
                      </div>

                      {/* Marketing Goals */}
                      {selectedLead.marketingGoals && selectedLead.marketingGoals.length > 0 && (
                        <div>
                          <label className="text-sm font-medium">Marketing Goals</label>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedLead.marketingGoals.map((goal, index) => (
                              <Badge key={index} variant="outline">{goal}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={selectedLead.status || 'new'}
                          onValueChange={(value) =>
                            updateLeadStatus(selectedLead._id!, value as LeadStatus)
                          }
                          disabled={!!selectedLead.archivedAt}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                            <SelectItem value="closed_won">Closed Won</SelectItem>
                            <SelectItem value="closed_lost">Closed Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Timeline */}
                <LeadNotesTimeline leadId={selectedLead._id!} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
