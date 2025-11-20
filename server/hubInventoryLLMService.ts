/**
 * Hub Inventory LLM Service
 * 
 * Uses Anthropic Claude to answer questions about hub publication inventory
 * Manages context files and conversation history
 */

import Anthropic from '@anthropic-ai/sdk';
import { getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { HubsService } from '../src/integrations/mongodb/hubService';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('HubInventoryLLMService');

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

// Cache for prepared context (per hub) - stores both summary and full data
interface ContextCache {
  summary: string;
  fullData: string;
  uploadedAt: Date;
  publicationCount: number;
  tokenEstimate: number;
}
const contextCache = new Map<string, ContextCache>();

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class HubInventoryLLMService {
  /**
   * Prepare publication summary (lightweight for every message)
   */
  private static async preparePublicationSummary(hubId: string): Promise<string> {
    const publications = await HubsService.getHubPublications(hubId);
    
    if (!publications || publications.length === 0) {
      throw new Error(`No publications found for hub: ${hubId}`);
    }

    const summary = publications.map((pub: any) => {
      const channels = [];
      if (pub.distributionChannels?.print) channels.push('print');
      if (pub.distributionChannels?.digital) channels.push('digital');
      if (pub.distributionChannels?.newsletter) channels.push('newsletter');
      if (pub.distributionChannels?.social) channels.push('social');
      if (pub.distributionChannels?.events) channels.push('events');
      if (pub.distributionChannels?.podcasts) channels.push('podcasts');
      if (pub.distributionChannels?.radio) channels.push('radio');

      return {
        id: pub.publicationId,
        name: pub.basicInfo?.publicationName,
        type: pub.basicInfo?.publicationType,
        location: pub.basicInfo?.primaryServiceArea,
        channels: channels,
        totalAudience: pub.audienceDemographics?.totalAudience || 0
      };
    });

    return `Hub has ${publications.length} publications:\n${JSON.stringify(summary, null, 2)}`;
  }

  /**
   * Prepare full publication data for context (compact version)
   * Creates a streamlined JSON document with essential information
   */
  private static async preparePublicationContext(hubId: string): Promise<string> {
    const publications = await HubsService.getHubPublications(hubId);
    
    if (!publications || publications.length === 0) {
      throw new Error(`No publications found for hub: ${hubId}`);
    }

    // Create a compact context document with only essential fields
    const contextData = {
      hubId,
      totalPublications: publications.length,
      publications: publications.map((pub: any) => {
        // Extract key channel info compactly
        const channels: any = {};
        if (pub.distributionChannels) {
          if (pub.distributionChannels.print) {
            channels.print = {
              available: true,
              circulation: pub.distributionChannels.print.totalCirculation,
              pricing: pub.distributionChannels.print.adSizes?.map((ad: any) => ({
                size: ad.size,
                price: ad.basePrice
              }))
            };
          }
          if (pub.distributionChannels.digital) {
            channels.digital = {
              available: true,
              monthlyVisitors: pub.distributionChannels.digital.monthlyUniqueVisitors,
              pricing: pub.distributionChannels.digital.adPlacements?.map((ad: any) => ({
                placement: ad.placementName,
                price: ad.basePrice
              }))
            };
          }
          if (pub.distributionChannels.newsletter) {
            channels.newsletter = {
              available: true,
              subscribers: pub.distributionChannels.newsletter.subscribers,
              pricing: pub.distributionChannels.newsletter.adPlacements?.map((ad: any) => ({
                placement: ad.placementName,
                price: ad.basePrice
              }))
            };
          }
          if (pub.distributionChannels.social) {
            channels.social = {
              available: true,
              followers: pub.distributionChannels.social.totalFollowers
            };
          }
          if (pub.distributionChannels.events) {
            channels.events = {
              available: true,
              annualEvents: pub.distributionChannels.events.annualEventCount
            };
          }
          if (pub.distributionChannels.podcasts) {
            channels.podcasts = {
              available: true,
              listeners: pub.distributionChannels.podcasts.totalMonthlyListeners
            };
          }
          if (pub.distributionChannels.radio) {
            channels.radio = {
              available: true,
              weeklyListeners: pub.distributionChannels.radio.weeklyListeners
            };
          }
        }

        return {
          id: pub.publicationId,
          name: pub.basicInfo?.publicationName,
          type: pub.basicInfo?.publicationType,
          content: pub.basicInfo?.contentType,
          location: pub.basicInfo?.primaryServiceArea,
          coverage: pub.basicInfo?.geographicCoverage,
          channels: channels,
          audience: {
            total: pub.audienceDemographics?.totalAudience,
            ageGroups: pub.audienceDemographics?.ageGroups,
            income: pub.audienceDemographics?.householdIncome,
            location: pub.audienceDemographics?.location
          },
          packages: pub.crossChannelPackages?.map((pkg: any) => ({
            name: pkg.name || pkg.packageName,
            channels: pkg.includedChannels,
            price: pkg.pricing
          }))
        };
      })
    };

    return JSON.stringify(contextData);
  }

  /**
   * Get or create context with caching
   */
  private static async getOrCreateContext(hubId: string): Promise<ContextCache> {
    // Check cache
    const cached = contextCache.get(hubId);
    if (cached) {
      const cacheAge = Date.now() - cached.uploadedAt.getTime();
      const maxCacheAge = 60 * 60 * 1000; // 1 hour
      
      if (cacheAge < maxCacheAge) {
        logger.info(`Using cached context for hub: ${hubId} (${cached.publicationCount} publications)`);
        return cached;
      }
    }

    // Prepare fresh context
    logger.info(`Preparing fresh context for hub: ${hubId}`);
    const summary = await this.preparePublicationSummary(hubId);
    const fullData = await this.preparePublicationContext(hubId);
    
    const publications = await HubsService.getHubPublications(hubId);
    
    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const tokenEstimate = Math.ceil(fullData.length / 4);
    
    const cache: ContextCache = {
      summary,
      fullData,
      uploadedAt: new Date(),
      publicationCount: publications.length,
      tokenEstimate
    };
    
    contextCache.set(hubId, cache);
    logger.info(`Cached context: ${cache.publicationCount} pubs, ~${tokenEstimate} tokens`);

    return cache;
  }

  /**
   * Build system prompt for the inventory agent
   */
  private static buildSystemPrompt(): string {
    return `You are an expert media inventory assistant helping users explore publication inventory data for their hub.

Your role is to:
1. Answer questions about publications, their distribution channels, audience demographics, and pricing
2. Compare publications and help users find the best match for their needs
3. Provide insights about reach, audience demographics, and advertising opportunities
4. Help users understand the inventory available across different channels (print, digital, newsletter, social, events, etc.)

When answering:
- Be specific and cite publication names
- Use data from the provided publication inventory
- Provide actionable insights
- Format responses clearly with bullet points or tables when appropriate
- If asked about pricing, refer to the distributionChannels data where pricing information is stored
- If data is missing or unclear, acknowledge it honestly

The user has access to publication data for their specific hub. All questions will be about the publications in their assigned hub.`;
  }

  /**
   * Chat with the inventory agent
   * Uses prompt caching to handle large contexts efficiently
   */
  static async chat(
    hubId: string,
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      logger.info(`Processing chat message for hub: ${hubId}`);
      
      // Get publication context
      const context = await this.getOrCreateContext(hubId);
      logger.info(`Context size: ${context.publicationCount} publications, ~${context.tokenEstimate} tokens`);
      
      // Build system prompt with cached context
      const systemPrompt = this.buildSystemPrompt();
      
      // Build conversation messages
      const messages: Anthropic.MessageParam[] = [];
      
      // Add conversation history (limited to recent messages to avoid token limits)
      const recentHistory = conversationHistory.slice(-6); // Last 6 messages to save tokens
      
      // Determine if we need to include full context
      const isFirstMessage = conversationHistory.length === 0;
      const includeFullContext = isFirstMessage || context.tokenEstimate < 50000; // Only if reasonable size
      
      if (isFirstMessage) {
        // First message - include context
        if (includeFullContext) {
          // Include full context in system prompt
          const systemWithContext = `${systemPrompt}\n\n=== PUBLICATION INVENTORY DATA ===\n\n${context.fullData}\n\n=== END INVENTORY DATA ===\n\nPlease answer the user's questions based on this inventory data.`;
          
          messages.push({
            role: 'user',
            content: userMessage,
          });

          // Call Anthropic API with full context
          logger.info(`Calling Anthropic API with full context (first message, ${context.tokenEstimate} tokens)`);
          const completion = await getAnthropicClient().messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemWithContext,
            messages: messages,
            temperature: 0.7,
          });

          const responseText = completion.content[0].type === 'text' 
            ? completion.content[0].text 
            : 'Sorry, I could not generate a response.';

          logger.info(`Received response (${responseText.length} chars, ${completion.usage.input_tokens} input tokens)`);

          return {
            content: responseText,
            model: completion.model,
            usage: {
              inputTokens: completion.usage.input_tokens,
              outputTokens: completion.usage.output_tokens,
            },
          };
        } else {
          // Context too large - use summary only
          messages.push({
            role: 'user',
            content: `${context.summary}\n\nQuestion: ${userMessage}\n\nNote: For specific details about publications, please ask about them individually.`,
          });
        }
      } else {
        // Subsequent messages - include context reminder + history
        const systemWithContext = `${systemPrompt}\n\n=== PUBLICATION INVENTORY REMINDER ===\n${context.summary}\n=== END REMINDER ===`;
        
        // Add conversation history
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
        
        messages.push({
          role: 'user',
          content: userMessage,
        });

        // Call Anthropic API with context reminder
        logger.info(`Calling Anthropic API with ${messages.length} messages and context reminder`);
        const completion = await getAnthropicClient().messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemWithContext,
          messages: messages,
          temperature: 0.7,
        });

        const responseText = completion.content[0].type === 'text' 
          ? completion.content[0].text 
          : 'Sorry, I could not generate a response.';

        logger.info(`Received response (${responseText.length} chars)`);

        return {
          content: responseText,
          model: completion.model,
          usage: {
            inputTokens: completion.usage.input_tokens,
            outputTokens: completion.usage.output_tokens,
          },
        };
      }

      // Call Anthropic API (for large contexts that use summary mode)
      logger.info(`Calling Anthropic API with ${messages.length} messages (summary mode)`);
      const completion = await getAnthropicClient().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7,
      });

      const responseText = completion.content[0].type === 'text' 
        ? completion.content[0].text 
        : 'Sorry, I could not generate a response.';

      logger.info(`Received response (${responseText.length} chars)`);

      return {
        content: responseText,
        model: completion.model,
        usage: {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
        },
      };
    } catch (error: any) {
      logger.error('Error in chat:', error);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      if (error.status === 401) {
        throw new Error('API key is invalid. Please check your configuration.');
      }
      
      if (error.message && error.message.includes('prompt is too long')) {
        throw new Error('The publication data is too large. Please contact support to enable advanced context handling.');
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Clear context cache for a hub (useful when publications are updated)
   */
  static clearContextCache(hubId: string): void {
    contextCache.delete(hubId);
    logger.info(`Cleared context cache for hub: ${hubId}`);
  }

  /**
   * Clear all context caches
   */
  static clearAllContextCaches(): void {
    contextCache.clear();
    logger.info('Cleared all context caches');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { hubId: string; publications: number; tokens: number; age: number }[] {
    const stats: { hubId: string; publications: number; tokens: number; age: number }[] = [];
    contextCache.forEach((cache, hubId) => {
      stats.push({
        hubId,
        publications: cache.publicationCount,
        tokens: cache.tokenEstimate,
        age: Math.floor((Date.now() - cache.uploadedAt.getTime()) / 1000)
      });
    });
    return stats;
  }
}

