/**
 * Hub Network Summary Agent
 * 
 * An autonomous Claude-based agent that generates rich network summaries
 * for hubs by systematically exploring publication data, audience metrics,
 * and market context. Replaces the previous single Perplexity API call
 * with a multi-turn agentic loop.
 * 
 * Output: 7-section structured summary saved to hub.networkSummary
 */

import Anthropic from '@anthropic-ai/sdk';
import { HubsService } from '../../src/integrations/mongodb/hubService';
import { createLogger } from '../../src/utils/logger';
import { WebSearchService } from './webSearchService';
import { PromptConfigService } from './promptConfigService';
import type { Hub } from '../../src/integrations/mongodb/hubSchema';

const logger = createLogger('HubNetworkSummaryAgent');

// Lazy-load Anthropic client
let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

// Agent configuration
const MAX_TOOL_ITERATIONS = 8;
const WALL_CLOCK_LIMIT_MS = 90_000; // 90 seconds
const MODEL = 'claude-sonnet-4-20250514'; // Faster model for one-shot generation
const MAX_TOKENS = 8192;

// ============================================
// Types
// ============================================

export interface NetworkSummaryResult {
  valueProposition: string;
  audienceHighlights: string;
  marketCoverage: string;
  channelStrengths: string;
  competitivePositioning: string;
  contentVerticals: string;
  recommendedVerticals: string;
  citations: string[];
  generatedAt: Date;
  generatedBy: string;
  publicationCount: number;
  version: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    iterations: number;
  };
}

// ============================================
// Tool Definitions
// ============================================

function buildTools(): Anthropic.Tool[] {
  return [
    {
      name: 'get_hub_overview',
      description: 'Get hub-level metadata including name, tagline, description, geographic coverage (region, city, DMAs, counties), and advertising terms. Call this first to understand the hub.',
      input_schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'list_publications',
      description: 'List all publications in the hub with basic info, audience size, channel availability, AI profile summaries, content focus, and awards count. Use this as a table of contents to decide which publications to explore deeper.',
      input_schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'get_publication_detail',
      description: 'Get full details for a specific publication including: complete AI profile (summary, full profile, audience insight, community role), full audience demographics (age/gender/income/education), all distribution channels with metrics and pricing, editorial info (content pillars, special sections), competitive info, cross-channel packages, awards, and business info.',
      input_schema: {
        type: 'object' as const,
        properties: {
          publisher_id: {
            type: 'string',
            description: 'The publication ID to look up',
          },
        },
        required: ['publisher_id'],
      },
    },
    {
      name: 'get_aggregate_metrics',
      description: 'Get network-wide aggregate metrics: total audience, per-channel subscriber/follower/circulation totals, weighted audience demographic averages, geographic coverage (all service areas, DMAs), top content verticals, and top advertiser categories across all publications.',
      input_schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'web_search',
      description: 'Search the web for external market context about the hub\'s region, industry trends, or competitive landscape. Use sparingly -- most data is available from the other tools.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  ];
}

// ============================================
// Tool Execution
// ============================================

function executeGetHubOverview(hub: Hub): string {
  return JSON.stringify({
    hubId: hub.hubId,
    name: hub.basicInfo?.name,
    tagline: hub.basicInfo?.tagline,
    description: hub.basicInfo?.description,
    geography: {
      region: hub.geography?.region,
      primaryCity: hub.geography?.primaryCity,
      state: hub.geography?.state,
      dmas: hub.geography?.dmas,
      counties: hub.geography?.counties,
    },
    advertisingTerms: hub.advertisingTerms?.standardTerms,
    status: hub.status,
  });
}

function executeListPublications(publications: any[]): string {
  return JSON.stringify({
    totalPublications: publications.length,
    publications: publications.map((pub: any) => ({
      id: pub.publicationId || pub._id?.toString(),
      name: pub.basicInfo?.publicationName,
      type: pub.basicInfo?.publicationType,
      contentType: pub.basicInfo?.contentType,
      serviceArea: pub.basicInfo?.primaryServiceArea,
      secondaryMarkets: pub.basicInfo?.secondaryMarkets,
      totalAudience: pub.audienceDemographics?.totalAudience || 0,
      channels: Object.keys(pub.distributionChannels || {}).filter(
        (ch) => {
          const val = pub.distributionChannels[ch];
          return val && (Array.isArray(val) ? val.length > 0 : Object.keys(val).length > 0);
        }
      ),
      aiProfileSummary: pub.aiProfile?.summary || null,
      valueProposition: pub.competitiveInfo?.uniqueValueProposition || null,
      contentFocus: pub.editorialInfo?.contentFocus || [],
      awardsCount: pub.awards?.length || 0,
      yearsInOperation: pub.businessInfo?.yearsInOperation || null,
      ownershipType: pub.businessInfo?.ownershipType || null,
    })),
  });
}

function executeGetPublicationDetail(publications: any[], publisherId: string): string {
  const pub = publications.find(
    (p: any) => p.publicationId === publisherId || p._id?.toString() === publisherId
  );

  if (!pub) {
    return JSON.stringify({ error: `Publication not found: ${publisherId}` });
  }

  return JSON.stringify({
    id: pub.publicationId || pub._id?.toString(),
    name: pub.basicInfo?.publicationName,
    type: pub.basicInfo?.publicationType,
    contentType: pub.basicInfo?.contentType,
    description: pub.basicInfo?.description,
    serviceArea: pub.basicInfo?.primaryServiceArea,
    secondaryMarkets: pub.basicInfo?.secondaryMarkets,
    geographicCoverage: pub.basicInfo?.geographicCoverage,
    founded: pub.basicInfo?.founded,
    aiProfile: pub.aiProfile
      ? {
          summary: pub.aiProfile.summary,
          fullProfile: pub.aiProfile.fullProfile,
          audienceInsight: pub.aiProfile.audienceInsight,
          communityRole: pub.aiProfile.communityRole,
        }
      : null,
    audienceDemographics: pub.audienceDemographics,
    distributionChannels: pub.distributionChannels,
    editorialInfo: {
      contentFocus: pub.editorialInfo?.contentFocus,
      contentPillars: pub.editorialInfo?.contentPillars,
      specialSections: pub.editorialInfo?.specialSections,
      signatureFeatures: pub.editorialInfo?.signatureFeatures,
    },
    competitiveInfo: pub.competitiveInfo,
    crossChannelPackages: pub.crossChannelPackages,
    awards: pub.awards,
    businessInfo: {
      ownershipType: pub.businessInfo?.ownershipType,
      yearsInOperation: pub.businessInfo?.yearsInOperation,
      numberOfEmployees: pub.businessInfo?.numberOfEmployees,
      topAdvertiserCategories: pub.businessInfo?.topAdvertiserCategories,
      clientRetentionRate: pub.businessInfo?.clientRetentionRate,
    },
  });
}

function executeGetAggregateMetrics(publications: any[]): string {
  let totalAudience = 0;
  const channelMetrics: Record<string, any> = {};
  const allServiceAreas = new Set<string>();
  const allDMAs = new Set<string>();
  const contentVerticals: Record<string, number> = {};
  const advertiserCategories: Record<string, number> = {};
  const allAwards: any[] = [];

  // Demographic aggregates (weighted by audience)
  const demoAgg = {
    totalWeightedAudience: 0,
    ageGroups: {} as Record<string, number>,
    gender: {} as Record<string, number>,
    householdIncome: {} as Record<string, number>,
    education: {} as Record<string, number>,
    interests: {} as Record<string, number>,
  };

  for (const pub of publications) {
    const audience = pub.audienceDemographics?.totalAudience || 0;
    totalAudience += audience;

    // Service areas
    if (pub.basicInfo?.primaryServiceArea) allServiceAreas.add(pub.basicInfo.primaryServiceArea);
    if (pub.basicInfo?.secondaryMarkets) {
      for (const m of pub.basicInfo.secondaryMarkets) allServiceAreas.add(m);
    }
    if (pub.basicInfo?.serviceAreas) {
      for (const sa of pub.basicInfo.serviceAreas) {
        if (sa.dmaName) allDMAs.add(sa.dmaName);
      }
    }

    // Content verticals
    if (pub.editorialInfo?.contentFocus) {
      for (const topic of pub.editorialInfo.contentFocus) {
        contentVerticals[topic] = (contentVerticals[topic] || 0) + 1;
      }
    }

    // Advertiser categories
    if (pub.businessInfo?.topAdvertiserCategories) {
      for (const cat of pub.businessInfo.topAdvertiserCategories) {
        advertiserCategories[cat] = (advertiserCategories[cat] || 0) + 1;
      }
    }

    // Awards
    if (pub.awards?.length) {
      for (const award of pub.awards) {
        allAwards.push({
          publication: pub.basicInfo?.publicationName,
          ...award,
        });
      }
    }

    // Channel metrics
    const dc = pub.distributionChannels || {};

    // Website
    if (dc.website && Object.keys(dc.website).length > 0) {
      if (!channelMetrics.website) channelMetrics.website = { count: 0, totalMonthlyVisitors: 0, totalMonthlyPageViews: 0 };
      channelMetrics.website.count++;
      channelMetrics.website.totalMonthlyVisitors += dc.website.monthlyVisitors || 0;
      channelMetrics.website.totalMonthlyPageViews += dc.website.monthlyPageViews || 0;
    }

    // Newsletters
    if (dc.newsletters?.length) {
      if (!channelMetrics.newsletter) channelMetrics.newsletter = { count: 0, totalSubscribers: 0, publications: 0 };
      channelMetrics.newsletter.publications++;
      for (const nl of dc.newsletters) {
        channelMetrics.newsletter.count++;
        channelMetrics.newsletter.totalSubscribers += nl.subscribers || 0;
      }
    }

    // Print
    if (dc.print?.length) {
      if (!channelMetrics.print) channelMetrics.print = { count: 0, totalCirculation: 0, publications: 0 };
      channelMetrics.print.publications++;
      for (const p of dc.print) {
        channelMetrics.print.count++;
        channelMetrics.print.totalCirculation += p.circulation || 0;
      }
    }

    // Social media
    if (dc.socialMedia?.length) {
      if (!channelMetrics.social) channelMetrics.social = { count: 0, totalFollowers: 0, publications: 0, platforms: new Set<string>() };
      channelMetrics.social.publications++;
      for (const s of dc.socialMedia) {
        channelMetrics.social.count++;
        channelMetrics.social.totalFollowers += s.followers || 0;
        if (s.platform) channelMetrics.social.platforms.add(s.platform);
      }
    }

    // Podcasts
    if (dc.podcasts?.length) {
      if (!channelMetrics.podcast) channelMetrics.podcast = { count: 0, totalDownloads: 0, publications: 0 };
      channelMetrics.podcast.publications++;
      for (const pod of dc.podcasts) {
        channelMetrics.podcast.count++;
        channelMetrics.podcast.totalDownloads += pod.averageDownloads || 0;
      }
    }

    // Radio
    if (dc.radioStations?.length) {
      if (!channelMetrics.radio) channelMetrics.radio = { count: 0, totalListeners: 0 };
      for (const r of dc.radioStations) {
        channelMetrics.radio.count++;
        channelMetrics.radio.totalListeners += r.listeners || 0;
      }
    }

    // Events
    if (dc.events?.length) {
      if (!channelMetrics.events) channelMetrics.events = { count: 0, totalAttendance: 0, publications: 0 };
      channelMetrics.events.publications++;
      for (const e of dc.events) {
        channelMetrics.events.count++;
        channelMetrics.events.totalAttendance += e.averageAttendance || 0;
      }
    }

    // Streaming
    if (dc.streamingVideo?.length) {
      if (!channelMetrics.streaming) channelMetrics.streaming = { count: 0, totalSubscribers: 0 };
      for (const sv of dc.streamingVideo) {
        channelMetrics.streaming.count++;
        channelMetrics.streaming.totalSubscribers += sv.subscribers || 0;
      }
    }

    // Weighted demographics
    if (audience > 0 && pub.audienceDemographics) {
      demoAgg.totalWeightedAudience += audience;
      const demo = pub.audienceDemographics;

      // Age groups
      if (demo.ageGroups) {
        for (const [k, v] of Object.entries(demo.ageGroups)) {
          demoAgg.ageGroups[k] = (demoAgg.ageGroups[k] || 0) + (v as number) * audience;
        }
      }
      // Gender
      if (demo.gender) {
        for (const [k, v] of Object.entries(demo.gender)) {
          demoAgg.gender[k] = (demoAgg.gender[k] || 0) + (v as number) * audience;
        }
      }
      // Income
      if (demo.householdIncome) {
        for (const [k, v] of Object.entries(demo.householdIncome)) {
          demoAgg.householdIncome[k] = (demoAgg.householdIncome[k] || 0) + (v as number) * audience;
        }
      }
      // Education
      if (demo.education) {
        for (const [k, v] of Object.entries(demo.education)) {
          demoAgg.education[k] = (demoAgg.education[k] || 0) + (v as number) * audience;
        }
      }
      // Interests
      if (demo.interests) {
        for (const interest of demo.interests) {
          demoAgg.interests[interest] = (demoAgg.interests[interest] || 0) + 1;
        }
      }
    }
  }

  // Convert weighted sums to averages
  const avgDemographics: Record<string, any> = {};
  if (demoAgg.totalWeightedAudience > 0) {
    const w = demoAgg.totalWeightedAudience;
    if (Object.keys(demoAgg.ageGroups).length) {
      avgDemographics.ageGroups = Object.fromEntries(
        Object.entries(demoAgg.ageGroups).map(([k, v]) => [k, Math.round((v / w) * 100) / 100])
      );
    }
    if (Object.keys(demoAgg.gender).length) {
      avgDemographics.gender = Object.fromEntries(
        Object.entries(demoAgg.gender).map(([k, v]) => [k, Math.round((v / w) * 100) / 100])
      );
    }
    if (Object.keys(demoAgg.householdIncome).length) {
      avgDemographics.householdIncome = Object.fromEntries(
        Object.entries(demoAgg.householdIncome).map(([k, v]) => [k, Math.round((v / w) * 100) / 100])
      );
    }
    if (Object.keys(demoAgg.education).length) {
      avgDemographics.education = Object.fromEntries(
        Object.entries(demoAgg.education).map(([k, v]) => [k, Math.round((v / w) * 100) / 100])
      );
    }
  }

  // Convert social platforms Set to array for JSON serialization
  if (channelMetrics.social?.platforms) {
    channelMetrics.social.platforms = [...channelMetrics.social.platforms];
  }

  // Sort content verticals and advertiser categories by frequency
  const sortedVerticals = Object.entries(contentVerticals)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => ({ topic, publicationCount: count }));

  const sortedCategories = Object.entries(advertiserCategories)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => ({ category, publicationCount: count }));

  return JSON.stringify({
    totalPublications: publications.length,
    totalAudience,
    channelMetrics,
    geographicCoverage: {
      serviceAreas: [...allServiceAreas],
      dmas: [...allDMAs],
    },
    averageDemographics: avgDemographics,
    topInterests: Object.entries(demoAgg.interests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([interest, count]) => ({ interest, publicationCount: count })),
    contentVerticals: sortedVerticals,
    topAdvertiserCategories: sortedCategories,
    awards: allAwards.slice(0, 20), // Cap at 20 most recent
  });
}

async function executeWebSearch(query: string): Promise<string> {
  if (!WebSearchService.isConfigured()) {
    return JSON.stringify({ error: 'Web search is not configured.' });
  }
  try {
    const results = await WebSearchService.search(query);
    return JSON.stringify({
      query: results.query,
      answer: results.answer,
      sources: results.results.map((r) => ({ title: r.title, url: r.url })),
    });
  } catch (error: any) {
    return JSON.stringify({ error: `Search failed: ${error.message}` });
  }
}

async function executeTool(
  toolName: string,
  toolInput: any,
  hub: Hub,
  publications: any[]
): Promise<string> {
  logger.info(`Executing tool: ${toolName}`);

  switch (toolName) {
    case 'get_hub_overview':
      return executeGetHubOverview(hub);
    case 'list_publications':
      return executeListPublications(publications);
    case 'get_publication_detail':
      return executeGetPublicationDetail(publications, toolInput.publisher_id);
    case 'get_aggregate_metrics':
      return executeGetAggregateMetrics(publications);
    case 'web_search':
      return await executeWebSearch(toolInput.query);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ============================================
// Section Parsing
// ============================================

const SECTION_LABELS = [
  'VALUE PROPOSITION',
  'AUDIENCE HIGHLIGHTS',
  'MARKET COVERAGE',
  'CHANNEL STRENGTHS',
  'COMPETITIVE POSITIONING',
  'CONTENT VERTICALS',
  'RECOMMENDED VERTICALS',
] as const;

function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};

  for (let i = 0; i < SECTION_LABELS.length; i++) {
    const label = SECTION_LABELS[i];
    const nextLabel = SECTION_LABELS[i + 1];

    let pattern: RegExp;
    if (nextLabel) {
      pattern = new RegExp(
        `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*?)(?=(?:#+\\s*)?(?:\\d+\\.\\s*)?${nextLabel})`,
        'i'
      );
    } else {
      pattern = new RegExp(
        `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*)$`,
        'i'
      );
    }

    const match = text.match(pattern);
    sections[label] = match ? match[1].trim() : '';
  }

  return sections;
}

// ============================================
// Main Agent
// ============================================

export class HubNetworkSummaryAgent {
  /**
   * Generate a comprehensive network summary for a hub.
   * Runs an autonomous Claude agent that uses tools to gather data
   * and produces a 7-section structured summary.
   */
  static async generate(
    hub: Hub,
    publications: any[],
    currentVersion: number = 0
  ): Promise<NetworkSummaryResult> {
    const startTime = Date.now();

    logger.info(`Starting network summary generation for hub "${hub.basicInfo?.name}" with ${publications.length} publications`);

    // Load system prompt from DB
    let systemPrompt: string;
    try {
      systemPrompt = await PromptConfigService.getActivePrompt('hub_network_summary');
    } catch {
      systemPrompt = PromptConfigService.getDefaultContent('hub_network_summary');
    }

    const tools = buildTools();
    const messages: Anthropic.MessageParam[] = [];

    // Initial user message to kick off the agent
    const hubName = hub.basicInfo?.name || hub.hubId;
    const region = hub.geography?.region || hub.geography?.primaryCity || '';

    messages.push({
      role: 'user',
      content: `Generate a comprehensive network summary for "${hubName}"${region ? ` (${region})` : ''} with ${publications.length} publications. Use your tools to gather all the data you need, then write the 7-section summary.`,
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterations = 0;
    let response: Anthropic.Message;
    let citations: string[] = [];

    // Agentic loop
    while (iterations < MAX_TOOL_ITERATIONS) {
      // Check wall-clock limit
      if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) {
        logger.warn(`Wall-clock limit reached after ${iterations} iterations (${Math.round((Date.now() - startTime) / 1000)}s)`);
        break;
      }

      iterations++;
      logger.info(`Agent iteration ${iterations}`);

      response = await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check for tool use
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        break;
      }

      // Execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input, hub, publications);

        // Collect citations from web search results
        if (toolUse.name === 'web_search') {
          try {
            const parsed = JSON.parse(result);
            if (parsed.sources) {
              citations.push(...parsed.sources.map((s: any) => s.url).filter(Boolean));
            }
          } catch { /* ignore parse errors */ }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add to message history
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    // Extract final text
    const textBlocks = response!.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const finalText = textBlocks.map((b) => b.text).join('\n\n');

    if (!finalText) {
      throw new Error('Agent failed to produce a summary after all iterations.');
    }

    // Parse sections
    const sections = parseSections(finalText);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    logger.info(
      `Network summary generated in ${elapsed}s, ${iterations} iterations, ` +
      `${totalInputTokens} input + ${totalOutputTokens} output tokens`
    );

    return {
      valueProposition: sections['VALUE PROPOSITION'] || '',
      audienceHighlights: sections['AUDIENCE HIGHLIGHTS'] || '',
      marketCoverage: sections['MARKET COVERAGE'] || '',
      channelStrengths: sections['CHANNEL STRENGTHS'] || '',
      competitivePositioning: sections['COMPETITIVE POSITIONING'] || '',
      contentVerticals: sections['CONTENT VERTICALS'] || '',
      recommendedVerticals: sections['RECOMMENDED VERTICALS'] || '',
      citations,
      generatedAt: new Date(),
      generatedBy: `claude-${MODEL}`,
      publicationCount: publications.length,
      version: currentVersion + 1,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        iterations,
      },
    };
  }
}
