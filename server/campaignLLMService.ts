/**
 * Campaign LLM Service
 * 
 * Uses OpenAI to intelligently select publication inventory based on campaign requirements
 * Follows Press Forward principles of ecosystem support
 */

import Anthropic from '@anthropic-ai/sdk';
import JSON5 from 'json5';
import { getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { 
  CampaignAnalysisRequest,
  CampaignAnalysisResponse,
  CampaignSelectedInventory
} from '../src/integrations/mongodb/campaignSchema';
import { HubPackagePublication, HubPackageInventoryItem } from '../src/integrations/mongodb/hubPackageSchema';
import { calculatePackageReach } from '../src/utils/reachCalculations';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('CampaignLLMService');
import { loadPreset, buildSystemPrompt, buildPromptInstructions, CampaignLLMConfig } from './campaignLLMConfig';
import { getAlgorithmMerged, getDefaultAlgorithm } from './campaignAlgorithms/registry';
import type { AlgorithmType, AlgorithmConfig } from './campaignAlgorithms/types';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load Anthropic client to allow dotenv to load first
let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

// Load LLM configuration (can be changed via environment variables)
let llmConfig: CampaignLLMConfig = loadPreset();

interface PublicationWithInventory {
  publicationId: number;
  publicationName: string;
  channels: {
    [channelName: string]: InventoryItem[];
  };
}

interface InventoryItem {
  name: string;
  path: string; // Path in publication document
  hubPrice: number;
  standardPrice?: number;
  pricingModel: string;
  frequency?: string;
  specifications?: any;
  audienceMetric?: {
    type: string;
    value: number;
  };
}

export class CampaignLLMService {
  
  /**
   * Reload configuration (useful for hot-reloading during development)
   */
  public reloadConfig(presetName?: string): CampaignLLMConfig {
    llmConfig = loadPreset(presetName);
    console.log('🔄 LLM Config reloaded:', {
      model: llmConfig.model.name,
      temperature: llmConfig.model.temperature,
      enforceAllOutlets: llmConfig.pressForward.enforceAllOutlets
    });
    return llmConfig;
  }

  /**
   * Get current configuration
   */
  public getConfig(): CampaignLLMConfig {
    return { ...llmConfig }; // Return copy to prevent external modification
  }

  /**
   * Update specific config values (for quick tweaks)
   */
  public updateConfig(updates: Partial<CampaignLLMConfig>): void {
    llmConfig = { ...llmConfig, ...updates };
    console.log('⚙️  LLM Config updated:', updates);
  }

  /**
   * Load the Campaign Intelligence Guide for system context
   */
  private loadIntelligenceGuide(): string {
    try {
      const guidePath = path.join(__dirname, '../docs/CAMPAIGN_INTELLIGENCE_GUIDE.md');
      return fs.readFileSync(guidePath, 'utf-8');
    } catch (error) {
      console.error('Error loading intelligence guide:', error);
      return ''; // Fallback to empty if file not found
    }
  }

  /**
   * Query all publications in a hub with their hub-priced inventory
   */
  private async getPublicationsWithInventory(
    hubId: string,
    requestedChannels?: string[],
    excludeChannels?: string[]
  ): Promise<PublicationWithInventory[]> {
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);

    // Query all publications in the hub
    const publications = await publicationsCollection.find({
      hubIds: hubId
    }).toArray();

    const publicationsWithInventory: PublicationWithInventory[] = [];

    for (const pub of publications) {
      const pubInventory: PublicationWithInventory = {
        publicationId: pub.publicationId,
        publicationName: pub.basicInfo?.publicationName || 'Unknown',
        channels: {}
      };

      // Define channel mappings
      const channelMappings = [
        { key: 'website', name: 'website', path: 'distributionChannels.website.advertisingOpportunities' },
        { key: 'print', name: 'print', path: 'distributionChannels.print', isArray: true },
        { key: 'newsletters', name: 'newsletter', path: 'distributionChannels.newsletters', isArray: true },
        { key: 'radioStations', name: 'radio', path: 'distributionChannels.radioStations', isArray: true },
        { key: 'podcasts', name: 'podcast', path: 'distributionChannels.podcasts', isArray: true },
        { key: 'events', name: 'events', path: 'distributionChannels.events', isArray: true },
        { key: 'streamingVideo', name: 'streaming', path: 'distributionChannels.streamingVideo', isArray: true },
        { key: 'socialMedia', name: 'social', path: 'distributionChannels.socialMedia', isArray: true }
      ];

      // Process each channel
      for (const mapping of channelMappings) {
        // Skip if channel is excluded
        if (excludeChannels && excludeChannels.includes(mapping.name)) {
          continue;
        }

        // Skip if specific channels requested and this isn't one
        if (requestedChannels && requestedChannels.length > 0 && !requestedChannels.includes(mapping.name)) {
          continue;
        }

        const channelData = pub.distributionChannels?.[mapping.key];
        if (!channelData) continue;

        const items: InventoryItem[] = [];

        // Handle array-based channels (print, newsletters, etc.)
        if (mapping.isArray && Array.isArray(channelData)) {
          channelData.forEach((channelItem: any, channelIdx: number) => {
            const opportunities = channelItem.advertisingOpportunities || [];
            opportunities.forEach((opp: any, oppIdx: number) => {
              if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
                const hubPricingForHub = opp.hubPricing.find((hp: any) => hp.hubId === hubId && hp.available);
                if (hubPricingForHub && hubPricingForHub.pricing) {
                  // Handle array of pricing tiers or single pricing object
                  const pricings = Array.isArray(hubPricingForHub.pricing) 
                    ? hubPricingForHub.pricing 
                    : [hubPricingForHub.pricing];

                  pricings.forEach((pricing: any, pricingIdx: number) => {
                    // Merge dimensions into specifications for print/other channels
                    const specifications = { ...opp.specifications };
                    if (opp.dimensions && !specifications.dimensions) {
                      specifications.dimensions = opp.dimensions;
                      console.log(`[Dimensions Fix] ✅ Added dimensions to ${opp.name}: ${opp.dimensions}`);
                    }
                    // Also include other print-specific fields
                    if (opp.adFormat && !specifications.adFormat) {
                      specifications.adFormat = opp.adFormat;
                    }
                    if (opp.color && !specifications.color) {
                      specifications.color = opp.color;
                    }
                    
                    const item: InventoryItem = {
                      name: opp.name || `${mapping.name} Ad`,
                      path: `distributionChannels.${mapping.key}[${channelIdx}].advertisingOpportunities[${oppIdx}]`,
                      hubPrice: pricing.flatRate || pricing.rate || pricing.perSpot || pricing.monthly || 0,
                      standardPrice: opp.pricing?.flatRate || opp.pricing?.rate,
                      pricingModel: pricing.pricingModel || 'flat',
                      frequency: pricing.frequency,
                      specifications,
                      audienceMetric: this.extractAudienceMetric(channelItem, mapping.name)
                    };
                    if (item.hubPrice > 0) {
                      items.push(item);
                    }
                  });
                }
              }
            });
          });
        } 
        // Handle website (non-array)
        else if (mapping.key === 'website' && channelData.advertisingOpportunities) {
          channelData.advertisingOpportunities.forEach((opp: any, oppIdx: number) => {
            if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
              const hubPricingForHub = opp.hubPricing.find((hp: any) => hp.hubId === hubId && hp.available);
              if (hubPricingForHub && hubPricingForHub.pricing) {
                const pricings = Array.isArray(hubPricingForHub.pricing) 
                  ? hubPricingForHub.pricing 
                  : [hubPricingForHub.pricing];

                pricings.forEach((pricing: any) => {
                  // Merge dimensions into specifications if present
                  const specifications = { ...opp.specifications };
                  if (opp.dimensions && !specifications.dimensions) {
                    specifications.dimensions = opp.dimensions;
                  }
                  
                  const item: InventoryItem = {
                    name: opp.name || 'Website Ad',
                    path: `distributionChannels.website.advertisingOpportunities[${oppIdx}]`,
                    hubPrice: pricing.flatRate || pricing.cpm || pricing.rate || 0,
                    standardPrice: opp.pricing?.flatRate || opp.pricing?.cpm,
                    pricingModel: pricing.pricingModel || opp.pricing?.pricingModel || 'flat',
                    frequency: pricing.frequency,
                    specifications,
                    audienceMetric: {
                      type: 'monthlyVisitors',
                      value: channelData.metrics?.monthlyVisitors || 0
                    }
                  };
                  if (item.hubPrice > 0) {
                    items.push(item);
                  }
                });
              }
            }
          });
        }

        if (items.length > 0) {
          pubInventory.channels[mapping.name] = items;
        }
      }

      // Only include publications that have at least some hub inventory
      if (Object.keys(pubInventory.channels).length > 0) {
        publicationsWithInventory.push(pubInventory);
      }
    }

    return publicationsWithInventory;
  }

  /**
   * Extract audience metric from channel data
   */
  private extractAudienceMetric(channelData: any, channelType: string): { type: string; value: number } | undefined {
    const metrics = channelData.metrics || {};
    
    switch (channelType) {
      case 'print':
        return { type: 'circulation', value: metrics.totalCirculation || metrics.circulation || 0 };
      case 'newsletter':
        return { type: 'subscribers', value: metrics.subscribers || 0 };
      case 'radio':
        return { type: 'weeklyListeners', value: metrics.weeklyReach || metrics.weeklyListeners || 0 };
      case 'podcast':
        return { type: 'monthlyDownloads', value: metrics.monthlyDownloads || metrics.averageDownloads || 0 };
      case 'events':
        return { type: 'attendance', value: channelData.averageAttendance || 0 };
      case 'streaming':
        return { type: 'monthlyViews', value: metrics.averageViewsPerMonth || metrics.monthlyViews || 0 };
      case 'social':
        return { type: 'followers', value: metrics.followers || 0 };
      default:
        return undefined;
    }
  }

  /**
   * Build prompt for OpenAI
   */
  private buildPrompt(
    request: CampaignAnalysisRequest,
    publications: PublicationWithInventory[],
    algorithm: AlgorithmConfig
  ): string {
    const { objectives, timeline, includeAllOutlets } = request;

    // Calculate duration
    const startDate = new Date(timeline.startDate);
    const endDate = new Date(timeline.endDate);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMonths = Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 30));

    const includeAllMessage = includeAllOutlets ? `

🌍 PRESS FORWARD ECOSYSTEM APPROACH 🌍

Goal: Support a BROAD, DIVERSE news ecosystem - not just the biggest outlets.

Target: Include ${Math.floor(publications.length * 0.6)}-${Math.ceil(publications.length * 0.85)} publications (60-85% of available)
Available: ${publications.length} publications total

Selection Philosophy:
✓ MIX of large established outlets AND small community publications
✓ DIVERSE channels (website, print, newsletter, radio, etc.)
✓ VARIED geographies and audience types within the target area
✓ Some VARIETY in your selections (not always the cheapest/largest)
✓ Balance reach AND ecosystem support

If you must choose between publications:
- Prefer: Small community publications that need support
- Include: Mix of established + emerging outlets
- Vary: Don't just pick the largest or cheapest - add diversity
- Consider: Which outlets serve underrepresented communities?

Budget Guidance:
- If under budget: ADD MORE publications (smaller units, diverse channels)
- If over budget: Use cost-efficient tiers (12x discounts) and smaller ad units
- Aim to spread the budget across MANY outlets rather than concentrating in few
` : '';

    // Calculate actual campaign duration from date range
    const campaignDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const campaignDurationWeeks = Math.ceil(campaignDurationDays / 7);
    const campaignDurationMonths = Math.ceil(campaignDurationDays / 30);

    const prompt = `You are an expert media buyer specializing in local news ecosystems and Press Forward principles.

${algorithm.promptInstructions}

${algorithm.id === 'proportional' ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 PROPORTIONAL ALGORITHM - BUDGET IS THE ONLY HARD CONSTRAINT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ THE ONE ABSOLUTE RULE: TOTAL ≤ $${objectives.budget.totalBudget.toLocaleString()}
   - maxBudgetExceedPercent = ${algorithm.constraints.maxBudgetExceedPercent || 0}%
   - Maximum allowed: $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}
   - EVERYTHING ELSE IS FLEXIBLE TO MEET THIS CONSTRAINT
   
🚫 YOUR RESPONSE WILL BE REJECTED IF:
   - Total cost > $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}
   - That's it. That's the only hard rule.
   
✅ ALL OTHER "REQUIREMENTS" ARE ACTUALLY SUGGESTIONS:
   - Publication count? → FLEXIBLE (5, 8, 12, whatever fits budget)
   - Per-pub limits? → GUIDELINES (can adjust if needed for budget)
   - Diversity goals? → NICE TO HAVE (but not if it breaks budget)
   - Coverage targets? → ASPIRATIONAL (budget comes first)
   
📊 PROPORTIONAL ALLOCATION WITH SCALING:
   1. Select publications you want (e.g., 10-15 for $${objectives.budget.totalBudget.toLocaleString()})
   2. Allocate proportionally based on audience size
      - Pub A (4M audience) → 40% of pool → Initial: $20K
      - Pub B (2M audience) → 20% of pool → Initial: $10K
      - Pub C (1M audience) → 10% of pool → Initial: $5K
      - etc.
   3. Sum initial allocations (e.g., total = $80K)
   4. IF over budget, scale down:
      - scaling_factor = $${objectives.budget.totalBudget.toLocaleString()} ÷ $80K = 0.625
      - Pub A: $20K × 0.625 = $12,500 ✓
      - Pub B: $10K × 0.625 = $6,250 ✓
      - Pub C: $5K × 0.625 = $3,125 ✓
      - New total: Exactly $${objectives.budget.totalBudget.toLocaleString()} ✓
   5. Proportions maintained, budget respected!
   
💡 EXAMPLE FOR $${objectives.budget.totalBudget.toLocaleString()}:
   - Select 10-12 publications based on size
   - Allocate proportionally (ignore budget temporarily)
   - Calculate total
   - Scale everything down by (budget ÷ total)
   - Result: Perfect proportions, perfect budget fit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

CAMPAIGN REQUIREMENTS:
- **TOTAL BUDGET: $${objectives.budget.totalBudget.toLocaleString()} (THIS IS THE COMPLETE CAMPAIGN BUDGET - NOT PER MONTH!)**
- **Campaign Duration: ${campaignDurationDays} days (${campaignDurationWeeks} weeks, ~${campaignDurationMonths} months)**
- **Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}**
- **Billing Cycle: ${objectives.budget.billingCycle}** (how client pays, does NOT affect total budget)
- Primary Goal: ${objectives.primaryGoal}
- Target Audience: ${objectives.targetAudience}
${objectives.geographicTarget ? `- Geographic Focus: ${objectives.geographicTarget.join(', ')}` : ''}
${objectives.channels ? `- Requested Channels: ${objectives.channels.join(', ')}` : '- All channels available'}

🚨 CRITICAL INVENTORY CONSTRAINT:
**WEB IMPRESSIONS AVAILABILITY: ${(algorithm.constraints.webInventoryAvailability || 0.30) * 100}%**
- Publications share their web inventory across multiple campaigns
- Only ${(algorithm.constraints.webInventoryAvailability || 0.30) * 100}% of monthly web impressions are available for ANY SINGLE campaign
- Example: If a publication has 100,000 monthly website visitors, only ${Math.round(100000 * (algorithm.constraints.webInventoryAvailability || 0.30)).toLocaleString()} impressions are available for this campaign
- When calculating CPM-based website inventory, multiply the monthly impressions by ${algorithm.constraints.webInventoryAvailability || 0.30} first
- This prevents over-allocation of a publication's limited web inventory

AVAILABLE PUBLICATIONS AND INVENTORY (${publications.length} total):
${JSON.stringify(publications, null, 2)}

YOUR TASK:
Build a campaign package following the ${algorithm.name} algorithm priorities:

${includeAllOutlets ? `
1. 📰 SELECT ${Math.floor(publications.length * 0.6)}-${Math.ceil(publications.length * 0.85)} DIVERSE PUBLICATIONS
   - Mix of large established outlets (Chicago Sun-Times, Tribune, etc.)
   - AND small community publications (Hyde Park Herald, North Lawndale News, etc.)
   - Variety across geographic areas and audience types
   
2. 🎯 SMART INVENTORY CHOICES per publication:
   - **RESPECT EACH PUBLICATION'S PRICING MODEL** (CPM, per_send, flat, per_ad)
   - Calculate costs based on the campaign duration (${campaignDurationDays} days / ${campaignDurationWeeks} weeks / ~${campaignDurationMonths} months)
   - For CPM pricing: (impressions/1000) × CPM rate × campaign duration
   - For per_send: sends × rate × campaign duration  
   - For flat rate: flat price (already includes duration)
   - For per_ad: number of ads × rate
   - Choose appropriate frequency based on publication's inventory model (1x, 6x, 12x, etc.)
   
3. 💰 BUDGET-CONSCIOUS SPREAD:
   - **STAY WITHIN $${objectives.budget.totalBudget.toLocaleString()} TOTAL** (not per month!)
   - Spread budget across MANY outlets (not concentrated in 2-3)
   - If under budget: include MORE publications with smaller units
   - If over budget: use discounted tiers, smaller units, but KEEP variety
   
4. 🌈 MAXIMIZE DIVERSITY:
   - Don't just pick "top 20 by reach" - include smaller outlets
   - Vary your selections: established + emerging, large + small
   - Consider which outlets serve different neighborhoods/communities
` : `
1. Stay within budget ($${objectives.budget.totalBudget.toLocaleString()} TOTAL for ${campaignDurationDays} days)
2. Maximize reach to target audience  
3. Provide multi-channel diversity
4. Select publications strategically for value
5. Use appropriate frequency tiers for discounts
6. **RESPECT each publication's pricing model (CPM/per_send/flat/per_ad)**
`}

BUDGET ALLOCATION CONSTRAINTS (ABSOLUTELY REQUIRED - NO EXCEPTIONS):
🔴 HARD CONSTRAINTS - THESE ARE NON-NEGOTIABLE:
- MINIMUM per publication: $500 HARD MINIMUM
- MAXIMUM per publication: $${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25))} HARD MAXIMUM
- NO publication can be <$500 or >$${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25))}
- NO single publication can exceed 25% of total budget (HARD CAP)
- NO MORE THAN 3 publications can represent 70% of total (IF VIOLATED, REJECT AND RE-SELECT)
${algorithm.id === 'proportional' ? 
  `- RECOMMENDED PUBLICATION RANGE: ${Math.floor((objectives.budget.totalBudget / 2500) * 0.5)}-${Math.ceil((objectives.budget.totalBudget / 2500) * 0.7)} publications
  → For $${objectives.budget.totalBudget.toLocaleString()} budget, target ${Math.floor((objectives.budget.totalBudget / 2500) * 0.5)}-${Math.ceil((objectives.budget.totalBudget / 2500) * 0.7)} publications (NOT ${Math.floor(objectives.budget.totalBudget / 2500)}!)
  → PRIORITIZE STAYING UNDER BUDGET over hitting publication count` : 
  `- REQUIRED MINIMUM PUBLICATIONS: ${Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))}
  → If you can't select ${Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))} publications, STOP and explain why`}

🎯 PRIMARY CONSTRAINT (OVERRIDES ALL OTHERS):

**ABSOLUTE BUDGET LIMIT: $${objectives.budget.totalBudget.toLocaleString()}**
- Algorithm config maxBudgetExceedPercent: ${(algorithm.constraints.maxBudgetExceedPercent || 0)}%
- Maximum allowed total: $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}
- This is the ENTIRE ${campaignDurationDays}-day campaign budget (NOT per month!)

🚨 IF YOUR CALCULATED TOTAL EXCEEDS $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}:
   1. DO NOT REMOVE PUBLICATIONS
   2. SCALE DOWN ALL ALLOCATIONS PROPORTIONALLY
   3. Calculate scaling factor: Budget ÷ Current Total
   4. Multiply each publication's allocation by scaling factor
   5. Result: Same proportions, fits within budget

ALL OTHER TARGETS ARE SECONDARY TO BUDGET:
- Publication count: Keep as many as possible
- Diversity goals: Maintain through proportional scaling
- Coverage targets: Preserved through scaling
- ONLY BUDGET IS MANDATORY

CALCULATION STEPS:
1. Select publications you want to include
2. Calculate initial proportional allocations based on size:
   - Large pub (4M audience): Gets proportionally more
   - Medium pub (800K audience): Gets proportionally less
   - Small pub (100K audience): Gets proportionally smallest
   
3. Calculate costs using correct formulas:
   - **CPM**: (audienceMetric.value × 0.30 ÷ 1,000) × CPM × months
   - **Per-send**: sends × rate
   - **Flat rate**: use as-is
   - **Per-ad**: quantity × rate
   
4. Sum all publication totals

5. IF total > $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}:
   - Calculate: scaling_factor = $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()} ÷ current_total
   - Apply: new_allocation = old_allocation × scaling_factor
   - Do this for EVERY publication
   - Result: Total = exactly $${Math.floor(objectives.budget.totalBudget * (1 + ((algorithm.constraints.maxBudgetExceedPercent || 0) / 100))).toLocaleString()}, proportions maintained

STEP 4: MANDATORY VALIDATION - DO NOT PROCEED WITHOUT THIS:
  ✓ VERIFY: Every single publication total is between $500 - $${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25))}
  ✓ VERIFY: Largest publication = ${Math.floor((objectives.budget.totalBudget / Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))) * 100)}% of budget MAXIMUM
  ✓ VERIFY: Top 3 publications < 70% of total (${(Math.max(5, Math.floor(objectives.budget.totalBudget / 2500)) * 0.7 * objectives.budget.totalBudget / Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))).toFixed(0)})
  ✓ VERIFY: You have exactly ${Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))} publications or more
  ✓ IF ANY CHECK FAILS: STOP. Do not return results. Adjust selections and retry.

STEP 5: Generate Warnings for Any Violations
  - Any pub <$500? WARN
  - Any pub >$${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25))}? WARN
  - Any pub >25% of total? WARN
  - Fewer than ${Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))} pubs? WARN
  - Top 3 >70%? WARN

CALCULATION RULES - RESPECT EACH PUBLICATION'S PRICING MODEL:
**Each publication has its own pricing model - YOU MUST RESPECT IT!**

1. **CPM (Cost Per Thousand Impressions)**:
   - Formula: (estimated_impressions ÷ 1,000) × CPM_rate × (campaign_days ÷ 30) if monthly CPM
   - Example: 100,000 impressions/month × $6 CPM × ${campaignDurationMonths} months = $${100 * 6 * campaignDurationMonths}

2. **Per-send (Newsletter/Email)**:
   - Formula: number_of_sends_during_campaign × cost_per_send
   - Example: Weekly newsletter over ${campaignDurationWeeks} weeks = ${Math.ceil(campaignDurationWeeks)} sends × $800 = $${Math.ceil(campaignDurationWeeks) * 800}
   
3. **Flat rate (Fixed price)**:
   - Formula: Use flat_price AS-IS (already includes duration or is one-time)
   - Example: $2,500 flat = $2,500 total (NO multiplication!)
   
4. **Per-ad (Individual placements)**:
   - Formula: number_of_ads × cost_per_ad
   - Example: 5 print ads × $500 = $2,500 total

5. **Frequency tiers**: Choose tier matching campaign length (${campaignDurationMonths}x tier for ${campaignDurationMonths} months)

**CRITICAL: Read each item's pricingModel field and use the correct formula above!**
- Use ONLY "hubPrice" or "pricing.rate" values (NEVER standardPrice)
- Sum all costs for totalCost and calculate monthlyTotal (totalCost ÷ ${campaignDurationMonths})

${algorithm.id === 'proportional' ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 FINAL VALIDATION CHECKLIST (PROPORTIONAL ALGORITHM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before submitting your response, VERIFY:

✓ [ ] Sum of all publicationTotal values
✓ [ ] Total ≤ $${objectives.budget.totalBudget.toLocaleString()} (NOT $${(objectives.budget.totalBudget * 1.01).toLocaleString()}, NOT $${(objectives.budget.totalBudget * 1.10).toLocaleString()})
✓ [ ] Number of publications ≤ ${Math.floor(objectives.budget.totalBudget / 2500)}
✓ [ ] Each publication ≥ $500 and ≤ $${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25)).toLocaleString()}
✓ [ ] No publication > 25% of $${objectives.budget.totalBudget.toLocaleString()} budget
✓ [ ] Web impressions calculated as audienceMetric.value × 0.30

IF BUDGET CHECK FAILS (total > budget):
✓ Calculate: scaling_factor = budget ÷ total_cost
✓ Scale ALL publications: new_amount = old_amount × scaling_factor
✓ Verify: sum of scaled amounts ≤ budget
✓ Check: all publications still ≥ $500 (if not, remove those under $500 and rescale)

Your allocation will be REJECTED if total exceeds budget.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, no code blocks):
{
  "selectedPublications": [
    {
      "publicationId": number,
      "publicationName": "string",
      "inventoryItems": [
        {
          "channel": "website|print|newsletter|radio|podcast|events|streaming|social",
          "itemName": "string",
          "itemPath": "string",
          "quantity": number,
          "duration": "string",
          "frequency": "monthly|weekly|one-time",
          "pricing": {
            "model": "string",
            "rate": number,
            "monthlyCost": number,
            "campaignCost": number
          },
          "specifications": object (IMPORTANT: For print items, MUST include "dimensions" field from source publication),
          "audienceMetric": {
            "type": "string",
            "value": number
          }
        }
      ],
      "publicationTotal": number,
      "reasoning": "Why this publication and inventory was selected"
    }
  ],
  "totalCost": number,
  "monthlyTotal": number,
  "estimatedReach": {
    "min": number,
    "max": number,
    "byChannel": {
      "channelName": number
    }
  },
  "estimatedImpressions": {
    "min": number,
    "max": number
  },
  "overallReasoning": "Overall strategy and reasoning for selections",
  "confidence": 0-1,
  "warnings": [
    "REQUIRED: Add warnings if any publication <$500 or >$${Math.max(10000, Math.floor(objectives.budget.totalBudget * 0.25))}",
    "REQUIRED: Add warning if any publication >25% of total budget",
    "REQUIRED: Add warning if >3 publications represent 70% of budget",
    "REQUIRED: Add warning if fewer than ${Math.max(5, Math.floor(objectives.budget.totalBudget / 2500))} publications selected"
  ],
  "pressForwardCompliance": "How well this follows Press Forward principles - rate 1-5"
}`;

    return prompt;
  }

  /**
   * Parse LLM response into structured format
   */
  private async parseLLMResponse(response: string): Promise<any> {
    let jsonStr = '';
    try {
      console.log('🔍 Parsing LLM response - length:', response.length);
      
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      // Strip any lines that start with triple backticks anywhere in the content
      cleaned = cleaned.replace(/^```.*$/gm, '');

      cleaned = cleaned.trim();
      
      // Find the actual JSON bounds (from first { to last })
      const jsonStart = cleaned.indexOf('{');
      let jsonEnd = cleaned.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error('No valid JSON object found in response');
      }
      
      jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
      // Remove any rogue backticks that may exist inside the extracted JSON
      jsonStr = jsonStr.replace(/`+/g, '');
      console.log('✓ Extracted JSON from position', jsonStart, 'to', jsonEnd + 1);
      console.log('🔍 JSON length:', jsonStr.length);
      console.log('🔍 First 100 chars:', jsonStr.substring(0, 100));
      console.log('🔍 Last 100 chars:', jsonStr.substring(jsonStr.length - 100));
      
      console.log('🔍 About to parse JSON using JSON5 (forgiving parser)');
      
      // Write the extracted JSON to a file for debugging
      const fs = await import('fs');
      fs.writeFileSync('/tmp/extracted-json.json', jsonStr);
      console.log('📝 Extracted JSON written to /tmp/extracted-json.json');
      
      // Try standard JSON first
      try {
        const parsed = JSON.parse(jsonStr);
        console.log('✅ Successfully parsed with standard JSON');
        return parsed;
      } catch (standardJsonError) {
        console.log('⚠️  Standard JSON parsing failed, trying JSON5...');
        console.error('Standard JSON error:', standardJsonError instanceof Error ? standardJsonError.message : standardJsonError);
        
        // Use JSON5 for more forgiving parsing (handles trailing commas, unquoted keys, etc.)
        const parsed = JSON5.parse(jsonStr);
        console.log('✅ Successfully parsed with JSON5');
        return parsed;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Try to find the problem area
      if (jsonStr && errorMsg.includes('position')) {
        const match = errorMsg.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const start = Math.max(0, position - 150);
          const end = Math.min(jsonStr.length, position + 150);
          const problemArea = jsonStr.substring(start, end);
          console.error('❌ Problem area around position', position);
          console.error('❌ Context:', problemArea);
        }
      }
      
      console.error('❌ Error parsing LLM response:', error);
      console.error('❌ Raw response first 300 chars:', response.substring(0, 300));
      console.error('❌ Raw response last 300 chars:', response.substring(Math.max(0, response.length - 300)));
      if (jsonStr) {
        console.error('❌ JSON length:', jsonStr.length);
      }
      throw new Error('Failed to parse LLM response as JSON: ' + errorMsg);
    }
  }

  /**
   * Validate budget allocation constraints
   */
  private validateBudgetConstraints(
    publications: any[],
    totalBudget: number,
    targetPublications: number
  ): { violations: string[], warnings: string[], adjustedPublications?: any[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Post-processing validation with rebalancing suggestions
    // Goal: Keep all publications, rebalance if needed

    // Check 1: Minimum per publication (hard floor for inclusion)
    let underMinimum = 0;
    publications.forEach(pub => {
      const total = pub.publicationTotal || 0;
      if (total < 500) {
        warnings.push(`${pub.publicationName}: $${total} is below $500 recommended minimum`);
        underMinimum++;
      }
    });

    // Check 2: Rebalancing suggestion for overallocations
    const sorted = [...publications].sort((a, b) => (b.publicationTotal || 0) - (a.publicationTotal || 0));
    const suggestedMaxPerPub = Math.floor(totalBudget * 0.35); // Soft cap at 35% for major outlets
    const overallocated = publications.filter(p => (p.publicationTotal || 0) > suggestedMaxPerPub);
    
    if (overallocated.length > 0) {
      const overallocationAmount = overallocated.reduce((sum, p) => sum + Math.max(0, (p.publicationTotal || 0) - suggestedMaxPerPub), 0);
      warnings.push(`REBALANCING NEEDED: ${overallocated.length} publication(s) exceed $${suggestedMaxPerPub} suggested max. Overallocation amount: $${overallocationAmount.toFixed(0)}. Suggest reducing these allocations and redistributing to smaller outlets to maintain diversity while keeping all publications.`);
      overallocated.forEach(pub => {
        const excess = (pub.publicationTotal || 0) - suggestedMaxPerPub;
        warnings.push(`  └─ ${pub.publicationName}: $${(pub.publicationTotal || 0).toLocaleString()} (reduce by ~$${excess.toFixed(0)} to stay under cap)`);
      });
    }

    // Check 3: Diversity check - no single pub should dominate ecosystem
    const maxPubPercent = ((sorted[0]?.publicationTotal || 0) / totalBudget) * 100;
    if (maxPubPercent > 45) {
      warnings.push(`Largest publication represents ${maxPubPercent.toFixed(1)}% of budget (recommend <45% to avoid dominance)`);
    }

    // Check 4: Top 3 concentration  
    const top3Total = sorted.slice(0, 3).reduce((sum, p) => sum + (p.publicationTotal || 0), 0);
    const top3Percent = (top3Total / totalBudget) * 100;
    if (top3Percent > 85) {
      warnings.push(`Top 3 publications are ${top3Percent.toFixed(1)}% of budget (recommend <85% for strong ecosystem support)`);
    }

    // Check 5: Publication count
    if (publications.length < targetPublications) {
      warnings.push(`Only ${publications.length} publications selected (target: ${targetPublications} for comprehensive ecosystem coverage). Consider expanding to smaller outlets.`);
    } else if (publications.length >= targetPublications) {
      warnings.push(`✓ Strong ecosystem coverage: ${publications.length} publications selected (target: ${targetPublications})`);
    }

    return { violations, warnings };
  }

  /**
   * Transform LLM response into CampaignAnalysisResponse format
   */
  private transformToAnalysisResponse(
    llmResponse: any,
    request: CampaignAnalysisRequest,
    llmPrompt: string,
    rawResponse: string,
    algorithm: AlgorithmConfig,
    sourcePublications: PublicationWithInventory[]
  ): CampaignAnalysisResponse {
    // Transform into HubPackagePublication format
    const publications: HubPackagePublication[] = llmResponse.selectedPublications.map((pub: any) => {
      // Find source publication for fallback data
      const sourcePub = sourcePublications.find(p => p.publicationId === pub.publicationId);
      
      return {
        publicationId: pub.publicationId,
        publicationName: pub.publicationName,
        inventoryItems: pub.inventoryItems.map((item: any) => {
          let specifications = item.specifications || {};
          
          // Fallback: If print item is missing dimensions, try to get from source
          if (item.channel === 'print' && !specifications.dimensions && sourcePub) {
            const channel = sourcePub.channels[item.channel];
            if (channel) {
              const sourceItem = channel.find((invItem: any) => invItem.path === item.itemPath);
              if (sourceItem?.specifications?.dimensions) {
                specifications = {
                  ...specifications,
                  dimensions: sourceItem.specifications.dimensions
                };
                console.log(`[Campaign Transform] Added missing dimensions for ${item.itemName}: ${sourceItem.specifications.dimensions}`);
              }
            }
          }
          
          return {
            channel: item.channel,
            itemPath: item.itemPath,
            itemName: item.itemName,
            quantity: item.quantity,
            currentFrequency: item.quantity, // Add currentFrequency to match package structure
            duration: item.duration,
            frequency: item.frequency,
            specifications,
            // Store monthly impressions and costs from LLM calculation
            monthlyImpressions: item.pricing?.monthlyImpressions,
            monthlyCost: item.pricing?.monthlyCost,
            campaignCost: item.pricing?.campaignCost,
            itemPricing: {
              standardPrice: 0, // Not provided in this flow
              hubPrice: item.pricing.rate,
              pricingModel: item.pricing.model,
              totalCost: item.pricing?.campaignCost || item.pricing?.monthlyCost || 0
            }
          };
        }),
        publicationTotal: pub.publicationTotal,
        sizeScore: pub.sizeScore, // Store size score for proportional algorithm
        sizeJustification: pub.sizeJustification
      };
    });

    // Size-Weighted Algorithm: Just log scores, don't modify LLM output
    if (algorithm.id === 'proportional') {
      const publicationsWithScores = publications.map((pub, idx) => ({
        pub,
        score: llmResponse.selectedPublications[idx]?.sizeScore || 0
      })).filter(item => item.score > 0);

      if (publicationsWithScores.length > 0) {
        const totalScore = publicationsWithScores.reduce((sum, item) => sum + item.score, 0);
        const budget = request.objectives.budget.totalBudget;

        console.log(`\n📊 Size-Weighted Algorithm - LLM Selections:`);
        console.log(`   Total Scores: ${totalScore}`);
        console.log(`   Budget: $${budget.toLocaleString()}`);
        publicationsWithScores.forEach(({ pub, score }) => {
          console.log(`   ${pub.publicationName}: score=${score} (${((score/totalScore)*100).toFixed(1)}%) → $${(pub.publicationTotal || 0).toLocaleString()}`);
        });
        console.log(`   Total Cost from LLM: $${llmResponse.totalCost?.toLocaleString() || 'N/A'}\n`);
      }
    }

    // Validate constraints
    const targetPubs = Math.max(5, Math.floor(request.objectives.budget.totalBudget / 2500));
    const constraintCheck = this.validateBudgetConstraints(
      llmResponse.selectedPublications,
      request.objectives.budget.totalBudget,
      targetPubs
    );

    // Combine warnings from LLM and validation
    const allWarnings = [
      ...(llmResponse.warnings || []),
      ...constraintCheck.violations,
      ...constraintCheck.warnings
    ];

    // Count totals
    const totalPublications = publications.length;
    const totalInventoryItems = publications.reduce((sum, pub) => sum + pub.inventoryItems.length, 0);

    // Build channel breakdown
    const channelBreakdown: Record<string, number> = {};
    publications.forEach(pub => {
      pub.inventoryItems.forEach(item => {
        channelBreakdown[item.channel] = (channelBreakdown[item.channel] || 0) + 1;
      });
    });

    const selectedInventory: CampaignSelectedInventory = {
      publications,
      totalPublications,
      totalInventoryItems,
      channelBreakdown,
      selectionReasoning: llmResponse.overallReasoning,
      llmPrompt,
      llmResponse: rawResponse,
      confidence: llmResponse.confidence || 0.8,
      selectionDate: new Date()
    };

    const pricing = {
      subtotal: llmResponse.totalCost || 0,
      hubDiscount: 0, // Already applied in hub pricing
      discountAmount: 0,
      total: llmResponse.totalCost || 0,
      monthlyTotal: llmResponse.monthlyTotal,
      currency: request.objectives.budget.currency,
      breakdown: {
        byChannel: llmResponse.estimatedReach?.byChannel
      }
    };

    // Calculate reach using shared utilities (same as package builder)
    const reachSummary = calculatePackageReach(publications);
    console.log('📊 Campaign Analysis - Calculated Reach:', {
      estimatedUniqueReach: reachSummary.estimatedUniqueReach,
      totalMonthlyImpressions: reachSummary.totalMonthlyImpressions,
      channelAudiences: reachSummary.channelAudiences
    });

    const estimatedPerformance = {
      reach: {
        min: reachSummary.estimatedUniqueReach || 0,
        max: reachSummary.estimatedUniqueReach || 0, // For now, min/max are the same
        description: `${(reachSummary.estimatedUniqueReach || 0).toLocaleString()}+ estimated unique reach`,
        byChannel: reachSummary.channelAudiences
      },
      impressions: {
        min: reachSummary.totalMonthlyImpressions || 0,
        max: reachSummary.totalMonthlyImpressions || 0,
        byChannel: reachSummary.channelAudiences
      },
      cpm: llmResponse.totalCost && reachSummary.totalMonthlyImpressions 
        ? (llmResponse.totalCost / (reachSummary.totalMonthlyImpressions / 1000))
        : 0
    };

    return {
      selectedInventory,
      pricing,
      estimatedPerformance,
      warnings: allWarnings.length > 0 ? allWarnings : llmResponse.warnings,
      suggestions: [],
      algorithm: {
        id: algorithm.id,
        name: algorithm.name,
        version: '1.0.0',
        executedAt: new Date()
      }
    };
  }

  /**
   * Main method: Analyze campaign requirements and select inventory
   */
  async analyzeCampaign(request: CampaignAnalysisRequest): Promise<CampaignAnalysisResponse> {
    try {
      // Determine which algorithm to use
      const algorithmId: AlgorithmType = request.algorithm || await getDefaultAlgorithm();
      const algorithm = await getAlgorithmMerged(algorithmId);
      
      console.log('Starting campaign analysis...', {
        hubId: request.hubId,
        budget: request.objectives.budget.totalBudget,
        goal: request.objectives.primaryGoal,
        algorithm: `${algorithm.name} (${algorithm.id})`
      });
      
      // Use algorithm-specific LLM config
      llmConfig = { ...llmConfig, ...algorithm.llmConfig };

      // Step 1: Get all publications with hub inventory
      const publications = await this.getPublicationsWithInventory(
        request.hubId,
        request.objectives.channels,
        request.excludeChannels
      );

      console.log(`Found ${publications.length} publications with hub inventory`);

      if (publications.length === 0) {
        throw new Error('No publications with hub inventory found for this hub');
      }

      // Step 2: Load intelligence guide for system context
      const intelligenceGuide = this.loadIntelligenceGuide();

      // Step 3: Build prompt with algorithm-specific instructions
      const prompt = this.buildPrompt(request, publications, algorithm);

      // Step 4: Call Claude Sonnet 4.5 with configured settings
      if (llmConfig.output.verboseLogging) {
        console.log('🤖 Calling Claude Sonnet 4.5 API...');
        console.log('📊 Publications to analyze:', publications.length);
        console.log('⚙️  Model: claude-sonnet-4-5');
        console.log('🌡️  Temperature:', llmConfig.model.temperature);
        console.log('🔑 API Key present:', !!process.env.ANTHROPIC_API_KEY);
        console.log('🎯 Preset:', process.env.LLM_PRESET || 'default');
      }
      
      const systemPrompt = buildSystemPrompt(llmConfig, intelligenceGuide);
      
      const completion = await getAnthropicClient().messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: llmConfig.model.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: llmConfig.model.temperature
      }).catch((error: any) => {
        console.error('❌ Anthropic API Error:', error.message);
        console.error('❌ Error type:', error.type);
        console.error('❌ Error code:', error.code);
        if (llmConfig.output.verboseLogging) {
          console.error('❌ Full error:', JSON.stringify(error, null, 2));
        }
        throw error;
      });

      const rawResponse = completion.content[0].type === 'text' ? completion.content[0].text : '{}';
      console.log('✅ Received response from Claude Sonnet 4.5');
      console.log('📝 Response length:', rawResponse.length);
      console.log('📝 Response preview:', rawResponse.substring(0, 500));
      
      // Write response to file for debugging
      const fs = await import('fs');
      fs.writeFileSync('/tmp/claude-response.json', rawResponse);
      console.log('📝 Full response saved to /tmp/claude-response.json');

      // Step 5: Parse response
      let llmResponse = await this.parseLLMResponse(rawResponse);
      const prePruneSnapshot = JSON.parse(JSON.stringify(llmResponse)); // deep copy for audit

      // Step 5.1: Iterative pruning pass for ALL algorithms (enforce hard constraints)
      {
        const maxPrunePasses = Math.max(0, Math.min(4, (algorithm.constraints as any)?.pruningPassesMax ?? 3));
        let pass = 0;
        while (pass < maxPrunePasses && this.needsPruning(llmResponse, request, algorithm.constraints as any)) {
          pass++;
          const prunePrompt = this.buildPruningPrompt(llmResponse, request, algorithm.constraints as any);
          if (llmConfig.output.verboseLogging) {
            console.log(`✂️  Running pruning pass ${pass}/${maxPrunePasses} to enforce hard constraints...`);
          }
          const pruneCompletion = await getAnthropicClient().messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: Math.min(llmConfig.model.maxTokens, 16000),
            system: buildSystemPrompt(llmConfig, this.loadIntelligenceGuide()),
            messages: [{ role: 'user', content: prunePrompt }],
            temperature: 0.1
          });
          const pruneRaw = pruneCompletion.content[0].type === 'text' ? pruneCompletion.content[0].text : '{}';
          try {
            const parsedPruned = await this.parseLLMResponse(pruneRaw);
            if (!this.needsPruning(parsedPruned, request, algorithm.constraints as any)) {
              llmResponse = parsedPruned;
              if (llmConfig.output.verboseLogging) {
                console.log('✅ Pruning pass produced a budget-compliant plan.');
              }
              break;
            } else {
              // If still not compliant, use the pruned output as input to the next pass
              llmResponse = parsedPruned;
              console.warn('⚠️  Pruning pass did not fully satisfy constraints; attempting another pass...');
            }
          } catch (e) {
            console.warn('⚠️  Failed to parse pruned response; stopping pruning loop.');
            break;
          }
        }
      }

      // Step 5.2: Build pruning audit (pre vs post) to aid evaluation
      const auditWarnings: string[] = [];
      try {
        const preTotal = Number(prePruneSnapshot?.totalCost || 0);
        const postTotal = Number(llmResponse?.totalCost || 0);
        const prePubs = Array.isArray(prePruneSnapshot?.selectedPublications) ? prePruneSnapshot.selectedPublications.length : 0;
        const postPubs = Array.isArray(llmResponse?.selectedPublications) ? llmResponse.selectedPublications.length : 0;
        auditWarnings.push(`PRUNING AUDIT: total $${preTotal.toLocaleString()} (${prePubs} pubs) -> $${postTotal.toLocaleString()} (${postPubs} pubs)`);
        const preMap = new Map<string, number>();
        (prePruneSnapshot?.selectedPublications || []).forEach((p: any) => preMap.set(p.publicationName, Number(p.publicationTotal || 0)));
        const postMap = new Map<string, number>();
        (llmResponse?.selectedPublications || []).forEach((p: any) => postMap.set(p.publicationName, Number(p.publicationTotal || 0)));
        // Removed pubs
        const removed: string[] = [];
        preMap.forEach((_v, name) => { if (!postMap.has(name)) removed.push(name); });
        if (removed.length > 0) {
          auditWarnings.push(`Removed publications (${removed.length}): ${removed.slice(0, 10).join(', ')}${removed.length > 10 ? ', …' : ''}`);
        }
        // Adjusted pubs (top 5 by absolute delta)
        const deltas: Array<{ name: string; before: number; after: number; delta: number }> = [];
        postMap.forEach((after, name) => {
          const before = preMap.get(name) || 0;
          if (before !== after) {
            deltas.push({ name, before, after, delta: after - before });
          }
        });
        deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        if (deltas.length > 0) {
          const top = deltas.slice(0, 5).map(d => `${d.name}: $${d.before.toLocaleString()} -> $${d.after.toLocaleString()} (Δ $${d.delta.toLocaleString()})`);
          auditWarnings.push(`Top adjustments: ${top.join(' | ')}`);
        }
      } catch {
        // ignore audit errors
      }

      // Step 6: Transform to analysis response
      const analysisResponse = this.transformToAnalysisResponse(
        llmResponse,
        request,
        prompt,
        rawResponse,
        algorithm,
        publications // Pass source publications for dimension fallback
      );

      console.log('Campaign analysis complete', {
        publications: analysisResponse.selectedInventory.totalPublications,
        items: analysisResponse.selectedInventory.totalInventoryItems,
        total: analysisResponse.pricing.total
      });

      // Attach pruning audit warnings
      analysisResponse.warnings = [...(analysisResponse.warnings || []), ...auditWarnings];
      // Step 7: Persist pruning audit to MongoDB for later evaluation
      try {
        const db = getDatabase();
        const auditDoc = {
          createdAt: new Date(),
          algorithmId,
          request: {
            hubId: request.hubId,
            budget: request.objectives?.budget?.totalBudget,
            channels: request.objectives?.channels,
            timeline: request.timeline
          },
          pre: {
            totalCost: Number(prePruneSnapshot?.totalCost || 0),
            publications: (prePruneSnapshot?.selectedPublications || []).map((p: any) => ({
              publicationId: p.publicationId,
              publicationName: p.publicationName,
              publicationTotal: Number(p.publicationTotal || 0)
            }))
          },
          post: {
            totalCost: Number(llmResponse?.totalCost || 0),
            publications: (llmResponse?.selectedPublications || []).map((p: any) => ({
              publicationId: p.publicationId,
              publicationName: p.publicationName,
              publicationTotal: Number(p.publicationTotal || 0)
            }))
          },
          auditWarnings
        };
        await db.collection(COLLECTIONS.PRUNING_AUDITS).insertOne(auditDoc);
      } catch (e) {
        console.warn('⚠️  Failed to persist pruning audit:', (e as Error).message);
      }
      return analysisResponse;

    } catch (error: any) {
      console.error('❌ Error analyzing campaign:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      if (error.response) {
        console.error('❌ API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      if (error.code) {
        console.error('❌ Error code:', error.code);
      }
      
      // Re-throw with more context
      const enhancedError = new Error(
        `Campaign analysis failed: ${error.message || 'Unknown error'}. ` +
        `${!process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY is not set!' : ''}`
      );
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
  }

  /**
   * Determine if a response violates hard constraints and needs pruning
   */
  private needsPruning(llmResponse: any, request: CampaignAnalysisRequest, constraints: any): boolean {
    const totalBudget = request.objectives.budget.totalBudget || 0;
    const maxPercent = constraints?.maxPublicationPercent ?? 0.25;
    const minSpend = constraints?.minPublicationSpend ?? 500;
    const maxTop3Percent = 0.85; // default soft constraint

    const totalCost = Number(llmResponse.totalCost || 0);
    if (!Number.isFinite(totalCost) || totalCost <= 0 || totalCost > totalBudget) return true;

    const pubs = Array.isArray(llmResponse.selectedPublications) ? llmResponse.selectedPublications : [];
    for (const pub of pubs) {
      const pubTotal = Number(pub.publicationTotal || 0);
      if (!Number.isFinite(pubTotal)) return true;
      if (pubTotal > totalBudget * maxPercent) return true;
      if (pubTotal > 0 && pubTotal < minSpend) return true;
    }
    // Top 3 concentration (soft) -> trigger prune if egregious
    if (pubs.length >= 3) {
      const sorted = [...pubs].sort((a, b) => (b.publicationTotal || 0) - (a.publicationTotal || 0));
      const top3 = (sorted[0].publicationTotal || 0) + (sorted[1].publicationTotal || 0) + (sorted[2].publicationTotal || 0);
      if (top3 / totalBudget > maxTop3Percent) return true;
    }
    return false;
  }

  /**
   * Build pruning prompt that enforces hard constraints by adjusting quantities or removing pubs
   */
  private buildPruningPrompt(llmResponse: any, request: CampaignAnalysisRequest, constraints: any): string {
    const totalBudget = request.objectives.budget.totalBudget || 0;
    const maxPercent = constraints?.maxPublicationPercent ?? 0.25;
    const minSpend = constraints?.minPublicationSpend ?? 500;
    const maxPerPubDollar = Math.max(10000, Math.floor(totalBudget * maxPercent));
    const targetPubsMin = constraints?.targetPublicationsMin ?? 0;

    return `
You are a post-processor. Input is a JSON plan (publications with inventory and costs).
Your task is to PRUNE and ADJUST QUANTITIES ONLY to satisfy HARD constraints, then output UPDATED JSON.

HARD RULES:
- Total cost MUST be ≤ ${totalBudget}. Never exceed. If over, you MUST reduce quantities and/or remove lowest-impact publications before output.
- Do NOT change rates. Adjust quantities (integers) or remove publications/items only.
- No single publication may exceed ${Math.round(maxPercent * 100)}% of total budget (≤ $${maxPerPubDollar}).
- Minimum spend per included publication: $${minSpend}.
- Keep selection similar where possible; prefer reducing quantities over removing publications.
- If a publication cannot reach $${minSpend} with non-zero integer quantities, remove it.
- Do NOT add new publications or channels not present in the input.
- Output only valid JSON with the same schema as input (selectedPublications[], publicationTotal, totalCost, etc.).
- Do NOT mention or use a “scaling factor”. You MUST recompute quantities and remove items/publications as needed until constraints hold.
- Verify math: cost = quantity × rate (for CPM use (impressions/1000) × CPM × months if duration implies months). Quantities must be integers.
${targetPubsMin ? `- Maintain at least ${targetPubsMin} publications if possible while staying under budget. Removing publications is a LAST RESORT; first reduce quantities across items and publications.` : ''}

INPUT JSON:
${JSON.stringify(llmResponse)}

REWRITE THE PLAN:
- Algorithm:
  1) Recompute each item with integer quantities to fit budget and caps:
     - item_cost = quantity × rate (CPM uses (impressions/1000) × CPM × months).
  2) For publications over $${maxPerPubDollar}, reduce item quantities (start with lowest-impact items) until ≤ cap, rather than removing the publication.
  3) If total_cost > $${totalBudget}, repeatedly:
     - Prefer reducing item quantities across many publications to preserve publication count${targetPubsMin ? ` (aim to keep ≥ ${targetPubsMin} publications)` : ''}.
     - Only remove the lowest-impact publications if necessary to achieve budget and min spend constraints.
     - Recompute totals after each change.
  4) Remove any publication with final total < $${minSpend}.
  5) Stop when total_cost ≤ $${totalBudget} with all hard constraints satisfied.

PRUNING PRIORITY (VERY IMPORTANT):
1) DO NOT remove publications if reducing quantities on larger publications can bring total ≤ budget.
2) Always reduce allocations on the largest, over-cap publications first, keeping them ≥ $${minSpend}.
3) Then, reduce quantities proportionally across other higher-cost publications as needed.
4) Only remove a publication when:
   - It cannot reach $${minSpend} with non-zero integer quantities, OR
   - Budget is still over after reducing larger publications’ quantities.
5) Try to preserve smaller/community outlets; favor trimming larger outlets instead of dropping small ones.

OUTPUT:
Return ONLY the updated JSON (same structure as INPUT JSON), no commentary.
`;
  }
}

// Export singleton instance
export const campaignLLMService = new CampaignLLMService();

