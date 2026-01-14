/**
 * Check Recent Tracking Events - See all recent tracking activity
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkRecentTracking() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 RECENT TRACKING EVENTS CHECK');
    console.log('='.repeat(80));
    console.log(`\nTimestamp: ${new Date().toISOString()}\n`);
    
    // Check ad_tracking database
    const trackingDb = client.db('ad_tracking');
    
    // List all collections in ad_tracking
    const collections = await trackingDb.listCollections().toArray();
    console.log('📁 Collections in ad_tracking database:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('');
    
    // Check impression_events - last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log('📊 IMPRESSION EVENTS (last 24 hours):\n');
    const impressionEvents = await trackingDb.collection('impression_events')
      .find({ 
        $or: [
          { timestamp: { $gte: yesterday } },
          { createdAt: { $gte: yesterday } },
          { date: { $gte: yesterday.toISOString().split('T')[0] } }
        ]
      })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(20)
      .toArray();
    
    console.log(`   Found ${impressionEvents.length} recent impression events\n`);
    
    if (impressionEvents.length > 0) {
      impressionEvents.forEach((evt: any, idx) => {
        const ts = evt.timestamp || evt.createdAt || evt.date || 'N/A';
        console.log(`   ${idx + 1}. Time: ${ts}`);
        console.log(`      Order ID: ${evt.order_id || evt.orderId || 'N/A'}`);
        console.log(`      Campaign: ${evt.campaign_id || evt.campaignId || 'N/A'}`);
        console.log(`      Creative: ${evt.creative_id || evt.creativeId || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check click_events
    console.log('🖱️  CLICK EVENTS (last 24 hours):\n');
    const clickEvents = await trackingDb.collection('click_events')
      .find({
        $or: [
          { timestamp: { $gte: yesterday } },
          { createdAt: { $gte: yesterday } },
          { date: { $gte: yesterday.toISOString().split('T')[0] } }
        ]
      })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(20)
      .toArray();
    
    console.log(`   Found ${clickEvents.length} recent click events\n`);
    
    if (clickEvents.length > 0) {
      clickEvents.forEach((evt: any, idx) => {
        const ts = evt.timestamp || evt.createdAt || evt.date || 'N/A';
        console.log(`   ${idx + 1}. Time: ${ts}`);
        console.log(`      Order ID: ${evt.order_id || evt.orderId || 'N/A'}`);
        console.log(`      Campaign: ${evt.campaign_id || evt.campaignId || 'N/A'}`);
        console.log(`      URL: ${evt.destination_url || evt.destinationUrl || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check any aggregated data
    console.log('📈 AGGREGATED TRACKING DATA:\n');
    const aggregatedCollections = ['daily_impressions', 'daily_clicks', 'tracking_aggregates', 'ad_events'];
    
    for (const colName of aggregatedCollections) {
      try {
        const count = await trackingDb.collection(colName).countDocuments({});
        const recent = await trackingDb.collection(colName).find({}).sort({ _id: -1 }).limit(5).toArray();
        
        if (count > 0) {
          console.log(`   ${colName}: ${count} documents`);
          if (recent.length > 0) {
            console.log(`   Sample:`, JSON.stringify(recent[0], null, 2).substring(0, 200));
          }
          console.log('');
        }
      } catch {
        // Collection doesn't exist
      }
    }
    
    // Check chicago-hub production database for recent performance entries
    console.log('\n📊 RECENT PERFORMANCE ENTRIES (chicago-hub):\n');
    const hubDb = client.db('chicago-hub');
    
    const recentPerfEntries = await hubDb.collection('performance_entries')
      .find({
        $or: [
          { createdAt: { $gte: yesterday } },
          { updatedAt: { $gte: yesterday } },
          { dateStart: { $gte: yesterday } }
        ]
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20)
      .toArray();
    
    console.log(`   Found ${recentPerfEntries.length} recent performance entries\n`);
    
    if (recentPerfEntries.length > 0) {
      recentPerfEntries.forEach((entry: any, idx) => {
        console.log(`   ${idx + 1}. Order: ${entry.orderId}`);
        console.log(`      Campaign: ${entry.campaignId}`);
        console.log(`      Item: ${entry.itemName || entry.itemPath}`);
        console.log(`      Source: ${entry.source}`);
        console.log(`      Impressions: ${entry.metrics?.impressions || 0}`);
        console.log(`      Clicks: ${entry.metrics?.clicks || 0}`);
        console.log(`      Date: ${entry.dateStart?.toISOString?.() || entry.dateStart}`);
        console.log(`      Updated: ${entry.updatedAt?.toISOString?.() || 'N/A'}`);
        console.log('');
      });
    }
    
    // Also check for any entries with the specific campaign ID pattern
    console.log('\n🎯 ENTRIES WITH "campaign-mkd5b8sz" PATTERN:\n');
    const targetEntries = await hubDb.collection('performance_entries')
      .find({ campaignId: { $regex: /mkd5b8sz/i } })
      .toArray();
    
    console.log(`   Found ${targetEntries.length} entries matching pattern\n`);
    
    if (targetEntries.length > 0) {
      const totalImpr = targetEntries.reduce((sum: number, e: any) => sum + (e.metrics?.impressions || 0), 0);
      const totalClicks = targetEntries.reduce((sum: number, e: any) => sum + (e.metrics?.clicks || 0), 0);
      console.log(`   Total: ${totalImpr} impressions | ${totalClicks} clicks`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkRecentTracking()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
