/**
 * Check Campaign Reporting - Verify impressions and clicks for a specific campaign
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PRODUCTION_DB = 'chicago-hub';

// Campaign to check - passed as argument or default
const CAMPAIGN_ID = process.argv[2] || '6966c2df0e942c3c9618eb8e';

async function checkCampaignReporting() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(PRODUCTION_DB);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CAMPAIGN REPORTING CHECK');
    console.log('='.repeat(80));
    console.log(`\nCampaign ID: ${CAMPAIGN_ID}`);
    console.log(`Database: ${PRODUCTION_DB}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    // 1. Get campaign info
    console.log('📋 CAMPAIGN INFO:\n');
    let campaign;
    try {
      campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(CAMPAIGN_ID) });
    } catch {
      campaign = await db.collection('campaigns').findOne({ campaignId: CAMPAIGN_ID });
    }
    
    if (campaign) {
      console.log(`   Name: ${campaign.basicInfo?.name || 'N/A'}`);
      console.log(`   Status: ${campaign.status || 'N/A'}`);
      console.log(`   Start: ${campaign.timeline?.startDate || 'N/A'}`);
      console.log(`   End: ${campaign.timeline?.endDate || 'N/A'}`);
      console.log(`   Campaign ID: ${campaign.campaignId || campaign._id}`);
    } else {
      console.log('   ⚠️ Campaign not found in campaigns collection');
    }
    
    // 2. Get associated orders
    console.log('\n📦 INSERTION ORDERS:\n');
    const orders = await db.collection('publication_insertion_orders').find({
      $or: [
        { campaignId: CAMPAIGN_ID },
        { campaignId: new ObjectId(CAMPAIGN_ID) }
      ]
    }).toArray();
    
    if (orders.length === 0) {
      // Try with string campaign ID from campaign document
      const altCampaignId = campaign?.campaignId || CAMPAIGN_ID;
      const ordersAlt = await db.collection('publication_insertion_orders').find({
        campaignId: altCampaignId
      }).toArray();
      orders.push(...ordersAlt);
    }
    
    console.log(`   Found ${orders.length} insertion order(s)\n`);
    
    orders.forEach((order: any, idx) => {
      console.log(`   ${idx + 1}. Order ID: ${order._id}`);
      console.log(`      Publication: ${order.publicationName || order.publicationId}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      Items: ${order.lineItems?.length || 0}`);
      console.log('');
    });
    
    // 3. Check performance entries for this campaign
    console.log('📈 PERFORMANCE ENTRIES:\n');
    
    // Use string campaignId if available
    const campaignIdToSearch = campaign?.campaignId || CAMPAIGN_ID;
    
    const perfEntries = await db.collection('performance_entries').find({
      $or: [
        { campaignId: CAMPAIGN_ID },
        { campaignId: campaignIdToSearch }
      ]
    }).sort({ dateStart: -1, createdAt: -1 }).toArray();
    
    console.log(`   Found ${perfEntries.length} performance entries\n`);
    
    if (perfEntries.length > 0) {
      console.log('   ' + '-'.repeat(74));
      console.log('   Date       | Source    | Item                        | Impr  | Clicks | CTR');
      console.log('   ' + '-'.repeat(74));
      
      perfEntries.forEach((entry: any) => {
        const date = entry.dateStart ? entry.dateStart.toISOString().split('T')[0] : 'N/A';
        const source = (entry.source || 'manual').padEnd(9);
        const item = (entry.itemName || entry.itemPath || 'N/A').substring(0, 25).padEnd(27);
        const impr = (entry.metrics?.impressions || 0).toString().padStart(5);
        const clicks = (entry.metrics?.clicks || 0).toString().padStart(6);
        const ctr = entry.metrics?.impressions > 0 
          ? ((entry.metrics.clicks / entry.metrics.impressions) * 100).toFixed(2) + '%'
          : '0.00%';
        
        console.log(`   ${date} | ${source} | ${item} | ${impr} | ${clicks} | ${ctr}`);
      });
      
      console.log('   ' + '-'.repeat(74));
      
      // Totals
      const totalImpr = perfEntries.reduce((sum: number, e: any) => sum + (e.metrics?.impressions || 0), 0);
      const totalClicks = perfEntries.reduce((sum: number, e: any) => sum + (e.metrics?.clicks || 0), 0);
      const overallCtr = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) : '0.00';
      
      console.log(`\n   TOTALS: ${totalImpr} impressions | ${totalClicks} clicks | ${overallCtr}% CTR`);
      
      if (totalImpr > 0 || totalClicks > 0) {
        console.log('\n   ✅ REPORTING IS WORKING - Performance data found!\n');
      }
    } else {
      console.log('   ⚠️ No performance entries found for this campaign\n');
    }
    
    // 4. Check tracking database for raw events
    console.log('🔍 RAW TRACKING DATA (ad_tracking database):\n');
    const trackingDb = client.db('ad_tracking');
    
    // Check impression_events collection
    const impressionEvents = await trackingDb.collection('impression_events').find({
      $or: [
        { campaign_id: CAMPAIGN_ID },
        { campaignId: CAMPAIGN_ID },
        { 'metadata.campaignId': CAMPAIGN_ID }
      ]
    }).sort({ timestamp: -1 }).limit(10).toArray();
    
    console.log(`   Impression events: ${impressionEvents.length} (showing last 10)\n`);
    
    if (impressionEvents.length > 0) {
      impressionEvents.forEach((evt: any, idx) => {
        console.log(`   ${idx + 1}. ${evt.timestamp?.toISOString() || evt.createdAt?.toISOString() || 'N/A'}`);
        console.log(`      Order: ${evt.order_id || evt.orderId || 'N/A'}`);
        console.log(`      Creative: ${evt.creative_id || evt.creativeId || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check click_events collection
    const clickEvents = await trackingDb.collection('click_events').find({
      $or: [
        { campaign_id: CAMPAIGN_ID },
        { campaignId: CAMPAIGN_ID },
        { 'metadata.campaignId': CAMPAIGN_ID }
      ]
    }).sort({ timestamp: -1 }).limit(10).toArray();
    
    console.log(`   Click events: ${clickEvents.length} (showing last 10)\n`);
    
    if (clickEvents.length > 0) {
      clickEvents.forEach((evt: any, idx) => {
        console.log(`   ${idx + 1}. ${evt.timestamp?.toISOString() || evt.createdAt?.toISOString() || 'N/A'}`);
        console.log(`      Order: ${evt.order_id || evt.orderId || 'N/A'}`);
        console.log(`      Creative: ${evt.creative_id || evt.creativeId || 'N/A'}`);
        console.log('');
      });
    }
    
    // 5. Check for orders by their IDs in performance_entries
    if (orders.length > 0) {
      console.log('📊 PERFORMANCE BY ORDER:\n');
      
      for (const order of orders) {
        const orderPerfEntries = await db.collection('performance_entries').find({
          orderId: order._id.toString()
        }).toArray();
        
        const totalImpr = orderPerfEntries.reduce((sum: number, e: any) => sum + (e.metrics?.impressions || 0), 0);
        const totalClicks = orderPerfEntries.reduce((sum: number, e: any) => sum + (e.metrics?.clicks || 0), 0);
        
        console.log(`   Order ${order._id}:`);
        console.log(`   → ${orderPerfEntries.length} entries | ${totalImpr} impressions | ${totalClicks} clicks`);
        console.log('');
      }
    }
    
    // 6. Summary
    console.log('='.repeat(80));
    console.log('📋 SUMMARY:\n');
    
    const hasPerformanceData = perfEntries.length > 0;
    const hasTrackingData = impressionEvents.length > 0 || clickEvents.length > 0;
    
    if (hasPerformanceData && (perfEntries.reduce((sum: number, e: any) => sum + (e.metrics?.impressions || 0) + (e.metrics?.clicks || 0), 0) > 0)) {
      console.log('   ✅ Campaign has performance data with impressions/clicks');
      console.log('   ✅ Reporting pipeline is working!');
    } else if (hasTrackingData) {
      console.log('   ⚠️ Raw tracking events exist but not aggregated to performance_entries');
      console.log('   → Lambda aggregator may need to run');
    } else if (hasPerformanceData) {
      console.log('   ⚠️ Performance entries exist but with 0 impressions/clicks');
      console.log('   → Check if tracking pixels are correctly configured');
    } else {
      console.log('   ❌ No tracking or performance data found');
      console.log('   → Verify tracking pixels are firing');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkCampaignReporting()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
