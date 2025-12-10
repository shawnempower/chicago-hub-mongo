/**
 * Performance Aggregation Service
 * 
 * Computes daily aggregates from performance_entries for fast reporting.
 * Can be run as a scheduled job or triggered on-demand.
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { PerformanceEntry, PerformanceChannel } from '../integrations/mongodb/performanceEntrySchema';
import { DailyAggregate, normalizeToDay, computeCTR } from '../integrations/mongodb/dailyAggregateSchema';

/**
 * Aggregation result for a single day/campaign/publication/channel combination
 */
interface AggregationResult {
  date: Date;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  channel: PerformanceChannel;
  impressions: number;
  clicks: number;
  unitsDelivered: number;
  reach: number;
  entryCount: number;
}

/**
 * Options for running aggregation
 */
interface AggregationOptions {
  dateFrom: Date;
  dateTo: Date;
  campaignId?: string;
  publicationId?: number;
  forceRecompute?: boolean;
}

/**
 * Result of aggregation run
 */
interface AggregationRunResult {
  success: boolean;
  aggregatesCreated: number;
  aggregatesUpdated: number;
  dateRange: { from: Date; to: Date };
  duration: number;
  errors: string[];
}

class PerformanceAggregationService {
  /**
   * Run aggregation for a date range
   * This is the main entry point for computing daily aggregates
   */
  async runAggregation(options: AggregationOptions): Promise<AggregationRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let aggregatesCreated = 0;
    let aggregatesUpdated = 0;

    try {
      const db = getDatabase();
      const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);
      const aggregatesCollection = db.collection<DailyAggregate>(COLLECTIONS.DAILY_AGGREGATES);

      // Build match criteria
      const match: any = {
        dateStart: {
          $gte: normalizeToDay(options.dateFrom),
          $lte: normalizeToDay(options.dateTo)
        },
        deletedAt: { $exists: false }
      };

      if (options.campaignId) {
        match.campaignId = options.campaignId;
      }

      if (options.publicationId) {
        match.publicationId = options.publicationId;
      }

      // Aggregate performance entries by day/campaign/publication/channel
      const aggregations = await perfCollection.aggregate<AggregationResult>([
        { $match: match },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$dateStart' } },
              campaignId: '$campaignId',
              publicationId: '$publicationId',
              channel: '$channel',
            },
            publicationName: { $first: '$publicationName' },
            impressions: { $sum: { $ifNull: ['$metrics.impressions', 0] } },
            clicks: { $sum: { $ifNull: ['$metrics.clicks', 0] } },
            reach: { $sum: { $ifNull: ['$metrics.reach', 0] } },
            unitsDelivered: {
              $sum: {
                $add: [
                  { $ifNull: ['$metrics.insertions', 0] },
                  { $ifNull: ['$metrics.spotsAired', 0] },
                  { $ifNull: ['$metrics.downloads', 0] },
                  { $ifNull: ['$metrics.posts', 0] }
                ]
              }
            },
            entryCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: { $dateFromString: { dateString: '$_id.date' } },
            campaignId: '$_id.campaignId',
            publicationId: '$_id.publicationId',
            channel: '$_id.channel',
            publicationName: 1,
            impressions: 1,
            clicks: 1,
            reach: 1,
            unitsDelivered: 1,
            entryCount: 1
          }
        }
      ]).toArray();

      console.log(`[AggregationService] Processing ${aggregations.length} aggregate groups`);

      const now = new Date();

      // Upsert each aggregate
      for (const agg of aggregations) {
        try {
          const ctr = computeCTR(agg.clicks, agg.impressions);

          const result = await aggregatesCollection.updateOne(
            {
              date: agg.date,
              campaignId: agg.campaignId,
              publicationId: agg.publicationId,
              channel: agg.channel,
            },
            {
              $set: {
                publicationName: agg.publicationName,
                impressions: agg.impressions,
                clicks: agg.clicks,
                unitsDelivered: agg.unitsDelivered,
                reach: agg.reach,
                ctr,
                computedAt: now,
                entryCount: agg.entryCount,
              }
            },
            { upsert: true }
          );

          if (result.upsertedCount > 0) {
            aggregatesCreated++;
          } else if (result.modifiedCount > 0) {
            aggregatesUpdated++;
          }
        } catch (err) {
          const errorMsg = `Error upserting aggregate for ${agg.campaignId}/${agg.publicationId}/${agg.channel}: ${err}`;
          console.error(`[AggregationService] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AggregationService] Completed in ${duration}ms: ${aggregatesCreated} created, ${aggregatesUpdated} updated`);

      return {
        success: errors.length === 0,
        aggregatesCreated,
        aggregatesUpdated,
        dateRange: { from: options.dateFrom, to: options.dateTo },
        duration,
        errors
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[AggregationService] Fatal error: ${errorMsg}`);
      
      return {
        success: false,
        aggregatesCreated,
        aggregatesUpdated,
        dateRange: { from: options.dateFrom, to: options.dateTo },
        duration,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Run aggregation for yesterday (typical daily job)
   */
  async runDailyAggregation(): Promise<AggregationRunResult> {
    const today = normalizeToDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`[AggregationService] Running daily aggregation for ${yesterday.toISOString().split('T')[0]}`);

    return this.runAggregation({
      dateFrom: yesterday,
      dateTo: yesterday,
    });
  }

  /**
   * Recompute aggregates for a specific campaign
   */
  async recomputeForCampaign(campaignId: string): Promise<AggregationRunResult> {
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);

    // Get the date range for this campaign's entries
    const dateRange = await perfCollection.aggregate([
      { $match: { campaignId, deletedAt: { $exists: false } } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$dateStart' },
          maxDate: { $max: '$dateStart' }
        }
      }
    ]).toArray();

    if (dateRange.length === 0 || !dateRange[0].minDate || !dateRange[0].maxDate) {
      return {
        success: true,
        aggregatesCreated: 0,
        aggregatesUpdated: 0,
        dateRange: { from: new Date(), to: new Date() },
        duration: 0,
        errors: []
      };
    }

    console.log(`[AggregationService] Recomputing aggregates for campaign ${campaignId}`);

    return this.runAggregation({
      dateFrom: dateRange[0].minDate,
      dateTo: dateRange[0].maxDate,
      campaignId,
      forceRecompute: true
    });
  }

  /**
   * Recompute aggregates for a specific order
   */
  async recomputeForOrder(orderId: string): Promise<AggregationRunResult> {
    const db = getDatabase();
    const perfCollection = db.collection<PerformanceEntry>(COLLECTIONS.PERFORMANCE_ENTRIES);

    // Get the campaign and publication from the order's entries
    const entries = await perfCollection.find({ 
      orderId, 
      deletedAt: { $exists: false } 
    }).limit(1).toArray();

    if (entries.length === 0) {
      return {
        success: true,
        aggregatesCreated: 0,
        aggregatesUpdated: 0,
        dateRange: { from: new Date(), to: new Date() },
        duration: 0,
        errors: []
      };
    }

    const { campaignId, publicationId } = entries[0];

    // Get the date range
    const dateRange = await perfCollection.aggregate([
      { $match: { orderId, deletedAt: { $exists: false } } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$dateStart' },
          maxDate: { $max: '$dateStart' }
        }
      }
    ]).toArray();

    if (dateRange.length === 0 || !dateRange[0].minDate || !dateRange[0].maxDate) {
      return {
        success: true,
        aggregatesCreated: 0,
        aggregatesUpdated: 0,
        dateRange: { from: new Date(), to: new Date() },
        duration: 0,
        errors: []
      };
    }

    console.log(`[AggregationService] Recomputing aggregates for order ${orderId}`);

    return this.runAggregation({
      dateFrom: dateRange[0].minDate,
      dateTo: dateRange[0].maxDate,
      campaignId,
      publicationId,
      forceRecompute: true
    });
  }

  /**
   * Backfill aggregates for the last N days
   */
  async backfill(days: number = 30): Promise<AggregationRunResult> {
    const today = normalizeToDay(new Date());
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    console.log(`[AggregationService] Backfilling aggregates for last ${days} days`);

    return this.runAggregation({
      dateFrom: startDate,
      dateTo: today,
      forceRecompute: true
    });
  }

  /**
   * Delete stale aggregates (for entries that were deleted)
   */
  async cleanupStaleAggregates(): Promise<{ deleted: number }> {
    const db = getDatabase();
    const aggregatesCollection = db.collection<DailyAggregate>(COLLECTIONS.DAILY_AGGREGATES);

    // Find aggregates with entryCount of 0 (shouldn't exist normally)
    const result = await aggregatesCollection.deleteMany({ entryCount: 0 });

    console.log(`[AggregationService] Cleaned up ${result.deletedCount} stale aggregates`);

    return { deleted: result.deletedCount };
  }
}

// Export singleton instance
export const performanceAggregationService = new PerformanceAggregationService();

// Export for testing/direct use
export { PerformanceAggregationService, AggregationOptions, AggregationRunResult };
