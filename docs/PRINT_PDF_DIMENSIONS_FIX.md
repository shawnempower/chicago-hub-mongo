# Print PDF Dimensions Fix

**Date**: January 12, 2026  
**Issue**: PDF dimensions not displaying/matching properly in print creative requirements tab  
**Status**: ✅ **FIXED**

---

## Problem Summary

When uploading PDFs in the print tab for creative requirements in a campaign, the system was not properly showing or matching the print dimensions (e.g., 10" x 8.5").

## Root Cause

The issue was in how print ad dimensions were being stored in the database:

### ❌ Incorrect Storage Location
```typescript
// EditableInventoryManager.tsx line 1694 (BEFORE FIX)
onChange={(e) => updatePrintAd(printIndex, adIndex, 'dimensions', e.target.value)}
```

This stored dimensions as:
```json
{
  "dimensions": "10\" x 8.5\""  // ❌ Wrong location
}
```

### ✅ Correct Storage Location
Print ad dimensions should be stored in the `format` object to match the creative requirements extractor:

```json
{
  "format": {
    "dimensions": "10\" x 8.5\""  // ✅ Correct location
  }
}
```

## How It Works

### 1. PDF Detection System
The system already had full PDF dimension detection implemented:

**File**: `src/utils/fileSpecDetection.ts` (lines 336-425)

```typescript
async function detectPDFSpecs(file: File) {
  // Gets PDF page dimensions in points
  const viewport = page.getViewport({ scale: 1.0 });
  
  // Converts to inches (72 points = 1 inch)
  const widthInches = viewport.width / 72;
  const heightInches = viewport.height / 72;
  
  // Formats as: "10" x 12.5"
  const formatted = `${widthRounded}" x ${heightRounded}"`;
  
  return {
    dimensions: { width, height, formatted },
    pageCount: pdf.numPages,
    colorSpace: 'CMYK' // Detected or assumed for print
  };
}
```

### 2. Creative Requirements Extraction
The system extracts dimensions from print ads:

**File**: `src/utils/creativeSpecsExtractor.ts` (lines 167-168)

```typescript
// Extract dimensions from multiple possible locations
if (item.format?.dimensions) {
  requirement.dimensions = item.format.dimensions;  // ← Primary source
} else if (item.specifications?.dimensions) {
  requirement.dimensions = item.specifications.dimensions;
} else if (item.dimensions) {
  requirement.dimensions = item.dimensions;  // ← Fallback (legacy)
}
```

The extractor **prioritizes** `item.format.dimensions`, but the edit form was saving to the wrong location.

### 3. Dimension Grouping & Matching
Print requirements are grouped by specifications:

**File**: `src/utils/creativeSpecsGrouping.ts` (lines 63-121)

```typescript
function generateSpecKey(req: CreativeRequirement): string {
  const parts = [req.channel || 'general'];
  
  // Add dimensions
  if (req.dimensions) {
    parts.push(`dim:${dims}`);
  }
  
  // For print, add strict matching
  if (!isDigitalDisplay) {
    if (req.colorSpace) parts.push(`color:${req.colorSpace}`);
    if (req.resolution) parts.push(`res:${req.resolution}`);
  }
  
  return parts.join('::');
}
```

**Print grouping key example**:
```
print::dim:10"x8.5"::fmt:PDF::color:CMYK::res:300dpi
```

### 4. Dimension Matching
When a PDF is uploaded, the system:

1. **Detects dimensions** → `"10" x 8.5"`
2. **Parses print dimensions** → `{ width: 10, height: 8.5 }`
3. **Matches with tolerance** → ±5% for print (vs ±1% for web)

**File**: `src/config/inventoryStandards.ts` (lines 1325-1335)

```typescript
export function printDimensionsMatch(
  dims1: string, 
  dims2: string, 
  tolerance: number = 0.05  // 5% tolerance for print
): boolean {
  const parsed1 = parsePrintDimensions(dims1);
  const parsed2 = parsePrintDimensions(dims2);
  
  const widthDiff = Math.abs(parsed1.width - parsed2.width) / Math.max(parsed1.width, parsed2.width);
  const heightDiff = Math.abs(parsed1.height - parsed2.height) / Math.max(parsed1.height, parsed2.height);
  
  return widthDiff <= tolerance && heightDiff <= tolerance;
}
```

## The Fix

### Changed File
`src/components/dashboard/EditableInventoryManager.tsx` (line 1694)

### Before
```typescript
<Input
  value={ad.format?.dimensions || ad.dimensions || ''}
  onChange={(e) => updatePrintAd(printIndex, adIndex, 'dimensions', e.target.value)}
  placeholder="8.5x11"
/>
```

### After
```typescript
<Input
  value={ad.format?.dimensions || ad.dimensions || ''}
  onChange={(e) => updatePrintAdSpecifications(printIndex, adIndex, 'dimensions', e.target.value)}
  placeholder='10" x 8.5"'
/>
```

### Changes Made
1. ✅ Changed from `updatePrintAd` to `updatePrintAdSpecifications`
   - This stores dimensions in `ad.format.dimensions` (correct)
   - Instead of `ad.dimensions` (incorrect)

2. ✅ Updated placeholder to show proper format with inches and quotes
   - Old: `"8.5x11"` (ambiguous - pixels or inches?)
   - New: `'10" x 8.5"'` (clear - inches with quotes)

## How updatePrintAdSpecifications Works

**File**: `src/components/dashboard/EditableInventoryManager.tsx` (lines 444-462)

```typescript
const updatePrintAdSpecifications = (
  printIndex: number, 
  adIndex: number, 
  field: string, 
  value: any
) => {
  setFormData(prev => ({
    ...prev,
    distributionChannels: {
      ...prev.distributionChannels,
      print: prev.distributionChannels?.print?.map((printPub, pIndex) =>
        pIndex === printIndex ? {
          ...printPub,
          advertisingOpportunities: printPub.advertisingOpportunities?.map((ad, aIndex) =>
            aIndex === adIndex ? { 
              ...ad, 
              format: { ...ad.format, [field]: value }  // ← Saves to format.dimensions
            } : ad
          )
        } : printPub
      )
    }
  }));
};
```

## Expected User Experience

### 1. Adding Print Inventory to Publication
When editing a publication's print advertising opportunities:

```
Dimensions: [10" x 8.5"]  ← Clear format with quotes
```

This saves to: `print.advertisingOpportunities[0].format.dimensions = "10\" x 8.5\""`

### 2. Creating Campaign with Print Inventory
When adding print inventory to a campaign, the system:

1. Extracts requirements from publications
2. Groups by specifications:
   ```
   Print - 10" x 8.5" (CMYK, 300dpi, PDF)
   └─ 3 placements need this size
   ```

### 3. Uploading PDF for Print Creative
When uploading a PDF:

1. **System detects dimensions**:
   ```
   📐 10" x 8.5"
   🎨 CMYK
   ✨ 300dpi
   ```

2. **Auto-matches to requirements**:
   ```
   ✨ Auto-matched 3 print placements - 95%
   ```

3. **Shows in dropdown** (sorted by size):
   ```
   10" x 8.5" • 3 placements ✨ Match
   10" x 12.5" • 2 placements
   9" x 10" • 1 placement
   ```

4. **User clicks "Use Suggested"** or selects from dropdown
5. **One PDF → Multiple placements** (if dimensions match)

## Supported Dimension Formats

The system can parse multiple dimension formats:

| Input Format | Parsed As | Works? |
|-------------|-----------|--------|
| `10" x 8.5"` | 10 x 8.5 inches | ✅ Best |
| `10 x 8.5` | 10 x 8.5 inches | ✅ Good |
| `10.5" x 12.625"` | 10.5 x 12.625 inches | ✅ Best |
| `10 W x 8.5 H` | 10 x 8.5 inches | ✅ Good |
| `8.5x11` | 8.5 x 11 inches | ⚠️ Ambiguous |

**Best Practice**: Use format with quotes and 'x': `10" x 8.5"`

## Migration Considerations

### Existing Print Ads
Print ads saved with the old format (`ad.dimensions`) will still work because:

1. The display reads both locations:
   ```typescript
   value={ad.format?.dimensions || ad.dimensions || ''}
   ```

2. The creative specs extractor has fallback logic:
   ```typescript
   if (item.format?.dimensions) { ... }
   else if (item.dimensions) { ... }  // ← Legacy support
   ```

### Going Forward
All **new** print ads will save to `format.dimensions` automatically.

**Optional**: Run a migration script to move existing `ad.dimensions` to `ad.format.dimensions` for consistency.

## Testing Checklist

### ✅ Edit Print Ad Dimensions
1. Open Publication Editor
2. Go to Print channel
3. Edit dimensions field: `10" x 8.5"`
4. Save publication
5. **Verify**: Check database that `print.advertisingOpportunities[0].format.dimensions` is set

### ✅ Create Campaign with Print Inventory
1. Create new campaign
2. Add publications with print inventory
3. Go to Creative Requirements tab
4. **Verify**: See print requirements grouped by size with dimensions shown

### ✅ Upload PDF to Print Creative
1. Create campaign with print inventory (e.g., 10" x 8.5")
2. Go to Creative Requirements tab
3. Upload a PDF that matches that size
4. **Verify**:
   - System detects dimensions: "10" x 8.5""
   - Auto-matches to correct placement
   - Shows "✨ Match" indicator
   - Can assign to multiple placements with same size

### ✅ Upload PDF with Different Size
1. Upload a PDF that doesn't match (e.g., 11" x 10")
2. **Verify**:
   - System detects dimensions: "11" x 10""
   - Shows "⚠️ No exact match"
   - Can manually select closest size
   - Shows size difference in dropdown

## Related Files

### Core Files Changed
- `src/components/dashboard/EditableInventoryManager.tsx` - Fixed dimension storage

### System Already Working
- `src/utils/fileSpecDetection.ts` - PDF dimension detection (inches)
- `src/utils/creativeSpecsExtractor.ts` - Extracts from format.dimensions
- `src/utils/creativeSpecsGrouping.ts` - Groups print by dimensions
- `src/config/inventoryStandards.ts` - Print dimension parsing & matching
- `src/components/campaign/CampaignCreativeAssetsUploader.tsx` - Upload UI & matching

## Documentation
- `/docs/CREATIVE_REQUIREMENTS_QUICK_START.md` - User guide
- `/docs/PRINT_CREATIVE_REQUIREMENTS_SUMMARY.md` - Technical summary
- `/docs/CREATIVE_REQUIREMENTS_COMPLETE_SUMMARY.md` - Full documentation

---

## Summary

✅ **The fix was simple**: Changed one function call from `updatePrintAd` to `updatePrintAdSpecifications`

✅ **The system was already working**: PDF detection, dimension parsing, and matching were all implemented correctly

✅ **The only issue**: Dimensions were being saved to the wrong location in the database

✅ **Backward compatible**: Legacy `ad.dimensions` still works as fallback

✅ **User-friendly**: Clear placeholder showing proper format with quotes and inches
