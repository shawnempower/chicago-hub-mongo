export interface DateImpression {
  date: string;
  impressions: number;
}

const DEFAULT_MIN_IMPRESSIONS = 100;
const SUBSCRIBER_THRESHOLD_RATIO = 0.02;

/**
 * Compute the minimum impressions required for a burst to count as a send.
 * When subscriber count is known, uses 2% of subscribers (at least 100).
 * When unknown, falls back to a flat 100.
 */
export function getMinImpressions(subscriberCount?: number): number {
  if (subscriberCount && subscriberCount > 0) {
    return Math.max(DEFAULT_MIN_IMPRESSIONS, Math.round(subscriberCount * SUBSCRIBER_THRESHOLD_RATIO));
  }
  return DEFAULT_MIN_IMPRESSIONS;
}

/**
 * Detects newsletter "sends" by clustering daily impression dates into bursts,
 * then filtering out bursts that don't meet a minimum impression threshold.
 *
 * A single newsletter send generates opens that trickle in over multiple days
 * (most within 48h). This function groups consecutive dates that are within
 * `gapDays` of each other into a single send. A gap larger than `gapDays`
 * between dates signals a new send.
 *
 * Bursts whose total impressions fall below `minImpressions` are discarded
 * as noise (stray pixel fires, test traffic, etc.).
 */
export function countSendBursts(
  dateImpressions: DateImpression[],
  gapDays: number = 2,
  minImpressions: number = DEFAULT_MIN_IMPRESSIONS
): number {
  if (dateImpressions.length === 0) return 0;

  const sorted = [...dateImpressions].sort((a, b) => a.date.localeCompare(b.date));

  const bursts: number[] = [];
  let currentBurstImpressions = sorted[0].impressions;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + 'T00:00:00Z');
    const curr = new Date(sorted[i].date + 'T00:00:00Z');
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > gapDays) {
      bursts.push(currentBurstImpressions);
      currentBurstImpressions = sorted[i].impressions;
    } else {
      currentBurstImpressions += sorted[i].impressions;
    }
  }
  bursts.push(currentBurstImpressions);

  return bursts.filter(total => total >= minImpressions).length;
}

/**
 * Counts total newsletter sends across multiple itemPaths by clustering
 * distinct dates per path into bursts, filtering by minimum impressions,
 * then summing.
 *
 * @param itemPathData - Array of { _id (itemPath), dateImpressions[] } from MongoDB aggregation
 * @param gapDays - Max gap between consecutive dates for same send (default: 2)
 * @param subscribersByItemPath - Optional map of itemPath -> subscriber count for
 *   computing per-placement thresholds. When a placement's subscriber count is known,
 *   the threshold is max(100, subscribers * 2%). Otherwise falls back to 100.
 */
export function countNewsletterSends(
  itemPathData: Array<{ _id: string; dateImpressions: DateImpression[] }>,
  gapDays: number = 2,
  subscribersByItemPath?: Record<string, number>
): number {
  let total = 0;
  for (const item of itemPathData) {
    const subscribers = subscribersByItemPath?.[item._id];
    const minImpressions = getMinImpressions(subscribers);
    total += countSendBursts(item.dateImpressions, gapDays, minImpressions);
  }
  return total;
}
