import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
import { PublicationFrontend } from '@/types/publication';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Users, 
  Calendar,
  Save,
  X
} from 'lucide-react';

interface EditablePublicationProfileProps {
  onCancel: () => void;
  onSave: (updatedPublication: PublicationFrontend) => void;
}

export const EditablePublicationProfile: React.FC<EditablePublicationProfileProps> = ({ onCancel, onSave }) => {
  const { selectedPublication } = usePublication();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PublicationFrontend>>({});

  useEffect(() => {
    if (selectedPublication) {
      setFormData(selectedPublication);
    }
  }, [selectedPublication]);

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
      const updatedPublication = await updatePublication(selectedPublication._id, formData);
      if (updatedPublication) {
        onSave(updatedPublication);
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


  const updateBasicInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: value
      }
    }));
  };

  const updateContactInfo = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const updateSalesContact = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        salesContact: {
          ...prev.contactInfo?.salesContact,
          [field]: value
        }
      }
    }));
  };

  const updateEditorialContact = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        editorialContact: {
          ...prev.contactInfo?.editorialContact,
          [field]: value
        }
      }
    }));
  };

  const updateGeneralManager = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        generalManager: {
          ...prev.contactInfo?.generalManager,
          [field]: value
        }
      }
    }));
  };

  const updateAdvertisingDirector = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        advertisingDirector: {
          ...prev.contactInfo?.advertisingDirector,
          [field]: value
        }
      }
    }));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground font-serif">Edit Publication Information</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="publicationName">Publication Name</Label>
              <Input
                id="publicationName"
                value={formData.basicInfo?.publicationName || ''}
                onChange={(e) => updateBasicInfo('publicationName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                value={formData.basicInfo?.websiteUrl || ''}
                onChange={(e) => updateBasicInfo('websiteUrl', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publicationType">Publication Type</Label>
                <Select 
                  value={formData.basicInfo?.publicationType || ''} 
                  onValueChange={(value) => updateBasicInfo('publicationType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contentType">Content Type</Label>
                <Select 
                  value={formData.basicInfo?.contentType || ''} 
                  onValueChange={(value) => updateBasicInfo('contentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="alternative">Alternative</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="geographicCoverage">Geographic Coverage</Label>
                <Select 
                  value={formData.basicInfo?.geographicCoverage || ''} 
                  onValueChange={(value) => updateBasicInfo('geographicCoverage', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select coverage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="founded">Founded</Label>
                <Input
                  id="founded"
                  value={formData.basicInfo?.founded?.toString() || ''}
                  onChange={(e) => updateBasicInfo('founded', e.target.value)}
                  placeholder="e.g., 1995 or 1995-01-01"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="primaryServiceArea">Primary Service Area</Label>
              <Input
                id="primaryServiceArea"
                value={formData.basicInfo?.primaryServiceArea || ''}
                onChange={(e) => updateBasicInfo('primaryServiceArea', e.target.value)}
                placeholder="e.g., Chicago Metro Area"
              />
            </div>

            <div>
              <Label htmlFor="headquarters">Headquarters</Label>
              <Input
                id="headquarters"
                value={formData.basicInfo?.headquarters || ''}
                onChange={(e) => updateBasicInfo('headquarters', e.target.value)}
                placeholder="e.g., Chicago, IL"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mainPhone">Main Phone</Label>
                <Input
                  id="mainPhone"
                  value={formData.contactInfo?.mainPhone || ''}
                  onChange={(e) => updateContactInfo('mainPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="businessHours">Business Hours</Label>
                <Input
                  id="businessHours"
                  value={formData.contactInfo?.businessHours || ''}
                  onChange={(e) => updateContactInfo('businessHours', e.target.value)}
                  placeholder="Monday-Friday 9AM-5PM"
                />
              </div>
            </div>

            {/* Sales Contact */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sales Contact</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Name"
                  value={formData.contactInfo?.salesContact?.name || ''}
                  onChange={(e) => updateSalesContact('name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.contactInfo?.salesContact?.title || ''}
                  onChange={(e) => updateSalesContact('title', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contactInfo?.salesContact?.email || ''}
                  onChange={(e) => updateSalesContact('email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.contactInfo?.salesContact?.phone || ''}
                  onChange={(e) => updateSalesContact('phone', e.target.value)}
                />
                <Select 
                  value={formData.contactInfo?.salesContact?.preferredContact || ''} 
                  onValueChange={(value) => updateSalesContact('preferredContact', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Preferred contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Editorial Contact */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Editorial Contact</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Name"
                  value={formData.contactInfo?.editorialContact?.name || ''}
                  onChange={(e) => updateEditorialContact('name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.contactInfo?.editorialContact?.title || ''}
                  onChange={(e) => updateEditorialContact('title', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contactInfo?.editorialContact?.email || ''}
                  onChange={(e) => updateEditorialContact('email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.contactInfo?.editorialContact?.phone || ''}
                  onChange={(e) => updateEditorialContact('phone', e.target.value)}
                />
              </div>
            </div>

            {/* General Manager */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">General Manager</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Name"
                  value={formData.contactInfo?.generalManager?.name || ''}
                  onChange={(e) => updateGeneralManager('name', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contactInfo?.generalManager?.email || ''}
                  onChange={(e) => updateGeneralManager('email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.contactInfo?.generalManager?.phone || ''}
                  onChange={(e) => updateGeneralManager('phone', e.target.value)}
                />
              </div>
            </div>

            {/* Advertising Director */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Advertising Director</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Name"
                  value={formData.contactInfo?.advertisingDirector?.name || ''}
                  onChange={(e) => updateAdvertisingDirector('name', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contactInfo?.advertisingDirector?.email || ''}
                  onChange={(e) => updateAdvertisingDirector('email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.contactInfo?.advertisingDirector?.phone || ''}
                  onChange={(e) => updateAdvertisingDirector('phone', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audience Demographics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Users className="h-5 w-5" />
              Audience Demographics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="totalAudience">Total Audience</Label>
              <Input
                id="totalAudience"
                type="number"
                value={formData.audienceDemographics?.totalAudience || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  audienceDemographics: {
                    ...prev.audienceDemographics,
                    totalAudience: parseInt(e.target.value) || undefined
                  }
                }))}
                placeholder="50000"
              />
            </div>

            <div>
              <Label>Age Distribution (%)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((ageGroup) => (
                  <div key={ageGroup}>
                    <Label htmlFor={ageGroup} className="text-xs">{ageGroup}</Label>
                    <Input
                      id={ageGroup}
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics?.ageGroups?.[ageGroup as keyof typeof formData.audienceDemographics.ageGroups] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        audienceDemographics: {
                          ...prev.audienceDemographics,
                          ageGroups: {
                            ...prev.audienceDemographics?.ageGroups,
                            [ageGroup]: parseInt(e.target.value) || undefined
                          }
                        }
                      }))}
                      placeholder="25"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Gender Distribution (%)</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {['male', 'female', 'other'].map((gender) => (
                  <div key={gender}>
                    <Label htmlFor={gender} className="text-xs capitalize">{gender}</Label>
                    <Input
                      id={gender}
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics?.gender?.[gender as keyof typeof formData.audienceDemographics.gender] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        audienceDemographics: {
                          ...prev.audienceDemographics,
                          gender: {
                            ...prev.audienceDemographics?.gender,
                            [gender]: parseInt(e.target.value) || undefined
                          }
                        }
                      }))}
                      placeholder="50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Household Income Distribution (%)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { key: 'under35k', label: '<$35K' },
                  { key: '35k-50k', label: '$35-50K' },
                  { key: '50k-75k', label: '$50-75K' },
                  { key: '75k-100k', label: '$75-100K' },
                  { key: '100k-150k', label: '$100-150K' },
                  { key: 'over150k', label: '>$150K' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={key} className="text-xs">{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics?.householdIncome?.[key as keyof typeof formData.audienceDemographics.householdIncome] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        audienceDemographics: {
                          ...prev.audienceDemographics,
                          householdIncome: {
                            ...prev.audienceDemographics?.householdIncome,
                            [key]: parseInt(e.target.value) || undefined
                          }
                        }
                      }))}
                      placeholder="15"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="interests">Audience Interests</Label>
              <Textarea
                id="interests"
                value={formData.audienceDemographics?.interests?.join(', ') || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  audienceDemographics: {
                    ...prev.audienceDemographics,
                    interests: e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                  }
                }))}
                placeholder="Local news, community events, business, sports (comma-separated)"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="targetMarkets">Target Markets</Label>
              <Textarea
                id="targetMarkets"
                value={formData.audienceDemographics?.targetMarkets?.join(', ') || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  audienceDemographics: {
                    ...prev.audienceDemographics,
                    targetMarkets: e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                  }
                }))}
                placeholder="Local businesses, residents, professionals (comma-separated)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>




      </div>
    </div>
  );
};
