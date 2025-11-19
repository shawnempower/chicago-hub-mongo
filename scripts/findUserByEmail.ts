/**
 * Find User by Email
 * 
 * Quick utility to find a user's ID by their email address.
 * 
 * Usage: npx tsx scripts/findUserByEmail.ts <email>
 */

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function findUserByEmail(email: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);
    
    console.log(`🔍 Searching for user: ${email}...`);
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n✅ User Found:');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 User ID: ${user._id}`);
    console.log(`👤 Role: ${user.role || 'standard'}`);
    console.log(`📅 Created: ${user.createdAt || 'N/A'}`);

    // Check permissions
    const permissionsCollection = db.collection(COLLECTIONS.USER_PERMISSIONS);
    const permissions = await permissionsCollection.findOne({ userId: String(user._id) });

    if (permissions) {
      console.log('\n📋 Permissions:');
      console.log(`   Role: ${permissions.role}`);
      console.log(`   Access Scope: ${permissions.accessScope}`);
      
      if (permissions.hubAccess && permissions.hubAccess.length > 0) {
        console.log(`   Hubs (${permissions.hubAccess.length}):`);
        permissions.hubAccess.forEach((hub: any) => {
          console.log(`      - ${hub.hubId} (${hub.accessLevel} access)`);
        });
      }
      
      if (permissions.individualPublicationIds && permissions.individualPublicationIds.length > 0) {
        console.log(`   Individual Publications: ${permissions.individualPublicationIds.length}`);
      }
    } else {
      console.log('\n⚠️  No permissions record found');
    }

    console.log('\n💡 To verify access: npx tsx scripts/verifyUserPublicationAccess.ts ' + user._id);
    console.log('💡 To fix access: npx tsx scripts/fixHubPublicationAccess.ts ' + user._id + ' --all');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npx tsx scripts/findUserByEmail.ts <email>');
  process.exit(1);
}

findUserByEmail(email);

