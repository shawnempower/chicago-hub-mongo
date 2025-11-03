# Pricing Calculation Examples

Real-world scenarios demonstrating how pricing calculations work in practice.

---

## Table of Contents

1. [Newsletter Advertising](#newsletter-advertising)
2. [Print Publications](#print-publications)
3. [Website Display Ads](#website-display-ads)
4. [Social Media Marketing](#social-media-marketing)
5. [Podcast Advertising](#podcast-advertising)
6. [Radio Spots](#radio-spots)
7. [Multi-Channel Packages](#multi-channel-packages)
8. [Hub Pricing Scenarios](#hub-pricing-scenarios)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Newsletter Advertising

### Example 1: Chicago Reader Newsletter - Weekly Send

**Publication Details:**
- Newsletter: "This Just In" (weekly newsletter)
- Audience: 12,000 subscribers
- Frequency: Weekly (every Monday)
- Open Rate: 45%
- Guaranteed metrics: Yes

**Pricing Structure:**
```json
{
  "pricing": [
    {
      "pricing": {
        "flatRate": 300,
        "pricingModel": "per_send",
        "frequency": "1x"
      }
    },
    {
      "pricing": {
        "flatRate": 275,
        "pricingModel": "per_send",
        "frequency": "4x"
      }
    },
    {
      "pricing": {
        "flatRate": 250,
        "pricingModel": "per_send",
        "frequency": "12x"
      }
    }
  ],
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33,
    "impressionsPerMonth": 51960,
    "audienceSize": 12000,
    "guaranteed": true
  }
}
```

**Commitment Package Pricing:**

| Tier | Per Send | Frequency | Total | Savings |
|------|----------|-----------|-------|---------|
| One-time | $300 | 1x | **$300** | - |
| 4-week | $275 | 4x | **$1,100** | $100 (8%) |
| 12-week | $250 | 12x | **$3,000** | $600 (17%) |

**Revenue Forecasting:**

Using the 1x tier ($300/send) for conservative estimates:

| Timeframe | Calculation | Revenue |
|-----------|-------------|---------|
| **Daily** | $300 × (4.33 ÷ 30) = $300 × 0.144 | **$43** |
| **Weekly** | $300 × (4.33 ÷ 30) × 7 = $300 × 1.01 | **$303** |
| **Monthly** | $300 × 4.33 | **$1,299** |
| **Quarterly** | $300 × (4.33 ÷ 30) × 91.25 | **$3,949** |
| **Annual** | $300 × (4.33 ÷ 30) × 365 = $300 × 52.7 | **$15,810** |

**Revenue Range (Guaranteed ±5%):**
```
Monthly Revenue:
  Conservative: $1,234 (95%)
  Expected: $1,299 (100%)
  Optimistic: $1,364 (105%)
```

**Customer View:**
```
┌──────────────────────────────────────────────────┐
│ Chicago Reader - "This Just In" Newsletter       │
├──────────────────────────────────────────────────┤
│ 📧 Weekly | 👥 12,000 subscribers | 📊 45% open  │
│                                                  │
│ PRICING OPTIONS:                                 │
│ ○ One-time:  $300/send                          │
│ ○ 4-week:    $275/send × 4 = $1,100 (Save $100)│
│ ● 12-week:   $250/send × 12 = $3,000 (Save $600)│
│                                                  │
│ MONTHLY REVENUE FORECAST: $1,299/month           │
│ ANNUAL REVENUE FORECAST: $15,810/year            │
└──────────────────────────────────────────────────┘
```

---

### Example 2: Newsletter with Hub Pricing

**Default Pricing:**
- $300/send
- 4x commitment: $1,200

**Chicago Hub Pricing:**
- $250/send (17% discount)
- 4x commitment: $1,000

**Comparison:**

| Item | Default | Chicago Hub | Savings |
|------|---------|-------------|---------|
| Per Send | $300 | $250 | $50 (17%) |
| 4x Package | $1,200 | $1,000 | $200 (17%) |
| Monthly Revenue | $1,299 | $1,083 | $216 |
| Annual Revenue | $15,810 | $13,190 | $2,620 |

**Advertiser Perspective:**
- Pays: $1,000 for 4 sends (hub pricing)
- Gets: 4 newsletter placements to 12,000 subscribers
- Savings: $200 vs. default pricing

**Publisher Perspective:**
- Expected Revenue: $1,083/month (hub rate)
- vs. Default: $1,299/month
- Trade-off: 17% discount for guaranteed volume

---

## Print Publications

### Example 3: South Side Weekly - Full Page Ad

**Publication Details:**
- Format: Weekly print newspaper
- Circulation: 10,000 copies
- Distribution: South Side neighborhoods
- Frequency: Weekly (Thursdays)

**Pricing Structure:**
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
    },
    {
      "pricing": {
        "flatRate": 800,
        "pricingModel": "per_ad",
        "frequency": "52x"
      }
    }
  ],
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33,
    "impressionsPerMonth": 43300,
    "audienceSize": 10000,
    "guaranteed": false
  }
}
```

**Commitment Package Pricing:**

| Tier | Per Ad | Frequency | Total | Per Ad Effective | Savings |
|------|--------|-----------|-------|------------------|---------|
| **One-time** | $1,200 | 1x | **$1,200** | $1,200/ad | - |
| **4-week** | $1,000 | 4x | **$4,000** | $1,000/ad | $800 (17%) |
| **12-week** | $900 | 12x | **$10,800** | $900/ad | $3,600 (25%) |
| **52-week** | $800 | 52x | **$41,600** | $800/ad | $20,800 (33%) |

**Revenue Forecasting:**

Using the 1x tier ($1,200/ad):

| Timeframe | Calculation | Revenue |
|-----------|-------------|---------|
| **Monthly** | $1,200 × 4.33 | **$5,196** |
| **Quarterly** | $1,200 × 13 | **$15,600** |
| **Annual** | $1,200 × 52 | **$62,400** |

**Revenue Range (Estimated ±15%):**
```
Monthly Revenue:
  Conservative: $4,417 (85%)
  Expected: $5,196 (100%)
  Optimistic: $5,975 (115%)
```

**ROI Analysis for Advertiser:**

**Scenario: Local Restaurant**
- Buys 12-week package: $10,800
- Average order: $25
- Conversion rate: 0.5% (50 of 10,000 readers per ad)
- Total conversions: 50 × 12 = 600 customers
- Revenue generated: 600 × $25 = $15,000
- **Net Profit: $4,200** (39% ROI)

---

### Example 4: Print with Open Rate Pricing

**Publication:** Block Club Chicago (Print Edition)

**Pricing:**
```json
{
  "pricing": {
    "flatRate": 5000,
    "pricingModel": "per_ad",
    "frequency": "Open Rate"
  }
}
```

**"Open Rate" Pricing Explanation:**
- $5,000 per advertisement
- No commitment required
- Can place ads on-demand
- Pay-as-you-go model

**Commitment Total:**
- "Open Rate" is treated as 1x
- Total: $5,000 per ad

**Best For:**
- One-time campaigns
- Event announcements
- Seasonal promotions
- Testing the publication

---

## Website Display Ads

### Example 5: Block Club Chicago - Banner Ad

**Publication Details:**
- Website: blockclubchicago.org
- Monthly visitors: 100,000
- Monthly pageviews: 500,000
- Banner position: Sidebar (300×250)

**Pricing Structure:**
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

**Commitment Package Pricing:**
```
Monthly Rate: $500/month (flat)
Quarterly Rate: $500 × 3 = $1,500
Annual Rate: $500 × 12 = $6,000
```

**Revenue Forecasting:**

| Timeframe | Calculation | Revenue |
|-----------|-------------|---------|
| **Daily** | $500 ÷ 30 | **$17** |
| **Weekly** | ($500 ÷ 30) × 7 | **$117** |
| **Monthly** | $500 | **$500** |
| **Quarterly** | $500 × 3 | **$1,500** |
| **Annual** | $500 × 12 | **$6,000** |

**Performance Metrics:**
- Impressions: 100,000/month
- CPM (effective): ($500 ÷ 100,000) × 1000 = **$5 CPM**
- Estimated clicks (1% CTR): 1,000/month
- CPC (effective): $500 ÷ 1,000 = **$0.50 CPC**

**Revenue Range (Estimated ±15%):**
```
Monthly Revenue:
  Conservative: $425 (85%)
  Expected: $500 (100%)
  Optimistic: $575 (115%)
```

---

### Example 6: CPM-Based Display Ad

**Publication:** Chicago Reader Website

**Pricing:**
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

**Revenue Calculation:**

**Monthly:**
```
Daily Impressions = 200,000 ÷ 30 = 6,667/day
Total Impressions (30 days) = 6,667 × 30 = 200,000
Revenue = ($15 × 200,000) ÷ 1,000 = $3,000/month
```

**Annual:**
```
Daily Impressions = 6,667/day
Total Impressions (365 days) = 6,667 × 365 = 2,433,455
Revenue = ($15 × 2,433,455) ÷ 1,000 = $36,502/year
```

**Revenue Range (Guaranteed ±5%):**
```
Monthly Revenue:
  Conservative: $2,850 (95%)
  Expected: $3,000 (100%)
  Optimistic: $3,150 (105%)
```

**Advertiser Perspective:**
- Pays: $15 per 1,000 impressions
- Gets: 200,000 impressions/month guaranteed
- Total monthly cost: $3,000
- Reach: 50,000 unique visitors
- Frequency: 4 impressions per visitor

---

## Social Media Marketing

### Example 7: Social Media Management Package

**Service:** Monthly social media management

**Pricing:**
```json
{
  "pricing": {
    "flatRate": 750,
    "pricingModel": "monthly"
  },
  "performanceMetrics": {
    "occurrencesPerMonth": 20,
    "impressionsPerMonth": 50000,
    "audienceSize": 8000,
    "guaranteed": false
  }
}
```

**Package Includes:**
- 20 posts per month (daily M-F)
- Content creation
- Community management
- Monthly analytics report

**Revenue Forecasting:**

| Timeframe | Calculation | Revenue |
|-----------|-------------|---------|
| **Monthly** | $750 | **$750** |
| **Quarterly** | $750 × 3 | **$2,250** |
| **Annual** | $750 × 12 | **$9,000** |

**Effective Per-Post Rate:**
```
$750 ÷ 20 posts = $37.50 per post
```

---

### Example 8: Per-Post Social Media Pricing

**Service:** Individual Instagram/Facebook posts

**Pricing:**
```json
{
  "pricing": [
    {
      "pricing": {
        "flatRate": 75,
        "pricingModel": "per_post",
        "frequency": "1x"
      }
    },
    {
      "pricing": {
        "flatRate": 60,
        "pricingModel": "per_post",
        "frequency": "4x"
      }
    },
    {
      "pricing": {
        "flatRate": 50,
        "pricingModel": "per_post",
        "frequency": "12x"
      }
    }
  ],
  "performanceMetrics": {
    "audienceSize": 5000,
    "guaranteed": false
  }
}
```

**Commitment Packages:**

| Tier | Per Post | Frequency | Total | Savings |
|------|----------|-----------|-------|---------|
| Single Post | $75 | 1x | **$75** | - |
| 4-Post Package | $60 | 4x | **$240** | $60 (20%) |
| 12-Post Package | $50 | 12x | **$600** | $300 (33%) |

**Revenue Forecasting** (if client wants weekly posts):
```
Weekly posts = 4.33/month
Monthly Revenue = $75 × 4.33 = $325/month
Annual Revenue = $325 × 12 = $3,900/year
```

---

## Podcast Advertising

### Example 9: Podcast Pre-Roll Ad

**Show:** Chicago news & culture podcast
**Episode Frequency:** Weekly
**Average Downloads:** 5,000 per episode

**Pricing:**
```json
{
  "pricing": {
    "flatRate": 20,
    "pricingModel": "cpd"
  },
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33,
    "impressionsPerMonth": 21650,
    "audienceSize": 15000,
    "guaranteed": true
  }
}
```

**Revenue Calculation:**

**Monthly:**
```
Monthly Downloads = 21,650
CPD = $20 per 1,000 downloads
Revenue = ($20 × 21,650) ÷ 1,000 = $433/month
```

**Annual:**
```
Annual Downloads = 21,650 × 12 = 259,800
Revenue = ($20 × 259,800) ÷ 1,000 = $5,196/year
```

**Advertiser Cost:**
```
$433/month for 4.33 episodes
= ~$100 per episode
= $0.02 per download
```

---

## Radio Spots

### Example 10: WRLL Radio - 30-Second Spot

**Station:** WRLL (Berwyn)
**Format:** Community radio
**Estimated Weekly Listeners:** 5,000

**Pricing:**
```json
{
  "pricing": [
    {
      "pricing": {
        "flatRate": 100,
        "pricingModel": "per_spot",
        "frequency": "1x"
      }
    },
    {
      "pricing": {
        "flatRate": 85,
        "pricingModel": "per_spot",
        "frequency": "12x"
      }
    },
    {
      "pricing": {
        "flatRate": 75,
        "pricingModel": "per_spot",
        "frequency": "52x"
      }
    }
  ],
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33,
    "audienceSize": 5000,
    "guaranteed": false
  }
}
```

**Commitment Packages:**

| Tier | Per Spot | Frequency | Total | Savings |
|------|----------|-----------|-------|---------|
| Single Spot | $100 | 1x | **$100** | - |
| 12-Week (Weekly) | $85 | 12x | **$1,020** | $180 (15%) |
| 52-Week (Weekly) | $75 | 52x | **$3,900** | $1,300 (25%) |

**Revenue Forecasting** (Weekly spots):

| Timeframe | Calculation | Revenue |
|-----------|-------------|---------|
| **Monthly** | $100 × 4.33 | **$433** |
| **Quarterly** | $100 × 13 | **$1,300** |
| **Annual** | $100 × 52 | **$5,200** |

---

## Multi-Channel Packages

### Example 11: Comprehensive Marketing Package

**Package:** "South Side Saturation"
**Duration:** 1 month
**Includes:** Newsletter + Website + Print

**Components:**

**1. Newsletter Ad (Chicago Reader)**
- $300/send × 4.33 sends = $1,299/month

**2. Website Banner (Block Club)**
- $500/month flat = $500/month

**3. Print Ad (South Side Weekly)**
- $1,200/ad × 4.33 ads = $5,196/month
  (Using 4x package: $1,000/ad × 4.33 = $4,330/month)

**Package Pricing:**

**Option A: Individual Rates**
```
Newsletter: $1,299
Website: $500
Print (4x rate): $4,330
────────────────────────
Total: $6,129/month
```

**Option B: Hub Bundle (uses hub pricing when available)**
```
Newsletter (hub pricing): $1,083/month
Website (default pricing): $500/month
Print (hub pricing): $3,014/month
────────────────────────────────────
Package Price: $4,597/month

Savings from hub pricing built into rates
```

**Performance Estimates:**
```
Combined Reach: ~47,000 unique individuals
Total Monthly Impressions: ~195,000
Channels: 3 (email, web, print)
Touchpoints: ~13 per month
```

**Customer View:**
```
┌────────────────────────────────────────────────────┐
│ 🎯 SOUTH SIDE SATURATION PACKAGE                   │
├────────────────────────────────────────────────────┤
│                                                    │
│ ✅ Chicago Reader Newsletter (4x/month)           │
│    → 12,000 subscribers                            │
│    → Hub pricing: $250/send                        │
│                                                    │
│ ✅ Block Club Website Banner (30 days)            │
│    → 100,000 impressions                           │
│    → Standard pricing: $500/month                  │
│                                                    │
│ ✅ South Side Weekly Print (4x/month)             │
│    → 10,000 circulation                            │
│    → Hub pricing: $696/ad                          │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│ PACKAGE PRICE:             $4,597/month            │
│                                                    │
│ 💰 Multi-channel reach across 3 publications      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Hub Pricing Scenarios

### Example 12: Tiered Hub Discounts

**Newsletter Ad Base Pricing:** $300/send

**Hub Pricing Tiers:**

```
┌──────────────────────┬──────────┬──────────┬─────────┐
│ Hub                  │ Price    │ Discount │ Monthly │
├──────────────────────┼──────────┼──────────┼─────────┤
│ DEFAULT (no hub)     │ $300     │ 0%       │ $1,299  │
│ Chicago Hub          │ $250     │ 17%      │ $1,083  │
│ Portland Hub         │ $275     │ 8%       │ $1,191  │
│ Seattle Hub          │ $265     │ 12%      │ $1,147  │
└──────────────────────┴──────────┴──────────┴─────────┘
```

**Annual Impact:**

| Hub | Monthly Revenue | Annual Revenue | Lost Revenue |
|-----|-----------------|----------------|--------------|
| Default | $1,299 | $15,588 | - |
| Chicago | $1,083 | $12,996 | $2,592 (17%) |
| Portland | $1,191 | $14,292 | $1,296 (8%) |
| Seattle | $1,147 | $13,764 | $1,824 (12%) |

**Strategic Considerations:**
- Chicago Hub: Highest volume → deeper discount justified
- Portland Hub: Smaller discount for testing market
- Seattle Hub: Mid-tier discount for established presence

---

### Example 13: Minimum Commitment with Hub Pricing

**Print Ad:** South Side Weekly

**Default Pricing:**
- $1,200/ad (1x)
- No minimum commitment

**Chicago Hub Pricing:**
- $1,000/ad (17% discount)
- Minimum commitment: 6 months
- Must run at least weekly

**Comparison:**

**Default (No Commitment):**
```
Per Ad: $1,200
Try one issue: $1,200
Cancel anytime: ✓
```

**Chicago Hub (6-Month Commitment):**
```
Per Ad: $1,000
6 months weekly: $1,000 × 26 = $26,000
Savings: $5,200 (17%)
Cancel penalty: Forfeit discount on remaining ads
```

**Break-Even Analysis:**
```
To justify 6-month commitment:
- Must run at least 4 ads to save $800
- Full 26 ads saves $5,200
- After 12 ads: $2,400 saved (commitment halfway)
```

---

## Troubleshooting Common Issues

### Issue 1: "Total Not Showing"

**Problem:**
```json
{
  "pricing": {
    "flatRate": 300,
    "pricingModel": "per_send",
    "frequency": ""  // ← Empty frequency
  }
}
```

**Solution:**
- Empty frequency defaults to 1x
- Total = $300 × 1 = **$300** ✓
- This is correct behavior!

---

### Issue 2: "Revenue Shows $0"

**Problem:**
```json
{
  "pricing": {
    "flatRate": 300,
    "pricingModel": "per_send"  // Occurrence-based
  },
  // ❌ Missing: performanceMetrics or channelFrequency
}
```

**Solution:**
Add frequency data:
```json
{
  "pricing": {
    "flatRate": 300,
    "pricingModel": "per_send"
  },
  "performanceMetrics": {
    "occurrencesPerMonth": 4.33  // ← Add this
  }
}
```
OR provide channel frequency when calling `calculateRevenue()`:
```typescript
calculateRevenue(ad, 'month', 'weekly');  // ← Provide frequency
```

---

### Issue 3: "Wrong Tier Used for Forecasting"

**Problem:**
System is using 12x discounted rate ($250) instead of 1x base rate ($300) for forecasting.

**Expected Behavior:**
Revenue forecasts ALWAYS use the 1x tier (or lowest multiplier) for conservative estimates.

**Example:**
```json
{
  "pricing": [
    { "pricing": { "flatRate": 300, "frequency": "1x" } },  // ← Uses this
    { "pricing": { "flatRate": 250, "frequency": "12x" } }  // ← Not this
  ]
}
```

**Why?**
- 1x = base rate (full price)
- 12x = volume discount
- Forecasting needs conservative estimate at full price
- This represents maximum revenue potential

---

### Issue 4: "Commitment Total vs. Revenue Forecast Mismatch"

**Scenario:**
```
Commitment Total (4x): $1,100
Monthly Revenue Forecast: $1,299

These don't match! Which is right?
```

**Answer:** BOTH are correct! They measure different things.

**Commitment Total** = What customer pays for package
- Formula: base_price × multiplier
- Example: $275 × 4 = $1,100
- Use: Customer invoice, package pricing

**Revenue Forecast** = What you'll earn over time
- Formula: base_price × monthly_occurrences
- Example: $300 × 4.33 = $1,299
  (uses 1x tier $300, not 4x discounted $275)
- Use: Financial projections, reporting

**Why Different?**
- Commitment uses discounted rate ($275)
- Forecast uses base rate ($300) for conservative estimate
- Forecast assumes potential maximum revenue, not locked-in packages

---

### Issue 5: "Hub Pricing Not Applying"

**Problem:**
Requesting Chicago Hub pricing but getting default rates.

**Checklist:**
```typescript
// 1. Does hubPricing array exist?
ad.hubPricing  // Must be defined

// 2. Does hub entry exist?
ad.hubPricing.find(h => h.hubId === 'chicago-hub')  // Must find match

// 3. Is inventory available?
hubPricing.available  // Must be true (or undefined)

// 4. Is correct hubId passed?
calculateRevenue(ad, 'month', frequency, 'chicago-hub')  // ← Pass hubId
```

**Common Mistakes:**
```typescript
// ❌ Wrong: hubId not passed
const revenue = calculateRevenue(ad, 'month', 'weekly');

// ✓ Correct: hubId included
const revenue = calculateRevenue(ad, 'month', 'weekly', 'chicago-hub');
```

---

## Summary Tables

### Pricing Models at a Glance

| Model | Example | Needs | Formula |
|-------|---------|-------|---------|
| `per_send` | $300/send | occurrencesPerMonth | flatRate × occurrences |
| `per_ad` | $500/ad | occurrencesPerMonth | flatRate × occurrences |
| `per_spot` | $100/spot | occurrencesPerMonth | flatRate × occurrences |
| `per_post` | $75/post | occurrencesPerMonth | flatRate × occurrences |
| `flat` | $500/month | (none) | flatRate |
| `monthly` | $500/month | (none) | flatRate |
| `per_week` | $150/week | (none) | (flatRate × 52) / 365 × days |
| `cpm` | $15 CPM | impressionsPerMonth | (flatRate × impressions) / 1000 |
| `cpc` | $2 CPC | impressionsPerMonth | flatRate × clicks |
| `cpd` | $20 CPD | impressionsPerMonth | (flatRate × downloads) / 1000 |

### Quick Frequency Reference

| Frequency | Monthly Occurrences | Annual Occurrences |
|-----------|---------------------|-------------------|
| Daily | 30 | 365 |
| Daily (business) | 22 | 260 |
| Weekly | 4.33 | 52 |
| Bi-weekly | 2.17 | 26 |
| Monthly | 1 | 12 |
| Quarterly | 0.33 | 4 |

---

## Additional Resources

- **[PRICING_FORMULAS_GUIDE.md](./PRICING_FORMULAS_GUIDE.md)** - Complete formula reference
- **[PRICING_QUICK_REFERENCE.md](./PRICING_QUICK_REFERENCE.md)** - Quick lookup card
- **[PRICING_FLOWCHARTS.md](./PRICING_FLOWCHARTS.md)** - Decision trees

---

**Need Help?**

If you have a pricing scenario not covered here, check the formulas guide or create an issue with:
1. The pricing structure (JSON)
2. Expected behavior
3. Actual behavior
4. Any error messages

---

*Last Updated: November 2025*

