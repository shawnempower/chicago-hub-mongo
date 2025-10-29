#!/usr/bin/env node

/**
 * Frequency Pattern Migration Script
 * 
 * This script migrates pricing frequency values to the standardized numberx format.
 * - Converts "One time" and "one time" → "1x"
 * - Flags other non-compliant values for manual review
 * 
 * Usage:
 *   node scripts/migrate-frequency-patterns.cjs           # Dry run (preview changes)
 *   node scripts/migrate-frequency-patterns.cjs --live    # Apply changes to database
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// MongoDB connection
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';
const COLLECTION_NAME = 'publications';

// Strict pattern for numberx format
const STRICT_NUMBERX_PATTERN = /^\d+x$/;

// Migration mapping
const FREQUENCY_MIGRATION_MAP = {
  'One time': '1x',
  'one time': '1x',
  'Weekly': '52x',      // 52 weeks per year
  'weekly': '52x',
  'Monthly': '12x',     // 12 months per year
  'monthly': '12x',
  'Per Season': '4x',   // 4 seasons per year
  'Quarterly': '4x',    // 4 quarters per year
  'quarterly': '4x',
};

/**
 * Check if a frequency value needs migration
 */
function needsMigration(frequency) {
  if (!frequency) return false;
  return !STRICT_NUMBERX_PATTERN.test(frequency);
}

/**
 * Migrate a frequency value
 * Returns { migrated: boolean, newValue: string, requiresReview: boolean }
 */
function migrateFrequency(frequency) {
  if (!frequency) return { migrated: false, newValue: frequency, requiresReview: false };
  
  // Already compliant
  if (STRICT_NUMBERX_PATTERN.test(frequency)) {
    return { migrated: false, newValue: frequency, requiresReview: false };
  }
  
  // Check if we have a mapping
  if (FREQUENCY_MIGRATION_MAP[frequency]) {
    return {
      migrated: true,
      newValue: FREQUENCY_MIGRATION_MAP[frequency],
      requiresReview: false,
      oldValue: frequency
    };
  }
  
  // No mapping - requires manual review
  return {
    migrated: false,
    newValue: frequency,
    requiresReview: true,
    oldValue: frequency
  };
}

/**
 * Migrate frequencies in pricing object or array
 */
function migratePricingFrequencies(pricing, context, changes) {
  if (!pricing) return pricing;
  
  // Handle array of pricing tiers
  if (Array.isArray(pricing)) {
    return pricing.map((tier, idx) => {
      if (tier.pricing?.frequency) {
        const result = migrateFrequency(tier.pricing.frequency);
        if (result.migrated) {
          changes.push({
            context: `${context} [tier ${idx}]`,
            oldValue: result.oldValue,
            newValue: result.newValue
          });
          return {
            ...tier,
            pricing: {
              ...tier.pricing,
              frequency: result.newValue
            }
          };
        } else if (result.requiresReview) {
          changes.push({
            context: `${context} [tier ${idx}]`,
            oldValue: result.oldValue,
            newValue: '⚠️ REQUIRES MANUAL REVIEW',
            requiresReview: true
          });
        }
      }
      return tier;
    });
  }
  // Handle single pricing object
  else if (typeof pricing === 'object' && pricing.frequency) {
    const result = migrateFrequency(pricing.frequency);
    if (result.migrated) {
      changes.push({
        context: context,
        oldValue: result.oldValue,
        newValue: result.newValue
      });
      return {
        ...pricing,
        frequency: result.newValue
      };
    } else if (result.requiresReview) {
      changes.push({
        context: context,
        oldValue: result.oldValue,
        newValue: '⚠️ REQUIRES MANUAL REVIEW',
        requiresReview: true
      });
    }
  }
  
  return pricing;
}

/**
 * Migrate hub pricing frequencies
 */
function migrateHubPricingFrequencies(hubPricing, context, changes) {
  if (!hubPricing || !Array.isArray(hubPricing)) return hubPricing;
  
  return hubPricing.map((hub, idx) => {
    if (hub.pricing) {
      const hubContext = `${context} [${hub.hubName || hub.hubId || `hub ${idx}`}]`;
      return {
        ...hub,
        pricing: migratePricingFrequencies(hub.pricing, hubContext, changes)
      };
    }
    return hub;
  });
}

/**
 * Migrate advertising opportunities
 */
function migrateAdvertisingOpportunities(opportunities, channelType, channelName, changes) {
  if (!opportunities || !Array.isArray(opportunities)) return opportunities;
  
  return opportunities.map((opp, idx) => {
    const oppName = opp.name || opp.adType || `Ad ${idx}`;
    const context = channelName 
      ? `${channelType} > ${channelName} > ${oppName}`
      : `${channelType} > ${oppName}`;
    
    const updated = { ...opp };
    
    // Migrate default pricing
    if (opp.pricing) {
      updated.pricing = migratePricingFrequencies(opp.pricing, `${context} [default]`, changes);
    }
    
    // Migrate hub pricing
    if (opp.hubPricing) {
      updated.hubPricing = migrateHubPricingFrequencies(opp.hubPricing, `${context} [hub]`, changes);
    }
    
    return updated;
  });
}

/**
 * Migrate a single publication
 */
function migratePublication(publication) {
  const updated = { ...publication };
  const changes = [];
  
  if (!publication.distributionChannels) return { updated, changes };
  
  const channels = publication.distributionChannels;
  updated.distributionChannels = { ...channels };
  
  // Migrate Newsletter ads
  if (channels.newsletters) {
    const newsletters = Array.isArray(channels.newsletters) ? channels.newsletters : [channels.newsletters];
    updated.distributionChannels.newsletters = newsletters.map(newsletter => {
      if (newsletter.advertisingOpportunities) {
        const name = newsletter.name || 'Newsletter';
        return {
          ...newsletter,
          advertisingOpportunities: migrateAdvertisingOpportunities(
            newsletter.advertisingOpportunities,
            'Newsletter',
            name,
            changes
          )
        };
      }
      return newsletter;
    });
  }
  
  // Migrate Print ads
  if (channels.print) {
    const printItems = Array.isArray(channels.print) ? channels.print : [channels.print];
    updated.distributionChannels.print = printItems.map(printItem => {
      if (printItem.advertisingOpportunities) {
        const name = printItem.name || 'Print';
        return {
          ...printItem,
          advertisingOpportunities: migrateAdvertisingOpportunities(
            printItem.advertisingOpportunities,
            'Print',
            name,
            changes
          )
        };
      }
      return printItem;
    });
  }
  
  // Migrate Podcast ads
  if (channels.podcasts) {
    const podcasts = Array.isArray(channels.podcasts) ? channels.podcasts : [channels.podcasts];
    updated.distributionChannels.podcasts = podcasts.map(podcast => {
      if (podcast.advertisingOpportunities) {
        const name = podcast.name || 'Podcast';
        return {
          ...podcast,
          advertisingOpportunities: migrateAdvertisingOpportunities(
            podcast.advertisingOpportunities,
            'Podcast',
            name,
            changes
          )
        };
      }
      return podcast;
    });
  }
  
  // Migrate Radio/Streaming ads
  if (channels.radioStations) {
    const stations = Array.isArray(channels.radioStations) ? channels.radioStations : [channels.radioStations];
    updated.distributionChannels.radioStations = stations.map(station => {
      if (station.advertisingOpportunities) {
        const name = station.callSign || station.name || 'Radio';
        return {
          ...station,
          advertisingOpportunities: migrateAdvertisingOpportunities(
            station.advertisingOpportunities,
            'Radio',
            name,
            changes
          )
        };
      }
      return station;
    });
  }
  
  return { updated, changes };
}

/**
 * Main migration function
 */
async function migrateFrequencyPatterns(dryRun = true) {
  console.log('🚀 Starting frequency pattern migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (will update database)'}`);
  console.log('');
  console.log('Migration rules:');
  console.log('  • "One time" or "one time" → "1x"');
  console.log('  • Values already in numberx format (1x, 2x, etc.) → No change');
  console.log('  • Other values → Flagged for manual review');
  console.log('');
  
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI or VITE_MONGODB_URI environment variable not set');
  }
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✓ Connected');
    console.log('');
    
    // Fetch all publications
    console.log('📥 Fetching all publications...');
    const publications = await collection.find({}).toArray();
    console.log(`✓ Found ${publications.length} publications`);
    console.log('');
    
    let migratedCount = 0;
    let skippedCount = 0;
    let requiresReviewCount = 0;
    const errors = [];
    const allChanges = [];
    const reviewRequired = [];
    
    // Create backup
    if (!dryRun) {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFile = path.join(backupDir, `frequency-migration-backup-${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(publications, null, 2));
      console.log(`📦 Backup created: ${backupFile}`);
      console.log('');
    }
    
    // Process each publication
    console.log('🔄 Processing publications...');
    console.log('');
    
    for (const publication of publications) {
      try {
        const pubName = publication.name || publication._id;
        const { updated, changes } = migratePublication(publication);
        
        if (changes.length === 0) {
          console.log(`✓ ${pubName} - No changes needed`);
          skippedCount++;
        } else {
          const hasReviewItems = changes.some(c => c.requiresReview);
          
          if (hasReviewItems) {
            console.log(`⚠️  ${pubName} - Has items requiring manual review`);
            requiresReviewCount++;
            reviewRequired.push({
              publicationName: pubName,
              publicationId: publication._id,
              changes: changes
            });
          } else {
            console.log(`✓ ${pubName} - ${changes.length} change(s) made`);
            migratedCount++;
          }
          
          changes.forEach(change => {
            console.log(`   • ${change.context}`);
            console.log(`     "${change.oldValue}" → "${change.newValue}"`);
          });
          
          allChanges.push({
            publicationName: pubName,
            publicationId: publication._id,
            changes: changes
          });
          
          // Save changes if not dry run and no review required
          if (!dryRun && !hasReviewItems) {
            await collection.updateOne(
              { _id: publication._id },
              { $set: updated }
            );
            console.log('   💾 Saved to database');
          }
        }
        console.log('');
      } catch (error) {
        console.error(`✗ Error processing ${publication.name || publication._id}: ${error.message}`);
        errors.push({ 
          publicationId: publication._id, 
          error: error.message 
        });
        console.log('');
      }
    }
    
    // Summary Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Total publications:                    ${publications.length}`);
    console.log(`Successfully migrated:                 ${migratedCount}`);
    console.log(`Skipped (no changes):                  ${skippedCount}`);
    console.log(`Requires manual review:                ${requiresReviewCount}`);
    console.log(`Errors:                                ${errors.length}`);
    console.log('');
    
    // Manual review section
    if (reviewRequired.length > 0) {
      console.log('───────────────────────────────────────────────────────────');
      console.log('⚠️  ITEMS REQUIRING MANUAL REVIEW:');
      console.log('───────────────────────────────────────────────────────────');
      console.log('');
      console.log('The following frequency values could not be automatically migrated:');
      console.log('');
      
      reviewRequired.forEach((item) => {
        console.log(`📋 ${item.publicationName} (ID: ${item.publicationId})`);
        item.changes.filter(c => c.requiresReview).forEach(change => {
          console.log(`   • ${change.context}`);
          console.log(`     Current value: "${change.oldValue}"`);
          console.log(`     Action needed: Manually convert to numberx format (e.g., "1x", "4x", "12x")`);
        });
        console.log('');
      });
      
      console.log('To add automatic conversion for these values, update the');
      console.log('FREQUENCY_MIGRATION_MAP in this script.');
      console.log('');
    }
    
    // Errors
    if (errors.length > 0) {
      console.log('───────────────────────────────────────────────────────────');
      console.log('❌ ERRORS:');
      console.log('───────────────────────────────────────────────────────────');
      errors.forEach(err => {
        console.log(`  - ${err.publicationId}: ${err.error}`);
      });
      console.log('');
    }
    
    // Final message
    if (dryRun) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  DRY RUN MODE - No changes were saved to the database');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      if (requiresReviewCount > 0) {
        console.log('Before running in LIVE mode:');
        console.log('1. Review the items flagged above');
        console.log('2. Either:');
        console.log('   a) Add mappings to FREQUENCY_MIGRATION_MAP in this script');
        console.log('   b) Manually update those records in the database');
        console.log('3. Re-run this script to verify all changes');
        console.log('');
      }
      console.log('To apply changes, run with --live flag:');
      console.log('  node scripts/migrate-frequency-patterns.cjs --live');
    } else {
      console.log('═══════════════════════════════════════════════════════════');
      if (requiresReviewCount > 0) {
        console.log('⚠️  Migration partially completed');
        console.log(`${migratedCount} publications updated successfully`);
        console.log(`${requiresReviewCount} publications require manual review`);
      } else {
        console.log('✅ Migration completed successfully!');
      }
      console.log('═══════════════════════════════════════════════════════════');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('');
    console.log('📡 Database connection closed');
  }
}

// Run the migration
const dryRun = !process.argv.includes('--live');

migrateFrequencyPatterns(dryRun)
  .then(() => {
    console.log('');
    console.log('✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });

