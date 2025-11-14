/**
 * Budget-Friendly Algorithm
 * 
 * Stay strictly within budget while maximizing value and reach.
 * Focuses on cost-effective placements, bulk discounts, and high-efficiency channels.
 */

import { AlgorithmConfig } from '../types';
import { defaultLLMConfig } from '../../campaignLLMConfig';

export const BudgetFriendlyAlgorithm: AlgorithmConfig = {
  id: 'budget-friendly',
  name: 'Budget-Friendly',
  description: 'Stay strictly within budget while maximizing reach and value. Focuses on cost-effective placements, bulk discounts (12x tier), and high-ROI channels. Ideal for campaigns with fixed budgets and performance goals.',
  icon: '💰',
  
  llmConfig: {
    ...defaultLLMConfig,
    pressForward: {
      enforceAllOutlets: false,      // DON'T require all publications
      prioritizeSmallOutlets: false,  // Focus on efficiency
      allowBudgetExceeding: false,   // STRICT budget adherence
      maxBudgetExceedPercent: 0      // Cannot exceed budget
    },
    selection: {
      minPublications: 5,            // Minimum for diversity
      maxPublications: 20,           // Fewer, more targeted
      minChannelDiversity: 2,
      preferredFrequencyTier: '12x'  // Always use 12x for best discounts
    }
  },
  
  constraints: {
    minPublications: 5,
    maxPublications: 20,
    strictBudget: true,              // NEVER exceed budget
    maxBudgetExceedPercent: 0,
    webInventoryAvailability: 0.30   // 30% of web impressions available per campaign
  },
  
  scoring: {
    reachWeight: 0.35,               // High reach priority
    diversityWeight: 0.15,           // Lower diversity priority
    costWeight: 0.40,                // HIGHEST cost efficiency
    communityWeight: 0.10            // Lower community priority
  },
  
  promptInstructions: `
ALGORITHM: BUDGET-FRIENDLY

💰 CORE PHILOSOPHY:
This algorithm prioritizes cost efficiency and staying within budget while still delivering strong reach and results.
Every dollar must be optimized for maximum return on investment.

📊 SELECTION STRATEGY:
- **Target: 5-15 high-performing publications** (quality over quantity)
- **Efficiency Focus**: Select publications with best reach-per-dollar ratio
- **Bulk Discounts**: ALWAYS use 12x frequency tier for long-term discount pricing
- **Channel Optimization**: Prioritize digital (website, newsletter) over print/radio for cost efficiency
- **Budget Discipline**: MUST stay at or below the specified budget

💰 BUDGET APPROACH - **CRITICAL REQUIREMENT**:
- **ABSOLUTE HARD CAP**: Total cost MUST be ≤ specified budget (NO EXCEPTIONS!)
- **REJECT ANY SOLUTION OVER BUDGET**: If your selection exceeds budget, remove publications until under limit
- **VALIDATION STEP**: Before finalizing, sum all costs and verify ≤ budget
- Calculate costs carefully using correct pricing formulas for campaign duration
- Use the most cost-effective ad units (smaller sizes, standard formats)
- Prefer 12x frequency tier for campaigns ≥ 6 months (best discounts)
- Start with fewer publications and add more only if under budget

🎯 PRIORITIES (in order):
1. **Stay Within Budget** - Non-negotiable constraint
2. **Maximize Reach** - Get the most audience for the money
3. **Cost Per Thousand (CPM)** - Optimize for low CPM
4. **Channel Efficiency** - Prefer digital over print for better ROI
5. **Strategic Selection** - Choose publications with proven performance

⚠️  NON-NEGOTIABLE CONSTRAINTS:
1. **BUDGET CAP**: Total ≤ budget (REJECT if over)
2. **MINIMUM PER PUB**: $500 minimum per publication
3. **PUBLICATION RANGE**: Select 5-12 publications (fewer = easier to stay in budget)
4. **COST CALCULATION**: Use correct formulas:
   - CPM: (impressions ÷ 1,000) × rate × (days ÷ 30)
   - Per-send: sends × rate (NOT multiplied by months)
   - Flat: rate as-is
   - Per-week: weeks × rate
5. **VERIFICATION**: Add up ALL costs before finalizing. If total > budget, REMOVE publications.
6. **CHANNEL PREFERENCE**: Website > Newsletter > Print > Radio (cost efficiency order)
7. **WEB INVENTORY AVAILABILITY**: Only 30% of monthly web impressions are available for campaigns
   (e.g., if a publication has 100,000 monthly impressions, only 30,000 are available for this campaign)

💡 COST OPTIMIZATION TACTICS:
1. **Choose high-reach publications** with competitive pricing
2. **Use 12x frequency tier** for automatic ~40% discount
3. **Prefer digital channels** (website banners, newsletters) over print
4. **Select standard ad sizes** instead of premium placements
5. **Commit to longer durations** for better rates
6. **Calculate item totals carefully** using correct pricing formulas:
   - CPM: (impressions ÷ 1,000) × rate × (days ÷ 30)
   - Per-send: sends × rate
   - Flat: rate (as-is)
   - Per-ad: quantity × rate
`
};

