/**
 * Default rejection reasons for placement rejections.
 * Used as preset options in the publication rejection dialog.
 */
export const DEFAULT_REJECTION_REASONS = [
  'Scheduling conflict',
  'Sold out / No available inventory',
  'Content does not align with editorial standards',
  'Ad specs or creative not suitable for placement',
  'Advertiser conflict with existing sponsor',
  'Rate or budget disagreement',
  'Insufficient lead time',
  'Other (specify below)',
] as const;

export type DefaultRejectionReason = typeof DEFAULT_REJECTION_REASONS[number];

/**
 * Extract the most recent rejection reason for a given placement
 * from the placementStatusHistory array.
 */
export function getRejectionReason(
  placementStatusHistory: Array<{
    placementId: string;
    status: string;
    timestamp: Date | string;
    changedBy: string;
    notes?: string;
  }> | undefined,
  placementId: string
): string | undefined {
  if (!placementStatusHistory) return undefined;
  // Find the most recent 'rejected' entry for this placement
  const entries = placementStatusHistory
    .filter(e => e.placementId === placementId && e.status === 'rejected')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries[0]?.notes;
}
