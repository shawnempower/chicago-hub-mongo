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

            {/* Age Groups */}
            <div>
              <h3 className="font-medium mb-3">Age Groups (percentages)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.18-24" showSchemaPath={showSchemaDebug}>
                  <Label>18-24</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.18-24')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.18-24', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.25-34" showSchemaPath={showSchemaDebug}>
                  <Label>25-34</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.25-34')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.25-34', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.35-44" showSchemaPath={showSchemaDebug}>
                  <Label>35-44</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.35-44')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.35-44', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.45-54" showSchemaPath={showSchemaDebug}>
                  <Label>45-54</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.45-54')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.45-54', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.55-64" showSchemaPath={showSchemaDebug}>
                  <Label>55-64</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.55-64')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.55-64', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.ageGroups.65+" showSchemaPath={showSchemaDebug}>
                  <Label>65+</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.ageGroups.65+')} 
                    onChange={(e) => updateField('audienceDemographics.ageGroups.65+', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
              </div>
            </div>

            {/* Gender */}
            <div>
              <h3 className="font-medium mb-3">Gender (percentages)</h3>
              <div className="grid grid-cols-3 gap-4">
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.gender.male" showSchemaPath={showSchemaDebug}>
                  <Label>Male</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.gender.male')} 
                    onChange={(e) => updateField('audienceDemographics.gender.male', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.gender.female" showSchemaPath={showSchemaDebug}>
                  <Label>Female</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.gender.female')} 
                    onChange={(e) => updateField('audienceDemographics.gender.female', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.gender.other" showSchemaPath={showSchemaDebug}>
                  <Label>Other</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.gender.other')} 
                    onChange={(e) => updateField('audienceDemographics.gender.other', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
              </div>
            </div>

            {/* Household Income */}
            <div>
              <h3 className="font-medium mb-3">Household Income (percentages)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.under35k" showSchemaPath={showSchemaDebug}>
                  <Label>Under $35K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.under35k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.under35k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.35k-50k" showSchemaPath={showSchemaDebug}>
                  <Label>$35K-$50K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.35k-50k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.35k-50k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.50k-75k" showSchemaPath={showSchemaDebug}>
                  <Label>$50K-$75K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.50k-75k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.50k-75k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.75k-100k" showSchemaPath={showSchemaDebug}>
                  <Label>$75K-$100K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.75k-100k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.75k-100k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.100k-150k" showSchemaPath={showSchemaDebug}>
                  <Label>$100K-$150K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.100k-150k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.100k-150k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.householdIncome.over150k" showSchemaPath={showSchemaDebug}>
                  <Label>Over $150K</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.householdIncome.over150k')} 
                    onChange={(e) => updateField('audienceDemographics.householdIncome.over150k', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
              </div>
            </div>

            {/* Education */}
            <div>
              <h3 className="font-medium mb-3">Education Level (percentages)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.education.highSchool" showSchemaPath={showSchemaDebug}>
                  <Label>High School</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.education.highSchool')} 
                    onChange={(e) => updateField('audienceDemographics.education.highSchool', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.education.someCollege" showSchemaPath={showSchemaDebug}>
                  <Label>Some College</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.education.someCollege')} 
                    onChange={(e) => updateField('audienceDemographics.education.someCollege', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.education.bachelors" showSchemaPath={showSchemaDebug}>
                  <Label>Bachelor's</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.education.bachelors')} 
                    onChange={(e) => updateField('audienceDemographics.education.bachelors', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
                <SchemaField mappingStatus="full" schemaPath="audienceDemographics.education.graduate" showSchemaPath={showSchemaDebug}>
                  <Label>Graduate</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={getFieldValue('audienceDemographics.education.graduate')} 
                    onChange={(e) => updateField('audienceDemographics.education.graduate', parseFloat(e.target.value) || 0)} 
                    placeholder="%" 
                  />
                </SchemaField>
              </div>
            </div>

            {/* Location and Interests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Primary Contact</p>
              <p>{get('contactInfo.primaryContact.name') || 'Not specified'} | {get('contactInfo.primaryContact.email') || 'Not specified'} | {get('contactInfo.primaryContact.phone') || 'Not specified'}</p>
              {get('contactInfo.primaryContact.title') && <p className="text-sm text-muted-foreground">{get('contactInfo.primaryContact.title')}</p>}
              {get('contactInfo.primaryContact.preferredContact') && <p className="text-sm text-muted-foreground">Prefers: {get('contactInfo.primaryContact.preferredContact')}</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Sales Contact</p>
              <p>{get('contactInfo.salesContact.name') || 'Not specified'} | {get('contactInfo.salesContact.email') || 'Not specified'} | {get('contactInfo.salesContact.phone') || 'Not specified'}</p>
              {get('contactInfo.salesContact.title') && <p className="text-sm text-muted-foreground">{get('contactInfo.salesContact.title')}</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Editorial Contact</p>
              <p>{get('contactInfo.editorialContact.name') || 'Not specified'} | {get('contactInfo.editorialContact.email') || 'Not specified'} | {get('contactInfo.editorialContact.phone') || 'Not specified'}</p>
              {get('contactInfo.editorialContact.title') && <p className="text-sm text-muted-foreground">{get('contactInfo.editorialContact.title')}</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">General Manager</p>
              <p>{get('contactInfo.generalManager.name') || 'Not specified'} | {get('contactInfo.generalManager.email') || 'Not specified'} | {get('contactInfo.generalManager.phone') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Advertising Director</p>
              <p>{get('contactInfo.advertisingDirector.name') || 'Not specified'} | {get('contactInfo.advertisingDirector.email') || 'Not specified'} | {get('contactInfo.advertisingDirector.phone') || 'Not specified'}</p>
                    </div>
                  </div>
        </CardContent>
      </Card>

      {/* BUSINESS INFORMATION */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Business Information</h2>
        </div>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Legal Entity</p>
              <p className="mt-1">{get('businessInfo.legalEntity') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tax ID / EIN</p>
              <p className="mt-1">{get('businessInfo.taxId') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Parent Company</p>
              <p className="mt-1">{get('businessInfo.parentCompany') || 'Not specified'}</p>
            </div>
                  <div>
              <p className="text-sm font-medium text-muted-foreground">Ownership Type</p>
              <p className="mt-1">{get('businessInfo.ownershipType') || 'Not specified'}</p>
                            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Years in Operation</p>
              <p className="mt-1">{get('businessInfo.yearsInOperation') || 'Not specified'}</p>
                          </div>
                        </div>
        </CardContent>
      </Card>

      {/* GEOGRAPHIC MARKETS */}
      <Card>
        <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#E6E4DC' }}>
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Geographic Markets</h2>
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
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Key Metrics</h2>
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
          <h2 className="text-sm font-semibold font-sans" style={{ color: '#787367' }}>Audience Snapshot</h2>
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

