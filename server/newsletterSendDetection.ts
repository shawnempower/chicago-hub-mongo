/**
 * Detects newsletter "sends" by clustering daily impression dates into bursts.
 *
 * A single newsletter send generates opens that trickle in over multiple days
 * (most within 48h). This function groups consecutive dates that are within
 * `gapDays` of each other into a single send. A gap larger than `gapDays`
 * between dates signals a new send.
 *
 * @param dates - Array of date strings (YYYY-MM-DD format), unsorted is fine
 * @param gapDays - Max days between consecutive dates to consider them the same
 *                  send burst (default: 2)
 * @returns Number of detected sends
 */
export function countSendBursts(dates: string[], gapDays: number = 2): number {
  if (dates.length === 0) return 0;
  if (dates.length === 1) return 1;

  const sorted = [...dates].sort();
  let sends = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const curr = new Date(sorted[i] + 'T00:00:00Z');
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > gapDays) {
      sends++;
    }
  }

  return sends;
}

/**
 * Counts total newsletter sends across multiple itemPaths by clustering
 * distinct dates per path into bursts, then summing.
 *
 * @param itemPathDates - Array of { itemPath, distinctDates[] } from MongoDB aggregation
 * @param gapDays - Max gap between consecutive dates for same send (default: 2)
 * @returns Total number of detected sends across all placements
 */
export function countNewsletterSends(
  itemPathDates: Array<{ _id: string; distinctDates: string[] }>,
  gapDays: number = 2
): number {
  let total = 0;
  for (const item of itemPathDates) {
    total += countSendBursts(item.distinctDates, gapDays);
  }
  return total;
}
