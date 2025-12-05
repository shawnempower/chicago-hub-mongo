/**
 * List All Campaigns
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listCampaigns() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'chicago-hub';
    console.log(`📂 Using database: ${dbName}\n`);
    const db = client.db(dbName);
    const campaigns = await db.collection('campaigns').find({}).sort({ createdAt: -1 }).toArray();

    console.log(`📋 Found ${campaigns.length} campaigns:\n`);

    campaigns.forEach((c: any, i: number) => {
      console.log(`${i + 1}. ID: ${c._id}`);
      console.log(`   Campaign ID: ${c.campaignId || 'N/A'}`);
      console.log(`   Name: ${c.basicInfo?.name || c.campaignName || c.name || 'Unnamed'}`);
      console.log(`   Status: ${c.status || 'N/A'}`);
      console.log(`   Business: ${c.basicInfo?.businessName || c.businessName || 'N/A'}`);
      
      // Handle inventory in both formats
      let invItems: any[] = [];
      if (c.selectedInventory?.publications) {
        c.selectedInventory.publications.forEach((pub: any) => {
          if (pub.inventoryItems) invItems.push(...pub.inventoryItems);
        });
      } else if (Array.isArray(c.selectedInventory)) {
        invItems = c.selectedInventory;
      }
      
      console.log(`   Inventory: ${invItems.length} items`);
      
      // Count by channel
      const channelCounts = new Map<string, number>();
      invItems.forEach((item: any) => {
        const ch = item.channel || 'unknown';
        channelCounts.set(ch, (channelCounts.get(ch) || 0) + 1);
      });
      
      if (channelCounts.size > 0) {
        const channelStr = Array.from(channelCounts.entries())
          .map(([ch, cnt]) => `${ch}: ${cnt}`)
          .join(', ');
        console.log(`   Channels: ${channelStr}`);
      }
      console.log();
    });

  } finally {
    await client.close();
  }
}

listCampaigns().then(() => process.exit(0)).catch(console.error);

