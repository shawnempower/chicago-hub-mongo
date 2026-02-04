/**
 * Show All Dimension Changes - Detailed Dry Run Report
 * 
 * Shows every single record that would be changed with before/after values
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_NAME = process.argv.find(arg => arg.startsWith('--db='))?.split('=')[1] || 'chicago-hub';

interface Change {
  publicationId: number;
  publicationName: string;
  channel: string;
  adName: string;
  action: string;
  before: {
    topLevel: string | null;
    formatDimensions: string | null;
  };
  after: {
    topLevel: string | null;
    formatDimensions: string | null;
  };
}

async function showAllChanges() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const publications = await db.collection('publications').find({}).toArray();
    
    const changes: Change[] = [];

    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInformation?.title || pub.basicInfo?.publicationName || `ID: ${pubId}`;
      const channels = pub.distributionChannels;
      
      if (!channels) continue;

      // Process Print ads
      const prints = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      for (const print of prints) {
        if (!print?.advertisingOpportunities) continue;
        
        for (const ad of print.advertisingOpportunities) {
          const adName = ad.name || 'Unnamed';
          const hasTopLevel = ad.dimensions !== undefined && ad.dimensions !== null;
          const hasFormat = ad.format?.dimensions !== undefined && ad.format?.dimensions !== null;
          
          let action = '';
          let afterTopLevel: string | null = null;
          let afterFormat: string | null = null;
          
          if (hasTopLevel && hasFormat) {
            action = 'REMOVE_REDUNDANT';
            afterFormat = ad.format.dimensions;
          } else if (hasTopLevel && !hasFormat) {
            action = 'MIGRATE_TO_FORMAT';
            afterFormat = ad.dimensions;
          } else if (!hasTopLevel && hasFormat) {
            action = 'ALREADY_CLEAN';
            afterFormat = ad.format.dimensions;
          } else {
            action = 'MISSING_DIMENSIONS';
          }
          
          changes.push({
            publicationId: pubId,
            publicationName: pubName,
            channel: 'print',
            adName,
            action,
            before: {
              topLevel: hasTopLevel ? ad.dimensions : null,
              formatDimensions: hasFormat ? ad.format.dimensions : null
            },
            after: {
              topLevel: afterTopLevel,
              formatDimensions: afterFormat
            }
          });
        }
      }

      // Process Newsletter ads
      if (channels.newsletters) {
        for (const nl of channels.newsletters) {
          if (!nl?.advertisingOpportunities) continue;
          const nlName = nl.name || 'Unnamed Newsletter';
          
          for (const ad of nl.advertisingOpportunities) {
            const adName = ad.name || 'Unnamed';
            const hasTopLevel = ad.dimensions !== undefined && ad.dimensions !== null;
            const hasFormat = ad.format?.dimensions !== undefined && ad.format?.dimensions !== null;
            
            let action = '';
            let afterTopLevel: string | null = null;
            let afterFormat: string | null = null;
            
            if (hasTopLevel && hasFormat) {
              action = 'REMOVE_REDUNDANT';
              afterFormat = ad.format.dimensions;
            } else if (hasTopLevel && !hasFormat) {
              action = 'MIGRATE_TO_FORMAT';
              afterFormat = ad.dimensions;
            } else if (!hasTopLevel && hasFormat) {
              action = 'ALREADY_CLEAN';
              afterFormat = ad.format.dimensions;
            } else {
              action = 'MISSING_DIMENSIONS';
            }
            
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: `newsletter (${nlName})`,
              adName,
              action,
              before: {
                topLevel: hasTopLevel ? ad.dimensions : null,
                formatDimensions: hasFormat ? ad.format.dimensions : null
              },
              after: {
                topLevel: afterTopLevel,
                formatDimensions: afterFormat
              }
            });
          }
        }
      }
    }

    // Group by action type
    const grouped = {
      REMOVE_REDUNDANT: changes.filter(c => c.action === 'REMOVE_REDUNDANT'),
      MIGRATE_TO_FORMAT: changes.filter(c => c.action === 'MIGRATE_TO_FORMAT'),
      ALREADY_CLEAN: changes.filter(c => c.action === 'ALREADY_CLEAN'),
      MISSING_DIMENSIONS: changes.filter(c => c.action === 'MISSING_DIMENSIONS')
    };

    // Print detailed report
    console.log('='.repeat(100));
    console.log('DETAILED DRY RUN REPORT - ALL CHANGES');
    console.log('='.repeat(100));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Total records: ${changes.length}`);
    console.log();

    // REMOVE_REDUNDANT
    console.log('━'.repeat(100));
    console.log(`🗑️  REMOVE REDUNDANT TOP-LEVEL (${grouped.REMOVE_REDUNDANT.length} records)`);
    console.log('   These have BOTH ad.dimensions AND ad.format.dimensions - will remove top-level');
    console.log('━'.repeat(100));
    for (const c of grouped.REMOVE_REDUNDANT) {
      console.log(`\n📰 ${c.publicationName}`);
      console.log(`   Channel: ${c.channel}`);
      console.log(`   Ad: "${c.adName}"`);
      console.log(`   BEFORE: ad.dimensions = "${c.before.topLevel}"`);
      console.log(`           ad.format.dimensions = "${c.before.formatDimensions}"`);
      console.log(`   AFTER:  ad.dimensions = (deleted)`);
      console.log(`           ad.format.dimensions = "${c.after.formatDimensions}"`);
    }

    // MIGRATE_TO_FORMAT
    console.log('\n' + '━'.repeat(100));
    console.log(`📦 MIGRATE TO FORMAT (${grouped.MIGRATE_TO_FORMAT.length} records)`);
    console.log('   These have ONLY ad.dimensions - will copy to format.dimensions, then remove top-level');
    console.log('━'.repeat(100));
    for (const c of grouped.MIGRATE_TO_FORMAT) {
      console.log(`\n📰 ${c.publicationName}`);
      console.log(`   Channel: ${c.channel}`);
      console.log(`   Ad: "${c.adName}"`);
      console.log(`   BEFORE: ad.dimensions = "${c.before.topLevel}"`);
      console.log(`           ad.format.dimensions = (not set)`);
      console.log(`   AFTER:  ad.dimensions = (deleted)`);
      console.log(`           ad.format.dimensions = "${c.after.formatDimensions}"`);
    }

    // ALREADY_CLEAN
    console.log('\n' + '━'.repeat(100));
    console.log(`✅ ALREADY CLEAN (${grouped.ALREADY_CLEAN.length} records)`);
    console.log('   These have ONLY ad.format.dimensions - no changes needed');
    console.log('━'.repeat(100));
    for (const c of grouped.ALREADY_CLEAN) {
      console.log(`   ${c.publicationName} | ${c.channel} | "${c.adName}" | ${c.before.formatDimensions}`);
    }

    // MISSING_DIMENSIONS
    console.log('\n' + '━'.repeat(100));
    console.log(`⚠️  MISSING DIMENSIONS (${grouped.MISSING_DIMENSIONS.length} records)`);
    console.log('   These have NO dimensions anywhere - flagged for manual review');
    console.log('━'.repeat(100));
    for (const c of grouped.MISSING_DIMENSIONS) {
      console.log(`\n⚠️  ${c.publicationName}`);
      console.log(`   Channel: ${c.channel}`);
      console.log(`   Ad: "${c.adName}"`);
      console.log(`   ACTION NEEDED: Add dimensions manually`);
    }

    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total records analyzed: ${changes.length}`);
    console.log(`  - Will remove redundant top-level: ${grouped.REMOVE_REDUNDANT.length}`);
    console.log(`  - Will migrate to format.dimensions: ${grouped.MIGRATE_TO_FORMAT.length}`);
    console.log(`  - Already clean (no change): ${grouped.ALREADY_CLEAN.length}`);
    console.log(`  - Missing dimensions (needs manual entry): ${grouped.MISSING_DIMENSIONS.length}`);
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

showAllChanges()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
