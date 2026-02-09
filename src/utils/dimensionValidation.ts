/**
 * Shared validation for pixel dimensions (width×height) in website and newsletter inventory.
 * Enforces the number×number pattern (e.g. 300x250, 1200x675).
 */

/** Matches width×height with digits; allows optional spaces around x or ×. */
export const PIXEL_DIMENSION_REGEX = /^\d+\s*[x×]\s*\d+$/i;

/**
 * Returns true if the token is a valid pixel dimension (e.g. "300x250", "300 x 250").
 */
export function isValidPixelDimension(token: string): boolean {
  return PIXEL_DIMENSION_REGEX.test(token.trim());
}

/**
 * Normalize a single dimension to canonical form "widthxheight" (lowercase x, no spaces).
 */
function normalizePixelDimension(token: string): string {
  const trimmed = token.trim();
  const match = trimmed.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (!match) return trimmed;
  return `${match[1]}x${match[2]}`;
}

/**
 * Parse comma-separated custom dimension input into an array of valid, normalized
 * pixel dimensions. Invalid tokens are filtered out.
 */
export function parsePixelDimensions(commaSeparated: string): string[] {
  if (!commaSeparated?.trim()) return [];
  const tokens = commaSeparated.split(',').map((d) => d.trim()).filter(Boolean);
  return tokens
    .filter((t) => isValidPixelDimension(t))
    .map(normalizePixelDimension);
}

/**
 * Format dimensions for display (handles string or array from format.dimensions).
 */
export function formatDimensionsForDisplay(dimensions: string | string[] | undefined | null): string {
  if (dimensions == null || dimensions === '') return '';
  if (Array.isArray(dimensions)) return dimensions.join(', ');
  return String(dimensions);
}
