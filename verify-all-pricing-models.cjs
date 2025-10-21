const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';

// Expected pricing models by channel type
const EXPECTED_MODELS = {
  print: ['per_ad', 'contact'],
  newsletters: ['per_send', 'contact'],
  website: ['flat', 'flat_rate', 'per_week', 'per_day', 'cpm', 'cpc', 'contact'],
  podcasts: ['per_spot', 'cpd', 'per_ad', 'per_episode', 'contact'],
  radioStations: ['per_spot', 'cpm', 'contact'],
  socialMedia: ['per_post', 'per_story', 'monthly', 'cpm', 'contact'],
  streamingVideo: ['cpv', 'per_video', 'contact'],
  events: ['flat', 'contact']
};

async function verifyAllPricingModels() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('publications');
    
    const pubs = await collection.find({}).toArray();
    
    console.log('='.repeat(70));
    console.log('COMPREHENSIVE PRICING MODEL VERIFICATION');
    console.log('='.repeat(70));
    console.log(`\nChecking ${pubs.length} publications...\n`);
    
    const allIssues = [];
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || pub.name || 'Unknown';
      
      if (!pub.distributionChannels) continue;
      
      // Check each channel type
      for (const [channelType, expectedModels] of Object.entries(EXPECTED_MODELS)) {
        const channel = pub.distributionChannels[channelType];
        if (!channel) continue;
        
        const items = Array.isArray(channel) ? channel : [channel];
        
        items.forEach((item, itemIndex) => {
          if (!item.advertisingOpportunities) return;
          
          item.advertisingOpportunities.forEach((ad, adIndex) => {
            const checkPricing = (pricing, location) => {
              if (!pricing) return;
              
              if (Array.isArray(pricing)) {
                pricing.forEach((tier, tIndex) => {
                  if (tier.pricing?.pricingModel && !expectedModels.includes(tier.pricing.pricingModel)) {
                    allIssues.push({
                      pub: pubName,
                      channel: channelType,
                      item: item.name || `Item ${itemIndex + 1}`,
                      ad: ad.name,
                      location: `${location} - Tier ${tIndex + 1}`,
                      currentModel: tier.pricing.pricingModel,
                      expectedModels: expectedModels.join(', ')
                    });
                  }
                });
              } else if (pricing.pricingModel && !expectedModels.includes(pricing.pricingModel)) {
                allIssues.push({
                  pub: pubName,
                  channel: channelType,
                  item: item.name || `Item ${itemIndex + 1}`,
                  ad: ad.name,
                  location: location,
                  currentModel: pricing.pricingModel,
                  expectedModels: expectedModels.join(', ')
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
    
    if (allIssues.length > 0) {
      console.log('❌ FOUND PRICING MODEL ISSUES:');
      console.log('='.repeat(70));
      
      // Group by channel type
      const byChannel = {};
      allIssues.forEach(issue => {
        if (!byChannel[issue.channel]) byChannel[issue.channel] = [];
        byChannel[issue.channel].push(issue);
      });
      
      Object.entries(byChannel).forEach(([channel, issues]) => {
        console.log(`\n📍 Channel: ${channel.toUpperCase()}`);
        console.log('-'.repeat(70));
        issues.forEach((issue, i) => {
          console.log(`\n${i + 1}. Publication: ${issue.pub}`);
          console.log(`   Item: ${issue.item}`);
          console.log(`   Ad: ${issue.ad}`);
          console.log(`   Location: ${issue.location}`);
          console.log(`   Current: "${issue.currentModel}"`);
          console.log(`   Expected: ${issue.expectedModels}`);
        });
      });
      
      console.log('\n' + '='.repeat(70));
      console.log(`\n⚠️  Total issues found: ${allIssues.length}`);
    } else {
      console.log('✅ ALL PRICING MODELS ARE CORRECT!');
      console.log('='.repeat(70));
      console.log('\nVerified across all channels:');
      Object.entries(EXPECTED_MODELS).forEach(([channel, models]) => {
        console.log(`  ✓ ${channel}: ${models.join(', ')}`);
      });
    }
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyAllPricingModels();
