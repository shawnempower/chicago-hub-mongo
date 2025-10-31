/**
 * Migration Script: Transform Radio Station Ads to Show-Based Structure
 * 
 * This script:
 * 1. Groups existing station-level ads by timeSlot into "shows"
 * 2. Infers show frequency from timeSlot patterns (e.g., "M-F" = weekdays)
 * 3. Calculates performanceMetrics for each ad
 * 4. Preserves existing station-level ads for backward compatibility
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

interface RadioAd {
  name?: string;
  adFormat?: string;
  timeSlot?: string;
  pricing?: any;
  specifications?: any;
  available?: boolean;
  hubPricing?: any[];
  performanceMetrics?: {
    occurrencesPerMonth?: number;
    impressionsPerMonth?: number;
    audienceSize?: number;
    guaranteed?: boolean;
  };
}

interface Show {
  showId: string;
  name: string;
  frequency: string;
  daysPerWeek: number;
  timeSlot: string;
  averageListeners?: number;
  advertisingOpportunities: RadioAd[];
}

/**
 * Infer show frequency from timeSlot string
 * Examples: "M-F 6AM-9AM" = weekdays, "M-Sat 10AM-2PM" = weekdays-plus-saturday
 */
function inferFrequencyFromTimeSlot(timeSlot: string): { frequency: string; daysPerWeek: number } {
  const slot = timeSlot.toUpperCase();
  
  // M-F patterns
  if (slot.match(/M-F|MON-FRI|WEEKDAY/i)) {
    return { frequency: 'weekdays', daysPerWeek: 5 };
  }
  
  // M-Sat or M-F + Sat
  if (slot.match(/M-SAT|MON-SAT/i) || slot.match(/M-F.*SAT/i)) {
    return { frequency: 'weekdays-plus-saturday', daysPerWeek: 6 };
  }
  
  // M-Sun or Daily
  if (slot.match(/M-SUN|MON-SUN|DAILY|7 DAYS/i)) {
    return { frequency: 'daily', daysPerWeek: 7 };
  }
  
  // Weekend only
  if (slot.match(/SAT.*SUN|WEEKEND/i)) {
    return { frequency: 'weekend-only', daysPerWeek: 2 };
  }
  
  // Saturday only
  if (slot.match(/^SAT/i) && !slot.match(/SUN/i)) {
    return { frequency: 'saturdays', daysPerWeek: 1 };
  }
  
  // Sunday only
  if (slot.match(/^SUN/i) && !slot.match(/SAT/i)) {
    return { frequency: 'sundays', daysPerWeek: 1 };
  }
  
  // Default: assume weekdays if unclear
  console.log(`⚠️  Could not infer frequency from timeSlot "${timeSlot}", defaulting to weekdays`);
  return { frequency: 'weekdays', daysPerWeek: 5 };
}

/**
 * Extract a clean show name from timeSlot
 * Examples: "M-F 6AM-9AM" → "Morning Drive (6AM-9AM)"
 */
function generateShowName(timeSlot: string): string {
  const slot = timeSlot.toUpperCase();
  
  // Extract time range
  const timeMatch = slot.match(/(\d+[AP]M)\s*-\s*(\d+[AP]M)/);
  const timeRange = timeMatch ? `(${timeMatch[1]}-${timeMatch[2]})` : '';
  
  // Determine show type based on time
  if (slot.match(/6AM|7AM|8AM|9AM/) && !slot.match(/PM/)) {
    return `Morning Drive ${timeRange}`.trim();
  } else if (slot.match(/4PM|5PM|6PM|7PM/)) {
    return `Evening Drive ${timeRange}`.trim();
  } else if (slot.match(/10AM|11AM|12PM|1PM|2PM|3PM/)) {
    return `Midday ${timeRange}`.trim();
  } else if (slot.match(/SAT|SUN|WEEKEND/i)) {
    return `Weekend Programming ${timeRange}`.trim();
  } else {
    return `${timeSlot}`.trim();
  }
}

/**
 * Calculate monthly occurrences and impressions
 */
function calculatePerformanceMetrics(
  daysPerWeek: number,
  spotsPerShow: number,
  averageListeners?: number
): { occurrencesPerMonth: number; impressionsPerMonth: number; audienceSize: number } {
  // Average weeks per month
  const weeksPerMonth = 4.33;
  const showsPerMonth = daysPerWeek * weeksPerMonth;
  const occurrencesPerMonth = showsPerMonth * spotsPerShow;
  const audienceSize = averageListeners || 0;
  const impressionsPerMonth = occurrencesPerMonth * audienceSize;
  
  return {
    occurrencesPerMonth: Math.round(occurrencesPerMonth * 100) / 100,
    impressionsPerMonth: Math.round(impressionsPerMonth),
    audienceSize
  };
}

/**
 * Transform station-level ads to show-based structure
 */
function transformStationToShows(station: any): Show[] {
  const shows: Show[] = [];
  const adsByTimeSlot = new Map<string, RadioAd[]>();
  
  // Group ads by timeSlot
  if (station.advertisingOpportunities) {
    for (const ad of station.advertisingOpportunities) {
      const timeSlot = ad.timeSlot || 'General';
      if (!adsByTimeSlot.has(timeSlot)) {
        adsByTimeSlot.set(timeSlot, []);
      }
      adsByTimeSlot.get(timeSlot)!.push(ad);
    }
  }
  
  // Create a show for each timeSlot group
  let showIndex = 1;
  for (const [timeSlot, ads] of adsByTimeSlot.entries()) {
    const { frequency, daysPerWeek } = inferFrequencyFromTimeSlot(timeSlot);
    const showName = generateShowName(timeSlot);
    const showId = `${station.callSign || 'station'}-show-${showIndex}`.toLowerCase().replace(/\s+/g, '-');
    
    // Process each ad in this show
    const processedAds = ads.map(ad => {
      // Determine spotsPerShow (default to 1)
      const spotsPerShow = 1;
      
      // Calculate performance metrics
      const metrics = calculatePerformanceMetrics(
        daysPerWeek,
        spotsPerShow,
        station.listeners
      );
      
      return {
        ...ad,
        spotsPerShow,
        performanceMetrics: {
          occurrencesPerMonth: metrics.occurrencesPerMonth,
          impressionsPerMonth: metrics.impressionsPerMonth,
          audienceSize: metrics.audienceSize,
          guaranteed: false
        }
      };
    });
    
    shows.push({
      showId,
      name: showName,
      frequency,
      daysPerWeek,
      timeSlot,
      averageListeners: station.listeners,
      advertisingOpportunities: processedAds
    });
    
    showIndex++;
  }
  
  return shows;
}

async function migrateRadioStations(dryRun: boolean = true) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    // Find all publications with radio stations
    const publications = await collection
      .find({ 'distributionChannels.radioStations': { $exists: true, $ne: [] } })
      .toArray();
    
    console.log(`\n📊 Found ${publications.length} publications with radio stations\n`);
    
    let stationsProcessed = 0;
    let showsCreated = 0;
    let adsProcessed = 0;
    
    for (const pub of publications) {
      console.log(`\n📻 Processing: ${pub.name}`);
      
      const stations = pub.distributionChannels?.radioStations || [];
      
      for (const station of stations) {
        const callSign = station.callSign || 'Unknown';
        const existingAdCount = station.advertisingOpportunities?.length || 0;
        
        if (existingAdCount === 0) {
          console.log(`  ⚠️  ${callSign}: No ads to migrate, skipping`);
          continue;
        }
        
        // Transform to shows
        const shows = transformStationToShows(station);
        
        console.log(`  ✨ ${callSign}: Created ${shows.length} shows from ${existingAdCount} ads`);
        
        for (const show of shows) {
          console.log(`     📺 ${show.name}`);
          console.log(`        Frequency: ${show.frequency} (${show.daysPerWeek} days/week)`);
          console.log(`        Ads: ${show.advertisingOpportunities.length}`);
          
          for (const ad of show.advertisingOpportunities) {
            console.log(`           • ${ad.name}`);
            console.log(`             Spots/Show: ${ad.spotsPerShow}`);
            console.log(`             Occurrences/Month: ${ad.performanceMetrics?.occurrencesPerMonth}`);
            console.log(`             Impressions/Month: ${ad.performanceMetrics?.impressionsPerMonth?.toLocaleString()}`);
            adsProcessed++;
          }
        }
        
        // Update the station (dry run or real)
        if (!dryRun) {
          station.shows = shows;
          // Remove legacy station-level advertisingOpportunities since they're now in shows
          delete station.advertisingOpportunities;
        }
        
        stationsProcessed++;
        showsCreated += shows.length;
      }
      
      // Save changes (if not dry run)
      if (!dryRun) {
        await collection.updateOne(
          { _id: pub._id },
          { $set: { 'distributionChannels.radioStations': stations } }
        );
        console.log(`  💾 Saved changes for ${pub.name}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Publications processed: ${publications.length}`);
    console.log(`Stations processed: ${stationsProcessed}`);
    console.log(`Shows created: ${showsCreated}`);
    console.log(`Ads processed: ${adsProcessed}`);
    console.log('='.repeat(60));
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were saved to the database');
      console.log('Run with --execute to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Check if running as main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const dryRun = !process.argv.includes('--execute');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode...\n');
  } else {
    console.log('⚡ Running in EXECUTE mode...\n');
  }
  
  migrateRadioStations(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateRadioStations };

