/**
 * Fix Package Durations
 * 
 * Updates hub_packages that have originalDuration of 6 (old default)
 * or no originalDuration set to use 1 month as the default.
 * 
 * Usage:
 *   npx tsx scripts/fixPackageDurations.ts           # Dry run
 *   npx tsx scripts/fixPackageDurations.ts --fix     # Apply changes
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'chicago-hub';

// Set to true to actually update, false for dry run
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--fix');

async function fixPackageDurations() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    console.log(`📦 Database: ${DATABASE_NAME}`);
    console.log(DRY_RUN ? '🔍 DRY RUN MODE - No changes will be made\n' : '⚠️  FIX MODE - Changes will be applied\n');
    
    const db = client.db(DATABASE_NAME);
    const packagesCollection = db.collection('hub_packages');
    
    // Find packages that need updating:
    // 1. originalDuration is 6 (old default)
    // 2. originalDuration is not set (undefined/null)
    const packagesNeedingFix = await packagesCollection.find({
      $or: [
        { 'metadata.builderInfo.originalDuration': 6 },
        { 'metadata.builderInfo.originalDuration': { $exists: false } },
        { 'metadata.builderInfo': { $exists: false } }
      ],
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Found ${packagesNeedingFix.length} package(s) to check\n`);
    console.log('='.repeat(70));
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const pkg of packagesNeedingFix) {
      const packageName = pkg.basicInfo?.name || pkg.packageId || pkg._id;
      const currentDuration = pkg.metadata?.builderInfo?.originalDuration;
      const currentUnit = pkg.metadata?.builderInfo?.originalDurationUnit || 'months';
      const hasBuilderInfo = !!pkg.metadata?.builderInfo;
      
      console.log(`\n📦 Package: ${packageName}`);
      console.log(`   Package ID: ${pkg.packageId || 'N/A'}`);
      console.log(`   Hub: ${pkg.hubInfo?.hubName || pkg.hubInfo?.hubId || 'N/A'}`);
      console.log(`   Current Duration: ${currentDuration ?? 'NOT SET'} ${currentUnit}`);
      console.log(`   Has builderInfo: ${hasBuilderInfo}`);
      
      if (!DRY_RUN) {
        // Build the update based on whether builderInfo exists
        if (hasBuilderInfo) {
          await packagesCollection.updateOne(
            { _id: pkg._id },
            {
              $set: {
                'metadata.builderInfo.originalDuration': 1,
                'metadata.builderInfo.originalDurationUnit': 'months',
                'metadata.updatedAt': new Date()
              }
            }
          );
        } else {
          // Need to create builderInfo structure
          await packagesCollection.updateOne(
            { _id: pkg._id },
            {
              $set: {
                'metadata.builderInfo': {
                  creationMethod: 'manual',
                  originalDuration: 1,
                  originalDurationUnit: 'months'
                },
                'metadata.updatedAt': new Date()
              }
            }
          );
        }
        console.log(`   ✅ FIXED → 1 month`);
        fixedCount++;
      } else {
        console.log(`   📝 Would fix: ${currentDuration ?? 'undefined'} → 1 month`);
        fixedCount++;
      }
    }
    
    // Also show packages that already have correct duration
    const correctPackages = await packagesCollection.find({
      'metadata.builderInfo.originalDuration': { $exists: true, $ne: 6 },
      deletedAt: { $exists: false }
    }).toArray();
    
    if (correctPackages.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log(`\n✅ ${correctPackages.length} package(s) already have correct duration set:\n`);
      for (const pkg of correctPackages) {
        const duration = pkg.metadata?.builderInfo?.originalDuration;
        const unit = pkg.metadata?.builderInfo?.originalDurationUnit || 'months';
        console.log(`   • ${pkg.basicInfo?.name || pkg.packageId}: ${duration} ${unit}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    if (DRY_RUN) {
      console.log(`\n📊 Summary: ${fixedCount} package(s) need fixing`);
      if (fixedCount > 0) {
        console.log(`\nRun with --fix flag to apply changes:`);
        console.log(`   npx tsx scripts/fixPackageDurations.ts --fix\n`);
      }
    } else {
      console.log(`\n✅ Fixed ${fixedCount} package(s) to use 1 month duration\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

fixPackageDurations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
