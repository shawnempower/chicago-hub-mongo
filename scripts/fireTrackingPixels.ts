/**
 * Fire Real Tracking Pixels and Verify Pipeline
 * 
 * This script:
 * 1. Queries campaigns and orders from database
 * 2. Fires actual HTTP requests to CloudFront tracking URLs
 * 3. Monitors Lambda function logs (analytics-ad-aggregator)
 * 4. Verifies data appears in tracking_events collection
 * 
 * AWS Profile: Connection 1
 * Lambda Function: analytics-ad-aggregator
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'chicago-hub';
const CLOUDFRONT_URL = 'https://dxafls8akrlrp.cloudfront.net';
const AWS_PROFILE = 'Connection 1';
const LAMBDA_FUNCTION = 'analytics-ad-aggregator';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

interface TrackingScript {
  _id: ObjectId;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  creativeId: string;
  channel: string;
  urls: {
    impressionPixel: string;
    clickTracker: string;
  };
}

async function fireTrackingPixels() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // Step 1: Get tracking scripts from database
    console.log('🔍 Finding tracking scripts...\n');
    const trackingScripts = await db.collection<TrackingScript>('tracking_scripts')
      .find({ deletedAt: { $exists: false } })
      .limit(10) // Test with first 10
      .toArray();
    
    if (trackingScripts.length === 0) {
      console.log('⚠️  No tracking scripts found. Please generate tracking scripts first.');
      return;
    }
    
    console.log(`Found ${trackingScripts.length} tracking scripts\n`);
    
    // Step 2: Record baseline - count existing tracking events
    const beforeCount = await db.collection('tracking_events').countDocuments({});
    console.log(`📊 Current tracking_events count: ${beforeCount.toLocaleString()}\n`);
    
    // Step 3: Fire tracking pixels
    console.log('🎯 Firing tracking pixels...\n');
    console.log('='.repeat(80));
    
    let impressionsFired = 0;
    let clicksFired = 0;
    const testSessionId = `test_${Date.now()}`;
    
    for (const script of trackingScripts) {
      console.log(`\n📰 ${script.publicationName} (${script.channel})`);
      console.log(`   Campaign: ${script.campaignId}`);
      console.log(`   Creative: ${script.creativeId}`);
      
      // Fire 5 impressions for this script
      for (let i = 0; i < 5; i++) {
        const impressionUrl = buildImpressionUrl(script, testSessionId, i);
        
        try {
          const response = await fetch(impressionUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Referer': `https://${script.publicationName.toLowerCase().replace(/\s+/g, '')}.com/test`
            }
          });
          
          if (response.ok) {
            impressionsFired++;
            console.log(`   ✅ Impression ${i + 1}: ${response.status} ${response.statusText}`);
          } else {
            console.log(`   ❌ Impression ${i + 1}: ${response.status} ${response.statusText}`);
          }
        } catch (error: any) {
          console.log(`   ❌ Impression ${i + 1}: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await sleep(200);
      }
      
      // Fire 2 clicks for this script
      for (let i = 0; i < 2; i++) {
        const clickUrl = buildClickUrl(script, testSessionId, i);
        
        try {
          const response = await fetch(clickUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Referer': `https://${script.publicationName.toLowerCase().replace(/\s+/g, '')}.com/test`
            },
            redirect: 'manual' // Don't follow redirects
          });
          
          if (response.status === 302 || response.status === 301) {
            clicksFired++;
            const location = response.headers.get('location');
            console.log(`   ✅ Click ${i + 1}: ${response.status} → ${location}`);
          } else if (response.ok) {
            clicksFired++;
            console.log(`   ✅ Click ${i + 1}: ${response.status} ${response.statusText}`);
          } else {
            console.log(`   ⚠️  Click ${i + 1}: ${response.status} ${response.statusText}`);
          }
        } catch (error: any) {
          console.log(`   ❌ Click ${i + 1}: ${error.message}`);
        }
        
        await sleep(200);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Pixel firing complete!');
    console.log(`   Impressions fired: ${impressionsFired}`);
    console.log(`   Clicks fired: ${clicksFired}`);
    console.log(`   Total requests: ${impressionsFired + clicksFired}\n`);
    
    // Step 4: Wait for CloudFront to log (logs can take 5-15 minutes)
    console.log('⏳ Waiting for CloudFront Access Logs to be written...');
    console.log('   (This typically takes 5-15 minutes)\n');
    console.log('   CloudFront writes logs to S3, then Lambda processes them.\n');
    
    // Step 5: Check Lambda function to see if it's been triggered
    console.log('🔍 Checking Lambda function status...\n');
    await checkLambdaLogs();
    
    // Step 6: Monitor database for new records
    console.log('\n📊 Monitoring database for new tracking events...\n');
    console.log('   Checking every 30 seconds for 5 minutes...\n');
    
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 30 * 1000; // 30 seconds
    const startTime = Date.now();
    
    let newEventsFound = false;
    
    while (Date.now() - startTime < maxWaitTime && !newEventsFound) {
      const currentCount = await db.collection('tracking_events').countDocuments({});
      const newEvents = currentCount - beforeCount;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`   [${elapsed}s] Events in DB: ${currentCount.toLocaleString()} (new: ${newEvents})`);
      
      if (newEvents > 0) {
        newEventsFound = true;
        console.log('\n   ✅ New tracking events detected!\n');
        
        // Show recent events
        const recentEvents = await db.collection('tracking_events')
          .find({})
          .sort({ event_time: -1 })
          .limit(10)
          .toArray();
        
        console.log('   📋 Most recent events:');
        recentEvents.forEach((event: any, idx) => {
          console.log(`      ${idx + 1}. ${event.event_type} | ${event.campaign_id} | ${event.publication_code} | ${event.event_time.toISOString()}`);
        });
        break;
      }
      
      if (Date.now() - startTime < maxWaitTime) {
        await sleep(checkInterval);
      }
    }
    
    if (!newEventsFound) {
      console.log('\n   ⚠️  No new events detected yet.');
      console.log('   This is normal - CloudFront logs can take 5-15 minutes to arrive.\n');
      console.log('   Check again in a few minutes or run the verification script:\n');
      console.log('   npx tsx scripts/verifyTrackingPipeline.ts\n');
    }
    
    // Step 7: Summary and next steps
    console.log('\n' + '='.repeat(80));
    console.log('📊 PIPELINE TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Pixels Fired: ${impressionsFired + clicksFired} requests`);
    console.log(`   - Impressions: ${impressionsFired}`);
    console.log(`   - Clicks: ${clicksFired}`);
    console.log(`\n📍 Test Session ID: ${testSessionId}`);
    console.log(`   Use this to search CloudWatch logs and database\n`);
    
    console.log('🔍 Next Steps:');
    console.log('   1. Check CloudFront Access Logs in S3 (5-15 min delay)');
    console.log('   2. Monitor Lambda function logs for processing');
    console.log('   3. Verify events appear in tracking_events collection');
    console.log('   4. Check campaign performance metrics in dashboard\n');
    
    console.log('📝 Verification Commands:');
    console.log(`   aws logs tail /aws/lambda/${LAMBDA_FUNCTION} --follow --profile "${AWS_PROFILE}"`);
    console.log(`   npx tsx scripts/verifyTrackingPipeline.ts\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

function buildImpressionUrl(script: TrackingScript, sessionId: string, index: number): string {
  // Extract order ID from the existing impression pixel URL
  const url = new URL(script.urls.impressionPixel);
  const oid = url.searchParams.get('oid') || 'test_order';
  
  // Build clean impression URL
  const params = new URLSearchParams({
    oid: oid,
    cid: script.campaignId,
    pid: script.publicationId.toString(),
    ch: getChannelCode(script.channel),
    t: 'display',
    cr: script.creativeId,
    s: '300x250',
    sid: sessionId,
    cb: `${Date.now()}${index}`
  });
  
  return `${CLOUDFRONT_URL}/pxl.png?${params.toString()}`;
}

function buildClickUrl(script: TrackingScript, sessionId: string, index: number): string {
  // Extract order ID from the existing click tracker URL
  const url = new URL(script.urls.clickTracker);
  const oid = url.searchParams.get('oid') || 'test_order';
  
  // Build clean click URL
  const params = new URLSearchParams({
    oid: oid,
    cid: script.campaignId,
    pid: script.publicationId.toString(),
    ch: getChannelCode(script.channel),
    t: 'click',
    cr: script.creativeId,
    r: encodeURIComponent('https://example.com/landing'),
    sid: sessionId,
    cb: `${Date.now()}${index}`
  });
  
  return `${CLOUDFRONT_URL}/c?${params.toString()}`;
}

function getChannelCode(channel: string): string {
  const codes: Record<string, string> = {
    'website': 'web',
    'newsletter_image': 'nli',
    'newsletter_text': 'nlt',
    'streaming': 'stream',
    'podcast': 'pod',
    'social': 'soc'
  };
  return codes[channel] || 'web';
}

async function checkLambdaLogs() {
  const { execSync } = await import('child_process');
  
  try {
    console.log(`   Checking last 10 log events for ${LAMBDA_FUNCTION}...\n`);
    
    const command = `aws logs tail /aws/lambda/${LAMBDA_FUNCTION} --since 10m --format short --profile "${AWS_PROFILE}" 2>&1 | head -20`;
    
    const output = execSync(command, { encoding: 'utf-8' });
    
    if (output.includes('ResourceNotFoundException') || output.includes('does not exist')) {
      console.log('   ⚠️  Lambda log group not found or no recent invocations\n');
    } else if (output.trim()) {
      console.log('   📋 Recent Lambda logs:');
      console.log('   ' + output.split('\n').slice(0, 10).join('\n   '));
      console.log('');
    } else {
      console.log('   ℹ️  No recent Lambda invocations in last 10 minutes\n');
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not fetch Lambda logs: ${error.message}\n`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
fireTrackingPixels()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
