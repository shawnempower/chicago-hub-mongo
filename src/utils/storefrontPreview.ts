import { StorefrontConfiguration } from '@/types/storefront';

/**
 * Generate a preview URL for a storefront configuration
 * @param config - The storefront configuration
 * @param isDraft - Whether to preview the draft version
 * @returns The preview URL
 */
export function generatePreviewUrl(config: StorefrontConfiguration, isDraft: boolean = false): string {
  const baseUrl = config.meta.websiteUrl;
  
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Add draft parameter if previewing draft
  const draftParam = isDraft ? '?preview=draft' : '';
  
  // Assuming the storefront is at /storefront or /advertise path
  // You can customize this based on your actual storefront path
  return `${cleanBaseUrl}/storefront${draftParam}`;
}

/**
 * Generate a preview URL with specific parameters
 * @param websiteUrl - The website URL
 * @param params - Query parameters to add
 * @returns The preview URL
 */
export function generatePreviewUrlWithParams(
  websiteUrl: string,
  params: Record<string, string> = {}
): string {
  const cleanBaseUrl = websiteUrl.endsWith('/') ? websiteUrl.slice(0, -1) : websiteUrl;
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  const query = queryString ? `?${queryString}` : '';
  
  return `${cleanBaseUrl}/storefront${query}`;
}

/**
 * Check if a URL is valid
 * @param url - The URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storefront embed URL (for iframe preview)
 * @param config - The storefront configuration
 * @param isDraft - Whether to show draft version
 * @returns The embed URL
 */
export function getStorefrontEmbedUrl(config: StorefrontConfiguration, isDraft: boolean = false): string {
  const previewUrl = generatePreviewUrl(config, isDraft);
  return `${previewUrl}&embed=true`;
}

