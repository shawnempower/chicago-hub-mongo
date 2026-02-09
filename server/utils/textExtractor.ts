/**
 * Text Extraction Utility
 * 
 * Extracts text content from various file types for use in AI context.
 * Supports: PDF, CSV, TXT, MD, Excel (xlsx, xls)
 */

import { createLogger } from '../../src/utils/logger';

const logger = createLogger('TextExtractor');

// Lazy-load heavy dependencies
let pdfParse: typeof import('pdf-parse') | null = null;
let xlsx: typeof import('xlsx') | null = null;

/**
 * Extract text from a PDF file
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error: any) {
    logger.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from a CSV file
 */
function extractFromCSV(buffer: Buffer): string {
  const text = buffer.toString('utf-8');
  // Return as-is, could parse to structured format if needed
  return text.trim();
}

/**
 * Extract text from a plain text or markdown file
 */
function extractFromText(buffer: Buffer): string {
  return buffer.toString('utf-8').trim();
}

/**
 * Extract text from an Excel file (xlsx or xls)
 */
async function extractFromExcel(buffer: Buffer): Promise<string> {
  if (!xlsx) {
    xlsx = await import('xlsx');
  }
  
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheets: string[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert to CSV-like format
      const csv = xlsx.utils.sheet_to_csv(sheet);
      sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
    }
    
    return sheets.join('\n\n');
  } catch (error: any) {
    logger.error('Error extracting text from Excel:', error);
    throw new Error(`Failed to extract text from Excel: ${error.message}`);
  }
}

/**
 * Extract text content from a file buffer based on MIME type
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  logger.info(`Extracting text from ${filename} (${mimeType})`);
  
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await extractFromPDF(buffer);
        
      case 'text/csv':
        return extractFromCSV(buffer);
        
      case 'text/plain':
      case 'text/markdown':
        return extractFromText(buffer);
        
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return await extractFromExcel(buffer);
        
      default:
        // Try to handle by file extension
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'pdf':
            return await extractFromPDF(buffer);
          case 'csv':
            return extractFromCSV(buffer);
          case 'txt':
          case 'md':
          case 'markdown':
            return extractFromText(buffer);
          case 'xlsx':
          case 'xls':
            return await extractFromExcel(buffer);
          default:
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }
  } catch (error: any) {
    logger.error(`Error extracting text from ${filename}:`, error);
    throw error;
  }
}

/**
 * Check if a MIME type is a document that can have text extracted
 */
export function isExtractableDocument(mimeType: string): boolean {
  const extractableTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  return extractableTypes.includes(mimeType);
}

/**
 * Check if a MIME type is an image that should use vision
 */
export function isImageType(mimeType: string): boolean {
  const imageTypes = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ];
  return imageTypes.includes(mimeType);
}

/**
 * Truncate extracted text to a maximum length (for context limits)
 * Tries to truncate at a sensible boundary (paragraph, sentence)
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to truncate at a paragraph boundary
  const truncated = text.substring(0, maxLength);
  const lastParagraph = truncated.lastIndexOf('\n\n');
  if (lastParagraph > maxLength * 0.7) {
    return truncated.substring(0, lastParagraph) + '\n\n[Content truncated...]';
  }
  
  // Try to truncate at a sentence boundary
  const lastSentence = truncated.lastIndexOf('. ');
  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1) + '\n\n[Content truncated...]';
  }
  
  // Just truncate at the limit
  return truncated + '...\n\n[Content truncated...]';
}
