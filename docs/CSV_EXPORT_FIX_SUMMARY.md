# CSV Export Fix for 1x Frequency Pricing

## Issue
The CSV export for Hub Central wasn't properly handling 1x frequency pricing when calculating monthly revenue estimates. The export was using whichever pricing tier it encountered first, rather than consistently using the 1x (lowest frequency) tier to calculate per-insertion costs.

## Root Cause
The `hubInventoryExport.ts` utility was:
1. Not parsing pricing tiers when they were stored as arrays
2. Not selecting the appropriate tier (1x) for per-insertion cost calculations
3. Not properly multiplying per-insertion costs by publication frequency to get monthly revenue

## Solution
Updated `/src/utils/hubInventoryExport.ts` with the following improvements:

### 1. Added Tier Selection Logic
```typescript
function parseCommitmentMultiplier(frequency?: string): number
function getLowestTierPricing(pricing: any): any
```
- Parses commitment frequencies (e.g., "1x", "4x", "12x")
- Finds and returns the 1x tier or lowest frequency tier from pricing arrays
- Handles both single pricing objects and multi-tier arrays

### 2. Updated Revenue Calculation
```typescript
function calculateMonthlyRevenue(channel, pricing, metrics, frequency)
```
- Now accepts pricing as either a single object or array of tiers
- Uses `getLowestTierPricing()` to extract the 1x tier for calculations
- Properly multiplies per-insertion cost by publication frequency
- Added support for `per_ad` pricing model
- Improved handling of `flat` and `monthly` pricing models with frequency

### 3. Added Display Value Helper
```typescript
function getHubPricingDisplayValues(hubPricing)
```
- Extracts the lowest tier pricing values for CSV display
- Ensures consistent display of pricing model and flat rate
- Handles both single and multi-tier pricing structures

### 4. Cleaned Up CSV Columns
Removed the following redundant/unnecessary columns from the CSV export:
- ❌ `Hub CPM` - Redundant with `Hub Rate` (renamed from `Hub Flat Rate`)
- ❌ `Hub Per Send` - Redundant with `Hub Rate`
- ❌ `Hub Monthly` - Redundant with `Hub Rate`
- ❌ `Est. Monthly Revenue (Hub)` - Removed per user request (calculation can be done externally)

**Renamed:**
- `Hub Flat Rate` → **`Hub Rate`** - Clearer, shorter name

**Why cleaned:** The `Hub Rate` column now universally shows the 1x tier price for any pricing model. The `Hub Pricing Model` column indicates which model is being used (cpm, per_send, monthly, per_ad, flat, etc.). Users can calculate monthly revenue externally using: `Hub Rate × frequency multiplier`.

### 5. Updated All Channel Exports
Updated export logic for all channel types:
- Website ads
- Newsletter ads
- Print ads
- Event sponsorships
- Social media ads
- Podcast ads
- Streaming video ads
- Radio ads

Each now properly:
1. Passes full pricing object (not individual fields)
2. Uses display helper for CSV field values
3. Calculates revenue using 1x tier pricing

## Pricing Calculation Logic

### For Tiered Pricing (Print, Events)
```
1. Find the 1x tier (or lowest frequency tier)
2. Extract per-insertion cost from that tier
3. Multiply by publication frequency to get monthly revenue

Example:
- Event pricing: 1x = $10,000, 4x = $35,000
- Event frequency: Annual (0.083 times/month)
- Monthly revenue = $10,000 × 0.083 = $833/month
```

### For Occurrence-Based Pricing (Newsletters, Podcasts)
```
1. Get per-occurrence price (1x tier if applicable)
2. Multiply by occurrences per month

Example:
- Newsletter: $500 per send
- Frequency: Weekly (4.33 sends/month)
- Monthly revenue = $500 × 4.33 = $2,165/month
```

### For Time-Based Pricing (Monthly, Weekly)
```
1. For flat monthly rates: use as-is
2. For rates with publication frequency: multiply by frequency

Example:
- Monthly sponsorship: $2,000/month flat
- Monthly revenue = $2,000
```

## Benefits
1. **Consistency**: All pricing now uses the same logic as the main pricing calculations in `pricingCalculations.ts`
2. **Accuracy**: Monthly revenue estimates properly reflect per-insertion costs multiplied by frequency
3. **Conservative Estimates**: Using 1x tier provides conservative (highest per-insertion) revenue estimates
4. **Transparency**: CSV exports show the actual pricing tier being used for calculations

## Testing Recommendations
1. Export inventory for a hub with multi-tier pricing (especially events and print)
2. Verify monthly revenue calculations match expected values
3. Check that 1x pricing is being used (not higher frequency tiers)
4. Confirm publication frequency is properly factoring into calculations

## Related Files
- `/src/utils/hubInventoryExport.ts` - Main fix location
- `/src/utils/pricingCalculations.ts` - Reference implementation
- `/server/index.ts` (lines 2610-2694) - Similar logic for dashboard stats

