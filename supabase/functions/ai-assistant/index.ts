import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  brandContext?: string;
  userId?: string;
  conversationHistory?: Message[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PackageRecommendation {
  id: number;
  name: string;
  tagline: string;
  price: string;
  priceRange: string;
  audience: string[];
  channels: string[];
  complexity: string;
  reasoning: string;
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

    const { prompt, brandContext, userId, conversationHistory }: RequestBody = await req.json();
    console.log('AI Assistant request:', { prompt, hasBrandContext: !!brandContext, userId, historyLength: conversationHistory?.length || 0 });

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

    // Fetch current system instructions from database
    const { data: instructionsData, error: instructionsError } = await supabase
      .from('assistant_instructions')
      .select('instructions')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (instructionsError) {
      console.warn('Failed to fetch instructions from database, using fallback:', instructionsError);
    }

    const baseInstructions = instructionsData?.instructions || 
      `You are Lassie, a specialized AI assistant for media strategy and brand profiling. Your primary role is to understand the user's business and campaign needs.`;

    // Start with the database instructions
    let systemMessage = baseInstructions;

    // Add brand context if available
    if (brandContext) {
      systemMessage += `

BRAND CONTEXT AVAILABLE:
${brandContext}

Reference specific details from this brand profile when relevant to your conversation.`;
    }

    // Add package information for reference only (not for immediate recommendation)
    systemMessage += `

MEDIA PACKAGES REFERENCE (use only when exceptionally relevant):
${packages.map(pkg => `${pkg.id}. ${pkg.name} - ${pkg.description || pkg.price} (${pkg.audience.join(', ')})`).join('\n')}

Only mention packages when they are directly relevant to the specific conversation context.`;

    // Build conversation messages including history
    const messages = [
      { role: 'system', content: systemMessage }
    ];

    // Add conversation history if provided (limit to last 6 messages to stay within token limits)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: 'user', content: sanitizedPrompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
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

    // Extract package recommendations from AI response
    const packageRecommendations = extractPackageRecommendations(aiResponse);
    
    // Log analytics if user provided
    if (userId) {
      await logAssistantInteraction(userId, sanitizedPrompt, aiResponse, packageRecommendations);
    }

    console.log('AI response generated successfully', { packageCount: packageRecommendations.length });

    return new Response(JSON.stringify({ 
      response: aiResponse,
      packages: packageRecommendations,
      outlets: [] // For potential future outlet recommendations
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

// Package data for recommendations
const packages = [
  { id: 1, name: "The Cultural Bridge Builder", price: "$15K/month", priceRange: "15-50k", audience: ["diverse", "families"], channels: ["radio", "print", "digital"], complexity: "custom" },
  { id: 2, name: "The Sunday Morning Amplifier", price: "$20K/month", priceRange: "15-50k", audience: ["diverse", "families", "faith"], channels: ["tv", "radio", "print"], complexity: "custom" },
  { id: 3, name: "Newsletter Blitz", price: "$2,500/month", priceRange: "under-5k", audience: ["all"], channels: ["newsletter"], complexity: "turnkey" },
  { id: 4, name: "Radio Repeater", price: "$5,000/month", priceRange: "5-15k", audience: ["all"], channels: ["radio"], complexity: "turnkey" },
  { id: 5, name: "The Neighborhood Package", price: "$1,500/month", priceRange: "under-5k", audience: ["hyperlocal"], channels: ["print", "digital", "newsletter"], complexity: "turnkey" },
  { id: 6, name: "The Power Breakfast", price: "$25K/month", priceRange: "15-50k", audience: ["business"], channels: ["radio", "print", "podcast"], complexity: "custom" },
  { id: 7, name: "After Dark Chicago", price: "$10K/month", priceRange: "5-15k", audience: ["diverse", "youth"], channels: ["radio", "digital", "print"], complexity: "custom" },
  { id: 8, name: "Transit Tribe Dominator", price: "$12K/month", priceRange: "5-15k", audience: ["all"], channels: ["radio", "digital", "print"], complexity: "custom" },
  { id: 9, name: "The Village Builder", price: "$8K/month", priceRange: "5-15k", audience: ["families"], channels: ["print", "radio", "newsletter"], complexity: "custom" },
  { id: 10, name: "B2B Basic", price: "$3,500/month", priceRange: "under-5k", audience: ["business"], channels: ["print", "radio", "digital"], complexity: "turnkey" },
  { id: 11, name: "The Faith Circuit", price: "$6K/month", priceRange: "5-15k", audience: ["faith", "families", "diverse"], channels: ["radio", "print", "tv"], complexity: "custom" },
  { id: 12, name: "Quick Start Special", price: "$500/month", priceRange: "under-5k", audience: ["all"], channels: ["flexible"], complexity: "turnkey" },
  { id: 13, name: "Audio Domination Suite", price: "$25K-100K/month", priceRange: "50k-plus", audience: ["all"], channels: ["radio", "podcast"], complexity: "custom" },
  { id: 14, name: "Newsletter Empire", price: "$15K-50K/month", priceRange: "15-50k", audience: ["all"], channels: ["newsletter"], complexity: "custom" },
  { id: 15, name: "Hyperlocal Hero", price: "$3K/month", priceRange: "under-5k", audience: ["hyperlocal"], channels: ["all"], complexity: "custom" },
  { id: 16, name: "The Makers & Creators", price: "$7K/month", priceRange: "5-15k", audience: ["creative", "youth", "diverse"], channels: ["print", "radio", "digital"], complexity: "custom" },
  { id: 17, name: "Seasonal Surge", price: "$8K/month", priceRange: "5-15k", audience: ["all"], channels: ["flexible"], complexity: "custom" },
  { id: 18, name: "Own a Day", price: "$1,000", priceRange: "under-5k", audience: ["all"], channels: ["all"], complexity: "turnkey" },
  { id: 19, name: "The Side Hustler", price: "$5K/month", priceRange: "5-15k", audience: ["diverse", "business"], channels: ["digital", "radio", "newsletter"], complexity: "custom" },
  { id: 20, name: "Youth Movement", price: "$4K/month", priceRange: "under-5k", audience: ["youth"], channels: ["digital", "social", "events"], complexity: "custom" },
  { id: 21, name: "Executive Influence", price: "$50K/month", priceRange: "50k-plus", audience: ["business"], channels: ["print", "events", "digital"], complexity: "custom" },
  { id: 22, name: "Community Champion", price: "$15K/month", priceRange: "15-50k", audience: ["diverse", "hyperlocal"], channels: ["all"], complexity: "custom" },
  { id: 23, name: "The Steady State", price: "$2,000/month", priceRange: "under-5k", audience: ["all"], channels: ["mixed"], complexity: "turnkey" },
  { id: 24, name: "Grand Opening Kit", price: "$5,000", priceRange: "5-15k", audience: ["hyperlocal"], channels: ["all"], complexity: "turnkey" }
];

function extractPackageRecommendations(aiResponse: string): PackageRecommendation[] {
  const recommendations: PackageRecommendation[] = [];
  
  // Look for package names mentioned in the response
  packages.forEach(pkg => {
    const nameVariations = [
      pkg.name,
      pkg.name.replace(/The\s+/i, ''),
      pkg.name.replace(/\s+/g, ''),
    ];
    
    const found = nameVariations.some(variation => 
      aiResponse.toLowerCase().includes(variation.toLowerCase())
    );
    
    if (found) {
      recommendations.push({
        id: pkg.id,
        name: pkg.name,
        tagline: getPackageTagline(pkg.id),
        price: pkg.price,
        priceRange: pkg.priceRange,
        audience: pkg.audience,
        channels: pkg.channels,
        complexity: pkg.complexity,
        reasoning: extractReasoningForPackage(aiResponse, pkg.name)
      });
    }
  });
  
  return recommendations;
}

function getPackageTagline(id: number): string {
  const taglines: { [key: number]: string } = {
    1: "Where communities intersect",
    2: "Reach families when they're together",
    3: "Every inbox, every morning",
    4: "One spot, maximum reach",
    5: "Own your local area",
    6: "Where deals get done",
    7: "Own the night shift",
    8: "Every commute covered",
    9: "It takes a village",
    10: "Business visibility simplified",
    11: "Sunday morning to Friday prayers",
    12: "Launch in 48 hours",
    13: "Own Chicago's ears",
    14: "Dominate the inbox",
    15: "Be the neighborhood champion",
    16: "Reach Chicago's creative class",
    17: "Match Chicago's rhythm",
    18: "24-hour domination",
    19: "Multi-job, multi-dream",
    20: "Gen Z authentic connection",
    21: "C-suite connectivity",
    22: "Sponsor an ecosystem",
    23: "Always on, never overwhelming",
    24: "Launch like a local"
  };
  return taglines[id] || "";
}

function extractReasoningForPackage(response: string, packageName: string): string {
  // Find the sentence or context around the package mention
  const sentences = response.split(/[.!?]+/);
  const mentionSentence = sentences.find(sentence => 
    sentence.toLowerCase().includes(packageName.toLowerCase())
  );
  return mentionSentence?.trim() || "Recommended based on your requirements";
}

async function logAssistantInteraction(userId: string, prompt: string, response: string, packages: PackageRecommendation[]) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not available for logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('user_interactions').insert({
      user_id: userId,
      interaction_type: 'ai_assistant_query',
      metadata: {
        prompt: prompt.slice(0, 200), // Truncate for storage
        response_length: response.length,
        packages_recommended: packages.map(p => ({ id: p.id, name: p.name })),
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('Assistant interaction logged successfully');
  } catch (error) {
    console.error('Failed to log assistant interaction:', error);
  }
}