/**
 * Check Staging Database for Jan 13 Events
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const STAGING_DB = 'staging-chicago-hub';
const TEST_CREATIVE = 'cr_test_001';

async function checkStagingJan13() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(STAGING_DB);
    
    console.log('='.repeat(80));
    console.log('🔍 CHECKING STAGING DATABASE FOR JAN 13 EVENTS');
    console.log('='.repeat(80));
    
    // Check for test creative
    console.log('\n📊 Test Pixels (cr_test_001):\n');
    const testEvents = await db.collection('tracking_events').find({
      creative_id: TEST_CREATIVE
    }).toArray();
    
    console.log(`   Found ${testEvents.length} test pixel events\n`);
    
    if (testEvents.length > 0) {
      console.log('   🎉 TEST PIXELS FOUND IN DATABASE!\n');
      testEvents.forEach((event: any, idx) => {
        console.log(`   ${idx + 1}. ${event.event_type.toUpperCase().padEnd(10)} | ${event.event_time.toISOString()}`);
        console.log(`      IP: ${event.ip_address}`);
        console.log(`      Campaign: ${event.campaign_id}`);
        if (event.landing_url) {
          console.log(`      Landing URL: ${event.landing_url}`);
        }
        console.log('');
      });
      
      console.log('='.repeat(80));
      console.log('✅ SUCCESS - FULL PIPELINE VERIFIED!');
      console.log('='.repeat(80));
      console.log('\nPipeline Flow:');
      console.log('  1. ✅ Fired tracking pixels to CloudFront');
      console.log('  2. ✅ CloudFront served requests (200/302)');
      console.log('  3. ✅ CloudFront wrote access logs to S3');
      console.log('  4. ✅ Athena can query the logs');
      console.log('  5. ✅ Lambda processed logs');
      console.log('  6. ✅ Events written to MongoDB (staging)');
      console.log('');
      
    } else {
      console.log('   ⚠️  Test pixels not in database yet\n');
    }
    
    // Check all events in staging
    console.log('\n📊 All Events in Staging DB:\n');
    const jan13Start = new Date('2026-01-13T00:00:00Z');
    const jan13End = new Date('2026-01-13T23:59:59Z');
    
    const jan13Count = await db.collection('tracking_events').countDocuments({
      event_time: { $gte: jan13Start, $lte: jan13End }
    });
    
    console.log(`   Events from Jan 13: ${jan13Count}`);
    
    if (jan13Count > 0) {
      console.log('\n   📋 Sample Jan 13 events:\n');
      const samples = await db.collection('tracking_events').find({
        event_time: { $gte: jan13Start, $lte: jan13End }
      })
      .sort({ event_time: -1 })
      .limit(10)
      .toArray();
      
      samples.forEach((event: any, idx) => {
        console.log(`   ${idx + 1}. ${event.event_type.padEnd(10)} | ${event.creative_id.substring(0, 25)} | ${event.event_time.toISOString()}`);
      });
    }
    
    const totalEvents = await db.collection('tracking_events').countDocuments({});
    console.log(`\n   Total events in staging: ${totalEvents.toLocaleString()}\n`);
    
    if (totalEvents === 0 && testEvents.length === 0) {
      console.log('💡 The Lambda is configured to write to staging-chicago-hub,');
      console.log('   but no events have been written yet.');
      console.log('   The Lambda may need to be configured to process today\'s date (Jan 13).\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

checkStagingJan13()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
