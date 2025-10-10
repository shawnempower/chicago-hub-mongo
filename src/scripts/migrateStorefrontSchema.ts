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

async function migrateStorefrontSchema() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('storefront_configurations');
    
    // Get all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`Found ${allDocs.length} storefront configurations to check`);
    
    let migratedCount = 0;
    
    for (const doc of allDocs) {
      const updates: any = {};
      const unsets: any = {};
      let needsUpdate = false;
      
      // 1. Migrate meta field names
      if (doc.meta) {
        if (doc.meta.publisher_id !== undefined) {
          updates['meta.publisherId'] = doc.meta.publisher_id;
          unsets['meta.publisher_id'] = '';
          needsUpdate = true;
        }
        
        if (doc.meta.is_draft !== undefined) {
          updates['meta.isDraft'] = doc.meta.is_draft;
          unsets['meta.is_draft'] = '';
          needsUpdate = true;
        }
        
        // Ensure required fields have defaults if missing
        if (!doc.meta.configVersion) {
          updates['meta.configVersion'] = '1.0.0';
          needsUpdate = true;
        }
        
        if (!doc.meta.lastUpdated) {
          updates['meta.lastUpdated'] = new Date().toISOString();
          needsUpdate = true;
        }
      }
      
      // 2. Ensure theme structure is correct
      if (doc.theme) {
        // Make sure colors has the required fields
        if (doc.theme.colors) {
          if (!doc.theme.colors.lightPrimary && doc.theme.colors.primary) {
            updates['theme.colors.lightPrimary'] = doc.theme.colors.primary;
            needsUpdate = true;
          }
          
          if (!doc.theme.colors.darkPrimary && doc.theme.colors.primary) {
            updates['theme.colors.darkPrimary'] = doc.theme.colors.primary;
            needsUpdate = true;
          }
          
          if (!doc.theme.colors.mode) {
            updates['theme.colors.mode'] = 'light';
            needsUpdate = true;
          }
        }
        
        // Ensure typography has primaryFont
        if (doc.theme.typography && !doc.theme.typography.primaryFont) {
          updates['theme.typography.primaryFont'] = 'Inter';
          needsUpdate = true;
        }
      }
      
      // 3. Ensure components structure is valid
      if (!doc.components) {
        updates['components'] = {};
        needsUpdate = true;
      }
      
      // 4. Set default isActive if missing
      if (doc.isActive === undefined) {
        updates['isActive'] = true;
        needsUpdate = true;
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        const updateOperation: any = {};
        
        if (Object.keys(updates).length > 0) {
          updateOperation.$set = updates;
        }
        
        if (Object.keys(unsets).length > 0) {
          updateOperation.$unset = unsets;
        }
        
        await collection.updateOne(
          { _id: doc._id },
          updateOperation
        );
        
        migratedCount++;
        console.log(`✅ Migrated document ${doc._id} (${doc.meta?.publisherId || doc.meta?.publisher_id || 'unknown'})`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Updated ${migratedCount} out of ${allDocs.length} documents`);
    
    // Verify migration results
    console.log('\n🔍 Verifying migration...');
    
    const oldFieldsRemaining = await collection.countDocuments({
      $or: [
        { 'meta.publisher_id': { $exists: true } },
        { 'meta.is_draft': { $exists: true } }
      ]
    });
    
    if (oldFieldsRemaining > 0) {
      console.warn(`⚠️  Warning: ${oldFieldsRemaining} documents still have old field names`);
    } else {
      console.log('✅ All old field names successfully removed');
    }
    
    // Check for required fields
    const docsWithoutPublisherId = await collection.countDocuments({
      'meta.publisherId': { $exists: false }
    });
    
    const docsWithoutIsDraft = await collection.countDocuments({
      'meta.isDraft': { $exists: false }
    });
    
    console.log(`📊 Documents without publisherId: ${docsWithoutPublisherId}`);
    console.log(`📊 Documents without isDraft: ${docsWithoutIsDraft}`);
    
    // Show a sample document
    const sampleDoc = await collection.findOne({});
    if (sampleDoc) {
      console.log('\n📄 Sample migrated document structure:');
      console.log('Meta:', JSON.stringify(sampleDoc.meta, null, 2));
      if (sampleDoc.theme?.colors) {
        console.log('Theme colors:', JSON.stringify(sampleDoc.theme.colors, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStorefrontSchema()
    .then(() => {
      console.log('✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateStorefrontSchema };
