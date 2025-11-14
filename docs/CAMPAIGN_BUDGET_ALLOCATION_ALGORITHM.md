# Campaign Budget Allocation Algorithm

## Overview

The Campaign Budget Allocation Algorithm ensures fair, diverse budget distribution across multiple publications while preventing concentration of spend in a few dominant outlets. This is critical to the **Press Forward mission** of supporting a healthy news ecosystem.

## Core Constraints

### 1. **Minimum per Publication: $500**
- **Why**: Every publication included in a campaign should receive meaningful support
- **Prevents**: Wasting time on token gestures that don't help publications
- **Effect**: Forces selective inclusion - only include publications you truly want to support

### 2. **Maximum per Publication (Dynamic)**
```
Max per publication = MAX($10,000, Budget × 0.25)

Examples:
- $20,000 budget → max $5,000 per pub (25%)
- $50,000 budget → max $12,500 per pub (25%)
- $5,000 budget → max $10,000 per pub (min cap)
```
- **Why**: Prevents concentration of budget in 1-2 large outlets
- **Ensures**: Diverse ecosystem participation
- **Effect**: Forces selection of more publications

### 3. **Portfolio Concentration Cap**
- **No single publication > 25% of total budget**
- **No more than 3 publications representing > 70% of total budget**
- **Why**: Prevents ecosystem concentration around major outlets
- **Example**: On $50K budget
  - ✅ OK: Chi Sun-Times $9k (18%), Tribune $8k (16%), 10 small pubs $2.3k each
  - ❌ NOT OK: Chi Sun-Times $20k (40%), Tribune $15k (30%), rest split

### 4. **Publication Count Target**
```
Target Count = Budget ÷ $2,500

Examples:
- $5,000 budget → minimum 2 publications
- $50,000 budget → minimum 20 publications
- $100,000 budget → minimum 40 publications
```
- **Why**: Ensures ecosystem breadth
- **Flexibility**: This is a target, not a hard limit (can go lower if only few outlets serve market)

## Distribution Algorithm

### Step 1: Reserve Minimums
```
Reserve = Selected Publication Count × $500
```
Every included publication gets $500 baseline for essentials.

### Step 2: Calculate Available Budget
```
Available = Total Budget - Reserve
```

### Step 3: Allocate Available Budget
Distribute the remaining budget based on **weighted factors**:

```
Weight Score = (Audience Size × 0.4) + (Channel Diversity × 0.3) + (Press Forward Value × 0.3)

Individual Allocation = (Publication Weight ÷ Total Weight) × Available Budget
Final Allocation = $500 + Individual Allocation
```

**Weight Components:**

1. **Audience Size (40%)**
   - Larger audiences = more impressions/reach
   - Calculated from: monthly visitors, subscribers, circulation, listeners, followers
   - Normalized by channel type

2. **Channel Diversity (30%)**
   - Publications with multiple channels get bonus
   - E.g., outlet with website + newsletter + social gets higher score than website-only
   - Encourages multi-channel campaigns

3. **Press Forward Value (30%)**
   - Smaller outlets with similar quality get slight boost
   - Underrepresented communities get priority
   - Emerging/independent sources prioritized
   - **This is the heart of Press Forward philosophy**

### Step 4: Validate Constraints
After allocation, verify:
- ✅ $500 ≤ each publication total ≤ max
- ✅ No publication > 25% of budget
- ✅ If violated, adjust downward or remove lowest-performing publications

### Step 5: Generate Warnings
Report any constraint violations:
```json
{
  "warnings": [
    "Publication XYZ allocated $8,000 (16% of budget)",
    "Selected only 3 publications - recommend minimum 10 for $25k budget",
    "Concentration risk: Top 3 pubs = 62% of budget"
  ]
}
```

## Example: $50,000 Budget

### Setup
- **Total Budget**: $50,000 / 6 months = $8,333/month
- **Target Publications**: 50k ÷ 2,500 = 20 publications
- **Min per pub**: $500
- **Max per pub**: MAX($10k, $50k × 0.25) = $12,500
- **Reserve**: 20 × $500 = $10,000
- **Available**: $50,000 - $10,000 = $40,000

### Allocation Example
Assume weighted scores calculated:

| Publication | Weight | % of Total | Allocation | Final Total |
|------------|--------|-----------|-----------|------------|
| Chicago Sun-Times | 850 | 12% | $4,800 | $5,300 |
| Tribune | 720 | 10% | $4,000 | $4,500 |
| Block Club Chicago | 420 | 5.8% | $2,320 | $2,820 |
| North Lawndale News | 180 | 2.5% | $1,000 | $1,500 |
| ... 16 more small pubs | 1,830 | 25.4% | $10,160 | $10,660 |
| **TOTAL** | **7,200** | **100%** | **$40,000** | **$50,000** |

### Constraint Check
- ✅ All publications $500-$12,500
- ✅ Largest = $5,300 (10.6% < 25% cap)
- ✅ Top 3 = $12,620 (25.2% < 70% cap)
- ✅ 20 publications (= target)

### Result
✅ **PASS**: Budget distributed across 20 outlets, supporting ecosystem health while maximizing reach.

## Implementation in LLM Prompt

The algorithm is embedded in the campaign analysis LLM prompt as **hard constraints**:

1. **Constraint Definition**: Clear min/max per publication
2. **Algorithm Description**: Step-by-step allocation process
3. **Validation Requirements**: Must check constraints and warn if violated
4. **Warnings Array**: Required to report any violations

The LLM is instructed to:
- ✅ Always calculate allocation using this algorithm
- ✅ Validate constraints before returning
- ✅ Add warnings for any violations
- ✅ Adjust selections if constraints can't be met
- ✅ Explain reasoning for publications selected

## Why This Matters for Press Forward

### Problem Without Constraints
- Large outlets dominate (easiest/biggest reach)
- Small outlets excluded (harder to serve, lower impressions)
- Money concentrates in 2-3 major publishers
- Ecosystem becomes dependent on giants
- Independent/community outlets starved

### Solution With Constraints
- Minimum spend forces inclusion of smaller outlets
- Maximum spend prevents domination
- Diversity target forces ecosystem participation
- Budget spreads across 10-40+ outlets
- Every outlet gets meaningful support
- Ecosystem becomes sustainable

## Configuration Parameters

These can be adjusted in environment or config:

```typescript
BUDGET_MIN_PER_PUBLICATION = 500  // Minimum
BUDGET_MAX_PERCENTAGE = 0.25      // 25% cap
CONCENTRATION_RATIO = 3/0.70      // Max 3 pubs at 70%
TARGET_PUBLICATION_RATIO = 2500   // Budget ÷ $2,500
```

## Debugging & Monitoring

When reviewing campaign allocations:

1. **Check Reserve**: `Count × $500` should be reasonable
2. **Check Distribution**: Available budget should spread across pubs
3. **Check Constraints**: No violations in warnings
4. **Check Diversity**: Multiple channels, geographies represented
5. **Check Press Forward Value**: Are small outlets included?

Example warnings to investigate:
- ⚠️ "Only 2 publications selected (recommend 10+)" → Too narrow
- ⚠️ "Publication XYZ = 35% of budget" → Concentration risk
- ⚠️ "All large outlets, no small pubs included" → Ecosystem imbalance

## Future Enhancements

1. **Dynamic Min/Max**: Adjust based on market size
   - Chicago metro vs. small town different economics
   
2. **Channel Weighting**: Prefer underrepresented channels
   - Boost podcast/streaming if under-utilized
   
3. **Geography Spread**: Ensure neighborhood diversity
   - Don't just serve downtown/wealthy areas
   
4. **Performance-Based**: Adjust based on prior campaigns
   - Outlets with better engagement get more
   
5. **Learning**: Track which allocations convert best
   - Refine weights over time


