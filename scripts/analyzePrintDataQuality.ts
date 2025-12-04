/**
 * Analyze Print Inventory Data Quality
 * 
 * Checks all print inventory items for:
 * - Missing dimensions
 * - Inconsistent formats
 * - Unparseable dimensions
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface DimensionIssue {
  publicationId: number;
  publicationName: string;
  adName: string;
  adFormat?: string;
  dimensions?: string;
  issue: 'missing' | 'unparseable' | 'inconsistent' | 'valid';
  suggestion?: string;
}

function parseDimension(dim: string): { width: number; height: number } | null {
  if (!dim) return null;
  
  // Remove quotes, W, H indicators and extra spaces
  const cleaned = dim.replace(/["']/g, '').replace(/\s*[WwHh]\s*/g, ' ').trim();
  
  // Try to match various formats
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*(?:inches?|in))?/i);
  if (!match) return null;
  
  return {
    width: parseFloat(match[1]),
    height: parseFloat(match[2])
  };
}

function standardizeDimension(dim: string): string | null {
  const parsed = parseDimension(dim);
  if (!parsed) return null;
  
  return `${parsed.width}" x ${parsed.height}"`;
}

async function analyzeData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('staging-chicago-hub');
    console.log('🎯 Using database: staging-chicago-hub\n');
    
    const pubs = await db.collection('publications').find({
      'distributionChannels.print': { $exists: true }
    }).toArray();
    
    const issues: DimensionIssue[] = [];
    let totalPrintAds = 0;
    let validCount = 0;
    
  pubs.forEach(pub => {
    const pubName = pub.basicInfo?.publicationName || pub.publicationId.toString();
    const prints = Array.isArray(pub.distributionChannels.print) 
      ? pub.distributionChannels.print 
      : [pub.distributionChannels.print];
    
    prints.forEach(print => {
      if (!print) return; // Skip null entries
      print.advertisingOpportunities?.forEach((ad: any) => {
          totalPrintAds++;
          
          if (!ad.dimensions) {
            issues.push({
              publicationId: pub.publicationId,
              publicationName: pubName,
              adName: ad.name,
              adFormat: ad.adFormat,
              issue: 'missing',
              suggestion: getDefaultDimensionForFormat(ad.adFormat)
            });
          } else {
            const dim = ad.dimensions.toString();
            const parsed = parseDimension(dim);
            
            if (!parsed) {
              issues.push({
                publicationId: pub.publicationId,
                publicationName: pubName,
                adName: ad.name,
                adFormat: ad.adFormat,
                dimensions: dim,
                issue: 'unparseable',
                suggestion: 'Manual review needed'
              });
            } else {
              const standardized = standardizeDimension(dim);
              if (standardized !== dim) {
                issues.push({
                  publicationId: pub.publicationId,
                  publicationName: pubName,
                  adName: ad.name,
                  adFormat: ad.adFormat,
                  dimensions: dim,
                  issue: 'inconsistent',
                  suggestion: standardized || undefined
                });
              } else {
                validCount++;
              }
            }
          }
        });
      });
    });
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total print ads: ${totalPrintAds}`);
    console.log(`✅ Valid format: ${validCount} (${(validCount/totalPrintAds*100).toFixed(1)}%)`);
    console.log(`⚠️  Needs cleanup: ${issues.length} (${(issues.length/totalPrintAds*100).toFixed(1)}%)`);
    console.log();
    
    // Break down by issue type
    const byIssue = issues.reduce((acc, item) => {
      acc[item.issue] = (acc[item.issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Breakdown by issue:');
    Object.entries(byIssue).forEach(([issue, count]) => {
      console.log(`  ${issue}: ${count}`);
    });
    console.log();
    
    // Show examples of each issue type
    console.log('='.repeat(80));
    console.log('📋 EXAMPLES BY ISSUE TYPE');
    console.log('='.repeat(80));
    
    ['missing', 'unparseable', 'inconsistent'].forEach(issueType => {
      const examples = issues.filter(i => i.issue === issueType).slice(0, 5);
      if (examples.length > 0) {
        console.log(`\n${issueType.toUpperCase()} (${byIssue[issueType] || 0} total):`);
        examples.forEach(ex => {
          console.log(`  ${ex.publicationName} - ${ex.adName}`);
          console.log(`    Format: ${ex.adFormat || 'N/A'}`);
          console.log(`    Current: ${ex.dimensions || '❌ MISSING'}`);
          console.log(`    Suggestion: ${ex.suggestion || 'N/A'}`);
        });
      }
    });
    
    await client.close();
    
    // Return summary for scripting
    return {
      total: totalPrintAds,
      valid: validCount,
      issues: issues.length,
      byType: byIssue
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

function getDefaultDimensionForFormat(adFormat?: string): string {
  if (!adFormat) return '8.5" x 11"'; // Default letter size
  
  const format = adFormat.toLowerCase();
  
  // Map ad formats to typical dimensions
  const defaults: Record<string, string> = {
    'full page': '8.5" x 11"',
    'half page': '8.5" x 5.5"',
    'quarter page': '4.25" x 5.5"',
    'eighth page': '4.25" x 2.75"',
    'business card': '3.5" x 2"',
    'classified': '2" x 2"',
  };
  
  for (const [key, dimension] of Object.entries(defaults)) {
    if (format.includes(key)) {
      return dimension;
    }
  }
  
  return '8.5" x 11"'; // Default fallback
}

analyzeData()
  .then(summary => {
    console.log('\n✅ Analysis complete\n');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

