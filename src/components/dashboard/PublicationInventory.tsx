import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { EditableInventoryManager } from './EditableInventoryManager';
import { PublicationFrontend } from '@/types/publication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Globe, 
  Mail, 
  Newspaper,
  Calendar,
  Users,
  Plus,
  Settings,
  TrendingUp,
  Filter
} from 'lucide-react';

export const PublicationInventory: React.FC = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (selectedPublication) {
      loadInventoryData();
    }
  }, [selectedPublication]);

  const loadInventoryData = async () => {
    if (!selectedPublication) return;
    
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load real advertising opportunities from publication data
      const items = [];
      let itemId = 1;

      // Website inventory from actual data
      const websiteAds = selectedPublication.distributionChannels?.website?.advertisingOpportunities || [];
      websiteAds.forEach(ad => {
        items.push({
          id: itemId++,
          type: ad.name || 'Website Ad',
          channel: 'website',
          position: ad.location || 'Website',
          size: ad.specifications?.size || ad.adFormat || 'Standard',
          price: ad.pricing?.flatRate ? `$${ad.pricing.flatRate}/month` : 
                 ad.pricing?.cpm ? `$${ad.pricing.cpm} CPM` : 'Contact for pricing',
          availability: ad.available ? 'Available' : 'Booked',
          impressions: ad.monthlyImpressions ? `${ad.monthlyImpressions.toLocaleString()}/month` : '-'
        });
      });

      // Newsletter inventory from actual data
      const newsletters = selectedPublication.distributionChannels?.newsletters || [];
      newsletters.forEach((newsletter, newsletterIndex) => {
        newsletter.advertisingOpportunities?.forEach(ad => {
          items.push({
            id: itemId++,
            type: ad.name || 'Newsletter Ad',
            channel: 'newsletter',
            position: `${newsletter.name || `Newsletter ${newsletterIndex + 1}`} • ${ad.position || 'Standard'}`,
            size: ad.dimensions || 'Standard',
            price: ad.pricing?.monthly ? `$${ad.pricing.monthly}/month` : 
                   ad.pricing?.perSend ? `$${ad.pricing.perSend}/send` : 'Contact for pricing',
            availability: 'Available', // Default since newsletters don't have availability flag
            impressions: newsletter.subscribers ? `${newsletter.subscribers.toLocaleString()}/send` : '-',
            newsletterName: newsletter.name || `Newsletter ${newsletterIndex + 1}`,
            newsletterIndex,
            adIndex: newsletter.advertisingOpportunities?.indexOf(ad)
          });
        });
      });

      // Print inventory from actual data (handle both old single object and new array format)
      const printData = selectedPublication.distributionChannels?.print;
      let printPublications: any[] = [];
      
      if (printData) {
        if (Array.isArray(printData)) {
          // New array format
          printPublications = printData;
        } else {
          // Old single object format - convert to array
          printPublications = [printData];
        }
      }
      
      printPublications.forEach((printPub, printIndex) => {
        printPub.advertisingOpportunities?.forEach((ad, adIndex) => {
          items.push({
            id: itemId++,
            type: ad.name || 'Print Ad',
            channel: 'print',
            position: `${printPub.name || `Print Publication ${printIndex + 1}`} • ${ad.location || 'Print'} • ${ad.adFormat || 'Standard'}${ad.color ? ` (${ad.color})` : ''}`,
            size: ad.dimensions || 'Standard',
            price: ad.pricing?.oneTime ? `$${ad.pricing.oneTime}/issue` : 
                   ad.pricing?.twelveTimes ? `$${ad.pricing.twelveTimes}/issue (12x rate)` : 
                   ad.pricing?.fourTimes ? `$${ad.pricing.fourTimes}/issue (4x rate)` : 'Contact for pricing',
            availability: 'Available', // Default since print ads don't have availability flag
            impressions: printPub.circulation ? 
                        `${printPub.circulation.toLocaleString()}/issue` : '-',
            printPublicationName: printPub.name || `Print Publication ${printIndex + 1}`,
            printIndex,
            adIndex
          });
        });
      });

      // If no ads exist, create some sample data to show the structure
      if (items.length === 0) {
        if (selectedPublication.distributionChannels?.website) {
          items.push({
            id: itemId++,
            type: 'Website Banner (Sample)',
            channel: 'website',
            position: 'Header',
            size: '728x90',
            price: 'No ads configured',
            availability: 'Setup Required',
            impressions: '-'
          });
        }
      }

      setInventoryItems(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const handleSave = (updatedPublication: PublicationFrontend) => {
    setSelectedPublication(updatedPublication);
    setIsEditing(false);
    // Reload inventory data to reflect changes
    loadInventoryData();
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <EditableInventoryManager 
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  const publication = selectedPublication;

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'newsletter':
        return <Mail className="h-4 w-4" />;
      case 'print':
        return <Newspaper className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'booked':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Advertising Inventory</h2>
          <p className="text-muted-foreground">
            Manage advertising slots and packages for {publication.basicInfo.publicationName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Edit Inventory
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Inventory
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold">{loading ? '...' : inventoryItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : inventoryItems.filter(item => item.availability === 'Available').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Booked</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? '...' : inventoryItems.filter(item => item.availability === 'Booked').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Advertising Slots</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-muted rounded"></div>
                      <div>
                        <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                        <div className="h-3 w-32 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-16 bg-muted rounded"></div>
                      <div className="h-6 w-20 bg-muted rounded"></div>
                      <div className="h-8 w-12 bg-muted rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            (() => {
              const filteredItems = inventoryItems.filter(item => typeFilter === 'all' || item.channel === typeFilter);
              
              if (filteredItems.length === 0 && inventoryItems.length > 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No ads found</p>
                    <p>No advertising slots match the selected filter.</p>
                  </div>
                );
              }
              
              if (inventoryItems.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No inventory configured</p>
                    <p>Click "Edit Inventory" to add advertising opportunities.</p>
                  </div>
                );
              }
              
              return (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ad Name</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Price</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Impressions</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(item.channel)}
                              <span className="font-medium capitalize">{item.channel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-semibold">{item.type}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-semibold">{item.price}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-muted-foreground">{item.impressions}</span>
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={getAvailabilityColor(item.availability)}>
                              {item.availability}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {publication.distributionChannels?.website && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Advertising
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const websiteAds = inventoryItems.filter(item => item.channel === 'website');
                  if (websiteAds.length === 0) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No website ads configured</p>
                      </div>
                    );
                  }
                  return websiteAds.map((ad, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm">{ad.type}</span>
                      <span className="text-sm font-medium">{ad.availability.toLowerCase()}</span>
                    </div>
                  ));
                })()}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setIsEditing(true)}>
                  Manage Website Ads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {publication.distributionChannels?.newsletters && publication.distributionChannels.newsletters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Newsletter Advertising
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const newsletterAds = inventoryItems.filter(item => item.channel === 'newsletter');
                  if (newsletterAds.length === 0) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No newsletter ads configured</p>
                      </div>
                    );
                  }
                  return newsletterAds.map((ad, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm">{ad.type}</span>
                      <span className="text-sm font-medium">{ad.availability.toLowerCase()}</span>
                    </div>
                  ));
                })()}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setIsEditing(true)}>
                  Manage Newsletter Ads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {publication.distributionChannels?.print && (Array.isArray(publication.distributionChannels.print) ? publication.distributionChannels.print.length > 0 : true) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Print Advertising
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const printAds = inventoryItems.filter(item => item.channel === 'print');
                  if (printAds.length === 0) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No print ads configured</p>
                      </div>
                    );
                  }
                  return printAds.map((ad, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm">{ad.type}</span>
                      <span className="text-sm font-medium">{ad.availability.toLowerCase()}</span>
                    </div>
                  ));
                })()}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setIsEditing(true)}>
                  Manage Print Ads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
