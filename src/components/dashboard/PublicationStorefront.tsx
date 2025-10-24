import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Store, 
  Plus,
  Settings,
  Eye,
  Package,
  TrendingUp,
  Users,
  Calendar,
  ExternalLink,
  Bell,
  Save,
  Palette,
  Layout,
  Globe,
  BarChart3,
  FileText,
  Copy,
  Upload
} from 'lucide-react';
import { StorefrontConfiguration, validateStorefrontConfig } from '@/types/storefront';
import { getStorefrontConfiguration, createStorefrontConfiguration, updateStorefrontConfiguration, publishStorefrontConfiguration, createDraftStorefrontConfiguration } from '@/api/storefront';
import { StorefrontEditor } from './StorefrontEditor';
import { StorefrontImageManager } from './StorefrontImageManager';

export const PublicationStorefront: React.FC = () => {
  const { selectedPublication } = usePublication();
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('settings'); // Start with settings tab (first tab)
  const [hasChanges, setHasChanges] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [viewingVersion, setViewingVersion] = useState<'draft' | 'live'>('draft'); // Track which version we're viewing
  const [hasDraft, setHasDraft] = useState(false); // Track if draft exists
  const [hasLive, setHasLive] = useState(false); // Track if live exists
  const [domainError, setDomainError] = useState<string | null>(null); // Domain validation error

  useEffect(() => {
    if (selectedPublication) {
      loadStorefrontConfig();
    }
  }, [selectedPublication]);

  const loadStorefrontConfig = async () => {
    if (!selectedPublication?.publicationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check for both draft and live versions
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const authToken = localStorage.getItem('auth_token');
      const pubId = selectedPublication.publicationId.toString();
      
      // Check for draft
      const draftResponse = await fetch(`${API_BASE_URL}/storefront/${pubId}?isDraft=true`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const draftExists = draftResponse.ok;
      setHasDraft(draftExists);
      
      // Check for live
      const liveResponse = await fetch(`${API_BASE_URL}/storefront/${pubId}?isDraft=false`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const liveExists = liveResponse.ok;
      setHasLive(liveExists);
      
      // Load config: prefer draft if it exists, otherwise live
      let config = null;
      if (draftExists) {
        config = await draftResponse.json();
        setViewingVersion('draft');
      } else if (liveExists) {
        config = await liveResponse.json();
        setViewingVersion('live');
      }
      
      setStorefrontConfig(config);
    } catch (err) {
      console.error('Error loading storefront configuration:', err);
      setError('Failed to load storefront configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleImportStorefront = async () => {
    if (!selectedPublication) return;
    
    try {
      setSaving(true);
      setError(null);
      setImportError(null);
      
      // Parse JSON
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(importJson);
      } catch (parseError) {
        setImportError('Invalid JSON format. Please check your JSON syntax.');
        return;
      }
      
      // Validate the configuration
      const validationErrors = validateStorefrontConfig(parsedConfig);
      if (validationErrors.length > 0) {
        setImportError(`Configuration validation failed:\n${validationErrors.join('\n')}`);
        return;
      }
      
      // Add publication ID and ensure proper structure
      const configToImport = {
        ...parsedConfig,
        publicationId: selectedPublication.publicationId.toString(),
        meta: {
          ...parsedConfig.meta,
          lastUpdated: new Date().toISOString(),
          publisherId: parsedConfig.meta.publisherId || selectedPublication.basicInfo.publicationName.toLowerCase().replace(/\s+/g, '_')
        }
      };
      
      const newConfig = await createStorefrontConfiguration(configToImport);
      
      setStorefrontConfig(newConfig);
      setActiveTab('editor');
      setImportJson(''); // Clear the input
    } catch (err) {
      console.error('Error importing storefront:', err);
      setError('Failed to import storefront configuration');
    } finally {
      setSaving(false);
    }
  };

  // Validate website URL is a subdomain of .localmedia.store
  const validateWebsiteUrl = (url: string): boolean => {
    if (!url || url.trim() === '') {
      setDomainError(null);
      return true; // Empty is allowed
    }
    
    const trimmedUrl = url.trim().toLowerCase();
    
    // Remove protocol if present
    const urlWithoutProtocol = trimmedUrl.replace(/^https?:\/\//, '');
    
    // Check if it ends with .localmedia.store
    if (!urlWithoutProtocol.endsWith('.localmedia.store')) {
      setDomainError('Domain must be a subdomain of .localmedia.store (e.g., yourname.localmedia.store)');
      return false;
    }
    
    // Check if it's ONLY .localmedia.store (no subdomain)
    if (urlWithoutProtocol === '.localmedia.store' || urlWithoutProtocol === 'localmedia.store') {
      setDomainError('Please provide a subdomain (e.g., yourname.localmedia.store)');
      return false;
    }
    
    // Extract subdomain part
    const subdomain = urlWithoutProtocol.replace('.localmedia.store', '');
    
    // Validate subdomain format (alphanumeric and hyphens only, can't start/end with hyphen)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      setDomainError('Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)');
      return false;
    }
    
    setDomainError(null);
    return true;
  };

  const handleSaveConfig = async (config: StorefrontConfiguration) => {
    if (!selectedPublication?.publicationId) return;
    
    // Validate website URL before saving
    if (config.meta.websiteUrl && !validateWebsiteUrl(config.meta.websiteUrl)) {
      setError(domainError || 'Please fix the website URL before saving');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const updatedConfig = await updateStorefrontConfiguration(selectedPublication.publicationId.toString(), config);
      if (updatedConfig) {
        setStorefrontConfig(updatedConfig);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Error saving storefront configuration:', err);
      setError('Failed to save storefront configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (config: StorefrontConfiguration) => {
    // Validate website URL on change
    if (config.meta.websiteUrl) {
      validateWebsiteUrl(config.meta.websiteUrl);
    }
    
    setStorefrontConfig(config);
    setHasChanges(true);
  };

  // Check if storefront is ready to publish
  const isReadyToPublish = () => {
    if (!storefrontConfig) return { ready: false, reason: 'No configuration' };
    
    // Check if domain is set
    if (!storefrontConfig.meta.websiteUrl) {
      return { ready: false, reason: 'Storefront domain is required' };
    }
    
    // Validate domain format
    const urlWithoutProtocol = storefrontConfig.meta.websiteUrl.replace(/^https?:\/\//, '').toLowerCase();
    if (!urlWithoutProtocol.endsWith('.localmedia.store')) {
      return { ready: false, reason: 'Domain must be a subdomain of .localmedia.store' };
    }
    
    const subdomain = urlWithoutProtocol.replace('.localmedia.store', '');
    if (!subdomain || subdomain === '' || subdomain === '.') {
      return { ready: false, reason: 'Please provide a subdomain (e.g., yourname.localmedia.store)' };
    }
    
    return { ready: true, reason: null };
  };

  const handlePublishDraft = async () => {
    if (!selectedPublication?.publicationId) return;
    
    // Check if ready to publish
    const readyCheck = isReadyToPublish();
    if (!readyCheck.ready) {
      setError(readyCheck.reason || 'Cannot publish yet');
      // Scroll to domain field if that's the issue
      if (readyCheck.reason?.toLowerCase().includes('domain')) {
        document.getElementById('website-url')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    if (!confirm(`Are you sure you want to publish this draft?\n\nYour storefront will be live at:\n${storefrontConfig?.meta.websiteUrl}`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const publishedConfig = await publishStorefrontConfiguration(selectedPublication.publicationId.toString());
      if (publishedConfig) {
        setStorefrontConfig(publishedConfig);
        setViewingVersion('live');
        setHasDraft(false); // Draft was deleted during publish
        setHasLive(true); // New live version created
        setHasChanges(false);
        alert(`🎉 Draft published successfully!\n\nYour storefront is now live at:\n${publishedConfig.meta.websiteUrl}`);
      }
    } catch (err: any) {
      console.error('Error publishing draft:', err);
      setError(err.message || 'Failed to publish draft');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedPublication?.publicationId) return;
    
    // Confirm message changes based on whether draft exists
    const message = hasDraft 
      ? 'A draft already exists. Replace it with a fresh copy from the live version? This will discard any unsaved changes in the draft.'
      : 'Create a draft copy from the live version? You can make changes to the draft without affecting the live storefront.';
    
    if (!confirm(message)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const pubIdStr = selectedPublication.publicationId.toString();
      
      // If draft exists, delete it first
      if (hasDraft) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const authToken = localStorage.getItem('auth_token');
        
        // Delete existing draft
        const deleteResponse = await fetch(`${API_BASE_URL}/storefront/${pubIdStr}?isDraft=true`, {
          method: 'DELETE',
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete existing draft');
        }
      }
      
      // Create new draft from live
      const draftConfig = await createDraftStorefrontConfiguration(pubIdStr);
      if (draftConfig) {
        setStorefrontConfig(draftConfig);
        setViewingVersion('draft');
        setHasDraft(true);
        setHasChanges(false);
        alert(hasDraft ? 'Draft replaced successfully! You are now editing the new draft version.' : 'Draft created successfully! You are now editing the draft version.');
      }
    } catch (err: any) {
      console.error('Error creating draft:', err);
      setError(err.message || 'Failed to create draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchVersion = async (version: 'draft' | 'live') => {
    if (!selectedPublication?.publicationId) return;
    
    // Check if version exists
    if (version === 'draft' && !hasDraft) {
      setError('No draft version exists. Create a draft first.');
      return;
    }
    if (version === 'live' && !hasLive) {
      setError('No live version exists. Publish a draft first.');
      return;
    }
    
    if (hasChanges && !confirm('You have unsaved changes. Switching versions will discard them. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch the specific version
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/storefront/${selectedPublication.publicationId.toString()}?isDraft=${version === 'draft'}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const config = await response.json();
        setStorefrontConfig(config);
        setViewingVersion(version);
        setHasChanges(false);
      } else if (response.status === 404) {
        setError(`No ${version} version found`);
      }
    } catch (err: any) {
      console.error(`Error loading ${version} version:`, err);
      setError(`Failed to load ${version} version`);
    } finally {
      setLoading(false);
    }
  };

  const showSampleConfig = () => {
    const sampleConfig = {
      meta: {
        configVersion: "1.0.0",
        description: "Sample storefront configuration",
        publisherId: "sample_publisher",
        isDraft: true
      },
      theme: {
        colors: {
          lightPrimary: "#0077b6",
          darkPrimary: "#003d5c",
          mode: "light"
        },
        typography: {
          primaryFont: "Inter"
        }
      },
      components: {
        hero: {
          enabled: true,
          order: 1,
          content: {
            title: "Welcome to Our Storefront",
            description: "Your trusted local media partner"
          }
        }
      }
    };
    
    setImportJson(JSON.stringify(sampleConfig, null, 2));
  };

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading storefront configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground font-serif">
            Storefront
          </p>
          {storefrontConfig && (
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Button
                variant={viewingVersion === 'draft' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSwitchVersion('draft')}
                disabled={loading}
                className="h-8"
              >
                Draft
              </Button>
              <Button
                variant={viewingVersion === 'live' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSwitchVersion('live')}
                disabled={loading}
                className="h-8"
              >
                Live
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {storefrontConfig && (
            <>
              <Button variant="outline" disabled={!storefrontConfig || storefrontConfig.meta.isDraft}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSaveConfig(storefrontConfig)}
                disabled={!hasChanges || saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
          {!storefrontConfig && (
            <Button onClick={handleImportStorefront} disabled={saving || !importJson.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              {saving ? 'Importing...' : 'Import Configuration'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {storefrontConfig ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="settings">
              <FileText className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="editor">
              <Settings className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="theme">
              <Palette className="w-4 h-4 mr-2" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Globe className="w-4 h-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <StorefrontEditor
              config={storefrontConfig}
              onChange={handleConfigChange}
              onSave={handleSaveConfig}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            {/* Colors Section */}
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Colors</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize the color scheme for your storefront.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="light-primary">Light Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="light-primary"
                        value={storefrontConfig.theme.colors.lightPrimary}
                        onChange={(e) => handleConfigChange({
                          ...storefrontConfig,
                          theme: {
                            ...storefrontConfig.theme,
                            colors: { ...storefrontConfig.theme.colors, lightPrimary: e.target.value }
                          }
                        })}
                        placeholder="#000000"
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: storefrontConfig.theme.colors.lightPrimary }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dark-primary">Dark Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dark-primary"
                        value={storefrontConfig.theme.colors.darkPrimary}
                        onChange={(e) => handleConfigChange({
                          ...storefrontConfig,
                          theme: {
                            ...storefrontConfig.theme,
                            colors: { ...storefrontConfig.theme.colors, darkPrimary: e.target.value }
                          }
                        })}
                        placeholder="#ffffff"
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: storefrontConfig.theme.colors.darkPrimary }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="grad-start">Gradient Start</Label>
                    <div className="flex gap-2">
                      <Input
                        id="grad-start"
                        value={storefrontConfig.theme.colors.gradStart}
                        onChange={(e) => handleConfigChange({
                          ...storefrontConfig,
                          theme: {
                            ...storefrontConfig.theme,
                            colors: { ...storefrontConfig.theme.colors, gradStart: e.target.value }
                          }
                        })}
                        placeholder="#ff0000"
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: storefrontConfig.theme.colors.gradStart }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="grad-end">Gradient End</Label>
                    <div className="flex gap-2">
                      <Input
                        id="grad-end"
                        value={storefrontConfig.theme.colors.gradEnd}
                        onChange={(e) => handleConfigChange({
                          ...storefrontConfig,
                          theme: {
                            ...storefrontConfig.theme,
                            colors: { ...storefrontConfig.theme.colors, gradEnd: e.target.value }
                          }
                        })}
                        placeholder="#0000ff"
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: storefrontConfig.theme.colors.gradEnd }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="gradient-angle">Gradient Angle</Label>
                    <Input
                      id="gradient-angle"
                      type="number"
                      min="0"
                      max="360"
                      value={storefrontConfig.theme.colors.angle}
                      onChange={(e) => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          colors: { ...storefrontConfig.theme.colors, angle: parseInt(e.target.value) || 0 }
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="color-mode">Color Mode</Label>
                    <Select
                      value={storefrontConfig.theme.colors.mode}
                      onValueChange={(value: 'light' | 'dark') => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          colors: { ...storefrontConfig.theme.colors, mode: value }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cta-text-color">CTA Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cta-text-color"
                        value={storefrontConfig.theme.colors.ctaTextColor}
                        onChange={(e) => handleConfigChange({
                          ...storefrontConfig,
                          theme: {
                            ...storefrontConfig.theme,
                            colors: { ...storefrontConfig.theme.colors, ctaTextColor: e.target.value }
                          }
                        })}
                        placeholder="#ffffff"
                      />
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: storefrontConfig.theme.colors.ctaTextColor }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Gradient Preview</Label>
                  <div 
                    className="w-full h-16 rounded border mt-2"
                    style={{
                      background: `linear-gradient(${storefrontConfig.theme.colors.angle}deg, ${storefrontConfig.theme.colors.gradStart}, ${storefrontConfig.theme.colors.gradEnd})`
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Typography Section */}
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Typography</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure fonts and text styling.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-font">Primary Font</Label>
                    <Select
                      value={storefrontConfig.theme.typography.primaryFont}
                      onValueChange={(value) => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          typography: { ...storefrontConfig.theme.typography, primaryFont: value }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                        <SelectItem value="Montserrat">Montserrat</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                        <SelectItem value="Nunito">Nunito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="font-weights">Font Weights</Label>
                    <Input
                      id="font-weights"
                      value={storefrontConfig.theme.typography.fontWeights}
                      onChange={(e) => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          typography: { ...storefrontConfig.theme.typography, fontWeights: e.target.value }
                        }
                      })}
                      placeholder="400,600,700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Section */}
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Layout</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure layout and design elements.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="border-radius">Border Radius</Label>
                    <Input
                      id="border-radius"
                      type="number"
                      min="0"
                      max="50"
                      value={storefrontConfig.theme.layout?.radius || 0}
                      onChange={(e) => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          layout: { ...(storefrontConfig.theme.layout || {}), radius: parseInt(e.target.value) || 0 }
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon-weight">Icon Weight</Label>
                    <Select
                      value={storefrontConfig.theme.layout?.iconWeight || 'regular'}
                      onValueChange={(value: 'light' | 'regular' | 'bold') => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          layout: { ...(storefrontConfig.theme.layout || {}), iconWeight: value }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Section Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure individual section appearance.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(storefrontConfig.theme.sectionSettings || {}).map(([sectionName, settings]) => (
                  <div key={sectionName} className="border rounded-lg p-4">
                    <h4 className="font-medium capitalize mb-3">{sectionName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Mode</Label>
                        <Select
                          value={settings.mode}
                          onValueChange={(value: 'light' | 'dark') => handleConfigChange({
                            ...storefrontConfig,
                            theme: {
                              ...storefrontConfig.theme,
                              sectionSettings: {
                                ...(storefrontConfig.theme.sectionSettings || {}),
                                [sectionName]: { ...settings, mode: value }
                              }
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Accent Override</Label>
                        <div className="flex gap-2">
                          <Input
                            value={settings.accentOverride || ''}
                            onChange={(e) => handleConfigChange({
                              ...storefrontConfig,
                              theme: {
                                ...storefrontConfig.theme,
                                sectionSettings: {
                                  ...(storefrontConfig.theme.sectionSettings || {}),
                                  [sectionName]: { ...settings, accentOverride: e.target.value || null }
                                }
                              }
                            })}
                            placeholder="Leave empty for default"
                          />
                          {settings.accentOverride && (
                            <div 
                              className="w-10 h-10 rounded border"
                              style={{ backgroundColor: settings.accentOverride }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Basic SEO</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure basic search engine optimization settings.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seo-title">Page Title</Label>
                  <Input
                    id="seo-title"
                    value={storefrontConfig.seoMetadata?.title || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...(storefrontConfig.seoMetadata || {}), title: e.target.value }
                    })}
                    placeholder="Your Storefront Title"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(storefrontConfig.seoMetadata?.title || '').length}/60 characters (recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo-description">Meta Description</Label>
                  <Textarea
                    id="seo-description"
                    value={storefrontConfig.seoMetadata?.description || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...(storefrontConfig.seoMetadata || {}), description: e.target.value }
                    })}
                    placeholder="A brief description of your storefront..."
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(storefrontConfig.seoMetadata?.description || '').length}/160 characters (recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo-keywords">Keywords</Label>
                  <Input
                    id="seo-keywords"
                    value={(storefrontConfig.seoMetadata?.keywords || []).join(', ')}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { 
                        ...(storefrontConfig.seoMetadata || {}), 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                      }
                    })}
                    placeholder="advertising, local media, marketing, chicago"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate keywords with commas. Current: {(storefrontConfig.seoMetadata?.keywords || []).length} keywords
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Open Graph (Social Media)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how your storefront appears when shared on social media.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="og-title">Open Graph Title</Label>
                  <Input
                    id="og-title"
                    value={storefrontConfig.seoMetadata?.ogTitle || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...(storefrontConfig.seoMetadata || {}), ogTitle: e.target.value }
                    })}
                    placeholder="Title for social media sharing"
                  />
                </div>

                <div>
                  <Label htmlFor="og-description">Open Graph Description</Label>
                  <Textarea
                    id="og-description"
                    value={storefrontConfig.seoMetadata?.ogDescription || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...(storefrontConfig.seoMetadata || {}), ogDescription: e.target.value }
                    })}
                    placeholder="Description for social media sharing"
                    rows={3}
                  />
                </div>

                <div>
                  <StorefrontImageManager
                    publicationId={selectedPublication?._id || ''}
                    config={storefrontConfig}
                    onChange={handleConfigChange}
                    imageType="ogImage"
                    label="Open Graph Image"
                    description="Recommended size: 1200x630 pixels"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">SEO Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Preview how your storefront might appear in search results.
                </p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                    {storefrontConfig.seoMetadata?.title || 'Your Storefront Title'}
                  </div>
                  <div className="text-green-700 text-sm">
                    https://yoursite.com/storefront/{selectedPublication?.basicInfo.publicationName.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {storefrontConfig.seoMetadata?.description || 'Your storefront description will appear here...'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Google Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track visitor behavior and storefront performance with Google Analytics.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ga-id">Google Analytics Measurement ID</Label>
                  <Input
                    id="ga-id"
                    value={storefrontConfig.analytics?.googleAnalyticsId || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      analytics: { ...(storefrontConfig.analytics || {}), googleAnalyticsId: e.target.value }
                    })}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Measurement ID in your Google Analytics account under Admin → Data Streams
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Setup Instructions</h4>
                      <div className="text-xs text-blue-700 mt-1 space-y-1">
                        <p>1. Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Analytics</a></p>
                        <p>2. Create a new property for your storefront</p>
                        <p>3. Copy the Measurement ID (starts with G- or UA-)</p>
                        <p>4. Paste it in the field above</p>
                      </div>
                    </div>
                  </div>
                </div>

                {storefrontConfig.analytics?.googleAnalyticsId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-900">
                        Google Analytics is configured and will track your storefront visitors.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Facebook Pixel</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track conversions and optimize Facebook advertising campaigns.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fb-pixel-id">Facebook Pixel ID</Label>
                  <Input
                    id="fb-pixel-id"
                    value={storefrontConfig.analytics?.facebookPixelId || ''}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      analytics: { ...(storefrontConfig.analytics || {}), facebookPixelId: e.target.value }
                    })}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Pixel ID in Facebook Business Manager under Events Manager
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Setup Instructions</h4>
                      <div className="text-xs text-blue-700 mt-1 space-y-1">
                        <p>1. Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Facebook Business Manager</a></p>
                        <p>2. Navigate to Events Manager</p>
                        <p>3. Create or select your pixel</p>
                        <p>4. Copy the Pixel ID (15-16 digit number)</p>
                        <p>5. Paste it in the field above</p>
                      </div>
                    </div>
                  </div>
                </div>

                {storefrontConfig.analytics?.facebookPixelId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-900">
                        Facebook Pixel is configured and will track conversions and events.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Tracking Events</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Events that will be automatically tracked on your storefront.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Standard Events</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Page Views</span>
                        <Badge variant="secondary">Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Form Submissions</span>
                        <Badge variant="secondary">Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>CTA Button Clicks</span>
                        <Badge variant="secondary">Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Package Views</span>
                        <Badge variant="secondary">Auto</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Conversion Events</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Lead Generation</span>
                        <Badge variant="default">Tracked</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Quote Requests</span>
                        <Badge variant="default">Tracked</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Contact Form</span>
                        <Badge variant="default">Tracked</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span>Package Inquiries</span>
                        <Badge variant="default">Tracked</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Storefront Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control the visibility and status of your storefront.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label>Current Version</Label>
                          <Badge variant={storefrontConfig.meta.isDraft ? "secondary" : "default"}>
                            {storefrontConfig.meta.isDraft ? 'Draft' : 'Live'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {storefrontConfig.meta.isDraft 
                            ? 'You are editing a draft version' 
                            : 'You are viewing the live version'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Version Actions</Label>
                    
                    {storefrontConfig.meta.isDraft ? (
                      <div className="space-y-2">
                        {(() => {
                          const readyCheck = isReadyToPublish();
                          return (
                            <>
                              {!readyCheck.ready && (
                                <Alert className="mb-2">
                                  <AlertDescription className="text-xs">
                                    ⚠️ {readyCheck.reason} - <button 
                                      onClick={() => {
                                        setActiveTab('settings');
                                        setTimeout(() => {
                                          document.getElementById('website-url')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                      }}
                                      className="underline font-medium hover:text-primary"
                                    >
                                      Set it now
                                    </button>
                                  </AlertDescription>
                                </Alert>
                              )}
                              <Button 
                                onClick={handlePublishDraft}
                                className="w-full"
                                disabled={saving || !readyCheck.ready}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {saving ? 'Publishing...' : 'Publish Draft to Live'}
                              </Button>
                              {readyCheck.ready ? (
                                <p className="text-xs text-muted-foreground">
                                  ✅ Ready to publish to {storefrontConfig.meta.websiteUrl}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Complete requirements above to publish
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          onClick={handleCreateDraft}
                          variant="outline"
                          className="w-full"
                          disabled={saving}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {saving ? 'Creating...' : 'Create Draft from Live'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Create a draft copy to make changes without affecting the live version
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Status Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium">
                            {storefrontConfig.meta.isDraft ? 'Draft' : 'Live'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Updated:</span>
                          <span>{new Date(storefrontConfig.meta.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span>
                            {storefrontConfig.createdAt 
                              ? new Date(storefrontConfig.createdAt).toLocaleDateString()
                              : 'Unknown'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Components:</span>
                          <span>
                            {Object.values(storefrontConfig.components).filter(c => c.enabled).length} enabled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Publication Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Basic information about your publication and storefront.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="publication-name">Publication Name</Label>
                  <Input
                    id="publication-name"
                    value={selectedPublication?.basicInfo.publicationName || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Publication name cannot be changed from the storefront settings
                  </p>
                </div>

                <div>
                  <Label htmlFor="website-url">
                    Storefront Domain <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                      https://
                    </span>
                    <Input
                      id="website-url"
                      value={(storefrontConfig.meta.websiteUrl || '').replace(/^https?:\/\//, '').replace('.localmedia.store', '')}
                      onChange={(e) => {
                        const subdomain = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        const fullUrl = subdomain ? `https://${subdomain}.localmedia.store` : '';
                        handleConfigChange({
                          ...storefrontConfig,
                          meta: { ...storefrontConfig.meta, websiteUrl: fullUrl }
                        });
                      }}
                      placeholder="yourname"
                      className={domainError ? 'border-red-500' : ''}
                      required
                    />
                    <span className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                      .localmedia.store
                    </span>
                  </div>
                  {domainError ? (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      {domainError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your subdomain (lowercase letters, numbers, and hyphens only)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="storefront-description">Storefront Description</Label>
                  <Textarea
                    id="storefront-description"
                    value={storefrontConfig.meta.description}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      meta: { ...storefrontConfig.meta, description: e.target.value }
                    })}
                    placeholder="Brief description of your storefront..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="config-version">Configuration Version</Label>
                  <Input
                    id="config-version"
                    value={storefrontConfig.meta.configVersion}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Version number for tracking configuration changes
                  </p>
                </div>

                <div>
                  <StorefrontImageManager
                    publicationId={selectedPublication?.publicationId.toString() || ''}
                    config={storefrontConfig}
                    onChange={handleConfigChange}
                    imageType="favicon"
                    label="Favicon"
                    description="Icon displayed in browser tabs (recommended: 32x32 or 16x16 .ico or .png)"
                  />
                </div>

                <div>
                  <StorefrontImageManager
                    publicationId={selectedPublication?.publicationId.toString() || ''}
                    config={storefrontConfig}
                    onChange={handleConfigChange}
                    imageType="metaLogo"
                    label="Primary Logo"
                    description="Main publication logo (recommended: 200x50px, PNG with transparency). Used as fallback if navbar logo is not set."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base">Advanced Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced configuration and maintenance options.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="text-yellow-600 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-900">Configuration Backup</h4>
                      <p className="text-xs text-yellow-700 mt-1">
                        Always backup your configuration before making major changes. 
                        You can export your current configuration using the button below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const dataStr = JSON.stringify(storefrontConfig, null, 2);
                      const dataBlob = new Blob([dataStr], {type: 'application/json'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `storefront-config-${storefrontConfig.meta.publisher_id}-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                    }}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Export Configuration
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    disabled 
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Storefront
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center mb-8">
              <Store className="h-16 w-16 text-muted-foreground/50 mb-4" />
              {hasDraft && !hasLive ? (
                <>
                  {(() => {
                    const readyCheck = isReadyToPublish();
                    return (
                      <>
                        <h3 className="text-xl font-semibold mb-2">
                          {readyCheck.ready ? 'Draft Ready to Publish' : 'Almost Ready to Publish'}
                        </h3>
                        {readyCheck.ready ? (
                          <p className="text-muted-foreground mb-6 max-w-md">
                            Your storefront configuration is ready. Publish it to make it live at {storefrontConfig?.meta.websiteUrl}
                          </p>
                        ) : (
                          <div className="mb-6 max-w-md">
                            <Alert className="mb-4">
                              <AlertDescription>
                                ⚠️ {readyCheck.reason}
                              </AlertDescription>
                            </Alert>
                            <p className="text-muted-foreground text-sm">
                              Click below to configure your storefront domain
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {!readyCheck.ready && (
                            <Button 
                              onClick={() => {
                                setActiveTab('settings');
                                setTimeout(() => {
                                  document.getElementById('website-url')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }}
                              size="lg"
                              variant="outline"
                            >
                              Configure Domain
                            </Button>
                          )}
                          <Button 
                            onClick={handlePublishDraft} 
                            disabled={saving || !readyCheck.ready} 
                            size="lg"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {saving ? 'Publishing...' : 'Publish Draft to Live'}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-2">Import Storefront Configuration</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Paste your storefront configuration JSON below to import and validate it for this publication.
                  </p>
                </>
              )}
            </div>
            
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Label htmlFor="import-json">Storefront Configuration JSON</Label>
                <Textarea
                  id="import-json"
                  placeholder="Paste your storefront configuration JSON here..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  disabled={saving}
                />
              </div>
              
              {importError && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive whitespace-pre-line">{importError}</p>
                </div>
              )}
              
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleImportStorefront}
                  disabled={saving || !importJson.trim()}
                  className="min-w-[150px]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {saving ? 'Importing...' : 'Import & Validate'}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={showSampleConfig}
                  disabled={saving}
                >
                  Show Sample
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportJson('');
                    setImportError(null);
                  }}
                  disabled={saving}
                >
                  Clear
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Import Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• JSON must be valid and properly formatted</li>
                  <li>• Must include required fields: meta, theme, components</li>
                  <li>• Meta must have: configVersion, publisherId, isDraft</li>
                  <li>• Theme must have: colors (lightPrimary, darkPrimary, mode), typography (primaryFont)</li>
                  <li>• Components can be empty object but must be present</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
