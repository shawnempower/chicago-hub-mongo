import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function fixRadioHubPricingModels() {
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

    for (const pub of publications) {
      const pubName = pub.name || 'Unnamed';
      let pubUpdated = false;

      if (pub.distributionChannels?.radioStations) {
        for (const radio of pub.distributionChannels.radioStations) {
          if (radio.shows && radio.shows.length > 0) {
            for (const show of radio.shows) {
              if (show.advertisingOpportunities) {
                for (const ad of show.advertisingOpportunities) {
                  if (ad.hubPricing && Array.isArray(ad.hubPricing)) {
                    for (const hubPrice of ad.hubPricing) {
                      // Check if hubPricing is missing pricingModel
                      if (hubPrice.pricing && !hubPrice.pricing.pricingModel) {
                        // Get the default pricing model
                        const defaultPricingModel = ad.pricing?.pricingModel || 'per_spot';
                        
                        console.log(`📝 ${pubName} - ${radio.callSign} - ${show.name} - ${ad.name}`);
                        console.log(`   Hub: ${hubPrice.hubName || hubPrice.hubId}`);
                        console.log(`   Before: ${JSON.stringify(hubPrice.pricing)}`);
                        
                        // Add the missing pricingModel
                        hubPrice.pricing.pricingModel = defaultPricingModel;
                        
                        console.log(`   After:  ${JSON.stringify(hubPrice.pricing)}`);
                        console.log(`   ✅ Added pricingModel: ${defaultPricingModel}\n`);
                        
                        pubUpdated = true;
                        fixedAdsCount++;
                      }
                    }
                  }
                }
              }
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
    console.log(`Radio ads fixed: ${fixedAdsCount}`);

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
  fixRadioHubPricingModels()
    .then(() => {
      console.log('\n✨ Fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}

export { fixRadioHubPricingModels };

