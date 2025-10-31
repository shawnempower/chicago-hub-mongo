import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function showPricingExamples() {
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

    console.log(`📊 Showing detailed pricing examples...\n`);

    let exampleCount = 0;
    const maxExamples = 10;

    // Show Radio examples
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📻 RADIO EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const pub of publications) {
      if (exampleCount >= 3) break;
      
      if (pub.distributionChannels?.radioStations) {
        for (const radio of pub.distributionChannels.radioStations) {
          if (exampleCount >= 3) break;
          
          if (radio.shows && radio.shows.length > 0) {
            for (const show of radio.shows) {
              if (exampleCount >= 3) break;
              
              if (show.advertisingOpportunities && show.advertisingOpportunities.length > 0) {
                const ad = show.advertisingOpportunities[0]; // Just first ad
                
                console.log(`Example ${exampleCount + 1}:`);
                console.log(`  Publication: ${pub.name || 'Unnamed'}`);
                console.log(`  Station: ${radio.callSign}`);
                console.log(`  Show: ${show.name} (${show.frequency})`);
                console.log(`  Ad: ${ad.name}`);
                console.log(`\n  DEFAULT PRICING:`);
                console.log(`    ${JSON.stringify(ad.pricing, null, 2).split('\n').join('\n    ')}`);
                console.log(`\n  HUB PRICING:`);
                if (ad.hubPricing && ad.hubPricing.length > 0) {
                  ad.hubPricing.forEach((hub: any, idx: number) => {
                    console.log(`    [${idx}] Hub: ${hub.hubName || hub.hubId}`);
                    console.log(`        ${JSON.stringify(hub.pricing, null, 2).split('\n').join('\n        ')}`);
                  });
                } else {
                  console.log(`    (No hub pricing)`);
                }
                console.log('\n');
                exampleCount++;
              }
            }
          }
        }
      }
    }

    // Show Podcast examples
    exampleCount = 0;
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎙️  PODCAST EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const pub of publications) {
      if (exampleCount >= 3) break;
      
      if (pub.distributionChannels?.podcasts) {
        for (const podcast of pub.distributionChannels.podcasts) {
          if (exampleCount >= 3) break;
          
          if (podcast.advertisingOpportunities && podcast.advertisingOpportunities.length > 0) {
            const ad = podcast.advertisingOpportunities[0]; // Just first ad
            
            console.log(`Example ${exampleCount + 1}:`);
            console.log(`  Publication: ${pub.name || 'Unnamed'}`);
            console.log(`  Podcast: ${podcast.name}`);
            console.log(`  Ad: ${ad.name}`);
            console.log(`\n  DEFAULT PRICING:`);
            console.log(`    ${JSON.stringify(ad.pricing, null, 2).split('\n').join('\n    ')}`);
            console.log(`\n  HUB PRICING:`);
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, idx: number) => {
                console.log(`    [${idx}] Hub: ${hub.hubName || hub.hubId}`);
                console.log(`        ${JSON.stringify(hub.pricing, null, 2).split('\n').join('\n        ')}`);
              });
            } else {
              console.log(`    (No hub pricing)`);
            }
            console.log('\n');
            exampleCount++;
          }
        }
      }
    }

    // Show Print examples  
    exampleCount = 0;
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📰 PRINT EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const pub of publications) {
      if (exampleCount >= 2) break;
      
      const printArray = Array.isArray(pub.distributionChannels?.print) 
        ? pub.distributionChannels.print 
        : pub.distributionChannels?.print ? [pub.distributionChannels.print] : [];
      
      for (const print of printArray) {
        if (exampleCount >= 2) break;
        
        if (print.advertisingOpportunities && print.advertisingOpportunities.length > 0) {
          const ad = print.advertisingOpportunities[0]; // Just first ad
          
          console.log(`Example ${exampleCount + 1}:`);
          console.log(`  Publication: ${pub.name || 'Unnamed'}`);
          console.log(`  Print: ${print.name || 'Print Edition'}`);
          console.log(`  Ad: ${ad.name}`);
          console.log(`\n  DEFAULT PRICING:`);
          if (Array.isArray(ad.pricing)) {
            console.log(`    [Array with ${ad.pricing.length} tiers]`);
            ad.pricing.forEach((tier: any, idx: number) => {
              console.log(`    Tier ${idx + 1}: ${JSON.stringify(tier, null, 2).split('\n').join('\n      ')}`);
            });
          } else {
            console.log(`    ${JSON.stringify(ad.pricing, null, 2).split('\n').join('\n    ')}`);
          }
          console.log(`\n  HUB PRICING:`);
          if (ad.hubPricing && ad.hubPricing.length > 0) {
            ad.hubPricing.forEach((hub: any, idx: number) => {
              console.log(`    [${idx}] Hub: ${hub.hubName || hub.hubId}`);
              console.log(`        ${JSON.stringify(hub.pricing, null, 2).split('\n').join('\n        ')}`);
            });
          } else {
            console.log(`    (No hub pricing)`);
          }
          console.log('\n');
          exampleCount++;
        }
      }
    }

    // Show Website example
    exampleCount = 0;
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 WEBSITE EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const pub of publications) {
      if (exampleCount >= 2) break;
      
      if (pub.distributionChannels?.website?.advertisingOpportunities) {
        const ads = pub.distributionChannels.website.advertisingOpportunities;
        if (ads.length > 0) {
          const ad = ads[0];
          
          console.log(`Example ${exampleCount + 1}:`);
          console.log(`  Publication: ${pub.name || 'Unnamed'}`);
          console.log(`  Ad: ${ad.name}`);
          console.log(`\n  DEFAULT PRICING:`);
          console.log(`    ${JSON.stringify(ad.pricing, null, 2).split('\n').join('\n    ')}`);
          console.log(`\n  HUB PRICING:`);
          if (ad.hubPricing && ad.hubPricing.length > 0) {
            ad.hubPricing.forEach((hub: any, idx: number) => {
              console.log(`    [${idx}] Hub: ${hub.hubName || hub.hubId}`);
              console.log(`        ${JSON.stringify(hub.pricing, null, 2).split('\n').join('\n        ')}`);
            });
          } else {
            console.log(`    (No hub pricing)`);
          }
          console.log('\n');
          exampleCount++;
        }
      }
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
  showPricingExamples()
    .then(() => {
      console.log('\n✨ Examples shown!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

export { showPricingExamples };

