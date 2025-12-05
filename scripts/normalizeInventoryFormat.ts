/**
 * Normalize Inventory Format Migration Script
 * 
 * Migrates all publication advertising opportunities to use the standardized
 * `format` object for creative specifications.
 * 
 * Target schema for every advertising opportunity:
 * format: {
 *   dimensions: string | string[],  // "300x250" | "30s" | "text-only" | "native-inline"
 *   fileFormats: string[],          // ["JPG", "PNG", "GIF"] | ["MP3", "WAV"]
 *   maxFileSize?: string,           // "150KB"
 *   colorSpace?: string,            // "RGB" | "CMYK"
 *   resolution?: string,            // "72ppi" | "300dpi"
 *   duration?: number,              // 30 (audio only, seconds as number)
 * }
 * 
 * Usage:
 *   npx tsx scripts/normalizeInventoryFormat.ts [--dry-run]
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

interface Stats {
  publicationsProcessed: number;
  opportunitiesProcessed: number;
  formatDimensionsAdded: number;
  formatFileFormatsAdded: number;
  formatDurationAdded: number;
  formatMaxFileSizeAdded: number;
  formatColorSpaceAdded: number;
  formatResolutionAdded: number;
  errors: string[];
}

const stats: Stats = {
  publicationsProcessed: 0,
  opportunitiesProcessed: 0,
  formatDimensionsAdded: 0,
  formatFileFormatsAdded: 0,
  formatDurationAdded: 0,
  formatMaxFileSizeAdded: 0,
  formatColorSpaceAdded: 0,
  formatResolutionAdded: 0,
  errors: []
};

/**
 * Parse file formats from various sources
 */
function parseFileFormats(specs: any, channel: string): string[] | undefined {
  // Check if fileFormats already exists as array
  if (specs?.fileFormats && Array.isArray(specs.fileFormats) && specs.fileFormats.length > 0) {
    return specs.fileFormats;
  }
  
  // Parse from format string (e.g., "JPG, PNG, GIF, HTML5")
  if (specs?.format && typeof specs.format === 'string') {
    const formatStr = specs.format;
    // Check if it looks like file formats (contains common format names)
    if (/\b(JPG|PNG|GIF|PDF|TIFF|MP3|WAV|TXT|HTML|EPS|AI|PSD)\b/i.test(formatStr)) {
      return formatStr.split(/,\s*/).map((f: string) => f.trim().toUpperCase());
    }
  }
  
  // Default file formats by channel
  switch (channel) {
    case 'website':
      return ['JPG', 'PNG', 'GIF', 'HTML5'];
    case 'newsletter':
      return ['JPG', 'PNG', 'GIF'];
    case 'print':
      return ['PDF', 'TIFF'];
    case 'radio':
    case 'podcast':
      return ['MP3', 'WAV'];
    default:
      return undefined;
  }
}

/**
 * Parse duration from various sources and normalize to number
 */
function parseDuration(opp: any): number | undefined {
  // Check format.duration (number)
  if (opp.format?.duration !== undefined && typeof opp.format.duration === 'number') {
    return opp.format.duration;
  }
  
  // Check specifications.duration
  const specsDuration = opp.specifications?.duration;
  if (specsDuration !== undefined) {
    if (typeof specsDuration === 'number') {
      return specsDuration;
    }
    if (typeof specsDuration === 'string') {
      const match = specsDuration.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
  }
  
  // Check top-level duration
  if (opp.duration !== undefined) {
    if (typeof opp.duration === 'number') {
      return opp.duration;
    }
    if (typeof opp.duration === 'string') {
      const match = opp.duration.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
  }
  
  return undefined;
}

/**
 * Normalize a single advertising opportunity
 */
function normalizeOpportunity(opp: any, channel: string): { updated: boolean; changes: string[] } {
  const changes: string[] = [];
  let updated = false;
  
  // Initialize format object if not exists
  if (!opp.format) {
    opp.format = {};
  }
  
  // === DIMENSIONS ===
  if (!opp.format.dimensions) {
    // Priority 1: sizes array (website)
    if (opp.sizes && Array.isArray(opp.sizes) && opp.sizes.length > 0) {
      opp.format.dimensions = opp.sizes.length === 1 ? opp.sizes[0] : opp.sizes;
      changes.push(`dimensions from sizes: ${JSON.stringify(opp.format.dimensions)}`);
      stats.formatDimensionsAdded++;
      updated = true;
    }
    // Priority 2: top-level dimensions field (newsletter, print)
    else if (opp.dimensions && typeof opp.dimensions === 'string' && opp.dimensions.trim()) {
      opp.format.dimensions = opp.dimensions;
      changes.push(`dimensions from top-level: ${opp.dimensions}`);
      stats.formatDimensionsAdded++;
      updated = true;
    }
    // Priority 3: specifications.dimensions
    else if (opp.specifications?.dimensions) {
      opp.format.dimensions = opp.specifications.dimensions;
      changes.push(`dimensions from specs: ${opp.specifications.dimensions}`);
      stats.formatDimensionsAdded++;
      updated = true;
    }
    // Priority 4: Parse from adFormat (e.g., "300x250 banner" → "300x250")
    else if (opp.adFormat && typeof opp.adFormat === 'string') {
      const match = opp.adFormat.match(/(\d{2,4})\s*x\s*(\d{2,4})/i);
      if (match) {
        opp.format.dimensions = `${match[1]}x${match[2]}`;
        changes.push(`dimensions from adFormat: ${opp.format.dimensions}`);
        stats.formatDimensionsAdded++;
        updated = true;
      }
    }
  }
  
  // === FILE FORMATS ===
  if (!opp.format.fileFormats || opp.format.fileFormats.length === 0) {
    const fileFormats = parseFileFormats(opp.specifications, channel);
    if (fileFormats && fileFormats.length > 0) {
      opp.format.fileFormats = fileFormats;
      changes.push(`fileFormats: [${fileFormats.join(', ')}]`);
      stats.formatFileFormatsAdded++;
      updated = true;
    }
  }
  
  // === DURATION (audio channels) ===
  if ((channel === 'radio' || channel === 'podcast') && opp.format.duration === undefined) {
    const duration = parseDuration(opp);
    if (duration !== undefined) {
      opp.format.duration = duration;
      changes.push(`duration: ${duration}`);
      stats.formatDurationAdded++;
      updated = true;
      
      // Also set dimensions from duration if not set
      if (!opp.format.dimensions) {
        opp.format.dimensions = `${duration}s`;
        changes.push(`dimensions from duration: ${duration}s`);
        stats.formatDimensionsAdded++;
      }
    }
  }
  
  // === MAX FILE SIZE ===
  if (!opp.format.maxFileSize) {
    const maxFileSize = opp.specifications?.maxFileSize || opp.specifications?.fileSize;
    if (maxFileSize) {
      opp.format.maxFileSize = maxFileSize;
      changes.push(`maxFileSize: ${maxFileSize}`);
      stats.formatMaxFileSizeAdded++;
      updated = true;
    }
  }
  
  // === COLOR SPACE (print) ===
  if (channel === 'print' && !opp.format.colorSpace) {
    opp.format.colorSpace = opp.specifications?.colorSpace || 'CMYK';
    changes.push(`colorSpace: ${opp.format.colorSpace}`);
    stats.formatColorSpaceAdded++;
    updated = true;
  }
  
  // === RESOLUTION ===
  if (!opp.format.resolution) {
    if (channel === 'print') {
      opp.format.resolution = opp.specifications?.resolution || '300dpi';
      changes.push(`resolution: ${opp.format.resolution}`);
      stats.formatResolutionAdded++;
      updated = true;
    } else if (channel === 'website' || channel === 'newsletter') {
      if (opp.specifications?.resolution) {
        opp.format.resolution = opp.specifications.resolution;
        changes.push(`resolution: ${opp.format.resolution}`);
        stats.formatResolutionAdded++;
        updated = true;
      }
    }
  }
  
  // === ADDITIONAL REQUIREMENTS ===
  if (!opp.format.additionalRequirements && opp.specifications?.additionalRequirements) {
    opp.format.additionalRequirements = opp.specifications.additionalRequirements;
    changes.push('additionalRequirements copied');
    updated = true;
  }
  
  // === BLEED/TRIM (print) ===
  if (channel === 'print') {
    if (!opp.format.bleed && opp.specifications?.bleed) {
      opp.format.bleed = opp.specifications.bleed;
      changes.push(`bleed: ${opp.format.bleed}`);
      updated = true;
    }
    if (!opp.format.trim && opp.specifications?.trim) {
      opp.format.trim = opp.specifications.trim;
      changes.push(`trim: ${opp.format.trim}`);
      updated = true;
    }
  }
  
  return { updated, changes };
}

/**
 * Process a publication's advertising opportunities
 */
function processPublication(pub: any): boolean {
  let pubUpdated = false;
  const pubName = pub.basicInfo?.publicationName || pub.publicationId;
  
  const dc = pub.distributionChannels;
  if (!dc) return false;
  
  // Website
  if (dc.website?.advertisingOpportunities) {
    dc.website.advertisingOpportunities.forEach((opp: any, idx: number) => {
      stats.opportunitiesProcessed++;
      const { updated, changes } = normalizeOpportunity(opp, 'website');
      if (updated) {
        pubUpdated = true;
        console.log(`  [website][${idx}] ${opp.name}: ${changes.join(', ')}`);
      }
    });
  }
  
  // Newsletters
  if (dc.newsletters && Array.isArray(dc.newsletters)) {
    dc.newsletters.forEach((nl: any, nlIdx: number) => {
      (nl.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'newsletter');
        if (updated) {
          pubUpdated = true;
          console.log(`  [newsletter][${nlIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  // Print
  if (dc.print && Array.isArray(dc.print)) {
    dc.print.forEach((pr: any, prIdx: number) => {
      (pr.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'print');
        if (updated) {
          pubUpdated = true;
          console.log(`  [print][${prIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  // Podcasts
  if (dc.podcasts && Array.isArray(dc.podcasts)) {
    dc.podcasts.forEach((pod: any, podIdx: number) => {
      (pod.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'podcast');
        if (updated) {
          pubUpdated = true;
          console.log(`  [podcast][${podIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  // Radio Stations
  if (dc.radioStations && Array.isArray(dc.radioStations)) {
    dc.radioStations.forEach((station: any, stIdx: number) => {
      // Station-level ads
      (station.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'radio');
        if (updated) {
          pubUpdated = true;
          console.log(`  [radio][${stIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
      // Show-level ads
      (station.shows || []).forEach((show: any, showIdx: number) => {
        (show.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
          stats.opportunitiesProcessed++;
          const { updated, changes } = normalizeOpportunity(opp, 'radio');
          if (updated) {
            pubUpdated = true;
            console.log(`  [radio][${stIdx}][show ${showIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
          }
        });
      });
    });
  }
  
  // Streaming Video
  if (dc.streamingVideo && Array.isArray(dc.streamingVideo)) {
    dc.streamingVideo.forEach((stream: any, stIdx: number) => {
      (stream.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'streaming');
        if (updated) {
          pubUpdated = true;
          console.log(`  [streaming][${stIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  // Social Media
  if (dc.socialMedia && Array.isArray(dc.socialMedia)) {
    dc.socialMedia.forEach((social: any, sIdx: number) => {
      (social.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'social');
        if (updated) {
          pubUpdated = true;
          console.log(`  [social][${sIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  // Events
  if (dc.events && Array.isArray(dc.events)) {
    dc.events.forEach((event: any, eIdx: number) => {
      (event.advertisingOpportunities || []).forEach((opp: any, idx: number) => {
        stats.opportunitiesProcessed++;
        const { updated, changes } = normalizeOpportunity(opp, 'events');
        if (updated) {
          pubUpdated = true;
          console.log(`  [events][${eIdx}][${idx}] ${opp.name}: ${changes.join(', ')}`);
        }
      });
    });
  }
  
  return pubUpdated;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🔄 Normalize Inventory Format Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be saved)' : '💾 LIVE (changes will be saved)'}\n`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = process.env.MONGODB_DB_NAME || 'staging-chicago-hub';
    console.log(`📂 Using database: ${dbName}\n`);
    
    const db = client.db(dbName);
    const publicationsCollection = db.collection('publications');

    // Get all publications
    const publications = await publicationsCollection.find({}).toArray();
    console.log(`Found ${publications.length} publications to process\n`);
    console.log('='.repeat(60));

    for (const pub of publications) {
      const pubName = pub.basicInfo?.publicationName || pub.publicationId;
      stats.publicationsProcessed++;
      
      console.log(`\n📰 ${pubName} (ID: ${pub.publicationId})`);
      
      const wasUpdated = processPublication(pub);
      
      if (wasUpdated && !DRY_RUN) {
        // Save the updated publication
        await publicationsCollection.updateOne(
          { _id: pub._id },
          { $set: { distributionChannels: pub.distributionChannels } }
        );
        console.log(`  💾 Saved changes`);
      } else if (!wasUpdated) {
        console.log(`  ✓ No changes needed`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Publications processed:     ${stats.publicationsProcessed}`);
    console.log(`Opportunities processed:    ${stats.opportunitiesProcessed}`);
    console.log(`format.dimensions added:    ${stats.formatDimensionsAdded}`);
    console.log(`format.fileFormats added:   ${stats.formatFileFormatsAdded}`);
    console.log(`format.duration added:      ${stats.formatDurationAdded}`);
    console.log(`format.maxFileSize added:   ${stats.formatMaxFileSizeAdded}`);
    console.log(`format.colorSpace added:    ${stats.formatColorSpaceAdded}`);
    console.log(`format.resolution added:    ${stats.formatResolutionAdded}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors: ${stats.errors.length}`);
      stats.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were saved');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ MIGRATION COMPLETE');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
