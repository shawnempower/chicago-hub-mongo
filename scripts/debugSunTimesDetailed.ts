/**
 * Detailed Debug for Chicago Sun-Times
 * 
 * Carefully examines all the data to understand why assets aren't showing
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debug() {
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
    console.log('='.repeat(100));
    console.log('CAMPAIGN');
    console.log('='.repeat(100));
    console.log(`Name: ${campaign?.basicInfo?.name}`);
    console.log(`_id: ${campaign?._id}`);
    console.log(`campaignId: ${campaign?.campaignId}`);
    
    // Get Sun-Times from campaign's selectedInventory
    const sunTimesPub = campaign?.selectedInventory?.publications?.find(
      (p: any) => p.publicationId === 1035
    );
    
    console.log('\n' + '='.repeat(100));
    console.log('CHICAGO SUN-TIMES IN CAMPAIGN selectedInventory');
    console.log('='.repeat(100));
    console.log(`publicationId: ${sunTimesPub?.publicationId}`);
    console.log(`publicationName: ${sunTimesPub?.publicationName}`);
    console.log(`inventoryItems count: ${sunTimesPub?.inventoryItems?.length}`);
    
    console.log('\nWebsite inventory item (raw):');
    const websiteItem = sunTimesPub?.inventoryItems?.find((i: any) => i.channel === 'website');
    console.log(JSON.stringify(websiteItem, null, 2));
    
    // Get the order
    console.log('\n' + '='.repeat(100));
    console.log('CHICAGO SUN-TIMES ORDER');
    console.log('='.repeat(100));
    
    const order = await orders.findOne({
      campaignId: campaign?.campaignId,
      publicationId: 1035,
      deletedAt: { $exists: false }
    });
    
    console.log(`_id: ${order?._id}`);
    console.log(`campaignId: ${order?.campaignId}`);
    console.log(`publicationId: ${order?.publicationId}`);
    console.log(`status: ${order?.status}`);
    
    console.log('\nassetReferences:');
    order?.assetReferences?.forEach((ref: any, i: number) => {
      console.log(`  ${i+1}. ${ref.placementName}`);
      console.log(`     placementId: ${ref.placementId}`);
      console.log(`     specGroupId: ${ref.specGroupId}`);
      console.log(`     channel: ${ref.channel}`);
    });
    
    console.log('\nassetStatus:', JSON.stringify(order?.assetStatus, null, 2));
    
    // Get ALL assets for this campaign
    console.log('\n' + '='.repeat(100));
    console.log('ALL CAMPAIGN ASSETS');
    console.log('='.repeat(100));
    
    const allAssets = await assets.find({
      $or: [
        { 'associations.campaignId': campaign?.campaignId },
        { 'associations.campaignId': campaign?._id?.toString() }
      ],
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Total assets: ${allAssets.length}\n`);
    
    allAssets.forEach((asset: any, i: number) => {
      console.log(`Asset ${i+1}: ${asset.metadata?.fileName}`);
      console.log(`  _id: ${asset._id}`);
      console.log(`  associations.campaignId: ${asset.associations?.campaignId}`);
      console.log(`  associations.specGroupId: ${asset.associations?.specGroupId}`);
      console.log(`  metadata.specGroupId: ${asset.metadata?.specGroupId}`);
      console.log(`  metadata.detectedDimensions: ${asset.metadata?.detectedDimensions}`);
      console.log(`  associations.placements (count): ${asset.associations?.placements?.length || 0}`);
      
      // Show all placements
      asset.associations?.placements?.forEach((p: any, j: number) => {
        console.log(`    Placement ${j+1}:`);
        console.log(`      publicationId: ${p.publicationId}`);
        console.log(`      placementId: ${p.placementId}`);
        console.log(`      placementName: ${p.placementName}`);
        console.log(`      channel: ${p.channel}`);
      });
      console.log();
    });
    
    // Now simulate what the extractRequirementsForSelectedInventory does
    console.log('='.repeat(100));
    console.log('SIMULATING extractRequirementsForSelectedInventory');
    console.log('='.repeat(100));
    
    const { extractRequirementsForSelectedInventory } = await import('../src/utils/creativeSpecsExtractor');
    
    const inventoryForExtraction = sunTimesPub?.inventoryItems?.map((item: any) => ({
      ...item,
      publicationId: sunTimesPub.publicationId,
      publicationName: sunTimesPub.publicationName,
    })) || [];
    
    const extractedRequirements = extractRequirementsForSelectedInventory(inventoryForExtraction);
    
    console.log(`\nExtracted ${extractedRequirements.length} requirements:\n`);
    
    extractedRequirements.forEach((req: any, i: number) => {
      console.log(`Requirement ${i+1}: ${req.placementName}`);
      console.log(`  placementId: ${req.placementId}`);
      console.log(`  channel: ${req.channel}`);
      console.log(`  dimensions: ${req.dimensions}`);
      console.log(`  itemPath: ${req.itemPath}`);
    });
    
    // Now try matching with the CORRECT logic
    console.log('\n' + '='.repeat(100));
    console.log('MATCHING REQUIREMENTS TO ASSETS (CORRECT LOGIC)');
    console.log('='.repeat(100));
    
    const pubId = 1035;
    
    extractedRequirements.forEach((req: any) => {
      const reqChannel = req.channel || 'general';
      const reqDimensions = req.dimensions;
      const reqPlacementId = req.placementId || req.itemPath;
      
      console.log(`\nRequirement: ${req.placementName}`);
      console.log(`  reqPlacementId: ${reqPlacementId}`);
      console.log(`  reqDimensions: ${reqDimensions}`);
      
      // Try to find matching asset - STRICT matching
      const matchingAssets = allAssets.filter((asset: any) => {
        const assetPlacements = asset.associations?.placements;
        
        // Primary: Match by EXACT placementId for this publication
        if (assetPlacements && Array.isArray(assetPlacements)) {
          const exactMatch = assetPlacements.some((p: any) => {
            if (p.publicationId !== pubId) return false;
            if (p.placementId === reqPlacementId) {
              console.log(`  ✅ EXACT MATCH: asset placementId=${p.placementId}`);
              return true;
            }
            return false;
          });
          if (exactMatch) return true;
        }
        
        // Secondary: Match by dimensions if asset is for this publication
        const assetSpecGroupId = asset.associations?.specGroupId || asset.metadata?.specGroupId;
        if (assetSpecGroupId && reqDimensions) {
          const assetDimPart = assetSpecGroupId?.split('::dim:')[1];
          if (assetDimPart && assetDimPart === reqDimensions) {
            const isForThisPub = assetPlacements?.some((p: any) => p.publicationId === pubId);
            if (isForThisPub) {
              console.log(`  ✅ DIMENSION MATCH: assetDim=${assetDimPart}, reqDim=${reqDimensions}`);
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (matchingAssets.length === 0) {
        console.log(`  ❌ NO MATCH FOUND`);
      } else {
        console.log(`  Found ${matchingAssets.length} matching asset(s):`);
        matchingAssets.forEach((a: any) => {
          console.log(`    - ${a.metadata?.fileName} (${a.associations?.specGroupId})`);
        });
      }
    });
    
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

debug().then(() => process.exit(0)).catch(console.error);

