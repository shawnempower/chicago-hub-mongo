/**
 * Export All Publications Inventory Dimensions to CSV
 * 
 * Queries MongoDB to get all publications and their inventory types with dimensions
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface InventoryRow {
  publicationId: string;
  publicationName: string;
  channel: string;
  channelName: string;
  inventoryName: string;
  adFormat: string;
  dimensions: string;
  position: string;
  duration: string;
  pricing: string;
}

function escapeCSV(value: string | undefined | null): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportInventoryDimensions() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  const rows: InventoryRow[] = [];

  try {
    await client.connect();
    const dbName = 'chicago-hub';
    console.log(`📂 Using database: ${dbName} (PRODUCTION)\n`);
    const db = client.db(dbName);
    
    const publications = await db.collection('publications').find({}).toArray();
    console.log(`📰 Found ${publications.length} publications\n`);

    for (const pub of publications) {
      const pubId = pub._id?.toString() || pub.publicationId || 'unknown';
      const basicInfo = pub.basicInformation || pub.basicInfo || {};
      const pubName = basicInfo.title || basicInfo.publicationName || pub.name || 'Unnamed Publication';
      const channels = pub.distributionChannels || {};

      // Website inventory
      if (channels.website?.advertisingOpportunities) {
        for (const ad of channels.website.advertisingOpportunities) {
          // Get actual pixel dimensions from format.dimensions
          let dimsList: string[] = [];
          if (ad.format?.dimensions) {
            if (Array.isArray(ad.format.dimensions)) {
              dimsList = ad.format.dimensions;
            } else {
              // Split comma-separated dimensions
              dimsList = ad.format.dimensions.split(',').map((d: string) => d.trim());
            }
          }
          
          // Create a row for each dimension
          if (dimsList.length > 0) {
            for (const dim of dimsList) {
              rows.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'website',
                channelName: 'Website',
                inventoryName: ad.name || '',
                adFormat: ad.adFormat || '',
                dimensions: dim,
                position: ad.location || '',
                duration: '',
                pricing: formatPricing(ad.pricing)
              });
            }
          } else {
            // No dimensions - still add a row
            rows.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'website',
              channelName: 'Website',
              inventoryName: ad.name || '',
              adFormat: ad.adFormat || '',
              dimensions: '',
              position: ad.location || '',
              duration: '',
              pricing: formatPricing(ad.pricing)
            });
          }
        }
      }

      // Newsletter inventory
      if (channels.newsletters && Array.isArray(channels.newsletters)) {
        for (const newsletter of channels.newsletters) {
          const nlName = newsletter.name || 'Newsletter';
          if (newsletter.advertisingOpportunities) {
            for (const ad of newsletter.advertisingOpportunities) {
              // Get dimensions from top-level or format.dimensions
              let dimsList: string[] = [];
              const rawDims = ad.dimensions || ad.format?.dimensions;
              if (rawDims) {
                if (Array.isArray(rawDims)) {
                  dimsList = rawDims;
                } else {
                  dimsList = rawDims.split(',').map((d: string) => d.trim());
                }
              }
              
              // Create a row for each dimension
              if (dimsList.length > 0) {
                for (const dim of dimsList) {
                  rows.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'newsletter',
                    channelName: nlName,
                    inventoryName: ad.name || '',
                    adFormat: ad.position || '',
                    dimensions: dim,
                    position: ad.position || '',
                    duration: '',
                    pricing: formatPricing(ad.pricing)
                  });
                }
              } else {
                rows.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  channel: 'newsletter',
                  channelName: nlName,
                  inventoryName: ad.name || '',
                  adFormat: ad.position || '',
                  dimensions: '',
                  position: ad.position || '',
                  duration: '',
                  pricing: formatPricing(ad.pricing)
                });
              }
            }
          }
        }
      }

      // Print inventory
      if (channels.print && Array.isArray(channels.print)) {
        for (const print of channels.print) {
          const printName = print.name || 'Print';
          if (print.advertisingOpportunities) {
            for (const ad of print.advertisingOpportunities) {
              // Get dimensions from top-level or format.dimensions
              let dimsList: string[] = [];
              const rawDims = ad.dimensions || ad.format?.dimensions;
              if (rawDims) {
                if (Array.isArray(rawDims)) {
                  dimsList = rawDims;
                } else {
                  // For print, don't split on comma as dimensions like "10" x 9.875"" shouldn't be split
                  dimsList = [rawDims];
                }
              }
              
              // Create a row for each dimension
              if (dimsList.length > 0) {
                for (const dim of dimsList) {
                  rows.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'print',
                    channelName: printName,
                    inventoryName: ad.name || '',
                    adFormat: ad.adFormat || '',
                    dimensions: dim,
                    position: ad.location || '',
                    duration: '',
                    pricing: formatPrintPricing(ad.pricing)
                  });
                }
              } else {
                rows.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  channel: 'print',
                  channelName: printName,
                  inventoryName: ad.name || '',
                  adFormat: ad.adFormat || '',
                  dimensions: '',
                  position: ad.location || '',
                  duration: '',
                  pricing: formatPrintPricing(ad.pricing)
                });
              }
            }
          }
        }
      }

      // Podcast inventory
      if (channels.podcasts && Array.isArray(channels.podcasts)) {
        for (const podcast of channels.podcasts) {
          const podName = podcast.name || 'Podcast';
          if (podcast.advertisingOpportunities) {
            for (const ad of podcast.advertisingOpportunities) {
              rows.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'podcast',
                channelName: podName,
                inventoryName: ad.name || '',
                adFormat: ad.adFormat || '',
                dimensions: '',
                position: ad.adFormat || '',
                duration: ad.duration ? `${ad.duration}s` : '',
                pricing: formatPricing(ad.pricing)
              });
            }
          }
        }
      }

      // Radio inventory
      if (channels.radioStations && Array.isArray(channels.radioStations)) {
        for (const station of channels.radioStations) {
          const stationName = station.callSign || station.name || 'Radio Station';
          
          // Station-level ads
          if (station.advertisingOpportunities) {
            for (const ad of station.advertisingOpportunities) {
              rows.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'radio',
                channelName: stationName,
                inventoryName: ad.name || '',
                adFormat: ad.adFormat || '',
                dimensions: '',
                position: ad.timeSlot || '',
                duration: ad.specifications?.duration ? `${ad.specifications.duration}s` : getDurationFromFormat(ad.adFormat),
                pricing: formatRadioPricing(ad.pricing)
              });
            }
          }
          
          // Show-level ads
          if (station.shows && Array.isArray(station.shows)) {
            for (const show of station.shows) {
              const showName = show.name || 'Show';
              if (show.advertisingOpportunities) {
                for (const ad of show.advertisingOpportunities) {
                  rows.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'radio',
                    channelName: `${stationName} - ${showName}`,
                    inventoryName: ad.name || '',
                    adFormat: ad.adFormat || '',
                    dimensions: '',
                    position: show.timeSlot || '',
                    duration: ad.specifications?.duration ? `${ad.specifications.duration}s` : getDurationFromFormat(ad.adFormat),
                    pricing: formatRadioPricing(ad.pricing)
                  });
                }
              }
            }
          }
        }
      }

      // Streaming Video inventory
      if (channels.streamingVideo && Array.isArray(channels.streamingVideo)) {
        for (const stream of channels.streamingVideo) {
          const streamName = stream.name || stream.platform || 'Streaming';
          if (stream.advertisingOpportunities) {
            for (const ad of stream.advertisingOpportunities) {
              rows.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'streaming',
                channelName: streamName,
                inventoryName: ad.name || '',
                adFormat: ad.adFormat || '',
                dimensions: '',
                position: ad.adFormat || '',
                duration: ad.duration ? `${ad.duration}s` : '',
                pricing: formatPricing(ad.pricing)
              });
            }
          }
        }
      }

      // Social Media inventory
      if (channels.socialMedia && Array.isArray(channels.socialMedia)) {
        for (const social of channels.socialMedia) {
          const socialName = social.platform || 'Social';
          if (social.advertisingOpportunities) {
            for (const ad of social.advertisingOpportunities) {
              rows.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'social',
                channelName: socialName,
                inventoryName: ad.name || '',
                adFormat: ad.adFormat || '',
                dimensions: '',
                position: '',
                duration: '',
                pricing: formatPricing(ad.pricing)
              });
            }
          }
        }
      }
    }

    // Generate CSV
    const headers = ['Publication ID', 'Publication Name', 'Channel', 'Channel Name', 'Inventory Name', 'Ad Format', 'Dimensions', 'Position', 'Duration', 'Pricing'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        escapeCSV(row.publicationId),
        escapeCSV(row.publicationName),
        escapeCSV(row.channel),
        escapeCSV(row.channelName),
        escapeCSV(row.inventoryName),
        escapeCSV(row.adFormat),
        escapeCSV(row.dimensions),
        escapeCSV(row.position),
        escapeCSV(row.duration),
        escapeCSV(row.pricing)
      ].join(','))
    ].join('\n');

    const outputPath = path.resolve(__dirname, '../publication_inventory_dimensions.csv');
    fs.writeFileSync(outputPath, csvContent);
    
    console.log(`✅ Exported ${rows.length} inventory items to publication_inventory_dimensions.csv`);
    
    // Print summary
    const channelCounts: Record<string, number> = {};
    for (const row of rows) {
      channelCounts[row.channel] = (channelCounts[row.channel] || 0) + 1;
    }
    
    console.log('\n📊 Summary by channel:');
    for (const [channel, count] of Object.entries(channelCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${channel}: ${count} inventory items`);
    }

  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

function formatPricing(pricing: any): string {
  if (!pricing) return '';
  const parts: string[] = [];
  if (pricing.cpm) parts.push(`CPM: $${pricing.cpm}`);
  if (pricing.flatRate) parts.push(`Flat: $${pricing.flatRate}`);
  if (pricing.perSend) parts.push(`Per Send: $${pricing.perSend}`);
  if (pricing.monthly) parts.push(`Monthly: $${pricing.monthly}`);
  if (pricing.pricingModel) parts.push(`Model: ${pricing.pricingModel}`);
  return parts.join('; ') || '';
}

function formatPrintPricing(pricing: any): string {
  if (!pricing) return '';
  const parts: string[] = [];
  if (pricing.oneTime) parts.push(`1x: $${pricing.oneTime}`);
  if (pricing.fourTimes) parts.push(`4x: $${pricing.fourTimes}`);
  if (pricing.twelveTimes) parts.push(`12x: $${pricing.twelveTimes}`);
  if (pricing.openRate) parts.push(`Open: $${pricing.openRate}`);
  return parts.join('; ') || '';
}

function formatRadioPricing(pricing: any): string {
  if (!pricing) return '';
  const parts: string[] = [];
  if (pricing.perSpot) parts.push(`Per Spot: $${pricing.perSpot}`);
  if (pricing.weekly) parts.push(`Weekly: $${pricing.weekly}`);
  if (pricing.monthly) parts.push(`Monthly: $${pricing.monthly}`);
  if (pricing.flatRate) parts.push(`Flat: $${pricing.flatRate}`);
  if (pricing.pricingModel) parts.push(`Model: ${pricing.pricingModel}`);
  return parts.join('; ') || '';
}

function getDurationFromFormat(adFormat: string | undefined): string {
  if (!adFormat) return '';
  if (adFormat.includes('15')) return '15s';
  if (adFormat.includes('30')) return '30s';
  if (adFormat.includes('60')) return '60s';
  return '';
}

exportInventoryDimensions().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
