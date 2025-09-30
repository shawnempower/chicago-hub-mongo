// Script to set a user as admin
// Usage: Run this script with the user's email to grant admin privileges

import { UserProfilesService } from '../integrations/mongodb/allServices';

const userProfilesService = new UserProfilesService();

async function setUserAsAdmin(userEmail: string) {
  try {
    console.log(`Setting admin privileges for user: ${userEmail}`);
    
    // This is a simplified version - you'd need to get the userId from the auth system
    // For now, this demonstrates the concept
    
    console.log('To set a user as admin, you need their userId from the auth system.');
    console.log('You can either:');
    console.log('1. Use the admin interface once you have at least one admin user');
    console.log('2. Manually update the user_profiles collection in MongoDB');
    console.log('3. Add this to your user registration process for the first admin');
    
    console.log('\nMongoDB command to set admin manually:');
    console.log(`db.user_profiles.updateOne(
      { userId: "USER_ID_HERE" },
      { 
        $set: { 
          isAdmin: true, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    )`);
    
  } catch (error) {
    console.error('Error setting admin privileges:', error);
  }
}

// Example usage
if (require.main === module) {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.log('Usage: ts-node setAdminUser.ts <user-email>');
    process.exit(1);
  }
  
  setUserAsAdmin(userEmail);
}

export { setUserAsAdmin };

