/**
 * Investigate Publication Orders
 * 
 * Query the production database to check:
 * 1. Recent campaigns and their selectedInventory.publications
 * 2. Publication insertion orders
 * 3. Creative assets and their associations
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function investigate() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    // Use chicago-hub database (production) - override MONGODB_DB_NAME
    const dbName = process.argv[2] || 'chicago-hub';
    const db = client.db(dbName);
    console.log(`📂 Using database: ${dbName}\n`);
    
    // Get collections
    const campaigns = db.collection('campaigns');
    const orders = db.collection('publication_insertion_orders');
    const assets = db.collection('creative_assets');
    const publications = db.collection('publications');
    
    // Get most recent campaigns
    console.log('='.repeat(80));
    console.log('📋 RECENT CAMPAIGNS');
    console.log('='.repeat(80));
    
    const recentCampaigns = await campaigns.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    for (const campaign of recentCampaigns) {
      console.log(`\n🎯 Campaign: ${campaign.basicInfo?.name || campaign.name || 'Unnamed'}`);
      console.log(`   _id: ${campaign._id}`);
      console.log(`   campaignId: ${campaign.campaignId}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Created: ${campaign.createdAt}`);
      
      // Check selectedInventory
      const selectedPubs = campaign.selectedInventory?.publications || [];
      console.log(`   Selected Publications: ${selectedPubs.length}`);
      
      for (const pub of selectedPubs) {
        console.log(`     - ${pub.publicationName} (ID: ${pub.publicationId})`);
        console.log(`       Inventory Items: ${pub.inventoryItems?.length || 0}`);
        if (pub.inventoryItems?.length > 0) {
          pub.inventoryItems.forEach((item: any, idx: number) => {
            console.log(`         ${idx + 1}. ${item.itemName || item.sourceName || 'Unknown'}`);
            console.log(`            Channel: ${item.channel}`);
            console.log(`            itemPath: ${item.itemPath || item.sourcePath || 'N/A'}`);
            console.log(`            specGroupId: ${item.specGroupId || 'N/A'}`);
          });
        }
      }
      
      // Check publication orders for this campaign
      const campaignOrders = await orders.find({ 
        campaignId: campaign.campaignId,
        deletedAt: { $exists: false }
      }).toArray();
      
      console.log(`\n   📦 Publication Orders: ${campaignOrders.length}`);
      
      for (const order of campaignOrders) {
        console.log(`     Order for: ${order.publicationName} (ID: ${order.publicationId})`);
        console.log(`       Status: ${order.status}`);
        console.log(`       Generated: ${order.generatedAt}`);
        console.log(`       Asset References: ${order.assetReferences?.length || 0}`);
        console.log(`       Asset Status:`);
        console.log(`         - totalPlacements: ${order.assetStatus?.totalPlacements || 0}`);
        console.log(`         - placementsWithAssets: ${order.assetStatus?.placementsWithAssets || 0}`);
        console.log(`         - allAssetsReady: ${order.assetStatus?.allAssetsReady}`);
        
        if (order.assetReferences?.length > 0) {
          console.log(`       Asset References Detail:`);
          order.assetReferences.forEach((ref: any, idx: number) => {
            console.log(`         ${idx + 1}. ${ref.placementName}`);
            console.log(`            placementId: ${ref.placementId}`);
            console.log(`            specGroupId: ${ref.specGroupId}`);
            console.log(`            channel: ${ref.channel}`);
          });
        }
      }
      
      // Check creative assets for this campaign
      const campaignAssets = await assets.find({
        $or: [
          { 'associations.campaignId': campaign.campaignId },
          { 'associations.campaignId': campaign._id.toString() }
        ],
        deletedAt: { $exists: false }
      }).toArray();
      
      console.log(`\n   🖼️  Creative Assets: ${campaignAssets.length}`);
      
      for (const asset of campaignAssets) {
        console.log(`     Asset: ${asset.metadata?.fileName || 'Unknown'}`);
        console.log(`       _id: ${asset._id}`);
        console.log(`       associations.campaignId: ${asset.associations?.campaignId}`);
        console.log(`       associations.specGroupId: ${asset.associations?.specGroupId || 'N/A'}`);
        console.log(`       associations.placements: ${JSON.stringify(asset.associations?.placements || [])}`);
        console.log(`       uploadInfo.uploadedAt: ${asset.uploadInfo?.uploadedAt || 'N/A'}`);
      }
    }
    
    // Summary stats
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 SUMMARY STATS');
    console.log('='.repeat(80));
    
    const totalCampaigns = await campaigns.countDocuments({});
    const totalOrders = await orders.countDocuments({ deletedAt: { $exists: false } });
    const totalAssets = await assets.countDocuments({ deletedAt: { $exists: false } });
    
    console.log(`Total Campaigns: ${totalCampaigns}`);
    console.log(`Total Active Orders: ${totalOrders}`);
    console.log(`Total Active Assets: ${totalAssets}`);
    
    // Check for assets with placements
    const assetsWithPlacements = await assets.countDocuments({
      'associations.placements': { $exists: true, $ne: [] },
      deletedAt: { $exists: false }
    });
    console.log(`Assets with placements array: ${assetsWithPlacements}`);
    
    // Check for assets with specGroupId
    const assetsWithSpecGroupId = await assets.countDocuments({
      'associations.specGroupId': { $exists: true },
      deletedAt: { $exists: false }
    });
    console.log(`Assets with specGroupId: ${assetsWithSpecGroupId}`);
    
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

investigate().then(() => process.exit(0)).catch(console.error);



