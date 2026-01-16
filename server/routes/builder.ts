import { Router, Request, Response } from 'express';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';
import { hubPackagesService } from '../../src/integrations/mongodb/hubPackageService';
import { authenticateToken } from '../middleware/authenticate';
import { inferOccurrencesFromFrequency } from '../../src/utils/pricingCalculations';
import { calculatePackageReach } from '../../src/utils/reachCalculations';
import { calculateItemCost, calculatePublicationTotal } from '../../src/utils/inventoryPricing';

const router = Router();

/**
 * PHASE 1 COMPLETE: Builder route now uses shared utilities
 * 
 * Removed duplicate functions:
 * - calculatePackageReach() - Now imported from src/utils/reachCalculations.ts
 * - calculateItemCost() - Now imported from src/utils/inventoryPricing.ts
 * 
 * All pricing and reach calculations now use the same utilities as the package system.
 */

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
    
    // Check if user has permission to analyze packages for this hub
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    if (!isAdmin) {
      if (!hubId) {
        return res.status(400).json({ error: 'Hub ID is required' });
      }
      if (!assignedHubIds.includes(hubId)) {
        return res.status(403).json({ error: 'You do not have permission to build packages for this hub' });
      }
    }

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

      /**
       * REMOVED: Duplicate calculateItemCost function
       * Now using shared utility from src/utils/inventoryPricing.ts
       * 
       * The shared utility is superior:
       * - Has duration parameter for campaign calculations
       * - Better input validation
       * - More comprehensive pricing model support
       * - Smarter frequency fallback logic
       */

      // Extract inventory from each channel
      const extractFromChannel = (channelName: string, channelData: any, path: string, itemFrequencyString?: string, sourceInfo?: any) => {
        if (!channels.includes(channelName)) return;
        
        // Consolidate all channel-level metrics from sourceInfo (combine all available metrics)
        const channelMetrics = {
          ...sourceInfo?.websiteMetrics,
          ...sourceInfo?.newsletterMetrics,
          ...sourceInfo?.printMetrics,
          ...sourceInfo?.socialMetrics,
          ...sourceInfo?.podcastMetrics,
          ...sourceInfo?.radioMetrics,
          ...sourceInfo?.streamingMetrics,
          ...sourceInfo?.eventMetrics
        };
        
        const opportunities = Array.isArray(channelData) 
          ? channelData.flatMap((item: any) => item.advertisingOpportunities || [])
          : channelData?.advertisingOpportunities || [];

        opportunities.forEach((opp: any, idx: number) => {
          const hubPricing = opp.hubPricing?.find((hp: any) => hp.hubId === hubId && hp.available);
          if (hubPricing?.pricing) {
            // Get all pricing tiers (could be array or single object)
            const rawPricingTiers = Array.isArray(hubPricing.pricing) 
              ? hubPricing.pricing 
              : [hubPricing.pricing];
            
            // Keep only ONE tier per pricing MODEL (e.g., one 'monthly', one 'per_week')
            // This filters out volume discount tiers (multiple prices for same model)
            // but keeps different billing models as separate items
            const seenModels = new Set<string>();
            const pricingTiers = rawPricingTiers.filter((tier: any) => {
              const model = tier.pricingModel || 'flat';
              if (seenModels.has(model)) {
                return false; // Skip - already have this pricing model
              }
              seenModels.add(model);
              return true;
            });
            
            // Create inventory item for each unique pricing MODEL
            pricingTiers.forEach((pricing: any, tierIndex: number) => {
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
              
              // Create unique path and name for each pricing tier
              const tierSuffix = pricingTiers.length > 1 ? `-tier${tierIndex}` : '';
              const baseItemName = opp.title || opp.name || `${channelName} Ad`;
              const getPricingModelLabel = (model: string) => {
                const labels: Record<string, string> = {
                  'flat': 'Monthly',
                  'monthly': 'Monthly',
                  'per_week': 'Weekly',
                  'per_day': 'Daily',
                  'per_send': 'Per Send',
                  'per_spot': 'Per Spot',
                  'per_ad': 'Per Ad'
                };
                return labels[model] || model;
              };
              const itemName = pricingTiers.length > 1
                ? `${baseItemName} (${getPricingModelLabel(pricingModel)})`
                : baseItemName;
              
              // Copy the standardized format object directly
              const format = opp.format ? { ...opp.format } : {};
              
              // For radio/podcast: ensure duration and position are populated
              if (channelName === 'radio' || channelName === 'podcast') {
                // Store adFormat as dimensions for podcasts (pre-roll, mid-roll, host-read, etc.)
                if (!format.dimensions && opp.adFormat) {
                  format.dimensions = opp.adFormat;
                }
                
                // Try to extract duration from adFormat or name (e.g., "30 Second Spot")
                if (!format.duration) {
                  const adFormatMatch = (opp.adFormat || opp.name || '').match(/(\d+)\s*(?:second|sec|s)\b/i);
                  if (adFormatMatch) {
                    format.duration = parseInt(adFormatMatch[1], 10);
                  }
                  // Try from opp.duration if it exists
                  if (!format.duration && opp.duration) {
                    format.duration = typeof opp.duration === 'number' ? opp.duration : parseInt(opp.duration, 10);
                  }
                  // Set default durations for known podcast positions (if not host-read)
                  if (!format.duration && channelName === 'podcast') {
                    const adFormatLower = (opp.adFormat || '').toLowerCase();
                    if (adFormatLower.includes('pre-roll') || adFormatLower.includes('preroll')) {
                      format.duration = 30; // Default pre-roll duration
                    } else if (adFormatLower.includes('mid-roll') || adFormatLower.includes('midroll')) {
                      format.duration = 60; // Default mid-roll duration
                    } else if (adFormatLower.includes('post-roll') || adFormatLower.includes('postroll')) {
                      format.duration = 30; // Default post-roll duration
                    }
                    // host-read and live-read don't get default duration
                  }
                }
              }
              
              // Detect item-level frequency type (use item's own frequency if available, fallback to publication)
              // This ensures a weekly newsletter in a daily newspaper still caps at 4x/month
              const itemPubType = itemFrequencyString 
                ? detectFrequencyType(itemFrequencyString)
                : pubType;
              
              const item: any = {
                channel: channelName,
                itemPath: `${path}[${idx}]${tierSuffix}`,
                itemName: itemName,
                quantity: frequency,
                currentFrequency: frequency,
                maxFrequency: itemPubType === 'daily' ? 30 : itemPubType === 'weekly' ? 4 : itemPubType === 'bi-weekly' ? 2 : 1,
                publicationFrequencyType: itemPubType,
                frequency: itemFrequencyString || pub.printFrequency,  // Use item-specific frequency or publication frequency
                itemPricing: {
                  standardPrice: hubPrice,
                  hubPrice,
                  pricingModel: pricing.pricingModel || 'flat'
                },
                format, // Use standardized format object
                audienceMetrics: Object.keys(channelMetrics).length > 0 ? channelMetrics : undefined,  // Add channel-level metrics (only if not empty)
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
            } // End if (hubPrice > 0)
            }); // End pricingTiers.forEach
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
          const frequency = item.currentFrequency || item.quantity || 1;
          return sum + calculateItemCost(item, frequency);
        }, 0);

        // For budget-first mode, check if adding this publication exceeds budget
        if (mode === 'budget-first' && budget) {
          if (totalCost + pubTotal > budget * 0.95) {
            // Try to include at least one item from each channel if within budget
            const minItems = [];
            const channelMap = new Map();
            
            for (const item of inventoryItems) {
              if (!channelMap.has(item.channel)) {
                const frequency = item.currentFrequency || item.quantity || 1;
                const itemCost = calculateItemCost(item, frequency);
                if (totalCost + itemCost <= budget) {
                  minItems.push(item);
                  channelMap.set(item.channel, true);
                  totalCost += itemCost;
                }
              }
            }

            if (minItems.length > 0) {
              const minTotal = minItems.reduce((sum, item) => {
                const frequency = item.currentFrequency || item.quantity || 1;
                return sum + calculateItemCost(item, frequency);
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
    const packageData = req.body;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    // Check if user has permission to create package for this hub
    if (!isAdmin) {
      const packageHubId = packageData.hubInfo?.hubId;
      if (!packageHubId) {
        return res.status(400).json({ error: 'Package must be associated with a hub' });
      }
      
      if (!assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to create packages for this hub' });
      }
    }
    
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
    const { id } = req.params;
    const updateData = req.body;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      // Get the existing package to check hub ownership
      const existingPackage = await hubPackagesService.getById(id);
      if (!existingPackage) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      const packageHubId = existingPackage.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to update packages for this hub' });
      }
    }
    
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
    const { id } = req.params;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    const originalPackage = await hubPackagesService.getById(id);
    
    if (!originalPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      const packageHubId = originalPackage.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to duplicate packages for this hub' });
      }
    }

    // Create a copy with modified fields - PRESERVE metadata (especially builderInfo)
    const { _id, ...packageData } = originalPackage as any;
    
    const duplicatedPackage = {
      ...packageData,
      packageId: `${packageData.packageId}-copy-${Date.now()}`,
      basicInfo: {
        ...packageData.basicInfo,
        name: `${packageData.basicInfo.name} (Copy)`
      },
      // Preserve metadata but update creation info
      metadata: {
        ...packageData.metadata,
        createdAt: undefined, // Will be set by create()
        updatedAt: undefined,
        version: 1
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
    const { id } = req.params;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    const package_ = await hubPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      const packageHubId = package_.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to export packages for this hub' });
      }
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
        // Skip excluded items
        if (item.isExcluded) continue;
        
        const frequency = item.currentFrequency || item.quantity || 1;
        const unitPrice = item.itemPricing?.hubPrice || 0;
        // Use calculateItemCost for proper CPM/impression-based pricing
        const monthlyCost = calculateItemCost(item, frequency);
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
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    const { hub_id } = req.query;
    
    const filters: any = {};
    if (hub_id) filters.hubId = hub_id as string;
    
    // Get all packages
    const allPackages = await hubPackagesService.getAll(filters);
    
    // Filter to only builder-created packages
    let builderPackages = allPackages.filter((pkg: any) => 
      pkg.metadata?.builderInfo?.creationMethod === 'builder'
    );
    
    // For non-admins, filter to only packages in their assigned hubs
    if (!isAdmin) {
      builderPackages = builderPackages.filter((pkg: any) => 
        pkg.hubInfo?.hubId && assignedHubIds.includes(pkg.hubInfo.hubId)
      );
    }
    
    res.json({ packages: builderPackages });
  } catch (error) {
    console.error('Error fetching builder packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ===== PACKAGE HEALTH CHECK ENDPOINTS =====

// Run health check on a single package
router.get('/packages/:id/health-check', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    const { packageHealthService } = await import('../../src/services/packageHealthService');
    
    const package_ = await hubPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      const packageHubId = package_.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to check health for packages in this hub' });
      }
    }

    const healthCheck = await packageHealthService.runHealthCheck(package_);
    res.json({ healthCheck });
  } catch (error) {
    console.error('Error running package health check:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

// Recalculate and update package with current values
router.post('/packages/:id/recalculate', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { updatePricing = true, updateReach = true } = req.body;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    const { packageHealthService } = await import('../../src/services/packageHealthService');
    
    const package_ = await hubPackagesService.getById(id);
    
    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      const packageHubId = package_.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to recalculate packages for this hub' });
      }
    }

    // Store old values
    const oldValues = {
      pricing: package_.pricing.breakdown.finalPrice,
      reach: package_.performance.estimatedReach.minReach,
    };

    // Recalculate
    const newValues = packageHealthService.recalculatePackageValues(package_);

    // Build update object
    const updates: any = {};
    const changes: string[] = [];

    if (updatePricing) {
      updates['pricing.breakdown'] = newValues.pricing.breakdown;
      updates['pricing.breakdown.finalPrice'] = newValues.pricing.finalPrice;
      updates['pricing.displayPrice'] = `$${newValues.pricing.finalPrice.toLocaleString()}/month`;
      
      const priceDiff = newValues.pricing.finalPrice - oldValues.pricing;
      changes.push(
        `Pricing updated: $${oldValues.pricing.toLocaleString()} → $${newValues.pricing.finalPrice.toLocaleString()} (${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)})`
      );
    }

    if (updateReach) {
      updates['performance.estimatedReach'] = newValues.performance.estimatedReach;
      updates['performance.estimatedImpressions'] = newValues.performance.estimatedImpressions;
      updates['performance.costPerThousand'] = newValues.performance.costPerThousand;
      
      const reachDiff = newValues.performance.estimatedReach.minReach - oldValues.reach;
      changes.push(
        `Reach updated: ${oldValues.reach.toLocaleString()} → ${newValues.performance.estimatedReach.minReach.toLocaleString()} (${reachDiff > 0 ? '+' : ''}${reachDiff.toLocaleString()})`
      );
    }

    // Update analytics
    updates['analytics.lastModified'] = new Date();

    // Run health check after recalculation
    const healthCheck = await packageHealthService.runHealthCheck({
      ...package_,
      pricing: updatePricing ? { ...package_.pricing, breakdown: newValues.pricing.breakdown } : package_.pricing,
      performance: updateReach ? { ...package_.performance, ...newValues.performance } : package_.performance,
    } as any);

    // Store health check in package
    updates['healthCheck'] = {
      lastChecked: new Date(),
      checks: healthCheck.checks,
      recommendedAction: healthCheck.recommendedAction,
      overallHealth: healthCheck.overallHealth,
      history: [
        ...(package_.healthCheck?.history || []),
        {
          checkedAt: new Date(),
          overallHealth: healthCheck.overallHealth,
          changes,
        }
      ].slice(-10), // Keep last 10 health checks
    };

    // Update the package
    await hubPackagesService.update(id, updates, req.user.id);

    res.json({
      success: true,
      oldValues,
      newValues: {
        pricing: newValues.pricing.finalPrice,
        reach: newValues.performance.estimatedReach.minReach,
      },
      changes,
      healthCheck,
    });
  } catch (error) {
    console.error('Error recalculating package:', error);
    res.status(500).json({ error: 'Failed to recalculate package' });
  }
});

// Get health summary for multiple packages
router.post('/packages/bulk-health-check', authenticateToken, async (req: any, res: Response) => {
  try {
    const { packageIds, hubId } = req.body;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    const { packageHealthService } = await import('../../src/services/packageHealthService');
    
    // For non-admins, validate hub access
    if (!isAdmin && hubId && !assignedHubIds.includes(hubId)) {
      return res.status(403).json({ error: 'You do not have permission to check health for packages in this hub' });
    }
    
    let packages = [];
    
    if (hubId) {
      // Check all packages for a hub
      const allPackages = await hubPackagesService.list({ hubId });
      packages = allPackages;
    } else if (packageIds && Array.isArray(packageIds)) {
      // Check specific packages
      packages = await Promise.all(
        packageIds.map(id => hubPackagesService.getById(id))
      );
      packages = packages.filter(pkg => pkg !== null);
    } else {
      return res.status(400).json({ error: 'Must provide packageIds or hubId' });
    }

    const healthChecks = await Promise.all(
      packages.map(pkg => packageHealthService.runHealthCheck(pkg))
    );

    res.json({ healthChecks });
  } catch (error) {
    console.error('Error running bulk health check:', error);
    res.status(500).json({ error: 'Failed to run bulk health check' });
  }
});

// Get health summary (for dashboard widget)
router.get('/packages/health-summary', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.query;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    const { packageHealthService } = await import('../../src/services/packageHealthService');
    
    // For non-admins, validate hub access if hubId is specified
    if (!isAdmin) {
      if (hubId && !assignedHubIds.includes(hubId as string)) {
        return res.status(403).json({ error: 'You do not have permission to view health summary for this hub' });
      }
      // If no hubId specified, we'll filter results below
    }
    
    const packages = await hubPackagesService.list({ 
      hubId: hubId as string | undefined 
    });

    const summary = await packageHealthService.getHealthSummary(packages);

    res.json({
      ...summary,
      lastChecked: new Date(),
    });
  } catch (error) {
    console.error('Error fetching health summary:', error);
    res.status(500).json({ error: 'Failed to fetch health summary' });
  }
});

/**
 * Smart refresh endpoint - updates package data while preserving customizations
 * POST /api/admin/builder/refresh
 */
router.post('/refresh', authenticateToken, async (req: any, res: Response) => {
  try {
    const { 
      hubId, 
      currentPublications, // Current package state with exclusions/frequencies
      filters // Original builder filters (channels, geography, etc.)
    } = req.body;

    if (!hubId || !currentPublications || !filters) {
      return res.status(400).json({ 
        error: 'Missing required fields: hubId, currentPublications, filters' 
      });
    }
    
    // Check if user has permission to refresh packages for this hub
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    if (!isAdmin && !assignedHubIds.includes(hubId)) {
      return res.status(403).json({ error: 'You do not have permission to refresh packages for this hub' });
    }

    // Get publications collection
    const db = await getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Get the publication IDs from current package
    const publicationIds = currentPublications.map((p: any) => p.publicationId);
    
    // Fetch fresh publication data
    const freshPublications = await publicationsCollection
      .find({ 
        publicationId: { $in: publicationIds },
        'hubIds': hubId 
      })
      .toArray();

    // Helper to detect publication frequency type
    const detectFrequencyType = (printFrequency?: string): string => {
      if (!printFrequency) return 'custom';
      const freq = printFrequency.toLowerCase();
      if (freq.includes('daily')) return 'daily';
      if (freq.includes('weekly') && !freq.includes('bi')) return 'weekly';
      if (freq.includes('bi-weekly') || freq.includes('biweekly')) return 'bi-weekly';
      if (freq.includes('monthly')) return 'monthly';
      return 'custom';
    };

    // Merge logic: update pricing and add new items while preserving customizations
    const mergedPublications = currentPublications.map((currentPub: any) => {
      const freshPub = freshPublications.find((fp: any) => fp.publicationId === currentPub.publicationId);
      
      if (!freshPub) {
        // Publication no longer exists or not in hub - keep current state
        return currentPub;
      }

      const pubType = detectFrequencyType(freshPub.printFrequency);
      
      // Build a map of current items by itemPath for quick lookup
      const currentItemsMap = new Map(
        (currentPub.inventoryItems || []).map((item: any) => [item.itemPath, item])
      );
      
      // Get all channels that are currently in the package (to preserve them during refresh)
      const currentChannels = new Set((currentPub.inventoryItems || []).map((item: any) => item.channel));
      // Merge with filter channels to also include any newly selected channels
      const channelsToRefresh = Array.from(new Set([...currentChannels, ...(filters.channels || [])]));
      
      // Only show detailed logs for Chicago News Weekly
      const isDebugPub = currentPub.publicationName?.includes('Chicago News Weekly');
      
      // Debug logging removed for production

      // Extract fresh inventory from the publication
      const freshInventory: any[] = [];
      
      // Helper to extract items from a channel
      const extractFromChannel = (channelName: string, channelData: any, path: string, itemFrequencyString?: string, sourceInfo?: any) => {
        if (!channelsToRefresh.includes(channelName)) return;
        
        // Consolidate all channel-level metrics from sourceInfo
        const channelMetrics = {
          ...sourceInfo?.websiteMetrics,
          ...sourceInfo?.newsletterMetrics,
          ...sourceInfo?.printMetrics,
          ...sourceInfo?.socialMetrics,
          ...sourceInfo?.radioMetrics,
          ...sourceInfo?.podcastMetrics
        };
        
        let opportunities = [];
        if (Array.isArray(channelData)) {
          opportunities = channelData.flatMap((item: any) => 
            item.advertisingOpportunities || []
          );
        } else if (channelData.advertisingOpportunities) {
          opportunities = channelData.advertisingOpportunities;
        }

        opportunities.forEach((opp: any, idx: number) => {
          // Find hub pricing
          const hubPricing = opp.hubPricing?.find((hp: any) => hp.hubId === hubId);
          if (!hubPricing?.pricing) return;

          // Get all pricing tiers (could be array or single object)
          const rawPricingTiers = Array.isArray(hubPricing.pricing) 
            ? hubPricing.pricing 
            : [hubPricing.pricing];
          
          // Keep only ONE tier per pricing MODEL (e.g., one 'monthly', one 'per_week')
          // This filters out volume discount tiers (multiple prices for same model)
          // but keeps different billing models as separate items
          const seenModels = new Set<string>();
          const pricingTiers = rawPricingTiers.filter((tier: any) => {
            const model = tier.pricingModel || 'flat';
            if (seenModels.has(model)) {
              return false; // Skip - already have this pricing model
            }
            seenModels.add(model);
            return true;
          });
          
          // Create inventory item for each unique pricing MODEL
          pricingTiers.forEach((pricing: any, tierIndex: number) => {
            const pricingModel = pricing.pricingModel || 'flat';
            
            // Extract price based on pricing model
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
            
            if (hubPrice === 0) return; // Skip if no valid price

            // Create unique path and name for each pricing tier
            const tierSuffix = pricingTiers.length > 1 ? `-tier${tierIndex}` : '';
            const baseItemName = opp.title || opp.name || `${channelName} Ad`;
            const getPricingModelLabel = (model: string) => {
              const labels: Record<string, string> = {
                'flat': 'Monthly',
                'monthly': 'Monthly',
                'per_week': 'Weekly',
                'per_day': 'Daily',
                'per_send': 'Per Send',
                'per_spot': 'Per Spot',
                'per_ad': 'Per Ad'
              };
              return labels[model] || model;
            };
            const itemName = pricingTiers.length > 1
              ? `${baseItemName} (${getPricingModelLabel(pricingModel)})`
              : baseItemName;

            // Copy the standardized format object directly
            const format = opp.format ? { ...opp.format } : {};
            
            // For radio/podcast: ensure duration and position are populated
            if (channelName === 'radio' || channelName === 'podcast') {
              // Store adFormat as dimensions for podcasts (pre-roll, mid-roll, host-read, etc.)
              if (!format.dimensions && opp.adFormat) {
                format.dimensions = opp.adFormat;
              }
              
              // Try to extract duration from adFormat or name (e.g., "30 Second Spot")
              if (!format.duration) {
                const adFormatMatch = (opp.adFormat || opp.name || '').match(/(\d+)\s*(?:second|sec|s)\b/i);
                if (adFormatMatch) {
                  format.duration = parseInt(adFormatMatch[1], 10);
                }
                // Try from opp.duration if it exists
                if (!format.duration && opp.duration) {
                  format.duration = typeof opp.duration === 'number' ? opp.duration : parseInt(opp.duration, 10);
                }
                // Set default durations for known podcast positions (if not host-read)
                if (!format.duration && channelName === 'podcast') {
                  const adFormatLower = (opp.adFormat || '').toLowerCase();
                  if (adFormatLower.includes('pre-roll') || adFormatLower.includes('preroll')) {
                    format.duration = 30; // Default pre-roll duration
                  } else if (adFormatLower.includes('mid-roll') || adFormatLower.includes('midroll')) {
                    format.duration = 60; // Default mid-roll duration
                  } else if (adFormatLower.includes('post-roll') || adFormatLower.includes('postroll')) {
                    format.duration = 30; // Default post-roll duration
                  }
                  // host-read and live-read don't get default duration
                }
              }
            }

            // Detect item-level frequency type (use item's own frequency if available, fallback to publication)
            const itemPubType = itemFrequencyString 
              ? detectFrequencyType(itemFrequencyString)
              : pubType;

            const freshItem: any = {
              itemPath: `${path}[${idx}]${tierSuffix}`,
              channel: channelName,
              itemName: itemName,
              itemPricing: {
                standardPrice: hubPrice,
                hubPrice,
                pricingModel: pricingModel
              },
              format, // Use standardized format object
              frequency: itemFrequencyString || freshPub.printFrequency,
              publicationFrequencyType: itemPubType,
              audienceMetrics: Object.keys(channelMetrics).length > 0 ? channelMetrics : undefined,
              performanceMetrics: opp.performanceMetrics || undefined,
              sourceName: sourceInfo?.sourceName
            };
            
            // For CPM/CPV/CPC pricing, extract impression data (same logic as analyze endpoint)
            if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
              const impressions = opp.monthlyImpressions || 
                                opp.performanceMetrics?.impressionsPerMonth ||
                                opp.metrics?.monthlyImpressions || 
                                0;
              
              if (impressions > 0) {
                freshItem.monthlyImpressions = impressions;
              }
            }
            
            // Store original frequency string for reference (for "Show: weekly" badge)
            if (itemFrequencyString) {
              freshItem.originalFrequency = itemFrequencyString;
            }
            freshInventory.push(freshItem);
          }); // End pricingTiers.forEach
        });
      };

      // Extract from all channels
      if (freshPub.distributionChannels) {
        const dc = freshPub.distributionChannels;
        
        if (dc.website) {
          const websiteMetrics = {
            monthlyVisitors: dc.website.metrics?.monthlyVisitors,
            monthlyPageViews: dc.website.metrics?.monthlyPageViews,
            monthlyImpressions: dc.website.metrics?.monthlyImpressions
          };
          extractFromChannel('website', dc.website, 'distributionChannels.website.advertisingOpportunities', undefined, { websiteMetrics });
        }
        
        if (dc.newsletters && Array.isArray(dc.newsletters)) {
          dc.newsletters.forEach((newsletter: any, nlIdx: number) => {
            if (newsletter.advertisingOpportunities) {
              const newsletterName = newsletter.name || newsletter.subject || 'Newsletter';
              const newsletterMetrics = {
                subscribers: newsletter.subscribers,
                openRate: newsletter.openRate,
                clickThroughRate: newsletter.clickThroughRate
              };
              extractFromChannel('newsletter', [newsletter], 
                `distributionChannels.newsletters[${nlIdx}].advertisingOpportunities`, 
                newsletter.frequency,
                { sourceName: newsletterName, newsletterMetrics });
            }
          });
        }
        
        if (dc.print) {
          const printPubs = Array.isArray(dc.print) ? dc.print : [dc.print];
          printPubs.forEach((printPub: any, printIdx: number) => {
            if (printPub.advertisingOpportunities) {
              const printFreq = printPub.frequency || freshPub.printFrequency;
              const printName = printPub.section || printPub.name || freshPub.basicInfo?.publicationName || 'Print';
              const printMetrics = {
                circulation: printPub.circulation,
                distributionArea: printPub.distributionArea
              };
              extractFromChannel('print', [printPub], 
                `distributionChannels.print[${printIdx}].advertisingOpportunities`, 
                printFreq,
                { sourceName: printName, printMetrics });
            }
          });
        }
        
        if (dc.socialMedia && Array.isArray(dc.socialMedia)) {
          dc.socialMedia.forEach((social: any, socialIdx: number) => {
            if (social.advertisingOpportunities) {
              const socialMetrics = {
                followers: social.followers,
                platform: social.platform
              };
              extractFromChannel('social', [social], 
                `distributionChannels.socialMedia[${socialIdx}].advertisingOpportunities`,
                undefined,
                { socialMetrics });
            }
          });
        }
        
        if (dc.radio && Array.isArray(dc.radio)) {
          dc.radio.forEach((radioShow: any, radioIdx: number) => {
            if (radioShow.advertisingOpportunities) {
              const radioName = radioShow.showName || 'Radio Show';
              const radioMetrics = {
                listeners: radioShow.metrics?.weeklyListeners || radioShow.weeklyListeners
              };
              extractFromChannel('radio', [radioShow], 
                `distributionChannels.radio[${radioIdx}].advertisingOpportunities`,
                undefined,
                { sourceName: radioName, radioMetrics });
            }
          });
        }
        
        if (dc.podcast && Array.isArray(dc.podcast)) {
          dc.podcast.forEach((podcast: any, podIdx: number) => {
            if (podcast.advertisingOpportunities) {
              const podcastName = podcast.name || 'Podcast';
              const podcastMetrics = {
                listeners: podcast.metrics?.monthlyListeners || podcast.averageDownloads
              };
              extractFromChannel('podcast', [podcast], 
                `distributionChannels.podcast[${podIdx}].advertisingOpportunities`,
                undefined,
                { sourceName: podcastName, podcastMetrics });
            }
          });
        }
        
        if (dc.streaming) {
          extractFromChannel('streaming', dc.streaming, 
            'distributionChannels.streaming.advertisingOpportunities');
        }
        
        if (dc.events && Array.isArray(dc.events)) {
          dc.events.forEach((event: any, eventIdx: number) => {
            if (event.advertisingOpportunities) {
              extractFromChannel('events', [event], 
                `distributionChannels.events[${eventIdx}].advertisingOpportunities`);
            }
          });
        }
      }

      // Helper to get base path without tier suffix (e.g., "path[0]-tier1" -> "path[0]")
      const getBasePath = (path: string) => path.replace(/-tier\d+$/, '');
      
      // Merge: preserve customizations, update data, add new items
      // Track which current items were matched so we can preserve unmatched ones
      const matchedPaths = new Set<string>();
      const matchedBasePaths = new Set<string>(); // Track base paths for tier-based items
      
      const mergedItems = freshInventory.map((freshItem: any) => {
        // Try exact match first
        let currentItem = currentItemsMap.get(freshItem.itemPath);
        
        // If no exact match and this is a tier-based item, try matching the base path
        if (!currentItem && freshItem.itemPath.includes('-tier')) {
          const basePath = getBasePath(freshItem.itemPath);
          currentItem = currentItemsMap.get(basePath);
          if (currentItem) {
            matchedBasePaths.add(basePath); // Mark base path as matched
          }
        }
        
        if (currentItem) {
          // Item exists - preserve customizations, update data
          matchedPaths.add(freshItem.itemPath);
          return {
            ...freshItem, // Fresh data (pricing, specs, metrics, frequency)
            currentFrequency: currentItem.currentFrequency, // Preserve frequency adjustment
            quantity: currentItem.quantity, // Preserve quantity
            isExcluded: currentItem.isExcluded, // Preserve exclusion
            maxFrequency: currentItem.maxFrequency // Preserve max frequency
          };
        } else {
          // Track the base path so we don't preserve old items that are being replaced by tier items
          if (freshItem.itemPath.includes('-tier')) {
            matchedBasePaths.add(getBasePath(freshItem.itemPath));
          }
          
          // New item - use defaults based on item's own frequency type (not publication level)
          const itemFreqType = freshItem.publicationFrequencyType || pubType;
          const standardFreq = itemFreqType === 'daily' ? 12 : 
                              itemFreqType === 'weekly' ? 4 : 
                              itemFreqType === 'bi-weekly' ? 2 : 1;
          
          return {
            ...freshItem,
            quantity: standardFreq,
            currentFrequency: standardFreq,
            maxFrequency: itemFreqType === 'daily' ? 30 : 
                         itemFreqType === 'weekly' ? 4 : 
                         itemFreqType === 'bi-weekly' ? 2 : 1,
            isExcluded: false
          };
        }
      });
      
      // IMPORTANT: Preserve current items that weren't in fresh inventory
      // BUT don't preserve items whose base path is now being served by tier-based items
      const preservedItems = (currentPub.inventoryItems || []).filter((item: any) => {
        // Don't preserve if it was directly matched
        if (matchedPaths.has(item.itemPath)) return false;
        
        // Don't preserve if this item's path is now served by tier-based items
        if (matchedBasePaths.has(item.itemPath)) return false;
        
        // Don't preserve if it exactly matches a fresh item
        if (freshInventory.some((fresh: any) => fresh.itemPath === item.itemPath)) return false;
        
        // Don't preserve if it's an old tier-based item and fresh has new tiers for same base path
        if (item.itemPath.includes('-tier')) {
          const basePath = getBasePath(item.itemPath);
          if (matchedBasePaths.has(basePath)) return false;
        }
        
        return true;
      });
      // Debug logging removed for production
      
      // Combine merged items with preserved items
      const allItems = [...mergedItems, ...preservedItems];

      // Calculate publication total
      const pubTotal = allItems
        .filter((item: any) => !item.isExcluded)
        .reduce((sum: number, item: any) => {
          const cost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
          return sum + cost;
        }, 0);

      return {
        ...currentPub,
        publicationName: freshPub.basicInfo?.publicationName || currentPub.publicationName,
        inventoryItems: allItems,
        publicationTotal: pubTotal,
        publicationFrequencyType: pubType
      };
    });

    // Calculate total cost
    const totalCost = mergedPublications.reduce((sum: number, pub: any) => 
      sum + (pub.publicationTotal || 0), 0
    );

    // Calculate reach
    const reachSummary = calculatePackageReach(mergedPublications);

    // Return refreshed package data
    res.json({
      publications: mergedPublications,
      summary: {
        totalOutlets: mergedPublications.length,
        monthlyCost: totalCost,
        totalCost: totalCost * (filters.duration || 1),
        duration: filters.duration || 1,
        totalChannels: reachSummary.channelsCount,
        totalUnits: mergedPublications.reduce((sum: number, pub: any) => 
          sum + (pub.inventoryItems || []).reduce((pSum: number, item: any) => 
            pSum + (item.isExcluded ? 0 : (item.currentFrequency || item.quantity || 1)), 0
          ), 0
        )
      },
      reach: reachSummary
    });

  } catch (error) {
    console.error('Error refreshing package:', error);
    res.status(500).json({ 
      error: 'Failed to refresh package',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Find new publications in the hub that aren't in the current package
 * POST /api/admin/builder/new-publications
 */
router.post('/new-publications', authenticateToken, async (req: any, res: Response) => {
  try {
    const { 
      hubId, 
      currentPublicationIds, // Array of publication IDs already in the package
      filters // Original builder filters (channels, geography, etc.)
    } = req.body;

    if (!hubId || !currentPublicationIds || !filters) {
      return res.status(400).json({ 
        error: 'Missing required fields: hubId, currentPublicationIds, filters' 
      });
    }
    
    // Check if user has permission to find publications for this hub
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    if (!isAdmin && !assignedHubIds.includes(hubId)) {
      return res.status(403).json({ error: 'You do not have permission to access publications for this hub' });
    }

    const existingIds = new Set(currentPublicationIds);

    // Get publications collection
    const db = await getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Fetch ALL publications in the hub
    const allHubPublications = await publicationsCollection
      .find({ 'hubIds': hubId })
      .toArray();
    
    const totalInHub = allHubPublications.length;
    
    // Filter to only NEW publications (not already in package)
    const newPublications = allHubPublications.filter((pub: any) => 
      !existingIds.has(pub.publicationId)
    );
    
    console.log(`[New Publications] Hub: ${hubId}, Total in hub: ${totalInHub}, Already in package: ${existingIds.size}, New available: ${newPublications.length}`);
    console.log(`  Existing IDs in package: ${Array.from(existingIds).slice(0, 10).join(', ')}${existingIds.size > 10 ? '...' : ''}`);
    
    // Debug: Check if Dziennik (4014) is in the hub at all
    const dziennikInHub = allHubPublications.find((p: any) => p.publicationId === '4014' || p.publicationId === 4014);
    if (dziennikInHub) {
      console.log(`  ✓ Dziennik (4014) IS in hub publications. Name: ${dziennikInHub.basicInfo?.publicationName}`);
      const dziennikInPackage = existingIds.has(dziennikInHub.publicationId) || existingIds.has('4014') || existingIds.has(4014);
      console.log(`    In package? ${dziennikInPackage} (ID type: ${typeof dziennikInHub.publicationId})`);
    } else {
      // Check ALL publications in DB for Dziennik
      console.log(`  ✗ Dziennik (4014) NOT found in hub publications!`);
      console.log(`    Checking if 4014 exists in any hub publication IDs...`);
    }
    
    // Debug: Log the new publications found
    newPublications.forEach((pub: any) => {
      const channels = [];
      if (pub.distributionChannels?.website) channels.push('website');
      if (pub.distributionChannels?.newsletters?.length) channels.push('newsletter');
      if (pub.distributionChannels?.print) channels.push('print');
      if (pub.distributionChannels?.radio?.length) channels.push('radio');
      if (pub.distributionChannels?.podcasts?.length) channels.push('podcast');
      if (pub.distributionChannels?.socialMedia?.length) channels.push('social');
      console.log(`  - ${pub.basicInfo?.publicationName || pub.publicationId}: channels=[${channels.join(', ')}]`);
    });

    if (newPublications.length === 0) {
      return res.json({
        publications: [],
        count: 0,
        message: 'All publications in the hub are already in this package',
        debug: {
          totalInHub,
          alreadyInPackage: existingIds.size
        }
      });
    }

    // Helper to detect publication frequency type
    const detectFrequencyType = (printFrequency?: string): string => {
      if (!printFrequency) return 'custom';
      const freq = printFrequency.toLowerCase();
      if (freq.includes('daily')) return 'daily';
      if (freq.includes('weekly') && !freq.includes('bi')) return 'weekly';
      if (freq.includes('bi-weekly') || freq.includes('biweekly')) return 'bi-weekly';
      if (freq.includes('monthly')) return 'monthly';
      return 'custom';
    };

    // Process new publications to extract inventory (similar to analyze endpoint)
    const processedPublications: any[] = [];
    // Don't filter by channels - show ALL available inventory from new publications
    // This lets users see what's available and decide what to add

    for (const pub of newPublications) {
      const pubType = detectFrequencyType(pub.printFrequency);
      const inventoryItems: any[] = [];

      // Helper to extract inventory from a channel
      const extractFromChannel = (channelName: string, channelData: any, path: string, itemFrequencyString?: string, sourceInfo?: any) => {
        // No channel filter - extract all available inventory
        
        const channelMetrics = {
          ...sourceInfo?.websiteMetrics,
          ...sourceInfo?.newsletterMetrics,
          ...sourceInfo?.printMetrics,
          ...sourceInfo?.socialMetrics,
          ...sourceInfo?.radioMetrics,
          ...sourceInfo?.podcastMetrics
        };
        
        const opportunities = Array.isArray(channelData) 
          ? channelData.flatMap((item: any) => item.advertisingOpportunities || [])
          : channelData?.advertisingOpportunities || [];

        if (opportunities.length > 0) {
          console.log(`    [${channelName}] Found ${opportunities.length} opportunities`);
        }

        opportunities.forEach((opp: any, idx: number) => {
          const hubPricing = opp.hubPricing?.find((hp: any) => hp.hubId === hubId && hp.available);
          if (!hubPricing?.pricing) {
            // Debug: Log why this opportunity was skipped
            const hasHubPricing = opp.hubPricing?.length > 0;
            const matchingHub = opp.hubPricing?.find((hp: any) => hp.hubId === hubId);
            if (!hasHubPricing) {
              console.log(`      - "${opp.title || opp.name}": No hubPricing array`);
            } else if (!matchingHub) {
              console.log(`      - "${opp.title || opp.name}": No pricing for hub ${hubId}`);
            } else if (!matchingHub.available) {
              console.log(`      - "${opp.title || opp.name}": Not marked as available`);
            } else if (!matchingHub.pricing) {
              console.log(`      - "${opp.title || opp.name}": No pricing data`);
            }
            return;
          }

          const rawPricingTiers = Array.isArray(hubPricing.pricing) 
            ? hubPricing.pricing 
            : [hubPricing.pricing];
          
          // Keep only ONE tier per pricing MODEL
          const seenModels = new Set<string>();
          const pricingTiers = rawPricingTiers.filter((tier: any) => {
            const model = tier.pricingModel || 'flat';
            if (seenModels.has(model)) return false;
            seenModels.add(model);
            return true;
          });
          
          pricingTiers.forEach((pricing: any, tierIndex: number) => {
            const pricingModel = pricing.pricingModel || 'flat';
            
            // Extract price based on pricing model
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
            
            if (hubPrice === 0) return;

            // Determine frequency
            let frequency = 1;
            if (itemFrequencyString) {
              frequency = Math.round(inferOccurrencesFromFrequency(itemFrequencyString));
            } else {
              switch (pricingModel) {
                case 'per_week': frequency = 4; break;
                case 'per_day': frequency = 30; break;
                case 'per_spot': frequency = 22; break;
                case 'per_post': frequency = 4; break;
                case 'cpm':
                case 'cpv':
                case 'cpc': frequency = 100; break;
                default: frequency = 1;
              }
            }

            const tierSuffix = pricingTiers.length > 1 ? `-tier${tierIndex}` : '';
            const baseItemName = opp.title || opp.name || `${channelName} Ad`;
            const getPricingModelLabel = (model: string) => {
              const labels: Record<string, string> = {
                'flat': 'Monthly', 'monthly': 'Monthly', 'per_week': 'Weekly',
                'per_day': 'Daily', 'per_send': 'Per Send', 'per_spot': 'Per Spot', 'per_ad': 'Per Ad'
              };
              return labels[model] || model;
            };
            const itemName = pricingTiers.length > 1
              ? `${baseItemName} (${getPricingModelLabel(pricingModel)})`
              : baseItemName;

            const format = opp.format ? { ...opp.format } : {};

            // Detect item-level frequency type (use item's own frequency if available, fallback to publication)
            const itemPubType = itemFrequencyString 
              ? detectFrequencyType(itemFrequencyString)
              : pubType;

            const item: any = {
              channel: channelName,
              itemPath: `${path}[${idx}]${tierSuffix}`,
              itemName: itemName,
              quantity: frequency,
              currentFrequency: frequency,
              maxFrequency: itemPubType === 'daily' ? 30 : itemPubType === 'weekly' ? 4 : itemPubType === 'bi-weekly' ? 2 : 1,
              publicationFrequencyType: itemPubType,
              frequency: itemFrequencyString || pub.printFrequency,
              itemPricing: {
                standardPrice: hubPrice,
                hubPrice,
                pricingModel: pricingModel
              },
              format,
              audienceMetrics: Object.keys(channelMetrics).length > 0 ? channelMetrics : undefined,
              performanceMetrics: opp.performanceMetrics || undefined,
              isExcluded: false
            };

            if (sourceInfo?.sourceName) {
              item.sourceName = sourceInfo.sourceName;
            }

            inventoryItems.push(item);
          });
        });
      };

      // Extract from all channels
      if (pub.distributionChannels) {
        const dc = pub.distributionChannels;
        
        if (dc.website) {
          extractFromChannel('website', dc.website, 'distributionChannels.website.advertisingOpportunities', undefined, {
            websiteMetrics: { monthlyVisitors: dc.website.metrics?.monthlyVisitors, monthlyPageViews: dc.website.metrics?.monthlyPageViews }
          });
        }
        
        if (dc.newsletters && Array.isArray(dc.newsletters)) {
          dc.newsletters.forEach((newsletter: any, nlIdx: number) => {
            if (newsletter.advertisingOpportunities) {
              extractFromChannel('newsletter', [newsletter], `distributionChannels.newsletters[${nlIdx}].advertisingOpportunities`, newsletter.frequency, {
                sourceName: newsletter.name || 'Newsletter',
                newsletterMetrics: { subscribers: newsletter.subscribers, openRate: newsletter.openRate }
              });
            }
          });
        }
        
        if (dc.print) {
          const printPubs = Array.isArray(dc.print) ? dc.print : [dc.print];
          printPubs.forEach((printPub: any, printIdx: number) => {
            if (printPub.advertisingOpportunities) {
              extractFromChannel('print', [printPub], `distributionChannels.print[${printIdx}].advertisingOpportunities`, printPub.frequency || pub.printFrequency, {
                sourceName: printPub.section || pub.basicInfo?.publicationName || 'Print',
                printMetrics: { circulation: printPub.circulation }
              });
            }
          });
        }
        
        if (dc.socialMedia && Array.isArray(dc.socialMedia)) {
          dc.socialMedia.forEach((socialAd: any, socialIdx: number) => {
            if (socialAd.advertisingOpportunities) {
              extractFromChannel('social', [socialAd], `distributionChannels.socialMedia[${socialIdx}].advertisingOpportunities`, socialAd.frequency, {
                sourceName: socialAd.platform || 'Social Media'
              });
            }
          });
        }
        
        if (dc.radio && Array.isArray(dc.radio)) {
          dc.radio.forEach((radioStation: any, radioIdx: number) => {
            if (radioStation.advertisingOpportunities) {
              extractFromChannel('radio', [radioStation], `distributionChannels.radio[${radioIdx}].advertisingOpportunities`, radioStation.frequency, {
                sourceName: radioStation.stationName || radioStation.name || 'Radio'
              });
            }
          });
        }
        
        if (dc.podcasts && Array.isArray(dc.podcasts)) {
          dc.podcasts.forEach((podcast: any, podIdx: number) => {
            if (podcast.advertisingOpportunities) {
              extractFromChannel('podcast', [podcast], `distributionChannels.podcasts[${podIdx}].advertisingOpportunities`, podcast.frequency, {
                sourceName: podcast.podcastName || podcast.name || 'Podcast'
              });
            }
          });
        }
        
        if (dc.streaming && Array.isArray(dc.streaming)) {
          dc.streaming.forEach((stream: any, streamIdx: number) => {
            if (stream.advertisingOpportunities) {
              extractFromChannel('streaming', [stream], `distributionChannels.streaming[${streamIdx}].advertisingOpportunities`, stream.frequency, {
                sourceName: stream.name || 'Streaming'
              });
            }
          });
        }
        
        if (dc.events && Array.isArray(dc.events)) {
          dc.events.forEach((event: any, eventIdx: number) => {
            if (event.advertisingOpportunities) {
              extractFromChannel('events', [event], `distributionChannels.events[${eventIdx}].advertisingOpportunities`, event.frequency, {
                sourceName: event.name || 'Event'
              });
            }
          });
        }
      }

      // Only include publications with matching inventory
      if (inventoryItems.length > 0) {
        const pubTotal = inventoryItems
          .filter((item: any) => !item.isExcluded)
          .reduce((sum: number, item: any) => {
            const cost = calculateItemCost(item, item.currentFrequency || item.quantity || 1);
            return sum + cost;
          }, 0);

        // Ensure publicationId is a number (schema expects number)
        const pubIdRaw = pub.publicationId;
        const publicationId = typeof pubIdRaw === 'number' ? pubIdRaw : parseInt(pubIdRaw, 10);

        processedPublications.push({
          publicationId: isNaN(publicationId) ? pubIdRaw : publicationId,
          publicationName: pub.basicInfo?.publicationName || pub.publicationName || 'Unknown Publication',
          inventoryItems,
          publicationTotal: pubTotal,
          publicationFrequencyType: pubType,
          isNew: true // Mark as new for UI highlighting
        });
      }
    }

    res.json({
      publications: processedPublications,
      count: processedPublications.length,
      message: processedPublications.length > 0 
        ? `Found ${processedPublications.length} new publication(s) with matching inventory`
        : 'No new publications with matching inventory found'
    });

  } catch (error) {
    console.error('Error finding new publications:', error);
    res.status(500).json({ 
      error: 'Failed to find new publications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

