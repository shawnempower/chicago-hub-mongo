/**
 * Campaign Service
 * 
 * Handles CRUD operations for campaigns in MongoDB
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from './client';
import { COLLECTIONS } from './schemas';
import { 
  Campaign, 
  CampaignInsert, 
  CampaignUpdate,
  CampaignListFilters,
  CampaignSummary,
  InsertionOrder
} from './campaignSchema';
import { calculateItemCost, calculatePublicationTotal, calculateCampaignTotal } from '../../utils/inventoryPricing';
import { calculatePackageReach } from '../../utils/reachCalculations';

const COLLECTION_NAME = COLLECTIONS.CAMPAIGNS;

export class CampaignsService {
  private get collection() {
    return getDatabase().collection<Campaign>(COLLECTION_NAME);
  }

  /**
   * Generate unique campaign ID
   */
  private generateCampaignId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `campaign-${timestamp}-${randomStr}`;
  }

  /**
   * Calculate duration in weeks and months from dates
   */
  private calculateDuration(startDate: Date | string, endDate: Date | string) {
    // Convert string dates to Date objects if needed
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const durationWeeks = Math.ceil(diffDays / 7);
    
    // Calculate months properly:
    // - For sub-month campaigns (< 28 days), use fractional months (weeks / 4)
    // - For 1+ month campaigns, round to nearest whole number
    let durationMonths: number;
    if (diffDays < 28) {
      // Sub-month: calculate as fraction of month (4 weeks = 1 month)
      durationMonths = durationWeeks / 4;
    } else {
      // 1+ month: round to nearest whole number, minimum 1
      durationMonths = Math.max(1, Math.round(diffDays / 30));
    }
    
    return { durationWeeks, durationMonths };
  }

  /**
   * PHASE 2: Validate campaign pricing using shared utilities
   * Recalculates pricing and compares with stored values
   */
  validateCampaignPricing(campaign: Campaign): { 
    isValid: boolean; 
    storedTotal: number; 
    calculatedTotal: number;
    discrepancy: number;
    message: string;
  } {
    try {
      if (!campaign.selectedInventory?.publications) {
        return {
          isValid: true,
          storedTotal: 0,
          calculatedTotal: 0,
          discrepancy: 0,
          message: 'No inventory to validate'
        };
      }

      // Recalculate using shared utilities (same as packages use)
      const durationMonths = campaign.timeline?.durationMonths || 1;
      const calculatedTotal = calculateCampaignTotal(
        campaign.selectedInventory.publications,
        durationMonths
      );

      const storedTotal = campaign.pricing?.subtotal || campaign.pricing?.finalPrice || 0;
      const discrepancy = Math.abs(calculatedTotal - storedTotal);
      const percentDiff = storedTotal > 0 ? (discrepancy / storedTotal) * 100 : 0;

      // Allow up to 1% difference due to rounding
      const isValid = percentDiff < 1;

      return {
        isValid,
        storedTotal,
        calculatedTotal,
        discrepancy,
        message: isValid 
          ? 'Pricing validation passed'
          : `Pricing discrepancy: stored=$${storedTotal.toFixed(2)}, calculated=$${calculatedTotal.toFixed(2)} (${percentDiff.toFixed(2)}% diff)`
      };
    } catch (error) {
      console.error('Error validating campaign pricing:', error);
      return {
        isValid: false,
        storedTotal: 0,
        calculatedTotal: 0,
        discrepancy: 0,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * PHASE 2: Validate campaign reach using shared utilities
   * Recalculates reach and compares with stored values
   */
  validateCampaignReach(campaign: Campaign): {
    isValid: boolean;
    storedReach: number;
    calculatedReach: number;
    discrepancy: number;
    message: string;
  } {
    try {
      if (!campaign.selectedInventory?.publications) {
        return {
          isValid: true,
          storedReach: 0,
          calculatedReach: 0,
          discrepancy: 0,
          message: 'No inventory to validate'
        };
      }

      // Recalculate using shared utilities (same as packages use)
      const reachSummary = calculatePackageReach(campaign.selectedInventory.publications);
      const calculatedReach = reachSummary.estimatedUniqueReach;

      const storedReach = campaign.estimatedPerformance?.reach?.min || 
                          campaign.estimatedPerformance?.reach?.max || 0;
      
      const discrepancy = Math.abs(calculatedReach - storedReach);
      const percentDiff = storedReach > 0 ? (discrepancy / storedReach) * 100 : 0;

      // Allow up to 10% difference (reach estimates are less precise)
      const isValid = percentDiff < 10;

      return {
        isValid,
        storedReach,
        calculatedReach,
        discrepancy,
        message: isValid
          ? 'Reach validation passed'
          : `Reach discrepancy: stored=${storedReach.toLocaleString()}, calculated=${calculatedReach.toLocaleString()} (${percentDiff.toFixed(2)}% diff)`
      };
    } catch (error) {
      console.error('Error validating campaign reach:', error);
      return {
        isValid: false,
        storedReach: 0,
        calculatedReach: 0,
        discrepancy: 0,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * PHASE 2: Recalculate all campaign metrics using shared utilities
   * Returns updated pricing and reach data
   */
  recalculateCampaignMetrics(campaign: Campaign): {
    pricing: {
      subtotal: number;
      publicationTotals: Record<number, number>;
    };
    reach: {
      estimatedUniqueReach: number;
      estimatedTotalReach: number;
      totalMonthlyImpressions?: number;
      totalMonthlyExposures?: number;
    };
  } {
    const durationMonths = campaign.timeline?.durationMonths || 1;
    const publications = campaign.selectedInventory?.publications || [];

    // Calculate pricing using shared utilities
    const subtotal = calculateCampaignTotal(publications, durationMonths);
    const publicationTotals: Record<number, number> = {};
    
    publications.forEach(pub => {
      publicationTotals[pub.publicationId] = calculatePublicationTotal(pub, durationMonths);
    });

    // Calculate reach using shared utilities
    const reachSummary = calculatePackageReach(publications);

    return {
      pricing: {
        subtotal,
        publicationTotals
      },
      reach: {
        estimatedUniqueReach: reachSummary.estimatedUniqueReach,
        estimatedTotalReach: reachSummary.estimatedTotalReach,
        totalMonthlyImpressions: reachSummary.totalMonthlyImpressions,
        totalMonthlyExposures: reachSummary.totalMonthlyExposures
      }
    };
  }

  /**
   * Create a new campaign
   */
  async create(campaignData: Omit<CampaignInsert, 'campaignId'>, userId: string): Promise<Campaign> {
    try {
      const now = new Date();
      const campaignId = this.generateCampaignId();
      
      // Calculate duration
      const duration = this.calculateDuration(
        campaignData.timeline.startDate,
        campaignData.timeline.endDate
      );

      const newCampaign: Campaign = {
        ...campaignData,
        campaignId,
        timeline: {
          ...campaignData.timeline,
          ...duration
        },
        metadata: {
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          version: 1,
          tags: campaignData.metadata?.tags || []
        }
      };

      const result = await this.collection.insertOne(newCampaign);
      const createdCampaign = { ...newCampaign, _id: result.insertedId };

      // PHASE 2: Validate calculations using shared utilities
      if (createdCampaign.selectedInventory?.publications) {
        const pricingValidation = this.validateCampaignPricing(createdCampaign);
        const reachValidation = this.validateCampaignReach(createdCampaign);

        if (!pricingValidation.isValid) {
          console.warn(`[Campaign ${campaignId}] ${pricingValidation.message}`);
        }
        if (!reachValidation.isValid) {
          console.warn(`[Campaign ${campaignId}] ${reachValidation.message}`);
        }

        // Log validation results for monitoring
        console.log(`[Campaign ${campaignId}] Validation complete:`, {
          pricing: pricingValidation.isValid ? 'PASS' : 'WARN',
          reach: reachValidation.isValid ? 'PASS' : 'WARN'
        });
      }

      return createdCampaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getById(id: string): Promise<Campaign | null> {
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return null;
      }

      const campaign = await this.collection.findOne({ 
        _id: objectId,
        deletedAt: { $exists: false }
      });
      
      return campaign;
    } catch (error) {
      console.error('Error getting campaign by ID:', error);
      throw error;
    }
  }

  /**
   * Get campaign by campaign ID
   */
  async getByCampaignId(campaignId: string): Promise<Campaign | null> {
    try {
      const campaign = await this.collection.findOne({ 
        campaignId,
        deletedAt: { $exists: false }
      });
      
      return campaign;
    } catch (error) {
      console.error('Error getting campaign by campaign ID:', error);
      throw error;
    }
  }

  /**
   * Get campaigns by hub
   */
  async getByHub(hubId: string, filters?: Omit<CampaignListFilters, 'hubId'>): Promise<Campaign[]> {
    try {
      const query: any = { 
        hubId,
        deletedAt: { $exists: false }
      };

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters?.createdBy) {
        query['metadata.createdBy'] = filters.createdBy;
      }

      if (filters?.startDateFrom || filters?.startDateTo) {
        query['timeline.startDate'] = {};
        if (filters.startDateFrom) {
          query['timeline.startDate'].$gte = filters.startDateFrom;
        }
        if (filters.startDateTo) {
          query['timeline.startDate'].$lte = filters.startDateTo;
        }
      }

      if (filters?.searchTerm) {
        query.$or = [
          { 'basicInfo.name': { $regex: filters.searchTerm, $options: 'i' } },
          { 'basicInfo.advertiserName': { $regex: filters.searchTerm, $options: 'i' } },
          { 'basicInfo.description': { $regex: filters.searchTerm, $options: 'i' } }
        ];
      }

      const campaigns = await this.collection
        .find(query)
        .sort({ 'metadata.createdAt': -1 })
        .toArray();

      return campaigns;
    } catch (error) {
      console.error('Error getting campaigns by hub:', error);
      throw error;
    }
  }

  /**
   * Get campaign summaries (lightweight list view)
   */
  async getCampaignSummaries(filters?: CampaignListFilters): Promise<CampaignSummary[]> {
    try {
      const query: any = { deletedAt: { $exists: false } };

      if (filters?.hubId) {
        query.hubId = filters.hubId;
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters?.createdBy) {
        query['metadata.createdBy'] = filters.createdBy;
      }

      if (filters?.startDateFrom || filters?.startDateTo) {
        query['timeline.startDate'] = {};
        if (filters.startDateFrom) {
          query['timeline.startDate'].$gte = filters.startDateFrom;
        }
        if (filters.startDateTo) {
          query['timeline.startDate'].$lte = filters.startDateTo;
        }
      }

      if (filters?.searchTerm) {
        query.$or = [
          { 'basicInfo.name': { $regex: filters.searchTerm, $options: 'i' } },
          { 'basicInfo.advertiserName': { $regex: filters.searchTerm, $options: 'i' } },
          { 'basicInfo.description': { $regex: filters.searchTerm, $options: 'i' } }
        ];
      }

      const campaigns = await this.collection
        .find(query)
        .project({
          _id: 1,
          campaignId: 1,
          'basicInfo.name': 1,
          'basicInfo.advertiserName': 1,
          status: 1,
          'objectives.budget.totalBudget': 1,
          'timeline.startDate': 1,
          'timeline.endDate': 1,
          'selectedInventory.totalPublications': 1,
          'metadata.createdAt': 1
        })
        .sort({ 'metadata.createdAt': -1 })
        .toArray();

      return campaigns.map(c => ({
        _id: c._id!.toString(),
        campaignId: c.campaignId,
        name: c.basicInfo.name,
        advertiserName: c.basicInfo.advertiserName,
        status: c.status,
        totalBudget: c.objectives.budget.totalBudget,
        startDate: c.timeline.startDate,
        endDate: c.timeline.endDate,
        publications: c.selectedInventory.totalPublications,
        createdAt: c.metadata.createdAt
      }));
    } catch (error) {
      console.error('Error getting campaign summaries:', error);
      throw error;
    }
  }

  /**
   * Update a campaign
   */
  async update(id: string, updates: CampaignUpdate, userId: string): Promise<Campaign | null> {
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return null;
      }

      // Recalculate duration if dates changed
      if (updates.timeline?.startDate && updates.timeline?.endDate) {
        const duration = this.calculateDuration(
          updates.timeline.startDate,
          updates.timeline.endDate
        );
        updates.timeline = {
          ...updates.timeline,
          ...duration
        };
      }

      // Get current version
      const current = await this.collection.findOne({ _id: objectId });
      if (!current) return null;

      const result = await this.collection.findOneAndUpdate(
        { _id: objectId, deletedAt: { $exists: false } },
        {
          $set: {
            ...updates,
            'metadata.updatedBy': userId,
            'metadata.updatedAt': new Date(),
            'metadata.version': (current.metadata.version || 1) + 1
          }
        },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign status
   */
  async updateStatus(
    id: string, 
    status: Campaign['status'],
    userId: string,
    approvalDetails?: {
      approvedBy?: string;
      rejectedBy?: string;
      rejectionReason?: string;
    }
  ): Promise<Campaign | null> {
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return null;
      }

      const updateData: any = {
        status,
        'metadata.updatedBy': userId,
        'metadata.updatedAt': new Date()
      };

      // Handle approval workflow
      if (status === 'approved' && approvalDetails?.approvedBy) {
        updateData['approval.approvedBy'] = approvalDetails.approvedBy;
        updateData['approval.approvedAt'] = new Date();
      } else if (status === 'pending_approval') {
        updateData['approval.requestedBy'] = userId;
        updateData['approval.requestedAt'] = new Date();
      } else if (approvalDetails?.rejectedBy) {
        updateData['approval.rejectedBy'] = approvalDetails.rejectedBy;
        updateData['approval.rejectedAt'] = new Date();
        if (approvalDetails.rejectionReason) {
          updateData['approval.rejectionReason'] = approvalDetails.rejectionReason;
        }
      }

      // Update execution dates
      if (status === 'active') {
        updateData['execution.launchDate'] = new Date();
      } else if (status === 'completed') {
        updateData['execution.completionDate'] = new Date();
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: objectId, deletedAt: { $exists: false } },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  }

  /**
   * Save/update insertion order
   */
  async saveInsertionOrder(id: string, insertionOrder: InsertionOrder): Promise<Campaign | null> {
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return null;
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: objectId, deletedAt: { $exists: false } },
        {
          $set: {
            insertionOrder,
            'metadata.updatedAt': new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error saving insertion order:', error);
      throw error;
    }
  }

  /**
   * Soft delete a campaign
   */
  async delete(id: string, userId: string): Promise<boolean> {
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return false;
      }

      const result = await this.collection.updateOne(
        { _id: objectId, deletedAt: { $exists: false } },
        {
          $set: {
            deletedAt: new Date(),
            deletedBy: userId,
            'metadata.updatedAt': new Date()
          }
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaigns by user
   */
  async getByUser(userId: string, filters?: Omit<CampaignListFilters, 'createdBy'>): Promise<Campaign[]> {
    try {
      return this.getByHub(filters?.hubId || '', { ...filters, createdBy: userId });
    } catch (error) {
      console.error('Error getting campaigns by user:', error);
      throw error;
    }
  }

  /**
   * Get campaign count by status
   */
  async getCountByStatus(hubId?: string): Promise<Record<Campaign['status'], number>> {
    try {
      const query: any = { deletedAt: { $exists: false } };
      if (hubId) {
        query.hubId = hubId;
      }

      const counts = await this.collection.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const result: Record<string, number> = {
        draft: 0,
        pending_approval: 0,
        approved: 0,
        active: 0,
        paused: 0,
        completed: 0,
        cancelled: 0
      };

      counts.forEach(c => {
        result[c._id] = c.count;
      });

      return result as Record<Campaign['status'], number>;
    } catch (error) {
      console.error('Error getting campaign count by status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const campaignsService = new CampaignsService();

