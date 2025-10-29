# Service Areas Implementation Guide

## Overview

The Service Areas feature provides a clean, hierarchical way to specify geographic coverage for publications. It solves the ambiguity problem where selecting "Ventura County" shouldn't imply coverage of the entire "Los Angeles DMA".

---

## Problem Solved

**Original Issue:** When a publication serves only specific counties or zip codes (like Ventura County), we need to clearly distinguish between:
- **Full DMA Coverage** - "We serve the entire Los Angeles market"
- **Partial Coverage** - "We only serve Ventura County within LA"

The old flat UI made this ambiguous.

---

## Data Structure

### ServiceArea Schema

Stored at: `basicInfo.serviceAreas[]`

```typescript
interface ServiceArea {
  dmaName: string;              // e.g., "Chicago, IL"
  dmaNormalized: string;        // e.g., "chicago-il"
  isPrimary?: boolean;          // Only for full DMA coverage
  counties?: Array<{            // If present, means partial coverage
    name: string;
    normalized: string;
  }>;
  zipCodes?: string[];          // If present, means partial coverage
  coveragePercentage?: number;  // Optional
  notes?: string;               // Optional
}
```

### Interpretation Logic

- **Full DMA**: `counties` and `zipCodes` are empty/undefined
- **Partial Coverage**: Has `counties` or `zipCodes` arrays with items

### Examples

**Example 1: Full Chicago DMA**
```json
{
  "dmaName": "Chicago, IL",
  "dmaNormalized": "chicago-il",
  "isPrimary": true
}
```
✅ Means: "We serve the entire Chicago DMA"

**Example 2: Only Ventura County**
```json
{
  "dmaName": "Los Angeles, CA",
  "dmaNormalized": "los-angeles-ca",
  "counties": [
    { "name": "Ventura", "normalized": "ventura" }
  ]
}
```
✅ Means: "We serve ONLY Ventura County, not all of LA"

**Example 3: Specific Zip Codes**
```json
{
  "dmaName": "Milwaukee, WI",
  "dmaNormalized": "milwaukee-wi",
  "zipCodes": ["53201", "53202", "53203"]
}
```
✅ Means: "We serve only these specific zip codes in Milwaukee"

---

## API Endpoint

### GET `/api/areas/search?q={query}`

Searches the Areas database for DMAs, Counties, or Zip Codes.

**Query Examples:**
- `?q=Chicago` → Finds Chicago DMA
- `?q=Cook` → Finds Cook County (shows parent DMA as context)
- `?q=606` → Finds zip codes starting with 606

**Response Format:**
```json
[
  {
    "type": "dma",
    "displayName": "Chicago, IL",
    "normalizedName": "chicago-il",
    "contextText": "Entire DMA"
  },
  {
    "type": "county",
    "displayName": "Cook County",
    "normalizedName": "cook",
    "parentDmaName": "Chicago, IL",
    "parentDmaNormalized": "chicago-il",
    "contextText": "County in Chicago, IL"
  }
]
```

---

## UI Components

### ServiceAreaSelectorSimple (Edit Mode)

**Location:** `src/components/dashboard/ServiceAreaSelectorSimple.tsx`

**Features:**
- Smart search by DMA, County, or Zip Code
- Distinguishes full DMA vs partial coverage
- Color-coded badges (blue=DMA, green=county, purple=zip)
- Real-time API search

**Visual Layout:**
```
Service Areas
├─ Full DMAs: [Chicago, IL ⭐] [×]
└─ Los Angeles, CA (partial coverage)
    └─ Counties: [Ventura] [×]
```

### ServiceAreaDisplaySimple (View Mode)

Read-only display that clearly shows full vs partial coverage.

---

## Integration

### Backend Setup

1. **Areas Service Added** - `AreasService` is now initialized with other services
2. **API Route** - `/api/areas/search` queries the Areas database
3. **Server Import** - `areasService` imported in `server/index.ts`

### Frontend Usage

```tsx
import { ServiceAreaSelectorSimple } from './ServiceAreaSelectorSimple';

<ServiceAreaSelectorSimple
  serviceAreas={publication.basicInfo.serviceAreas || []}
  onChange={(areas) => updatePublication({ basicInfo: { serviceAreas: areas } })}
/>
```

---

## User Flow

### Adding Full DMA Coverage

1. Click "Add Service Area"
2. Search "Chicago"
3. Click result: "Chicago, IL (Entire DMA)"
4. Result: Full DMA badge appears in "Full DMAs" section

### Adding Partial Coverage

1. Click "Add Service Area"
2. Search "Ventura"
3. Click result: "Ventura County (County in Los Angeles, CA)"
4. Result: Appears under "Los Angeles, CA (partial coverage)"

### Mixing Both

A publication can have:
- Full DMAs: Chicago (entire market)
- Partial: Ventura County only (not all of LA)
- Specific zips: Milwaukee downtown area

This gives maximum flexibility without ambiguity.

---

## Database Requirements

### Areas Collection

Must be populated with DMA/County/Zip data. Schema defined in:
- `json_files/schema/areas.json`
- `src/types/area.ts`
- `src/integrations/mongodb/areasService.ts`

See `AREAS_COLLECTION_GUIDE.md` for import instructions.

---

## Key Benefits

✅ **No Ambiguity** - Clear distinction between full and partial coverage
✅ **Smart Search** - Find areas by any level (DMA, County, Zip)
✅ **Proper Schema** - Uses ServiceArea[] from publication schema
✅ **Real Data** - Queries actual Areas database
✅ **Flexible** - Mix full DMAs with partial counties/zips
✅ **Visual Clarity** - Color-coded badges and hierarchical display

---

## Files Modified

### Created:
- `src/components/dashboard/ServiceAreaSelectorSimple.tsx` - Main component

### Modified:
- `server/index.ts` - Added `/api/areas/search` endpoint
- `src/integrations/mongodb/allServices.ts` - Added areasService
- `src/components/dashboard/PublicationProfile.tsx` - Integrated new component

### Deleted:
- `GeographicMarketSelector.tsx` (legacy)
- `ServiceAreaSelector.tsx` (complex version)

---

## Testing Checklist

- [ ] Start server: `npm run dev` (backend) and `npm start` (frontend)
- [ ] Ensure Areas database is populated
- [ ] Edit a publication
- [ ] Search for a DMA (e.g., "Chicago") - should add full DMA
- [ ] Search for a county (e.g., "Ventura") - should add partial coverage
- [ ] Search for a zip (e.g., "606") - should add specific zips
- [ ] Remove items - should clean up empty service areas
- [ ] Save and reload - data persists correctly
- [ ] View mode displays full vs partial clearly

---

## Troubleshooting

### "No results found" when searching

**Cause:** Areas database not populated

**Fix:** Run the areas import script (see `AREAS_COLLECTION_GUIDE.md`)

### API returns 500 error

**Cause:** AreasService can't connect to MongoDB

**Fix:** Check MongoDB connection and ensure `areas` collection exists

### Results show but clicking doesn't add them

**Cause:** JavaScript error in component

**Fix:** Check browser console for errors

---

## Future Enhancements

1. **Bulk Import** - Import service areas from CSV
2. **Coverage Percentage** - Add sliders for coverage %
3. **Visual Map** - Show selected areas on a map
4. **Auto-suggest** - Pre-fill based on publication location
5. **Validation** - Warn if overlapping or conflicting areas

---

## Migration from Legacy

If you have existing data in `basicInfo.geographicMarket.{dmas, counties, zipcodes}`:

```typescript
// Convert flat structure to ServiceArea[]
const serviceAreas: ServiceArea[] = [];

// Add DMAs as full coverage
oldData.dmas?.forEach(dmaName => {
  serviceAreas.push({
    dmaName: dmaName,
    dmaNormalized: dmaName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    isPrimary: serviceAreas.length === 0
  });
});

// Add counties as partial coverage
oldData.counties?.forEach(countyName => {
  // Look up parent DMA from Areas database
  const county = await areasService.findDMAsByCounty(countyName);
  if (county) {
    serviceAreas.push({
      dmaName: county.dma.name,
      dmaNormalized: county.dma.normalized,
      counties: [{ name: countyName, normalized: countyName.toLowerCase() }]
    });
  }
});

// Save converted data
publication.basicInfo.serviceAreas = serviceAreas;
```

---

## Summary

The Service Areas implementation provides a clean, unambiguous way to specify geographic coverage using a hierarchical structure that matches real-world geographic relationships while maintaining the flexibility to specify coverage at any level (DMA, County, or Zip Code).

