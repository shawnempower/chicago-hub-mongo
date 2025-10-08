import React, { useState } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Palette,
  Globe,
  Users,
  Mail,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const PublicationSettings: React.FC = () => {
  const { selectedPublication } = usePublication();
  const [saving, setSaving] = useState(false);
  
  // Mock settings state - in real implementation, this would come from API
  const [settings, setSettings] = useState({
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
    },
    branding: {
      primaryColor: '#0066cc',
      accentColor: '#ff6b35',
      logoUrl: '',
      customDomain: ''
    }
  });

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // API call to save settings would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Publication Settings</h2>
          <p className="text-muted-foreground">
            Configure settings for {selectedPublication.basicInfo.publicationName}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
            <CardTitle className="flex items-center gap-2">
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
            <CardTitle className="flex items-center gap-2">
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

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding & Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateSetting('branding', 'primaryColor', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateSetting('branding', 'primaryColor', e.target.value)}
                    placeholder="#0066cc"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={settings.branding.accentColor}
                    onChange={(e) => updateSetting('branding', 'accentColor', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={settings.branding.accentColor}
                    onChange={(e) => updateSetting('branding', 'accentColor', e.target.value)}
                    placeholder="#ff6b35"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={settings.branding.logoUrl}
                onChange={(e) => updateSetting('branding', 'logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                value={settings.branding.customDomain}
                onChange={(e) => updateSetting('branding', 'customDomain', e.target.value)}
                placeholder="your-publication.com"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to set up custom domain routing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
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
