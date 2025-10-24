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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
import { getPublicationBrandColor } from '@/config/publicationBrandColors';
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
import { DemographicSliders, GenderSlider, DemographicSlidersReadOnly, GenderSliderReadOnly } from './DemographicSliders';
import { getActiveChannelMetrics } from '@/utils/channelMetrics';
import { ChannelMetricCard } from './ChannelMetricCard';

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
      
      const updatedPublication = await updatePublication(selectedPublication._id, finalData);
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
    setFormData(prevData => {
      const newData = deepClone(prevData);
      setNestedValue(newData, schemaPath, value);
      return newData;
    });
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
      <div className="space-y-6 max-w-6xl mx-auto p-4">
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


        {/* ESSENTIAL INFORMATION */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Essential Information</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.name" showSchemaPath={showSchemaDebug}>
                  <Label>Name</Label>
                  <Input value={getFieldValue('contactInfo.primaryContact.name')} onChange={(e) => updateField('contactInfo.primaryContact.name', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.title" showSchemaPath={showSchemaDebug}>
                  <Label>Title</Label>
                  <Input value={getFieldValue('contactInfo.primaryContact.title')} onChange={(e) => updateField('contactInfo.primaryContact.title', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.email" showSchemaPath={showSchemaDebug}>
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={getFieldValue('contactInfo.primaryContact.email')} onChange={(e) => updateField('contactInfo.primaryContact.email', e.target.value)} />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.phone" showSchemaPath={showSchemaDebug}>
                  <Label>Phone</Label>
                  <Input type="tel" value={getFieldValue('contactInfo.primaryContact.phone')} onChange={(e) => updateField('contactInfo.primaryContact.phone', e.target.value)} placeholder="(555) 555-5555" />
                </SchemaField>
              </div>
              <div className="mt-3">
                <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.preferredContact" showSchemaPath={showSchemaDebug}>
                  <Label>Preferred Contact Method</Label>
                  <Select value={getFieldValue('contactInfo.primaryContact.preferredContact')} onValueChange={(val) => updateField('contactInfo.primaryContact.preferredContact', val)}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </SchemaField>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Additional Contacts</h4>
              <div className="space-y-6">
                
                {/* Sales Contact */}
                <div>
                  <h5 className="text-sm font-medium mb-2 text-muted-foreground">Sales Contact</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.name" showSchemaPath={showSchemaDebug}>
                      <Label>Name</Label>
                      <Input value={getFieldValue('contactInfo.salesContact.name')} onChange={(e) => updateField('contactInfo.salesContact.name', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.title" showSchemaPath={showSchemaDebug}>
                      <Label>Title</Label>
                      <Input value={getFieldValue('contactInfo.salesContact.title')} onChange={(e) => updateField('contactInfo.salesContact.title', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.email" showSchemaPath={showSchemaDebug}>
                      <Label>Email</Label>
                      <Input type="email" value={getFieldValue('contactInfo.salesContact.email')} onChange={(e) => updateField('contactInfo.salesContact.email', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.phone" showSchemaPath={showSchemaDebug}>
                      <Label>Phone</Label>
                      <Input type="tel" value={getFieldValue('contactInfo.salesContact.phone')} onChange={(e) => updateField('contactInfo.salesContact.phone', e.target.value)} />
                    </SchemaField>
                  </div>
                </div>

                {/* Editorial Contact */}
                <div>
                  <h5 className="text-sm font-medium mb-2 text-muted-foreground">Editorial Contact</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.name" showSchemaPath={showSchemaDebug}>
                      <Label>Name</Label>
                      <Input value={getFieldValue('contactInfo.editorialContact.name')} onChange={(e) => updateField('contactInfo.editorialContact.name', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.title" showSchemaPath={showSchemaDebug}>
                      <Label>Title</Label>
                      <Input value={getFieldValue('contactInfo.editorialContact.title')} onChange={(e) => updateField('contactInfo.editorialContact.title', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.email" showSchemaPath={showSchemaDebug}>
                      <Label>Email</Label>
                      <Input type="email" value={getFieldValue('contactInfo.editorialContact.email')} onChange={(e) => updateField('contactInfo.editorialContact.email', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.phone" showSchemaPath={showSchemaDebug}>
                      <Label>Phone</Label>
                      <Input type="tel" value={getFieldValue('contactInfo.editorialContact.phone')} onChange={(e) => updateField('contactInfo.editorialContact.phone', e.target.value)} />
                    </SchemaField>
                  </div>
                </div>

                {/* General Manager */}
                <div>
                  <h5 className="text-sm font-medium mb-2 text-muted-foreground">General Manager</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.name" showSchemaPath={showSchemaDebug}>
                      <Label>Name</Label>
                      <Input value={getFieldValue('contactInfo.generalManager.name')} onChange={(e) => updateField('contactInfo.generalManager.name', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.email" showSchemaPath={showSchemaDebug}>
                      <Label>Email</Label>
                      <Input type="email" value={getFieldValue('contactInfo.generalManager.email')} onChange={(e) => updateField('contactInfo.generalManager.email', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.phone" showSchemaPath={showSchemaDebug}>
                      <Label>Phone</Label>
                      <Input type="tel" value={getFieldValue('contactInfo.generalManager.phone')} onChange={(e) => updateField('contactInfo.generalManager.phone', e.target.value)} />
                    </SchemaField>
                  </div>
                </div>

                {/* Advertising Director */}
                <div>
                  <h5 className="text-sm font-medium mb-2 text-muted-foreground">Advertising Director</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.name" showSchemaPath={showSchemaDebug}>
                      <Label>Name</Label>
                      <Input value={getFieldValue('contactInfo.advertisingDirector.name')} onChange={(e) => updateField('contactInfo.advertisingDirector.name', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.email" showSchemaPath={showSchemaDebug}>
                      <Label>Email</Label>
                      <Input type="email" value={getFieldValue('contactInfo.advertisingDirector.email')} onChange={(e) => updateField('contactInfo.advertisingDirector.email', e.target.value)} />
                    </SchemaField>
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.phone" showSchemaPath={showSchemaDebug}>
                      <Label>Phone</Label>
                      <Input type="tel" value={getFieldValue('contactInfo.advertisingDirector.phone')} onChange={(e) => updateField('contactInfo.advertisingDirector.phone', e.target.value)} />
                    </SchemaField>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* BUSINESS INFORMATION */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Business Information</h2>
          </div>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchemaField mappingStatus="full" schemaPath="businessInfo.legalEntity" showSchemaPath={showSchemaDebug}>
                <Label>Legal Entity</Label>
                <Input value={getFieldValue('businessInfo.legalEntity')} onChange={(e) => updateField('businessInfo.legalEntity', e.target.value)} placeholder="e.g. ABC Media LLC" />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="businessInfo.taxId" showSchemaPath={showSchemaDebug}>
                <Label>Tax ID / EIN</Label>
                <Input 
                  value={getFieldValue('businessInfo.taxId')} 
                  onChange={(e) => updateField('businessInfo.taxId', e.target.value)} 
                  placeholder="XX-XXXXXXX"
                  pattern="[0-9]{2}-[0-9]{7}"
                  title="Format: XX-XXXXXXX (e.g. 12-3456789)"
                />
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

              <SchemaField mappingStatus="full" schemaPath="businessInfo.yearsInOperation" showSchemaPath={showSchemaDebug}>
                <Label>Years in Operation</Label>
                <Input type="number" value={getFieldValue('businessInfo.yearsInOperation')} onChange={(e) => updateField('businessInfo.yearsInOperation', parseInt(e.target.value) || '')} />
              </SchemaField>
              </div>
          </CardContent>
        </Card>

        {/* GEOGRAPHIC MARKETS */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Geographic Markets</h2>
          </div>
          <CardContent className="space-y-4">
            <SchemaField mappingStatus="full" schemaPath="basicInfo.primaryServiceArea" showSchemaPath={showSchemaDebug}>
              <Label>Primary Coverage <span className="text-red-500">*</span></Label>
              <Input value={getFieldValue('basicInfo.primaryServiceArea')} onChange={(e) => updateField('basicInfo.primaryServiceArea', e.target.value)} placeholder="Neighborhood, city, region, or metro" />
            </SchemaField>

            <SchemaField mappingStatus="full" schemaPath="basicInfo.secondaryMarkets" showSchemaPath={showSchemaDebug}>
              <Label>Secondary Coverage</Label>
              <Input value={transformers.arrayToString(getFieldValue('basicInfo.secondaryMarkets'))} onChange={(e) => updateField('basicInfo.secondaryMarkets', transformers.stringToArray(e.target.value))} placeholder="Comma-separated if multiple" />
            </SchemaField>
          </CardContent>
        </Card>


        {/* AUDIENCE DEMOGRAPHICS */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Audience Demographics</h2>
          </div>
          <CardContent className="space-y-6">
            
            {/* Total Audience */}
            <div>
              <SchemaField mappingStatus="full" schemaPath="audienceDemographics.totalAudience" showSchemaPath={showSchemaDebug}>
                <Label>Total Estimated Audience Reach</Label>
                <Input 
                  type="number" 
                  value={getFieldValue('audienceDemographics.totalAudience')} 
                  onChange={(e) => updateField('audienceDemographics.totalAudience', parseInt(e.target.value) || 0)} 
                  placeholder="Total audience reach across all channels"
                />
              </SchemaField>
            </div>

            {/* Age Groups & Household Income - Side by Side on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:divide-x lg:divide-gray-200">
              {/* Age Groups */}
              <div>
                <DemographicSliders
                  title="Age Groups (percentages)"
                  groups={[
                    { key: '18-24', label: '18-24', value: getFieldValue('audienceDemographics.ageGroups.18-24') || 0 },
                    { key: '25-34', label: '25-34', value: getFieldValue('audienceDemographics.ageGroups.25-34') || 0 },
                    { key: '35-44', label: '35-44', value: getFieldValue('audienceDemographics.ageGroups.35-44') || 0 },
                    { key: '45-54', label: '45-54', value: getFieldValue('audienceDemographics.ageGroups.45-54') || 0 },
                    { key: '55-64', label: '55-64', value: getFieldValue('audienceDemographics.ageGroups.55-64') || 0 },
                    { key: '65+', label: '65+', value: getFieldValue('audienceDemographics.ageGroups.65+') || 0 }
                  ]}
                  onChange={(key, value) => updateField(`audienceDemographics.ageGroups.${key}`, value)}
                />
              </div>

              {/* Household Income */}
              <div className="lg:pl-8">
                <DemographicSliders
                  title="Household Income (percentages)"
                  groups={[
                    { key: 'under35k', label: 'Under $35K', value: getFieldValue('audienceDemographics.householdIncome.under35k') || 0 },
                    { key: '35k-50k', label: '$35K-$50K', value: getFieldValue('audienceDemographics.householdIncome.35k-50k') || 0 },
                    { key: '50k-75k', label: '$50K-$75K', value: getFieldValue('audienceDemographics.householdIncome.50k-75k') || 0 },
                    { key: '75k-100k', label: '$75K-$100K', value: getFieldValue('audienceDemographics.householdIncome.75k-100k') || 0 },
                    { key: '100k-150k', label: '$100K-$150K', value: getFieldValue('audienceDemographics.householdIncome.100k-150k') || 0 },
                    { key: 'over150k', label: 'Over $150K', value: getFieldValue('audienceDemographics.householdIncome.over150k') || 0 }
                  ]}
                  onChange={(key, value) => updateField(`audienceDemographics.householdIncome.${key}`, value)}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="pt-6 border-t">
              <GenderSlider
                malePercentage={getFieldValue('audienceDemographics.gender.male') || 0}
                femalePercentage={getFieldValue('audienceDemographics.gender.female') || 0}
                otherPercentage={getFieldValue('audienceDemographics.gender.other') || 0}
                onChange={(male, female, other) => {
                  updateField('audienceDemographics.gender.male', male);
                  updateField('audienceDemographics.gender.female', female);
                  updateField('audienceDemographics.gender.other', other);
                }}
              />
            </div>

            {/* Education */}
            <div className="pt-6 border-t">
              <DemographicSliders
                title="Education Level (percentages)"
                groups={[
                  { key: 'highSchool', label: 'High School', value: getFieldValue('audienceDemographics.education.highSchool') || 0 },
                  { key: 'someCollege', label: 'Some College', value: getFieldValue('audienceDemographics.education.someCollege') || 0 },
                  { key: 'bachelors', label: "Bachelor's", value: getFieldValue('audienceDemographics.education.bachelors') || 0 },
                  { key: 'graduate', label: 'Graduate', value: getFieldValue('audienceDemographics.education.graduate') || 0 }
                ]}
                onChange={(key, value) => updateField(`audienceDemographics.education.${key}`, value)}
              />
            </div>

            {/* Location and Interests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
              <SchemaField mappingStatus="full" schemaPath="audienceDemographics.location" showSchemaPath={showSchemaDebug}>
                <Label>Primary Geographic Audience</Label>
                <Input 
                  value={getFieldValue('audienceDemographics.location')} 
                  onChange={(e) => updateField('audienceDemographics.location', e.target.value)} 
                  placeholder="e.g. Chicago metropolitan area" 
                />
              </SchemaField>
              
              <SchemaField mappingStatus="full" schemaPath="audienceDemographics.interests" showSchemaPath={showSchemaDebug}>
                <Label>Primary Audience Interests</Label>
                <Input 
                  value={transformers.arrayToString(getFieldValue('audienceDemographics.interests'))} 
                  onChange={(e) => updateField('audienceDemographics.interests', transformers.stringToArray(e.target.value))} 
                  placeholder="e.g. Local news, Politics, Sports" 
                />
              </SchemaField>
            </div>

            {/* Target Markets */}
            <div>
              <SchemaField mappingStatus="full" schemaPath="audienceDemographics.targetMarkets" showSchemaPath={showSchemaDebug}>
                <Label>Key Target Market Segments</Label>
                <Textarea 
                  value={transformers.arrayToString(getFieldValue('audienceDemographics.targetMarkets'))} 
                  onChange={(e) => updateField('audienceDemographics.targetMarkets', transformers.stringToArray(e.target.value))} 
                  placeholder="e.g. Small business owners, Local government officials, Community leaders"
                  rows={2}
                />
              </SchemaField>
            </div>

          </CardContent>
        </Card>

        {/* POSITIONING & UNIQUE VALUE */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Positioning & Unique Value</h2>
          </div>
          <CardContent className="space-y-4">
            <SchemaField mappingStatus="full" schemaPath="competitiveInfo.uniqueValueProposition" showSchemaPath={showSchemaDebug}>
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


        {/* NOTES */}
        <Card>
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EDEAE1' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Notes</h2>
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

  // Get primary brand color
  const primaryColor = selectedPublication 
    ? getPublicationBrandColor(selectedPublication.publicationId)
    : '#0066cc';

  // ============ VIEW MODE ============
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with primary color background at 10% opacity */}
      <div 
        className="rounded-xl p-6 border shadow-sm"
        style={{
          backgroundColor: `${primaryColor}1A`, // 1A = 10% opacity in hex
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {selectedPublication.basicInfo?.publicationName || 'Unnamed Publication'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                <strong className="font-semibold">Generated</strong> {new Date(selectedPublication.metadata?.lastUpdated || '').toLocaleDateString()}
              </span>
              <span className="text-border">|</span>
              <span>
                <strong className="font-semibold">Status</strong> Internal Reference
              </span>
              <span className="text-border">|</span>
              <span>
                <strong className="font-semibold">ID</strong> {selectedPublication.publicationId}
              </span>
            </div>
          </div>
          <Button 
            onClick={() => setIsEditing(true)}
            className="ml-4"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* ESSENTIAL INFORMATION */}
      <Card>
        <div className="py-3 px-6 mb-6" style={{ backgroundColor: '#EDEAE1' }}>
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Essential Information</h2>
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

          {(() => {
            const primaryContact = get('contactInfo.primaryContact');
            const salesContact = get('contactInfo.salesContact');
            const editorialContact = get('contactInfo.editorialContact');
            const generalManager = get('contactInfo.generalManager');
            const advertisingDirector = get('contactInfo.advertisingDirector');
            
            // Check if any contact has data
            const hasPrimaryData = primaryContact && (primaryContact.name || primaryContact.email || primaryContact.phone);
            const hasSalesData = salesContact && (salesContact.name || salesContact.email || salesContact.phone);
            const hasEditorialData = editorialContact && (editorialContact.name || editorialContact.email || editorialContact.phone);
            const hasGeneralManagerData = generalManager && (generalManager.name || generalManager.email || generalManager.phone);
            const hasAdvertisingDirectorData = advertisingDirector && (advertisingDirector.name || advertisingDirector.email || advertisingDirector.phone);
            
            const hasAnyContactData = hasPrimaryData || hasSalesData || hasEditorialData || hasGeneralManagerData || hasAdvertisingDirectorData;
            
            if (!hasAnyContactData) return null;
            
            return (
              <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasPrimaryData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Primary Contact</p>
                    <p>{primaryContact.name || 'Not specified'} | {primaryContact.email || 'Not specified'} | {primaryContact.phone || 'Not specified'}</p>
                    {primaryContact.title && <p className="text-sm text-muted-foreground">{primaryContact.title}</p>}
                    {primaryContact.preferredContact && <p className="text-sm text-muted-foreground">Prefers: {primaryContact.preferredContact}</p>}
                  </div>
                )}
                {hasSalesData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Sales Contact</p>
                    <p>{salesContact.name || 'Not specified'} | {salesContact.email || 'Not specified'} | {salesContact.phone || 'Not specified'}</p>
                    {salesContact.title && <p className="text-sm text-muted-foreground">{salesContact.title}</p>}
                  </div>
                )}
                {hasEditorialData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Editorial Contact</p>
                    <p>{editorialContact.name || 'Not specified'} | {editorialContact.email || 'Not specified'} | {editorialContact.phone || 'Not specified'}</p>
                    {editorialContact.title && <p className="text-sm text-muted-foreground">{editorialContact.title}</p>}
                  </div>
                )}
                {hasGeneralManagerData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">General Manager</p>
                    <p>{generalManager.name || 'Not specified'} | {generalManager.email || 'Not specified'} | {generalManager.phone || 'Not specified'}</p>
                  </div>
                )}
                {hasAdvertisingDirectorData && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Advertising Director</p>
                    <p>{advertisingDirector.name || 'Not specified'} | {advertisingDirector.email || 'Not specified'} | {advertisingDirector.phone || 'Not specified'}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* BUSINESS INFORMATION - Only show if there's data */}
      {(() => {
        const businessInfo = get('businessInfo');
        const hasBusinessData = businessInfo && (
          businessInfo.legalEntity || 
          businessInfo.taxId || 
          businessInfo.parentCompany || 
          businessInfo.ownershipType || 
          businessInfo.yearsInOperation
        );
        
        if (!hasBusinessData) return null;
        
        return (
          <Card>
            <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
              <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Business Information</h2>
            </div>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessInfo.legalEntity && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Legal Entity</p>
                    <p className="mt-1">{businessInfo.legalEntity}</p>
                  </div>
                )}
                {businessInfo.taxId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tax ID / EIN</p>
                    <p className="mt-1">{businessInfo.taxId}</p>
                  </div>
                )}
                {businessInfo.parentCompany && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Parent Company</p>
                    <p className="mt-1">{businessInfo.parentCompany}</p>
                  </div>
                )}
                {businessInfo.ownershipType && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ownership Type</p>
                    <p className="mt-1">{businessInfo.ownershipType}</p>
                  </div>
                )}
                {businessInfo.yearsInOperation && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Years in Operation</p>
                    <p className="mt-1">{businessInfo.yearsInOperation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* GEOGRAPHIC MARKETS - Only show if there's data */}
      {(() => {
        const primaryArea = get('basicInfo.primaryServiceArea');
        const secondaryMarkets = get('basicInfo.secondaryMarkets');
        const hasSecondaryData = secondaryMarkets && Array.isArray(secondaryMarkets) && secondaryMarkets.length > 0;
        
        if (!primaryArea && !hasSecondaryData) return null;
        
        return (
          <Card>
            <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
              <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Geographic Markets</h2>
            </div>
            <CardContent className="space-y-3">
              {primaryArea && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Primary Coverage</p>
                  <p className="mt-1">{primaryArea}</p>
                </div>
              )}
              {hasSecondaryData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Secondary Coverage</p>
                  <p className="mt-1">{transformers.arrayToString(secondaryMarkets)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* KEY METRICS - Dynamic based on active channels with inventory */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Key Metrics</h2>
        </div>
        <CardContent className="space-y-4">
          {(() => {
            const activeChannels = getActiveChannelMetrics(selectedPublication);
            
            if (activeChannels.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    No channel metrics available. Add advertising inventory to see key metrics.
                  </p>
                </div>
              );
            }
            
            return activeChannels.map(channel => (
              <ChannelMetricCard key={channel.key} channel={channel} />
            ));
          })()}
        </CardContent>
      </Card>

      {/* AUDIENCE DEMOGRAPHICS - Only show if there's data */}
      {(() => {
        const ageGroups = get('audienceDemographics.ageGroups');
        const income = get('audienceDemographics.householdIncome');
        const gender = get('audienceDemographics.gender');
        const education = get('audienceDemographics.education');
        const location = get('audienceDemographics.location');
        
        // Check if any demographic data exists
        const hasAgeData = ageGroups && Object.values(ageGroups).some((val: any) => val > 0);
        const hasIncomeData = income && Object.values(income).some((val: any) => val > 0);
        const hasGenderData = gender && (gender.male > 0 || gender.female > 0 || gender.other > 0);
        const hasEducationData = education && Object.values(education).some((val: any) => val > 0);
        const hasLocationData = location && location !== 'Not specified';
        
        const hasDemographicData = hasAgeData || hasIncomeData || hasGenderData || hasEducationData || hasLocationData;
        
        if (!hasDemographicData) return null;
        
        return (
          <Card>
            <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
              <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Audience Demographics</h2>
            </div>
            <CardContent className="space-y-6">
              {/* Age Groups & Household Income - Side by Side on Desktop */}
              {(hasAgeData || hasIncomeData) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:divide-x lg:divide-gray-200">
                  {/* Age Groups */}
                  {hasAgeData && (
                    <div>
                      <DemographicSlidersReadOnly
                        title="Age Groups"
                        groups={[
                          { key: '18-24', label: '18-24', value: get('audienceDemographics.ageGroups.18-24') || 0 },
                          { key: '25-34', label: '25-34', value: get('audienceDemographics.ageGroups.25-34') || 0 },
                          { key: '35-44', label: '35-44', value: get('audienceDemographics.ageGroups.35-44') || 0 },
                          { key: '45-54', label: '45-54', value: get('audienceDemographics.ageGroups.45-54') || 0 },
                          { key: '55-64', label: '55-64', value: get('audienceDemographics.ageGroups.55-64') || 0 },
                          { key: '65+', label: '65+', value: get('audienceDemographics.ageGroups.65+') || 0 }
                        ]}
                      />
                    </div>
                  )}

                  {/* Household Income */}
                  {hasIncomeData && (
                    <div className={hasAgeData ? "lg:pl-8" : ""}>
                      <DemographicSlidersReadOnly
                        title="Household Income"
                        groups={[
                          { key: 'under35k', label: 'Under $35K', value: get('audienceDemographics.householdIncome.under35k') || 0 },
                          { key: '35k-50k', label: '$35K-$50K', value: get('audienceDemographics.householdIncome.35k-50k') || 0 },
                          { key: '50k-75k', label: '$50K-$75K', value: get('audienceDemographics.householdIncome.50k-75k') || 0 },
                          { key: '75k-100k', label: '$75K-$100K', value: get('audienceDemographics.householdIncome.75k-100k') || 0 },
                          { key: '100k-150k', label: '$100K-$150K', value: get('audienceDemographics.householdIncome.100k-150k') || 0 },
                          { key: 'over150k', label: 'Over $150K', value: get('audienceDemographics.householdIncome.over150k') || 0 }
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Gender */}
              {hasGenderData && (
                <div className="pt-6 border-t">
                  <GenderSliderReadOnly
                    malePercentage={get('audienceDemographics.gender.male') || 0}
                    femalePercentage={get('audienceDemographics.gender.female') || 0}
                    otherPercentage={get('audienceDemographics.gender.other') || 0}
                  />
                </div>
              )}

              {/* Education */}
              {hasEducationData && (
                <div className="pt-6 border-t">
                  <DemographicSlidersReadOnly
                    title="Education Level"
                    groups={[
                      { key: 'highSchool', label: 'High School', value: get('audienceDemographics.education.highSchool') || 0 },
                      { key: 'someCollege', label: 'Some College', value: get('audienceDemographics.education.someCollege') || 0 },
                      { key: 'bachelors', label: "Bachelor's", value: get('audienceDemographics.education.bachelors') || 0 },
                      { key: 'graduate', label: 'Graduate', value: get('audienceDemographics.education.graduate') || 0 }
                    ]}
                  />
                </div>
              )}

              {/* Geography */}
              {hasLocationData && (
                <div className="pt-6 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Primary Geographic Audience</p>
                  <p className="text-sm text-gray-900">{location}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* POSITIONING & UNIQUE VALUE */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Positioning & Unique Value</h2>
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
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Channels Offered</h2>
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
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Notes</h2>
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

