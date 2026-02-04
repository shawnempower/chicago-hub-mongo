/**
 * Check Dimensions Storage Locations
 * 
 * Queries the database to find where dimensions are stored for each channel type
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Check which database to query
const DB_NAME = process.argv[2] || 'chicago-hub'; // Pass 'staging-chicago-hub' for staging

interface DimensionLocation {
  publicationName: string;
  channel: string;
  adName: string;
  topLevelDimensions: string | null;
  formatDimensions: string | null;
  specificationsDimensions: string | null;
  sizesArray: string[] | null;
}

async function checkDimensionsLocations() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  console.log(`🔍 Connecting to MongoDB (${DB_NAME})...\n`);
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const publications = await db.collection('publications').find({}).toArray();
    
    console.log(`📊 Found ${publications.length} publications\n`);
    
    const results: { [channel: string]: DimensionLocation[] } = {
      print: [],
      newsletter: [],
      website: [],
      podcast: [],
      radio: [],
      streaming: [],
      social: []
    };
    
    const summary = {
      print: { topLevel: 0, format: 0, both: 0, neither: 0, total: 0 },
      newsletter: { topLevel: 0, format: 0, both: 0, neither: 0, total: 0 },
      website: { topLevel: 0, format: 0, both: 0, neither: 0, total: 0 },
      podcast: { topLevel: 0, format: 0, both: 0, neither: 0, total: 0 },
      radio: { topLevel: 0, format: 0, both: 0, neither: 0, total: 0 },
    };

    for (const pub of publications) {
      const pubName = pub.basicInformation?.title || pub.basicInfo?.publicationName || `ID: ${pub.publicationId}`;
      const channels = pub.distributionChannels;
      
      if (!channels) continue;

      // Check Print
      const prints = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      for (const print of prints) {
        if (!print?.advertisingOpportunities) continue;
        for (const ad of print.advertisingOpportunities) {
          summary.print.total++;
          const hasTopLevel = !!ad.dimensions;
          const hasFormat = !!ad.format?.dimensions;
          
          if (hasTopLevel && hasFormat) summary.print.both++;
          else if (hasTopLevel) summary.print.topLevel++;
          else if (hasFormat) summary.print.format++;
          else summary.print.neither++;
          
          if (results.print.length < 5) {
            results.print.push({
              publicationName: pubName,
              channel: 'print',
              adName: ad.name || 'Unnamed',
              topLevelDimensions: ad.dimensions || null,
              formatDimensions: ad.format?.dimensions || null,
              specificationsDimensions: ad.specifications?.dimensions || null,
              sizesArray: ad.sizes || null
            });
          }
        }
      }

      // Check Newsletters
      if (channels.newsletters) {
        for (const nl of channels.newsletters) {
          if (!nl?.advertisingOpportunities) continue;
          for (const ad of nl.advertisingOpportunities) {
            summary.newsletter.total++;
            const hasTopLevel = !!ad.dimensions;
            const hasFormat = !!ad.format?.dimensions;
            
            if (hasTopLevel && hasFormat) summary.newsletter.both++;
            else if (hasTopLevel) summary.newsletter.topLevel++;
            else if (hasFormat) summary.newsletter.format++;
            else summary.newsletter.neither++;
            
            if (results.newsletter.length < 5) {
              results.newsletter.push({
                publicationName: pubName,
                channel: 'newsletter',
                adName: ad.name || 'Unnamed',
                topLevelDimensions: ad.dimensions || null,
                formatDimensions: ad.format?.dimensions || null,
                specificationsDimensions: null,
                sizesArray: null
              });
            }
          }
        }
      }

      // Check Website
      if (channels.website?.advertisingOpportunities) {
        for (const ad of channels.website.advertisingOpportunities) {
          summary.website.total++;
          const hasTopLevel = !!ad.dimensions;
          const hasFormat = !!ad.format?.dimensions;
          
          if (hasTopLevel && hasFormat) summary.website.both++;
          else if (hasTopLevel) summary.website.topLevel++;
          else if (hasFormat) summary.website.format++;
          else summary.website.neither++;
          
          if (results.website.length < 5) {
            results.website.push({
              publicationName: pubName,
              channel: 'website',
              adName: ad.name || 'Unnamed',
              topLevelDimensions: ad.dimensions || null,
              formatDimensions: ad.format?.dimensions || null,
              specificationsDimensions: ad.specifications?.size || null,
              sizesArray: ad.sizes || null
            });
          }
        }
      }

      // Check Podcasts
      if (channels.podcasts) {
        for (const podcast of channels.podcasts) {
          if (!podcast?.advertisingOpportunities) continue;
          for (const ad of podcast.advertisingOpportunities) {
            summary.podcast.total++;
            const hasTopLevel = !!ad.dimensions;
            const hasFormat = !!ad.format?.dimensions;
            
            if (hasTopLevel && hasFormat) summary.podcast.both++;
            else if (hasTopLevel) summary.podcast.topLevel++;
            else if (hasFormat) summary.podcast.format++;
            else summary.podcast.neither++;
            
            if (results.podcast.length < 5) {
              results.podcast.push({
                publicationName: pubName,
                channel: 'podcast',
                adName: ad.name || 'Unnamed',
                topLevelDimensions: ad.dimensions || null,
                formatDimensions: ad.format?.dimensions || null,
                specificationsDimensions: null,
                sizesArray: null
              });
            }
          }
        }
      }

      // Check Radio
      if (channels.radioStations) {
        for (const station of channels.radioStations) {
          // Check station-level ads
          if (station?.advertisingOpportunities) {
            for (const ad of station.advertisingOpportunities) {
              summary.radio.total++;
              const hasTopLevel = !!ad.dimensions;
              const hasFormat = !!ad.format?.dimensions;
              
              if (hasTopLevel && hasFormat) summary.radio.both++;
              else if (hasTopLevel) summary.radio.topLevel++;
              else if (hasFormat) summary.radio.format++;
              else summary.radio.neither++;
            }
          }
          // Check show-level ads
          if (station?.shows) {
            for (const show of station.shows) {
              if (!show?.advertisingOpportunities) continue;
              for (const ad of show.advertisingOpportunities) {
                summary.radio.total++;
                const hasTopLevel = !!ad.dimensions;
                const hasFormat = !!ad.format?.dimensions;
                
                if (hasTopLevel && hasFormat) summary.radio.both++;
                else if (hasTopLevel) summary.radio.topLevel++;
                else if (hasFormat) summary.radio.format++;
                else summary.radio.neither++;
              }
            }
          }
        }
      }
    }

    // Print Summary
    console.log('='.repeat(80));
    console.log('📊 DIMENSIONS LOCATION SUMMARY');
    console.log('='.repeat(80));
    console.log();
    
    console.log('| Channel    | Total | TopLevel | format.dimensions | Both | Neither |');
    console.log('|------------|-------|----------|-------------------|------|---------|');
    
    for (const [channel, stats] of Object.entries(summary)) {
      if (stats.total > 0) {
        console.log(`| ${channel.padEnd(10)} | ${String(stats.total).padStart(5)} | ${String(stats.topLevel).padStart(8)} | ${String(stats.format).padStart(17)} | ${String(stats.both).padStart(4)} | ${String(stats.neither).padStart(7)} |`);
      }
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('📝 SAMPLE DATA (first 5 per channel)');
    console.log('='.repeat(80));
    
    for (const [channel, samples] of Object.entries(results)) {
      if (samples.length > 0) {
        console.log(`\n📌 ${channel.toUpperCase()}:`);
        for (const sample of samples) {
          console.log(`\n  ${sample.publicationName} - "${sample.adName}"`);
          console.log(`    ad.dimensions:        ${sample.topLevelDimensions || '❌ NOT SET'}`);
          console.log(`    ad.format.dimensions: ${sample.formatDimensions || '❌ NOT SET'}`);
          if (sample.sizesArray) {
            console.log(`    ad.sizes[]:           ${JSON.stringify(sample.sizesArray)}`);
          }
          if (sample.specificationsDimensions) {
            console.log(`    ad.specifications:    ${sample.specificationsDimensions}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDimensionsLocations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
