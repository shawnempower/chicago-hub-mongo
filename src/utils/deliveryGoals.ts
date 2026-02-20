/**
 * Delivery Goals Utility
 *
 * Single source of truth for computing delivery goals per placement.
 * Called once at order creation and stored on the order as `deliveryGoals`.
 * All consumers (reporting, earnings, completion, UI) read the stored value.
 */

export interface DeliveryGoal {
  goalType: 'impressions' | 'clicks' | 'units';
  goalValue: number;
  description: string;
}

const DIGITAL_CHANNELS = ['website', 'display', 'streaming'];
const CPM_PRICING_MODELS = ['cpm', 'cpv', 'cpc'];

/**
 * Get the monthly impression count from an inventory item.
 * Prefers the explicit `monthlyImpressions` field; falls back to
 * `performanceMetrics.impressionsPerMonth` for legacy items created
 * before the builder was fixed to always set `monthlyImpressions`.
 */
export function getMonthlyImpressions(item: any): number {
  return item.monthlyImpressions || item.performanceMetrics?.impressionsPerMonth || 0;
}

/**
 * Compute campaign duration in whole months from start/end dates.
 */
export function getDurationMonths(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined
): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.round(diffDays / 30));
}

/**
 * Compute the delivery goal for a single inventory item.
 */
export function computeItemDeliveryGoal(
  item: any,
  durationMonths: number
): DeliveryGoal {
  const channel = (item.channel || 'other').toLowerCase();
  const pricingModel = item.itemPricing?.pricingModel || 'flat';
  const frequency = item.currentFrequency || item.quantity || 1;

  if (DIGITAL_CHANNELS.includes(channel)) {
    const monthlyBase = getMonthlyImpressions(item);
    let goalValue: number;
    let description: string;

    if (CPM_PRICING_MODELS.includes(pricingModel)) {
      const sharePercent = frequency;
      goalValue = Math.round(monthlyBase * (sharePercent / 100) * durationMonths);
      description = `${monthlyBase.toLocaleString()}/mo × ${sharePercent}% SOV × ${durationMonths} mo`;
    } else {
      goalValue = monthlyBase * durationMonths;
      description = `${monthlyBase.toLocaleString()}/mo × ${durationMonths} mo`;
    }

    return { goalType: 'impressions', goalValue, description };
  }

  // All non-digital channels: frequency-based unit goal
  const unitLabel = getUnitLabel(channel);
  return {
    goalType: 'units',
    goalValue: frequency,
    description: `${frequency} ${unitLabel}`,
  };
}

/**
 * Compute delivery goals for all inventory items in an order.
 * Returns a map keyed by itemPath, matching the schema in insertionOrderSchema.ts.
 */
export function computeDeliveryGoals(
  inventoryItems: any[],
  campaignStartDate: string | Date | undefined,
  campaignEndDate: string | Date | undefined
): Record<string, DeliveryGoal> {
  const durationMonths = getDurationMonths(campaignStartDate, campaignEndDate);
  const goals: Record<string, DeliveryGoal> = {};

  for (const item of inventoryItems) {
    if (item.isExcluded) continue;
    const itemPath = item.itemPath || item.sourcePath;
    if (!itemPath) continue;

    goals[itemPath] = computeItemDeliveryGoal(item, durationMonths);
  }

  return goals;
}

function getUnitLabel(channel: string): string {
  switch (channel) {
    case 'newsletter': return 'send(s)';
    case 'print': return 'insertion(s)';
    case 'radio': return 'spot(s)';
    case 'podcast': return 'episode(s)';
    case 'events': return 'event(s)';
    case 'social_media': return 'post(s)';
    default: return 'unit(s)';
  }
}
