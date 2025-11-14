# Campaign Budget Allocation Algorithm - Implementation Summary

## What We Built 🎯

A sophisticated, multi-layered budget allocation system that ensures fair distribution of advertising spend across Chicago's media ecosystem while supporting Press Forward principles.

---

## Core Components

### 1. **Hard Constraints** (Immutable Rules)
```
✓ Minimum per publication: $500
✓ Maximum per publication: 25% of budget or $10K (whichever larger)
✓ No single publication > 25% of total budget
✓ No more than 3 publications at 70% of budget
✓ Target: Budget ÷ $2,500 = minimum publications
```

**Example: $50,000 Budget**
- Min: $500/pub
- Max: $12,500/pub
- Target pubs: 20
- Example: 20 pubs × $500 min = $10K reserved, $40K distributed

### 2. **Distribution Algorithm**

#### Step 1: Reserve Minimums
```
Reserved = Target_Pubs × $500
```

#### Step 2: Calculate Available Budget
```
Available = Total_Budget - Reserved
```

#### Step 3: Weight-Based Distribution
```
Weight_Score = (Audience_Size × 0.4) + (Channel_Diversity × 0.3) + (Press_Forward_Value × 0.3)

Per_Pub_Allocation = (Publication_Weight ÷ Total_Weight) × Available_Budget

Final_Allocation = $500 + Per_Pub_Allocation
```

#### Step 4: Constraint Validation
- ✓ Every pub between $500-$MAX
- ✓ No pub > 25% of total
- ✓ Top 3 < 70% of total
- ✓ Minimum publication count met

### 3. **Implementation Layers**

#### Layer 1: LLM Prompt Constraints
- Clear constraint definitions
- Step-by-step algorithm
- Required validation before response

**File**: `server/campaignLLMService.ts` (Lines 357-393)

#### Layer 2: Backend Validation
- Parses LLM response
- Checks all constraints
- Generates detailed violations report

**File**: `server/campaignLLMService.ts` (Lines 490-530)

#### Layer 3: Warning Generation
- Combines LLM warnings + validation findings
- Provides actionable guidance
- Tracks all violations for user review

**File**: `server/campaignLLMService.ts` (Lines 571-575)

---

## Key Files Modified

### Backend Services
```
server/campaignLLMService.ts
├─ buildPrompt(): Enhanced with budget constraints
├─ validateBudgetConstraints(): New validation function
└─ transformToAnalysisResponse(): Integrated validation

server/index.ts
└─ POST /api/campaigns/analyze: Uses LLM service with validation

```

### Frontend Integration
```
src/pages/CampaignBuilder.tsx
└─ Reviews constraint violations before campaign save

src/hooks/useCampaigns.ts
└─ Displays warnings prominently to user
```

### Documentation
```
docs/CAMPAIGN_BUDGET_ALLOCATION_ALGORITHM.md
└─ Complete algorithm guide with examples

docs/CAMPAIGN_BUDGET_ALGORITHM_QUICK_REFERENCE.md
└─ Quick reference for operators

BUDGET_ALGORITHM_TEST_RESULTS.md
└─ Test results and recommendations
```

---

## How It Works in Practice

### User Initiates Campaign
```
User: $50,000 budget, 6 months, brand awareness
```

### System Calculates Targets
```
Target publications = 50,000 ÷ 2,500 = 20 pubs
Min per pub = $500
Max per pub = $12,500 (25% of 50k)
Reserved = 20 × $500 = $10,000
Available = $50,000 - $10,000 = $40,000
```

### LLM Analyzes & Suggests
```
LLM selects publications using weighted scoring:
- Audience size (40%): Chicago Sun-Times, Tribune get weight
- Channel diversity (30%): Multi-channel outlets preferred
- Press Forward value (30%): Small community papers boosted

Returns allocation for 20 publications
```

### Backend Validates
```
For each publication:
  ✓ Is it $500-$12,500? If not, flag
  ✓ Is largest pub ≤25%? If not, flag
  ✓ Are top 3 ≤70%? If not, flag
  ✓ Do we have ≥20 pubs? If not, flag

Combines all violations into warnings
```

### User Reviews Results
```
Campaign Overview:
✓ 20 publications selected
✓ Budget: $50,000 perfectly allocated
✓ Largest: Chicago Sun-Times at 12% (under 25% cap)
✓ Top 3 total: 42% (under 70% cap)
✓ Channel mix: web (60%), print (25%), newsletter (15%)

⚠️ Warnings: (if any violations detected)
  - "Auto-corrected: Publication X reduced to max"
```

### Campaign Saved
```
{
  status: "draft",
  budgetAllocation: {
    totalBudget: 50000,
    publications: [{name, allocation, details}, ...],
    constraints: {
      minPerPub: 500,
      maxPerPub: 12500,
      maxPercentage: 25,
      topThreeMax: 70,
      minPublications: 20
    }
  }
}
```

---

## Current Status ✅

### What's Working
- ✅ Budget constraint definitions in prompt
- ✅ LLM receives clear algorithm instructions
- ✅ Validation layer catches all violations
- ✅ Warning generation provides feedback
- ✅ UI displays warnings to users
- ✅ Campaign list shows all allocations
- ✅ Database stores everything correctly

### What Needs Refinement ⚠️
- ⚠️ LLM sometimes exceeds max per publication
- ⚠️ Under-allocates publication count sometimes
- ⚠️ Needs post-processing rebalancing logic

---

## Performance Test Results

### Test: $50,000 Budget / 6 Months
```
Expected:
├─ 20 publications
├─ $500-$12,500 per publication
└─ All constraints met

Actual (Latest Run):
├─ 10 publications (50% of target)
├─ 8/10 within min/max range
├─ 1 violation: Top 3 at 83.7% (limit 70%)
└─ Good: Excellent performance metrics (95% confidence)
```

**Analysis**: Algorithm working, needs:
1. Stricter LLM instructions for publication count
2. Auto-correction layer for constraint violations
3. Better weighting to reduce concentration

---

## Configuration Parameters

```typescript
// In campaignLLMService.ts

// Minimum spend per publication
BUDGET_MIN_PER_PUBLICATION = 500

// Maximum percentage (25%) or dollar amount ($10K)
BUDGET_MAX_PERCENTAGE = 0.25
BUDGET_MAX_FLAT = 10000

// Concentration limits
MAX_CONCENTRATION_SINGLE_PUB = 0.25  // 25%
MAX_CONCENTRATION_TOP_THREE = 0.70   // 70%

// Publication count target
TARGET_PUB_RATIO = 2500  // Budget ÷ $2,500

// Weight distribution
AUDIENCE_WEIGHT = 0.4
DIVERSITY_WEIGHT = 0.3
PRESS_FORWARD_WEIGHT = 0.3
```

---

## Future Enhancements

### Phase 1: Auto-Correction (Recommended)
- Post-process LLM response
- Cap over-allocated publications
- Redistribute surplus
- Mark as "auto-corrected"

### Phase 2: Dynamic Configuration
- Adjust divisor by market size
- Different constraints for different hub sizes
- Geography-based weighting

### Phase 3: Learning & Optimization
- Track campaign performance
- Learn which allocations work best
- Adjust Press Forward weighting over time
- A/B test different distributions

### Phase 4: Advanced Constraints
- Geographic diversity requirements
- Demographic targeting
- Channel balance enforcement
- Underutilized outlet prioritization

---

## Usage Examples

### Example 1: Small Budget ($5,000)
```
Target Pubs: 5,000 ÷ 2,500 = 2 minimum
Min/Max: $500 - $10,000 per pub
Reserved: 2 × $500 = $1,000
Available: $4,000

Result: 2 publications @ ~$2,500 each
```

### Example 2: Medium Budget ($50,000)
```
Target Pubs: 50,000 ÷ 2,500 = 20 minimum
Min/Max: $500 - $12,500 per pub
Reserved: 20 × $500 = $10,000
Available: $40,000

Result: 20 publications @ $500-$2,500 each
```

### Example 3: Large Budget ($200,000)
```
Target Pubs: 200,000 ÷ 2,500 = 80 minimum
Min/Max: $500 - $50,000 per pub
Reserved: 80 × $500 = $40,000
Available: $160,000

Result: 80+ publications @ $500-$2,500 each
Excellent ecosystem support!
```

---

## Monitoring & Debugging

### Key Metrics to Track
- Average publications per campaign
- Concentration (% in top 3)
- Average allocation per publication
- Constraint violation rate
- User satisfaction with diversity

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Under-allocating publications | LLM being conservative | Stricter min count requirement |
| High concentration | Popular outlets attractive | Reduce max per pub further |
| Too many small allocs | Spreading too thin | Increase min per pub |
| Over budget | High-value inventory | Cap better in prompt |

---

## Team Next Steps

1. **Short Term** (This Sprint)
   - [ ] Review test results
   - [ ] Get feedback on current behavior
   - [ ] Decide on auto-correction implementation

2. **Medium Term** (Next Sprint)
   - [ ] Implement auto-correction layer
   - [ ] Add UI warnings prominently
   - [ ] Test with real campaign data

3. **Long Term** (Future)
   - [ ] Learning & optimization
   - [ ] Dynamic configuration
   - [ ] Advanced constraints

---

## Questions for the Team

1. **Should we auto-correct violations or require user intervention?**
   - Current: Warnings only
   - Option: Auto-correct, show what was changed

2. **Is $2,500 the right divisor for publication count?**
   - Could be $2,000 (20 pubs per $50K) or $3,000 (17 pubs per $50K)
   - Suggest based on ecosystem feedback

3. **Should min/$500 be configurable per hub?**
   - Chicago might support $500, small market might need $250

4. **How important is Press Forward weighting?**
   - Currently 30% of allocation
   - Could be 40% or 50% for stronger emphasis

5. **Should we hard-limit publications by availability?**
   - If only 10 publications have inventory, should we be OK with 10?

---

## Documentation References

- **Full Algorithm**: `docs/CAMPAIGN_BUDGET_ALLOCATION_ALGORITHM.md`
- **Quick Reference**: `docs/CAMPAIGN_BUDGET_ALGORITHM_QUICK_REFERENCE.md`
- **Test Results**: `BUDGET_ALGORITHM_TEST_RESULTS.md`
- **Test Script**: `test-campaign-with-auth.ts`



