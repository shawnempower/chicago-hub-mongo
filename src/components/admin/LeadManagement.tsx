import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadsApi, type Lead, type LeadFilters, type LeadSource, type LeadStatus } from '@/api/leads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useHubContext } from '@/contexts/HubContext';
import { usePublication } from '@/contexts/PublicationContext';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Database,
  MoreHorizontal,
  X,
  Activity,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { LeadDetail } from './LeadDetail';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';

type SortKey = 'businessName' | 'contactName' | 'budgetRange' | 'status' | 'createdAt';

export const LeadManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusFilterDraft, setStatusFilterDraft] = useState<string[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [sourceFilterDraft, setSourceFilterDraft] = useState<string[]>([]);
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);
  const [publicationFilter, setPublicationFilter] = useState<string[]>([]);
  const [publicationFilterDraft, setPublicationFilterDraft] = useState<string[]>([]);
  const [publicationPopoverOpen, setPublicationPopoverOpen] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const { toast } = useToast();
  const { selectedHubId } = useHubContext();
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
        setSelectedLeadId(match._id);
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

  useEffect(() => {
    if (sourcePopoverOpen) {
      setSourceFilterDraft(sourceFilter);
    }
  }, [sourcePopoverOpen, sourceFilter]);

  useEffect(() => {
    if (publicationPopoverOpen) {
      setPublicationFilterDraft(publicationFilter);
    }
  }, [publicationPopoverOpen, publicationFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Only fetch leads - publications come from context (no redundant API call)
      const leadsResponse = await leadsApi.getAll(filters);
      setLeads(leadsResponse.leads);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
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
    const pub = publications.find(p => p.publicationId?.toString() === publicationId);
    return pub?.basicInfo?.publicationName || 'Unknown Publication';
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

  const applySourceFilter = () => {
    setSourceFilter(sourceFilterDraft);
    setSourcePopoverOpen(false);
  };

  const applyPublicationFilter = () => {
    setPublicationFilter(publicationFilterDraft);
    setPublicationPopoverOpen(false);
  };

  const getSortValue = (lead: Lead, key: SortKey) => {
    switch (key) {
      case 'businessName':
        return lead.businessName || '';
      case 'contactName':
        return lead.contactName || '';
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

      if (sourceFilter.length > 0 && !sourceFilter.includes(lead.leadSource ?? '')) {
        return false;
      }

      if (publicationFilter.length > 0) {
        if (lead.publicationId) {
          if (!publicationFilter.includes(lead.publicationId)) {
            return false;
          }
        } else {
          // Hub-level lead (no publicationId)
          if (!publicationFilter.includes('hub-level')) {
            return false;
          }
        }
      }

      if (!showArchived && lead.archivedAt) {
        return false;
      }

      return true;
    });
  }, [sortedLeads, searchTerm, statusFilter, sourceFilter, publicationFilter, showArchived]);

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

  const hasActiveFilters = statusFilter.length > 0 || sourceFilter.length > 0 || publicationFilter.length > 0;
  const visibleCount = filteredLeads.length;
  const filterTriggerClass =
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

  const sourceOptions = [
    { value: 'storefront_form', label: 'Web Form' },
    { value: 'ai_chat', label: 'AI Chat' },
    { value: 'manual_entry', label: 'Manual Entry' },
    { value: 'other', label: 'Other' },
  ] as const;

  const publicationOptions = [
    { value: 'hub-level', label: 'Hub-Level Only' },
    ...publications
      .map(pub => ({
        value: pub._id?.toString() || '',
        label: pub.basicInfo?.publicationName || 'Unnamed Publication',
      }))
      .filter(option => option.value),
  ];

  const getSourceFilterLabel = () => {
    if (sourceFilter.length === 0) {
      return 'Source';
    }

    const labels = sourceFilter
      .map(value => sourceOptions.find(option => option.value === value)?.label)
      .filter(Boolean) as string[];

    if (labels.length === 1) return labels[0];
    if (labels.length === sourceOptions.length) return 'All Sources';
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  };

  const getPublicationFilterLabel = () => {
    if (publicationFilter.length === 0) {
      return 'Publication';
    }

    const labels = publicationFilter
      .map(value => publicationOptions.find(option => option.value === value)?.label)
      .filter(Boolean) as string[];

    if (labels.length === 1) return labels[0];
    if (labels.length === publicationOptions.length) return 'All Publications';
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  };

  if (loading) {
    return <div>Loading leads...</div>;
  }

  // Show lead detail page if a lead is selected
  if (selectedLeadId) {
    return <LeadDetail leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold font-sans">
          Leads ({visibleCount}{hasActiveFilters ? ` of ${leads.length}` : ''})
        </h1>
      </div>

      {/* Filters and search row */}
      <div className="flex items-center gap-4">
          {/* Search Bar - Left */}
          <div className="relative min-w-[300px]">
            <Input
              placeholder="Search leads…"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className={`${filterTriggerClass} pr-9 ${
                searchTerm ? 'border-primary/40 bg-primary/10 text-primary' : ''
              }`}
            />
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Filters - Right */}
          <div className="flex items-center gap-2">
          {/* Status Filter Dropdown */}
          <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`${filterTriggerClass} ${
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

          {/* Source Filter Dropdown */}
          <Popover open={sourcePopoverOpen} onOpenChange={setSourcePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`${filterTriggerClass} ${
                  sourceFilter.length > 0 ? 'border-primary/40 bg-primary/10 text-primary' : ''
                }`}
              >
                {getSourceFilterLabel()}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4">
              <div className="space-y-3">
                {sourceOptions.map(option => {
                  const checked = sourceFilterDraft.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setSourceFilterDraft(prev =>
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
                    setSourceFilter([]);
                    setSourceFilterDraft([]);
                    setSourcePopoverOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={applySourceFilter}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Publication Filter Dropdown */}
          <Popover open={publicationPopoverOpen} onOpenChange={setPublicationPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`${filterTriggerClass} ${
                  publicationFilter.length > 0 ? 'border-primary/40 bg-primary/10 text-primary' : ''
                }`}
              >
                {getPublicationFilterLabel()}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {publicationOptions.map(option => {
                  const checked = publicationFilterDraft.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setPublicationFilterDraft(prev =>
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
                    setPublicationFilter([]);
                    setPublicationFilterDraft([]);
                    setPublicationPopoverOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={applyPublicationFilter}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Show Archived Toggle */}
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowArchived(prev => !prev);
              setFilters(prev => ({ ...prev, includeArchived: !showArchived }));
            }}
            className={filterTriggerClass}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          </div>

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={seeding} className={filterTriggerClass}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowActivityLog(true)}>
                <Activity className="mr-2 h-4 w-4" />
                Activity Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={seedTestLeads} disabled={seeding}>
                <Database className="mr-2 h-4 w-4" />
                {seeding ? 'Creating…' : 'Add Test Leads'}
              </DropdownMenuItem>
              {leads.length > 0 && (
                <DropdownMenuItem onClick={deleteAllLeads} disabled={seeding}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All Leads
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>

      {/* Table Card */}
      <Card className="bg-white">
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No leads available yet.</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No leads match the current filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">
                    <button
                      type="button"
                      onClick={() => handleSort('businessName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Lead
                      {renderSortIcon('businessName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[22%]">
                    <button
                      type="button"
                      onClick={() => handleSort('contactName')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Point of Contact
                      {renderSortIcon('contactName')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[18%]">
                    <button
                      type="button"
                      onClick={() => handleSort('budgetRange')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                    >
                      Budget
                      {renderSortIcon('budgetRange')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[14%]">Publication</TableHead>
                  <TableHead className="w-[14%] text-right">
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
                  const statusStyles = getStatusStyles(lead.status);
                  const statusLabel = getStatusLabel(lead.status);

                  return (
                      <TableRow
                        key={id}
                        className="cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSelectedLeadId(id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
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
                        <TableCell className="text-sm">{formatBudgetRange(lead.budgetRange)}</TableCell>
                        <TableCell className="text-sm">
                          {lead.publicationId ? (
                            <span className="text-slate-700">{getPublicationName(lead.publicationId)}</span>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                              Hub-Level
                            </Badge>
                          )}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Leads"
        activityTypes={['lead_create', 'lead_update', 'lead_delete']}
        hubId={selectedHubId}
      />
    </div>
  );
};

