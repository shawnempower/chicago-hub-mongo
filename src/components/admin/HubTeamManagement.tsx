import { useHubContext } from '@/contexts/HubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { permissionsAPI } from '@/api/permissions';
import { useToast } from '@/hooks/use-toast';
import { UserManagementTable } from '@/components/permissions/UserManagementTable';
import { UserInviteDialog } from '@/components/permissions/UserInviteDialog';

/**
 * Hub Team Management Component
 * 
 * Allows hub users to manage their team members and invite new users to the hub.
 * This is the hub user's interface (not admin).
 */
export const HubTeamManagement = () => {
  const { selectedHub } = useHubContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedHub) {
      loadUsers();
    }
  }, [selectedHub, refreshKey]);

  const loadUsers = async () => {
    if (!selectedHub) return;

    setLoading(true);
    
    // Load current users
    const result = await permissionsAPI.getHubUsers(selectedHub.hubId);

    if (result.users) {
      setUsers(result.users);
    } else if (result.error) {
      toast({
        title: 'Failed to Load Users',
        description: result.error,
        variant: 'destructive',
      });
    }
    
    // Load pending invitations
    const invitationsResult = await permissionsAPI.getResourceInvitations('hub', selectedHub.hubId);
    if (invitationsResult.invitations) {
      setInvitations(invitationsResult.invitations);
    }
    
    setLoading(false);
  };

  const filterUsers = (userList: any[]) => {
    if (!searchTerm) return userList;
    
    const search = searchTerm.toLowerCase();
    return userList.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      const email = user.email?.toLowerCase() || '';
      return fullName.includes(search) || email.includes(search);
    });
  };

  const filterInvitations = (invitationList: any[]) => {
    if (!searchTerm) return invitationList;
    
    const search = searchTerm.toLowerCase();
    return invitationList.filter(inv => 
      inv.invitedEmail?.toLowerCase().includes(search)
    );
  };

  if (!selectedHub) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-sans font-semibold mb-2">No Hub Selected</h3>
        <p className="text-muted-foreground">
          Please select a hub from the dropdown to manage team members.
        </p>
      </div>
    );
  }

  const filteredUsers = filterUsers(users);
  const filteredInvitations = filterInvitations(invitations);
  const totalCount = filteredUsers.length + filteredInvitations.length;
  const filterTriggerClass =
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold font-sans text-slate-900">Team Management</h2>
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold font-sans text-slate-900">
              Team Members ({totalCount})
            </CardTitle>
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="relative min-w-[200px]">
                <Input
                  placeholder="Search members…"
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
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading team members...</div>
            </div>
          ) : (
            <UserManagementTable
              key={refreshKey}
              resourceType="hub"
              resourceId={selectedHub.hubId}
              onUsersChange={() => setRefreshKey(prev => prev + 1)}
              filteredUsers={filteredUsers}
              filteredInvitations={filteredInvitations}
            />
          )}
        </CardContent>
      </Card>

      <UserInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        resourceType="hub"
        resourceId={selectedHub.hubId}
        resourceName={selectedHub.basicInfo.name}
        onInviteSent={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};
