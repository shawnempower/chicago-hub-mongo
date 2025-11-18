# Pricing Array Data Structure Fix

## Issue Summary

**Problem**: Chicago Public Square's "Homepage Display Ad" showed a price of $2000 under the Chicago Hub pricing, but the pricing model was not displayed in the UI.

**Root Cause**: The data structure in the database used an array of pricing tiers within a single hub pricing entry, but the UI code only expected a single pricing object.

## Data Structure

### The Database Structure (Correct)
The database correctly stores multiple pricing tiers grouped under a single hub:

```json
{
  "hubPricing": [
    {
      "hubId": "chicago-hub",
      "hubName": "Chicago Hub",
      "pricing": [                    // Array of pricing tiers
        {
          "flatRate": 500,
          "pricingModel": "per_week"
        },
        {
          "flatRate": 2000,
          "pricingModel": "flat"     // This tier wasn't showing the model
        }
      ],
      "available": true
    }
  ]
}
```

This structure makes sense because:
- Multiple pricing options can be offered for the same hub
- Pricing tiers stay grouped by hub
- Example: "Chicago Hub offers $500/week OR $2000/month"

### The Problem
The UI code in `HubPricingReport.tsx` (and other places) was accessing hub pricing like this:

```typescript
ad.hubPricing?.forEach((hub: any) => {
  const hubRevenue = calculateRevenue({ ...ad, pricing: hub.pricing }, 'month');
  pricing.push({
    pricingModel: hub.pricing?.pricingModel,  // ❌ Undefined when pricing is an array
    hubPrice: hubRevenue
  });
});
```

When `hub.pricing` is an array, `hub.pricing.pricingModel` returns `undefined`.

## The Fix

### Updated Approach
Modified all instances to handle both single pricing objects AND arrays of pricing tiers:

```typescript
ad.hubPricing?.forEach((hub: any) => {
  // Handle both single pricing object and array of pricing tiers
  const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
  
  pricingArray.forEach((pricingTier: any) => {
    const hubRevenue = calculateRevenue({ ...ad, pricing: pricingTier }, 'month');
    
    if (hubRevenue > 0) {
      pricing.push({
        label: hub.hubName || hub.hubId,
        hubPrice: hubRevenue,
        pricingModel: pricingTier?.pricingModel,  // ✅ Now correctly extracts from each tier
        discount: hub.discount,
        available: hub.available,
        minimumCommitment: hub.minimumCommitment,
      });
    }
  });
});
```

### Files Modified

1. **`src/components/dashboard/HubPricingReport.tsx`**
   - Fixed 8 instances across all channel types:
     - Website ads
     - Newsletter ads
     - Print ads
     - Social media ads
     - Event sponsorships
     - Podcast ads
     - Radio ads (both show-based and legacy)
     - Streaming video ads

### Files Already Handling This Correctly

1. **`server/campaignLLMService.ts`** (lines 207-209)
   - Already had proper array handling for hub pricing
   
2. **`src/components/dashboard/HubPricingEditor.tsx`**
   - Already designed to handle both single objects and arrays (lines 110-116)

## Result

Now the UI correctly displays:
- **Chicago Hub (Entry 1)**: $500/week
- **Chicago Hub (Entry 2)**: $2000/month

Both pricing tiers are shown with their respective pricing models visible.

## Testing

To verify the fix:
1. Navigate to Chicago Public Square in the Hub
2. View the Hub Pricing Report
3. Check the "Homepage Display Ad" under Website inventory
4. Confirm both pricing tiers display with pricing models

## Technical Notes

- This is a **UI fix**, not a data structure issue
- The data structure supports flexible pricing tiers per hub
- The fix is backward compatible with single pricing objects
- All channel types now consistently handle pricing arrays

## Additional Fix: Missing "flat" Pricing Model

### Issue
After fixing the array handling, users reported the $2000 pricing tier still wasn't showing a pricing model in the edit modal dropdown.

### Root Cause
The database had `pricingModel: "flat"` for the $2000 tier, but the website ad modal's pricing model dropdown was missing "flat" as an option. Available options were:
- flat_rate
- monthly
- per_week
- per_day
- cpm
- cpc
- contact

### Fix
Added "flat" to the website ad pricing models in `DashboardInventoryManager.tsx`:

```typescript
pricingModels={[
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'flat', label: '/month' },              // ✅ Added
  { value: 'monthly', label: '/month (recurring)' },
  { value: 'per_week', label: '/week' },
  { value: 'per_day', label: '/day' },
  { value: 'cpm', label: '/1000 impressions' },
  { value: 'cpc', label: '/click' },
  { value: 'contact', label: 'Contact for pricing' }
]}
```

Note: `EditableInventoryManager.tsx` already had "flat" as an option.

## Date
November 18, 2025

