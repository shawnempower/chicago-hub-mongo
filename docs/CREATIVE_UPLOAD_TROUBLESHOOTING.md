# Creative Assets Upload - Troubleshooting Guide

**Issue**: Creative Assets Upload shows "0 of 0 assets uploaded"  
**Status**: ✅ FIXED with enhanced debugging

---

## Problem Description

When clicking "Upload Creative Assets" from a campaign's Creative Requirements tab, the upload interface shows:

```
Creative Assets Upload Progress
Upload creative assets for each placement. All assets must be uploaded before generating orders.

0 of 0 assets uploaded
0%
```

This means **no creative requirements were extracted** from the campaign's inventory.

---

## Root Causes

### 1. **Campaign Has No Inventory Selected** ⚠️
The most common cause - the campaign was created but no inventory items were selected during the analysis step.

**How to Check**:
- Go to the "Campaign" tab
- Look for "Selected Inventory" section
- If it shows 0 publications or 0 inventory items, this is the issue

**How to Fix**:
1. Go back to Campaign Builder
2. Re-analyze the campaign with proper inventory selection
3. Save the campaign with selected inventory
4. Return to Creative Requirements tab

### 2. **Inventory Items Missing Required Fields** ⚠️
Inventory items exist but don't have the proper structure.

**Required Fields for Each Inventory Item**:
```typescript
{
  itemName: string;           // or name, or sourceName
  channel: string;            // 'website', 'print', 'newsletter', etc.
  specifications?: {          // Optional but recommended
    dimensions?: string;
    formats?: string[];
    maxFileSize?: string;
    colorSpace?: string;
    resolution?: string;
  }
}
```

**How to Check**:
- Open browser DevTools (F12)
- Go to Console tab
- Click "Upload Creative Assets"
- Look for debug logs:
  ```
  Extracting requirements from inventory items: 0
  Extracted requirements: 0 []
  ```
- If you see warnings like:
  ```
  extractRequirementsForSelectedInventory: No inventory items provided
  ```
  Then the inventory data is missing

**How to Fix**:
1. Check the campaign data structure in MongoDB
2. Ensure `selectedInventory.publications` exists
3. Ensure each publication has `inventoryItems` array
4. Ensure each inventory item has `itemName` and `channel`

### 3. **All Inventory Items Are Excluded** ⚠️
Items exist but all have `isExcluded: true`.

**How to Check**:
- Look in console for: `Processing inventory item X:` logs
- If none appear, all items might be excluded

**How to Fix**:
1. Edit campaign inventory
2. Un-exclude relevant items
3. Save and try again

---

## Enhanced Debugging (Added)

### Console Logs

The system now logs detailed information when extracting requirements:

```javascript
// When you click "Upload Creative Assets", you'll see:

Extracting requirements from inventory items: 5
Processing inventory item 0: {
  itemName: "Homepage Banner",
  channel: "website",
  publicationId: 42,
  publicationName: "Chicago Tribune",
  hasSpecs: true,
  hasFormat: true
}
Processing inventory item 1: { ... }
...
Extracted requirements: 5 [...]
```

### Error Messages

If no requirements are found, you'll now see a helpful error card:

```
⚠️ No Creative Requirements Found

This campaign doesn't have any inventory items with creative specifications yet.

Possible reasons:
• No inventory items have been selected for this campaign
• The selected inventory items are missing channel or specification data
• All inventory items have been excluded

Next steps:
1. Go back to the campaign builder
2. Select inventory items with proper specifications
3. Return here to upload creative assets
```

---

## Step-by-Step Troubleshooting

### Step 1: Open Browser DevTools

1. Press **F12** (Windows) or **Cmd+Opt+I** (Mac)
2. Go to the **Console** tab
3. Clear the console (🚫 icon)

### Step 2: Navigate to Upload

1. Go to your campaign
2. Click **"Creative Requirements"** tab
3. Click **"Upload Creative Assets"** button

### Step 3: Check Console Output

Look for these messages:

#### ✅ **GOOD** - Requirements Found:
```
Extracting requirements from inventory items: 105
Processing inventory item 0: { itemName: "Banner Ad", channel: "website", ... }
Processing inventory item 1: { itemName: "Newsletter Header", channel: "newsletter", ... }
...
Extracted requirements: 105 [...]
```

#### ❌ **BAD** - No Requirements:
```
Extracting requirements from inventory items: 0
extractRequirementsForSelectedInventory: No inventory items provided
Extracted requirements: 0 []
```

### Step 4: Inspect Campaign Data

If no requirements are found, check the raw campaign data:

1. In Console, type:
   ```javascript
   // This will show you the campaign object
   window.campaignData
   ```

2. Look for:
   ```javascript
   {
     selectedInventory: {
       publications: [
         {
           publicationId: 42,
           publicationName: "Chicago Tribune",
           inventoryItems: [
             {
               itemName: "Homepage Banner",
               channel: "website",
               specifications: { ... }
             }
           ]
         }
       ]
     }
   }
   ```

3. Check if:
   - `selectedInventory` exists
   - `publications` array has items
   - Each publication has `inventoryItems`
   - Each inventory item has `itemName` and `channel`

### Step 5: Fix the Issue

Based on what you found:

#### If `selectedInventory` is empty or missing:
**Solution**: Re-create or re-analyze the campaign

1. Go to Campaign Builder
2. Enter campaign details
3. Run the AI analysis
4. Verify inventory is selected
5. Save the campaign

#### If inventory items are malformed:
**Solution**: Fix the data structure

Option A - Via UI:
1. Edit campaign
2. Re-select inventory
3. Save

Option B - Via Database:
1. Open MongoDB Compass
2. Find the campaign document
3. Ensure proper structure
4. Save changes

#### If specifications are missing:
**Solution**: Publications need to add specs to their inventory

1. Contact publications
2. Ask them to fill out ad specifications
3. Update their inventory in the system
4. Re-analyze the campaign

---

## Testing After Fix

### Test 1: Requirements Display

1. Go to campaign → "Creative Requirements" tab
2. You should see:
   ```
   Creative Requirements Checklist
   Materials needed for X ad placements
   
   [Progress bar]
   
   [Upload Creative Assets button]
   ```

3. If you see "No inventory items selected yet", the fix didn't work

### Test 2: Upload Interface

1. Click "Upload Creative Assets"
2. You should see:
   ```
   Creative Assets Upload Progress
   X of Y assets uploaded
   Z%
   
   [List of placements with upload buttons]
   ```

3. Each placement should show:
   - Placement name
   - Publication name
   - Channel
   - Requirements (dimensions, formats, etc.)
   - "Choose File" button

### Test 3: Upload a File

1. Click "Choose File" on any placement
2. Select a file
3. File should upload to S3
4. Progress should update: "1 of X assets uploaded"

---

## Common Scenarios

### Scenario 1: Brand New Campaign

**What you'll see**: No inventory, no requirements

**Fix**:
1. Complete the Campaign Builder wizard
2. Run AI analysis to select inventory
3. Review and save campaign
4. Then upload creative assets

### Scenario 2: Draft Campaign (No Analysis Run)

**What you'll see**: Campaign exists but no `selectedInventory`

**Fix**:
1. Go to Campaign Builder
2. Load the draft
3. Complete the analysis step
4. Save with inventory

### Scenario 3: Campaign from Old System

**What you'll see**: Campaign exists but inventory structure is different

**Fix**:
1. May need database migration
2. Or re-create campaign in new system
3. Contact developer for migration script

### Scenario 4: Publications Have No Inventory

**What you'll see**: Campaign analyzed but 0 inventory items found

**Fix**:
1. Publications need to onboard properly
2. They must fill out their advertising inventory
3. See `docs/PUBLICATION_ONBOARDING.md`

---

## Developer Notes

### Code Changes Made

1. **`src/pages/CampaignDetail.tsx`**
   - Added better inventory item extraction
   - Added console logging
   - Filter out excluded items
   - Ensure `channel` field is always set

2. **`src/utils/creativeSpecsExtractor.ts`**
   - Enhanced `extractRequirementsForSelectedInventory()`
   - Added detailed logging for each item
   - Handle multiple field name variations (`name`, `itemName`, `sourceName`)
   - Better null checking

3. **`src/components/campaign/CampaignCreativeAssetsStep.tsx`**
   - Added "No Requirements Found" error card
   - Shows helpful troubleshooting steps
   - Lists possible causes
   - Provides clear next steps

### Data Flow

```
Campaign
  └─ selectedInventory
      └─ publications[]
          ├─ publicationId
          ├─ publicationName
          └─ inventoryItems[]
              ├─ itemName
              ├─ channel
              ├─ itemPath
              └─ specifications {...}

↓ Extract

CreativeRequirement[]
  ├─ placementId
  ├─ placementName
  ├─ publicationId
  ├─ publicationName
  ├─ channel
  └─ specifications {...}

↓ Pass to

CampaignCreativeAssetsStep
  └─ renders upload interface
```

### Debugging Tips

**Enable verbose logging**:
```javascript
// In browser console:
localStorage.setItem('debug', 'creative:*');
```

**Check requirements extraction**:
```javascript
// In CampaignDetail.tsx, add:
console.log('Campaign data:', campaign);
console.log('Selected inventory:', campaign?.selectedInventory);
console.log('Publications:', campaign?.selectedInventory?.publications);
```

**Test extraction manually**:
```javascript
import { extractRequirementsForSelectedInventory } from '@/utils/creativeSpecsExtractor';

const testItems = [{
  itemName: "Test Banner",
  channel: "website",
  publicationId: 1,
  publicationName: "Test Pub",
  itemPath: "test",
  specifications: {
    dimensions: "300x250",
    formats: ["JPG", "PNG"]
  }
}];

const requirements = extractRequirementsForSelectedInventory(testItems);
console.log('Test requirements:', requirements);
```

---

## Quick Reference

### ✅ What Should Work

- Campaign with inventory → Shows requirements
- Click Upload → Shows upload interface for each placement
- Upload file → Validates and uploads to S3
- Progress tracks → "X of Y uploaded"

### ❌ What's Wrong

- "0 of 0 assets" → No inventory items
- "No Creative Requirements Found" error → Missing data
- Console errors → Check logs for details

### 🔧 Quick Fix Commands

```bash
# Check campaign in database
mongosh
use chicago_hub
db.campaigns.findOne({ campaignId: "YOUR_CAMPAIGN_ID" })

# Check if selectedInventory exists
db.campaigns.aggregate([
  { $match: { campaignId: "YOUR_CAMPAIGN_ID" } },
  { $project: { 
    hasInventory: { $gt: [{ $size: { $ifNull: ["$selectedInventory.publications", []] } }, 0] },
    inventoryCount: { $size: { $ifNull: ["$selectedInventory.publications", []] } }
  }}
])
```

---

## Support

If you're still seeing "0 of 0 assets" after following this guide:

1. **Check the console logs** - Look for specific error messages
2. **Export campaign data** - Attach to support request
3. **Provide screenshots** - Of the error and console
4. **Contact developer** - With steps to reproduce

---

**Last Updated**: November 25, 2025  
**Related Docs**: 
- `CREATIVE_UPLOAD_SUMMARY.md` - Full implementation details
- `WORKFLOW_FIX_IMPLEMENTATION.md` - Why specs come from inventory
- `CREATIVE_ASSETS_IMPROVEMENTS.md` - Recent enhancements

