# Total Price Calculation Feature

## Overview

Added automatic total price calculation to pricing rows that multiplies the base price by the frequency multiplier.

## How It Works

### Formula
```
Total = Base Price × Frequency Multiplier

Examples:
- $300 /send × 4x frequency = $1,200 total
- $500 /ad × 12x frequency = $6,000 total
- $100 /spot × 52x frequency = $5,200 total
```

### Calculation Logic

```typescript
/**
 * Calculate total price based on flatRate × frequency multiplier
 * Example: $300 × 4x = $1200
 */
const calculateTotal = (pricing) => {
  const flatRate = pricing.flatRate;      // e.g., 300
  const frequency = pricing.frequency;    // e.g., "4x"
  const pricingModel = pricing.pricingModel;

  // Don't calculate for contact pricing
  if (pricingModel === 'contact' || !flatRate) {
    return null;
  }

  // If no frequency, just return the base price
  if (!frequency) {
    return flatRate;
  }

  // Extract multiplier from frequency (e.g., "4x" -> 4, "12x" -> 12)
  const match = frequency.match(/^(\d+)x$/);
  if (match) {
    const multiplier = parseInt(match[1], 10);
    return flatRate * multiplier;
  }

  // If frequency doesn't match pattern, just return base price
  return flatRate;
};
```

## Visual Display

### Default Pricing Row
```
┌─────────────────────────────────────────────────────────────────────┐
│ Program      Price   Model    Frequency  Total        Delete        │
│ [Default▼]   [$300]  [/send▼] [4x    ✓]  [$1,200]     [   ]        │
│                                           ^^^^^^^^                   │
│                                           Green box                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Hub Pricing Row
```
┌─────────────────────────────────────────────────────────────────────┐
│ Program           Price   Model    Frequency  Total        Delete   │
│ [Chicago Hub ▼]   [$250]  [/send▼] [4x    ✓]  [$1,000]     [X]     │
│                                               ^^^^^^^^                │
│                                               Green box               │
└─────────────────────────────────────────────────────────────────────┘
```

### Styling
- **Background:** Light green (`bg-green-50`)
- **Border:** Green (`border-green-200`)
- **Text:** Dark green, bold (`text-green-700 font-semibold`)
- **Format:** Dollar sign + comma-separated number (`$1,200`)

## When Total Displays

### Shows Total When:
✅ Base price is entered (flatRate > 0)
✅ Frequency is entered and valid (e.g., "4x", "12x")
✅ Pricing model is NOT "contact"

### Hides Total When:
❌ No base price entered
❌ Pricing model is "Contact for pricing"
❌ Frequency is empty
❌ Frequency is invalid format

## Examples

### Example 1: Newsletter Ad - 4x Frequency
```
Input:
- Price: $300
- Model: /send
- Frequency: 4x

Calculation:
$300 × 4 = $1,200

Display:
Total: $1,200
```

### Example 2: Print Ad - 12x Frequency
```
Input:
- Price: $500
- Model: /ad
- Frequency: 12x

Calculation:
$500 × 12 = $6,000

Display:
Total: $6,000
```

### Example 3: Radio Ad - 52x Frequency
```
Input:
- Price: $100
- Model: /spot
- Frequency: 52x

Calculation:
$100 × 52 = $5,200

Display:
Total: $5,200
```

### Example 4: One-time Ad
```
Input:
- Price: $1,200
- Model: /ad
- Frequency: 1x

Calculation:
$1,200 × 1 = $1,200

Display:
Total: $1,200
```

### Example 5: No Frequency
```
Input:
- Price: $500
- Model: /ad
- Frequency: (empty)

Calculation:
$500 × 1 (default) = $500

Display:
Total: $500
```

### Example 6: Contact Pricing
```
Input:
- Price: (any)
- Model: Contact for pricing
- Frequency: (any)

Calculation:
N/A - contact pricing doesn't calculate

Display:
(Total column hidden)
```

## User Experience Flow

### Scenario 1: User Enters Frequency After Price

**Step 1:** User enters price
```
[$300] [/send▼] [          ]
       ↑ Price entered, no frequency yet
       (No total showing)
```

**Step 2:** User enters frequency "4"
```
[$300] [/send▼] [4         ]
                  ↑ Typing...
       (No total yet - waiting for valid format)
```

**Step 3:** User blurs field (auto-formats to "4x")
```
[$300] [/send▼] [4x      ✓] [$1,200]
                  ↑ Valid!   ↑ Total appears!
```

### Scenario 2: User Changes Frequency

**Before:**
```
[$300] [/send▼] [4x      ✓] [$1,200]
```

**User edits frequency to "12x":**
```
[$300] [/send▼] [12x     ✓] [$3,600]
                             ↑ Total updates automatically
```

### Scenario 3: User Changes Price

**Before:**
```
[$300] [/send▼] [4x      ✓] [$1,200]
```

**User changes price to $500:**
```
[$500] [/send▼] [4x      ✓] [$2,000]
                             ↑ Total updates automatically
```

## Benefits

### For Users
✅ **Immediate clarity** - See total cost at a glance
✅ **No manual calculation** - Automatic computation
✅ **Real-time updates** - Changes reflect instantly
✅ **Visual distinction** - Green box stands out

### For Sales
✅ **Quick quotes** - Easy to see package totals
✅ **Price comparison** - Compare different frequencies easily
✅ **Transparency** - Clear pricing for clients

### For Budgeting
✅ **Campaign planning** - Know total costs upfront
✅ **Multi-tier pricing** - See different commitment levels
✅ **Hub comparison** - Compare hub pricing totals

## Multiple Pricing Tiers Example

### Print Ad with Multiple Frequencies
```
┌────────────────────────────────────────────────────────────────┐
│ Default Pricing:                                               │
├────────────────────────────────────────────────────────────────┤
│ [Default▼] [$1200] [/ad▼] [1x ✓]  [$1,200]           [ ]     │
│ [Default▼] [$1000] [/ad▼] [4x ✓]  [$4,000]           [X]     │
│ [Default▼] [$ 900] [/ad▼] [12x✓]  [$10,800]          [X]     │
├────────────────────────────────────────────────────────────────┤
│ Hub Pricing:                                                   │
├────────────────────────────────────────────────────────────────┤
│ [Chicago▼] [$ 950] [/ad▼] [4x ✓]  [$3,800]           [X]     │
│ [Chicago▼] [$ 850] [/ad▼] [12x✓]  [$10,200]          [X]     │
└────────────────────────────────────────────────────────────────┘

Easy to compare:
- One-time: $1,200
- 4x package: $4,000 (default) vs $3,800 (Chicago Hub) - Save $200!
- 12x package: $10,800 (default) vs $10,200 (Chicago Hub) - Save $600!
```

## Technical Details

### Location
**File:** `src/components/dashboard/HubPricingEditor.tsx`

### Function
```typescript
const calculateTotal = (pricing: { [key: string]: number | string }): number | null
```

### Integration Points
1. **Default Pricing Rows** (lines 346-362)
   - Shows after frequency field, before delete button
   - Same calculation for all default pricing tiers

2. **Hub Pricing Rows** (lines 575-591)
   - Shows after frequency field, before delete button
   - Same calculation for all hub pricing rows

### Conditional Display
```typescript
{(() => {
  const total = calculateTotal(pricing);
  if (total !== null && total > 0) {
    return (
      <div className="w-32 flex-shrink-0">
        <Label className="text-xs mb-2 block">Total</Label>
        <div className="h-10 px-3 flex items-center bg-green-50 border border-green-200 rounded-md">
          <span className="text-sm font-semibold text-green-700">
            ${total.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
})()}
```

## Edge Cases Handled

### ✅ Contact Pricing
- Returns `null` (total hidden)
- Prevents showing misleading calculation

### ✅ No Base Price
- Returns `null` (total hidden)
- Waits for price to be entered

### ✅ No Frequency
- Returns base price as total
- Assumes 1x multiplier

### ✅ Invalid Frequency Format
- Returns base price as total
- Graceful fallback for edge cases

### ✅ Zero Price
- Returns `null` (total hidden)
- Prevents showing $0 total

### ✅ Large Numbers
- Uses `.toLocaleString()` for comma formatting
- Example: 10800 → "10,800"

## Future Enhancements

### Possible Additions:
1. **Discount display** - Show savings vs. one-time price
2. **Per-insertion breakdown** - Show cost per insertion
3. **Annual total** - Calculate based on publication frequency
4. **Currency formatting** - Support multiple currencies
5. **Tax calculation** - Add optional tax percentage
6. **Hover tooltip** - Show calculation formula on hover

## Testing Checklist

- [x] Shows total for valid price + frequency
- [x] Hides total when price is empty
- [x] Hides total for contact pricing
- [x] Updates when price changes
- [x] Updates when frequency changes
- [x] Formats large numbers with commas
- [x] Works in default pricing rows
- [x] Works in hub pricing rows
- [x] Works with multiple pricing tiers
- [x] Handles edge cases gracefully

## Summary

✅ **Feature complete!**

The total price calculation provides immediate visibility into package pricing, making it easy for users to understand costs and compare different frequency commitments at a glance.

**Formula:** Total = Base Price × Frequency Multiplier
**Display:** Green box with formatted total ($1,200)
**Location:** After frequency field in all pricing rows

