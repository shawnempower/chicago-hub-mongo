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
import { StorefrontConfiguration, createDefaultStorefrontConfig } from '@/types/storefront';
import { getStorefrontConfiguration, createStorefrontConfiguration, updateStorefrontConfiguration } from '@/api/storefront';
import { StorefrontEditor } from './StorefrontEditor';

export const PublicationStorefront: React.FC = () => {
  const { selectedPublication } = usePublication();
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedPublication) {
      loadStorefrontConfig();
    }
  }, [selectedPublication]);

  const loadStorefrontConfig = async () => {
    if (!selectedPublication?._id) return;
    
    try {
      setLoading(true);
      setError(null);
      const config = await getStorefrontConfiguration(selectedPublication._id);
      setStorefrontConfig(config);
    } catch (err) {
      console.error('Error loading storefront configuration:', err);
      setError('Failed to load storefront configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStorefront = async () => {
    if (!selectedPublication) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const defaultConfig = createDefaultStorefrontConfig(selectedPublication.basicInfo.publicationName);
      const newConfig = await createStorefrontConfiguration({
        ...defaultConfig,
        publicationId: selectedPublication._id!,
        meta: {
          ...defaultConfig.meta,
          publisher_id: selectedPublication.basicInfo.publicationName.toLowerCase().replace(/\s+/g, '_')
        }
      });
      
      setStorefrontConfig(newConfig);
      setActiveTab('editor');
    } catch (err) {
      console.error('Error creating storefront:', err);
      setError('Failed to create storefront configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async (config: StorefrontConfiguration) => {
    if (!selectedPublication?._id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const updatedConfig = await updateStorefrontConfiguration(selectedPublication._id, config);
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
    setStorefrontConfig(config);
    setHasChanges(true);
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
        <div>
          <h2 className="text-3xl font-bold">Storefront</h2>
          <p className="text-muted-foreground">
            Manage your advertising storefront for {selectedPublication.basicInfo.publicationName}
          </p>
        </div>
        <div className="flex gap-2">
          {storefrontConfig && (
            <>
              <Button variant="outline" disabled={!storefrontConfig || storefrontConfig.meta.is_draft}>
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
            <Button onClick={handleCreateStorefront} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Creating...' : 'Create Storefront'}
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <Store className="w-4 h-4 mr-2" />
              Overview
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
            <TabsTrigger value="settings">
              <FileText className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant={storefrontConfig.meta.is_draft ? "secondary" : "default"}>
                      {storefrontConfig.meta.is_draft ? 'Draft' : 'Published'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(storefrontConfig.meta.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Components
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {Object.values(storefrontConfig.components).filter(c => c.enabled).length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      of {Object.keys(storefrontConfig.components).length} enabled
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: storefrontConfig.theme.colors.lightPrimary }}
                      />
                      <span className="text-sm">{storefrontConfig.theme.colors.lightPrimary}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {storefrontConfig.theme.typography.primaryFont} font
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setActiveTab('editor')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Content
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('theme')}>
                    <Palette className="w-4 h-4 mr-2" />
                    Customize Theme
                  </Button>
                  <Button variant="outline" disabled>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button variant="outline" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                <CardTitle>Colors</CardTitle>
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
                <CardTitle>Typography</CardTitle>
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
                <CardTitle>Layout</CardTitle>
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
                      value={storefrontConfig.theme.layout.radius}
                      onChange={(e) => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          layout: { ...storefrontConfig.theme.layout, radius: parseInt(e.target.value) || 0 }
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon-weight">Icon Weight</Label>
                    <Select
                      value={storefrontConfig.theme.layout.iconWeight}
                      onValueChange={(value: 'light' | 'regular' | 'bold') => handleConfigChange({
                        ...storefrontConfig,
                        theme: {
                          ...storefrontConfig.theme,
                          layout: { ...storefrontConfig.theme.layout, iconWeight: value }
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
                <CardTitle>Section Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure individual section appearance.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(storefrontConfig.theme.sectionSettings).map(([sectionName, settings]) => (
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
                                ...storefrontConfig.theme.sectionSettings,
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
                                  ...storefrontConfig.theme.sectionSettings,
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
                <CardTitle>Basic SEO</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure basic search engine optimization settings.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seo-title">Page Title</Label>
                  <Input
                    id="seo-title"
                    value={storefrontConfig.seoMetadata.title}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...storefrontConfig.seoMetadata, title: e.target.value }
                    })}
                    placeholder="Your Storefront Title"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {storefrontConfig.seoMetadata.title.length}/60 characters (recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo-description">Meta Description</Label>
                  <Textarea
                    id="seo-description"
                    value={storefrontConfig.seoMetadata.description}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...storefrontConfig.seoMetadata, description: e.target.value }
                    })}
                    placeholder="A brief description of your storefront..."
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {storefrontConfig.seoMetadata.description.length}/160 characters (recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo-keywords">Keywords</Label>
                  <Input
                    id="seo-keywords"
                    value={storefrontConfig.seoMetadata.keywords.join(', ')}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { 
                        ...storefrontConfig.seoMetadata, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                      }
                    })}
                    placeholder="advertising, local media, marketing, chicago"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate keywords with commas. Current: {storefrontConfig.seoMetadata.keywords.length} keywords
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Open Graph (Social Media)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how your storefront appears when shared on social media.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="og-title">Open Graph Title</Label>
                  <Input
                    id="og-title"
                    value={storefrontConfig.seoMetadata.ogTitle}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...storefrontConfig.seoMetadata, ogTitle: e.target.value }
                    })}
                    placeholder="Title for social media sharing"
                  />
                </div>

                <div>
                  <Label htmlFor="og-description">Open Graph Description</Label>
                  <Textarea
                    id="og-description"
                    value={storefrontConfig.seoMetadata.ogDescription}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...storefrontConfig.seoMetadata, ogDescription: e.target.value }
                    })}
                    placeholder="Description for social media sharing"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="og-image">Open Graph Image URL</Label>
                  <Input
                    id="og-image"
                    value={storefrontConfig.seoMetadata.ogImage}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      seoMetadata: { ...storefrontConfig.seoMetadata, ogImage: e.target.value }
                    })}
                    placeholder="https://example.com/og-image.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended size: 1200x630 pixels
                  </p>
                  {storefrontConfig.seoMetadata.ogImage && (
                    <div className="mt-2">
                      <img 
                        src={storefrontConfig.seoMetadata.ogImage} 
                        alt="Open Graph preview"
                        className="max-w-sm h-auto border rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Preview how your storefront might appear in search results.
                </p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                    {storefrontConfig.seoMetadata.title || 'Your Storefront Title'}
                  </div>
                  <div className="text-green-700 text-sm">
                    https://yoursite.com/storefront/{selectedPublication?.basicInfo.publicationName.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {storefrontConfig.seoMetadata.description || 'Your storefront description will appear here...'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track visitor behavior and storefront performance with Google Analytics.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ga-id">Google Analytics Measurement ID</Label>
                  <Input
                    id="ga-id"
                    value={storefrontConfig.analytics.googleAnalyticsId}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      analytics: { ...storefrontConfig.analytics, googleAnalyticsId: e.target.value }
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

                {storefrontConfig.analytics.googleAnalyticsId && (
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
                <CardTitle>Facebook Pixel</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track conversions and optimize Facebook advertising campaigns.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fb-pixel-id">Facebook Pixel ID</Label>
                  <Input
                    id="fb-pixel-id"
                    value={storefrontConfig.analytics.facebookPixelId}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      analytics: { ...storefrontConfig.analytics, facebookPixelId: e.target.value }
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

                {storefrontConfig.analytics.facebookPixelId && (
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
                <CardTitle>Tracking Events</CardTitle>
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
                <CardTitle>Publication Information</CardTitle>
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
                  <Label htmlFor="publisher-id">Publisher ID</Label>
                  <Input
                    id="publisher-id"
                    value={storefrontConfig.meta.publisher_id}
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      meta: { ...storefrontConfig.meta, publisher_id: e.target.value }
                    })}
                    placeholder="unique_publisher_identifier"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A unique identifier for your publication (used in URLs and integrations)
                  </p>
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
                    onChange={(e) => handleConfigChange({
                      ...storefrontConfig,
                      meta: { ...storefrontConfig.meta, configVersion: e.target.value }
                    })}
                    placeholder="1.0.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Version number for tracking configuration changes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storefront Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control the visibility and status of your storefront.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="draft-mode">Draft Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep your storefront in draft mode while making changes
                    </p>
                  </div>
                  <Switch
                    id="draft-mode"
                    checked={storefrontConfig.meta.is_draft}
                    onCheckedChange={(checked) => handleConfigChange({
                      ...storefrontConfig,
                      meta: { ...storefrontConfig.meta, is_draft: checked }
                    })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Status Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Status:</span>
                        <Badge variant={storefrontConfig.meta.is_draft ? "secondary" : "default"}>
                          {storefrontConfig.meta.is_draft ? 'Draft' : 'Published'}
                        </Badge>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
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

                <Separator />

                <div className="space-y-2">
                  <Label>Configuration Details</Label>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                    <div>ID: {storefrontConfig._id || 'Not saved'}</div>
                    <div>Version: {storefrontConfig.meta.configVersion}</div>
                    <div>Publisher: {storefrontConfig.meta.publisher_id}</div>
                    <div>Components: {Object.keys(storefrontConfig.components).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">Danger Zone</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Irreversible actions that affect your storefront.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Reset to Default</h4>
                    <p className="text-xs text-red-700 mb-3">
                      This will reset your storefront to the default configuration. All customizations will be lost.
                    </p>
                    <Button variant="destructive" size="sm" disabled>
                      Reset Configuration
                    </Button>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Delete Storefront</h4>
                    <p className="text-xs text-red-700 mb-3">
                      Permanently delete this storefront configuration. This action cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm" disabled>
                      Delete Storefront
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Storefront Configuration</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create a storefront configuration to start building your publication's advertising storefront 
              with custom packages, pricing, and automated booking workflows.
            </p>
            <Button onClick={handleCreateStorefront} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Creating...' : 'Create Storefront'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
