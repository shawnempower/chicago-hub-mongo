import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
import { PublicationFrontend } from '@/types/publication';
import { 
  Globe, 
  Mail, 
  Newspaper,
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  Settings
} from 'lucide-react';

interface EditableInventoryManagerProps {
  onCancel: () => void;
  onSave: (updatedPublication: PublicationFrontend) => void;
}

export const EditableInventoryManager: React.FC<EditableInventoryManagerProps> = ({ onCancel, onSave }) => {
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
          description: "Advertising inventory updated successfully."
        });
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update inventory.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addWebsiteAd = () => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: [
            ...(prev.distributionChannels?.website?.advertisingOpportunities || []),
            {
              name: 'New Ad Slot',
              adFormat: '300x250 banner' as const,
              location: 'Sidebar',
              pricing: {
                pricingModel: 'flat' as const,
                flatRate: 500,
                minimumCommitment: '1 month'
              },
              specifications: {
                size: '300x250',
                format: 'JPG, PNG, GIF',
                fileSize: '150KB max',
                animationAllowed: true,
                thirdPartyTags: false
              },
              monthlyImpressions: 50000,
              available: true
            }
          ]
        }
      }
    }));
  };

  const updateWebsiteAd = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: prev.distributionChannels?.website?.advertisingOpportunities?.map((ad, i) =>
            i === index ? { ...ad, [field]: value } : ad
          )
        }
      }
    }));
  };

  const updateWebsiteAdPricing = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: prev.distributionChannels?.website?.advertisingOpportunities?.map((ad, i) =>
            i === index ? { 
              ...ad, 
              pricing: { ...ad.pricing, [field]: value }
            } : ad
          )
        }
      }
    }));
  };

  const removeWebsiteAd = (index: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        website: {
          ...prev.distributionChannels?.website,
          advertisingOpportunities: prev.distributionChannels?.website?.advertisingOpportunities?.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const addNewsletterAd = (newsletterIndex?: number) => {
    const newsletters = formData.distributionChannels?.newsletters || [];
    const targetIndex = newsletterIndex !== undefined ? newsletterIndex : 0;
    
    if (newsletters.length === 0) {
      // Create a default newsletter first
      setFormData(prev => ({
        ...prev,
        distributionChannels: {
          ...prev.distributionChannels,
          newsletters: [{
            name: 'Weekly Newsletter',
            frequency: 'weekly' as const,
            subscribers: 5000,
            openRate: 25,
            advertisingOpportunities: [{
              name: 'New Newsletter Ad',
              position: 'header' as const,
              dimensions: '600x100',
              pricing: {
                perSend: 200,
                monthly: 800
              }
            }]
          }]
        }
      }));
    } else {
      // Add to specific newsletter
      setFormData(prev => ({
        ...prev,
        distributionChannels: {
          ...prev.distributionChannels,
          newsletters: prev.distributionChannels?.newsletters?.map((newsletter, i) =>
            i === targetIndex ? {
              ...newsletter,
              advertisingOpportunities: [
                ...(newsletter.advertisingOpportunities || []),
                {
                  name: 'New Newsletter Ad',
                  position: 'header' as const,
                  dimensions: '600x100',
                  pricing: {
                    perSend: 200,
                    monthly: 800
                  }
                }
              ]
            } : newsletter
          )
        }
      }));
    }
  };

  const updateNewsletterAd = (newsletterIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : newsletter
        )
      }
    }));
  };

  const updateNewsletterAdPricing = (newsletterIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : newsletter
        )
      }
    }));
  };

  const removeNewsletterAd = (newsletterIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        newsletters: prev.distributionChannels?.newsletters?.map((newsletter, nIndex) =>
          nIndex === newsletterIndex ? {
            ...newsletter,
            advertisingOpportunities: newsletter.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : newsletter
        )
      }
    }));
  };

  const addPrintAd = (printIndex?: number) => {
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
    
    const targetIndex = printIndex !== undefined ? printIndex : 0;
    
    if (printPublications.length === 0) {
      // Create a default print publication first
      setFormData(prev => ({
        ...prev,
        distributionChannels: {
          ...prev.distributionChannels,
          print: [{
            name: 'Main Publication',
            frequency: 'weekly' as const,
            circulation: 10000,
            advertisingOpportunities: [{
              name: 'New Print Ad',
              adFormat: 'full page' as const,
              dimensions: '8.5x11',
              color: 'color' as const,
              location: 'Inside Front Cover',
              pricing: {
                oneTime: 1200,
                fourTimes: 1000,
                twelveTimes: 800
              },
              specifications: {
                format: 'PDF, AI, EPS',
                resolution: '300 DPI',
                bleed: true
              }
            }]
          }]
        }
      }));
    } else {
      // Add to specific print publication
      setFormData(prev => ({
        ...prev,
        distributionChannels: {
          ...prev.distributionChannels,
          print: prev.distributionChannels?.print?.map((printPub, i) =>
            i === targetIndex ? {
              ...printPub,
              advertisingOpportunities: [
                ...(printPub.advertisingOpportunities || []),
                {
                  name: 'New Print Ad',
                  adFormat: 'full page' as const,
                  dimensions: '8.5x11',
                  color: 'color' as const,
                  location: 'Inside Front Cover',
                  pricing: {
                    oneTime: 1200,
                    fourTimes: 1000,
                    twelveTimes: 800
                  },
                  specifications: {
                    format: 'PDF, AI, EPS',
                    resolution: '300 DPI',
                    bleed: true
                  }
                }
              ]
            } : printPub
          )
        }
      }));
    }
  };

  const updatePrintAd = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { ...ad, [field]: value } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const updatePrintAdPricing = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                pricing: { ...ad.pricing, [field]: value }
              } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const updatePrintAdSpecifications = (printIndex: number, adIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
              aIndex === adIndex ? { 
                ...ad, 
                specifications: { ...ad.specifications, [field]: value }
              } : ad
            )
          } : printPub
        )
      }
    }));
  };

  const removePrintAd = (printIndex: number, adIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? {
            ...printPub,
            advertisingOpportunities: printPub.advertisingOpportunities?.filter((_, aIndex) => aIndex !== adIndex)
          } : printPub
        )
      }
    }));
  };

  const updatePrintPublication = (printIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
          pIndex === printIndex ? { ...printPub, [field]: value } : printPub
        )
      }
    }));
  };

  const removePrintPublication = (printIndex: number) => {
    setFormData(prev => ({
      ...prev,
      distributionChannels: {
        ...prev.distributionChannels,
        print: prev.distributionChannels?.print?.filter((_, pIndex) => pIndex !== printIndex)
      }
    }));
  };

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
            circulation: 5000,
            advertisingOpportunities: []
          }
        ]
      }
    }));
  };

  const websiteAds = formData.distributionChannels?.website?.advertisingOpportunities || [];
  const newsletters = formData.distributionChannels?.newsletters || [];
  
  // Handle backward compatibility for print (old single object vs new array format)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Edit Advertising Inventory</h2>
          <p className="text-muted-foreground">
            Manage advertising opportunities for {selectedPublication.basicInfo.publicationName}
          </p>
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

      {/* Website Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Advertising
            </div>
            <Button variant="outline" size="sm" onClick={addWebsiteAd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Website Ad
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {websiteAds.map((ad, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Website Ad #{index + 1}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeWebsiteAd(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Ad Name</Label>
                    <Input
                      value={ad.name || ''}
                      onChange={(e) => updateWebsiteAd(index, 'name', e.target.value)}
                      placeholder="Header Banner"
                    />
                  </div>
                  
                  <div>
                    <Label>Ad Format</Label>
                    <Select 
                      value={ad.adFormat || ''} 
                      onValueChange={(value) => updateWebsiteAd(index, 'adFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300x250 banner">300x250 Banner</SelectItem>
                        <SelectItem value="728x90 banner">728x90 Banner</SelectItem>
                        <SelectItem value="320x50 banner">320x50 Banner</SelectItem>
                        <SelectItem value="300x600 banner">300x600 Banner</SelectItem>
                        <SelectItem value="970x250 banner">970x250 Banner</SelectItem>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="sponsored content">Sponsored Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={ad.location || ''}
                      onChange={(e) => updateWebsiteAd(index, 'location', e.target.value)}
                      placeholder="Header, Sidebar, etc."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Pricing Model</Label>
                    <Select 
                      value={ad.pricing?.pricingModel || ''} 
                      onValueChange={(value) => updateWebsiteAdPricing(index, 'pricingModel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="cpm">CPM</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                        <SelectItem value="contact">Contact for Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={ad.pricing?.flatRate || ad.pricing?.cpm || ''}
                      onChange={(e) => updateWebsiteAdPricing(index, 
                        ad.pricing?.pricingModel === 'cpm' ? 'cpm' : 'flatRate', 
                        parseFloat(e.target.value)
                      )}
                      placeholder="500"
                    />
                  </div>
                  
                  <div>
                    <Label>Monthly Impressions</Label>
                    <Input
                      type="number"
                      value={ad.monthlyImpressions || ''}
                      onChange={(e) => updateWebsiteAd(index, 'monthlyImpressions', parseInt(e.target.value))}
                      placeholder="50000"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={ad.available || false}
                      onCheckedChange={(checked) => updateWebsiteAd(index, 'available', checked)}
                    />
                    <Label>Available</Label>
                  </div>
                </div>
              </div>
            ))}
            
            {websiteAds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No website advertising opportunities. Click "Add Website Ad" to create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Newsletter Advertising
            </div>
            <Button variant="outline" size="sm" onClick={() => addNewsletterAd()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Newsletter Ad
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {newsletters.map((newsletter, newsletterIndex) => (
              <div key={newsletterIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {newsletter.name || `Newsletter ${newsletterIndex + 1}`}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {newsletter.subscribers?.toLocaleString()} subscribers • {newsletter.frequency}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {newsletter.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Newsletter Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeNewsletterAd(newsletterIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updateNewsletterAd(newsletterIndex, adIndex, 'name', e.target.value)}
                            placeholder="Header Sponsorship"
                          />
                        </div>
                        
                        <div>
                          <Label>Position</Label>
                          <Select 
                            value={ad.position || ''} 
                            onValueChange={(value) => updateNewsletterAd(newsletterIndex, adIndex, 'position', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">Header</SelectItem>
                              <SelectItem value="footer">Footer</SelectItem>
                              <SelectItem value="inline">Inline</SelectItem>
                              <SelectItem value="dedicated">Dedicated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Price per Send ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.perSend || ''}
                            onChange={(e) => updateNewsletterAdPricing(newsletterIndex, adIndex, 'perSend', parseFloat(e.target.value))}
                            placeholder="200"
                          />
                        </div>
                        
                        <div>
                          <Label>Monthly Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.monthly || ''}
                            onChange={(e) => updateNewsletterAdPricing(newsletterIndex, adIndex, 'monthly', parseFloat(e.target.value))}
                            placeholder="800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNewsletterAd(newsletterIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {newsletter.name || `Newsletter ${newsletterIndex + 1}`}
                  </Button>
                </div>
              </div>
            ))}
            
            {newsletters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No newsletters configured. Click "Add Newsletter Ad" to create your first newsletter with advertising opportunities.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Advertising */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Print Advertising
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addPrintPublication}>
                <Plus className="w-4 h-4 mr-2" />
                Add Publication
              </Button>
              <Button variant="outline" size="sm" onClick={() => addPrintAd()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Print Ad
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {printPublications.map((printPub, printIndex) => (
              <div key={printIndex} className="border rounded-lg p-4">
                {/* Print Publication Details */}
                <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Print Publication #{printIndex + 1}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removePrintPublication(printIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Total Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.circulation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'circulation', parseInt(e.target.value))}
                        placeholder="10000"
                      />
                    </div>
                    
                    <div>
                      <Label>Paid Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.paidCirculation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'paidCirculation', parseInt(e.target.value))}
                        placeholder="7500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>Free Circulation</Label>
                      <Input
                        type="number"
                        value={printPub.freeCirculation || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'freeCirculation', parseInt(e.target.value))}
                        placeholder="2500"
                      />
                    </div>
                    
                    <div>
                      <Label>Distribution Area</Label>
                      <Input
                        value={printPub.distributionArea || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'distributionArea', e.target.value)}
                        placeholder="Chicago Metro Area"
                      />
                    </div>
                    
                    <div>
                      <Label>Print Schedule</Label>
                      <Input
                        value={printPub.printSchedule || ''}
                        onChange={(e) => updatePrintPublication(printIndex, 'printSchedule', e.target.value)}
                        placeholder="Tuesdays"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Advertising Opportunities */}
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-muted-foreground">Advertising Opportunities</h4>
                </div>
                
                <div className="space-y-4">
                  {printPub.advertisingOpportunities?.map((ad, adIndex) => (
                    <div key={adIndex} className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Print Ad #{adIndex + 1}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removePrintAd(printIndex, adIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Ad Name</Label>
                          <Input
                            value={ad.name || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'name', e.target.value)}
                            placeholder="Full Page Ad"
                          />
                        </div>
                        
                        <div>
                          <Label>Ad Format</Label>
                          <Select 
                            value={ad.adFormat || ''} 
                            onValueChange={(value) => updatePrintAd(printIndex, adIndex, 'adFormat', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full page">Full Page</SelectItem>
                              <SelectItem value="half page">Half Page</SelectItem>
                              <SelectItem value="quarter page">Quarter Page</SelectItem>
                              <SelectItem value="eighth page">Eighth Page</SelectItem>
                              <SelectItem value="business card">Business Card</SelectItem>
                              <SelectItem value="classified">Classified</SelectItem>
                              <SelectItem value="insert">Insert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Dimensions</Label>
                          <Input
                            value={ad.dimensions || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'dimensions', e.target.value)}
                            placeholder="8.5x11"
                          />
                        </div>
                        
                        <div>
                          <Label>Color Option</Label>
                          <Select 
                            value={ad.color || ''} 
                            onValueChange={(value) => updatePrintAd(printIndex, adIndex, 'color', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="color">Color</SelectItem>
                              <SelectItem value="black and white">Black and White</SelectItem>
                              <SelectItem value="both">Both Available</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Location</Label>
                          <Input
                            value={ad.location || ''}
                            onChange={(e) => updatePrintAd(printIndex, adIndex, 'location', e.target.value)}
                            placeholder="Inside Front Cover"
                          />
                        </div>
                        
                        <div>
                          <Label>One-Time Price ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.oneTime || ''}
                            onChange={(e) => updatePrintAdPricing(printIndex, adIndex, 'oneTime', parseFloat(e.target.value))}
                            placeholder="1200"
                          />
                        </div>
                        
                        <div>
                          <Label>4x Rate ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.fourTimes || ''}
                            onChange={(e) => updatePrintAdPricing(printIndex, adIndex, 'fourTimes', parseFloat(e.target.value))}
                            placeholder="1000"
                          />
                        </div>
                        
                        <div>
                          <Label>12x Rate ($)</Label>
                          <Input
                            type="number"
                            value={ad.pricing?.twelveTimes || ''}
                            onChange={(e) => updatePrintAdPricing(printIndex, adIndex, 'twelveTimes', parseFloat(e.target.value))}
                            placeholder="800"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>File Format</Label>
                          <Input
                            value={ad.specifications?.format || ''}
                            onChange={(e) => updatePrintAdSpecifications(printIndex, adIndex, 'format', e.target.value)}
                            placeholder="PDF, AI, EPS"
                          />
                        </div>
                        
                        <div>
                          <Label>Resolution</Label>
                          <Input
                            value={ad.specifications?.resolution || ''}
                            onChange={(e) => updatePrintAdSpecifications(printIndex, adIndex, 'resolution', e.target.value)}
                            placeholder="300 DPI"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={ad.specifications?.bleed || false}
                            onCheckedChange={(checked) => updatePrintAdSpecifications(printIndex, adIndex, 'bleed', checked)}
                          />
                          <Label>Bleed Required</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addPrintAd(printIndex)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad to {printPub.name || `Print Publication ${printIndex + 1}`}
                  </Button>
                </div>
              </div>
            ))}
            
            {printPublications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No print publications configured. Click "Add Print Ad" to create your first print publication with advertising opportunities.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
