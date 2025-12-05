import React, { useState, useEffect } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { EditableInventoryManager } from './EditableInventoryManager';
import { PublicationFrontend } from '@/types/publication';
import { useToast } from '@/hooks/use-toast';
import { updatePublication } from '@/api/publications';
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
  Filter,
  Mic,
  Radio,
  Video,
  FileText,
  Eye
} from 'lucide-react';

export const PublicationInventory: React.FC = () => {
  const { selectedPublication, setSelectedPublication } = usePublication();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

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
          size: ad.format?.dimensions || ad.adFormat || 'Standard',
          price: ad.pricing?.flatRate ? `$${ad.pricing.flatRate} ${ad.pricing.pricingModel === 'cpm' ? 'CPM' : ''}` : 'Contact for pricing',
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
            size: ad.format?.dimensions || ad.dimensions || 'Standard',
            price: ad.pricing?.flatRate ? `$${ad.pricing.flatRate} ${ad.pricing.pricingModel === 'per_send' ? '/send' : ''}` : 'Contact for pricing',
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
          // Format price based on pricing structure
          let priceDisplay = 'Contact for pricing';
          if (Array.isArray(ad.pricing)) {
            // Multiple pricing tiers - show the first one
            const firstTier = ad.pricing[0];
            if (firstTier?.pricing?.flatRate && firstTier?.frequency) {
              priceDisplay = `$${firstTier.pricing.flatRate} (${firstTier.frequency})`;
            }
          } else if (ad.pricing?.flatRate) {
            // Single pricing tier
            const freq = ad.pricing.frequency ? ` (${ad.pricing.frequency})` : '';
            priceDisplay = `$${ad.pricing.flatRate}${freq}`;
          }

          items.push({
            id: itemId++,
            type: ad.name || 'Print Ad',
            channel: 'print',
            position: `${printPub.name || `Print Publication ${printIndex + 1}`} • ${ad.location || 'Print'} • ${ad.adFormat || 'Standard'}${ad.color ? ` (${ad.color})` : ''}`,
            size: ad.format?.dimensions || 'Standard',
            price: priceDisplay,
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
    console.log('📄 Inventory changes saved, updating UI');
    setSelectedPublication(updatedPublication);
    setIsEditing(false);
    // Reload inventory data to reflect changes
    loadInventoryData();
    toast({
      title: "Success",
      description: "Inventory changes have been saved and applied."
    });
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

  const formatPrice = (pricing: any) => {
    if (!pricing?.flatRate) return 'Contact for pricing';
    
    const price = `$${pricing.flatRate.toLocaleString()}`;
    const model = pricing.pricingModel;
    
    if (model === 'cpm') return `${price} CPM`;
    if (model === 'per_send') return `${price} per send`;
    if (model === 'per_spot') return `${price} per spot`;
    if (model === 'per_post') return `${price} per post`;
    if (model === 'per_week') return `${price} per week`;
    if (model === 'per_day') return `${price} per day`;
    
    return price;
  };

  const addDistributionChannel = async (channelType: 'podcasts' | 'radio' | 'streaming') => {
    if (!selectedPublication) return;
    
    let newChannel: any;
    let channelKey: string;
    
    switch (channelType) {
      case 'podcasts':
        newChannel = {
          podcastId: `podcast_${Date.now()}`,
          name: 'New Podcast',
          description: 'Podcast description',
          frequency: 'weekly',
          averageDownloads: 0,
          averageListeners: 0,
          episodeCount: 0,
          platforms: ['spotify'],
          advertisingOpportunities: []
        };
        channelKey = 'podcasts';
        break;
      
      case 'radio':
        newChannel = {
          stationId: `radio_${Date.now()}`,
          callSign: 'WXYZ',
          frequency: '101.5 FM',
          format: 'news_talk',
          coverageArea: 'Metropolitan Area',
          listeners: 0,
          advertisingOpportunities: []
        };
        channelKey = 'radioStations';
        break;
      
      case 'streaming':
        newChannel = {
          channelId: `stream_${Date.now()}`,
          name: 'New Channel',
          platform: 'youtube',
          subscribers: 0,
          averageViews: 0,
          contentType: 'mixed',
          streamingSchedule: 'Daily',
          advertisingOpportunities: []
        };
        channelKey = 'streamingVideo';
        break;
    }

    const updatedChannels = [
      ...(selectedPublication.distributionChannels?.[channelKey as keyof typeof selectedPublication.distributionChannels] as any[] || []),
      newChannel
    ];

    try {
      const updatedPublication = {
        ...selectedPublication,
        distributionChannels: {
          ...selectedPublication.distributionChannels,
          [channelKey]: updatedChannels
        }
      };

      // Save to database
      const savedPublication = await updatePublication(selectedPublication._id, updatedPublication);
      
      if (savedPublication) {
        setSelectedPublication(savedPublication);
        await loadInventoryData();
        
        toast({
          title: "Success",
          description: `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} channel added successfully`,
        });
      }
    } catch (error) {
      console.error(`Error adding ${channelType} channel:`, error);
      toast({
        title: "Error",
        description: `Failed to add ${channelType} channel`,
        variant: "destructive",
      });
    }
  };

  const renderDistributionChannels = () => {
    const channels = [];
    const publication = selectedPublication;

    // Website Channel
    if (publication.distributionChannels?.website && (typeFilter === 'all' || typeFilter === 'website')) {
      channels.push(
        <Card key="website" className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h4 className="text-lg font-semibold">Website</h4>
                  <Badge variant="secondary" className="text-xs">
                    {publication.distributionChannels.website.url ? 'Active' : 'Not Set'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Monthly Visitors:</span>
                    <span className="ml-2 font-medium">{publication.distributionChannels.website.metrics?.monthlyVisitors?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Page Views:</span>
                    <span className="ml-2 font-medium">{publication.distributionChannels.website.metrics?.monthlyPageViews?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bounce Rate:</span>
                    <span className="ml-2 font-medium">{publication.distributionChannels.website.metrics?.bounceRate ? `${publication.distributionChannels.website.metrics.bounceRate}%` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ad Opportunities:</span>
                    <span className="ml-2 font-medium">{publication.distributionChannels.website.advertisingOpportunities?.length || 0}</span>
                  </div>
                </div>

                {/* Advertising Opportunities */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                  </div>
                  
                  {publication.distributionChannels.website.advertisingOpportunities && publication.distributionChannels.website.advertisingOpportunities.length > 0 ? (
                    <div className="space-y-2">
                      {publication.distributionChannels.website.advertisingOpportunities.map((ad, adIndex) => (
                        <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{ad.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {ad.adFormat} • {ad.location} • {formatPrice(ad.pricing)}
                            </span>
                          </div>
                          <Badge className={getAvailabilityColor(ad.available ? 'Available' : 'Unavailable')}>
                            {ad.available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Newsletter Channels
    if (publication.distributionChannels?.newsletters && (typeFilter === 'all' || typeFilter === 'newsletter')) {
      publication.distributionChannels.newsletters.forEach((newsletter, index) => {
        channels.push(
          <Card key={`newsletter-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    <h4 className="text-lg font-semibold">{newsletter.name || 'Unnamed Newsletter'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {newsletter.frequency || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Subscribers:</span>
                      <span className="ml-2 font-medium">{newsletter.subscribers?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Open Rate:</span>
                      <span className="ml-2 font-medium">{newsletter.openRate ? `${newsletter.openRate}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <span className="ml-2 font-medium">{newsletter.subject || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{newsletter.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {newsletter.advertisingOpportunities && newsletter.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {newsletter.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.position} • {ad.format?.dimensions} • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Print Publications
    if (publication.distributionChannels?.print && (typeFilter === 'all' || typeFilter === 'print')) {
      const printChannels = Array.isArray(publication.distributionChannels.print) 
        ? publication.distributionChannels.print 
        : [publication.distributionChannels.print];
        
      printChannels.forEach((printPub, index) => {
        channels.push(
          <Card key={`print-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Newspaper className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg font-semibold">{printPub.name || 'Print Publication'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {printPub.frequency || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Circulation:</span>
                      <span className="ml-2 font-medium">{printPub.circulation?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Distribution Area:</span>
                      <span className="ml-2 font-medium">{printPub.distributionArea || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid Circulation:</span>
                      <span className="ml-2 font-medium">{printPub.paidCirculation?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{printPub.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {printPub.advertisingOpportunities && printPub.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {printPub.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.format?.dimensions} • {ad.adFormat} • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Social Media Profiles
    if (publication.distributionChannels?.socialMedia && (typeFilter === 'all' || typeFilter === 'social')) {
      publication.distributionChannels.socialMedia.forEach((social, index) => {
        channels.push(
          <Card key={`social-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h4 className="text-lg font-semibold">{social.platform || 'Social Media'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {social.handle || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Followers:</span>
                      <span className="ml-2 font-medium">{social.followers?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Engagement Rate:</span>
                      <span className="ml-2 font-medium">{social.engagementRate ? `${social.engagementRate}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verified:</span>
                      <span className="ml-2 font-medium">{social.verified ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{social.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {social.advertisingOpportunities && social.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {social.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.adFormat} • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Events
    if (publication.distributionChannels?.events && (typeFilter === 'all' || typeFilter === 'events')) {
      publication.distributionChannels.events.forEach((event, index) => {
        channels.push(
          <Card key={`event-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <h4 className="text-lg font-semibold">{event.name || 'Event'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {event.frequency || 'One-time'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Attendance:</span>
                      <span className="ml-2 font-medium">{event.averageAttendance?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <span className="ml-2 font-medium">{event.location || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2 font-medium">{event.date || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{event.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {event.advertisingOpportunities && event.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {event.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.location} • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Podcasts
    if (publication.distributionChannels?.podcasts && (typeFilter === 'all' || typeFilter === 'podcasts')) {
      publication.distributionChannels.podcasts.forEach((podcast, index) => {
        channels.push(
          <Card key={`podcast-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mic className="h-5 w-5 text-red-600" />
                    <h4 className="text-lg font-semibold">{podcast.name || 'Podcast'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {podcast.frequency || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Avg Listeners:</span>
                      <span className="ml-2 font-medium">{podcast.averageListeners?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Downloads:</span>
                      <span className="ml-2 font-medium">{podcast.averageDownloads?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Platforms:</span>
                      <span className="ml-2 font-medium">{podcast.platforms?.join(', ') || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{podcast.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {podcast.advertisingOpportunities && podcast.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {podcast.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.adFormat} • {ad.duration}s • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Radio Stations
    if (publication.distributionChannels?.radioStations && (typeFilter === 'all' || typeFilter === 'radio')) {
      publication.distributionChannels.radioStations.forEach((radio, index) => {
        channels.push(
          <Card key={`radio-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Radio className="h-5 w-5 text-yellow-600" />
                    <h4 className="text-lg font-semibold">{radio.callSign || 'Radio Station'}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {radio.frequency || 'Not Set'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Listeners:</span>
                      <span className="ml-2 font-medium">{radio.listeners?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coverage Area:</span>
                      <span className="ml-2 font-medium">{radio.coverageArea || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Format:</span>
                      <span className="ml-2 font-medium">{radio.format || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{radio.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {radio.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex-1">
                              <span className="font-medium">{ad.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {ad.adFormat} • {ad.timeSlot} • {formatPrice(ad.pricing)}
                              </span>
                            </div>
                            <Badge className={getAvailabilityColor('Available')}>
                              Available
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Streaming Video
    if (publication.distributionChannels?.streamingVideo && (typeFilter === 'all' || typeFilter === 'streaming')) {
      publication.distributionChannels.streamingVideo.forEach((streaming, index) => {
        channels.push(
          <Card key={`streaming-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Video className="h-5 w-5 text-indigo-600" />
                    <h4 className="text-lg font-semibold">{streaming.name || 'Streaming Channel'}</h4>
                    {Array.isArray(streaming.platform) && streaming.platform.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {streaming.platform.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs capitalize">
                            {p.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Not Set</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Subscribers:</span>
                      <span className="ml-2 font-medium">{streaming.subscribers?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Views/Video:</span>
                      <span className="ml-2 font-medium">{streaming.averageViews?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency:</span>
                      <span className="ml-2 font-medium">
                        {streaming.frequency ? (
                          <span className="capitalize">{streaming.frequency}</span>
                        ) : (
                          <span className="text-orange-500">⚠️ Not Set</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Content Type:</span>
                      <span className="ml-2 font-medium">{streaming.contentType || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ad Opportunities:</span>
                      <span className="ml-2 font-medium">{streaming.advertisingOpportunities?.length || 0}</span>
                    </div>
                  </div>

                  {/* Advertising Opportunities */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">Advertising Opportunities</h5>
                    </div>
                    
                    {streaming.advertisingOpportunities && streaming.advertisingOpportunities.length > 0 ? (
                      <div className="space-y-2">
                        {streaming.advertisingOpportunities.map((ad, adIndex) => (
                          <div key={adIndex} className="p-2 bg-gray-50 rounded text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="font-medium">{ad.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {ad.position && <span className="capitalize">{ad.position} • </span>}
                                  {ad.adFormat} • {ad.duration}s • {formatPrice(ad.pricing)}
                                </span>
                              </div>
                              <Badge className={getAvailabilityColor('Available')}>
                                Available
                              </Badge>
                            </div>
                            {ad.performanceMetrics && (ad.performanceMetrics.impressionsPerMonth || ad.performanceMetrics.occurrencesPerMonth) && (
                              <div className="text-muted-foreground text-xs pl-1">
                                {ad.performanceMetrics.impressionsPerMonth && (
                                  <span>{ad.performanceMetrics.impressionsPerMonth.toLocaleString()} impressions/mo</span>
                                )}
                                {ad.performanceMetrics.occurrencesPerMonth && (
                                  <span className="ml-2">{ad.performanceMetrics.occurrencesPerMonth} spots/mo</span>
                                )}
                                {ad.performanceMetrics.guaranteed && (
                                  <span className="ml-2 text-green-600">✓ Guaranteed</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No advertising opportunities configured</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      });
    }

    // Add empty state cards for missing channels when filter is applied
    if (typeFilter === 'podcasts' && (!publication.distributionChannels?.podcasts || publication.distributionChannels.podcasts.length === 0)) {
      channels.push(
        <Card key="empty-podcasts">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Podcasts</h3>
              <p className="text-gray-500 mb-4">Create your first podcast channel to start tracking advertising opportunities.</p>
              <Button onClick={() => addDistributionChannel('podcasts')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Podcast
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (typeFilter === 'radio' && (!publication.distributionChannels?.radioStations || publication.distributionChannels.radioStations.length === 0)) {
      channels.push(
        <Card key="empty-radio">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Radio Stations</h3>
              <p className="text-gray-500 mb-4">Add your first radio station to start tracking advertising opportunities.</p>
              <Button onClick={() => addDistributionChannel('radio')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Radio Station
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (typeFilter === 'streaming' && (!publication.distributionChannels?.streamingVideo || publication.distributionChannels.streamingVideo.length === 0)) {
      channels.push(
        <Card key="empty-streaming">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Streaming Channels</h3>
              <p className="text-gray-500 mb-4">Create your first streaming video channel to start tracking advertising opportunities.</p>
              <Button onClick={() => addDistributionChannel('streaming')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Streaming Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // General empty state
    if (channels.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Distribution Channels</h3>
              <p className="text-gray-500 mb-4">
                {typeFilter === 'all' 
                  ? 'Add distribution channels to track advertising opportunities.' 
                  : `No ${typeFilter} channels configured.`}
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button onClick={() => addDistributionChannel('podcasts')} variant="outline" size="sm">
                  <Mic className="w-4 h-4 mr-2" />
                  Add Podcast
                </Button>
                <Button onClick={() => addDistributionChannel('radio')} variant="outline" size="sm">
                  <Radio className="w-4 h-4 mr-2" />
                  Add Radio
                </Button>
                <Button onClick={() => addDistributionChannel('streaming')} variant="outline" size="sm">
                  <Video className="w-4 h-4 mr-2" />
                  Add Streaming
                </Button>
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Full Editor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return channels;
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

      {/* Distribution Channels */}
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Distribution Channels</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button onClick={() => addDistributionChannel('podcasts')} variant="outline" size="sm">
                <Mic className="w-3 h-3 mr-1" />
                Podcast
              </Button>
              <Button onClick={() => addDistributionChannel('radio')} variant="outline" size="sm">
                <Radio className="w-3 h-3 mr-1" />
                Radio
              </Button>
              <Button onClick={() => addDistributionChannel('streaming')} variant="outline" size="sm">
                <Video className="w-3 h-3 mr-1" />
                Streaming
              </Button>
            </div>
            <div className="h-4 w-px bg-border mx-2"></div>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="print">Print</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="podcasts">Podcasts</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="h-6 w-48 bg-muted rounded mb-2"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="h-8 w-16 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {renderDistributionChannels()}
          </div>
        )}
      </div>

    </div>
  );
};
