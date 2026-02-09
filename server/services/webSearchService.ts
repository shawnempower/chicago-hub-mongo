/**
 * Web Search Service
 * 
 * Provides web search capability for the Hub Sales Assistant
 * using Perplexity API (LLM with built-in search).
 */

import { createLogger } from '../../src/utils/logger';

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
    
    const {
      model = 'sonar',
      systemPrompt = 'You are a helpful research assistant. Provide concise, factual information based on your search results. Include relevant details like company locations, target audience, brand positioning, and recent news when available.',
    } = options;

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

    return this.search(query, {
      model: 'sonar-pro', // Use pro for deeper research
      systemPrompt: 'You are a media sales research assistant. Provide comprehensive brand research that helps identify advertising opportunities. Focus on: company background, brand values, target demographics, geographic presence, community involvement, and marketing history.',
    });
  }

  /**
   * Search for news about a company
   */
  static async searchCompanyNews(companyName: string): Promise<SearchResponse> {
    const query = `What are the latest news and announcements about ${companyName}? Focus on marketing campaigns, new products, expansions, and community initiatives from the past 6 months.`;
    
    return this.search(query, {
      model: 'sonar',
      systemPrompt: 'You are a news research assistant. Summarize recent news and announcements. Focus on business developments, marketing activities, and community involvement.',
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

    return this.search(query, {
      model: 'sonar',
      systemPrompt: 'You are a competitive analysis assistant. Provide clear comparisons between companies, highlighting key differentiators and market positioning.',
    });
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
