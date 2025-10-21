const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';

async function investigatePricingDetails() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('publications');
    
    console.log('='.repeat(70));
    console.log('INVESTIGATING SPECIFIC PRICING EXAMPLES');
    console.log('='.repeat(70));
    
    // Example 1: Chicago Reader Social Media with "flat"
    const reader = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /Chicago Reader/i }
    });
    
    if (reader?.distributionChannels?.socialMedia) {
      console.log('\n📱 EXAMPLE 1: Chicago Reader - Social Media');
      console.log('-'.repeat(70));
      const social = reader.distributionChannels.socialMedia[0];
      const ad = social.advertisingOpportunities?.[0];
      if (ad) {
        console.log('Ad Name:', ad.name);
        console.log('\nDefault Pricing:');
        console.log(JSON.stringify(ad.pricing, null, 2));
        if (ad.hubPricing?.[0]) {
          console.log('\nHub Pricing:');
          console.log(JSON.stringify(ad.hubPricing[0].pricing, null, 2));
        }
        console.log('\n💡 Analysis: Does this ad have actual price data or just a model?');
      }
    }
    
    // Example 2: CHIRP Radio Newsletter with "monthly"
    const chirp = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /CHIRP Radio/i }
    });
    
    if (chirp?.distributionChannels?.newsletters) {
      console.log('\n\n📧 EXAMPLE 2: CHIRP Radio - Newsletter');
      console.log('-'.repeat(70));
      const newsletter = chirp.distributionChannels.newsletters[0];
      const ad = newsletter.advertisingOpportunities?.[0];
      if (ad) {
        console.log('Ad Name:', ad.name);
        console.log('\nDefault Pricing:');
        console.log(JSON.stringify(ad.pricing, null, 2));
        console.log('\n💡 Analysis: Is this a monthly subscription or per-send pricing?');
        console.log('   If it\'s a monthly package, "monthly" might be correct');
      }
    }
    
    // Example 3: Chicago Public Square Newsletter with "monthly"
    const cps = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /Chicago Public Square/i }
    });
    
    if (cps?.distributionChannels?.newsletters) {
      console.log('\n\n📧 EXAMPLE 3: Chicago Public Square - Newsletter');
      console.log('-'.repeat(70));
      const newsletter = cps.distributionChannels.newsletters[0];
      const monthlyAd = newsletter.advertisingOpportunities?.find(ad => 
        ad.name?.toLowerCase().includes('monthly')
      );
      if (monthlyAd) {
        console.log('Ad Name:', monthlyAd.name);
        console.log('\nDefault Pricing:');
        console.log(JSON.stringify(monthlyAd.pricing, null, 2));
        if (monthlyAd.hubPricing?.[0]) {
          console.log('\nHub Pricing:');
          console.log(JSON.stringify(monthlyAd.hubPricing[0].pricing, null, 2));
        }
        console.log('\n💡 Analysis: Ad is called "Monthly Package" - this might legitimately be "monthly"');
      }
    }
    
    // Example 4: CHIRP Radio Station with "flat"
    if (chirp?.distributionChannels?.radioStations) {
      console.log('\n\n📻 EXAMPLE 4: CHIRP Radio - Radio Station');
      console.log('-'.repeat(70));
      const radio = chirp.distributionChannels.radioStations[0];
      const ad = radio.advertisingOpportunities?.[0];
      if (ad) {
        console.log('Ad Name:', ad.name);
        console.log('\nDefault Pricing:');
        console.log(JSON.stringify(ad.pricing, null, 2));
        if (ad.hubPricing?.[0]) {
          console.log('\nHub Pricing (first):');
          console.log(JSON.stringify(ad.hubPricing[0].pricing, null, 2));
        }
        console.log('\n💡 Analysis: Does this have a flat package price or per-spot pricing?');
      }
    }
    
    // Example 5: AirGo Podcast with "flat"
    const airgo = await collection.findOne({ 
      'basicInfo.publicationName': { $regex: /AirGo Radio/i }
    });
    
    if (airgo?.distributionChannels?.podcasts) {
      console.log('\n\n🎙️ EXAMPLE 5: AirGo Radio - Podcast');
      console.log('-'.repeat(70));
      const podcast = airgo.distributionChannels.podcasts[0];
      const ad = podcast.advertisingOpportunities?.[0];
      if (ad) {
        console.log('Ad Name:', ad.name);
        console.log('\nDefault Pricing:');
        console.log(JSON.stringify(ad.pricing, null, 2));
        if (ad.hubPricing?.[0]) {
          console.log('\nHub Pricing:');
          console.log(JSON.stringify(ad.hubPricing[0].pricing, null, 2));
        }
        console.log('\n💡 Analysis: "Single Pre-Roll Ad" might be per_ad, not flat');
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎯 KEY QUESTION:');
    console.log('Are these pricing models wrong, or are they legitimately different?');
    console.log('\nFor example:');
    console.log('- A "Monthly Package" in newsletter might correctly use "monthly"');
    console.log('- A "Bulk Package" might correctly use "flat" as a bundle price');
    console.log('- Individual spots should use "per_spot", "per_send", "per_ad", etc.');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigatePricingDetails();
