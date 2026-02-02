import { Router, Response } from 'express';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { userProfilesService, leadInquiriesService, leadNotesService } from '../../src/integrations/mongodb/allServices';
import { hubPackagesService } from '../../src/integrations/mongodb/hubPackageService';
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';
import { authenticateToken } from '../middleware/authenticate';
import { calculateRevenue, inferOccurrencesFromFrequency } from '../../src/utils/pricingCalculations';

const router = Router();

/**
 * Admin Routes
 * 
 * Admin and hub-user endpoints for managing users, leads, surveys, packages, and algorithm configurations.
 */

// Helper function to check if user is admin
function isUserAdmin(user: any): boolean {
  return user.isAdmin === true || user.role === 'admin';
}

// Helper function to check if user has access to a hub
function canAccessHub(user: any, hubId: string): boolean {
  if (isUserAdmin(user)) return true;
  const assignedHubIds = user.permissions?.assignedHubIds || [];
  return assignedHubIds.includes(hubId);
}

// Helper function to check if user can access a lead (via hub OR publication)
async function canAccessLead(user: any, lead: { hubId?: string; publicationId?: string }): Promise<boolean> {
  if (isUserAdmin(user)) return true;
  
  // Check hub access if lead has hubId
  if (lead.hubId && canAccessHub(user, lead.hubId)) {
    return true;
  }
  
  // Check publication access if lead has publicationId
  if (lead.publicationId) {
    const hasPublicationAccess = await permissionsService.canAccessPublication(user.id, lead.publicationId);
    if (hasPublicationAccess) {
      return true;
    }
  }
  
  return false;
}

// ===== DASHBOARD STATS =====

// Get dashboard statistics (admin or hub user)
router.get('/dashboard-stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.query;
    
    // Check permissions
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    if (!isAdmin) {
      // Non-admin users must have hub access
      if (!hubId) {
        return res.status(400).json({ error: 'hubId parameter is required for non-admin users' });
      }
      
      // Check if user has access to the requested hub
      if (!assignedHubIds.includes(hubId)) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this hub.' });
      }
    }
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const leadsCollection = db.collection(COLLECTIONS.LEAD_INQUIRIES);
    const packagesCollection = db.collection(COLLECTIONS.HUB_PACKAGES);
    const filesCollection = db.collection(COLLECTIONS.PUBLICATION_FILES);
    
    // Build query filter based on hubId
    const filter = hubId ? { hubIds: hubId } : {};
    
    // Fetch publications matching the filter
    const publications = await publicationsCollection.find(filter).toArray();
    
    // Count leads for this hub
    const leadsCount = await leadsCollection.countDocuments(
      hubId ? { hubId } : {}
    );
    
    // Count packages for this hub
    const packagesCount = await packagesCollection.countDocuments(
      hubId ? { hubId } : {}
    );
    
    // Count publication files
    const filesCount = await filesCollection.countDocuments(
      hubId ? { publicationId: { $in: publications.map(p => String(p.publicationId)) } } : {}
    );
    
    // Count orders with unread messages (publication messages newer than lastViewedByHub)
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    // Use aggregation to properly compare message timestamps with lastViewedByHub
    const unreadMessagesResult = await ordersCollection.aggregate([
      {
        $match: {
          ...(hubId ? { hubId } : {}),
          deletedAt: { $exists: false },
          'messages.sender': 'publication' // Has at least one message from a publication
        }
      },
      {
        $addFields: {
          // Get the latest publication message timestamp
          latestPubMessageTime: {
            $max: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ['$messages', []] },
                    as: 'msg',
                    cond: { $eq: ['$$msg.sender', 'publication'] }
                  }
                },
                as: 'pubMsg',
                in: '$$pubMsg.timestamp'
              }
            }
          }
        }
      },
      {
        $match: {
          $expr: {
            $or: [
              // No lastViewedByHub means unread
              { $eq: [{ $ifNull: ['$lastViewedByHub', null] }, null] },
              // Or latest pub message is newer than lastViewedByHub
              { $gt: ['$latestPubMessageTime', '$lastViewedByHub'] }
            ]
          }
        }
      },
      {
        $count: 'count'
      }
    ]).toArray();
    
    const ordersWithUnreadMessages = unreadMessagesResult[0]?.count || 0;
    
    // Initialize counters
    let adInventoryCount = 0;
    const inventoryByType = {
      website: 0,
      newsletter: 0,
      print: 0,
      events: 0,
      social: 0,
      crossChannel: 0,
      podcasts: 0,
      streamingVideo: 0,
      radioStations: 0
    };
    
    const publicationsByType = { daily: 0, weekly: 0, monthly: 0, other: 0 };
    const geographicCoverage = { local: 0, regional: 0, state: 0, national: 0, international: 0 };
    const contentTypes = { news: 0, lifestyle: 0, business: 0, entertainment: 0, sports: 0, alternative: 0, mixed: 0 };
    
    const audienceMetrics = {
      totalWebsiteVisitors: 0,
      totalNewsletterSubscribers: 0,
      totalPrintCirculation: 0,
      totalSocialFollowers: 0,
      totalPodcastListeners: 0,
      totalStreamingSubscribers: 0,
      totalRadioListeners: 0,
      averageEngagementRate: 0
    };
    
    // Pricing data collectors - separate standard and hub pricing
    const standardPricing = {
      websiteAdPrices: [] as number[],
      newsletterAdPrices: [] as number[],
      printAdPrices: [] as number[],
      podcastAdPrices: [] as number[],
      streamingAdPrices: [] as number[],
      radioAdPrices: [] as number[],
      totalValue: 0
    };
    
    const hubPricing = {
      websiteAdPrices: [] as number[],
      newsletterAdPrices: [] as number[],
      printAdPrices: [] as number[],
      podcastAdPrices: [] as number[],
      streamingAdPrices: [] as number[],
      radioAdPrices: [] as number[],
      totalValue: 0
    };
    
    // Process each publication
    publications.forEach((pub: any) => {
      // Count by publication type
      const pubType = pub.basicInfo?.publicationType?.toLowerCase() || 'other';
      if (publicationsByType[pubType as keyof typeof publicationsByType] !== undefined) {
        publicationsByType[pubType as keyof typeof publicationsByType]++;
      } else {
        publicationsByType.other++;
      }
      
      // Count by geographic coverage
      const geoCoverage = pub.basicInfo?.geographicCoverage?.toLowerCase() || 'local';
      if (geographicCoverage[geoCoverage as keyof typeof geographicCoverage] !== undefined) {
        geographicCoverage[geoCoverage as keyof typeof geographicCoverage]++;
      }
      
      // Count by content type
      const contentType = pub.basicInfo?.contentType?.toLowerCase() || 'mixed';
      if (contentTypes[contentType as keyof typeof contentTypes] !== undefined) {
        contentTypes[contentType as keyof typeof contentTypes]++;
      } else {
        contentTypes.mixed++;
      }
      
      // Count inventory by channel and calculate pricing
      const channels = pub.distributionChannels || {};
      
      // Website
      if (channels.website?.advertisingOpportunities) {
        const opportunities = channels.website.advertisingOpportunities;
        inventoryByType.website += opportunities.length;
        adInventoryCount += opportunities.length;
        audienceMetrics.totalWebsiteVisitors += channels.website.metrics?.monthlyVisitors || 0;
        
        // Calculate monthly revenue using established pricing formula
        opportunities.forEach((ad: any) => {
          // Standard monthly revenue
          const standardRevenue = calculateRevenue(ad, 'month');
          if (standardRevenue > 0) {
            standardPricing.websiteAdPrices.push(standardRevenue);
            standardPricing.totalValue += standardRevenue;
          }
          
          // Hub-specific monthly revenue
          if (hubId && ad.hubPricing) {
            const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
            if (hubPriceObj?.pricing) {
              // Create ad with hub pricing substituted
              const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
              const hubRevenue = calculateRevenue(adWithHubPricing, 'month');
              if (hubRevenue > 0) {
                hubPricing.websiteAdPrices.push(hubRevenue);
                hubPricing.totalValue += hubRevenue;
              }
            }
          }
        });
      }
      
      // Newsletters
      if (channels.newsletters) {
        channels.newsletters.forEach((nl: any) => {
          if (nl.advertisingOpportunities) {
            const opportunities = nl.advertisingOpportunities;
            inventoryByType.newsletter += opportunities.length;
            adInventoryCount += opportunities.length;
            
            // Calculate monthly revenue using established pricing formula
            opportunities.forEach((ad: any) => {
              // Standard monthly revenue (pass newsletter frequency)
              const standardRevenue = calculateRevenue(ad, 'month', nl.frequency);
              if (standardRevenue > 0) {
                standardPricing.newsletterAdPrices.push(standardRevenue);
                standardPricing.totalValue += standardRevenue;
              }
              
              // Hub-specific monthly revenue
              if (hubId && ad.hubPricing) {
                const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                if (hubPriceObj?.pricing) {
                  const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
                  const hubRevenue = calculateRevenue(adWithHubPricing, 'month', nl.frequency);
                  if (hubRevenue > 0) {
                    hubPricing.newsletterAdPrices.push(hubRevenue);
                    hubPricing.totalValue += hubRevenue;
                  }
                }
              }
            });
          }
          audienceMetrics.totalNewsletterSubscribers += nl.subscribers || 0;
        });
      }
      
      // Print
      if (channels.print) {
        channels.print.forEach((pr: any) => {
          if (pr.advertisingOpportunities) {
            const opportunities = pr.advertisingOpportunities.length;
            inventoryByType.print += opportunities;
            adInventoryCount += opportunities;
            
            // Calculate monthly revenue using established pricing formula
            pr.advertisingOpportunities.forEach((ad: any) => {
              // Standard monthly revenue (pass print frequency)
              const standardRevenue = calculateRevenue(ad, 'month', pr.frequency);
              if (standardRevenue > 0) {
                standardPricing.printAdPrices.push(standardRevenue);
                standardPricing.totalValue += standardRevenue;
              }
              
              // Hub-specific monthly revenue
              if (hubId && ad.hubPricing) {
                const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                if (hubPriceObj?.pricing) {
                  const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
                  const hubRevenue = calculateRevenue(adWithHubPricing, 'month', pr.frequency);
                  if (hubRevenue > 0) {
                    hubPricing.printAdPrices.push(hubRevenue);
                    hubPricing.totalValue += hubRevenue;
                  }
                }
              }
            });
          }
          audienceMetrics.totalPrintCirculation += pr.circulation || 0;
        });
      }
      
      // Events (typically flat-rate annual)
      if (channels.events) {
        channels.events.forEach((ev: any) => {
          if (ev.advertisingOpportunities) {
            inventoryByType.events += ev.advertisingOpportunities.length;
            adInventoryCount += ev.advertisingOpportunities.length;
          }
        });
      }
      
      // Social Media
      if (channels.socialMedia) {
        channels.socialMedia.forEach((sm: any) => {
          if (sm.advertisingOpportunities) {
            inventoryByType.social += sm.advertisingOpportunities.length;
            adInventoryCount += sm.advertisingOpportunities.length;
          }
          audienceMetrics.totalSocialFollowers += sm.metrics?.followers || 0;
        });
      }
      
      // Podcasts
      if (channels.podcasts) {
        channels.podcasts.forEach((pc: any) => {
          if (pc.advertisingOpportunities) {
            const opportunities = pc.advertisingOpportunities;
            inventoryByType.podcasts += opportunities.length;
            adInventoryCount += opportunities.length;
            
            // Calculate monthly revenue using established pricing formula
            opportunities.forEach((ad: any) => {
              // Standard monthly revenue (pass podcast frequency)
              const standardRevenue = calculateRevenue(ad, 'month', pc.frequency);
              if (standardRevenue > 0) {
                standardPricing.podcastAdPrices.push(standardRevenue);
                standardPricing.totalValue += standardRevenue;
              }
              
              // Hub-specific monthly revenue
              if (hubId && ad.hubPricing) {
                const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                if (hubPriceObj?.pricing) {
                  const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
                  const hubRevenue = calculateRevenue(adWithHubPricing, 'month', pc.frequency);
                  if (hubRevenue > 0) {
                    hubPricing.podcastAdPrices.push(hubRevenue);
                    hubPricing.totalValue += hubRevenue;
                  }
                }
              }
            });
          }
          audienceMetrics.totalPodcastListeners += pc.averageListeners || 0;
        });
      }
      
      // Streaming Video
      if (channels.streamingVideo) {
        channels.streamingVideo.forEach((sv: any) => {
          if (sv.advertisingOpportunities) {
            const opportunities = sv.advertisingOpportunities;
            inventoryByType.streamingVideo += opportunities.length;
            adInventoryCount += opportunities.length;
            
            // Calculate monthly revenue using established pricing formula
            opportunities.forEach((ad: any) => {
              // For CPV pricing, ensure performanceMetrics are present
              // Calculate impressions from frequency and views if not already set
              let adWithMetrics = ad;
              if (!ad.performanceMetrics?.impressionsPerMonth && sv.averageViews && sv.frequency) {
                const occurrencesPerMonth = inferOccurrencesFromFrequency(sv.frequency);
                const spotsPerShow = ad.spotsPerShow || 1;
                adWithMetrics = {
                  ...ad,
                  performanceMetrics: {
                    impressionsPerMonth: sv.averageViews * occurrencesPerMonth * spotsPerShow,
                    occurrencesPerMonth: occurrencesPerMonth * spotsPerShow,
                    audienceSize: sv.subscribers || sv.averageViews || 0
                  }
                };
              }
              
              // Standard monthly revenue (pass streaming frequency)
              const standardRevenue = calculateRevenue(adWithMetrics, 'month', sv.frequency);
              if (standardRevenue > 0) {
                standardPricing.streamingAdPrices.push(standardRevenue);
                standardPricing.totalValue += standardRevenue;
              }
              
              // Hub-specific monthly revenue
              if (hubId && ad.hubPricing) {
                const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                if (hubPriceObj?.pricing) {
                  const adWithHubPricing = { ...adWithMetrics, pricing: hubPriceObj.pricing };
                  const hubRevenue = calculateRevenue(adWithHubPricing, 'month', sv.frequency);
                  if (hubRevenue > 0) {
                    hubPricing.streamingAdPrices.push(hubRevenue);
                    hubPricing.totalValue += hubRevenue;
                  }
                }
              }
            });
          }
          audienceMetrics.totalStreamingSubscribers += sv.subscribers || 0;
        });
      }
      
      // Radio Stations & Shows
      if (channels.radioStations) {
        channels.radioStations.forEach((rs: any) => {
          // Process shows if they exist
          if (rs.shows) {
            rs.shows.forEach((show: any) => {
              if (show.advertisingOpportunities) {
                const opportunities = show.advertisingOpportunities;
                inventoryByType.radioStations += opportunities.length;
                adInventoryCount += opportunities.length;
                
                // Calculate monthly revenue using established pricing formula (pass show frequency)
                opportunities.forEach((ad: any) => {
                  // Standard monthly revenue
                  const standardRevenue = calculateRevenue(ad, 'month', show.frequency);
                  if (standardRevenue > 0) {
                    standardPricing.radioAdPrices.push(standardRevenue);
                    standardPricing.totalValue += standardRevenue;
                  }
                  
                  // Hub-specific monthly revenue
                  if (hubId && ad.hubPricing) {
                    const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                    if (hubPriceObj?.pricing) {
                      const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
                      const hubRevenue = calculateRevenue(adWithHubPricing, 'month', show.frequency);
                      if (hubRevenue > 0) {
                        hubPricing.radioAdPrices.push(hubRevenue);
                        hubPricing.totalValue += hubRevenue;
                      }
                    }
                  }
                });
              }
            });
          }
          // Also process station-level opportunities
          else if (rs.advertisingOpportunities) {
            const opportunities = rs.advertisingOpportunities;
            inventoryByType.radioStations += opportunities.length;
            adInventoryCount += opportunities.length;
            
            // Calculate monthly revenue using established pricing formula
            opportunities.forEach((ad: any) => {
              // Standard monthly revenue
              const standardRevenue = calculateRevenue(ad, 'month');
              if (standardRevenue > 0) {
                standardPricing.radioAdPrices.push(standardRevenue);
                standardPricing.totalValue += standardRevenue;
              }
              
              // Hub-specific monthly revenue
              if (hubId && ad.hubPricing) {
                const hubPriceObj = ad.hubPricing.find((hp: any) => hp.hubId === hubId);
                if (hubPriceObj?.pricing) {
                  const adWithHubPricing = { ...ad, pricing: hubPriceObj.pricing };
                  const hubRevenue = calculateRevenue(adWithHubPricing, 'month');
                  if (hubRevenue > 0) {
                    hubPricing.radioAdPrices.push(hubRevenue);
                    hubPricing.totalValue += hubRevenue;
                  }
                }
              }
            });
          }
          audienceMetrics.totalRadioListeners += rs.listeners || 0;
        });
      }
      
      // Cross-channel packages
      if (pub.crossChannelPackages) {
        inventoryByType.crossChannel += pub.crossChannelPackages.length;
        adInventoryCount += pub.crossChannelPackages.length;
      }
    });
    
    // === PRICING ANALYTICS COLLECTION ===
    // Data structure: { channel: { pricingModel: { prices: [], costPerReach: [], audienceSizes: [] } } }
    interface PricingDataPoint {
      price: number;
      audienceSize: number;
    }
    
    const pricingAnalyticsData: Record<string, Record<string, PricingDataPoint[]>> = {
      website: {},
      newsletter: {},
      print: {},
      podcast: {},
      radio: {},
      streaming: {}
    };
    
    // Process publications again for detailed analytics
    publications.forEach((pub: any) => {
      const channels = pub.distributionChannels || {};
      
      // Website
      if (channels.website?.advertisingOpportunities) {
        const monthlyVisitors = channels.website.metrics?.monthlyVisitors || 0;
        channels.website.advertisingOpportunities.forEach((ad: any) => {
          const pricingModel = ad.pricing?.pricingModel || 'unknown';
          
          // For CPM/CPV models, use the raw rate; for others, use calculated monthly revenue
          let price: number;
          if (pricingModel.toLowerCase() === 'cpm' || pricingModel.toLowerCase() === 'cpv') {
            price = ad.pricing?.flatRate || 0; // Raw CPM/CPV rate
          } else {
            price = calculateRevenue(ad, 'month'); // Calculated monthly revenue
          }
          
          if (price > 0) {
            if (!pricingAnalyticsData.website[pricingModel]) {
              pricingAnalyticsData.website[pricingModel] = [];
            }
            pricingAnalyticsData.website[pricingModel].push({
              price: price,
              audienceSize: monthlyVisitors
            });
          }
        });
      }
      
      // Newsletters
      if (channels.newsletters) {
        channels.newsletters.forEach((nl: any) => {
          const subscribers = nl.subscribers || 0;
          if (nl.advertisingOpportunities) {
            nl.advertisingOpportunities.forEach((ad: any) => {
              const pricingModel = ad.pricing?.pricingModel || 'unknown';
              
              // For CPM models, use raw rate; for others, use calculated monthly revenue
              let price: number;
              if (pricingModel.toLowerCase() === 'cpm') {
                price = ad.pricing?.flatRate || 0;
              } else {
                price = calculateRevenue(ad, 'month', nl.frequency);
              }
              
              if (price > 0) {
                if (!pricingAnalyticsData.newsletter[pricingModel]) {
                  pricingAnalyticsData.newsletter[pricingModel] = [];
                }
                pricingAnalyticsData.newsletter[pricingModel].push({
                  price: price,
                  audienceSize: subscribers
                });
              }
            });
          }
        });
      }
      
      // Print
      if (channels.print) {
        channels.print.forEach((pr: any) => {
          const circulation = pr.circulation || 0;
          if (pr.advertisingOpportunities) {
            pr.advertisingOpportunities.forEach((ad: any) => {
              const pricingModel = ad.pricing?.pricingModel || 'unknown';
              
              // For CPM models, use raw rate; for others, use calculated monthly revenue
              let price: number;
              if (pricingModel.toLowerCase() === 'cpm') {
                price = ad.pricing?.flatRate || 0;
              } else {
                price = calculateRevenue(ad, 'month', pr.frequency);
              }
              
              if (price > 0) {
                if (!pricingAnalyticsData.print[pricingModel]) {
                  pricingAnalyticsData.print[pricingModel] = [];
                }
                pricingAnalyticsData.print[pricingModel].push({
                  price: price,
                  audienceSize: circulation
                });
              }
            });
          }
        });
      }
      
      // Podcasts
      if (channels.podcasts) {
        channels.podcasts.forEach((pc: any) => {
          const listeners = pc.averageListeners || 0;
          if (pc.advertisingOpportunities) {
            pc.advertisingOpportunities.forEach((ad: any) => {
              const pricingModel = ad.pricing?.pricingModel || 'unknown';
              
              // For CPM/CPD models, use raw rate; for others, use calculated monthly revenue
              let price: number;
              if (pricingModel.toLowerCase() === 'cpm' || pricingModel.toLowerCase() === 'cpd') {
                price = ad.pricing?.flatRate || 0;
              } else {
                price = calculateRevenue(ad, 'month', pc.frequency);
              }
              
              if (price > 0) {
                if (!pricingAnalyticsData.podcast[pricingModel]) {
                  pricingAnalyticsData.podcast[pricingModel] = [];
                }
                pricingAnalyticsData.podcast[pricingModel].push({
                  price: price,
                  audienceSize: listeners
                });
              }
            });
          }
        });
      }
      
      // Radio
      if (channels.radioStations) {
        channels.radioStations.forEach((rs: any) => {
          const listeners = rs.listeners || 0;
          
          // Process shows
          if (rs.shows) {
            rs.shows.forEach((show: any) => {
              if (show.advertisingOpportunities) {
                show.advertisingOpportunities.forEach((ad: any) => {
                  const pricingModel = ad.pricing?.pricingModel || 'unknown';
                  
                  // For CPM models, use raw rate; for others, use calculated monthly revenue
                  let price: number;
                  if (pricingModel.toLowerCase() === 'cpm') {
                    price = ad.pricing?.flatRate || 0;
                  } else {
                    price = calculateRevenue(ad, 'month', show.frequency);
                  }
                  
                  if (price > 0) {
                    if (!pricingAnalyticsData.radio[pricingModel]) {
                      pricingAnalyticsData.radio[pricingModel] = [];
                    }
                    pricingAnalyticsData.radio[pricingModel].push({
                      price: price,
                      audienceSize: listeners
                    });
                  }
                });
              }
            });
          }
          // Station-level opportunities
          else if (rs.advertisingOpportunities) {
            rs.advertisingOpportunities.forEach((ad: any) => {
              const pricingModel = ad.pricing?.pricingModel || 'unknown';
              
              // For CPM models, use raw rate; for others, use calculated monthly revenue
              let price: number;
              if (pricingModel.toLowerCase() === 'cpm') {
                price = ad.pricing?.flatRate || 0;
              } else {
                price = calculateRevenue(ad, 'month');
              }
              
              if (price > 0) {
                if (!pricingAnalyticsData.radio[pricingModel]) {
                  pricingAnalyticsData.radio[pricingModel] = [];
                }
                pricingAnalyticsData.radio[pricingModel].push({
                  price: price,
                  audienceSize: listeners
                });
              }
            });
          }
        });
      }
      
      // Streaming Video
      if (channels.streamingVideo) {
        channels.streamingVideo.forEach((sv: any) => {
          const subscribers = sv.subscribers || sv.averageViews || 0;
          if (sv.advertisingOpportunities) {
            sv.advertisingOpportunities.forEach((ad: any) => {
              const pricingModel = ad.pricing?.pricingModel || 'unknown';
              
              // For CPM/CPV models, use raw rate; for others, use calculated monthly revenue
              let price: number;
              if (pricingModel.toLowerCase() === 'cpm' || pricingModel.toLowerCase() === 'cpv') {
                price = ad.pricing?.flatRate || 0;
              } else {
                // Add metrics if needed for calculations
                let adWithMetrics = ad;
                if (!ad.performanceMetrics?.impressionsPerMonth && sv.averageViews && sv.frequency) {
                  const occurrencesPerMonth = inferOccurrencesFromFrequency(sv.frequency);
                  const spotsPerShow = ad.spotsPerShow || 1;
                  adWithMetrics = {
                    ...ad,
                    performanceMetrics: {
                      impressionsPerMonth: sv.averageViews * occurrencesPerMonth * spotsPerShow,
                      occurrencesPerMonth: occurrencesPerMonth * spotsPerShow,
                      audienceSize: subscribers
                    }
                  };
                }
                price = calculateRevenue(adWithMetrics, 'month', sv.frequency);
              }
              
              if (price > 0) {
                if (!pricingAnalyticsData.streaming[pricingModel]) {
                  pricingAnalyticsData.streaming[pricingModel] = [];
                }
                pricingAnalyticsData.streaming[pricingModel].push({
                  price: price,
                  audienceSize: subscribers
                });
              }
            });
          }
        });
      }
    });
    
    // Helper to calculate totals
    const calculateTotal = (prices: number[]) => 
      prices.length > 0 ? Math.round(prices.reduce((sum, price) => sum + price, 0)) : 0;
    
    const calculateAverage = (prices: number[]) => 
      prices.length > 0 ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
    
    // Statistical helper functions
    const calculateMedian = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    };
    
    const calculateStdDev = (values: number[]): number => {
      if (values.length === 0) return 0;
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
      return Math.sqrt(variance);
    };
    
    const calculateStats = (values: number[]) => {
      if (values.length === 0) {
        return { avg: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
      }
      return {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        median: calculateMedian(values),
        stdDev: calculateStdDev(values),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    };
    
    // Build pricing analytics from collected data
    const pricingAnalytics: Record<string, any> = {};
    
    // Pricing models that are already normalized (don't need audience division)
    const alreadyNormalizedModels = ['cpm', 'cpv', 'cpd', 'cpc'];
    
    Object.keys(pricingAnalyticsData).forEach(channel => {
      pricingAnalytics[channel] = {};
      
      Object.keys(pricingAnalyticsData[channel]).forEach(model => {
        const dataPoints = pricingAnalyticsData[channel][model];
        
        if (dataPoints.length > 0) {
          // For unit economics, calculate price per 1000 audience for each data point
          // This gives us comparable metrics regardless of audience size
          const isAlreadyNormalized = alreadyNormalizedModels.includes(model.toLowerCase());
          
          let unitPrices: number[] = [];
          let totalPrices: number[] = [];
          
          if (isAlreadyNormalized) {
            // CPM/CPV models: the price IS the unit price (already per 1000/per view)
            // Don't normalize again!
            unitPrices = dataPoints.map(dp => dp.price);
            // For total price, we need to calculate estimated monthly revenue
            // But we don't have impressions here, so show N/A or the rate itself
            totalPrices = []; // No meaningful total for CPM without impression data
          } else {
            // Other models: calculate unit price (cost per 1000 audience)
            dataPoints.forEach(dp => {
              totalPrices.push(dp.price); // This is monthly revenue
              if (dp.audienceSize > 0) {
                const unitPrice = (dp.price / dp.audienceSize) * 1000;
                unitPrices.push(unitPrice);
              }
            });
          }
          
          // Calculate audience size statistics
          const audienceSizes = dataPoints
            .filter(dp => dp.audienceSize > 0)
            .map(dp => dp.audienceSize);
          
          pricingAnalytics[channel][model] = {
            // Unit economics (price per 1000 audience) - PRIMARY METRIC
            unitPrice: calculateStats(unitPrices),
            // Total monthly prices (for reference)
            totalPrice: calculateStats(totalPrices),
            // Audience sizes
            audienceSize: calculateStats(audienceSizes),
            sampleSize: dataPoints.length,
            isAlreadyNormalized
          };
        }
      });
    });
    
    // Standard pricing insights (Default Potential)
    const pricingInsights = {
      // Averages
      averageWebsiteAdPrice: calculateAverage(standardPricing.websiteAdPrices),
      averageNewsletterAdPrice: calculateAverage(standardPricing.newsletterAdPrices),
      averagePrintAdPrice: calculateAverage(standardPricing.printAdPrices),
      averagePodcastAdPrice: calculateAverage(standardPricing.podcastAdPrices),
      averageStreamingAdPrice: calculateAverage(standardPricing.streamingAdPrices),
      averageRadioAdPrice: calculateAverage(standardPricing.radioAdPrices),
      // Totals for each channel (for dashboard display)
      totalWebsiteAdValue: calculateTotal(standardPricing.websiteAdPrices),
      totalNewsletterAdValue: calculateTotal(standardPricing.newsletterAdPrices),
      totalPrintAdValue: calculateTotal(standardPricing.printAdPrices),
      totalPodcastAdValue: calculateTotal(standardPricing.podcastAdPrices),
      totalStreamingAdValue: calculateTotal(standardPricing.streamingAdPrices),
      totalRadioAdValue: calculateTotal(standardPricing.radioAdPrices),
      totalInventoryValue: Math.round(standardPricing.totalValue),
      inventoryCount: adInventoryCount
    };
    
    // Build hub-specific pricing insights (Hub Potential)
    const hubPricingInsights: Record<string, any> = {};
    
    if (hubId) {
      hubPricingInsights[hubId as string] = {
        totalWebsiteAdValue: calculateTotal(hubPricing.websiteAdPrices),
        totalNewsletterAdValue: calculateTotal(hubPricing.newsletterAdPrices),
        totalPrintAdValue: calculateTotal(hubPricing.printAdPrices),
        totalPodcastAdValue: calculateTotal(hubPricing.podcastAdPrices),
        totalStreamingAdValue: calculateTotal(hubPricing.streamingAdPrices),
        totalRadioAdValue: calculateTotal(hubPricing.radioAdPrices),
        totalInventoryValue: Math.round(hubPricing.totalValue),
        inventoryCount: adInventoryCount
      };
    }
    
    const stats = {
      leads: leadsCount,
      publications: publications.length,
      adInventory: adInventoryCount,
      conversations: 0, // Placeholder for AI chat conversations
      unreadMessages: ordersWithUnreadMessages, // Orders with messages from publications
      packages: packagesCount,
      publicationFiles: filesCount,
      inventoryByType,
      publicationsByType,
      geographicCoverage,
      contentTypes,
      audienceMetrics,
      pricingInsights,
      hubPricingInsights,
      pricingAnalytics
    };
    
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

// ===== USER MANAGEMENT =====

// Get all users (admin only)
router.get('/users', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = getDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);
    
    // Get all users
    const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    // Enhance with profile data
    const enrichedUsers = await Promise.all(
      users.map(async (user: any) => {
        const profile = await profilesCollection.findOne({ userId: user._id.toString() });
        
        return {
          userId: user._id.toString(),
          _id: user._id.toString(),
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          companyName: user.companyName || '',
          isAdmin: profile?.isAdmin || false,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Include extended profile data if available
          ...( profile && {
            jobTitle: profile.jobTitle,
            industry: profile.industry,
            companySize: profile.companySize,
            phoneNumber: profile.phoneNumber,
            linkedInUrl: profile.linkedInUrl,
            websiteUrl: profile.websiteUrl,
            targetAudience: profile.targetAudience,
            marketingGoals: profile.marketingGoals,
            profileCompletionScore: profile.profileCompletionScore
          })
        };
      })
    );
    
    res.json({ users: enrichedUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user admin status (admin only)
router.put('/users/:userId/admin', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId } = req.params;
    const { isAdmin } = req.body;
    
    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'isAdmin must be a boolean' });
    }
    
    // Update in user profiles collection
    const profile = await userProfilesService.getByUserId(userId);
    
    if (!profile) {
      // Create profile if it doesn't exist
      await userProfilesService.create({
        userId,
        isAdmin,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompletionScore: 0
      });
    } else {
      await userProfilesService.update(userId, { isAdmin });
    }
    
    // Get updated profile
    const updatedProfile = await userProfilesService.getByUserId(userId);
    
    res.json({
      success: true,
      profile: updatedProfile,
      message: isAdmin ? 'Admin privileges granted' : 'Admin privileges revoked'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// ===== LEAD MANAGEMENT =====

// Get all leads with filtering (admin or hub user or publication user)
router.get('/leads', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId, publicationId, status, leadSource, includeArchived } = req.query;
    
    // Check permissions
    if (!isUserAdmin(req.user)) {
      // Non-admin users must provide hubId OR publicationId and have access to it
      if (!hubId && !publicationId) {
        return res.status(400).json({ error: 'hubId or publicationId parameter is required for non-admin users' });
      }
      
      // If hubId provided, check hub access
      if (hubId && !canAccessHub(req.user, hubId as string)) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this hub.' });
      }
      
      // If publicationId provided (without hubId), check publication access
      if (publicationId && !hubId) {
        const hasPublicationAccess = await permissionsService.canAccessPublication(req.user.id, publicationId as string);
        if (!hasPublicationAccess) {
          return res.status(403).json({ error: 'Access denied. You do not have access to this publication.' });
        }
      }
    }
    
    const filters: any = {};
    if (hubId) filters.hubId = hubId;
    if (publicationId) filters.publicationId = publicationId;
    if (status) filters.status = status;
    if (leadSource) filters.leadSource = leadSource;
    if (includeArchived === 'true') filters.includeArchived = true;
    
    const leads = await leadInquiriesService.getAll(filters);
    res.json({ leads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead by ID (admin or hub user or publication user)
router.get('/leads/:leadId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    const lead = await leadInquiriesService.getById(leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create new lead (admin or hub user or publication user)
router.post('/leads', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, req.body);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to create leads for this hub or publication.' });
      }
    }
    
    const leadData = {
      ...req.body,
      userId: req.user.id
    };
    
    const lead = await leadInquiriesService.create(leadData);
    
    // Send lead notification email to admin
    try {
      const { emailService } = await import('../emailService');
      
      if (emailService && lead) {
        await emailService.sendLeadNotificationEmail({
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          contactPhone: lead.contactPhone,
          businessName: lead.businessName,
          websiteUrl: lead.websiteUrl,
          budgetRange: lead.budgetRange,
          timeline: lead.timeline,
          marketingGoals: lead.marketingGoals
        });
        
        console.log(`📧 Sent lead notification email for ${lead.businessName}`);
      }
    } catch (notifyError) {
      console.error('Error sending lead notification email:', notifyError);
      // Don't fail the request if email fails
    }
    
    res.status(201).json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead (admin or hub user or publication user)
router.put('/leads/:leadId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get existing lead to check permissions
    const existingLead = await leadInquiriesService.getById(leadId);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, existingLead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const lead = await leadInquiriesService.update(leadId, req.body);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Archive lead (admin or hub user or publication user)
router.put('/leads/:leadId/archive', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get existing lead to check permissions
    const existingLead = await leadInquiriesService.getById(leadId);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, existingLead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const lead = await leadInquiriesService.archive(leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive lead' });
  }
});

// Unarchive lead (admin or hub user or publication user)
router.put('/leads/:leadId/unarchive', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get existing lead to check permissions
    const existingLead = await leadInquiriesService.getById(leadId);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, existingLead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const lead = await leadInquiriesService.unarchive(leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unarchive lead' });
  }
});

// Get lead statistics (admin or hub user)
router.get('/leads-stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.query;
    
    // Check permissions
    if (!isUserAdmin(req.user)) {
      if (!hubId) {
        return res.status(400).json({ error: 'hubId parameter is required for non-admin users' });
      }
      if (!canAccessHub(req.user, hubId as string)) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this hub.' });
      }
    }
    
    const stats = await leadInquiriesService.getStats(hubId as string | undefined);
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

// Get all notes for a lead (admin or hub user or publication user)
router.get('/leads/:leadId/notes', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get lead to check permissions
    const lead = await leadInquiriesService.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const notes = await leadNotesService.getByLeadId(leadId);
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead notes' });
  }
});

// Get conversation history for a lead by sessionId (admin or hub user or publication user)
router.get('/leads/:leadId/conversation', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get lead to check permissions and get sessionId
    const lead = await leadInquiriesService.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    // Get sessionId from lead's conversationContext
    const sessionId = lead.conversationContext?.sessionId;
    if (!sessionId) {
      return res.status(404).json({ error: 'No conversation session found for this lead' });
    }
    
    // Fetch conversation from storefront_conversations collection
    const { getDatabase } = await import('../integrations/mongodb/client');
    const db = getDatabase();
    const conversation = await db.collection('storefront_conversations').findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Add a note to a lead (admin or hub user or publication user)
router.post('/leads/:leadId/notes', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get lead to check permissions
    const lead = await leadInquiriesService.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const noteData = {
      ...req.body,
      leadId,
      authorId: req.user.id,
      authorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
    };
    
    const note = await leadNotesService.create(noteData);
    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add lead note' });
  }
});

// Update a lead note (admin or hub user or publication user)
router.put('/leads/:leadId/notes/:noteId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get lead to check permissions
    const lead = await leadInquiriesService.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const { noteId } = req.params;
    const note = await leadNotesService.update(noteId, req.body);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead note' });
  }
});

// Delete a lead note (admin or hub user or publication user)
router.delete('/leads/:leadId/notes/:noteId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { leadId } = req.params;
    
    // Get lead to check permissions
    const lead = await leadInquiriesService.getById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check permissions - user needs access via hub OR publication
    if (!isUserAdmin(req.user)) {
      const hasAccess = await canAccessLead(req.user, lead);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this lead.' });
      }
    }
    
    const { noteId } = req.params;
    const success = await leadNotesService.delete(noteId);
    
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead note' });
  }
});

// ===== SURVEY MANAGEMENT =====

// Get all survey submissions (admin only)
router.get('/surveys', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const db = getDatabase();
    const query: any = {};
    if (status) query['application.status'] = status;
    
    const submissions = await db.collection('survey_submissions')
      .find(query)
      .sort({ [sortBy as string]: sortOrder === 'asc' ? 1 : -1 })
      .toArray();
    
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Get survey statistics (admin only)
router.get('/surveys/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = getDatabase();
    const collection = db.collection('survey_submissions');
    
    // Get total count
    const total = await collection.countDocuments();
    
    // Get counts by status
    const statusAggregation = await collection.aggregate([
      {
        $group: {
          _id: '$application.status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Convert to Record<string, number>
    const byStatus: Record<string, number> = {};
    statusAggregation.forEach((item: any) => {
      const status = item._id || 'new';
      byStatus[status] = item.count;
    });
    
    // Get recent count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = await collection.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    const stats = {
      total,
      byStatus,
      recentCount
    };
    
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch survey statistics' });
  }
});

// Get single survey by ID (admin only)
router.get('/surveys/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const db = getDatabase();
    const survey = await db.collection('survey_submissions').findOne({ _id: id });
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    res.json({ survey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// Update survey status (admin only)
router.put('/surveys/:id/status', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const db = getDatabase();
    const result = await db.collection('survey_submissions').updateOne(
      { _id: id },
      {
        $set: {
          'application.status': status,
          'application.reviewedAt': new Date(),
          'application.reviewedBy': req.user.id,
          ...(reviewNotes && { 'application.reviewNotes': reviewNotes }),
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const survey = await db.collection('survey_submissions').findOne({ _id: id });
    res.json({ survey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update survey status' });
  }
});

// Update survey (admin only)
router.put('/surveys/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const db = getDatabase();
    const result = await db.collection('survey_submissions').updateOne(
      { _id: id },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const survey = await db.collection('survey_submissions').findOne({ _id: id });
    res.json({ survey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update survey' });
  }
});

// Delete survey (admin only)
router.delete('/surveys/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const db = getDatabase();
    const result = await db.collection('survey_submissions').deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete survey' });
  }
});

// ===== ALGORITHM CONFIGURATION MANAGEMENT =====

// Get all algorithm configurations (admin only)
router.get('/algorithms', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = getDatabase();
    const dbConfigs = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).find({}).toArray();
    
    // Map to clean format
    const configs = dbConfigs.map((cfg: any) => ({
      _id: cfg._id,
      algorithmId: cfg.algorithmId,
      name: cfg.name,
      description: cfg.description,
      icon: cfg.icon,
      isActive: cfg.isActive !== false,
      isDefault: cfg.isDefault === true,
      llmConfig: cfg.llmConfig,
      constraints: cfg.constraints,
      scoring: cfg.scoring,
      promptInstructions: cfg.promptInstructions,
      createdBy: cfg.createdBy,
      updatedBy: cfg.updatedBy,
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt
    }));
    
    res.json({ algorithms: configs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch algorithm configurations' });
  }
});

// Get single algorithm configuration (admin only)
router.get('/algorithms/:algorithmId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { algorithmId } = req.params;
    const db = getDatabase();
    const dbConfig = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ algorithmId });
    
    if (!dbConfig) {
      return res.status(404).json({ error: 'Algorithm configuration not found' });
    }
    
    const config = {
      _id: dbConfig._id,
      algorithmId: dbConfig.algorithmId,
      name: dbConfig.name,
      description: dbConfig.description,
      icon: dbConfig.icon,
      isActive: dbConfig.isActive !== false,
      isDefault: dbConfig.isDefault === true,
      llmConfig: dbConfig.llmConfig,
      constraints: dbConfig.constraints,
      scoring: dbConfig.scoring,
      promptInstructions: dbConfig.promptInstructions,
      createdBy: dbConfig.createdBy,
      updatedBy: dbConfig.updatedBy,
      createdAt: dbConfig.createdAt,
      updatedAt: dbConfig.updatedAt
    };
    
    res.json({ algorithm: config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch algorithm configuration' });
  }
});

// Update algorithm configuration (admin only)
router.put('/algorithms/:algorithmId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { algorithmId } = req.params;
    const updates = req.body;
    
    const db = getDatabase();
    const existing = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ algorithmId });
    
    if (!existing) {
      return res.status(404).json({ error: 'Algorithm configuration not found' });
    }
    
    // Prepare update document
    const updateDoc = {
      ...updates,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };
    
    // Update in database
    const result = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).updateOne(
      { algorithmId },
      { $set: updateDoc }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Algorithm configuration not found' });
    }
    
    // Fetch updated config
    const updatedConfig = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ algorithmId });
    
    res.json({ 
      message: 'Algorithm configuration updated successfully',
      algorithm: updatedConfig 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update algorithm configuration' });
  }
});

// Create new algorithm configuration (admin only)
router.post('/algorithms', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const algorithmData = req.body;
    
    if (!algorithmData.algorithmId || !algorithmData.name) {
      return res.status(400).json({ error: 'algorithmId and name are required' });
    }
    
    const db = getDatabase();
    
    // Check if algorithm already exists
    const existing = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).findOne({ 
      algorithmId: algorithmData.algorithmId 
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Algorithm with this ID already exists' });
    }
    
    // Create algorithm config
    const newConfig = {
      ...algorithmData,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).insertOne(newConfig);
    
    res.status(201).json({ 
      message: 'Algorithm configuration created successfully',
      algorithm: { ...newConfig, _id: result.insertedId }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create algorithm configuration' });
  }
});

// Delete algorithm configuration (admin only)
router.delete('/algorithms/:algorithmId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { algorithmId } = req.params;
    const db = getDatabase();
    
    const result = await db.collection(COLLECTIONS.ALGORITHM_CONFIGS).deleteOne({ algorithmId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Algorithm configuration not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Algorithm configuration deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete algorithm configuration' });
  }
});

// ===== HUB PACKAGES MANAGEMENT =====

// Create new hub package (admin or hub user)
router.post('/hub-packages', authenticateToken, async (req: any, res: Response) => {
  try {
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    // Check if user has permission to create package for this hub
    if (!isAdmin) {
      const packageHubId = req.body.hubInfo?.hubId;
      if (!packageHubId) {
        return res.status(400).json({ error: 'Package must be associated with a hub' });
      }
      
      if (!assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to create packages for this hub' });
      }
    }
    
    const pkg = await hubPackagesService.create(req.body, req.user.id);
    res.status(201).json({ package: pkg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hub package' });
  }
});

// Update hub package (admin or hub user)
router.put('/hub-packages/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
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
    
    const pkg = await hubPackagesService.update(id, req.body, req.user.id);
    
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({ package: pkg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hub package' });
  }
});

// Delete hub package (admin or hub user - soft delete)
router.delete('/hub-packages/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
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
        return res.status(403).json({ error: 'You do not have permission to delete packages for this hub' });
      }
    }
    
    const success = await hubPackagesService.delete(id, false); // soft delete
    
    if (!success) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hub package' });
  }
});

// Restore deleted package (admin or hub user)
router.post('/hub-packages/:id/restore', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    const assignedHubIds = req.user.permissions?.assignedHubIds || [];
    
    // For non-admins, verify they have access to this package's hub
    if (!isAdmin) {
      // Get the existing package to check hub ownership (even if deleted)
      const existingPackage = await hubPackagesService.getById(id);
      if (!existingPackage) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      const packageHubId = existingPackage.hubInfo?.hubId;
      if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
        return res.status(403).json({ error: 'You do not have permission to restore packages for this hub' });
      }
    }
    
    const success = await hubPackagesService.restore(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Fetch the restored package
    const pkg = await hubPackagesService.getById(id);
    res.json({ package: pkg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore hub package' });
  }
});

export default router;

