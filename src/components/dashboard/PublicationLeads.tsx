import { useState, useEffect } from 'react';
import { leadsApi, type Lead, type LeadStatus } from '@/api/leads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Mail, Phone, Globe, TrendingUp, Users, CheckCircle, XCircle, MapPin, Archive, ArchiveRestore } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LeadNotesTimeline } from '@/components/admin/LeadNotesTimeline';

interface PublicationLeadsProps {
  publicationId: string;
}

export const PublicationLeads = ({ publicationId }: PublicationLeadsProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    closedWon: number;
    closedLost: number;
  }>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    closedWon: 0,
    closedLost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, [publicationId]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.getAll({
        publicationId,
        includeArchived: false,
      });
      setLeads(response.leads);

      // Calculate stats
      const newStats = {
        total: response.leads.length,
        new: response.leads.filter(l => l.status === 'new').length,
        contacted: response.leads.filter(l => l.status === 'contacted').length,
        qualified: response.leads.filter(l => l.status === 'qualified').length,
        closedWon: response.leads.filter(l => l.status === 'closed_won').length,
        closedLost: response.leads.filter(l => l.status === 'closed_lost').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      await leadsApi.update(leadId, { status });
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
        title: "Success",
        description: "Lead has been archived",
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
        title: "Success",
        description: "Lead has been restored",
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

  const getHubName = (hubId: string): string => {
    // Map hub IDs to display names
    const hubNames: Record<string, string> = {
      'chicago-hub': 'Chicago Hub',
      'nyc-hub': 'NYC Hub',
      'la-hub': 'LA Hub',
      // Add more hub mappings as needed
    };
    return hubNames[hubId] || hubId;
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

  if (loading) {
    return <div>Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-2" />
              <span className="text-2xl font-bold">{stats.new}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2" />
              <span className="text-2xl font-bold">{stats.contacted}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Qualified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold">{stats.qualified}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
              <span className="text-2xl font-bold">{stats.closedWon}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-2xl font-bold">{stats.closedLost}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Leads for this Publication</CardTitle>
          <CardDescription>
            View and manage leads associated with this publication
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads yet for this publication.</p>
              <p className="text-sm mt-2">
                Leads will appear here when potential customers inquire about this publication.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Leads List */}
              <div className="space-y-4">
                {leads.map((lead) => (
                  <Card
                    key={lead._id}
                    className={`cursor-pointer transition-colors ${
                      selectedLead?._id === lead._id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{lead.businessName}</CardTitle>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {lead.contactName} • {lead.contactEmail}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <MapPin className="h-3 w-3 mr-1" />
                            {getHubName(lead.hubId)}
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
                ))}
              </div>

              {/* Lead Details */}
              {selectedLead ? (
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
                      <CardDescription>
                        {selectedLead.archivedAt && (
                          <Badge variant="outline" className="bg-gray-100 mr-2">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                        Quick Actions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Contact Information */}
                      <div>
                        <label className="text-sm font-medium">Contact</label>
                        <div className="text-sm space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`mailto:${selectedLead.contactEmail}`}
                              className="text-blue-600 hover:underline"
                            >
                              {selectedLead.contactEmail}
                            </a>
                          </div>
                          {selectedLead.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${selectedLead.contactPhone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {selectedLead.contactPhone}
                              </a>
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

                      {/* Hub */}
                      <div>
                        <label className="text-sm font-medium">Hub</label>
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <MapPin className="h-3 w-3 mr-1" />
                            {getHubName(selectedLead.hubId)}
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

                      {/* Update Status */}
                      <div>
                        <label className="text-sm font-medium">Update Status</label>
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
                    </CardContent>
                  </Card>

                  {/* Lead Notes Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes & Activity</CardTitle>
                      <CardDescription>Timeline of all interactions and updates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LeadNotesTimeline leadId={selectedLead._id!} />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Select a lead to view details</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

