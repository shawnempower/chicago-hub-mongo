// Script to make a user admin by updating MongoDB directly
import { getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function makeUserAdmin(userEmail: string) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);

    console.log(`Looking for user with email: ${userEmail}`);

    // Find the user by email
    const user = await usersCollection.findOne({ email: userEmail.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found with that email address');
      return;
    }

    const userId = user._id?.toString();
    console.log(`✅ Found user: ${userId}`);

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
      console.log(`🎉 Successfully made ${userEmail} an admin!`);
    } else {
      console.log(`ℹ️  User ${userEmail} was already an admin`);
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

// Get email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: npm run make-admin <user-email>');
  console.log('Example: npm run make-admin admin@chicagohub.com');
  process.exit(1);
}

makeUserAdmin(userEmail);

