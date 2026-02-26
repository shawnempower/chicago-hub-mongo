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
const FREQUENCY_BASED_MODELS = [
  'per_day', 'per_week', 'per_spot', 'per_send',
  'per_post', 'per_episode', 'per_ad', 'per_story',
];

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
    } else if (FREQUENCY_BASED_MODELS.includes(pricingModel)) {
      const maxFreq = getMaxFrequencyForModel(pricingModel, item);
      const ratio = frequency / maxFreq;
      goalValue = Math.round(monthlyBase * ratio * durationMonths);
      description = `${monthlyBase.toLocaleString()}/mo × ${frequency}/${maxFreq} ${pricingModel.replace('per_', '')}s × ${durationMonths} mo`;
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

/**
 * Max frequency per month for a given pricing model.
 * Used to compute the proportional share of monthly impressions.
 */
function getMaxFrequencyForModel(pricingModel: string, item: any): number {
  switch (pricingModel) {
    case 'per_day':   return 30;
    case 'per_week':  return 4;
    case 'per_spot':  return item.maxFrequency || 30;
    case 'per_send':  return item.maxFrequency || 4;
    case 'per_post':  return item.maxFrequency || 4;
    case 'per_episode': return item.maxFrequency || 4;
    case 'per_ad':    return item.maxFrequency || 4;
    case 'per_story': return item.maxFrequency || 4;
    default:          return item.maxFrequency || 1;
  }
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
