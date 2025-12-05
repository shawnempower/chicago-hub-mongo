/**
 * Cleanup Print Dimensions - Staging Database
 * 
 * This script:
 * 1. Standardizes inconsistent dimension formats
 * 2. Adds default dimensions for missing items
 * 3. Flags unparseable items for manual review
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface CleanupResult {
  publicationId: number;
  publicationName: string;
  adName: string;
  action: 'standardized' | 'added-default' | 'flagged' | 'skipped';
  before?: string;
  after?: string;
  reason?: string;
}

function parseFraction(str: string): number {
  // Handle fractions like "6-1/4" or "9-3/8"
  const match = str.match(/^(\d+)(?:-(\d+)\/(\d+))?$/);
  if (!match) return parseFloat(str);
  
  const whole = parseInt(match[1]);
  if (!match[2]) return whole;
  
  const numerator = parseInt(match[2]);
  const denominator = parseInt(match[3]);
  return whole + (numerator / denominator);
}

function parseDimension(dim: string): { width: number; height: number } | null {
  if (!dim) return null;
  
  // Remove quotes and extra spaces
  let cleaned = dim.replace(/["']/g, '').trim();
  
  // Handle "or" for multiple options - take first one
  cleaned = cleaned.split(/\s+or\s+/i)[0].trim();
  
  // Handle comma-separated options (take first)
  cleaned = cleaned.split(',')[0].trim();
  
  // Pattern 1: "9" wide x 10" high" or "9 wide x 10 high"
  let match = cleaned.match(/^(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*wide\s*[x×]\s*(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*(?:high|tall)/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 2: "10" W x 12.625" H" or "5" W x 6-1/4" H"
  match = cleaned.match(/^(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*[Ww]\s*[x×]\s*(\d+(?:[-.]\d+)?(?:\/\d+)?)\s*(?:"|inches?)?\s*[Hh]/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 3: Standard "10.5" x 13.5"" or "10.5 x 13.5 inches"
  match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:"|inches?)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:"|inches?)?/i);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
  }
  
  // Pattern 4: With fractions "5 x 6-1/4"
  match = cleaned.match(/^(\d+(?:-\d+\/\d+)?)\s*(?:"|inches?)?\s*[x×]\s*(\d+(?:-\d+\/\d+)?)\s*(?:"|inches?)?/i);
  if (match) {
    return {
      width: parseFraction(match[1]),
      height: parseFraction(match[2])
    };
  }
  
  // Pattern 5: Extract from complex specs like "Bleed: 21.25 x 13.75, Trim: 21 x 13.25"
  // Prefer Trim, then Bleed
  const trimMatch = cleaned.match(/trim:\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (trimMatch) {
    return {
      width: parseFloat(trimMatch[1]),
      height: parseFloat(trimMatch[2])
    };
  }
  
  const bleedMatch = cleaned.match(/bleed:\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (bleedMatch) {
    return {
      width: parseFloat(bleedMatch[1]),
      height: parseFloat(bleedMatch[2])
    };
  }
  
  return null;
}

function standardizeDimension(dim: string): string | null {
  const parsed = parseDimension(dim);
  if (!parsed) return null;
  
  return `${parsed.width}" x ${parsed.height}"`;
}

function isValidDimension(dim: string): boolean {
  // Check if it matches our standard format or is parseable
  if (/^\d+(?:\.\d+)?["']?\s*[x×]\s*\d+(?:\.\d+)?["']?/.test(dim)) {
    return true;
  }
  
  // Check if parseable
  return parseDimension(dim) !== null;
}

function getDefaultDimensionForFormat(adFormat?: string): string {
  if (!adFormat) return '8.5" x 11"';
  
  const format = adFormat.toLowerCase();
  
  const defaults: Record<string, string> = {
    'full page': '8.5" x 11"',
    'half page': '8.5" x 5.5"',
    'quarter page': '4.25" x 5.5"',
    'eighth page': '4.25" x 2.75"',
    'business card': '3.5" x 2"',
    'classified': '2" x 2"',
    'insert': '8.5" x 11"'
  };
  
  for (const [key, dimension] of Object.entries(defaults)) {
    if (format.includes(key)) {
      return dimension;
    }
  }
  
  return '8.5" x 11"';
}

async function cleanupPrintDimensions(dryRun: boolean = true) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }

  const client = new MongoClient(mongoUri);
  const results: CleanupResult[] = [];

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('chicago-hub');
    console.log('🎯 Using database: chicago-hub (PRODUCTION)');
    console.log(`📝 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE UPDATE'}\n`);
    
    const publicationsCollection = db.collection('publications');
    
    const pubs = await publicationsCollection.find({
      'distributionChannels.print': { $exists: true }
    }).toArray();
    
    console.log(`Found ${pubs.length} publications with print inventory\n`);
    console.log('='.repeat(80));
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || pub.publicationId.toString();
      const prints = Array.isArray(pub.distributionChannels.print) 
        ? pub.distributionChannels.print 
        : [pub.distributionChannels.print];
      
      let pubModified = false;
      
      for (let printIdx = 0; printIdx < prints.length; printIdx++) {
        const print = prints[printIdx];
        if (!print || !print.advertisingOpportunities) continue;
        
        for (let adIdx = 0; adIdx < print.advertisingOpportunities.length; adIdx++) {
          const ad = print.advertisingOpportunities[adIdx];
          
          // Case 1: Missing dimensions - add default
          if (!ad.dimensions) {
            const defaultDim = getDefaultDimensionForFormat(ad.adFormat);
            
            results.push({
              publicationId: pub.publicationId,
              publicationName: pubName,
              adName: ad.name,
              action: 'added-default',
              after: defaultDim,
              reason: `Based on format: ${ad.adFormat || 'N/A'}`
            });
            
            if (!dryRun) {
              print.advertisingOpportunities[adIdx].dimensions = defaultDim;
              print.advertisingOpportunities[adIdx]._dimensionsAddedByScript = true;
              pubModified = true;
            }
            
            console.log(`➕ ${pubName} - ${ad.name}`);
            console.log(`   Added default: ${defaultDim} (${ad.adFormat || 'N/A'})`);
          }
          // Case 2: Inconsistent format - standardize
          else if (isValidDimension(ad.dimensions)) {
            const standardized = standardizeDimension(ad.dimensions);
            
            if (standardized && standardized !== ad.dimensions) {
              results.push({
                publicationId: pub.publicationId,
                publicationName: pubName,
                adName: ad.name,
                action: 'standardized',
                before: ad.dimensions,
                after: standardized,
                reason: 'Format standardization'
              });
              
              if (!dryRun) {
                print.advertisingOpportunities[adIdx].dimensions = standardized;
                print.advertisingOpportunities[adIdx]._dimensionsStandardizedByScript = true;
                pubModified = true;
              }
              
              console.log(`🔧 ${pubName} - ${ad.name}`);
              console.log(`   Before: "${ad.dimensions}"`);
              console.log(`   After:  "${standardized}"`);
            }
          }
          // Case 3: Unparseable - flag for review
          else {
            results.push({
              publicationId: pub.publicationId,
              publicationName: pubName,
              adName: ad.name,
              action: 'flagged',
              before: ad.dimensions,
              reason: 'Unparseable - needs manual review'
            });
            
            if (!dryRun) {
              print.advertisingOpportunities[adIdx]._dimensionsNeedReview = true;
              pubModified = true;
            }
            
            console.log(`⚠️  ${pubName} - ${ad.name}`);
            console.log(`   Current: "${ad.dimensions}"`);
            console.log(`   Action: Flagged for manual review`);
          }
        }
      }
      
      // Save publication if modified
      if (pubModified && !dryRun) {
        await publicationsCollection.updateOne(
          { _id: pub._id },
          { 
            $set: { 
              distributionChannels: pub.distributionChannels,
              'metadata.lastUpdated': new Date(),
              'metadata.dimensionsCleanedUp': new Date()
            } 
          }
        );
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    
    const summary = results.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\nTotal actions: ${results.length}`);
    Object.entries(summary).forEach(([action, count]) => {
      const icon = action === 'standardized' ? '🔧' :
                   action === 'added-default' ? '➕' :
                   action === 'flagged' ? '⚠️' : '⏭️';
      console.log(`${icon} ${action}: ${count}`);
    });
    
    if (dryRun) {
      console.log('\n💡 This was a DRY RUN - no changes were made');
      console.log('   Run with --apply to apply these changes');
    } else {
      console.log('\n✅ Changes have been applied to the database');
      console.log('   You can now refresh packages to pick up the cleaned data');
    }
    
    console.log();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Check for --apply flag
const applyChanges = process.argv.includes('--apply');

if (!applyChanges) {
  console.log('\n⚠️  DRY RUN MODE - No changes will be made');
  console.log('   Review the results, then run with --apply to apply changes\n');
}

cleanupPrintDimensions(!applyChanges)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

