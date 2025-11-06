#!/usr/bin/env tsx

/**
 * Migration Script: Migrate to Hubs Collection
 * 
 * This script:
 * 1. Creates hub documents for all existing hubs referenced in the codebase
 * 2. Scans publications for hubPricing references and populates hubIds arrays
 * 3. Ensures data consistency between hub collection and publication references
 */

import * as dotenv from 'dotenv';
import { connectToDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { HubsService } from '../src/integrations/mongodb/hubService';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

// Load environment variables
dotenv.config();

// Define the hubs to create
const HUBS_TO_CREATE = [
  {
    hubId: 'chicago-hub',
    basicInfo: {
      name: 'Chicago Hub',
      tagline: 'Reaching Chicago\'s diverse neighborhoods and communities',
      description: 'The Chicago Hub connects advertisers with trusted local media outlets serving every corner of the Windy City.',
    },
    geography: {
      region: 'Midwest',
      primaryCity: 'Chicago',
      state: 'Illinois',
      dmas: ['chicago-il'],
    },
    status: 'active' as const,
  },
  {
    hubId: 'portland-hub',
    basicInfo: {
      name: 'Portland Hub',
      tagline: 'Connecting with Portland\'s unique communities',
      description: 'The Portland Hub serves the greater Portland metropolitan area with local media partnerships.',
    },
    geography: {
      region: 'Pacific Northwest',
      primaryCity: 'Portland',
      state: 'Oregon',
      dmas: ['portland-or'],
    },
    status: 'pending' as const,
  },
  {
    hubId: 'seattle-hub',
    basicInfo: {
      name: 'Seattle Hub',
      tagline: 'Reaching Seattle and the Puget Sound',
      description: 'The Seattle Hub connects advertisers with media outlets across the greater Seattle area.',
    },
    geography: {
      region: 'Pacific Northwest',
      primaryCity: 'Seattle',
      state: 'Washington',
      dmas: ['seattle-tacoma'],
    },
    status: 'pending' as const,
  },
  {
    hubId: 'austin-hub',
    basicInfo: {
      name: 'Austin Hub',
      tagline: 'Keeping Austin\'s media weird and wonderful',
      description: 'The Austin Hub serves the vibrant Austin community with local and independent media partnerships.',
    },
    geography: {
      region: 'South',
      primaryCity: 'Austin',
      state: 'Texas',
      dmas: ['austin-tx'],
    },
    status: 'pending' as const,
  },
  {
    hubId: 'denver-hub',
    basicInfo: {
      name: 'Denver Hub',
      tagline: 'Reaching the Mile High City and beyond',
      description: 'The Denver Hub connects advertisers with media outlets across the Denver metropolitan area.',
    },
    geography: {
      region: 'Mountain West',
      primaryCity: 'Denver',
      state: 'Colorado',
      dmas: ['denver-co'],
    },
    status: 'pending' as const,
  },
];

async function migrateToHubsCollection(dryRun: boolean = false) {
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  console.log('🚀 Starting Hubs Collection Migration...\n');

  try {
    const db = await connectToDatabase();
    const stats = {
      hubsCreated: 0,
      hubsSkipped: 0,
      publicationsUpdated: 0,
      publicationsWithHubPricing: 0,
    };

    // Step 1: Create hub documents
    console.log('📝 Step 1: Creating hub documents...\n');
    
    for (const hubData of HUBS_TO_CREATE) {
      try {
        // Check if hub already exists
        const existing = await HubsService.getHubBySlug(hubData.hubId);
        
        if (existing) {
          console.log(`  ⏭️  Hub '${hubData.hubId}' already exists, skipping...`);
          stats.hubsSkipped++;
        } else {
          if (dryRun) {
            console.log(`  🔍 [DRY RUN] Would create hub: ${hubData.hubId} (${hubData.basicInfo.name})`);
          } else {
            const now = new Date();
            await HubsService.createHub({
              ...hubData,
              createdAt: now,
              updatedAt: now,
            });
            console.log(`  ✅ Created hub: ${hubData.hubId} (${hubData.basicInfo.name})`);
          }
          stats.hubsCreated++;
        }
      } catch (error) {
        console.error(`  ❌ Error creating hub '${hubData.hubId}':`, error);
      }
    }

    console.log(`\n✨ Created ${stats.hubsCreated} hubs, skipped ${stats.hubsSkipped} existing hubs\n`);

    // Step 2: Scan publications for hubPricing references
    console.log('📊 Step 2: Scanning publications for hub references...\n');

    const publications = await db.collection(COLLECTIONS.PUBLICATIONS).find({}).toArray();
    console.log(`Found ${publications.length} total publications\n`);

    for (const publication of publications) {
      const hubIdsFound = new Set<string>();
      let hasHubPricing = false;

      // Check newsletters for hubPricing
      if (publication.distributionChannels?.newsletters) {
        for (const newsletter of publication.distributionChannels.newsletters) {
          if (newsletter.advertisingOpportunities) {
            for (const opp of newsletter.advertisingOpportunities) {
              if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
                hasHubPricing = true;
                for (const hp of opp.hubPricing) {
                  if (hp.hubId) {
                    hubIdsFound.add(hp.hubId);
                  }
                }
              }
            }
          }
        }
      }

      // Check streaming video for hubPricing
      if (publication.distributionChannels?.streamingVideo) {
        for (const stream of publication.distributionChannels.streamingVideo) {
          if (stream.advertisingOpportunities) {
            for (const opp of stream.advertisingOpportunities) {
              if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
                hasHubPricing = true;
                for (const hp of opp.hubPricing) {
                  if (hp.hubId) {
                    hubIdsFound.add(hp.hubId);
                  }
                }
              }
            }
          }
        }
      }

      // Check events for hubPricing
      if (publication.distributionChannels?.events) {
        for (const event of publication.distributionChannels.events) {
          if (event.advertisingOpportunities) {
            for (const opp of event.advertisingOpportunities) {
              if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
                hasHubPricing = true;
                for (const hp of opp.hubPricing) {
                  if (hp.hubId) {
                    hubIdsFound.add(hp.hubId);
                  }
                }
              }
            }
          }
        }
      }

      // Update publication with hubIds if found
      if (hubIdsFound.size > 0) {
        const hubIdsArray = Array.from(hubIdsFound);
        
        if (dryRun) {
          console.log(`  🔍 [DRY RUN] ${publication.basicInfo.publicationName}: Would add hubs [${hubIdsArray.join(', ')}]`);
        } else {
          await db.collection(COLLECTIONS.PUBLICATIONS).updateOne(
            { _id: publication._id },
            {
              $set: {
                hubIds: hubIdsArray,
                'metadata.lastUpdated': new Date(),
              },
            }
          );
          console.log(`  ✅ ${publication.basicInfo.publicationName}: Added hubs [${hubIdsArray.join(', ')}]`);
        }
        stats.publicationsUpdated++;
      }

      if (hasHubPricing) {
        stats.publicationsWithHubPricing++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Hubs created: ${stats.hubsCreated}`);
    console.log(`⏭️  Hubs skipped (already exist): ${stats.hubsSkipped}`);
    console.log(`📊 Publications scanned: ${publications.length}`);
    console.log(`📝 Publications with hub pricing: ${stats.publicationsWithHubPricing}`);
    console.log(`🔄 Publications updated with hubIds: ${stats.publicationsUpdated}`);
    console.log('='.repeat(60));

    // Step 3: Verify the migration
    console.log('\n🔍 Step 3: Verifying migration...\n');

    const allHubs = await HubsService.getAllHubs({ includeInactive: true });
    console.log(`Total hubs in database: ${allHubs.length}`);
    
    for (const hub of allHubs) {
      const pubs = await HubsService.getHubPublications(hub.hubId);
      console.log(`  - ${hub.basicInfo.name} (${hub.hubId}): ${pubs.length} publications, status: ${hub.status}`);
    }

    const unassigned = await HubsService.getUnassignedPublications();
    console.log(`\nPublications not assigned to any hub: ${unassigned.length}`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN completed - No changes were made\n');
      console.log('To apply these changes, run: npm run migrate:hubs\n');
    } else {
      console.log('\n✨ Migration completed successfully!\n');
    }

    await closeConnection();
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await closeConnection();
    process.exit(1);
  }
}

// Check for --dry-run flag
const isDryRun = process.argv.includes('--dry-run');

// Run the migration
migrateToHubsCollection(isDryRun);

