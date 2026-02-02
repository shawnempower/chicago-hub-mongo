import { useEffect, useMemo, useState } from 'react';
import { leadsApi, type Lead, type LeadStatus } from '@/api/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle,
  ChevronDown,
  MapPin,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { LeadDetail } from '@/components/admin/LeadDetail';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';

interface PublicationLeadsProps {
  publicationId: string;
}

type SortKey = 'businessName' | 'contactName' | 'budgetRange' | 'status' | 'createdAt';

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
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusFilterDraft, setStatusFilterDraft] = useState<string[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const { toast } = useToast();

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
  ] as const;

  useEffect(() => {
    fetchLeads();
  }, [publicationId, showArchived]);

  useEffect(() => {
    if (statusPopoverOpen) {
      setStatusFilterDraft(statusFilter);
    }
  }, [statusPopoverOpen, statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.getAll({
        publicationId,
        includeArchived: showArchived,
      });
      setLeads(response.leads);

      // Calculate stats (excluding archived)
      const activeLeads = response.leads.filter(l => !l.archivedAt);
      const newStats = {
        total: activeLeads.length,
        new: activeLeads.filter(l => l.status === 'new').length,
        contacted: activeLeads.filter(l => l.status === 'contacted').length,
        qualified: activeLeads.filter(l => l.status === 'qualified').length,
        closedWon: activeLeads.filter(l => l.status === 'closed_won').length,
        closedLost: activeLeads.filter(l => l.status === 'closed_lost').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const getHubName = (hubId?: string): string => {
    if (!hubId) return 'No Hub';
    // Map hub IDs to display names
    const hubNames: Record<string, string> = {
      'chicago-hub': 'Chicago Hub',
      'nyc-hub': 'NYC Hub',
      'la-hub': 'LA Hub',
    };
    return hubNames[hubId] || hubId;
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
          getHubName(lead.hubId).toLowerCase().includes(search);

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
  const filterTriggerClass =
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

  if (loading) {
    return <div>Loading leads...</div>;
  }

  // Show lead detail page if a lead is selected
  if (selectedLeadId) {
    return <LeadDetail leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.new}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.contacted}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.qualified}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.closedWon}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-sans">Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-2xl font-bold font-sans">{stats.closedLost}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold font-sans text-slate-900">
              All Leads ({visibleCount}
              {hasActiveStatusFilters ? ` of ${leads.length}` : ''})
            </CardTitle>
            <div className="flex items-center gap-2 overflow-x-auto">
              <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={filterTriggerClass}>
                    <Archive className="mr-2 h-4 w-4" />
                    <span className="flex-1">{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
                    {showArchived && <Check className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setShowArchived(prev => !prev);
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    <span className="flex-1">{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
                    {showArchived && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative min-w-[200px]">
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No leads yet for this publication.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Leads will appear here when potential customers inquire about this publication.
              </p>
            </div>
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
                  <TableHead className="w-[14%]">Hub</TableHead>
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
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getHubName(lead.hubId)}
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
        publicationId={publicationId}
      />
    </div>
  );
};
