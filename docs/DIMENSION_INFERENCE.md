# Dimension Inference from Ad Placement Names

## Overview

The creative asset upload system now **automatically infers dimensions** from ad placement names when dimensions aren't explicitly stored in the inventory data. This allows the system to work with legacy inventory that doesn't have structured dimension fields.

## The Problem

When analyzing your campaign inventory, we discovered that dimensions aren't stored in the database:

```json
{
    "channel": "website",
    "itemName": "Medium Rectangle",
    "specifications": {
        "format": "JPG, PNG, GIF, HTML5",
        "fileSize": "Not specified"
        // ❌ NO dimensions field!
    }
}
```

## The Solution

Instead of requiring database updates, the system now **intelligently infers dimensions from placement names** using IAB standard ad sizes.

### Website Ad Placements

| Placement Name Contains | Inferred Dimension | IAB Standard |
|------------------------|-------------------|--------------|
| "Medium Rectangle" | **300x250** | Medium Rectangle |
| "Leaderboard" | **728x90** | Leaderboard |
| "Large Leaderboard" | **970x90** | Large Leaderboard |
| "Half Page", "Skyscraper" | **300x600** | Half Page |
| "Wide Skyscraper" | **160x600** | Wide Skyscraper |
| "Billboard" | **970x250** | Billboard |
| "Mobile Banner" | **320x50** | Mobile Leaderboard |
| "Large Rectangle" | **336x280** | Large Rectangle |
| "Square" | **250x250** | Square |
| "300x250" (explicit) | **300x250** | Extracted from name |

### Newsletter Ad Placements

| Placement Name Contains | Inferred Dimension | Standard |
|------------------------|-------------------|----------|
| "Large Banner" | **600x150** | Newsletter Header |
| "Medium Rectangle" | **300x250** | Embedded Rectangle |
| "Leaderboard", "Banner" | **600x100** | Newsletter Banner |

## How It Works

### 1. Extraction Priority

The system checks for dimensions in this order:

```typescript
// 1. Explicit dimensions in database
if (item.format?.dimensions) ✅
else if (item.sizes) ✅
else if (item.dimensions) ✅
// 2. Infer from name
else inferDimensionsFromName(itemName, channel) ✨
```

### 2. Name Parsing

The inference function:
- Converts names to lowercase
- Looks for common ad size keywords
- Checks for explicit dimensions (e.g., "728x90")
- Returns the most likely standard size

### 3. Logging

When dimensions are inferred, you'll see console logs:

```
[Dimensions Inference] Inferred 300x250 from "Medium Rectangle" for website
[Dimensions Inference] Inferred 728x90 from "Leaderboard / Tall Tower Ad" for website
```

## Real-World Example

### Your Campaign Data

**Bridge - Website Placements:**
- ✅ "Front Page Header/Footer" → (no standard match, left undefined)
- ✅ "Interior Page Placement" → (no standard match, left undefined)

**Chicago News Weekly - Website Placements:**
- ✅ "Monthly Banner Ad" → **728x90** (inferred)
- ✅ "Leaderboard / Tall Tower Ad" → **728x90** (inferred from "Leaderboard")

**CAN TV - Newsletter Placements:**
- ✅ "Large Banner" → **600x150** (inferred)
- ✅ "Medium Rectangle" → **300x250** (inferred)

**Chicago Reader - Website Placements:**
- ✅ "Leaderboard" → **728x90** (inferred)
- ✅ "Half Page / Skyscraper" → **300x600** (inferred)

### Result in UI

**Before (with inference):**
```
Required Sizes
─────────────────────────────
✓ 300x250     15 placements • 8 pubs
— 728x90      10 placements • 6 pubs
— 300x600      8 placements • 5 pubs
— 600x150      4 placements • 3 pubs
```

**What it was showing (without inference):**
```
Required Sizes
─────────────────────────────
— Any size    42 placements • 25 pubs  ❌
```

## Limitations

### Not All Names Can Be Inferred

Some placement names are too generic or non-standard:

**Cannot infer dimensions:**
- "Front Page Header/Footer" → Too vague
- "Display Placement" → No size clue
- "Premium Positioning" → No size clue
- "Sponsor Logo" → Could be any size

**These will show as "Any size"** until:
1. The publication adds explicit dimensions to their inventory, OR
2. The hub team assigns a standard dimension during campaign setup

### Ambiguous Names

Some names could mean multiple sizes:
- "Banner" could be 728x90 OR 970x90
- "Square" could be 250x250 OR 200x200

The system picks the **most common IAB standard** in these cases.

## Best Practices

### For Publications

When setting up inventory, use **standard IAB terminology**:
- ✅ "300x250 Medium Rectangle"
- ✅ "728x90 Leaderboard"
- ✅ "Half Page (300x600)"

Or better yet, **add explicit dimensions** to your inventory:

```json
{
    "itemName": "Homepage Banner",
    "format": {
        "dimensions": "728x90"  // ← Explicit is better!
    }
}
```

### For Hub Teams

When creating campaigns:
1. **Check the "Required Sizes" section** - this shows what was inferred
2. **If something shows "Any size"**, you'll need to manually select a standard when uploading
3. **Upload files with standard dimensions** - the auto-detection will match them

### For Developers

To add support for new size inference patterns:

1. Edit `src/utils/creativeSpecsExtractor.ts`
2. Add patterns to the `inferDimensionsFromName()` function:

```typescript
if (nameLower.includes('your pattern')) {
  return 'WIDTHxHEIGHT';
}
```

## Future Enhancements

### Planned Improvements

1. **Machine Learning** - Train on historical data to improve inference
2. **Fallback to Pub Defaults** - Use publication's most common sizes
3. **Manual Override** - Allow hub teams to set dimensions during campaign setup
4. **Database Migration** - Backfill dimensions for all inventory items
5. **Admin Tool** - Bulk update inventory with inferred dimensions

### Database Schema Enhancement

Future schema (when we update the database):

```typescript
interface InventoryItem {
  itemName: string;
  dimensions?: {
    explicit: string;        // From publication
    inferred?: string;       // Auto-detected
    confirmed?: string;      // Hub-verified
  };
  specifications: {
    format: string[];
    // ...
  };
}
```

## Related Files

- **`src/utils/creativeSpecsExtractor.ts`** - Inference logic
- **`src/config/inventoryStandards.ts`** - IAB standard definitions
- **`src/components/campaign/CampaignCreativeAssetsUploader.tsx`** - Upload UI
- **`src/utils/fileSpecDetection.ts`** - File dimension detection
- **`docs/DIMENSION_BASED_MATCHING.md`** - Overall matching strategy

## Testing

To verify the inference is working:

1. **Check Console Logs:**
   ```
   [Dimensions Inference] Inferred 300x250 from "Medium Rectangle" for website
   ```

2. **Check Required Sizes Card:**
   - Should show specific dimensions like "300x250", "728x90"
   - Should NOT show "Any size" for standard placements

3. **Upload Test:**
   - Upload a 300x250 image
   - It should auto-match to "Medium Rectangle" placements ✅

## Summary

**✅ No database changes required**  
**✅ Works with existing inventory data**  
**✅ Uses IAB standards for accuracy**  
**✅ Improves UX by showing specific sizes**  
**✅ Enables auto-matching of uploaded files**  

The dimension inference feature bridges the gap between legacy inventory data and modern creative asset management! 🎯

