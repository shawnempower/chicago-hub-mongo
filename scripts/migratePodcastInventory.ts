/**
 * Podcast Inventory Migration Script
 * 
 * Fixes podcast ad inventory to match the new standards:
 * 1. Sets adFormat from ad name/position/duration
 * 2. Adds format.dimensions for creative asset matching
 * 3. Adds specifications.fileFormats
 * 4. Adds specifications.duration from ad name if not present
 * 
 * Usage:
 *   npx tsx scripts/migratePodcastInventory.ts --dry-run                    # Preview on default db
 *   npx tsx scripts/migratePodcastInventory.ts --db staging-chicago-hub     # Apply to staging
 *   npx tsx scripts/migratePodcastInventory.ts --db chicago-hub             # Apply to production
 *   npx tsx scripts/migratePodcastInventory.ts --db staging-chicago-hub --dry-run  # Preview staging
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

// Infer duration from ad name
function inferDurationFromName(name: string): number | undefined {
  const nameLower = name.toLowerCase();
  
  // Look for explicit duration patterns (various formats)
  // "15 second", "15-second", ":15", "15 sec", "15sec"
  if (nameLower.includes('15 second') || nameLower.includes('15-second') || nameLower.includes(':15') || nameLower.match(/\b15\s*sec/)) return 15;
  if (nameLower.includes('30 second') || nameLower.includes('30-second') || nameLower.includes(':30') || nameLower.match(/\b30\s*sec/)) return 30;
  if (nameLower.includes('60 second') || nameLower.includes('60-second') || nameLower.includes(':60') || nameLower.match(/\b60\s*sec/)) return 60;
  if (nameLower.includes('90 second') || nameLower.includes('90-second') || nameLower.includes(':90') || nameLower.match(/\b90\s*sec/)) return 90;
  if (nameLower.includes('120 second') || nameLower.includes('120-second') || nameLower.includes(':120') || nameLower.match(/\b120\s*sec/)) return 120;
  
  // Handle weird patterns like "30 Podcast Second Ad" -> find numbers near "second"
  const secondMatch = nameLower.match(/(\d+)\s*(?:\w+\s+)?second/);
  if (secondMatch) {
    return parseInt(secondMatch[1]);
  }
  
  // Check for just numbers with "sec" nearby
  const secMatch = nameLower.match(/(\d+)\s*sec/);
  if (secMatch) {
    return parseInt(secMatch[1]);
  }
  
  return undefined;
}

// Infer position from ad name
function inferPositionFromName(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('pre-roll') || nameLower.includes('preroll') || nameLower.includes('pre roll') || nameLower.includes('opening')) {
    return 'pre-roll';
  }
  if (nameLower.includes('post-roll') || nameLower.includes('postroll') || nameLower.includes('post roll') || nameLower.includes('closing')) {
    return 'post-roll';
  }
  if (nameLower.includes('mid-roll') || nameLower.includes('midroll') || nameLower.includes('mid roll')) {
    return 'mid-roll';
  }
  
  return 'mid-roll'; // default
}

// Map ad info to adFormat
function inferAdFormat(name: string, position: string, duration?: number): string {
  const nameLower = name.toLowerCase();
  const posLower = position?.toLowerCase() || '';
  
  // Check for host-read/live-read
  if (nameLower.includes('host read') || nameLower.includes('host-read') || nameLower.includes('live read')) {
    return 'host_read';
  }
  
  // Check for sponsorship/takeover
  if (nameLower.includes('takeover') || nameLower.includes('sponsorship') || nameLower.includes('sponsor') || nameLower.includes('title')) {
    return 'sponsorship';
  }
  
  // Check name for position first (takes priority)
  if (nameLower.includes('pre-roll') || nameLower.includes('preroll') || nameLower.includes('pre roll')) {
    return 'pre_roll';
  }
  if (nameLower.includes('post-roll') || nameLower.includes('postroll') || nameLower.includes('post roll')) {
    return 'post_roll';
  }
  
  // Then check position field
  if (posLower.includes('pre-roll') || posLower.includes('preroll')) {
    return 'pre_roll';
  }
  if (posLower.includes('post-roll') || posLower.includes('postroll')) {
    return 'post_roll';
  }
  
  // Check for midroll in name
  if (nameLower.includes('mid-roll') || nameLower.includes('midroll') || nameLower.includes('mid roll')) {
    // Duration-based mid-roll
    if (duration === 60 || nameLower.includes('60')) {
      return 'mid_roll_60';
    }
    return 'mid_roll_30';
  }
  
  // Duration-based (when name contains duration)
  if (duration === 60 || nameLower.includes('60 second') || nameLower.includes(':60')) {
    return 'mid_roll_60';
  }
  if (duration === 30 || nameLower.includes('30 second') || nameLower.includes(':30')) {
    return 'mid_roll_30';
  }
  
  // Default
  return 'mid_roll_30';
}

// Map to format.dimensions (for creative matching)
function inferDimensions(adFormat: string, duration?: number, name?: string): string {
  // Special formats that don't use duration
  if (adFormat === 'host_read') return 'host-read';
  if (adFormat === 'sponsorship') return 'sponsorship';
  
  // Duration-based formats
  if (adFormat === 'mid_roll_60') return '60s';
  if (adFormat === 'mid_roll_30') return '30s';
  
  // If we have a specific duration, always use it as dimension
  if (duration) return `${duration}s`;
  
  // Position-based fallbacks when no duration
  if (adFormat === 'pre_roll') return 'pre-roll';
  if (adFormat === 'post_roll') return 'post-roll';
  
  // Default
  return '30s';
}

// Determine file formats based on ad type
function getFileFormats(adFormat: string, adName: string): string[] {
  const nameLower = adName.toLowerCase();
  
  // Script-variant rolls (explicitly set)
  if (adFormat.endsWith('_script')) {
    return ['TXT'];
  }
  
  // Host reads and script-based formats need text
  if (adFormat === 'host_read' || 
      nameLower.includes('host read') || 
      nameLower.includes('script') ||
      nameLower.includes('talking points')) {
    return ['TXT'];
  }
  
  // Sponsorships can be either audio or script
  if (adFormat === 'sponsorship' || 
      nameLower.includes('sponsor') ||
      nameLower.includes('takeover')) {
    return ['MP3', 'WAV', 'TXT'];
  }
  
  // Standard pre-recorded audio spots
  return ['MP3', 'WAV'];
}

// Update a single ad with new fields
function updateAd(ad: any): { changes: string[]; updated: any } {
  const changes: string[] = [];
  const updated = { ...ad };
  
  const name = ad.name || '';
  const existingPosition = ad.position || '';
  const existingDuration = ad.duration || ad.specifications?.duration;
  
  // 1. Infer duration from name if not present
  let duration = existingDuration;
  if (!duration) {
    duration = inferDurationFromName(name);
    if (duration) {
      updated.duration = duration;
      changes.push(`duration: ${duration}s (inferred from name)`);
    }
  }
  
  // 2. Infer position if not present
  let position = existingPosition;
  if (!position) {
    position = inferPositionFromName(name);
    updated.position = position;
    changes.push(`position: "${position}" (inferred from name)`);
  }
  
  // 3. Add adFormat if missing
  if (!ad.adFormat) {
    const newAdFormat = inferAdFormat(name, position, duration);
    updated.adFormat = newAdFormat;
    changes.push(`adFormat: "${newAdFormat}"`);
  }
  
  // 4. Add format.dimensions if missing
  const adFormat = updated.adFormat || ad.adFormat;
  if (!ad.format?.dimensions) {
    const dimensions = inferDimensions(adFormat, duration, name);
    updated.format = { ...ad.format, dimensions };
    changes.push(`format.dimensions: "${dimensions}"`);
  }
  
  // 5. Add specifications with duration and fileFormats
  if (!ad.specifications?.fileFormats || ad.specifications.fileFormats.length === 0) {
    const fileFormats = getFileFormats(adFormat, name);
    updated.specifications = {
      ...ad.specifications,
      ...(duration && { duration }),
      fileFormats
    };
    changes.push(`specifications.fileFormats: [${fileFormats.join(', ')}]`);
  } else if (duration && !ad.specifications.duration) {
    updated.specifications = {
      ...ad.specifications,
      duration
    };
    changes.push(`specifications.duration: ${duration}s`);
  }
  
  return { changes, updated };
}

interface MigrationStats {
  totalPublications: number;
  totalPodcasts: number;
  totalAds: number;
  adsUpdated: number;
  adFormatAdded: number;
  formatDimensionsAdded: number;
  fileFormatsAdded: number;
  durationInferred: number;
  positionInferred: number;
}

async function migratePodcastInventory() {
  try {
    await client.connect();
    const db = client.db(TARGET_DB);
    const collection = db.collection('publications');
    
    console.log(`\n🎙️ PODCAST INVENTORY MIGRATION`);
    console.log(`   Database: ${TARGET_DB}`);
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE - Changes will be applied'}`);
    console.log('═'.repeat(80));
    
    const pubs = await collection.find({
      'distributionChannels.podcasts': { $exists: true, $ne: [] }
    }).toArray();
    
    const stats: MigrationStats = {
      totalPublications: pubs.length,
      totalPodcasts: 0,
      totalAds: 0,
      adsUpdated: 0,
      adFormatAdded: 0,
      formatDimensionsAdded: 0,
      fileFormatsAdded: 0,
      durationInferred: 0,
      positionInferred: 0,
    };
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const podcasts = pub.distributionChannels?.podcasts || [];
      let pubModified = false;
      
      console.log(`\n📰 ${pubName}`);
      console.log('─'.repeat(60));
      
      for (let podcastIdx = 0; podcastIdx < podcasts.length; podcastIdx++) {
        const podcast = podcasts[podcastIdx];
        stats.totalPodcasts++;
        
        const podcastName = podcast.name || podcast.podcastName || 'Unknown Podcast';
        console.log(`\n  🎙️ ${podcastName}`);
        
        const ads = podcast.advertisingOpportunities || [];
        
        for (let adIdx = 0; adIdx < ads.length; adIdx++) {
          const ad = ads[adIdx];
          stats.totalAds++;
          
          const { changes, updated } = updateAd(ad);
          
          if (changes.length > 0) {
            stats.adsUpdated++;
            
            // Track specific changes
            if (changes.some(c => c.includes('adFormat'))) stats.adFormatAdded++;
            if (changes.some(c => c.includes('format.dimensions'))) stats.formatDimensionsAdded++;
            if (changes.some(c => c.includes('fileFormats'))) stats.fileFormatsAdded++;
            if (changes.some(c => c.includes('duration') && c.includes('inferred'))) stats.durationInferred++;
            if (changes.some(c => c.includes('position') && c.includes('inferred'))) stats.positionInferred++;
            
            // Update the ad in the array
            podcasts[podcastIdx].advertisingOpportunities[adIdx] = updated;
            pubModified = true;
            
            console.log(`     📢 "${ad.name || 'Unnamed'}"`);
            changes.forEach(c => console.log(`        + ${c}`));
          }
        }
      }
      
      // Save changes
      if (pubModified && !DRY_RUN) {
        await collection.updateOne(
          { _id: pub._id },
          { $set: { 'distributionChannels.podcasts': podcasts } }
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
  Podcasts:                   ${stats.totalPodcasts}
  Total ads:                  ${stats.totalAds}
  
  Changes:
  ─────────────────────────────────────────────────
  Ads updated:                ${stats.adsUpdated}
  adFormat added:             ${stats.adFormatAdded}
  format.dimensions added:    ${stats.formatDimensionsAdded}
  fileFormats added:          ${stats.fileFormatsAdded}
  Duration inferred:          ${stats.durationInferred}
  Position inferred:          ${stats.positionInferred}
`);
    
    if (DRY_RUN) {
      console.log('🔍 DRY RUN COMPLETE - No changes were made');
      console.log('   Run without --dry-run to apply changes\n');
    } else {
      console.log('✅ MIGRATION COMPLETE - All changes have been applied\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

migratePodcastInventory();
