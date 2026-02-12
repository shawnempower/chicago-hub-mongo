import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '@/api/admin';
import type { UserProfile } from '@/types/common';
import type { UserPermissionDetail, AdminInvitation } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Building2,
  FileText,
  Clock,
  Send,
  UserPlus,
  X,
} from 'lucide-react';

type RoleFilter = 'all' | 'admin' | 'hub_user' | 'publication_user' | 'standard' | 'no_role';

// Inline user detail panel - loaded on demand
function UserDetailPanel({ user }: { user: UserProfile }) {
  const [permissions, setPermissions] = useState<UserPermissionDetail | null>(null);
  const [permLoading, setPermLoading] = useState(true);
  const [permError, setPermError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadPermissions();
  }, [user.userId]);

  const loadPermissions = async () => {
    if (!user.userId) return;
    try {
      setPermLoading(true);
      setPermError(null);
      const data = await adminApi.getUserPermissions(user.userId);
      setPermissions(data);
    } catch (err: any) {
      setPermError(err.message || 'Failed to load permissions');
    } finally {
      setPermLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
      title="Copy to clipboard"
    >
      {copiedField === field ? (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Identity Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identity</h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">User ID:</span>{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{user.userId}</code>
              <CopyButton text={user.userId} field="userId" />
            </div>
            {user.email && (
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a>
                <CopyButton text={user.email} field="email" />
              </div>
            )}
            {user.companyName && (
              <div><span className="text-muted-foreground">Company:</span> {user.companyName}</div>
            )}
            {user.industry && (
              <div><span className="text-muted-foreground">Industry:</span> {user.industry}</div>
            )}
            {user.phone && (
              <div><span className="text-muted-foreground">Phone:</span> {user.phone}</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile</h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Profile Completion:</span>{' '}
              {(user.profileCompletionScore || 0) > 0 ? (
                <span>{user.profileCompletionScore}%</span>
              ) : (
                <span className="text-yellow-600">Not started</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Email Verified:</span>{' '}
              {(user as any).isEmailVerified ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-yellow-600">No</span>
              )}
            </div>
            {(user as any).lastLoginAt && (
              <div>
                <span className="text-muted-foreground">Last Login:</span>{' '}
                {new Date((user as any).lastLoginAt).toLocaleString()}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              {new Date(user.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Permissions</h4>
          {!permLoading && (
            <button onClick={loadPermissions} className="text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3 inline mr-1" />Refresh
            </button>
          )}
        </div>

        {permLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading permissions...
          </div>
        ) : permError ? (
          <div className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {permError}
          </div>
        ) : permissions ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Role:</span>{' '}
                <span className="font-medium">{formatRoleLabel(permissions.role || user.role || 'standard')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Scope:</span>{' '}
                <span className="font-medium">{permissions.accessScope || 'none'}</span>
              </div>
              {permissions.canInviteUsers && (
                <Badge variant="outline" className="text-xs">Can Invite</Badge>
              )}
              {permissions.canManageGroups && (
                <Badge variant="outline" className="text-xs">Can Manage Groups</Badge>
              )}
              {!permissions.hasPermissionsRecord && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No permissions record
                </Badge>
              )}
            </div>

            {/* Hub Access */}
            {permissions.hubAccess.length > 0 ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Hubs ({permissions.hubAccess.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {permissions.hubAccess.map(hub => (
                    <Badge key={hub.hubId} variant="secondary" className="text-xs">
                      {hub.hubName}
                      {hub.accessLevel === 'limited' && (
                        <span className="ml-1 text-yellow-600">(limited)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> No hub assignments
              </div>
            )}

            {/* Publication Access -- only shown for publication_user or users with direct assignments.
                Hub users get pub access via hub membership (shown above). Admins see everything. */}
            {permissions.publicationAccess.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Direct Publications ({permissions.publicationAccess.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {permissions.publicationAccess.slice(0, 20).map(pub => (
                    <Badge key={pub.publicationId} variant="outline" className="text-xs">
                      {pub.publicationName}
                    </Badge>
                  ))}
                  {permissions.publicationAccess.length > 20 && (
                    <Badge variant="outline" className="text-xs">
                      +{permissions.publicationAccess.length - 20} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No permissions data available</div>
        )}
      </div>

    </div>
  );
}

/** Map role value to a human-readable label */
function formatRoleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'hub_user': return 'Hub User';
    case 'publication_user': return 'Publication User';
    case 'standard': return 'Standard';
    default: return role || 'Unknown';
  }
}

// Invitation status filter type
type InvitationStatusFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'cancelled';

/** Pending Invitations panel for admin view */
function PendingInvitationsPanel() {
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter>('pending');
  const [inviteSearch, setInviteSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllInvitations();
      setInvitations(response.invitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvitations = useMemo(() => {
    let result = invitations;

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    if (inviteSearch.trim()) {
      const q = inviteSearch.toLowerCase().trim();
      result = result.filter(inv =>
        inv.invitedEmail.toLowerCase().includes(q) ||
        inv.invitedByName.toLowerCase().includes(q) ||
        inv.resourceName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [invitations, statusFilter, inviteSearch]);

  const stats = useMemo(() => {
    const pending = invitations.filter(i => i.status === 'pending').length;
    const accepted = invitations.filter(i => i.status === 'accepted').length;
    const expired = invitations.filter(i => i.status === 'expired').length;
    const cancelled = invitations.filter(i => i.status === 'cancelled').length;
    return { total: invitations.length, pending, accepted, expired, cancelled };
  }, [invitations]);

  const handleResend = async (invitationId: string) => {
    setActionInProgress(prev => new Set(prev).add(invitationId));
    try {
      const result = await adminApi.resendInvitation(invitationId);
      if (result.success) {
        toast({ title: 'Success', description: 'Invitation resent successfully.' });
        loadInvitations();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to resend.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resend invitation.', variant: 'destructive' });
    } finally {
      setActionInProgress(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleCancel = async (invitationId: string) => {
    setActionInProgress(prev => new Set(prev).add(invitationId));
    try {
      const result = await adminApi.cancelInvitation(invitationId);
      if (result.success) {
        toast({ title: 'Success', description: 'Invitation cancelled.' });
        loadInvitations();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to cancel.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel invitation.', variant: 'destructive' });
    } finally {
      setActionInProgress(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'accepted':
        return <Badge className="text-xs gap-1 bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-xs gap-1 text-yellow-600 border-yellow-300"><AlertTriangle className="h-3 w-3" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><X className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner size="sm" />
        <span className="ml-2 text-sm text-muted-foreground">Loading invitations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Pending', value: stats.pending, filter: 'pending' as InvitationStatusFilter },
          { label: 'Accepted', value: stats.accepted, filter: 'accepted' as InvitationStatusFilter },
          { label: 'Expired', value: stats.expired, filter: 'expired' as InvitationStatusFilter },
          { label: 'Cancelled', value: stats.cancelled, filter: 'cancelled' as InvitationStatusFilter },
        ].map(chip => (
          <button
            key={chip.filter}
            onClick={() => setStatusFilter(prev => prev === chip.filter ? 'all' : chip.filter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === chip.filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {chip.label}
            <span className="font-bold">{chip.value}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, inviter, or resource..."
          value={inviteSearch}
          onChange={(e) => setInviteSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Results count */}
      {(inviteSearch || statusFilter !== 'all') && (
        <div className="text-xs text-muted-foreground">
          Showing {filteredInvitations.length} of {invitations.length} invitations
        </div>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invited Email</TableHead>
              <TableHead className="hidden sm:table-cell">Resource</TableHead>
              <TableHead className="hidden md:table-cell">Invited By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Sent</TableHead>
              <TableHead className="hidden xl:table-cell">Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {inviteSearch || statusFilter !== 'all'
                    ? 'No invitations match your criteria.'
                    : 'No invitations found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredInvitations.map(inv => (
                <TableRow key={inv._id}>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{inv.invitedEmail}</div>
                      {/* Show resource on small screens */}
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {inv.resourceType === 'hub' ? <Building2 className="h-3 w-3 inline mr-0.5" /> : <FileText className="h-3 w-3 inline mr-0.5" />}
                        {inv.resourceName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      {inv.resourceType === 'hub' ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Building2 className="h-3 w-3" />{inv.resourceName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <FileText className="h-3 w-3" />{inv.resourceName}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{inv.invitedByName}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(inv.status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(inv.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className={`text-xs ${new Date(inv.expiresAt) < new Date() ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleResend(inv._id)}
                          disabled={actionInProgress.has(inv._id)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          title="Resend invitation email"
                        >
                          {actionInProgress.has(inv._id) ? (
                            <Spinner size="sm" />
                          ) : (
                            <><Send className="h-3 w-3" />Resend</>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleCancel(inv._id)}
                          disabled={actionInProgress.has(inv._id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-destructive hover:text-destructive"
                          title="Cancel invitation"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {inv.status === 'expired' && (
                      <Button
                        onClick={() => handleResend(inv._id)}
                        disabled={actionInProgress.has(inv._id)}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        title="Resend (extends expiration)"
                      >
                        {actionInProgress.has(inv._id) ? (
                          <Spinner size="sm" />
                        ) : (
                          <><Send className="h-3 w-3" />Resend</>
                        )}
                      </Button>
                    )}
                    {inv.status === 'accepted' && inv.acceptedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(inv.acceptedAt)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

type ViewTab = 'users' | 'invitations';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [adminConfirmUser, setAdminConfirmUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('users');
  const { toast } = useToast();

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers();
      setUsers(response.users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.companyName && u.companyName.toLowerCase().includes(q)) ||
        (u.userId && u.userId.toLowerCase().includes(q)) ||
        (`${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        result = result.filter(u => u.isAdmin);
      } else if (roleFilter === 'no_role') {
        result = result.filter(u => !u.role || u.role === 'standard');
      } else {
        result = result.filter(u => u.role === roleFilter);
      }
    }

    return result;
  }, [users, searchQuery, roleFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.isAdmin).length;
    const hubUsers = users.filter(u => u.role === 'hub_user').length;
    const pubUsers = users.filter(u => u.role === 'publication_user').length;
    const noProfile = users.filter(u => (u.profileCompletionScore || 0) === 0).length;
    const verified = users.filter(u => (u as any).isEmailVerified).length;
    return { total, admins, hubUsers, pubUsers, noProfile, verified };
  }, [users]);

  const toggleAdminStatus = async (user: UserProfile) => {
    if (!user.userId) {
      toast({ title: 'Error', description: 'User is missing required user ID.', variant: 'destructive' });
      return;
    }

    const userId = user.userId;
    const newAdminStatus = !user.isAdmin;

    try {
      setUpdatingUsers(prev => new Set(prev).add(userId));
      await adminApi.updateUserAdminStatus(userId, newAdminStatus);
      setUsers(prev => prev.map(u =>
        u.userId === userId ? { ...u, isAdmin: newAdminStatus } : u
      ));
      toast({
        title: 'Success',
        description: `User ${newAdminStatus ? 'granted' : 'revoked'} admin privileges.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update admin status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.companyName) return user.companyName;
    return user.email || 'Unknown User';
  };

  const getRoleBadge = (user: UserProfile) => {
    if (user.isAdmin) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (user.role === 'hub_user') {
      return <Badge variant="secondary" className="text-xs">Hub User</Badge>;
    }
    if (user.role === 'publication_user') {
      return <Badge variant="secondary" className="text-xs">Pub User</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-muted-foreground">Standard</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Look up users, inspect permissions, and diagnose access issues.
          </p>
        </div>
        {activeTab === 'users' && (
          <Button onClick={loadUsers} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <Users className="h-4 w-4" />
          Registered Users
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Invitations
        </button>
      </div>

      {/* Invitations Tab */}
      {activeTab === 'invitations' && <PendingInvitationsPanel />}

      {/* Users Tab */}
      {activeTab === 'users' && (<>

      {/* Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats.total, icon: Users },
          { label: 'Admins', value: stats.admins, icon: Shield },
          { label: 'Hub Users', value: stats.hubUsers, icon: Building2 },
          { label: 'Pub Users', value: stats.pubUsers, icon: FileText },
          { label: 'No Profile', value: stats.noProfile, icon: AlertTriangle },
          { label: 'Verified', value: stats.verified, icon: CheckCircle2 },
        ].map(stat => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-center gap-2">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-lg font-bold mt-0.5">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="hub_user">Hub Users</SelectItem>
            <SelectItem value="publication_user">Pub Users</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="no_role">No Role Set</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {searchQuery || roleFilter !== 'all' ? (
        <div className="text-xs text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
          {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
        </div>
      ) : null}

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Access</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="hidden xl:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery || roleFilter !== 'all'
                    ? 'No users match your search criteria.'
                    : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => {
                const isExpanded = expandedUserId === user.userId;
                const rowKey = user.userId || user._id?.toString();
                return (
                  <React.Fragment key={rowKey}>
                    <TableRow
                      className={`group cursor-pointer ${isExpanded ? 'bg-muted/30 border-b-0' : ''}`}
                      onClick={() => user.userId && toggleExpand(user.userId)}
                    >
                      <TableCell className="pr-0">
                        <div className="p-1">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-sm">
                              {getUserDisplayName(user)}
                            </div>
                            {/* Show email on small screens since column is hidden */}
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {user.email}
                            </div>
                            {(user.profileCompletionScore || 0) === 0 && (
                              <span className="text-xs text-yellow-600">No profile</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{user.email || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.isAdmin ? (
                            <span className="text-xs text-muted-foreground italic">All (admin)</span>
                          ) : (
                            <>
                              {((user as any).hubNames || []).map((name: string, i: number) => (
                                <Badge key={`h-${i}`} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  <Building2 className="h-2.5 w-2.5 mr-0.5" />{name}
                                </Badge>
                              ))}
                              {((user as any).pubNames || []).slice(0, 3).map((name: string, i: number) => (
                                <Badge key={`p-${i}`} variant="outline" className="text-[10px] px-1.5 py-0">
                                  <FileText className="h-2.5 w-2.5 mr-0.5" />{name}
                                </Badge>
                              ))}
                              {((user as any).pubNames || []).length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{(user as any).pubNames.length - 3} pubs
                                </span>
                              )}
                              {((user as any).hubNames || []).length === 0 && ((user as any).pubNames || []).length === 0 && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {(user as any).isEmailVerified ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" title="Email verified" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 text-yellow-500" title="Email not verified" />
                          )}
                          {(user as any).lastLoginAt ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5" title={`Last login: ${new Date((user as any).lastLoginAt).toLocaleString()}`}>
                              <Clock className="h-3 w-3" />
                              {formatRelativeDate((user as any).lastLoginAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never logged in</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdminConfirmUser(user);
                          }}
                          disabled={!user.userId || updatingUsers.has(user.userId || '')}
                          variant={user.isAdmin ? 'destructive' : 'outline'}
                          size="sm"
                          className="text-xs h-7"
                        >
                          {updatingUsers.has(user.userId || '') ? (
                            <Spinner size="sm" />
                          ) : (
                            user.isAdmin ? 'Remove Admin' : 'Make Admin'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="border-l-2 border-primary/30 ml-4">
                            <UserDetailPanel
                              user={user}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      </>)}

      {/* Admin toggle confirmation dialog */}
      <AlertDialog open={!!adminConfirmUser} onOpenChange={(open) => !open && setAdminConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminConfirmUser?.isAdmin ? 'Remove Admin Privileges' : 'Grant Admin Privileges'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {adminConfirmUser?.isAdmin
                  ? <>Are you sure you want to remove admin privileges from <strong>{getUserDisplayName(adminConfirmUser)}</strong>?</>
                  : <>Are you sure you want to grant admin privileges to <strong>{adminConfirmUser ? getUserDisplayName(adminConfirmUser) : ''}</strong>?</>
                }
              </span>
              {adminConfirmUser?.email && (
                <span className="block text-xs">{adminConfirmUser.email}</span>
              )}
              <span className="block text-xs">
                {adminConfirmUser?.isAdmin
                  ? 'This user will lose access to admin tools and will be restricted to their assigned resources.'
                  : 'This user will gain full access to all hubs, publications, and admin tools across the entire platform.'}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={adminConfirmUser?.isAdmin ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={() => {
                if (adminConfirmUser) {
                  toggleAdminStatus(adminConfirmUser);
                  setAdminConfirmUser(null);
                }
              }}
            >
              {adminConfirmUser?.isAdmin ? 'Yes, Remove Admin' : 'Yes, Grant Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Format a date relative to now (e.g., "2h ago", "3d ago") */
function formatRelativeDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
