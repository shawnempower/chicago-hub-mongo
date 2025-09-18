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
 * Generate a summary of brand context for AI consumption
 */
export async function generateBrandContextSummary(userId: string): Promise<string> {
  try {
    const documents = await getUserDocumentContext(userId);
    
    if (documents.length === 0) {
      return "No brand documents available.";
    }

    const summary = `Brand Assets Summary:
${documents.map(doc => 
  `- ${doc.name} (${doc.type})${doc.description ? ': ' + doc.description : ''}`
).join('\n')}

Total documents: ${documents.length}
Document types: ${[...new Set(documents.map(d => d.type))].join(', ')}`;

    return summary;
  } catch (error) {
    console.error('Error generating brand context summary:', error);
    return "Error loading brand context.";
  }
}