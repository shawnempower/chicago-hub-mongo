# Pricing Formulas - Quick Reference Card

> **Quick access guide for calculating prices, totals, and forecasts**

---

## 🎯 Core Formulas at a Glance

### 1. Commitment Package Total
**What customer pays upfront for a package commitment**

```
Total = Base Price × Commitment Multiplier

Examples:
  $300 × 4x  = $1,200
  $500 × 12x = $6,000
  $100 × 52x = $5,200
```

---

### 2. Monthly Revenue Forecast
**Expected monthly income based on publication frequency**

```
Monthly Revenue = Base Price × Monthly Occurrences

Frequency Mapping:
  Daily         → 30 occurrences/month
  Weekly        → 4.33 occurrences/month
  Bi-weekly     → 2.17 occurrences/month
  Monthly       → 1 occurrence/month

Example:
  $300/send × 4.33 sends/month = $1,299/month
```

---

### 3. Hub Discount
**Discount offered to hub members**

```
Discount % = ((Default Price - Hub Price) / Default Price) × 100
Savings = Default Price - Hub Price

Example:
  Default: $300    Hub: $250
  Discount: ($50 / $300) × 100 = 16.67%
  Savings: $50 per insertion
```

---

### 4. Package Bundle Pricing
**Multi-publication hub packages**

```
Package Price = SUM(monthly revenue for all items)

For each item:
  If hub pricing exists → use hub price
  Else → use default price

Example:
  Newsletter (hub): $1,083/month
  Website (default): $500/month
  Print (hub): $3,897/month
  ────────────────────────────
  Package Price: $5,480/month
```

---

## 📊 Pricing Models Reference

### Time-Based (Flat Rates)

| Model | Formula | Example |
|-------|---------|---------|
| Monthly / Flat | `$X / 30 days` | $500/month = $16.67/day |
| Weekly | `$X × 52 / 365 days` | $150/week = $21.37/day |
| Daily | `$X` | $25/day |

**Revenue:** `Daily Rate × Days`

---

### Occurrence-Based (Per Insertion)

| Model | Use Case | Example |
|-------|----------|---------|
| per_send | Newsletter | $300/send |
| per_ad | Print | $500/ad |
| per_spot | Radio/Podcast | $100/spot |
| per_post | Social Media | $75/post |

**Revenue:** `Price × (Occurrences/Month / 30) × Days`

---

### Impression-Based (Performance)

| Model | Formula | Example |
|-------|---------|---------|
| CPM | `$X per 1000 impressions` | $15 CPM |
| CPC | `$X per click` | $2 CPC |
| CPD | `$X per 1000 downloads` | $20 CPD |

**Revenue (CPM):** `(CPM × Impressions × Days / 30) / 1000`

**Revenue (CPC):** `CPC × Clicks` (assume 1% CTR if unknown)

---

## 🔢 Quick Calculations

### Calculate Commitment Total
```
1. Get base price (flatRate)
2. Get frequency (e.g., "4x", "12x")
3. Extract multiplier (4, 12)
4. Multiply: Base × Multiplier

$300 × 4 = $1,200 ✓
```

---

### Calculate Monthly Revenue (Occurrence-Based)
```
1. Get base price
2. Get monthly occurrences
   - From data: use occurrencesPerMonth
   - From frequency: use mapping (weekly = 4.33)
3. Multiply: Base × Monthly Occurrences

$300 × 4.33 = $1,299/month ✓
```

---

### Calculate Monthly Revenue (Time-Based)
```
1. Get flat rate
2. Normalize to daily
   - Monthly: $X / 30
   - Weekly: ($X × 52) / 365
3. Multiply by 30 days

$500/month → ($500 / 30) × 30 = $500 ✓
$150/week → (($150 × 52) / 365) × 30 = $641 ✓
```

---

### Calculate Monthly Revenue (CPM)
```
1. Get CPM rate
2. Get monthly impressions
3. Apply formula: (CPM × Impressions) / 1000

$15 CPM × 200,000 impressions
= ($15 × 200,000) / 1000
= $3,000/month ✓
```

---

### Calculate Annual Revenue
```
Use same formulas but multiply daily rate by 365

Example (Weekly Newsletter):
  $300/send × 4.33 occurrences/month
  Daily: (4.33 / 30) = 0.144 occurrences/day
  Annual: $300 × 0.144 × 365 = $15,810/year ✓
```

---

## 📈 Revenue Ranges (Confidence Intervals)

### Guaranteed Metrics (±5%)
```
Conservative = Expected × 0.95
Expected = (calculated revenue)
Optimistic = Expected × 1.05

Example: $1,299/month expected
  Conservative: $1,234
  Expected: $1,299
  Optimistic: $1,364
```

### Estimated Metrics (±15%)
```
Conservative = Expected × 0.85
Expected = (calculated revenue)
Optimistic = Expected × 1.15

Example: $450/month expected
  Conservative: $383
  Expected: $450
  Optimistic: $518
```

---

## 🎨 Visual Examples

### Tiered Pricing Comparison

```
Print Ad - 3 Tiers:

┌────────────────────────────────────────┐
│ 1x:  $1,200 × 1  = $1,200             │ ← Full price
│ 4x:  $1,000 × 4  = $4,000 (Save $800) │ ← Discounted rate
│ 12x: $  900 × 12 = $10,800 (Save $3,600) │ ← Best rate
└────────────────────────────────────────┘

Effective Rates:
  1x:  $1,200/ad
  4x:  $1,000/ad
  12x: $900/ad (25% off)
```

---

### Hub vs Default Pricing

```
Newsletter Ad:

Default Pricing:
  $300/send × 4x = $1,200 total

Hub Pricing:
  $250/send × 4x = $1,000 total

Savings: $200 (16.67% discount)
```

---

### Package Bundle Savings

```
3-Publication Package:

Individual Purchases:
  Newsletter: $1,299/month
  Website:    $  500/month
  Print:      $1,732/month
  ────────────────────────
  Total:      $3,531/month

Hub Package (uses hub pricing when available):
  Package Price: $4,597/month
  Newsletter (hub): $1,083/month
  Website (default): $500/month
  Print (hub): $3,014/month
```

---

## 🔑 Frequency Multiplier Reference

### Commitment Frequencies
```
"1x"  or "One time" → 1
"4x"  → 4
"12x" → 12
"26x" → 26
"52x" → 52
```

### Publication Frequencies → Monthly Occurrences
```
Daily            → 30
Daily (business) → 22
Weekly           → 4.33
Bi-weekly        → 2.17
Monthly          → 1
Quarterly        → 0.33
```

---

## 🛠️ Common Scenarios

### Scenario 1: Weekly Newsletter, 4x Commitment
```
Given:
  Base Price: $300/send
  Frequency: "4x"
  Publication: Weekly (4.33 sends/month)

Calculate Commitment Total:
  $300 × 4 = $1,200

Calculate Monthly Revenue:
  $300 × 4.33 = $1,299/month

Calculate Annual Revenue:
  $1,299 × 12 = $15,588/year
```

---

### Scenario 2: Monthly Banner Ad, No Commitment
```
Given:
  Base Price: $500
  Model: "flat" (monthly)
  Frequency: (empty)

Calculate Commitment Total:
  $500 × 1 = $500

Calculate Monthly Revenue:
  $500 (flat rate) = $500/month

Calculate Annual Revenue:
  $500 × 12 = $6,000/year
```

---

### Scenario 3: CPM Display Ad
```
Given:
  CPM: $15
  Monthly Impressions: 200,000

Calculate Monthly Revenue:
  ($15 × 200,000) / 1000 = $3,000/month

Calculate Annual Revenue:
  $3,000 × 12 = $36,000/year
```

---

### Scenario 4: Hub-Discounted Package
```
Given:
  3 inventory items
  Combined monthly revenue: $3,531
  Hub discount: 25%

Calculate:
  Base Price: $3,531/month
  Hub Discount: $3,531 × 0.25 = $883
  Final Price: $3,531 - $883 = $2,648/month
  Annual Cost: $2,648 × 12 = $31,776/year
  Annual Savings: $883 × 12 = $10,596/year
```

---

## ⚠️ Special Cases

### Contact Pricing
```
Model: "contact"
Result: No calculation (returns null)
Display: "Contact for pricing"
```

### Missing Data
```
No flatRate → Total = null (hidden)
No frequency → Total = Base Price (1x)
No occurrences → Revenue = $0
No impressions (CPM) → Revenue = $0
```

### Zero Price
```
flatRate = 0
Result: Total hidden, used for free/promo listings
```

---

## 🧮 Mental Math Shortcuts

### Quick Monthly from Weekly
```
Weekly × 4.33 ≈ Monthly

$300/week × 4.33 ≈ $1,300/month
```

### Quick Annual from Monthly
```
Monthly × 12 = Annual

$1,299/month × 12 ≈ $15,600/year
```

### Quick Hub Discount (25%)
```
Base ÷ 4 = Discount
Base - (Base ÷ 4) = Final

$3,600 ÷ 4 = $900 discount
$3,600 - $900 = $2,700 final
```

### Quick Tier Discount
```
1x to 4x (typical 17% off):
$1,200 → $1,000 (≈ $200 off per package)

1x to 12x (typical 25% off):
$1,200 → $900 (≈ $300 off per insertion)
```

---

## 📱 Quick Decision Matrix

| If you want to... | Use this formula |
|-------------------|------------------|
| **Show package total** | `Base × Multiplier` |
| **Forecast monthly income** | `Base × Monthly Occurrences` |
| **Forecast annual income** | `Daily Rate × 365` |
| **Calculate hub discount** | `((Default - Hub) / Default) × 100` |
| **Price a bundle** | `SUM(revenues) × 0.75` |
| **Show savings** | `Default - Hub` |
| **Show effective rate** | `Total / Multiplier` |

---

## 🔗 Related Docs

- **[PRICING_FORMULAS_GUIDE.md](./PRICING_FORMULAS_GUIDE.md)** - Complete technical reference
- **[TOTAL_PRICE_CALCULATION.md](./TOTAL_PRICE_CALCULATION.md)** - UI implementation
- **[PRICING_MIGRATION_GUIDE.md](./PRICING_MIGRATION_GUIDE.md)** - Schema details

---

**Print this page for quick desk reference!** 🖨️

*Last Updated: November 2025*

