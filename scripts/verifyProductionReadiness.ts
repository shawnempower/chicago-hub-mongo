#!/usr/bin/env tsx

/**
 * Production Readiness Verification Script
 * 
 * Checks that the production database is ready for hub system deployment
 */

import * as dotenv from 'dotenv';
import { connectToDatabase, closeConnection, getDatabaseName } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

dotenv.config();

async function verifyProductionReadiness() {
  console.log('🔍 Verifying Production Readiness for Hub System\n');
  console.log('=' .repeat(60));
  
  try {
    await connectToDatabase();
    const db = (await connectToDatabase()).client.db(getDatabaseName());
    
    console.log(`📊 Database: ${getDatabaseName()}`);
    console.log('='.repeat(60) + '\n');
    
    let allChecksPassed = true;
    
    // Check 1: Hubs collection
    console.log('✓ CHECK 1: Hubs Collection');
    const collections = await db.listCollections().toArray();
    const hasHubsCollection = collections.some(c => c.name === COLLECTIONS.HUBS);
    
    if (hasHubsCollection) {
      const hubCount = await db.collection(COLLECTIONS.HUBS).countDocuments();
      const activeHubs = await db.collection(COLLECTIONS.HUBS).countDocuments({ status: 'active' });
      console.log(`  ✅ Hubs collection exists: ${hubCount} hubs (${activeHubs} active)`);
      
      const hubs = await db.collection(COLLECTIONS.HUBS).find({}).toArray();
      hubs.forEach((hub: any) => {
        console.log(`     - ${hub.basicInfo?.name} (${hub.hubId}): ${hub.status}`);
      });
    } else {
      console.log('  ⚠️  Hubs collection does NOT exist - will be created by migration');
      allChecksPassed = false;
    }
    
    // Check 2: Publications with hubIds
    console.log('\n✓ CHECK 2: Publications Hub Assignments');
    const totalPubs = await db.collection(COLLECTIONS.PUBLICATIONS).countDocuments();
    const pubsWithHubIds = await db.collection(COLLECTIONS.PUBLICATIONS).countDocuments({ 
      hubIds: { $exists: true, $ne: [] } 
    });
    const unassignedPubs = await db.collection(COLLECTIONS.PUBLICATIONS).countDocuments({ 
      $or: [
        { hubIds: { $exists: false } },
        { hubIds: { $eq: [] } }
      ]
    });
    
    console.log(`  📊 Total publications: ${totalPubs}`);
    console.log(`  ✅ With hub assignments: ${pubsWithHubIds}`);
    console.log(`  ⚠️  Unassigned: ${unassignedPubs}`);
    
    if (unassignedPubs > 0 && pubsWithHubIds === 0) {
      console.log('  ⚠️  No publications have hub assignments - migration needed');
      allChecksPassed = false;
    }
    
    // Check 3: Packages with hubInfo
    console.log('\n✓ CHECK 3: Package Hub Associations');
    const totalPackages = await db.collection(COLLECTIONS.HUB_PACKAGES).countDocuments();
    const packagesWithHubInfo = await db.collection(COLLECTIONS.HUB_PACKAGES).countDocuments({ 
      'hubInfo.hubId': { $exists: true } 
    });
    
    console.log(`  📊 Total packages: ${totalPackages}`);
    console.log(`  ✅ With hub info: ${packagesWithHubInfo}`);
    
    if (packagesWithHubInfo < totalPackages) {
      console.log(`  ⚠️  ${totalPackages - packagesWithHubInfo} packages missing hub associations`);
      allChecksPassed = false;
    }
    
    // Check 4: Indexes
    console.log('\n✓ CHECK 4: Database Indexes');
    
    if (hasHubsCollection) {
      const hubIndexes = await db.collection(COLLECTIONS.HUBS).indexes();
      console.log(`  ✅ Hubs collection has ${hubIndexes.length} indexes`);
    } else {
      console.log(`  ⚠️  Hubs collection doesn't exist yet`);
    }
    
    const pubIndexes = await db.collection(COLLECTIONS.PUBLICATIONS).indexes();
    const hasHubIdsIndex = pubIndexes.some((idx: any) => idx.key.hubIds);
    
    if (hasHubIdsIndex) {
      console.log(`  ✅ Publications has hubIds index`);
    } else {
      console.log(`  ⚠️  Publications missing hubIds index - will be created`);
    }
    
    // Check 5: Environment Variables
    console.log('\n✓ CHECK 5: Environment Configuration');
    const requiredEnvVars = ['MONGODB_URI', 'MONGODB_DB_NAME'];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`  ✅ ${envVar} is set`);
      } else {
        console.log(`  ❌ ${envVar} is NOT set`);
        allChecksPassed = false;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    if (allChecksPassed && hasHubsCollection && pubsWithHubIds > 0) {
      console.log('✅ Production database is READY - Migration already completed!');
      console.log('   You can deploy the application code.');
    } else if (!hasHubsCollection || unassignedPubs > 0) {
      console.log('⚠️  Production database needs MIGRATION');
      console.log('   Run the following commands:');
      console.log('   1. npm run migrate:hubs:dry-run (preview)');
      console.log('   2. npm run migrate:hubs (apply changes)');
    } else {
      console.log('⚠️  Some checks failed - review output above');
      allChecksPassed = false;
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run verification
verifyProductionReadiness()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

