import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase } from '../src/integrations/mongodb/client';
import { getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function checkAdmin() {
  try {
    await connectToDatabase();
    const db = getDatabase();
    
    // Find user by ID from the token
    const userId = '68d7068a88d3c7e803e55ec5';
    
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userId });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('📋 User Info:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Admin Status:', user.isAdmin ? '✅ YES' : '❌ NO');
    
    if (!user.isAdmin) {
      console.log('\n⚠️  Setting admin status...');
      const result = await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: userId },
        { $set: { isAdmin: true } }
      );
      console.log('✅ Admin status updated:', result.modifiedCount, 'record(s)');
      console.log('\n🔄 IMPORTANT: Log out and log back in to get a new token!');
    } else {
      console.log('\n✅ You are already an admin!');
      console.log('🔄 If you\'re still getting access denied, log out and log back in.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdmin();

