/**
 * All-Inclusive Algorithm
 * 
 * Press Forward optimized: Include all available publications to support
 * the entire news ecosystem. Prioritizes diversity and community impact.
 */

import { AlgorithmConfig } from '../types';
import { defaultLLMConfig } from '../../campaignLLMConfig';

export const AllInclusiveAlgorithm: AlgorithmConfig = {
  id: 'all-inclusive',
  name: 'All-Inclusive (Press Forward)',
  description: 'Include all available publications to support the entire local news ecosystem. Prioritizes diversity, community impact, and reaching underserved communities over pure efficiency metrics. Ideal for ecosystem-building campaigns.',
  icon: '🌍',
  
  llmConfig: {
    ...defaultLLMConfig,
    pressForward: {
      enforceAllOutlets: true,      // MUST include all publications
      prioritizeSmallOutlets: true,  // Give preference to smaller pubs
      allowBudgetExceeding: true,    // Can suggest going over budget
      maxBudgetExceedPercent: 15     // Up to 15% over budget (MAXIMUM - NOT MORE)
    },
    selection: {
      minPublications: 5,
      maxPublications: 100,           // No real upper limit
      minChannelDiversity: 2,
      preferredFrequencyTier: 'auto'
    }
  },
  
  constraints: {
    minPublications: undefined,      // Try to include ALL
    maxPublications: 100,
    minBudget: 5000,
    strictBudget: false,             // Allow budget flexibility
    maxBudgetExceedPercent: 15,      // MAXIMUM 15% over budget - strictly enforced
    webInventoryAvailability: 0.30   // 30% of web impressions available per campaign
  },
  
  scoring: {
    reachWeight: 0.25,               // Balanced reach
    diversityWeight: 0.35,           // High diversity priority
    costWeight: 0.15,                // Low cost priority
    communityWeight: 0.25            // High community impact
  },
  
  promptInstructions: `
ALGORITHM: ALL-INCLUSIVE (PRESS FORWARD)

🌍 CORE PHILOSOPHY:
This algorithm prioritizes ecosystem health and community support over traditional efficiency metrics.
The goal is to include ALL available publications to strengthen the entire local news landscape.

📊 SELECTION STRATEGY:
- **Target: 60-85% of all available publications** (aim for maximum inclusion)
- **Diversity Focus**: Mix of large established outlets AND small community publications
- **Geographic Spread**: Cover all neighborhoods and communities
- **Channel Mix**: Use multiple channels per publication when appropriate
- **Budget Flexibility**: Can go UP TO 15% over budget MAXIMUM - ABSOLUTELY NO MORE

💰 BUDGET APPROACH:
- Spread budget across MANY outlets rather than concentrating in few
- If under budget: ADD MORE publications with smaller units
- If over budget: Use cost-efficient tiers (12x discounts) and smaller units, but KEEP variety
- Minimum $500 per publication to provide meaningful support
- **CRITICAL**: Total campaign cost MUST NOT exceed budget × 1.15 (15% maximum overage)

🎯 PRIORITIES (in order):
1. **Ecosystem Diversity** - Include variety of publication sizes and types
2. **Community Impact** - Prioritize outlets serving underrepresented communities
3. **Geographic Coverage** - Reach all areas of the city
4. **Audience Reach** - Maximize overall reach while maintaining diversity
5. **Cost Efficiency** - Consider but don't optimize for

⚠️  CONSTRAINTS:
- Every publication must receive at least $500
- Try to use multiple channels where appropriate
- Select appropriate frequency tiers (12x for long campaigns, 6x for medium, 1x for short)
- Balance between website, newsletter, print, and radio/podcast channels
- **WEB INVENTORY AVAILABILITY**: Only 30% of monthly web impressions are available for campaigns
  (e.g., if a publication has 100,000 monthly impressions, only 30,000 are available for this campaign)
`
};

