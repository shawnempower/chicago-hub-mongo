/**
 * Verify Asset Matching
 * 
 * Tests that assets are properly matched to orders after the fix
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * New matching logic - matches assets to orders considering _dim suffix
 */
function matchesPlacement(assetPlacementId: string, orderPlacementId: string, publicationId?: number, assetPubId?: number): boolean {
  // Exact match
  if (assetPlacementId === orderPlacementId) return true;
  
  // Check for expanded dimension match (asset has _dim0, _dim1, etc suffix)
  if (assetPlacementId && orderPlacementId && assetPlacementId.startsWith(orderPlacementId + '_dim')) return true;
  
  // With publication context
  if (publicationId && assetPubId && publicationId === assetPubId) {
    if (assetPlacementId === orderPlacementId) return true;
    if (assetPlacementId && orderPlacementId && assetPlacementId.startsWith(orderPlacementId + '_dim')) return true;
  }
  
  return false;
}

async function verify() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const dbName = process.argv[2] || 'chicago-hub';
    const db = client.db(dbName);
    console.log(`📂 Using database: ${dbName}\n`);
    
    const campaigns = db.collection('campaigns');
    const orders = db.collection('publication_insertion_orders');
    const assets = db.collection('creative_assets');
    
    // Get most recent campaign
    const campaign = await campaigns.findOne({}, { sort: { createdAt: -1 } });
    if (!campaign) {
      console.log('❌ No campaigns found');
      return;
    }
    
    console.log(`🎯 Testing campaign: ${campaign.basicInfo?.name}`);
    console.log(`   campaignId: ${campaign.campaignId}\n`);
    
    // Get assets for this campaign
    const campaignAssets = await assets.find({
      $or: [
        { 'associations.campaignId': campaign.campaignId },
        { 'associations.campaignId': campaign._id.toString() }
      ],
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`📦 Found ${campaignAssets.length} assets for this campaign\n`);
    
    // Get all orders for this campaign
    const campaignOrders = await orders.find({ 
      campaignId: campaign.campaignId,
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`📋 Found ${campaignOrders.length} orders for this campaign\n`);
    
    // Test matching
    console.log('='.repeat(80));
    console.log('🧪 TESTING ASSET MATCHING');
    console.log('='.repeat(80));
    
    let totalMatches = 0;
    let totalMisses = 0;
    
    for (const order of campaignOrders) {
      const orderRefs = order.assetReferences || [];
      if (orderRefs.length === 0) continue;
      
      console.log(`\n📰 ${order.publicationName} (ID: ${order.publicationId})`);
      console.log(`   Order has ${orderRefs.length} placement references`);
      
      for (const ref of orderRefs) {
        const orderPlacementId = ref.placementId;
        
        // Try to find matching asset
        const matchingAsset = campaignAssets.find((a: any) => {
          const assetPlacements = a.associations?.placements;
          if (!assetPlacements || !Array.isArray(assetPlacements)) return false;
          
          return assetPlacements.some((p: any) => 
            matchesPlacement(p.placementId, orderPlacementId, order.publicationId, p.publicationId)
          );
        });
        
        if (matchingAsset) {
          totalMatches++;
          const assetPlacement = matchingAsset.associations?.placements?.find(
            (p: any) => matchesPlacement(p.placementId, orderPlacementId, order.publicationId, p.publicationId)
          );
          console.log(`   ✅ MATCH: ${ref.placementName}`);
          console.log(`      Order placementId: ${orderPlacementId}`);
          console.log(`      Asset placementId: ${assetPlacement?.placementId}`);
          console.log(`      Asset file: ${matchingAsset.metadata?.fileName}`);
        } else {
          totalMisses++;
          // Check if asset exists but doesn't match
          const nearMissAsset = campaignAssets.find((a: any) => {
            const assetPlacements = a.associations?.placements;
            if (!assetPlacements || !Array.isArray(assetPlacements)) return false;
            return assetPlacements.some((p: any) => p.publicationId === order.publicationId);
          });
          
          if (nearMissAsset) {
            console.log(`   ⚠️ NEAR MISS: ${ref.placementName}`);
            console.log(`      Order placementId: ${orderPlacementId}`);
            const assetPlacements = nearMissAsset.associations?.placements
              ?.filter((p: any) => p.publicationId === order.publicationId);
            console.log(`      Asset placements for this pub:`, assetPlacements?.map((p: any) => p.placementId));
          } else {
            console.log(`   ❌ NO ASSET: ${ref.placementName}`);
            console.log(`      Order placementId: ${orderPlacementId}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 MATCHING SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Matches: ${totalMatches}`);
    console.log(`Total Without Assets: ${totalMisses}`);
    console.log(`Match Rate: ${((totalMatches / (totalMatches + totalMisses)) * 100).toFixed(1)}%`);
    
    // Show asset details
    console.log('\n' + '='.repeat(80));
    console.log('🖼️  ALL ASSETS AND THEIR PLACEMENTS');
    console.log('='.repeat(80));
    
    for (const asset of campaignAssets) {
      console.log(`\nAsset: ${asset.metadata?.fileName}`);
      console.log(`  _id: ${asset._id}`);
      const placements = asset.associations?.placements || [];
      console.log(`  Placements: ${placements.length}`);
      placements.forEach((p: any, idx: number) => {
        console.log(`    ${idx + 1}. pubId: ${p.publicationId}, placementId: ${p.placementId}`);
        console.log(`       name: ${p.placementName}`);
      });
    }
    
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verify().then(() => process.exit(0)).catch(console.error);


