// MongoDB services removed - using API calls instead

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
    const documents = []; // Temporary - will be replaced with API call

    return documents.map(doc => ({
      id: doc._id?.toString() || '',
      name: doc.documentName,
      type: doc.documentType,
      description: doc.description || undefined,
      url: doc.fileUrl || doc.externalUrl || undefined,
    }));
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
    const documents = []; // Temporary - will be replaced with API call

    if (!documents || documents.length === 0) return 0;

    // Award points for different types of documents
    const documentTypes = new Set(documents.map(doc => doc.documentType));
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
    const profile = null; // Temporary - will be replaced with API call

    // Create comprehensive brand context
    let context = "=== BRAND CONTEXT ===\n\n";
    
    if (profile) {
      context += "COMPANY PROFILE:\n";
      if (profile.companyName) context += `Company: ${profile.companyName}\n`;
      if (profile.industry) context += `Industry: ${profile.industry}\n`;
      if (profile.companySizes) context += `Company Size: ${profile.companySizes}\n`;
      if (profile.companyWebsite) context += `Website: ${profile.companyWebsite}\n`;
      
      // Include website analysis if available
      if (profile.websiteContentSummary) {
        context += "\nWEBSITE ANALYSIS:\n";
        context += `Brand Summary: ${profile.websiteContentSummary}\n`;
        
        if (profile.websiteKeyServices && profile.websiteKeyServices.length > 0) {
          context += `Key Services: ${profile.websiteKeyServices.join(', ')}\n`;
        }
        
        if (profile.websiteBrandThemes && profile.websiteBrandThemes.length > 0) {
          context += `Brand Themes: ${profile.websiteBrandThemes.join(', ')}\n`;
        }
        
        if (profile.websiteAnalysisDate) {
          const analysisDate = new Date(profile.websiteAnalysisDate);
          context += `Analysis Date: ${analysisDate.toLocaleDateString()}\n`;
        }
        context += "\n";
      }
      
      context += "MARKETING STRATEGY:\n";
      if (profile.targetAudience) context += `Target Audience: ${profile.targetAudience}\n`;
      if (profile.brandVoice) context += `Brand Voice: ${profile.brandVoice}\n`;
      if (profile.marketingGoals && profile.marketingGoals.length > 0) {
        context += `Marketing Goals: ${profile.marketingGoals.join(', ')}\n`;
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
    const profile = null; // Temporary - will be replaced with API call
    const documents = await getUserDocumentContext(userId);
    
    // Has context if they have basic profile info OR documents
    const hasProfileInfo = profile && (
      profile.companyName || 
      profile.industry || 
      profile.targetAudience || 
      profile.brandVoice || 
      (profile.marketingGoals && profile.marketingGoals.length > 0)
    );
    
    const hasDocuments = documents.length > 0;
    
    return !!(hasProfileInfo || hasDocuments);
  } catch (error) {
    console.error('Error checking brand context:', error);
    return false;
  }
}