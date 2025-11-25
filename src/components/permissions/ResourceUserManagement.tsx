import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { UserInviteDialog } from './UserInviteDialog';
import { UserManagementTable } from './UserManagementTable';

interface ResourceUserManagementProps {
  resourceType: 'hub' | 'publication';
  resourceId: string;
  resourceName: string;
  canManageUsers?: boolean;
  showHeader?: boolean;
}

/**
 * Reusable component for managing user access to a resource (hub or publication).
 * Can be embedded in Hub or Publication detail pages.
 */
export function ResourceUserManagement({
  resourceType,
  resourceId,
  resourceName,
  canManageUsers = true,
  showHeader = true,
}: ResourceUserManagementProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!canManageUsers) {
    return null;
  }

  // If showHeader is false, just render the table without the card wrapper
  if (!showHeader) {
    return (
      <>
        <UserManagementTable
          key={refreshKey}
          resourceType={resourceType}
          resourceId={resourceId}
          onUsersChange={() => setRefreshKey(prev => prev + 1)}
        />

        <UserInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceName={resourceName}
          onInviteSent={() => setRefreshKey(prev => prev + 1)}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-sans">User Access</CardTitle>
          <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <UserManagementTable
          key={refreshKey}
          resourceType={resourceType}
          resourceId={resourceId}
          onUsersChange={() => setRefreshKey(prev => prev + 1)}
        />
      </CardContent>

      <UserInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
        onInviteSent={() => setRefreshKey(prev => prev + 1)}
      />
    </Card>
  );
}

