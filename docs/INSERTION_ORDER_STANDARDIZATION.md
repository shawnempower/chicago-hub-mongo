# Insertion Order & Package Builder Standardization

**Date:** November 20, 2025  
**Issue:** Quantity and audience calculations were inconsistent and incomplete across the package builder and insertion order generation

---

## Problem Statement

The insertion order and package builder screens had:
- ❌ Inconsistent quantity display (sometimes just "1×", sometimes descriptive)
- ❌ Missing or incomplete audience information
- ❌ No standardization - each component had its own formatting logic
- ❌ Difficulty understanding reach/impressions for different pricing models

---

## Solution: Standardized Formatting Utilities

### Created: `src/utils/insertionOrderFormatting.ts`

Three reusable functions for consistent display:

#### 1. `formatInsertionOrderQuantity(item)`
Formats quantity display based on pricing model and frequency:
- **Monthly:** "Monthly"
- **Per week:** "4 weeks/month"
- **Per spot:** "12× per month"
- **CPM:** "50% share"

#### 2. `formatInsertionOrderAudience(item, performanceMetrics)`
Formats audience information with actual metrics:
- **CPM:** "150,000 impressions/month"
- **Per send:** "25,000 subscribers × 4 sends"
- **Per spot:** "50,000 listeners × 12 spots"
- **Monthly web:** "100,000 monthly visitors"

Pulls from multiple data sources:
- `item.monthlyImpressions`
- `performanceMetrics.impressionsPerMonth`
- `performanceMetrics.audienceSize`
- `performanceMetrics.occurrencesPerMonth`

#### 3. `formatInsertionOrderAudienceWithBadge(item, performanceMetrics)`
Same as above but adds "✓ Guaranteed" badge if metrics are guaranteed.

---

## Files Updated

### 1. ✅ `src/utils/insertionOrderFormatting.ts` (NEW)
Created standardized formatting functions with full documentation.

### 2. ✅ `src/components/admin/PackageBuilder/PackageResults.tsx`
**Insertion Order Generation**
- Replaced inline quantity/audience logic with standardized functions
- Now shows descriptive quantity ("4 weeks/month" vs "4×")
- Shows actual audience metrics instead of "N/A"

### 3. ✅ `src/components/admin/PackageBuilder/LineItemsTable.tsx`
**Package Builder Table View**
- Added import for `formatInsertionOrderAudience`
- Added new "Audience" column between Frequency and Monthly Cost
- Updated colSpan from 5 to 6
- Displays audience info for all line items

### 4. ✅ `src/components/admin/PackageBuilder/LineItemEditor.tsx`
**Package Builder Compact View**
- Added import for `formatInsertionOrderAudience`
- Added audience info to compact mode (line 291-299)
- Added audience info to expanded card mode (line 345-347)
- Format: "$X / unit • [audience info]"

### 5. ✅ `src/components/admin/PackageBuilder/LineItemsDetail.tsx`
**Package Builder Detail View**
- Added import for `formatInsertionOrderAudience`
- Added audience info next to unit price (line 246)
- Format: "$X / unit • [audience info]"

---

## Examples of Improved Display

### Before
```
Quantity: 4×
Audience: N/A
```

### After - Website Monthly Ad
```
Quantity: Monthly
Audience: 75,000 monthly visitors
```

### After - Newsletter Per Send
```
Quantity: 4× per month
Audience: 15,000 subscribers × 4 sends
```

### After - Radio Per Spot
```
Quantity: 12× per month
Audience: 50,000 listeners × 12 spots
```

### After - CPM Pricing
```
Quantity: 50% share
Audience: 37,500 impressions/month
```

---

## Data Sources

The functions intelligently pull from multiple sources in priority order:

### For Impressions/Views
1. `item.monthlyImpressions` (LLM-calculated)
2. `performanceMetrics.impressionsPerMonth` (publication data)

### For Audience Size
1. `performanceMetrics.audienceSize` (subscribers, circulation, followers)
2. Falls back to channel-specific labels

### For Occurrences
1. `performanceMetrics.occurrencesPerMonth` (how often item runs)

---

## Benefits

### ✅ Consistency
- Same logic used everywhere (DRY principle)
- One place to update if formatting needs change
- Reduces bugs from duplicate code

### ✅ Completeness
- Audience information now shown in package builder
- Better understanding of reach before generating order
- Helps with media planning decisions

### ✅ Accuracy
- Quantity labels are descriptive ("Monthly" vs "1×")
- Audience pulls from actual publication data
- Supports all pricing models (monthly, per_week, cpm, per_spot, etc.)

### ✅ Maintainability
- Well-documented utility functions
- Type-safe with TypeScript interfaces
- Easy to extend for new pricing models

---

## Future Enhancements

### Possible Additions
1. **Guaranteed Badge Styling:** Add CSS classes for guaranteed metrics badge
2. **Audience Ranges:** Support min/max ranges instead of single numbers
3. **Historical Data:** Show trend lines (↑↓) for growing/declining metrics
4. **Interactive Tooltips:** Click for detailed audience demographics
5. **Export to CSV:** Include audience metrics in package exports

### Data Quality Improvements
1. **Add performanceMetrics to all publications:** Currently some may be missing this data
2. **Validation:** Add checks to ensure metrics are reasonable
3. **Updates:** Keep metrics current with quarterly updates

---

## Testing Recommendations

### Manual Testing
1. **Package Builder:**
   - Create package with various pricing models
   - Verify quantity displays correctly for each type
   - Verify audience info shows (or gracefully handles missing data)

2. **Insertion Order:**
   - Generate order for package
   - Verify quantity column is descriptive
   - Verify audience column shows actual metrics

3. **Edge Cases:**
   - Items with no performance metrics (should show fallback text)
   - Guaranteed metrics (should show badge)
   - Different pricing models (monthly, per_week, cpm, per_spot, etc.)

### Automated Testing (Future)
Create unit tests for:
- `formatInsertionOrderQuantity()` with all pricing models
- `formatInsertionOrderAudience()` with various data sources
- Missing/null data handling

---

## Related Work

This builds on previous standardization efforts:
- **Pricing Model Migration** (docs/FLAT_TO_MONTHLY_MIGRATION_SUMMARY.md)
- **Frequency Labels** (src/utils/frequencyLabels.ts)
- **Inventory Pricing** (src/utils/inventoryPricing.ts)

---

**Status:** ✅ **COMPLETE** - All components updated and using standardized formatting functions

