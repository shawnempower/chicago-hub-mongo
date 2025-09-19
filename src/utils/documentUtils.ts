import { supabase } from "@/integrations/supabase/client";

export interface DocumentContext {
  id: string;
  name: string;
  type: string;
  description?: string;
  url?: string;
  content?: string;
}

/**
 * Get all brand documents for a user to provide context to AI
 */
export async function getUserDocumentContext(userId: string): Promise<DocumentContext[]> {
  try {
    const { data: documents, error } = await supabase
      .from('brand_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return documents?.map(doc => ({
      id: doc.id,
      name: doc.document_name,
      type: doc.document_type,
      description: doc.description || undefined,
      url: doc.file_url || doc.external_url || undefined,
    })) || [];
  } catch (error) {
    console.error('Error fetching document context:', error);
    return [];
  }
}

/**
 * Calculate document contribution to profile completion score
 */
export async function calculateDocumentCompletionScore(userId: string): Promise<number> {
  try {
    const { data: documents, error } = await supabase
      .from('brand_documents')
      .select('document_type')
      .eq('user_id', userId);

    if (error) throw error;

    if (!documents || documents.length === 0) return 0;

    // Award points for different types of documents
    const documentTypes = new Set(documents.map(doc => doc.document_type));
    const maxPoints = 20; // Documents contribute up to 20% of completion score
    
    // Core document types for better scoring
    const coreTypes = ['Brand Guidelines', 'Logo Files', 'Style Guide', 'Color Palette'];
    const hasCore = coreTypes.some(type => documentTypes.has(type));
    
    if (documents.length >= 3 && hasCore) return maxPoints;
    if (documents.length >= 2) return Math.round(maxPoints * 0.7);
    if (documents.length >= 1) return Math.round(maxPoints * 0.4);
    
    return 0;
  } catch (error) {
    console.error('Error calculating document completion score:', error);
    return 0;
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported. Please upload PDF, Word, PowerPoint, or image files.' };
  }

  return { valid: true };
}

/**
 * Generate comprehensive brand context for AI consumption
 */
export async function generateBrandContextSummary(userId: string): Promise<string> {
  try {
    const documents = await getUserDocumentContext(userId);
    
    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    // Create comprehensive brand context
    let context = "=== BRAND CONTEXT ===\n\n";
    
    if (profile) {
      context += "COMPANY PROFILE:\n";
      if (profile.company_name) context += `Company: ${profile.company_name}\n`;
      if (profile.industry) context += `Industry: ${profile.industry}\n`;
      if (profile.company_size) context += `Company Size: ${profile.company_size}\n`;
      if (profile.company_website) context += `Website: ${profile.company_website}\n`;
      
      // Include website analysis if available
      if (profile.website_content_summary) {
        context += "\nWEBSITE ANALYSIS:\n";
        context += `Brand Summary: ${profile.website_content_summary}\n`;
        
        if (profile.website_key_services && profile.website_key_services.length > 0) {
          context += `Key Services: ${profile.website_key_services.join(', ')}\n`;
        }
        
        if (profile.website_brand_themes && profile.website_brand_themes.length > 0) {
          context += `Brand Themes: ${profile.website_brand_themes.join(', ')}\n`;
        }
        
        if (profile.website_analysis_date) {
          const analysisDate = new Date(profile.website_analysis_date);
          context += `Analysis Date: ${analysisDate.toLocaleDateString()}\n`;
        }
        context += "\n";
      }
      
      context += "MARKETING STRATEGY:\n";
      if (profile.target_audience) context += `Target Audience: ${profile.target_audience}\n`;
      if (profile.brand_voice) context += `Brand Voice: ${profile.brand_voice}\n`;
      if (profile.marketing_goals && profile.marketing_goals.length > 0) {
        context += `Marketing Goals: ${profile.marketing_goals.join(', ')}\n`;
      }
      context += "\n";
    }
    
    if (documents.length > 0) {
      context += "BRAND ASSETS:\n";
      context += `${documents.map(doc => 
        `- ${doc.name} (${doc.type})${doc.description ? ': ' + doc.description : ''}`
      ).join('\n')}\n\n`;
      
      const documentTypes = [...new Set(documents.map(d => d.type))];
      context += `Available Asset Types: ${documentTypes.join(', ')}\n`;
      context += `Total Brand Documents: ${documents.length}\n\n`;
    }

    context += "=== INSTRUCTIONS ===\n";
    context += "Use this brand context to provide personalized, relevant media recommendations that align with the company's industry, target audience, brand voice, and marketing goals. Reference specific brand assets when suggesting campaign strategies.";

    return context;
  } catch (error) {
    console.error('Error generating brand context summary:', error);
    return "Error loading brand context.";
  }
}

/**
 * Check if user has sufficient brand context for personalized recommendations
 */
export async function hasBrandContext(userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, industry, target_audience, brand_voice, marketing_goals')
      .eq('user_id', userId)
      .single();

    const documents = await getUserDocumentContext(userId);
    
    // Has context if they have basic profile info OR documents
    const hasProfileInfo = profile && (
      profile.company_name || 
      profile.industry || 
      profile.target_audience || 
      profile.brand_voice || 
      (profile.marketing_goals && profile.marketing_goals.length > 0)
    );
    
    const hasDocuments = documents.length > 0;
    
    return !!(hasProfileInfo || hasDocuments);
  } catch (error) {
    console.error('Error checking brand context:', error);
    return false;
  }
}