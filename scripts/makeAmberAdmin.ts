/**
 * Make amber@empowerlocal.com an admin on chicago-hub
 * 
 * This script updates all three locations where admin status is tracked:
 * 1. users collection - isAdmin flag and role
 * 2. user_profiles collection - isAdmin flag
 * 3. user_permissions collection - role and accessScope
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

const TARGET_EMAIL = 'amber@empowerlocal.com';

async function makeUserAdmin() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    const db = getDatabase();
    
    console.log(`\n🔍 Looking for user: ${TARGET_EMAIL}`);
    
    // Find the user by email
    const user = await db.collection(COLLECTIONS.USERS).findOne({ 
      email: TARGET_EMAIL.toLowerCase() 
    });
    
    if (!user) {
      console.log(`❌ User not found with email: ${TARGET_EMAIL}`);
      console.log('\nPlease make sure the user has registered first.');
      process.exit(1);
    }
    
    const userId = user._id?.toString();
    console.log(`✅ Found user: ${userId}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current role: ${user.role || 'none'}`);
    console.log(`   Current isAdmin: ${user.isAdmin || false}`);
    
    // 1. Update users collection
    console.log('\n📝 Updating users collection...');
    const userResult = await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      { 
        $set: { 
          isAdmin: true,
          role: 'admin',
          updatedAt: new Date()
        } 
      }
    );
    console.log(`   Modified: ${userResult.modifiedCount > 0 ? '✅ Yes' : '⚪ No changes (already set)'}`);
    
    // 2. Update/create user_profiles collection
    console.log('\n📝 Updating user_profiles collection...');
    const profileResult = await db.collection(COLLECTIONS.USER_PROFILES).updateOne(
      { userId },
      { 
        $set: { 
          isAdmin: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`   Modified: ${profileResult.modifiedCount > 0 ? '✅ Yes' : '⚪ No changes'}`);
    console.log(`   Created new: ${profileResult.upsertedCount > 0 ? '✅ Yes' : '⚪ No'}`);
    
    // 3. Update/create user_permissions collection
    console.log('\n📝 Updating user_permissions collection...');
    const permissionsResult = await db.collection(COLLECTIONS.USER_PERMISSIONS).updateOne(
      { userId },
      { 
        $set: { 
          role: 'admin',
          accessScope: 'all',
          canInviteUsers: true,
          canManageGroups: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`   Modified: ${permissionsResult.modifiedCount > 0 ? '✅ Yes' : '⚪ No changes'}`);
    console.log(`   Created new: ${permissionsResult.upsertedCount > 0 ? '✅ Yes' : '⚪ No'}`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    
    const updatedUser = await db.collection(COLLECTIONS.USERS).findOne({ _id: user._id });
    const updatedProfile = await db.collection(COLLECTIONS.USER_PROFILES).findOne({ userId });
    const updatedPermissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).findOne({ userId });
    
    console.log('\n📋 Final Status:');
    console.log(`   users.isAdmin: ${updatedUser?.isAdmin}`);
    console.log(`   users.role: ${updatedUser?.role}`);
    console.log(`   user_profiles.isAdmin: ${updatedProfile?.isAdmin}`);
    console.log(`   user_permissions.role: ${updatedPermissions?.role}`);
    console.log(`   user_permissions.accessScope: ${updatedPermissions?.accessScope}`);
    
    console.log(`\n🎉 Success! ${TARGET_EMAIL} is now an admin on chicago-hub!`);
    console.log('\n⚠️  Important: The user should log out and log back in to get a fresh token with admin privileges.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error making user admin:', error);
    process.exit(1);
  }
}

makeUserAdmin();
