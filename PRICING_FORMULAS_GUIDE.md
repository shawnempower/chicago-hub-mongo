# Pricing Formulas & Revenue Calculation Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Pricing Concepts](#core-pricing-concepts)
3. [Pricing Models](#pricing-models)
4. [Commitment Package Calculations](#commitment-package-calculations)
5. [Revenue Forecasting](#revenue-forecasting)
6. [Hub Pricing & Discounts](#hub-pricing--discounts)
7. [Package Builder Calculations](#package-builder-calculations)
8. [Daily Normalization System](#daily-normalization-system)
9. [Revenue Range Estimates](#revenue-range-estimates)
10. [Practical Examples](#practical-examples)
11. [Edge Cases & Special Handling](#edge-cases--special-handling)

---

## Overview

The Chicago Hub pricing system uses a **standardized calculation framework** that normalizes all pricing models to a common base (daily rates) and then projects revenue across any timeframe. This ensures consistency across different ad types, channels, and commitment levels.

### Key Principles

1. **Standardization**: All pricing uses `flatRate` + `pricingModel` schema
2. **Daily Base Unit**: All calculations normalize to daily rates first
3. **Timeframe Projection**: Revenue is projected using `days × daily_rate`
4. **Conservative Forecasting**: Revenue forecasts use the 1x tier (full price) for maximum accuracy
5. **Volume Discounts**: Multi-tier pricing represents volume discounts (1x, 4x, 12x, etc.)

---

## Core Pricing Concepts

### Standard Pricing Schema

```json
{
  "flatRate": 300,           // The price amount
  "pricingModel": "per_send", // How the price is applied
  "frequency": "4x"           // Commitment multiplier (optional)
}
```

### Pricing vs. Revenue

- **Pricing** = What you charge the customer (commitment package total)
- **Revenue** = What you'll actually earn over time (forecasted income)

**Example:**
- Pricing: $300/send × 4x = **$1,200** (commitment package)
- Revenue: $300/send × 4.33 sends/month = **$1,299/month** (monthly forecast)

---

## Pricing Models

### Time-Based Models

Charged based on duration, regardless of performance.

| Model | Description | Example | Notes |
|-------|-------------|---------|-------|
| `flat` | Monthly flat rate | $500/month | Default 30-day month |
| `monthly` | Same as flat | $500/month | Alias for flat |
| `per_week` | Weekly rate | $150/week | 52 weeks/year |
| `per_day` | Daily rate | $25/day | Straight daily |

**Time-Based Formula:**
```
Daily Rate = normalize_to_daily(flatRate, pricingModel)
Revenue = Daily Rate × Days
```

### Occurrence-Based Models

Charged per publication/broadcast occurrence.

| Model | Description | Example | Typical Use |
|-------|-------------|---------|-------------|
| `per_send` | Per newsletter send | $300/send | Email newsletters |
| `per_ad` | Per print ad placement | $500/ad | Print publications |
| `per_spot` | Per radio/podcast spot | $100/spot | Audio ads |
| `per_post` | Per social media post | $75/post | Social media |
| `per_story` | Per story placement | $50/story | Social stories |
| `per_episode` | Per podcast episode | $200/episode | Podcasts |

**Occurrence-Based Formula:**
```
Daily Occurrences = occurrencesPerMonth ÷ 30
Total Occurrences = Daily Occurrences × Days
Revenue = flatRate × Total Occurrences
```

### Impression-Based Models

Charged based on audience exposure.

| Model | Description | Example | Typical Use |
|-------|-------------|---------|-------------|
| `cpm` | Cost per 1000 impressions | $15 CPM | Display ads |
| `cpd` | Cost per 1000 downloads | $20 CPD | Podcast ads |
| `cpv` | Cost per 1000 views | $25 CPV | Video ads |
| `cpc` | Cost per click | $2 CPC | Performance marketing |

**Impression-Based Formulas:**

**CPM/CPD/CPV:**
```
Daily Impressions = impressionsPerMonth ÷ 30
Total Impressions = Daily Impressions × Days
Revenue = (flatRate × Total Impressions) ÷ 1000
```

**CPC:**
```
Daily Impressions = impressionsPerMonth ÷ 30
Total Clicks = Daily Impressions × Days × CTR
Revenue = flatRate × Total Clicks
```
*Note: If CTR is unknown, assume 1% (0.01)*

### Contact Pricing

| Model | Description | Behavior |
|-------|-------------|----------|
| `contact` | Contact for pricing | Returns `null` - no calculation |

---

## Commitment Package Calculations

### RULE 1: Package Total Calculation

**Formula:**
```
Total = flatRate × frequency_multiplier

Where frequency_multiplier is parsed from frequency:
- "1x" → 1
- "4x" → 4
- "12x" → 12
- "52x" → 52
- "One time" → 1
- (empty) → 1
```

**TypeScript Implementation:**
```typescript
function calculateTotal(pricing: StandardPricing): number | null {
  // Skip contact pricing
  if (pricing.pricingModel === 'contact' || !pricing.flatRate) {
    return null;
  }

  // No frequency = base price
  if (!pricing.frequency) {
    return pricing.flatRate;
  }

  // Extract multiplier (e.g., "4x" -> 4)
  const match = pricing.frequency.match(/^(\d+)x$/);
  if (match) {
    const multiplier = parseInt(match[1], 10);
    return pricing.flatRate * multiplier;
  }

  // Invalid frequency format = base price
  return pricing.flatRate;
}
```

### Examples

#### Example 1: Newsletter - 4x Commitment
```
Input:
  flatRate: $300
  pricingModel: "per_send"
  frequency: "4x"

Calculation:
  $300 × 4 = $1,200

Display:
  "Total: $1,200" (green box in UI)
```

#### Example 2: Print Ad - 12x Commitment
```
Input:
  flatRate: $500
  pricingModel: "per_ad"
  frequency: "12x"

Calculation:
  $500 × 12 = $6,000

Display:
  "Total: $6,000"
```

#### Example 3: No Frequency (One-time)
```
Input:
  flatRate: $1,200
  pricingModel: "per_ad"
  frequency: "" (empty)

Calculation:
  $1,200 × 1 = $1,200

Display:
  "Total: $1,200"
```

---

## Revenue Forecasting

### RULE 2: Daily Normalization

All revenue calculations start by normalizing to daily rates.

**Time-Based Normalization:**

```typescript
function normalizePricingToDaily(pricing: StandardPricing): number {
  const { flatRate, pricingModel } = pricing;
  
  switch (pricingModel) {
    case 'monthly':
    case 'flat':
      return flatRate / 30;  // Daily rate from monthly
    
    case 'per_week':
    case 'weekly':
      return (flatRate * 52) / 365;  // Daily rate from weekly
    
    case 'per_day':
      return flatRate;  // Already daily
    
    // Occurrence and impression-based return 0
    // (calculated separately using occurrences)
    default:
      return 0;
  }
}
```

**Occurrence-Based Normalization:**

```typescript
function normalizeOccurrences(ad: InventoryItem, channelFrequency?: string): number {
  // Priority 1: Use performance metrics if available
  if (ad.performanceMetrics?.occurrencesPerMonth) {
    return ad.performanceMetrics.occurrencesPerMonth / 30;
  }
  
  // Priority 2: Infer from channel frequency
  if (channelFrequency) {
    const monthlyOccurrences = FREQUENCY_TO_MONTHLY[channelFrequency];
    return monthlyOccurrences / 30;
  }
  
  return 0;
}
```

**Frequency to Monthly Mapping:**
```typescript
const FREQUENCY_TO_MONTHLY = {
  'daily': 30,
  'daily-business': 22,    // Business days only (print)
  'weekly': 4.33,          // ~4.33 weeks per month
  'bi-weekly': 2.17,       // ~2 times per month
  'monthly': 1,
  'quarterly': 0.33,       // ~4 months per occurrence
  'irregular': 2           // Assumed 2x per month
};
```

### RULE 3: Revenue Projection

Once normalized to daily rates, project to any timeframe.

**Formula:**
```
Revenue = Daily_Rate × Days_in_Timeframe

Timeframe Days:
- day: 1
- week: 7
- month: 30
- quarter: 91.25 (365 ÷ 4)
- year: 365
- custom: { days: N }
```

**TypeScript Implementation:**

```typescript
function calculateRevenue(
  ad: InventoryItem,
  timeframe: Timeframe,
  channelFrequency?: string
): number {
  const pricing = getFirstPricing(ad.pricing);  // Always use 1x tier
  const daily = normalizeToDaily(ad, channelFrequency);
  const days = getDaysFromTimeframe(timeframe);
  
  switch (pricing.pricingModel) {
    // Occurrence-based
    case 'per_send':
    case 'per_spot':
    case 'per_post':
    case 'per_ad':
      const totalOccurrences = daily.dailyOccurrences * days;
      return pricing.flatRate * totalOccurrences;
    
    // Impression-based
    case 'cpm':
    case 'cpd':
    case 'cpv':
      const totalImpressions = daily.dailyImpressions * days;
      return (pricing.flatRate * totalImpressions) / 1000;
    
    case 'cpc':
      const totalClicks = daily.dailyImpressions * days * 0.01;
      return pricing.flatRate * totalClicks;
    
    // Time-based
    case 'monthly':
    case 'flat':
    case 'per_week':
    case 'per_day':
      return daily.dailyFlatRate * days;
    
    default:
      return 0;
  }
}
```

### Tier Selection for Forecasting

**Important:** Revenue forecasts always use the **1x tier** (or lowest multiplier tier) for conservative estimates.

**Why?**
- Volume discounts (4x, 12x) represent discounted prices
- Forecasting needs the base per-insertion rate
- 1x tier represents maximum revenue potential

**Selection Logic:**
```typescript
function getFirstPricing(pricing: StandardPricing | StandardPricing[]): StandardPricing {
  if (Array.isArray(pricing)) {
    // Priority 1: Find 1x tier or "One time"
    const onexTier = pricing.find(p => {
      const freq = (p.frequency || '').toLowerCase();
      return freq === '1x' || freq.includes('one time');
    });
    if (onexTier) return onexTier;
    
    // Priority 2: Sort by multiplier, take lowest
    const sorted = pricing.sort((a, b) => {
      const multA = parseCommitmentMultiplier(a.frequency);
      const multB = parseCommitmentMultiplier(b.frequency);
      return multA - multB;
    });
    return sorted[0];
  }
  
  return pricing;
}
```

---

## Hub Pricing & Discounts

### Hub-Specific Pricing

Publications can offer **different prices to different marketing hubs**.

**Schema:**
```json
{
  "pricing": {
    "flatRate": 300,
    "pricingModel": "per_send",
    "frequency": "4x"
  },
  "hubPricing": [
    {
      "hubId": "chicago-hub",
      "hubName": "Chicago Hub",
      "pricing": {
        "flatRate": 250,        // Discounted rate
        "pricingModel": "per_send",
        "frequency": "4x"
      },
      "discount": 16.67,        // % discount (informational)
      "available": true,
      "minimumCommitment": "3 months"
    }
  ]
}
```

### Hub Discount Calculation

**Formula:**
```
Hub Discount % = ((default_price - hub_price) / default_price) × 100

Savings = default_price - hub_price
```

**Example:**
```
Default Price: $300/send
Hub Price: $250/send

Discount % = (($300 - $250) / $300) × 100
          = ($50 / $300) × 100
          = 16.67%

Savings = $300 - $250 = $50/send

For 4x commitment:
- Default Total: $300 × 4 = $1,200
- Hub Total: $250 × 4 = $1,000
- Total Savings: $200
```

---

## Package Builder Calculations

When building hub packages that bundle multiple inventory items, the system uses hub pricing rates when available, otherwise uses default pricing.

### Formula

```
Package Price = SUM(monthly_revenue for each selected inventory item)

For each item:
  If hub pricing exists → use hub price for calculation
  Else → use default price for calculation
```

### TypeScript Implementation

```typescript
function calculatePricing(selectedPublications, publications) {
  let totalPrice = 0;
  
  // Sum revenue from all selected inventory items
  Object.entries(selectedPublications).forEach(([pubId, data]) => {
    if (data.selected && data.inventoryItems.length > 0) {
      const pub = publications.find(p => p._id === pubId);
      
      data.inventoryItems.forEach(adId => {
        const adData = getFullAdObject(pub, adId);
        if (adData) {
          // Check if there's hub pricing for this inventory item
          const hasHubPricing = adData.ad.hubPricing && adData.ad.hubPricing.length > 0;
          
          if (hasHubPricing) {
            // Use hub pricing
            const hubPricingData = adData.ad.hubPricing[0];
            const tempAd = { ...adData.ad, pricing: hubPricingData.pricing, hubPricing: null };
            const monthlyRevenue = calculateRevenue(tempAd, 'month', adData.frequency);
            totalPrice += monthlyRevenue;
          } else {
            // Use default pricing
            const monthlyRevenue = calculateRevenue(adData.ad, 'month', adData.frequency);
            totalPrice += monthlyRevenue;
          }
        }
      });
    }
  });
  
  return {
    basePrice: totalPrice,
    hubDiscount: 0,
    finalPrice: totalPrice,
    discountPercentage: 0
  };
}
```

### Example: Multi-Publication Package

```
Selected Inventory:
1. Newsletter Ad (Chicago Reader) - with hub pricing
   - Hub rate: $250/send × 4.33 sends/month = $1,083/month
2. Website Banner (Block Club) - default pricing
   - Default rate: $500/month flat = $500/month
3. Print Ad (South Side Weekly) - with hub pricing
   - Hub rate: $900/ad × 4.33 ads/month = $3,897/month

Package Price = $1,083 + $500 + $3,897 = $5,480/month

Note: Hub pricing savings are already reflected in the individual item rates.
No additional package-level discount is applied.
```

---

## Daily Normalization System

### Complete Daily Metrics

```typescript
interface DailyMetrics {
  dailyOccurrences: number;     // How many times ad appears per day
  dailyImpressions: number;     // How many impressions per day
  dailyFlatRate: number;        // Daily rate for time-based pricing
  audienceSize: number;         // Total audience (informational)
}
```

### Full Normalization Function

```typescript
function normalizeToDaily(
  ad: InventoryItem,
  channelFrequency?: string
): DailyMetrics {
  const pricing = getFirstPricing(ad.pricing);
  const metrics = ad.performanceMetrics;
  
  // Calculate daily occurrences
  let dailyOccurrences = 0;
  if (metrics?.occurrencesPerMonth) {
    dailyOccurrences = metrics.occurrencesPerMonth / 30;
  } else if (channelFrequency) {
    const monthly = FREQUENCY_TO_MONTHLY[channelFrequency] || 1;
    dailyOccurrences = monthly / 30;
  }
  
  // Calculate daily impressions
  const monthlyImpressions = 
    metrics?.impressionsPerMonth || 
    ad.monthlyImpressions || 
    0;
  const dailyImpressions = monthlyImpressions / 30;
  
  // Calculate daily flat rate
  const dailyFlatRate = normalizePricingToDaily(pricing);
  
  return {
    dailyOccurrences,
    dailyImpressions,
    dailyFlatRate,
    audienceSize: metrics?.audienceSize || 0
  };
}
```

---

## Revenue Range Estimates

For forecasting, provide **confidence intervals** based on data quality.

### Formula

```typescript
interface RevenueEstimate {
  conservative: number;   // Lower bound
  expected: number;       // Most likely
  optimistic: number;     // Upper bound
  guaranteed: boolean;    // Data quality flag
}

function calculateRevenueWithRange(
  ad: InventoryItem,
  timeframe: Timeframe,
  channelFrequency?: string
): RevenueEstimate {
  const expected = calculateRevenue(ad, timeframe, channelFrequency);
  const guaranteed = ad.performanceMetrics?.guaranteed || false;
  
  // Tighter range for guaranteed metrics, wider for estimates
  const variancePercent = guaranteed ? 0.05 : 0.15;
  
  return {
    conservative: expected * (1 - variancePercent),
    expected,
    optimistic: expected * (1 + variancePercent),
    guaranteed
  };
}
```

### Variance Rules

| Data Quality | Variance | Conservative | Expected | Optimistic |
|--------------|----------|--------------|----------|------------|
| **Guaranteed** (verified metrics) | ±5% | 95% | 100% | 105% |
| **Estimated** (unverified metrics) | ±15% | 85% | 100% | 115% |

### Example: Newsletter with Guaranteed Metrics

```
Expected Monthly Revenue: $1,299

Guaranteed Metrics:
- Conservative: $1,299 × 0.95 = $1,234
- Expected: $1,299
- Optimistic: $1,299 × 1.05 = $1,364

Range: $1,234 - $1,364
```

### Example: Social Media with Estimated Metrics

```
Expected Monthly Revenue: $450

Estimated Metrics:
- Conservative: $450 × 0.85 = $383
- Expected: $450
- Optimistic: $450 × 1.15 = $518

Range: $383 - $518
```

---

## Practical Examples

### Example 1: Weekly Newsletter

**Input:**
```json
{
  "pricing": {
    "flatRate": 300,
    "pricingModel": "per_send"
  },
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33,
    "impressionsPerMonth": 50000,
    "audienceSize": 12000,
    "guaranteed": true
  }
}
```

**Commitment Total (4x package):**
```
Frequency: 4x
Total = $300 × 4 = $1,200
```

**Monthly Revenue Forecast:**
```
Daily Occurrences = 4.33 ÷ 30 = 0.144
Total Occurrences (30 days) = 0.144 × 30 = 4.33
Monthly Revenue = $300 × 4.33 = $1,299
```

**Annual Revenue Forecast:**
```
Total Occurrences (365 days) = 0.144 × 365 = 52.7
Annual Revenue = $300 × 52.7 = $15,810
```

**Revenue Range (Guaranteed, ±5%):**
```
Conservative: $1,299 × 0.95 = $1,234
Expected: $1,299
Optimistic: $1,299 × 1.05 = $1,364
```

---

### Example 2: Monthly Website Banner

**Input:**
```json
{
  "pricing": {
    "flatRate": 500,
    "pricingModel": "flat"
  },
  "performanceMetrics": {
    "impressionsPerMonth": 100000,
    "audienceSize": 25000,
    "guaranteed": false
  }
}
```

**Commitment Total (1x):**
```
Frequency: (empty, defaults to 1x)
Total = $500 × 1 = $500
```

**Monthly Revenue Forecast:**
```
Daily Flat Rate = $500 ÷ 30 = $16.67
Monthly Revenue = $16.67 × 30 = $500
```

**Annual Revenue Forecast:**
```
Annual Revenue = $16.67 × 365 = $6,084
```

**Revenue Range (Estimated, ±15%):**
```
Conservative: $500 × 0.85 = $425
Expected: $500
Optimistic: $500 × 1.15 = $575
```

---

### Example 3: CPM Display Ad

**Input:**
```json
{
  "pricing": {
    "flatRate": 15,
    "pricingModel": "cpm"
  },
  "performanceMetrics": {
    "impressionsPerMonth": 200000,
    "audienceSize": 50000,
    "guaranteed": true
  }
}
```

**Monthly Revenue Forecast:**
```
Daily Impressions = 200,000 ÷ 30 = 6,667
Total Impressions (30 days) = 6,667 × 30 = 200,000
Monthly Revenue = ($15 × 200,000) ÷ 1,000 = $3,000
```

**Annual Revenue Forecast:**
```
Total Impressions (365 days) = 6,667 × 365 = 2,433,455
Annual Revenue = ($15 × 2,433,455) ÷ 1,000 = $36,502
```

**Revenue Range (Guaranteed, ±5%):**
```
Conservative: $3,000 × 0.95 = $2,850
Expected: $3,000
Optimistic: $3,000 × 1.05 = $3,150
```

---

### Example 4: Multi-Tier Pricing (Print Ad)

**Input:**
```json
{
  "pricing": [
    {
      "pricing": {
        "flatRate": 1200,
        "pricingModel": "per_ad",
        "frequency": "1x"
      }
    },
    {
      "pricing": {
        "flatRate": 1000,
        "pricingModel": "per_ad",
        "frequency": "4x"
      }
    },
    {
      "pricing": {
        "flatRate": 900,
        "pricingModel": "per_ad",
        "frequency": "12x"
      }
    }
  ],
  "channelFrequency": "weekly"
}
```

**Commitment Totals:**
```
1x tier: $1,200 × 1 = $1,200
4x tier: $1,000 × 4 = $4,000 (Save $800)
12x tier: $900 × 12 = $10,800 (Save $3,600)
```

**Monthly Revenue Forecast** (uses 1x tier):
```
Weekly frequency = 4.33 occurrences/month
Daily Occurrences = 4.33 ÷ 30 = 0.144
Total Occurrences (30 days) = 0.144 × 30 = 4.33
Monthly Revenue = $1,200 × 4.33 = $5,196
```

**Effective Per-Ad Cost** (12x tier):
```
Total Cost: $10,800
Total Ads: 12
Effective Cost/Ad: $10,800 ÷ 12 = $900
vs. One-time: $1,200
Savings: $300/ad
```

---

## Edge Cases & Special Handling

### 1. Contact Pricing

**Behavior:**
```typescript
if (pricingModel === 'contact') {
  return null;  // No calculation
}
```
- Commitment Total: Hidden
- Revenue Forecast: $0
- Display: "Contact for pricing"

---

### 2. Missing flatRate

**Behavior:**
```typescript
if (!pricing.flatRate) {
  return null;
}
```
- Commitment Total: Hidden
- Revenue Forecast: $0
- Display: "N/A"

---

### 3. Zero Price

**Behavior:**
```typescript
if (flatRate === 0) {
  return null;
}
```
- Commitment Total: Hidden
- Revenue Forecast: $0
- Used for: Free listings, promotional inventory

---

### 4. Invalid Frequency Format

**Examples:** "4", "four times", "weekly"

**Behavior:**
```typescript
const match = frequency.match(/^(\d+)x$/);
if (!match) {
  return flatRate;  // Return base price (1x)
}
```
- Falls back to base price
- Treats as 1x multiplier
- Auto-formats to "Nx" on blur in UI

---

### 5. Missing Occurrences Data

**Scenario:** Occurrence-based pricing but no `occurrencesPerMonth` or `channelFrequency`

**Behavior:**
```typescript
if (!dailyOccurrences) {
  return 0;  // Cannot calculate revenue
}
```
- Revenue Forecast: $0
- Display: "N/A - Missing frequency data"
- Fix: Add `channelFrequency` or `performanceMetrics.occurrencesPerMonth`

---

### 6. Missing Impressions Data

**Scenario:** CPM/CPC pricing but no `impressionsPerMonth`

**Behavior:**
```typescript
if (!dailyImpressions) {
  return 0;  // Cannot calculate revenue
}
```
- Revenue Forecast: $0
- Display: "N/A - Missing impression data"
- Fix: Add `performanceMetrics.impressionsPerMonth`

---

### 7. Large Numbers Formatting

**Behavior:**
```typescript
function formatPrice(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}
```

**Examples:**
```
1200 → "$1,200"
15800 → "$15,800"
152000 → "$152,000"
```

---

### 8. Aggregate Revenue (Multiple Ads)

**Formula:**
```
Total Revenue = SUM(calculateRevenue(ad, timeframe, frequency))
  for each ad in inventory
```

**TypeScript:**
```typescript
function useAggregateRevenue(ads: InventoryItem[], channelFrequency?: string) {
  const monthlyRevenue = ads.reduce((sum, ad) => 
    sum + calculateRevenue(ad, 'month', channelFrequency), 0
  );
  const annualRevenue = ads.reduce((sum, ad) => 
    sum + calculateRevenue(ad, 'year', channelFrequency), 0
  );
  // ... etc
}
```

---

## Constants Reference

### Timeframe Days
```typescript
const TIMEFRAME_DAYS = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 91.25,
  year: 365
};
```

### Frequency to Monthly Occurrences
```typescript
const FREQUENCY_TO_MONTHLY = {
  'daily': 30,
  'daily-business': 22,
  'weekly': 4.33,
  'bi-weekly': 2.17,
  'monthly': 1,
  'quarterly': 0.33,
  'irregular': 2
};
```

### Pricing Model Display Labels
```typescript
const MODEL_LABELS = {
  'flat': '/month',
  'flat_rate': '/month',
  'per_week': '/week',
  'per_day': '/day',
  'cpm': '/1000 impressions',
  'cpc': '/click',
  'per_send': '/send',
  'per_ad': '/ad',
  'per_line': '/line',
  'per_spot': '/spot',
  'per_episode': '/episode',
  'cpd': '/1000 downloads',
  'per_post': '/post',
  'per_story': '/story',
  'monthly': '/month',
  'cpv': '/1000 views',
  'per_video': '/video',
  'weekly': '/week',
  'contact': 'Contact for pricing'
};
```

---

## Summary of Key Formulas

### Commitment Package Total
```
Total = flatRate × parse_multiplier(frequency)
```

### Daily Normalization
```
Daily Rate = normalize_to_daily(pricing)
Daily Occurrences = occurrencesPerMonth ÷ 30
Daily Impressions = impressionsPerMonth ÷ 30
```

### Revenue Projection
```
Revenue = Daily_Rate × Days

For occurrence-based:
Revenue = flatRate × (dailyOccurrences × days)

For impression-based (CPM):
Revenue = (flatRate × (dailyImpressions × days)) ÷ 1000

For time-based:
Revenue = dailyFlatRate × days
```

### Revenue Range
```
Conservative = expected × (1 - variance)
Expected = calculateRevenue(...)
Optimistic = expected × (1 + variance)

Where variance = 0.05 (guaranteed) or 0.15 (estimated)
```

### Hub Discount
```
Hub Discount % = ((default - hub) / default) × 100
Savings = default - hub
```

### Package Pricing
```
Base Price = SUM(monthly_revenue for each item)
Hub Discount = Base Price × 0.25
Final Price = Base Price - Hub Discount
```

---

## Related Documentation

- **[TOTAL_PRICE_CALCULATION.md](./TOTAL_PRICE_CALCULATION.md)** - UI implementation details
- **[PRICING_MIGRATION_GUIDE.md](./PRICING_MIGRATION_GUIDE.md)** - Schema migration
- **Source Files:**
  - `src/utils/pricingCalculations.ts` - Core calculation logic
  - `src/hooks/usePricingCalculations.ts` - React hooks for calculations
  - `src/components/dashboard/HubPricingEditor.tsx` - UI implementation
  - `src/components/admin/PackageBuilderForm.tsx` - Package pricing logic

---

**Last Updated:** November 2025  
**Schema Version:** v2.0 (Clean Schema)  
**Calculation Version:** v1.0 (Daily Normalization System)

