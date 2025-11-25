import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { permissionsAPI } from '@/api/permissions';
import { UserManagementTable } from '@/components/permissions/UserManagementTable';
import { UserInviteDialog } from '@/components/permissions/UserInviteDialog';
import { 
  Settings, 
  Save,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Globe,
  Users,
  Mail,
  Calendar,
  AlertTriangle,
  UserPlus,
  X
} from 'lucide-react';

export const PublicationSettings: React.FC = () => {
  const { selectedPublication } = usePublication();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Team management state
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Get default settings function
  const getDefaultSettings = () => ({
    visibility: {
      isPublic: true,
      showInDirectory: true,
      allowPublicContact: true
    },
    notifications: {
      emailAlerts: true,
      leadNotifications: true,
      inventoryUpdates: false,
      weeklyReports: true
    },
    advertising: {
      autoApprove: false,
      requireDeposit: true,
      minimumBookingDays: 7,
      cancellationPolicy: 'flexible'
    }
  });

  const [settings, setSettings] = useState(getDefaultSettings());

  // Reset settings when publication changes
  useEffect(() => {
    setSettings(getDefaultSettings());
  }, [selectedPublication?.publicationId]);

  // Load users when publication changes
  useEffect(() => {
    if (selectedPublication) {
      loadUsers();
    }
  }, [selectedPublication, refreshKey]);

  const loadUsers = async () => {
    if (!selectedPublication) return;

    setLoadingUsers(true);
    
    // Load current users
    const result = await permissionsAPI.getPublicationUsers(selectedPublication.publicationId.toString());

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
    const invitationsResult = await permissionsAPI.getResourceInvitations('publication', selectedPublication.publicationId.toString());
    if (invitationsResult.invitations) {
      setInvitations(invitationsResult.invitations);
    }
    
    setLoadingUsers(false);
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

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedPublication?.publicationId) {
      console.error('❌ No publication selected');
      return;
    }
    
    setSaving(true);
    try {
      // Here you would save the settings (visibility, notifications, advertising)
      // For now, just show success message
      console.log('💾 Saving settings:', settings);
      
      toast({
        title: "Settings saved",
        description: "Your publication settings have been updated successfully.",
      });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const filteredUsers = filterUsers(users);
  const filteredInvitations = filterInvitations(invitations);
  const totalCount = filteredUsers.length + filteredInvitations.length;
  const filterTriggerClass =
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-white hover:bg-[#F9F8F3] hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold font-sans text-slate-900">Publication Settings</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setInviteDialogOpen(true)} variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Team Management Section */}
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
          {loadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading team members...</div>
            </div>
          ) : (
            <UserManagementTable
              key={refreshKey}
              resourceType="publication"
              resourceId={selectedPublication.publicationId.toString()}
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
        resourceType="publication"
        resourceId={selectedPublication.publicationId.toString()}
        resourceName={selectedPublication.basicInfo?.publicationName || 'Publication'}
        onInviteSent={() => setRefreshKey(prev => prev + 1)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Eye className="h-5 w-5" />
              Visibility & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Make your publication visible to all users
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={settings.visibility.isPublic}
                onCheckedChange={(checked) => updateSetting('visibility', 'isPublic', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showInDirectory">Show in Directory</Label>
                <p className="text-sm text-muted-foreground">
                  Display in the public publications directory
                </p>
              </div>
              <Switch
                id="showInDirectory"
                checked={settings.visibility.showInDirectory}
                onCheckedChange={(checked) => updateSetting('visibility', 'showInDirectory', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowPublicContact">Allow Public Contact</Label>
                <p className="text-sm text-muted-foreground">
                  Let users contact you directly through the platform
                </p>
              </div>
              <Switch
                id="allowPublicContact"
                checked={settings.visibility.allowPublicContact}
                onCheckedChange={(checked) => updateSetting('visibility', 'allowPublicContact', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailAlerts">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important notifications via email
                </p>
              </div>
              <Switch
                id="emailAlerts"
                checked={settings.notifications.emailAlerts}
                onCheckedChange={(checked) => updateSetting('notifications', 'emailAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="leadNotifications">Lead Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new leads come in
                </p>
              </div>
              <Switch
                id="leadNotifications"
                checked={settings.notifications.leadNotifications}
                onCheckedChange={(checked) => updateSetting('notifications', 'leadNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inventoryUpdates">Inventory Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for inventory changes
                </p>
              </div>
              <Switch
                id="inventoryUpdates"
                checked={settings.notifications.inventoryUpdates}
                onCheckedChange={(checked) => updateSetting('notifications', 'inventoryUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklyReports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly performance summaries
                </p>
              </div>
              <Switch
                id="weeklyReports"
                checked={settings.notifications.weeklyReports}
                onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advertising Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Shield className="h-5 w-5" />
              Advertising Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoApprove">Auto-approve Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve advertising requests
                </p>
              </div>
              <Switch
                id="autoApprove"
                checked={settings.advertising.autoApprove}
                onCheckedChange={(checked) => updateSetting('advertising', 'autoApprove', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireDeposit">Require Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Require upfront payment for bookings
                </p>
              </div>
              <Switch
                id="requireDeposit"
                checked={settings.advertising.requireDeposit}
                onCheckedChange={(checked) => updateSetting('advertising', 'requireDeposit', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumBookingDays">Minimum Booking Period (days)</Label>
              <Input
                id="minimumBookingDays"
                type="number"
                value={settings.advertising.minimumBookingDays}
                onChange={(e) => updateSetting('advertising', 'minimumBookingDays', parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
              <Select 
                value={settings.advertising.cancellationPolicy}
                onValueChange={(value) => updateSetting('advertising', 'cancellationPolicy', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible - Free cancellation up to 24 hours</SelectItem>
                  <SelectItem value="moderate">Moderate - 50% refund if cancelled within 48 hours</SelectItem>
                  <SelectItem value="strict">Strict - No refunds after booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive font-sans text-base">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-semibold">Archive Publication</h3>
              <p className="text-sm text-muted-foreground">
                Hide this publication from public view while preserving data
              </p>
            </div>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              Archive
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-semibold">Delete Publication</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete this publication and all associated data
              </p>
            </div>
            <Button variant="destructive">
              Delete Forever
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
