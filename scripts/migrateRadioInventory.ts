/**
 * Radio Inventory Migration Script
 * 
 * Fixes radio ad inventory to match the new standards:
 * 1. Sets adFormat from specifications.duration
 * 2. Adds format.dimensions for creative asset matching
 * 3. Adds specifications.fileFormats
 * 
 * NOTE: Does NOT remove station-level ads (some have different data than show-level)
 * 
 * Usage:
 *   npx tsx scripts/migrateRadioInventory.ts --dry-run                    # Preview on default db
 *   npx tsx scripts/migrateRadioInventory.ts --db staging-chicago-hub     # Apply to staging
 *   npx tsx scripts/migrateRadioInventory.ts --db chicago-hub             # Apply to production
 *   npx tsx scripts/migrateRadioInventory.ts --db staging-chicago-hub --dry-run  # Preview staging
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

const DRY_RUN = process.argv.includes('--dry-run');

// Get database name from --db argument
function getTargetDatabase(): string {
  const dbArgIndex = process.argv.indexOf('--db');
  if (dbArgIndex !== -1 && process.argv[dbArgIndex + 1]) {
    return process.argv[dbArgIndex + 1];
  }
  return 'chicago-hub'; // default to production
}

const TARGET_DB = getTargetDatabase();

// Map duration to adFormat
function durationToAdFormat(duration: number): string {
  if (duration <= 15) return '15_second_spot';
  if (duration <= 20) return '15_second_spot'; // 20s rounds to 15s spot
  if (duration <= 30) return '30_second_spot';
  if (duration <= 60) return '60_second_spot';
  // Long-form (over 60 seconds)
  return 'sponsorship'; // or could be 'live_read' depending on context
}

// Map duration to format.dimensions (for creative matching)
function durationToDimensions(duration: number): string {
  if (duration <= 15) return '15s';
  if (duration <= 20) return '15s';
  if (duration <= 30) return '30s';
  if (duration <= 60) return '60s';
  // Long-form
  return 'long-form';
}

// Determine file formats based on ad type
function getFileFormats(adFormat: string, adName: string): string[] {
  const nameLower = adName.toLowerCase();
  
  // Script-variant spots (explicitly set)
  if (adFormat.endsWith('_script')) {
    return ['TXT'];
  }
  
  // Live reads and text-based formats
  if (adFormat === 'live_read' || 
      nameLower.includes('live read') || 
      nameLower.includes('script')) {
    return ['TXT'];
  }
  
  // Sponsorships can be either
  if (adFormat === 'sponsorship' || 
      nameLower.includes('sponsor') ||
      nameLower.includes('takeover') ||
      nameLower.includes('interview')) {
    return ['MP3', 'WAV', 'TXT'];
  }
  
  // Standard spots - pre-recorded audio
  return ['MP3', 'WAV'];
}

// Update a single ad with new fields
function updateAd(ad: any): string[] {
  const duration = ad.specifications?.duration;
  const changes: string[] = [];
  
  // 1. Add adFormat if missing
  if (!ad.adFormat && duration) {
    const newAdFormat = durationToAdFormat(duration);
    ad.adFormat = newAdFormat;
    changes.push(`adFormat: "${newAdFormat}"`);
  }
  
  // 2. Add format.dimensions if missing
  if (!ad.format && duration) {
    const dimensions = durationToDimensions(duration);
    ad.format = { dimensions };
    changes.push(`format.dimensions: "${dimensions}"`);
  } else if (ad.format && !ad.format.dimensions && duration) {
    const dimensions = durationToDimensions(duration);
    ad.format.dimensions = dimensions;
    changes.push(`format.dimensions: "${dimensions}"`);
  }
  
  // 3. Add specifications.fileFormats if missing
  if (!ad.specifications?.fileFormats || ad.specifications.fileFormats.length === 0) {
    const fileFormats = getFileFormats(ad.adFormat || '', ad.name || '');
    if (!ad.specifications) {
      ad.specifications = {};
    }
    ad.specifications.fileFormats = fileFormats;
    changes.push(`fileFormats: [${fileFormats.join(', ')}]`);
  }
  
  return changes;
}

interface MigrationStats {
  totalPublications: number;
  totalStations: number;
  totalShows: number;
  totalShowAds: number;
  totalStationAds: number;
  showAdsUpdated: number;
  stationAdsUpdated: number;
  adFormatAdded: number;
  formatDimensionsAdded: number;
  fileFormatsAdded: number;
  potentialDuplicates: number;
}

async function migrateRadioInventory() {
  try {
    await client.connect();
    const db = client.db(TARGET_DB);
    const collection = db.collection('publications');
    
    console.log(`\n📻 RADIO INVENTORY MIGRATION`);
    console.log(`   Database: ${TARGET_DB}`);
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE - Changes will be applied'}`);
    console.log('═'.repeat(80));
    
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    const stats: MigrationStats = {
      totalPublications: pubs.length,
      totalStations: 0,
      totalShows: 0,
      totalShowAds: 0,
      totalStationAds: 0,
      showAdsUpdated: 0,
      stationAdsUpdated: 0,
      adFormatAdded: 0,
      formatDimensionsAdded: 0,
      fileFormatsAdded: 0,
      potentialDuplicates: 0,
    };
    
    // Track potential duplicates for reporting
    const potentialDuplicates: Array<{
      publication: string;
      station: string;
      adName: string;
      stationData: { price: number; model: string };
      showData: { show: string; price: number; model: string };
    }> = [];
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const stations = pub.distributionChannels?.radioStations || [];
      let pubModified = false;
      
      console.log(`\n📰 ${pubName}`);
      console.log('─'.repeat(60));
      
      for (let stationIdx = 0; stationIdx < stations.length; stationIdx++) {
        const station = stations[stationIdx];
        stats.totalStations++;
        
        console.log(`\n  📻 ${station.callSign || 'Unknown Station'}`);
        
        // Build a map of show-level ads for duplicate detection
        const showAdsByName: Map<string, any[]> = new Map();
        const shows = station.shows || [];
        
        for (const show of shows) {
          for (const ad of show.advertisingOpportunities || []) {
            const name = ad.name || 'Unnamed';
            if (!showAdsByName.has(name)) showAdsByName.set(name, []);
            showAdsByName.get(name)!.push({ show: show.name, ad });
          }
        }
        
        // Process station-level ads (update but don't remove)
        const stationAds = station.advertisingOpportunities || [];
        if (stationAds.length > 0) {
          console.log(`\n     Station-level ads: ${stationAds.length}`);
          
          for (const ad of stationAds) {
            stats.totalStationAds++;
            
            // Check if this might be a duplicate
            const showMatches = showAdsByName.get(ad.name || 'Unnamed') || [];
            if (showMatches.length > 0) {
              stats.potentialDuplicates++;
              for (const match of showMatches) {
                potentialDuplicates.push({
                  publication: pubName,
                  station: station.callSign || 'Unknown',
                  adName: ad.name || 'Unnamed',
                  stationData: {
                    price: ad.pricing?.flatRate || 0,
                    model: ad.pricing?.pricingModel || 'unknown'
                  },
                  showData: {
                    show: match.show,
                    price: match.ad.pricing?.flatRate || 0,
                    model: match.ad.pricing?.pricingModel || 'unknown'
                  }
                });
              }
            }
            
            const changes = updateAd(ad);
            if (changes.length > 0) {
              stats.stationAdsUpdated++;
              stats.adFormatAdded += changes.some(c => c.includes('adFormat')) ? 1 : 0;
              stats.formatDimensionsAdded += changes.some(c => c.includes('format.dimensions')) ? 1 : 0;
              stats.fileFormatsAdded += changes.some(c => c.includes('fileFormats')) ? 1 : 0;
              pubModified = true;
              console.log(`        📢 "${ad.name || 'Unnamed'}" (station-level)`);
              changes.forEach(c => console.log(`           + ${c}`));
            }
          }
        }
        
        // Process show-level ads
        for (let showIdx = 0; showIdx < shows.length; showIdx++) {
          const show = shows[showIdx];
          stats.totalShows++;
          
          const ads = show.advertisingOpportunities || [];
          
          for (let adIdx = 0; adIdx < ads.length; adIdx++) {
            const ad = ads[adIdx];
            stats.totalShowAds++;
            
            const changes = updateAd(ad);
            if (changes.length > 0) {
              stats.showAdsUpdated++;
              stats.adFormatAdded += changes.some(c => c.includes('adFormat')) ? 1 : 0;
              stats.formatDimensionsAdded += changes.some(c => c.includes('format.dimensions')) ? 1 : 0;
              stats.fileFormatsAdded += changes.some(c => c.includes('fileFormats')) ? 1 : 0;
              pubModified = true;
              console.log(`        📢 "${ad.name || 'Unnamed'}" (${show.name})`);
              changes.forEach(c => console.log(`           + ${c}`));
            }
          }
        }
      }
      
      // Save changes
      if (pubModified && !DRY_RUN) {
        await collection.updateOne(
          { _id: pub._id },
          { $set: { 'distributionChannels.radioStations': stations } }
        );
        console.log(`\n  ✅ Saved changes for ${pubName}`);
      }
    }
    
    // Summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`
  Publications processed:     ${stats.totalPublications}
  Radio stations:             ${stats.totalStations}
  Shows:                      ${stats.totalShows}
  
  Ads:
  ─────────────────────────────────────────────────
  Show-level ads:             ${stats.totalShowAds}
  Station-level ads:          ${stats.totalStationAds}
  
  Updates Applied:
  ─────────────────────────────────────────────────
  Show ads updated:           ${stats.showAdsUpdated}
  Station ads updated:        ${stats.stationAdsUpdated}
  adFormat added:             ${stats.adFormatAdded}
  format.dimensions added:    ${stats.formatDimensionsAdded}
  fileFormats added:          ${stats.fileFormatsAdded}
  
  Potential Duplicates (NOT removed):  ${stats.potentialDuplicates}
`);

    // Show potential duplicates that could be reviewed later
    if (potentialDuplicates.length > 0) {
      console.log('\n' + '─'.repeat(80));
      console.log('📋 POTENTIAL DUPLICATES (for future review)');
      console.log('─'.repeat(80));
      console.log('These station-level ads have matching show-level ads but were NOT removed:\n');
      
      for (const dup of potentialDuplicates) {
        const priceMatch = dup.stationData.price === dup.showData.price;
        const modelMatch = dup.stationData.model === dup.showData.model;
        const status = priceMatch && modelMatch ? '✅ EXACT' : '⚠️ DIFFERS';
        
        console.log(`  ${status} ${dup.publication} > ${dup.station} > "${dup.adName}"`);
        if (!priceMatch || !modelMatch) {
          console.log(`         Station: $${dup.stationData.price} (${dup.stationData.model})`);
          console.log(`         Show "${dup.showData.show}": $${dup.showData.price} (${dup.showData.model})`);
        }
      }
    }
    
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were made');
      console.log('   Run without --dry-run to apply changes\n');
    } else {
      console.log('\n✅ MIGRATION COMPLETE - All changes have been applied\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

migrateRadioInventory();
