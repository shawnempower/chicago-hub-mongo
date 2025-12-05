#!/usr/bin/env ts-node

/**
 * Production Database Backup Script
 * Creates a full backup of chicago-hub to chicago-hub-backup-YYYYMMDD
 * 
 * Usage:
 *   npx ts-node scripts/backupProductionDatabase.ts
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. List all collections in chicago-hub (production)
 * 3. Copy each collection to chicago-hub-backup-YYYYMMDD
 * 4. Preserve all indexes
 * 5. Verify the backup
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SOURCE_DB = 'chicago-hub';
const today = new Date();
const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
const TARGET_DB = `chicago-hub-backup-${dateStr}`;

interface BackupStats {
  collection: string;
  documentCount: number;
  indexCount: number;
  success: boolean;
  error?: string;
}

async function backupProductionDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('🚀 Starting PRODUCTION database backup...\n');
  console.log(`📂 Source Database: ${SOURCE_DB} (PRODUCTION)`);
  console.log(`📂 Backup Database: ${TARGET_DB}\n`);
  console.log('⚠️  This creates a point-in-time backup before migrations\n');

  const client = new MongoClient(MONGODB_URI);
  const stats: BackupStats[] = [];

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Check if backup already exists
    const existingCollections = await targetDb.listCollections().toArray();
    if (existingCollections.length > 0) {
      console.log(`⚠️  Backup database ${TARGET_DB} already exists with ${existingCollections.length} collections`);
      console.log('   Skipping backup to prevent overwriting existing backup.\n');
      console.log('   If you need a fresh backup, either:');
      console.log('   1. Drop the existing backup database first');
      console.log('   2. Or wait until tomorrow for a new date-stamped backup\n');
      return;
    }

    // Get all collections from source database
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections to backup:\n`);
    
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('\n');

    // Copy each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n🔄 Backing up: ${collectionName}`);
      console.log('─'.repeat(50));

      try {
        const sourceCollection = sourceDb.collection(collectionName);
        const targetCollection = targetDb.collection(collectionName);

        // Get document count
        const docCount = await sourceCollection.countDocuments();
        console.log(`   📄 Documents to backup: ${docCount}`);

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
              console.log(`   ⏳ Backed up ${copied}/${docCount} documents...`);
              batch = [];
            }
          }

          // Insert remaining documents
          if (batch.length > 0) {
            await targetCollection.insertMany(batch, { ordered: false });
            copied += batch.length;
          }

          console.log(`   ✅ Backed up ${copied} documents`);
        } else {
          console.log(`   ℹ️  No documents to backup`);
        }

        // Copy indexes
        const indexes = await sourceCollection.indexes();
        console.log(`   🔍 Found ${indexes.length} indexes`);

        // Drop _id_ index from list as it's created automatically
        const customIndexes = indexes.filter(idx => idx.name !== '_id_');
        
        if (customIndexes.length > 0) {
          for (const index of customIndexes) {
            try {
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
              console.log(`   📌 Created index: ${index.name}`);
            } catch (error: any) {
              // Index might already exist, that's ok
              if (!error.message.includes('already exists')) {
                console.warn(`   ⚠️  Warning creating index ${index.name}: ${error.message}`);
              }
            }
          }
        }

        // Verify the backup
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
        console.error(`   ❌ Error backing up ${collectionName}: ${error.message}`);
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
    console.log('📊 BACKUP SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\nSource Database: ${SOURCE_DB} (PRODUCTION)`);
    console.log(`Backup Database: ${TARGET_DB}\n`);

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
    console.log(`Total Documents Backed Up: ${totalDocs.toLocaleString()}`);
    
    if (failCount === 0) {
      console.log('\n✅ PRODUCTION BACKUP COMPLETED SUCCESSFULLY! 🎉');
      console.log(`\n📁 Backup saved to: ${TARGET_DB}`);
      console.log('\n🔒 You can now safely run migrations on production.');
    } else {
      console.log(`\n⚠️  Backup completed with ${failCount} errors`);
      console.log('   Review errors before proceeding with migrations.');
    }

    // Create a backup record
    const timestamp = new Date().toISOString();
    const backupRecord = {
      sourceDb: SOURCE_DB,
      targetDb: TARGET_DB,
      timestamp,
      reason: 'Pre-migration backup before format normalization deployment',
      stats,
      totalDocuments: totalDocs,
      totalCollections: stats.length,
      successfulCollections: successCount,
      failedCollections: failCount
    };

    // Save backup record to backup database
    await targetDb.collection('_backup_metadata').insertOne(backupRecord);
    console.log(`\n📝 Backup metadata saved to ${TARGET_DB}._backup_metadata`);

  } catch (error: any) {
    console.error('\n❌ Fatal error during backup:');
    console.error(error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the backup
backupProductionDatabase()
  .then(() => {
    console.log('\n✨ Backup process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backup failed:', error);
    process.exit(1);
  });

export { backupProductionDatabase };
