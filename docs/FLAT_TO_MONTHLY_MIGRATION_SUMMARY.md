# Flat to Monthly Pricing Model Migration - Summary

**Date:** November 20, 2025  
**Issue:** Website inventory displaying "flat rate" instead of "/month" causing customer confusion

---

## Problem Statement

Evanston Now and other publications had website inventory showing:
- ❌ Display: "flat rate" 
- ❌ Database: `pricingModel: "flat"`
- ❌ Package Builder: "One-time"
- ❌ Dropdown: Saving "flat" when selecting "/month"

This was confusing because website ads are **ongoing monthly recurring placements**, not one-time purchases.

---

## Root Causes

### 1. Database Data Issue
107 website ad records across 22 publications had incorrect `pricingModel: "flat"` instead of `pricingModel: "monthly"`

### 2. UI Dropdown Bug
`EditableInventoryManager.tsx` line 1271:
```typescript
<SelectItem value="flat">/month</SelectItem>  // ❌ Wrong!
```
When users selected "/month", it saved `pricingModel: "flat"` instead of `"monthly"`

### 3. Package Builder Display Bug
`frequencyLabels.ts` treated "monthly" same as "flat", displaying "One-time" for recurring monthly ads:
```typescript
if (model === 'flat' || model === 'monthly') {
  return frequency === 1 ? 'One-time' : `${frequency}x`;  // ❌ Wrong for monthly!
}
```

---

## Solution Implemented

### 1. ✅ Database Migration
**Script:** `scripts/migrateFlatToMonthly.ts`

**Results:**
- Publications Scanned: 32
- Publications Updated: 22
- Total Records Changed: 107
  - Website (standard pricing): 47 records
  - Website (hub pricing): 60 records
- Events: 89 records kept as "flat" (correct - they use frequency)

**Affected Publications Include:**
- Evanston Now (ID: 1056) - 6 records
- Evanston RoundTable (ID: 4001) - 5 records
- N'DIGO, The TRiiBE, Windy City Media Group, and 17 others

**Commands:**
```bash
# Dry run (preview)
NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --dry-run

# Live run (apply changes)
NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --no-dry-run
```

### 2. ✅ UI Dropdown Fixes

**File 1:** `src/components/dashboard/EditableInventoryManager.tsx` (line 1271)
```typescript
// Before
<SelectItem value="flat">/month</SelectItem>

// After  
<SelectItem value="monthly">/month</SelectItem>
```

**File 2:** `src/components/dashboard/DashboardInventoryManager.tsx` (lines 5129-5138)
```typescript
// Before (confusing duplicate options)
pricingModels={[
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'flat', label: '/month' },          // ❌ Wrong value
  { value: 'monthly', label: '/month (recurring)' },
  ...
]}

// After (clean and correct)
pricingModels={[
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'monthly', label: '/month' },       // ✅ Correct
  ...
]}
```

### 3. ✅ Package Builder Frequency Label Fixes

**File:** `src/utils/frequencyLabels.ts`

**Change 1 - getFrequencyUnit()** (lines 37-40)
```typescript
// Before
case 'flat':
case 'monthly':
  return 'time';

// After
case 'monthly':
  return 'month'; // monthly recurring
case 'flat':
  return 'time'; // one-time flat rate
```

**Change 2 - formatFrequency()** (lines 67-72)
```typescript
// Before
if (pricingModel === 'flat' || pricingModel === 'monthly') {
  return 'One-time';
}

// After
if (pricingModel === 'monthly') {
  return 'Monthly recurring';
}
if (pricingModel === 'flat') {
  return 'One-time';
}
```

**Change 3 - getFrequencyLabel()** (lines 97-108)
```typescript
// Before
if (model === 'flat' || model === 'monthly') {
  return frequency === 1 ? 'One-time' : `${frequency}x`;
}

// After
// For monthly, show recurring
if (model === 'monthly') {
  return 'Monthly recurring';
}

// For flat, show one-time (used for events with frequency)
if (model === 'flat') {
  return frequency === 1 ? 'One-time' : `${frequency}x`;
}
```

**Change 4 - getFrequencyDescription()** (lines 135-140)
```typescript
// Before
case 'flat':
case 'monthly':
  return 'flat rate';

// After
case 'monthly':
  return 'monthly recurring';
case 'flat':
  return 'flat rate';
```

---

## Results

### Before
**Evanston Now - Best Visibility Package:**
- Display: "$1000 flat rate" ❌
- Package Builder: "One-time" ❌
- Database: `pricingModel: "flat"` ❌
- Dropdown: Saves "flat" when selecting "/month" ❌

### After
**Evanston Now - Best Visibility Package:**
- Display: "$1000/month" ✅
- Package Builder: "Monthly recurring" ✅
- Database: `pricingModel: "monthly"` ✅
- Dropdown: Saves "monthly" when selecting "/month" ✅

---

## Impact

### ✅ Benefits
- **Customer Clarity:** Clear that website ads are monthly recurring costs
- **Accurate Display:** Pricing shows "$X/month" consistently
- **Correct Calculations:** System calculates monthly revenue properly (no change to logic, just display)
- **No Regression:** UI fixes prevent issue from recurring

### ℹ️ No Financial Impact
Revenue calculations remain unchanged. The underlying calculation logic already handled both "flat" and "monthly" identically for items without frequency. This is purely a **display and clarity fix**.

### ✅ Events Unaffected
89 event records correctly kept `pricingModel: "flat"` because:
- Events have a frequency field (annual, monthly, quarterly)
- "flat" with frequency = flat rate per occurrence
- This is the correct model for events

---

## Verification

**Command to verify migration:**
```bash
NODE_OPTIONS="--require dotenv/config" npx tsx scripts/queryFlatRatePricing.ts
```

**Results:**
- ✅ All website "flat" pricing changed to "monthly"
- ✅ 89 "flat" records remaining (all events - correct)
- ✅ 23 "flat_rate" records remaining (different pricing model - correct)

---

## Files Modified

### Scripts
- ✅ `scripts/migrateFlatToMonthly.ts` (new)
- ✅ `scripts/queryFlatRatePricing.ts` (already existed)

### UI Components
- ✅ `src/components/dashboard/EditableInventoryManager.tsx`
- ✅ `src/components/dashboard/DashboardInventoryManager.tsx`

### Utilities
- ✅ `src/utils/frequencyLabels.ts`

### Documentation
- ✅ `docs/FLAT_TO_MONTHLY_MIGRATION_SUMMARY.md` (this file)

---

## Semantic Distinction

### "flat" vs "monthly"

**`pricingModel: "flat"`** - One-time flat rate (with frequency)
- Used for: Events with frequency (annual, quarterly, monthly)
- Display: "One-time" or "$X/occurrence"
- Example: Event sponsorship at $5000 flat per occurrence
- Frequency matters: 4 annual events = $20,000/year

**`pricingModel: "monthly"`** - Ongoing monthly recurring
- Used for: Website ads, ongoing digital placements
- Display: "Monthly recurring" or "$X/month"
- Example: Website banner at $1000/month
- Frequency locked: Always 1 (it's already monthly)

---

## Future Considerations

1. **Production Deployment:** This migration was run on staging. Will need to run on production with the same migration script.

2. **Monitoring:** After production deployment, verify that:
   - Existing packages display correctly
   - New package creation saves correct pricing models
   - Inventory editing saves correct values

3. **Related Issues:** Check if print/newsletter inventory has similar issues (less common but possible).

---

## Related Documentation

- `docs/DATA_ISSUE_FLAT_VS_MONTHLY.md` - Original analysis of the issue
- `docs/completed-work/PRICING_ARRAY_FIX.md` - Previous pricing fix work

---

**Status:** ✅ **COMPLETE** - All changes implemented and verified on staging database.

