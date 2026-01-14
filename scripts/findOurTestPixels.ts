/**
 * Find Our Specific Test Pixels
 * Looks for the exact pixels we fired with test=1 and cr_test_001
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'chicago-hub';
const TEST_CREATIVE = 'cr_test_001'; // Our test creative ID
const TEST_CAMPAIGN = 'campaign-mk5xcmza-buh26b';

async function findTestPixels() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('tracking_events');
    
    console.log('='.repeat(80));
    console.log('🔍 SEARCHING FOR OUR TEST PIXELS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Looking for:');
    console.log(`  Creative ID: ${TEST_CREATIVE}`);
    console.log(`  Campaign: ${TEST_CAMPAIGN}`);
    console.log('');
    
    // Search for our specific test creative
    console.log('📊 Searching by creative ID: cr_test_001...\n');
    
    const testEvents = await collection.find({
      creative_id: TEST_CREATIVE,
      campaign_id: TEST_CAMPAIGN
    })
    .sort({ event_time: -1 })
    .toArray();
    
    if (testEvents.length > 0) {
      console.log(`✅ FOUND ${testEvents.length} TEST EVENTS!\n`);
      console.log('='.repeat(80));
      
      const impressions = testEvents.filter((e: any) => e.event_type === 'impression');
      const clicks = testEvents.filter((e: any) => e.event_type === 'click');
      
      console.log(`\n📊 Summary:`);
      console.log(`   Impressions: ${impressions.length}`);
      console.log(`   Clicks: ${clicks.length}`);
      console.log(`   Total: ${testEvents.length}`);
      
      if (impressions.length >= 5) {
        console.log(`\n   ✅ Expected 5 impressions, found ${impressions.length} ✓`);
      } else {
        console.log(`\n   ⚠️  Expected 5 impressions, found ${impressions.length}`);
      }
      
      if (clicks.length >= 2) {
        console.log(`   ✅ Expected 2 clicks, found ${clicks.length} ✓`);
      } else {
        console.log(`   ⚠️  Expected 2 clicks, found ${clicks.length}`);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('📋 DETAILED EVENT LIST:\n');
      
      testEvents.forEach((event: any, idx) => {
        const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000 / 60);
        console.log(`${(idx + 1).toString().padStart(2)}. ${event.event_type.toUpperCase().padEnd(10)} | ${age} minutes ago`);
        console.log(`    Event Time: ${event.event_time.toISOString()}`);
        console.log(`    IP: ${event.ip_address || 'N/A'}`);
        console.log(`    User-Agent: ${(event.user_agent || 'N/A').substring(0, 70)}`);
        if (event.landing_url) {
          console.log(`    Landing URL: ${event.landing_url}`);
        }
        console.log(`    Device: ${event.device_type || 'N/A'}`);
        console.log(`    Browser: ${event.browser || 'N/A'}`);
        console.log(`    Location: ${event.city || 'N/A'}, ${event.region_code || 'N/A'}`);
        console.log('');
      });
      
      console.log('='.repeat(80));
      console.log('✅ TEST PIXELS SUCCESSFULLY PROCESSED!');
      console.log('='.repeat(80));
      console.log('\n🎉 The full tracking pipeline is working:\n');
      console.log('   1. ✅ Test pixels fired to CloudFront');
      console.log('   2. ✅ CloudFront served requests (200/302)');
      console.log('   3. ✅ CloudFront logged requests to S3');
      console.log('   4. ✅ Lambda processed logs with Athena');
      console.log('   5. ✅ Events written to MongoDB');
      console.log('   6. ✅ Data available for dashboard display\n');
      
    } else {
      console.log('❌ NO TEST EVENTS FOUND\n');
      console.log('This means either:');
      console.log('   1. CloudFront logs haven\'t been written yet (5-15 min delay)');
      console.log('   2. Lambda hasn\'t processed the logs yet (runs hourly)');
      console.log('   3. The creative_id didn\'t match in the logs\n');
      
      console.log('🔍 Let me check for ANY recent events...\n');
      
      // Check for recent events from our campaign
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentAny = await collection.find({
        campaign_id: TEST_CAMPAIGN,
        event_time: { $gte: fiveMinutesAgo }
      })
      .sort({ event_time: -1 })
      .limit(10)
      .toArray();
      
      if (recentAny.length > 0) {
        console.log(`✅ Found ${recentAny.length} recent events (last 5 min) for this campaign:\n`);
        recentAny.forEach((event: any, idx) => {
          const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000);
          console.log(`   ${idx + 1}. ${event.event_type.padEnd(10)} | ${event.creative_id.substring(0, 30)} | ${age}s ago`);
        });
        console.log('\n⏳ Your test pixels may appear soon...\n');
      } else {
        console.log('⚠️  No recent events in last 5 minutes\n');
        console.log('💡 CloudFront logs typically take 5-15 minutes to arrive\n');
      }
    }
    
    // Show when Lambda last ran
    console.log('\n' + '-'.repeat(80));
    console.log('🔍 LAMBDA STATUS\n');
    
    // Check most recent event time to see when Lambda last processed
    const mostRecent = await collection.find({})
      .sort({ event_time: -1 })
      .limit(1)
      .toArray();
    
    if (mostRecent.length > 0) {
      const lastProcessed = mostRecent[0] as any;
      const age = Math.floor((Date.now() - lastProcessed.event_time.getTime()) / 1000 / 60);
      console.log(`   Last event processed: ${age} minutes ago`);
      console.log(`   Event time: ${lastProcessed.event_time.toISOString()}`);
      
      if (age < 5) {
        console.log('\n   ✅ Lambda recently ran - pipeline is active');
      } else if (age < 60) {
        console.log('\n   ⏳ Lambda ran recently, next run soon');
      } else {
        console.log('\n   ⚠️  Lambda hasn\'t run recently');
      }
    }
    
    console.log('\n💡 To trigger Lambda manually:');
    console.log('   aws lambda invoke --function-name analytics-ad-aggregator \\');
    console.log('     --profile "Connection 1" response.json\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

findTestPixels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
