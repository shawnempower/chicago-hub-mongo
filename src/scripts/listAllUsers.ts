// Script to list all users in the database
import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function listAllUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);

    // Get all users
    const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
    console.log(`📊 Total users in auth collection: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }

    console.log('👥 ALL USERS:');
    console.log('=' .repeat(80));

    for (const user of users) {
      const userId = user._id?.toString();
      const profile = await profilesCollection.findOne({ userId });
      
      console.log(`\n👤 ${user.firstName || ''} ${user.lastName || ''} ${user.companyName ? `(${user.companyName})` : ''}`.trim());
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 User ID: ${userId}`);
      console.log(`   📋 Has Profile: ${profile ? '✅ YES' : '❌ NO'}`);
      console.log(`   🔐 Is Admin: ${profile?.isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   ⭐ Profile Score: ${profile?.profileCompletionScore || 0}%`);
      console.log(`   📅 Created: ${user.createdAt?.toISOString().split('T')[0]}`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total Users: ${users.length}`);
    
    const usersWithProfiles = await profilesCollection.countDocuments();
    console.log(`   Users with Profiles: ${usersWithProfiles}`);
    
    const admins = await profilesCollection.countDocuments({ isAdmin: true });
    console.log(`   Admin Users: ${admins}`);

  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    process.exit(0);
  }
}

listAllUsers();

