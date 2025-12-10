/**
 * Daily Aggregate Schema
 * 
 * Pre-computed daily rollups for fast reporting.
 * Generated from performance_entries by aggregation job.
 * 
 * Key design decisions:
 * - Daily is the base granularity (roll up to weekly/monthly in queries)
 * - Compound key: date + campaign + publication + channel (unique together)
 * - Includes goal info for pacing calculations
 */

import { ObjectId } from 'mongodb';
import { PerformanceChannel } from './performanceEntrySchema';

/**
 * Goal types for pacing calculations
 */
export type GoalType = 'impressions' | 'clicks' | 'units';

/**
 * Daily Aggregate Document
 * 
 * Represents aggregated performance data for a specific day, campaign, publication, and channel.
 * Used for fast reporting queries without scanning all performance entries.
 */
export interface DailyAggregate {
  _id?: string | ObjectId;
  
  // Compound key (unique together)
  date: Date;                  // Normalized to start of day (UTC)
  campaignId: string;
  publicationId: number;
  channel: PerformanceChannel;
  
  // Denormalized for display
  publicationName?: string;
  campaignName?: string;
  
  // Aggregated metrics
  impressions: number;
  clicks: number;
  unitsDelivered: number;      // Spots, insertions, posts - channel-appropriate
  reach: number;
  
  // Computed metrics
  ctr?: number;                // clicks / impressions * 100
  
  // Goals (copied from order for pacing calculations)
  goalValue?: number;
  goalType?: GoalType;
  
  // Metadata
  computedAt: Date;            // When this aggregate was last computed
  entryCount: number;          // Number of performance_entries rolled up
  
  // Soft delete (for data corrections)
  deletedAt?: Date;
}

// Type for creating new aggregates
export type DailyAggregateInsert = Omit<DailyAggregate, '_id'>;

// Type for updating aggregates (usually just recomputing)
export type DailyAggregateUpdate = Partial<Omit<DailyAggregate, '_id' | 'date' | 'campaignId' | 'publicationId' | 'channel'>>;

/**
 * Normalize a date to start of day (UTC)
 */
export function normalizeToDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Get date range for a time period
 */
export function getDateRange(
  period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom',
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date } {
  const now = new Date();
  const today = normalizeToDay(now);
  
  switch (period) {
    case 'today':
      return { start: today, end: today };
    
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: normalizeToDay(start), end: today };
    }
    
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: normalizeToDay(start), end: normalizeToDay(end) };
    }
    
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires start and end dates');
      }
      return { start: normalizeToDay(customStart), end: normalizeToDay(customEnd) };
    
    default:
      return { start: today, end: today };
  }
}

/**
 * Compute CTR from clicks and impressions
 */
export function computeCTR(clicks: number, impressions: number): number | undefined {
  if (impressions === 0) return undefined;
  return Math.round((clicks / impressions) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Pacing status based on expected vs actual delivery
 */
export type PacingStatus = 'on_track' | 'ahead' | 'behind' | 'at_risk';

/**
 * Calculate pacing status
 * @param delivered - Amount delivered so far
 * @param goal - Total goal
 * @param daysPassed - Days since campaign start
 * @param totalDays - Total campaign duration in days
 */
export function calculatePacingStatus(
  delivered: number,
  goal: number,
  daysPassed: number,
  totalDays: number
): { status: PacingStatus; percentComplete: number; expectedPercent: number } {
  if (goal === 0 || totalDays === 0) {
    return { status: 'on_track', percentComplete: 0, expectedPercent: 0 };
  }
  
  const percentComplete = Math.round((delivered / goal) * 100);
  const expectedPercent = Math.round((daysPassed / totalDays) * 100);
  
  // Calculate ratio of actual to expected
  const ratio = expectedPercent > 0 ? percentComplete / expectedPercent : 1;
  
  let status: PacingStatus;
  if (ratio >= 1.1) {
    status = 'ahead';      // >110% of expected
  } else if (ratio >= 0.9) {
    status = 'on_track';   // 90-110% of expected
  } else if (ratio >= 0.7) {
    status = 'behind';     // 70-90% of expected
  } else {
    status = 'at_risk';    // <70% of expected
  }
  
  return { status, percentComplete, expectedPercent };
}

/**
 * Pacing status colors for UI
 */
export const PACING_STATUS_COLORS: Record<PacingStatus, string> = {
  on_track: 'green',
  ahead: 'blue',
  behind: 'yellow',
  at_risk: 'red',
};

/**
 * Pacing status labels for UI
 */
export const PACING_STATUS_LABELS: Record<PacingStatus, string> = {
  on_track: 'On Track',
  ahead: 'Ahead',
  behind: 'Behind',
  at_risk: 'At Risk',
};

/**
 * Aggregated totals for a time period
 */
export interface PeriodAggregate {
  dateRange: {
    start: Date;
    end: Date;
  };
  totals: {
    impressions: number;
    clicks: number;
    units: number;
    reach: number;
    ctr?: number;
  };
  byChannel: Record<PerformanceChannel, {
    impressions: number;
    clicks: number;
    units: number;
    reach: number;
    days: number;
  }>;
  byPublication: Array<{
    publicationId: number;
    publicationName: string;
    impressions: number;
    clicks: number;
    units: number;
    days: number;
  }>;
  dayCount: number;
}

/**
 * Campaign pacing summary
 */
export interface CampaignPacingSummary {
  campaignId: string;
  campaignName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  daysTotal: number;
  daysPassed: number;
  daysRemaining: number;
  overall: {
    goal: number;
    delivered: number;
    status: PacingStatus;
    percentComplete: number;
    expectedPercent: number;
  };
  byChannel: Record<string, {
    goal: number;
    delivered: number;
    status: PacingStatus;
    percentComplete: number;
  }>;
}

// Re-export ESP types from dedicated schema file
export type { ESPHTMLSupport, ESPReference, ESPReferenceInsert } from './espReferenceSchema';
export { 
  ESP_SEED_DATA,
  ESP_HTML_SUPPORT_LABELS,
  ESP_HTML_SUPPORT_DESCRIPTIONS,
  getESPsBySupport,
  getActiveESPs,
  findESPBySlug,
  supportsFullHTML
} from './espReferenceSchema';
