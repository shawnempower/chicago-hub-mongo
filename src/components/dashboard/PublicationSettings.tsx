import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { API_BASE_URL } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { permissionsAPI } from '@/api/permissions';
import { UserManagementTable } from '@/components/permissions/UserManagementTable';
import { UserInviteDialog } from '@/components/permissions/UserInviteDialog';
import { 
  Save,
  Globe,
  UserPlus,
  X,
  Code,
  Newspaper
} from 'lucide-react';
import { getAdServerOptions, getESPOptions } from '@/utils/trackingTagTransforms';
import type { PublicationAdServer, PublicationESP } from '@/integrations/mongodb/schemas';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';

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
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  // Get default settings function
  const getDefaultSettings = () => ({
    adDelivery: {
      adServer: (selectedPublication?.adDeliverySettings?.adServer || 'direct') as PublicationAdServer,
      esp: (selectedPublication?.adDeliverySettings?.esp || 'other') as PublicationESP,
      espOther: selectedPublication?.adDeliverySettings?.espOther || {
        name: '',
        emailIdMergeTag: '',
        cacheBusterMergeTag: ''
      }
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
      const token = localStorage.getItem('auth_token');
      
      // Save ad delivery settings to publications collection
      const response = await fetch(`${API_BASE_URL}/publications/${selectedPublication.publicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adDeliverySettings: {
            adServer: settings.adDelivery.adServer,
            esp: settings.adDelivery.esp,
            espOther: settings.adDelivery.esp === 'other' ? settings.adDelivery.espOther : undefined
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      console.log('💾 Settings saved:', settings);
      
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
    'justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-background hover:bg-muted hover:text-foreground shadow-sm transition-all duration-200 h-9 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold font-sans text-slate-900">Publication Settings</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
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

      {/* Ad Delivery Settings - Full width, right below Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-sans text-base">
            <Code className="h-5 w-5" />
            Ad Delivery Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how tracking tags are formatted for your ad servers and email platforms
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Web/Display Ad Server */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-sm">Web/Display Ads</h4>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adServer">Ad Server Platform</Label>
                <Select 
                  value={settings.adDelivery.adServer}
                  onValueChange={(value: PublicationAdServer) => updateSetting('adDelivery', 'adServer', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your ad server" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAdServerOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {settings.adDelivery.adServer === 'gam' && 'Tags will include GAM click macros (%%CLICK_URL_UNESC%%) and cache busters (%%CACHEBUSTER%%)'}
                  {settings.adDelivery.adServer === 'broadstreet' && 'Tags will include Broadstreet click macros ({{click}}) and timestamps ([timestamp])'}
                  {settings.adDelivery.adServer === 'adbutler' && 'Tags will include AdButler click macros ([TRACKING_LINK]) and cache busters ([RANDOM])'}
                  {settings.adDelivery.adServer === 'direct' && 'Tags will use JavaScript for dynamic cache busting - paste directly into your CMS'}
                </p>
              </div>
            </div>

            {/* Newsletter ESP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="h-4 w-4 text-purple-600" />
                <h4 className="font-medium text-sm">Newsletter Ads</h4>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="esp">Email Service Provider</Label>
                <Select 
                  value={settings.adDelivery.esp}
                  onValueChange={(value: PublicationESP) => updateSetting('adDelivery', 'esp', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your ESP" />
                  </SelectTrigger>
                  <SelectContent>
                    {getESPOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Newsletter tags will use your ESP's merge tag syntax for subscriber tracking
                </p>
              </div>

              {/* Custom ESP fields when "other" is selected */}
              {settings.adDelivery.esp === 'other' && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                  <p className="text-xs font-medium text-muted-foreground">Custom ESP Merge Tags</p>
                  <div className="space-y-2">
                    <Label htmlFor="espName" className="text-xs">ESP Name</Label>
                    <Input
                      id="espName"
                      placeholder="e.g., My Email Platform"
                      value={settings.adDelivery.espOther?.name || ''}
                      onChange={(e) => updateSetting('adDelivery', 'espOther', {
                        ...settings.adDelivery.espOther,
                        name: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailIdTag" className="text-xs">Subscriber ID Merge Tag</Label>
                    <Input
                      id="emailIdTag"
                      placeholder="e.g., {{subscriber.id}}"
                      value={settings.adDelivery.espOther?.emailIdMergeTag || ''}
                      onChange={(e) => updateSetting('adDelivery', 'espOther', {
                        ...settings.adDelivery.espOther,
                        emailIdMergeTag: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cacheBusterTag" className="text-xs">Timestamp/Cache Buster Merge Tag</Label>
                    <Input
                      id="cacheBusterTag"
                      placeholder="e.g., {{timestamp}}"
                      value={settings.adDelivery.espOther?.cacheBusterMergeTag || ''}
                      onChange={(e) => updateSetting('adDelivery', 'espOther', {
                        ...settings.adDelivery.espOther,
                        cacheBusterMergeTag: e.target.value
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Danger Zone - Commented out until functionality is implemented
      <Collapsible defaultOpen={false}>
        <Card className="border-destructive/50">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-destructive/5 transition-colors">
              <CardTitle className="flex items-center justify-between text-destructive font-sans text-base">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
      */}

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Settings"
        activityTypes={['settings_update']}
        publicationId={selectedPublication?._id?.toString()}
      />
    </div>
  );
};
