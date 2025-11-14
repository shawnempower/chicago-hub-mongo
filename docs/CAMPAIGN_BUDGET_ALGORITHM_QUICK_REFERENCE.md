# Campaign Budget Algorithm - Quick Reference

## The Constraints (Enforced by LLM)

### 1. Minimum: $500 per publication
- Ensures every included publication gets meaningful support
- Prevents wasting time on token gestures

### 2. Maximum: 25% of total budget per publication OR $10,000 (whichever is larger)
```
Max = MAX(10000, Budget × 0.25)
```
- Prevents budget concentration in 1-2 outlets
- Example: $50K budget → max $12,500 per pub

### 3. Portfolio Constraints
- ✅ No single publication > 25% of total
- ✅ No more than 3 publications = 70% of budget

### 4. Publication Count Target
```
Target = Budget ÷ $2,500
```
- $20K → min 8 pubs
- $50K → min 20 pubs
- $100K → min 40 pubs

## The Algorithm (Executed by LLM)

### Step 1: Reserve Minimums
```
Reserved = Count × $500
```
Every selected publication guaranteed $500 baseline

### Step 2: Calculate Available
```
Available = Total Budget - Reserved
```

### Step 3: Weight & Distribute
```
Weight Score = (Audience × 0.4) + (Diversity × 0.3) + (PressForward × 0.3)

Per-Pub Allocation = (Weight ÷ Total Weight) × Available Budget
Final = $500 + Per-Pub Allocation
```

### Step 4: Validate
- [ ] Each pub: $500 - MAX
- [ ] None > 25% of total
- [ ] Top 3 < 70% of total
- [ ] Count ≥ Target

### Step 5: Warn
Report any violations

## Example: $30,000 / 6 months

```
Per-Month Budget: $5,000
Target Publications: 30k ÷ 2,500 = 12 pubs
Max per Publication: MAX(10k, 30k × 0.25) = $10,000
Reserved: 12 × $500 = $6,000
Available: $30,000 - $6,000 = $24,000

Distribution (with example weights):
┌─ Chicago Sun-Times ──────────────┐
│ Weight: 850 (11.8% of total)    │
│ Allocated: $2,832               │
│ Total: $3,332 (11.1% of budget) │
└─────────────────────────────────┘

┌─ Block Club Chicago ──────────────┐
│ Weight: 420 (5.8% of total)     │
│ Allocated: $1,392               │
│ Total: $1,892 (6.3% of budget)  │
└──────────────────────────────────┘

[10 more publications with similar calculations...]

Final Check:
✓ Largest: $3,332 (11.1% < 25% cap)
✓ Top 3: $7,116 (23.7% < 70% cap)
✓ 12 publications (= target)
✓ All between $500-$10,000
```

## In the LLM Prompt

The constraints are explicitly stated:

```markdown
BUDGET ALLOCATION CONSTRAINTS (REQUIRED FOR ALL CAMPAIGNS):
⚠️ CRITICAL - These constraints MUST be enforced:
- MINIMUM per publication: $500
- MAXIMUM per publication: $[MAX(10k, 25%)]
- No single publication >25% of total budget
- No more than 3 publications represent 70% of total
- Target count: [Budget÷$2,500] publications minimum

BUDGET DISTRIBUTION ALGORITHM:
1️⃣ Start by allocating $500 minimum to each publication
2️⃣ Calculate remaining budget
3️⃣ Distribute remaining fairly based on:
   - Audience size (40%)
   - Channel diversity (30%)
   - Press Forward value (30%)
4️⃣ CONSTRAINT CHECK:
   - Verify: $500 ≤ each pub ≤ MAX
   - Verify: max(any pub) ≤ 25% total
   - Add warnings if violated
```

## Why This Matters

### Without Constraints
- Big outlets only (~3-5 publications)
- Small outlets excluded
- Budget concentrated
- Ecosystem suffering

### With Constraints
- Diverse selection (10-40+ publications)
- All outlets get meaningful support
- Budget spread fairly
- Ecosystem thrives

## Configuration (can be tuned)

```typescript
// In environment or LLM config:
BUDGET_MIN_PER_PUBLICATION = 500       // Minimum per pub
BUDGET_MAX_PERCENTAGE = 0.25           // 25% max
CONCENTRATION_RATIO = 3 / 0.70         // Max 3 pubs at 70%
TARGET_PUBLICATION_RATIO = 2500        // Budget ÷ $2,500
```

## Testing the Algorithm

### Test Case 1: Small Budget ($5,000)
```
Reserved: 2 × $500 = $1,000
Available: $5,000 - $1,000 = $4,000
Max per pub: MAX($10k, 25%) = $10k
Result: 2 pubs get $2,500 each
Status: ✓ PASS
```

### Test Case 2: Mid Budget ($50,000)
```
Reserved: 20 × $500 = $10,000
Available: $50,000 - $10,000 = $40,000
Max per pub: $12,500 (25% cap)
Target: 20 publications
Result: Budget distributed across 20 pubs
Largest: ~$5-6K (10-12% each)
Status: ✓ PASS
```

### Test Case 3: Large Budget ($200,000)
```
Reserved: 80 × $500 = $40,000
Available: $200k - $40k = $160k
Max per pub: $50,000 (25% cap)
Target: 80 publications
Result: Budget distributed across 80 pubs
Largest: ~$2-3K each (1-2%)
Ecosystem Impact: 🌟 Excellent (all outlets supported)
Status: ✓ PASS
```

## Monitoring Campaigns

When reviewing a campaign's budget allocation:

1. ✅ **Check Reserve**: `Count × $500` reasonable?
2. ✅ **Check Distribution**: Budget spread across all pubs?
3. ✅ **Check Constraints**: Any violations in warnings?
4. ✅ **Check Diversity**: Multiple channels? Multiple geographies?
5. ✅ **Check Press Forward**: Are small outlets included?

## Warnings to Watch For

| Warning | Concern | Action |
|---------|---------|--------|
| "Only 2 publications selected" | Too narrow | Add more outlets |
| "Publication XYZ = 40% of budget" | Concentration | Redistribute |
| "Top 3 pubs = 75% of budget" | Ecosystem risk | Add more small pubs |
| "All large outlets, no small pubs" | Imbalance | Include community outlets |

## Next Steps

Once the LLM returns a campaign:
1. Check warnings array for violations
2. Review publication count vs. target
3. Verify Press Forward value (small outlets included?)
4. Check concentration metrics
5. Approve or request adjustments


