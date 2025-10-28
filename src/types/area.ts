/**
 * Type definitions for the Areas collection
 * Represents geographic hierarchy: DMA -> Counties -> Zip Codes
 */

export interface County {
  name: string;
  normalized: string;
  zipCodes: string[];
}

export interface DMA {
  name: string;
  normalized: string;
}

export interface AreaMetadata {
  totalCounties: number;
  totalZipCodes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Area {
  _id?: string;
  dma: DMA;
  counties: County[];
  allZipCodes: string[];
  metadata: AreaMetadata;
}

/**
 * Search/filter options for querying areas
 */
export interface AreaSearchOptions {
  /** Search by DMA name (case-insensitive regex) */
  dmaName?: string;
  /** Search by normalized DMA name (exact match) */
  dmaNormalized?: string;
  /** Search by county name */
  countyName?: string;
  /** Search by zip code */
  zipCode?: string;
  /** Limit number of results */
  limit?: number;
}

/**
 * Result type for area searches
 */
export interface AreaSearchResult {
  dma: DMA;
  counties?: County[];
  matchedCounty?: string;
  matchedZipCode?: string;
  metadata?: AreaMetadata;
}

