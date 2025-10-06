// Script to make a user admin by updating MongoDB directly using user ID
import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';

async function makeUserAdminById(userId: string) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);

    console.log(`Looking for user with ID: ${userId}`);

    // Find the user by ID
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      console.log('❌ User not found with that ID');
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.firstName} ${user.lastName})`);

    // Update or create user profile with admin flag
    const result = await profilesCollection.updateOne(
      { userId },
      { 
        $set: { 
          isAdmin: true,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      console.log(`🎉 Successfully made ${user.email} an admin!`);
    } else {
      console.log(`ℹ️  User ${user.email} was already an admin`);
    }

    // Verify the update
    const profile = await profilesCollection.findOne({ userId });
    console.log(`Admin status confirmed: ${profile?.isAdmin}`);

  } catch (error) {
    console.error('❌ Error making user admin:', error);
  } finally {
    process.exit(0);
  }
}

// Get userId from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: tsx makeUserAdminById.ts <user-id>');
  console.log('Example: tsx makeUserAdminById.ts 68d7068a88d3c7e8803e55ec5');
  process.exit(1);
}

makeUserAdminById(userId);
