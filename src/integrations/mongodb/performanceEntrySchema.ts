/**
 * Performance Entry Schema
 * 
 * Stores individual performance reports at the placement level.
 * Supports both manual entry (offline channels) and future automated ingestion (digital channels).
 * 
 * Key design decisions:
 * - Denormalize key placement data (itemName, channel, dimensions) for stability when inventory changes
 * - Daily granularity as the base unit, with dateEnd for multi-day entries
 * - Channel-specific metrics with all fields optional
 */

import { ObjectId } from 'mongodb';

// Channel types supported for performance tracking
export type PerformanceChannel = 
  | 'print' 
  | 'radio' 
  | 'podcast' 
  | 'events' 
  | 'social' 
  | 'website' 
  | 'newsletter' 
  | 'streaming';

// Source of the performance data
export type PerformanceSource = 'manual' | 'import' | 'automated';

// Validation status set by Lambda during sync
export type ValidationStatus = 'valid' | 'bad_pixel' | 'invalid_orderId';

/**
 * Channel-specific metrics
 * All fields are optional - only relevant metrics for the channel should be populated
 */
export interface PerformanceMetrics {
  // Universal metrics (applicable to most channels)
  impressions?: number;
  reach?: number;
  
  // Digital metrics (website, newsletter, streaming)
  clicks?: number;
  ctr?: number;              // Computed: clicks/impressions * 100
  viewability?: number;      // Percentage viewable (0-100)
  
  // Print metrics
  insertions?: number;       // Number of times ad ran (issues)
  circulation?: number;      // Total copies distributed
  
  // Radio metrics
  spotsAired?: number;       // Number of spots that aired
  frequency?: number;        // Average times reached per listener
  
  // Podcast metrics
  downloads?: number;
  listens?: number;
  completionRate?: number;   // Percentage who listened to completion (0-100)
  
  // Events metrics
  attendance?: number;
  
  // Social metrics
  posts?: number;
  engagements?: number;      // Likes, comments, reactions
  shares?: number;
  videoViews?: number;
}

/**
 * Performance Entry Document
 * 
 * Represents a single performance report for a specific placement within an order.
 * Entries are self-describing through denormalized fields, so they remain readable
 * even if the source publication inventory changes over time.
 */
export interface PerformanceEntry {
  _id?: string | ObjectId;
  
  // References to parent entities
  orderId: string;           // FK to publication_insertion_orders._id
  campaignId: string;        // For direct campaign queries
  publicationId: number;
  publicationName: string;   // Denormalized for display
  
  // Placement identification (denormalized for stability)
  // Even if inventory changes, the entry remains readable and meaningful
  itemPath: string;          // Original path (e.g., "distributionChannels.print[0].advertisingOpportunities[0]")
  itemName: string;          // Human-readable name (e.g., "Full Page Color Ad")
  channel: PerformanceChannel;
  dimensions?: string;       // Size/format (e.g., "728x90", "Full Page", "30 seconds")
  
  // Time period (daily granularity base)
  dateStart: Date;           // Start of reporting period
  dateEnd?: Date;            // End date for multi-day entries (null = single day)
  
  // Performance metrics
  metrics: PerformanceMetrics;
  
  // Entry metadata
  source: PerformanceSource;
  enteredBy: string;         // User ID who entered the data
  enteredAt: Date;
  notes?: string;            // Additional context (e.g., "Ran in Sunday edition")
  
  // Validation (set by Lambda for automated entries)
  validationStatus?: ValidationStatus;
  
  // Audit trail
  updatedBy?: string;
  updatedAt?: Date;
  
  // Soft delete
  deletedAt?: Date;
}

// Type for creating new entries
export type PerformanceEntryInsert = Omit<PerformanceEntry, '_id'>;

// Type for updating entries
export type PerformanceEntryUpdate = Partial<Omit<PerformanceEntry, '_id' | 'orderId' | 'campaignId' | 'publicationId' | 'enteredBy' | 'enteredAt'>> & {
  updatedBy: string;
  updatedAt: Date;
};

/**
 * Get metrics fields relevant to a specific channel
 * Used by UI to show only appropriate input fields
 */
export function getChannelMetricFields(channel: PerformanceChannel): (keyof PerformanceMetrics)[] {
  const universal: (keyof PerformanceMetrics)[] = ['impressions', 'reach'];
  
  switch (channel) {
    case 'website':
    case 'newsletter':
    case 'streaming':
      return [...universal, 'clicks', 'ctr', 'viewability', 'videoViews'];
    case 'print':
      return [...universal, 'insertions', 'circulation'];
    case 'radio':
      return [...universal, 'spotsAired', 'frequency'];
    case 'podcast':
      return [...universal, 'downloads', 'listens', 'completionRate'];
    case 'events':
      return ['attendance', 'reach'];
    case 'social':
      return [...universal, 'posts', 'engagements', 'shares', 'videoViews'];
    default:
      return universal;
  }
}

/**
 * Metric labels for display
 */
export const METRIC_LABELS: Record<keyof PerformanceMetrics, string> = {
  impressions: 'Impressions',
  reach: 'Reach',
  clicks: 'Clicks',
  ctr: 'CTR (%)',
  viewability: 'Viewability (%)',
  insertions: 'Insertions',
  circulation: 'Circulation',
  spotsAired: 'Spots Aired',
  frequency: 'Frequency',
  downloads: 'Downloads',
  listens: 'Listens',
  completionRate: 'Completion Rate (%)',
  attendance: 'Attendance',
  posts: 'Posts',
  engagements: 'Engagements',
  shares: 'Shares',
  videoViews: 'Video Views',
};

/**
 * Validate a performance entry before saving
 */
export function validatePerformanceEntry(entry: Partial<PerformanceEntry>): string[] {
  const errors: string[] = [];
  
  if (!entry.orderId) errors.push('orderId is required');
  if (!entry.campaignId) errors.push('campaignId is required');
  if (!entry.publicationId) errors.push('publicationId is required');
  if (!entry.publicationName) errors.push('publicationName is required');
  if (!entry.itemPath) errors.push('itemPath is required');
  if (!entry.itemName) errors.push('itemName is required');
  if (!entry.channel) errors.push('channel is required');
  if (!entry.dateStart) errors.push('dateStart is required');
  if (!entry.source) errors.push('source is required');
  if (!entry.enteredBy) errors.push('enteredBy is required');
  
  // Validate date range
  if (entry.dateStart && entry.dateEnd && entry.dateEnd < entry.dateStart) {
    errors.push('dateEnd must be after dateStart');
  }
  
  // Validate percentage fields
  if (entry.metrics) {
    if (entry.metrics.ctr !== undefined && (entry.metrics.ctr < 0 || entry.metrics.ctr > 100)) {
      errors.push('CTR must be between 0 and 100');
    }
    if (entry.metrics.viewability !== undefined && (entry.metrics.viewability < 0 || entry.metrics.viewability > 100)) {
      errors.push('Viewability must be between 0 and 100');
    }
    if (entry.metrics.completionRate !== undefined && (entry.metrics.completionRate < 0 || entry.metrics.completionRate > 100)) {
      errors.push('Completion rate must be between 0 and 100');
    }
  }
  
  return errors;
}

/**
 * Compute CTR from clicks and impressions
 */
export function computeCTR(clicks?: number, impressions?: number): number | undefined {
  if (clicks === undefined || impressions === undefined || impressions === 0) {
    return undefined;
  }
  return Math.round((clicks / impressions) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Summary of performance entries for an order
 */
export interface OrderPerformanceSummary {
  orderId: string;
  totalEntries: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  byChannel: Record<PerformanceChannel, {
    entries: number;
    totalImpressions: number;
    totalClicks: number;
    totalUnits: number; // Insertions, spots, posts - channel appropriate
    totalReach: number;
  }>;
  lastUpdated: Date;
}

/**
 * Summary of performance for a campaign
 */
export interface CampaignPerformanceSummary {
  campaignId: string;
  totalEntries: number;
  totalPublications: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  totals: {
    impressions: number;
    clicks: number;
    reach: number;
  };
  byChannel: Record<PerformanceChannel, {
    publications: number;
    entries: number;
    impressions: number;
    clicks: number;
    units: number;
    reach: number;
  }>;
  byPublication: Array<{
    publicationId: number;
    publicationName: string;
    entries: number;
    impressions: number;
    clicks: number;
    units: number;
  }>;
  lastUpdated: Date;
}
