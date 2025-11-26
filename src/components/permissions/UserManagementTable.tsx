import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/CustomAuthContext';
import { permissionsAPI } from '@/api/permissions';
import { UserX, Shield, User as UserIcon, Mail } from 'lucide-react';

interface UserManagementTableProps {
  resourceType: 'hub' | 'publication';
  resourceId: string;
  onUsersChange?: () => void;
  filteredUsers?: any[];
  filteredInvitations?: any[];
}

export function UserManagementTable({
  resourceType,
  resourceId,
  onUsersChange,
  filteredUsers: externalFilteredUsers,
  filteredInvitations: externalFilteredInvitations,
}: UserManagementTableProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToRemove, setUserToRemove] = useState<any | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<any | null>(null);
  const [removing, setRemoving] = useState(false);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Use external filtered data if provided, otherwise use internal state
  const displayUsers = externalFilteredUsers !== undefined ? externalFilteredUsers : users;
  const displayInvitations = externalFilteredInvitations !== undefined ? externalFilteredInvitations : invitations;

  const loadUsers = async () => {
    setLoading(true);
    
    // Load current users
    const result =
      resourceType === 'hub'
        ? await permissionsAPI.getHubUsers(resourceId)
        : await permissionsAPI.getPublicationUsers(resourceId);

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
    const invitationsResult = await permissionsAPI.getResourceInvitations(resourceType, resourceId);
    if (invitationsResult.invitations) {
      setInvitations(invitationsResult.invitations);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // Only load if external data is not provided
    if (externalFilteredUsers === undefined && externalFilteredInvitations === undefined) {
      loadUsers();
    } else {
      // When external data is provided, we're not loading internally
      setLoading(false);
    }
  }, [resourceType, resourceId, externalFilteredUsers, externalFilteredInvitations]);

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    setRemoving(true);

    const result =
      resourceType === 'hub'
        ? await permissionsAPI.revokeHubAccess({
            userId: userToRemove.id,
            hubId: resourceId,
          })
        : await permissionsAPI.revokePublicationAccess({
            userId: userToRemove.id,
            publicationId: resourceId,
          });

    setRemoving(false);

    if (result.success) {
      toast({
        title: 'Access Revoked',
        description: `${userToRemove.email}'s access has been removed`,
      });
      setUserToRemove(null);
      loadUsers();
      onUsersChange?.();
    } else {
      toast({
        title: 'Failed to Remove User',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    setRemoving(true);

    const result = await permissionsAPI.cancelInvitation(invitationToCancel._id);

    setRemoving(false);

    if (result.success) {
      toast({
        title: 'Invitation Cancelled',
        description: `Invitation to ${invitationToCancel.invitedEmail} has been cancelled`,
      });
      setInvitationToCancel(null);
      loadUsers();
      onUsersChange?.();
    } else {
      toast({
        title: 'Failed to Cancel Invitation',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (invitation: any) => {
    setResendingInvitation(invitation._id);

    const result = await permissionsAPI.resendInvitation(invitation._id);

    setResendingInvitation(null);

    if (result.success) {
      toast({
        title: 'Invitation Resent',
        description: `A new invitation email has been sent to ${invitation.invitedEmail}`,
      });
      loadUsers();
      onUsersChange?.();
    } else {
      toast({
        title: 'Failed to Resend Invitation',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (user: any) => {
    if (user.isAdmin || user.role === 'admin') {
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }

    if (user.role === 'hub_user') {
      return <Badge variant="secondary">Hub User</Badge>;
    }

    if (user.role === 'publication_user') {
      return <Badge variant="secondary">Publication User</Badge>;
    }

    return <Badge variant="outline">Standard</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  if (displayUsers.length === 0 && displayInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <UserIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">No team members yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Invite users to start collaborating
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              {resourceType === 'hub' && <TableHead>Access Level</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Pending Invitations */}
            {displayInvitations.map((invitation) => (
              <TableRow key={invitation._id} className="bg-muted/30">
                <TableCell className="font-medium text-muted-foreground">
                  Pending...
                </TableCell>
                <TableCell>{invitation.invitedEmail}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                    Invitation Sent
                  </Badge>
                </TableCell>
                {resourceType === 'hub' && <TableCell>-</TableCell>}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation)}
                      disabled={
                        resendingInvitation === invitation._id ||
                        invitationToCancel?._id === invitation._id ||
                        removing
                      }
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {resendingInvitation === invitation._id ? 'Sending...' : 'Resend'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInvitationToCancel(invitation)}
                      disabled={
                        resendingInvitation === invitation._id ||
                        invitationToCancel?._id === invitation._id ||
                        removing
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Active Users */}
            {displayUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : 'Unknown'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user)}</TableCell>
                {resourceType === 'hub' && (
                  <TableCell>
                    <Badge variant="outline">{user.accessLevel || 'full'}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {user.id === currentUser?.id ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-muted-foreground cursor-not-allowed"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>You cannot remove your own access</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToRemove(user)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Remove User Dialog */}
      <AlertDialog
        open={!!userToRemove}
        onOpenChange={(open) => !open && setUserToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToRemove?.email}</strong>'s access to this{' '}
              {resourceType}? They will no longer be able to manage it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removing...' : 'Remove Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog
        open={!!invitationToCancel}
        onOpenChange={(open) => !open && setInvitationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{invitationToCancel?.invitedEmail}</strong>? They will not be able to use the
              invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Cancelling...' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

