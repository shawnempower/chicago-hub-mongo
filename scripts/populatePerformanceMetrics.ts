/**
 * Migration Script: Populate performanceMetrics from existing data
 * 
 * This script automatically calculates and populates the performanceMetrics
 * field for all advertising opportunities based on existing channel-level
 * and inventory-level data.
 * 
 * Run with: npm run migrate:performance-metrics
 * Dry run: npm run migrate:performance-metrics -- --dry-run
 */

import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';

// Load environment variables
dotenv.config();

// ===== CONSTANTS =====

const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  'daily': 30,
  'daily-business': 22, // For print (weekdays only)
  'weekly': 4.33,
  'bi-weekly': 2.17,
  'monthly': 1,
  'quarterly': 0.33,
  'seasonally': 1, // Assume once per month on average
  'irregular': 2,
  'on-demand': 1 // Conservative estimate
};

// ===== HELPER FUNCTIONS =====

/**
 * Calculate occurrences per month from frequency
 */
function calculateOccurrences(frequency?: string): number {
  return FREQUENCY_TO_MONTHLY[frequency || ''] || 1;
}

/**
 * Check if pricing model is occurrence-based
 */
function isOccurrenceBased(pricingModel?: string): boolean {
  return ['per_send', 'per_spot', 'per_post', 'per_ad', 'per_episode', 'per_story'].includes(pricingModel || '');
}

/**
 * Check if pricing model is impression-based
 */
function isImpressionBased(pricingModel?: string): boolean {
  return ['cpm', 'cpd', 'cpv'].includes(pricingModel || '');
}

/**
 * Get pricing model from ad
 */
function getPricingModel(ad: any): string | undefined {
  if (!ad.pricing) return undefined;

  // Handle array of pricing tiers
  if (Array.isArray(ad.pricing)) {
    return ad.pricing[0]?.pricing?.pricingModel || ad.pricing[0]?.pricingModel;
  }

  // Handle single pricing object
  return ad.pricing.pricingModel;
}

// ===== CHANNEL-SPECIFIC POPULATION FUNCTIONS =====

/**
 * Populate performanceMetrics for newsletter ads
 */
function populateNewsletterMetrics(newsletter: any): void {
  const occurrences = calculateOccurrences(newsletter.frequency);
  const subscribers = newsletter.subscribers || 0;

  newsletter.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return; // Skip if already populated

    const pricingModel = getPricingModel(ad);

    ad.performanceMetrics = {
      occurrencesPerMonth: occurrences,
      impressionsPerMonth: subscribers * occurrences,
      audienceSize: subscribers,
      guaranteed: !!subscribers // Guaranteed if we have subscriber count
    };

    console.log(`  ✓ Newsletter ad "${ad.name}": ${subscribers} subscribers × ${occurrences}/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
  });
}

/**
 * Populate performanceMetrics for website ads
 */
function populateWebsiteMetrics(website: any): void {
  const monthlyPageViews = website.metrics?.monthlyPageViews || 0;
  const monthlyVisitors = website.metrics?.monthlyVisitors || 0;

  website.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    const pricingModel = getPricingModel(ad);
    const legacyImpressions = ad.monthlyImpressions || 0;

    // Use legacy monthlyImpressions if available, otherwise website-level metrics
    const impressions = legacyImpressions || monthlyPageViews;

    ad.performanceMetrics = {
      impressionsPerMonth: impressions,
      audienceSize: monthlyVisitors,
      guaranteed: !!legacyImpressions // More confident if ad-specific data exists
    };

    console.log(`  ✓ Website ad "${ad.name}": ${impressions.toLocaleString()} impressions/mo`);
  });
}

/**
 * Populate performanceMetrics for print ads
 */
function populatePrintMetrics(print: any): void {
  const circulation = print.circulation || 0;
  const frequency = print.frequency || 'monthly';
  const occurrences = calculateOccurrences(frequency);

  print.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    const pricingModel = getPricingModel(ad);

    ad.performanceMetrics = {
      occurrencesPerMonth: occurrences,
      impressionsPerMonth: circulation * occurrences,
      audienceSize: circulation,
      guaranteed: !!circulation
    };

    console.log(`  ✓ Print ad "${ad.name}": ${circulation} circ × ${occurrences}/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
  });
}

/**
 * Populate performanceMetrics for podcast ads
 */
function populatePodcastMetrics(podcast: any): void {
  const averageDownloads = podcast.averageDownloads || 0;
  const averageListeners = podcast.averageListeners || averageDownloads;
  const frequency = podcast.frequency || 'weekly';
  const occurrences = calculateOccurrences(frequency);

  podcast.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    const pricingModel = getPricingModel(ad);

    ad.performanceMetrics = {
      occurrencesPerMonth: occurrences,
      impressionsPerMonth: averageDownloads * occurrences,
      audienceSize: averageListeners,
      guaranteed: false // Podcast metrics are typically estimates
    };

    console.log(`  ✓ Podcast ad "${ad.name}": ${averageDownloads} downloads × ${occurrences}/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
  });
}

/**
 * Populate performanceMetrics for radio ads
 * Supports both legacy station-level ads and new show-based structure
 */
function populateRadioMetrics(radio: any): void {
  const listeners = radio.listeners || 0;

  // NEW: Handle show-based structure
  if (radio.shows && radio.shows.length > 0) {
    radio.shows.forEach((show: any) => {
      const showListeners = show.averageListeners || listeners;
      
      // Calculate occurrences per month based on show frequency
      const daysPerWeek = show.daysPerWeek || inferDaysPerWeek(show.frequency);
      const weeksPerMonth = 4.33;
      const showsPerMonth = daysPerWeek * weeksPerMonth;
      
      show.advertisingOpportunities?.forEach((ad: any) => {
        if (ad.performanceMetrics) return;
        
        const spotsPerShow = ad.spotsPerShow || 1;
        const occurrencesPerMonth = showsPerMonth * spotsPerShow;
        
        ad.performanceMetrics = {
          occurrencesPerMonth: Math.round(occurrencesPerMonth * 100) / 100,
          impressionsPerMonth: Math.round(showListeners * occurrencesPerMonth),
          audienceSize: showListeners,
          guaranteed: false
        };
        
        console.log(`  ✓ Radio show "${show.name}" - ad "${ad.name}": ${showListeners} listeners × ${occurrencesPerMonth.toFixed(2)} occurrences/mo = ${ad.performanceMetrics.impressionsPerMonth.toLocaleString()} impressions/mo`);
      });
    });
  }

  // LEGACY: Handle station-level ads (backward compatibility)
  if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
    radio.advertisingOpportunities.forEach((ad: any) => {
      if (ad.performanceMetrics) return;

      // Radio ads are typically sold in packages (10x, 20x, etc.)
      // We'll estimate 20 spots per month as default (roughly 5 per week)
      const defaultSpots = 20;

      ad.performanceMetrics = {
        occurrencesPerMonth: defaultSpots,
        impressionsPerMonth: listeners * defaultSpots,
        audienceSize: listeners,
        guaranteed: false // Listener counts are estimates
      };

      console.log(`  ✓ Radio ad "${ad.name}": ${listeners} listeners × ~${defaultSpots} spots/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
    });
  }
}

/**
 * Helper: Infer days per week from frequency string
 */
function inferDaysPerWeek(frequency: string): number {
  const frequencyMap: Record<string, number> = {
    'daily': 7,
    'weekdays': 5,
    'weekdays-plus-saturday': 6,
    'weekdays-plus-sunday': 6,
    'weekend-only': 2,
    'saturdays': 1,
    'sundays': 1,
    'weekly': 1,
    'bi-weekly': 0.5
  };
  
  return frequencyMap[frequency] || 5; // Default to weekdays
}

/**
 * Populate performanceMetrics for social media ads
 */
function populateSocialMetrics(social: any): void {
  const followers = social.followers || 0;
  const averageImpressions = social.metrics?.averageImpressions || followers * 0.3; // 30% reach estimate

  social.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    const pricingModel = getPricingModel(ad);

    // For occurrence-based (per_post, per_story), estimate 4 posts per month
    const defaultPosts = 4;

    if (isOccurrenceBased(pricingModel)) {
      ad.performanceMetrics = {
        occurrencesPerMonth: defaultPosts,
        impressionsPerMonth: averageImpressions * defaultPosts,
        audienceSize: followers,
        guaranteed: false
      };
    } else {
      ad.performanceMetrics = {
        impressionsPerMonth: averageImpressions * defaultPosts,
        audienceSize: followers,
        guaranteed: false
      };
    }

    console.log(`  ✓ Social ad "${ad.name}": ${averageImpressions.toLocaleString()} impressions × ${defaultPosts} posts/mo`);
  });
}

/**
 * Populate performanceMetrics for streaming ads
 */
function populateStreamingMetrics(streaming: any): void {
  const averageViews = streaming.averageViews || 0;
  const subscribers = streaming.subscribers || 0;

  // Estimate 4 videos per month
  const defaultVideos = 4;

  streaming.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    ad.performanceMetrics = {
      occurrencesPerMonth: defaultVideos,
      impressionsPerMonth: averageViews * defaultVideos,
      audienceSize: subscribers,
      guaranteed: false
    };

    console.log(`  ✓ Streaming ad "${ad.name}": ${averageViews} views × ${defaultVideos} videos/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
  });
}

/**
 * Populate performanceMetrics for event sponsorships
 */
function populateEventMetrics(event: any): void {
  const attendance = event.averageAttendance || 0;
  const frequency = event.frequency || 'monthly';
  const occurrences = calculateOccurrences(frequency);

  event.advertisingOpportunities?.forEach((ad: any) => {
    if (ad.performanceMetrics) return;

    ad.performanceMetrics = {
      occurrencesPerMonth: occurrences,
      impressionsPerMonth: attendance * occurrences,
      audienceSize: attendance,
      guaranteed: !!attendance
    };

    console.log(`  ✓ Event sponsorship "${ad.level}": ${attendance} attendance × ${occurrences}/mo = ${ad.performanceMetrics.impressionsPerMonth} impressions/mo`);
  });
}

// ===== MAIN MIGRATION FUNCTION =====

async function migratePerformanceMetrics(dryRun: boolean = false) {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('🚀 Starting performanceMetrics population...\n');
    }

    await client.connect();
    const db: Db = client.db('chicago-hub');
    const collection = db.collection('publications');

    // Get all publications
    const publications = await collection.find({}).toArray();
    console.log(`📊 Found ${publications.length} publications to process\n`);

    let updatedCount = 0;

    for (const publication of publications) {
      const pubName = publication.basicInfo?.publicationName || publication.publicationId;
      console.log(`\n📰 Processing: ${pubName}`);

      let modified = false;

      // Process each distribution channel
      if (publication.distributionChannels) {
        const channels = publication.distributionChannels;

        // Newsletters
        if (channels.newsletters?.length > 0) {
          console.log(`  📧 Processing ${channels.newsletters.length} newsletter(s)...`);
          channels.newsletters.forEach((newsletter: any) => {
            if (newsletter.advertisingOpportunities?.length > 0) {
              populateNewsletterMetrics(newsletter);
              modified = true;
            }
          });
        }

        // Website (singular object, not array)
        if (channels.website?.advertisingOpportunities?.length > 0) {
          console.log(`  🌐 Processing website with ${channels.website.advertisingOpportunities.length} ads...`);
          populateWebsiteMetrics(channels.website);
          modified = true;
        }

        // Print
        if (channels.print?.length > 0) {
          console.log(`  📰 Processing ${channels.print.length} print publication(s)...`);
          channels.print.forEach((print: any) => {
            if (print.advertisingOpportunities?.length > 0) {
              populatePrintMetrics(print);
              modified = true;
            }
          });
        }

        // Podcasts
        if (channels.podcasts?.length > 0) {
          console.log(`  🎙️ Processing ${channels.podcasts.length} podcast(s)...`);
          channels.podcasts.forEach((podcast: any) => {
            if (podcast.advertisingOpportunities?.length > 0) {
              populatePodcastMetrics(podcast);
              modified = true;
            }
          });
        }

        // Radio
        if (channels.radio?.length > 0) {
          console.log(`  📻 Processing ${channels.radio.length} radio station(s)...`);
          channels.radio.forEach((radio: any) => {
            if (radio.advertisingOpportunities?.length > 0) {
              populateRadioMetrics(radio);
              modified = true;
            }
          });
        }

        // Social Media
        if (channels.socialMedia?.length > 0) {
          console.log(`  📱 Processing ${channels.socialMedia.length} social media account(s)...`);
          channels.socialMedia.forEach((social: any) => {
            if (social.advertisingOpportunities?.length > 0) {
              populateSocialMetrics(social);
              modified = true;
            }
          });
        }

        // Streaming
        if (channels.streaming?.length > 0) {
          console.log(`  📹 Processing ${channels.streaming.length} streaming channel(s)...`);
          channels.streaming.forEach((streaming: any) => {
            if (streaming.advertisingOpportunities?.length > 0) {
              populateStreamingMetrics(streaming);
              modified = true;
            }
          });
        }

        // Events
        if (channels.events?.length > 0) {
          console.log(`  🎪 Processing ${channels.events.length} event(s)...`);
          channels.events.forEach((event: any) => {
            if (event.advertisingOpportunities?.length > 0) {
              populateEventMetrics(event);
              modified = true;
            }
          });
        }
      }

      // Update publication if modified
      if (modified) {
        if (!dryRun) {
          await collection.updateOne(
            { _id: publication._id },
            { 
              $set: { 
                distributionChannels: publication.distributionChannels,
                'metadata.lastUpdated': new Date()
              } 
            }
          );
        }
        updatedCount++;
        console.log(`  ${dryRun ? '🔍 Would update' : '✅ Updated'} ${pubName}`);
      } else {
        console.log(`  ⏭️  No advertising opportunities found, skipping`);
      }
    }

    if (dryRun) {
      console.log(`\n\n🔍 DRY RUN COMPLETE - No changes were made`);
      console.log(`📊 Would update ${updatedCount} of ${publications.length} publications`);
    } else {
      console.log(`\n\n✅ Migration complete!`);
      console.log(`📊 Updated ${updatedCount} of ${publications.length} publications`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run migration (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  // Check for --dry-run flag
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  
  migratePerformanceMetrics(isDryRun).then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

export { migratePerformanceMetrics };

