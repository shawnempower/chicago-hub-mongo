/**
 * Verify User Publication Access
 * 
 * This script checks if a user has proper access to publications in their assigned hubs.
 * It verifies that the user_publication_access junction table is properly populated.
 * 
 * Usage: npx tsx scripts/verifyUserPublicationAccess.ts <userId>
 */

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function verifyUserPublicationAccess(userId: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();

    // 1. Check user permissions
    console.log('📋 Step 1: Checking user permissions...');
    const permissionsCollection = db.collection(COLLECTIONS.USER_PERMISSIONS);
    const permissions = await permissionsCollection.findOne({ userId });

    if (!permissions) {
      console.log('❌ No permissions found for this user');
      return;
    }

    console.log('✅ User permissions found:');
    console.log(`   Role: ${permissions.role}`);
    console.log(`   Access Scope: ${permissions.accessScope}`);
    console.log(`   Hub Access: ${JSON.stringify(permissions.hubAccess || [])}`);
    console.log(`   Individual Publications: ${JSON.stringify(permissions.individualPublicationIds || [])}\n`);

    // 2. Check hub publications
    if (permissions.hubAccess && permissions.hubAccess.length > 0) {
      console.log('📰 Step 2: Checking publications in assigned hubs...');
      const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
      
      for (const hubAccess of permissions.hubAccess) {
        console.log(`\n   Hub: ${hubAccess.hubId} (${hubAccess.accessLevel} access)`);
        const publications = await publicationsCollection
          .find({ hubIds: hubAccess.hubId })
          .toArray();
        
        console.log(`   Found ${publications.length} publications in this hub:`);
        publications.forEach((pub: any) => {
          console.log(`      - ${pub.basicInfo?.publicationName} (ID: ${pub.publicationId}, _id: ${pub._id})`);
        });
      }
      console.log();
    }

    // 3. Check junction table
    console.log('🔗 Step 3: Checking user_publication_access junction table...');
    const accessJunctionCollection = db.collection(COLLECTIONS.USER_PUBLICATION_ACCESS);
    const accessRecords = await accessJunctionCollection
      .find({ userId })
      .toArray();

    console.log(`   Found ${accessRecords.length} access records:`);
    accessRecords.forEach((record: any) => {
      console.log(`      - Publication ID: ${record.publicationId}`);
      console.log(`        Granted via: ${record.grantedVia}`);
      console.log(`        Granted via ID: ${record.grantedViaId || 'N/A'}`);
      console.log(`        Granted at: ${record.grantedAt}`);
      console.log(`        Granted by: ${record.grantedBy}\n`);
    });

    // 4. Verify consistency
    console.log('✔️  Step 4: Verifying consistency...');
    if (permissions.hubAccess && permissions.hubAccess.length > 0) {
      const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
      
      for (const hubAccess of permissions.hubAccess) {
        const publications = await publicationsCollection
          .find({ hubIds: hubAccess.hubId })
          .toArray();
        
        const publicationIds = publications.map((pub: any) => String(pub.publicationId));
        const accessRecordIds = accessRecords
          .filter((record: any) => record.grantedViaId === hubAccess.hubId)
          .map((record: any) => record.publicationId);
        
        const missing = publicationIds.filter(id => !accessRecordIds.includes(id));
        const extra = accessRecordIds.filter(id => !publicationIds.includes(id));
        
        if (missing.length > 0) {
          console.log(`   ⚠️  Hub ${hubAccess.hubId}: Missing ${missing.length} access records`);
          console.log(`      Publication IDs: ${missing.join(', ')}`);
          console.log(`      Run: npm run fix-hub-access ${userId} ${hubAccess.hubId}`);
        } else if (extra.length > 0) {
          console.log(`   ⚠️  Hub ${hubAccess.hubId}: ${extra.length} extra access records (publications removed from hub?)`);
        } else {
          console.log(`   ✅ Hub ${hubAccess.hubId}: All access records are correct`);
        }
      }
    }

    // 5. Test a specific publication access
    if (accessRecords.length > 0) {
      console.log('\n🧪 Step 5: Testing publication access check...');
      const testRecord = accessRecords[0];
      const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
      const testPub = await publicationsCollection.findOne({ 
        publicationId: parseInt(testRecord.publicationId) 
      });
      
      if (testPub) {
        console.log(`   Testing with publication: ${testPub.basicInfo?.publicationName}`);
        console.log(`   MongoDB _id: ${testPub._id}`);
        console.log(`   Numeric publicationId: ${testPub.publicationId}`);
        
        // Check if access record exists with numeric ID
        const accessCheck = await accessJunctionCollection.findOne({
          userId,
          publicationId: String(testPub.publicationId)
        });
        
        if (accessCheck) {
          console.log('   ✅ Access check PASSED - Junction table lookup successful');
        } else {
          console.log('   ❌ Access check FAILED - Junction table lookup failed');
        }
      }
    }

    console.log('\n✨ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: npx tsx scripts/verifyUserPublicationAccess.ts <userId>');
  process.exit(1);
}

verifyUserPublicationAccess(userId);

