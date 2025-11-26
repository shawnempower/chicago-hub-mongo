# Creative Assets: Grouped by Specification Approach

**Date**: November 25, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## The Problem with Per-Placement Upload

### Old Approach (WRONG ❌):
Upload assets **per placement per publication**

```
Campaign needs:
- Publication A: 300x250 Banner [Upload file 1]
- Publication B: 300x250 Banner [Upload file 2]  
- Publication C: 300x250 Banner [Upload file 3]
- Publication D: 300x250 Banner [Upload file 4]
- Publication E: 728x90 Skyscraper [Upload file 5]
```

**Problems**:
- Hub team uploads same asset 4 times (300x250)
- Extremely tedious for campaigns with many publications
- No consistency guarantee (what if they upload different versions?)
- 100+ placements = 100+ uploads even if many have identical specs

---

## New Approach: Group by Unique Specifications ✅

### Smart Upload (CORRECT ✅):
Upload **once per unique specification**, automatically apply to all matching placements

```
Campaign needs:

1. 300x250 Website Banner (RGB) [Upload once]
   → Used by: Publication A, B, C, D (4 placements)
   
2. 728x90 Skyscraper (RGB) [Upload once]
   → Used by: Publication E (1 placement)
   
3. Full Page Print Ad (CMYK, 300dpi) [Upload once]
   → Used by: Publication F, G (2 placements)
```

**Benefits**:
✅ Upload once, use many times  
✅ Guaranteed consistency across publications  
✅ Much faster - 3 uploads instead of 7  
✅ Clear overview of what assets are needed  
✅ Scales well (100 placements might only need 5-10 unique assets)  

---

## How It Works

### 1. Grouping Logic

Assets are grouped by **unique specification combinations**:

```typescript
function generateSpecKey(requirement: CreativeRequirement): string {
  return [
    requirement.channel,              // 'website', 'print', 'newsletter'
    `dim:${requirement.dimensions}`,  // '300x250', 'Full Page'
    `fmt:${requirement.fileFormats}`, // 'JPG,PNG'
    `color:${requirement.colorSpace}`,// 'RGB', 'CMYK'
    `res:${requirement.resolution}`   // '72ppi', '300dpi'
  ].join('::');
}
```

**Example Groups**:
- `website::dim:300x250::fmt:JPG,PNG::color:RGB::res:72ppi`
- `print::dim:Full Page::fmt:PDF::color:CMYK::res:300dpi`
- `newsletter::dim:600x150::fmt:JPG::color:RGB`

### 2. Display Format

Each group card shows:

```
┌─────────────────────────────────────────────────────────┐
│ 300x250 • Website • RGB                          ✓      │
│ Used by 4 placements across 3 publications              │
│ [Chicago Tribune] [Daily Herald] [+2 more]              │
│                                                          │
│ ┌─ Specifications ─────────────────────────────────┐   │
│ │ Size: 300x250      Format: JPG, PNG             │   │
│ │ Max Size: 150KB    Color: RGB                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                          │
│ [Click to upload or drag file here]                     │
│                                                          │
│ [Choose File]                                            │
└─────────────────────────────────────────────────────────┘
```

### 3. Asset Association

When you upload an asset for a spec group:

```typescript
{
  specGroupId: "website::dim:300x250::fmt:JPG,PNG::color:RGB",
  file: File,
  uploadStatus: 'uploaded',
  assetId: 'asset_123',
  fileUrl: 's3://bucket/creative-assets/campaigns/camp_456/banner.jpg',
  
  // Automatically applies to ALL these placements:
  appliesTo: [
    { placementId: '...', publicationId: 1, publicationName: 'Chicago Tribune' },
    { placementId: '...', publicationId: 2, publicationName: 'Daily Herald' },
    { placementId: '...', publicationId: 5, publicationName: 'Local News' },
    { placementId: '...', publicationId: 8, publicationName: 'Community Paper' }
  ]
}
```

### 4. Insertion Order Generation

When generating insertion orders:

1. For each publication's order
2. Look at their inventory items
3. Find matching uploaded assets by spec
4. Attach the asset to all matching placements
5. Publications receive orders with assets ready to use

---

## User Experience

### For Hub Teams

**Step 1: View Requirements**
```
Creative Requirements Checklist
Materials needed for 105 ad placements

You need 8 unique assets:
• 300x250 Banner (Website) - 45 placements
• 728x90 Skyscraper (Website) - 20 placements
• 160x600 Wide Skyscraper (Website) - 15 placements
• ...
```

**Step 2: Upload Assets**
```
Asset Upload Progress
3 of 8 unique assets uploaded
Covering 80 of 105 total placements

[Upload interface for each unique spec]
```

**Step 3: Generate Orders**
```
✓ All assets uploaded
Ready to generate insertion orders

Each publication will receive:
• Assets that match their inventory specs
• Automatic association with correct placements
```

### For Publications

Publications receive orders with:
- All creative assets attached
- Already matched to their placements
- Ready to download and use
- No need to request specs (they provided them in inventory)

---

## Example Scenario

### Campaign: "Spring Sale 2025"
**Selected Inventory**: 105 placements across 12 publications

### Traditional Approach:
- Hub uploads 105 files (one per placement)
- Takes hours
- Risk of inconsistency

### Grouped Approach:
Hub uploads **8 unique assets**:

```
1. 300x250 Banner (Website RGB 72ppi)
   ✓ Uploaded: spring-banner-300x250.jpg
   → Used by 45 placements (Publications: Tribune, Herald, Times, Post, etc.)

2. 728x90 Skyscraper (Website RGB 72ppi)
   ✓ Uploaded: spring-leaderboard-728x90.jpg
   → Used by 20 placements (Publications: Tribune, Herald, etc.)

3. 160x600 Wide Skyscraper (Website RGB 72ppi)
   ✓ Uploaded: spring-tall-160x600.jpg
   → Used by 15 placements (Publications: Tribune, Times, etc.)

4. Full Page Ad (Print CMYK 300dpi)
   ✓ Uploaded: spring-fullpage-print.pdf
   → Used by 10 placements (Publications: Weekly, Community News)

5. Half Page Ad (Print CMYK 300dpi)
   ✓ Uploaded: spring-halfpage-print.pdf
   → Used by 8 placements (Publications: Weekly, Local Press)

6. Newsletter Header (Email RGB)
   ✓ Uploaded: spring-newsletter-header-600x150.jpg
   → Used by 5 placements (Publications: Tribune, Herald newsletters)

7. Social Media Post (1080x1080)
   ✓ Uploaded: spring-social-square.jpg
   → Used by 2 placements (Publications: Social channels)

8. Radio Spot (30 sec MP3)
   ✓ Pending upload
   → Used by 0 placements (will be used by radio stations)
```

**Time Saved**: Upload 8 files instead of 105 = **92% reduction**

---

## Technical Implementation

### Files Created

1. **`src/utils/creativeSpecsGrouping.ts`**
   - `groupRequirementsBySpec()` - Groups requirements by unique specs
   - `generateSpecKey()` - Creates unique identifier for each spec combo
   - `GroupedCreativeRequirement` - Interface for grouped specs
   - `UploadedAssetWithSpecs` - Interface for assets with multiple placements

2. **`src/components/campaign/CampaignCreativeAssetsStepGrouped.tsx`**
   - Replaces per-placement upload component
   - Displays grouped specs
   - Handles upload once, apply to many
   - Shows which publications use each asset

### Files Modified

3. **`src/pages/CampaignDetail.tsx`**
   - Uses `CampaignCreativeAssetsStepGrouped` instead of old component

4. **`src/pages/CampaignBuilder.tsx`**
   - Uses `CampaignCreativeAssetsStepGrouped` in Step 5

### Grouping Algorithm

```typescript
// Extract all requirements from campaign inventory
const requirements = extractRequirementsForSelectedInventory(inventoryItems);
// Example: 105 requirements

// Group by unique specifications
const grouped = groupRequirementsBySpec(requirements);
// Result: 8 unique spec groups

// Each group contains:
{
  specGroupId: 'unique-key',
  channel: 'website',
  dimensions: '300x250',
  fileFormats: ['JPG', 'PNG'],
  maxFileSize: '150KB',
  colorSpace: 'RGB',
  resolution: '72ppi',
  
  placements: [
    { placementId, publicationId, publicationName },
    // ... all 45 placements that match this spec
  ],
  
  placementCount: 45,
  publicationCount: 12
}
```

---

## Data Flow

### Upload Process

```
1. User selects file for "300x250 Banner (Website)"
   ↓
2. Validate file against spec requirements
   ↓
3. Create asset record with specGroupId
   ↓
4. Upload file to S3: creative-assets/campaigns/{id}/banner.jpg
   ↓
5. Store asset metadata including:
   - specifications (what it's for)
   - appliesTo (all 45 placements that need it)
   ↓
6. Mark asset as uploaded
   ↓
7. Update progress: "1 of 8 uploaded (45 of 105 placements covered)"
```

### Order Generation Process

```
1. Generate insertion orders per publication
   ↓
2. For Publication A's order:
   - Loop through their inventory items
   - For each item, generate specGroupId from specs
   - Find matching uploaded asset by specGroupId
   - Attach asset to order
   ↓
3. Publication A receives order with:
   - 300x250 Banner → spring-banner-300x250.jpg
   - 728x90 Skyscraper → spring-leaderboard-728x90.jpg
   - Full Page Print → spring-fullpage-print.pdf
```

---

## Database Schema Updates

### CreativeAsset Enhancement

```typescript
interface CreativeAsset {
  // ... existing fields ...
  
  // NEW: Spec group this asset belongs to
  specGroupId?: string;
  
  // NEW: All placements this asset applies to
  appliesTo?: Array<{
    placementId: string;
    publicationId: number;
    publicationName: string;
  }>;
  
  specifications: {
    // ... existing spec fields ...
    
    // NEW: Tracking fields
    placementCount?: number;      // How many placements use this
    publicationCount?: number;    // How many publications use this
    publications?: string[];      // List of publication names
  };
}
```

---

## Migration from Old Approach

If you have campaigns using the old per-placement upload:

### Option 1: Leave as-is
- Old campaigns work fine
- New campaigns use grouped approach
- No migration needed

### Option 2: Deduplicate (Advanced)
Script to identify duplicate assets and consolidate:

```typescript
// Find assets with same file but different placement associations
// Merge into single asset with multiple placements
// Update insertion orders to reference merged asset
```

---

## Benefits Summary

### Efficiency
- **92% fewer uploads** for typical campaigns
- Upload 5-10 assets instead of 100+
- Minutes instead of hours

### Consistency
- Same asset used everywhere
- No version mismatches
- Publications get identical creative

### Clarity
- See exactly what unique assets are needed
- Track progress by spec group, not by placement
- Understand asset reuse across publications

### Scalability
- Works for campaigns of any size
- 10 publications or 100 publications
- Complexity stays manageable

---

## Testing

### Test Case 1: Simple Campaign
```
3 publications, 9 placements total
All need 300x250 banner

Expected:
- 1 spec group shown
- Upload 1 file
- "1 of 1 uploaded (9 of 9 placements covered)"
```

### Test Case 2: Multi-Channel Campaign
```
5 publications
- 3 need: 300x250 web banner
- 2 need: Full page print ad
- All 5 need: Newsletter header

Expected:
- 3 spec groups shown
- Upload 3 files
- "3 of 3 uploaded (10 of 10 placements covered)"
```

### Test Case 3: Mixed Specs Campaign
```
10 publications, 50 placements
Various sizes: 300x250, 728x90, 160x600, print, newsletter

Expected:
- 8-12 spec groups
- Upload 8-12 files
- Progress tracked per spec group
- All placements covered by uploads
```

---

## Future Enhancements

### 1. Bulk Upload via ZIP
Upload a ZIP file with naming convention:
```
spring-campaign-assets.zip
  ├─ 300x250-banner.jpg     → Auto-matched to 300x250 spec
  ├─ 728x90-leaderboard.jpg → Auto-matched to 728x90 spec
  ├─ fullpage-print.pdf     → Auto-matched to full page spec
  └─ ...
```

### 2. Asset Templates
Pre-configured templates for common sizes:
- "Standard Web Package" (300x250, 728x90, 160x600)
- "Print Package" (Full Page, Half Page, Quarter Page)
- "Social Media Package" (Square, Story, Banner)

### 3. Smart Cropping
Upload one master image, automatically:
- Resize to all required dimensions
- Optimize for web/print
- Generate all needed variants

---

## Documentation

- ✅ `CREATIVE_ASSETS_GROUPED_APPROACH.md` (this file)
- ✅ `CREATIVE_UPLOAD_SUMMARY.md` - Implementation details
- ✅ `WORKFLOW_FIX_IMPLEMENTATION.md` - Why specs come from inventory
- ✅ `CREATIVE_UPLOAD_TROUBLESHOOTING.md` - Debug guide

---

## Summary

The grouped approach transforms creative asset upload from a tedious per-placement task into an efficient spec-based workflow. Hub teams upload far fewer files, maintain consistency across publications, and save significant time.

**Key Insight**: Most campaigns need only **5-15 unique assets** even with **100+ placements**, because many placements share the same specifications.

---

**Last Updated**: November 25, 2025  
**Status**: ✅ Production Ready

