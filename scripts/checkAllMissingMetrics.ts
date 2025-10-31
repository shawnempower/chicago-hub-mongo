import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function checkAllMissingMetrics() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({}).toArray();
    
    console.log(`\n🔍 Checking ${pubs.length} publications across all inventory types...\n`);
    
    const summary: any = {
      newsletters: { total: 0, missing: 0, pubs: [] },
      website: { total: 0, missing: 0, pubs: [] },
      podcasts: { total: 0, missing: 0, pubs: [] },
      print: { total: 0, missing: 0, pubs: [] },
      socialMedia: { total: 0, missing: 0, pubs: [] },
      streaming: { total: 0, missing: 0, pubs: [] },
      radio: { total: 0, missing: 0, pubs: [] }
    };
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const channels = pub.distributionChannels || {};
      
      // Newsletters
      channels.newsletters?.forEach((newsletter: any) => {
        newsletter.advertisingOpportunities?.forEach((ad: any) => {
          summary.newsletters.total++;
          if (!ad.performanceMetrics) {
            summary.newsletters.missing++;
            if (!summary.newsletters.pubs.includes(pubName)) {
              summary.newsletters.pubs.push(pubName);
            }
          }
        });
      });
      
      // Website
      channels.website?.advertisingOpportunities?.forEach((ad: any) => {
        summary.website.total++;
        if (!ad.performanceMetrics) {
          summary.website.missing++;
          if (!summary.website.pubs.includes(pubName)) {
            summary.website.pubs.push(pubName);
          }
        }
      });
      
      // Podcasts
      channels.podcasts?.forEach((podcast: any) => {
        podcast.advertisingOpportunities?.forEach((ad: any) => {
          summary.podcasts.total++;
          if (!ad.performanceMetrics) {
            summary.podcasts.missing++;
            if (!summary.podcasts.pubs.includes(pubName)) {
              summary.podcasts.pubs.push(pubName);
            }
          }
        });
      });
      
      // Print
      const printArray = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      printArray.forEach((print: any) => {
        print.advertisingOpportunities?.forEach((ad: any) => {
          summary.print.total++;
          if (!ad.performanceMetrics) {
            summary.print.missing++;
            if (!summary.print.pubs.includes(pubName)) {
              summary.print.pubs.push(pubName);
            }
          }
        });
      });
      
      // Social Media
      channels.socialMedia?.forEach((profile: any) => {
        profile.advertisingOpportunities?.forEach((ad: any) => {
          summary.socialMedia.total++;
          if (!ad.performanceMetrics) {
            summary.socialMedia.missing++;
            if (!summary.socialMedia.pubs.includes(pubName)) {
              summary.socialMedia.pubs.push(pubName);
            }
          }
        });
      });
      
      // Streaming
      channels.streamingVideo?.forEach((channel: any) => {
        channel.advertisingOpportunities?.forEach((ad: any) => {
          summary.streaming.total++;
          if (!ad.performanceMetrics) {
            summary.streaming.missing++;
            if (!summary.streaming.pubs.includes(pubName)) {
              summary.streaming.pubs.push(pubName);
            }
          }
        });
      });
      
      // Radio (check show-based ads, skip legacy station-level ads to prevent double-counting)
      channels.radioStations?.forEach((station: any) => {
        // New show-based ads (preferred)
        if (station.shows && station.shows.length > 0) {
          station.shows.forEach((show: any) => {
            show.advertisingOpportunities?.forEach((ad: any) => {
              summary.radio.total++;
              if (!ad.performanceMetrics) {
                summary.radio.missing++;
                if (!summary.radio.pubs.includes(pubName)) {
                  summary.radio.pubs.push(pubName);
                }
              }
            });
          });
        } else {
          // Legacy station-level ads (only if no shows exist)
          station.advertisingOpportunities?.forEach((ad: any) => {
            summary.radio.total++;
            if (!ad.performanceMetrics) {
              summary.radio.missing++;
              if (!summary.radio.pubs.includes(pubName)) {
                summary.radio.pubs.push(pubName);
              }
            }
          });
        }
      });
    });
    
    // Print summary
    console.log('📊 Performance Metrics Coverage Summary:\n');
    
    Object.entries(summary).forEach(([type, data]: [string, any]) => {
      if (data.total > 0) {
        const percentage = ((data.total - data.missing) / data.total * 100).toFixed(1);
        const icon = data.missing === 0 ? '✅' : '⚠️';
        console.log(`${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}: ${data.total - data.missing}/${data.total} ads (${percentage}%)`);
        if (data.missing > 0) {
          console.log(`   Missing in: ${data.pubs.join(', ')}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkAllMissingMetrics();
