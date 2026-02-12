/**
 * Web Search Service
 * 
 * Provides web search capability for the Hub Sales Assistant
 * using Perplexity API (LLM with built-in search).
 */

import { createLogger } from '../../src/utils/logger';
import { PromptConfigService } from './promptConfigService';

const logger = createLogger('WebSearchService');

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  answer?: string;
}

/**
 * Web Search Service using Perplexity API
 * 
 * Perplexity combines search + LLM in one step, providing
 * synthesized answers with citations.
 */
export class WebSearchService {
  private static apiKey: string | null = null;
  private static baseUrl = 'https://api.perplexity.ai';

  /**
   * Get or validate the API key
   */
  private static getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    }
    
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }
    
    return this.apiKey;
  }

  /**
   * Search the web for information using Perplexity
   * 
   * @param query - The search query
   * @param options - Optional search parameters
   */
  static async search(
    query: string,
    options: {
      model?: 'sonar' | 'sonar-pro';
      systemPrompt?: string;
    } = {}
  ): Promise<SearchResponse> {
    const apiKey = this.getApiKey();
    
    // If no systemPrompt provided, load default from DB
    let model = options.model || 'sonar';
    let systemPrompt = options.systemPrompt;
    if (!systemPrompt) {
      systemPrompt = await PromptConfigService.getActivePrompt('search_default');
    }

    logger.info(`Searching with Perplexity: "${query}" (model: ${model})`);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: query,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Perplexity API error: ${response.status} - ${errorText}`);
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the answer from the response
      const answer = data.choices?.[0]?.message?.content || '';
      
      // Extract citations if available
      const citations = data.citations || [];
      const results: SearchResult[] = citations.map((url: string, index: number) => ({
        title: `Source ${index + 1}`,
        url: url,
        content: '',
        score: 1 - (index * 0.1), // Decreasing relevance score
      }));

      logger.info(`Perplexity search completed (${answer.length} chars, ${results.length} citations)`);

      return {
        results,
        query,
        answer,
      };
    } catch (error: any) {
      logger.error(`Search error for "${query}":`, error);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  /**
   * Research a brand/company
   */
  static async researchBrand(
    brandName: string,
    brandUrl?: string
  ): Promise<SearchResponse> {
    const query = brandUrl 
      ? `Research ${brandName} (website: ${brandUrl}). Include: company overview, brand positioning, target customers, Chicago/local presence, products/services, community involvement, and recent news or marketing campaigns.`
      : `Research ${brandName}. Include: company overview, brand positioning, target customers, locations, products/services, community involvement, and recent news or marketing campaigns.`;

    // Load prompt and model config from DB
    const [brandPrompt, modelConfig] = await Promise.all([
      PromptConfigService.getActivePrompt('search_brand_research'),
      PromptConfigService.getModelConfig(),
    ]);

    return this.search(query, {
      model: modelConfig.searchModelPro || 'sonar-pro',
      systemPrompt: brandPrompt,
    });
  }

  /**
   * Search for news about a company
   */
  static async searchCompanyNews(companyName: string): Promise<SearchResponse> {
    const query = `What are the latest news and announcements about ${companyName}? Focus on marketing campaigns, new products, expansions, and community initiatives from the past 6 months.`;
    
    // Load prompt and model config from DB
    const [newsPrompt, modelConfig] = await Promise.all([
      PromptConfigService.getActivePrompt('search_company_news'),
      PromptConfigService.getModelConfig(),
    ]);

    return this.search(query, {
      model: modelConfig.searchModelDefault || 'sonar',
      systemPrompt: newsPrompt,
    });
  }

  /**
   * Search for competitor information
   */
  static async searchCompetitors(
    brandName: string,
    industry?: string
  ): Promise<SearchResponse> {
    const industryContext = industry ? ` in the ${industry} industry` : '';
    const query = `Who are the main competitors of ${brandName}${industryContext}? How does ${brandName} differentiate itself? What is their market position?`;

    // Load prompt and model config from DB
    const [competitorsPrompt, modelConfig] = await Promise.all([
      PromptConfigService.getActivePrompt('search_competitors'),
      PromptConfigService.getModelConfig(),
    ]);

    return this.search(query, {
      model: modelConfig.searchModelDefault || 'sonar',
      systemPrompt: competitorsPrompt,
    });
  }

  /**
   * Research a publication/media outlet for an AI-generated profile.
   * Used to generate persistent publication context for client-facing reports.
   * 
   * Returns a structured profile with separate sections for summary, 
   * full narrative, audience insight, and community role.
   */
  static async researchPublication(
    publicationName: string,
    options: {
      websiteUrl?: string;
      publicationType?: string;
      serviceArea?: string;
      contentType?: string;
    } = {}
  ): Promise<SearchResponse> {
    const { websiteUrl, publicationType, serviceArea, contentType } = options;

    const contextParts: string[] = [];
    if (websiteUrl) contextParts.push(`website: ${websiteUrl}`);
    if (publicationType) contextParts.push(`type: ${publicationType}`);
    if (serviceArea) contextParts.push(`serving: ${serviceArea}`);
    if (contentType) contextParts.push(`content focus: ${contentType}`);

    const contextStr = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';

    const query = `Research the media publication "${publicationName}"${contextStr}. Provide the following as clearly labeled sections:

1. SUMMARY: A 2-3 sentence overview of what this publication is, who it serves, and why advertisers should care about it. Write this as if explaining to a marketing executive considering ad placement.

2. FULL PROFILE: A 2-3 paragraph narrative covering the publication's history, editorial focus, reputation, distinguishing characteristics, and market position. Include any notable achievements, awards, or community impact.

3. AUDIENCE INSIGHT: Describe the typical reader/listener/viewer of this publication. What are their demographics, interests, and purchasing behavior? Why are they valuable to advertisers?

4. COMMUNITY ROLE: What role does this publication play in its local community? How does it contribute to civic life, local culture, or community discourse?`;

    // Load the publication profile prompt from DB (editable via admin panel)
    let profilePrompt: string;
    try {
      profilePrompt = await PromptConfigService.getActivePrompt('publication_profile');
    } catch {
      // Fallback if not yet seeded
      profilePrompt = 'You are a media research analyst helping an advertising network describe its partner publications to prospective advertisers. Your goal is to create compelling, factual publication profiles that help advertisers understand the value of placing ads in each outlet. Write in a professional but accessible tone. Focus on what makes each publication unique and valuable as an advertising medium. Always structure your response with clearly labeled sections: SUMMARY, FULL PROFILE, AUDIENCE INSIGHT, and COMMUNITY ROLE.';
    }

    return this.search(query, {
      model: 'sonar-pro',
      systemPrompt: profilePrompt,
    });
  }

  /**
   * Parse a structured publication research response into separate profile sections.
   * Extracts labeled sections from the Perplexity response.
   */
  static parsePublicationProfile(answer: string): {
    summary: string;
    fullProfile: string;
    audienceInsight: string;
    communityRole: string;
  } {
    const sections: Record<string, string> = {};
    const sectionLabels = ['SUMMARY', 'FULL PROFILE', 'AUDIENCE INSIGHT', 'COMMUNITY ROLE'];
    
    // Build a regex that captures content between section headers
    for (let i = 0; i < sectionLabels.length; i++) {
      const label = sectionLabels[i];
      const nextLabel = sectionLabels[i + 1];
      
      let pattern: RegExp;
      if (nextLabel) {
        // Match from this label to the next label
        pattern = new RegExp(
          `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*?)(?=(?:#+\\s*)?(?:\\d+\\.\\s*)?${nextLabel})`,
          'i'
        );
      } else {
        // Last section - match to end
        pattern = new RegExp(
          `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*)$`,
          'i'
        );
      }
      
      const match = answer.match(pattern);
      sections[label] = match ? match[1].trim() : '';
    }

    return {
      summary: this.cleanMarkdown(sections['SUMMARY'] || answer.slice(0, 300)),
      fullProfile: this.cleanMarkdown(sections['FULL PROFILE'] || ''),
      audienceInsight: this.cleanMarkdown(sections['AUDIENCE INSIGHT'] || ''),
      communityRole: this.cleanMarkdown(sections['COMMUNITY ROLE'] || ''),
    };
  }

  /**
   * Strip markdown formatting from text for clean plain-text display.
   * Preserves paragraph breaks but removes bold, italic, links, headers, bullets, etc.
   */
  private static cleanMarkdown(text: string): string {
    if (!text) return text;
    
    return text
      // Remove markdown headers (## Header -> Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers (**text** or __text__ -> text, *text* or _text_ -> text)
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Convert markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Convert bullet points to clean lines (- item or * item -> item)
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      // Convert numbered lists (1. item -> item)  
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove citation markers like [1], [2], etc.
      .replace(/\[(\d+)\]/g, '')
      // Collapse multiple blank lines into one
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Check if the service is configured
   */
  static isConfigured(): boolean {
    return !!process.env.PERPLEXITY_API_KEY;
  }

  /**
   * Format search results for inclusion in AI context
   */
  static formatResultsForContext(response: SearchResponse): string {
    const parts: string[] = [];
    
    if (response.answer) {
      parts.push(response.answer);
    }
    
    if (response.results.length > 0) {
      parts.push('\n\n**Sources:**');
      for (const result of response.results) {
        if (result.url) {
          parts.push(`- ${result.url}`);
        }
      }
    }
    
    return parts.join('\n');
  }
}
