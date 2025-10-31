import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function checkRadioHubPricing() {
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

    console.log(`📊 Found ${publications.length} publications\n`);

    let totalRadioAds = 0;
    let totalRadioAdsWithHubPricing = 0;
    let radioShowAds = 0;
    let radioShowAdsWithHubPricing = 0;
    let legacyRadioAds = 0;
    let legacyRadioAdsWithHubPricing = 0;

    publications.forEach((pub: any) => {
      const pubName = pub.name || 'Unnamed';
      console.log(`\n📰 ${pubName}`);
      
      if (pub.distributionChannels?.radioStations) {
        pub.distributionChannels.radioStations.forEach((radio: any, idx: number) => {
          const callSign = radio.callSign || `Station ${idx + 1}`;
          console.log(`  📻 ${callSign}`);
          
          // Check show-based ads
          if (radio.shows && radio.shows.length > 0) {
            radio.shows.forEach((show: any, showIdx: number) => {
              console.log(`    🎙️  ${show.name} (${show.frequency})`);
              
              if (show.advertisingOpportunities) {
                show.advertisingOpportunities.forEach((ad: any, adIdx: number) => {
                  totalRadioAds++;
                  radioShowAds++;
                  
                  const hasHubPricing = ad.hubPricing && ad.hubPricing.length > 0;
                  
                  console.log(`      - ${ad.name}: ${hasHubPricing ? '✅ HAS hub pricing' : '❌ NO hub pricing'}`);
                  
                  if (hasHubPricing) {
                    totalRadioAdsWithHubPricing++;
                    radioShowAdsWithHubPricing++;
                    
                    ad.hubPricing.forEach((hub: any) => {
                      console.log(`        Hub: ${hub.hubName || hub.hubId}`);
                      console.log(`        Pricing: ${JSON.stringify(hub.pricing)}`);
                    });
                  }
                });
              }
            });
          }
          
          // Check legacy station-level ads (only if no shows)
          if ((!radio.shows || radio.shows.length === 0) && radio.advertisingOpportunities) {
            console.log(`    📼 Legacy ads (station-level)`);
            radio.advertisingOpportunities.forEach((ad: any, adIdx: number) => {
              totalRadioAds++;
              legacyRadioAds++;
              
              const hasHubPricing = ad.hubPricing && ad.hubPricing.length > 0;
              
              console.log(`      - ${ad.name}: ${hasHubPricing ? '✅ HAS hub pricing' : '❌ NO hub pricing'}`);
              
              if (hasHubPricing) {
                totalRadioAdsWithHubPricing++;
                legacyRadioAdsWithHubPricing++;
                
                ad.hubPricing.forEach((hub: any) => {
                  console.log(`        Hub: ${hub.hubName || hub.hubId}`);
                  console.log(`        Pricing: ${JSON.stringify(hub.pricing)}`);
                });
              }
            });
          }
        });
      }
    });

    console.log('\n\n📊 Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Radio Ads: ${totalRadioAds}`);
    console.log(`  - Show-based: ${radioShowAds}`);
    console.log(`  - Legacy: ${legacyRadioAds}`);
    console.log('');
    console.log(`Radio Ads with Hub Pricing: ${totalRadioAdsWithHubPricing} (${totalRadioAds > 0 ? Math.round(totalRadioAdsWithHubPricing / totalRadioAds * 100) : 0}%)`);
    console.log(`  - Show-based: ${radioShowAdsWithHubPricing}`);
    console.log(`  - Legacy: ${legacyRadioAdsWithHubPricing}`);
    console.log('');
    console.log(`Radio Ads WITHOUT Hub Pricing: ${totalRadioAds - totalRadioAdsWithHubPricing}`);

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
  checkRadioHubPricing()
    .then(() => {
      console.log('\n✨ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Check failed:', error);
      process.exit(1);
    });
}

export { checkRadioHubPricing };

