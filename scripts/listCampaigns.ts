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
    const db = client.db('chicago-hub');
    const campaigns = await db.collection('campaigns').find({}).toArray();

    console.log(`\n📋 Found ${campaigns.length} campaigns:\n`);

    campaigns.forEach((c: any, i: number) => {
      console.log(`${i + 1}. ID: ${c._id}`);
      console.log(`   Campaign ID: ${c.campaignId || 'N/A'}`);
      console.log(`   Name: ${c.campaignName || c.name || 'Unnamed'}`);
      console.log(`   Status: ${c.status || 'N/A'}`);
      console.log(`   Business: ${c.businessName || 'N/A'}`);
      console.log(`   Inventory: ${c.selectedInventory?.length || 0} items`);
      if (c.selectedInventory?.length > 0) {
        const printCount = c.selectedInventory.filter((i: any) => i.channel === 'print').length;
        if (printCount > 0) {
          console.log(`   📄 Print: ${printCount} items`);
        }
      }
      console.log();
    });

  } finally {
    await client.close();
  }
}

listCampaigns().then(() => process.exit(0)).catch(console.error);

