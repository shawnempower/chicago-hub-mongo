import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, userId } = await req.json();

    if (!websiteUrl || !userId) {
      throw new Error('Website URL and user ID are required');
    }

    console.log(`Extracting content from: ${websiteUrl} for user: ${userId}`);

    // Fetch website content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let websiteContent = '';
    try {
      const response = await fetch(websiteUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Brand-Analyzer/1.0)',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      websiteContent = extractKeyContent(html);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching website:', error);
      throw new Error('Failed to fetch website content');
    }

    // Analyze content with OpenAI
    const analysis = await analyzeWebsiteContent(websiteContent, websiteUrl);

    // Store results in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        website_content_summary: analysis.summary,
        website_analysis_date: new Date().toISOString(),
        website_key_services: analysis.services,
        website_brand_themes: analysis.themes,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to save website analysis');
    }

    console.log('Website analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        summary: analysis.summary,
        services: analysis.services,
        themes: analysis.themes,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in website-extractor:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error)?.message || 'Internal server error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractKeyContent(html: string): string {
  // Remove scripts, styles, and other non-content elements
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

  // Extract text from key elements
  const titleMatch = cleanHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const metaDescMatch = cleanHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Extract headings and main content
  const h1Matches = cleanHtml.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2Matches = cleanHtml.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h3Matches = cleanHtml.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];

  const headings = [...h1Matches, ...h2Matches.slice(0, 5), ...h3Matches.slice(0, 3)]
    .map(h => h.replace(/<[^>]*>/g, '').trim())
    .filter(h => h.length > 0)
    .join(' | ');

  // Extract paragraphs from main content areas
  const mainContentMatches = cleanHtml.match(/<(?:main|article|section|div class="[^"]*(?:content|about|hero|intro)[^"]*")[^>]*>(.*?)<\/(?:main|article|section|div)>/gi) || [];
  const paragraphs = mainContentMatches
    .join(' ')
    .match(/<p[^>]*>(.*?)<\/p>/gi) || [];

  const mainText = paragraphs
    .slice(0, 10)
    .map(p => p.replace(/<[^>]*>/g, '').trim())
    .filter(p => p.length > 20)
    .join(' ')
    .substring(0, 1500);

  const extractedContent = `Title: ${title}\n\nDescription: ${metaDescription}\n\nHeadings: ${headings}\n\nContent: ${mainText}`;
  
  return extractedContent.substring(0, 2000); // Limit total content
}

async function analyzeWebsiteContent(content: string, url: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze this website content and extract brand information:

Website URL: ${url}
Content: ${content}

Please provide a JSON response with:
1. "summary": A concise 150-word brand summary capturing the company's essence, mission, and key value propositions
2. "services": An array of 3-7 key products or services offered (specific service names, not generic categories)
3. "themes": An array of 3-5 brand themes/values (e.g., "innovation", "sustainability", "customer-centric", "premium quality")

Focus on extracting concrete, specific information about what the company does and how they position themselves. Avoid generic business language.

Respond only with valid JSON:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a brand analysis expert. Extract key brand information from website content and respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  try {
    const analysis = JSON.parse(aiResponse);
    return {
      summary: analysis.summary || 'Brand analysis completed',
      services: Array.isArray(analysis.services) ? analysis.services : [],
      themes: Array.isArray(analysis.themes) ? analysis.themes : [],
    };
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    return {
      summary: 'Website content analyzed successfully',
      services: [],
      themes: [],
    };
  }
}