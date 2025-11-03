import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function findMissingWebsitePricingModels() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db(DATABASE_NAME);
    const publications = await db.collection('publications').find({}).toArray();

    console.log(`📊 Finding website ads with missing pricingModel in hub pricing...\n`);

    let foundCount = 0;

    for (const pub of publications) {
      const pubName = pub.name || 'Unnamed';

      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        for (const ad of pub.distributionChannels.website.advertisingOpportunities) {
          if (ad.hubPricing && Array.isArray(ad.hubPricing) && ad.hubPricing.length > 0) {
            ad.hubPricing.forEach((hubPrice: any, idx: number) => {
              if (hubPrice.pricing && !hubPrice.pricing.pricingModel) {
                foundCount++;
                console.log(`\n🔴 FOUND #${foundCount}:`);
                console.log(`   Publication: ${pubName}`);
                console.log(`   Ad: ${ad.name}`);
                console.log(`   Hub: ${hubPrice.hubName || hubPrice.hubId}`);
                console.log(`\n   DEFAULT PRICING:`);
                if (Array.isArray(ad.pricing)) {
                  console.log(`     [Array with ${ad.pricing.length} tiers]`);
                  ad.pricing.forEach((tier: any, tierIdx: number) => {
                    console.log(`     Tier ${tierIdx + 1}: ${JSON.stringify(tier, null, 2).split('\n').join('\n       ')}`);
                  });
                } else {
                  console.log(`     ${JSON.stringify(ad.pricing, null, 2).split('\n').join('\n     ')}`);
                }
                console.log(`\n   HUB PRICING (MISSING pricingModel):`);
                console.log(`     ${JSON.stringify(hubPrice.pricing, null, 2).split('\n').join('\n     ')}`);
              }
            });
          }
        }
      }
    }

    console.log('\n\n═══════════════════════════════════════');
    if (foundCount === 0) {
      console.log('✅ No website ads missing pricingModel!');
    } else {
      console.log(`Found ${foundCount} website ad(s) with missing pricingModel in hub pricing`);
    }

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
  findMissingWebsitePricingModels()
    .then(() => {
      console.log('\n✨ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Check failed:', error);
      process.exit(1);
    });
}

export { findMissingWebsitePricingModels };

