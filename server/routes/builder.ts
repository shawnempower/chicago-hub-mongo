import { Router, Request, Response } from 'express';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';
import { hubPackagesService } from '../../src/integrations/mongodb/hubPackageService';
import { authenticateToken } from '../middleware/authenticate';
import { inferOccurrencesFromFrequency } from '../../src/utils/pricingCalculations';

const router = Router();

/**
 * Calculate package reach across all publications
 * Uses publication-level deduplication and overlap adjustments
 */
function calculatePackageReach(publications: any[]): any {
  const DEFAULT_OVERLAP = 0.70; // 30% overlap assumption
  const SINGLE_PUB_OVERLAP = 0.60; // 40% overlap for single pub multi-channel
  
  // Track reach per publication
  const publicationReach = new Map<number, {
    impressions: number;
    audience: number;
    channels: Set<string>;
  }>();
  
  // Track total exposures (frequency-adjusted)
  let totalExposures = 0;
  
  // Helper to extract audience from item
  const getItemAudience = (item: any): number | undefined => {
    if (item.performanceMetrics?.audienceSize) {
      return item.performanceMetrics.audienceSize;
    }
    
    const metrics = item.audienceMetrics;
    if (!metrics) return undefined;
    
    switch (item.channel) {
      case 'website': return metrics.monthlyVisitors;
      case 'print': return metrics.circulation;
      case 'newsletter':
      case 'email': return metrics.subscribers;
      case 'social': return metrics.followers;
      case 'podcast':
      case 'radio': return metrics.listeners;
      case 'events': return metrics.averageAttendance || metrics.expectedAttendees;
      default: return undefined;
    }
  };
  
  // Helper to extract impressions from item
  const getItemImpressions = (item: any): number | undefined => {
    if (item.performanceMetrics?.impressionsPerMonth) {
      return item.performanceMetrics.impressionsPerMonth;
    }
    if (item.channel === 'website' && item.audienceMetrics?.monthlyPageViews) {
      return item.audienceMetrics.monthlyPageViews;
    }
    if (item.monthlyImpressions) {
      return item.monthlyImpressions;
    }
    return undefined;
  };
  
  // Process each publication
  publications.forEach(pub => {
    let pubImpressions = 0;
    let pubMaxAudience = 0;
    const pubChannels = new Set<string>();
    
    pub.inventoryItems
      ?.filter((item: any) => !item.isExcluded)
      .forEach((item: any) => {
        pubChannels.add(item.channel);
        const frequency = item.currentFrequency || item.quantity || 1;
        
        const itemImpressions = getItemImpressions(item);
        if (itemImpressions) pubImpressions += itemImpressions;
        
        const itemAudience = getItemAudience(item);
        if (itemAudience) pubMaxAudience = Math.max(pubMaxAudience, itemAudience);
        
        // Calculate exposures (audience × frequency)
        if (itemImpressions) {
          totalExposures += itemImpressions; // Impressions already account for volume
        } else if (itemAudience) {
          // Multiply base audience by frequency for total exposures
          totalExposures += itemAudience * frequency;
        }
      });
    
    publicationReach.set(pub.publicationId, {
      impressions: pubImpressions,
      audience: pubMaxAudience,
      channels: pubChannels
    });
  });
  
  // Aggregate across publications
  let totalImpressions = 0;
  const channelAudiences: any = {};
  const allChannels = new Set<string>();
  
  publicationReach.forEach(pubData => {
    totalImpressions += pubData.impressions;
    pubData.channels.forEach(ch => allChannels.add(ch));
  });
  
  // Calculate channel-specific audiences
  const channelMap = new Map<string, number[]>();
  
  publications.forEach(pub => {
    const channelMaxForPub = new Map<string, number>();
    
    pub.inventoryItems
      ?.filter((item: any) => !item.isExcluded)
      .forEach((item: any) => {
        const audience = getItemAudience(item);
        if (audience) {
          const currentMax = channelMaxForPub.get(item.channel) || 0;
          channelMaxForPub.set(item.channel, Math.max(currentMax, audience));
        }
      });
    
    channelMaxForPub.forEach((audience, channel) => {
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(audience);
    });
  });
  
  // Sum audiences by channel
  let totalAudience = 0;
  channelMap.forEach((audiences, channel) => {
    const channelTotal = audiences.reduce((sum, aud) => sum + aud, 0);
    channelAudiences[channel] = channelTotal;
    totalAudience += channelTotal;
  });
  
  // Determine overlap factor
  const pubCount = publications.length;
  const channelCount = allChannels.size;
  const overlapFactor = (pubCount === 1 && channelCount > 1) 
    ? SINGLE_PUB_OVERLAP 
    : DEFAULT_OVERLAP;
  
  // Apply overlap adjustment
  const estimatedUniqueReach = Math.round(totalAudience * overlapFactor);
  
  // Determine calculation method
  let calculationMethod = 'audience';
  if (totalImpressions > 0 && totalAudience > 0) {
    calculationMethod = 'mixed';
  } else if (totalImpressions > 0) {
    calculationMethod = 'impressions';
  }
  
  return {
    totalMonthlyImpressions: totalImpressions > 0 ? totalImpressions : undefined,
    totalMonthlyExposures: totalExposures > 0 ? totalExposures : undefined,
    channelAudiences: Object.keys(channelAudiences).length > 0 ? channelAudiences : undefined,
    estimatedTotalReach: totalAudience,
    estimatedUniqueReach,
    calculationMethod,
    overlapFactor
  };
}

/**
 * Package Builder API Endpoints
 * 
 * These endpoints support the new Package Builder feature that allows
 * admins to build packages in two modes:
 * 1. Budget-First: Start with budget, find inventory that fits
 * 2. Specification-First: Select specific publications, calculate cost
 */

// Analyze inventory for package building (budget-first or specification-first)
router.post('/analyze', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      hubId, 
      mode, 
      budget, 
      duration, 
      geography, 
      channels, 
      publications: publicationIds, 
      frequencyStrategy 
    } = req.body;

    if (!hubId || !mode || !duration || !channels) {
      return res.status(400).json({ 
        error: 'Missing required fields: hubId, mode, duration, channels' 
      });
    }

    // Get publications from database
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const allPublications = await publicationsCollection.find({
      hubIds: hubId
    }).toArray();

    // Apply geography filters if specified
    let publications = allPublications;
    if (geography && geography.length > 0) {
      publications = allPublications.filter((pub: any) => {
        const pubNeighborhoods = pub.location?.neighborhoods || [];
        const pubCoverage = pub.location?.coverage?.toLowerCase() || '';
        
        return geography.some((geo: string) => {
          const geoLower = geo.toLowerCase();
          return pubNeighborhoods.some((n: string) => n.toLowerCase().includes(geoLower)) ||
                 pubCoverage.includes(geoLower);
        });
      });
    }

    // Apply publication filter for specification-first mode
    if (mode === 'specification-first' && publicationIds && publicationIds.length > 0) {
      publications = publications.filter((pub: any) => 
        publicationIds.includes(pub.publicationId)
      );
    }

    // Helper function to detect publication frequency type
    const detectFrequencyType = (printFrequency?: string): string => {
      if (!printFrequency) return 'custom';
      const freq = printFrequency.toLowerCase();
      if (freq.includes('daily')) return 'daily';
      if (freq.includes('weekly') && !freq.includes('bi')) return 'weekly';
      if (freq.includes('bi-weekly') || freq.includes('biweekly')) return 'bi-weekly';
      if (freq.includes('monthly')) return 'monthly';
      return 'custom';
    };

    // Helper function to get standard frequency
    const getStandardFrequency = (pubType: string): number => {
      switch (pubType) {
        case 'daily': return 12;
        case 'weekly': return 4;
        case 'bi-weekly': return 2;
        case 'monthly': return 1;
        default: return 12;
      }
    };

    // Helper to apply frequency strategy
    const applyStrategy = (standardFreq: number, pubType: string, strategy: string): number => {
      if (strategy === 'standard') return standardFreq;
      if (strategy === 'minimum') return 1;
      if (strategy === 'reduced') {
        const half = Math.max(1, Math.floor(standardFreq / 2));
        return Math.min(half, pubType === 'monthly' ? 1 : pubType === 'bi-weekly' ? 1 : half);
      }
      return standardFreq;
    };

    // Extract inventory from publications
    const resultPublications: any[] = [];
    let totalCost = 0;

    for (const pub of publications) {
      const pubType = detectFrequencyType(pub.printFrequency);
      const standardFreq = getStandardFrequency(pubType);
      const inventoryItems: any[] = [];

      // Helper to select best pricing tier (lowest monthly cost)
      const selectBestPricingTier = (pricingData: any): any => {
        if (!pricingData) return null;
        
        if (Array.isArray(pricingData)) {
          if (pricingData.length === 0) return null;
          
          // Sort by monthly cost (normalize all pricing models to monthly)
          const sorted = [...pricingData].sort((a, b) => {
            const getMonthlyCost = (tier: any): number => {
              const model = tier.pricingModel || 'flat';
              const price = tier.flatRate || tier.rate || tier.perSend || tier.perSpot || tier.monthly || tier.perWeek || tier.perDay || 0;
              
              // Normalize to monthly cost based on pricing model
              switch (model) {
                case 'per_week':
                  return price * 4; // 4 weeks per month
                case 'per_day':
                  return price * 30; // 30 days per month
                case 'flat':
                case 'monthly':
                  return price; // Already monthly
                case 'cpm':
                case 'cpv':
                case 'cpc':
                  // For impression-based, can't normalize without impressions - use raw price
                  return price;
                default:
                  return price;
              }
            };
            
            return getMonthlyCost(a) - getMonthlyCost(b);
          });
          return sorted[0];
        }
        
        return pricingData;
      };

      // Helper to calculate item cost based on pricing model
      const calculateItemCost = (item: any): number => {
        const hubPrice = item.itemPricing.hubPrice;
        const frequency = item.currentFrequency || 1;
        const pricingModel = item.itemPricing.pricingModel;
        
        // For impression-based pricing, frequency represents percentage (default 100)
        if (pricingModel === 'cpm' && item.monthlyImpressions) {
          const impressionPercent = frequency / 100;
          return (hubPrice * item.monthlyImpressions * impressionPercent) / 1000;
        }
        if (pricingModel === 'cpv' && item.monthlyImpressions) {
          const viewPercent = frequency / 100;
          return (hubPrice * item.monthlyImpressions * viewPercent) / 100;
        }
        if (pricingModel === 'cpc' && item.monthlyImpressions) {
          const impressionPercent = frequency / 100;
          const estimatedClicks = item.monthlyImpressions * impressionPercent * 0.01;
          return hubPrice * estimatedClicks;
        }
        
        // For per_week and per_day, frequency represents weeks/days per month
        if (pricingModel === 'per_week' || pricingModel === 'per_day') {
          return hubPrice * frequency;
        }
        
        // For all other pricing models, use simple multiplication
        return hubPrice * frequency;
      };

      // Extract inventory from each channel
      const extractFromChannel = (channelName: string, channelData: any, path: string, itemFrequencyString?: string, sourceInfo?: any) => {
        if (!channels.includes(channelName)) return;
        
        // Extract channel-level metrics from sourceInfo
        const channelMetrics = sourceInfo?.websiteMetrics || sourceInfo?.newsletterMetrics || sourceInfo?.printMetrics || sourceInfo?.socialMetrics || sourceInfo?.podcastMetrics || sourceInfo?.radioMetrics || sourceInfo?.streamingMetrics || sourceInfo?.eventMetrics;
        
        const opportunities = Array.isArray(channelData) 
          ? channelData.flatMap((item: any) => item.advertisingOpportunities || [])
          : channelData?.advertisingOpportunities || [];

        opportunities.forEach((opp: any, idx: number) => {
          const hubPricing = opp.hubPricing?.find((hp: any) => hp.hubId === hubId && hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            const pricingModel = pricing.pricingModel || 'flat';
            
            // Extract price based on pricing model (with fallbacks)
            let hubPrice = 0;
            switch (pricingModel) {
              case 'monthly':
                hubPrice = pricing.monthly || pricing.flatRate || pricing.rate || 0;
                break;
              case 'per_week':
                hubPrice = pricing.perWeek || pricing.flatRate || pricing.rate || 0;
                break;
              case 'per_day':
                hubPrice = pricing.perDay || pricing.flatRate || pricing.rate || 0;
                break;
              case 'per_send':
                hubPrice = pricing.perSend || pricing.rate || pricing.flatRate || 0;
                break;
              case 'per_spot':
                hubPrice = pricing.perSpot || pricing.rate || pricing.flatRate || 0;
                break;
              case 'per_post':
                hubPrice = pricing.perPost || pricing.rate || pricing.flatRate || 0;
                break;
              case 'per_episode':
                hubPrice = pricing.perEpisode || pricing.rate || pricing.flatRate || 0;
                break;
              case 'per_ad':
              case 'per_insertion':
                hubPrice = pricing.rate || pricing.flatRate || 0;
                break;
              case 'cpm':
                hubPrice = pricing.cpm || pricing.flatRate || pricing.rate || 0;
                break;
              case 'cpv':
                hubPrice = pricing.cpv || pricing.flatRate || pricing.rate || 0;
                break;
              case 'cpc':
                hubPrice = pricing.cpc || pricing.flatRate || pricing.rate || 0;
                break;
              case 'flat':
              default:
                hubPrice = pricing.flatRate || pricing.rate || pricing.monthly || 0;
                break;
            }
            
            if (hubPrice > 0) {
              let frequency: number;
              
              if (itemFrequencyString) {
                // Use the actual frequency from the inventory item
                const inferredFreq = inferOccurrencesFromFrequency(itemFrequencyString);
                frequency = Math.round(inferredFreq);
              } else {
                // Fallback: infer from pricing model
                switch (pricingModel) {
                  case 'flat':
                  case 'monthly':
                    frequency = 1;
                    break;
                  case 'per_ad':
                  case 'per_insertion':
                    const printFreq = inferOccurrencesFromFrequency(pub.printFrequency);
                    frequency = Math.round(printFreq);
                    break;
                  case 'per_send':
                    const sendFreq = inferOccurrencesFromFrequency(pub.printFrequency);
                    frequency = Math.round(sendFreq);
                    break;
                  case 'per_spot':
                    frequency = 22;
                    break;
                  case 'per_post':
                    frequency = 4;
                    break;
                  case 'per_episode':
                    const episodeFreq = inferOccurrencesFromFrequency(pub.printFrequency);
                    frequency = Math.round(episodeFreq);
                    break;
                  case 'per_week':
                    frequency = 4;
                    break;
                  case 'per_day':
                    frequency = 30;
                    break;
                  case 'cpm':
                  case 'cpv':
                  case 'cpc':
                    frequency = 100;
                    break;
                  default:
                    frequency = 1;
                }
              }
              
              // Apply frequency strategy adjustments if requested
              const isImpressionBased = ['cpm', 'cpv', 'cpc'].includes(pricingModel);
              const isTimeBased = ['per_week', 'per_day'].includes(pricingModel);
              if (!isImpressionBased && !isTimeBased) {
                if (frequencyStrategy === 'reduced') {
                  frequency = Math.max(1, Math.floor(frequency / 2));
                } else if (frequencyStrategy === 'minimum') {
                  frequency = 1;
                }
              }
              
              const item: any = {
                channel: channelName,
                itemPath: `${path}[${idx}]`,
                itemName: opp.title || opp.name || `${channelName} Ad`,
                quantity: frequency,
                currentFrequency: frequency,
                maxFrequency: pubType === 'daily' ? 30 : pubType === 'weekly' ? 4 : pubType === 'bi-weekly' ? 2 : 1,
                publicationFrequencyType: pubType,
                itemPricing: {
                  standardPrice: hubPrice,
                  hubPrice,
                  pricingModel: pricing.pricingModel || 'flat'
                },
                specifications: opp.specifications,
                audienceMetrics: channelMetrics || undefined,  // Add channel-level metrics
                performanceMetrics: opp.performanceMetrics || undefined  // Add item-level metrics
              };
              
              // For CPM/CPV/CPC pricing, extract impression data
              const itemPricingModel = item.itemPricing.pricingModel;
              if (itemPricingModel === 'cpm' || itemPricingModel === 'cpv' || itemPricingModel === 'cpc') {
                const impressions = opp.monthlyImpressions || 
                                  opp.performanceMetrics?.impressionsPerMonth ||
                                  opp.metrics?.monthlyImpressions || 
                                  0;
                
                if (impressions > 0) {
                  item.monthlyImpressions = impressions;
                }
              }
              
              // Add sourceName if provided
              if (sourceInfo?.sourceName) {
                item.sourceName = sourceInfo.sourceName;
              }
              
              // Store original frequency string for reference
              if (itemFrequencyString) {
                item.originalFrequency = itemFrequencyString;
              }
              
              inventoryItems.push(item);
            }
          }
        });
      };

      // Extract from all channels
      if (pub.distributionChannels) {
        const dc = pub.distributionChannels;
        
        // Website
        if (dc.website) {
          const websiteMetrics = {
            monthlyVisitors: dc.website.metrics?.monthlyVisitors,
            monthlyPageViews: dc.website.metrics?.monthlyPageViews,
            monthlyImpressions: dc.website.metrics?.monthlyImpressions
          };
          extractFromChannel('website', dc.website, 'distributionChannels.website.advertisingOpportunities', undefined, { websiteMetrics });
        }
        
        // Newsletters
        if (dc.newsletters && Array.isArray(dc.newsletters)) {
          dc.newsletters.forEach((newsletter: any, nlIdx: number) => {
            if (newsletter.advertisingOpportunities) {
              const newsletterName = newsletter.name || newsletter.subject || 'Newsletter';
              const newsletterMetrics = {
                subscribers: newsletter.subscribers,
                openRate: newsletter.openRate,
                clickThroughRate: newsletter.clickThroughRate
              };
              extractFromChannel('newsletter', [newsletter], `distributionChannels.newsletters[${nlIdx}].advertisingOpportunities`, newsletter.frequency, {
                sourceName: newsletterName,
                newsletterMetrics
              });
            }
          });
        }
        
        // Print
        if (dc.print) {
          const printPubs = Array.isArray(dc.print) ? dc.print : [dc.print];
          printPubs.forEach((printPub: any, printIdx: number) => {
            if (printPub.advertisingOpportunities) {
              const printFreq = printPub.frequency || pub.printFrequency;
              const printName = printPub.section || printPub.name || pub.basicInfo?.publicationName || 'Print';
              const printMetrics = {
                circulation: printPub.circulation,
                distributionArea: printPub.distributionArea
              };
              extractFromChannel('print', [printPub], `distributionChannels.print[${printIdx}].advertisingOpportunities`, printFreq, {
                sourceName: printName,
                printMetrics
              });
            }
          });
        }
        
        // Social Media
        if (dc.socialMedia && Array.isArray(dc.socialMedia)) {
          dc.socialMedia.forEach((socialAd: any, socialIdx: number) => {
            if (socialAd.advertisingOpportunities) {
              const socialMetrics = {
                followers: socialAd.metrics?.followers,
                engagementRate: socialAd.metrics?.engagementRate,
                averageReach: socialAd.metrics?.averageReach
              };
              extractFromChannel('social', [socialAd], `distributionChannels.socialMedia[${socialIdx}].advertisingOpportunities`, socialAd.frequency, {
                sourceName: socialAd.platform || 'Social Media',
                socialMetrics
              });
            }
          });
        }
        
        // Podcasts
        if (dc.podcasts && Array.isArray(dc.podcasts)) {
          dc.podcasts.forEach((podcast: any, podIdx: number) => {
            if (podcast.advertisingOpportunities) {
              const podcastMetrics = {
                listeners: podcast.listeners,
                subscribers: podcast.subscribers,
                downloadsPerEpisode: podcast.downloadsPerEpisode
              };
              extractFromChannel('podcast', [podcast], `distributionChannels.podcasts[${podIdx}].advertisingOpportunities`, podcast.frequency, {
                sourceName: podcast.name || 'Podcast',
                podcastMetrics
              });
            }
          });
        }
        
        // Radio
        if (dc.radioStations && Array.isArray(dc.radioStations)) {
          dc.radioStations.forEach((station: any, stationIdx: number) => {
            const radioMetrics = {
              listeners: station.listeners,
              marketRank: station.marketRank,
              signalStrength: station.signalStrength
            };
            
            if (station.shows && Array.isArray(station.shows)) {
              station.shows.forEach((show: any, showIdx: number) => {
                if (show.advertisingOpportunities) {
                  const showMetrics = {
                    ...radioMetrics,
                    averageListeners: show.averageListeners || station.listeners
                  };
                  extractFromChannel('radio', [show], `distributionChannels.radioStations[${stationIdx}].shows[${showIdx}].advertisingOpportunities`, show.frequency, {
                    sourceName: show.name || 'Radio Show',
                    radioMetrics: showMetrics
                  });
                }
              });
            }
            // Station-level ads
            if (station.advertisingOpportunities && !station.shows) {
              extractFromChannel('radio', [station], `distributionChannels.radioStations[${stationIdx}].advertisingOpportunities`, undefined, {
                sourceName: station.callSign || 'Radio',
                radioMetrics
              });
            }
          });
        }
        
        // Streaming
        if (dc.streamingVideo && Array.isArray(dc.streamingVideo)) {
          dc.streamingVideo.forEach((stream: any, streamIdx: number) => {
            if (stream.advertisingOpportunities) {
              const streamingMetrics = {
                subscribers: stream.subscribers,
                averageViews: stream.averageViews,
                totalReach: stream.totalReach
              };
              extractFromChannel('streaming', [stream], `distributionChannels.streamingVideo[${streamIdx}].advertisingOpportunities`, stream.frequency, {
                sourceName: stream.name || 'Streaming',
                streamingMetrics
              });
            }
          });
        }
        
        // Events
        if (dc.events && Array.isArray(dc.events)) {
          dc.events.forEach((event: any, eventIdx: number) => {
            if (event.advertisingOpportunities) {
              const eventMetrics = {
                averageAttendance: event.averageAttendance,
                expectedAttendees: event.expectedAttendees,
                historicalAttendance: event.historicalAttendance
              };
              extractFromChannel('events', [event], `distributionChannels.events[${eventIdx}].advertisingOpportunities`, event.frequency, {
                sourceName: event.name || 'Event',
                eventMetrics
              });
            }
          });
        }
      }

      if (inventoryItems.length > 0) {
        const pubTotal = inventoryItems.reduce((sum, item) => {
          return sum + calculateItemCost(item);
        }, 0);

        // For budget-first mode, check if adding this publication exceeds budget
        if (mode === 'budget-first' && budget) {
          if (totalCost + pubTotal > budget * 0.95) {
            // Try to include at least one item from each channel if within budget
            const minItems = [];
            const channelMap = new Map();
            
            for (const item of inventoryItems) {
              if (!channelMap.has(item.channel)) {
                const itemCost = calculateItemCost(item);
                if (totalCost + itemCost <= budget) {
                  minItems.push(item);
                  channelMap.set(item.channel, true);
                  totalCost += itemCost;
                }
              }
            }

            if (minItems.length > 0) {
              const minTotal = minItems.reduce((sum, item) => {
                return sum + calculateItemCost(item);
              }, 0);

              resultPublications.push({
                publicationId: pub.publicationId,
                publicationName: pub.basicInfo.publicationName,
                inventoryItems: minItems,
                publicationTotal: minTotal,
                publicationFrequencyType: pubType
              });
            }
            break; // Stop adding more publications
          }
        }

        resultPublications.push({
          publicationId: pub.publicationId,
          publicationName: pub.basicInfo.publicationName,
          inventoryItems,
          publicationTotal: pubTotal,
          publicationFrequencyType: pubType
        });

        totalCost += pubTotal;
      }
    }

    // Calculate summary
    const allChannels = new Set(
      resultPublications.flatMap(p => p.inventoryItems.map((i: any) => i.channel))
    );

    const totalUnits = resultPublications.reduce(
      (sum, p) => sum + p.inventoryItems.reduce((s: number, i: any) => s + i.currentFrequency, 0),
      0
    );

    // Calculate reach across all publications
    const reachSummary = calculatePackageReach(resultPublications);

    const result = {
      publications: resultPublications,
      summary: {
        totalOutlets: resultPublications.length,
        totalChannels: allChannels.size,
        totalUnits,
        monthlyCost: totalCost,
        totalCost: totalCost * duration,
        budgetUsed: budget ? (totalCost / budget) * 100 : undefined,
        // Reach metrics
        totalMonthlyImpressions: reachSummary.totalMonthlyImpressions,
        totalMonthlyExposures: reachSummary.totalMonthlyExposures,
        estimatedTotalReach: reachSummary.estimatedTotalReach,
        estimatedUniqueReach: reachSummary.estimatedUniqueReach,
        channelAudiences: reachSummary.channelAudiences,
        reachCalculationMethod: reachSummary.calculationMethod,
        reachOverlapFactor: reachSummary.overlapFactor
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error analyzing inventory for package builder:', error);
    res.status(500).json({ 
      error: 'Failed to analyze inventory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save a built package
router.post('/save-package', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const packageData = req.body;
    
    // Ensure builder metadata is included
    if (!packageData.metadata) {
      packageData.metadata = {};
    }
    if (!packageData.metadata.builderInfo) {
      packageData.metadata.builderInfo = { creationMethod: 'builder' };
    } else {
      packageData.metadata.builderInfo.creationMethod = 'builder';
    }

    const package_ = await hubPackagesService.create(packageData, req.user.id);
    res.status(201).json({ package: package_ });
  } catch (error) {
    console.error('Error saving built package:', error);
    res.status(500).json({ error: 'Failed to save package' });
  }
});

// Update a built package
router.put('/packages/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = req.body;
    
    // Update lastBuilderEdit timestamp
    if (updateData.metadata?.builderInfo) {
      updateData.metadata.builderInfo.lastBuilderEdit = new Date();
    }

    const package_ = await hubPackagesService.update(id, updateData, req.user.id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: package_ });
  } catch (error) {
    console.error('Error updating built package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Duplicate a package
router.post('/packages/:id/duplicate', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const originalPackage = await hubPackagesService.getById(id);
    
    if (!originalPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Create a copy with modified fields
    const { _id, metadata, ...packageData } = originalPackage as any;
    
    const duplicatedPackage = {
      ...packageData,
      packageId: `${packageData.packageId}-copy-${Date.now()}`,
      basicInfo: {
        ...packageData.basicInfo,
        name: `${packageData.basicInfo.name} (Copy)`
      }
    };

    const newPackage = await hubPackagesService.create(duplicatedPackage, req.user.id);
    res.status(201).json({ package: newPackage });
  } catch (error) {
    console.error('Error duplicating package:', error);
    res.status(500).json({ error: 'Failed to duplicate package' });
  }
});

// Export package as CSV
router.get('/packages/:id/export-csv', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const package_ = await hubPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Build CSV content
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Publication,Channel,Item Name,Frequency,Unit Price,Monthly Cost');
    
    // Data rows
    let totalCost = 0;
    const channelTotals: Record<string, number> = {};
    
    for (const pub of (package_ as any).components.publications) {
      for (const item of pub.inventoryItems) {
        const frequency = item.currentFrequency || item.quantity || 1;
        const unitPrice = item.itemPricing?.hubPrice || 0;
        const monthlyCost = unitPrice * frequency;
        totalCost += monthlyCost;
        
        channelTotals[item.channel] = (channelTotals[item.channel] || 0) + monthlyCost;
        
        csvRows.push(
          `"${pub.publicationName}","${item.channel}","${item.itemName}",${frequency},$${unitPrice.toFixed(2)},$${monthlyCost.toFixed(2)}`
        );
      }
    }
    
    // Summary rows
    csvRows.push('');
    csvRows.push('SUMMARY BY CHANNEL');
    for (const [channel, cost] of Object.entries(channelTotals)) {
      csvRows.push(`${channel},,,,$${cost.toFixed(2)}`);
    }
    
    csvRows.push('');
    csvRows.push(`TOTAL,,,,$${totalCost.toFixed(2)}`);
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="package-${id}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting package to CSV:', error);
    res.status(500).json({ error: 'Failed to export package' });
  }
});

// Get packages created via builder
router.get('/packages', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { hub_id } = req.query;
    
    const filters: any = {};
    if (hub_id) filters.hubId = hub_id as string;
    
    // Get all packages
    const allPackages = await hubPackagesService.getAll(filters);
    
    // Filter to only builder-created packages
    const builderPackages = allPackages.filter((pkg: any) => 
      pkg.metadata?.builderInfo?.creationMethod === 'builder'
    );
    
    res.json({ packages: builderPackages });
  } catch (error) {
    console.error('Error fetching builder packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

export default router;

