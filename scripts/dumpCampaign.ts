import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function dumpCampaign(campaignId: string) {
  const mongoUri = process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('chicago-hub');
    
    // Try to find by _id
    const { ObjectId } = await import('mongodb');
    let campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(campaignId) });
    
    if (!campaign) {
      // Search for "Coca Cola"
      campaign = await db.collection('campaigns').findOne({
        $or: [
          { campaignName: /coca/i },
          { name: /coca/i },
          { businessName: /coca/i },
          { 'briefing.businessName': /coca/i }
        ]
      });
    }
    
    if (!campaign) {
      console.log('❌ Campaign not found\n');
      
      // Show what campaigns exist
      const all = await db.collection('campaigns').find({}).toArray();
      console.log('All campaigns:');
      all.forEach((c: any) => {
        console.log(JSON.stringify({
          _id: c._id,
          campaignId: c.campaignId,
          name: c.name || c.campaignName,
          briefing: c.briefing,
          status: c.status
        }, null, 2));
      });
      return;
    }
    
    console.log('\n📋 FULL CAMPAIGN DATA:\n');
    console.log(JSON.stringify(campaign, null, 2));

  } finally {
    await client.close();
  }
}

dumpCampaign('6930b89875fbc543afebf055').then(() => process.exit(0)).catch(console.error);

