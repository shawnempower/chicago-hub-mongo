/**
 * Test PDF Dimension Detection
 * 
 * Tests the PDF detection functionality with example files.
 * Place test PDFs in a folder and run this script to see what gets detected.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// No worker needed for Node.js environment

interface PDFAnalysis {
  filename: string;
  fileSize: number;
  fileSizeFormatted: string;
  dimensions?: {
    width: number;
    height: number;
    formatted: string;
    widthInches: number;
    heightInches: number;
  };
  pageCount?: number;
  colorSpace?: string;
  metadata?: any;
  error?: string;
}

/**
 * Analyze a single PDF file
 */
async function analyzePDF(filePath: string): Promise<PDFAnalysis> {
  const filename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileSizeFormatted = formatBytes(fileSize);

  const result: PDFAnalysis = {
    filename,
    fileSize,
    fileSizeFormatted
  };

  try {
    // Read file
    const data = new Uint8Array(fs.readFileSync(filePath));
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    result.pageCount = pdf.numPages;
    
    // Get first page dimensions
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Convert points to inches (72 points = 1 inch)
    const widthInches = viewport.width / 72;
    const heightInches = viewport.height / 72;
    
    // Round to 2 decimal places
    const widthRounded = Math.round(widthInches * 100) / 100;
    const heightRounded = Math.round(heightInches * 100) / 100;
    
    result.dimensions = {
      width: viewport.width,
      height: viewport.height,
      formatted: `${widthRounded}" x ${heightRounded}"`,
      widthInches: widthRounded,
      heightInches: heightRounded
    };
    
    // Try to get metadata
    try {
      const metadata = await pdf.getMetadata();
      result.metadata = {
        info: metadata.info,
        hasMetadata: !!metadata.metadata
      };
      
      // Check for color space hints in metadata
      if (metadata.info && typeof metadata.info === 'object') {
        const info = metadata.info as any;
        const keywords = info.Keywords?.toLowerCase() || '';
        const subject = info.Subject?.toLowerCase() || '';
        
        if (keywords.includes('cmyk') || subject.includes('cmyk')) {
          result.colorSpace = 'CMYK (detected from metadata)';
        } else if (keywords.includes('rgb') || subject.includes('rgb')) {
          result.colorSpace = 'RGB (detected from metadata)';
        } else {
          // Heuristic based on size
          if (widthInches >= 3 && widthInches <= 20 && heightInches >= 3 && heightInches <= 20) {
            result.colorSpace = 'CMYK (inferred from print-sized dimensions)';
          } else {
            result.colorSpace = 'RGB (inferred from dimensions)';
          }
        }
      }
    } catch (metadataError) {
      result.colorSpace = 'Unknown (could not read metadata)';
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate aspect ratio
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(Math.round(width * 100), Math.round(height * 100));
  const w = Math.round(width * 100) / divisor;
  const h = Math.round(height * 100) / divisor;
  return `${w}:${h} (${(width / height).toFixed(3)})`;
}

/**
 * Main function
 */
async function testPDFs() {
  console.log('🔍 PDF Dimension Detection Test\n');
  console.log('='.repeat(80));
  
  // Check for test directory
  const testDir = path.resolve(__dirname, '../test-pdfs');
  
  if (!fs.existsSync(testDir)) {
    console.log(`\n📁 Test directory not found: ${testDir}`);
    console.log('\nPlease create a "test-pdfs" folder in the project root and add your PDF files.');
    console.log('\nExample:');
    console.log('  mkdir test-pdfs');
    console.log('  cp /path/to/your/pdfs/*.pdf test-pdfs/');
    console.log('\nThen run this script again.\n');
    return;
  }

  // Find all PDF files
  const files = fs.readdirSync(testDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(testDir, f));

  if (files.length === 0) {
    console.log(`\n📁 No PDF files found in: ${testDir}`);
    console.log('\nPlease add some PDF files to test.\n');
    return;
  }

  console.log(`\n📄 Found ${files.length} PDF file(s) to analyze\n`);
  console.log('='.repeat(80));

  // Analyze each PDF
  const results: PDFAnalysis[] = [];
  
  for (const filePath of files) {
    console.log(`\nAnalyzing: ${path.basename(filePath)}...`);
    const result = await analyzePDF(filePath);
    results.push(result);
  }

  // Display results
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.filename}`);
    console.log('-'.repeat(80));
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   📦 File Size: ${result.fileSizeFormatted}`);
      console.log(`   📄 Pages: ${result.pageCount}`);
      
      if (result.dimensions) {
        console.log(`   📐 Dimensions (points): ${result.dimensions.width} x ${result.dimensions.height}`);
        console.log(`   📏 Dimensions (inches): ${result.dimensions.formatted}`);
        console.log(`   📊 Aspect Ratio: ${calculateAspectRatio(result.dimensions.widthInches, result.dimensions.heightInches)}`);
      }
      
      if (result.colorSpace) {
        const icon = result.colorSpace.includes('CMYK') ? '🎨' : '🖼️';
        console.log(`   ${icon} Color Space: ${result.colorSpace}`);
      }
      
      if (result.metadata) {
        console.log(`   ℹ️  Metadata Available: ${result.metadata.hasMetadata ? 'Yes' : 'No'}`);
        if (result.metadata.info) {
          const info = result.metadata.info;
          if (info.Title) console.log(`      - Title: ${info.Title}`);
          if (info.Author) console.log(`      - Author: ${info.Author}`);
          if (info.Creator) console.log(`      - Creator: ${info.Creator}`);
          if (info.Producer) console.log(`      - Producer: ${info.Producer}`);
        }
      }
    }
  });

  // Summary comparison
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📋 COMPARISON SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => !r.error && r.dimensions);
  
  if (successful.length > 0) {
    console.log('\nDimensions Detected:');
    successful.forEach((result, index) => {
      const dims = result.dimensions!;
      console.log(`  ${index + 1}. ${result.filename}`);
      console.log(`     → ${dims.formatted} (${dims.widthInches} x ${dims.heightInches} inches)`);
      console.log(`     → Aspect Ratio: ${calculateAspectRatio(dims.widthInches, dims.heightInches)}`);
      console.log(`     → ${result.colorSpace}`);
    });
    
    // Check for matching sizes
    console.log('\n🔍 Matching Analysis:');
    for (let i = 0; i < successful.length; i++) {
      for (let j = i + 1; j < successful.length; j++) {
        const dim1 = successful[i].dimensions!;
        const dim2 = successful[j].dimensions!;
        
        const widthDiff = Math.abs(dim1.widthInches - dim2.widthInches) / dim1.widthInches;
        const heightDiff = Math.abs(dim1.heightInches - dim2.heightInches) / dim1.heightInches;
        
        if (widthDiff < 0.01 && heightDiff < 0.01) {
          console.log(`  ✅ EXACT MATCH: "${successful[i].filename}" and "${successful[j].filename}"`);
          console.log(`     → Both are ${dim1.formatted}`);
        } else if (widthDiff < 0.05 && heightDiff < 0.05) {
          console.log(`  ⚠️  CLOSE MATCH: "${successful[i].filename}" and "${successful[j].filename}"`);
          console.log(`     → ${dim1.formatted} vs ${dim2.formatted} (within 5%)`);
        } else {
          console.log(`  ❌ DIFFERENT: "${successful[i].filename}" and "${successful[j].filename}"`);
          console.log(`     → ${dim1.formatted} vs ${dim2.formatted}`);
        }
      }
    }
  }

  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('✅ Analysis Complete!');
  console.log('='.repeat(80));
  console.log();
}

// Run the test
testPDFs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });

