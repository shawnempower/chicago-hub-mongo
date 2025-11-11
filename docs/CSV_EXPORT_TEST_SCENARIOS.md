# CSV Export Test Scenarios

## Test Scenario 1: Event with 1x Pricing and Annual Frequency

**Setup:**
- Event: Annual Street Festival
- Pricing Tiers:
  - 1x: $10,000
  - 4x: $35,000 (equivalent to $8,750/event - 12.5% discount)
- Event Frequency: Annual (once per year)

**Expected Results:**
- CSV should show: `hubFlatRate: 10000`
- CSV should show: `hubPricingModel: flat` or `per_ad`
- CSV should show: `estimatedMonthlyRevenueHub: $833`
  
**Calculation:**
```
Per-insertion cost = $10,000 (using 1x tier)
Annual frequency = 0.083 occurrences/month
Monthly revenue = $10,000 × 0.083 = $833/month
```

---

## Test Scenario 2: Print Ad with Multiple Tiers and Weekly Publication

**Setup:**
- Print Publication: Community Newspaper
- Pricing Tiers:
  - 1x: $300 per ad
  - 4x: $1,000 (equivalent to $250/ad - 16.7% discount)
  - 13x: $3,000 (equivalent to $231/ad - 23% discount)
- Publication Frequency: Weekly

**Expected Results:**
- CSV should show: `hubFlatRate: 300`
- CSV should show: `estimatedMonthlyRevenueHub: $1,299`

**Calculation:**
```
Per-insertion cost = $300 (using 1x tier)
Weekly frequency = 4.33 issues/month
Monthly revenue = $300 × 4.33 = $1,299/month
```

---

## Test Scenario 3: Newsletter with Per-Send Pricing

**Setup:**
- Newsletter: Weekly Community Update
- Pricing: $200 per send (single tier, not tiered)
- Newsletter Frequency: Weekly

**Expected Results:**
- CSV should show: `hubPerSend: 200`
- CSV should show: `hubPricingModel: per_send`
- CSV should show: `estimatedMonthlyRevenueHub: $866`

**Calculation:**
```
Per-send cost = $200
Weekly sends = 4.33 sends/month
Monthly revenue = $200 × 4.33 = $866/month
```

---

## Test Scenario 4: Event with Bi-Annual Frequency

**Setup:**
- Event: Semi-Annual Trade Show
- Pricing:
  - 1x: $5,000
- Event Frequency: Bi-Annually (twice per year)

**Expected Results:**
- CSV should show: `hubFlatRate: 5000`
- CSV should show: `estimatedMonthlyRevenueHub: $835`

**Calculation:**
```
Per-event cost = $5,000 (1x tier)
Bi-annual frequency = 0.167 events/month (2 ÷ 12)
Monthly revenue = $5,000 × 0.167 = $835/month
```

---

## Test Scenario 5: Print Ad with Monthly Publication

**Setup:**
- Print Publication: Monthly Magazine
- Pricing Tiers:
  - 1x: $1,200
  - 12x: $12,000 (equivalent to $1,000/ad - 16.7% discount)
- Publication Frequency: Monthly

**Expected Results:**
- CSV should show: `hubFlatRate: 1200`
- CSV should show: `estimatedMonthlyRevenueHub: $1,200`

**Calculation:**
```
Per-insertion cost = $1,200 (using 1x tier)
Monthly frequency = 1 issue/month
Monthly revenue = $1,200 × 1 = $1,200/month
```

---

## Test Scenario 6: Legacy Print Pricing Format

**Setup:**
- Print Publication: Weekly Paper
- Pricing (legacy format):
  - oneTime: $400
  - fourTimes: $1,400
  - thirteenTimes: $4,200
- Publication Frequency: Weekly

**Expected Results:**
- CSV should show: `hubFlatRate: 400`
- CSV should show: `estimatedMonthlyRevenueHub: $1,732`
- CSV notes field should show: `1x: $400 | 4x: $1,400 | 13x: $4,200`

**Calculation:**
```
Per-insertion cost = $400 (oneTime/1x tier)
Weekly frequency = 4.33 issues/month
Monthly revenue = $400 × 4.33 = $1,732/month
```

---

## Verification Steps

For each test scenario:

1. **Export CSV from Hub Central**
   - Navigate to Hub Dashboard
   - Click "Export Inventory" button
   - Open downloaded CSV file

2. **Verify Pricing Display**
   - Check `hubPricingModel` column
   - Check `hubFlatRate` column (should show 1x tier price)
   - Check `hubDiscount` column if applicable

3. **Verify Monthly Revenue**
   - Check `estimatedMonthlyRevenueHub` column
   - Calculate expected value: 1x price × frequency multiplier
   - Verify CSV value matches expected calculation

4. **Compare with Dashboard**
   - Check if CSV revenue matches dashboard display
   - Both should use same 1x tier logic

---

## Common Issues to Watch For

1. **Using wrong tier**: If a 4x or 13x tier price appears in CSV instead of 1x
2. **Missing frequency multiplier**: If monthly revenue equals 1x price (didn't multiply by frequency)
3. **Zero revenue**: If pricing tier wasn't parsed correctly
4. **Inconsistent with dashboard**: If CSV shows different revenue than dashboard stats

---

## Success Criteria

✅ All pricing exports use 1x (lowest) tier  
✅ Monthly revenue = 1x price × frequency multiplier  
✅ CSV values match dashboard calculations  
✅ Works for all channel types (print, events, newsletters, etc.)  
✅ Handles both new tier format and legacy pricing format

