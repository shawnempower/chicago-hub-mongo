/**
 * Hub Sales Assistant Service
 * 
 * An agentic AI assistant for sales tasks:
 * - Brand research (via web search)
 * - Inventory discovery
 * - Campaign planning
 * - Proposal generation
 * - Package exports
 * 
 * Uses Claude Opus 4.5 with tool use for intelligent task execution.
 */

import Anthropic from '@anthropic-ai/sdk';
import { HubsService } from '../src/integrations/mongodb/hubService';
import { createLogger } from '../src/utils/logger';
import { WebSearchService } from './services/webSearchService';
import { ConversationService } from './conversationService';
import { ConversationAttachment, ConversationContext, GeneratedFile } from './conversationSchema';
import { getS3Service } from './s3Service';
import { ObjectId } from 'mongodb';

const logger = createLogger('HubSalesAssistantService');

// Lazy-load Anthropic client
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

// Model configuration
const MODEL = 'claude-opus-4-5-20251101';
const MAX_TOKENS = 8192;
const MAX_TOOL_ITERATIONS = 10;

// ============================================
// Tool Definitions
// ============================================

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for information about brands, companies, competitors, or industry topics. Choose the appropriate search_type for best results.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_type: {
          type: 'string',
          enum: ['general', 'brand_research', 'company_news', 'competitors'],
          description: 'Type of search: general (default), brand_research (deep dive on a company), company_news (recent announcements), competitors (competitive analysis)'
        },
        query: {
          type: 'string',
          description: 'The search query or brand/company name'
        },
        brand_url: {
          type: 'string',
          description: 'Optional: brand website URL for more targeted brand research'
        },
        industry: {
          type: 'string',
          description: 'Optional: industry context for competitor analysis'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_inventory',
    description: 'Query the hub\'s publisher and inventory data. Use this to find publishers, placements, pricing, audience data, and available channels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query_type: {
          type: 'string',
          enum: ['all_publishers', 'publisher_details', 'placements_by_channel', 'search', 'summary'],
          description: 'Type of query: all_publishers (list all), publisher_details (specific publisher), placements_by_channel (filter by channel), search (text search), summary (aggregate stats)'
        },
        publisher_id: {
          type: 'string',
          description: 'Specific publisher ID (for publisher_details)'
        },
        channel: {
          type: 'string',
          enum: ['print', 'digital', 'newsletter', 'radio', 'podcast', 'events', 'social'],
          description: 'Channel to filter by (for placements_by_channel)'
        },
        search_term: {
          type: 'string',
          description: 'Search term for finding publishers (for search query_type)'
        }
      },
      required: ['query_type']
    }
  },
  {
    name: 'update_context',
    description: 'Save or update the conversation context with brand/campaign information. Use this when the user provides information about a brand, budget, timeline, or campaign details that should be remembered.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_name: {
          type: 'string',
          description: 'Name of the brand/company'
        },
        brand_url: {
          type: 'string',
          description: 'Brand website URL'
        },
        budget_monthly: {
          type: 'number',
          description: 'Monthly budget amount'
        },
        budget_total: {
          type: 'number',
          description: 'Total campaign budget'
        },
        campaign_duration: {
          type: 'string',
          description: 'Campaign duration (e.g., "3 months", "Q2 2026")'
        },
        target_audience: {
          type: 'string',
          description: 'Target audience description'
        },
        geographic_focus: {
          type: 'string',
          description: 'Geographic focus areas'
        },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: 'Campaign objectives'
        },
        notes: {
          type: 'string',
          description: 'Additional notes'
        }
      }
    }
  },
  {
    name: 'generate_file',
    description: 'Generate a downloadable file. Use this when the user asks for a proposal (markdown) or package export (CSV). The content should be complete and well-formatted.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_type: {
          type: 'string',
          enum: ['proposal_md', 'package_csv'],
          description: 'Type of file to generate'
        },
        filename: {
          type: 'string',
          description: 'Suggested filename (without extension, will be added automatically)'
        },
        content: {
          type: 'string',
          description: 'Complete file content (markdown for proposals, CSV for packages)'
        }
      },
      required: ['file_type', 'content']
    }
  }
];

// ============================================
// Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  generatedFiles?: GeneratedFile[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface ToolExecutionContext {
  hubId: string;
  conversationId: string;
  userId: string;
}

// ============================================
// Tool Execution
// ============================================

async function executeWebSearch(input: any): Promise<string> {
  const { search_type = 'general', query, brand_url, industry } = input;
  
  if (!WebSearchService.isConfigured()) {
    return JSON.stringify({
      error: 'Web search is not configured. PERPLEXITY_API_KEY is not set.',
      suggestion: 'Ask the user to provide brand information directly.'
    });
  }
  
  try {
    let results;
    
    switch (search_type) {
      case 'brand_research':
        // Deep dive on a brand/company
        results = await WebSearchService.researchBrand(query, brand_url);
        break;
        
      case 'company_news':
        // Recent news and announcements
        results = await WebSearchService.searchCompanyNews(query);
        break;
        
      case 'competitors':
        // Competitive analysis
        results = await WebSearchService.searchCompetitors(query, industry);
        break;
        
      case 'general':
      default:
        // General search
        results = await WebSearchService.search(query);
        break;
    }
    
    return JSON.stringify({
      searchType: search_type,
      query: results.query,
      answer: results.answer,
      sources: results.results.map(r => ({
        title: r.title,
        url: r.url
      }))
    });
  } catch (error: any) {
    return JSON.stringify({
      error: `Search failed: ${error.message}`,
      suggestion: 'Try a different search query or ask the user for information directly.'
    });
  }
}

async function executeGetInventory(input: any, hubId: string): Promise<string> {
  const { query_type, publisher_id, channel, search_term } = input;
  
  try {
    const publications = await HubsService.getHubPublications(hubId);
    
    if (!publications || publications.length === 0) {
      return JSON.stringify({ error: 'No publications found for this hub.' });
    }
    
    switch (query_type) {
      case 'summary': {
        // Aggregate statistics
        const channelCounts: Record<string, number> = {};
        let totalAudience = 0;
        
        for (const pub of publications) {
          if (pub.distributionChannels) {
            for (const ch of ['print', 'digital', 'newsletter', 'radio', 'podcast', 'events', 'social']) {
              if (pub.distributionChannels[ch]) {
                channelCounts[ch] = (channelCounts[ch] || 0) + 1;
              }
            }
          }
          totalAudience += pub.audienceDemographics?.totalAudience || 0;
        }
        
        return JSON.stringify({
          totalPublishers: publications.length,
          totalAudienceReach: totalAudience,
          channelCounts,
          publisherNames: publications.map((p: any) => p.basicInfo?.publicationName).filter(Boolean)
        });
      }
      
      case 'all_publishers': {
        return JSON.stringify({
          totalPublishers: publications.length,
          publishers: publications.map((pub: any) => ({
            id: pub.publicationId || pub._id?.toString(),
            name: pub.basicInfo?.publicationName,
            type: pub.basicInfo?.publicationType,
            location: pub.basicInfo?.primaryServiceArea,
            channels: Object.keys(pub.distributionChannels || {}).filter(
              ch => pub.distributionChannels[ch]
            ),
            audience: pub.audienceDemographics?.totalAudience || 0
          }))
        });
      }
      
      case 'publisher_details': {
        const pub = publications.find((p: any) => 
          p.publicationId === publisher_id || p._id?.toString() === publisher_id
        );
        
        if (!pub) {
          return JSON.stringify({ error: `Publisher not found: ${publisher_id}` });
        }
        
        return JSON.stringify({
          id: pub.publicationId || pub._id?.toString(),
          name: pub.basicInfo?.publicationName,
          type: pub.basicInfo?.publicationType,
          description: pub.basicInfo?.description,
          location: pub.basicInfo?.primaryServiceArea,
          coverage: pub.basicInfo?.geographicCoverage,
          channels: pub.distributionChannels,
          audience: pub.audienceDemographics,
          packages: pub.crossChannelPackages
        });
      }
      
      case 'placements_by_channel': {
        const channelPubs = publications.filter((pub: any) => 
          pub.distributionChannels?.[channel]
        );
        
        return JSON.stringify({
          channel,
          publisherCount: channelPubs.length,
          placements: channelPubs.map((pub: any) => {
            const chData = pub.distributionChannels[channel];
            return {
              publisherId: pub.publicationId || pub._id?.toString(),
              publisherName: pub.basicInfo?.publicationName,
              channelData: chData
            };
          })
        });
      }
      
      case 'search': {
        const term = (search_term || '').toLowerCase();
        const matches = publications.filter((pub: any) => {
          const name = (pub.basicInfo?.publicationName || '').toLowerCase();
          const desc = (pub.basicInfo?.description || '').toLowerCase();
          const location = (pub.basicInfo?.primaryServiceArea || '').toLowerCase();
          return name.includes(term) || desc.includes(term) || location.includes(term);
        });
        
        return JSON.stringify({
          searchTerm: search_term,
          matchCount: matches.length,
          matches: matches.map((pub: any) => ({
            id: pub.publicationId || pub._id?.toString(),
            name: pub.basicInfo?.publicationName,
            type: pub.basicInfo?.publicationType,
            location: pub.basicInfo?.primaryServiceArea,
            description: pub.basicInfo?.description?.substring(0, 200)
          }))
        });
      }
      
      default:
        return JSON.stringify({ error: `Unknown query_type: ${query_type}` });
    }
  } catch (error: any) {
    return JSON.stringify({ error: `Inventory query failed: ${error.message}` });
  }
}

async function executeUpdateContext(
  input: any,
  ctx: ToolExecutionContext
): Promise<string> {
  try {
    const contextUpdate: Partial<ConversationContext> = {};
    
    if (input.brand_name) contextUpdate.brandName = input.brand_name;
    if (input.brand_url) contextUpdate.brandUrl = input.brand_url;
    if (input.budget_monthly) contextUpdate.budgetMonthly = input.budget_monthly;
    if (input.budget_total) contextUpdate.budgetTotal = input.budget_total;
    if (input.campaign_duration) contextUpdate.campaignDuration = input.campaign_duration;
    if (input.target_audience) contextUpdate.targetAudience = input.target_audience;
    if (input.geographic_focus) contextUpdate.geographicFocus = input.geographic_focus;
    if (input.objectives) contextUpdate.objectives = input.objectives;
    if (input.notes) contextUpdate.notes = input.notes;
    
    await ConversationService.updateContext(
      ctx.conversationId,
      ctx.userId,
      contextUpdate
    );
    
    return JSON.stringify({
      success: true,
      message: 'Context updated successfully',
      updated: Object.keys(contextUpdate)
    });
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to update context: ${error.message}` });
  }
}

async function executeGenerateFile(
  input: any,
  ctx: ToolExecutionContext
): Promise<{ result: string; file?: GeneratedFile }> {
  const { file_type, filename, content } = input;
  
  try {
    const s3Service = getS3Service();
    if (!s3Service) {
      return {
        result: JSON.stringify({ error: 'S3 storage is not configured' })
      };
    }
    
    // Determine file extension and content type
    const ext = file_type === 'proposal_md' ? 'md' : 'csv';
    const contentType = file_type === 'proposal_md' ? 'text/markdown' : 'text/csv';
    const finalFilename = filename ? `${filename}.${ext}` : `generated_${Date.now()}.${ext}`;
    
    // Upload to S3
    const buffer = Buffer.from(content, 'utf-8');
    const s3Key = `conversations/${ctx.conversationId}/generated/${finalFilename}`;
    
    const uploadResult = await s3Service.uploadFileWithCustomKey(
      s3Key,
      buffer,
      contentType,
      {
        conversationId: ctx.conversationId,
        userId: ctx.userId,
        fileType: file_type
      },
      false // private file
    );
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }
    
    // Create file record
    const generatedFile: GeneratedFile = {
      id: new ObjectId().toHexString(),
      filename: finalFilename,
      fileType: file_type,
      s3Key,
      createdAt: new Date()
    };
    
    // Save to conversation
    await ConversationService.addGeneratedFile(
      ctx.conversationId,
      ctx.userId,
      generatedFile
    );
    
    return {
      result: JSON.stringify({
        success: true,
        fileId: generatedFile.id,
        filename: finalFilename,
        message: `File generated successfully. The user can download it using the download button.`
      }),
      file: generatedFile
    };
  } catch (error: any) {
    return {
      result: JSON.stringify({ error: `Failed to generate file: ${error.message}` })
    };
  }
}

async function executeTool(
  toolName: string,
  toolInput: any,
  ctx: ToolExecutionContext
): Promise<{ result: string; file?: GeneratedFile }> {
  logger.info(`Executing tool: ${toolName}`, { input: toolInput });
  
  switch (toolName) {
    case 'web_search':
      return { result: await executeWebSearch(toolInput) };
      
    case 'get_inventory':
      return { result: await executeGetInventory(toolInput, ctx.hubId) };
      
    case 'update_context':
      return { result: await executeUpdateContext(toolInput, ctx) };
      
    case 'generate_file':
      return await executeGenerateFile(toolInput, ctx);
      
    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

// ============================================
// System Prompt
// ============================================

function buildSystemPrompt(hubName?: string, context?: ConversationContext | null): string {
  const hubDisplayName = hubName || 'your hub';
  
  let prompt = `You are the Hub Sales Assistant, an AI-powered tool that helps Authorized Sales Partners research prospects, plan campaigns, and develop proposals for local media advertising.

You operate within ${hubDisplayName}, a curated network of local media publishers.

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

  // Add current context if available
  if (context && Object.keys(context).some(k => context[k as keyof ConversationContext])) {
    prompt += `\n\n## Current Conversation Context\n`;
    if (context.brandName) prompt += `- **Brand:** ${context.brandName}${context.brandUrl ? ` (${context.brandUrl})` : ''}\n`;
    if (context.budgetMonthly) prompt += `- **Monthly Budget:** $${context.budgetMonthly.toLocaleString()}\n`;
    if (context.budgetTotal) prompt += `- **Total Budget:** $${context.budgetTotal.toLocaleString()}\n`;
    if (context.campaignDuration) prompt += `- **Duration:** ${context.campaignDuration}\n`;
    if (context.targetAudience) prompt += `- **Target Audience:** ${context.targetAudience}\n`;
    if (context.geographicFocus) prompt += `- **Geographic Focus:** ${context.geographicFocus}\n`;
    if (context.objectives?.length) prompt += `- **Objectives:** ${context.objectives.join(', ')}\n`;
    if (context.notes) prompt += `- **Notes:** ${context.notes}\n`;
  }

  return prompt;
}

// ============================================
// Main Chat Function
// ============================================

export class HubSalesAssistantService {
  /**
   * Chat with the Hub Sales Assistant
   * 
   * Uses tool calling to actively gather information and generate outputs.
   */
  static async chat(
    hubId: string,
    conversationId: string,
    userId: string,
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    attachments?: ConversationAttachment[]
  ): Promise<ChatResponse> {
    try {
      logger.info(`Processing message for conversation: ${conversationId}`);
      
      // Get hub info for branding
      const hub = await HubsService.getHubBySlug(hubId);
      const hubName = hub?.name || hubId;
      
      // Get current context
      const context = await ConversationService.getContext(conversationId, userId);
      
      // Build system prompt
      const systemPrompt = buildSystemPrompt(hubName, context);
      
      // Build messages array
      const messages: Anthropic.MessageParam[] = [];
      
      // Add conversation history (last 10 messages to balance context)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Build user message content (potentially multimodal with images)
      const userContent: Anthropic.ContentBlockParam[] = [];
      
      // Add any image attachments for vision
      if (attachments?.length) {
        const s3Service = getS3Service();
        
        for (const att of attachments) {
          if (att.isImage && att.s3Key && s3Service) {
            try {
              // Get image from S3 and convert to base64
              const imageBuffer = await s3Service.getFileBuffer(att.s3Key);
              const base64 = imageBuffer.toString('base64');
              const mediaType = att.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
              
              userContent.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64
                }
              });
            } catch (e) {
              logger.warn(`Failed to load image attachment: ${att.filename}`, e);
            }
          } else if (att.extractedText) {
            // Add document text as context
            userContent.push({
              type: 'text',
              text: `[Attached file: ${att.filename}]\n${att.extractedText}\n[End of file]`
            });
          }
        }
      }
      
      // Add the user message text
      userContent.push({
        type: 'text',
        text: userMessage
      });
      
      messages.push({
        role: 'user',
        content: userContent
      });
      
      // Tool execution context
      const toolCtx: ToolExecutionContext = {
        hubId,
        conversationId,
        userId
      };
      
      // Track generated files
      const generatedFiles: GeneratedFile[] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      
      // Agentic loop - handle tool calls
      let iterations = 0;
      let response: Anthropic.Message;
      
      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        logger.info(`API call iteration ${iterations}`);
        
        response = await getAnthropicClient().messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools: TOOLS,
          messages
        });
        
        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
        
        // Check if we need to handle tool use
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );
        
        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
          // No more tool calls, we're done
          break;
        }
        
        // Execute tools and build tool results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUseBlocks) {
          const { result, file } = await executeTool(
            toolUse.name,
            toolUse.input,
            toolCtx
          );
          
          if (file) {
            generatedFiles.push(file);
          }
          
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result
          });
        }
        
        // Add assistant message with tool use to history
        messages.push({
          role: 'assistant',
          content: response.content
        });
        
        // Add tool results
        messages.push({
          role: 'user',
          content: toolResults
        });
      }
      
      // Extract final text response
      const textBlocks = response!.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      
      const finalResponse = textBlocks.map(b => b.text).join('\n\n') ||
        'I apologize, but I was unable to generate a response.';
      
      logger.info(`Completed after ${iterations} iterations, ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens`);
      
      return {
        content: finalResponse,
        model: MODEL,
        generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens
        }
      };
      
    } catch (error: any) {
      logger.error('Error in chat:', error);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      if (error.status === 401) {
        throw new Error('API key is invalid. Please check your configuration.');
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
  
  /**
   * Check if the assistant is properly configured
   */
  static isConfigured(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!process.env.ANTHROPIC_API_KEY) {
      issues.push('ANTHROPIC_API_KEY is not set');
    }
    
    if (!process.env.TAVILY_API_KEY) {
      issues.push('TAVILY_API_KEY is not set (web search will be disabled)');
    }
    
    return {
      ready: issues.length === 0 || (issues.length === 1 && issues[0].includes('TAVILY')),
      issues
    };
  }
}
