# Pricing Calculation Flowcharts

Visual decision trees and process flows for pricing calculations.

---

## 1. Commitment Package Total Calculation

```
START: Calculate Total
│
├─► Is pricingModel = "contact"?
│   ├─► YES → Return NULL (hide total)
│   └─► NO → Continue
│
├─► Does flatRate exist and > 0?
│   ├─► NO → Return NULL (hide total)
│   └─► YES → Continue
│
├─► Does frequency exist?
│   ├─► NO → Return flatRate (treat as 1x)
│   └─► YES → Continue
│
├─► Parse frequency
│   │
│   ├─► Match "(\d+)x" pattern?
│   │   ├─► "4x" → multiplier = 4
│   │   ├─► "12x" → multiplier = 12
│   │   ├─► "52x" → multiplier = 52
│   │   └─► NO MATCH → multiplier = 1
│   │
│   └─► Calculate: flatRate × multiplier
│
└─► Return TOTAL
    Display in green box: "$1,200"
```

### Example Paths

**Path A: Newsletter with 4x commitment**
```
Input: { flatRate: 300, pricingModel: "per_send", frequency: "4x" }

contact? NO
flatRate exists? YES (300)
frequency exists? YES ("4x")
parse "4x" → 4
300 × 4 = 1200
Result: $1,200 ✓
```

**Path B: Contact pricing**
```
Input: { flatRate: 500, pricingModel: "contact", frequency: "4x" }

contact? YES
Result: NULL (hidden) ✓
```

**Path C: No frequency**
```
Input: { flatRate: 500, pricingModel: "flat", frequency: "" }

contact? NO
flatRate exists? YES (500)
frequency exists? NO
Result: 500 (1x default) ✓
```

---

## 2. Revenue Forecasting Flow

```
START: Calculate Revenue
│
├─► Get Pricing Tier
│   │
│   ├─► Is pricing an array?
│   │   ├─► YES → Find 1x tier (or lowest)
│   │   └─► NO → Use single pricing
│   │
│   └─► Selected Tier → Continue
│
├─► Normalize to Daily Metrics
│   │
│   ├─► Calculate dailyOccurrences
│   │   ├─► Has performanceMetrics.occurrencesPerMonth?
│   │   │   └─► YES → occurrences / 30
│   │   ├─► Has channelFrequency?
│   │   │   └─► YES → FREQUENCY_TO_MONTHLY[freq] / 30
│   │   └─► ELSE → 0
│   │
│   ├─► Calculate dailyImpressions
│   │   ├─► Has performanceMetrics.impressionsPerMonth?
│   │   │   └─► YES → impressions / 30
│   │   ├─► Has monthlyImpressions (legacy)?
│   │   │   └─► YES → impressions / 30
│   │   └─► ELSE → 0
│   │
│   └─► Calculate dailyFlatRate
│       ├─► Model: "monthly" or "flat" → flatRate / 30
│       ├─► Model: "per_week" → (flatRate × 52) / 365
│       ├─► Model: "per_day" → flatRate
│       └─► ELSE (occurrence/impression) → 0
│
├─► Get Days from Timeframe
│   ├─► "day" → 1
│   ├─► "week" → 7
│   ├─► "month" → 30
│   ├─► "quarter" → 91.25
│   ├─► "year" → 365
│   └─► custom → N
│
├─► Calculate by Pricing Model
│   │
│   ├─► OCCURRENCE-BASED
│   │   (per_send, per_ad, per_spot, per_post, etc.)
│   │   │
│   │   └─► totalOccurrences = dailyOccurrences × days
│   │       Revenue = flatRate × totalOccurrences
│   │
│   ├─► IMPRESSION-BASED (CPM)
│   │   (cpm, cpd, cpv)
│   │   │
│   │   └─► totalImpressions = dailyImpressions × days
│   │       Revenue = (flatRate × totalImpressions) / 1000
│   │
│   ├─► IMPRESSION-BASED (CPC)
│   │   (cpc)
│   │   │
│   │   └─► totalClicks = dailyImpressions × days × 0.01
│   │       Revenue = flatRate × totalClicks
│   │
│   ├─► TIME-BASED
│   │   (monthly, flat, per_week, per_day)
│   │   │
│   │   └─► Revenue = dailyFlatRate × days
│   │
│   └─► ELSE → Revenue = 0
│
└─► Return REVENUE
```

### Example: Newsletter Revenue Calculation

```
Input:
  flatRate: 300
  pricingModel: "per_send"
  performanceMetrics.occurrencesPerMonth: 4.33
  timeframe: "month" (30 days)

STEP 1: Get Pricing
  → Single pricing object (not array)
  → Use as-is

STEP 2: Normalize to Daily
  → dailyOccurrences = 4.33 / 30 = 0.144
  → dailyImpressions = 0 (not needed)
  → dailyFlatRate = 0 (not time-based)

STEP 3: Get Days
  → "month" = 30 days

STEP 4: Calculate (Occurrence-Based)
  → totalOccurrences = 0.144 × 30 = 4.33
  → Revenue = 300 × 4.33 = 1,299

Result: $1,299/month ✓
```

---

## 3. Pricing Tier Selection Flow

```
START: Get Pricing for Forecasting
│
├─► Is pricing an array?
│   │
│   ├─► NO → Return single pricing object
│   │
│   └─► YES → Multiple tiers available
│       │
│       ├─► PRIORITY 1: Find 1x tier
│       │   │
│       │   └─► Search for:
│       │       ├─► frequency = "1x"
│       │       ├─► frequency = "One time"
│       │       └─► frequency = "onetime"
│       │       │
│       │       └─► FOUND? → Return this tier
│       │
│       ├─► PRIORITY 2: Find lowest multiplier
│       │   │
│       │   └─► Sort tiers by parseCommitmentMultiplier()
│       │       ├─► "1x" → 1
│       │       ├─► "4x" → 4
│       │       ├─► "12x" → 12
│       │       │
│       │       └─► Return tier with lowest multiplier
│       │
│       └─► FALLBACK: Return first tier
│
└─► Handle nested format
    ├─► Has tier.pricing? → Return tier.pricing
    └─► ELSE → Return tier
```

### Example: Multi-Tier Selection

```
Input (3 tiers):
[
  { pricing: { flatRate: 1200, frequency: "1x" } },
  { pricing: { flatRate: 1000, frequency: "4x" } },
  { pricing: { flatRate: 900, frequency: "12x" } }
]

STEP 1: Is array? YES

STEP 2: Find 1x tier
  → Search frequencies: "1x", "4x", "12x"
  → FOUND: First tier has "1x"

STEP 3: Select
  → Return: { flatRate: 1200, frequency: "1x" }

Result: Use $1,200 rate for forecasting ✓

Why? Revenue forecasts need BASE rate (1x), not discounted rates.
```

---

## 4. Hub Pricing Decision Flow

```
START: Calculate Pricing for Inventory
│
├─► Is this for a specific hub?
│   │
│   ├─► NO → Use default pricing
│   │   └─► pricing: { flatRate, pricingModel }
│   │
│   └─► YES → Check for hub pricing
│       │
│       ├─► Does hubPricing array exist?
│       │   │
│       │   ├─► NO → Use default pricing
│       │   │
│       │   └─► YES → Find hub entry
│       │       │
│       │       ├─► Search hubPricing for hubId match
│       │       │   │
│       │       │   ├─► FOUND → Check availability
│       │       │   │   │
│       │       │   │   ├─► available = true?
│       │       │   │   │   │
│       │       │   │   │   ├─► YES → Use hub pricing
│       │       │   │   │   │   └─► hubPrice.pricing
│       │       │   │   │   │
│       │       │   │   │   └─► NO → Use default pricing
│       │       │   │   │
│       │       │   │   └─► available field missing
│       │       │   │       └─► Assume true, use hub pricing
│       │       │   │
│       │       │   └─► NOT FOUND → Use default pricing
│       │       │
│       │       └─► Calculate discount (informational)
│       │           └─► ((default - hub) / default) × 100
│       │
│       └─► Return selected pricing
│
└─► Calculate revenue with selected pricing
```

### Example: Hub-Specific Pricing

```
Input:
  default pricing: { flatRate: 300, pricingModel: "per_send" }
  hubPricing: [
    {
      hubId: "chicago-hub",
      hubName: "Chicago Hub",
      pricing: { flatRate: 250, pricingModel: "per_send" },
      available: true
    }
  ]
  requesting hubId: "chicago-hub"

STEP 1: Is for specific hub? YES ("chicago-hub")

STEP 2: Does hubPricing exist? YES

STEP 3: Search for hubId "chicago-hub"
  → FOUND at index 0

STEP 4: Check available
  → available = true

STEP 5: Use hub pricing
  → { flatRate: 250, pricingModel: "per_send" }

STEP 6: Calculate discount (informational)
  → Discount = ((300 - 250) / 300) × 100 = 16.67%

Result: Use $250 rate (save $50 or 16.67%) ✓
```

---

## 5. Package Bundle Pricing Flow

```
START: Calculate Package Price
│
├─► STEP 1: Collect Selected Inventory
│   │
│   └─► For each selected publication:
│       └─► For each selected inventory item:
│           │
│           ├─► Get full ad object (with channel frequency)
│           │
│           ├─► Calculate monthly revenue
│           │   └─► Use calculateRevenue(ad, "month", frequency)
│           │
│           └─► Add to basePrice total
│
├─► STEP 2: Calculate Base Price
│   │
│   └─► basePrice = SUM(all monthly revenues)
│
├─► STEP 3: Apply Hub Discount
│   │
│   ├─► Get discount percentage (default: 25%)
│   │
│   ├─► hubDiscount = basePrice × (discountPercentage / 100)
│   │
│   └─► Round to nearest dollar
│
├─► STEP 4: Calculate Final Price
│   │
│   └─► finalPrice = basePrice - hubDiscount
│
└─► Return Package Pricing
    {
      basePrice: Number,
      hubDiscount: Number,
      finalPrice: Number,
      discountPercentage: Number
    }
```

### Example: 3-Publication Package

```
Selected Inventory:
  1. Chicago Reader Newsletter
     → calculateRevenue(..., "month") = $1,299
  
  2. Block Club Website Banner
     → calculateRevenue(..., "month") = $500
  
  3. South Side Weekly Print Ad
     → calculateRevenue(..., "month") = $1,732

STEP 1: Collect & Calculate
  → Item 1 (Newsletter): Check hub pricing
     ✓ Has hub pricing: $250/send × 4.33 = $1,083
  → Item 2 (Website): Check hub pricing
     ✗ No hub pricing: Use default $500/month
  → Item 3 (Print): Check hub pricing
     ✓ Has hub pricing: $900/ad × 4.33 = $3,897

STEP 2: Sum Package Price
  → packagePrice = $1,083 + $500 + $3,897 = $5,480

Result:
  Package Price: $5,480/month ✓
  (Uses hub pricing when available, otherwise default)
```

---

## 6. Revenue Range Calculation Flow

```
START: Calculate Revenue with Range
│
├─► Calculate Expected Revenue
│   │
│   └─► expected = calculateRevenue(ad, timeframe, frequency)
│
├─► Check Data Quality
│   │
│   ├─► Does performanceMetrics.guaranteed exist?
│   │   │
│   │   ├─► YES and = true
│   │   │   └─► variancePercent = 0.05 (±5%)
│   │   │
│   │   └─► NO or = false
│   │       └─► variancePercent = 0.15 (±15%)
│   │
│   └─► Store guaranteed flag
│
├─► Calculate Range
│   │
│   ├─► Conservative = expected × (1 - variancePercent)
│   ├─► Expected = expected
│   └─► Optimistic = expected × (1 + variancePercent)
│
└─► Return RevenueEstimate
    {
      conservative: Number,
      expected: Number,
      optimistic: Number,
      guaranteed: Boolean
    }
```

### Example A: Guaranteed Metrics

```
Input:
  expected = $1,299
  performanceMetrics.guaranteed = true

STEP 1: Calculate Expected
  → $1,299 (already calculated)

STEP 2: Check Quality
  → guaranteed = true
  → variancePercent = 0.05

STEP 3: Calculate Range
  → Conservative = $1,299 × 0.95 = $1,234
  → Expected = $1,299
  → Optimistic = $1,299 × 1.05 = $1,364

Result:
  Range: $1,234 - $1,364 (±$65)
  Guaranteed: Yes ✓
```

### Example B: Estimated Metrics

```
Input:
  expected = $450
  performanceMetrics.guaranteed = false (or missing)

STEP 1: Calculate Expected
  → $450

STEP 2: Check Quality
  → guaranteed = false
  → variancePercent = 0.15

STEP 3: Calculate Range
  → Conservative = $450 × 0.85 = $383
  → Expected = $450
  → Optimistic = $450 × 1.15 = $518

Result:
  Range: $383 - $518 (±$68)
  Guaranteed: No ✓
```

---

## 7. Frequency Normalization Flow

```
START: Get Monthly Occurrences
│
├─► Source: performanceMetrics.occurrencesPerMonth
│   │
│   ├─► EXISTS? → Use this value (most accurate)
│   │   └─► Return occurrencesPerMonth
│   │
│   └─► MISSING → Try channelFrequency
│       │
│       ├─► EXISTS? → Map to monthly occurrences
│       │   │
│       │   └─► Look up in FREQUENCY_TO_MONTHLY:
│       │       ├─► "daily" → 30
│       │       ├─► "daily-business" → 22
│       │       ├─► "weekly" → 4.33
│       │       ├─► "bi-weekly" → 2.17
│       │       ├─► "monthly" → 1
│       │       ├─► "quarterly" → 0.33
│       │       ├─► "irregular" → 2
│       │       └─► NOT FOUND → 1 (default)
│       │
│       └─► MISSING → Return 0
│           (Cannot calculate occurrence-based revenue)
│
└─► Convert to Daily
    └─► dailyOccurrences = monthlyOccurrences / 30
```

### Example Decision Tree

```
Scenario 1: Has Performance Data
  Input:
    performanceMetrics.occurrencesPerMonth = 4.33
  
  Flow:
    Check occurrencesPerMonth → EXISTS (4.33)
    Return: 4.33
  
  Result: 4.33 occurrences/month ✓


Scenario 2: Infer from Channel Frequency
  Input:
    channelFrequency = "weekly"
    (no performance metrics)
  
  Flow:
    Check occurrencesPerMonth → MISSING
    Check channelFrequency → EXISTS ("weekly")
    Look up "weekly" → 4.33
    Return: 4.33
  
  Result: 4.33 occurrences/month ✓


Scenario 3: No Data
  Input:
    (no performance metrics)
    (no channel frequency)
  
  Flow:
    Check occurrencesPerMonth → MISSING
    Check channelFrequency → MISSING
    Return: 0
  
  Result: 0 occurrences/month
          Revenue = $0 (cannot calculate) ✓
```

---

## 8. Edge Case Handling Flow

```
START: Validate Pricing Input
│
├─► CHECK 1: Is pricingModel = "contact"?
│   └─► YES → Return NULL, Display "Contact for pricing"
│
├─► CHECK 2: Is flatRate missing or undefined?
│   └─► YES → Return NULL, Display "N/A"
│
├─► CHECK 3: Is flatRate = 0?
│   └─► YES → Return NULL (free/promo listing)
│
├─► CHECK 4: Is frequency invalid format?
│   │
│   ├─► Valid: "1x", "4x", "12x", etc.
│   └─► Invalid: "4", "four", "weekly"
│       └─► Fallback: Treat as 1x
│
├─► CHECK 5: Missing occurrences (occurrence-based)?
│   │
│   ├─► Model: per_send, per_ad, per_spot, etc.
│   └─► No occurrences data?
│       └─► Revenue = $0 (cannot calculate)
│
├─► CHECK 6: Missing impressions (impression-based)?
│   │
│   ├─► Model: cpm, cpc, cpv, cpd
│   └─► No impression data?
│       └─► Revenue = $0 (cannot calculate)
│
└─► All checks passed
    └─► Proceed with calculation
```

---

## 9. Display Format Flow

```
START: Format Price for Display
│
├─► Input: Numeric amount (e.g., 1299.50)
│
├─► Round to nearest dollar
│   └─► Math.round(1299.50) → 1300
│
├─► Convert to locale string (add commas)
│   └─► (1300).toLocaleString() → "1,300"
│
├─► Prepend dollar sign
│   └─► "$" + "1,300" → "$1,300"
│
└─► Return formatted string
    Display: "$1,300"
```

### Examples

```
Input: 1299.75    → Output: "$1,300"
Input: 15887.20   → Output: "$15,887"
Input: 152349.99  → Output: "$152,350"
Input: 0          → Output: "$0"
Input: null       → Output: "N/A" or hidden
```

---

## 10. Complete Calculation Pipeline

```
USER ACTION: View inventory card or build package
│
▼
┌─────────────────────────────────────────────┐
│ STEP 1: LOAD DATA                           │
│ - Get inventory item                        │
│ - Get pricing (default or hub-specific)     │
│ - Get performance metrics                   │
│ - Get channel frequency                     │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 2: VALIDATE                            │
│ - Check for contact pricing → Stop if true  │
│ - Check for missing flatRate → Stop if true │
│ - Check for required data (occurrences, etc)│
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 3: NORMALIZE TO DAILY                  │
│ - Calculate dailyOccurrences                │
│ - Calculate dailyImpressions                │
│ - Calculate dailyFlatRate                   │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 4A: COMMITMENT TOTAL (if frequency)    │
│ - Parse frequency multiplier                │
│ - Multiply: flatRate × multiplier           │
│ - Format and display in green box           │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 4B: REVENUE FORECAST                   │
│ - Get timeframe days                        │
│ - Apply pricing model formula               │
│ - Calculate for day/week/month/quarter/year │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 5: CALCULATE RANGE (optional)          │
│ - Check if metrics are guaranteed           │
│ - Apply variance (±5% or ±15%)             │
│ - Calculate conservative/expected/optimistic│
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ STEP 6: FORMAT & DISPLAY                    │
│ - Round to dollars                          │
│ - Add commas                                │
│ - Prepend $ sign                            │
│ - Display in UI                             │
└─────────────────────────────────────────────┘
│
▼
DISPLAY TO USER
```

---

## Quick Decision Tables

### When to Show Commitment Total

| Condition | Show Total? |
|-----------|-------------|
| Has flatRate > 0 | ✓ Maybe |
| Has frequency | ✓ Maybe |
| pricingModel = "contact" | ✗ No |
| flatRate = 0 | ✗ No |
| flatRate missing | ✗ No |
| All conditions met | ✓ YES |

### Which Tier to Use

| Context | Tier Selection |
|---------|----------------|
| **Forecasting revenue** | 1x tier (or lowest) |
| **Displaying customer options** | All tiers |
| **Package commitment** | Selected tier |
| **Calculating discounts** | Compare tiers |

### Which Data Source to Trust

| Data Available | Use Order |
|----------------|-----------|
| **Occurrences** | 1. performanceMetrics.occurrencesPerMonth<br>2. Infer from channelFrequency<br>3. Return 0 |
| **Impressions** | 1. performanceMetrics.impressionsPerMonth<br>2. Legacy monthlyImpressions<br>3. Return 0 |
| **Frequency** | 1. Explicit frequency field<br>2. Default to 1x<br>3. Parse from string |

---

## Visual Summary: The Three Main Calculations

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  1. COMMITMENT TOTAL (What customer pays)              │
│     Formula: flatRate × frequency_multiplier           │
│     Example: $300 × 4x = $1,200                        │
│     Use: Package pricing, contracts                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  2. REVENUE FORECAST (What you'll earn)                │
│     Formula: daily_rate × days_in_timeframe            │
│     Example: ($300 × 4.33/month) = $1,299/month        │
│     Use: Financial projections, reporting              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  3. HUB DISCOUNT (Savings offered)                     │
│     Formula: ((default - hub) / default) × 100         │
│     Example: (($300-$250)/$300)×100 = 16.67%           │
│     Use: Hub pricing calculations                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

**Pro Tip:** Follow the flowcharts from top to bottom, checking each condition in order. The system is designed to fail gracefully, returning sensible defaults when data is missing.

---

*Last Updated: November 2025*

