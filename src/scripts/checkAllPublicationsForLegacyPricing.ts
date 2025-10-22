import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function checkAllPublicationsForLegacyPricing() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publications = await publicationsCollection.find({}).toArray();
    
    console.log(`📊 Checking ${publications.length} publications for legacy pricing fields...\n`);
    console.log('='.repeat(80));

    let totalPublications = 0;
    let publicationsWithLegacy = 0;
    let totalLegacyFields = 0;
    const legacyPublications: any[] = [];

    for (const publication of publications) {
      totalPublications++;
      const pubName = publication.basicInfo?.publicationName || 'Unnamed';
      let hasLegacy = false;
      let legacyCount = 0;

      const checkPricing = (pricing: any, path: string) => {
        if (!pricing) return;
        
        const legacyFields = ['cpm', 'perPost', 'perStory', 'perSend', 'perSpot', 'monthly', 'weekly', 'perAd'];
        const foundLegacy: string[] = [];
        
        for (const field of legacyFields) {
          if (pricing[field] !== undefined && pricing[field] !== null) {
            foundLegacy.push(field);
          }
        }
        
        if (foundLegacy.length > 0) {
          hasLegacy = true;
          legacyCount += foundLegacy.length;
          console.log(`  ❌ ${path}: ${foundLegacy.join(', ')}`);
        }
      };

      const channels = publication.distributionChannels;
      
      // Check all channels
      if (channels?.website?.advertisingOpportunities) {
        channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
          checkPricing(ad.pricing, `Website Ad ${idx + 1}`);
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            checkPricing(hub.pricing, `Website Ad ${idx + 1} > Hub ${hubIdx + 1}`);
          });
        });
      }

      if (channels?.newsletters) {
        channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
          newsletter.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Newsletter ${nlIdx + 1} > Ad ${idx + 1}`);
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Newsletter ${nlIdx + 1} > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (channels?.print) {
        const prints = Array.isArray(channels.print) ? channels.print : [channels.print];
        prints.forEach((print: any, printIdx: number) => {
          print.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            if (Array.isArray(ad.pricing)) {
              ad.pricing.forEach((tier: any, tierIdx: number) => {
                checkPricing(tier.pricing, `Print ${printIdx + 1} > Ad ${idx + 1} > Tier ${tierIdx + 1}`);
              });
            } else {
              checkPricing(ad.pricing, `Print ${printIdx + 1} > Ad ${idx + 1}`);
            }
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Print ${printIdx + 1} > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (channels?.socialMedia) {
        channels.socialMedia.forEach((social: any, socialIdx: number) => {
          social.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Social (${social.platform}) > Ad ${idx + 1}`);
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Social (${social.platform}) > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (channels?.radioStations) {
        channels.radioStations.forEach((radio: any, radioIdx: number) => {
          radio.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Radio (${radio.callSign}) > Ad ${idx + 1}`);
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Radio (${radio.callSign}) > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (channels?.podcasts) {
        channels.podcasts.forEach((podcast: any, podIdx: number) => {
          podcast.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Podcast (${podcast.name}) > Ad ${idx + 1}`);
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Podcast (${podcast.name}) > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (channels?.streamingVideo) {
        channels.streamingVideo.forEach((stream: any, streamIdx: number) => {
          stream.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Streaming (${stream.name}) > Ad ${idx + 1}`);
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              checkPricing(hub.pricing, `Streaming (${stream.name}) > Ad ${idx + 1} > Hub ${hubIdx + 1}`);
            });
          });
        });
      }

      if (hasLegacy) {
        publicationsWithLegacy++;
        totalLegacyFields += legacyCount;
        legacyPublications.push({ name: pubName, count: legacyCount });
        console.log(`\n🔴 "${pubName}" - ${legacyCount} legacy field(s) found\n`);
      } else {
        console.log(`✅ "${pubName}" - Clean (no legacy fields)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Publications Checked: ${totalPublications}`);
    console.log(`Publications with Legacy Pricing: ${publicationsWithLegacy}`);
    console.log(`Publications with Modern Pricing: ${totalPublications - publicationsWithLegacy}`);
    console.log(`Total Legacy Fields Found: ${totalLegacyFields}`);
    
    if (legacyPublications.length > 0) {
      console.log('\n❌ Publications needing migration:');
      legacyPublications.forEach(pub => {
        console.log(`   - ${pub.name} (${pub.count} legacy fields)`);
      });
    } else {
      console.log('\n✅ ALL PUBLICATIONS ARE USING MODERN PRICING SCHEMA!');
    }

    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAllPublicationsForLegacyPricing()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });

