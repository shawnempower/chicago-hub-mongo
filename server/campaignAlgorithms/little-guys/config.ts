/**
 * Little Guys Algorithm
 * 
 * Focus exclusively on smaller, independent publications that often get overlooked.
 * Prioritizes community-focused outlets with smaller audiences but high engagement.
 */

import { AlgorithmConfig } from '../types';
import { defaultLLMConfig } from '../../campaignLLMConfig';

export const LittleGuysAlgorithm: AlgorithmConfig = {
  id: 'little-guys',
  name: 'The Little Guys',
  description: 'Champion smaller, independent publications that serve tight-knit communities. Perfect for hyper-local campaigns, supporting emerging outlets, and reaching highly engaged niche audiences with authentic voices.',
  icon: '🏘️',
  
  llmConfig: {
    ...defaultLLMConfig,
    pressForward: {
      enforceAllOutlets: false,
      prioritizeSmallOutlets: true,       // STRONGLY prioritize small outlets
      allowBudgetExceeding: false,        // Stay within budget
      maxBudgetExceedPercent: 10          // Small flex if needed
    },
    selection: {
      minPublications: 8,                 // Focus on variety of small outlets
      maxPublications: 25,
      minChannelDiversity: 2,
      preferredFrequencyTier: 'auto'
    }
  },
  
  constraints: {
    minPublications: 8,                    // Spread across multiple small outlets
    maxPublications: 25,
    minBudget: 4000,                       // Lower minimum to support small campaigns
    strictBudget: true,                    // Respect budget limits
    maxBudgetExceedPercent: 10,
    webInventoryAvailability: 0.30         // 30% of web impressions available per campaign
  },
  
  scoring: {
    reachWeight: 0.15,                     // De-emphasize large reach
    diversityWeight: 0.30,                 // High diversity priority
    costWeight: 0.25,                      // Balance cost efficiency
    communityWeight: 0.30                  // Highest priority: community impact
  },
  
  promptInstructions: `
🏘️ THE LITTLE GUYS ALGORITHM

📢 CORE MISSION:
Champion the smaller, independent, community-focused publications that are the backbone of local 
journalism but often overlooked by traditional campaigns. These are the emerging outlets, 
neighborhood papers, cultural publications, and grassroots media serving tight-knit communities.

🎯 TARGET PUBLICATIONS:
- **Small audience size**: Typically under 50,000 monthly reach
- **Independent/emerging**: Newer outlets, volunteer-run, community-focused
- **Niche/hyperlocal**: Serving specific neighborhoods, cultures, or communities
- **High engagement**: Smaller but deeply connected audiences
- **Underserved communities**: Publications serving communities often ignored by mainstream media

🚫 EXPLICITLY EXCLUDE:
- Large established outlets with >100,000 monthly reach
- Major metro newspapers or broadcast networks
- Well-funded publications with large advertising teams
- Publications with audiences over 75,000

✅ SELECTION CRITERIA (in priority order):
1. **Community Focus**: Does it serve a specific neighborhood or community?
2. **Size**: Smaller is better - prioritize outlets with <50K reach
3. **Independence**: Prefer independent/volunteer-run over corporate-backed
4. **Authenticity**: Grassroots, community-driven content
5. **Need**: Emerging outlets that benefit most from support
6. **Engagement**: Quality over quantity - look for loyal audiences

💰 BUDGET APPROACH:
- Allocate fairly across 8-25 small publications
- Minimum $300 per publication (many small outlets have lower minimums)
- Maximum $3,000 per publication (prevent concentration in larger outlets)
- If budget allows, include MORE small outlets rather than spending more per outlet
- Stay within budget - no exceptions

📊 PUBLICATION MIX TARGETS:
- 80%+ should be publications with <50K monthly reach
- 60%+ should be neighborhood/community-specific
- Include diverse communities (ethnic, cultural, geographic)
- Mix of print, digital, newsletter, and community radio
- Avoid selecting the same publication type repeatedly

🎨 CHANNEL PREFERENCES:
1. Community newsletters (highly engaged)
2. Neighborhood newspapers (hyperlocal)
3. Independent podcasts/radio (authentic voices)
4. Cultural/ethnic publications (underserved communities)
5. Digital-only outlets (emerging media)

⚠️ MANDATORY CONSTRAINTS:
- Minimum 8 publications, maximum 25
- Each publication receives $300-$3,000
- At least 80% of selections must be small outlets (<50K reach)
- Budget must NOT exceed the stated limit
- Include at least 2 different channels
- Geographic diversity across neighborhoods
- **WEB INVENTORY AVAILABILITY**: Only 30% of monthly web impressions are available for campaigns
  (e.g., if a publication has 100,000 monthly impressions, only 30,000 are available for this campaign)

💡 SELECTION STRATEGY:
1. Filter OUT any publication with >75K monthly reach
2. Prioritize neighborhood-specific and cultural publications
3. Look for "emerging," "independent," "community-run" in descriptions
4. Spread budget across MANY small outlets
5. Include underserved communities (e.g., specific ethnic groups, neighborhoods)
6. Balance between print, digital, audio, and newsletter channels
7. Verify total cost stays within budget before finalizing

🌟 GOAL:
Create a campaign that uplifts the "little guys" - the essential community publications that provide 
the most authentic, hyperlocal coverage but often struggle to attract advertisers. Your selection 
should help sustain these vital community voices.
`
};

