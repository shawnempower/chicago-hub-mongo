/**
 * Delete User by Email
 * 
 * Safely deletes a user and all their related data from the database.
 * 
 * Usage: npx tsx scripts/deleteUserByEmail.ts <email> [--confirm]
 * 
 * Options:
 *   --confirm    Skip interactive confirmation (use with caution!)
 * 
 * CAUTION: This is a destructive operation. Make sure you have the correct email.
 */

import 'dotenv/config';
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import * as readline from 'readline';

// Check for --confirm flag
const args = process.argv.slice(2);
const confirmFlag = args.includes('--confirm');
const email = args.find(arg => !arg.startsWith('--'));

async function promptConfirmation(message: string): Promise<boolean> {
  if (confirmFlag) {
    console.log('\n⚡ --confirm flag provided, skipping interactive confirmation...');
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function deleteUserByEmail(email: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();
    const normalizedEmail = email.toLowerCase();
    
    // Step 1: Find the user
    console.log(`🔍 Searching for user: ${normalizedEmail}...`);
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      console.log('❌ User not found with email:', normalizedEmail);
      return;
    }

    const userId = String(user._id);
    console.log('\n✅ User Found:');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 User ID: ${userId}`);
    console.log(`👤 Name: ${user.firstName || ''} ${user.lastName || ''}`);
    console.log(`🏢 Company: ${user.companyName || 'N/A'}`);
    console.log(`📋 Role: ${user.role || 'standard'}`);
    console.log(`📅 Created: ${user.createdAt || 'N/A'}`);
    console.log(`📅 Last Login: ${user.lastLoginAt || 'Never'}`);

    // Step 2: Count related data
    console.log('\n📊 Related data to be deleted:');
    console.log('-'.repeat(60));

    const relatedCollections = [
      { name: COLLECTIONS.USER_SESSIONS, field: 'userId' },
      { name: COLLECTIONS.USER_PROFILES, field: 'userId' },
      { name: COLLECTIONS.USER_PERMISSIONS, field: 'userId' },
      { name: COLLECTIONS.USER_PUBLICATION_ACCESS, field: 'userId' },
      { name: COLLECTIONS.USER_INVITATIONS, field: 'invitedBy' },
      { name: COLLECTIONS.CONVERSATION_THREADS, field: 'userId' },
      { name: COLLECTIONS.ASSISTANT_CONVERSATIONS, field: 'userId' },
      { name: COLLECTIONS.BRAND_DOCUMENTS, field: 'userId' },
      { name: COLLECTIONS.SAVED_OUTLETS, field: 'userId' },
      { name: COLLECTIONS.SAVED_PACKAGES, field: 'userId' },
      { name: COLLECTIONS.USER_INTERACTIONS, field: 'userId' },
      { name: COLLECTIONS.LEAD_INQUIRIES, field: 'userId' },
    ];

    // Also check for invitations sent TO this email (not just by this user)
    const invitationsReceived = [
      { name: COLLECTIONS.USER_INVITATIONS, field: 'invitedEmail', value: normalizedEmail },
    ];

    const deletionSummary: Array<{ collection: string; count: number }> = [];

    for (const { name, field } of relatedCollections) {
      try {
        const collection = db.collection(name);
        const count = await collection.countDocuments({ [field]: userId });
        if (count > 0) {
          console.log(`   ${name}: ${count} document(s)`);
          deletionSummary.push({ collection: name, count });
        }
      } catch (err) {
        // Collection might not exist, skip
      }
    }

    // Check for invitations sent TO this email
    for (const { name, field, value } of invitationsReceived) {
      try {
        const collection = db.collection(name);
        const count = await collection.countDocuments({ [field]: value });
        if (count > 0) {
          console.log(`   ${name} (invitations received): ${count} document(s)`);
          deletionSummary.push({ collection: `${name} (invitedEmail)`, count });
        }
      } catch (err) {
        // Collection might not exist, skip
      }
    }

    if (deletionSummary.length === 0) {
      console.log('   No related data found in other collections.');
    }

    // Step 3: Confirm deletion
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  WARNING: This will permanently delete the user and all related data!');
    console.log('='.repeat(60));
    
    const confirmed = await promptConfirmation('\n🔴 Type "yes" to confirm deletion: ');

    if (!confirmed) {
      console.log('\n❌ Deletion cancelled.');
      return;
    }

    // Step 4: Delete related data first
    console.log('\n🗑️  Deleting user data...\n');

    let totalDeleted = 0;

    for (const { name, field } of relatedCollections) {
      try {
        const collection = db.collection(name);
        const result = await collection.deleteMany({ [field]: userId });
        if (result.deletedCount > 0) {
          console.log(`   ✓ ${name}: ${result.deletedCount} document(s) deleted`);
          totalDeleted += result.deletedCount;
        }
      } catch (err) {
        // Collection might not exist, skip
      }
    }

    // Delete invitations sent TO this email
    for (const { name, field, value } of invitationsReceived) {
      try {
        const collection = db.collection(name);
        const result = await collection.deleteMany({ [field]: value });
        if (result.deletedCount > 0) {
          console.log(`   ✓ ${name} (invitedEmail): ${result.deletedCount} document(s) deleted`);
          totalDeleted += result.deletedCount;
        }
      } catch (err) {
        // Collection might not exist, skip
      }
    }

    // Step 5: Delete the user
    const deleteResult = await usersCollection.deleteOne({ _id: user._id });
    
    if (deleteResult.deletedCount === 1) {
      console.log(`   ✓ users: 1 document deleted`);
      totalDeleted += 1;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully deleted user: ${normalizedEmail}`);
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeConnection();
    process.exit(0);
  }
}

if (!email) {
  console.error('❌ Usage: npx tsx scripts/deleteUserByEmail.ts <email> [--confirm]');
  process.exit(1);
}

deleteUserByEmail(email);
