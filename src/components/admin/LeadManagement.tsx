import { useState, useEffect } from 'react';
import { leadsApi, type Lead } from '@/api/leads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DisplayLead {
  id: string;
  business_name: string;
  website_url?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  marketing_goals?: string[];
  budget_range?: string;
  timeline?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export const LeadManagement = () => {
  const [leads, setLeads] = useState<DisplayLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<DisplayLead | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await leadsApi.getAll();
      const leads = response.leads.map(lead => ({
        id: lead._id?.toString() || '',
        business_name: lead.businessName,
        website_url: lead.websiteUrl || undefined,
        contact_name: lead.contactName,
        contact_email: lead.contactEmail,
        contact_phone: lead.contactPhone || undefined,
        marketing_goals: lead.marketingGoals || undefined,
        budget_range: lead.budgetRange || undefined,
        timeline: lead.timeline || undefined,
        status: lead.status || 'new',
        notes: lead.notes || undefined,
        created_at: lead.createdAt,
      }));
      setLeads(leads);
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

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      await leadsApi.update(leadId, { status: status as any });

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));

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

  const updateLeadNotes = async (leadId: string) => {
    try {
      await leadsApi.update(leadId, { notes });

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, notes } : lead
      ));

      toast({
        title: "Notes Updated",
        description: "Lead notes have been saved successfully",
      });
    } catch (error) {
      console.error('Error updating lead notes:', error);
      toast({
        title: "Error",
        description: "Failed to update lead notes",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
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
      <div>
        <p className="text-muted-foreground font-serif">
          Lead Management
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">All Leads ({leads.length})</h3>
          {leads.map((lead) => (
            <Card 
              key={lead.id} 
              className={`cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                setSelectedLead(lead);
                setNotes(lead.notes || '');
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{lead.business_name}</CardTitle>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>{lead.contact_name} • {lead.contact_email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {lead.website_url && (
                    <p><span className="font-medium">Website:</span> {lead.website_url}</p>
                  )}
                  {lead.budget_range && (
                    <p><span className="font-medium">Budget:</span> {lead.budget_range}</p>
                  )}
                  <p className="text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedLead && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Details</h3>
            <Card>
              <CardHeader>
                <CardTitle>{selectedLead.business_name}</CardTitle>
                <CardDescription>Lead Information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact</label>
                    <div className="text-sm space-y-1">
                      <p>{selectedLead.contact_name}</p>
                      <p>{selectedLead.contact_email}</p>
                      {selectedLead.contact_phone && <p>{selectedLead.contact_phone}</p>}
                    </div>
                  </div>

                  {selectedLead.marketing_goals && selectedLead.marketing_goals.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Marketing Goals</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLead.marketing_goals.map((goal, index) => (
                          <Badge key={index} variant="outline">{goal}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={selectedLead.status} 
                      onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                    >
                      <SelectTrigger className="mt-1">
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

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      className="mt-1"
                    />
                    <Button 
                      onClick={() => updateLeadNotes(selectedLead.id)}
                      className="mt-2"
                      size="sm"
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};