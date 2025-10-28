# Areas Collection Guide

## Overview

The `areas` collection provides a structured hierarchical representation of US geographic data, organizing **Designated Market Areas (DMAs)**, **Counties**, and **ZIP Codes** for easy querying and searching.

## Data Structure

### Hierarchy
```
DMA (Designated Market Area)
  └── Counties
      └── ZIP Codes
```

### Schema

```typescript
interface Area {
  _id?: string;
  dma: {
    name: string;           // e.g., "CHICAGO, IL"
    normalized: string;     // e.g., "chicago-il"
  };
  counties: Array<{
    name: string;           // e.g., "COOK"
    normalized: string;     // e.g., "cook"
    zipCodes: string[];     // e.g., ["60601", "60602", "60603"]
  }>;
  allZipCodes: string[];    // Flattened array of all ZIP codes in DMA
  metadata: {
    totalCounties: number;
    totalZipCodes: number;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

## Statistics

- **Total DMAs**: 257
- **Total Counties**: 3,051
- **Total ZIP Codes**: 40,186
- **Average Counties per DMA**: 11.9
- **Average ZIP Codes per DMA**: 156.4

## Import/Re-import Data

### Source Data

The import script requires a `geography.csv` file in the project root with the following format:
```
id,dma,county,zip,created_at,updated_at
```

**Note**: The `geography.csv` file is not tracked in git (listed in `.gitignore`) since the data is stored in MongoDB. If you need to re-import the data, ensure you have the CSV file in the project root.

### Running the Import

To import or re-import the areas data from the CSV file:

```bash
npm run import:areas
```

This command will:
1. Parse the `geography.csv` file
2. Transform the data into the hierarchical structure
3. Drop the existing `areas` collection (if it exists)
4. Insert 257 DMA documents
5. Create optimized indexes for searching

## Indexes

The following indexes are automatically created for optimal query performance:

1. **DMA Name Index**: `{ "dma.name": 1 }`
2. **DMA Normalized Index**: `{ "dma.normalized": 1 }`
3. **ZIP Codes Index**: `{ "allZipCodes": 1 }`
4. **County Name Index**: `{ "counties.name": 1 }`
5. **Combined DMA + County Index**: `{ "dma.normalized": 1, "counties.normalized": 1 }`

## Using the AreasService

### TypeScript/JavaScript

```typescript
import { getAreasService } from '@/integrations/mongodb/areasService';

const areasService = getAreasService();

// Search for DMAs by name
const results = await areasService.search({ 
  dmaName: 'chicago',
  limit: 10 
});

// Find DMA by zip code
const dma = await areasService.findDMAByZipCode('60601');
console.log(dma.dma.name); // "CHICAGO, IL"

// Get all counties in a DMA
const counties = await areasService.getCountiesInDMA('chicago-il');

// Get all ZIP codes in a DMA
const zips = await areasService.getZipCodesInDMA('chicago-il');

// Autocomplete for DMA names
const suggestions = await areasService.autocompleteDMA('new');
// Returns: [{ name: "NEW YORK, NY", normalized: "new-york-ny" }, ...]

// Get statistics
const stats = await areasService.getStats();
```

## Common Query Examples

### 1. Find a DMA by Normalized Name

```javascript
db.areas.findOne({ "dma.normalized": "chicago-il" })
```

### 2. Find Which DMA a ZIP Code Belongs To

```javascript
db.areas.findOne(
  { "allZipCodes": "60601" },
  { projection: { "dma.name": 1 } }
)
```

### 3. Search DMAs by Name (Case-Insensitive)

```javascript
db.areas.find({
  "dma.name": { $regex: "chicago", $options: "i" }
})
```

### 4. Find All DMAs in a Specific County

```javascript
db.areas.find({
  "counties.name": "COOK"
})
```

### 5. Get Counties and ZIP Codes for a DMA

```javascript
db.areas.findOne(
  { "dma.normalized": "chicago-il" },
  { projection: { counties: 1, allZipCodes: 1 } }
)
```

### 6. Find ZIP Codes in a Specific County within a DMA

```javascript
db.areas.findOne(
  { 
    "dma.normalized": "chicago-il",
    "counties.name": "COOK"
  },
  { projection: { "counties.$": 1 } }
)
```

### 7. Autocomplete Search (Starts With)

```javascript
db.areas.find(
  { "dma.name": { $regex: "^CHI", $options: "i" } },
  { projection: { dma: 1 } }
).limit(10)
```

### 8. Count Total Counties and ZIP Codes

```javascript
db.areas.aggregate([
  {
    $group: {
      _id: null,
      totalDMAs: { $sum: 1 },
      totalCounties: { $sum: "$metadata.totalCounties" },
      totalZipCodes: { $sum: "$metadata.totalZipCodes" }
    }
  }
])
```

## API Endpoints (Add to your Express server)

Example endpoints you might want to add:

```typescript
// GET /api/areas/search?q=chicago
app.get('/api/areas/search', async (req, res) => {
  const { q, limit = 10 } = req.query;
  const areasService = getAreasService();
  const results = await areasService.search({ 
    dmaName: q as string, 
    limit: Number(limit) 
  });
  res.json(results);
});

// GET /api/areas/dma/:normalized
app.get('/api/areas/dma/:normalized', async (req, res) => {
  const areasService = getAreasService();
  const area = await areasService.getByDMA(req.params.normalized);
  res.json(area);
});

// GET /api/areas/zip/:zipCode
app.get('/api/areas/zip/:zipCode', async (req, res) => {
  const areasService = getAreasService();
  const result = await areasService.findDMAByZipCode(req.params.zipCode);
  res.json(result);
});

// GET /api/areas/autocomplete?q=new
app.get('/api/areas/autocomplete', async (req, res) => {
  const { q, limit = 10 } = req.query;
  const areasService = getAreasService();
  const results = await areasService.autocompleteDMA(
    q as string, 
    Number(limit)
  );
  res.json(results);
});

// GET /api/areas/dmas (list all DMAs)
app.get('/api/areas/dmas', async (req, res) => {
  const areasService = getAreasService();
  const dmas = await areasService.getAllDMAs();
  res.json(dmas);
});
```

## Use Cases

### 1. **Geographic Targeting for Ad Campaigns**
Allow advertisers to target specific DMAs, counties, or ZIP codes for their campaigns.

```typescript
// User selects a DMA, then can drill down to specific counties or ZIPs
const dma = await areasService.getByDMA('chicago-il');
// Show user all available counties and ZIP codes
```

### 2. **Location-Based Search**
Help users find content or services in their area.

```typescript
// User enters ZIP code
const area = await areasService.findDMAByZipCode('60601');
// Show content relevant to their DMA
```

### 3. **Form Autocomplete**
Provide autocomplete suggestions for location fields.

```typescript
// As user types "new"
const suggestions = await areasService.autocompleteDMA('new');
// Show: NEW YORK, NY | NEW ORLEANS, LA | etc.
```

### 4. **Geographic Analytics**
Analyze coverage or distribution across DMAs.

```typescript
const stats = await areasService.getStats();
// Display coverage map or statistics
```

## Files Reference

- **Schema Definition**: `json_files/schema/areas.json`
- **TypeScript Types**: `src/types/area.ts`
- **Service Layer**: `src/integrations/mongodb/areasService.ts`
- **Import Script**: `src/scripts/importAreas.ts`
- **Source Data**: `geography.csv`

## Notes

- The `normalized` fields use lowercase with hyphens for URL-friendly identifiers
- All ZIP codes are stored as 5-digit strings
- The `allZipCodes` array is denormalized for fast lookup performance
- County names may appear in multiple DMAs (e.g., counties on DMA boundaries)

## Troubleshooting

### Re-import if data appears incorrect
```bash
npm run import:areas
```

### Check collection stats
```javascript
const areasService = getAreasService();
const stats = await areasService.getStats();
console.log(stats);
```

### Verify indexes
```javascript
db.areas.getIndexes()
```

## Future Enhancements

Potential additions to consider:

1. **State groupings**: Add state-level hierarchy
2. **Coordinates**: Add lat/long for DMAs and counties
3. **Population data**: Include demographic information
4. **Historical data**: Track changes over time
5. **Relationships**: Link to publications serving each area

