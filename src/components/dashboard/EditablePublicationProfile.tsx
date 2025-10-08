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
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Calendar,
  Save,
  X,
  Plus,
  Trash2,
  Newspaper
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

  // Print publication management functions
  const addPrintPublication = () => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: [
          ...(Array.isArray(prev.distributionChannels?.print) ? prev.distributionChannels.print : prev.distributionChannels?.print ? [prev.distributionChannels.print] : []),
          {
            name: 'New Publication',
            frequency: 'weekly' as const,
            circulation: 5000
          }
        ]
      }
    }));
  };

  const updatePrintPublication = (printIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: Array.isArray(prev.distributionChannels?.print) 
          ? prev.distributionChannels.print.map((printPub, pIndex) =>
              pIndex === printIndex ? { ...printPub, [field]: value } : printPub
            )
          : printIndex === 0 && prev.distributionChannels?.print
          ? [{ ...prev.distributionChannels.print, [field]: value }]
          : [{ [field]: value }]
      }
    }));
  };

  const removePrintPublication = (printIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: Array.isArray(prev.distributionChannels?.print) 
          ? prev.distributionChannels.print.filter((_, pIndex) => pIndex !== printIndex)
          : []
      }
    }));
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

  const addSocialMediaProfile = () => {
    setFormData(prev => ({
      ...prev,
      socialMediaProfiles: [
        ...(prev.socialMediaProfiles || []),
        {
          platform: 'facebook' as const,
          handle: '',
          url: '',
          verified: false
        }
      ]
    }));
  };

  const updateSocialMediaProfile = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      socialMediaProfiles: prev.socialMediaProfiles?.map((profile, i) => 
        i === index ? { ...profile, [field]: value } : profile
      )
    }));
  };

  const removeSocialMediaProfile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socialMediaProfiles: prev.socialMediaProfiles?.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Edit Publication Profile</h2>
          <p className="text-muted-foreground">Update information for {selectedPublication.basicInfo.publicationName}</p>
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
            <CardTitle className="flex items-center gap-2">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-3">
              <Label>Sales Contact</Label>
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
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audience Demographics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

        {/* Distribution Channels */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                value={formData.distributionChannels?.website?.url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  distributionChannels: {
                    ...prev.distributionChannels,
                    website: {
                      ...prev.distributionChannels?.website,
                      url: e.target.value
                    }
                  }
                }))}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="cmsplatform">CMS Platform</Label>
              <Input
                id="cmsplatform"
                value={formData.distributionChannels?.website?.cmsplatform || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  distributionChannels: {
                    ...prev.distributionChannels,
                    website: {
                      ...prev.distributionChannels?.website,
                      cmsplatform: e.target.value
                    }
                  }
                }))}
                placeholder="WordPress, Drupal, Custom, etc."
              />
            </div>

            <div>
              <Label>Website Metrics</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                <div>
                  <Label htmlFor="monthlyVisitors" className="text-xs">Monthly Visitors</Label>
                  <Input
                    id="monthlyVisitors"
                    type="number"
                    value={formData.distributionChannels?.website?.metrics?.monthlyVisitors || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            monthlyVisitors: parseInt(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyPageViews" className="text-xs">Monthly Page Views</Label>
                  <Input
                    id="monthlyPageViews"
                    type="number"
                    value={formData.distributionChannels?.website?.metrics?.monthlyPageViews || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            monthlyPageViews: parseInt(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="150000"
                  />
                </div>
                <div>
                  <Label htmlFor="bounceRate" className="text-xs">Bounce Rate (%)</Label>
                  <Input
                    id="bounceRate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.distributionChannels?.website?.metrics?.bounceRate || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            bounceRate: parseInt(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="45"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionDuration" className="text-xs">Avg Session (seconds)</Label>
                  <Input
                    id="sessionDuration"
                    type="number"
                    value={formData.distributionChannels?.website?.metrics?.averageSessionDuration || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            averageSessionDuration: parseInt(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="180"
                  />
                </div>
                <div>
                  <Label htmlFor="pagesPerSession" className="text-xs">Pages per Session</Label>
                  <Input
                    id="pagesPerSession"
                    type="number"
                    step="0.1"
                    value={formData.distributionChannels?.website?.metrics?.pagesPerSession || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            pagesPerSession: parseFloat(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="mobilePercentage" className="text-xs">Mobile Traffic (%)</Label>
                  <Input
                    id="mobilePercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.distributionChannels?.website?.metrics?.mobilePercentage || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      distributionChannels: {
                        ...prev.distributionChannels,
                        website: {
                          ...prev.distributionChannels?.website,
                          metrics: {
                            ...prev.distributionChannels?.website?.metrics,
                            mobilePercentage: parseInt(e.target.value) || undefined
                          }
                        }
                      }
                    }))}
                    placeholder="65"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Newsletter Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Newsletter Distribution
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFormData(prev => ({
                  ...prev,
                  distributionChannels: {
                    ...prev.distributionChannels,
                    newsletters: [
                      ...(prev.distributionChannels?.newsletters || []),
                      {
                        name: 'New Newsletter',
                        frequency: 'weekly',
                        subscribers: 0,
                        openRate: 0,
                        clickThroughRate: 0
                      }
                    ]
                  }
                }))}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Newsletter
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {formData.distributionChannels?.newsletters?.map((newsletter, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Newsletter #{index + 1}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        distributionChannels: {
                          ...prev.distributionChannels,
                          newsletters: prev.distributionChannels?.newsletters?.filter((_, i) => i !== index)
                        }
                      }))}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Newsletter Name</Label>
                      <Input
                        value={newsletter.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, name: e.target.value } : n
                            )
                          }
                        }))}
                        placeholder="Weekly Newsletter"
                      />
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={newsletter.frequency || ''} 
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, frequency: value as any } : n
                            )
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="irregular">Irregular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Subscribers</Label>
                      <Input
                        type="number"
                        value={newsletter.subscribers || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, subscribers: parseInt(e.target.value) || undefined } : n
                            )
                          }
                        }))}
                        placeholder="5000"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Open Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newsletter.openRate || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, openRate: parseInt(e.target.value) || undefined } : n
                            )
                          }
                        }))}
                        placeholder="25"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Click Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newsletter.clickThroughRate || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, clickThroughRate: parseInt(e.target.value) || undefined } : n
                            )
                          }
                        }))}
                        placeholder="3"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Growth Rate (%)</Label>
                      <Input
                        type="number"
                        value={newsletter.listGrowthRate || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          distributionChannels: {
                            ...prev.distributionChannels,
                            newsletters: prev.distributionChannels?.newsletters?.map((n, i) =>
                              i === index ? { ...n, listGrowthRate: parseInt(e.target.value) || undefined } : n
                            )
                          }
                        }))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  No newsletters configured. Click "Add Newsletter" to create one.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Print Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Print Distribution
              </div>
              <Button variant="outline" size="sm" onClick={addPrintPublication}>
                <Plus className="w-4 h-4 mr-2" />
                Add Publication
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              const printData = formData.distributionChannels?.print;
              let printPublications: any[] = [];
              
              if (printData) {
                if (Array.isArray(printData)) {
                  printPublications = printData;
                } else {
                  // Convert old single object format to array
                  printPublications = [printData];
                }
              }

              if (printPublications.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No print publications</p>
                    <p>Click "Add Publication" to create your first print publication.</p>
                  </div>
                );
              }

              return printPublications.map((printPub, printIndex) => (
                <div key={printIndex} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Print Publication #{printIndex + 1}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removePrintPublication(printIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Publication Name</Label>
                      <Input
                        value={printPub.name || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'name', e.target.value)}
                        placeholder="Daily Herald"
                      />
                    </div>

                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={printPub.frequency || ''} 
                        onValueChange={(value) => updatePrintPublication(printIndex, 'frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Circulation Numbers</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div>
                        <Label className="text-xs">Total Circulation</Label>
                        <Input
                          type="number"
                          value={printPub.circulation || ''}
                          onChange={(e) => updatePrintPublication(printIndex, 'circulation', parseInt(e.target.value) || undefined)}
                          placeholder="25000"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Paid Circulation</Label>
                        <Input
                          type="number"
                          value={printPub.paidCirculation || ''}
                          onChange={(e) => updatePrintPublication(printIndex, 'paidCirculation', parseInt(e.target.value) || undefined)}
                          placeholder="15000"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Free Circulation</Label>
                        <Input
                          type="number"
                          value={printPub.freeCirculation || ''}
                          onChange={(e) => updatePrintPublication(printIndex, 'freeCirculation', parseInt(e.target.value) || undefined)}
                          placeholder="10000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Distribution Area</Label>
                      <Input
                        value={printPub.distributionArea || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'distributionArea', e.target.value)}
                        placeholder="Chicago Metropolitan Area"
                      />
                    </div>

                    <div>
                      <Label>Print Schedule</Label>
                      <Input
                        value={printPub.printSchedule || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'printSchedule', e.target.value)}
                        placeholder="Every Thursday"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Distribution Points</Label>
                    <Textarea
                      value={printPub.distributionPoints?.join(', ') || ''}
                      onChange={(e) => updatePrintPublication(printIndex, 'distributionPoints', e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                      placeholder="Newsstands, Coffee shops, Libraries, Grocery stores (comma-separated)"
                      rows={2}
                    />
                  </div>
                </div>
              ));
            })()}
          </CardContent>
        </Card>

        {/* Social Media Profiles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social Media Profiles
              </div>
              <Button variant="outline" size="sm" onClick={addSocialMediaProfile}>
                <Plus className="w-4 h-4 mr-2" />
                Add Profile
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.socialMediaProfiles?.map((profile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Select 
                    value={profile.platform} 
                    onValueChange={(value) => updateSocialMediaProfile(index, 'platform', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="Handle (without @)"
                    value={profile.handle}
                    onChange={(e) => updateSocialMediaProfile(index, 'handle', e.target.value)}
                    className="flex-1"
                  />
                  
                  <Input
                    placeholder="Full URL"
                    value={profile.url || ''}
                    onChange={(e) => updateSocialMediaProfile(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeSocialMediaProfile(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No social media profiles added yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
