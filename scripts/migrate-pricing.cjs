#!/usr/bin/env node

/**
 * Pricing Schema Migration Runner
 * 
 * This script migrates publication pricing data from the old schema to the new clean schema.
 * 
 * Usage:
 *   node scripts/migrate-pricing.js           # Dry run (preview changes)
 *   node scripts/migrate-pricing.js --live    # Apply changes to database
 */

const path = require('path');
const fs = require('fs');

// Read environment variables
require('dotenv').config();

// MongoDB connection
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';
const COLLECTION_NAME = 'publications';

/**
 * Migrate a single pricing object from legacy to clean schema
 */
function migratePricingObject(pricing) {
  if (!pricing) return null;

  // If already using clean schema (has pricingModel and flatRate), keep it but ensure no legacy fields remain
  if (pricing.pricingModel && pricing.flatRate !== undefined) {
    // Create clean object with only allowed fields
    const cleanPricing = {
      flatRate: pricing.flatRate,
      pricingModel: pricing.pricingModel
    };
    
    // Preserve other allowed fields
    if (pricing.frequency) cleanPricing.frequency = pricing.frequency;
    if (pricing.minimumCommitment) cleanPricing.minimumCommitment = pricing.minimumCommitment;
    
    return cleanPricing;
  }

  // Map old field names to pricing models (in priority order)
  const fieldToPricingModel = {
    perPost: 'per_post',
    perStory: 'per_story',
    perSend: 'per_send',
    perSpot: 'per_spot',
    per30Second: 'per_spot',  // Radio ads - treat as per spot
    per60Second: 'per_spot',  // Radio ads - treat as per spot
    perEpisode: 'per_episode',  // Podcast ads
    perAd: 'per_ad',
    cpm: 'cpm',
    cpc: 'cpc',
    weekly: 'per_week',
    monthly: 'monthly',
    sponsorshipFee: 'flat'  // For events
  };

  // Find the first non-zero price field and use it (this takes priority over generic flatRate)
  for (const [fieldName, pricingModel] of Object.entries(fieldToPricingModel)) {
    const value = pricing[fieldName];
    if (value !== undefined && value !== null && value !== 0) {
      // Create clean pricing object
      const cleanPricing = {
        flatRate: value,
        pricingModel: pricingModel
      };

      // Preserve other fields (frequency, minimumCommitment, etc.)
      if (pricing.frequency) cleanPricing.frequency = pricing.frequency;
      if (pricing.minimumCommitment) cleanPricing.minimumCommitment = pricing.minimumCommitment;

      return cleanPricing;
    }
  }

  // If we have flatRate but no pricingModel, default to 'flat'
  if (pricing.flatRate !== undefined && pricing.flatRate !== 0) {
    const cleanPricing = {
      flatRate: pricing.flatRate,
      pricingModel: 'flat'
    };
    
    if (pricing.frequency) cleanPricing.frequency = pricing.frequency;
    if (pricing.minimumCommitment) cleanPricing.minimumCommitment = pricing.minimumCommitment;
    
    return cleanPricing;
  }

  return null;
}

/**
 * Migrate pricing array (for tiered pricing)
 */
function migratePricingArray(pricingArray) {
  return pricingArray.map(tier => {
    if (tier.pricing) {
      const migratedPricing = migratePricingObject(tier.pricing);
      return {
        ...tier,
        pricing: migratedPricing || tier.pricing
      };
    }
    return tier;
  });
}

/**
 * Migrate print-specific pricing (oneTime, fourTimes, twelveTimes, openRate)
 * Returns array of pricing tiers or single object if only one tier
 */
function migratePrintPricing(pricing) {
  if (!pricing) return null;

  // Check if this is print-specific legacy format
  const hasPrintFields = pricing.oneTime !== undefined || 
                         pricing.fourTimes !== undefined || 
                         pricing.twelveTimes !== undefined ||
                         pricing.openRate !== undefined;

  if (!hasPrintFields) return null;

  const tiers = [];

  // Add oneTime tier
  if (pricing.oneTime !== undefined && pricing.oneTime !== null) {
    tiers.push({
      pricing: {
        flatRate: pricing.oneTime,
        pricingModel: 'per_ad',
        frequency: 'One time'
      }
    });
  }

  // Add fourTimes tier (if different from oneTime and not null)
  if (pricing.fourTimes !== undefined && pricing.fourTimes !== null) {
    tiers.push({
      pricing: {
        flatRate: pricing.fourTimes,
        pricingModel: 'per_ad',
        frequency: '4x'
      }
    });
  }

  // Add twelveTimes tier (if different and not null)
  if (pricing.twelveTimes !== undefined && pricing.twelveTimes !== null) {
    tiers.push({
      pricing: {
        flatRate: pricing.twelveTimes,
        pricingModel: 'per_ad',
        frequency: '12x'
      }
    });
  }

  // If no valid tiers were created but openRate exists, use openRate as default
  if (tiers.length === 0 && pricing.openRate !== undefined && pricing.openRate !== null) {
    return {
      flatRate: pricing.openRate,
      pricingModel: 'per_ad',
      frequency: 'One time'
    };
  }

  // If only one tier, return as object (backward compatible)
  if (tiers.length === 1) {
    return tiers[0].pricing;
  }

  // Return as array for multiple tiers
  return tiers.length > 0 ? tiers : null;
}

/**
 * Migrate advertising opportunities
 */
function migrateAdvertisingOpportunities(opportunities, isPrint = false) {
  if (!opportunities || !Array.isArray(opportunities)) return opportunities;

  return opportunities.map(opp => {
    const updated = { ...opp };

    // Handle pricing as direct number (old events format)
    if (typeof opp.pricing === 'number') {
      updated.pricing = {
        flatRate: opp.pricing,
        pricingModel: 'flat'
      };
    }
    // Handle single pricing object
    else if (opp.pricing && !Array.isArray(opp.pricing)) {
      // Try print-specific migration first if this is a print ad
      if (isPrint) {
        const printMigrated = migratePrintPricing(opp.pricing);
        if (printMigrated) {
          updated.pricing = printMigrated;
        } else {
          // Fall back to standard migration
          const migratedPricing = migratePricingObject(opp.pricing);
          if (migratedPricing) {
            updated.pricing = migratedPricing;
          }
        }
      } else {
        // Standard migration for non-print
        const migratedPricing = migratePricingObject(opp.pricing);
        if (migratedPricing) {
          updated.pricing = migratedPricing;
        }
      }
    }
    
    // Handle pricing array (tiered pricing)
    else if (Array.isArray(opp.pricing)) {
      updated.pricing = migratePricingArray(opp.pricing);
    }

    // Migrate hubPricing if it exists
    if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
      updated.hubPricing = opp.hubPricing.map(hub => {
        if (hub.pricing) {
          // Try print-specific migration first if this is a print ad
          let migratedHubPricing;
          if (isPrint) {
            migratedHubPricing = migratePrintPricing(hub.pricing);
            // If print migration didn't work, try standard
            if (!migratedHubPricing) {
              migratedHubPricing = migratePricingObject(hub.pricing);
            }
          } else {
            migratedHubPricing = migratePricingObject(hub.pricing);
          }
          
          return {
            ...hub,
            pricing: migratedHubPricing || hub.pricing
          };
        }
        return hub;
      });
    }

    return updated;
  });
}

/**
 * Migrate a single publication
 */
function migratePublication(publication) {
  const updated = { ...publication };

  if (!publication.distributionChannels) return updated;

  const channels = publication.distributionChannels;
  updated.distributionChannels = { ...channels };

  // Migrate Website ads
  if (channels.website?.advertisingOpportunities) {
    updated.distributionChannels.website = {
      ...channels.website,
      advertisingOpportunities: migrateAdvertisingOpportunities(channels.website.advertisingOpportunities)
    };
  }

  // Migrate Newsletter ads
  if (channels.newsletters) {
    const newsletters = Array.isArray(channels.newsletters) ? channels.newsletters : [channels.newsletters];
    updated.distributionChannels.newsletters = newsletters.map(newsletter => {
      if (newsletter.advertisingOpportunities) {
        return {
          ...newsletter,
          advertisingOpportunities: migrateAdvertisingOpportunities(newsletter.advertisingOpportunities)
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
        return {
          ...printItem,
          advertisingOpportunities: migrateAdvertisingOpportunities(printItem.advertisingOpportunities, true)
        };
      }
      return printItem;
    });
  }

  // Migrate Social Media ads
  if (channels.socialMedia) {
    const socialProfiles = Array.isArray(channels.socialMedia) ? channels.socialMedia : [channels.socialMedia];
    updated.distributionChannels.socialMedia = socialProfiles.map(profile => {
      if (profile.advertisingOpportunities) {
        return {
          ...profile,
          advertisingOpportunities: migrateAdvertisingOpportunities(profile.advertisingOpportunities)
        };
      }
      return profile;
    });
  }

  // Migrate Podcast ads
  if (channels.podcasts) {
    const podcasts = Array.isArray(channels.podcasts) ? channels.podcasts : [channels.podcasts];
    updated.distributionChannels.podcasts = podcasts.map(podcast => {
      if (podcast.advertisingOpportunities) {
        // Migrate podcast opportunities and convert cpm to cpd
        const migratedOpps = migrateAdvertisingOpportunities(podcast.advertisingOpportunities);
        const podcastSpecificOpps = migratedOpps.map(opp => {
          // Convert cpm to cpd for podcasts (downloads vs impressions)
          if (opp.pricing && !Array.isArray(opp.pricing)) {
            if (opp.pricing.pricingModel === 'cpm') {
              return {
                ...opp,
                pricing: {
                  ...opp.pricing,
                  pricingModel: 'cpd'
                }
              };
            }
          }
          // Handle perEpisode legacy field
          if (opp.pricing && opp.pricing.perEpisode && !opp.pricing.pricingModel) {
            return {
              ...opp,
              pricing: {
                flatRate: opp.pricing.perEpisode,
                pricingModel: 'per_episode',
                ...(opp.pricing.frequency && { frequency: opp.pricing.frequency })
              }
            };
          }
          return opp;
        });
        return {
          ...podcast,
          advertisingOpportunities: podcastSpecificOpps
        };
      }
      return podcast;
    });
  }

  // Migrate Radio ads
  if (channels.radioStations) {
    const radioStations = Array.isArray(channels.radioStations) ? channels.radioStations : [channels.radioStations];
    updated.distributionChannels.radioStations = radioStations.map(station => {
      if (station.advertisingOpportunities) {
        return {
          ...station,
          advertisingOpportunities: migrateAdvertisingOpportunities(station.advertisingOpportunities)
        };
      }
      return station;
    });
  }

  // Migrate Streaming ads
  if (channels.streamingVideo) {
    const streamingChannels = Array.isArray(channels.streamingVideo) ? channels.streamingVideo : [channels.streamingVideo];
    updated.distributionChannels.streamingVideo = streamingChannels.map(channel => {
      if (channel.advertisingOpportunities) {
        // Migrate streaming opportunities and convert cpm->cpv, flat->per_video
        const migratedOpps = migrateAdvertisingOpportunities(channel.advertisingOpportunities);
        const streamingSpecificOpps = migratedOpps.map(opp => {
          if (opp.pricing && !Array.isArray(opp.pricing)) {
            // Convert cpm to cpv for streaming (views vs impressions)
            if (opp.pricing.pricingModel === 'cpm') {
              return {
                ...opp,
                pricing: {
                  ...opp.pricing,
                  pricingModel: 'cpv'
                }
              };
            }
            // Convert flat to per_video for streaming (was ambiguous before)
            if (opp.pricing.pricingModel === 'flat') {
              return {
                ...opp,
                pricing: {
                  ...opp.pricing,
                  pricingModel: 'per_video'
                }
              };
            }
          }
          return opp;
        });
        return {
          ...channel,
          advertisingOpportunities: streamingSpecificOpps
        };
      }
      return channel;
    });
  }

  // Migrate Television ads
  if (channels.television) {
    const tvStations = Array.isArray(channels.television) ? channels.television : [channels.television];
    updated.distributionChannels.television = tvStations.map(station => {
      if (station.advertisingOpportunities) {
        return {
          ...station,
          advertisingOpportunities: migrateAdvertisingOpportunities(station.advertisingOpportunities)
        };
      }
      return station;
    });
  }

  // Migrate Events (sponsorships)
  if (channels.events) {
    const events = Array.isArray(channels.events) ? channels.events : [channels.events];
    updated.distributionChannels.events = events.map(event => {
      if (event.advertisingOpportunities) {
        return {
          ...event,
          advertisingOpportunities: migrateAdvertisingOpportunities(event.advertisingOpportunities)
        };
      }
      return event;
    });
  }

  return updated;
}

/**
 * Main migration function
 */
async function migratePricingSchema(dryRun = true) {
  console.log('🚀 Starting pricing schema migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (will update database)'}`);
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
    const errors = [];

    // Create backup
    if (!dryRun) {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFile = path.join(backupDir, `pricing-migration-backup-${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(publications, null, 2));
      console.log(`📦 Backup created: ${backupFile}`);
      console.log('');
    }

    // Process each publication
    for (const publication of publications) {
      try {
        console.log(`Processing: ${publication.name || publication._id}`);
        
        const originalJSON = JSON.stringify(publication);
        const migratedPublication = migratePublication(publication);
        const migratedJSON = JSON.stringify(migratedPublication);

        // Check if anything changed
        if (originalJSON === migratedJSON) {
          console.log('  ⊘ No changes needed (already using clean schema)');
          skippedCount++;
        } else {
          console.log('  ✓ Pricing data migrated');
          migratedCount++;

          // Save changes if not dry run
          if (!dryRun) {
            await collection.updateOne(
              { _id: publication._id },
              { $set: migratedPublication }
            );
            console.log('  💾 Saved to database');
          }
        }
        console.log('');
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        errors.push({ 
          publicationId: publication._id, 
          error: error.message 
        });
        console.log('');
      }
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Total publications:     ${publications.length}`);
    console.log(`Migrated:              ${migratedCount}`);
    console.log(`Skipped (no changes):  ${skippedCount}`);
    console.log(`Errors:                ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.publicationId}: ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were saved');
      console.log('Run with --live flag to apply changes:');
      console.log('  node scripts/migrate-pricing.js --live');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run the migration
const dryRun = !process.argv.includes('--live');

migratePricingSchema(dryRun)
  .then(() => {
    console.log('\n✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });

