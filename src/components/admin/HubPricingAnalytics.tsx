import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PricingAnalytics, ChannelPricingAnalytics } from '@/hooks/useDashboardStats';
import { CHANNEL_COLORS } from '@/constants/channelColors';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Info, Star, ThumbsUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { assessPricing, calculatePricingHealth, getSuggestedPrice, type PricingStatus } from '@/utils/pricingBenchmarks';

interface HubPricingAnalyticsProps {
  pricingAnalytics?: PricingAnalytics;
  publications?: any[];
  loading?: boolean;
}

interface InventoryItem {
  publicationId: number;
  publicationName: string;
  itemName: string;
  channel: string;
  pricingModel: string;
  price: number;
  audience: number;
  unitPrice: number;
  assessment: any;
}

// Format currency
const formatCurrency = (value: number): string => {
  if (value === 0) return '$0';
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${Math.round(value).toLocaleString()}`;
};

// Format percentage for cost per reach
const formatCPR = (value: number): string => {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
};

// Format large numbers with K/M suffix
const formatAudience = (value: number): string => {
  if (value === 0) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
};

// Friendly pricing model names
const PRICING_MODEL_LABELS: Record<string, string> = {
  cpm: 'CPM (Cost Per 1000)',
  cpv: 'CPV (Cost Per View)',
  flat: 'Flat Rate (One-Time)',
  flat_rate: 'Flat Rate (One-Time)',
  per_ad: 'Per Ad',
  per_spot: 'Per Spot',
  per_episode: 'Per Episode',
  per_post: 'Per Post',
  per_story: 'Per Story',
  per_send: 'Per Send',
  per_week: 'Per Week',
  per_day: 'Per Day',
  monthly: 'Monthly',
  contact: 'Contact for Pricing',
  unknown: 'Flat Rate (One-Time)'
};

// Get variance color based on coefficient of variation (std dev / mean)
const getVarianceColor = (stdDev: number, avg: number): string => {
  if (avg === 0) return 'text-gray-500';
  const cv = stdDev / avg;
  if (cv < 0.2) return 'text-green-600'; // Low variance
  if (cv < 0.5) return 'text-yellow-600'; // Medium variance
  return 'text-red-600'; // High variance
};

// Get audience metric label by channel
const getAudienceMetricLabel = (channel: string): string => {
  const labels: Record<string, string> = {
    website: 'Monthly Visitors',
    newsletter: 'Subscribers',
    print: 'Circulation',
    podcast: 'Avg Listeners',
    radio: 'Listeners',
    streaming: 'Subscribers/Viewers',
    social: 'Followers',
    events: 'Attendees'
  };
  return labels[channel] || 'Audience';
};

// Get normalized unit label (CPM-style) by channel
const getNormalizedUnitLabel = (channel: string): string => {
  const labels: Record<string, string> = {
    website: 'Per 1K Visitors',
    newsletter: 'Per 1K Subscribers',
    print: 'Per 1K Circulation',
    podcast: 'Per 1K Listeners',
    radio: 'Per 1K Listeners',
    streaming: 'Per 1K Viewers',
    social: 'Per 1K Followers',
    events: 'Per 1K Attendees'
  };
  return labels[channel] || 'Per 1K Audience';
};

// Channel configurations
const CHANNELS = [
  { key: 'website', label: 'Website', icon: CHANNEL_COLORS.website.icon },
  { key: 'newsletter', label: 'Newsletter', icon: CHANNEL_COLORS.newsletter.icon },
  { key: 'print', label: 'Print', icon: CHANNEL_COLORS.print.icon },
  { key: 'podcast', label: 'Podcast', icon: CHANNEL_COLORS.podcasts.icon },
  { key: 'radio', label: 'Radio', icon: CHANNEL_COLORS.radioStations.icon },
  { key: 'streaming', label: 'Streaming', icon: CHANNEL_COLORS.streamingVideo.icon }
];

export const HubPricingAnalytics: React.FC<HubPricingAnalyticsProps> = ({ 
  pricingAnalytics,
  publications = [],
  loading 
}) => {
  const [activeChannel, setActiveChannel] = useState('website');

  // Extract detailed inventory items from publications
  const detailedInventory = useMemo(() => {
    const items: InventoryItem[] = [];
    
    publications.forEach(pub => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const pubId = pub.publicationId;
      const dc = pub.distributionChannels || {};

      // Website
      if (dc.website?.advertisingOpportunities) {
        dc.website.advertisingOpportunities.forEach((ad: any) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = Array.isArray(hubPricing.pricing) ? hubPricing.pricing[0] : hubPricing.pricing;
            const rawPricingModel = pricing.pricingModel || 'flat';
            // Normalize unknown/null/empty to flat
            const pricingModel = rawPricingModel === 'unknown' || !rawPricingModel ? 'flat' : rawPricingModel;
            
            // Extract price based on pricing model
            let price = 0;
            switch (pricingModel) {
              case 'cpm':
              case 'cpv':
                price = pricing.cpm || pricing.cpv || 0;
                break;
              case 'monthly':
                price = pricing.monthly || pricing.flatRate || 0;
                break;
              case 'per_week':
                price = pricing.perWeek || pricing.flatRate || 0;
                break;
              case 'per_day':
                price = pricing.perDay || pricing.flatRate || 0;
                break;
              case 'flat':
              case 'flat_rate':
              default:
                price = pricing.flatRate || pricing.rate || pricing.monthly || 0;
                break;
            }
            
            const audience = dc.website.metrics?.monthlyVisitors || 0;
            if (price > 0 && audience > 0) {
              const unitPrice = (price / audience) * 1000;
              items.push({
                publicationId: pubId,
                publicationName: pubName,
                itemName: ad.name || ad.title || 'Website Ad',
                channel: 'website',
                pricingModel: pricingModel,
                price,
                audience,
                unitPrice,
                assessment: assessPricing('website', pricingModel, unitPrice)
              });
            }
          }
        });
      }

      // Newsletter
      if (dc.newsletters) {
        dc.newsletters.forEach((newsletter: any) => {
          const audience = newsletter.subscribers || 0;
          newsletter.advertisingOpportunities?.forEach((ad: any) => {
            const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
            if (hubPricing?.pricing) {
              const pricing = Array.isArray(hubPricing.pricing) ? hubPricing.pricing[0] : hubPricing.pricing;
              const rawPricingModel = pricing.pricingModel || 'per_send';
              const pricingModel = rawPricingModel === 'unknown' || !rawPricingModel ? 'per_send' : rawPricingModel;
              
              // Extract price based on pricing model
              let price = 0;
              switch (pricingModel) {
                case 'per_send':
                  price = pricing.perSend || pricing.flatRate || 0;
                  break;
                case 'monthly':
                  price = pricing.monthly || pricing.flatRate || 0;
                  break;
                case 'flat':
                case 'flat_rate':
                  price = pricing.flatRate || pricing.rate || 0;
                  break;
                default:
                  price = pricing.flatRate || pricing.rate || 0;
                  break;
              }
              
              if (price > 0 && audience > 0) {
                const unitPrice = (price / audience) * 1000;
                items.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  itemName: ad.name || newsletter.name || 'Newsletter Ad',
                  channel: 'newsletter',
                  pricingModel: pricingModel,
                  price,
                  audience,
                  unitPrice,
                  assessment: assessPricing('newsletter', pricingModel, unitPrice)
                });
              }
            }
          });
        });
      }

      // Print
      if (dc.print) {
        const printPubs = Array.isArray(dc.print) ? dc.print : [dc.print];
        printPubs.forEach((printPub: any) => {
          const audience = printPub.circulation || 0;
          printPub.advertisingOpportunities?.forEach((ad: any) => {
            const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
            if (hubPricing?.pricing) {
              const pricing = Array.isArray(hubPricing.pricing) ? hubPricing.pricing[0] : hubPricing.pricing;
              const rawPricingModel = pricing.pricingModel || 'per_ad';
              const pricingModel = rawPricingModel === 'unknown' || !rawPricingModel ? 'per_ad' : rawPricingModel;
              const price = pricing.flatRate || pricing.rate || 0;
              if (price > 0 && audience > 0) {
                const unitPrice = (price / audience) * 1000;
                items.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  itemName: ad.name || 'Print Ad',
                  channel: 'print',
                  pricingModel: pricingModel,
                  price,
                  audience,
                  unitPrice,
                  assessment: assessPricing('print', pricingModel, unitPrice)
                });
              }
            }
          });
        });
      }

      // Podcast
      if (dc.podcasts) {
        dc.podcasts.forEach((podcast: any) => {
          const audience = podcast.averageListeners || podcast.listeners || 0;
          podcast.advertisingOpportunities?.forEach((ad: any) => {
            const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
            if (hubPricing?.pricing) {
              const pricing = Array.isArray(hubPricing.pricing) ? hubPricing.pricing[0] : hubPricing.pricing;
              const rawPricingModel = pricing.pricingModel || 'per_episode';
              const pricingModel = rawPricingModel === 'unknown' || !rawPricingModel ? 'per_episode' : rawPricingModel;
              const price = pricing.perEpisode || pricing.perSpot || pricing.flatRate || 0;
              if (price > 0 && audience > 0) {
                const unitPrice = (price / audience) * 1000;
                items.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  itemName: ad.name || podcast.name || 'Podcast Ad',
                  channel: 'podcast',
                  pricingModel: pricingModel,
                  price,
                  audience,
                  unitPrice,
                  assessment: assessPricing('podcast', pricingModel, unitPrice)
                });
              }
            }
          });
        });
      }

      // Radio
      if (dc.radioStations) {
        dc.radioStations.forEach((station: any) => {
          const audience = station.listeners || 0;
          station.advertisingOpportunities?.forEach((ad: any) => {
            const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
            if (hubPricing?.pricing) {
              const pricing = Array.isArray(hubPricing.pricing) ? hubPricing.pricing[0] : hubPricing.pricing;
              const rawPricingModel = pricing.pricingModel || 'per_spot';
              const pricingModel = rawPricingModel === 'unknown' || !rawPricingModel ? 'per_spot' : rawPricingModel;
              const price = pricing.perSpot || pricing.flatRate || 0;
              if (price > 0 && audience > 0) {
                const unitPrice = (price / audience) * 1000;
                items.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  itemName: ad.name || station.callSign || 'Radio Ad',
                  channel: 'radio',
                  pricingModel: pricingModel,
                  price,
                  audience,
                  unitPrice,
                  assessment: assessPricing('radio', pricingModel, unitPrice)
                });
              }
            }
          });
        });
      }
    });

    return items;
  }, [publications]);

  // Get channel data
  const channelData = useMemo(() => {
    if (!pricingAnalytics) return null;
    return pricingAnalytics[activeChannel as keyof PricingAnalytics] as ChannelPricingAnalytics;
  }, [pricingAnalytics, activeChannel]);

  // Sort pricing models by sample size (descending)
  const sortedModels = useMemo(() => {
    if (!channelData) return [];
    return Object.entries(channelData).sort((a, b) => b[1].sampleSize - a[1].sampleSize);
  }, [channelData]);

  // Calculate channel summary stats based on unit prices
  const channelSummary = useMemo(() => {
    if (!channelData || sortedModels.length === 0) return null;
    
    let totalSamples = 0;
    let allUnitPrices: number[] = [];
    let totalAudience = 0;
    let audienceCount = 0;
    
    sortedModels.forEach(([_, data]) => {
      totalSamples += data.sampleSize;
      // Collect unit prices for overall stats
      if (data.unitPrice.count > 0) {
        allUnitPrices.push(data.unitPrice.avg);
      }
      // Aggregate total audience
      if (data.audienceSize.count > 0) {
        totalAudience += data.audienceSize.avg * data.sampleSize;
        audienceCount += data.sampleSize;
      }
    });
    
    if (allUnitPrices.length === 0) {
      return {
        totalSamples,
        models: sortedModels.length,
        avgUnitPrice: 0,
        minUnitPrice: 0,
        maxUnitPrice: 0,
        avgAudience: audienceCount > 0 ? totalAudience / audienceCount : 0,
        totalPotentialReach: totalAudience
      };
    }
    
    const avgUnitPrice = allUnitPrices.reduce((sum, p) => sum + p, 0) / allUnitPrices.length;
    const minUnitPrice = Math.min(...sortedModels.filter(([_, d]) => d.unitPrice.count > 0).map(([_, d]) => d.unitPrice.min));
    const maxUnitPrice = Math.max(...sortedModels.filter(([_, d]) => d.unitPrice.count > 0).map(([_, d]) => d.unitPrice.max));
    
    return {
      totalSamples,
      models: sortedModels.length,
      avgUnitPrice,
      minUnitPrice,
      maxUnitPrice,
      avgAudience: audienceCount > 0 ? totalAudience / audienceCount : 0,
      totalPotentialReach: totalAudience
    };
  }, [channelData, sortedModels]);

  // Calculate total audience across all channels
  const totalAudienceAcrossChannels = useMemo(() => {
    if (!pricingAnalytics) return null;
    
    const channelTotals: Record<string, { audience: number; inventory: number }> = {};
    let grandTotal = 0;
    let grandInventory = 0;
    
    CHANNELS.forEach(({ key }) => {
      const data = pricingAnalytics[key as keyof PricingAnalytics] as ChannelPricingAnalytics;
      if (!data) return;
      
      let channelAudience = 0;
      let channelInventory = 0;
      
      Object.values(data).forEach(modelData => {
        if (modelData.audienceSize.count > 0) {
          channelAudience += modelData.audienceSize.avg * modelData.sampleSize;
          channelInventory += modelData.sampleSize;
        }
      });
      
      if (channelInventory > 0) {
        channelTotals[key] = {
          audience: channelAudience,
          inventory: channelInventory
        };
        grandTotal += channelAudience;
        grandInventory += channelInventory;
      }
    });
    
    return {
      byChannel: channelTotals,
      grandTotal,
      grandInventory
    };
  }, [pricingAnalytics]);

  // Calculate overall pricing health and identify issues
  const pricingHealth = useMemo(() => {
    if (!pricingAnalytics) return null;

    const allItems: Array<{ channel: string; pricingModel: string; unitPrice: number; data: any }> = [];
    
    CHANNELS.forEach(({ key }) => {
      const data = pricingAnalytics[key as keyof PricingAnalytics] as ChannelPricingAnalytics;
      if (!data) return;
      
      Object.entries(data).forEach(([model, modelData]) => {
        if (modelData.unitPrice.count > 0) {
          allItems.push({
            channel: key,
            pricingModel: model,
            unitPrice: modelData.unitPrice.avg,
            data: modelData
          });
        }
      });
    });

    if (allItems.length === 0) return null;

    const health = calculatePricingHealth(allItems);
    
    // Find outliers (critical and review status)
    const outliers = allItems
      .map(item => ({
        ...item,
        assessment: assessPricing(item.channel, item.pricingModel, item.unitPrice)
      }))
      .filter(item => item.assessment.status === 'critical' || item.assessment.status === 'review')
      .sort((a, b) => b.assessment.multiplier - a.assessment.multiplier)
      .slice(0, 10);

    // Find package-ready items (excellent and good status)
    const packageReady = allItems
      .map(item => ({
        ...item,
        assessment: assessPricing(item.channel, item.pricingModel, item.unitPrice)
      }))
      .filter(item => item.assessment.status === 'excellent' || item.assessment.status === 'good')
      .sort((a, b) => a.unitPrice - b.unitPrice)
      .slice(0, 10);

    return {
      health,
      outliers,
      packageReady,
      totalItems: allItems.length
    };
  }, [pricingAnalytics]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Analytics</CardTitle>
          <CardDescription>Loading statistical analysis...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pricingAnalytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Analytics</CardTitle>
          <CardDescription>No pricing data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pricing analytics data found for this hub.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pricing Analytics by Channel
          </CardTitle>
          <CardDescription>
            Unit economics analysis showing cost per 1000 audience reach for each pricing model.
            Compare pricing models fairly by normalizing to audience size (CPM, per 1K subscribers, per 1K circulation, etc.).
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pricing Health Score Card */}
      {pricingHealth && (
        <Card className={`border-2 ${
          pricingHealth.health.score >= 80 ? 'border-green-300 bg-green-50/50' :
          pricingHealth.health.score >= 60 ? 'border-yellow-300 bg-yellow-50/50' :
          'border-red-300 bg-red-50/50'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  {pricingHealth.health.score >= 80 ? <CheckCircle className="h-7 w-7 text-green-600" /> :
                   pricingHealth.health.score >= 60 ? <AlertTriangle className="h-7 w-7 text-yellow-600" /> :
                   <AlertCircle className="h-7 w-7 text-red-600" />}
                  {pricingHealth.health.score >= 80 ? "Your Pricing Looks Good!" :
                   pricingHealth.health.score >= 60 ? "Your Pricing Needs Some Work" :
                   "Your Pricing Needs Attention"}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {pricingHealth.health.score >= 80 ? 
                    "Most of your inventory is priced competitively. You're ready to build great packages!" :
                   pricingHealth.health.score >= 60 ?
                    "Some items are overpriced compared to similar outlets. Review the alerts below to improve." :
                    "Many items are significantly overpriced. This makes it hard to sell packages. Fix the critical issues below."}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className={`text-6xl font-bold ${
                  pricingHealth.health.score >= 80 ? 'text-green-600' :
                  pricingHealth.health.score >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {pricingHealth.health.score}
                </div>
                <div className="text-sm text-muted-foreground mt-1">health score</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-white rounded-lg p-3 text-center border-2 border-green-300">
                <Star className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-600">{pricingHealth.health.breakdown.excellent}</div>
                <div className="text-xs text-muted-foreground font-medium">Great Value</div>
                <div className="text-[10px] text-green-700 mt-1">Use in packages</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                <ThumbsUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-500">{pricingHealth.health.breakdown.good}</div>
                <div className="text-xs text-muted-foreground font-medium">Good Price</div>
                <div className="text-[10px] text-green-600 mt-1">Ready to sell</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-yellow-200">
                <Info className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-yellow-600">{pricingHealth.health.breakdown.fair}</div>
                <div className="text-xs text-muted-foreground font-medium">Fair</div>
                <div className="text-[10px] text-yellow-700 mt-1">Could improve</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border-2 border-orange-300">
                <AlertTriangle className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-orange-600">{pricingHealth.health.breakdown.review}</div>
                <div className="text-xs text-muted-foreground font-medium">Too High</div>
                <div className="text-[10px] text-orange-700 mt-1">Needs review</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border-2 border-red-300">
                <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-600">{pricingHealth.health.breakdown.critical}</div>
                <div className="text-xs text-muted-foreground font-medium">Way Too High</div>
                <div className="text-[10px] text-red-700 mt-1">Fix immediately</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Alerts & Opportunities */}
      {detailedInventory.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Outliers - Items Needing Review */}
          {(() => {
            const outliers = detailedInventory
              .filter(item => item.assessment.status === 'critical' || item.assessment.status === 'review')
              .sort((a, b) => b.assessment.multiplier - a.assessment.multiplier)
              .slice(0, 5);
            
            if (outliers.length === 0) return null;

            // Get comparison items (well-priced items in same channel)
            const getComparisons = (channel: string) => {
              return detailedInventory
                .filter(item => item.channel === channel && (item.assessment.status === 'excellent' || item.assessment.status === 'good'))
                .sort((a, b) => a.unitPrice - b.unitPrice)
                .slice(0, 3);
            };

            return (
              <Card className="border-red-300 bg-red-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Pricing Problems
                    <Badge variant="destructive">{outliers.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-red-900">
                    These items are priced way above market rates - fix these to improve sales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {outliers.map((item, idx) => {
                    const suggested = getSuggestedPrice(item.channel, item.pricingModel, item.audience);
                    const comparisons = getComparisons(item.channel);
                    
                    return (
                      <div key={idx} className="border-2 border-red-300 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-base text-red-900 mb-1">
                              {item.publicationName}
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              {item.itemName} • <Badge variant="outline" className="capitalize">{item.channel}</Badge>
                            </div>
                          </div>
                          <span className="text-2xl">{item.assessment.icon}</span>
                        </div>

                        <div className="bg-red-50 rounded p-3 mb-3 space-y-2">
                          <div className="text-sm">
                            <span className="font-semibold text-red-900">The Problem:</span>
                            <div className="mt-1">Charging <strong>${item.price.toLocaleString()}/month</strong> to reach only <strong>{item.audience.toLocaleString()} people</strong></div>
                            <div className="text-red-700 font-medium mt-1">
                              That's ${item.unitPrice.toFixed(2)} per 1,000 people
                            </div>
                          </div>
                        </div>

                        {comparisons.length > 0 && (
                          <div className="bg-blue-50 rounded p-3 mb-3">
                            <div className="text-sm font-semibold text-blue-900 mb-2">What Similar Outlets Charge:</div>
                            <div className="space-y-1 text-sm">
                              {comparisons.map((comp, i) => (
                                <div key={i} className="text-blue-800">
                                  • {comp.publicationName} ({comp.audience.toLocaleString()} audience): <strong>${comp.unitPrice.toFixed(2)} per 1K</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-green-50 rounded p-3 mb-3">
                          <div className="text-sm">
                            <span className="font-semibold text-green-900">Your Options:</span>
                            <div className="mt-2 space-y-1">
                              {suggested && (
                                <>
                                  <div className="text-green-800">
                                    1. <strong>Lower price to ${suggested.low}-${suggested.target}/month</strong> (match market rate)
                                  </div>
                                  <div className="text-green-800">
                                    2. Grow audience to {Math.round(item.price / suggested.target * 1000).toLocaleString()}+ to justify current price
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            Contact Publisher
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* Package-Ready Inventory */}
          {(() => {
            const packageReady = detailedInventory
              .filter(item => item.assessment.status === 'excellent' || item.assessment.status === 'good')
              .sort((a, b) => a.unitPrice - b.unitPrice)
              .slice(0, 5);
            
            if (packageReady.length === 0) return null;

            return (
              <Card className="border-green-300 bg-green-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-600" />
                    Great Value Inventory
                    <Badge className="bg-green-600">{packageReady.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-green-900">
                    These are priced right - perfect for packages!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {packageReady.map((item, idx) => (
                    <div key={idx} className="border-2 border-green-300 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-base text-green-900 mb-1">
                            {item.publicationName}
                          </div>
                          <div className="text-sm text-gray-700 mb-2">
                            {item.itemName} • <Badge variant="outline" className="capitalize border-green-600 text-green-700">{item.channel}</Badge>
                          </div>
                        </div>
                        <span className="text-2xl">{item.assessment.icon}</span>
                      </div>

                      <div className="bg-green-50 rounded p-3 mb-3">
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-semibold text-green-900">Why This Works:</span>
                            <div className="mt-1 text-green-800">
                              <strong>${item.price.toLocaleString()}/month</strong> to reach <strong>{item.audience.toLocaleString()} people</strong>
                            </div>
                            <div className="text-green-700 font-medium mt-1">
                              Only ${item.unitPrice.toFixed(2)} per 1,000 people - {item.assessment.message.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded p-3 mb-3">
                        <div className="text-sm">
                          <span className="font-semibold text-blue-900">Package Potential:</span>
                          <div className="mt-1 space-y-1 text-blue-800">
                            <div>• Total Reach: {item.audience.toLocaleString()} {getAudienceMetricLabel(item.channel).toLowerCase()}</div>
                            <div>• Cost-effective pricing at ${item.unitPrice.toFixed(2)} per 1K</div>
                            <div>• Ready to add to any package</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                          Add to Package
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Total Audience Reach Across All Channels */}
      {totalAudienceAcrossChannels && totalAudienceAcrossChannels.grandTotal > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Audience Reach</CardTitle>
            <CardDescription>Combined potential audience across all inventory channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Combined Audience</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatAudience(totalAudienceAcrossChannels.grandTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {totalAudienceAcrossChannels.grandInventory} inventory items
                </p>
              </div>
              
              {Object.entries(totalAudienceAcrossChannels.byChannel)
                .sort(([, a], [, b]) => b.audience - a.audience)
                .slice(0, 3)
                .map(([channel, data]) => {
                  const channelConfig = CHANNELS.find(c => c.key === channel);
                  const Icon = channelConfig?.icon || Info;
                  return (
                    <div key={channel} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground capitalize">{channel}</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatAudience(data.audience)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getAudienceMetricLabel(channel)} • {data.inventory} items
                      </p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Summary (if data available) */}
      {channelSummary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = CHANNEL_COLORS[activeChannel]?.icon || Info;
                  return <Icon className="h-6 w-6" />;
                })()}
                <span className="text-xl font-bold capitalize">{activeChannel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {channelSummary.totalSamples} items • {channelSummary.models} model{channelSummary.models !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                Total Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {formatAudience(channelSummary.totalPotentialReach)}
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {getAudienceMetricLabel(activeChannel)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Audience Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAudience(channelSummary.avgAudience)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per inventory item
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Avg Normalized Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{formatCPR(channelSummary.avgUnitPrice)}</div>
              <p className="text-xs text-green-700 mt-1">{getNormalizedUnitLabel(activeChannel)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Price Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCPR(channelSummary.minUnitPrice)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                to {formatCPR(channelSummary.maxUnitPrice)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeChannel} onValueChange={setActiveChannel}>
            <TabsList className="grid w-full grid-cols-6">
              {CHANNELS.map(channel => {
                const Icon = channel.icon;
                const hasData = pricingAnalytics[channel.key as keyof PricingAnalytics] && 
                  Object.keys(pricingAnalytics[channel.key as keyof PricingAnalytics]).length > 0;
                
                return (
                  <TabsTrigger 
                    key={channel.key} 
                    value={channel.key}
                    disabled={!hasData}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{channel.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CHANNELS.map(channel => (
              <TabsContent key={channel.key} value={channel.key} className="mt-6">
                {sortedModels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pricing data available for {channel.label} channel.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pricing Models Table */}
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pricing Model</TableHead>
                            <TableHead className="text-center">Sample Size</TableHead>
                            <TableHead className="text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                    Audience Size
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Average {getAudienceMetricLabel(activeChannel).toLowerCase()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    <span className="font-semibold text-green-700">Normalized Price (avg)</span>
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p className="font-semibold">{getNormalizedUnitLabel(activeChannel)}</p>
                                      <p className="text-xs">Average cost per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()}</p>
                                      <p className="text-xs italic">Key metric for fair pricing comparison</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Median
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Median normalized price</p>
                                    <p className="text-xs">(middle value, less affected by outliers)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Std Dev
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Price consistency indicator</p>
                                    <p className="text-xs text-green-400">Green = consistent pricing</p>
                                    <p className="text-xs text-yellow-400">Yellow = moderate variance</p>
                                    <p className="text-xs text-red-400">Red = high variance</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Min
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Lowest normalized price</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Max
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Highest normalized price</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                    Total (avg)
                                    <Info className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Average total monthly price (for reference)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedModels.map(([model, data]) => {
                            const assessment = data.unitPrice.count > 0 
                              ? assessPricing(activeChannel, model, data.unitPrice.avg)
                              : null;
                            
                            return (
                            <TableRow key={model} className={
                              assessment?.status === 'critical' ? 'bg-red-50/50' :
                              assessment?.status === 'review' ? 'bg-orange-50/50' :
                              assessment?.status === 'excellent' ? 'bg-green-50/50' :
                              ''
                            }>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {assessment && <span className="text-lg">{assessment.icon}</span>}
                                  <span>{PRICING_MODEL_LABELS[model] || model}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {data.sampleSize}
                              </TableCell>
                              <TableCell className="text-center">
                                {data.audienceSize.count > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="text-sm">
                                          <div className="font-medium">{formatAudience(data.audienceSize.avg)}</div>
                                          <div className="text-[10px] text-muted-foreground">{getAudienceMetricLabel(activeChannel)}</div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1 text-xs">
                                          <p className="font-semibold">{getAudienceMetricLabel(activeChannel)} Stats:</p>
                                          <p>Average: {formatAudience(data.audienceSize.avg)}</p>
                                          <p>Median: {formatAudience(data.audienceSize.median)}</p>
                                          <p>Min: {formatAudience(data.audienceSize.min)}</p>
                                          <p>Max: {formatAudience(data.audienceSize.max)}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">
                                    {data.isAlreadyNormalized ? 'N/A' : 'No data'}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.unitPrice.count > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                          <div className={`font-bold text-base ${assessment?.color || 'text-green-700'}`}>
                                            {formatCPR(data.unitPrice.avg)}
                                          </div>
                                          <div className={`text-[10px] font-medium ${
                                            assessment?.status === 'critical' ? 'text-red-600' :
                                            assessment?.status === 'review' ? 'text-orange-600' :
                                            assessment?.status === 'excellent' ? 'text-green-700' :
                                            'text-green-600'
                                          }`}>
                                            {getNormalizedUnitLabel(activeChannel)}
                                          </div>
                                          {assessment && (
                                            <Badge 
                                              variant="outline" 
                                              className={`mt-1 text-[9px] h-4 ${
                                                assessment.status === 'critical' ? 'border-red-400 text-red-700 bg-red-50' :
                                                assessment.status === 'review' ? 'border-orange-400 text-orange-700 bg-orange-50' :
                                                assessment.status === 'fair' ? 'border-yellow-400 text-yellow-700 bg-yellow-50' :
                                                assessment.status === 'excellent' ? 'border-green-400 text-green-700 bg-green-50' :
                                                'border-green-300 text-green-600 bg-green-50'
                                              }`}
                                            >
                                              {assessment.status === 'excellent' ? 'Best Value' :
                                               assessment.status === 'good' ? 'Good' :
                                               assessment.status === 'fair' ? 'Fair' :
                                               assessment.status === 'review' ? 'Review' :
                                               'Critical'}
                                            </Badge>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      {assessment && (
                                        <TooltipContent className="max-w-xs">
                                          <div className="space-y-2">
                                            <p className="font-semibold">{assessment.message}</p>
                                            <div className="text-xs space-y-1">
                                              <p>Multiplier: <strong>{assessment.multiplier.toFixed(1)}x</strong> benchmark</p>
                                              {(() => {
                                                const suggested = getSuggestedPrice(activeChannel, model, data.audienceSize.avg);
                                                return suggested ? (
                                                  <div className="pt-1 border-t">
                                                    <p className="text-green-400">Suggested range:</p>
                                                    <p className="font-semibold">${suggested.low}-${suggested.high}/month</p>
                                                    <p className="text-[10px]">Target: ${suggested.target}/month</p>
                                                  </div>
                                                ) : null;
                                              })()}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.unitPrice.count > 0 ? (
                                  formatCPR(data.unitPrice.median)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.unitPrice.count > 0 ? (
                                  <span className={getVarianceColor(data.unitPrice.stdDev, data.unitPrice.avg)}>
                                    {formatCPR(data.unitPrice.stdDev)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {data.unitPrice.count > 0 ? formatCPR(data.unitPrice.min) : '—'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {data.unitPrice.count > 0 ? formatCPR(data.unitPrice.max) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.totalPrice.count > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-sm text-muted-foreground">
                                          {formatCurrency(data.totalPrice.avg)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1 text-xs">
                                          <p className="font-semibold">Total Monthly Price:</p>
                                          <p>Average: {formatCurrency(data.totalPrice.avg)}</p>
                                          <p>Median: {formatCurrency(data.totalPrice.median)}</p>
                                          <p>Min: {formatCurrency(data.totalPrice.min)}</p>
                                          <p>Max: {formatCurrency(data.totalPrice.max)}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Legend */}
                    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="text-xs space-y-3">
                          <div>
                            <p className="font-semibold text-base mb-2 text-green-900">📊 Understanding Normalized Pricing ({getNormalizedUnitLabel(activeChannel)})</p>
                            <p className="text-muted-foreground mb-3">
                              All prices are normalized to cost per 1000 audience (similar to CPM in digital advertising) 
                              to enable fair "apples-to-apples" comparisons across different pricing models and inventory sizes.
                            </p>
                          </div>
                          
                          <div className="bg-white/80 rounded-lg p-3 space-y-2">
                            <p className="font-semibold text-green-800">Key Metrics Explained:</p>
                            <ul className="space-y-1.5 ml-4">
                              <li><strong>Normalized Price:</strong> Cost per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()} ({getNormalizedUnitLabel(activeChannel)}) - THE key metric for fair comparison</li>
                              <li><strong>Audience Size:</strong> Total {getAudienceMetricLabel(activeChannel).toLowerCase()} available for each pricing model</li>
                              <li><strong>Statistical Analysis:</strong>
                                <ul className="ml-4 mt-1 space-y-0.5">
                                  <li>• <strong>Average:</strong> Mean normalized price across all items in this model</li>
                                  <li>• <strong>Median:</strong> Middle value - more reliable when outliers exist</li>
                                  <li>• <strong>Std Dev:</strong> Consistency indicator (<span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span> <span className="text-green-600">consistent</span>, <span className="inline-block w-2 h-2 bg-yellow-600 rounded-full"></span> <span className="text-yellow-600">moderate</span>, <span className="inline-block w-2 h-2 bg-red-600 rounded-full"></span> <span className="text-red-600">high variance</span>)</li>
                                  <li>• <strong>Min/Max:</strong> Range of normalized prices in this model</li>
                                </ul>
                              </li>
                              <li><strong>Total (avg):</strong> Actual average monthly price before normalization (for cost reference)</li>
                            </ul>
                          </div>
                          
                          <div className="bg-blue-50/80 rounded-lg p-3 border border-blue-200">
                            <p className="font-semibold text-blue-900 mb-1">💡 Real-World Example:</p>
                            <p className="text-muted-foreground">
                              Newsletter with 50K subscribers at $1,000/send = <strong>$20 per 1K subscribers</strong><br/>
                              Newsletter with 10K subscribers at $300/send = <strong>$30 per 1K subscribers</strong><br/>
                              → First option offers <strong>better unit economics</strong> (33% lower cost per subscriber reached)
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

