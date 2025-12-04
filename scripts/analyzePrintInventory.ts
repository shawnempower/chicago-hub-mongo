/**
 * Analyze Print Inventory Script
 * 
 * Queries the database to find all print advertising opportunities
 * and analyzes their specifications to identify common sizes and formats.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface PrintOpportunity {
  publicationId: number;
  publicationName: string;
  name?: string;
  adFormat?: string;
  dimensions?: string;
  color?: string;
  location?: string;
  specifications?: {
    format?: string;
    resolution?: string;
    bleed?: boolean | string;
    trim?: string;
    colorSpace?: string;
    maxFileSize?: string;
    additionalRequirements?: string;
  };
}

interface AnalysisResult {
  totalPublications: number;
  publicationsWithPrint: number;
  totalPrintOpportunities: number;
  dimensionCounts: Map<string, number>;
  formatCounts: Map<string, number>;
  colorCounts: Map<string, number>;
  specificationFormats: Map<string, number>;
  resolutions: Map<string, number>;
  bleedInfo: { hasBleed: number; noBleed: number };
  examples: PrintOpportunity[];
}

async function analyzePrintInventory() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🔍 Connecting to MongoDB...\n');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('chicago-hub');
    const publicationsCollection = db.collection('publications');

    // Get all publications
    const allPublications = await publicationsCollection.find({}).toArray();
    console.log(`📊 Total publications in database: ${allPublications.length}\n`);

    const analysis: AnalysisResult = {
      totalPublications: allPublications.length,
      publicationsWithPrint: 0,
      totalPrintOpportunities: 0,
      dimensionCounts: new Map(),
      formatCounts: new Map(),
      colorCounts: new Map(),
      specificationFormats: new Map(),
      resolutions: new Map(),
      bleedInfo: { hasBleed: 0, noBleed: 0 },
      examples: []
    };

    // Analyze each publication's print inventory
    for (const pub of allPublications) {
      const printChannels = pub.distributionChannels?.print;
      
      if (!printChannels) continue;

      // Handle both array and single object
      const printArray = Array.isArray(printChannels) ? printChannels : [printChannels];
      
      for (const printChannel of printArray) {
        const opportunities = printChannel.advertisingOpportunities;
        
        if (!opportunities || opportunities.length === 0) continue;

        analysis.publicationsWithPrint++;

        for (const opp of opportunities) {
          analysis.totalPrintOpportunities++;

          const printOpp: PrintOpportunity = {
            publicationId: pub.publicationId,
            publicationName: pub.basicInformation?.title || 'Unknown',
            name: opp.name,
            adFormat: opp.adFormat,
            dimensions: opp.dimensions,
            color: opp.color,
            location: opp.location,
            specifications: opp.specifications
          };

          // Collect dimension data
          if (opp.dimensions) {
            const count = analysis.dimensionCounts.get(opp.dimensions) || 0;
            analysis.dimensionCounts.set(opp.dimensions, count + 1);
          }

          // Collect ad format data
          if (opp.adFormat) {
            const count = analysis.formatCounts.get(opp.adFormat) || 0;
            analysis.formatCounts.set(opp.adFormat, count + 1);
          }

          // Collect color data
          if (opp.color) {
            const count = analysis.colorCounts.get(opp.color) || 0;
            analysis.colorCounts.set(opp.color, count + 1);
          }

          // Collect specification details
          if (opp.specifications) {
            const specs = opp.specifications;

            if (specs.format) {
              const count = analysis.specificationFormats.get(specs.format) || 0;
              analysis.specificationFormats.set(specs.format, count + 1);
            }

            if (specs.resolution) {
              const count = analysis.resolutions.get(specs.resolution) || 0;
              analysis.resolutions.set(specs.resolution, count + 1);
            }

            if (specs.bleed !== undefined) {
              if (specs.bleed === true || specs.bleed === 'true' || typeof specs.bleed === 'string') {
                analysis.bleedInfo.hasBleed++;
              } else {
                analysis.bleedInfo.noBleed++;
              }
            }
          }

          // Keep first 10 examples
          if (analysis.examples.length < 10) {
            analysis.examples.push(printOpp);
          }
        }
      }
    }

    // Display results
    console.log('=' .repeat(80));
    console.log('📋 PRINT INVENTORY ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log();

    console.log('📊 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total Publications: ${analysis.totalPublications}`);
    console.log(`Publications with Print Channel: ${analysis.publicationsWithPrint}`);
    console.log(`Total Print Advertising Opportunities: ${analysis.totalPrintOpportunities}`);
    console.log();

    // Dimensions
    if (analysis.dimensionCounts.size > 0) {
      console.log('📐 DIMENSIONS / SIZES');
      console.log('-'.repeat(80));
      const sortedDimensions = Array.from(analysis.dimensionCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      for (const [dimension, count] of sortedDimensions) {
        const percentage = ((count / analysis.totalPrintOpportunities) * 100).toFixed(1);
        console.log(`  ${dimension || 'Not specified'}: ${count} (${percentage}%)`);
      }
      console.log();
    }

    // Ad Formats
    if (analysis.formatCounts.size > 0) {
      console.log('📄 AD FORMATS');
      console.log('-'.repeat(80));
      const sortedFormats = Array.from(analysis.formatCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      for (const [format, count] of sortedFormats) {
        const percentage = ((count / analysis.totalPrintOpportunities) * 100).toFixed(1);
        console.log(`  ${format || 'Not specified'}: ${count} (${percentage}%)`);
      }
      console.log();
    }

    // Color Options
    if (analysis.colorCounts.size > 0) {
      console.log('🎨 COLOR OPTIONS');
      console.log('-'.repeat(80));
      const sortedColors = Array.from(analysis.colorCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      for (const [color, count] of sortedColors) {
        const percentage = ((count / analysis.totalPrintOpportunities) * 100).toFixed(1);
        console.log(`  ${color || 'Not specified'}: ${count} (${percentage}%)`);
      }
      console.log();
    }

    // File Specifications
    if (analysis.specificationFormats.size > 0) {
      console.log('📎 FILE FORMATS (from specifications)');
      console.log('-'.repeat(80));
      const sortedSpecFormats = Array.from(analysis.specificationFormats.entries())
        .sort((a, b) => b[1] - a[1]);
      
      for (const [format, count] of sortedSpecFormats) {
        const percentage = ((count / analysis.totalPrintOpportunities) * 100).toFixed(1);
        console.log(`  ${format}: ${count} (${percentage}%)`);
      }
      console.log();
    }

    // Resolutions
    if (analysis.resolutions.size > 0) {
      console.log('🔍 RESOLUTIONS');
      console.log('-'.repeat(80));
      const sortedResolutions = Array.from(analysis.resolutions.entries())
        .sort((a, b) => b[1] - a[1]);
      
      for (const [resolution, count] of sortedResolutions) {
        console.log(`  ${resolution}: ${count}`);
      }
      console.log();
    }

    // Bleed Information
    if (analysis.bleedInfo.hasBleed > 0 || analysis.bleedInfo.noBleed > 0) {
      console.log('✂️ BLEED REQUIREMENTS');
      console.log('-'.repeat(80));
      console.log(`  Requires bleed: ${analysis.bleedInfo.hasBleed}`);
      console.log(`  No bleed: ${analysis.bleedInfo.noBleed}`);
      console.log();
    }

    // Examples
    if (analysis.examples.length > 0) {
      console.log('📝 EXAMPLE PRINT OPPORTUNITIES');
      console.log('-'.repeat(80));
      
      for (let i = 0; i < Math.min(10, analysis.examples.length); i++) {
        const ex = analysis.examples[i];
        console.log(`\n${i + 1}. ${ex.publicationName} - ${ex.name || 'Unnamed'}`);
        console.log(`   Ad Format: ${ex.adFormat || 'Not specified'}`);
        console.log(`   Dimensions: ${ex.dimensions || 'Not specified'}`);
        console.log(`   Color: ${ex.color || 'Not specified'}`);
        
        if (ex.specifications) {
          console.log(`   Specifications:`);
          if (ex.specifications.format) {
            console.log(`     - Format: ${ex.specifications.format}`);
          }
          if (ex.specifications.resolution) {
            console.log(`     - Resolution: ${ex.specifications.resolution}`);
          }
          if (ex.specifications.bleed !== undefined) {
            console.log(`     - Bleed: ${ex.specifications.bleed}`);
          }
          if (ex.specifications.colorSpace) {
            console.log(`     - Color Space: ${ex.specifications.colorSpace}`);
          }
          if (ex.specifications.maxFileSize) {
            console.log(`     - Max File Size: ${ex.specifications.maxFileSize}`);
          }
        }
      }
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error analyzing print inventory:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the analysis
analyzePrintInventory()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

