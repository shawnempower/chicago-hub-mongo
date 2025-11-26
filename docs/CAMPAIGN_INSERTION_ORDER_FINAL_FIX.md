# Campaign Insertion Order - Final Alignment with Packages

## Overview
This document details the final changes to align campaign insertion orders with package insertion orders in terms of quantity display, audience calculations, and cost presentation.

## Issues Fixed

### 1. ✅ Quantity Format
**Before:**
- CPM items: `25×`
- Other items: `4×`

**After:**
- CPM items: `25% share`
- Other items: `4× per month`

### 2. ✅ CPM Impression Calculation
**Before:**
- Showed full monthly impressions: `1,500,000 impressions/month`
- Did not calculate the percentage share

**After:**
- Calculates actual share: `375,000 impressions/month` (25% of 1.5M)
- Formula: `actualShare = monthlyImpressions × (currentFreq / 100)`

### 3. ✅ Newsletter Audience Display
**Before:**
- Generic text: `Per send`

**After:**
- Detailed info: `45,586 subscribers × 4 sends`
- Fallback if no data: `4 sends per month`

### 4. ✅ Print/Podcast Audience Display
**Before:**
- Generic text: `Per placement`

**After:**
- Detailed info: `63,000 listeners/viewers × 4 spots` (when data available)
- Fallback if no data: `4 placements per month`

### 5. ✅ Cost Column (Item Total)
**Before:**
- Showed calculated totals: `$0.20`, `$1,000`, `$600`, `$7,800`
- Used complex calculation logic

**After:**
- Shows unit prices: `$8.00`, `$250`, `$150`, `$1,950`
- Directly displays `item.itemPricing?.hubPrice`

## Technical Implementation

### Files Modified:
1. `server/insertionOrderGenerator.ts`
   - Campaign HTML insertion order
   - Campaign Markdown insertion order
   - Package HTML insertion order  
   - Package Markdown insertion order

2. `src/pages/CampaignDetail.tsx`
   - Web view insertion order preview

3. `server/campaignLLMService.ts`
   - Added `currentFrequency` field population

### Key Code Changes:

#### Quantity Display Logic:
```typescript
// Format quantity based on pricing model
let quantityDisplay = '';
if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
  quantityDisplay = `${currentFreq}% share`;
} else {
  quantityDisplay = `${currentFreq}× per month`;
}
```

#### CPM Impression Calculation:
```typescript
// Calculate actual share for CPM items
if (pricingModel === 'cpm' && monthlyImpressions) {
  const actualShare = Math.round(monthlyImpressions * (currentFreq / 100));
  audienceInfo = `${actualShare.toLocaleString()} impressions/month`;
}
```

#### Newsletter Audience:
```typescript
if (pricingModel === 'per_send' || pricingModel === 'per_newsletter') {
  const audienceSize = item.audienceMetrics?.subscribers || (item as any).subscribers;
  if (audienceSize && currentFreq) {
    audienceInfo = `${audienceSize.toLocaleString()} subscribers × ${currentFreq} sends`;
  } else {
    audienceInfo = `${currentFreq} sends per month`;
  }
}
```

#### Cost Display:
```typescript
// Show unit price instead of calculated total
<td>${this.formatCurrency(item.itemPricing?.hubPrice || 0)}</td>
```

## Before & After Comparison

### Chicago Reader Example

**Before:**
| Channel | Ad Placement | Quantity | Audience Estimate | Cost |
|---------|--------------|----------|-------------------|------|
| website | Leaderboard | 25× | 1,500,000 impressions/month | $0.20 |
| website | Half Page | 25× | 1,500,000 impressions/month | $0.20 |
| newsletter | Newsletter Leaderboard | 4× | Per send | $1,000.00 |
| newsletter | Newsletter Banner | 4× | Per send | $600.00 |
| print | Full Page | 4× | Per placement | $7,800.00 |

**After (Matches Package):**
| Channel | Ad Placement | Quantity | Audience Estimate | Cost |
|---------|--------------|----------|-------------------|------|
| website | Leaderboard | **25% share** | **375,000 impressions/month** | **$8.00** |
| website | Half Page | **25% share** | **375,000 impressions/month** | **$8.00** |
| newsletter | Newsletter Leaderboard | **4× per month** | **45,586 subscribers × 4 sends** | **$250.00** |
| newsletter | Newsletter Banner | **4× per month** | **45,586 subscribers × 4 sends** | **$150.00** |
| print | Full Page | **4× per month** | **63,000 listeners/viewers × 4 spots** * | **$1,950.00** |

*Note: Print audience detail depends on campaign having `audienceMetrics` data populated. If not available, shows fallback: "4 placements per month"

## Display Logic by Pricing Model

| Pricing Model | Quantity Format | Audience Estimate Format | Cost Display |
|--------------|-----------------|--------------------------|--------------|
| `cpm`, `cpv`, `cpc` | `X% share` | `{calculated_share} impressions/month` | Unit price (CPM rate) |
| `per_send`, `per_newsletter` | `X× per month` | `{subscribers} subscribers × X sends` or `X sends per month` | Unit price per send |
| `per_spot`, `per_ad` | `X× per month` | `{listeners/viewers} listeners/viewers × X spots` or `X placements per month` | Unit price per spot |
| `monthly`, `flat` | `X× per month` | `Monthly rate` | Flat rate |

## Data Requirements

For campaigns to show detailed audience info like packages, the following data must be populated:

### CPM/CPV/CPC Items:
- ✅ `monthlyImpressions`: Total available impressions (e.g., 1,500,000)
- ✅ `currentFrequency` or `quantity`: Percentage share (e.g., 25)
- **Calculation**: Display shows `monthlyImpressions × (currentFreq / 100)`

### Newsletter Items:
- ✅ `audienceMetrics.subscribers` or `subscribers`: Subscriber count
- ✅ `currentFrequency` or `quantity`: Number of sends per month
- **Display**: `{subscribers} subscribers × {sends} sends`

### Print/Podcast Items:
- ⚠️ `audienceMetrics.listeners` or `audienceMetrics.viewers` or `circulation`: Audience size
- ✅ `currentFrequency` or `quantity`: Number of placements per month
- **Display**: `{audience} listeners/viewers × {spots} spots`
- **Fallback**: If audience data missing, shows `{quantity} placements per month`

## Testing Checklist

### Web View (CampaignDetail.tsx):
- [x] Quantity shows "X% share" for CPM items
- [x] Quantity shows "X× per month" for other items
- [x] CPM impressions show calculated share (not full amount)
- [x] Newsletter shows subscriber count and sends
- [x] Cost shows unit price (hubPrice)

### HTML Download:
- [x] Same as web view
- [x] Consistent formatting

### Markdown Download:
- [x] Same as web view
- [x] Table format correct

## Deployment Notes

1. **Restart backend server** required to load updated insertion order generator
2. **Refresh browser** required to load updated frontend
3. **Regenerate insertion orders** for existing campaigns to see new format
4. **New campaigns** will automatically use the new format

## Known Limitations

1. **Print/Podcast Audience Data**: Existing campaigns may not have `audienceMetrics` populated for print/podcast items. These will show fallback text like "4 placements per month" instead of detailed audience info.
   - **Solution**: Regenerate campaign with updated LLM prompts that ensure this data is captured
   - **Future**: Update campaign LLM service to consistently populate `audienceMetrics` for all item types

2. **Cost Calculation**: The "Cost" column now shows unit prices. If you need to see total campaign costs per item, that information is available in the "Publication Total" and "Campaign Total" sections.

## Files Modified

### Backend:
- `server/insertionOrderGenerator.ts` - All insertion order generation (HTML & Markdown, Campaign & Package)
- `server/campaignLLMService.ts` - Added `currentFrequency` field population
- `docs/CAMPAIGN_INSERTION_ORDER_FIX.md` - Updated documentation
- `docs/CAMPAIGN_INSERTION_ORDER_FINAL_FIX.md` - This file

### Frontend:
- `src/pages/CampaignDetail.tsx` - Web view insertion order preview

## Related Documentation

- `docs/CAMPAIGN_INSERTION_ORDER_FIX.md` - Initial fix documentation
- `docs/CAMPAIGN_ASSET_URL_FIX.md` - S3 URL expiration fix
- `docs/DYNAMIC_ASSET_LOADING.md` - Dynamic asset loading for publications

