import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function checkPricingFields(publicationName: string = 'Chicago Sun-Times') {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    console.log(`🔍 Searching for: ${publicationName}`);

    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publication = await publicationsCollection.findOne({ 
      'basicInfo.publicationName': { $regex: publicationName, $options: 'i' }
    });

    if (!publication) {
      console.log('❌ Publication not found');
      return;
    }

    console.log(`\n📰 Found: ${publication.basicInfo.publicationName}`);
    console.log('=' .repeat(80));

    // Helper to check pricing object
    const checkPricing = (pricing: any, label: string) => {
      if (!pricing) return;
      
      console.log(`\n${label}:`);
      console.log(JSON.stringify(pricing, null, 2));
      
      const hasLegacyFields = !!(
        pricing.cpm || pricing.perPost || pricing.perStory || 
        pricing.perSend || pricing.perSpot || pricing.monthly || pricing.weekly
      );
      
      const hasModernFields = !!(pricing.flatRate && pricing.pricingModel);
      
      console.log(`  📊 Has legacy fields: ${hasLegacyFields ? '❌ YES' : '✅ NO'}`);
      console.log(`  📊 Has modern fields: ${hasModernFields ? '✅ YES' : '❌ NO'}`);
      
      if (hasLegacyFields) {
        console.log(`  🔍 Legacy fields found:`);
        if (pricing.cpm) console.log(`     - cpm: ${pricing.cpm}`);
        if (pricing.perPost) console.log(`     - perPost: ${pricing.perPost}`);
        if (pricing.perStory) console.log(`     - perStory: ${pricing.perStory}`);
        if (pricing.perSend) console.log(`     - perSend: ${pricing.perSend}`);
        if (pricing.perSpot) console.log(`     - perSpot: ${pricing.perSpot}`);
        if (pricing.monthly) console.log(`     - monthly: ${pricing.monthly}`);
        if (pricing.weekly) console.log(`     - weekly: ${pricing.weekly}`);
      }
      
      if (hasModernFields) {
        console.log(`  ✅ Modern fields:`);
        console.log(`     - flatRate: ${pricing.flatRate}`);
        console.log(`     - pricingModel: ${pricing.pricingModel}`);
      }
    };

    const channels = publication.distributionChannels;
    
    // Check Website ads
    if (channels?.website?.advertisingOpportunities) {
      console.log('\n\n🌐 WEBSITE ADVERTISING:');
      console.log('─'.repeat(80));
      channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
        checkPricing(ad.pricing, `Website Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
        
        // Check hubPricing too
        if (ad.hubPricing && ad.hubPricing.length > 0) {
          ad.hubPricing.forEach((hub: any, hubIdx: number) => {
            checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
          });
        }
      });
    }

    // Check Newsletter ads
    if (channels?.newsletters) {
      console.log('\n\n📧 NEWSLETTER ADVERTISING:');
      console.log('─'.repeat(80));
      channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
        if (newsletter.advertisingOpportunities) {
          newsletter.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Newsletter ${nlIdx + 1} "${newsletter.name}" - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    // Check Print ads
    if (channels?.print) {
      console.log('\n\n📰 PRINT ADVERTISING:');
      console.log('─'.repeat(80));
      const prints = Array.isArray(channels.print) ? channels.print : [channels.print];
      prints.forEach((print: any, printIdx: number) => {
        if (print.advertisingOpportunities) {
          print.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `Print ${printIdx + 1} - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    // Check Social Media ads
    if (channels?.socialMedia) {
      console.log('\n\n📱 SOCIAL MEDIA ADVERTISING:');
      console.log('─'.repeat(80));
      channels.socialMedia.forEach((social: any, socialIdx: number) => {
        if (social.advertisingOpportunities) {
          social.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `${social.platform} - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    // Check Radio ads
    if (channels?.radioStations) {
      console.log('\n\n📻 RADIO ADVERTISING:');
      console.log('─'.repeat(80));
      channels.radioStations.forEach((radio: any, radioIdx: number) => {
        if (radio.advertisingOpportunities) {
          radio.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `${radio.callSign} - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    // Check Podcasts
    if (channels?.podcasts) {
      console.log('\n\n🎙️ PODCAST ADVERTISING:');
      console.log('─'.repeat(80));
      channels.podcasts.forEach((podcast: any, podIdx: number) => {
        if (podcast.advertisingOpportunities) {
          podcast.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `${podcast.name} - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    // Check Streaming
    if (channels?.streamingVideo) {
      console.log('\n\n📺 STREAMING VIDEO ADVERTISING:');
      console.log('─'.repeat(80));
      channels.streamingVideo.forEach((stream: any, streamIdx: number) => {
        if (stream.advertisingOpportunities) {
          stream.advertisingOpportunities.forEach((ad: any, idx: number) => {
            checkPricing(ad.pricing, `${stream.name} - Ad ${idx + 1}: ${ad.name || 'Unnamed'}`);
            
            if (ad.hubPricing && ad.hubPricing.length > 0) {
              ad.hubPricing.forEach((hub: any, hubIdx: number) => {
                checkPricing(hub.pricing, `  └─ Hub ${hubIdx + 1} (${hub.hubName})`);
              });
            }
          });
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Pricing check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

const pubName = process.argv[2] || 'Chicago Sun-Times';

checkPricingFields(pubName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });

