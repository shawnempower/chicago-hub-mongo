import { useState, useEffect } from 'react';
import { leadsApi, type Lead, type LeadStatus } from '@/api/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePublication } from '@/contexts/PublicationContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  User,
  Users,
  Send,
} from 'lucide-react';
import { LeadConversationModal } from './LeadConversationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { LeadNotesTimeline } from './LeadNotesTimeline';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface LeadDetailProps {
  leadId: string;
  onBack: () => void;
}

export const LeadDetail = ({ leadId, onBack }: LeadDetailProps) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState('');
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const { toast } = useToast();
  // Use publications from context instead of fetching separately (eliminates redundant API call)
  const { availablePublications: publications } = usePublication();

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
  ] as const;

  useEffect(() => {
    fetchLead();
    // No need to fetch publications - they come from context
  }, [leadId]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const data = await leadsApi.getById(leadId);
      setLead(data.lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lead details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPublicationName = (publicationId: string): string => {
    const publication = publications.find(p => p.publicationId?.toString() === publicationId);
    return publication?.basicInfo?.publicationName ?? 'Unknown Publication';
  };

  const getStatusStyles = (status: string) => {
    const styles: Record<string, { background: string; text: string; border: string }> = {
      new: { background: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      contacted: { background: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      qualified: { background: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      proposal_sent: { background: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
      closed_won: { background: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      closed_lost: { background: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    };
    return styles[status] ?? { background: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  };

  const getStatusLabel = (status: string): string => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label ?? status;
  };

  const formatBudgetRange = (range: string): string => {
    const labels: Record<string, string> = {
      'under-5k': 'Under $5K',
      '5k-15k': '$5K - $15K',
      '15k-50k': '$15K - $50K',
      '50k-plus': '$50K+',
    };
    return labels[range] ?? range;
  };

  const updateLeadStatus = async (status: LeadStatus) => {
    if (!lead?._id) return;

    try {
      await leadsApi.update(lead._id, { status });
      setLead({ ...lead, status });
      toast({
        title: 'Status Updated',
        description: `Lead status changed to ${getStatusLabel(status)}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive',
      });
    }
  };

  const archiveLead = async () => {
    if (!lead?._id) return;

    try {
      await leadsApi.archive(lead._id);
      await fetchLead();
      toast({
        title: 'Lead Archived',
        description: 'The lead has been archived successfully.',
      });
    } catch (error) {
      console.error('Error archiving lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive lead',
        variant: 'destructive',
      });
    }
  };

  const unarchiveLead = async () => {
    if (!lead?._id) return;

    try {
      await leadsApi.unarchive(lead._id);
      await fetchLead();
      toast({
        title: 'Lead Restored',
        description: 'The lead has been restored successfully.',
      });
    } catch (error) {
      console.error('Error restoring lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore lead',
        variant: 'destructive',
      });
    }
  };

  const updateLeadNotes = async () => {
    if (!lead?._id || !currentNote.trim()) return;

    try {
      await leadsApi.addNote(lead._id, { 
        noteContent: currentNote,
        noteType: 'note'
      });
      setCurrentNote('');
      setTimelineRefreshKey(prev => prev + 1);
      toast({
        title: 'Note Added',
        description: 'Your note has been saved successfully.',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  const statusStyles = getStatusStyles(lead.status);
  const statusLabel = getStatusLabel(lead.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        rootLabel="Leads"
        rootIcon={Users}
        currentLabel={lead.businessName}
        onBackClick={onBack}
      />

      {/* Lead Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans">Lead Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Lead Name & Actions */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-3 flex-1">
              <h3 className="text-2xl font-medium font-sans">{lead.businessName}</h3>
              {lead.createdAt && (
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lead.archivedAt ? (
                <Button size="sm" variant="outline" onClick={unarchiveLead}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={archiveLead}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={Boolean(lead.archivedAt)}
                    className={`flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none ${
                      lead.archivedAt ? 'cursor-not-allowed opacity-60' : ''
                    } ${statusStyles.background} ${statusStyles.text} ${statusStyles.border}`}
                  >
                    {statusLabel}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {statusOptions.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => updateLeadStatus(option.value as LeadStatus)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Lead Source & ID */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge 
              variant="outline" 
              className={
                lead.leadSource === 'ai_chat' 
                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                  : lead.leadSource === 'storefront_form'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }
            >
              {lead.leadSource === 'ai_chat' ? '🤖 AI Chat' : 
               lead.leadSource === 'storefront_form' ? '📝 Storefront Form' :
               lead.leadSource === 'manual_entry' ? '✍️ Manual Entry' : lead.leadSource}
            </Badge>
            {lead.leadId && (
              <span className="text-xs text-muted-foreground font-mono">ID: {lead.leadId}</span>
            )}
          </div>

          {/* Lead Information Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-4 grid-rows-[auto_auto]">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marketing Goals</p>
                <div className="mt-3">
                  {(lead.marketingGoals && lead.marketingGoals.length > 0) || (lead.campaignGoals && (Array.isArray(lead.campaignGoals) ? lead.campaignGoals.length > 0 : lead.campaignGoals)) ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.marketingGoals?.map((goal, index) => (
                        <Badge key={`mg-${index}`} variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {goal}
                        </Badge>
                      ))}
                      {Array.isArray(lead.campaignGoals) 
                        ? lead.campaignGoals.filter(g => !lead.marketingGoals?.includes(g)).map((goal, index) => (
                            <Badge key={`cg-${index}`} variant="outline" className="rounded-full px-3 py-1 text-xs bg-purple-50">
                              {goal}
                            </Badge>
                          ))
                        : lead.campaignGoals && !lead.marketingGoals?.includes(lead.campaignGoals) && (
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs bg-purple-50">
                              {lead.campaignGoals}
                            </Badge>
                          )
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No marketing goals provided.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</p>
                <div className="mt-3 text-sm font-medium">{formatBudgetRange(lead.budgetRange)}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{lead.timeline ?? 'No timeline provided.'}</span>
                </div>
              </div>

              {lead.conversationContext?.targetAudience && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target Audience</p>
                  <div className="mt-3 text-sm">
                    <Users className="inline h-4 w-4 text-slate-400 mr-2" />
                    {lead.conversationContext.targetAudience}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publication</p>
                <div className="mt-3 text-sm">
                  {lead.publicationId ? (
                    <span className="text-slate-700">{getPublicationName(lead.publicationId)}</span>
                  ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      Hub-Level
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 grid-rows-[auto_auto]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{lead.contactName}</p>
                    <p className="text-xs text-slate-500">Primary Contact</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                    <a href={`mailto:${lead.contactEmail}`} className="break-words text-primary hover:underline">
                      {lead.contactEmail}
                    </a>
                  </div>
                  {lead.contactPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                      <a href={`tel:${lead.contactPhone}`} className="text-slate-900 hover:text-primary">
                        {lead.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</p>
                <div className="mt-3 flex items-start gap-3 text-sm">
                  <Globe className="mt-0.5 h-4 w-4 text-slate-400" />
                  {lead.websiteUrl ? (
                    <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {lead.websiteUrl}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No website provided.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message / Conversation Summary */}
          {lead.message && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                {lead.leadSource === 'ai_chat' ? 'Conversation Summary' : 'Message'}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* AI Chat Proposal Info */}
          {lead.leadSource === 'ai_chat' && lead.conversationContext && (
            <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                  🤖 AI Chat Proposal Details
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowConversationModal(true)}
                  className="text-purple-700 border-purple-300 hover:bg-purple-100"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Full Conversation
                </Button>
              </div>
              <div className="grid gap-3 text-sm">
                {lead.conversationContext.proposalId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proposal ID:</span>
                    <span className="font-mono text-slate-700">{lead.conversationContext.proposalId}</span>
                  </div>
                )}
                {lead.conversationContext.proposalStatus && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-slate-700">{lead.conversationContext.proposalStatus}</span>
                  </div>
                )}
                {lead.conversationContext.proposalValidUntil && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid Until:</span>
                    <span className="text-slate-700">{lead.conversationContext.proposalValidUntil}</span>
                  </div>
                )}
                {lead.conversationContext.proposalNextSteps && lead.conversationContext.proposalNextSteps.length > 0 && (
                  <div className="mt-2">
                    <span className="text-slate-500 block mb-2">Next Steps:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {lead.conversationContext.proposalNextSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lead.conversationContext.extractedGoals && lead.conversationContext.extractedGoals.length > 0 && (
                  <div className="mt-2">
                    <span className="text-slate-500 block mb-2">Extracted Goals:</span>
                    <div className="flex flex-wrap gap-2">
                      {lead.conversationContext.extractedGoals.map((goal, index) => (
                        <Badge key={index} variant="outline" className="bg-white text-purple-700 border-purple-300">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Activity */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          {/* Activity Timeline - Fixed Height with Scroll */}
          <div className="overflow-y-auto px-6 pt-6" style={{ height: '500px' }}>
            {lead._id ? (
              <LeadNotesTimeline key={`${lead._id}-${timelineRefreshKey}`} leadId={lead._id} showComposer={false} />
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load activity timeline.</p>
            )}
          </div>

          {/* Sticky Note Composer - Full Width */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6">
            <div className="relative rounded-lg border border-slate-300 bg-slate-50 p-4" style={{ minHeight: '120px' }}>
              <Textarea
                value={currentNote}
                disabled={Boolean(lead.archivedAt)}
                onChange={event => setCurrentNote(event.target.value)}
                placeholder="Leave a note"
                className="absolute top-4 left-4 right-4 border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm"
                style={{ height: 'calc(100% - 3rem)' }}
              />
              <div className="absolute bottom-4 right-4">
                <Button
                  size="sm"
                  disabled={Boolean(lead.archivedAt) || !currentNote.trim()}
                  onClick={updateLeadNotes}
                  className="gap-2"
                >
                  Post
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History Modal */}
      {lead.leadSource === 'ai_chat' && (
        <LeadConversationModal
          lead={lead}
          isOpen={showConversationModal}
          onClose={() => setShowConversationModal(false)}
        />
      )}
    </div>
  );
};

