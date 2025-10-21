/**
 * Data Migration Script: Legacy Pricing Schema → Clean Pricing Schema
 * 
 * This script migrates all existing publication pricing data from the old schema
 * (with multiple price fields: perPost, perStory, perSend, cpm, monthly, etc.)
 * to the new clean schema (single flatRate field + pricingModel field).
 * 
 * Usage:
 *   npm run migrate-pricing
 * 
 * Or import and run:
 *   import { migratePricingSchema } from './scripts/migratePricingSchema';
 *   await migratePricingSchema();
 */

import { getPublications, updatePublication } from '@/api/publications';

interface LegacyPricing {
  // Old fields
  perPost?: number;
  perStory?: number;
  perSend?: number;
  perSpot?: number;
  perAd?: number;
  cpm?: number;
  cpc?: number;
  monthly?: number;
  weekly?: number;
  
  // New fields (might already exist)
  flatRate?: number;
  pricingModel?: string;
  
  // Other fields to preserve
  frequency?: string;
  minimumCommitment?: string;
  [key: string]: any;
}

interface CleanPricing {
  flatRate: number;
  pricingModel: string;
  frequency?: string;
  minimumCommitment?: string;
  [key: string]: any;
}

/**
 * Migrate a single pricing object from legacy to clean schema
 */
function migratePricingObject(pricing: LegacyPricing): CleanPricing | null {
  if (!pricing) return null;

  // If already using clean schema (has pricingModel and flatRate), keep it
  if (pricing.pricingModel && pricing.flatRate !== undefined) {
    return pricing as CleanPricing;
  }

  // Map old field names to pricing models
  const fieldToPricingModel: Record<string, string> = {
    perPost: 'per_post',
    perStory: 'per_story',
    perSend: 'per_send',
    perSpot: 'per_spot',
    perAd: 'per_ad',
    cpm: 'cpm',
    cpc: 'cpc',
    monthly: 'monthly',
    weekly: 'per_week'
  };

  // Find the first non-zero price field and use it
  for (const [fieldName, pricingModel] of Object.entries(fieldToPricingModel)) {
    const value = pricing[fieldName];
    if (value !== undefined && value !== null && value !== 0) {
      // Create clean pricing object
      const cleanPricing: CleanPricing = {
        flatRate: value,
        pricingModel: pricingModel
      };

      // Preserve other fields (frequency, minimumCommitment, etc.)
      if (pricing.frequency) cleanPricing.frequency = pricing.frequency;
      if (pricing.minimumCommitment) cleanPricing.minimumCommitment = pricing.minimumCommitment;

      return cleanPricing;
    }
  }

  // If we have flatRate but no pricingModel, infer from context or default to 'flat'
  if (pricing.flatRate !== undefined && pricing.flatRate !== 0) {
    const cleanPricing: CleanPricing = {
      flatRate: pricing.flatRate,
      pricingModel: 'flat' // Default fallback
    };
    
    if (pricing.frequency) cleanPricing.frequency = pricing.frequency;
    if (pricing.minimumCommitment) cleanPricing.minimumCommitment = pricing.minimumCommitment;
    
    return cleanPricing;
  }

  // No pricing data found
  return null;
}

/**
 * Migrate pricing array (for tiered pricing like newsletters and print)
 */
function migratePricingArray(pricingArray: any[]): any[] {
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
 * Migrate advertising opportunities for any channel type
 */
function migrateAdvertisingOpportunities(opportunities: any[]): any[] {
  if (!opportunities || !Array.isArray(opportunities)) return opportunities;

  return opportunities.map(opp => {
    const updated = { ...opp };

    // Handle single pricing object
    if (opp.pricing && !Array.isArray(opp.pricing)) {
      const migratedPricing = migratePricingObject(opp.pricing);
      if (migratedPricing) {
        updated.pricing = migratedPricing;
      }
    }
    
    // Handle pricing array (tiered pricing)
    else if (Array.isArray(opp.pricing)) {
      updated.pricing = migratePricingArray(opp.pricing);
    }

    // Migrate hubPricing if it exists
    if (opp.hubPricing && Array.isArray(opp.hubPricing)) {
      updated.hubPricing = opp.hubPricing.map((hub: any) => {
        if (hub.pricing) {
          const migratedHubPricing = migratePricingObject(hub.pricing);
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
function migratePublication(publication: any): any {
  const updated = { ...publication };

  if (!publication.distributionChannels) return updated;

  const channels = publication.distributionChannels;

  // Migrate Website ads
  if (channels.website?.advertisingOpportunities) {
    updated.distributionChannels.website.advertisingOpportunities = 
      migrateAdvertisingOpportunities(channels.website.advertisingOpportunities);
  }

  // Migrate Newsletter ads (handle both array and single object)
  if (channels.newsletters) {
    const newsletters = Array.isArray(channels.newsletters) 
      ? channels.newsletters 
      : [channels.newsletters];
    
    updated.distributionChannels.newsletters = newsletters.map((newsletter: any) => {
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
    
    updated.distributionChannels.print = printItems.map((printItem: any) => {
      if (printItem.advertisingOpportunities) {
        return {
          ...printItem,
          advertisingOpportunities: migrateAdvertisingOpportunities(printItem.advertisingOpportunities)
        };
      }
      return printItem;
    });
  }

  // Migrate Social Media ads
  if (channels.socialMedia) {
    const socialProfiles = Array.isArray(channels.socialMedia) 
      ? channels.socialMedia 
      : [channels.socialMedia];
    
    updated.distributionChannels.socialMedia = socialProfiles.map((profile: any) => {
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
    
    updated.distributionChannels.podcasts = podcasts.map((podcast: any) => {
      if (podcast.advertisingOpportunities) {
        return {
          ...podcast,
          advertisingOpportunities: migrateAdvertisingOpportunities(podcast.advertisingOpportunities)
        };
      }
      return podcast;
    });
  }

  // Migrate Radio ads
  if (channels.radioStations) {
    const radioStations = Array.isArray(channels.radioStations) 
      ? channels.radioStations 
      : [channels.radioStations];
    
    updated.distributionChannels.radioStations = radioStations.map((station: any) => {
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
    const streamingChannels = Array.isArray(channels.streamingVideo) 
      ? channels.streamingVideo 
      : [channels.streamingVideo];
    
    updated.distributionChannels.streamingVideo = streamingChannels.map((channel: any) => {
      if (channel.advertisingOpportunities) {
        return {
          ...channel,
          advertisingOpportunities: migrateAdvertisingOpportunities(channel.advertisingOpportunities)
        };
      }
      return channel;
    });
  }

  // Migrate Television ads
  if (channels.television) {
    const tvStations = Array.isArray(channels.television) 
      ? channels.television 
      : [channels.television];
    
    updated.distributionChannels.television = tvStations.map((station: any) => {
      if (station.advertisingOpportunities) {
        return {
          ...station,
          advertisingOpportunities: migrateAdvertisingOpportunities(station.advertisingOpportunities)
        };
      }
      return station;
    });
  }

  return updated;
}

/**
 * Main migration function
 */
export async function migratePricingSchema(dryRun: boolean = true): Promise<void> {
  console.log('🚀 Starting pricing schema migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (will update database)'}`);
  console.log('');

  try {
    // Fetch all publications
    console.log('📥 Fetching all publications...');
    const publications = await getPublications();
    console.log(`✓ Found ${publications.length} publications`);
    console.log('');

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ publicationId: string; error: string }> = [];

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
            await updatePublication(publication._id, migratedPublication);
            console.log('  💾 Saved to database');
          }
        }
        console.log('');
      } catch (error: any) {
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
      console.log('Run with dryRun=false to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// If running directly as a script
if (require.main === module) {
  const dryRun = process.argv.includes('--live') ? false : true;
  
  migratePricingSchema(dryRun)
    .then(() => {
      console.log('\n✓ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Script failed:', error);
      process.exit(1);
    });
}

