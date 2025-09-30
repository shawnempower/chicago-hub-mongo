import { getPublicationsCollection, getDatabase } from './client';
import { Publication, PublicationInsert, PublicationUpdate, LegacyMediaOutlet, convertLegacyToPublication } from './types';
import { ObjectId, Filter, UpdateFilter } from 'mongodb';

// Publications Service
export class PublicationsService {
  private collection = getPublicationsCollection();

  // Get all publications
  async getAll(filters?: Partial<Publication>): Promise<Publication[]> {
    try {
      const query: Filter<Publication> = {};
      
      if (filters) {
        // Build MongoDB query from filters
        if (filters.basicInfo?.geographicCoverage) {
          query['basicInfo.geographicCoverage'] = filters.basicInfo.geographicCoverage;
        }
        if (filters.basicInfo?.contentType) {
          query['basicInfo.contentType'] = filters.basicInfo.contentType;
        }
        if (filters.basicInfo?.publicationType) {
          query['basicInfo.publicationType'] = filters.basicInfo.publicationType;
        }
      }

      const publications = await this.collection.find(query).toArray();
      return publications as Publication[];
    } catch (error) {
      console.error('Error fetching publications:', error);
      throw error;
    }
  }

  // Get publication by ID
  async getById(id: string): Promise<Publication | null> {
    try {
      const publication = await this.collection.findOne({ 
        $or: [
          { _id: new ObjectId(id) },
          { publicationId: parseInt(id) }
        ]
      });
      return publication as Publication | null;
    } catch (error) {
      console.error('Error fetching publication by ID:', error);
      throw error;
    }
  }

  // Get publication by publicationId
  async getByPublicationId(publicationId: number): Promise<Publication | null> {
    try {
      const publication = await this.collection.findOne({ publicationId });
      return publication as Publication | null;
    } catch (error) {
      console.error('Error fetching publication by publicationId:', error);
      throw error;
    }
  }

  // Create new publication
  async create(publication: PublicationInsert): Promise<Publication> {
    try {
      // Generate next publicationId if not provided
      if (!publication.publicationId) {
        const lastPublication = await this.collection.findOne(
          {},
          { sort: { publicationId: -1 } }
        );
        publication.publicationId = (lastPublication?.publicationId || 0) + 1;
      }

      // Add metadata
      const now = new Date();
      publication.metadata = {
        ...publication.metadata,
        createdAt: now,
        lastUpdated: now,
        verificationStatus: 'needs_verification'
      };

      const result = await this.collection.insertOne(publication);
      const created = await this.collection.findOne({ _id: result.insertedId });
      return created as Publication;
    } catch (error) {
      console.error('Error creating publication:', error);
      throw error;
    }
  }

  // Update publication
  async update(id: string, updates: PublicationUpdate): Promise<Publication | null> {
    try {
      // Add update timestamp
      updates.metadata = {
        ...updates.metadata,
        lastUpdated: new Date()
      };

      const updateFilter: UpdateFilter<Publication> = { $set: updates };
      
      await this.collection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(id) },
            { publicationId: parseInt(id) }
          ]
        },
        updateFilter
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating publication:', error);
      throw error;
    }
  }

  // Delete publication (soft delete by setting metadata.verificationStatus)
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { 
          $or: [
            { _id: new ObjectId(id) },
            { publicationId: parseInt(id) }
          ]
        },
        { 
          $set: { 
            'metadata.verificationStatus': 'outdated',
            'metadata.lastUpdated': new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error deleting publication:', error);
      throw error;
    }
  }

  // Hard delete publication
  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ 
        $or: [
          { _id: new ObjectId(id) },
          { publicationId: parseInt(id) }
        ]
      });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error hard deleting publication:', error);
      throw error;
    }
  }

  // Search publications
  async search(query: string): Promise<Publication[]> {
    try {
      const searchFilter: Filter<Publication> = {
        $or: [
          { 'basicInfo.publicationName': { $regex: query, $options: 'i' } },
          { 'basicInfo.primaryServiceArea': { $regex: query, $options: 'i' } },
          { 'basicInfo.headquarters': { $regex: query, $options: 'i' } },
          { 'contactInfo.salesContact.email': { $regex: query, $options: 'i' } },
          { 'editorialInfo.contentFocus': { $elemMatch: { $regex: query, $options: 'i' } } }
        ]
      };

      const publications = await this.collection.find(searchFilter).toArray();
      return publications as Publication[];
    } catch (error) {
      console.error('Error searching publications:', error);
      throw error;
    }
  }

  // Get publications by geographic coverage
  async getByGeographicCoverage(coverage: string): Promise<Publication[]> {
    try {
      const publications = await this.collection.find({
        'basicInfo.geographicCoverage': coverage
      }).toArray();
      return publications as Publication[];
    } catch (error) {
      console.error('Error fetching publications by geographic coverage:', error);
      throw error;
    }
  }

  // Get publications with website metrics above threshold
  async getByMinimumTraffic(minVisitors: number): Promise<Publication[]> {
    try {
      const publications = await this.collection.find({
        'distributionChannels.website.metrics.monthlyVisitors': { $gte: minVisitors }
      }).toArray();
      return publications as Publication[];
    } catch (error) {
      console.error('Error fetching publications by traffic:', error);
      throw error;
    }
  }
}

// Legacy compatibility service for existing components
export class LegacyMediaOutletService {
  private publicationsService = new PublicationsService();

  // Convert Publication to LegacyMediaOutlet format
  private publicationToLegacy(publication: Publication): LegacyMediaOutlet {
    return {
      id: publication._id?.toString() || publication.publicationId.toString(),
      name: publication.basicInfo.publicationName || '',
      type: publication.basicInfo.contentType || 'mixed',
      website_url: publication.basicInfo.websiteUrl,
      description: publication.editorialInfo?.contentPillars?.join(', '),
      contact_email: publication.contactInfo?.salesContact?.email,
      contact_phone: publication.contactInfo?.mainPhone,
      audience_size: publication.audienceDemographics?.totalAudience?.toString(),
      coverage_area: publication.basicInfo.geographicCoverage,
      founding_year: typeof publication.basicInfo.founded === 'number' ? 
        publication.basicInfo.founded : 
        parseInt(publication.basicInfo.founded || '0'),
      monthly_visitors: publication.distributionChannels?.website?.metrics?.monthlyVisitors,
      email_subscribers: publication.distributionChannels?.newsletters?.[0]?.subscribers,
      open_rate: publication.distributionChannels?.newsletters?.[0]?.openRate,
      tagline: publication.basicInfo.headquarters,
      primary_market: publication.basicInfo.primaryServiceArea,
      publication_frequency: publication.basicInfo.publicationType,
      staff_count: publication.businessInfo?.numberOfEmployees,
      ownership_type: publication.businessInfo?.ownershipType,
      business_model: publication.businessInfo?.ownershipType,
      competitive_advantages: publication.competitiveInfo?.competitiveAdvantages?.join(', '),
      is_active: publication.metadata?.verificationStatus === 'verified',
      created_at: publication.metadata?.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: publication.metadata?.lastUpdated?.toISOString() || new Date().toISOString(),
      demographics: publication.audienceDemographics,
      editorial_focus: publication.editorialInfo,
      key_personnel: publication.contactInfo,
      secondary_markets: publication.basicInfo.secondaryMarkets,
      social_media: publication.socialMediaProfiles,
      technical_specs: publication.technicalCapabilities,
      awards: publication.awards,
    };
  }

  // Get all media outlets (legacy format)
  async getAll(): Promise<LegacyMediaOutlet[]> {
    try {
      const publications = await this.publicationsService.getAll();
      return publications.map(pub => this.publicationToLegacy(pub));
    } catch (error) {
      console.error('Error fetching legacy media outlets:', error);
      throw error;
    }
  }

  // Create media outlet from legacy format
  async create(legacyOutlet: Partial<LegacyMediaOutlet>): Promise<LegacyMediaOutlet> {
    try {
      const publication = convertLegacyToPublication(legacyOutlet as LegacyMediaOutlet);
      const created = await this.publicationsService.create(publication);
      return this.publicationToLegacy(created);
    } catch (error) {
      console.error('Error creating legacy media outlet:', error);
      throw error;
    }
  }

  // Update media outlet in legacy format
  async update(id: string, updates: Partial<LegacyMediaOutlet>): Promise<LegacyMediaOutlet | null> {
    try {
      const publication = convertLegacyToPublication(updates as LegacyMediaOutlet);
      const updated = await this.publicationsService.update(id, publication);
      return updated ? this.publicationToLegacy(updated) : null;
    } catch (error) {
      console.error('Error updating legacy media outlet:', error);
      throw error;
    }
  }

  // Delete media outlet
  async delete(id: string): Promise<boolean> {
    try {
      return await this.publicationsService.delete(id);
    } catch (error) {
      console.error('Error deleting legacy media outlet:', error);
      throw error;
    }
  }
}

// User data service (for non-publication data that still needs to be handled)
export class UserDataService {
  private db = getDatabase();

  // Saved outlets
  async getSavedOutlets(userId: string): Promise<string[]> {
    try {
      const collection = this.db.collection('saved_outlets');
      const saved = await collection.find({ userId }).toArray();
      return saved.map(item => item.outletId);
    } catch (error) {
      console.error('Error fetching saved outlets:', error);
      throw error;
    }
  }

  async saveOutlet(userId: string, outletId: string): Promise<void> {
    try {
      const collection = this.db.collection('saved_outlets');
      await collection.updateOne(
        { userId, outletId },
        { 
          $set: { 
            userId, 
            outletId, 
            savedAt: new Date() 
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving outlet:', error);
      throw error;
    }
  }

  async unsaveOutlet(userId: string, outletId: string): Promise<void> {
    try {
      const collection = this.db.collection('saved_outlets');
      await collection.deleteOne({ userId, outletId });
    } catch (error) {
      console.error('Error unsaving outlet:', error);
      throw error;
    }
  }

  // Lead inquiries
  async createLeadInquiry(lead: any): Promise<any> {
    try {
      const collection = this.db.collection('lead_inquiries');
      const result = await collection.insertOne({
        ...lead,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return await collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Error creating lead inquiry:', error);
      throw error;
    }
  }

  async getLeadInquiries(): Promise<any[]> {
    try {
      const collection = this.db.collection('lead_inquiries');
      return await collection.find({}).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error('Error fetching lead inquiries:', error);
      throw error;
    }
  }
}

// Export service instances
export const publicationsService = new PublicationsService();
export const legacyMediaOutletService = new LegacyMediaOutletService();
export const userDataService = new UserDataService();
