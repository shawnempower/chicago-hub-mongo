import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Eye, Users, TrendingUp, Award, Building } from 'lucide-react';

interface MediaOutlet {
  id: string;
  name: string;
  type: string;
  tagline?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  coverage_area?: string;
  audience_size?: string;
  is_active: boolean;
  founding_year?: number;
  publication_frequency?: string;
  staff_count?: number;
  monthly_visitors?: number;
  email_subscribers?: number;
  open_rate?: number;
  primary_market?: string;
  secondary_markets?: any;
  demographics?: any;
  editorial_focus?: any;
  competitive_advantages?: string;
  business_model?: string;
  ownership_type?: string;
  awards?: any;
  key_personnel?: any;
  technical_specs?: any;
  social_media?: any;
}

interface AdvertisingInventory {
  id: string;
  media_outlet_id: string;
  package_name: string;
  package_type: string;
  placement_options: any;
  pricing_tiers: any;
  technical_requirements: any;
  file_requirements: any;
  performance_metrics: any;
  description?: string;
  is_active: boolean;
}

export const EnhancedMediaOutletManagement = () => {
  const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
  const [inventory, setInventory] = useState<AdvertisingInventory[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<MediaOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchOutlets();
    fetchInventory();
  }, []);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOutlets(data || []);
    } catch (error: any) {
      toast.error('Error fetching outlets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('advertising_inventory')
        .select('*')
        .eq('is_active', true)
        .order('package_name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      toast.error('Error fetching inventory: ' + error.message);
    }
  };

  const handleDeleteOutlet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media outlet?')) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Media outlet deleted successfully');
      fetchOutlets();
    } catch (error: any) {
      toast.error('Error deleting outlet: ' + error.message);
    }
  };

  const getOutletInventory = (outletId: string) => {
    return inventory.filter(item => item.media_outlet_id === outletId);
  };

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  const formatPercentage = (num?: number) => {
    if (!num) return 'N/A';
    return `${num}%`;
  };

  if (loading) {
    return <div className="p-6">Loading media outlets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Media Outlet Management</h2>
          <p className="text-muted-foreground">Comprehensive outlet profiles and advertising inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outlets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Media Outlets ({outlets.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {outlets.map((outlet) => (
                <div
                  key={outlet.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOutlet?.id === outlet.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOutlet(outlet)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{outlet.name}</h4>
                      <p className="text-sm text-muted-foreground">{outlet.type}</p>
                      {outlet.monthly_visitors && (
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(outlet.monthly_visitors)} monthly visitors
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutlet(outlet.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {outlets.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No media outlets found
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outlet Details */}
        <div className="lg:col-span-2">
          {selectedOutlet ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="editorial">Editorial</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {selectedOutlet.name}
                    </CardTitle>
                    <CardDescription>{selectedOutlet.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Website</Label>
                        <p className="text-sm">
                          {selectedOutlet.website_url ? (
                            <a 
                              href={selectedOutlet.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {selectedOutlet.website_url}
                            </a>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Founded</Label>
                        <p className="text-sm">{selectedOutlet.founding_year || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <p className="text-sm">{selectedOutlet.type}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Frequency</Label>
                        <p className="text-sm">{selectedOutlet.publication_frequency || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Staff Count</Label>
                        <p className="text-sm">{selectedOutlet.staff_count || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Ownership</Label>
                        <p className="text-sm">{selectedOutlet.ownership_type || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedOutlet.description && (
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm mt-1">{selectedOutlet.description}</p>
                      </div>
                    )}

                    {selectedOutlet.competitive_advantages && (
                      <div>
                        <Label className="text-sm font-medium">Competitive Advantages</Label>
                        <p className="text-sm mt-1">{selectedOutlet.competitive_advantages}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Contact:</Label>
                        {selectedOutlet.contact_email && (
                          <Badge variant="secondary">{selectedOutlet.contact_email}</Badge>
                        )}
                        {selectedOutlet.contact_phone && (
                          <Badge variant="secondary">{selectedOutlet.contact_phone}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Audience Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatNumber(selectedOutlet.monthly_visitors)}</p>
                        <p className="text-sm text-muted-foreground">Monthly Visitors</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatNumber(selectedOutlet.email_subscribers)}</p>
                        <p className="text-sm text-muted-foreground">Email Subscribers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatPercentage(selectedOutlet.open_rate)}</p>
                        <p className="text-sm text-muted-foreground">Email Open Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedOutlet.social_media?.total_followers ? formatNumber(selectedOutlet.social_media.total_followers) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Social Followers</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Primary Market</Label>
                      <p className="text-sm mt-1">{selectedOutlet.primary_market || 'N/A'}</p>
                    </div>

                    {selectedOutlet.secondary_markets && selectedOutlet.secondary_markets.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Secondary Markets</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedOutlet.secondary_markets.map((market, index) => (
                            <Badge key={index} variant="outline">{market}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOutlet.demographics && (
                      <div>
                        <Label className="text-sm font-medium">Demographics</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          {selectedOutlet.demographics.gender && (
                            <div>
                              <span className="font-medium">Gender:</span> 
                              Male {selectedOutlet.demographics.gender.male}%, 
                              Female {selectedOutlet.demographics.gender.female}%
                            </div>
                          )}
                          {selectedOutlet.demographics.income && (
                            <div>
                              <span className="font-medium">High Income:</span> 
                              {selectedOutlet.demographics.income.high_income}%
                            </div>
                          )}
                          {selectedOutlet.demographics.education && (
                            <div>
                              <span className="font-medium">Graduate Degree:</span> 
                              {selectedOutlet.demographics.education.graduate_degree}%
                            </div>
                          )}
                          {selectedOutlet.demographics.device && (
                            <div>
                              <span className="font-medium">Mobile:</span> 
                              {selectedOutlet.demographics.device.mobile}%
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="editorial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Editorial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedOutlet.editorial_focus && selectedOutlet.editorial_focus.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Editorial Focus</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedOutlet.editorial_focus.map((focus, index) => (
                            <Badge key={index} variant="outline">{focus}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOutlet.business_model && (
                      <div>
                        <Label className="text-sm font-medium">Business Model</Label>
                        <p className="text-sm mt-1">{selectedOutlet.business_model}</p>
                      </div>
                    )}

                    {selectedOutlet.awards && selectedOutlet.awards.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Awards & Recognition</Label>
                        <div className="space-y-2 mt-2">
                          {selectedOutlet.awards.map((award, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-primary" />
                              <span className="text-sm">
                                <strong>{award.type}</strong>
                                {award.recipient && ` - ${award.recipient}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOutlet.key_personnel && selectedOutlet.key_personnel.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Key Personnel</Label>
                        <div className="space-y-1 mt-2">
                          {selectedOutlet.key_personnel.map((person, index) => (
                            <p key={index} className="text-sm">
                              <strong>{person.name}</strong> - {person.role}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Advertising Inventory
                    </CardTitle>
                    <CardDescription>
                      Available advertising packages and specifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getOutletInventory(selectedOutlet.id).map((item) => (
                      <Card key={item.id} className="mb-4">
                        <CardHeader>
                          <CardTitle className="text-lg">{item.package_name}</CardTitle>
                          <CardDescription>{item.package_type}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {item.description && (
                            <p className="text-sm">{item.description}</p>
                          )}

                          {item.placement_options.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Placement Options</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.placement_options.map((option, index) => (
                                  <Badge key={index} variant="secondary">{option}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.pricing_tiers.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Pricing</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                {item.pricing_tiers.map((tier, index) => (
                                  <div key={index} className="text-sm">
                                    <strong>{tier.duration}:</strong> ${tier.price}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.technical_requirements && Object.keys(item.technical_requirements).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Technical Requirements</Label>
                              <div className="text-xs mt-1 space-y-1">
                                {Object.entries(item.technical_requirements).map(([key, value]) => (
                                  <div key={key}>
                                    <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.performance_metrics && Object.keys(item.performance_metrics).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Performance Metrics</Label>
                              <div className="text-xs mt-1 space-y-1">
                                {Object.entries(item.performance_metrics).map(([key, value]) => (
                                  <div key={key}>
                                    <strong>{key}:</strong> {String(value)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {getOutletInventory(selectedOutlet.id).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No advertising inventory available for this outlet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Select a Media Outlet</h3>
                  <p className="text-muted-foreground">
                    Choose an outlet from the list to view detailed information
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};