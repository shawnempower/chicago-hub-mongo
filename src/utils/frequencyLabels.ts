/**
 * Frequency Label Utilities
 * 
 * Provides correct unit labels for different pricing models
 */

/**
 * Get the appropriate unit label for a pricing model
 * 
 * @param pricingModel - The pricing model (e.g., 'per_week', 'cpm', 'flat')
 * @returns The unit label (e.g., 'weeks', 'months', 'sends')
 */
export function getFrequencyUnit(pricingModel: string | undefined): string {
  if (!pricingModel) return 'per month';
  
  switch (pricingModel.toLowerCase()) {
    case 'per_week':
      return 'weeks';
    case 'per_day':
      return 'days';
    case 'per_send':
      return 'sends';
    case 'per_spot':
      return 'spots';
    case 'per_post':
      return 'posts';
    case 'per_ad':
      return 'ads';
    case 'per_episode':
      return 'episodes';
    case 'per_story':
      return 'stories';
    case 'cpm':
    case 'cpv':
    case 'cpc':
      return 'months'; // Impression-based models are typically monthly
    case 'monthly':
      return 'month'; // monthly recurring
    case 'flat':
      return 'time'; // one-time flat rate
    default:
      return 'per month';
  }
}

/**
 * Format frequency with the correct unit
 * 
 * @param frequency - The frequency number
 * @param pricingModel - The pricing model
 * @param showSingular - Whether to use singular form for frequency of 1
 * @returns Formatted string like "12 weeks" or "4 sends"
 */
export function formatFrequency(
  frequency: number, 
  pricingModel: string | undefined,
  showSingular: boolean = true
): string {
  const unit = getFrequencyUnit(pricingModel);
  
  // Handle singular vs plural
  if (frequency === 1 && showSingular) {
    // Remove trailing 's' for singular
    const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
    
    // Special cases
    if (pricingModel === 'monthly') {
      return 'Monthly';
    }
    if (pricingModel === 'flat') {
      return 'One-time';
    }
    
    return `${frequency} ${singularUnit}`;
  }
  
  return `${frequency} ${unit}`;
}

/**
 * Get a descriptive label for frequency in context
 * 
 * @param frequency - The frequency number
 * @param pricingModel - The pricing model
 * @returns Descriptive string like "12x per month" or "4 weeks"
 */
export function getFrequencyLabel(
  frequency: number,
  pricingModel: string | undefined
): string {
  if (!pricingModel) return `${frequency}x per month`;
  
  const model = pricingModel.toLowerCase();
  
  // For impression-based models, show "per month"
  if (model === 'cpm' || model === 'cpv' || model === 'cpc') {
    return `${frequency}x per month`;
  }
  
  // For monthly, show monthly
  if (model === 'monthly') {
    return 'Monthly';
  }
  
  // For flat, show one-time (used for events with frequency)
  if (model === 'flat') {
    return frequency === 1 ? 'One-time' : `${frequency}x`;
  }
  
  // For everything else, use the unit
  return formatFrequency(frequency, pricingModel, true);
}

/**
 * Get a short description of what the frequency means
 * 
 * @param pricingModel - The pricing model
 * @returns Description like "insertions per month" or "weekly insertions"
 */
export function getFrequencyDescription(pricingModel: string | undefined): string {
  if (!pricingModel) return 'insertions per month';
  
  switch (pricingModel.toLowerCase()) {
    case 'per_week':
      return 'weekly insertions';
    case 'per_day':
      return 'daily insertions';
    case 'per_send':
      return 'email sends';
    case 'per_spot':
      return 'radio/audio spots';
    case 'per_post':
      return 'social media posts';
    case 'per_ad':
      return 'ad placements';
    case 'per_episode':
      return 'podcast episodes';
    case 'per_story':
      return 'story placements';
    case 'cpm':
    case 'cpv':
    case 'cpc':
      return 'impressions per month';
    case 'monthly':
      return 'monthly';
    case 'flat':
      return 'flat rate';
    default:
      return 'insertions per month';
  }
}

