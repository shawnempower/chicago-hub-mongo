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
import { getPublicationBrandColor, prefetchBrandColors } from '@/config/publicationBrandColors';
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
  MessageCircle,
  Phone,
  User,
  Briefcase
} from 'lucide-react';
import { SchemaField, SchemaSection, SchemaFieldLegend } from './SchemaField';
import { transformers } from '@/config/publicationFieldMapping';
import { getNestedValue, setNestedValue, deepClone } from '@/utils/schemaHelpers';
import { DemographicSliders, GenderSlider, DemographicSlidersReadOnly, GenderSliderReadOnly } from './DemographicSliders';
import { getActiveChannelMetrics } from '@/utils/channelMetrics';
import { ChannelMetricCard } from './ChannelMetricCard';
import { FieldError } from '@/components/ui/field-error';
import { ServiceAreaSelectorSimple, ServiceAreaDisplaySimple } from './ServiceAreaSelectorSimple';
import { 
  validateEmail, 
  validatePhone, 
  validateUrl, 
  validateTaxId, 
  validateYear,
  validatePositiveInteger,
  validatePercentage,
  validatePercentageGroup,
  getValidationClass,
  formatPhoneNumber,
  ValidationResult
} from '@/utils/fieldValidation';

export const PublicationProfile: React.FC = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PublicationFrontend>>({});
  const [showSchemaDebug, setShowSchemaDebug] = useState(false);
  const [differentiators, setDifferentiators] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedPublication && isEditing) {
      setFormData(deepClone(selectedPublication));
      const diffs = getNestedValue(selectedPublication, 'competitiveInfo.keyDifferentiators') || [];
      setDifferentiators(Array.isArray(diffs) ? diffs : []);
    }
  }, [selectedPublication, isEditing]);

  // Prefetch brand colors when component mounts (lazy loading)
  useEffect(() => {
    if (selectedPublication) {
      prefetchBrandColors([selectedPublication.publicationId]);
    }
  }, [selectedPublication?.publicationId]);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedPublication?._id) return;

    // Validate all fields before saving
    const errors: Record<string, string> = {};
    
    // Validate all fields in formData
    const validateAllFields = (data: any, path: string = '') => {
      if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          const value = data[key];
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            validateAllFields(value, currentPath);
          } else {
            const error = validateField(currentPath, value);
            if (error) {
              errors[currentPath] = error;
            }
          }
        });
      }
    };
    
    validateAllFields(formData);
    
    // If there are errors, show toast and set field errors
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      
      // Create a detailed error message
      const errorCount = Object.keys(errors).length;
      const errorList = Object.entries(errors)
        .slice(0, 5) // Show first 5 errors
        .map(([field, error]) => {
          // Clean up field path for display
          const fieldName = field.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || field;
          return `• ${fieldName}: ${error}`;
        })
        .join('\n');
      
      const moreErrors = errorCount > 5 ? `\n...and ${errorCount - 5} more errors` : '';
      
      toast({
        title: `Validation Error (${errorCount} field${errorCount > 1 ? 's' : ''})`,
        description: errorList + moreErrors,
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const finalData = deepClone(formData);
      setNestedValue(finalData, 'competitiveInfo.keyDifferentiators', differentiators.filter(Boolean));
      
      const updatedPublication = await updatePublication(selectedPublication._id, finalData);
      if (updatedPublication) {
        setSelectedPublication(updatedPublication);
        setIsEditing(false);
        setFieldErrors({});
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
    setFieldErrors({});
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

  // Validation helpers
  const validateField = (fieldPath: string, value: any): string | undefined => {
    // Email fields (but exclude emailServiceProvider which is just a provider name)
    if (fieldPath.includes('.email') && !fieldPath.includes('emailServiceProvider')) {
      const result = validateEmail(value);
      return result.error;
    }
    
    // Phone fields
    if (fieldPath.includes('.phone')) {
      const result = validatePhone(value);
      return result.error;
    }
    
    // URL fields
    if (fieldPath === 'basicInfo.websiteUrl') {
      const result = validateUrl(value);
      return result.error;
    }
    
    // Tax ID
    if (fieldPath === 'businessInfo.taxId') {
      const result = validateTaxId(value);
      return result.error;
    }
    
    // Year fields
    if (fieldPath === 'basicInfo.founded') {
      const result = validateYear(value);
      return result.error;
    }
    
    // Audience numbers
    if (fieldPath === 'audienceDemographics.totalAudience') {
      const result = validatePositiveInteger(value);
      return result.error;
    }
    
    // Percentage fields
    if (fieldPath.includes('ageGroups.') || 
        fieldPath.includes('householdIncome.') ||
        fieldPath.includes('gender.') ||
        fieldPath.includes('education.')) {
      const result = validatePercentage(value);
      return result.error;
    }
    
    return undefined;
  };

  const setFieldError = (fieldPath: string, error?: string) => {
    setFieldErrors(prev => {
      if (!error) {
        const { [fieldPath]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [fieldPath]: error };
    });
  };

  const updateFieldWithValidation = (schemaPath: string, value: any) => {
    // Update the value
    updateField(schemaPath, value);
    
    // Validate and set error
    const error = validateField(schemaPath, value);
    setFieldError(schemaPath, error);
  };

  // Helper to update phone fields with formatting
  const updatePhoneField = (schemaPath: string, value: string) => {
    const formatted = formatPhoneNumber(value);
    updateFieldWithValidation(schemaPath, formatted);
  };

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
        <Card className="border rounded-lg">
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EEECE5' }}>
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

              <SchemaField mappingStatus="full" schemaPath="basicInfo.founded" showSchemaPath={showSchemaDebug}>
                <Label>Founded</Label>
                <Input 
                  type="number" 
                  value={getFieldValue('basicInfo.founded')} 
                  onChange={(e) => updateFieldWithValidation('basicInfo.founded', parseInt(e.target.value) || '')} 
                  placeholder="Year (YYYY)" 
                  className={getValidationClass(!!fieldErrors['basicInfo.founded'])}
                  onBlur={(e) => updateFieldWithValidation('basicInfo.founded', parseInt(e.target.value) || '')}
                />
                <FieldError error={fieldErrors['basicInfo.founded']} />
              </SchemaField>

              <SchemaField mappingStatus="full" schemaPath="basicInfo.websiteUrl" showSchemaPath={showSchemaDebug}>
                <Label>Website <span className="text-red-500">*</span></Label>
                <Input 
                  type="url" 
                  value={getFieldValue('basicInfo.websiteUrl')} 
                  onChange={(e) => updateFieldWithValidation('basicInfo.websiteUrl', e.target.value)} 
                  placeholder="https://" 
                  className={getValidationClass(!!fieldErrors['basicInfo.websiteUrl'])}
                  onBlur={(e) => updateFieldWithValidation('basicInfo.websiteUrl', e.target.value)}
                />
                <FieldError error={fieldErrors['basicInfo.websiteUrl']} />
              </SchemaField>
            </div>

            {/* Service Areas Section */}
            <div className="border-t pt-4 mt-4">
              <ServiceAreaSelectorSimple
                serviceAreas={getFieldValue('basicInfo.serviceAreas') || []}
                onChange={(areas) => {
                  updateField('basicInfo.serviceAreas', areas);
                }}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Contacts</h4>
                <button
                  type="button"
                  onClick={() => {
                    // Find first empty contact type and initialize it
                    const contactTypes = ['salesContact', 'editorialContact', 'generalManager', 'advertisingDirector'];
                    const emptyType = contactTypes.find(type => {
                      const contact = formData.contactInfo?.[type as keyof typeof formData.contactInfo];
                      return !contact;
                    });
                    if (emptyType) {
                      // Initialize with empty object to show the card
                      updateField(`contactInfo.${emptyType}`, { name: '', title: '', email: '', phone: '' });
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add Contact
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Primary Contact Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow">
                  <div className="space-y-2">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.name" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Name</Label>
                        <Input 
                          value={getFieldValue('contactInfo.primaryContact.name')} 
                          onChange={(e) => updateField('contactInfo.primaryContact.name', e.target.value)}
                          className="rounded-md flex-1 h-8 text-xs"
                          placeholder="Contact Name"
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.title" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Title</Label>
                        <Input 
                          value="Primary Contact"
                          className="rounded-md flex-1 h-8 text-xs bg-gray-100 cursor-not-allowed"
                          placeholder="Primary Contact"
                          disabled
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.email" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Email <span className="text-red-500">*</span></Label>
                        <div className="flex-1">
                          <Input 
                            type="email" 
                            value={getFieldValue('contactInfo.primaryContact.email')} 
                            onChange={(e) => updateFieldWithValidation('contactInfo.primaryContact.email', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.primaryContact.email'])}`}
                            onBlur={(e) => updateFieldWithValidation('contactInfo.primaryContact.email', e.target.value)}
                            placeholder="email@example.com"
                          />
                          <FieldError error={fieldErrors['contactInfo.primaryContact.email']} />
                        </div>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.primaryContact.phone" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Phone</Label>
                        <div className="flex-1">
                          <Input 
                            type="tel" 
                            value={getFieldValue('contactInfo.primaryContact.phone')} 
                            onChange={(e) => updatePhoneField('contactInfo.primaryContact.phone', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.primaryContact.phone'])}`}
                            onBlur={(e) => updatePhoneField('contactInfo.primaryContact.phone', e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                          <FieldError error={fieldErrors['contactInfo.primaryContact.phone']} />
                        </div>
                      </div>
                    </SchemaField>
                  </div>
                </div>

                {/* Sales Contact Card - Only show if initialized */}
                {(() => {
                  const salesContact = formData.contactInfo?.salesContact;
                  return salesContact !== undefined && salesContact !== null;
                })() && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 p-0 z-10 shadow-sm"
                      onClick={() => {
                        setFormData(prevData => {
                          const newData = deepClone(prevData);
                          if (newData.contactInfo?.salesContact) {
                            delete newData.contactInfo.salesContact;
                          }
                          return newData;
                        });
                      }}
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  <div className="space-y-2 pr-10">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.name" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Name</Label>
                        <Input 
                          value={getFieldValue('contactInfo.salesContact.name')} 
                          onChange={(e) => updateField('contactInfo.salesContact.name', e.target.value)}
                          className="rounded-md flex-1 h-8 text-xs"
                          placeholder="Contact Name"
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.title" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Title</Label>
                        <Select 
                          value={getFieldValue('contactInfo.salesContact.title')} 
                          onValueChange={(value) => updateField('contactInfo.salesContact.title', value)}
                        >
                          <SelectTrigger className="rounded-md flex-1 h-8 text-xs">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sales Contact">Sales Contact</SelectItem>
                            <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                            <SelectItem value="Account Executive">Account Executive</SelectItem>
                            <SelectItem value="Sales Director">Sales Director</SelectItem>
                            <SelectItem value="Business Development">Business Development</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.email" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Email</Label>
                        <div className="flex-1">
                          <Input 
                            type="email" 
                            value={getFieldValue('contactInfo.salesContact.email')} 
                            onChange={(e) => updateFieldWithValidation('contactInfo.salesContact.email', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.salesContact.email'])}`}
                            onBlur={(e) => updateFieldWithValidation('contactInfo.salesContact.email', e.target.value)}
                            placeholder="email@example.com"
                          />
                          <FieldError error={fieldErrors['contactInfo.salesContact.email']} />
                        </div>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.salesContact.phone" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Phone</Label>
                        <div className="flex-1">
                          <Input 
                            type="tel" 
                            value={getFieldValue('contactInfo.salesContact.phone')} 
                            onChange={(e) => updatePhoneField('contactInfo.salesContact.phone', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.salesContact.phone'])}`}
                            onBlur={(e) => updatePhoneField('contactInfo.salesContact.phone', e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                          <FieldError error={fieldErrors['contactInfo.salesContact.phone']} />
                        </div>
                      </div>
                    </SchemaField>
                  </div>
                  </div>
                )}

                {/* Editorial Contact Card - Only show if initialized */}
                {(() => {
                  const editorialContact = formData.contactInfo?.editorialContact;
                  return editorialContact !== undefined && editorialContact !== null;
                })() && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 p-0 z-10 shadow-sm"
                    onClick={() => {
                      setFormData(prevData => {
                        const newData = deepClone(prevData);
                        if (newData.contactInfo?.editorialContact) {
                          delete newData.contactInfo.editorialContact;
                        }
                        return newData;
                      });
                    }}
                    title="Delete contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2 pr-10">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.name" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Name</Label>
                        <Input 
                          value={getFieldValue('contactInfo.editorialContact.name')} 
                          onChange={(e) => updateField('contactInfo.editorialContact.name', e.target.value)}
                          className="rounded-md flex-1 h-8 text-xs"
                          placeholder="Contact Name"
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.title" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Title</Label>
                        <Select 
                          value={getFieldValue('contactInfo.editorialContact.title')} 
                          onValueChange={(value) => updateField('contactInfo.editorialContact.title', value)}
                        >
                          <SelectTrigger className="rounded-md flex-1 h-8 text-xs">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Editorial Contact">Editorial Contact</SelectItem>
                            <SelectItem value="Editor-in-Chief">Editor-in-Chief</SelectItem>
                            <SelectItem value="Managing Editor">Managing Editor</SelectItem>
                            <SelectItem value="Senior Editor">Senior Editor</SelectItem>
                            <SelectItem value="Editorial Director">Editorial Director</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.email" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Email</Label>
                        <div className="flex-1">
                          <Input 
                            type="email" 
                            value={getFieldValue('contactInfo.editorialContact.email')} 
                            onChange={(e) => updateFieldWithValidation('contactInfo.editorialContact.email', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.editorialContact.email'])}`}
                            onBlur={(e) => updateFieldWithValidation('contactInfo.editorialContact.email', e.target.value)}
                            placeholder="email@example.com"
                          />
                          <FieldError error={fieldErrors['contactInfo.editorialContact.email']} />
                        </div>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.editorialContact.phone" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Phone</Label>
                        <div className="flex-1">
                          <Input 
                            type="tel" 
                            value={getFieldValue('contactInfo.editorialContact.phone')} 
                            onChange={(e) => updatePhoneField('contactInfo.editorialContact.phone', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.editorialContact.phone'])}`}
                            onBlur={(e) => updatePhoneField('contactInfo.editorialContact.phone', e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                          <FieldError error={fieldErrors['contactInfo.editorialContact.phone']} />
                        </div>
                      </div>
                    </SchemaField>
                  </div>
                </div>
                )}

                {/* General Manager Card - Only show if initialized */}
                {(() => {
                  const generalManager = formData.contactInfo?.generalManager;
                  return generalManager !== undefined && generalManager !== null;
                })() && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 p-0 z-10 shadow-sm"
                      onClick={() => {
                        setFormData(prevData => {
                          const newData = deepClone(prevData);
                          if (newData.contactInfo?.generalManager) {
                            delete newData.contactInfo.generalManager;
                          }
                          return newData;
                        });
                      }}
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  <div className="space-y-2 pr-10">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.name" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Name</Label>
                        <Input 
                          value={getFieldValue('contactInfo.generalManager.name')} 
                          onChange={(e) => updateField('contactInfo.generalManager.name', e.target.value)}
                          className="rounded-md flex-1 h-8 text-xs"
                          placeholder="Contact Name"
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.title" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Title</Label>
                        <Select 
                          value={getFieldValue('contactInfo.generalManager.title')} 
                          onValueChange={(value) => updateField('contactInfo.generalManager.title', value)}
                        >
                          <SelectTrigger className="rounded-md flex-1 h-8 text-xs">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Manager">General Manager</SelectItem>
                            <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                            <SelectItem value="Managing Director">Managing Director</SelectItem>
                            <SelectItem value="Publisher">Publisher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.email" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Email</Label>
                        <div className="flex-1">
                          <Input 
                            type="email" 
                            value={getFieldValue('contactInfo.generalManager.email')} 
                            onChange={(e) => updateFieldWithValidation('contactInfo.generalManager.email', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.generalManager.email'])}`}
                            onBlur={(e) => updateFieldWithValidation('contactInfo.generalManager.email', e.target.value)}
                            placeholder="email@example.com"
                          />
                          <FieldError error={fieldErrors['contactInfo.generalManager.email']} />
                        </div>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.generalManager.phone" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Phone</Label>
                        <div className="flex-1">
                          <Input 
                            type="tel" 
                            value={getFieldValue('contactInfo.generalManager.phone')} 
                            onChange={(e) => updatePhoneField('contactInfo.generalManager.phone', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.generalManager.phone'])}`}
                            onBlur={(e) => updatePhoneField('contactInfo.generalManager.phone', e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                          <FieldError error={fieldErrors['contactInfo.generalManager.phone']} />
                        </div>
                      </div>
                    </SchemaField>
                  </div>
                  </div>
                )}

                {/* Advertising Director Card - Only show if initialized */}
                {(() => {
                  const advertisingDirector = formData.contactInfo?.advertisingDirector;
                  return advertisingDirector !== undefined && advertisingDirector !== null;
                })() && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 p-0 z-10 shadow-sm"
                      onClick={() => {
                        setFormData(prevData => {
                          const newData = deepClone(prevData);
                          if (newData.contactInfo?.advertisingDirector) {
                            delete newData.contactInfo.advertisingDirector;
                          }
                          return newData;
                        });
                      }}
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  <div className="space-y-2 pr-10">
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.name" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Name</Label>
                        <Input 
                          value={getFieldValue('contactInfo.advertisingDirector.name')} 
                          onChange={(e) => updateField('contactInfo.advertisingDirector.name', e.target.value)}
                          className="rounded-md flex-1 h-8 text-xs"
                          placeholder="Contact Name"
                        />
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.title" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Title</Label>
                        <Select 
                          value={getFieldValue('contactInfo.advertisingDirector.title')} 
                          onValueChange={(value) => updateField('contactInfo.advertisingDirector.title', value)}
                        >
                          <SelectTrigger className="rounded-md flex-1 h-8 text-xs">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Advertising Director">Advertising Director</SelectItem>
                            <SelectItem value="Ad Sales Manager">Ad Sales Manager</SelectItem>
                            <SelectItem value="Marketing Director">Marketing Director</SelectItem>
                            <SelectItem value="Revenue Director">Revenue Director</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.email" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Email</Label>
                        <div className="flex-1">
                          <Input 
                            type="email" 
                            value={getFieldValue('contactInfo.advertisingDirector.email')} 
                            onChange={(e) => updateFieldWithValidation('contactInfo.advertisingDirector.email', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.advertisingDirector.email'])}`}
                            onBlur={(e) => updateFieldWithValidation('contactInfo.advertisingDirector.email', e.target.value)}
                            placeholder="email@example.com"
                          />
                          <FieldError error={fieldErrors['contactInfo.advertisingDirector.email']} />
                        </div>
                      </div>
                    </SchemaField>
                    
                    <SchemaField mappingStatus="full" schemaPath="contactInfo.advertisingDirector.phone" showSchemaPath={showSchemaDebug}>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <Label className="text-xs text-gray-700 min-w-[50px]">Phone</Label>
                        <div className="flex-1">
                          <Input 
                            type="tel" 
                            value={getFieldValue('contactInfo.advertisingDirector.phone')} 
                            onChange={(e) => updatePhoneField('contactInfo.advertisingDirector.phone', e.target.value)} 
                            className={`rounded-md h-8 text-xs ${getValidationClass(!!fieldErrors['contactInfo.advertisingDirector.phone'])}`}
                            onBlur={(e) => updatePhoneField('contactInfo.advertisingDirector.phone', e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                          <FieldError error={fieldErrors['contactInfo.advertisingDirector.phone']} />
                        </div>
                      </div>
                    </SchemaField>
                  </div>
                  </div>
                )}

              </div>
            </div>
          </CardContent>
        </Card>

        {/* BUSINESS INFORMATION */}
        <Card className="border rounded-lg">
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EEECE5' }}>
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
                  onChange={(e) => updateFieldWithValidation('businessInfo.taxId', e.target.value)} 
                  placeholder="XX-XXXXXXX"
                  className={getValidationClass(!!fieldErrors['businessInfo.taxId'])}
                  onBlur={(e) => updateFieldWithValidation('businessInfo.taxId', e.target.value)}
                />
                <FieldError error={fieldErrors['businessInfo.taxId']} />
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

        {/* AUDIENCE DEMOGRAPHICS */}
        <Card className="border rounded-lg">
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EEECE5' }}>
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
                  onChange={(e) => updateFieldWithValidation('audienceDemographics.totalAudience', parseInt(e.target.value) || 0)} 
                  placeholder="Total audience reach across all channels"
                  className={getValidationClass(!!fieldErrors['audienceDemographics.totalAudience'])}
                  onBlur={(e) => updateFieldWithValidation('audienceDemographics.totalAudience', parseInt(e.target.value) || 0)}
                />
                <FieldError error={fieldErrors['audienceDemographics.totalAudience']} />
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
        <Card className="border rounded-lg">
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EEECE5' }}>
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
        <Card className="border rounded-lg">
          <div className="py-3 px-6 border-b mb-6" style={{ backgroundColor: '#EEECE5' }}>
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
      <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
        <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Essential Information</h2>
        <div className="bg-white rounded-xl p-6 space-y-4">
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
              <p className="text-sm font-medium text-muted-foreground">Founded</p>
              <p className="mt-1">{get('basicInfo.founded') || 'Not specified'}</p>
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
          </div>

          {/* Service Areas Section */}
          <div className="border-t pt-4">
            <ServiceAreaDisplaySimple
              serviceAreas={get('basicInfo.serviceAreas') || []}
            />
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
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-sm">Contacts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hasPrimaryData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1.5">
                        {primaryContact.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Name</span>
                            <p className="text-xs font-medium">{primaryContact.name}</p>
                          </div>
                        )}
                        {primaryContact.title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Title</span>
                            <p className="text-xs">{primaryContact.title}</p>
                          </div>
                        )}
                        {primaryContact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Email</span>
                            <p className="text-xs">{primaryContact.email}</p>
                          </div>
                        )}
                        {primaryContact.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Phone</span>
                            <p className="text-xs">{primaryContact.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasSalesData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1.5">
                        {salesContact.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Name</span>
                            <p className="text-xs font-medium">{salesContact.name}</p>
                          </div>
                        )}
                        {salesContact.title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Title</span>
                            <p className="text-xs">{salesContact.title}</p>
                          </div>
                        )}
                        {salesContact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Email</span>
                            <p className="text-xs">{salesContact.email}</p>
                          </div>
                        )}
                        {salesContact.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Phone</span>
                            <p className="text-xs">{salesContact.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasEditorialData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1.5">
                        {editorialContact.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Name</span>
                            <p className="text-xs font-medium">{editorialContact.name}</p>
                          </div>
                        )}
                        {editorialContact.title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Title</span>
                            <p className="text-xs">{editorialContact.title}</p>
                          </div>
                        )}
                        {editorialContact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Email</span>
                            <p className="text-xs">{editorialContact.email}</p>
                          </div>
                        )}
                        {editorialContact.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Phone</span>
                            <p className="text-xs">{editorialContact.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasGeneralManagerData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1.5">
                        {generalManager.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Name</span>
                            <p className="text-xs font-medium">{generalManager.name}</p>
                          </div>
                        )}
                        {generalManager.title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Title</span>
                            <p className="text-xs">{generalManager.title}</p>
                          </div>
                        )}
                        {generalManager.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Email</span>
                            <p className="text-xs">{generalManager.email}</p>
                          </div>
                        )}
                        {generalManager.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Phone</span>
                            <p className="text-xs">{generalManager.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasAdvertisingDirectorData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1.5">
                        {advertisingDirector.name && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Name</span>
                            <p className="text-xs font-medium">{advertisingDirector.name}</p>
                          </div>
                        )}
                        {advertisingDirector.title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Title</span>
                            <p className="text-xs">{advertisingDirector.title}</p>
                          </div>
                        )}
                        {advertisingDirector.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Email</span>
                            <p className="text-xs">{advertisingDirector.email}</p>
                          </div>
                        )}
                        {advertisingDirector.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 min-w-[50px]">Phone</span>
                            <p className="text-xs">{advertisingDirector.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* BUSINESS INFORMATION - Only show if there's data */}
      {(() => {
        const businessInfo = get('businessInfo');
        const hasBusinessData = businessInfo && (
          businessInfo.legalEntity || 
          businessInfo.taxId || 
          businessInfo.parentCompany || 
          businessInfo.ownershipType
        );
        
        if (!hasBusinessData) return null;
        
        return (
          <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
            <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Business Information</h2>
            <div className="bg-white rounded-xl p-6 space-y-3">
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
              </div>
            </div>
          </Card>
        );
      })()}

      {/* KEY METRICS - Dynamic based on active channels with inventory */}
      <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
        <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Key Metrics</h2>
        <div className="bg-white rounded-xl p-6 space-y-4">
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
        </div>
      </Card>

      {/* AUDIENCE DEMOGRAPHICS - Only show if there's data */}
      {(() => {
        const ageGroups = get('audienceDemographics.ageGroups');
        const income = get('audienceDemographics.householdIncome');
        const gender = get('audienceDemographics.gender');
        const education = get('audienceDemographics.education');
        
        // Check if any demographic data exists
        const hasAgeData = ageGroups && Object.values(ageGroups).some((val: any) => val > 0);
        const hasIncomeData = income && Object.values(income).some((val: any) => val > 0);
        const hasGenderData = gender && (gender.male > 0 || gender.female > 0 || gender.other > 0);
        const hasEducationData = education && Object.values(education).some((val: any) => val > 0);
        const hasDemographicData = hasAgeData || hasIncomeData || hasGenderData || hasEducationData;
        
        if (!hasDemographicData) return null;
        
        return (
          <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
            <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Audience Demographics</h2>
            <div className="bg-white rounded-xl p-6 space-y-6">
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
            </div>
          </Card>
        );
      })()}

      {/* POSITIONING & UNIQUE VALUE */}
      <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
        <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Positioning & Unique Value</h2>
        <div className="bg-white rounded-xl p-6 space-y-4">
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
        </div>
      </Card>

      {/* CHANNELS OFFERED */}
      <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
        <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Channels Offered</h2>
        <div className="bg-white rounded-xl p-6">
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
            </div>
          </Card>

      {/* NOTES */}
      <Card className="rounded-xl" style={{ backgroundColor: '#EEECE5' }}>
        <h2 className="text-sm font-semibold font-sans py-3 px-6" style={{ color: '#787367' }}>Notes</h2>
        <div className="bg-white rounded-xl p-6">
          <p className="whitespace-pre-wrap">{get('internalNotes.operationalNotes') || 'No notes available'}</p>
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground pb-4 border-t pt-4">
        <p>Last Updated: {new Date(selectedPublication.metadata?.lastUpdated || '').toLocaleString()}</p>
        <p>Document ID: {selectedPublication._id?.toString() || selectedPublication.publicationId}</p>
      </div>
    </div>
  );
};

