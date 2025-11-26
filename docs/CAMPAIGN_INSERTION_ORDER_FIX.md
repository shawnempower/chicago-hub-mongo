# Campaign Insertion Order Fix

## Problem
Campaign insertion orders were missing the "Audience Estimate" column and had incorrect quantity logic compared to package insertion orders.

## Root Cause
1. **Missing `currentFrequency` field**: When campaigns are created by the LLM, the inventory items weren't getting the `currentFrequency` field that package inventory items have.
2. **Missing Audience Column**: The web view (`CampaignDetail.tsx`) didn't display the Audience Estimate column, even though the download (HTML/Markdown) had it.

## Solution

### 1. Added `currentFrequency` to Campaign LLM Service
**File**: `server/campaignLLMService.ts`

Added `currentFrequency: item.quantity` when transforming LLM responses to ensure campaigns have the same field structure as packages.

```typescript
inventoryItems: pub.inventoryItems.map((item: any) => ({
  channel: item.channel,
  itemPath: item.itemPath,
  itemName: item.itemName,
  quantity: item.quantity,
  currentFrequency: item.quantity, // ✅ Added to match package structure
  duration: item.duration,
  frequency: item.frequency,
  specifications: item.specifications,
  monthlyImpressions: item.pricing?.monthlyImpressions,
  // ...
}))
```

### 2. Added Audience Estimate Column to Web View
**File**: `src/pages/CampaignDetail.tsx`

Added the "Audience Estimate" column to the insertion order preview table in the UI.

- Added column header: `<th>Audience Estimate</th>`
- Added data cell with the same logic as the download version
- Shows impressions, views, clicks, or appropriate text based on pricing model

### 3. Fixed Quantity Display Logic to Match Packages
**Files**: 
- `server/insertionOrderGenerator.ts` (HTML & Markdown)
- `src/pages/CampaignDetail.tsx` (Web view)

Changed quantity display to match package insertion orders:

```typescript
// For CPM/CPV/CPC items: "25% share" instead of "25×"
// For other items: "4× per month" instead of "4× one-time"

if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
  quantityDisplay = `${currentFreq}% share`;
} else {
  quantityDisplay = `${currentFreq}× per month`;
}
```

### 4. Enhanced Audience Estimates
Improved audience display to match package insertion orders with more detail:

**CPM/CPV/CPC Items:**
- Shows calculated impressions: "375,000 impressions/month"
- Format changed from "/mo" to "/month" for consistency

**Newsletter Items (`per_send`):**
- Before: "Per send"
- After: "45,586 subscribers × 4 sends" (if data available)
- Fallback: "4 sends per month"

**Print/Podcast Items (`per_spot`, `per_ad`):**
- Before: "Per placement"
- After: "63,000 listeners/viewers × 4 spots" (if data available)
- Fallback: "4 placements per month"

## Before & After Comparison

### Chicago Reader Example

**Before (Incorrect):**
| Channel | Ad Placement | Quantity | Audience Estimate | Cost |
|---------|--------------|----------|-------------------|------|
| website | Leaderboard | 25× | 1,500,000 impressions/mo | $8.00 |
| newsletter | Newsletter Leaderboard | 4× | Per send | $250.00 |
| print | Full Page | 4× | Per placement | $1,950.00 |

**After (Matches Package):**
| Channel | Ad Placement | Quantity | Audience Estimate | Cost |
|---------|--------------|----------|-------------------|------|
| website | Leaderboard | **25% share** | **375,000 impressions/month** | $8.00 |
| newsletter | Newsletter Leaderboard | **4× per month** | **45,586 subscribers × 4 sends** | $250.00 |
| print | Full Page | **4× per month** | **63,000 listeners/viewers × 4 spots** | $1,950.00 |

## Display Logic by Pricing Model

| Pricing Model | Quantity Format | Audience Estimate Format |
|--------------|-----------------|-------------------------|
| `cpm`, `cpv`, `cpc` | `X% share` | `{impressions} impressions/month` |
| `per_send`, `per_newsletter` | `X× per month` | `{subscribers} subscribers × X sends` or `X sends per month` |
| `per_spot`, `per_ad` | `X× per month` | `{listeners/viewers} listeners/viewers × X spots` or `X placements per month` |
| `monthly`, `flat` | `X× per month` | `Monthly rate` |
| Others | `X× per month` | `N/A` |

## Testing

### To See the Changes:

1. **Restart the backend server** (to load the updated LLM service):
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Refresh your browser** (to load the updated frontend)

3. **For existing campaigns**: 
   - The web view will now show the Audience Estimate column
   - Regenerate the insertion order to see it in downloads
   
4. **For new campaigns**: 
   - Will automatically have `currentFrequency` populated
   - Both web view and downloads will show correct data

### Expected Results:

**Web View** (Campaign Detail → Insertion Order tab):
- ✅ Shows "Audience Estimate" column
- ✅ Shows correct quantity (e.g., "4× one-time")
- ✅ Shows audience metrics based on pricing model

**Download** (HTML/Markdown):
- ✅ Shows "Audience Estimate" column
- ✅ Shows correct quantity (e.g., "4× one-time")
- ✅ Shows audience metrics based on pricing model

## Files Modified

1. `server/campaignLLMService.ts` - Added `currentFrequency` field
2. `server/insertionOrderGenerator.ts` - Fixed quantity display (removed 'monthly' default)
3. `src/pages/CampaignDetail.tsx` - Added Audience Estimate column to web view

## Backwards Compatibility

For campaigns created before this fix:
- **Quantity**: Will fallback to `item.quantity` if `currentFrequency` is missing (same value, so no change)
- **Audience**: Will show based on `monthlyImpressions` if available, or appropriate fallback text
- **Action Required**: Regenerate insertion orders to see the new column in downloads

## Notes

- The insertion order logic is now **identical** between campaigns and packages
- Both use the same calculation logic from `src/utils/inventoryPricing.ts`
- Audience metrics are calculated during campaign creation by the LLM
- The web preview and downloadable versions now match exactly

