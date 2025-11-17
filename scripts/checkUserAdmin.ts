/**
 * Quick script to check user admin status
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function checkUserAdmin(email: string) {
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
    
    console.log('\n📋 User Record:');
    console.log('  Email:', user.email);
    console.log('  ID:', user._id?.toString());
    console.log('  isAdmin (on user):', user.isAdmin);
    console.log('  role (on user):', user.role);
    
    // Check user profile
    const profile = await db.collection(COLLECTIONS.USER_PROFILES).findOne({ 
      userId: user._id?.toString() 
    });
    
    console.log('\n📋 User Profile:');
    if (profile) {
      console.log('  Profile exists: Yes');
      console.log('  isAdmin (on profile):', profile.isAdmin);
    } else {
      console.log('  Profile exists: No');
    }
    
    // Check permissions
    const permissions = await db.collection(COLLECTIONS.USER_PERMISSIONS).findOne({ 
      userId: user._id?.toString() 
    });
    
    console.log('\n📋 User Permissions:');
    if (permissions) {
      console.log('  Permissions exist: Yes');
      console.log('  role:', permissions.role);
      console.log('  canInviteUsers:', permissions.canInviteUsers);
      console.log('  accessScope:', permissions.accessScope);
    } else {
      console.log('  Permissions exist: No');
    }
    
    console.log('\n✅ Is Admin?');
    const isAdmin = user.isAdmin === true || 
                    user.role === 'admin' || 
                    profile?.isAdmin === true ||
                    permissions?.role === 'admin';
    console.log('  Result:', isAdmin ? '✅ YES' : '❌ NO');
    
    if (!isAdmin) {
      console.log('\n🔧 To fix, run one of these commands:');
      console.log('  npm run make-admin', email);
      console.log('  OR update directly in MongoDB');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2] || 'shawn@empowerlocal.com';
checkUserAdmin(email);

