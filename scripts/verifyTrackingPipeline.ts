/**
 * Verify Tracking Pipeline Status
 * 
 * Checks:
 * 1. Recent tracking events in database
 * 2. Lambda function invocations
 * 3. CloudFront log processing status
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'chicago-hub';
const AWS_PROFILE = 'Connection 1';
const LAMBDA_FUNCTION = 'analytics-ad-aggregator';

async function verifyPipeline() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('='.repeat(80));
    console.log('🔍 TRACKING PIPELINE VERIFICATION');
    console.log('='.repeat(80));
    
    // Check 1: Recent tracking events
    console.log('\n📊 Checking tracking_events collection...\n');
    
    const totalEvents = await db.collection('tracking_events').countDocuments({});
    console.log(`   Total events: ${totalEvents.toLocaleString()}`);
    
    const recentEvents = await db.collection('tracking_events')
      .find({})
      .sort({ event_time: -1 })
      .limit(10)
      .toArray();
    
    if (recentEvents.length > 0) {
      console.log(`\n   📋 Most recent 10 events:`);
      recentEvents.forEach((event: any, idx) => {
        const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000 / 60);
        console.log(`      ${idx + 1}. ${event.event_type.padEnd(10)} | ${event.campaign_id.substring(0, 20).padEnd(20)} | ${age}m ago`);
      });
      
      const newestEvent = recentEvents[0] as any;
      const ageMinutes = Math.floor((Date.now() - newestEvent.event_time.getTime()) / 1000 / 60);
      
      if (ageMinutes < 60) {
        console.log(`\n   ✅ Recent activity detected (${ageMinutes} minutes ago)`);
      } else {
        console.log(`\n   ⚠️  No recent activity (last event ${ageMinutes} minutes ago)`);
      }
    } else {
      console.log('   ⚠️  No tracking events found in database');
    }
    
    // Check 2: Events by campaign
    console.log('\n\n📈 Events by campaign (last 7 days):\n');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const campaignStats = await db.collection('tracking_events')
      .aggregate([
        { $match: { event_time: { $gte: sevenDaysAgo } } },
        { 
          $group: {
            _id: '$campaign_id',
            impressions: { 
              $sum: { $cond: [{ $eq: ['$event_type', 'impression'] }, 1, 0] } 
            },
            clicks: { 
              $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } 
            },
            total: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ])
      .toArray();
    
    if (campaignStats.length > 0) {
      campaignStats.forEach((stat: any) => {
        const ctr = stat.impressions > 0 ? ((stat.clicks / stat.impressions) * 100).toFixed(2) : '0.00';
        console.log(`   ${stat._id}`);
        console.log(`      Impressions: ${stat.impressions.toLocaleString()}`);
        console.log(`      Clicks: ${stat.clicks.toLocaleString()}`);
        console.log(`      CTR: ${ctr}%\n`);
      });
    } else {
      console.log('   No events in last 7 days');
    }
    
    // Check 3: Lambda function status
    console.log('\n🔧 Checking Lambda function...\n');
    
    try {
      const command = `aws lambda get-function --function-name ${LAMBDA_FUNCTION} --profile "${AWS_PROFILE}" 2>&1`;
      const output = execSync(command, { encoding: 'utf-8' });
      
      if (output.includes('ResourceNotFoundException')) {
        console.log(`   ❌ Lambda function "${LAMBDA_FUNCTION}" not found`);
      } else {
        console.log(`   ✅ Lambda function "${LAMBDA_FUNCTION}" exists`);
        
        // Get recent invocations
        const logsCommand = `aws logs tail /aws/lambda/${LAMBDA_FUNCTION} --since 1h --format short --profile "${AWS_PROFILE}" 2>&1 | head -10`;
        const logs = execSync(logsCommand, { encoding: 'utf-8' });
        
        if (logs.trim() && !logs.includes('ResourceNotFoundException')) {
          console.log('\n   📋 Recent logs (last hour):');
          console.log('   ' + logs.split('\n').slice(0, 5).join('\n   '));
        } else {
          console.log('   ℹ️  No invocations in last hour');
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not check Lambda: ${error.message}`);
    }
    
    // Check 4: CloudFront distribution
    console.log('\n\n☁️  Checking CloudFront distribution...\n');
    
    try {
      const command = `aws cloudfront list-distributions --profile "${AWS_PROFILE}" 2>&1 | grep -A 5 "dxafls8akrlrp"`;
      const output = execSync(command, { encoding: 'utf-8' });
      
      if (output.trim()) {
        console.log('   ✅ CloudFront distribution found (dxafls8akrlrp.cloudfront.net)');
      } else {
        console.log('   ⚠️  CloudFront distribution info not found');
      }
    } catch (error) {
      console.log('   ℹ️  Could not check CloudFront (this is optional)');
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 PIPELINE STATUS SUMMARY');
    console.log('='.repeat(80));
    
    const hasRecentEvents = recentEvents.length > 0 && 
      (Date.now() - (recentEvents[0] as any).event_time.getTime()) < 3600000;
    
    if (hasRecentEvents) {
      console.log('\n✅ Pipeline appears to be working');
      console.log('   - Recent tracking events detected');
      console.log('   - Data is flowing into the database');
    } else {
      console.log('\n⚠️  Pipeline may need attention');
      console.log('   - No recent tracking events detected');
      console.log('   - CloudFront logs may not be processing yet');
      console.log('   - Or no real traffic has occurred');
    }
    
    console.log('\n💡 Tips:');
    console.log('   - CloudFront logs take 5-15 minutes to arrive');
    console.log('   - Lambda runs on schedule or when new logs arrive');
    console.log('   - Run fireTrackingPixels.ts to generate test traffic\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

verifyPipeline()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
