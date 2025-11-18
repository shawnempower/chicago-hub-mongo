#!/usr/bin/env node

/**
 * Monthly Pricing Model Count Script
 * 
 * Queries MongoDB to find all records using "monthly" pricingModel
 * 
 * Run with: NODE_OPTIONS="--require dotenv/config" npx tsx scripts/countMonthlyPricingModel.ts
 */

// MUST load environment variables BEFORE any imports that use them
import { config } from 'dotenv';
config();

// Verify environment is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.error('\n💡 Please create a .env file with your MongoDB connection string:');
  console.error('   cp env.template .env');
  console.error('   # Then edit .env and add your MONGODB_URI\n');
  process.exit(1);
}

// NOW we can import MongoDB modules
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/index.js';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas.js';

interface MonthlyPricingStats {
  totalPublications: number;
  publicationsWithMonthly: number;
  totalMonthlyRecords: number;
  byChannel: Record<string, number>;
  details: Array<{
    publicationId: number;
    publicationName: string;
    channel: string;
    itemName: string;
    pricingModel: string;
    flatRate?: number;
    location: string;
  }>;
}

async function countMonthlyPricingModel() {
  console.log('\n' + '='.repeat(80));
  console.log('  💰 MONTHLY PRICING MODEL ANALYSIS');
  console.log('  Finding records with pricingModel: "monthly"');
  console.log('='.repeat(80) + '\n');

  try {
    await connectToDatabase();
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);

    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Scanning ${publications.length} publications...\n`);

    const stats: MonthlyPricingStats = {
      totalPublications: publications.length,
      publicationsWithMonthly: 0,
      totalMonthlyRecords: 0,
      byChannel: {},
      details: []
    };

    const pubsWithMonthly = new Set<number>();

    // Check each publication's distribution channels
    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const channels = pub.distributionChannels || {};

      // Website
      if (channels.website?.advertisingOpportunities) {
        channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
          if (ad.pricing?.pricingModel === 'monthly') {
            pubsWithMonthly.add(pubId);
            stats.totalMonthlyRecords++;
            stats.byChannel['website'] = (stats.byChannel['website'] || 0) + 1;
            stats.details.push({
              publicationId: pubId,
              publicationName: pubName,
              channel: 'website',
              itemName: ad.name || 'Unknown',
              pricingModel: 'monthly',
              flatRate: ad.pricing?.flatRate,
              location: `website.advertisingOpportunities[${idx}]`
            });
          }
          
          // Check hub pricing
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            pricingArray.forEach((pricing: any, pricingIdx: number) => {
              if (pricing?.pricingModel === 'monthly') {
                pubsWithMonthly.add(pubId);
                stats.totalMonthlyRecords++;
                stats.byChannel['website-hub'] = (stats.byChannel['website-hub'] || 0) + 1;
                stats.details.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  channel: 'website-hub',
                  itemName: `${ad.name} (Hub: ${hub.hubName})`,
                  pricingModel: 'monthly',
                  flatRate: pricing?.flatRate,
                  location: `website.advertisingOpportunities[${idx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                });
              }
            });
          });
        });
      }

      // Newsletters
      if (Array.isArray(channels.newsletters)) {
        channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
          newsletter.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['newsletter'] = (stats.byChannel['newsletter'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'newsletter',
                itemName: `${newsletter.name} - ${ad.name}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `newsletters[${nlIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['newsletter-hub'] = (stats.byChannel['newsletter-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'newsletter-hub',
                    itemName: `${newsletter.name} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `newsletters[${nlIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Print
      if (Array.isArray(channels.print)) {
        channels.print.forEach((print: any, printIdx: number) => {
          print.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            // Check if pricing is array or single object
            const pricingArray = Array.isArray(ad.pricing) ? ad.pricing : [ad.pricing];
            pricingArray.forEach((pricing: any, tierIdx: number) => {
              const pricingObj = pricing?.pricing || pricing;
              if (pricingObj?.pricingModel === 'monthly') {
                pubsWithMonthly.add(pubId);
                stats.totalMonthlyRecords++;
                stats.byChannel['print'] = (stats.byChannel['print'] || 0) + 1;
                stats.details.push({
                  publicationId: pubId,
                  publicationName: pubName,
                  channel: 'print',
                  itemName: `${print.name} - ${ad.name}`,
                  pricingModel: 'monthly',
                  flatRate: pricingObj?.flatRate,
                  location: `print[${printIdx}].advertisingOpportunities[${adIdx}].pricing[${tierIdx}]`
                });
              }
            });

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['print-hub'] = (stats.byChannel['print-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'print-hub',
                    itemName: `${print.name} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `print[${printIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Social Media
      if (Array.isArray(channels.socialMedia)) {
        channels.socialMedia.forEach((social: any, socialIdx: number) => {
          social.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['socialMedia'] = (stats.byChannel['socialMedia'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'socialMedia',
                itemName: `${social.platform} - ${ad.name}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `socialMedia[${socialIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['socialMedia-hub'] = (stats.byChannel['socialMedia-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'socialMedia-hub',
                    itemName: `${social.platform} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `socialMedia[${socialIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Events
      if (Array.isArray(channels.events)) {
        channels.events.forEach((event: any, eventIdx: number) => {
          event.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['events'] = (stats.byChannel['events'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'events',
                itemName: `${event.name} - ${ad.level || 'Sponsorship'}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `events[${eventIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['events-hub'] = (stats.byChannel['events-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'events-hub',
                    itemName: `${event.name} - ${ad.level || 'Sponsorship'} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `events[${eventIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Podcasts
      if (Array.isArray(channels.podcasts)) {
        channels.podcasts.forEach((podcast: any, podIdx: number) => {
          podcast.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['podcasts'] = (stats.byChannel['podcasts'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'podcasts',
                itemName: `${podcast.name} - ${ad.name}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `podcasts[${podIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['podcasts-hub'] = (stats.byChannel['podcasts-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'podcasts-hub',
                    itemName: `${podcast.name} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `podcasts[${podIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Radio
      if (Array.isArray(channels.radioStations)) {
        channels.radioStations.forEach((radio: any, radioIdx: number) => {
          // Check shows
          if (Array.isArray(radio.shows)) {
            radio.shows.forEach((show: any, showIdx: number) => {
              show.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
                if (ad.pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['radio'] = (stats.byChannel['radio'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'radio',
                    itemName: `${radio.callSign} - ${show.name} - ${ad.name}`,
                    pricingModel: 'monthly',
                    flatRate: ad.pricing?.flatRate,
                    location: `radioStations[${radioIdx}].shows[${showIdx}].advertisingOpportunities[${adIdx}]`
                  });
                }

                // Check hub pricing
                ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
                  const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
                  pricingArray.forEach((pricing: any, pricingIdx: number) => {
                    if (pricing?.pricingModel === 'monthly') {
                      pubsWithMonthly.add(pubId);
                      stats.totalMonthlyRecords++;
                      stats.byChannel['radio-hub'] = (stats.byChannel['radio-hub'] || 0) + 1;
                      stats.details.push({
                        publicationId: pubId,
                        publicationName: pubName,
                        channel: 'radio-hub',
                        itemName: `${radio.callSign} - ${show.name} - ${ad.name} (Hub: ${hub.hubName})`,
                        pricingModel: 'monthly',
                        flatRate: pricing?.flatRate,
                        location: `radioStations[${radioIdx}].shows[${showIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                      });
                    }
                  });
                });
              });
            });
          }
          
          // Check station-level ads
          radio.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['radio'] = (stats.byChannel['radio'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'radio',
                itemName: `${radio.callSign} - ${ad.name}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `radioStations[${radioIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['radio-hub'] = (stats.byChannel['radio-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'radio-hub',
                    itemName: `${radio.callSign} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `radioStations[${radioIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }

      // Streaming Video
      if (Array.isArray(channels.streamingVideo)) {
        channels.streamingVideo.forEach((streaming: any, streamIdx: number) => {
          streaming.advertisingOpportunities?.forEach((ad: any, adIdx: number) => {
            if (ad.pricing?.pricingModel === 'monthly') {
              pubsWithMonthly.add(pubId);
              stats.totalMonthlyRecords++;
              stats.byChannel['streamingVideo'] = (stats.byChannel['streamingVideo'] || 0) + 1;
              stats.details.push({
                publicationId: pubId,
                publicationName: pubName,
                channel: 'streamingVideo',
                itemName: `${streaming.name} - ${ad.name}`,
                pricingModel: 'monthly',
                flatRate: ad.pricing?.flatRate,
                location: `streamingVideo[${streamIdx}].advertisingOpportunities[${adIdx}]`
              });
            }

            // Check hub pricing
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                if (pricing?.pricingModel === 'monthly') {
                  pubsWithMonthly.add(pubId);
                  stats.totalMonthlyRecords++;
                  stats.byChannel['streamingVideo-hub'] = (stats.byChannel['streamingVideo-hub'] || 0) + 1;
                  stats.details.push({
                    publicationId: pubId,
                    publicationName: pubName,
                    channel: 'streamingVideo-hub',
                    itemName: `${streaming.name} - ${ad.name} (Hub: ${hub.hubName})`,
                    pricingModel: 'monthly',
                    flatRate: pricing?.flatRate,
                    location: `streamingVideo[${streamIdx}].advertisingOpportunities[${adIdx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`
                  });
                }
              });
            });
          });
        });
      }
    }

    stats.publicationsWithMonthly = pubsWithMonthly.size;

    // Print Results
    console.log('=' .repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total Publications Scanned: ${stats.totalPublications}`);
    console.log(`Publications with "monthly" pricingModel: ${stats.publicationsWithMonthly}`);
    console.log(`Total Records with "monthly" pricingModel: ${stats.totalMonthlyRecords}\n`);

    if (stats.totalMonthlyRecords > 0) {
      console.log('📈 BREAKDOWN BY CHANNEL:');
      console.log('-'.repeat(80));
      const sortedChannels = Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1]);
      for (const [channel, count] of sortedChannels) {
        console.log(`  ${channel.padEnd(20)} ${count.toString().padStart(4)} records`);
      }
      console.log();

      console.log('🔍 FIRST 20 EXAMPLES:');
      console.log('-'.repeat(80));
      stats.details.slice(0, 20).forEach((detail, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. ${detail.publicationName} (ID: ${detail.publicationId})`);
        console.log(`     Channel: ${detail.channel}`);
        console.log(`     Item: ${detail.itemName}`);
        console.log(`     Flat Rate: $${detail.flatRate || 0}`);
        console.log(`     Location: ${detail.location}`);
        console.log();
      });

      if (stats.details.length > 20) {
        console.log(`... and ${stats.details.length - 20} more records\n`);
      }
    } else {
      console.log('⚠️  No records found with "monthly" pricingModel!\n');
    }

    console.log('=' .repeat(80) + '\n');

    // Save detailed report
    const fs = await import('fs');
    const reportPath = `reports/monthly-pricing-analysis-${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await closeConnection();
    process.exit(1);
  }
}

countMonthlyPricingModel();

