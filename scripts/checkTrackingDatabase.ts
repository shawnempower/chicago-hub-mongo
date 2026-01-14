/**
 * Check Tracking Events in Database
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

async function checkDatabase() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('='.repeat(80));
    console.log('📊 TRACKING EVENTS DATABASE');
    console.log('='.repeat(80));
    
    // Total count
    const totalEvents = await db.collection('tracking_events').countDocuments({});
    console.log(`\n📈 Total Events: ${totalEvents.toLocaleString()}\n`);
    
    // Events by type
    console.log('📋 Events by Type:\n');
    const byType = await db.collection('tracking_events').aggregate([
      { $group: { _id: '$event_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    byType.forEach((item: any) => {
      console.log(`   ${item._id.padEnd(15)}: ${item.count.toLocaleString()}`);
    });
    
    // Events by campaign
    console.log('\n\n📊 Events by Campaign:\n');
    const byCampaign = await db.collection('tracking_events').aggregate([
      { 
        $group: { 
          _id: '$campaign_id',
          impressions: { $sum: { $cond: [{ $eq: ['$event_type', 'impression'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    byCampaign.forEach((item: any, idx) => {
      const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00';
      console.log(`   ${idx + 1}. ${item._id}`);
      console.log(`      Impressions: ${item.impressions.toLocaleString()}`);
      console.log(`      Clicks: ${item.clicks.toLocaleString()}`);
      console.log(`      CTR: ${ctr}%\n`);
    });
    
    // Recent events
    console.log('\n📅 Most Recent 20 Events:\n');
    const recent = await db.collection('tracking_events')
      .find({})
      .sort({ event_time: -1 })
      .limit(20)
      .toArray();
    
    recent.forEach((event: any, idx) => {
      const age = Math.floor((Date.now() - event.event_time.getTime()) / 1000 / 60);
      const ageStr = age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`;
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${event.event_type.padEnd(10)} | ${event.campaign_id.substring(0, 25).padEnd(25)} | ${event.publication_code?.padEnd(15) || 'unknown'.padEnd(15)} | ${ageStr}`);
    });
    
    // Events by publication
    console.log('\n\n📰 Top 10 Publications by Events:\n');
    const byPub = await db.collection('tracking_events').aggregate([
      { 
        $group: { 
          _id: { pubId: '$publication_id', pubCode: '$publication_code' },
          impressions: { $sum: { $cond: [{ $eq: ['$event_type', 'impression'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    byPub.forEach((item: any, idx) => {
      const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00';
      const pubName = item._id.pubCode || `Pub ${item._id.pubId}`;
      console.log(`   ${idx + 1}. ${pubName}`);
      console.log(`      Total: ${item.total.toLocaleString()} | Impressions: ${item.impressions.toLocaleString()} | Clicks: ${item.clicks.toLocaleString()} | CTR: ${ctr}%\n`);
    });
    
    // Time distribution (last 7 days)
    console.log('\n📅 Events by Day (Last 7 Days):\n');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const byDay = await db.collection('tracking_events').aggregate([
      { $match: { event_time: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$event_time' } },
          impressions: { $sum: { $cond: [{ $eq: ['$event_type', 'impression'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]).toArray();
    
    byDay.forEach((item: any) => {
      const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00';
      console.log(`   ${item._id}: ${item.total.toLocaleString().padStart(6)} events (${item.impressions.toLocaleString().padStart(6)} imp, ${item.clicks.toLocaleString().padStart(5)} clicks, ${ctr}% CTR)`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database check complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

checkDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
