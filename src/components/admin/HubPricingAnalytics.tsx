import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PricingAnalytics, ChannelPricingAnalytics } from '@/hooks/useDashboardStats';
import { CHANNEL_COLORS } from '@/constants/channelColors';
import { Loader2, TrendingUp, AlertCircle, Info, Star, ThumbsUp, AlertTriangle, CheckCircle, ArrowUp, BarChart3, DollarSign } from 'lucide-react';
import { assessPricing, getSuggestedPrice } from '@/utils/pricingBenchmarks';
import { SectionActivityMenu } from '@/components/activity/SectionActivityMenu';
import { ActivityLogDialog } from '@/components/activity/ActivityLogDialog';
import { useHubContext } from '@/contexts/HubContext';

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
  const { selectedHubId } = useHubContext();
  const [activeChannel, setActiveChannel] = useState('website');
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [pricingFilter, setPricingFilter] = useState<'all' | 'way-too-high' | 'too-high' | 'fair'>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Extract detailed inventory items from publications
  const detailedInventory = useMemo(() => {
    // Helper to find hub pricing - filter by selectedHubId if available
    const findHubPricing = (ad: any) => {
      if (!ad.hubPricing) return null;
      if (selectedHubId) {
        // Filter by specific hub
        return ad.hubPricing.find((hp: any) => hp.hubId === selectedHubId && hp.available);
      }
      // Fallback: find any available
      return ad.hubPricing.find((hp: any) => hp.available);
    };

    const items: InventoryItem[] = [];
    
    publications.forEach(pub => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const pubId = pub.publicationId;
      const dc = pub.distributionChannels || {};

      // Website
      if (dc.website?.advertisingOpportunities) {
        dc.website.advertisingOpportunities.forEach((ad: any) => {
          const hubPricing = findHubPricing(ad);
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
            const hubPricing = findHubPricing(ad);
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
            const hubPricing = findHubPricing(ad);
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
            const hubPricing = findHubPricing(ad);
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
            const hubPricing = findHubPricing(ad);
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
  }, [publications, selectedHubId]);

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

  // Calculate overall pricing health based on detailed inventory
  const pricingHealth = useMemo(() => {
    if (detailedInventory.length === 0) return null;

    // Count items by status
    const breakdown = {
      excellent: detailedInventory.filter(item => item.assessment.status === 'excellent').length,
      good: detailedInventory.filter(item => item.assessment.status === 'good').length,
      fair: detailedInventory.filter(item => item.assessment.status === 'fair').length,
      review: detailedInventory.filter(item => item.assessment.status === 'review').length,
      critical: detailedInventory.filter(item => item.assessment.status === 'critical').length
    };

    // Calculate health score (0-100)
    const total = detailedInventory.length;
    const score = Math.round(
      ((breakdown.excellent * 1.0 + breakdown.good * 0.8 + breakdown.fair * 0.5 + breakdown.review * 0.2 + breakdown.critical * 0) / total) * 100
    );

    return {
      health: {
        score,
        breakdown
      },
      totalItems: total
    };
  }, [detailedInventory]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Pricing Analytics</CardTitle>
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
          <CardTitle className="font-sans">Pricing Analytics</CardTitle>
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold font-sans">
          Pricing Analytics
        </h1>
        <SectionActivityMenu onActivityLogClick={() => setShowActivityLog(true)} />
      </div>

      {/* Pricing Health Score Card */}
      {pricingHealth && (
        <Card className="border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-[18px] flex items-center gap-2 font-sans">
                  {pricingHealth.health.score >= 80 ? <CheckCircle className="h-6 w-6 text-green-600" /> :
                   pricingHealth.health.score >= 60 ? <AlertTriangle className="h-6 w-6 text-yellow-600" /> :
                   <AlertCircle className="h-6 w-6 text-red-600" />}
                  {pricingHealth.health.score >= 80 ? "Your Pricing Looks Good!" :
                   pricingHealth.health.score >= 60 ? "Your Pricing Needs Some Work" :
                   "Your Pricing Needs Attention"}
                </CardTitle>
                <CardDescription className="mt-2 text-[14px]">
                  {pricingHealth.health.score >= 80 ? 
                    "Most of your inventory is priced competitively. You're ready to build great packages!" :
                   pricingHealth.health.score >= 60 ?
                    "Some items are overpriced compared to similar outlets." :
                    "Many items are significantly overpriced. This makes it hard to sell packages."}
                </CardDescription>
              </div>
              <div className={`flex flex-col items-center justify-center px-8 py-4 rounded-lg border ${
                pricingHealth.health.score >= 80 ? 'border-green-600 bg-green-50' :
                pricingHealth.health.score >= 60 ? 'border-yellow-600 bg-yellow-50' :
                'border-red-600 bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`text-4xl font-bold font-sans ${
                    pricingHealth.health.score >= 80 ? 'text-green-600' :
                    pricingHealth.health.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {pricingHealth.health.score}
                  </div>
                  <div className={`text-sm font-sans ${
                    pricingHealth.health.score >= 80 ? 'text-green-600' :
                    pricingHealth.health.score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    health score
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2 text-left mb-2">
                  <Star className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold font-sans text-green-600">Great Value</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-sans text-gray-900">{pricingHealth.health.breakdown.excellent}</div>
                  <div className="text-xs text-muted-foreground font-sans">To use in packages</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2 text-left mb-2">
                  <ThumbsUp className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold font-sans text-green-500">Good Price</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-sans text-gray-900">{pricingHealth.health.breakdown.good}</div>
                  <div className="text-xs text-muted-foreground font-sans">Ready to sell</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2 text-left mb-2">
                  <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold font-sans text-yellow-600">Fair</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-sans text-gray-900">{pricingHealth.health.breakdown.fair}</div>
                  <div className="text-xs text-muted-foreground font-sans">Could improve</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2 text-left mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold font-sans text-orange-600">Too High</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-sans text-gray-900">{pricingHealth.health.breakdown.review}</div>
                  <div className="text-xs text-muted-foreground font-sans">Needs review</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2 text-left mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold font-sans text-red-600">Way Too High</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold font-sans text-gray-900">{pricingHealth.health.breakdown.critical}</div>
                  <div className="text-xs text-muted-foreground font-sans">To fix immediately</div>
                </div>
              </div>
            </div>
            
            {/* Dive Deeper Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setShowPricingModal(true)}
                variant="outline"
                className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dive Deeper
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Publications by Pricing Status */}
      {detailedInventory.length > 0 && (
        <>
          {/* Filter Buttons - Outside Card */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pricingFilter === 'all' 
                    ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                    : 'border border-transparent'
                }`}
                style={pricingFilter !== 'all' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
                onClick={() => setPricingFilter('all')}
              >
                All
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  pricingFilter === 'way-too-high' 
                    ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                    : 'border border-transparent'
                }`}
                style={pricingFilter !== 'way-too-high' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
                onClick={() => setPricingFilter('way-too-high')}
              >
                <AlertCircle className="h-4 w-4 text-red-600" />
                Way Too High ({detailedInventory.filter(item => item.assessment.status === 'critical').length})
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  pricingFilter === 'too-high' 
                    ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                    : 'border border-transparent'
                }`}
                style={pricingFilter !== 'too-high' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
                onClick={() => setPricingFilter('too-high')}
              >
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Too High ({detailedInventory.filter(item => item.assessment.status === 'review').length})
              </button>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  pricingFilter === 'fair' 
                    ? 'bg-orange-50 text-orange-600 border border-orange-600' 
                    : 'border border-transparent'
                }`}
                style={pricingFilter !== 'fair' ? { backgroundColor: '#EDEAE1', color: '#6C685D' } : {}}
                onClick={() => setPricingFilter('fair')}
              >
                <Info className="h-4 w-4 text-yellow-600" />
                Fair ({detailedInventory.filter(item => item.assessment.status === 'fair').length})
              </button>
            </div>
          </div>

          {/* Filtered Items Display - Outside Card */}
          {(() => {
            const getFilteredItems = () => {
              if (pricingFilter === 'all') {
                return detailedInventory.sort((a, b) => b.assessment.multiplier - a.assessment.multiplier);
              } else if (pricingFilter === 'way-too-high') {
                return detailedInventory
                  .filter(item => item.assessment.status === 'critical')
                  .sort((a, b) => b.assessment.multiplier - a.assessment.multiplier);
              } else if (pricingFilter === 'too-high') {
                return detailedInventory
                  .filter(item => item.assessment.status === 'review')
                  .sort((a, b) => b.assessment.multiplier - a.assessment.multiplier);
              } else {
                return detailedInventory
                  .filter(item => item.assessment.status === 'fair')
                  .sort((a, b) => a.unitPrice - b.unitPrice);
              }
            };

            const filteredItems = getFilteredItems();

            if (filteredItems.length === 0) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-green-600">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                      <p className="font-semibold">No Items in This Category!</p>
                      <p className="text-sm text-muted-foreground">All items are priced reasonably.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-3">
                {filteredItems.map((item, idx) => {
                  const suggested = getSuggestedPrice(item.channel, item.pricingModel, item.audience);
                  const textColor = item.assessment.status === 'critical' ? 'text-red-700' :
                                   item.assessment.status === 'review' ? 'text-orange-700' :
                                   'text-yellow-700';
                  const strongTextColor = item.assessment.status === 'critical' ? 'text-red-600' :
                                         item.assessment.status === 'review' ? 'text-orange-600' :
                                         'text-yellow-700';
                  const badgeBg = item.assessment.status === 'critical' ? 'bg-red-100 border-red-300' :
                                 item.assessment.status === 'review' ? 'bg-orange-100 border-orange-300' :
                                 'bg-yellow-100 border-yellow-300';
                  const badgeText = item.assessment.status === 'critical' ? 'text-red-700' :
                                   item.assessment.status === 'review' ? 'text-orange-700' :
                                   'text-yellow-700';
                  const IconComponent = item.assessment.status === 'critical' ? AlertCircle :
                                       item.assessment.status === 'review' ? AlertTriangle :
                                       Info;
                  const statusLabel = item.assessment.status === 'critical' ? 'Way Too High' :
                                     item.assessment.status === 'review' ? 'Too High' :
                                     'Fair';

                  return (
                    <Card key={idx} className="bg-white border-gray-200">
                      <CardContent className="pt-6">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-base text-gray-900">
                              {item.publicationName}
                            </div>
                            <div className="text-sm text-gray-700">
                              {item.itemName} • <span className="capitalize">{item.channel}</span> • {PRICING_MODEL_LABELS[item.pricingModel] || item.pricingModel}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium flex-shrink-0 ${badgeBg} ${badgeText}`}>
                            <IconComponent className="h-3.5 w-3.5" />
                            {statusLabel}
                          </div>
                        </div>
                        
                        {/* 2-Column Layout */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Column 1: Currently Charging (Containerized) */}
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <div className="text-xs text-gray-600 mb-2 font-medium">Currently Charging</div>
                            <div className="text-sm space-y-1">
                              <div className="text-gray-700">
                                ${item.price.toLocaleString()}/month to reach {item.audience.toLocaleString()} people
                              </div>
                              <div className="font-semibold text-gray-900">
                                ${item.unitPrice.toFixed(2)} per 1K • <span className={strongTextColor}>{item.assessment.multiplier.toFixed(1)}x{item.assessment.status === 'fair' ? '' : ' over'} benchmark</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Column 2: Suggested (Containerized) */}
                          {suggested && (
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                              <div className="text-xs text-gray-600 mb-2 font-medium">
                                {item.assessment.status === 'fair' ? 'Optimal' : 'Suggested'}
                              </div>
                              <div className="text-sm">
                                <div className="font-semibold text-green-700">
                                  ${suggested.low}-${suggested.high}/month
                                </div>
                                <div className="text-gray-700 mt-1">
                                  (${suggested.target} target)
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* No Inventory Message */}
      {detailedInventory.length === 0 && publications.length > 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Hub Pricing Configured</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {publications.length} publication{publications.length !== 1 ? 's' : ''} found, but no inventory has pricing enabled for this hub.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-foreground mb-2">To configure pricing:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to the <span className="font-medium">Inventory Manager</span></li>
                  <li>Select a publication to edit</li>
                  <li>Enable hub pricing on each ad unit you want to offer</li>
                  <li>Set the price and mark as available</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Analytics Modal */}
      <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold font-sans flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Pricing Analytics
            </DialogTitle>
          </DialogHeader>
          
          {/* Channel Tabs in Modal */}
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
              <TabsContent key={channel.key} value={channel.key} className="mt-4">
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
                                <span>{PRICING_MODEL_LABELS[model] || model}</span>
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

                    {/* Legend - Accordion */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="pricing-explanation" className="border rounded-lg bg-white">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <span className="font-semibold text-sm text-gray-900 font-sans">
                            Understanding Normalized Pricing ({getNormalizedUnitLabel(activeChannel)})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="text-xs space-y-4 font-sans text-gray-700">
                            <div>
                              <p className="mb-3">
                                All prices are normalized to cost per 1000 audience (similar to CPM in digital advertising) 
                                to enable fair "apples-to-apples" comparisons across different pricing models and inventory sizes.
                              </p>
                            </div>
                            
                            <div>
                              <p className="font-semibold text-gray-900 mb-2">Key Metrics Explained:</p>
                              <ul className="space-y-1.5 ml-4">
                                <li><strong>Normalized Price:</strong> Cost per 1000 {getAudienceMetricLabel(activeChannel).toLowerCase()} ({getNormalizedUnitLabel(activeChannel)}) - THE key metric for fair comparison</li>
                                <li><strong>Audience Size:</strong> Total {getAudienceMetricLabel(activeChannel).toLowerCase()} available for each pricing model</li>
                                <li><strong>Statistical Analysis:</strong>
                                  <ul className="ml-4 mt-1 space-y-0.5">
                                    <li>• <strong>Average:</strong> Mean normalized price across all items in this model</li>
                                    <li>• <strong>Median:</strong> Middle value - more reliable when outliers exist</li>
                                    <li>• <strong>Std Dev:</strong> Consistency indicator (low = consistent, medium = moderate, high = high variance)</li>
                                    <li>• <strong>Min/Max:</strong> Range of normalized prices in this model</li>
                                  </ul>
                                </li>
                                <li><strong>Total (avg):</strong> Actual average monthly price before normalization (for cost reference)</li>
                              </ul>
                            </div>
                            
                            <div>
                              <p className="font-semibold text-gray-900 mb-2">Real-World Example:</p>
                              <p>
                                Newsletter with 50K subscribers at $1,000/send = <strong>$20 per 1K subscribers</strong><br/>
                                Newsletter with 10K subscribers at $300/send = <strong>$30 per 1K subscribers</strong><br/>
                                → First option offers <strong>better unit economics</strong> (33% lower cost per subscriber reached)
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <ActivityLogDialog
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        sectionName="Pricing"
        activityTypes={['publication_update']}
        hubId={selectedHubId}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-24 z-50 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

