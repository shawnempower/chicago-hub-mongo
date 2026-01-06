/**
 * Check Tracking Scripts for Chicago Sun-Times
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
  const mongoUri = process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('chicago-hub');
    
    const campaigns = db.collection('campaigns');
    const scripts = db.collection('tracking_scripts');
    const assets = db.collection('creative_assets');
    
    // Get the campaign
    const campaign = await campaigns.findOne({});
    console.log(`Campaign: ${campaign?.basicInfo?.name}`);
    console.log(`campaignId: ${campaign?.campaignId}\n`);
    
    // Get ALL tracking scripts for this campaign
    console.log('='.repeat(80));
    console.log('ALL TRACKING SCRIPTS FOR CAMPAIGN');
    console.log('='.repeat(80));
    
    const allScripts = await scripts.find({
      campaignId: campaign?.campaignId,
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Total scripts: ${allScripts.length}\n`);
    
    // Group by publication
    const byPub = new Map<number, any[]>();
    allScripts.forEach((s: any) => {
      const pubId = s.publicationId;
      if (!byPub.has(pubId)) byPub.set(pubId, []);
      byPub.get(pubId)!.push(s);
    });
    
    for (const [pubId, pubScripts] of byPub) {
      console.log(`\nPublication ${pubId} (${pubScripts[0]?.publicationName}):`);
      console.log(`  Total scripts: ${pubScripts.length}`);
      pubScripts.forEach((s: any, i: number) => {
        console.log(`  ${i+1}. ${s.creative?.name || 'Unknown'}`);
        console.log(`     creativeId: ${s.creativeId}`);
        console.log(`     channel: ${s.channel}`);
        console.log(`     itemPath: ${s.itemPath || 'NOT SET'}`);
        console.log(`     placementName: ${s.placementName || 'NOT SET'}`);
        console.log(`     size: ${s.creative?.width}x${s.creative?.height}`);
      });
    }
    
    // Check specifically for Sun-Times (1035)
    console.log('\n' + '='.repeat(80));
    console.log('CHICAGO SUN-TIMES (1035) SCRIPTS');
    console.log('='.repeat(80));
    
    const sunTimesScripts = await scripts.find({
      campaignId: campaign?.campaignId,
      publicationId: 1035,
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Found ${sunTimesScripts.length} scripts for Sun-Times\n`);
    
    if (sunTimesScripts.length > 0) {
      sunTimesScripts.forEach((s: any, i: number) => {
        console.log(`Script ${i+1}:`);
        console.log(`  creativeId: ${s.creativeId}`);
        console.log(`  channel: ${s.channel}`);
        console.log(`  itemPath: ${s.itemPath || 'NOT SET'}`);
        console.log(`  placementName: ${s.placementName || 'NOT SET'}`);
        console.log(`  size: ${s.creative?.width}x${s.creative?.height}`);
        console.log(`  generatedAt: ${s.generatedAt}`);
        console.log(`  fullTag length: ${s.tags?.fullTag?.length || 0}`);
        console.log();
      });
    } else {
      console.log('❌ No tracking scripts found for Sun-Times!');
      console.log('\nThis is the issue - scripts need to be generated.');
      console.log('\nChecking if assets have Sun-Times in their placements...');
      
      const sunTimesAssets = await assets.find({
        'associations.campaignId': campaign?.campaignId,
        'associations.placements.publicationId': 1035,
        deletedAt: { $exists: false }
      }).toArray();
      
      console.log(`\nAssets with Sun-Times placements: ${sunTimesAssets.length}`);
      sunTimesAssets.forEach((a: any) => {
        console.log(`  - ${a.metadata?.fileName}`);
        const stPlacements = a.associations?.placements?.filter((p: any) => p.publicationId === 1035);
        stPlacements?.forEach((p: any) => {
          console.log(`    placementId: ${p.placementId}`);
          console.log(`    placementName: ${p.placementName}`);
        });
      });
    }
    
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

check().then(() => process.exit(0)).catch(console.error);


