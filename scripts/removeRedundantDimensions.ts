/**
 * Remove Redundant Dimensions Migration Script
 * 
 * Standardizes dimensions storage to use ONLY format.dimensions
 * Removes redundant top-level dimensions field from print and newsletter ads
 * 
 * Strategy:
 * 1. For ads with BOTH locations: keep format.dimensions, remove top-level
 * 2. For ads with ONLY top-level: copy to format.dimensions, then remove top-level
 * 3. For ads with ONLY format.dimensions: no change needed
 * 
 * Usage:
 *   npx tsx scripts/removeRedundantDimensions.ts --dry-run    # Preview changes
 *   npx tsx scripts/removeRedundantDimensions.ts              # Execute changes
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

interface MigrationChange {
  publicationId: number;
  publicationName: string;
  channel: string;
  adName: string;
  action: 'removed_redundant' | 'migrated_to_format' | 'already_clean' | 'missing_dimensions';
  topLevelValue?: string;
  formatValue?: string;
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
          
          const hasTopLevel = ad.dimensions !== undefined && ad.dimensions !== null;
          const hasFormat = ad.format?.dimensions !== undefined && ad.format?.dimensions !== null;
          
          if (hasTopLevel && hasFormat) {
            // BOTH exist - remove top-level (format.dimensions is canonical)
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'print',
              adName,
              action: 'removed_redundant',
              topLevelValue: ad.dimensions,
              formatValue: ad.format.dimensions
            });
            
            if (!DRY_RUN) {
              delete print.advertisingOpportunities[adIdx].dimensions;
              pubModified = true;
            }
          } else if (hasTopLevel && !hasFormat) {
            // Only top-level exists - migrate to format.dimensions
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'print',
              adName,
              action: 'migrated_to_format',
              topLevelValue: ad.dimensions
            });
            
            if (!DRY_RUN) {
              if (!print.advertisingOpportunities[adIdx].format) {
                print.advertisingOpportunities[adIdx].format = {};
              }
              print.advertisingOpportunities[adIdx].format.dimensions = ad.dimensions;
              delete print.advertisingOpportunities[adIdx].dimensions;
              pubModified = true;
            }
          } else if (!hasTopLevel && hasFormat) {
            // Already clean - no action needed
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'print',
              adName,
              action: 'already_clean',
              formatValue: ad.format.dimensions
            });
          } else {
            // Neither exists - missing dimensions
            changes.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'print',
              adName,
              action: 'missing_dimensions'
            });
          }
        }
      }

      // Process Newsletter ads
      if (channels.newsletters) {
        for (let nlIdx = 0; nlIdx < channels.newsletters.length; nlIdx++) {
          const nl = channels.newsletters[nlIdx];
          if (!nl?.advertisingOpportunities) continue;
          
          for (let adIdx = 0; adIdx < nl.advertisingOpportunities.length; adIdx++) {
            const ad = nl.advertisingOpportunities[adIdx];
            const adName = ad.name || `Ad ${adIdx + 1}`;
            
            const hasTopLevel = ad.dimensions !== undefined && ad.dimensions !== null;
            const hasFormat = ad.format?.dimensions !== undefined && ad.format?.dimensions !== null;
            
            if (hasTopLevel && hasFormat) {
              // BOTH exist - remove top-level
              changes.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'newsletter',
                adName,
                action: 'removed_redundant',
                topLevelValue: ad.dimensions,
                formatValue: ad.format.dimensions
              });
              
              if (!DRY_RUN) {
                delete channels.newsletters[nlIdx].advertisingOpportunities[adIdx].dimensions;
                pubModified = true;
              }
            } else if (hasTopLevel && !hasFormat) {
              // Only top-level exists - migrate
              changes.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'newsletter',
                adName,
                action: 'migrated_to_format',
                topLevelValue: ad.dimensions
              });
              
              if (!DRY_RUN) {
                if (!channels.newsletters[nlIdx].advertisingOpportunities[adIdx].format) {
                  channels.newsletters[nlIdx].advertisingOpportunities[adIdx].format = {};
                }
                channels.newsletters[nlIdx].advertisingOpportunities[adIdx].format.dimensions = ad.dimensions;
                delete channels.newsletters[nlIdx].advertisingOpportunities[adIdx].dimensions;
                pubModified = true;
              }
            } else if (!hasTopLevel && hasFormat) {
              // Already clean
              changes.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'newsletter',
                adName,
                action: 'already_clean',
                formatValue: ad.format.dimensions
              });
            } else {
              // Missing
              changes.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'newsletter',
                adName,
                action: 'missing_dimensions'
              });
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
    
    const byAction = changes.reduce((acc, c) => {
      acc[c.action] = (acc[c.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byChannel = changes.reduce((acc, c) => {
      acc[c.channel] = (acc[c.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('By Action:');
    console.log(`  ✅ Removed redundant top-level: ${byAction['removed_redundant'] || 0}`);
    console.log(`  📦 Migrated to format.dimensions: ${byAction['migrated_to_format'] || 0}`);
    console.log(`  ✓  Already clean: ${byAction['already_clean'] || 0}`);
    console.log(`  ⚠️  Missing dimensions: ${byAction['missing_dimensions'] || 0}`);
    console.log();
    
    console.log('By Channel:');
    for (const [channel, count] of Object.entries(byChannel)) {
      console.log(`  ${channel}: ${count}`);
    }
    console.log();

    // Show examples of each action type
    console.log('='.repeat(80));
    console.log('📝 EXAMPLES OF CHANGES');
    console.log('='.repeat(80));
    
    const actionTypes = ['removed_redundant', 'migrated_to_format', 'missing_dimensions'];
    for (const action of actionTypes) {
      const examples = changes.filter(c => c.action === action).slice(0, 3);
      if (examples.length > 0) {
        console.log(`\n${action.toUpperCase()}:`);
        for (const ex of examples) {
          console.log(`  ${ex.publicationName} - ${ex.channel} - "${ex.adName}"`);
          if (ex.topLevelValue) console.log(`    Top-level was: ${ex.topLevelValue}`);
          if (ex.formatValue) console.log(`    format.dimensions: ${ex.formatValue}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
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
