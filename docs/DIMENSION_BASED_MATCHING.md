# Dimension-Based Matching for Website Inventory

## Overview

For website advertising inventory, **dimensions (size/aspect ratio) are the PRIMARY matching criteria** when mapping uploaded creative assets to publication requirements. Other specifications (file format, color space, file size) are secondary and more flexible for web.

## Why Dimensions Matter Most for Website Inventory

### Primary: Dimensions/Aspect Ratio
- **300x250**, **728x90**, **300x600**, etc. are standardized IAB sizes
- These are hardcoded in website ad slots and cannot be flexible
- A 300x250 ad MUST be exactly 300x250 pixels to display correctly
- Aspect ratio determines how the ad appears on the page

### Secondary: File Format
- Most websites can handle **JPG, PNG, GIF, WebP**
- Many support **HTML5** for animated ads
- Format can often be converted (PNG → JPG, etc.)
- **Not a hard constraint** for matching

### Secondary: Color Space
- Web displays use **RGB** color space (unlike print which uses CMYK)
- Even if a publication specifies something different, RGB is standard
- Browsers automatically handle color rendering
- **Not a hard constraint** for matching

### Secondary: File Size
- Important for performance, but more flexible than dimensions
- Can be optimized/compressed after upload
- Publications may have different limits, but 150KB-500KB is typical
- **Validation warning, not a blocking factor**

## Implementation Changes

### 1. Updated Matching Scores (`fileSpecDetection.ts`)

**Old Scoring:**
```typescript
- Dimensions: 50 points (exact) or 30 points (close)
- File Format: 30 points
- File Size: 10 points
- Color Space: 10 points
```

**New Scoring (Website):**
```typescript
- Dimensions: 70 points (exact) or 40 points (close) ← INCREASED
- File Format: 15 points ← DECREASED (flexible for web)
- File Size: 10 points (same - still important)
- Color Space: 5 points ← DECREASED (RGB is standard)
```

**New Scoring (Print/Other):**
```typescript
- Dimensions: 70 points (exact) or 40 points (close)
- File Format: 20 points ← More important for print
- File Size: 10 points
- Color Space: 10 points ← Important for print (CMYK)
```

### 2. Dimension-Only Grouping for Website (`creativeSpecsGrouping.ts`)

**Old Grouping Key:**
```
website::dim:300x250::fmt:JPG|PNG::color:RGB::res:72ppi
```
Result: Multiple groups for the same size if specs differ slightly

**New Grouping Key (Website):**
```
website::dim:300x250
```
Result: Single group per size, regardless of format/color differences

**Print/Other (unchanged):**
```
print::dim:8.5x11::fmt:PDF::color:CMYK::res:300dpi
```
Result: Strict grouping for print where all specs matter

### 3. Smart Matching Logic

```typescript
// For website inventory
if (isWebsite && dimensionMatch) {
  // Dimension match is sufficient!
  // Don't penalize for format/color differences
  includeInResults = true;
}

// For other channels
if (!isWebsite && (allSpecsMatch || highScore)) {
  // Require stricter matching
  includeInResults = true;
}
```

### 4. Helper Functions

```typescript
/**
 * Find all spec groups that match a given dimension
 */
findSpecGroupsByDimension(
  specGroups: GroupedCreativeRequirement[],
  targetDimension: string, // e.g., "300x250"
  channel: string = 'website'
): GroupedCreativeRequirement[]

/**
 * Check if dimensions match (handles arrays and strings)
 */
dimensionsMatch(
  dims1: string | string[] | undefined,
  dims2: string | string[] | undefined
): boolean
```

## User Experience Impact

### Before (Strict Matching):
```
Upload: banner_300x250.jpg (RGB, JPG, 145KB)

❌ Doesn't match: Publication A - 300x250 (needs PNG)
❌ Doesn't match: Publication B - 300x250 (needs GIF)
❌ Doesn't match: Publication C - 300x250 (needs sRGB)

Result: Must upload 3 separate files for the same size!
```

### After (Dimension-Based Matching):
```
Upload: banner_300x250.jpg (RGB, JPG, 145KB)

✅ Matches: Publication A - 300x250 (will accept JPG)
✅ Matches: Publication B - 300x250 (will accept JPG)
✅ Matches: Publication C - 300x250 (RGB is fine)

Result: Single file applies to all 3 placements!
```

## Real-World Example

### Campaign with Website Inventory

**Selected Inventory:**
- Chicago Tribune - 300x250 Medium Rectangle (wants PNG, RGB, 200KB max)
- Evanston Now - 300x250 Medium Rectangle (wants JPG, sRGB, 150KB max)
- Oak Park Patch - 300x250 Medium Rectangle (wants GIF, RGB, 250KB max)
- Naperville Sun - 728x90 Leaderboard (wants PNG, RGB, 100KB max)
- Daily Herald - 728x90 Leaderboard (wants JPG, sRGB, 80KB max)

**Old System (5 spec groups):**
1. website::dim:300x250::fmt:PNG::color:RGB
2. website::dim:300x250::fmt:JPG::color:sRGB
3. website::dim:300x250::fmt:GIF::color:RGB
4. website::dim:728x90::fmt:PNG::color:RGB
5. website::dim:728x90::fmt:JPG::color:sRGB

→ Requires 5 separate uploads

**New System (2 spec groups):**
1. website::dim:300x250 (applies to publications 1, 2, 3)
2. website::dim:728x90 (applies to publications 4, 5)

→ Requires only 2 uploads!

## Matching Flow

```
1. User uploads file: banner_300x250.jpg
   ↓
2. System detects specs:
   - Dimensions: 300x250
   - Format: JPG
   - Color: RGB
   - Size: 145KB
   ↓
3. System searches for matches:
   - Channel: website
   - Dimensions: 300x250 ← PRIMARY MATCH
   ↓
4. System finds 1 spec group:
   - website::dim:300x250
   - Applies to 3 publications
   ↓
5. System auto-suggests:
   "✨ Suggested: 300x250 Medium Rectangle (3 placements)"
   - High confidence (90%)
   - Dimensions match exactly
   - Format acceptable (can convert if needed)
   ↓
6. User clicks "Use Suggested"
   ↓
7. Asset assigned to all 3 placements ✅
```

## API Response Format

When matching files to standards, the response includes:

```json
{
  "fileName": "banner_300x250.jpg",
  "detectedSpecs": {
    "dimensions": {
      "width": 300,
      "height": 250,
      "formatted": "300x250"
    },
    "fileExtension": "JPG",
    "colorSpace": "RGB",
    "fileSize": 148521,
    "fileSizeFormatted": "145.04 KB"
  },
  "suggestedStandard": {
    "id": "website_banner_300x250",
    "name": "300x250 Medium Rectangle",
    "channel": "website",
    "defaultSpecs": {
      "dimensions": "300x250",
      "fileFormats": ["JPG", "PNG", "GIF", "HTML5"],
      "maxFileSize": "150KB",
      "colorSpace": "RGB",
      "resolution": "72ppi"
    }
  },
  "matchConfidence": 90,
  "matchReasons": [
    "Dimensions match exactly: 300x250",
    "File format matches",
    "File size within limit",
    "RGB color space (web standard)"
  ]
}
```

## Benefits

### For Hub Teams:
- **Faster uploads** - one file per size, not per publication
- **Less confusion** - clear which size is needed
- **Fewer errors** - dimensions are the hard requirement
- **Bulk operations** - easier to process ZIP files with standard sizes

### For Publications:
- **Flexibility** - can receive assets in various formats
- **Faster turnaround** - hubs can provide assets quickly
- **Less back-and-forth** - no need to request specific formats
- **Standard compliance** - IAB standard sizes ensure compatibility

### For the System:
- **Better grouping** - fewer spec groups to manage
- **Smarter matching** - prioritizes what actually matters
- **Cleaner data** - dimension-based keys are more stable
- **Easier validation** - clear pass/fail criteria

## Migration Notes

### Existing Data
- No database changes needed
- Existing spec groups will continue to work
- New uploads will use dimension-based grouping
- Gradually existing campaigns will consolidate groups

### Testing
- Test with real IAB standard sizes (300x250, 728x90, etc.)
- Verify multiple formats (JPG, PNG, GIF) match the same group
- Confirm non-website inventory still uses strict matching
- Check ZIP processing with mixed sizes and formats

## Related Files

- `src/utils/fileSpecDetection.ts` - Scoring and matching logic
- `src/utils/creativeSpecsGrouping.ts` - Grouping and helper functions
- `src/components/campaign/CampaignCreativeAssetsUploader.tsx` - UI implementation
- `src/config/inventoryStandards.ts` - Standard size definitions
- `docs/WEBSITE_INVENTORY_QUICK_REF.md` - Reference for standard sizes

## Next Steps

1. ✅ Update matching scores to prioritize dimensions
2. ✅ Simplify grouping for website inventory
3. ✅ Add helper functions for dimension-based matching
4. ⏭️ Test with real campaign data
5. ⏭️ Monitor user feedback on matching accuracy
6. ⏭️ Extend to other channels (print, newsletter, etc.)

