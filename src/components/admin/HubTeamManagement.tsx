import { useHubContext } from '@/contexts/HubContext';
import { ResourceUserManagement } from '@/components/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Info } from 'lucide-react';

/**
 * Hub Team Management Component
 * 
 * Allows hub users to manage their team members and invite new users to the hub.
 * This is the hub user's interface (not admin).
 */
export const HubTeamManagement = () => {
  const { selectedHub } = useHubContext();

  if (!selectedHub) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Hub Selected</h3>
        <p className="text-muted-foreground">
          Please select a hub from the dropdown to manage team members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
        <p className="text-muted-foreground mt-2">
          Invite and manage team members for {selectedHub.basicInfo.name}
        </p>
      </div>

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Team members you invite will have full access to manage this hub and all publications within it. 
          They can also invite additional team members.
        </AlertDescription>
      </Alert>

      {/* User Management Component */}
      <ResourceUserManagement
        resourceType="hub"
        resourceId={selectedHub.hubId}
        resourceName={selectedHub.basicInfo.name}
        canManageUsers={true}
      />

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Member Permissions</CardTitle>
          <CardDescription>
            What team members can do once they accept the invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Manage all publications within this hub</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>View and respond to leads</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Create and manage packages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Invite additional team members</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Export hub data and reports</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

