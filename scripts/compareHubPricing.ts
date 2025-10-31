import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';

async function compareHubPricing() {
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

    console.log(`📊 Analyzing hub pricing vs default pricing...\n`);

    let higherCount = 0;
    let lowerCount = 0;
    let equalCount = 0;

    for (const pub of publications) {
      const pubName = pub.name || 'Unnamed';
      
      // Check Radio
      if (pub.distributionChannels?.radioStations) {
        for (const radio of pub.distributionChannels.radioStations) {
          if (radio.shows && radio.shows.length > 0) {
            for (const show of radio.shows) {
              if (show.advertisingOpportunities) {
                for (const ad of show.advertisingOpportunities) {
                  if (ad.hubPricing && ad.hubPricing.length > 0) {
                    const defaultPrice = ad.pricing?.flatRate || 0;
                    
                    ad.hubPricing.forEach((hubPrice: any) => {
                      const hubFlatRate = hubPrice.pricing?.flatRate || 0;
                      
                      if (hubFlatRate > defaultPrice) {
                        console.log(`\n🔴 RADIO - Hub pricing HIGHER than default:`);
                        console.log(`   📰 ${pubName}`);
                        console.log(`   📻 ${radio.callSign} - ${show.name}`);
                        console.log(`   🎯 ${ad.name}`);
                        console.log(`   💰 Default: $${defaultPrice} → Hub: $${hubFlatRate} (${hubPrice.hubName})`);
                        higherCount++;
                      } else if (hubFlatRate < defaultPrice) {
                        lowerCount++;
                      } else {
                        equalCount++;
                      }
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Check Podcasts
      if (pub.distributionChannels?.podcasts) {
        for (const podcast of pub.distributionChannels.podcasts) {
          if (podcast.advertisingOpportunities) {
            for (const ad of podcast.advertisingOpportunities) {
              if (ad.hubPricing && ad.hubPricing.length > 0) {
                const defaultPrice = ad.pricing?.flatRate || 0;
                
                ad.hubPricing.forEach((hubPrice: any) => {
                  const hubFlatRate = hubPrice.pricing?.flatRate || 0;
                  
                  if (hubFlatRate > defaultPrice) {
                    console.log(`\n🔴 PODCAST - Hub pricing HIGHER than default:`);
                    console.log(`   📰 ${pubName}`);
                    console.log(`   🎙️  ${podcast.name}`);
                    console.log(`   🎯 ${ad.name}`);
                    console.log(`   💰 Default: $${defaultPrice} → Hub: $${hubFlatRate} (${hubPrice.hubName})`);
                    higherCount++;
                  } else if (hubFlatRate < defaultPrice) {
                    lowerCount++;
                  } else {
                    equalCount++;
                  }
                });
              }
            }
          }
        }
      }

      // Check other channels (Website, Newsletter, Print, etc.)
      const channels = [
        { key: 'website', name: 'Website', icon: '🌐', ads: pub.distributionChannels?.website?.advertisingOpportunities },
        { key: 'newsletters', name: 'Newsletter', icon: '📧', ads: pub.distributionChannels?.newsletters?.flatMap((n: any) => n.advertisingOpportunities || []) },
        { key: 'print', name: 'Print', icon: '📰', ads: Array.isArray(pub.distributionChannels?.print) ? pub.distributionChannels.print.flatMap((p: any) => p.advertisingOpportunities || []) : pub.distributionChannels?.print?.advertisingOpportunities },
      ];

      for (const channel of channels) {
        if (channel.ads) {
          for (const ad of channel.ads) {
            if (ad && ad.hubPricing && ad.hubPricing.length > 0) {
              const defaultPrice = ad.pricing?.flatRate || 0;
              
              ad.hubPricing.forEach((hubPrice: any) => {
                const hubFlatRate = hubPrice.pricing?.flatRate || 0;
                
                if (hubFlatRate > defaultPrice) {
                  console.log(`\n🔴 ${channel.name.toUpperCase()} - Hub pricing HIGHER than default:`);
                  console.log(`   📰 ${pubName}`);
                  console.log(`   ${channel.icon} ${ad.name}`);
                  console.log(`   💰 Default: $${defaultPrice} → Hub: $${hubFlatRate} (${hubPrice.hubName})`);
                  higherCount++;
                } else if (hubFlatRate < defaultPrice) {
                  lowerCount++;
                } else {
                  equalCount++;
                }
              });
            }
          }
        }
      }
    }

    console.log('\n\n📊 Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`🔴 Hub pricing HIGHER: ${higherCount}`);
    console.log(`🟢 Hub pricing LOWER: ${lowerCount}`);
    console.log(`🟡 Hub pricing EQUAL: ${equalCount}`);
    console.log('');
    
    if (higherCount > 0) {
      console.log('⚠️  WARNING: Some hub pricing is higher than default pricing!');
      console.log('   Hub pricing should typically be equal to or lower than default.');
    } else {
      console.log('✅ All hub pricing is equal to or lower than default pricing.');
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
  compareHubPricing()
    .then(() => {
      console.log('\n✨ Analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

export { compareHubPricing };

