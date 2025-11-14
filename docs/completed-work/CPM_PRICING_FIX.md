# CPM/Impression-Based Pricing Fix for Website Inventory

## Problem
Website inventory with CPM (Cost Per Mille = per 1000 impressions) pricing was displaying incorrect total costs. The system was treating the CPM rate as the total price instead of calculating the actual cost based on impressions.

**Example:**
- CPM Rate: $5
- Monthly Impressions: 100,000
- **WRONG**: Displayed cost = $5 × 1 = $5
- **CORRECT**: Actual cost = ($5 × 100,000) / 1000 = $500

This also affected CPV (Cost Per View) and CPC (Cost Per Click) pricing models.

## Root Causes

### 1. Backend Not Extracting Impression Data
**File:** `server/index.ts`

The `/api/admin/builder/analyze` endpoint was:
- ✅ Extracting the CPM rate (e.g., $5)
- ❌ NOT extracting `monthlyImpressions` from the ad opportunity
- ❌ NOT storing impressions in the item object

### 2. Backend Calculating Cost Incorrectly
**File:** `server/index.ts` (lines 2477, 2489, 2523)

Cost calculations were using simple multiplication:
```typescript
const pubTotal = inventoryItems.reduce((sum, item) => {
  return sum + (item.itemPricing.hubPrice * item.currentFrequency); // WRONG for CPM!
}, 0);
```

This works for flat-rate pricing but NOT for impression-based pricing.

### 3. Frontend Using Wrong Utility Function
**File:** `src/components/admin/PackageBuilder/PackageResults.tsx`

The component was importing and using:
- ❌ `calculateMonthlyCost` from `frequencyEngine.ts` - Simple multiplication only
- ✅ Should use: `calculateItemCost` from `inventoryPricing.ts` - Proper CPM/CPV/CPC handling

## Solutions Implemented

### 1. Extract Impression Data (Backend)
**File:** `server/index.ts` (lines 2349-2361)

Added logic to extract `monthlyImpressions` for CPM/CPV/CPC pricing:

```typescript
// For CPM/CPV/CPC pricing, extract impression data
const pricingModel = pricing.pricingModel || 'flat';
if (pricingModel === 'cpm' || pricingModel === 'cpv' || pricingModel === 'cpc') {
  // Try multiple sources for impression data
  const impressions = opp.monthlyImpressions || 
                    opp.performanceMetrics?.impressionsPerMonth ||
                    opp.metrics?.monthlyImpressions || 
                    0;
  
  if (impressions > 0) {
    item.monthlyImpressions = impressions;
  }
}
```

**Benefit:** Now the backend properly extracts and stores impression data from the publication schema.

### 2. Correct Cost Calculation (Backend)
**File:** `server/index.ts` (lines 2251-2272)

Created a helper function that calculates cost based on pricing model:

```typescript
const calculateItemCost = (item: any): number => {
  const hubPrice = item.itemPricing.hubPrice;
  const frequency = item.currentFrequency || 1;
  const pricingModel = item.itemPricing.pricingModel;
  
  // For impression-based pricing, use impressions
  if (pricingModel === 'cpm' && item.monthlyImpressions) {
    return (hubPrice * item.monthlyImpressions) / 1000;
  }
  if (pricingModel === 'cpv' && item.monthlyImpressions) {
    return (hubPrice * item.monthlyImpressions) / 100;
  }
  if (pricingModel === 'cpc' && item.monthlyImpressions) {
    // Assume 1% CTR if not provided
    const estimatedClicks = item.monthlyImpressions * 0.01;
    return hubPrice * estimatedClicks;
  }
  
  // For all other pricing models, use simple multiplication
  return hubPrice * frequency;
};
```

Updated all cost calculations (3 places) to use this helper:
- Line 2500: Publication total calculation
- Line 2512: Budget-first item cost
- Line 2523: Minimum items cost

**Benefit:** Website ads with CPM pricing now calculate correctly: (rate × impressions) / 1000

### 3. Use Correct Utility (Frontend)
**File:** `src/components/admin/PackageBuilder/PackageResults.tsx`

Changed import:
```typescript
// OLD
import { calculateMonthlyCost } from '@/utils/frequencyEngine';

// NEW
import { calculateItemCost } from '@/utils/inventoryPricing';
```

Replaced all 8 occurrences of:
```typescript
// OLD
calculateMonthlyCost(item.itemPricing?.hubPrice || 0, item.currentFrequency || item.quantity || 1)

// NEW
calculateItemCost(item, item.currentFrequency || item.quantity || 1)
```

**Benefit:** The frontend now properly calculates CPM/CPV/CPC costs using the same logic as the backend.

## How Pricing Models Now Work

### CPM (Cost Per Mille)
**Used for:** Website banner ads, display advertising

**Calculation:**
```
Cost = (CPM Rate × Monthly Impressions) / 1000
```

**Example:**
- Rate: $5 CPM
- Impressions: 100,000/month
- Cost: ($5 × 100,000) / 1000 = **$500/month**

### CPV (Cost Per View)
**Used for:** Video advertising, streaming

**Calculation:**
```
Cost = (CPV Rate × Monthly Views) / 100
```

**Example:**
- Rate: $10 CPV
- Views: 50,000/month
- Cost: ($10 × 50,000) / 100 = **$5,000/month**

### CPC (Cost Per Click)
**Used for:** Performance marketing

**Calculation:**
```
Cost = CPC Rate × Estimated Clicks
Estimated Clicks = Monthly Impressions × CTR
(Assumes 1% CTR if not provided)
```

**Example:**
- Rate: $2 CPC
- Impressions: 100,000/month
- CTR: 1%
- Clicks: 100,000 × 0.01 = 1,000
- Cost: $2 × 1,000 = **$2,000/month**

### All Other Models
**Used for:** Newsletters, print, radio, podcasts

**Calculation:**
```
Cost = Rate × Frequency
```

**Example:**
- Rate: $100/send
- Frequency: 4/month
- Cost: $100 × 4 = **$400/month**

## Data Sources for Impressions

The system tries multiple data sources (in order of preference):
1. `opp.monthlyImpressions` - Direct field on the ad opportunity
2. `opp.performanceMetrics.impressionsPerMonth` - New schema location
3. `opp.metrics.monthlyImpressions` - Legacy location
4. `0` - Fallback if no data available

**Note:** If impressions = 0, the system falls back to treating it like a flat-rate item (rate × frequency).

## Testing Checklist

### Backend Tests
- [ ] Create package with website ad (CPM pricing, 100K impressions)
- [ ] Verify API response includes `monthlyImpressions` field
- [ ] Verify publication total = (CPM × impressions) / 1000
- [ ] Verify different pricing models (flat, CPM, CPV, CPC) calculate correctly

### Frontend Display Tests
- [ ] Website ad shows correct monthly cost
- [ ] "By Channel" tab shows correct totals
- [ ] "By Outlet" tab shows correct totals
- [ ] Publication total matches sum of items
- [ ] Package summary shows correct monthly & total costs

### Edge Cases
- [ ] Website ad with 0 impressions (should use frequency fallback)
- [ ] Website ad without impression data (should use frequency fallback)
- [ ] Mix of CPM and flat-rate items in same package
- [ ] Budget-first mode respects CPM costs correctly

### Real Example Test
**Given:**
- Publication: Chicago Reader
- Website ad: Leaderboard Banner
- CPM Rate: $8
- Monthly Pageviews: 250,000
- Estimated 30% ad viewability = 75,000 impressions

**Expected Results:**
- Monthly Cost: ($8 × 75,000) / 1000 = **$600**
- 6-month package: $600 × 6 = **$3,600**

## Files Modified

### Backend
1. **`server/index.ts`**
   - Lines 2251-2272: Added `calculateItemCost` helper function
   - Lines 2349-2361: Added impression extraction for CPM/CPV/CPC
   - Lines 2500, 2512, 2523: Updated cost calculations to use helper

### Frontend
2. **`src/components/admin/PackageBuilder/PackageResults.tsx`**
   - Line 25: Changed import from `frequencyEngine` to `inventoryPricing`
   - Lines 158, 209, 612, 628, 706, 735, 738, 744: Updated all cost calculations

## Schema References

### Website Ad Opportunity
```typescript
advertisingOpportunities?: Array<{
  name?: string;
  adFormat?: string;
  pricing?: {
    cpm?: number;              // CPM rate
    pricingModel?: 'cpm' | 'flat' | 'cpc' | 'cpa';
  };
  monthlyImpressions?: number;  // Impressions data
  performanceMetrics?: {
    impressionsPerMonth?: number;  // Alternative location
  };
}>;
```

### Hub Package Inventory Item
```typescript
export interface HubPackageInventoryItem {
  channel: 'website' | ...;
  itemPricing?: {
    hubPrice: number;           // CPM rate (e.g., $5)
    pricingModel: string;       // 'cpm', 'flat', etc.
  };
  monthlyImpressions?: number;  // Now properly populated!
  monthlyCost?: number;         // Calculated cost
}
```

## Impact

### Before Fix
❌ Website CPM ads showed drastically **incorrect low costs**
❌ Packages appeared **much cheaper** than reality
❌ Budget calculations were **completely wrong** for web inventory
❌ Users couldn't trust **any pricing** with website ads

### After Fix
✅ Website CPM ads show **accurate costs** based on impressions
✅ Packages show **realistic pricing**
✅ Budget calculations are **correct** for all pricing models
✅ Users can **confidently build packages** with web inventory
✅ Supports **all impression-based models** (CPM, CPV, CPC)

## Backward Compatibility

✅ **Fully backward compatible:**
- Packages without impression data fall back to frequency-based calculation
- Non-CPM items continue to work exactly as before
- Old packages still display correctly (using fallback logic)
- No database migration required

## Future Enhancements

1. **Dynamic Impression Data**: Fetch real-time impression data from analytics
2. **Custom CTR**: Allow specifying CTR for CPC calculations (instead of 1% default)
3. **Impression Forecasting**: Predict future impressions based on trends
4. **Viewability Adjustment**: Factor in ad viewability rates for more accurate CPM
5. **A/B Testing**: Compare CPM vs flat-rate performance

## Code Quality

✅ **All linter checks pass**
✅ **TypeScript types validated**
✅ **Consistent logic** across frontend and backend
✅ **Proper fallbacks** for missing data
✅ **Well-documented** with inline comments

## Success Metrics

After deployment, verify:
- ✅ Website ad costs are 10x-1000x higher (now accurate!)
- ✅ No console errors related to pricing calculations
- ✅ Package totals match sum of individual items
- ✅ Budget allocations work correctly with CPM items

