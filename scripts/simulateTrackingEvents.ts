/**
 * Simulate Tracking Events for Production Campaigns
 * 
 * This script:
 * 1. Queries active campaigns from production database
 * 2. Finds their publication orders and tracking scripts
 * 3. Simulates impression pixels and click tracking
 * 4. Inserts test tracking data to verify performance metrics display
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

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

interface Campaign {
  _id: ObjectId;
  campaignId: string;
  advertiserName: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

interface PublicationOrder {
  _id: ObjectId;
  campaignId: string;
  publicationId: number;
  publicationName: string;
  status: string;
}

interface TrackingScript {
  _id: ObjectId;
  campaignId: string;
  publicationId: number;
  creativeId: string;
  channel: string;
  urls: {
    impressionPixel: string;
    clickTracker: string;
  };
}

async function simulateTrackingEvents() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // Step 1: Find active campaigns
    console.log('📊 Querying active campaigns...\n');
    const campaigns = await db.collection<Campaign>('campaigns')
      .find({
        deletedAt: { $exists: false },
        status: { $in: ['active', 'approved', 'in_progress'] }
      })
      .limit(5)
      .toArray();
    
    if (campaigns.length === 0) {
      console.log('⚠️  No active campaigns found. Looking for any campaigns...\n');
      const anyCampaigns = await db.collection<Campaign>('campaigns')
        .find({ deletedAt: { $exists: false } })
        .limit(5)
        .toArray();
      
      if (anyCampaigns.length === 0) {
        console.log('❌ No campaigns found in database');
        return;
      }
      campaigns.push(...anyCampaigns);
    }
    
    console.log(`Found ${campaigns.length} campaigns:\n`);
    campaigns.forEach((campaign, idx) => {
      console.log(`${idx + 1}. ${campaign.name}`);
      console.log(`   ID: ${campaign.campaignId}`);
      console.log(`   Advertiser: ${campaign.advertiserName || 'N/A'}`);
      console.log(`   Status: ${campaign.status}`);
      console.log('');
    });
    
    // Step 2: For each campaign, find orders and tracking scripts
    for (const campaign of campaigns) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎯 Campaign: ${campaign.name} (${campaign.campaignId})`);
      console.log('='.repeat(80));
      
      // Find publication orders
      const orders = await db.collection<PublicationOrder>('publication_insertion_orders')
        .find({
          campaignId: campaign.campaignId,
          deletedAt: { $exists: false }
        })
        .toArray();
      
      console.log(`\n📰 Found ${orders.length} publication order(s)`);
      
      if (orders.length === 0) {
        console.log('⚠️  No orders found for this campaign, skipping...');
        continue;
      }
      
      // Find tracking scripts
      const trackingScripts = await db.collection<TrackingScript>('tracking_scripts')
        .find({
          campaignId: campaign.campaignId,
          deletedAt: { $exists: false }
        })
        .toArray();
      
      console.log(`🔗 Found ${trackingScripts.length} tracking script(s)`);
      
      if (trackingScripts.length === 0) {
        console.log('⚠️  No tracking scripts found for this campaign');
        console.log('   You may need to generate tracking scripts first');
      }
      
      // Step 3: Simulate tracking events
      const eventsToCreate = [];
      const now = new Date();
      
      for (const order of orders) {
        console.log(`\n   📋 Order: ${order.publicationName} (ID: ${order._id})`);
        
        // Generate random tracking events for the past 7 days
        const daysToSimulate = 7;
        const eventsPerDay = {
          impressions: Math.floor(Math.random() * 500) + 100, // 100-600 per day
          clicks: Math.floor(Math.random() * 50) + 10 // 10-60 per day
        };
        
        console.log(`   🎲 Simulating ${eventsPerDay.impressions} impressions/day, ${eventsPerDay.clicks} clicks/day`);
        
        for (let day = 0; day < daysToSimulate; day++) {
          const eventDate = new Date(now);
          eventDate.setDate(eventDate.getDate() - day);
          
          // Create impression events
          for (let i = 0; i < eventsPerDay.impressions; i++) {
            const eventTime = new Date(eventDate);
            eventTime.setHours(Math.floor(Math.random() * 24));
            eventTime.setMinutes(Math.floor(Math.random() * 60));
            eventTime.setSeconds(Math.floor(Math.random() * 60));
            
            eventsToCreate.push({
              event_id: new ObjectId(),
              event_type: 'impression',
              event_time: eventTime,
              campaign_id: campaign.campaignId,
              creative_id: trackingScripts[0]?.creativeId || `cr_${campaign.campaignId}_default`,
              publication_id: order.publicationId,
              publication_code: order.publicationName.toLowerCase().replace(/\s+/g, ''),
              placement_id: null,
              channel: trackingScripts[0]?.channel || 'website',
              ad_size: '300x250',
              session_id: generateSessionId(),
              user_hash: generateUserHash(),
              ip_address: generateRandomIP(),
              user_agent: getRandomUserAgent(),
              referer_url: `https://${order.publicationName.toLowerCase().replace(/\s+/g, '')}.com/article`,
              landing_url: null,
              country_code: 'US',
              region_code: 'IL',
              city: 'Chicago',
              device_type: getRandomDevice(),
              browser: 'Chrome',
              os: 'Windows',
              is_suspicious: false,
              fraud_score: 0,
              processed_at: new Date(),
              batch_id: `batch_${Date.now()}`
            });
          }
          
          // Create click events (subset of impressions)
          for (let i = 0; i < eventsPerDay.clicks; i++) {
            const eventTime = new Date(eventDate);
            eventTime.setHours(Math.floor(Math.random() * 24));
            eventTime.setMinutes(Math.floor(Math.random() * 60));
            eventTime.setSeconds(Math.floor(Math.random() * 60));
            
            eventsToCreate.push({
              event_id: new ObjectId(),
              event_type: 'click',
              event_time: eventTime,
              campaign_id: campaign.campaignId,
              creative_id: trackingScripts[0]?.creativeId || `cr_${campaign.campaignId}_default`,
              publication_id: order.publicationId,
              publication_code: order.publicationName.toLowerCase().replace(/\s+/g, ''),
              placement_id: null,
              channel: trackingScripts[0]?.channel || 'website',
              ad_size: '300x250',
              session_id: generateSessionId(),
              user_hash: generateUserHash(),
              ip_address: generateRandomIP(),
              user_agent: getRandomUserAgent(),
              referer_url: `https://${order.publicationName.toLowerCase().replace(/\s+/g, '')}.com/article`,
              landing_url: 'https://advertiser.com/landing',
              country_code: 'US',
              region_code: 'IL',
              city: 'Chicago',
              device_type: getRandomDevice(),
              browser: 'Chrome',
              os: 'Windows',
              is_suspicious: false,
              fraud_score: 0,
              processed_at: new Date(),
              batch_id: `batch_${Date.now()}`
            });
          }
        }
      }
      
      // Step 4: Insert tracking events
      if (eventsToCreate.length > 0) {
        console.log(`\n   💾 Inserting ${eventsToCreate.length} tracking events...`);
        
        const trackingEventsCollection = db.collection('tracking_events');
        const result = await trackingEventsCollection.insertMany(eventsToCreate);
        
        console.log(`   ✅ Successfully inserted ${result.insertedCount} events`);
        
        // Calculate and display metrics
        const impressions = eventsToCreate.filter(e => e.event_type === 'impression').length;
        const clicks = eventsToCreate.filter(e => e.event_type === 'click').length;
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        
        console.log(`\n   📊 Summary:`);
        console.log(`      Impressions: ${impressions.toLocaleString()}`);
        console.log(`      Clicks: ${clicks.toLocaleString()}`);
        console.log(`      CTR: ${ctr}%`);
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SIMULATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\n🔍 You can now check the performance metrics in:');
    console.log('   - Campaign Detail pages (Performance tab)');
    console.log('   - Hub Central Dashboard (Admin)');
    console.log('   - Publication Order Details');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Helper functions
function generateSessionId(): string {
  return `sess_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

function generateUserHash(): string {
  return `user_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomDevice(): string {
  const devices = ['desktop', 'mobile', 'tablet'];
  const weights = [0.6, 0.3, 0.1]; // 60% desktop, 30% mobile, 10% tablet
  
  const rand = Math.random();
  let sum = 0;
  for (let i = 0; i < devices.length; i++) {
    sum += weights[i];
    if (rand <= sum) return devices[i];
  }
  return 'desktop';
}

// Run the script
simulateTrackingEvents()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
