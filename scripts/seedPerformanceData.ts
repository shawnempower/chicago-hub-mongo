/**
 * Seed Performance Data
 * 
 * Inserts realistic performance entries into the staging database
 * for testing the campaign performance dashboard improvements.
 * 
 * Usage: npx tsx scripts/seedPerformanceData.ts
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

interface SeedPublication {
  publicationId: number;
  publicationName: string;
  channels: Array<{
    channel: string;
    itemPath: string;
    itemName: string;
    dimensions?: string;
  }>;
}

async function seedPerformanceData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB:', DB_NAME);
    
    const db = client.db(DB_NAME);
    const campaignsCol = db.collection('campaigns');
    const publicationsCol = db.collection('publications');
    const ordersCol = db.collection('publication_insertion_orders');
    const perfCol = db.collection('performance_entries');
    
    // 1. Find ALL campaigns to seed data for
    const campaigns = await campaignsCol.find({}).sort({ createdAt: -1 }).toArray();
    
    if (campaigns.length === 0) {
      console.log('No campaigns found in database. Cannot seed performance data.');
      return;
    }
    
    console.log(`Found ${campaigns.length} campaigns to seed data for`);
    
    // 2. Get publications
    const publications = await publicationsCol.find({}).project({
      publicationId: 1,
      'basicInfo.publicationName': 1,
    }).limit(20).toArray();
    
    if (publications.length === 0) {
      console.log('No publications found. Cannot seed performance data.');
      return;
    }
    
    console.log(`Found ${publications.length} publications`);
    
    // 3. For each campaign, create performance entries across multiple publications
    let totalInserted = 0;
    
    for (const campaign of campaigns) {
      const campaignId = campaign.campaignId || campaign._id.toString();
      const campaignName = campaign.basicInfo?.name || 'Unknown Campaign';
      
      console.log(`\nSeeding data for campaign: ${campaignName} (${campaignId})`);
      
      // Check for existing insertion orders
      const existingOrders = await ordersCol.find({ campaignId }).toArray();
      
      // Pick 4-8 publications for this campaign
      const numPubs = Math.min(4 + Math.floor(Math.random() * 5), publications.length);
      const shuffled = [...publications].sort(() => Math.random() - 0.5);
      const selectedPubs = shuffled.slice(0, numPubs);
      
      // ~30 day campaigns: 25-35 days of data
      const now = new Date();
      const daysOfData = 25 + Math.floor(Math.random() * 11);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysOfData);
      
      const entries: any[] = [];
      
      for (const pub of selectedPubs) {
        const pubId = pub.publicationId;
        const pubName = pub.basicInfo?.publicationName || `Publication ${pubId}`;
        
        // Find or use a placeholder orderId
        const matchingOrder = existingOrders.find((o: any) => o.publicationId === pubId);
        const orderId = matchingOrder?._id?.toString() || new ObjectId().toString();
        
        // Decide which channels this publication contributes
        const channelOptions = [
          {
            channel: 'website',
            placements: [
              { itemPath: 'distributionChannels.website[0].advertisingOpportunities[0]', itemName: 'Leaderboard Banner', dimensions: '728x90' },
              { itemPath: 'distributionChannels.website[0].advertisingOpportunities[1]', itemName: 'Medium Rectangle', dimensions: '300x250' },
            ]
          },
          {
            channel: 'newsletter',
            placements: [
              { itemPath: 'distributionChannels.newsletter[0].advertisingOpportunities[0]', itemName: 'Newsletter Sponsor Banner', dimensions: '600x200' },
            ]
          },
          {
            channel: 'print',
            placements: [
              { itemPath: 'distributionChannels.print[0].advertisingOpportunities[0]', itemName: 'Half Page Ad', dimensions: 'Half Page' },
            ]
          },
          {
            channel: 'social',
            placements: [
              { itemPath: 'distributionChannels.social[0].advertisingOpportunities[0]', itemName: 'Sponsored Social Post' },
            ]
          },
          {
            channel: 'radio',
            placements: [
              { itemPath: 'distributionChannels.radio[0].advertisingOpportunities[0]', itemName: '30-Second Spot', dimensions: '30 seconds' },
            ]
          },
        ];
        
        // Pick 2-4 channels per publication for a richer mix
        const numChannels = 2 + Math.floor(Math.random() * 3);
        const selectedChannels = channelOptions.sort(() => Math.random() - 0.5).slice(0, numChannels);
        
        for (const channelConfig of selectedChannels) {
          for (const placement of channelConfig.placements) {
            // Generate daily entries
            for (let d = 0; d < daysOfData; d++) {
              const entryDate = new Date(startDate);
              entryDate.setDate(entryDate.getDate() + d);
              
              // Skip weekends for some channels with ~50% probability
              const dayOfWeek = entryDate.getDay();
              if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.4) continue;
              
              // Generate realistic metrics based on channel
              const metrics = generateMetrics(channelConfig.channel, d, daysOfData);
              
              // Skip days with no meaningful data
              if (!metrics) continue;
              
              const entry = {
                orderId,
                campaignId,
                publicationId: pubId,
                publicationName: pubName,
                itemPath: placement.itemPath,
                itemName: placement.itemName,
                channel: channelConfig.channel,
                dimensions: placement.dimensions,
                dateStart: entryDate,
                dateEnd: entryDate,
                metrics,
                source: 'manual' as const,
                enteredBy: 'seed-script',
                enteredAt: new Date(),
                notes: 'Seeded test data',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              entries.push(entry);
            }
          }
        }
      }
      
      if (entries.length > 0) {
        // Remove any existing seed data for this campaign
        const deleteResult = await perfCol.deleteMany({
          campaignId,
          enteredBy: 'seed-script',
        });
        if (deleteResult.deletedCount > 0) {
          console.log(`  Removed ${deleteResult.deletedCount} existing seed entries`);
        }
        
        const result = await perfCol.insertMany(entries);
        totalInserted += result.insertedCount;
        console.log(`  Inserted ${result.insertedCount} performance entries across ${selectedPubs.length} publications`);
        
        // Print breakdown
        const channelBreakdown: Record<string, number> = {};
        for (const e of entries) {
          channelBreakdown[e.channel] = (channelBreakdown[e.channel] || 0) + 1;
        }
        console.log('  Channel breakdown:', channelBreakdown);
      }
    }
    
    console.log(`\nDone! Total entries inserted: ${totalInserted}`);
    
    // Print some stats for verification
    const totalEntries = await perfCol.countDocuments({ deletedAt: { $exists: false } });
    console.log(`Total performance entries in DB: ${totalEntries}`);
    
  } catch (error) {
    console.error('Error seeding performance data:', error);
  } finally {
    await client.close();
  }
}

function generateMetrics(channel: string, dayIndex: number, totalDays: number): any | null {
  // Create a ramp-up effect (metrics grow over time with variance)
  const progress = dayIndex / totalDays;
  const rampMultiplier = 0.5 + (progress * 0.7); // Starts at 50%, grows to 120% of base
  const dailyVariance = 0.6 + (Math.random() * 0.8); // 60%-140% daily variance
  
  // Occasionally skip a day (5% chance)
  if (Math.random() < 0.05) return null;
  
  switch (channel) {
    case 'website': {
      const baseImpressions = 800 + Math.floor(Math.random() * 2000);
      const impressions = Math.round(baseImpressions * rampMultiplier * dailyVariance);
      const clickRate = 0.005 + (Math.random() * 0.025); // 0.5% - 3% CTR
      const clicks = Math.round(impressions * clickRate);
      const reach = Math.round(impressions * (0.6 + Math.random() * 0.3));
      return {
        impressions,
        clicks,
        ctr: Number(((clicks / impressions) * 100).toFixed(2)),
        reach,
        viewability: Math.round(65 + Math.random() * 30), // 65-95%
      };
    }
    
    case 'newsletter': {
      const baseImpressions = 2000 + Math.floor(Math.random() * 5000);
      const impressions = Math.round(baseImpressions * rampMultiplier * dailyVariance);
      const clickRate = 0.01 + (Math.random() * 0.04); // 1% - 5% CTR (higher for newsletter)
      const clicks = Math.round(impressions * clickRate);
      const reach = Math.round(impressions * 0.9); // Newsletter reach is closer to impressions
      return {
        impressions,
        clicks,
        ctr: Number(((clicks / impressions) * 100).toFixed(2)),
        reach,
      };
    }
    
    case 'print': {
      // Print is weekly, so only generate on some days
      if (dayIndex % 7 !== 0) return null;
      const circulation = 15000 + Math.floor(Math.random() * 35000);
      return {
        insertions: 1,
        circulation,
        impressions: circulation, // Approximate impressions = circulation for print
        reach: Math.round(circulation * (0.4 + Math.random() * 0.3)),
      };
    }
    
    case 'radio': {
      const spotsAired = 2 + Math.floor(Math.random() * 6);
      const reachPerSpot = 5000 + Math.floor(Math.random() * 15000);
      return {
        spotsAired,
        impressions: spotsAired * reachPerSpot,
        reach: Math.round(reachPerSpot * (1 + Math.random() * 0.5)),
        frequency: Number((1.5 + Math.random() * 3).toFixed(1)),
      };
    }
    
    case 'social': {
      // Social posts are less frequent
      if (Math.random() < 0.6) return null; // Only ~40% of days
      const posts = 1 + Math.floor(Math.random() * 2);
      const impressions = Math.round((1000 + Math.random() * 8000) * dailyVariance);
      const engagementRate = 0.01 + Math.random() * 0.06;
      return {
        posts,
        impressions,
        reach: Math.round(impressions * (0.5 + Math.random() * 0.4)),
        engagements: Math.round(impressions * engagementRate),
        shares: Math.floor(Math.random() * 20),
        clicks: Math.round(impressions * (0.005 + Math.random() * 0.02)),
      };
    }
    
    case 'podcast': {
      // Podcasts are weekly typically
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

seedPerformanceData();
