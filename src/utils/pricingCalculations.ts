import { PerformanceMetrics } from '@/integrations/mongodb/schemas';

// ===== TYPES =====

export interface StandardPricing {
  flatRate?: number;
  pricingModel?: string;
  frequency?: string; // Commitment frequency (1x, 4x, 12x, etc.)
}

export interface InventoryItem {
  pricing?: StandardPricing | StandardPricing[];
  performanceMetrics?: PerformanceMetrics;
  monthlyImpressions?: number; // Legacy support
}

export interface DailyMetrics {
  dailyOccurrences: number;
  dailyImpressions: number;
  dailyFlatRate: number;
  audienceSize: number;
}

export type Timeframe = 'day' | 'week' | 'month' | 'quarter' | 'year' | { days: number };

// ===== CONSTANTS =====

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const TIMEFRAME_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 91.25,
  year: 365
};

const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  'daily': 30,
  'daily-business': 22, // For print
  'weekly': 4.33,
  'bi-weekly': 2.17,
  'monthly': 1,
  'quarterly': 0.33,
  'irregular': 2,
  // Event-specific frequencies
  'annual': 0.083,       // 1 time per year = ~0.083 per month
  'bi-annually': 0.167   // 2 times per year = ~0.167 per month
};

// ===== HELPER FUNCTIONS =====

/**
 * Parse commitment frequency (e.g., "12x" -> 12)
 */
export function parseCommitmentMultiplier(frequency?: string): number {
  if (!frequency) return 1;
  const match = frequency.match(/^(\d+)x$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Infer occurrences from publication frequency
 */
export function inferOccurrencesFromFrequency(frequency?: string): number {
  return FREQUENCY_TO_MONTHLY[frequency || ''] || 1;
}

/**
 * Get number of days from timeframe
 */
function getDaysFromTimeframe(timeframe: Timeframe): number {
  if (typeof timeframe === 'object') {
    return timeframe.days;
  }
  return TIMEFRAME_DAYS[timeframe] || 30;
}

/**
 * Get pricing for revenue forecasting - ALWAYS prefers 1x tier (base per-insertion rate)
 * 
 * Pricing tiers (1x, 4x, 12x, 52x) represent volume discounts:
 * - 1x = full price per insertion
 * - 4x = discounted price when buying 4
 * - 12x = bigger discount when buying 12
 * 
 * For revenue forecasting, we want the CONSERVATIVE estimate (1x tier)
 * which represents maximum revenue potential at full price.
 */
function getFirstPricing(pricing: StandardPricing | StandardPricing[] | any | undefined): StandardPricing {
  if (!pricing) return {};
  
  if (Array.isArray(pricing)) {
    // Priority 1: Find 1x tier or "One time" frequency (base rate)
    const onexTier = pricing.find(p => {
      const freq = (p.pricing?.frequency || p.frequency || '').toLowerCase();
      return freq === '1x' || freq.includes('one time') || freq === 'onetime';
    });
    
    if (onexTier) {
      // Handle nested format
      if (onexTier.pricing) return onexTier.pricing;
      return onexTier;
    }
    
    // Priority 2: Find tier with lowest multiplier (closest to 1x)
    const sortedTiers = [...pricing].sort((a, b) => {
      const freqA = (a.pricing?.frequency || a.frequency || '');
      const freqB = (b.pricing?.frequency || b.frequency || '');
      const multA = parseCommitmentMultiplier(freqA);
      const multB = parseCommitmentMultiplier(freqB);
      return multA - multB;
    });
    
    const lowestTier = sortedTiers[0];
    if (lowestTier) {
      // Handle nested format
      if (lowestTier.pricing) return lowestTier.pricing;
      return lowestTier;
    }
    
    // Fallback: first item
    const first = pricing[0];
    if (first && typeof first === 'object' && first.pricing) {
      return first.pricing;
    }
    return first || {};
  }
  
  return pricing;
}

// ===== CORE CALCULATION FUNCTIONS =====

/**
 * RULE 1: Calculate total for commitment packages (UI display)
 * Example: $300 × 4x = $1,200
 */
export function calculateTotal(pricing: StandardPricing): number | null {
  if (pricing.pricingModel === 'contact' || !pricing.flatRate) {
    return null;
  }

  if (!pricing.frequency) {
    return pricing.flatRate;
  }

  const multiplier = parseCommitmentMultiplier(pricing.frequency);
  return pricing.flatRate * multiplier;
}

/**
 * RULE 2: Normalize pricing to daily base unit
 * All revenue calculations work from daily rates for precision
 */
export function normalizeToDaily(
  ad: InventoryItem,
  channelFrequency?: string
): DailyMetrics {
  const pricing = getFirstPricing(ad.pricing);
  const metrics = ad.performanceMetrics;

  // Calculate daily occurrences
  let dailyOccurrences = 0;
  if (metrics?.occurrencesPerMonth) {
    dailyOccurrences = metrics.occurrencesPerMonth / DAYS_PER_MONTH;
  } else if (channelFrequency) {
    const monthly = inferOccurrencesFromFrequency(channelFrequency);
    dailyOccurrences = monthly / DAYS_PER_MONTH;
  }

  // Calculate daily impressions
  const monthlyImpressions = metrics?.impressionsPerMonth || ad.monthlyImpressions || 0;
  const dailyImpressions = monthlyImpressions / DAYS_PER_MONTH;

  // Calculate daily flat rate (pass frequency for events)
  const dailyFlatRate = normalizePricingToDaily(pricing, channelFrequency);

  return {
    dailyOccurrences,
    dailyImpressions,
    dailyFlatRate,
    audienceSize: metrics?.audienceSize || 0
  };
}

/**
 * Convert pricing models to daily base rate
 * For flat rates with frequency (e.g., events), adjusts based on occurrence rate
 */
function normalizePricingToDaily(pricing: StandardPricing, channelFrequency?: string): number {
  const { flatRate, pricingModel } = pricing;

  if (!flatRate) return 0;

  switch (pricingModel) {
    case 'per_month':
    case 'monthly': // Alias for backward compatibility
      // Standard monthly pricing (no frequency)
      return flatRate / DAYS_PER_MONTH;

    case 'flat':
      // For flat rates with frequency (e.g., events), flatRate = price per occurrence
      // Monthly revenue = flatRate * occurrences per month
      if (channelFrequency) {
        const occurrencesPerMonth = inferOccurrencesFromFrequency(channelFrequency);
        // Calculate: (flatRate per occurrence * occurrences per month) / days per month
        // Example: Annual event at $10,000/event = ($10,000 * 0.083 events/month) / 30 days = $27.77/day
        return (flatRate * occurrencesPerMonth) / DAYS_PER_MONTH;
      }
      // Fallback: assume flatRate is already monthly
      return flatRate / DAYS_PER_MONTH;

    case 'per_week':
    case 'weekly':
      return (flatRate * 52) / DAYS_PER_YEAR;

    case 'per_day':
      return flatRate;

    // Occurrence-based: return 0 (calculated separately)
    case 'per_send':
    case 'per_spot':
    case 'per_post':
    case 'per_ad':
    case 'per_episode':
    case 'per_story':
      return 0;

    // Impression-based: return 0 (calculated separately)
    case 'cpm':
    case 'cpd':
    case 'cpv':
    case 'cpc':
      return 0;

    default:
      return 0;
  }
}

/**
 * RULE 3: Calculate revenue for ANY timeframe using daily base
 */
export function calculateRevenue(
  ad: InventoryItem,
  timeframe: Timeframe,
  channelFrequency?: string
): number {
  const pricing = getFirstPricing(ad.pricing);
  const daily = normalizeToDaily(ad, channelFrequency);
  const days = getDaysFromTimeframe(timeframe);

  // Calculate based on pricing model
  switch (pricing.pricingModel) {
    // Occurrence-based
    case 'per_send':
    case 'per_spot':
    case 'per_post':
    case 'per_ad':
    case 'per_episode':
    case 'per_story':
      const totalOccurrences = daily.dailyOccurrences * days;
      return (pricing.flatRate || 0) * totalOccurrences;

    // Impression-based
    case 'cpm':
    case 'cpd':
      const totalImpressions = daily.dailyImpressions * days;
      return ((pricing.flatRate || 0) * totalImpressions) / 1000;
    
    case 'cpv': // Cost Per View - per 100 views (common in video streaming)
      const totalViews = daily.dailyImpressions * days;
      return ((pricing.flatRate || 0) * totalViews) / 100;

    case 'cpc':
      const totalClicks = daily.dailyImpressions * days * 0.01; // Assume 1% CTR if no data
      return (pricing.flatRate || 0) * totalClicks;

    // Time-based
    case 'per_month':
    case 'monthly': // Alias for backward compatibility
    case 'flat':
    case 'per_week':
    case 'per_day':
      return daily.dailyFlatRate * days;

    default:
      return 0;
  }
}

/**
 * Calculate revenue with range (conservative, expected, optimistic)
 */
export interface RevenueEstimate {
  conservative: number;
  expected: number;
  optimistic: number;
  guaranteed: boolean;
}

export function calculateRevenueWithRange(
  ad: InventoryItem,
  timeframe: Timeframe,
  channelFrequency?: string
): RevenueEstimate {
  const expected = calculateRevenue(ad, timeframe, channelFrequency);
  const guaranteed = ad.performanceMetrics?.guaranteed || false;

  // For guaranteed metrics, use tighter range
  // For estimated metrics, use wider range
  const variancePercent = guaranteed ? 0.05 : 0.15;

  return {
    conservative: expected * (1 - variancePercent),
    expected,
    optimistic: expected * (1 + variancePercent),
    guaranteed
  };
}

// ===== FORMAT HELPERS =====

/**
 * Format price with dollar sign and commas
 */
export function formatPrice(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

/**
 * Format pricing model to display label
 */
export function formatPricingModel(model?: string): string {
  if (!model) return 'N/A';

  const modelMap: Record<string, string> = {
    'flat': '/occurrence',
    'flat_rate': '/occurrence',
    'per_month': '/month',
    'per_week': '/week',
    'per_day': '/day',
    'cpm': '/1000 impressions',
    'cpc': '/click',
    'per_send': '/send',
    'per_ad': '/ad',
    'per_line': '/line',
    'per_spot': '/spot',
    'per_episode': '/episode',
    'cpd': '/1000 downloads',
    'per_post': '/post',
    'per_story': '/story',
    'monthly': '/month', // Alias for backward compatibility
    'cpv': '/1000 views',
    'per_video': '/video',
    'weekly': '/week',
    'contact': 'Contact for pricing'
  };

  return modelMap[model] || model;
}

// ===== EXPORT ALL =====

export {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  TIMEFRAME_DAYS,
  FREQUENCY_TO_MONTHLY
};

