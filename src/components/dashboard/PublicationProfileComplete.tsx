/**
 * Complete Publication Profile - View & Edit Mode
 * Based on Publisher Profile Templates v2.1
 */

import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { PublicationFrontend } from '@/types/publication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
import { 
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Users,
  Calendar,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle
} from 'lucide-react';
import { SchemaField, SchemaSection, SchemaFieldLegend } from './SchemaField';
import { transformers } from '@/config/publicationFieldMapping';
import { getNestedValue, setNestedValue, deepClone } from '@/utils/schemaHelpers';

export const PublicationProfile: React.FC = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PublicationFrontend>>({});
  const [showSchemaDebug, setShowSchemaDebug] = useState(false);
  const [differentiators, setDifferentiators] = useState<string[]>([]);

  useEffect(() => {
    if (selectedPublication && isEditing) {
      setFormData(deepClone(selectedPublication));
      const diffs = getNestedValue(selectedPublication, 'competitiveInfo.keyDifferentiators') || [];
      setDifferentiators(Array.isArray(diffs) ? diffs : []);
    }
  }, [selectedPublication, isEditing]);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedPublication?._id) return;

    setSaving(true);
    try {
      const finalData = deepClone(formData);
      setNestedValue(finalData, 'competitiveInfo.keyDifferentiators', differentiators.filter(Boolean));
      
      // Only send profile-related sections - partial update is safer and more efficient
      // This prevents overwriting inventory changes made by other users
      const partialUpdateData: Partial<typeof finalData> = {};
      if (finalData.basicInfo) partialUpdateData.basicInfo = finalData.basicInfo;
      if (finalData.contactInfo) partialUpdateData.contactInfo = finalData.contactInfo;
      if (finalData.socialMediaLinks) partialUpdateData.socialMediaLinks = finalData.socialMediaLinks;
      if (finalData.competitiveInfo) partialUpdateData.competitiveInfo = finalData.competitiveInfo;
      if (finalData.audienceDemographics) partialUpdateData.audienceDemographics = finalData.audienceDemographics;
      if (finalData.businessInfo) partialUpdateData.businessInfo = finalData.businessInfo;
      
      const updatedPublication = await updatePublication(selectedPublication._id, partialUpdateData);
      if (updatedPublication) {
        setSelectedPublication(updatedPublication);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Publication profile updated successfully."
        });
      }
    } catch (error) {
      console.error('Error updating publication:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update publication profile.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const updateField = (schemaPath: string, value: any) => {
    const newData = deepClone(formData);
    setNestedValue(newData, schemaPath, value);
    setFormData(newData);
  };

  const getFieldValue = (schemaPath: string, transform?: (value: any) => any): any => {
    const value = getNestedValue(formData, schemaPath);
    return transform ? transform(value) : (value ?? '');
  };

  const get = (path: string) => getNestedValue(selectedPublication, path);

  // Helper to get social media icon
  const getSocialIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('facebook')) return <Facebook className="w-4 h-4" />;
    if (platformLower.includes('instagram')) return <Instagram className="w-4 h-4" />;
    if (platformLower.includes('twitter') || platformLower.includes('x.com')) return <Twitter className="w-4 h-4" />;
    if (platformLower.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    if (platformLower.includes('youtube')) return <Youtube className="w-4 h-4" />;
    if (platformLower.includes('tiktok')) return <MessageCircle className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  // ============ EDIT MODE ============
  if (isEditing) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold">Edit Publisher Profile</h2>
            <p className="text-sm text-muted-foreground">
              Publisher ID: {selectedPublication.publicationId} | 
              Last Updated: {new Date(formData.metadata?.lastUpdated || '').toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSchemaDebug(!showSchemaDebug)} size="sm">
              {showSchemaDebug ? 'Hide' : 'Show'} Schema
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <SchemaFieldLegend />

        {/* ESSENTIAL INFORMATION */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Essential Information</h2>
          </div>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchemaField mappingStatus="full" schemaPath="basicInfo.publicationName" showSchemaPath={showSchemaDebug}>
                <Label>Publication <span className="text-red-500">*</span></Label>
                <Input value={getFieldValue('basicInfo.publicationName')} onChange={(e) => updateField('basicInfo.publicationName', e.target.value)} />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="basicInfo.publicationType" showSchemaPath={showSchemaDebug}>
                <Label>Type <span className="text-red-500">*</span></Label>
                <Select value={getFieldValue('basicInfo.publicationType')} onValueChange={(val) => updateField('basicInfo.publicationType', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="basicInfo.primaryServiceArea" showSchemaPath={showSchemaDebug}>
                <Label>Market <span className="text-red-500">*</span></Label>
                <Input value={getFieldValue('basicInfo.primaryServiceArea')} onChange={(e) => updateField('basicInfo.primaryServiceArea', e.target.value)} placeholder="City, State" />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="basicInfo.founded" showSchemaPath={showSchemaDebug}>
                <Label>Founded</Label>
                <Input type="number" value={getFieldValue('basicInfo.founded')} onChange={(e) => updateField('basicInfo.founded', parseInt(e.target.value) || '')} placeholder="Year (YYYY)" />
              </SchemaField>
            </div>

            <SchemaField mappingStatus="full" schemaPath="basicInfo.websiteUrl" showSchemaPath={showSchemaDebug}>
              <Label>Website <span className="text-red-500">*</span></Label>
              <Input type="url" value={getFieldValue('basicInfo.websiteUrl')} onChange={(e) => updateField('basicInfo.websiteUrl', e.target.value)} placeholder="https://" />
            </SchemaField>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Primary Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.salesContact.name" warningMessage="Using Sales Contact field" showSchemaPath={showSchemaDebug}>
                  <Label>Name</Label>
                  <Input value={getFieldValue('contactInfo.salesContact.name')} onChange={(e) => updateField('contactInfo.salesContact.name', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.salesContact.email" warningMessage="Using Sales Contact field" showSchemaPath={showSchemaDebug}>
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={getFieldValue('contactInfo.salesContact.email')} onChange={(e) => updateField('contactInfo.salesContact.email', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.salesContact.phone" warningMessage="Using Sales Contact field" showSchemaPath={showSchemaDebug}>
                  <Label>Phone</Label>
                  <Input type="tel" value={getFieldValue('contactInfo.salesContact.phone')} onChange={(e) => updateField('contactInfo.salesContact.phone', e.target.value)} placeholder="(555) 555-5555" />
                </SchemaField>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Sales Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.advertisingDirector.name" warningMessage="Using Advertising Director field" showSchemaPath={showSchemaDebug}>
                  <Label>Name</Label>
                  <Input value={getFieldValue('contactInfo.advertisingDirector.name')} onChange={(e) => updateField('contactInfo.advertisingDirector.name', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.advertisingDirector.email" warningMessage="Using Advertising Director field" showSchemaPath={showSchemaDebug}>
                  <Label>Email</Label>
                  <Input type="email" value={getFieldValue('contactInfo.advertisingDirector.email')} onChange={(e) => updateField('contactInfo.advertisingDirector.email', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="partial" schemaPath="contactInfo.advertisingDirector.phone" warningMessage="Using Advertising Director field" showSchemaPath={showSchemaDebug}>
                  <Label>Phone</Label>
                  <Input type="tel" value={getFieldValue('contactInfo.advertisingDirector.phone')} onChange={(e) => updateField('contactInfo.advertisingDirector.phone', e.target.value)} />
                </SchemaField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BUSINESS INFORMATION */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Business Information</h2>
          </div>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchemaField mappingStatus="none" schemaPath="businessInfo.legalEntity" warningMessage="Schema field does not exist" showSchemaPath={showSchemaDebug}>
                <Label>Legal Entity</Label>
                <Input placeholder="Full legal business name" disabled className="bg-gray-100 cursor-not-allowed" />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="businessInfo.parentCompany" showSchemaPath={showSchemaDebug}>
                <Label>Parent Company</Label>
                <Input value={getFieldValue('businessInfo.parentCompany')} onChange={(e) => updateField('businessInfo.parentCompany', e.target.value)} />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="businessInfo.ownershipType" showSchemaPath={showSchemaDebug}>
                <Label>Ownership Type</Label>
                <Select value={getFieldValue('businessInfo.ownershipType')} onValueChange={(val) => updateField('businessInfo.ownershipType', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="chain">Chain</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="public">Public Company</SelectItem>
                    <SelectItem value="private">Private Company</SelectItem>
                    <SelectItem value="family-owned">Family-owned</SelectItem>
                  </SelectContent>
                </Select>
              </SchemaField>
            </div>
          </CardContent>
        </Card>

        {/* GEOGRAPHIC MARKETS */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Geographic Markets</h2>
          </div>
          <CardContent className="space-y-4">
            <SchemaField mappingStatus="full" schemaPath="basicInfo.primaryServiceArea" showSchemaPath={showSchemaDebug}>
              <Label>Primary Coverage <span className="text-red-500">*</span></Label>
              <Input value={getFieldValue('basicInfo.primaryServiceArea')} onChange={(e) => updateField('basicInfo.primaryServiceArea', e.target.value)} placeholder="Neighborhood, city, region, or metro" />
            </SchemaField>

            <SchemaField mappingStatus="partial" schemaPath="basicInfo.secondaryMarkets" warningMessage="Array converted to comma-separated list" showSchemaPath={showSchemaDebug}>
              <Label>Secondary Coverage</Label>
              <Input value={transformers.arrayToString(getFieldValue('basicInfo.secondaryMarkets'))} onChange={(e) => updateField('basicInfo.secondaryMarkets', transformers.stringToArray(e.target.value))} placeholder="Comma-separated if multiple" />
            </SchemaField>
          </CardContent>
        </Card>

        {/* KEY METRICS */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Key Metrics</h2>
            <p className="text-sm text-muted-foreground mt-1">Only complete sections for channels your publication offers</p>
          </div>
          <CardContent className="space-y-6">
            {/* Digital */}
            <div>
              <h3 className="font-semibold mb-3 border-b pb-2">Digital</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SchemaField mappingStatus="full" schemaPath="distributionChannels.website.metrics.monthlyVisitors" showSchemaPath={showSchemaDebug}>
                  <Label>Monthly Visitors</Label>
                  <Input type="number" value={getFieldValue('distributionChannels.website.metrics.monthlyVisitors')} onChange={(e) => updateField('distributionChannels.website.metrics.monthlyVisitors', parseInt(e.target.value) || 0)} />
                </SchemaField>

                <SchemaField mappingStatus="full" schemaPath="distributionChannels.website.metrics.monthlyPageViews" showSchemaPath={showSchemaDebug}>
                  <Label>Monthly Pageviews</Label>
                  <Input type="number" value={getFieldValue('distributionChannels.website.metrics.monthlyPageViews')} onChange={(e) => updateField('distributionChannels.website.metrics.monthlyPageViews', parseInt(e.target.value) || 0)} />
                </SchemaField>

                <SchemaField mappingStatus="partial" schemaPath="distributionChannels.newsletters[0].subscribers" warningMessage="First newsletter only" showSchemaPath={showSchemaDebug}>
                  <Label>Email Subscribers</Label>
                  <Input type="number" value={getFieldValue('distributionChannels.newsletters.0.subscribers')} onChange={(e) => updateField('distributionChannels.newsletters.0.subscribers', parseInt(e.target.value) || 0)} />
                </SchemaField>
              </div>
            </div>

            {/* Social Media Summary */}
            <div>
              <h3 className="font-semibold mb-3 border-b pb-2">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SchemaField mappingStatus="partial" schemaPath="distributionChannels.socialMedia" warningMessage="Calculated from all platforms" showSchemaPath={showSchemaDebug}>
                  <Label>Combined Following</Label>
                  <Input type="number" value={transformers.calculateSocialFollowing(formData.distributionChannels?.socialMedia)} disabled className="bg-gray-50" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                </SchemaField>

                <SchemaField mappingStatus="partial" schemaPath="distributionChannels.socialMedia" warningMessage="Formatted from platforms" showSchemaPath={showSchemaDebug}>
                  <Label>Primary Platforms</Label>
                  <Textarea value={transformers.formatSocialPlatforms(formData.distributionChannels?.socialMedia)} disabled rows={2} className="bg-gray-50" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-generated</p>
                </SchemaField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AUDIENCE SNAPSHOT */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Audience Snapshot</h2>
          </div>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchemaField mappingStatus="partial" schemaPath="audienceDemographics.ageGroups" warningMessage="Read-only summary" showSchemaPath={showSchemaDebug}>
                <Label>Age</Label>
                <Input value={transformers.ageGroupsToText(getFieldValue('audienceDemographics.ageGroups'))} readOnly className="bg-gray-50" />
                <p className="text-xs text-muted-foreground mt-1">View only - edit in demographics section</p>
              </SchemaField>

              <SchemaField mappingStatus="partial" schemaPath="audienceDemographics.householdIncome" warningMessage="Read-only summary" showSchemaPath={showSchemaDebug}>
                <Label>Income</Label>
                <Input value={transformers.incomeToText(getFieldValue('audienceDemographics.householdIncome'))} readOnly className="bg-gray-50" />
                <p className="text-xs text-muted-foreground mt-1">View only - edit in demographics section</p>
              </SchemaField>

              <SchemaField mappingStatus="partial" schemaPath="audienceDemographics.education" warningMessage="Read-only summary" showSchemaPath={showSchemaDebug}>
                <Label>Education</Label>
                <Input value={transformers.educationToText(getFieldValue('audienceDemographics.education'))} readOnly className="bg-gray-50" />
                <p className="text-xs text-muted-foreground mt-1">View only - edit in demographics section</p>
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="audienceDemographics.location" showSchemaPath={showSchemaDebug}>
                <Label>Geography</Label>
                <Input value={getFieldValue('audienceDemographics.location')} onChange={(e) => updateField('audienceDemographics.location', e.target.value)} placeholder="Primary markets" />
              </SchemaField>
            </div>
          </CardContent>
        </Card>

        {/* POSITIONING & UNIQUE VALUE */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Positioning & Unique Value</h2>
          </div>
          <CardContent className="space-y-4">
            <SchemaField mappingStatus="partial" schemaPath="competitiveInfo.uniqueValueProposition" warningMessage="Used for Market Position" showSchemaPath={showSchemaDebug}>
              <Label>Market Position</Label>
              <Textarea value={getFieldValue('competitiveInfo.uniqueValueProposition')} onChange={(e) => updateField('competitiveInfo.uniqueValueProposition', e.target.value)} placeholder="How you position yourself" rows={3} />
            </SchemaField>

            <SchemaField mappingStatus="full" schemaPath="competitiveInfo.keyDifferentiators" showSchemaPath={showSchemaDebug}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>What Makes You Unique</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDifferentiators([...differentiators, ''])}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {differentiators.map((diff, index) => (
                  <div key={index} className="flex gap-2">
                    <Input value={diff} onChange={(e) => {
                      const updated = [...differentiators];
                      updated[index] = e.target.value;
                      setDifferentiators(updated);
                    }} placeholder="Enter a differentiator" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDifferentiators(differentiators.filter((_, i) => i !== index))}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </SchemaField>
          </CardContent>
        </Card>

        {/* CHANNELS OFFERED */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Channels Offered</h2>
          </div>
          <CardContent>
            <SchemaField mappingStatus="partial" warningMessage="Auto-detected from inventory" showSchemaPath={showSchemaDebug}>
              <p className="text-sm text-muted-foreground mb-3">Channels are detected based on your inventory. Manage in the Inventory section.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Website Advertising', path: 'distributionChannels.website' },
                  { label: 'Email/Newsletter', path: 'distributionChannels.newsletters' },
                  { label: 'Print Advertising', path: 'distributionChannels.print' },
                  { label: 'Social Media', path: 'distributionChannels.socialMedia' },
                  { label: 'Podcast Advertising', path: 'distributionChannels.podcasts' },
                  { label: 'Streaming Video', path: 'distributionChannels.streamingVideo' },
                  { label: 'Radio', path: 'distributionChannels.radioStations' },
                  { label: 'Events/Sponsorships', path: 'distributionChannels.events' }
                ].map(channel => {
                  const hasChannel = getFieldValue(channel.path);
                  const isActive = Array.isArray(hasChannel) ? hasChannel.length > 0 : !!hasChannel;
                  
                  return (
                    <div key={channel.label} className={`p-2 rounded border text-sm ${isActive ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      {isActive ? '✓' : '○'} {channel.label}
                    </div>
                  );
                })}
              </div>
            </SchemaField>
          </CardContent>
        </Card>

        {/* NOTES */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
            <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Notes</h2>
          </div>
          <CardContent>
            <SchemaField mappingStatus="full" schemaPath="internalNotes.operationalNotes" showSchemaPath={showSchemaDebug}>
              <Label>Notes</Label>
              <Textarea value={getFieldValue('internalNotes.operationalNotes')} onChange={(e) => updateField('internalNotes.operationalNotes', e.target.value)} rows={4} placeholder="Any important context or notes" />
            </SchemaField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-8 border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    );
  }

  // ============ VIEW MODE ============
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold">{selectedPublication.basicInfo?.publicationName || 'Unnamed Publication'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Generated:</strong> {new Date(selectedPublication.metadata?.lastUpdated || '').toLocaleDateString()} | 
            <strong className="ml-2">Status:</strong> Internal Reference | 
            <strong className="ml-2">ID:</strong> {selectedPublication.publicationId}
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* ESSENTIAL INFORMATION */}
      <Card>
        <div className="py-3 px-6 mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Essential Information</h2>
        </div>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Publication</p>
              <p className="mt-1 font-semibold">{get('basicInfo.publicationName') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="mt-1">{get('basicInfo.publicationType') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market</p>
              <p className="mt-1">{get('basicInfo.primaryServiceArea') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Founded</p>
              <p className="mt-1">{get('basicInfo.founded') || 'Not specified'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Website</p>
            <p className="mt-1">
              {get('basicInfo.websiteUrl') ? (
                <a href={get('basicInfo.websiteUrl')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  {get('basicInfo.websiteUrl')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : 'Not specified'}
            </p>
          </div>

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Primary Contact</p>
              <p>{get('contactInfo.salesContact.name') || 'Not specified'} | {get('contactInfo.salesContact.email') || 'Not specified'} | {get('contactInfo.salesContact.phone') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Sales Contact</p>
              <p>{get('contactInfo.advertisingDirector.name') || 'Not specified'} | {get('contactInfo.advertisingDirector.email') || 'Not specified'} | {get('contactInfo.advertisingDirector.phone') || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BUSINESS INFORMATION */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Business Information</h2>
        </div>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Parent Company</p>
              <p className="mt-1">{get('businessInfo.parentCompany') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ownership Type</p>
              <p className="mt-1">{get('businessInfo.ownershipType') || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GEOGRAPHIC MARKETS */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Geographic Markets</h2>
        </div>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Primary Coverage</p>
            <p className="mt-1">{get('basicInfo.primaryServiceArea') || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Secondary Coverage</p>
            <p className="mt-1">{transformers.arrayToString(get('basicInfo.secondaryMarkets')) || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* KEY METRICS */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Key Metrics</h2>
        </div>
        <CardContent className="space-y-4">
          {/* Digital */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-sans font-medium text-blue-600">Digital</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-sans text-gray-600">Monthly Visitors</p>
                <p className="font-medium text-gray-900">{get('distributionChannels.website.metrics.monthlyVisitors')?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-sans text-gray-600">Monthly Pageviews</p>
                <p className="font-medium text-gray-900">{get('distributionChannels.website.metrics.monthlyPageViews')?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="flex items-start gap-1">
                <Mail className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-sans text-gray-600">Email Subscribers</p>
                  <p className="font-medium text-gray-900">{get('distributionChannels.newsletters.0.subscribers')?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-purple-500 p-2 rounded-lg">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-sans font-medium text-purple-600">Social Media</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <p className="text-xs font-sans text-gray-600 mb-1">Combined Following</p>
                <p className="font-medium text-gray-900">{transformers.calculateSocialFollowing(get('distributionChannels.socialMedia'))?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-sans text-gray-600 mb-2">Primary Platforms</p>
                {(() => {
                  const socialMedia = get('distributionChannels.socialMedia');
                  
                  if (!socialMedia || !Array.isArray(socialMedia) || socialMedia.length === 0) {
                    return <p className="text-gray-500 text-sm">N/A</p>;
                  }
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {socialMedia.map((platform: any, idx: number) => {
                        if (!platform.platform) return null;
                        const followers = platform.metrics?.followers || platform.followers;
                        if (!followers) return null;
                        
                        return (
                          <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5">
                            <div className="text-purple-600">
                              {getSocialIcon(platform.platform)}
                            </div>
                            <div className="text-xs">
                              <span className="font-sans font-medium text-gray-700 capitalize">{platform.platform}</span>
                              <span className="text-gray-500 ml-1">{followers?.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Events */}
          {get('distributionChannels.events')?.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-sans font-medium text-green-600">Events</h3>
              </div>
              <ul className="space-y-2">
                {(get('distributionChannels.events') || []).map((event: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    <strong className="text-gray-900">{event.name || 'Unnamed Event'}:</strong>{' '}
                    <span className="text-gray-700">{event.averageAttendance?.toLocaleString() || 'N/A'} attendees, {event.frequency || 'N/A'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUDIENCE SNAPSHOT */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Audience Snapshot</h2>
        </div>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Age</p>
            <p className="mt-1">{transformers.ageGroupsToText(get('audienceDemographics.ageGroups')) || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Income</p>
            <p className="mt-1">{transformers.incomeToText(get('audienceDemographics.householdIncome')) || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Education</p>
            <p className="mt-1">{transformers.educationToText(get('audienceDemographics.education')) || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Geography</p>
            <p className="mt-1">{get('audienceDemographics.location') || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* POSITIONING & UNIQUE VALUE */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Positioning & Unique Value</h2>
        </div>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Market Position</p>
            <p className="mt-1">{get('competitiveInfo.uniqueValueProposition') || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">What Makes Them Unique</p>
            {(get('competitiveInfo.keyDifferentiators') || []).length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {(get('competitiveInfo.keyDifferentiators') || []).map((diff: string, idx: number) => (
                  <li key={idx}>{diff}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic">No differentiators listed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CHANNELS OFFERED */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Channels Offered</h2>
        </div>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Website Advertising', path: 'distributionChannels.website' },
              { label: 'Email/Newsletter', path: 'distributionChannels.newsletters' },
              { label: 'Print Advertising', path: 'distributionChannels.print' },
              { label: 'Social Media', path: 'distributionChannels.socialMedia' },
              { label: 'Podcast Advertising', path: 'distributionChannels.podcasts' },
              { label: 'Streaming Video', path: 'distributionChannels.streamingVideo' },
              { label: 'Radio', path: 'distributionChannels.radioStations' },
              { label: 'Events/Sponsorships', path: 'distributionChannels.events' }
            ].map(channel => {
              const hasChannel = get(channel.path);
              const isActive = Array.isArray(hasChannel) ? hasChannel.length > 0 : !!hasChannel;
              
              return (
                <div key={channel.label} className="flex items-center gap-2">
                  {isActive ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                  <span className={isActive ? 'text-gray-900' : 'text-gray-400'}>{channel.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* NOTES */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-lg font-semibold" style={{ fontSize: '18px', color: '#787367' }}>Notes</h2>
        </div>
        <CardContent>
          <p className="whitespace-pre-wrap">{get('internalNotes.operationalNotes') || 'No notes available'}</p>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground pb-4 border-t pt-4">
        <p>Last Updated: {new Date(selectedPublication.metadata?.lastUpdated || '').toLocaleString()}</p>
        <p>Document ID: {selectedPublication._id?.toString() || selectedPublication.publicationId}</p>
      </div>
    </div>
  );
};

