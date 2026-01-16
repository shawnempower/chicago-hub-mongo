import { PublicationFrequencyType } from '@/integrations/mongodb/hubPackageSchema';

/**
 * Frequency Engine - Smart frequency constraint management for package builder
 * 
 * This module enforces physical publication limits:
 * - Daily papers: up to 30x/month (but standard is 12x)
 * - Weekly papers: max 4x/month (once per issue)
 * - Bi-weekly: max 2x/month (once per issue)
 * - Monthly: only 1x/month (one issue)
 */

// Maximum frequencies by publication type
export const MAX_FREQUENCIES: Record<PublicationFrequencyType, number> = {
  'daily': 30,
  'weekly': 4,
  'bi-weekly': 2,
  'monthly': 1,
  'custom': 30, // Custom can have any frequency up to daily
};

// Standard frequencies by publication type (default starting point)
export const STANDARD_FREQUENCIES: Record<PublicationFrequencyType, number> = {
  'daily': 12,
  'weekly': 4,
  'bi-weekly': 2,
  'monthly': 1,
  'custom': 12,
};

// Valid frequency options for dropdowns by publication type
export const FREQUENCY_OPTIONS: Record<PublicationFrequencyType, number[]> = {
  'daily': [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 24, 30],
  'weekly': [1, 2, 3, 4],
  'bi-weekly': [1, 2],
  'monthly': [1],
  'custom': [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 24, 30],
};

/**
 * Detect publication frequency type from publication data
 * Uses frequency field or publication schedule information
 */
export function detectPublicationFrequencyType(
  publicationFrequency?: string,
  publicationSchedule?: string
): PublicationFrequencyType {
  if (!publicationFrequency && !publicationSchedule) {
    return 'custom';
  }

  const frequencyLower = (publicationFrequency || publicationSchedule || '').toLowerCase();

  if (frequencyLower.includes('daily')) {
    return 'daily';
  } else if (frequencyLower.includes('weekly') && !frequencyLower.includes('bi')) {
    return 'weekly';
  } else if (frequencyLower.includes('bi-weekly') || frequencyLower.includes('biweekly')) {
    return 'bi-weekly';
  } else if (frequencyLower.includes('monthly')) {
    return 'monthly';
  }

  return 'custom';
}

/**
 * Get valid frequency options for a publication type
 * Returns array of valid frequencies for dropdown
 */
export function getValidFrequencies(publicationType: PublicationFrequencyType): number[] {
  return FREQUENCY_OPTIONS[publicationType] || FREQUENCY_OPTIONS.custom;
}

/**
 * Get maximum allowed frequency for a publication type
 */
export function getMaxFrequency(publicationType: PublicationFrequencyType): number {
  return MAX_FREQUENCIES[publicationType] || MAX_FREQUENCIES.custom;
}

/**
 * Get standard (default) frequency for a publication type
 */
export function getStandardFrequency(publicationType: PublicationFrequencyType): number {
  return STANDARD_FREQUENCIES[publicationType] || STANDARD_FREQUENCIES.custom;
}

/**
 * Validate if a frequency is allowed for a publication type
 */
export function validateFrequency(
  frequency: number,
  publicationType: PublicationFrequencyType
): boolean {
  const maxFreq = getMaxFrequency(publicationType);
  const validOptions = getValidFrequencies(publicationType);
  
  return frequency > 0 && frequency <= maxFreq && validOptions.includes(frequency);
}

/**
 * Get the closest valid frequency to a target frequency
 * Useful when applying bulk adjustments
 */
export function getClosestValidFrequency(
  targetFrequency: number,
  publicationType: PublicationFrequencyType
): number {
  const validOptions = getValidFrequencies(publicationType);
  
  // If target is already valid, return it
  if (validOptions.includes(targetFrequency)) {
    return targetFrequency;
  }
  
  // Find closest valid option
  let closest = validOptions[0];
  let minDiff = Math.abs(targetFrequency - closest);
  
  for (const option of validOptions) {
    const diff = Math.abs(targetFrequency - option);
    if (diff < minDiff) {
      minDiff = diff;
      closest = option;
    }
  }
  
  return closest;
}

/**
 * Apply bulk frequency adjustment strategy
 * 
 * Strategies:
 * - standard: Reset to standard frequencies (daily=12x, weekly=4x, etc.)
 * - reduced: Half the current frequency (respecting minimums)
 * - minimum: Set to 1x for all
 * - custom: Keep current frequencies
 */
export function applyFrequencyStrategy(
  currentFrequency: number,
  publicationType: PublicationFrequencyType,
  strategy: 'standard' | 'reduced' | 'minimum' | 'custom'
): number {
  switch (strategy) {
    case 'standard':
      return getStandardFrequency(publicationType);
    
    case 'reduced':
      // Half the current frequency, but not less than 1x
      const halfFreq = Math.max(1, Math.floor(currentFrequency / 2));
      return getClosestValidFrequency(halfFreq, publicationType);
    
    case 'minimum':
      return 1;
    
    case 'custom':
    default:
      // Keep current frequency, but validate it
      return validateFrequency(currentFrequency, publicationType)
        ? currentFrequency
        : getStandardFrequency(publicationType);
  }
}

/**
 * Calculate monthly cost for an item based on frequency and unit price
 */
export function calculateMonthlyCost(
  unitPrice: number,
  frequency: number
): number {
  return unitPrice * frequency;
}

/**
 * Get frequency display label
 */
export function getFrequencyLabel(frequency: number): string {
  if (frequency === 1) return '1x per month';
  return `${frequency}x per month`;
}

/**
 * Get publication type display label
 */
export function getPublicationTypeLabel(publicationType: PublicationFrequencyType): string {
  switch (publicationType) {
    case 'daily':
      return 'Daily Publication';
    case 'weekly':
      return 'Weekly Publication';
    case 'bi-weekly':
      return 'Bi-Weekly Publication';
    case 'monthly':
      return 'Monthly Publication';
    case 'custom':
      return 'Custom Schedule';
    default:
      return 'Unknown';
  }
}

/**
 * Check if frequency is at or exceeds maximum for publication type
 * Optionally accounts for package duration (e.g., 3 weeks = 21 days max for daily)
 */
export function isAtMaxFrequency(
  frequency: number,
  publicationType: PublicationFrequencyType,
  durationInMonths?: number
): boolean {
  const effectiveMax = getEffectiveMaxFrequency(publicationType, durationInMonths);
  return frequency >= effectiveMax;
}

/**
 * Get the effective maximum frequency considering package duration
 * Uses 7 days/week for accurate calculation on sub-month packages
 */
export function getEffectiveMaxFrequency(
  publicationType: PublicationFrequencyType,
  durationInMonths?: number
): number {
  const monthlyMax = getMaxFrequency(publicationType);
  
  // If no duration specified or duration is 1+ months, use monthly max
  // (scaled by number of months for multi-month packages)
  if (!durationInMonths || durationInMonths >= 1) {
    return monthlyMax;
  }
  
  // For sub-month packages, calculate based on weeks
  // Convert duration to weeks (4 weeks per month)
  const durationInWeeks = durationInMonths * 4;
  
  // Calculate duration-adjusted max based on actual time units
  let durationAdjustedMax: number;
  
  switch (publicationType) {
    case 'daily':
      // Daily: 7 days per week
      durationAdjustedMax = Math.floor(durationInWeeks * 7);
      break;
    case 'weekly':
      // Weekly: 1 per week
      durationAdjustedMax = Math.floor(durationInWeeks);
      break;
    case 'bi-weekly':
      // Bi-weekly: 1 per 2 weeks
      durationAdjustedMax = Math.floor(durationInWeeks / 2);
      break;
    case 'monthly':
      // Monthly: 1 per 4 weeks (still allow 1 for sub-month packages)
      durationAdjustedMax = Math.max(1, Math.floor(durationInWeeks / 4));
      break;
    default:
      // Custom: treat like daily
      durationAdjustedMax = Math.floor(durationInWeeks * 7);
  }
  
  // Return at least 1, and cap at monthly max
  return Math.max(1, Math.min(monthlyMax, durationAdjustedMax));
}

/**
 * Generate frequency options with labels for dropdown
 */
export function getFrequencyOptionsWithLabels(
  publicationType: PublicationFrequencyType
): Array<{ value: number; label: string }> {
  const frequencies = getValidFrequencies(publicationType);
  return frequencies.map(freq => ({
    value: freq,
    label: getFrequencyLabel(freq)
  }));
}

/**
 * Calculate total package cost from all inventory items
 */
export function calculateTotalPackageCost(
  items: Array<{
    unitPrice: number;
    frequency: number;
  }>
): number {
  return items.reduce((total, item) => {
    return total + calculateMonthlyCost(item.unitPrice, item.frequency);
  }, 0);
}

/**
 * Preview bulk frequency adjustment impact
 * Returns object with before/after costs and change details
 */
export function previewBulkAdjustment(
  items: Array<{
    id: string;
    name: string;
    publicationType: PublicationFrequencyType;
    currentFrequency: number;
    unitPrice: number;
  }>,
  strategy: 'standard' | 'reduced' | 'minimum'
): {
  beforeCost: number;
  afterCost: number;
  savings: number;
  changes: Array<{
    id: string;
    name: string;
    fromFrequency: number;
    toFrequency: number;
    fromCost: number;
    toCost: number;
  }>;
} {
  let beforeCost = 0;
  let afterCost = 0;
  const changes = [];

  for (const item of items) {
    const fromFrequency = item.currentFrequency;
    const toFrequency = applyFrequencyStrategy(
      fromFrequency,
      item.publicationType,
      strategy
    );
    
    const fromCost = calculateMonthlyCost(item.unitPrice, fromFrequency);
    const toCost = calculateMonthlyCost(item.unitPrice, toFrequency);
    
    beforeCost += fromCost;
    afterCost += toCost;
    
    if (fromFrequency !== toFrequency) {
      changes.push({
        id: item.id,
        name: item.name,
        fromFrequency,
        toFrequency,
        fromCost,
        toCost
      });
    }
  }

  return {
    beforeCost,
    afterCost,
    savings: beforeCost - afterCost,
    changes
  };
}

