/**
 * Seed Performance Data Script
 * 
 * Creates sample performance entries, proofs, and tracking scripts
 * using existing campaigns and insertion orders from the database.
 * 
 * Run with: npx tsx scripts/seedPerformanceData.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'staging-chicago-hub';

// Sample performance data generators
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Channel-specific metric generators
function generateDigitalMetrics(channel: string) {
  const impressions = randomBetween(5000, 50000);
  const clicks = randomBetween(Math.floor(impressions * 0.005), Math.floor(impressions * 0.03));
  return {
    impressions,
    clicks,
    ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
    viewability: randomFloat(60, 95)
  };
}

function generatePrintMetrics() {
  const circulation = randomBetween(10000, 100000);
  return {
    insertions: randomBetween(1, 4),
    circulation,
    reach: Math.floor(circulation * randomFloat(0.4, 0.7))
  };
}

function generateRadioMetrics() {
  return {
    spotsAired: randomBetween(10, 50),
    reach: randomBetween(5000, 50000),
    frequency: randomFloat(2, 5, 1)
  };
}

function generatePodcastMetrics() {
  const downloads = randomBetween(1000, 20000);
  return {
    downloads,
    listens: Math.floor(downloads * randomFloat(0.6, 0.9)),
    completionRate: randomFloat(40, 80)
  };
}

function generateSocialMetrics() {
  const posts = randomBetween(2, 10);
  return {
    posts,
    engagements: randomBetween(100, 5000),
    shares: randomBetween(10, 500),
    reach: randomBetween(2000, 30000),
    videoViews: randomBetween(500, 10000)
  };
}

function generateEventsMetrics() {
  return {
    attendance: randomBetween(50, 500)
  };
}

function getMetricsForChannel(channel: string) {
  switch (channel) {
    case 'website':
    case 'newsletter':
    case 'streaming':
      return generateDigitalMetrics(channel);
    case 'print':
      return generatePrintMetrics();
    case 'radio':
      return generateRadioMetrics();
    case 'podcast':
      return generatePodcastMetrics();
    case 'social':
      return generateSocialMetrics();
    case 'events':
      return generateEventsMetrics();
    default:
      return generateDigitalMetrics(channel);
  }
}

async function seedPerformanceData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    console.log(`Using database: ${DATABASE_NAME}`);
    
    // Find existing campaigns
    const campaigns = await db.collection('campaigns').find({
      deletedAt: { $exists: false }
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    if (campaigns.length === 0) {
      console.log('No campaigns found. Please create a campaign first.');
      return;
    }
    
    console.log(`Found ${campaigns.length} campaign(s)`);
    campaigns.forEach(c => {
      console.log(`  - ${c.basicInfo?.name || c.campaignId} (${c.campaignId})`);
    });
    
    // Find existing insertion orders
    const orders = await db.collection('publication_insertion_orders').find({
      deletedAt: { $exists: false }
    }).sort({ generatedAt: -1 }).toArray();
    
    if (orders.length === 0) {
      console.log('No insertion orders found. Please generate orders first.');
      return;
    }
    
    console.log(`\nFound ${orders.length} insertion order(s)`);
    
    // Collections
    const perfEntries = db.collection('performance_entries');
    const proofs = db.collection('proof_of_performance');
    const trackingScripts = db.collection('tracking_scripts');
    
    // Clear existing sample data (optional - comment out to append)
    console.log('\nClearing existing performance data...');
    await perfEntries.deleteMany({});
    await proofs.deleteMany({});
    await trackingScripts.deleteMany({});
    
    let entriesCreated = 0;
    let proofsCreated = 0;
    let scriptsCreated = 0;
    
    for (const order of orders) {
      const campaign = campaigns.find(c => c.campaignId === order.campaignId);
      if (!campaign) {
        console.log(`  Skipping order for unknown campaign: ${order.campaignId}`);
        continue;
      }
      
      console.log(`\nProcessing order for: ${order.publicationName} (Campaign: ${campaign.basicInfo?.name || order.campaignId})`);
      
      // Get placements from the order or campaign
      const publication = campaign.selectedInventory?.publications?.find(
        (p: any) => p.publicationId === order.publicationId
      );
      const placements = publication?.inventoryItems || [];
      
      if (placements.length === 0) {
        console.log(`  No placements found for this order`);
        continue;
      }
      
      console.log(`  Found ${placements.length} placement(s)`);
      
      // Determine date range for performance data
      const startDate = campaign.timeline?.startDate 
        ? new Date(campaign.timeline.startDate) 
        : addDays(new Date(), -30);
      const endDate = campaign.timeline?.endDate 
        ? new Date(campaign.timeline.endDate) 
        : new Date();
      
      // Generate performance entries for each placement
      for (const placement of placements) {
        const channel = placement.channel || 'website';
        const itemPath = placement.itemPath || placement.sourcePath || `placement-${placements.indexOf(placement)}`;
        const itemName = placement.itemName || 'Unknown Placement';
        const dimensions = placement.format?.dimensions || '';
        
        console.log(`    - ${itemName} (${channel})`);
        
        // Generate 3-10 performance entries over the campaign period
        const numEntries = randomBetween(3, 10);
        const daysBetween = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * numEntries)));
        
        for (let i = 0; i < numEntries; i++) {
          const entryDate = addDays(startDate, i * daysBetween + randomBetween(0, 2));
          if (entryDate > new Date()) break; // Don't create future entries
          
          const metrics = getMetricsForChannel(channel);
          
          const entry = {
            orderId: order._id.toString(),
            campaignId: order.campaignId,
            publicationId: order.publicationId,
            publicationName: order.publicationName,
            itemPath,
            itemName,
            channel,
            dimensions,
            dateStart: entryDate,
            dateEnd: channel === 'print' || channel === 'radio' ? addDays(entryDate, randomBetween(1, 7)) : undefined,
            metrics,
            source: Math.random() > 0.7 ? 'import' : 'manual',
            enteredBy: 'seed-script',
            enteredAt: new Date(),
            notes: i === 0 ? `Initial ${channel} performance data` : undefined
          };
          
          await perfEntries.insertOne(entry);
          entriesCreated++;
        }
        
        // Create proof of performance for some placements
        if (Math.random() > 0.3) {
          const proofTypes = {
            print: ['tearsheet', 'invoice'],
            radio: ['affidavit', 'audio_log'],
            podcast: ['report', 'screenshot'],
            social: ['screenshot', 'report'],
            events: ['screenshot', 'report'],
            website: ['screenshot', 'report'],
            newsletter: ['screenshot', 'report'],
            streaming: ['report', 'video_clip']
          };
          
          const fileType = (proofTypes[channel as keyof typeof proofTypes] || ['other'])[
            randomBetween(0, (proofTypes[channel as keyof typeof proofTypes] || ['other']).length - 1)
          ];
          
          const proof = {
            orderId: order._id.toString(),
            campaignId: order.campaignId,
            publicationId: order.publicationId,
            publicationName: order.publicationName,
            itemPath,
            itemName,
            channel,
            dimensions,
            fileType,
            fileName: `${channel}_proof_${order.publicationId}_${Date.now()}.${fileType === 'audio_log' ? 'mp3' : fileType === 'video_clip' ? 'mp4' : 'pdf'}`,
            fileUrl: `https://example-bucket.s3.amazonaws.com/proofs/${order.campaignId}/${fileType}_sample.pdf`,
            s3Key: `proofs/${order.campaignId}/${fileType}_sample.pdf`,
            fileSize: randomBetween(100000, 5000000),
            mimeType: fileType === 'audio_log' ? 'audio/mpeg' : fileType === 'video_clip' ? 'video/mp4' : 'application/pdf',
            description: `${channel.charAt(0).toUpperCase() + channel.slice(1)} proof of performance for ${itemName}`,
            runDate: getRandomDate(startDate, endDate),
            uploadedBy: 'seed-script',
            uploadedAt: new Date(),
            verificationStatus: Math.random() > 0.5 ? 'verified' : Math.random() > 0.5 ? 'pending' : 'rejected',
            verifiedBy: Math.random() > 0.5 ? 'seed-script-admin' : undefined,
            verifiedAt: Math.random() > 0.5 ? new Date() : undefined,
            verificationNotes: Math.random() > 0.7 ? 'Verified - looks good!' : undefined
          };
          
          await proofs.insertOne(proof);
          proofsCreated++;
        }
        
        // Create tracking script for digital placements
        if (['website', 'newsletter', 'streaming'].includes(channel)) {
          const trackingChannel = channel === 'newsletter' ? 'newsletter_image' : channel;
          const channelCode = channel === 'website' ? 'display' : channel === 'newsletter' ? 'nli' : 'stream';
          const pubCode = order.publicationName?.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4) || 'pub1';
          
          const creativeId = `creative_${order.campaignId}_${randomBetween(1, 5)}`;
          const sizeStr = (dimensions && typeof dimensions === 'string') ? dimensions : '300x250';
          const sizeParts = sizeStr.includes('x') ? sizeStr.split('x') : ['300', '250'];
          const adWidth = parseInt(sizeParts[0]) || 300;
          const adHeight = parseInt(sizeParts[1]) || 250;
          
          const script = {
            campaignId: order.campaignId,
            creativeId,
            publicationId: order.publicationId,
            publicationCode: pubCode,
            publicationName: order.publicationName,
            channel: trackingChannel,
            creative: {
              name: `${campaign.basicInfo?.advertiserName || 'Advertiser'} - ${sizeStr}`,
              clickUrl: `https://advertiser.example.com/landing?utm_source=${pubCode}&utm_campaign=${order.campaignId}`,
              imageUrl: `https://cdn.example.com/creatives/${creativeId}.jpg`,
              width: adWidth,
              height: adHeight,
              altText: `${campaign.basicInfo?.advertiserName || 'Advertiser'} Ad`
            },
            urls: {
              impressionPixel: `https://track.yournetwork.com/i.gif?cr=${creativeId}&p=${pubCode}&t=${channelCode}&s=${sizeStr}`,
              clickTracker: `https://track.yournetwork.com/c?cr=${creativeId}&p=${pubCode}&t=${channelCode}`,
              creativeUrl: `https://cdn.yournetwork.com/a/${creativeId}.jpg`
            },
            tags: {
              fullTag: `<!-- ${campaign.basicInfo?.advertiserName || 'Advertiser'} | ${campaign.basicInfo?.name || 'Campaign'} | ${sizeStr} -->
<a href="https://track.yournetwork.com/c?cr=${creativeId}&p=${pubCode}&t=${channelCode}">
  <img src="https://cdn.yournetwork.com/a/${creativeId}.jpg" 
       width="${adWidth}" height="${adHeight}" border="0" alt="${campaign.basicInfo?.advertiserName || 'Advertiser'} Ad" />
</a>
<img src="https://track.yournetwork.com/i.gif?cr=${creativeId}&p=${pubCode}&t=${channelCode}&s=${sizeStr}" 
     width="1" height="1" style="display:none;" />`,
              simplifiedTag: channel === 'newsletter' ? `<!-- Simplified for limited HTML -->
<!-- Image URL: https://track.yournetwork.com/c?cr=${creativeId}&p=${pubCode}&t=${channelCode} -->
<!-- Image source: https://cdn.yournetwork.com/a/${creativeId}.jpg -->` : undefined,
              comments: `<!-- ${campaign.basicInfo?.advertiserName || 'Advertiser'} | ${campaign.basicInfo?.name || 'Campaign'} | ${trackingChannel} | ${order.publicationName} -->`
            },
            espCompatibility: 'full',
            generatedAt: new Date(),
            generatedBy: 'seed-script',
            version: 1
          };
          
          await trackingScripts.insertOne(script);
          scriptsCreated++;
        }
      }
      
      // Update order with delivery summary
      const orderEntries = await perfEntries.find({ orderId: order._id.toString() }).toArray();
      const totalDelivered = orderEntries.reduce((sum, e) => {
        return sum + (e.metrics?.impressions || 0) + (e.metrics?.insertions || 0) * 10000 + (e.metrics?.spotsAired || 0) * 1000;
      }, 0);
      
      const totalGoal = randomBetween(100000, 500000);
      
      await db.collection('publication_insertion_orders').updateOne(
        { _id: order._id },
        {
          $set: {
            deliveryGoals: placements.reduce((acc: any, p: any, idx: number) => {
              const path = p.itemPath || p.sourcePath || `placement-${idx}`;
              acc[path] = {
                goalType: ['website', 'newsletter', 'streaming'].includes(p.channel) ? 'impressions' : 'units',
                goalValue: randomBetween(10000, 100000),
                description: `Target for ${p.itemName}`
              };
              return acc;
            }, {}),
            deliverySummary: {
              totalGoalValue: totalGoal,
              totalDelivered,
              percentComplete: Math.min(100, Math.round((totalDelivered / totalGoal) * 100)),
              lastUpdated: new Date()
            },
            proofOfPerformanceRequired: true,
            proofCount: await proofs.countDocuments({ orderId: order._id.toString() })
          }
        }
      );
    }
    
    console.log('\n========================================');
    console.log('Performance Data Seeding Complete!');
    console.log('========================================');
    console.log(`Performance Entries: ${entriesCreated}`);
    console.log(`Proof of Performance: ${proofsCreated}`);
    console.log(`Tracking Scripts: ${scriptsCreated}`);
    console.log('========================================');
    
    // Show sample of created data
    console.log('\nSample Performance Entry:');
    const sampleEntry = await perfEntries.findOne({});
    if (sampleEntry) {
      console.log(JSON.stringify({
        publicationName: sampleEntry.publicationName,
        itemName: sampleEntry.itemName,
        channel: sampleEntry.channel,
        dateStart: sampleEntry.dateStart,
        metrics: sampleEntry.metrics
      }, null, 2));
    }
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
seedPerformanceData();
