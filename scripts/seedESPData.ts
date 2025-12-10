/**
 * Seed ESP Reference Data
 * 
 * Populates the esp_reference collection with email service provider compatibility data.
 * Run with: npx ts-node scripts/seedESPData.ts
 */

import { config } from 'dotenv';
config();

import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { ESP_SEED_DATA, ESPReference } from '../src/integrations/mongodb/espReferenceSchema';

async function seedESPData() {
  console.log('🌱 Starting ESP Reference Data Seed...\n');

  try {
    // Connect to MongoDB
    await connectToDatabase();
    const db = getDatabase();
    const collection = db.collection<ESPReference>(COLLECTIONS.ESP_REFERENCE);

    // Check if data already exists
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  ESP reference collection already has ${existingCount} documents.`);
      console.log('   Skipping seed to avoid duplicates.');
      console.log('   To re-seed, first drop the collection: db.esp_reference.drop()');
      return;
    }

    // Insert all ESP data
    console.log(`📝 Inserting ${ESP_SEED_DATA.length} ESP records...`);
    const result = await collection.insertMany(ESP_SEED_DATA as any[]);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} ESP records\n`);

    // Print summary by support level
    const fullSupport = ESP_SEED_DATA.filter(e => e.htmlSupport === 'full').length;
    const limitedSupport = ESP_SEED_DATA.filter(e => e.htmlSupport === 'limited').length;
    const noSupport = ESP_SEED_DATA.filter(e => e.htmlSupport === 'none').length;

    console.log('📊 Summary:');
    console.log(`   Full HTML Support: ${fullSupport} ESPs`);
    console.log(`   Limited HTML Support: ${limitedSupport} ESPs`);
    console.log(`   No/Restricted Support: ${noSupport} ESPs`);

    // Create indexes
    console.log('\n🔍 Creating indexes...');
    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ htmlSupport: 1 });
    await collection.createIndex({ isActive: 1 });
    console.log('✅ Indexes created');

  } catch (error) {
    console.error('❌ Error seeding ESP data:', error);
    throw error;
  } finally {
    await closeConnection();
    console.log('\n🏁 Seed complete');
  }
}

// Run if executed directly
seedESPData().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
