/**
 * Seed Algorithm Configurations to MongoDB
 * 
 * This script migrates algorithm configurations from code to the database.
 * Run this once to populate the database with all algorithm configs.
 * 
 * Prerequisites:
 * - MONGODB_URI must be set in environment or .env file
 * 
 * Usage: npx tsx scripts/seed-algorithms.ts
 * Or with explicit URI: MONGODB_URI="mongodb://..." npx tsx scripts/seed-algorithms.ts
 */

import { config } from 'dotenv';
import { getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { AllInclusiveAlgorithm } from '../server/campaignAlgorithms/all-inclusive/config';
import { BudgetFriendlyAlgorithm } from '../server/campaignAlgorithms/budget-friendly/config';
import { LittleGuysAlgorithm } from '../server/campaignAlgorithms/little-guys/config';
import { ProportionalAlgorithm } from '../server/campaignAlgorithms/proportional/config';

// Load environment variables
config();

async function seedAlgorithms() {
  try {
    console.log('🌱 Starting algorithm seeding...');
    
    // Check MongoDB connection
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set!');
      console.error('');
      console.error('Please set it in one of these ways:');
      console.error('  1. Add to .env file: MONGODB_URI="mongodb://..."');
      console.error('  2. Set as environment variable: export MONGODB_URI="mongodb://..."');
      console.error('  3. Run with inline variable: MONGODB_URI="mongodb://..." npx tsx scripts/seed-algorithms.ts');
      console.error('');
      console.error('Alternatively, use the API-based seeding:');
      console.error('  ADMIN_TOKEN="your-token" npx tsx scripts/seed-algorithms-via-api.ts');
      process.exit(1);
    }
    
    console.log('✓ MongoDB URI found');
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.ALGORITHM_CONFIGS);

    // Define algorithms to seed
    const algorithms = [
      AllInclusiveAlgorithm,
      BudgetFriendlyAlgorithm,
      LittleGuysAlgorithm,
      ProportionalAlgorithm
    ];

    let seeded = 0;
    let updated = 0;
    let skipped = 0;

    for (const algorithm of algorithms) {
      const existing = await collection.findOne({ algorithmId: algorithm.id });
      
      const doc = {
        algorithmId: algorithm.id,
        name: algorithm.name,
        description: algorithm.description,
        icon: algorithm.icon,
        llmConfig: algorithm.llmConfig,
        constraints: algorithm.constraints,
        scoring: algorithm.scoring,
        promptInstructions: algorithm.promptInstructions,
        isActive: true,
        isDefault: algorithm.id === 'all-inclusive',
        updatedAt: new Date()
      };

      if (!existing) {
        // Insert new algorithm
        await collection.insertOne({
          ...doc,
          createdAt: new Date(),
          createdBy: 'system:seed-script'
        });
        console.log(`✅ Seeded: ${algorithm.name} (${algorithm.id})`);
        seeded++;
      } else {
        // Ask before updating
        console.log(`ℹ️  Algorithm '${algorithm.name}' already exists in database.`);
        console.log(`   Current DB version: updated ${existing.updatedAt?.toISOString() || 'unknown'}`);
        console.log(`   Would update with code version`);
        
        // For now, skip updating existing algorithms (preserve user changes)
        console.log(`⏭️  Skipping (preserving existing DB config)`);
        skipped++;
        
        // Uncomment to force update from code:
        // await collection.updateOne(
        //   { algorithmId: algorithm.id },
        //   { $set: { ...doc, updatedBy: 'system:seed-script' } }
        // );
        // console.log(`🔄 Updated: ${algorithm.name}`);
        // updated++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Seeded: ${seeded} algorithms`);
    console.log(`   🔄 Updated: ${updated} algorithms`);
    console.log(`   ⏭️  Skipped: ${skipped} algorithms (already exist)`);
    console.log(`   📁 Total in DB: ${seeded + updated + skipped} algorithms`);
    
    console.log('\n✨ Algorithm seeding complete!');
    console.log('💡 You can now manage algorithms via the Admin UI at /admin → Algorithms tab');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding algorithms:', error);
    process.exit(1);
  }
}

// Run the seeding
seedAlgorithms();

