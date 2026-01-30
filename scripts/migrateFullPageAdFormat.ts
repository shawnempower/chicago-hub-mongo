/**
 * Migrate Legacy "full page" adFormat
 * 
 * Updates print ads with adFormat: "full page" to use a more specific format
 * based on their existing dimensions, or defaults to "tall full page"
 * 
 * Usage:
 *   npx tsx scripts/migrateFullPageAdFormat.ts --dry-run    # Preview changes
 *   npx tsx scripts/migrateFullPageAdFormat.ts              # Execute changes
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const DB_NAME = process.argv.find(arg => arg.startsWith('--db='))?.split('=')[1] || 'chicago-hub';

// Map dimensions to appropriate adFormat
const DIMENSION_TO_FORMAT: Record<string, string> = {
  '10" x 15.5"': 'tall full page',
  '10.5" x 13.5"': 'tall portrait full page',
  '10" x 12.75"': 'upper portrait full page',
  '10" x 10"': 'square full page',
  '8.5" x 10.85"': 'narrow full page',
  '10" x 13"': 'tall portrait full page', // Legacy "full page" dimension -> closest match
};

interface MigrationChange {
  publicationId: number;
  publicationName: string;
  adName: string;
  oldFormat: string;
  newFormat: string;
  dimensions?: string;
  reason: string;
}

function normalizeSpaces(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

function findMatchingFormat(dimensions: string | undefined): string | null {
  if (!dimensions) return null;
  
  const normalized = normalizeSpaces(dimensions);
  
  // Direct match
  if (DIMENSION_TO_FORMAT[normalized]) {
    return DIMENSION_TO_FORMAT[normalized];
  }
  
  // Try matching with different quote styles
  const withCurlyQuotes = normalized.replace(/"/g, '"').replace(/"/g, '"');
  for (const [dim, format] of Object.entries(DIMENSION_TO_FORMAT)) {
    if (normalizeSpaces(dim) === withCurlyQuotes) {
      return format;
    }
  }
  
  return null;
}

async function migrateData() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  console.log(`🔍 Connecting to MongoDB (${DB_NAME})...`);
  console.log(`📋 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : '⚠️  LIVE RUN'}\n`);
  
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const publicationsCollection = db.collection('publications');
    const publications = await publicationsCollection.find({}).toArray();
    
    console.log(`📊 Found ${publications.length} publications\n`);
    
    const changes: MigrationChange[] = [];
    let totalUpdated = 0;

    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInformation?.title || pub.basicInfo?.publicationName || `ID: ${pubId}`;
      const channels = pub.distributionChannels;
      
      if (!channels) continue;
      
      let pubModified = false;

      // Process Print ads
      const prints = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      for (let printIdx = 0; printIdx < prints.length; printIdx++) {
        const print = prints[printIdx];
        if (!print?.advertisingOpportunities) continue;
        
        for (let adIdx = 0; adIdx < print.advertisingOpportunities.length; adIdx++) {
          const ad = print.advertisingOpportunities[adIdx];
          const adName = ad.name || `Ad ${adIdx + 1}`;
          
          // Check if this ad has legacy "full page" format
          if (ad.adFormat === 'full page') {
            const dimensions = ad.format?.dimensions || ad.dimensions;
            const matchedFormat = findMatchingFormat(dimensions);
            const newFormat = matchedFormat || 'tall full page'; // Default
            
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              adName,
              oldFormat: 'full page',
              newFormat,
              dimensions,
              reason: matchedFormat ? `Matched from dimensions: ${dimensions}` : 'Default (no dimension match)'
            });
            
            if (!DRY_RUN) {
              print.advertisingOpportunities[adIdx].adFormat = newFormat;
              pubModified = true;
            }
          }
        }
      }

      // Save changes for this publication
      if (pubModified && !DRY_RUN) {
        await publicationsCollection.updateOne(
          { _id: pub._id },
          { $set: { distributionChannels: channels } }
        );
        totalUpdated++;
      }
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log();
    
    console.log(`Total "full page" ads found: ${changes.length}`);
    console.log();
    
    if (changes.length > 0) {
      console.log('Changes:');
      for (const change of changes) {
        console.log(`  ${change.publicationName} - "${change.adName}"`);
        console.log(`    ${change.oldFormat} → ${change.newFormat}`);
        console.log(`    Reason: ${change.reason}`);
        console.log();
      }
    }

    console.log('='.repeat(80));
    if (DRY_RUN) {
      console.log('🔍 DRY RUN COMPLETE - No changes were made');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log(`✅ MIGRATION COMPLETE - ${totalUpdated} publications updated`);
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

migrateData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
