/**
 * Duration Formatting Utilities
 * 
 * Provides smart formatting for costs based on campaign duration
 */

/**
 * Format duration in a human-readable way
 * 
 * @param durationMonths - Duration in months (can be fractional)
 * @returns Formatted string like "2 weeks", "1 month", "3 months"
 */
export function formatDuration(durationMonths: number): string {
  if (durationMonths < 1) {
    const weeks = Math.round(durationMonths * 4.33);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (durationMonths === 1) {
    return '1 month';
  } else {
    return `${durationMonths} months`;
  }
}

/**
 * Format a cost with duration context
 * 
 * @param monthlyCost - The monthly cost
 * @param durationMonths - Duration in months
 * @param showRate - Whether to show the monthly rate for multi-month campaigns
 * @returns Formatted string like "$3,960 for 2 weeks" or "$23,760 for 3 months ($7,920/mo)"
 */
export function formatCostWithDuration(
  monthlyCost: number,
  durationMonths: number,
  showRate: boolean = true
): string {
  const totalCost = monthlyCost * durationMonths;
  const duration = formatDuration(durationMonths);
  
  if (durationMonths < 1) {
    // Less than a month - show prorated
    return `$${totalCost.toLocaleString()} for ${duration}\n(prorated from $${monthlyCost.toLocaleString()}/mo)`;
  } else if (durationMonths === 1) {
    // Exactly 1 month - just show the total
    return `$${totalCost.toLocaleString()} for ${duration}`;
  } else {
    // Multiple months - show total and rate
    if (showRate) {
      return `$${totalCost.toLocaleString()} for ${duration}\n($${monthlyCost.toLocaleString()}/mo)`;
    }
    return `$${totalCost.toLocaleString()} for ${duration}`;
  }
}

/**
 * Get a short cost label with duration
 * 
 * @param monthlyCost - The monthly cost
 * @param durationMonths - Duration in months
 * @returns Short string like "$3,960 (2 weeks)" or "$23,760 (3 months)"
 */
export function getShortCostLabel(
  monthlyCost: number,
  durationMonths: number
): string {
  const totalCost = monthlyCost * durationMonths;
  const duration = formatDuration(durationMonths);
  return `$${totalCost.toLocaleString()} (${duration})`;
}

/**
 * Get supplementary rate info
 * 
 * @param monthlyCost - The monthly cost
 * @param durationMonths - Duration in months
 * @returns Rate info string or null if not needed
 */
export function getRateInfo(
  monthlyCost: number,
  durationMonths: number
): string | null {
  if (durationMonths < 1) {
    return `Prorated from $${monthlyCost.toLocaleString()}/mo`;
  } else if (durationMonths > 1) {
    return `$${monthlyCost.toLocaleString()}/mo rate`;
  }
  return null;
}

/**
 * Format campaign total with context
 * 
 * @param monthlyCost - The monthly cost
 * @param durationMonths - Duration in months
 * @returns Object with main label and optional subtitle
 */
export function formatCampaignTotal(
  monthlyCost: number,
  durationMonths: number
): { main: string; subtitle: string | null } {
  const totalCost = monthlyCost * durationMonths;
  const duration = formatDuration(durationMonths);
  
  if (durationMonths < 1) {
    return {
      main: `$${totalCost.toLocaleString()}`,
      subtitle: `for ${duration} (prorated from $${monthlyCost.toLocaleString()}/mo)`
    };
  } else if (durationMonths === 1) {
    return {
      main: `$${totalCost.toLocaleString()}`,
      subtitle: `for ${duration}`
    };
  } else {
    return {
      main: `$${totalCost.toLocaleString()}`,
      subtitle: `for ${duration} ($${monthlyCost.toLocaleString()}/mo)`
    };
  }
}

