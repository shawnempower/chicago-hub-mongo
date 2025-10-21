const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';

async function analyzePricingContext() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('publications');
    
    console.log('='.repeat(70));
    console.log('DETAILED PRICING ANALYSIS');
    console.log('='.repeat(70));
    
    // Look at Chicago Reader social media - claimed to have "flat" in hub pricing
    const reader = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /^Chicago Reader$/i }
    });
    
    if (reader?.distributionChannels?.socialMedia) {
      console.log('\n📱 Chicago Reader - Social Media (Claimed Issue)');
      console.log('='.repeat(70));
      const social = reader.distributionChannels.socialMedia;
      social.forEach((profile, pIndex) => {
        console.log(`\nProfile ${pIndex + 1}: ${profile.platform}`);
        profile.advertisingOpportunities?.forEach((ad, aIndex) => {
          console.log(`\n  Ad: ${ad.name}`);
          console.log(`  Default pricingModel: ${ad.pricing?.pricingModel}`);
          console.log(`  Default flatRate: ${ad.pricing?.flatRate}`);
          
          if (ad.hubPricing) {
            ad.hubPricing.forEach((hub, hIndex) => {
              console.log(`  Hub ${hIndex + 1} (${hub.hubName}):`);
              console.log(`    pricingModel: ${hub.pricing?.pricingModel}`);
              console.log(`    flatRate: ${hub.pricing?.flatRate}`);
            });
          }
        });
      });
    }
    
    // Look at CHIRP newsletter - using "monthly"
    const chirp = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /CHIRP Radio/i }
    });
    
    if (chirp?.distributionChannels?.newsletters) {
      console.log('\n\n📧 CHIRP Radio - Newsletter (Using "monthly")');
      console.log('='.repeat(70));
      const newsletter = chirp.distributionChannels.newsletters[0];
      console.log(`Newsletter: ${newsletter.name}`);
      console.log(`Frequency: ${newsletter.frequency}`);
      
      newsletter.advertisingOpportunities?.forEach((ad, aIndex) => {
        console.log(`\n  Ad: ${ad.name}`);
        console.log(`  pricingModel: ${ad.pricing?.pricingModel}`);
        console.log(`  flatRate: ${ad.pricing?.flatRate}`);
        console.log(`  Analysis: Is this ad sold monthly or per-send?`);
      });
    }
    
    // Look at CHIRP radio - using "flat"
    if (chirp?.distributionChannels?.radioStations) {
      console.log('\n\n📻 CHIRP Radio - Radio Station (Using "flat")');
      console.log('='.repeat(70));
      const radio = chirp.distributionChannels.radioStations[0];
      console.log(`Station: ${radio.callSign}`);
      
      radio.advertisingOpportunities?.slice(0, 3).forEach((ad, aIndex) => {
        console.log(`\n  Ad: ${ad.name}`);
        console.log(`  pricingModel: ${ad.pricing?.pricingModel}`);
        console.log(`  flatRate: ${ad.pricing?.flatRate}`);
        console.log(`  frequency: ${ad.pricing?.frequency}`);
        
        if (ad.hubPricing) {
          console.log(`  Hub pricing entries: ${ad.hubPricing.length}`);
          ad.hubPricing.slice(0, 1).forEach((hub) => {
            console.log(`    ${hub.hubName}: ${hub.pricing?.pricingModel} - $${hub.pricing?.flatRate}`);
          });
        }
        
        console.log(`  Analysis: Name is "${ad.name}"`);
        if (ad.name.includes('A La Carte')) {
          console.log(`    → This might be per-spot pricing (individual spots)`);
        } else if (ad.name.includes('Bulk') || ad.name.includes('Package')) {
          console.log(`    → This might legitimately be flat rate (package deal)`);
        }
      });
    }
    
    console.log('\n\n' + '='.repeat(70));
    console.log('🔍 FINDINGS:');
    console.log('='.repeat(70));
    console.log('\n1. Chicago Reader Social Media hub pricing appears correct (per_post)');
    console.log('   - May have been already fixed earlier');
    console.log('\n2. CHIRP Newsletter "monthly" pricing:');
    console.log('   - Ad name: "Newsletter Sponsor Mention"');
    console.log('   - This might be a monthly sponsorship, not per-send');
    console.log('   - Need to understand the actual product');
    console.log('\n3. CHIRP Radio "flat" pricing:');
    console.log('   - "A La Carte" might actually need per_spot');
    console.log('   - But "Bulk Rates" packages might correctly use flat');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

analyzePricingContext();
