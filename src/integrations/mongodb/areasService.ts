import { Collection, Db } from 'mongodb';
import { getDatabase } from './client';
import { Area, AreaSearchOptions, AreaSearchResult } from '../../types/area';

export class AreasService {
  private db: Db;
  private collection: Collection<Area>;

  constructor() {
    this.db = getDatabase();
    this.collection = this.db.collection<Area>('areas');
  }

  /**
   * Search for areas by various criteria
   */
  async search(options: AreaSearchOptions): Promise<AreaSearchResult[]> {
    const { dmaName, dmaNormalized, countyName, zipCode, limit = 10 } = options;

    // Build query based on provided options
    const query: any = {};

    if (dmaNormalized) {
      // Exact match on normalized DMA name
      query['dma.normalized'] = dmaNormalized;
    } else if (dmaName) {
      // Case-insensitive regex search on DMA name
      query['dma.name'] = { $regex: dmaName, $options: 'i' };
    }

    if (countyName) {
      query['counties.name'] = { $regex: countyName, $options: 'i' };
    }

    if (zipCode) {
      query['allZipCodes'] = zipCode;
    }

    const results = await this.collection
      .find(query)
      .limit(limit)
      .toArray();

    return results.map(area => ({
      dma: area.dma,
      counties: area.counties,
      metadata: area.metadata,
      matchedZipCode: zipCode,
      matchedCounty: countyName,
    }));
  }

  /**
   * Get a single area by DMA normalized name
   */
  async getByDMA(dmaNormalized: string): Promise<Area | null> {
    return await this.collection.findOne({ 'dma.normalized': dmaNormalized });
  }

  /**
   * Find which DMA a zip code belongs to
   */
  async findDMAByZipCode(zipCode: string): Promise<AreaSearchResult | null> {
    const area = await this.collection.findOne(
      { allZipCodes: zipCode },
      { projection: { dma: 1, counties: 1 } }
    );

    if (!area) return null;

    // Find the specific county that contains this zip code
    const matchedCounty = area.counties.find(county =>
      county.zipCodes.includes(zipCode)
    );

    return {
      dma: area.dma,
      counties: matchedCounty ? [matchedCounty] : [],
      matchedZipCode: zipCode,
      matchedCounty: matchedCounty?.name,
    };
  }

  /**
   * Find all DMAs in a specific county
   */
  async findDMAsByCounty(countyName: string): Promise<AreaSearchResult[]> {
    const results = await this.collection
      .find(
        { 'counties.name': { $regex: countyName, $options: 'i' } },
        { projection: { dma: 1, counties: { $elemMatch: { name: { $regex: countyName, $options: 'i' } } } } }
      )
      .toArray();

    return results.map(area => ({
      dma: area.dma,
      counties: area.counties,
      matchedCounty: countyName,
    }));
  }

  /**
   * Get all counties in a DMA
   */
  async getCountiesInDMA(dmaNormalized: string): Promise<string[]> {
    const area = await this.collection.findOne(
      { 'dma.normalized': dmaNormalized },
      { projection: { 'counties.name': 1 } }
    );

    return area?.counties.map(c => c.name) || [];
  }

  /**
   * Get all zip codes in a DMA
   */
  async getZipCodesInDMA(dmaNormalized: string): Promise<string[]> {
    const area = await this.collection.findOne(
      { 'dma.normalized': dmaNormalized },
      { projection: { allZipCodes: 1 } }
    );

    return area?.allZipCodes || [];
  }

  /**
   * Get all zip codes in a specific county within a DMA
   */
  async getZipCodesInCounty(dmaNormalized: string, countyName: string): Promise<string[]> {
    const area = await this.collection.findOne(
      { 
        'dma.normalized': dmaNormalized,
        'counties.name': countyName 
      },
      { projection: { counties: { $elemMatch: { name: countyName } } } }
    );

    return area?.counties[0]?.zipCodes || [];
  }

  /**
   * Search DMAs with autocomplete (for type-ahead search)
   */
  async autocompleteDMA(searchTerm: string, limit: number = 10): Promise<{ name: string; normalized: string }[]> {
    const results = await this.collection
      .find(
        { 'dma.name': { $regex: `^${searchTerm}`, $options: 'i' } },
        { projection: { dma: 1 } }
      )
      .limit(limit)
      .toArray();

    return results.map(r => r.dma);
  }

  /**
   * Get all unique DMAs (useful for dropdowns)
   */
  async getAllDMAs(): Promise<{ name: string; normalized: string }[]> {
    const results = await this.collection
      .find({}, { projection: { dma: 1 } })
      .sort({ 'dma.name': 1 })
      .toArray();

    return results.map(r => r.dma);
  }

  /**
   * Get statistics about the areas collection
   */
  async getStats(): Promise<{
    totalDMAs: number;
    totalCounties: number;
    totalZipCodes: number;
  }> {
    const stats = await this.collection.aggregate([
      {
        $group: {
          _id: null,
          totalDMAs: { $sum: 1 },
          totalCounties: { $sum: '$metadata.totalCounties' },
          totalZipCodes: { $sum: '$metadata.totalZipCodes' },
        },
      },
    ]).toArray();

    if (stats.length === 0) {
      return { totalDMAs: 0, totalCounties: 0, totalZipCodes: 0 };
    }

    return {
      totalDMAs: stats[0].totalDMAs,
      totalCounties: stats[0].totalCounties,
      totalZipCodes: stats[0].totalZipCodes,
    };
  }
}

// Export a singleton instance
let areasService: AreasService | null = null;

export const getAreasService = (): AreasService => {
  if (!areasService) {
    areasService = new AreasService();
  }
  return areasService;
};

export const initializeAreasService = () => {
  areasService = new AreasService();
};

