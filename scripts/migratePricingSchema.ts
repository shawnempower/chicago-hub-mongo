#!/usr/bin/env node
/**
 * Migrate Pricing Schema
 * Migrates newsletter and event pricing from old format to new standardized format
 * 
 * OLD FORMAT (Newsletter):
 *   pricing: { perSend: 500, monthly: 2000 }
 * 
 * NEW FORMAT (Newsletter):
 *   pricing: { flatRate: 500, pricingModel: "per_send" }
 * 
 * OLD FORMAT (Events):
 *   pricing: 10000 (number)
 * 
 * NEW FORMAT (Events):
 *   pricing: { flatRate: 10000, pricingModel: "flat" }
 */

import { config } from 'dotenv';
config();

import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/index.js';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas.js';

interface MigrationStats {
  newslettersProcessed: number;
  newslettersMigrated: number;
  eventsProcessed: number;
  eventsMigrated: number;
  streamingProcessed: number;
  streamingAddedFrequency: number;
  errors: string[];
}

async function migratePricingSchema(dryRun: boolean = true) {
  console.log('\n' + '='.repeat(70));
  console.log(`  🔧 PRICING SCHEMA MIGRATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('='.repeat(70) + '\n');

  if (dryRun) {
    console.log('ℹ️  Running in DRY RUN mode - no changes will be made');
    console.log('   Run with --live flag to apply changes\n');
  } else {
    console.log('⚠️  Running in LIVE mode - changes will be applied!\n');
  }

  const stats: MigrationStats = {
    newslettersProcessed: 0,
    newslettersMigrated: 0,
    eventsProcessed: 0,
    eventsMigrated: 0,
    streamingProcessed: 0,
    streamingAddedFrequency: 0,
    errors: []
  };

  try {
    await connectToDatabase();
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);

    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Found ${publications.length} publications\n`);

    for (const pub of publications) {
      const pubName = pub.basicInfo?.publicationName || pub._id;
      let needsUpdate = false;
      const updates: any = {};

      // Migrate newsletters
      if (pub.distributionChannels?.newsletters) {
        for (let nlIndex = 0; nlIndex < pub.distributionChannels.newsletters.length; nlIndex++) {
          const newsletter = pub.distributionChannels.newsletters[nlIndex];
          
          if (newsletter.advertisingOpportunities) {
            for (let adIndex = 0; adIndex < newsletter.advertisingOpportunities.length; adIndex++) {
              const ad = newsletter.advertisingOpportunities[adIndex];
              stats.newslettersProcessed++;

              if (ad.pricing && ('perSend' in ad.pricing || 'monthly' in ad.pricing)) {
                needsUpdate = true;
                stats.newslettersMigrated++;

                // Determine pricing model and flatRate
                let flatRate = 0;
                let pricingModel = 'per_send';

                if (ad.pricing.perSend) {
                  flatRate = ad.pricing.perSend;
                  pricingModel = 'per_send';
                } else if (ad.pricing.monthly) {
                  flatRate = ad.pricing.monthly;
                  pricingModel = 'monthly';
                }

                const fieldPath = `distributionChannels.newsletters.${nlIndex}.advertisingOpportunities.${adIndex}.pricing`;
                updates[fieldPath] = {
                  flatRate,
                  pricingModel,
                  frequency: ad.pricing.frequency || 'One time'
                };

                console.log(`  ✓ Newsletter: ${pubName} - ${newsletter.name} - ${ad.name}`);
                console.log(`    Old: ${JSON.stringify(ad.pricing)}`);
                console.log(`    New: ${JSON.stringify(updates[fieldPath])}`);
              }
            }
          }
        }
      }

      // Migrate events
      if (pub.distributionChannels?.events) {
        for (let eventIndex = 0; eventIndex < pub.distributionChannels.events.length; eventIndex++) {
          const event = pub.distributionChannels.events[eventIndex];
          
          if (event.advertisingOpportunities) {
            for (let adIndex = 0; adIndex < event.advertisingOpportunities.length; adIndex++) {
              const ad = event.advertisingOpportunities[adIndex];
              stats.eventsProcessed++;

              if (ad.pricing && typeof ad.pricing === 'number') {
                needsUpdate = true;
                stats.eventsMigrated++;

                const fieldPath = `distributionChannels.events.${eventIndex}.advertisingOpportunities.${adIndex}.pricing`;
                updates[fieldPath] = {
                  flatRate: ad.pricing,
                  pricingModel: 'flat'
                };

                console.log(`  ✓ Event: ${pubName} - ${event.name} - ${ad.level}`);
                console.log(`    Old: ${ad.pricing}`);
                console.log(`    New: ${JSON.stringify(updates[fieldPath])}`);
              }
            }
          }
        }
      }

      // NOTE: Streaming frequency NOT added by migration
      // User will add manually via UI for accuracy
      if (pub.distributionChannels?.streamingVideo) {
        for (const streaming of pub.distributionChannels.streamingVideo) {
          stats.streamingProcessed++;
          if (!streaming.frequency) {
            stats.streamingAddedFrequency++;
          }
        }
      }

      // Apply updates
      if (needsUpdate && !dryRun) {
        try {
          await publicationsCollection.updateOne(
            { _id: pub._id },
            { $set: updates }
          );
          console.log(`  💾 Updated ${pubName}\n`);
        } catch (error) {
          const errorMsg = `Failed to update ${pubName}: ${error}`;
          stats.errors.push(errorMsg);
          console.error(`  ❌ ${errorMsg}\n`);
        }
      } else if (needsUpdate && dryRun) {
        console.log(`  📝 Would update ${pubName} (dry run)\n`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('  📊 MIGRATION SUMMARY');
    console.log('='.repeat(70) + '\n');
    
    console.log(`Newsletters:`);
    console.log(`  • Processed: ${stats.newslettersProcessed}`);
    console.log(`  • Migrated:  ${stats.newslettersMigrated}`);
    
    console.log(`\nEvents:`);
    console.log(`  • Processed: ${stats.eventsProcessed}`);
    console.log(`  • Migrated:  ${stats.eventsMigrated}`);
    
    console.log(`\nStreaming:`);
    console.log(`  • Processed:        ${stats.streamingProcessed}`);
    console.log(`  • Missing frequency:  ${stats.streamingAddedFrequency} ⚠️  REQUIRES MANUAL ENTRY`);
    
    if (stats.streamingAddedFrequency > 0) {
      console.log(`\n⚠️  WARNING: Streaming Frequency Not Added by Migration`);
      console.log(`   ${stats.streamingAddedFrequency} streaming channel(s) need frequency field.`);
      console.log(`   Please add manually via UI for accuracy.`);
      console.log(`   (daily, weekly, bi-weekly, monthly, irregular)`);
    }
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors: ${stats.errors.length}`);
      stats.errors.forEach(err => console.log(`  • ${err}`));
    }

    const totalMigrations = stats.newslettersMigrated + stats.eventsMigrated;
    
    if (dryRun && totalMigrations > 0) {
      console.log(`\n✅ Dry run complete. ${totalMigrations} items would be migrated.`);
      console.log(`   Run with --live flag to apply changes.`);
      
      if (stats.streamingAddedFrequency > 0) {
        console.log(`\n📝 Note: ${stats.streamingAddedFrequency} streaming channel(s) still need frequency field.`);
        console.log(`   This must be added manually via the UI.`);
      }
    } else if (!dryRun && totalMigrations > 0) {
      console.log(`\n✅ Migration complete! ${totalMigrations} items updated.`);
      
      if (stats.streamingAddedFrequency > 0) {
        console.log(`\n⚠️  Action Required: ${stats.streamingAddedFrequency} streaming channel(s) need frequency field.`);
        console.log(`   Please update via publication dashboard.`);
      }
    } else {
      console.log(`\n✅ No migration needed. All data is already in correct format.`);
      
      if (stats.streamingAddedFrequency > 0) {
        console.log(`\n⚠️  ${stats.streamingAddedFrequency} streaming channel(s) still missing frequency field.`);
        console.log(`   Please add manually via UI.`);
      }
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Parse command line args
const args = process.argv.slice(2);
const isLive = args.includes('--live');

// Run migration
migratePricingSchema(!isLive);

