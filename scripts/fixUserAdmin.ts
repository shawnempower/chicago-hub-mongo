/**
 * Fix user admin status by copying from profile to user record
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';

async function fixUserAdmin(email: string) {
  try {
    await connectToDatabase();
    const db = getDatabase();
    
    // Check user record
    const user = await db.collection(COLLECTIONS.USERS).findOne({ 
      email: email.toLowerCase() 
    });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return;
    }
    
    const userId = user._id?.toString();
    console.log('\n📋 User:', email);
    console.log('  Current isAdmin on user:', user.isAdmin);
    console.log('  Current role on user:', user.role);
    
    // Check profile
    const profile = await db.collection(COLLECTIONS.USER_PROFILES).findOne({ userId });
    
    if (!profile) {
      console.log('  No profile found');
      return;
    }
    
    console.log('  isAdmin on profile:', profile.isAdmin);
    
    if (profile.isAdmin === true) {
      // Update user record with admin flag
      const result = await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: user._id },
        { 
          $set: { 
            isAdmin: true,
            role: 'admin',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('\n✅ Updated user record:');
      console.log('  isAdmin:', true);
      console.log('  role:', 'admin');
      console.log('  Modified count:', result.modifiedCount);
      
      // Also create permissions record if it doesn't exist
      const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).findOne({ userId });
      
      if (!permissions) {
        await db.collection(COLLECTIONS.USER_PERMISSIONS).insertOne({
          userId,
          role: 'admin',
          accessScope: 'all',
          canInviteUsers: true,
          canManageGroups: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('\n✅ Created permissions record with admin role');
      }
      
      console.log('\n🎉 Done! Please logout and login again to get a fresh token.');
    } else {
      console.log('\n⚠️  Profile isAdmin is not true, no changes made');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'shawn@empowerlocal.com';
fixUserAdmin(email);

