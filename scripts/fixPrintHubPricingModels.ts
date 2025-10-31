import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function fixPrintHubPricingModels() {
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

      // Get print as array (handle both object and array formats)
      const printArray = Array.isArray(pub.distributionChannels?.print) 
        ? pub.distributionChannels.print 
        : pub.distributionChannels?.print ? [pub.distributionChannels.print] : [];

      for (const print of printArray) {
        if (print.advertisingOpportunities) {
          for (const ad of print.advertisingOpportunities) {
            if (ad.hubPricing && Array.isArray(ad.hubPricing)) {
              for (const hubPrice of ad.hubPricing) {
                // Check if hubPricing is missing pricingModel
                if (hubPrice.pricing && !hubPrice.pricing.pricingModel) {
                  // Get the default pricing model
                  let defaultPricingModel = 'per_ad'; // Default for print
                  
                  if (ad.pricing) {
                    if (Array.isArray(ad.pricing) && ad.pricing.length > 0 && ad.pricing[0].pricing) {
                      defaultPricingModel = ad.pricing[0].pricing.pricingModel || defaultPricingModel;
                    } else if (ad.pricing.pricingModel) {
                      defaultPricingModel = ad.pricing.pricingModel;
                    }
                  }
                  
                  console.log(`📝 ${pubName} - ${print.name || 'Print Edition'}`);
                  console.log(`   Ad: ${ad.name}`);
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
    console.log(`Print ads fixed: ${fixedAdsCount}`);

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
  fixPrintHubPricingModels()
    .then(() => {
      console.log('\n✨ Fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}

export { fixPrintHubPricingModels };

