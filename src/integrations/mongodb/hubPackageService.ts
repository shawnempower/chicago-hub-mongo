import { getDatabase } from './client';
import { ObjectId, Filter } from 'mongodb';
import { 
  HubPackage, 
  HubPackageInsert, 
  HubPackageUpdate,
  InventoryAnalysis,
  PackageRecommendation
} from './hubPackageSchema';
import { Publication } from './schemas';

const COLLECTION_NAME = 'hub_packages';

export class HubPackagesService {
  private get collection() {
    return getDatabase().collection<HubPackage>(COLLECTION_NAME);
  }

  private get publicationsCollection() {
    return getDatabase().collection<Publication>('publications');
  }

  // ===== CRUD OPERATIONS =====

  async getAll(filters?: { 
    isActive?: boolean; 
    isFeatured?: boolean;
    category?: string;
    hubId?: string;
    approvalStatus?: string;
  }): Promise<HubPackage[]> {
    try {
      const query: Filter<HubPackage> = {};
      
      if (filters?.isActive !== undefined) {
        query['availability.isActive'] = filters.isActive;
      }
      
      if (filters?.isFeatured !== undefined) {
        query['availability.isFeatured'] = filters.isFeatured;
      }
      
      if (filters?.category) {
        query['basicInfo.category'] = filters.category;
      }
      
      if (filters?.hubId) {
        query['hubInfo.hubId'] = filters.hubId;
      }
      
      if (filters?.approvalStatus) {
        query['metadata.approvalStatus'] = filters.approvalStatus;
      }

      // Exclude soft-deleted packages
      query.deletedAt = { $exists: false };

      return await this.collection
        .find(query)
        .sort({ 'marketing.displayOrder': 1, 'metadata.createdAt': -1 })
        .toArray();
    } catch (error) {
      console.error('Error fetching hub packages:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<HubPackage | null> {
    try {
      return await this.collection.findOne({ 
        _id: new ObjectId(id),
        deletedAt: { $exists: false }
      });
    } catch (error) {
      console.error('Error fetching hub package by ID:', error);
      throw error;
    }
  }

  async getByPackageId(packageId: string): Promise<HubPackage | null> {
    try {
      return await this.collection.findOne({ 
        packageId,
        deletedAt: { $exists: false }
      });
    } catch (error) {
      console.error('Error fetching hub package by packageId:', error);
      throw error;
    }
  }

  async create(packageData: HubPackageInsert, createdBy: string): Promise<HubPackage> {
    try {
      const now = new Date();
      const newPackage: HubPackage = {
        ...packageData,
        analytics: {
          viewCount: 0,
          inquiryCount: 0,
          purchaseCount: 0,
          lastModified: now
        },
        metadata: {
          ...packageData.metadata,
          createdBy,
          createdAt: now,
          updatedAt: now,
          version: 1
        }
      };

      const result = await this.collection.insertOne(newPackage);
      return { ...newPackage, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating hub package:', error);
      throw error;
    }
  }

  async update(id: string, updates: HubPackageUpdate, updatedBy: string): Promise<HubPackage | null> {
    try {
      const now = new Date();
      
      // Get current package to increment version
      const currentPackage = await this.getById(id);
      if (!currentPackage) {
        throw new Error('Package not found');
      }

      // Build the update object, separating nested objects from flat fields
      const { metadata, analytics, components, ...flatUpdates } = updates as any;
      
      const updateData: any = {
        ...flatUpdates,
      };

      // Handle components - explicitly replace the entire object
      if (components) {
        updateData.components = components;
      }

      // Handle metadata - merge with existing and add system fields
      if (metadata) {
        updateData.metadata = {
          ...currentPackage.metadata, // Keep existing metadata
          ...metadata, // Apply updates
          updatedBy, // System fields override
          updatedAt: now,
          version: (currentPackage.metadata.version || 1) + 1
        };
      } else {
        // If no metadata provided, still update system fields
        updateData.metadata = {
          ...currentPackage.metadata,
          updatedBy,
          updatedAt: now,
          version: (currentPackage.metadata.version || 1) + 1
        };
      }

      // Handle analytics - merge with existing
      if (analytics) {
        updateData.analytics = {
          ...currentPackage.analytics,
          ...analytics,
          lastModified: now
        };
      } else {
        // If no analytics provided, still update lastModified
        updateData.analytics = {
          ...currentPackage.analytics,
          lastModified: now
        };
      }

      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      
      return await this.getById(id);
    } catch (error) {
      console.error('Error updating hub package:', error);
      throw error;
    }
  }

  async delete(id: string, permanent: boolean = false): Promise<boolean> {
    try {
      if (permanent) {
        const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
      } else {
        // Soft delete
        await this.collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { deletedAt: new Date() } }
        );
        return true;
      }
    } catch (error) {
      console.error('Error deleting hub package:', error);
      throw error;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $unset: { deletedAt: '' } }
      );
      return true;
    } catch (error) {
      console.error('Error restoring hub package:', error);
      throw error;
    }
  }

  // ===== ANALYTICS OPERATIONS =====

  async incrementViewCount(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { 'analytics.viewCount': 1 } }
      );
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  async incrementInquiryCount(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $inc: { 'analytics.inquiryCount': 1 },
          $set: { 'analytics.lastModified': new Date() }
        }
      );
    } catch (error) {
      console.error('Error incrementing inquiry count:', error);
    }
  }

  async incrementPurchaseCount(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $inc: { 'analytics.purchaseCount': 1 },
          $set: { 'analytics.lastModified': new Date() }
        }
      );
    } catch (error) {
      console.error('Error incrementing purchase count:', error);
    }
  }

  // ===== PACKAGE DISCOVERY & RECOMMENDATION =====

  /**
   * Analyze all publications to discover available inventory for package building
   */
  async analyzeAvailableInventory(filters?: {
    geographicArea?: string;
    minMonthlyVisitors?: number;
  }): Promise<InventoryAnalysis[]> {
    try {
      const query: Filter<Publication> = {};
      
      if (filters?.geographicArea) {
        query['basicInfo.serviceAreas.dmaNormalized'] = filters.geographicArea;
      }

      const publications = await this.publicationsCollection.find(query).toArray();
      
      const analyses: InventoryAnalysis[] = [];

      for (const pub of publications) {
        // Skip if doesn't meet minimum traffic requirement
        if (filters?.minMonthlyVisitors) {
          const visitors = pub.distributionChannels?.website?.metrics?.monthlyVisitors || 0;
          if (visitors < filters.minMonthlyVisitors) continue;
        }

        const analysis: InventoryAnalysis = {
          publicationId: pub.publicationId,
          publicationName: pub.basicInfo.publicationName,
          availableInventory: [],
          geographicCoverage: pub.basicInfo.serviceAreas?.map(sa => sa.dmaNormalized) || []
        };

        // Analyze website inventory
        if (pub.distributionChannels?.website?.advertisingOpportunities) {
          const websiteItems = pub.distributionChannels.website.advertisingOpportunities
            .filter(ad => ad.available)
            .map((ad, index) => {
              const hubPricing = ad.hubPricing?.find(hp => hp.hubId === 'chicago-hub' || hp.hubId === 'chicago_hub');
              return {
                name: ad.name || `Website Ad ${index + 1}`,
                path: `distributionChannels.website.advertisingOpportunities[${index}]`,
                pricing: {
                  standard: ad.pricing?.flatRate || 0,
                  hub: hubPricing?.pricing?.flatRate || ad.pricing?.flatRate || 0,
                  model: ad.pricing?.pricingModel || 'flat'
                },
                impressions: ad.monthlyImpressions,
                specifications: ad.specifications
              };
            });

          if (websiteItems.length > 0) {
            analysis.availableInventory.push({
              channel: 'website',
              items: websiteItems
            });
          }
        }

        // Analyze newsletter inventory
        if (pub.distributionChannels?.newsletters) {
          const newsletterItems: any[] = [];
          pub.distributionChannels.newsletters.forEach((newsletter, nlIndex) => {
            newsletter.advertisingOpportunities?.forEach((ad, adIndex) => {
              if (ad.available) {
                const hubPricing = ad.hubPricing?.find(hp => hp.hubId === 'chicago-hub' || hp.hubId === 'chicago_hub');
                newsletterItems.push({
                  name: `${newsletter.name} - ${ad.name || 'Newsletter Ad'}`,
                  path: `distributionChannels.newsletters[${nlIndex}].advertisingOpportunities[${adIndex}]`,
                  pricing: {
                    standard: ad.pricing?.flatRate || ad.pricing?.perSend || 0, // flatRate is new standard, perSend for legacy
                    hub: hubPricing?.pricing?.flatRate || ad.pricing?.flatRate || ad.pricing?.perSend || 0,
                    model: ad.pricing?.pricingModel || 'per_send'
                  },
                  specifications: ad.specifications
                });
              }
            });
          });

          if (newsletterItems.length > 0) {
            analysis.availableInventory.push({
              channel: 'newsletter',
              items: newsletterItems
            });
          }
        }

        // Analyze social media inventory
        if (pub.distributionChannels?.socialMedia) {
          const socialItems: any[] = [];
          pub.distributionChannels.socialMedia.forEach((social, socialIndex) => {
            social.advertisingOpportunities?.forEach((ad, adIndex) => {
              if (ad.available) {
                const hubPricing = ad.hubPricing?.find(hp => hp.hubId === 'chicago-hub' || hp.hubId === 'chicago_hub');
                socialItems.push({
                  name: `${social.platform} - ${ad.name || 'Social Post'}`,
                  path: `distributionChannels.socialMedia[${socialIndex}].advertisingOpportunities[${adIndex}]`,
                  pricing: {
                    standard: ad.pricing?.perPost || ad.pricing?.monthly || 0,
                    hub: hubPricing?.pricing?.perPost || ad.pricing?.perPost || ad.pricing?.monthly || 0,
                    model: ad.pricing?.pricingModel || 'per_post'
                  },
                  specifications: ad.specifications
                });
              }
            });
          });

          if (socialItems.length > 0) {
            analysis.availableInventory.push({
              channel: 'social',
              items: socialItems
            });
          }
        }

        // Add print inventory if exists
        if (pub.distributionChannels?.print?.advertisingOpportunities) {
          const printItems = pub.distributionChannels.print.advertisingOpportunities
            .filter(ad => ad.available)
            .map((ad, index) => {
              const hubPricing = ad.hubPricing?.find(hp => hp.hubId === 'chicago-hub' || hp.hubId === 'chicago_hub');
              return {
                name: ad.name || `Print Ad ${index + 1}`,
                path: `distributionChannels.print.advertisingOpportunities[${index}]`,
                pricing: {
                  standard: ad.pricing?.flatRate || 0,
                  hub: hubPricing?.pricing?.flatRate || ad.pricing?.flatRate || 0,
                  model: ad.pricing?.pricingModel || 'flat'
                },
                specifications: ad.specifications
              };
            });

          if (printItems.length > 0) {
            analysis.availableInventory.push({
              channel: 'print',
              items: printItems
            });
          }
        }

        // Calculate total reach and impressions
        analysis.totalMonthlyReach = this.calculatePublicationReach(pub);
        analysis.totalMonthlyImpressions = this.calculatePublicationImpressions(pub);

        // Only add if has inventory
        if (analysis.availableInventory.length > 0) {
          analyses.push(analysis);
        }
      }

      return analyses;
    } catch (error) {
      console.error('Error analyzing available inventory:', error);
      throw error;
    }
  }

  /**
   * Generate package recommendations based on criteria
   */
  async generatePackageRecommendations(criteria: {
    budget?: number;
    targetAudience?: string;
    geographicArea?: string;
    goals?: string[];
    channels?: string[];
  }): Promise<PackageRecommendation[]> {
    try {
      const inventory = await this.analyzeAvailableInventory({
        geographicArea: criteria.geographicArea
      });

      const recommendations: PackageRecommendation[] = [];

      // Recommendation 1: Budget-based citywide package
      if (criteria.budget && criteria.budget >= 5000 && criteria.budget <= 15000) {
        const topPublications = inventory
          .sort((a, b) => (b.totalMonthlyReach || 0) - (a.totalMonthlyReach || 0))
          .slice(0, 8);

        recommendations.push({
          recommendationId: 'citywide-essential',
          name: 'Citywide Essential Package',
          description: 'Broad reach across top 8 publications with website and newsletter ads',
          suggestedPublications: topPublications.map(p => p.publicationId),
          estimatedPrice: {
            min: 7000,
            max: 10000
          },
          estimatedReach: {
            min: 150000,
            max: 250000
          },
          confidence: 0.85,
          reasoning: 'Matches budget, provides broad citywide coverage, includes multiple channels',
          targetAudience: 'General Chicago audience'
        });
      }

      // Recommendation 2: Geographic-focused package
      if (criteria.geographicArea) {
        const geoPubs = inventory.filter(p => 
          p.geographicCoverage?.includes(criteria.geographicArea || '')
        );

        if (geoPubs.length >= 4) {
          recommendations.push({
            recommendationId: 'geographic-focused',
            name: 'Geographic Focus Package',
            description: `Deep penetration in ${criteria.geographicArea} area`,
            suggestedPublications: geoPubs.slice(0, 6).map(p => p.publicationId),
            estimatedPrice: {
              min: 5000,
              max: 8000
            },
            estimatedReach: {
              min: 60000,
              max: 100000
            },
            confidence: 0.90,
            reasoning: 'Publications focused on target geographic area',
            targetAudience: `${criteria.geographicArea} residents`
          });
        }
      }

      // Recommendation 3: Digital-only package (if digital channels preferred)
      if (criteria.channels?.includes('website') || criteria.channels?.includes('social')) {
        const digitalPubs = inventory.filter(p => 
          p.availableInventory.some(inv => inv.channel === 'website' || inv.channel === 'social')
        );

        recommendations.push({
          recommendationId: 'digital-domination',
          name: 'Digital Domination Package',
          description: 'Website and social media across 10 publications',
          suggestedPublications: digitalPubs.slice(0, 10).map(p => p.publicationId),
          estimatedPrice: {
            min: 8000,
            max: 12000
          },
          estimatedReach: {
            min: 250000,
            max: 400000
          },
          confidence: 0.80,
          reasoning: 'Maximizes digital presence, best CPM, fastest setup',
          targetAudience: 'Online-active Chicago residents'
        });
      }

      return recommendations.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error generating package recommendations:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  private calculatePublicationReach(pub: Publication): number {
    let totalReach = 0;

    // Website visitors
    totalReach += pub.distributionChannels?.website?.metrics?.monthlyVisitors || 0;

    // Print circulation
    totalReach += pub.distributionChannels?.print?.circulation || 0;

    // Newsletter subscribers (count at 50% to avoid double counting with website)
    const newsletters = pub.distributionChannels?.newsletters || [];
    newsletters.forEach(nl => {
      totalReach += (nl.subscribers || 0) * 0.5;
    });

    // Social followers (count at 10% to avoid overlap)
    const social = pub.distributionChannels?.socialMedia || [];
    social.forEach(s => {
      totalReach += (s.metrics?.followers || 0) * 0.1;
    });

    return Math.round(totalReach);
  }

  private calculatePublicationImpressions(pub: Publication): number {
    let totalImpressions = 0;

    // Website page views
    totalImpressions += pub.distributionChannels?.website?.metrics?.monthlyPageViews || 0;

    // Print circulation
    totalImpressions += pub.distributionChannels?.print?.circulation || 0;

    // Social impressions
    const social = pub.distributionChannels?.socialMedia || [];
    social.forEach(s => {
      totalImpressions += s.metrics?.averageImpressions || 0;
    });

    return Math.round(totalImpressions);
  }

  /**
   * Search packages by name, tags, or description
   */
  async search(query: string): Promise<HubPackage[]> {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      return await this.collection.find({
        deletedAt: { $exists: false },
        $or: [
          { 'basicInfo.name': searchRegex },
          { 'basicInfo.tagline': searchRegex },
          { 'basicInfo.description': searchRegex },
          { 'marketing.tags': { $in: [searchRegex] } }
        ]
      }).toArray();
    } catch (error) {
      console.error('Error searching packages:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hubPackagesService = new HubPackagesService();

