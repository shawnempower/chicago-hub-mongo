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
import { getStorefrontConfiguration, updateStorefrontConfiguration, createStorefrontConfiguration } from '@/api/storefront';
import { StorefrontConfiguration, createDefaultStorefrontConfig } from '@/types/storefront';
import { clearBrandColorCache } from '@/config/publicationBrandColors';
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
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfiguration | null>(null);
  
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
    },
    branding: {
      primaryColor: '#0066cc',
      accentColor: '#ff6b35',
      logoUrl: '',
      customDomain: ''
    }
  });

  const [settings, setSettings] = useState(getDefaultSettings());

  // Load storefront configuration for brand colors and reset settings when publication changes
  useEffect(() => {
    // Reset settings to defaults when publication changes
    setSettings(getDefaultSettings());
    setStorefrontConfig(null);
    
    const fetchStorefront = async () => {
      if (selectedPublication?.publicationId) {
        const pubIdString = String(selectedPublication.publicationId);
        console.log('🔍 Fetching storefront for publication:', pubIdString);
        try {
          const config = await getStorefrontConfiguration(pubIdString);
          console.log('📦 Fetched config:', config);
          if (config) {
            setStorefrontConfig(config);
            // Update settings with actual colors from storefront
            setSettings(prev => ({
              ...prev,
              branding: {
                ...prev.branding,
                primaryColor: config.theme?.colors?.gradStart || config.theme?.colors?.lightPrimary || '#0066cc',
                accentColor: config.theme?.colors?.gradEnd || config.theme?.colors?.darkPrimary || '#ff6b35',
              }
            }));
            console.log('✅ Config loaded and state updated');
          } else {
            console.log('⚠️ No config found for publication');
          }
        } catch (error) {
          console.error('❌ Error fetching storefront configuration:', error);
          // Even if fetch fails, we stay with default settings
        }
      }
    };
    fetchStorefront();
  }, [selectedPublication?.publicationId]);

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
    
    const pubIdString = String(selectedPublication.publicationId);
    
    console.log('💾 Starting save...', {
      publicationId: pubIdString,
      primaryColor: settings.branding.primaryColor,
      hasStorefrontConfig: !!storefrontConfig
    });
    
    setSaving(true);
    try {
      let configToUpdate = storefrontConfig;
      
      // If we don't have the config in state, try to fetch it first
      if (!configToUpdate) {
        console.log('📥 Fetching existing storefront config...');
        try {
          configToUpdate = await getStorefrontConfiguration(pubIdString);
          if (configToUpdate) {
            console.log('✅ Found existing config');
            setStorefrontConfig(configToUpdate);
          }
        } catch (fetchError) {
          console.log('ℹ️ No existing config found, will create new one');
        }
      }
      
      // Update or create the configuration
      if (configToUpdate) {
        console.log('📝 Updating existing storefront config...');
        const updatedConfig = await updateStorefrontConfiguration(pubIdString, {
          theme: {
            ...configToUpdate.theme,
            colors: {
              ...configToUpdate.theme.colors,
              gradStart: settings.branding.primaryColor,
              lightPrimary: settings.branding.primaryColor,
            }
          }
        });
        console.log('✅ Updated config:', updatedConfig);
        
        if (updatedConfig) {
          setStorefrontConfig(updatedConfig);
        }
      } else {
        console.log('📝 Creating new storefront config...');
        const defaultConfig = createDefaultStorefrontConfig(selectedPublication.publicationId);
        
        const createdConfig = await createStorefrontConfiguration({
          ...defaultConfig,
          publicationId: pubIdString,
          theme: {
            ...defaultConfig.theme,
            colors: {
              ...defaultConfig.theme.colors,
              gradStart: settings.branding.primaryColor,
              lightPrimary: settings.branding.primaryColor,
            }
          }
        });
        console.log('✅ Created config:', createdConfig);
        setStorefrontConfig(createdConfig);
      }
      
      // Clear the brand color cache for this publication to force a refresh
      clearBrandColorCache(pubIdString);
      
      toast({
        title: "Success",
        description: "Brand colors saved successfully. Refreshing..."
      });
      
      // Force a page reload after a short delay to sync all components
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save brand colors.",
        variant: "destructive"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground font-serif">
            Publication Settings
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

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
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
