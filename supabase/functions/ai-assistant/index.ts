import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  brandContext?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { prompt, brandContext, userId }: RequestBody = await req.json();
    console.log('AI Assistant request:', { prompt, hasBrandContext: !!brandContext, userId });

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize prompt
    const sanitizedPrompt = prompt.trim().slice(0, 500);
    if (!sanitizedPrompt) {
      return new Response(JSON.stringify({ error: 'Prompt cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system message based on brand context
    let systemMessage = `You are Lassie, an expert Chicago media consultant assistant. You help brands discover the perfect combination of Chicago media outlets for their marketing goals.

Your knowledge includes Chicago media outlets like:
- Chicago Tribune, Chicago Sun-Times (newspapers)
- WGN-TV, ABC 7 Chicago, NBC 5 Chicago, CBS 2 Chicago, FOX 32 Chicago (TV)
- WGN Radio, WBBM Newsradio, The Drive 97.1 (radio)
- Chicago Magazine, Timeout Chicago, The Chicago Reader (magazines)
- Block Club Chicago, DNAinfo Chicago (digital)
- And many neighborhood and community publications

Key guidelines:
- Be conversational, friendly, and professional
- Focus on Chicago media landscape
- Ask clarifying questions about budget, target audience, campaign goals
- Suggest 2-3 specific outlet combinations that make strategic sense
- Explain WHY certain outlets work well together
- Consider audience overlap, geographic coverage, and complementary strengths
- Keep responses concise but helpful (2-3 paragraphs max)
- If asked about outlets you don't know, admit it and suggest similar alternatives`;

    if (brandContext) {
      systemMessage += `\n\nBrand Context: ${brandContext}
Use this context to provide personalized recommendations that align with their brand voice, target audience, and goals.`;
    } else {
      systemMessage += `\n\nNote: This user hasn't completed their brand profile yet, so provide general guidance and encourage them to complete their profile for more personalized recommendations.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: sanitizedPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      outlets: [] // For now, we'll enhance this later to extract specific outlets
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});