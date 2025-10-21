const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';

async function findRealIssues() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('publications');
    
    const pubs = await collection.find({}).toArray();
    
    console.log('='.repeat(70));
    console.log('FINDING REAL PRICING ISSUES');
    console.log('='.repeat(70));
    console.log('\nLooking for ads that are MISSING pricingModel entirely...\n');
    
    const realIssues = [];
    
    for (const pub of pubs) {
      if (!pub.distributionChannels) continue;
      
      const pubName = pub.basicInfo?.publicationName || pub.name || 'Unknown';
      
      // Check all channel types
      const channels = ['print', 'newsletters', 'website', 'podcasts', 'radioStations', 
                        'socialMedia', 'streamingVideo', 'events'];
      
      for (const channelType of channels) {
        const channel = pub.distributionChannels[channelType];
        if (!channel) continue;
        
        const items = Array.isArray(channel) ? channel : [channel];
        
        items.forEach((item, itemIndex) => {
          if (!item.advertisingOpportunities) return;
          
          item.advertisingOpportunities.forEach((ad, adIndex) => {
            // Check if pricing exists but pricingModel is missing
            const checkPricing = (pricing, location) => {
              if (!pricing) {
                realIssues.push({
                  pub: pubName,
                  channel: channelType,
                  item: item.name || `Item ${itemIndex + 1}`,
                  ad: ad.name,
                  location: location,
                  issue: 'MISSING pricing object entirely'
                });
                return;
              }
              
              if (Array.isArray(pricing)) {
                pricing.forEach((tier, tIndex) => {
                  if (tier.pricing && !tier.pricing.pricingModel) {
                    realIssues.push({
                      pub: pubName,
                      channel: channelType,
                      item: item.name || `Item ${itemIndex + 1}`,
                      ad: ad.name,
                      location: `${location} - Tier ${tIndex + 1}`,
                      issue: 'MISSING pricingModel field',
                      hasPrice: tier.pricing.flatRate !== undefined
                    });
                  }
                });
              } else if (pricing && !pricing.pricingModel) {
                realIssues.push({
                  pub: pubName,
                  channel: channelType,
                  item: item.name || `Item ${itemIndex + 1}`,
                  ad: ad.name,
                  location: location,
                  issue: 'MISSING pricingModel field',
                  hasPrice: pricing.flatRate !== undefined
                });
              }
            };
            
            // Check default pricing
            checkPricing(ad.pricing, 'Default');
            
            // Check hub pricing
            if (ad.hubPricing) {
              ad.hubPricing.forEach((hub, hIndex) => {
                checkPricing(hub.pricing, `Hub: ${hub.hubName}`);
              });
            }
          });
        });
      }
    }
    
    if (realIssues.length > 0) {
      console.log('❌ FOUND REAL ISSUES - Missing pricingModel field:');
      console.log('='.repeat(70));
      
      realIssues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.pub}`);
        console.log(`   Channel: ${issue.channel}`);
        console.log(`   Item: ${issue.item}`);
        console.log(`   Ad: ${issue.ad}`);
        console.log(`   Location: ${issue.location}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.hasPrice) {
          console.log(`   ⚠️  HAS PRICE DATA but missing pricingModel!`);
        }
      });
      
      console.log('\n' + '='.repeat(70));
      console.log(`\n⚠️  Total real issues: ${realIssues.length}`);
      console.log('\nThese need pricingModel added based on their channel type.');
    } else {
      console.log('✅ ALL ADS HAVE pricingModel FIELD');
      console.log('='.repeat(70));
      console.log('\nNote: Some may use "monthly" or "flat" which might be intentional');
      console.log('based on whether they are package deals vs. individual placements.');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findRealIssues();
