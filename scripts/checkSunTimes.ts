/**
 * Check Chicago Sun-Times Assets
 * 
 * Specifically checks assets for Chicago Sun-Times website inventory
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
    const orders = db.collection('publication_insertion_orders');
    const assets = db.collection('creative_assets');
    
    // Get the campaign
    const campaign = await campaigns.findOne({});
    console.log(`🎯 Campaign: ${campaign?.basicInfo?.name}`);
    console.log(`   campaignId: ${campaign?.campaignId}\n`);
    
    // Get Chicago Sun-Times data from campaign
    const sunTimesPub = campaign?.selectedInventory?.publications?.find(
      (p: any) => p.publicationId === 1035
    );
    
    console.log('='.repeat(80));
    console.log('📰 CHICAGO SUN-TIMES IN CAMPAIGN');
    console.log('='.repeat(80));
    console.log(`Publication ID: ${sunTimesPub?.publicationId}`);
    console.log(`Publication Name: ${sunTimesPub?.publicationName}`);
    console.log(`Inventory Items: ${sunTimesPub?.inventoryItems?.length}\n`);
    
    sunTimesPub?.inventoryItems?.forEach((item: any, idx: number) => {
      console.log(`${idx + 1}. ${item.itemName}`);
      console.log(`   Channel: ${item.channel}`);
      console.log(`   itemPath: ${item.itemPath}`);
      console.log(`   dimensions: ${item.format?.dimensions || 'N/A'}`);
    });
    
    // Get Sun-Times order
    console.log('\n' + '='.repeat(80));
    console.log('📦 CHICAGO SUN-TIMES ORDER');
    console.log('='.repeat(80));
    
    const sunTimesOrder = await orders.findOne({
      campaignId: campaign?.campaignId,
      publicationId: 1035,
      deletedAt: { $exists: false }
    });
    
    if (sunTimesOrder) {
      console.log(`Order ID: ${sunTimesOrder._id}`);
      console.log(`Status: ${sunTimesOrder.status}`);
      console.log(`Asset Status:`);
      console.log(`  - totalPlacements: ${sunTimesOrder.assetStatus?.totalPlacements}`);
      console.log(`  - placementsWithAssets: ${sunTimesOrder.assetStatus?.placementsWithAssets}`);
      console.log(`  - allAssetsReady: ${sunTimesOrder.assetStatus?.allAssetsReady}`);
      
      console.log(`\nAsset References (${sunTimesOrder.assetReferences?.length}):`);
      sunTimesOrder.assetReferences?.forEach((ref: any, idx: number) => {
        console.log(`  ${idx + 1}. ${ref.placementName}`);
        console.log(`     placementId: ${ref.placementId}`);
        console.log(`     channel: ${ref.channel}`);
        console.log(`     specGroupId: ${ref.specGroupId}`);
      });
    }
    
    // Get assets assigned to Sun-Times
    console.log('\n' + '='.repeat(80));
    console.log('🖼️  ASSETS FOR CHICAGO SUN-TIMES');
    console.log('='.repeat(80));
    
    const sunTimesAssets = await assets.find({
      'associations.campaignId': campaign?.campaignId,
      'associations.placements.publicationId': 1035,
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Found ${sunTimesAssets.length} assets assigned to Sun-Times\n`);
    
    sunTimesAssets.forEach((asset: any, idx: number) => {
      console.log(`Asset ${idx + 1}: ${asset.metadata?.fileName}`);
      console.log(`  _id: ${asset._id}`);
      console.log(`  specGroupId: ${asset.associations?.specGroupId}`);
      
      // Show Sun-Times specific placements
      const sunTimePlacements = asset.associations?.placements?.filter(
        (p: any) => p.publicationId === 1035
      );
      console.log(`  Sun-Times placements:`);
      sunTimePlacements?.forEach((p: any) => {
        console.log(`    - placementId: ${p.placementId}`);
        console.log(`      placementName: ${p.placementName}`);
        console.log(`      channel: ${p.channel}`);
      });
      console.log();
    });
    
    // Check ALL campaign assets
    console.log('='.repeat(80));
    console.log('🖼️  ALL CAMPAIGN ASSETS');
    console.log('='.repeat(80));
    
    const allAssets = await assets.find({
      'associations.campaignId': campaign?.campaignId,
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Total assets for campaign: ${allAssets.length}\n`);
    
    allAssets.forEach((asset: any, idx: number) => {
      console.log(`Asset ${idx + 1}: ${asset.metadata?.fileName}`);
      console.log(`  dimensions: ${asset.metadata?.detectedDimensions || asset.associations?.specGroupId}`);
      console.log(`  All placements: ${asset.associations?.placements?.length || 0}`);
      
      // Check if any placement is for Sun-Times
      const hasSunTimes = asset.associations?.placements?.some(
        (p: any) => p.publicationId === 1035
      );
      console.log(`  Has Sun-Times placement: ${hasSunTimes ? 'YES ✅' : 'NO'}`);
      
      if (hasSunTimes) {
        const stPlacements = asset.associations?.placements?.filter(
          (p: any) => p.publicationId === 1035
        );
        stPlacements?.forEach((p: any) => {
          console.log(`    -> ${p.placementId}`);
        });
      }
      console.log();
    });
    
    // Test matching with the fix
    console.log('='.repeat(80));
    console.log('🧪 TESTING MATCHING LOGIC');
    console.log('='.repeat(80));
    
    const orderRef = sunTimesOrder?.assetReferences?.find(
      (r: any) => r.channel === 'website'
    );
    
    if (orderRef) {
      console.log(`\nOrder website placement: ${orderRef.placementId}`);
      
      // Find matching assets with new logic
      for (const asset of allAssets) {
        const placements = asset.associations?.placements || [];
        for (const p of placements) {
          if (p.publicationId === 1035) {
            const exactMatch = p.placementId === orderRef.placementId;
            const dimMatch = p.placementId?.startsWith(orderRef.placementId + '_dim');
            
            console.log(`\nAsset: ${asset.metadata?.fileName}`);
            console.log(`  Asset placementId: ${p.placementId}`);
            console.log(`  Exact match: ${exactMatch}`);
            console.log(`  _dim match: ${dimMatch}`);
            console.log(`  MATCHES: ${exactMatch || dimMatch ? '✅ YES' : '❌ NO'}`);
          }
        }
      }
    }
    
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

check().then(() => process.exit(0)).catch(console.error);
