#!/usr/bin/env tsx

/**
 * Verify Staging Database
 * Quick script to verify the staging database and show its metadata
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyStaging() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const stagingDb = client.db('staging-chicago-hub');
    
    // Get all collections
    const collections = await stagingDb.listCollections().toArray();
    console.log(`📊 Staging Database: staging-chicago-hub`);
    console.log(`   Collections: ${collections.length}\n`);

    // Get document counts
    let totalDocs = 0;
    for (const col of collections) {
      if (col.name === '_backup_metadata') continue;
      const count = await stagingDb.collection(col.name).countDocuments();
      totalDocs += count;
      console.log(`   - ${col.name}: ${count} documents`);
    }

    console.log(`\n   Total Documents: ${totalDocs}`);

    // Check for backup metadata
    const metadata = await stagingDb.collection('_backup_metadata').findOne({}, { sort: { timestamp: -1 } });
    
    if (metadata) {
      console.log('\n📝 Latest Backup Metadata:');
      console.log(`   Source: ${metadata.sourceDb}`);
      console.log(`   Timestamp: ${new Date(metadata.timestamp).toLocaleString()}`);
      console.log(`   Status: ${metadata.failedCollections === 0 ? '✅ Success' : '⚠️ Partial'}`);
    }

    console.log('\n✅ Staging database verified successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

verifyStaging()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });


