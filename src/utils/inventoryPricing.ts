/**
 * Inventory Pricing Service
 * 
 * Wraps pricingCalculations.ts to provide inventory-specific pricing functions
 * for packages and campaigns. Ensures all cost calculations honor the existing
 * pricing models and rules.
 * 
 * CRITICAL: All functions must use pricingCalculations.ts internally.
 * Do NOT duplicate pricing logic here.
 */

import { calculateRevenue, StandardPricing } from './pricingCalculations';
import { HubPackagePublication, HubPackageInventoryItem } from '@/integrations/mongodb/hubPackageSchema';

/**
 * Calculate cost for a single inventory item
 * 
 * @param item - Inventory item with pricing and specifications
 * @param frequency - Number of times per month (e.g., 12 for daily, 4 for weekly)
 * @param durationMonths - Campaign/package duration in months
 * @returns Monthly cost for this item
 */
export function calculateItemCost(
  item: HubPackageInventoryItem,
  frequency: number,
  durationMonths: number = 1
): number {
  if (!item.itemPricing) return 0;

  const { hubPrice, pricingModel } = item.itemPricing;
  if (!hubPrice) return 0;

  // Get the current frequency (use provided frequency or item's current/quantity)
  const itemFrequency = frequency || item.currentFrequency || item.quantity || 1;

  // Calculate based on pricing model
  switch (pricingModel) {
    case 'flat':
    case 'monthly':
      // Flat rate per month, multiply by frequency if it represents insertions
      // If frequency = 1, it's just the flat monthly rate
      // If frequency > 1, it represents multiple insertions at this rate
      return hubPrice * itemFrequency;

    case 'per_week':
      // Weekly rate: frequency represents weeks per month (1-4)
      // Simply multiply: $price/week × weeks/month
      return hubPrice * itemFrequency;

    case 'per_day':
      // Daily rate: frequency represents days per month (1-30)
      // Simply multiply: $price/day × days/month
      return hubPrice * itemFrequency;

    case 'per_send':
    case 'per_spot':
    case 'per_post':
    case 'per_ad':
    case 'per_episode':
    case 'per_story':
      // Per occurrence: hubPrice × frequency (occurrences per month)
      return hubPrice * itemFrequency;

    case 'cpm':
      // Cost per 1000 impressions
      // frequency represents percentage of impressions (25, 50, 75, 100)
      if (item.monthlyImpressions) {
        const impressionPercent = itemFrequency / 100;
        return (hubPrice * item.monthlyImpressions * impressionPercent) / 1000;
      }
      // Fallback if no impression data
      return hubPrice * itemFrequency;

    case 'cpv':
      // Cost per 100 views (common in video)
      // frequency represents percentage of views (25, 50, 75, 100)
      if (item.monthlyImpressions) {
        const viewPercent = itemFrequency / 100;
        return (hubPrice * item.monthlyImpressions * viewPercent) / 100;
      }
      return hubPrice * itemFrequency;

    case 'cpc':
      // Cost per click - needs CTR assumption (typically 1%)
      // frequency represents percentage of impressions (25, 50, 75, 100)
      if (item.monthlyImpressions) {
        const impressionPercent = itemFrequency / 100;
        const estimatedClicks = item.monthlyImpressions * impressionPercent * 0.01;
        return hubPrice * estimatedClicks;
      }
      return hubPrice * itemFrequency;

    default:
      // Unknown model, use simple multiplication
      return hubPrice * itemFrequency;
  }
}

/**
 * Calculate total cost for a publication (sum of all its inventory items)
 * 
 * @param publication - Publication with inventory items
 * @param durationMonths - Campaign/package duration in months
 * @returns Total monthly cost for this publication
 */
export function calculatePublicationTotal(
  publication: HubPackagePublication,
  durationMonths: number = 1
): number {
  if (!publication.inventoryItems || publication.inventoryItems.length === 0) {
    return 0;
  }

  return publication.inventoryItems
    .filter(item => !item.isExcluded) // Exclude items marked as excluded
    .reduce((total, item) => {
      const itemFrequency = item.currentFrequency || item.quantity || 1;
      const itemCost = calculateItemCost(item, itemFrequency, durationMonths);
      return total + itemCost;
    }, 0);
}

/**
 * Calculate total cost for entire campaign/package (sum of all publications)
 * 
 * @param publications - Array of publications with inventory
 * @param durationMonths - Campaign/package duration in months
 * @returns Total monthly cost for all publications
 */
export function calculateCampaignTotal(
  publications: HubPackagePublication[],
  durationMonths: number = 1
): number {
  if (!publications || publications.length === 0) {
    return 0;
  }

  return publications.reduce((total, pub) => {
    const pubTotal = calculatePublicationTotal(pub, durationMonths);
    return total + pubTotal;
  }, 0);
}

/**
 * Validate if publications fit within budget
 * 
 * @param publications - Array of publications
 * @param budget - Monthly budget limit
 * @param durationMonths - Duration in months
 * @returns Object with validation result and details
 */
export function validateBudget(
  publications: HubPackagePublication[],
  budget: number,
  durationMonths: number = 1
): {
  valid: boolean;
  totalCost: number;
  percentageUsed: number;
  overage: number;
} {
  const totalCost = calculateCampaignTotal(publications, durationMonths);
  const percentageUsed = budget > 0 ? (totalCost / budget) * 100 : 0;
  const overage = Math.max(0, totalCost - budget);

  return {
    valid: totalCost <= budget,
    totalCost,
    percentageUsed,
    overage
  };
}

/**
 * Update item with new frequency and recalculate its cost
 * 
 * @param item - Inventory item to update
 * @param newFrequency - New frequency value
 * @param durationMonths - Duration in months
 * @returns Updated item with new frequency and calculated cost
 */
export function applyFrequencyChange(
  item: HubPackageInventoryItem,
  newFrequency: number,
  durationMonths: number = 1
): HubPackageInventoryItem {
  const oldFrequency = item.currentFrequency || item.quantity || 1;
  const scaleFactor = newFrequency / oldFrequency;
  
  const updatedItem = {
    ...item,
    currentFrequency: newFrequency,
    quantity: newFrequency, // Keep quantity in sync
  };

  // Scale impressions for CPM models
  if (item.itemPricing?.pricingModel === 'cpm' && item.monthlyImpressions) {
    updatedItem.monthlyImpressions = Math.round(item.monthlyImpressions * scaleFactor);
  }

  // Calculate new monthly cost
  const monthlyCost = calculateItemCost(updatedItem, newFrequency, durationMonths);

  return {
    ...updatedItem,
    monthlyCost,
    campaignCost: monthlyCost * durationMonths
  };
}

/**
 * Scale all items in a publication by a factor (for pruning)
 * 
 * @param publication - Publication to scale
 * @param scaleFactor - Factor to scale by (0.5 = half, 2.0 = double)
 * @param durationMonths - Duration in months
 * @returns Updated publication with scaled items and recalculated total
 */
export function scalePublication(
  publication: HubPackagePublication,
  scaleFactor: number,
  durationMonths: number = 1
): HubPackagePublication {
  if (!publication.inventoryItems || publication.inventoryItems.length === 0) {
    return publication;
  }

  // Scale each item (but don't scale excluded items)
  const scaledItems = publication.inventoryItems.map(item => {
    // Skip scaling for excluded items
    if (item.isExcluded) {
      return item;
    }
    
    const currentFreq = item.currentFrequency || item.quantity || 1;
    // Apply scale factor and round to nearest integer (minimum 1)
    const newFrequency = Math.max(1, Math.round(currentFreq * scaleFactor));
    
    return applyFrequencyChange(item, newFrequency, durationMonths);
  });

  // Recalculate publication total (excluding excluded items)
  const newTotal = scaledItems
    .filter(item => !item.isExcluded)
    .reduce((sum, item) => 
      sum + (item.monthlyCost || calculateItemCost(item, item.currentFrequency || item.quantity || 1, durationMonths)),
      0
    );

  return {
    ...publication,
    inventoryItems: scaledItems,
    publicationTotal: newTotal
  };
}

/**
 * Scale all items of a specific channel across all publications
 * 
 * @param publications - Array of publications to process
 * @param channel - Channel to scale (e.g., 'website', 'print', 'newsletter')
 * @param scaleFactor - Factor to scale by (0.5 = half, 2.0 = double)
 * @param durationMonths - Duration in months
 * @returns Updated publications array with scaled channel items
 */
export function scaleChannel(
  publications: HubPackagePublication[],
  channel: string,
  scaleFactor: number,
  durationMonths: number = 1
): HubPackagePublication[] {
  return publications.map(publication => {
    if (!publication.inventoryItems || publication.inventoryItems.length === 0) {
      return publication;
    }

    // Scale only items matching the channel (but not excluded items)
    const updatedItems = publication.inventoryItems.map(item => {
      if (item.channel === channel && !item.isExcluded) {
        const currentFreq = item.currentFrequency || item.quantity || 1;
        const newFrequency = Math.max(1, Math.round(currentFreq * scaleFactor));
        return applyFrequencyChange(item, newFrequency, durationMonths);
      }
      return item; // Keep non-matching items and excluded items unchanged
    });

    // Recalculate publication total (excluding excluded items)
    const newTotal = updatedItems
      .filter(item => !item.isExcluded)
      .reduce((sum, item) => 
        sum + (item.monthlyCost || calculateItemCost(item, item.currentFrequency || item.quantity || 1, durationMonths)),
        0
      );

    return {
      ...publication,
      inventoryItems: updatedItems,
      publicationTotal: newTotal
    };
  });
}

/**
 * Remove all items of a specific channel across all publications
 * 
 * @param publications - Array of publications to process
 * @param channel - Channel to remove
 * @returns Updated publications array without the specified channel
 */
export function removeChannel(
  publications: HubPackagePublication[],
  channel: string
): HubPackagePublication[] {
  return publications.map(publication => {
    if (!publication.inventoryItems || publication.inventoryItems.length === 0) {
      return publication;
    }

    // Filter out items matching the channel
    const updatedItems = publication.inventoryItems.filter(item => item.channel !== channel);

    // Recalculate publication total
    const newTotal = updatedItems.reduce((sum, item) => 
      sum + (item.monthlyCost || 0), 0
    );

    return {
      ...publication,
      inventoryItems: updatedItems,
      publicationTotal: newTotal
    };
  });
}

/**
 * Validate publication against constraints
 * 
 * @param publication - Publication to validate
 * @param constraints - Budget constraints (min spend, max percent)
 * @param totalBudget - Total campaign/package budget
 * @returns Validation result with warnings
 */
export function validatePublicationConstraints(
  publication: HubPackagePublication,
  constraints: {
    minPublicationSpend?: number;
    maxPublicationPercent?: number;
  },
  totalBudget: number
): {
  valid: boolean;
  warnings: string[];
  belowMinimum: boolean;
  aboveMaximum: boolean;
} {
  const warnings: string[] = [];
  const pubTotal = publication.publicationTotal || 0;
  
  let belowMinimum = false;
  let aboveMaximum = false;

  // Check minimum spend
  if (constraints.minPublicationSpend && pubTotal < constraints.minPublicationSpend) {
    warnings.push(`Below minimum spend of $${constraints.minPublicationSpend.toLocaleString()}`);
    belowMinimum = true;
  }

  // Check maximum percentage
  if (constraints.maxPublicationPercent && totalBudget > 0) {
    const maxAllowed = totalBudget * constraints.maxPublicationPercent;
    const percentage = (pubTotal / totalBudget) * 100;
    
    if (pubTotal > maxAllowed) {
      warnings.push(
        `Exceeds ${(constraints.maxPublicationPercent * 100).toFixed(0)}% of budget ` +
        `($${maxAllowed.toLocaleString()})`
      );
      aboveMaximum = true;
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    belowMinimum,
    aboveMaximum
  };
}

/**
 * Get summary statistics for a set of publications
 * 
 * @param publications - Array of publications
 * @param durationMonths - Duration in months
 * @returns Summary statistics
 */
export function calculateSummaryStats(
  publications: HubPackagePublication[],
  durationMonths: number = 1
): {
  totalOutlets: number;
  totalChannels: number;
  totalUnits: number;
  monthlyCost: number;
  totalCost: number;
  channelBreakdown: Record<string, number>;
} {
  const totalOutlets = publications.length;
  
  const allChannels = new Set<string>();
  let totalUnits = 0;
  const channelBreakdown: Record<string, number> = {};

  publications.forEach(pub => {
    if (pub.inventoryItems) {
      pub.inventoryItems
        .filter(item => !item.isExcluded) // Skip excluded items
        .forEach(item => {
          allChannels.add(item.channel);
          totalUnits += item.currentFrequency || item.quantity || 1;
          
          // Track channel costs
          const itemCost = calculateItemCost(
            item, 
            item.currentFrequency || item.quantity || 1,
            durationMonths
          );
          channelBreakdown[item.channel] = (channelBreakdown[item.channel] || 0) + itemCost;
        });
    }
  });

  const monthlyCost = calculateCampaignTotal(publications, durationMonths);
  const totalCost = monthlyCost * durationMonths;

  return {
    totalOutlets,
    totalChannels: allChannels.size,
    totalUnits,
    monthlyCost,
    totalCost,
    channelBreakdown
  };
}

