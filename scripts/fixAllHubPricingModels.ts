import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function fixAllHubPricingModels() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db(DATABASE_NAME);
    const publicationsCollection = db.collection('publications');
    const publications = await publicationsCollection.find({}).toArray();

    console.log(`📊 Found ${publications.length} publications\n`);

    let updatedCount = 0;
    let fixedAdsCount = 0;
    const fixedByChannel: Record<string, number> = {};

    for (const pub of publications) {
      const pubName = pub.name || 'Unnamed';
      let pubUpdated = false;

      // Helper function to fix hub pricing for an ad
      const fixAdHubPricing = (ad: any, channelName: string, adName: string, location: string) => {
        if (ad.hubPricing && Array.isArray(ad.hubPricing)) {
          for (const hubPrice of ad.hubPricing) {
            if (hubPrice.pricing && !hubPrice.pricing.pricingModel) {
              // Get the default pricing model
              let defaultPricingModel = 'per_ad'; // fallback
              
              if (ad.pricing) {
                if (Array.isArray(ad.pricing) && ad.pricing.length > 0 && ad.pricing[0].pricing) {
                  defaultPricingModel = ad.pricing[0].pricing.pricingModel || defaultPricingModel;
                } else if (ad.pricing.pricingModel) {
                  defaultPricingModel = ad.pricing.pricingModel;
                }
              }
              
              console.log(`📝 ${pubName} - ${location}`);
              console.log(`   Ad: ${adName}`);
              console.log(`   Hub: ${hubPrice.hubName || hubPrice.hubId}`);
              console.log(`   Before: ${JSON.stringify(hubPrice.pricing)}`);
              
              // Add the missing pricingModel
              hubPrice.pricing.pricingModel = defaultPricingModel;
              
              console.log(`   After:  ${JSON.stringify(hubPrice.pricing)}`);
              console.log(`   ✅ Added pricingModel: ${defaultPricingModel}\n`);
              
              pubUpdated = true;
              fixedAdsCount++;
              fixedByChannel[channelName] = (fixedByChannel[channelName] || 0) + 1;
            }
          }
        }
      };

      // Radio
      if (pub.distributionChannels?.radioStations) {
        for (const radio of pub.distributionChannels.radioStations) {
          if (radio.shows && radio.shows.length > 0) {
            for (const show of radio.shows) {
              if (show.advertisingOpportunities) {
                for (const ad of show.advertisingOpportunities) {
                  fixAdHubPricing(ad, 'Radio', ad.name, `${radio.callSign} - ${show.name}`);
                }
              }
            }
          }
        }
      }

      // Podcasts
      if (pub.distributionChannels?.podcasts) {
        for (const podcast of pub.distributionChannels.podcasts) {
          if (podcast.advertisingOpportunities) {
            for (const ad of podcast.advertisingOpportunities) {
              fixAdHubPricing(ad, 'Podcast', ad.name, podcast.name);
            }
          }
        }
      }

      // Print
      const printArray = Array.isArray(pub.distributionChannels?.print) 
        ? pub.distributionChannels.print 
        : pub.distributionChannels?.print ? [pub.distributionChannels.print] : [];
      
      for (const print of printArray) {
        if (print.advertisingOpportunities) {
          for (const ad of print.advertisingOpportunities) {
            fixAdHubPricing(ad, 'Print', ad.name, print.name || 'Print Edition');
          }
        }
      }

      // Website
      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        for (const ad of pub.distributionChannels.website.advertisingOpportunities) {
          fixAdHubPricing(ad, 'Website', ad.name, 'Website');
        }
      }

      // Newsletters
      if (pub.distributionChannels?.newsletters) {
        for (const newsletter of pub.distributionChannels.newsletters) {
          if (newsletter.advertisingOpportunities) {
            for (const ad of newsletter.advertisingOpportunities) {
              fixAdHubPricing(ad, 'Newsletter', ad.name, newsletter.name);
            }
          }
        }
      }

      // Social Media
      if (pub.distributionChannels?.socialMedia) {
        for (const social of pub.distributionChannels.socialMedia) {
          if (social.advertisingOpportunities) {
            for (const ad of social.advertisingOpportunities) {
              fixAdHubPricing(ad, 'Social Media', ad.name, social.platform);
            }
          }
        }
      }

      // Streaming Video
      if (pub.distributionChannels?.streamingVideo) {
        for (const streaming of pub.distributionChannels.streamingVideo) {
          if (streaming.advertisingOpportunities) {
            for (const ad of streaming.advertisingOpportunities) {
              fixAdHubPricing(ad, 'Streaming', ad.name, streaming.platform || streaming.name);
            }
          }
        }
      }

      // Events
      if (pub.distributionChannels?.events) {
        for (const event of pub.distributionChannels.events) {
          if (event.advertisingOpportunities) {
            for (const ad of event.advertisingOpportunities) {
              fixAdHubPricing(ad, 'Event', ad.name, event.name);
            }
          }
        }
      }

      // Update publication if changes were made
      if (pubUpdated) {
        await publicationsCollection.updateOne(
          { _id: pub._id },
          { $set: { distributionChannels: pub.distributionChannels } }
        );
        updatedCount++;
        console.log(`✅ Updated publication: ${pubName}\n`);
      }
    }

    console.log('\n📊 Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Publications updated: ${updatedCount}`);
    console.log(`Total ads fixed: ${fixedAdsCount}`);
    console.log('\nBy channel:');
    Object.entries(fixedByChannel).forEach(([channel, count]) => {
      console.log(`  ${channel}: ${count} ads`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fixAllHubPricingModels()
    .then(() => {
      console.log('\n✨ Fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}

export { fixAllHubPricingModels };

