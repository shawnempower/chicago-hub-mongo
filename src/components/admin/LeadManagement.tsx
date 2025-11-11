import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadsApi, type Lead, type LeadFilters, type LeadSource, type LeadStatus } from '@/api/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useHubContext } from '@/contexts/HubContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar,
  ChevronDown,
  Database,
  Filter,
  Globe,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react';
import { LeadNotesTimeline } from './LeadNotesTimeline';
import { API_BASE_URL } from '@/config/api';
import { getPublications } from '@/api/publications';
import type { PublicationFrontend as Publication } from '@/types/publication';

type SortKey = 'businessName' | 'contactName' | 'contactEmail' | 'budgetRange' | 'status' | 'createdAt';

export const LeadManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [timelineRefreshKeys, setTimelineRefreshKeys] = useState<Record<string, number>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusFilterDraft, setStatusFilterDraft] = useState<string[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const { toast } = useToast();
  const { selectedHubId } = useHubContext();

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
  ] as const;

  const [filters, setFilters] = useState<LeadFilters>({
    hubId: selectedHubId || undefined,
    includeArchived: false,
  });

  useEffect(() => {
    if (selectedHubId) {
      setFilters(prev => ({ ...prev, hubId: selectedHubId }));
    }
  }, [selectedHubId]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId && leads.length > 0) {
      const match = leads.find(lead => lead._id === leadId);
      if (match?._id) {
        setExpandedRows(prev => new Set(prev).add(match._id!));
        setNotesDrafts(current => ({
          ...current,
          [match._id!]: current[match._id!] ?? (match as any).notes ?? '',
        }));
        searchParams.delete('leadId');
        setSearchParams(searchParams);
      }
    }
  }, [leads, searchParams, setSearchParams]);

  useEffect(() => {
    if (statusPopoverOpen) {
      setStatusFilterDraft(statusFilter);
    }
  }, [statusPopoverOpen, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsResponse, pubsResponse] = await Promise.all([
        leadsApi.getAll(filters),
        getPublications(),
      ]);
      setLeads(leadsResponse.leads);
      setPublications(pubsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads or publications',
        variant: 'destructive',
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
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive',
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
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete leads');
      }

      const result = await response.json();

      toast({
        title: 'All Leads Deleted',
        description: `Deleted ${result.deletedLeads} leads and ${result.deletedNotes} notes`,
      });

      await fetchLeads();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete leads',
        variant: 'destructive',
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
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to seed leads');
      }

      const result = await response.json();

      toast({
        title: 'Test Leads Created',
        description: `Successfully created ${result.count} test leads`,
      });

      await fetchLeads();
    } catch (error) {
      console.error('Error seeding leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test leads',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const previousLead = leads.find(lead => lead._id === leadId);
      await leadsApi.update(leadId, { status });

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
        title: 'Status Updated',
        description: 'Lead status has been updated successfully',
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive',
      });
    }
  };

  const archiveLead = async (leadId: string) => {
    try {
      await leadsApi.archive(leadId);
      await fetchLeads();

      toast({
        title: 'Lead Archived',
        description: 'Lead has been archived successfully',
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

  const unarchiveLead = async (leadId: string) => {
    try {
      await leadsApi.unarchive(leadId);
      await fetchLeads();

      toast({
        title: 'Lead Restored',
        description: 'Lead has been restored successfully',
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

  const updateLeadNotes = async (leadId: string) => {
    const note = (notesDrafts[leadId] ?? '').trim();

    if (!note) {
      toast({
        title: 'Note Required',
        description: 'Please enter a note before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await leadsApi.addNote(leadId, { noteContent: note, noteType: 'note' });

      setNotesDrafts(prev => ({
        ...prev,
        [leadId]: '',
      }));

      setTimelineRefreshKeys(prev => ({
        ...prev,
        [leadId]: (prev[leadId] ?? 0) + 1,
      }));

      toast({
        title: 'Note Saved',
        description: 'Your note was added to the timeline.',
      });
    } catch (error) {
      console.error('Error adding lead note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save the note',
        variant: 'destructive',
      });
    }
  };

  const getStatusStyles = (status?: LeadStatus | null) => {
    switch (status) {
      case 'new':
        return { background: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
      case 'contacted':
        return { background: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' };
      case 'qualified':
        return { background: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' };
      case 'proposal_sent':
        return { background: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' };
      case 'closed_won':
        return { background: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' };
      case 'closed_lost':
        return { background: 'bg-rose-50 hover:bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' };
      default:
        return { background: 'bg-slate-100 hover:bg-slate-200', text: 'text-slate-700', border: 'border-slate-300' };
    }
  };

  const getSourceBadgeColor = (source: LeadSource) => {
    switch (source) {
      case 'storefront_form':
        return 'bg-blue-100 text-blue-800';
      case 'ai_chat':
        return 'bg-purple-100 text-purple-800';
      case 'manual_entry':
        return 'bg-gray-100 text-gray-800';
      case 'other':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: LeadSource) => {
    switch (source) {
      case 'storefront_form':
        return 'Web Form';
      case 'ai_chat':
        return 'AI Chat';
      case 'manual_entry':
        return 'Manual';
      case 'other':
        return 'Other';
      default:
        return source;
    }
  };

  const getPublicationName = (publicationId?: string) => {
    if (!publicationId) return 'Hub-Level Lead';
    const pub = publications.find(p => p._id?.toString() === publicationId);
    return pub?.basicInfo?.publicationName || 'Unknown Publication';
  };

  const toggleRow = (lead: Lead) => {
    if (!lead._id) return;

    setExpandedRows(prev => {
      const next = new Set(prev);

      if (next.has(lead._id!)) {
        next.delete(lead._id!);
      } else {
        next.add(lead._id!);
        setNotesDrafts(current => ({
          ...current,
          [lead._id!]: current[lead._id!] ?? ((lead as any).notes ?? ''),
        }));
      }

      return next;
    });
  };

  const getStatusLabel = (status?: LeadStatus | null) => {
    return statusOptions.find(option => option.value === status)?.label ?? status ?? 'Unknown';
  };

  const formatBudgetRange = (range?: string | null) => {
    if (!range) return '—';
    return range.replace(/\/\s*month/gi, '/mo').replace(/\bper\s+month\b/gi, 'per mo').replace(/\bmonth\b/gi, 'mo');
  };

  const getStatusFilterLabel = () => {
    if (statusFilter.length === 0) {
      return 'Status';
    }

    const labels = statusFilter
      .map(value => statusOptions.find(option => option.value === value)?.label)
      .filter(Boolean) as string[];

    if (labels.length === 1) return labels[0];
    if (labels.length === statusOptions.length) return 'All Statuses';
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  };

  const applyStatusFilter = () => {
    setStatusFilter(statusFilterDraft);
    setStatusPopoverOpen(false);
  };

  const getSortValue = (lead: Lead, key: SortKey) => {
    switch (key) {
      case 'businessName':
        return lead.businessName || '';
      case 'contactName':
        return lead.contactName || '';
      case 'contactEmail':
        return lead.contactEmail || '';
      case 'budgetRange':
        return lead.budgetRange || '';
      case 'status':
        return lead.status || '';
      case 'createdAt':
        return lead.createdAt || '';
      default:
        return '';
    }
  };

  const sortedLeads = useMemo(() => {
    if (!sortConfig) return leads;

    const { key, direction } = sortConfig;

    return [...leads].sort((a, b) => {
      const aValue = getSortValue(a, key);
      const bValue = getSortValue(b, key);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return direction === 'asc' ? comparison : -comparison;
      }

      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      return 0;
    });
  }, [leads, sortConfig]);

  const filteredLeads = useMemo(() => {
    return sortedLeads.filter(lead => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          lead.businessName?.toLowerCase().includes(search) ||
          lead.contactName?.toLowerCase().includes(search) ||
          lead.contactEmail?.toLowerCase().includes(search) ||
          getPublicationName(lead.publicationId).toLowerCase().includes(search);

        if (!matchesSearch) {
          return false;
        }
      }

      if (statusFilter.length > 0 && !statusFilter.includes(lead.status ?? '')) {
        return false;
      }

      if (!showArchived && lead.archivedAt) {
        return false;
      }

      return true;
    });
  }, [sortedLeads, searchTerm, statusFilter, showArchived]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { key, direction: nextDirection };
      }

      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const hasActiveStatusFilters = statusFilter.length > 0;
  const visibleCount = filteredLeads.length;

  if (loading) {
    return <div>Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Lead Management</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={seedTestLeads} disabled={seeding}>
            <Database className="mr-2 h-4 w-4" />
            {seeding ? 'Creating…' : 'Add Test Leads'}
          </Button>
          {leads.length > 0 && (
            <Button variant="outline" size="sm" onClick={deleteAllLeads} disabled={seeding}>
              <X className="mr-2 h-4 w-4" />
              Clear All Leads
            </Button>
          )}
          <div className="hidden h-8 border-l border-border md:block" />
          <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowArchived(prev => !prev);
              setFilters(prev => ({ ...prev, includeArchived: !showArchived }));
            }}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={value =>
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
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Source</label>
                <Select
                  value={filters.leadSource || 'all'}
                  onValueChange={value =>
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
                <label className="mb-2 block text-sm font-medium">Publication</label>
                <Select
                  value={filters.publicationId || 'all'}
                  onValueChange={value =>
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
                <label className="mb-2 block text-sm font-medium">Search</label>
                <div className="relative">
                  <Input placeholder="Search leads…" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
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
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">
              All Leads ({visibleCount}
              {hasActiveStatusFilters ? ` of ${leads.length}` : ''})
            </CardTitle>
            <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                    statusFilter.length > 0 ? 'border-primary/40 bg-primary/10 text-primary' : ''
                  }`}
                >
                  {getStatusFilterLabel()}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-4">
                <div className="space-y-3">
                  {statusOptions.map(option => {
                    const checked = statusFilterDraft.includes(option.value);
                    return (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            setStatusFilterDraft(prev =>
                              checked ? prev.filter(value => value !== option.value) : [...prev, option.value],
                            );
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter([]);
                      setStatusFilterDraft([]);
                      setStatusPopoverOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button size="sm" onClick={applyStatusFilter}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No leads available yet.</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No leads match the current filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">
                    <button
                      type="button"
                      onClick={() => handleSort('businessName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Lead
                      {renderSortIcon('businessName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[18%]">
                    <button
                      type="button"
                      onClick={() => handleSort('contactName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Point of Contact
                      {renderSortIcon('contactName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[22%]">
                    <button
                      type="button"
                      onClick={() => handleSort('contactEmail')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Email
                      {renderSortIcon('contactEmail')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[14%]">
                    <button
                      type="button"
                      onClick={() => handleSort('budgetRange')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Budget
                      {renderSortIcon('budgetRange')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%]">Publication</TableHead>
                  <TableHead className="w-[10%] text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="ml-auto flex items-center justify-end gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => {
                  const id = lead._id!;
                  const isExpanded = expandedRows.has(id);
                  const statusStyles = getStatusStyles(lead.status);
                  const statusLabel = getStatusLabel(lead.status);
                  const currentNote = notesDrafts[id] ?? '';
                  const timelineKey = timelineRefreshKeys[id] ?? 0;

                  return (
                    <Fragment key={id}>
                      <TableRow
                        className="cursor-pointer"
                        data-state={isExpanded ? 'selected' : undefined}
                        onClick={() => toggleRow(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={event => {
                                event.stopPropagation();
                                toggleRow(lead);
                              }}
                              aria-label={isExpanded ? 'Collapse lead details' : 'Expand lead details'}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                            <div>
                              <p className="text-sm font-medium">{lead.businessName}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
                                {lead.archivedAt && (
                                  <Badge variant="outline" className="border-dashed">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{lead.contactName}</TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${lead.contactEmail}`}
                            className="text-sm text-primary hover:underline"
                            onClick={event => event.stopPropagation()}
                          >
                            {lead.contactEmail}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">{formatBudgetRange(lead.budgetRange)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Building2 className="mr-1 h-3 w-3" />
                            {getPublicationName(lead.publicationId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            onClick={event => event.stopPropagation()}
                            onKeyDown={event => event.stopPropagation()}
                            className="flex justify-end"
                          >
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
                                    onSelect={() => updateLeadStatus(id, option.value as LeadStatus)}
                                  >
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/40">
                          <TableCell colSpan={6}>
                            <div className="space-y-6 p-6">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={getSourceBadgeColor(lead.leadSource)}>
                                    {getSourceLabel(lead.leadSource)}
                                  </Badge>
                                  {lead.timeline && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{lead.timeline}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {lead.archivedAt ? (
                                    <Button size="sm" variant="outline" onClick={() => unarchiveLead(id)}>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Restore
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={() => archiveLead(id)}>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Marketing Goals
                                    </p>
                                    <div className="mt-3">
                                      {lead.marketingGoals && lead.marketingGoals.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {lead.marketingGoals.map((goal, index) => (
                                            <Badge key={index} variant="outline" className="rounded-full px-3 py-1 text-xs">
                                              {goal}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No marketing goals provided.</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Website
                                    </p>
                                    <div className="mt-3 flex items-start gap-3 text-sm">
                                      <Globe className="mt-0.5 h-4 w-4 text-slate-400" />
                                      {lead.websiteUrl ? (
                                        <a
                                          href={lead.websiteUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary hover:underline"
                                          onClick={event => event.stopPropagation()}
                                        >
                                          {lead.websiteUrl}
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground">No website provided.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

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
                                      <a
                                        href={`mailto:${lead.contactEmail}`}
                                        className="break-words text-primary hover:underline"
                                        onClick={event => event.stopPropagation()}
                                      >
                                        {lead.contactEmail}
                                      </a>
                                    </div>
                                    {lead.contactPhone && (
                                      <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                                        <a
                                          href={`tel:${lead.contactPhone}`}
                                          className="text-slate-900 hover:text-primary"
                                          onClick={event => event.stopPropagation()}
                                        >
                                          {lead.contactPhone}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                                  <Textarea
                                    value={currentNote}
                                    disabled={Boolean(lead.archivedAt)}
                                    onClick={event => event.stopPropagation()}
                                    onChange={event => {
                                      event.stopPropagation();
                                      setNotesDrafts(prev => ({
                                        ...prev,
                                        [id]: event.target.value,
                                      }));
                                    }}
                                    placeholder="Add notes about this lead..."
                                    className="min-h-[120px]"
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      disabled={Boolean(lead.archivedAt)}
                                      onClick={event => {
                                        event.stopPropagation();
                                        updateLeadNotes(id);
                                      }}
                                    >
                                      Save Notes
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <LeadNotesTimeline key={`${id}-${timelineKey}`} leadId={id} />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

