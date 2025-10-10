#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || 'chicago_hub';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrateStorefrontFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('storefront_configurations');
    
    // Find all documents that need migration
    const documentsToMigrate = await collection.find({
      $or: [
        { 'meta.publisher_id': { $exists: true } },
        { 'meta.is_draft': { $exists: true } }
      ]
    }).toArray();
    
    console.log(`Found ${documentsToMigrate.length} documents to migrate`);
    
    if (documentsToMigrate.length === 0) {
      console.log('No documents need migration');
      return;
    }
    
    // Process each document
    for (const doc of documentsToMigrate) {
      const updates: any = {};
      const unsets: any = {};
      
      // Migrate publisher_id to publisherId
      if (doc.meta?.publisher_id) {
        updates['meta.publisherId'] = doc.meta.publisher_id;
        unsets['meta.publisher_id'] = '';
      }
      
      // Migrate is_draft to isDraft
      if (doc.meta?.is_draft !== undefined) {
        updates['meta.isDraft'] = doc.meta.is_draft;
        unsets['meta.is_draft'] = '';
      }
      
      // Apply updates and removals
      const updateOperation: any = {};
      if (Object.keys(updates).length > 0) {
        updateOperation.$set = updates;
      }
      if (Object.keys(unsets).length > 0) {
        updateOperation.$unset = unsets;
      }
      
      if (Object.keys(updateOperation).length > 0) {
        await collection.updateOne(
          { _id: doc._id },
          updateOperation
        );
        console.log(`Migrated document ${doc._id}`);
      }
    }
    
    console.log('Migration completed successfully');
    
    // Verify migration
    const remainingOldFields = await collection.countDocuments({
      $or: [
        { 'meta.publisher_id': { $exists: true } },
        { 'meta.is_draft': { $exists: true } }
      ]
    });
    
    if (remainingOldFields > 0) {
      console.warn(`Warning: ${remainingOldFields} documents still have old field names`);
    } else {
      console.log('✅ All documents successfully migrated');
    }
    
    // Show sample of migrated data
    const sampleDoc = await collection.findOne({});
    if (sampleDoc) {
      console.log('\nSample migrated document meta:');
      console.log(JSON.stringify(sampleDoc.meta, null, 2));
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStorefrontFields()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateStorefrontFields };
