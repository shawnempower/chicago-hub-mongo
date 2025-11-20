import { API_BASE_URL } from '@/config/api';
import {
  HubPackageInventoryItem,
  HubPackagePublication,
  PublicationFrequencyType
} from '@/integrations/mongodb/hubPackageSchema';
import {
  detectPublicationFrequencyType,
  getStandardFrequency,
  validateFrequency,
  applyFrequencyStrategy,
  calculateMonthlyCost,
  calculateTotalPackageCost
} from '@/utils/frequencyEngine';
import { calculateItemCost } from '@/utils/inventoryPricing';
import { inferOccurrencesFromFrequency } from '@/utils/pricingCalculations';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Publication data structure from API
export interface PublicationData {
  _id: string;
  publicationId: number;
  basicInfo: {
    publicationName: string;
  };
  printFrequency?: string;
  distributionChannels?: any;
  location?: {
    neighborhoods?: string[];
    coverage?: string;
  };
}

// Inventory item with frequency constraints
export interface InventoryItemWithConstraints extends HubPackageInventoryItem {
  publicationId: number;
  publicationName: string;
  adId?: string;
}

// Builder filters
export interface BuilderFilters {
  mode: 'budget-first' | 'specification-first';
  budget?: number;
  duration: number; // months
  geography?: string[]; // neighborhoods or coverage areas
  channels: string[]; // ['newsletter', 'print', 'website', etc.]
  publications?: number[]; // Specific publication IDs for specification-first
  frequencyStrategy: 'standard' | 'reduced' | 'minimum' | 'custom';
}

// Builder result
export interface BuilderResult {
  publications: HubPackagePublication[];
  summary: {
    totalOutlets: number;
    totalChannels: number;
    totalUnits: number;
    monthlyCost: number;
    totalCost: number;
    budgetUsed?: number; // percentage if budget was specified
    // Reach metrics
    totalMonthlyImpressions?: number;
    totalMonthlyExposures?: number;
    estimatedTotalReach?: number;
    estimatedUniqueReach?: number;
    channelAudiences?: {
      website?: number;
      print?: number;
      newsletter?: number;
      social?: number;
      podcast?: number;
      radio?: number;
      streaming?: number;
      events?: number;
    };
    reachCalculationMethod?: 'impressions' | 'audience' | 'mixed';
    reachOverlapFactor?: number;
  };
}

/**
 * Package Builder Service
 * Core business logic for building packages from inventory
 */
export class PackageBuilderService {
  /**
   * Fetch all publications for a hub with their inventory
   */
  async fetchPublicationsForBuilder(
    hubId: string,
    channelFilters?: string[],
    geographyFilters?: string[]
  ): Promise<PublicationData[]> {
    try {
      // Use the correct hub-specific endpoint
      const response = await fetch(
        `${API_BASE_URL}/hubs/${hubId}/publications`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch publications');
      }

      const data = await response.json();
      let publications = data.publications || [];

      // Apply geography filters if specified
      if (geographyFilters && geographyFilters.length > 0) {
        publications = publications.filter((pub: PublicationData) => {
          const pubNeighborhoods = pub.location?.neighborhoods || [];
          const pubCoverage = pub.location?.coverage?.toLowerCase() || '';
          
          return geographyFilters.some(geo => {
            const geoLower = geo.toLowerCase();
            return pubNeighborhoods.some((n: string) => n.toLowerCase().includes(geoLower)) ||
                   pubCoverage.includes(geoLower);
          });
        });
      }

      return publications;
    } catch (error) {
      console.error('Error fetching publications:', error);
      throw error;
    }
  }

  /**
   * Extract inventory items from a publication with frequency constraints
   */
  extractInventoryFromPublication(
    publication: PublicationData,
    channelFilters: string[],
    frequencyStrategy: 'standard' | 'reduced' | 'minimum' | 'custom'
  ): InventoryItemWithConstraints[] {
    const items: InventoryItemWithConstraints[] = [];
    const channels = publication.distributionChannels;
    
    if (!channels) return items;

    // Detect publication frequency type
    const publicationType = detectPublicationFrequencyType(
      publication.printFrequency,
      undefined
    );

    // Helper to create inventory item - ONLY uses hub pricing
    const createItem = (
      channel: string,
      itemName: string,
      itemPath: string,
      hubPrice: number,
      pricingModel: string = 'flat',
      itemFrequencyString?: string,  // Frequency from the item itself (e.g., "weekly", "daily")
      specifications?: any,
      audienceMetrics?: any,  // Audience metrics from parent channel
      performanceMetrics?: any  // Item-specific performance metrics
    ): InventoryItemWithConstraints | null => {
      if (!channelFilters.includes(channel)) return null;
      if (hubPrice <= 0) return null;

      // Use the item's actual frequency if available, otherwise infer from pricing model
      let currentFrequency: number;
      
      if (itemFrequencyString) {
        // Use the actual frequency from the inventory item
        const inferredFreq = inferOccurrencesFromFrequency(itemFrequencyString);
        currentFrequency = Math.round(inferredFreq);
      } else {

        // Fallback: infer from pricing model
        switch (pricingModel) {
          case 'flat':
          case 'monthly':
            currentFrequency = 1;
            break;
          case 'per_ad':
          case 'per_insertion':
            const printFreq = inferOccurrencesFromFrequency(publication.printFrequency);
            currentFrequency = Math.round(printFreq);
            break;
          case 'per_send':
            const sendFreq = inferOccurrencesFromFrequency(publication.printFrequency);
            currentFrequency = Math.round(sendFreq);
            break;
          case 'per_spot':
          case 'per_post':
          case 'per_episode':
            currentFrequency = 4;
            break;
          case 'cpm':
          case 'cpv':
          case 'cpc':
            currentFrequency = 1;
            break;
          default:
            currentFrequency = 1;
        }
      }
      
      // Apply frequency strategy adjustments if requested
      if (frequencyStrategy === 'reduced') {
        currentFrequency = Math.max(1, Math.floor(currentFrequency / 2));
      } else if (frequencyStrategy === 'minimum') {
        currentFrequency = 1;
      }

      // Max frequency based on publication type
      const maxFrequency = 
        publicationType === 'daily' ? 30 :
        publicationType === 'weekly' ? 4 :
        publicationType === 'bi-weekly' ? 2 : 1;

      const item: any = {
        channel: channel as any,
        itemPath,
        itemName,
        quantity: currentFrequency,
        currentFrequency,
        maxFrequency,
        publicationFrequencyType: publicationType,
        itemPricing: {
          standardPrice: hubPrice, // Use hub pricing for both
          hubPrice,
          pricingModel
        },
        specifications,
        audienceMetrics,  // Include channel-level audience metrics
        performanceMetrics,  // Include item-level performance metrics
        publicationId: publication.publicationId,
        publicationName: publication.basicInfo.publicationName
      };
      return item;
    };

    // Helper to select best pricing tier (lowest per-insertion price)
    const selectBestPricingTier = (pricingData: any): any => {
      if (!pricingData) return null;
      
      // If it's an array of tiers, find the one with lowest flatRate
      if (Array.isArray(pricingData)) {
        if (pricingData.length === 0) return null;
        
        // Sort by flatRate ascending and take the best price
        const sorted = [...pricingData].sort((a, b) => {
          const priceA = a.flatRate || a.rate || a.perSend || a.perSpot || a.monthly || Infinity;
          const priceB = b.flatRate || b.rate || b.perSend || b.perSpot || b.monthly || Infinity;
          return priceA - priceB;
        });
        
        return sorted[0];
      }
      
      return pricingData;
    };

    // Extract website inventory
    if (channels.website?.advertisingOpportunities) {
      const websiteMetrics = {
        monthlyVisitors: channels.website.metrics?.monthlyVisitors,
        monthlyPageViews: channels.website.metrics?.monthlyPageViews,
        monthlyImpressions: channels.website.metrics?.monthlyImpressions
      };
      
      channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
        const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
        if (hubPricing?.pricing) {
          const pricing = selectBestPricingTier(hubPricing.pricing);
          
          const item = createItem(
            'website',
            ad.title || ad.name || 'Website Ad',
            `distributionChannels.website.advertisingOpportunities[${idx}]`,
            pricing.flatRate || pricing.rate || pricing.monthly || 0,
            pricing.pricingModel || 'flat',
            undefined,  // Website ads are typically monthly (handled by pricing model)
            ad.specifications,
            websiteMetrics,
            ad.performanceMetrics  // Pass item-level performance metrics
          );
          if (item) items.push(item);
        }
      });
    }

    // Extract newsletter inventory
    if (channels.newsletters) {
      channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
        const newsletterMetrics = {
          subscribers: newsletter.subscribers,
          openRate: newsletter.openRate,
          clickThroughRate: newsletter.clickThroughRate
        };
        
        newsletter.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            // Try to get newsletter name from: name > subject > 'Newsletter {index}'
            // NOTE: We intentionally don't fall back to publication name here because we want
            // a distinct identifier for each newsletter within a publication
            const newsletterName = newsletter.name || newsletter.subject || `Newsletter ${nlIdx + 1}`;
            
            const item = createItem(
              'newsletter',
              `${newsletterName} - ${ad.title || ad.name || 'Ad'}`,
              `distributionChannels.newsletters[${nlIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.flatRate || pricing.perSend || pricing.monthly || 0,
              pricing.pricingModel || 'per_send',
              newsletter.frequency,  // Use the newsletter's actual frequency
              ad.specifications,
              newsletterMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              // Store the source newsletter name for easy access
              item.sourceName = newsletterName;
              items.push(item);
            }
          }
        });
      });
    }

    // Extract print inventory
    if (channels.print) {
      const printPubs = Array.isArray(channels.print) ? channels.print : [channels.print];
      printPubs.forEach((printPub: any, printIdx: number) => {
        const printMetrics = {
          circulation: printPub.circulation,
          distributionArea: printPub.distributionArea
        };
        
        printPub.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'print',
              ad.name || ad.title || 'Print Ad',
              `distributionChannels.print[${printIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.flatRate || pricing.perInsertion || pricing.monthly || 0,
              pricing.pricingModel || 'per_ad',
              printPub.frequency || publication.printFrequency,  // Use print publication's frequency
              { size: ad.dimensions || ad.size, ...ad.specifications },
              printMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              // Store the print section/edition name if available
              item.sourceName = printPub.section || printPub.name || publication.basicInfo?.publicationName || 'Print';
              items.push(item);
            }
          }
        });
      });
    }

    // Extract social media inventory
    if (channels.socialMedia) {
      channels.socialMedia.forEach((social: any, socIdx: number) => {
        const socialMetrics = {
          followers: social.metrics?.followers,
          engagementRate: social.metrics?.engagementRate,
          averageReach: social.metrics?.averageReach
        };
        
        social.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'social',
              `${social.platform || 'Social'} - ${ad.name || 'Post'}`,
              `distributionChannels.socialMedia[${socIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.perPost || pricing.flatRate || pricing.monthly || 0,
              pricing.pricingModel || 'per_post',
              ad.frequency,  // Use ad's frequency if specified
              { platform: social.platform, ...ad.specifications },
              socialMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              // Store the source social media platform name
              item.sourceName = social.platform || 'Social Media';
              items.push(item);
            }
          }
        });
      });
    }

    // Extract podcast inventory
    if (channels.podcasts) {
      channels.podcasts.forEach((podcast: any, podIdx: number) => {
        const podcastMetrics = {
          averageListeners: podcast.averageListeners,
          subscribers: podcast.subscribers,
          downloadsPerEpisode: podcast.downloadsPerEpisode
        };
        
        podcast.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'podcast',
              `${podcast.name || 'Podcast'} - ${ad.name || 'Ad'}`,
              `distributionChannels.podcasts[${podIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.perEpisode || pricing.flatRate || pricing.monthly || 0,
              pricing.pricingModel || 'per_episode',
              podcast.frequency,  // Use podcast's frequency (e.g., "weekly", "daily")
              ad.specifications,
              podcastMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              // Store the podcast name
              item.sourceName = podcast.name || 'Podcast';
              items.push(item);
            }
          }
        });
      });
    }

    // Extract radio inventory
    if (channels.radioStations) {
      channels.radioStations.forEach((radio: any, radioIdx: number) => {
        const radioMetrics = {
          listeners: radio.listeners,
          marketRank: radio.marketRank,
          signalStrength: radio.signalStrength
        };
        
        // Radio can have shows with their own frequencies
        if (radio.shows && radio.shows.length > 0) {
          radio.shows.forEach((show: any, showIdx: number) => {
            const showMetrics = {
              ...radioMetrics,
              averageListeners: show.averageListeners || radio.listeners
            };
            
            show.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
              const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
              if (hubPricing?.pricing) {
                const pricing = selectBestPricingTier(hubPricing.pricing);
                
                const item = createItem(
                  'radio',
                  `${radio.callSign || 'Radio'} - ${show.name || 'Show'} - ${ad.name || 'Spot'}`,
                  `distributionChannels.radioStations[${radioIdx}].shows[${showIdx}].advertisingOpportunities[${adIdx}]`,
                  pricing.perSpot || pricing.flatRate || pricing.monthly || 0,
                  pricing.pricingModel || 'per_spot',
                  show.frequency,  // Use show's frequency (e.g., "daily", "weekdays", "weekly")
                  ad.specifications,
                  showMetrics,
                  ad.performanceMetrics  // Pass item-level performance metrics
                );
                if (item) {
                  // Store the radio show name
                  item.sourceName = show.name || 'Radio Show';
                  items.push(item);
                }
              }
            });
          });
        }
        
        // Also handle station-level ads (if any)
        radio.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'radio',
              `${radio.callSign || 'Radio'} - ${ad.name || 'Spot'}`,
              `distributionChannels.radioStations[${radioIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.perSpot || pricing.flatRate || pricing.monthly || 0,
              pricing.pricingModel || 'per_spot',
              undefined,  // Station-level ads don't have specific frequency
              ad.specifications,
              radioMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              // Store the radio station call sign
              item.sourceName = radio.callSign || 'Radio';
              items.push(item);
            }
          }
        });
      });
    }

    // Extract streaming inventory
    if (channels.streamingVideo) {
      const streaming = Array.isArray(channels.streamingVideo) 
        ? channels.streamingVideo 
        : [channels.streamingVideo];
      
      streaming.forEach((stream: any, streamIdx: number) => {
        const streamingMetrics = {
          subscribers: stream.subscribers,
          averageViews: stream.averageViews,
          totalReach: stream.totalReach
        };
        
        stream.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
          const hubPricing = ad.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'streaming',
              `${stream.name || 'Streaming'} - ${ad.name || 'Ad'}`,
              `distributionChannels.streamingVideo[${streamIdx}].advertisingOpportunities[${adIdx}]`,
              pricing.perAd || pricing.flatRate || pricing.monthly || 0,
              pricing.pricingModel || 'flat',
              stream.frequency,  // Use streaming channel's frequency
              ad.specifications,
              streamingMetrics,
              ad.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              item.sourceName = stream.name || 'Streaming';
              items.push(item);
            }
          }
        });
      });
    }

    // Extract events inventory
    if (channels.events) {
      const events = Array.isArray(channels.events) ? channels.events : [channels.events];
      events.forEach((event: any, eventIdx: number) => {
        const eventMetrics = {
          averageAttendance: event.averageAttendance,
          expectedAttendees: event.expectedAttendees,
          historicalAttendance: event.historicalAttendance
        };
        
        event.sponsorshipOpportunities?.forEach((sponsorship: any, sponsIdx: number) => {
          const hubPricing = sponsorship.hubPricing?.find((hp: any) => hp.available);
          if (hubPricing?.pricing) {
            const pricing = selectBestPricingTier(hubPricing.pricing);
            
            const item = createItem(
              'events',
              `${event.name || 'Event'} - ${sponsorship.name || 'Sponsorship'}`,
              `distributionChannels.events[${eventIdx}].sponsorshipOpportunities[${sponsIdx}]`,
              pricing.flatRate || pricing.perEvent || pricing.annual || 0,
              pricing.pricingModel || 'flat',
              event.frequency,  // Use event's frequency (e.g., "annual", "bi-annual", "quarterly")
              sponsorship.benefits,
              eventMetrics,
              sponsorship.performanceMetrics  // Pass item-level performance metrics
            );
            if (item) {
              item.sourceName = event.name || 'Event';
              items.push(item);
            }
          }
        });
      });
    }

    return items;
  }

  /**
   * Build package using budget-first approach
   * Finds optimal mix of inventory within budget
   */
  async generatePackageFromBudget(
    hubId: string,
    filters: BuilderFilters
  ): Promise<BuilderResult> {
    const { budget, duration, geography, channels, frequencyStrategy } = filters;

    if (!budget) {
      throw new Error('Budget is required for budget-first mode');
    }

    // Fetch publications
    const publications = await this.fetchPublicationsForBuilder(
      hubId,
      channels,
      geography
    );

    // Extract all inventory
    const allInventory: InventoryItemWithConstraints[] = [];
    for (const pub of publications) {
      const items = this.extractInventoryFromPublication(pub, channels, frequencyStrategy);
      allInventory.push(...items);
    }

    // Group by publication
    const publicationMap = new Map<number, InventoryItemWithConstraints[]>();
    for (const item of allInventory) {
      const pubId = item.publicationId;
      if (!publicationMap.has(pubId)) {
        publicationMap.set(pubId, []);
      }
      publicationMap.get(pubId)!.push(item);
    }

    // Select items to fit budget
    const selectedPublications: HubPackagePublication[] = [];
    let currentCost = 0;
    const targetBudget = budget;

    // Prioritize: include as many publications as possible, then add items
    const sortedPubs = Array.from(publicationMap.entries())
      .sort((a, b) => {
        // Sort by lowest cost first to maximize publication count
        const costA = this.calculatePublicationMinCost(a[1]);
        const costB = this.calculatePublicationMinCost(b[1]);
        return costA - costB;
      });

    for (const [pubId, items] of sortedPubs) {
      const pubName = items[0].publicationName;
      const selectedItems: HubPackageInventoryItem[] = [];
      let pubCost = 0;

      // Try to add at least one item from each channel
      const itemsByChannel = new Map<string, InventoryItemWithConstraints[]>();
      for (const item of items) {
        if (!itemsByChannel.has(item.channel)) {
          itemsByChannel.set(item.channel, []);
        }
        itemsByChannel.get(item.channel)!.push(item);
      }

      // Add one item per channel if budget allows
      for (const [channel, channelItems] of itemsByChannel) {
        // Sort by price
        const sortedItems = channelItems.sort((a, b) => {
          const priceA = (a.itemPricing?.hubPrice || 0) * (a.currentFrequency || 1);
          const priceB = (b.itemPricing?.hubPrice || 0) * (b.currentFrequency || 1);
          return priceA - priceB;
        });

        // Take the cheapest item from this channel
        const item = sortedItems[0];
        const itemCost = calculateMonthlyCost(
          item.itemPricing?.hubPrice || 0,
          item.currentFrequency || 1
        );

        if (currentCost + itemCost <= targetBudget) {
          selectedItems.push(item);
          pubCost += itemCost;
          currentCost += itemCost;
        }
      }

      // If we added any items from this publication, include it
      if (selectedItems.length > 0) {
        selectedPublications.push({
          publicationId: pubId,
          publicationName: pubName,
          inventoryItems: selectedItems,
          publicationTotal: pubCost
        });
      }

      // Stop if we're close to budget
      if (currentCost >= targetBudget * 0.95) break;
    }

    return {
      publications: selectedPublications,
      summary: {
        totalOutlets: selectedPublications.length,
        totalChannels: new Set(
          selectedPublications.flatMap(p => p.inventoryItems.map(i => i.channel))
        ).size,
        totalUnits: selectedPublications.reduce(
          (sum, p) => sum + p.inventoryItems.reduce((s, i) => s + (i.currentFrequency || 1), 0),
          0
        ),
        monthlyCost: currentCost,
        totalCost: currentCost * duration,
        budgetUsed: (currentCost / budget) * 100
      }
    };
  }

  /**
   * Build package using specification-first approach
   * Shows all inventory for selected publications
   */
  async generatePackageFromSpecs(
    hubId: string,
    filters: BuilderFilters
  ): Promise<BuilderResult> {
    const { publications: pubIds, duration, channels, frequencyStrategy } = filters;

    if (!pubIds || pubIds.length === 0) {
      throw new Error('Publications are required for specification-first mode');
    }

    // Fetch all publications
    const allPublications = await this.fetchPublicationsForBuilder(hubId, channels);

    // Filter to selected publications
    const selectedPubs = allPublications.filter(pub => 
      pubIds.includes(pub.publicationId)
    );

    // Extract all inventory from selected publications
    const packagePublications: HubPackagePublication[] = [];
    let totalCost = 0;

    for (const pub of selectedPubs) {
      const items = this.extractInventoryFromPublication(pub, channels, frequencyStrategy);
      
      if (items.length > 0) {
        const pubCost = items.reduce((sum, item) => {
          return sum + calculateMonthlyCost(
            item.itemPricing?.hubPrice || 0,
            item.currentFrequency || 1
          );
        }, 0);

        packagePublications.push({
          publicationId: pub.publicationId,
          publicationName: pub.basicInfo.publicationName,
          inventoryItems: items,
          publicationTotal: pubCost
        });

        totalCost += pubCost;
      }
    }

    return {
      publications: packagePublications,
      summary: {
        totalOutlets: packagePublications.length,
        totalChannels: new Set(
          packagePublications.flatMap(p => p.inventoryItems.map(i => i.channel))
        ).size,
        totalUnits: packagePublications.reduce(
          (sum, p) => sum + p.inventoryItems.reduce((s, i) => s + (i.currentFrequency || 1), 0),
          0
        ),
        monthlyCost: totalCost,
        totalCost: totalCost * duration
      }
    };
  }

  /**
   * Calculate minimum cost for a publication (one item per channel at minimum frequency)
   */
  private calculatePublicationMinCost(items: InventoryItemWithConstraints[]): number {
    const channelItems = new Map<string, InventoryItemWithConstraints>();
    
    for (const item of items) {
      const existing = channelItems.get(item.channel);
      const itemCost = (item.itemPricing?.hubPrice || 0) * (item.currentFrequency || 1);
      const existingCost = existing 
        ? (existing.itemPricing?.hubPrice || 0) * (existing.currentFrequency || 1)
        : Infinity;
      
      if (itemCost < existingCost) {
        channelItems.set(item.channel, item);
      }
    }

    return Array.from(channelItems.values()).reduce((sum, item) => {
      return sum + calculateMonthlyCost(
        item.itemPricing?.hubPrice || 0,
        item.currentFrequency || 1
      );
    }, 0);
  }

  /**
   * Calculate package cost
   */
  calculatePackageCost(publications: HubPackagePublication[]): number {
    return publications.reduce((sum, pub) => sum + pub.publicationTotal, 0);
  }

  /**
   * Validate frequency constraints for all items
   */
  validateFrequencyConstraints(publications: HubPackagePublication[]): boolean {
    for (const pub of publications) {
      for (const item of pub.inventoryItems) {
        if (!item.publicationFrequencyType || !item.currentFrequency) continue;
        
        if (!validateFrequency(item.currentFrequency, item.publicationFrequencyType)) {
          return false;
        }
      }
    }
    return true;
  }
}

// Export singleton instance
export const packageBuilderService = new PackageBuilderService();

