import React, { useState, useMemo } from 'react';
import { usePublication } from '@/contexts/PublicationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { calculateRevenue } from '@/utils/pricingCalculations';
import { 
  ArrowLeft, 
  Printer, 
  Globe, 
  Mail, 
  Newspaper,
  Users,
  Calendar,
  Mic,
  Radio,
  Video,
  Download,
  TrendingUp,
  Package,
  DollarSign,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface PricingTier {
  label: string;
  standardPrice?: number;
  hubPrice?: number;
  pricingModel?: string;
  discount?: number;
  available?: boolean;
  minimumCommitment?: string;
}

interface InventoryItem {
  channel: string;
  channelIcon: any;
  name: string;
  format?: string;
  dimensions?: string;
  reach?: number;
  reachLabel?: string;
  pricing: PricingTier[];
  hubId?: string;
  hubName?: string;
}

export const HubPricingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { selectedPublication } = usePublication();
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set(['Website', 'Print', 'Newsletter', 'Social Media', 'Events', 'Podcasts', 'Radio', 'Streaming']));

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  const publication = selectedPublication;

  // Collect all inventory items with their pricing
  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];

    // Website Ads
    if (publication.distributionChannels.website?.advertisingOpportunities) {
      const reach = publication.distributionChannels.website.metrics?.monthlyVisitors;
      publication.distributionChannels.website.advertisingOpportunities.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        // Standard pricing - use standardized calculation
        const standardRevenue = calculateRevenue(ad, 'month');
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        // Hub pricing - calculate for each hub
        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month');
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Website',
            channelIcon: Globe,
            name: ad.name,
            format: ad.adFormat,
            dimensions: ad.sizes?.join(', ') || ad.specifications?.size,
            reach,
            reachLabel: 'Monthly Visitors',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    }

    // Newsletter Ads
    publication.distributionChannels.newsletters?.forEach((newsletter: any) => {
      const reach = newsletter.subscribers;
      newsletter.advertisingOpportunities?.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        // Standard pricing with frequency
        const standardRevenue = calculateRevenue(ad, 'month', newsletter.frequency);
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month', newsletter.frequency);
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Newsletter',
            channelIcon: Mail,
            name: `${newsletter.name} - ${ad.name}`,
            format: ad.position,
            dimensions: ad.dimensions,
            reach,
            reachLabel: 'Subscribers',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    });

    // Print Ads
    if (Array.isArray(publication.distributionChannels.print)) {
      publication.distributionChannels.print.forEach((print: any) => {
        const reach = print.circulation;
        print.advertisingOpportunities?.forEach((ad: any) => {
          const pricing: PricingTier[] = [];
          
          // Handle array of pricing tiers
          if (Array.isArray(ad.pricing)) {
            ad.pricing.forEach((tier: any, idx: number) => {
              // For frequency-based pricing, get from pricing.frequency or tier level
              const frequency = tier.pricing?.frequency || tier.frequency;
              let tierLabel = frequency || tier.name || tier.size || `Tier ${idx + 1}`;
              
              // Calculate monthly revenue for this tier
              const tierAd = { ...ad, pricing: tier.pricing || tier };
              const tierRevenue = calculateRevenue(tierAd, 'month', print.frequency);
              
              if (tierRevenue > 0) {
                pricing.push({
                  label: tierLabel,
                  standardPrice: tierRevenue,
                  pricingModel: tier.pricing?.pricingModel || tier.pricingModel,
                });
              }
            });
          } else {
            const standardRevenue = calculateRevenue(ad, 'month', print.frequency);
            if (standardRevenue > 0) {
              pricing.push({
                label: 'Standard',
                standardPrice: standardRevenue,
                pricingModel: ad.pricing?.pricingModel,
              });
            }
          }

          ad.hubPricing?.forEach((hub: any) => {
            // Handle both single pricing object and array of pricing tiers
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            
            pricingArray.forEach((pricingTier: any) => {
              // Hub pricing may also have frequency inside pricing object
              const hubFrequency = pricingTier?.frequency;
              const hubLabel = hubFrequency 
                ? `${hub.hubName || hub.hubId} (${hubFrequency})`
                : hub.hubName || hub.hubId;
              
              const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
              const hubRevenue = calculateRevenue(hubAd, 'month', print.frequency);
              
              if (hubRevenue > 0) {
                pricing.push({
                  label: hubLabel,
                  hubPrice: hubRevenue,
                  pricingModel: pricingTier?.pricingModel,
                  discount: hub.discount,
                  available: hub.available,
                  minimumCommitment: hub.minimumCommitment,
                });
              }
            });
          });

          if (pricing.length > 0) {
            items.push({
              channel: 'Print',
              channelIcon: Newspaper,
              name: `${print.name} - ${ad.name}`,
              format: ad.adFormat,
              dimensions: ad.dimensions,
              reach,
              reachLabel: 'Circulation',
              pricing,
              hubId: ad.hubPricing?.[0]?.hubId,
              hubName: ad.hubPricing?.[0]?.hubName,
            });
          }
        });
      });
    }

    // Social Media Ads
    publication.distributionChannels.socialMedia?.forEach((social: any) => {
      const reach = social.metrics?.followers;
      social.advertisingOpportunities?.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        const standardRevenue = calculateRevenue(ad, 'month');
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month');
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Social Media',
            channelIcon: Users,
            name: `${social.platform} - ${ad.name}`,
            format: ad.adFormat,
            reach,
            reachLabel: 'Followers',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    });

    // Event Sponsorships
    publication.distributionChannels.events?.forEach((event: any) => {
      const reach = event.averageAttendance;
      event.advertisingOpportunities?.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        const standardRevenue = calculateRevenue(ad, 'month', event.frequency);
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month', event.frequency);
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Events',
            channelIcon: Calendar,
            name: `${event.name} - ${ad.level || 'Sponsorship'}`,
            format: ad.level,
            reach,
            reachLabel: 'Attendance',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    });

    // Podcast Ads
    publication.distributionChannels.podcasts?.forEach((podcast: any) => {
      const reach = podcast.averageListeners;
      podcast.advertisingOpportunities?.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        const standardRevenue = calculateRevenue(ad, 'month', podcast.frequency);
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month', podcast.frequency);
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Podcasts',
            channelIcon: Mic,
            name: `${podcast.name} - ${ad.name}`,
            format: ad.adFormat,
            reach,
            reachLabel: 'Avg Listeners',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    });

    // Radio Ads
    publication.distributionChannels.radioStations?.forEach((radio: any) => {
      const reach = radio.listeners;
      
      // NEW: Handle show-based structure
      if (radio.shows && radio.shows.length > 0) {
        radio.shows.forEach((show: any) => {
          show.advertisingOpportunities?.forEach((ad: any) => {
            const pricing: PricingTier[] = [];
            
            const standardRevenue = calculateRevenue(ad, 'month', show.frequency);
            if (standardRevenue > 0) {
              pricing.push({
                label: 'Standard',
                standardPrice: standardRevenue,
                pricingModel: ad.pricing?.pricingModel,
              });
            }

            ad.hubPricing?.forEach((hub: any) => {
              // Handle both single pricing object and array of pricing tiers
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              
              pricingArray.forEach((pricingTier: any) => {
                const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
                const hubRevenue = calculateRevenue(hubAd, 'month', show.frequency);
                
                if (hubRevenue > 0) {
                  pricing.push({
                    label: hub.hubName || hub.hubId,
                    hubPrice: hubRevenue,
                    pricingModel: pricingTier?.pricingModel,
                    discount: hub.discount,
                    available: hub.available,
                    minimumCommitment: hub.minimumCommitment,
                  });
                }
              });
            });

            if (pricing.length > 0) {
              items.push({
                channel: 'Radio',
                channelIcon: Radio,
                name: `${radio.callSign} - ${show.name}`,
                format: ad.adFormat || ad.specifications?.duration ? `${ad.specifications.duration}s spot` : 'Unknown',
                reach,
                reachLabel: 'Listeners',
                pricing,
              });
            }
          });
        });
      } else if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
        // LEGACY: Handle station-level ads only if no shows exist (prevent double-counting)
        radio.advertisingOpportunities.forEach((ad: any) => {
          const pricing: PricingTier[] = [];
          
          const standardRevenue = calculateRevenue(ad, 'month');
          if (standardRevenue > 0) {
            pricing.push({
              label: 'Standard',
              standardPrice: standardRevenue,
              pricingModel: ad.pricing?.pricingModel,
            });
          }

          ad.hubPricing?.forEach((hub: any) => {
            // Handle both single pricing object and array of pricing tiers
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            
            pricingArray.forEach((pricingTier: any) => {
              const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
              const hubRevenue = calculateRevenue(hubAd, 'month');
              
              if (hubRevenue > 0) {
                pricing.push({
                  label: hub.hubName || hub.hubId,
                  hubPrice: hubRevenue,
                  pricingModel: pricingTier?.pricingModel,
                  discount: hub.discount,
                  available: hub.available,
                  minimumCommitment: hub.minimumCommitment,
                });
              }
            });
          });

          if (pricing.length > 0) {
            items.push({
              channel: 'Radio',
              channelIcon: Radio,
              name: `${radio.callSign} - ${ad.name}`,
              format: ad.adFormat,
              reach,
              reachLabel: 'Weekly Listeners',
              pricing,
              hubId: ad.hubPricing?.[0]?.hubId,
              hubName: ad.hubPricing?.[0]?.hubName,
            });
          }
        });
      }
    });

    // Streaming Video Ads
    publication.distributionChannels.streamingVideo?.forEach((streaming: any) => {
      const reach = streaming.subscribers;
      streaming.advertisingOpportunities?.forEach((ad: any) => {
        const pricing: PricingTier[] = [];
        
        const standardRevenue = calculateRevenue(ad, 'month', streaming.frequency);
        if (standardRevenue > 0) {
          pricing.push({
            label: 'Standard',
            standardPrice: standardRevenue,
            pricingModel: ad.pricing?.pricingModel,
          });
        }

        ad.hubPricing?.forEach((hub: any) => {
          // Handle both single pricing object and array of pricing tiers
          const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
          
          pricingArray.forEach((pricingTier: any) => {
            const hubAd = { ...ad, pricing: pricingTier, hubPricing: null };
            const hubRevenue = calculateRevenue(hubAd, 'month', streaming.frequency);
            
            if (hubRevenue > 0) {
              pricing.push({
                label: hub.hubName || hub.hubId,
                hubPrice: hubRevenue,
                pricingModel: pricingTier?.pricingModel,
                discount: hub.discount,
                available: hub.available,
                minimumCommitment: hub.minimumCommitment,
              });
            }
          });
        });

        if (pricing.length > 0) {
          items.push({
            channel: 'Streaming',
            channelIcon: Video,
            name: `${streaming.name} - ${ad.name}`,
            format: ad.adFormat,
            reach,
            reachLabel: 'Subscribers',
            pricing,
            hubId: ad.hubPricing?.[0]?.hubId,
            hubName: ad.hubPricing?.[0]?.hubName,
          });
        }
      });
    });

    return items;
  }, [publication]);

  // Get unique hubs
  const availableHubs = useMemo(() => {
    const hubs = new Set<string>();
    inventoryItems.forEach(item => {
      item.pricing.forEach(tier => {
        if (tier.hubPrice !== undefined && tier.label !== 'Standard') {
          hubs.add(tier.label);
        }
      });
    });
    return Array.from(hubs).sort();
  }, [inventoryItems]);

  // Get unique channels
  const availableChannels = useMemo(() => {
    const channels = new Set<string>();
    inventoryItems.forEach(item => channels.add(item.channel));
    return Array.from(channels).sort();
  }, [inventoryItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = inventoryItems;

    if (selectedChannel !== 'all') {
      filtered = filtered.filter(item => item.channel === selectedChannel);
    }

    if (selectedHub !== 'all') {
      filtered = filtered.filter(item => 
        item.pricing.some(tier => tier.label === selectedHub)
      );
    }

    return filtered;
  }, [inventoryItems, selectedChannel, selectedHub]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalItems = filteredItems.length;
    let totalStandardRevenue = 0;
    let totalHubRevenue = 0;
    let totalSavings = 0;

    filteredItems.forEach(item => {
      item.pricing.forEach(tier => {
        if (tier.label === 'Standard' && tier.standardPrice) {
          totalStandardRevenue += tier.standardPrice;
        } else if (selectedHub === 'all' || tier.label === selectedHub) {
          if (tier.hubPrice) {
            totalHubRevenue += tier.hubPrice;
            // Calculate savings if we have standard price
            const standardTier = item.pricing.find(p => p.label === 'Standard');
            if (standardTier?.standardPrice) {
              totalSavings += (standardTier.standardPrice - tier.hubPrice);
            }
          }
        }
      });
    });

    return {
      totalItems,
      totalStandardRevenue,
      totalHubRevenue,
      totalSavings,
      avgDiscount: totalStandardRevenue > 0 ? (totalSavings / totalStandardRevenue) * 100 : 0
    };
  }, [filteredItems, selectedHub]);

  const formatCurrency = (amount?: number) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num && num !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const toggleChannel = (channel: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channel)) {
      newExpanded.delete(channel);
    } else {
      newExpanded.add(channel);
    }
    setExpandedChannels(newExpanded);
  };

  const toggleAllChannels = () => {
    if (expandedChannels.size === availableChannels.length) {
      setExpandedChannels(new Set());
    } else {
      setExpandedChannels(new Set(availableChannels));
    }
  };

  // Group items by channel
  const groupedItems = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      if (!grouped[item.channel]) {
        grouped[item.channel] = [];
      }
      grouped[item.channel].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const handleExport = () => {
    // Create CSV data
    const headers = ['Channel', 'Item Name', 'Format', 'Reach', 'Pricing Tier', 'Price', 'Model', 'Discount', 'Available', 'Min Commitment'];
    const rows = filteredItems.map(item => {
      return item.pricing.map(tier => [
        item.channel,
        item.name,
        item.format || '',
        item.reach ? `${formatNumber(item.reach)} ${item.reachLabel}` : '',
        tier.label,
        tier.hubPrice ? formatCurrency(tier.hubPrice) : tier.standardPrice ? formatCurrency(tier.standardPrice) : '',
        tier.pricingModel || '',
        tier.discount ? `${tier.discount}%` : '',
        tier.available !== undefined ? (tier.available ? 'Yes' : 'No') : '',
        tier.minimumCommitment || ''
      ]);
    }).flat();

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${publication.basicInfo.publicationName}-hub-pricing-report.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Hub Pricing Report</h1>
            <p className="text-sm text-muted-foreground">{publication.basicInfo.publicationName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Hub</label>
              <Select value={selectedHub} onValueChange={setSelectedHub}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs</SelectItem>
                  {availableHubs.map(hub => (
                    <SelectItem key={hub} value={hub}>{hub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Channel</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {availableChannels.map(channel => (
                    <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-3xl font-bold">{summaryStats.totalItems}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ad opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Standard Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <span className="text-3xl font-bold">{formatCurrency(summaryStats.totalStandardRevenue)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">If 100% sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hub Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold text-green-600">{formatCurrency(summaryStats.totalHubRevenue)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Hub pricing total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-8 text-lg">
                {summaryStats.avgDiscount.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Save: {formatCurrency(summaryStats.totalSavings)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Details</CardTitle>
              <CardDescription>
                {selectedHub === 'all' 
                  ? 'Showing all inventory across all hubs' 
                  : `Showing inventory for ${selectedHub}`}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleAllChannels}
            >
              {expandedChannels.size === availableChannels.length ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory found matching the selected filters
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).sort(([a], [b]) => a.localeCompare(b)).map(([channel, items]) => {
                const Icon = items[0]?.channelIcon || Package;
                const isExpanded = expandedChannels.has(channel);
                const channelRevenue = items.reduce((sum, item) => {
                  const firstPrice = item.pricing.find(p => p.hubPrice || p.standardPrice);
                  return sum + (firstPrice?.hubPrice || firstPrice?.standardPrice || 0);
                }, 0);

                return (
                  <div key={channel} className="border rounded-lg overflow-hidden">
                    {/* Channel Header */}
                    <button
                      onClick={() => toggleChannel(channel)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                        <Icon className="h-5 w-5 text-blue-600" />
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">{channel}</h3>
                          <p className="text-sm text-muted-foreground">{items.length} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-green-600">{formatCurrency(channelRevenue)}</p>
                        <p className="text-xs text-muted-foreground">Total value</p>
                      </div>
                    </button>

                    {/* Channel Items */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 bg-white">
                        {items.map((item, index) => {
                const Icon = item.channelIcon;
                return (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                            <Badge variant="outline">{item.channel}</Badge>
                            {item.format && <span>• {item.format}</span>}
                            {item.dimensions && <span>• {item.dimensions}</span>}
                          </div>
                        </div>
                      </div>
                      {item.reach && (
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatNumber(item.reach)}</p>
                          <p className="text-xs text-muted-foreground">{item.reachLabel}</p>
                        </div>
                      )}
                    </div>

                    {/* Pricing Tiers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t">
                      {item.pricing.map((tier, tierIndex) => {
                        // Determine if this is standard pricing or hub pricing
                        const isStandard = tier.standardPrice !== undefined && tier.hubPrice === undefined;
                        const isHub = tier.hubPrice !== undefined;
                        
                        // Skip if filtering by hub and this is standard pricing (not hub related)
                        if (selectedHub !== 'all' && !isHub && !tier.label.includes(selectedHub)) {
                          return null;
                        }
                        // Skip if filtering by hub and this hub pricing doesn't match
                        if (selectedHub !== 'all' && isHub && !tier.label.includes(selectedHub)) {
                          return null;
                        }

                        const price = tier.hubPrice || tier.standardPrice;

                        return (
                          <div 
                            key={tierIndex} 
                            className={`p-3 rounded-lg ${isStandard ? 'bg-gray-100' : 'bg-blue-50 border border-blue-200'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${isStandard ? 'text-gray-700' : 'text-blue-700'}`}>
                                {tier.label}
                              </span>
                              {tier.discount && (
                                <Badge variant="secondary" className="text-xs">
                                  -{tier.discount}%
                                </Badge>
                              )}
                            </div>
                            <p className={`text-lg font-bold ${isStandard ? 'text-gray-900' : 'text-blue-900'}`}>
                              {formatCurrency(price)}
                            </p>
                            {tier.pricingModel && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {tier.pricingModel}
                              </p>
                            )}
                            {tier.minimumCommitment && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Min: {tier.minimumCommitment}
                              </p>
                            )}
                            {tier.available !== undefined && !tier.available && (
                              <Badge variant="destructive" className="mt-2 text-xs">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

