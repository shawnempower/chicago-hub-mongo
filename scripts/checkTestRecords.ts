/**
 * Check for Test Tracking Records
 * Looks for the tracking events we just fired
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
const TEST_CAMPAIGN = 'campaign-mk5xcmza-buh26b';
const TEST_ORDER = '6960195199937f3b71a2338d';

async function checkTestRecords() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('tracking_events');
    
    console.log('='.repeat(80));
    console.log('🔍 CHECKING FOR TEST TRACKING RECORDS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Looking for:');
    console.log(`  Campaign: ${TEST_CAMPAIGN}`);
    console.log(`  Order: ${TEST_ORDER}`);
    console.log('');
    
    // Check for events from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    console.log('📊 Events from last hour:\n');
    
    const recentEvents = await collection.find({
      event_time: { $gte: oneHourAgo },
      campaign_id: TEST_CAMPAIGN
    })
    .sort({ event_time: -1 })
    .toArray();
    
    console.log(`Found ${recentEvents.length} events in last hour for this campaign\n`);
    
    if (recentEvents.length > 0) {
      console.log('📋 Recent events:\n');
      recentEvents.forEach((event: any, idx) => {
        const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000);
        const ageStr = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;
        console.log(`   ${(idx + 1).toString().padStart(2)}. ${event.event_type.padEnd(10)} | ${event.creative_id.padEnd(20)} | ${ageStr}`);
        console.log(`       IP: ${event.ip_address || 'N/A'} | User-Agent: ${(event.user_agent || 'N/A').substring(0, 50)}...`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No events found in last hour\n');
      console.log('   This is expected - CloudFront logs take 5-15 minutes to process.\n');
    }
    
    // Check all-time stats for this campaign
    console.log('\n' + '-'.repeat(80));
    console.log('📊 ALL-TIME STATS FOR THIS CAMPAIGN:\n');
    
    const stats = await collection.aggregate([
      { $match: { campaign_id: TEST_CAMPAIGN } },
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 },
          first_seen: { $min: '$event_time' },
          last_seen: { $max: '$event_time' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    let totalImpressions = 0;
    let totalClicks = 0;
    
    stats.forEach((stat: any) => {
      const firstAge = Math.floor((Date.now() - stat.first_seen.getTime()) / 1000 / 60);
      const lastAge = Math.floor((Date.now() - stat.last_seen.getTime()) / 1000 / 60);
      
      console.log(`   ${stat._id.toUpperCase()}:`);
      console.log(`      Count: ${stat.count.toLocaleString()}`);
      console.log(`      First seen: ${firstAge}m ago`);
      console.log(`      Last seen: ${lastAge}m ago\n`);
      
      if (stat._id === 'impression') totalImpressions = stat.count;
      if (stat._id === 'click') totalClicks = stat.count;
    });
    
    if (totalImpressions > 0) {
      const ctr = ((totalClicks / totalImpressions) * 100).toFixed(2);
      console.log(`   📊 Overall CTR: ${ctr}%\n`);
    }
    
    // Check for click events specifically
    console.log('\n' + '-'.repeat(80));
    console.log('🖱️  CLICK TRACKING VERIFICATION:\n');
    
    const clickEvents = await collection.find({
      campaign_id: TEST_CAMPAIGN,
      event_type: 'click'
    })
    .sort({ event_time: -1 })
    .limit(10)
    .toArray();
    
    if (clickEvents.length > 0) {
      console.log(`✅ Found ${clickEvents.length} click events (showing last 10):\n`);
      clickEvents.forEach((event: any, idx) => {
        const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000 / 60);
        console.log(`   ${idx + 1}. Time: ${age}m ago`);
        console.log(`      Landing URL: ${event.landing_url || 'N/A'}`);
        console.log(`      Publication: ${event.publication_code}`);
        console.log(`      Device: ${event.device_type || 'N/A'}\n`);
      });
    } else {
      console.log('   ⚠️  No click events found yet\n');
    }
    
    // Check CloudFront access pattern
    console.log('\n' + '-'.repeat(80));
    console.log('☁️  CLOUDFRONT LOG PROCESSING STATUS:\n');
    
    // Check if we have very recent events (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const veryRecentCount = await collection.countDocuments({
      event_time: { $gte: tenMinutesAgo }
    });
    
    if (veryRecentCount > 0) {
      console.log(`   ✅ Pipeline is ACTIVE - ${veryRecentCount} events in last 10 minutes\n`);
    } else {
      console.log('   ⏳ Waiting for CloudFront logs to process...\n');
      console.log('   CloudFront Access Logs typically arrive within 5-15 minutes.\n');
      console.log('   Lambda runs every hour or when triggered.\n');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`✅ We fired 7 tracking requests (5 impressions + 2 clicks)`);
    console.log(`   CloudFront responded: ✅ All HTTP 200/302`);
    console.log('');
    
    if (recentEvents.length >= 7) {
      console.log(`✅ Events detected in database: ${recentEvents.length} recent events`);
      console.log('   🎉 Full pipeline is working!');
    } else if (recentEvents.length > 0) {
      console.log(`⏳ Partial events in database: ${recentEvents.length} events`);
      console.log('   Some events detected, waiting for more...');
    } else {
      console.log('⏳ Events not in database yet');
      console.log('   This is normal - wait 5-15 minutes for CloudFront logs');
    }
    
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Wait 5-15 minutes for CloudFront logs to arrive in S3');
    console.log('   2. Lambda will process logs on next scheduled run (hourly)');
    console.log('   3. Or manually trigger Lambda:');
    console.log('      aws lambda invoke --function-name analytics-ad-aggregator --profile "Connection 1" response.json');
    console.log('   4. Re-run this script to check again:');
    console.log('      npx tsx scripts/checkTestRecords.ts');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

checkTestRecords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
