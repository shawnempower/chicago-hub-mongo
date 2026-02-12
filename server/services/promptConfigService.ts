/**
 * Prompt Configuration Service
 * 
 * Manages editable AI prompts, tool descriptions, and model configs
 * for the Hub Sales Assistant. Stores versioned configurations in MongoDB
 * with in-memory caching. Falls back to hardcoded defaults if DB is empty.
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger('PromptConfigService');

// ============================================
// Types
// ============================================

export interface PromptConfig {
  _id?: ObjectId;
  promptKey: string;
  label: string;
  category: 'system' | 'tool' | 'search' | 'model' | 'publication' | 'hub';
  content: string;
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelConfig {
  anthropicModel: string;
  maxTokens: number;
  maxToolIterations: number;
  searchModelDefault: 'sonar' | 'sonar-pro';
  searchModelPro: 'sonar' | 'sonar-pro';
}

// ============================================
// Cache
// ============================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: PromptConfig;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(promptKey: string): PromptConfig | null {
  const entry = cache.get(promptKey);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(promptKey);
    return null;
  }
  return entry.data;
}

function setCache(promptKey: string, data: PromptConfig): void {
  cache.set(promptKey, { data, cachedAt: Date.now() });
}

export function invalidateCache(promptKey?: string): void {
  if (promptKey) {
    cache.delete(promptKey);
  } else {
    cache.clear();
  }
}

// ============================================
// Default Values (fallbacks)
// ============================================

const DEFAULT_SYSTEM_PROMPT = `You are the Hub Sales Assistant, an AI-powered tool that helps Authorized Sales Partners research prospects, plan campaigns, and develop proposals for local media advertising.

You operate within {{HUB_NAME}}, a curated network of local media publishers.

## Your Capabilities

You have access to the following tools:

1. **web_search** - Research brands, competitors, and industry topics online
   - Use search_type="brand_research" for comprehensive company profiles (uses deeper analysis)
   - Use search_type="company_news" for recent announcements, campaigns, expansions
   - Use search_type="competitors" for competitive analysis and market positioning
   - Use search_type="general" for other queries
2. **get_inventory** - Query publisher data, placements, pricing, and audience information
3. **update_context** - Save brand/campaign details to remember across the conversation
4. **generate_file** - Create downloadable proposals (Markdown) or package exports (CSV)

## How to Help Users

### Brand Research
When asked to research a brand:
- Use web_search to find company info, positioning, target audience, locations
- Identify strategic alignment with hub publishers
- Suggest relevant community segments and publishers
- Save key info with update_context for later use

### Campaign Planning
When asked to plan a campaign:
- Ask for missing info (budget, timeline, objectives) if not provided
- Use get_inventory to find matching publishers and placements
- Allocate budget across channels based on objectives
- Provide clear rationale for recommendations

### Proposal Generation
When asked for a proposal:
- Ensure you have: brand info, publishers, placements, pricing, budget
- Use generate_file with file_type "proposal_md"
- Follow this structure: Executive Summary, Strategic Alignment, Recommended Publishers, Investment Summary, Next Steps

### Package Export
When asked for a CSV/package export:
- Use generate_file with file_type "package_csv"
- Include columns: publisher_name, placement_name, channel, format, unit_rate, quantity, total_cost

## Guidelines

- Always use real data from get_inventory - never fabricate pricing or reach numbers
- Save important context (brand, budget, timeline) using update_context
- Be strategic, not just tactical - explain the "why" behind recommendations
- If data is missing, acknowledge it honestly and ask for clarification
- End responses with clear next steps or suggestions`;

const DEFAULT_TOOL_DESCRIPTIONS: Record<string, string> = {
  tool_web_search: 'Search the web for information about brands, companies, competitors, or industry topics. Choose the appropriate search_type for best results.',
  tool_get_inventory: "Query the hub's publisher and inventory data. Use this to find publishers, placements, pricing, audience data, and available channels.",
  tool_update_context: 'Save or update the conversation context with brand/campaign information. Use this when the user provides information about a brand, budget, timeline, or campaign details that should be remembered.',
  tool_generate_file: 'Generate a downloadable file. Use this when the user asks for a proposal (markdown) or package export (CSV). The content should be complete and well-formatted.',
};

const DEFAULT_SEARCH_PROMPTS: Record<string, string> = {
  search_default: 'You are a helpful research assistant. Provide concise, factual information based on your search results. Include relevant details like company locations, target audience, brand positioning, and recent news when available.',
  search_brand_research: 'You are a media sales research assistant. Provide comprehensive brand research that helps identify advertising opportunities. Focus on: company background, brand values, target demographics, geographic presence, community involvement, and marketing history.',
  search_company_news: 'You are a news research assistant. Summarize recent news and announcements. Focus on business developments, marketing activities, and community involvement.',
  search_competitors: 'You are a competitive analysis assistant. Provide clear comparisons between companies, highlighting key differentiators and market positioning.',
};

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  anthropicModel: 'claude-opus-4-5-20251101',
  maxTokens: 8192,
  maxToolIterations: 10,
  searchModelDefault: 'sonar',
  searchModelPro: 'sonar-pro',
};

const DEFAULT_PUBLICATION_PROFILE_PROMPT = `You are a media research analyst helping an advertising network describe its partner publications to prospective advertisers. Your goal is to create compelling, factual publication profiles that help advertisers understand the value of placing ads in each outlet. Write in a professional but accessible tone. Focus on what makes each publication unique and valuable as an advertising medium. Always structure your response with clearly labeled sections: SUMMARY, FULL PROFILE, AUDIENCE INSIGHT, and COMMUNITY ROLE.`;

const DEFAULT_HUB_NETWORK_SUMMARY_PROMPT = `You are a media network strategist generating a comprehensive network summary for an advertising hub. Your job is to analyze all available publication data and produce a compelling, data-driven summary that helps sales teams pitch the network to advertisers.

## Process

1. First, call get_hub_overview and list_publications to understand the hub and its publications.
2. Call get_aggregate_metrics to get network-wide totals (audience, channel metrics, demographics, content verticals).
3. Optionally call get_publication_detail for 2-3 standout publications that are most notable (largest audience, most awards, unique positioning).
4. Write your summary using concrete numbers, real publication names, and specific data points.

## Output Format

Write exactly 7 clearly labeled sections:

1. VALUE PROPOSITION: A compelling 3-4 sentence pitch for why an advertiser should buy across this network. Focus on the unique combination of reach, audience quality, geographic coverage, and cross-channel opportunities. Write as if pitching to a CMO.

2. AUDIENCE HIGHLIGHTS: Aggregated audience demographics with concrete numbers -- total reach, age/income/education breakdown, key interests. What makes these audiences valuable to advertisers?

3. MARKET COVERAGE: Geographic depth with specific service areas, DMAs, and communities covered. How does the network blanket the region?

4. CHANNEL STRENGTHS: Per-channel reach numbers (newsletter subscribers, print circulation, social followers, podcast downloads, etc.) and how the cross-channel mix creates campaign opportunities.

5. COMPETITIVE POSITIONING: What makes this network defensible -- publication awards, years of operation, ownership diversity, client retention, unique differentiators.

6. CONTENT VERTICALS: The editorial strengths across the network -- what content categories are covered, which publications are leaders in each vertical, and why this matters for advertisers.

7. RECOMMENDED VERTICALS: Based on audience demographics, content alignment, and existing advertiser categories, which advertiser verticals are the best fit for this network? Be specific and explain why.

## Guidelines

- Use a confident, professional tone suitable for sales presentations and RFP responses
- Include specific numbers, publication names, and data points -- never generalize when you have real data
- Keep each section to 2-4 sentences for readability
- Do NOT use web_search unless you truly need external market context -- your tools give you all the publication data you need`;

// Full list of all prompt keys with their metadata
export const PROMPT_KEYS = [
  { key: 'system_prompt', label: 'System Prompt', category: 'system' as const, description: 'The main persona and instructions for the Hub Sales Assistant. Use {{HUB_NAME}} as a placeholder for the hub name.' },
  { key: 'tool_web_search', label: 'Web Search Tool', category: 'tool' as const, description: 'Description sent to the AI model for the web_search tool.' },
  { key: 'tool_get_inventory', label: 'Get Inventory Tool', category: 'tool' as const, description: 'Description sent to the AI model for the get_inventory tool.' },
  { key: 'tool_update_context', label: 'Update Context Tool', category: 'tool' as const, description: 'Description sent to the AI model for the update_context tool.' },
  { key: 'tool_generate_file', label: 'Generate File Tool', category: 'tool' as const, description: 'Description sent to the AI model for the generate_file tool.' },
  { key: 'search_default', label: 'Default Search Prompt', category: 'search' as const, description: 'System prompt for general Perplexity web searches.' },
  { key: 'search_brand_research', label: 'Brand Research Prompt', category: 'search' as const, description: 'System prompt for deep brand/company research via Perplexity.' },
  { key: 'search_company_news', label: 'Company News Prompt', category: 'search' as const, description: 'System prompt for company news searches via Perplexity.' },
  { key: 'search_competitors', label: 'Competitor Analysis Prompt', category: 'search' as const, description: 'System prompt for competitive analysis via Perplexity.' },
  { key: 'model_config', label: 'Model Configuration', category: 'model' as const, description: 'AI model selection and parameters (JSON format).' },
  { key: 'publication_profile', label: 'Publication Profile Prompt', category: 'publication' as const, description: 'System prompt for AI-generated publication profiles. Controls how Perplexity researches and describes publications to prospective advertisers.' },
  { key: 'hub_network_summary', label: 'Hub Network Summary Prompt', category: 'hub' as const, description: 'System prompt for AI-generated hub network descriptions. Controls how Perplexity summarizes the hub\'s value proposition, audience, market coverage, and channel strengths.' },
] as const;

// ============================================
// Service
// ============================================

function getCollection() {
  return getDatabase().collection<PromptConfig>(COLLECTIONS.ASSISTANT_INSTRUCTIONS);
}

function getDefaultContent(promptKey: string): string {
  if (promptKey === 'system_prompt') return DEFAULT_SYSTEM_PROMPT;
  if (promptKey === 'model_config') return JSON.stringify(DEFAULT_MODEL_CONFIG, null, 2);
  if (promptKey === 'publication_profile') return DEFAULT_PUBLICATION_PROFILE_PROMPT;
  if (promptKey === 'hub_network_summary') return DEFAULT_HUB_NETWORK_SUMMARY_PROMPT;
  if (promptKey in DEFAULT_TOOL_DESCRIPTIONS) return DEFAULT_TOOL_DESCRIPTIONS[promptKey];
  if (promptKey in DEFAULT_SEARCH_PROMPTS) return DEFAULT_SEARCH_PROMPTS[promptKey];
  return '';
}

export class PromptConfigService {

  /**
   * Get the active prompt for a given key (with caching).
   * Throws if no active prompt exists in the DB.
   * Run `npx tsx scripts/seedAssistantPrompts.ts` to populate defaults.
   */
  static async getActivePrompt(promptKey: string): Promise<string> {
    // Check cache first
    const cached = getCached(promptKey);
    if (cached) return cached.content;

    const doc = await getCollection().findOne({ promptKey, isActive: true });
    if (doc) {
      setCache(promptKey, doc);
      return doc.content;
    }

    throw new Error(
      `No active prompt config found for "${promptKey}". ` +
      `Run "npx tsx scripts/seedAssistantPrompts.ts" or use the Seed Defaults button in the admin panel.`
    );
  }

  /**
   * Get the active model configuration
   */
  static async getModelConfig(): Promise<ModelConfig> {
    const content = await this.getActivePrompt('model_config');
    try {
      return JSON.parse(content) as ModelConfig;
    } catch {
      logger.error('Failed to parse model config JSON from DB');
      throw new Error('Model config in database is invalid JSON. Fix it in the admin panel.');
    }
  }

  /**
   * Get all active prompts (one per key).
   * Returns only what exists in the DB.
   */
  static async getAllActivePrompts(): Promise<PromptConfig[]> {
    return await getCollection()
      .find({ isActive: true })
      .sort({ promptKey: 1 })
      .toArray();
  }

  /**
   * Get version history for a prompt key
   */
  static async getVersionHistory(promptKey: string): Promise<PromptConfig[]> {
    try {
      return await getCollection()
        .find({ promptKey })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      logger.error(`Failed to get version history for ${promptKey}`, error);
      return [];
    }
  }

  /**
   * Save a new version of a prompt (auto-activates it)
   */
  static async saveNewVersion(
    promptKey: string,
    content: string,
    version: string,
    userId: string
  ): Promise<PromptConfig> {
    const collection = getCollection();
    const meta = PROMPT_KEYS.find(pk => pk.key === promptKey);
    if (!meta) {
      throw new Error(`Unknown prompt key: ${promptKey}`);
    }

    // Deactivate all existing versions for this key
    await collection.updateMany(
      { promptKey, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Insert new active version
    const doc: PromptConfig = {
      promptKey,
      label: meta.label,
      category: meta.category,
      content,
      version,
      isActive: true,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(doc as any);
    doc._id = result.insertedId;

    // Invalidate cache
    invalidateCache(promptKey);
    logger.info(`Saved new version "${version}" for prompt key "${promptKey}" by user ${userId}`);

    return doc;
  }

  /**
   * Activate a specific version (by document _id)
   */
  static async activateVersion(id: string): Promise<PromptConfig | null> {
    const collection = getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;

    // Deactivate all versions for this key
    await collection.updateMany(
      { promptKey: doc.promptKey, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Activate the selected version
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: true, updatedAt: new Date() } }
    );

    // Invalidate cache
    invalidateCache(doc.promptKey);
    logger.info(`Activated version "${doc.version}" for prompt key "${doc.promptKey}"`);

    return { ...doc, isActive: true };
  }

  /**
   * Seed default prompt values into the database (one-time setup).
   * Only inserts for keys that have no documents at all.
   */
  static async seedDefaults(userId: string = 'system'): Promise<{ seeded: string[]; skipped: string[] }> {
    const collection = getCollection();
    const seeded: string[] = [];
    const skipped: string[] = [];

    for (const pk of PROMPT_KEYS) {
      const existing = await collection.findOne({ promptKey: pk.key });
      if (existing) {
        skipped.push(pk.key);
        continue;
      }

      await collection.insertOne({
        promptKey: pk.key,
        label: pk.label,
        category: pk.category,
        content: getDefaultContent(pk.key),
        version: 'v1.0 (default)',
        isActive: true,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      seeded.push(pk.key);
    }

    if (seeded.length > 0) {
      invalidateCache();
      logger.info(`Seeded ${seeded.length} default prompts: ${seeded.join(', ')}`);
    }

    return { seeded, skipped };
  }

  /**
   * Get the default content for a prompt key (useful for "reset to default")
   */
  static getDefaultContent(promptKey: string): string {
    return getDefaultContent(promptKey);
  }
}
