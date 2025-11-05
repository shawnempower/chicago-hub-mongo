#!/usr/bin/env ts-node

/**
 * Database Copy Script
 * Copies all collections from chicago-hub to staging-chicago-hub
 * 
 * Usage:
 *   npx ts-node scripts/copyDatabaseToStaging.ts
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. List all collections in chicago-hub
 * 3. Copy each collection to staging-chicago-hub
 * 4. Preserve all indexes
 * 5. Verify the copy
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SOURCE_DB = 'chicago-hub';
const TARGET_DB = 'staging-chicago-hub';

interface CopyStats {
  collection: string;
  documentCount: number;
  indexCount: number;
  success: boolean;
  error?: string;
}

async function copyDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('🚀 Starting database copy process...\n');
  console.log(`📂 Source Database: ${SOURCE_DB}`);
  console.log(`📂 Target Database: ${TARGET_DB}\n`);

  const client = new MongoClient(MONGODB_URI);
  const stats: CopyStats[] = [];

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Get all collections from source database
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections to copy:\n`);
    
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('\n');

    // Copy each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n🔄 Processing: ${collectionName}`);
      console.log('─'.repeat(50));

      try {
        const sourceCollection = sourceDb.collection(collectionName);
        const targetCollection = targetDb.collection(collectionName);

        // Get document count
        const docCount = await sourceCollection.countDocuments();
        console.log(`   📄 Documents to copy: ${docCount}`);

        if (docCount > 0) {
          // Copy documents in batches
          const batchSize = 1000;
          let copied = 0;

          const cursor = sourceCollection.find({});
          let batch: any[] = [];

          for await (const doc of cursor) {
            batch.push(doc);
            
            if (batch.length >= batchSize) {
              await targetCollection.insertMany(batch, { ordered: false });
              copied += batch.length;
              console.log(`   ⏳ Copied ${copied}/${docCount} documents...`);
              batch = [];
            }
          }

          // Insert remaining documents
          if (batch.length > 0) {
            await targetCollection.insertMany(batch, { ordered: false });
            copied += batch.length;
          }

          console.log(`   ✅ Copied ${copied} documents`);
        } else {
          console.log(`   ℹ️  No documents to copy`);
        }

        // Copy indexes
        const indexes = await sourceCollection.indexes();
        console.log(`   🔍 Found ${indexes.length} indexes`);

        // Drop _id_ index from list as it's created automatically
        const customIndexes = indexes.filter(idx => idx.name !== '_id_');
        
        if (customIndexes.length > 0) {
          for (const index of customIndexes) {
            try {
              // Remove the name field and let MongoDB auto-generate it
              const { name, v, ...indexSpec } = index as any;
              const keys = index.key;
              const options: any = {};

              // Preserve index options
              if (index.unique) options.unique = true;
              if (index.sparse) options.sparse = true;
              if (index.background) options.background = true;
              if (index.expireAfterSeconds !== undefined) {
                options.expireAfterSeconds = index.expireAfterSeconds;
              }
              if ((index as any).partialFilterExpression) {
                options.partialFilterExpression = (index as any).partialFilterExpression;
              }

              await targetCollection.createIndex(keys, options);
              console.log(`   📌 Created index: ${name}`);
            } catch (error: any) {
              // Index might already exist, that's ok
              if (!error.message.includes('already exists')) {
                console.warn(`   ⚠️  Warning creating index ${index.name}: ${error.message}`);
              }
            }
          }
        }

        // Verify the copy
        const targetDocCount = await targetCollection.countDocuments();
        const verified = targetDocCount === docCount;

        if (verified) {
          console.log(`   ✅ Verification passed: ${targetDocCount} documents`);
        } else {
          console.log(`   ⚠️  Warning: Document count mismatch (source: ${docCount}, target: ${targetDocCount})`);
        }

        stats.push({
          collection: collectionName,
          documentCount: targetDocCount,
          indexCount: customIndexes.length,
          success: verified
        });

      } catch (error: any) {
        console.error(`   ❌ Error copying ${collectionName}: ${error.message}`);
        stats.push({
          collection: collectionName,
          documentCount: 0,
          indexCount: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n\n');
    console.log('═'.repeat(60));
    console.log('📊 COPY SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\nSource Database: ${SOURCE_DB}`);
    console.log(`Target Database: ${TARGET_DB}\n`);

    let totalDocs = 0;
    let successCount = 0;
    let failCount = 0;

    console.log('Collection Details:');
    console.log('─'.repeat(60));
    
    stats.forEach(stat => {
      const status = stat.success ? '✅' : '❌';
      console.log(`${status} ${stat.collection}`);
      console.log(`   Documents: ${stat.documentCount.toLocaleString()}`);
      console.log(`   Indexes: ${stat.indexCount}`);
      if (stat.error) {
        console.log(`   Error: ${stat.error}`);
      }
      
      totalDocs += stat.documentCount;
      if (stat.success) successCount++;
      else failCount++;
    });

    console.log('─'.repeat(60));
    console.log(`\nTotal Collections: ${stats.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total Documents Copied: ${totalDocs.toLocaleString()}`);
    
    if (failCount === 0) {
      console.log('\n✅ Database copy completed successfully! 🎉');
    } else {
      console.log(`\n⚠️  Database copy completed with ${failCount} errors`);
    }

    // Create a backup record
    const timestamp = new Date().toISOString();
    const backupRecord = {
      sourceDb: SOURCE_DB,
      targetDb: TARGET_DB,
      timestamp,
      stats,
      totalDocuments: totalDocs,
      totalCollections: stats.length,
      successfulCollections: successCount,
      failedCollections: failCount
    };

    // Save backup record to target database
    await targetDb.collection('_backup_metadata').insertOne(backupRecord);
    console.log(`\n📝 Backup metadata saved to ${TARGET_DB}._backup_metadata`);

  } catch (error: any) {
    console.error('\n❌ Fatal error during database copy:');
    console.error(error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the copy
copyDatabase()
  .then(() => {
    console.log('\n✨ Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Process failed:', error);
    process.exit(1);
  });

export { copyDatabase };

