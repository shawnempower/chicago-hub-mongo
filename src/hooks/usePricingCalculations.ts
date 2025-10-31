/**
 * React hook for standardized pricing calculations
 * Provides easy-to-use functions for revenue forecasting in dashboard components
 */

import { useMemo } from 'react';
import {
  calculateRevenue,
  calculateRevenueWithRange,
  calculateTotal,
  formatPrice,
  formatPricingModel,
  type InventoryItem,
  type Timeframe,
  type RevenueEstimate
} from '@/utils/pricingCalculations';

export interface PricingCalculations {
  // Revenue calculations
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  annualRevenue: number;
  
  // Custom timeframe
  calculateCustomRevenue: (timeframe: Timeframe) => number;
  
  // Revenue with ranges
  getRevenueRange: (timeframe: Timeframe) => RevenueEstimate;
  
  // Commitment total (for UI display)
  commitmentTotal: number | null;
  
  // Formatting helpers
  formatted: {
    dailyRevenue: string;
    weeklyRevenue: string;
    monthlyRevenue: string;
    quarterlyRevenue: string;
    annualRevenue: string;
    commitmentTotal: string;
    pricingModelLabel: string;
  };
}

/**
 * Hook to calculate revenues for an inventory item
 * 
 * @param ad - The advertising inventory item
 * @param channelFrequency - Optional channel-level frequency (e.g., 'weekly', 'daily')
 * 
 * @example
 * const { monthlyRevenue, annualRevenue, formatted } = usePricingCalculations(ad, 'weekly');
 * 
 * return (
 *   <div>
 *     <p>Monthly: {formatted.monthlyRevenue}</p>
 *     <p>Annual: {formatted.annualRevenue}</p>
 *   </div>
 * );
 */
export function usePricingCalculations(
  ad: InventoryItem | undefined | null,
  channelFrequency?: string
): PricingCalculations {
  return useMemo(() => {
    // Handle null/undefined ad
    if (!ad) {
      return {
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        quarterlyRevenue: 0,
        annualRevenue: 0,
        calculateCustomRevenue: () => 0,
        getRevenueRange: () => ({
          conservative: 0,
          expected: 0,
          optimistic: 0,
          guaranteed: false
        }),
        commitmentTotal: null,
        formatted: {
          dailyRevenue: '$0',
          weeklyRevenue: '$0',
          monthlyRevenue: '$0',
          quarterlyRevenue: '$0',
          annualRevenue: '$0',
          commitmentTotal: 'N/A',
          pricingModelLabel: 'N/A'
        }
      };
    }

    // Calculate revenues for different timeframes
    const dailyRevenue = calculateRevenue(ad, 'day', channelFrequency);
    const weeklyRevenue = calculateRevenue(ad, 'week', channelFrequency);
    const monthlyRevenue = calculateRevenue(ad, 'month', channelFrequency);
    const quarterlyRevenue = calculateRevenue(ad, 'quarter', channelFrequency);
    const annualRevenue = calculateRevenue(ad, 'year', channelFrequency);

    // Calculate commitment total (for display)
    const pricing = Array.isArray(ad.pricing) ? ad.pricing[0] : ad.pricing;
    const commitmentTotal = pricing ? calculateTotal(pricing) : null;

    // Get pricing model label
    const pricingModelLabel = formatPricingModel(pricing?.pricingModel);

    return {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      quarterlyRevenue,
      annualRevenue,

      calculateCustomRevenue: (timeframe: Timeframe) => 
        calculateRevenue(ad, timeframe, channelFrequency),

      getRevenueRange: (timeframe: Timeframe) =>
        calculateRevenueWithRange(ad, timeframe, channelFrequency),

      commitmentTotal,

      formatted: {
        dailyRevenue: formatPrice(dailyRevenue),
        weeklyRevenue: formatPrice(weeklyRevenue),
        monthlyRevenue: formatPrice(monthlyRevenue),
        quarterlyRevenue: formatPrice(quarterlyRevenue),
        annualRevenue: formatPrice(annualRevenue),
        commitmentTotal: commitmentTotal ? formatPrice(commitmentTotal) : 'Contact',
        pricingModelLabel
      }
    };
  }, [ad, channelFrequency]);
}

/**
 * Hook to calculate aggregate revenues across multiple inventory items
 * 
 * @param ads - Array of advertising inventory items
 * @param channelFrequency - Optional channel-level frequency
 * 
 * @example
 * const { totalMonthlyRevenue, formatted } = useAggregateRevenue(newsletter.advertisingOpportunities, newsletter.frequency);
 */
export function useAggregateRevenue(
  ads: InventoryItem[] | undefined | null,
  channelFrequency?: string
) {
  return useMemo(() => {
    if (!ads || ads.length === 0) {
      return {
        totalDailyRevenue: 0,
        totalWeeklyRevenue: 0,
        totalMonthlyRevenue: 0,
        totalQuarterlyRevenue: 0,
        totalAnnualRevenue: 0,
        averageMonthlyRevenue: 0,
        count: 0,
        formatted: {
          totalDailyRevenue: '$0',
          totalWeeklyRevenue: '$0',
          totalMonthlyRevenue: '$0',
          totalQuarterlyRevenue: '$0',
          totalAnnualRevenue: '$0',
          averageMonthlyRevenue: '$0'
        }
      };
    }

    const totalDailyRevenue = ads.reduce(
      (sum, ad) => sum + calculateRevenue(ad, 'day', channelFrequency),
      0
    );
    const totalWeeklyRevenue = ads.reduce(
      (sum, ad) => sum + calculateRevenue(ad, 'week', channelFrequency),
      0
    );
    const totalMonthlyRevenue = ads.reduce(
      (sum, ad) => sum + calculateRevenue(ad, 'month', channelFrequency),
      0
    );
    const totalQuarterlyRevenue = ads.reduce(
      (sum, ad) => sum + calculateRevenue(ad, 'quarter', channelFrequency),
      0
    );
    const totalAnnualRevenue = ads.reduce(
      (sum, ad) => sum + calculateRevenue(ad, 'year', channelFrequency),
      0
    );

    const count = ads.length;
    const averageMonthlyRevenue = totalMonthlyRevenue / count;

    return {
      totalDailyRevenue,
      totalWeeklyRevenue,
      totalMonthlyRevenue,
      totalQuarterlyRevenue,
      totalAnnualRevenue,
      averageMonthlyRevenue,
      count,
      formatted: {
        totalDailyRevenue: formatPrice(totalDailyRevenue),
        totalWeeklyRevenue: formatPrice(totalWeeklyRevenue),
        totalMonthlyRevenue: formatPrice(totalMonthlyRevenue),
        totalQuarterlyRevenue: formatPrice(totalQuarterlyRevenue),
        totalAnnualRevenue: formatPrice(totalAnnualRevenue),
        averageMonthlyRevenue: formatPrice(averageMonthlyRevenue)
      }
    };
  }, [ads, channelFrequency]);
}

/**
 * Hook for revenue range calculations (conservative/expected/optimistic)
 * Useful for displaying forecasts with confidence ranges
 * 
 * @param ad - The advertising inventory item
 * @param timeframe - The timeframe to calculate for
 * @param channelFrequency - Optional channel-level frequency
 * 
 * @example
 * const range = useRevenueRange(ad, 'month', 'weekly');
 * 
 * return (
 *   <div>
 *     <p>Conservative: {range.formatted.conservative}</p>
 *     <p>Expected: {range.formatted.expected}</p>
 *     <p>Optimistic: {range.formatted.optimistic}</p>
 *     {range.guaranteed && <Badge>Guaranteed</Badge>}
 *   </div>
 * );
 */
export function useRevenueRange(
  ad: InventoryItem | undefined | null,
  timeframe: Timeframe = 'month',
  channelFrequency?: string
) {
  return useMemo(() => {
    if (!ad) {
      return {
        conservative: 0,
        expected: 0,
        optimistic: 0,
        guaranteed: false,
        formatted: {
          conservative: '$0',
          expected: '$0',
          optimistic: '$0'
        }
      };
    }

    const range = calculateRevenueWithRange(ad, timeframe, channelFrequency);

    return {
      ...range,
      formatted: {
        conservative: formatPrice(range.conservative),
        expected: formatPrice(range.expected),
        optimistic: formatPrice(range.optimistic)
      }
    };
  }, [ad, timeframe, channelFrequency]);
}

export default usePricingCalculations;

