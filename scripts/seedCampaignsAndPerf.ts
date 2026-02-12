/**
 * Seed Test Campaigns + Performance Data
 * 
 * Creates several realistic ~30-day campaigns with performance entries
 * across multiple publications and channels.
 * 
 * Usage: npx tsx scripts/seedCampaignsAndPerf.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || 'staging-chicago-hub';

const TEST_CAMPAIGNS = [
  {
    name: 'Midwest Auto Group - Spring Sale',
    advertiserName: 'Midwest Auto Group',
    status: 'active',
    daysAgo: 28,   // started 28 days ago
    duration: 30,   // 30 day campaign
    budget: 15000,
    channelMix: ['website', 'newsletter', 'radio', 'print'],
    pubCount: 6,
  },
  {
    name: 'Lincoln Park Dental - New Patient Drive',
    advertiserName: 'Lincoln Park Dental',
    status: 'active',
    daysAgo: 18,
    duration: 30,
    budget: 5000,
    channelMix: ['website', 'newsletter', 'social'],
    pubCount: 4,
  },
  {
    name: 'Chicago Food Festival 2026',
    advertiserName: 'Chicago Events Board',
    status: 'active',
    daysAgo: 25,
    duration: 35,
    budget: 25000,
    channelMix: ['website', 'newsletter', 'social', 'radio', 'print'],
    pubCount: 8,
  },
  {
    name: 'Oak Park Real Estate - Luxury Listings',
    advertiserName: 'Oak Park Premier Realty',
    status: 'delivered',
    daysAgo: 35,
    duration: 30,
    budget: 8000,
    channelMix: ['website', 'print', 'social'],
    pubCount: 5,
  },
  {
    name: 'Northshore Health System - Flu Season',
    advertiserName: 'Northshore Health System',
    status: 'active',
    daysAgo: 12,
    duration: 30,
    budget: 12000,
    channelMix: ['website', 'newsletter', 'radio'],
    pubCount: 5,
  },
];

const CHANNEL_PLACEMENTS: Record<string, Array<{ itemPath: string; itemName: string; dimensions?: string }>> = {
  website: [
    { itemPath: 'distributionChannels.website[0].advertisingOpportunities[0]', itemName: 'Leaderboard Banner', dimensions: '728x90' },
    { itemPath: 'distributionChannels.website[0].advertisingOpportunities[1]', itemName: 'Medium Rectangle', dimensions: '300x250' },
    { itemPath: 'distributionChannels.website[0].advertisingOpportunities[2]', itemName: 'Sidebar Skyscraper', dimensions: '160x600' },
  ],
  newsletter: [
    { itemPath: 'distributionChannels.newsletter[0].advertisingOpportunities[0]', itemName: 'Newsletter Sponsor Banner', dimensions: '600x200' },
    { itemPath: 'distributionChannels.newsletter[0].advertisingOpportunities[1]', itemName: 'Inline Content Block', dimensions: '600x150' },
  ],
  print: [
    { itemPath: 'distributionChannels.print[0].advertisingOpportunities[0]', itemName: 'Half Page Ad', dimensions: 'Half Page' },
    { itemPath: 'distributionChannels.print[0].advertisingOpportunities[1]', itemName: 'Quarter Page Ad', dimensions: 'Quarter Page' },
  ],
  radio: [
    { itemPath: 'distributionChannels.radio[0].advertisingOpportunities[0]', itemName: '30-Second Spot', dimensions: '30 seconds' },
    { itemPath: 'distributionChannels.radio[0].advertisingOpportunities[1]', itemName: '60-Second Feature', dimensions: '60 seconds' },
  ],
  social: [
    { itemPath: 'distributionChannels.social[0].advertisingOpportunities[0]', itemName: 'Sponsored Social Post' },
    { itemPath: 'distributionChannels.social[0].advertisingOpportunities[1]', itemName: 'Instagram Story Ad' },
  ],
  podcast: [
    { itemPath: 'distributionChannels.podcast[0].advertisingOpportunities[0]', itemName: 'Pre-Roll Ad Read', dimensions: '15 seconds' },
  ],
};

function generateMetrics(channel: string, dayIndex: number, totalDays: number): any | null {
  const progress = dayIndex / totalDays;
  const rampMultiplier = 0.5 + (progress * 0.7);
  const dailyVariance = 0.6 + (Math.random() * 0.8);
  
  if (Math.random() < 0.04) return null;
  
  switch (channel) {
    case 'website': {
      const baseImpressions = 800 + Math.floor(Math.random() * 2500);
      const impressions = Math.round(baseImpressions * rampMultiplier * dailyVariance);
      const clickRate = 0.005 + (Math.random() * 0.025);
      const clicks = Math.round(impressions * clickRate);
      const reach = Math.round(impressions * (0.6 + Math.random() * 0.3));
      return {
        impressions, clicks,
        ctr: Number(((clicks / impressions) * 100).toFixed(2)),
        reach,
        viewability: Math.round(65 + Math.random() * 30),
      };
    }
    case 'newsletter': {
      const baseImpressions = 2000 + Math.floor(Math.random() * 6000);
      const impressions = Math.round(baseImpressions * rampMultiplier * dailyVariance);
      const clickRate = 0.01 + (Math.random() * 0.04);
      const clicks = Math.round(impressions * clickRate);
      return {
        impressions, clicks,
        ctr: Number(((clicks / impressions) * 100).toFixed(2)),
        reach: Math.round(impressions * 0.9),
      };
    }
    case 'print': {
      if (dayIndex % 7 !== 0) return null;
      const circulation = 12000 + Math.floor(Math.random() * 40000);
      return {
        insertions: 1,
        circulation,
        impressions: circulation,
        reach: Math.round(circulation * (0.4 + Math.random() * 0.3)),
      };
    }
    case 'radio': {
      const spotsAired = 2 + Math.floor(Math.random() * 6);
      const reachPerSpot = 5000 + Math.floor(Math.random() * 15000);
      return {
        spotsAired, impressions: spotsAired * reachPerSpot,
        reach: Math.round(reachPerSpot * (1 + Math.random() * 0.5)),
        frequency: Number((1.5 + Math.random() * 3).toFixed(1)),
      };
    }
    case 'social': {
      if (Math.random() < 0.55) return null;
      const posts = 1 + Math.floor(Math.random() * 2);
      const impressions = Math.round((1000 + Math.random() * 8000) * dailyVariance);
      const engagementRate = 0.01 + Math.random() * 0.06;
      return {
        posts, impressions,
        reach: Math.round(impressions * (0.5 + Math.random() * 0.4)),
        engagements: Math.round(impressions * engagementRate),
        shares: Math.floor(Math.random() * 25),
        clicks: Math.round(impressions * (0.005 + Math.random() * 0.02)),
      };
    }
    case 'podcast': {
      if (dayIndex % 7 !== 2) return null;
      const downloads = 500 + Math.floor(Math.random() * 3000);
      return {
        downloads,
        listens: Math.round(downloads * (0.6 + Math.random() * 0.3)),
        impressions: downloads,
        reach: Math.round(downloads * 0.85),
        completionRate: Math.round(55 + Math.random() * 35),
      };
    }
    default:
      return { impressions: Math.floor(Math.random() * 1000), reach: Math.floor(Math.random() * 500) };
  }
}

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB:', DB_NAME);
    
    const db = client.db(DB_NAME);
    const campaignsCol = db.collection('campaigns');
    const publicationsCol = db.collection('publications');
    const perfCol = db.collection('performance_entries');
    
    // Get publications
    const publications = await publicationsCol.find({}).project({
      publicationId: 1,
      'basicInfo.publicationName': 1,
    }).limit(20).toArray();
    
    if (publications.length === 0) {
      console.log('No publications found. Cannot seed.');
      return;
    }
    console.log(`Found ${publications.length} publications to use\n`);
    
    let totalEntries = 0;
    
    for (const campConfig of TEST_CAMPAIGNS) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - campConfig.daysAgo);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + campConfig.duration);
      
      const campaignId = `campaign-test-${campConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`;
      
      // Check if campaign already exists
      const existing = await campaignsCol.findOne({ campaignId });
      if (existing) {
        console.log(`Campaign "${campConfig.name}" already exists, updating performance data...`);
      } else {
        // Create the campaign
        await campaignsCol.insertOne({
          campaignId,
          basicInfo: {
            name: campConfig.name,
            advertiserName: campConfig.advertiserName,
            description: `Test campaign: ${campConfig.name}`,
          },
          status: campConfig.status,
          timeline: {
            startDate,
            endDate,
          },
          objectives: {
            budget: {
              totalBudget: campConfig.budget,
              monthlyBudget: Math.round(campConfig.budget / (campConfig.duration / 30)),
              currency: 'USD',
            },
          },
          pricing: {
            total: campConfig.budget,
            monthlyTotal: Math.round(campConfig.budget / (campConfig.duration / 30)),
          },
          selectedInventory: { publications: [] },
          metadata: { createdAt: new Date(), updatedAt: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`Created campaign: "${campConfig.name}" (${campaignId})`);
      }
      
      // Pick publications
      const shuffled = [...publications].sort(() => Math.random() - 0.5);
      const selectedPubs = shuffled.slice(0, Math.min(campConfig.pubCount, publications.length));
      
      // Remove existing seed data
      const deleted = await perfCol.deleteMany({ campaignId, enteredBy: 'seed-script' });
      if (deleted.deletedCount > 0) {
        console.log(`  Removed ${deleted.deletedCount} old seed entries`);
      }
      
      const entries: any[] = [];
      const daysToGenerate = Math.min(campConfig.daysAgo, campConfig.duration);
      
      for (const pub of selectedPubs) {
        const pubId = pub.publicationId;
        const pubName = pub.basicInfo?.publicationName || `Publication ${pubId}`;
        const orderId = new ObjectId().toString();
        
        // Each pub gets 1-2 random placements from the campaign's channel mix
        for (const channel of campConfig.channelMix) {
          const placements = CHANNEL_PLACEMENTS[channel] || [];
          // Pick 1 placement per channel per pub
          const placement = placements[Math.floor(Math.random() * placements.length)];
          if (!placement) continue;
          
          for (let d = 0; d < daysToGenerate; d++) {
            const entryDate = new Date(startDate);
            entryDate.setDate(entryDate.getDate() + d);
            
            // Skip some weekends
            const dow = entryDate.getDay();
            if ((dow === 0 || dow === 6) && Math.random() > 0.4) continue;
            
            const metrics = generateMetrics(channel, d, daysToGenerate);
            if (!metrics) continue;
            
            entries.push({
              orderId,
              campaignId,
              publicationId: pubId,
              publicationName: pubName,
              itemPath: placement.itemPath,
              itemName: placement.itemName,
              channel,
              dimensions: placement.dimensions,
              dateStart: entryDate,
              dateEnd: entryDate,
              metrics,
              source: 'manual',
              enteredBy: 'seed-script',
              enteredAt: new Date(),
              notes: 'Seeded test data',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
      
      if (entries.length > 0) {
        const result = await perfCol.insertMany(entries);
        totalEntries += result.insertedCount;
        
        const channelBreakdown: Record<string, number> = {};
        for (const e of entries) {
          channelBreakdown[e.channel] = (channelBreakdown[e.channel] || 0) + 1;
        }
        console.log(`  ${result.insertedCount} entries across ${selectedPubs.length} pubs | Channels: ${JSON.stringify(channelBreakdown)}`);
      }
      console.log('');
    }
    
    const total = await perfCol.countDocuments({ deletedAt: { $exists: false } });
    console.log(`\nDone! Inserted ${totalEntries} entries total.`);
    console.log(`Total performance entries in DB: ${total}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

seed();
