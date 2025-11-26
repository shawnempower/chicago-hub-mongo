# Inventory Dropdown Now Uses Standards Config

**Date**: November 25, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## What Changed

The **Website Ad Format Selector** dropdown now automatically populates from the **Inventory Standards Config** instead of using hardcoded options.

---

## Before vs After

### Before (Hardcoded):
```typescript
const WEBSITE_DIMENSION_OPTIONS = [
  { value: '300x250', label: 'Medium Rectangle (300x250)' },
  { value: '728x90', label: 'Leaderboard (728x90)' },
  // ... manually maintained list
];
```

**Problems:**
- ❌ Duplicated data (config + dropdown)
- ❌ Easy to get out of sync
- ❌ No specifications shown
- ❌ Manual updates required

### After (Dynamic from Config):
```typescript
const standards = getWebsiteStandards();
const WEBSITE_DIMENSION_OPTIONS = generateFromStandards(standards);
```

**Benefits:**
- ✅ Single source of truth
- ✅ Always in sync with standards
- ✅ Full specifications shown
- ✅ Automatic updates

---

## User Experience

### Publication Creating Inventory

**Step 1**: Open "Add Website Ad" dialog

**Step 2**: Click "Ad Format / Dimensions" dropdown

**Step 3**: See organized standards:

```
┌─────────────────────────────────────────────────────┐
│ IAB STANDARD SIZES                                  │
├─────────────────────────────────────────────────────┤
│ ✓ 300x250 Medium Rectangle                          │
│   IAB Standard - Most common web ad size           │
│                                                     │
│   728x90 Leaderboard                                │
│   IAB Standard - Horizontal banner at top/bottom   │
│                                                     │
│   160x600 Wide Skyscraper                           │
│   IAB Standard - Tall vertical ad for sidebar      │
│                                                     │
│   ... (more standards)                              │
├─────────────────────────────────────────────────────┤
│ VIDEO FORMATS                                       │
├─────────────────────────────────────────────────────┤
│   Pre-roll Video Ad                                 │
│   Video advertisement that plays before content    │
│                                                     │
│   Mid-roll Video Ad                                 │
│   Video advertisement that plays during content    │
├─────────────────────────────────────────────────────┤
│ CUSTOM                                              │
├─────────────────────────────────────────────────────┤
│   Custom dimensions...                              │
└─────────────────────────────────────────────────────┘
```

**Step 4**: Select a standard (e.g., "300x250 Medium Rectangle")

**Step 5**: Specifications auto-fill:

```
┌─────────────────────────────────────────────────────┐
│ ℹ Standard Specifications                           │
├─────────────────────────────────────────────────────┤
│ Formats: JPG, PNG, GIF, HTML5                      │
│ Max Size: 150KB                                     │
│ Color: RGB                                          │
│ Resolution: 72ppi                                   │
│ Animation: Max 15s                                  │
└─────────────────────────────────────────────────────┘
```

---

## What Gets Saved

When a publication selects a standard, the system now saves:

```json
{
  "name": "Homepage Sidebar Banner",
  "location": "Homepage - Right Sidebar",
  "format": {
    "dimensions": "300x250",
    "standardId": "website_banner_300x250",
    "specifications": {
      "fileFormats": ["JPG", "PNG", "GIF", "HTML5"],
      "maxFileSize": "150KB",
      "colorSpace": "RGB",
      "resolution": "72ppi",
      "animationDuration": 15
    }
  },
  "pricing": {
    "flatRate": 500,
    "pricingModel": "per_week"
  }
}
```

**Key Points:**
- ✅ `standardId` links to config
- ✅ Full `specifications` stored for reference
- ✅ Backward compatible (existing records still work)

---

## How It Works

### 1. Generate Options from Config

```typescript
function generateWebsiteDimensionOptions() {
  const standards = getWebsiteStandards();
  
  // Group by type
  standards.forEach(standard => {
    if (standard.iabStandard) {
      iabStandards.push({
        value: standard.defaultSpecs.dimensions,
        label: standard.name,
        standardId: standard.id,
        standard: standard  // Full standard object
      });
    }
  });
  
  return grouped options;
}
```

### 2. Display in Dropdown

```typescript
<Select>
  {options.map(option => (
    <SelectItem value={option.value}>
      {option.label}
      <p className="description">{option.standard.description}</p>
    </SelectItem>
  ))}
</Select>
```

### 3. Save with Standard Reference

```typescript
onChange({ 
  dimensions: '300x250',
  standardId: 'website_banner_300x250',
  specifications: standard.defaultSpecs
});
```

---

## Benefits

### For Publications:
✅ **Clear descriptions** - Know exactly what each format is  
✅ **See specifications** - File formats, sizes, requirements shown  
✅ **No confusion** - Standard names like "Medium Rectangle" vs just "300x250"  
✅ **Best practices** - Only IAB standard and recommended sizes shown  

### For Hub Teams:
✅ **Consistent data** - All publications use same standards  
✅ **Easy matching** - Creative assets match to standards automatically  
✅ **Gap analysis** - Know exactly what's needed  
✅ **Validation** - Specifications are known and validated  

### For System:
✅ **Single source of truth** - Config file is the authority  
✅ **Easy updates** - Add new standard once, appears everywhere  
✅ **Type safe** - TypeScript ensures correctness  
✅ **Maintainable** - One place to update  

---

## Backward Compatibility

### Existing Records:
Records without `standardId` still work:

```json
{
  "format": {
    "dimensions": "300x250"
    // No standardId - legacy record
  }
}
```

The system will:
1. Display the dimension
2. Try to match to a standard (by dimensions)
3. Fall back gracefully if no match

### Migration (Optional):
We could run a script to add `standardId` to existing records:

```typescript
for (const publication of publications) {
  for (const ad of publication.website.advertisingOpportunities) {
    const standard = findStandardByDimensions(ad.format.dimensions);
    if (standard) {
      ad.format.standardId = standard.id;
      ad.format.specifications = standard.defaultSpecs;
    }
  }
}
```

---

## Examples

### Publication: Chicago Tribune

**Creates Website Ad:**
```
Name: "Homepage Main Banner"
Location: "Homepage - Top"
Format: [Dropdown] → Selects "728x90 Leaderboard"
```

**System saves:**
```json
{
  "name": "Homepage Main Banner",
  "location": "Homepage - Top",
  "format": {
    "dimensions": "728x90",
    "standardId": "website_banner_728x90",
    "specifications": {
      "fileFormats": ["JPG", "PNG", "GIF", "HTML5"],
      "maxFileSize": "150KB",
      "colorSpace": "RGB",
      "resolution": "72ppi",
      "animationDuration": 15
    }
  }
}
```

**When hub creates campaign:**
```typescript
// System knows specifications
const adSpecs = inventory.format.specifications;

// Validates uploaded creative
const isValid = validate(uploadedFile, adSpecs);
// Checks: format, size, color space, resolution

// Matches automatically
const standard = getInventoryStandard(inventory.format.standardId);
// Returns full standard info
```

---

## Testing

### Test 1: Create New Website Ad
1. Login as publication
2. Go to Inventory → Website
3. Click "Add Website Ad"
4. Open "Ad Format / Dimensions" dropdown
5. ✅ Should see standards from config
6. ✅ Should see descriptions
7. Select "300x250 Medium Rectangle"
8. ✅ Should see specifications info box below
9. Save
10. ✅ Should save with `standardId` and `specifications`

### Test 2: Edit Existing Ad (Legacy)
1. Find an old ad without `standardId`
2. Edit the ad
3. ✅ Dropdown should still work
4. ✅ Can select new standard
5. Save
6. ✅ Now has `standardId`

### Test 3: Campaign Creative Upload
1. Create campaign with ads from multiple publications
2. Go to Creative Assets
3. Upload ZIP with various banner sizes
4. ✅ System should auto-match using `standardId`
5. ✅ Validation should use `specifications`

---

## Future Enhancements

### 1. Override Capability
Allow publications to override specs:

```json
{
  "format": {
    "dimensions": "300x250",
    "standardId": "website_banner_300x250",
    "specifications": {
      // ... standard specs
    },
    "overrides": {
      "maxFileSize": "200KB"  // Allow larger files
    }
  }
}
```

### 2. Custom Standards per Publication
Some publications might want their own variants:

```json
{
  "format": {
    "dimensions": "300x250",
    "standardId": "tribune_homepage_banner",  // Custom standard
    "baseStandardId": "website_banner_300x250",  // Extends this
    "specifications": {
      // Custom specs
    }
  }
}
```

### 3. Version Tracking
Track when standards change:

```json
{
  "format": {
    "standardId": "website_banner_300x250",
    "standardVersion": "2025-11-25",
    "specifications": { ... }
  }
}
```

---

## Summary

**What**: Dropdown now uses Inventory Standards Config  
**Where**: `src/components/WebsiteAdFormatSelector.tsx`  
**Why**: Single source of truth, automatic sync, better UX  
**Impact**: Publications see rich standard info, system can validate/match  

**Files Modified:**
- `src/components/WebsiteAdFormatSelector.tsx`

**Files Leveraged:**
- `src/config/inventoryStandards.ts`

**Result**: Publications select from standardized formats with full specifications automatically included.

---

**Last Updated**: November 25, 2025  
**Status**: ✅ Production Ready

