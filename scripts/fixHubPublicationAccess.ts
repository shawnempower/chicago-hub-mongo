/**
 * Fix Hub Publication Access
 * 
 * This script syncs the user_publication_access junction table for a user's hub access.
 * It ensures that all publications in a user's assigned hubs are properly reflected
 * in the junction table.
 * 
 * Usage: npx tsx scripts/fixHubPublicationAccess.ts <userId> <hubId>
 *        or
 *        npx tsx scripts/fixHubPublicationAccess.ts <userId> --all
 */

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function fixHubPublicationAccess(userId: string, hubId: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();

    // Get all publications in the hub
    console.log(`📰 Finding publications in hub: ${hubId}...`);
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publications = await publicationsCollection
      .find({ hubIds: hubId })
      .toArray();

    console.log(`   Found ${publications.length} publications\n`);

    if (publications.length === 0) {
      console.log('⚠️  No publications found in this hub');
      return;
    }

    // Create access records
    const accessJunctionCollection = db.collection(COLLECTIONS.USER_PUBLICATION_ACCESS);
    
    console.log('🗑️  Removing existing hub-based access records...');
    const deleteResult = await accessJunctionCollection.deleteMany({
      userId,
      grantedVia: 'hub',
      grantedViaId: hubId
    });
    console.log(`   Removed ${deleteResult.deletedCount} old records\n`);

    console.log('➕ Creating new access records...');
    const accessRecords = publications.map((pub: any) => ({
      userId,
      publicationId: String(pub.publicationId),
      grantedVia: 'hub',
      grantedViaId: hubId,
      grantedAt: new Date(),
      grantedBy: 'system_sync'
    }));

    if (accessRecords.length > 0) {
      await accessJunctionCollection.insertMany(accessRecords);
      console.log(`   ✅ Created ${accessRecords.length} access records\n`);

      console.log('📋 Access records created for:');
      publications.forEach((pub: any) => {
        console.log(`   - ${pub.basicInfo?.publicationName} (ID: ${pub.publicationId})`);
      });
    }

    console.log('\n✨ Hub publication access fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function fixAllHubs(userId: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();

    // Get user permissions
    console.log(`📋 Finding user permissions for: ${userId}...`);
    const permissionsCollection = db.collection(COLLECTIONS.USER_PERMISSIONS);
    const permissions = await permissionsCollection.findOne({ userId });

    if (!permissions) {
      console.log('❌ No permissions found for this user');
      return;
    }

    console.log(`   Found permissions with ${permissions.hubAccess?.length || 0} hub(s)\n`);

    if (!permissions.hubAccess || permissions.hubAccess.length === 0) {
      console.log('⚠️  User has no hub access assigned');
      return;
    }

    // Fix access for each hub
    for (const hubAccess of permissions.hubAccess) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing hub: ${hubAccess.hubId}`);
      console.log('='.repeat(60));
      await fixHubPublicationAccess(userId, hubAccess.hubId);
    }

    console.log('\n\n✨ All hubs processed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get arguments from command line
const userId = process.argv[2];
const hubIdOrFlag = process.argv[3];

if (!userId || !hubIdOrFlag) {
  console.error('❌ Usage: npx tsx scripts/fixHubPublicationAccess.ts <userId> <hubId>');
  console.error('        or npx tsx scripts/fixHubPublicationAccess.ts <userId> --all');
  process.exit(1);
}

if (hubIdOrFlag === '--all') {
  fixAllHubs(userId);
} else {
  fixHubPublicationAccess(userId, hubIdOrFlag).then(() => process.exit(0));
}

