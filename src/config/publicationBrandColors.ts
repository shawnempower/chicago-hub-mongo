import { getStorefrontConfiguration } from '@/api/storefront';
import { DEFAULT_BRAND_HEX } from '@/constants/brand';

// In-memory cache for brand colors
const colorCache = new Map<string, string>();

// Track which colors we're currently fetching to avoid duplicate requests
const fetchingPromises = new Map<string, Promise<string>>();

/**
 * Get brand color for a publication from storefront configuration
 * Uses caching to avoid repeated API calls
 * NOTE: This function is synchronous and only returns cached colors.
 * To fetch colors, use prefetchBrandColors() explicitly.
 * @param publicationId - The publication ID (can be string or number)
 * @returns The brand color hex code (defaults to design system primary if not cached)
 */
export const getPublicationBrandColor = (publicationId: string | number): string => {
  const pubIdString = String(publicationId);
  
  // Return cached color if available, otherwise return default
  // This no longer automatically triggers fetching to avoid premature API calls
  return colorCache.get(pubIdString) || DEFAULT_BRAND_HEX;
};

/**
 * Fetch brand color from API and cache it
 */
async function fetchBrandColor(publicationId: string): Promise<string> {
  try {
    const config = await getStorefrontConfiguration(publicationId);
    
    let color = DEFAULT_BRAND_HEX;
    
    if (config?.theme?.colors?.gradStart) {
      color = config.theme.colors.gradStart;
    } else if (config?.theme?.colors?.lightPrimary) {
      color = config.theme.colors.lightPrimary;
    }
    
    colorCache.set(publicationId, color);
    return color;
  } catch (error) {
    console.error(`Error fetching brand color for publication ${publicationId}:`, error);
    // Cache the default color to avoid repeated failed requests
    colorCache.set(publicationId, DEFAULT_BRAND_HEX);
    return DEFAULT_BRAND_HEX;
  }
}

/**
 * Prefetch colors for multiple publications
 * Useful for loading colors for a list of publications
 */
export const prefetchBrandColors = async (publicationIds: (string | number)[]): Promise<void> => {
  const promises = publicationIds.map(id => fetchBrandColor(String(id)));
  await Promise.allSettled(promises);
};

/**
 * Clear the brand color cache
 * Call this after updating colors to force a refresh
 */
export const clearBrandColorCache = (publicationId?: string | number): void => {
  if (publicationId) {
    const pubIdString = String(publicationId);
    colorCache.delete(pubIdString);
    fetchingPromises.delete(pubIdString);
  } else {
    colorCache.clear();
    fetchingPromises.clear();
  }
};

