import { useHubContext } from '@/contexts/HubContext';
import { ResourceUserManagement } from '@/components/permissions';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
      {/* Header with Team Permissions Button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
        </div>

        {/* Member Permissions Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className="text-orange-500 hover:text-orange-600 hover:bg-transparent"
            >
              <Info className="h-4 w-4 mr-2" />
              Member Permissions
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">✓</span>
                  <span>Manage all publications within this hub</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">✓</span>
                  <span>View and respond to leads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">✓</span>
                  <span>Create and manage packages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">✓</span>
                  <span>Invite additional team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">✓</span>
                  <span>Export hub data and reports</span>
                </li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* User Management Component */}
      <ResourceUserManagement
        resourceType="hub"
        resourceId={selectedHub.hubId}
        resourceName={selectedHub.basicInfo.name}
        canManageUsers={true}
      />
    </div>
  );
};

