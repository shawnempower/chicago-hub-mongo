// Script to check a specific user's data
import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function checkUser(searchTerm: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    console.log(`🔍 Searching for user: ${searchTerm}`);

    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);

    // Try to find user by email, first name, last name, or company name
    const user = await usersCollection.findOne({
      $or: [
        { email: { $regex: searchTerm, $options: 'i' } },
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { companyName: { $regex: searchTerm, $options: 'i' } }
      ]
    });

    if (!user) {
      console.log('❌ User not found in users collection');
      return;
    }

    console.log('\n👤 User Found in AUTH COLLECTION:');
    console.log('=' .repeat(60));
    console.log(`🆔 _id (MongoDB): ${user._id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 First Name: ${user.firstName || 'N/A'}`);
    console.log(`👤 Last Name: ${user.lastName || 'N/A'}`);
    console.log(`🏢 Company: ${user.companyName || 'N/A'}`);
    console.log(`✅ Email Verified: ${user.isEmailVerified}`);
    console.log(`📅 Created: ${user.createdAt}`);
    console.log(`📅 Updated: ${user.updatedAt}`);
    console.log(`🔑 Last Login: ${user.lastLoginAt || 'Never'}`);

    // Check for user profile
    const userId = user._id?.toString();
    const profile = await profilesCollection.findOne({ userId });

    console.log('\n📋 User Profile:');
    console.log('=' .repeat(60));
    
    if (profile) {
      console.log(`🆔 Profile _id: ${profile._id}`);
      console.log(`🔗 userId (reference): ${profile.userId}`);
      console.log(`👤 First Name: ${profile.firstName || 'N/A'}`);
      console.log(`👤 Last Name: ${profile.lastName || 'N/A'}`);
      console.log(`📞 Phone: ${profile.phone || 'N/A'}`);
      console.log(`🏢 Company: ${profile.companyName || 'N/A'}`);
      console.log(`🌐 Website: ${profile.companyWebsite || 'N/A'}`);
      console.log(`📊 Company Size: ${profile.companySizes || 'N/A'}`);
      console.log(`🏭 Industry: ${profile.industry || 'N/A'}`);
      console.log(`💼 Role: ${profile.role || 'N/A'}`);
      console.log(`🎯 Target Audience: ${profile.targetAudience || 'N/A'}`);
      console.log(`📈 Marketing Goals: ${profile.marketingGoals?.join(', ') || 'N/A'}`);
      console.log(`🗣️ Brand Voice: ${profile.brandVoice || 'N/A'}`);
      console.log(`⭐ Profile Completion: ${profile.profileCompletionScore || 0}%`);
      console.log(`🔐 IS ADMIN: ${profile.isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`📅 Profile Created: ${profile.createdAt}`);
      console.log(`📅 Profile Updated: ${profile.updatedAt}`);
    } else {
      console.log('❌ No profile found for this user');
      console.log('ℹ️  This user exists in auth but has no profile yet');
    }

    // Check what getAllUsers would return for this user
    console.log('\n🔍 What getAllUsers() would return:');
    console.log('=' .repeat(60));
    
    if (profile) {
      console.log('✅ Would return EXISTING PROFILE with:');
      console.log(`   - userId: ${profile.userId}`);
      console.log(`   - _id: ${profile._id}`);
      console.log(`   - email: ${user.email} (from auth)`);
      console.log(`   - isAdmin: ${profile.isAdmin || false}`);
    } else {
      console.log('⚠️  Would create VIRTUAL PROFILE with:');
      console.log(`   - userId: ${user._id?.toString()}`);
      console.log(`   - _id: (NONE - this is the issue!)`);
      console.log(`   - email: ${user.email}`);
      console.log(`   - isAdmin: false (default)`);
      console.log(`   - profileCompletionScore: 0`);
    }

    console.log('\n💡 DIAGNOSIS:');
    if (!profile) {
      console.log('⚠️  This user has NO profile, so getAllUsers() creates a virtual profile');
      console.log('⚠️  Virtual profiles don\'t have _id field from user_profiles collection');
      console.log('✅ FIXED: The code now only requires userId, not both userId and _id');
      console.log('\n📝 To create a real profile for this user, run:');
      console.log(`   npm run make-admin ${user.email}`);
      console.log('   Or have the user complete their profile in the app');
    } else if (!profile.isAdmin) {
      console.log('✅ This user has a complete profile');
      console.log('ℹ️  User is not an admin yet');
      console.log(`📝 To make this user an admin, run: npm run make-admin ${user.email}`);
    } else {
      console.log('✅ This user has a complete profile AND is an admin');
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

// Get search term from command line
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: tsx src/scripts/checkUser.ts <search-term>');
  console.log('Example: tsx src/scripts/checkUser.ts "Ron Fields"');
  console.log('Example: tsx src/scripts/checkUser.ts "ron@example.com"');
  process.exit(1);
}

checkUser(searchTerm);

