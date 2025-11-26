/**
 * Cleanup Duplicate Creative Assets
 * 
 * This script removes duplicate assets for a campaign, keeping only:
 * - ONE asset per spec group (the most recent one)
 * - NO unassigned/library assets (unless explicitly kept)
 * 
 * Usage: npx tsx scripts/cleanupDuplicateAssets.ts <campaignId>
 */

import dotenv from 'dotenv';
import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';

// Load environment variables
dotenv.config();

async function cleanupDuplicates(campaignId: string, keepUnassigned: boolean = false) {
  try {
    console.log(`\n🧹 Starting cleanup for campaign: ${campaignId}\n`);

    // Connect to database
    await connectToDatabase();
    const db = getDatabase();
    const creativeAssetsCollection = db.collection(COLLECTIONS.CREATIVE_ASSETS);

    // Get all assets for this campaign
    const allAssets = await creativeAssetsCollection.find({
      'associations.campaignId': campaignId,
      deletedAt: { $exists: false } // Exclude soft-deleted assets
    }).toArray();
    
    console.log(`📦 Found ${allAssets.length} total assets for this campaign`);

    if (allAssets.length === 0) {
      console.log('✅ No assets to clean up!');
      return;
    }

    // Group by specGroupId
    const assetsBySpecGroup = new Map<string, any[]>();
    const unassignedAssets: any[] = [];

    allAssets.forEach(asset => {
      const specGroupId = asset.metadata?.specGroupId;
      
      if (!specGroupId) {
        unassignedAssets.push(asset);
        return;
      }

      if (!assetsBySpecGroup.has(specGroupId)) {
        assetsBySpecGroup.set(specGroupId, []);
      }
      assetsBySpecGroup.get(specGroupId)!.push(asset);
    });

    console.log(`📊 Breakdown:`);
    console.log(`   - ${assetsBySpecGroup.size} unique spec groups`);
    console.log(`   - ${unassignedAssets.length} unassigned assets`);

    // Find duplicates to delete
    const assetsToDelete: ObjectId[] = [];

    // For each spec group, keep only the most recent asset
    assetsBySpecGroup.forEach((assets, specGroupId) => {
      if (assets.length > 1) {
        // Sort by upload date, newest first
        assets.sort((a, b) => {
          const dateA = new Date(a.uploadInfo?.uploadedAt || 0).getTime();
          const dateB = new Date(b.uploadInfo?.uploadedAt || 0).getTime();
          return dateB - dateA;
        });

        // Keep the first (newest), delete the rest
        const toKeep = assets[0];
        const toDelete = assets.slice(1);

        console.log(`\n   📁 ${specGroupId}:`);
        console.log(`      ✅ Keeping: ${toKeep.metadata?.fileName || 'unknown'} (${new Date(toKeep.uploadInfo?.uploadedAt).toLocaleString()})`);
        console.log(`      🗑️  Deleting ${toDelete.length} duplicate(s):`);
        
        toDelete.forEach(asset => {
          console.log(`         - ${asset.metadata?.fileName || 'unknown'} (${new Date(asset.uploadInfo?.uploadedAt).toLocaleString()})`);
          assetsToDelete.push(asset._id);
        });
      }
    });

    // Handle unassigned assets
    if (unassignedAssets.length > 0 && !keepUnassigned) {
      console.log(`\n   🗑️  Deleting ${unassignedAssets.length} unassigned asset(s):`);
      unassignedAssets.forEach(asset => {
        console.log(`      - ${asset.metadata?.fileName || 'unknown'}`);
        assetsToDelete.push(asset._id);
      });
    } else if (unassignedAssets.length > 0 && keepUnassigned) {
      console.log(`\n   ℹ️  Keeping ${unassignedAssets.length} unassigned asset(s) (keepUnassigned=true)`);
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   - Total assets: ${allAssets.length}`);
    console.log(`   - Assets to keep: ${allAssets.length - assetsToDelete.length}`);
    console.log(`   - Assets to delete: ${assetsToDelete.length}`);

    if (assetsToDelete.length === 0) {
      console.log('\n✅ No duplicates found! Everything is clean.\n');
      return;
    }

    // Check if --execute flag is present
    const shouldExecute = process.argv.includes('--execute');

    if (shouldExecute) {
      console.log('\n🚀 Executing deletion...\n');
      
      // Soft delete: Set deletedAt field
      const result = await creativeAssetsCollection.updateMany(
        { _id: { $in: assetsToDelete } },
        { 
          $set: { 
            deletedAt: new Date(),
            deletedBy: 'cleanup-script'
          } 
        }
      );
      
      console.log(`\n✅ Cleanup complete! Soft-deleted ${result.modifiedCount} asset(s).\n`);
    } else {
      console.log('\n⚠️  DRY RUN: No assets were deleted.');
      console.log(`\n   Run with --execute to actually delete:`);
      console.log(`   npx tsx scripts/cleanupDuplicateAssets.ts ${campaignId} --execute\n`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Parse command line arguments
const campaignId = process.argv[2];
const keepUnassigned = process.argv.includes('--keep-unassigned');

if (!campaignId) {
  console.error('\n❌ Error: Campaign ID is required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/cleanupDuplicateAssets.ts <campaignId> [--execute] [--keep-unassigned]');
  console.log('\nOptions:');
  console.log('  --execute          Actually delete the assets (default: dry run)');
  console.log('  --keep-unassigned  Keep unassigned/library assets (default: delete them)');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/cleanupDuplicateAssets.ts 67348b5e9f1a2c3d4e5f6789');
  console.log('  npx tsx scripts/cleanupDuplicateAssets.ts 67348b5e9f1a2c3d4e5f6789 --execute');
  console.log('  npx tsx scripts/cleanupDuplicateAssets.ts 67348b5e9f1a2c3d4e5f6789 --execute --keep-unassigned\n');
  process.exit(1);
}

console.log('\n🔧 Duplicate Asset Cleanup Tool');
console.log('================================\n');

cleanupDuplicates(campaignId, keepUnassigned)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
