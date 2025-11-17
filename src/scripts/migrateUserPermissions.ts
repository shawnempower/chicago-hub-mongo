/**
 * User Permissions Migration Script
 * 
 * Migrates existing users to the new permission system:
 * - Sets up UserPermissions records for all existing users
 * - Converts isAdmin flag to role-based permissions
 * - Grants all publications access temporarily for backward compatibility
 * 
 * Run this script BEFORE enabling ENABLE_PERMISSION_FILTERING=true
 * 
 * Usage: npx tsx src/scripts/migrateUserPermissions.ts
 */

import { getDatabase, connectToDatabase, closeDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS, UserPermissions, AccessScope } from '../integrations/mongodb/schemas';
import { createLogger } from '../utils/logger';

const logger = createLogger('MigrationScript');

async function migrateUserPermissions() {
  try {
    logger.info('🚀 Starting user permissions migration...');
    
    await connectToDatabase();
    const db = getDatabase();
    
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const profilesCollection = db.collection(COLLECTIONS.USER_PROFILES);
    const permissionsCollection = db.collection(COLLECTIONS.USER_PERMISSIONS);
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    logger.info(`Found ${users.length} users to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let adminCount = 0;
    
    for (const user of users) {
      const userId = user._id?.toString();
      if (!userId) continue;
      
      // Check if permissions already exist
      const existingPermissions = await permissionsCollection.findOne({ userId });
      if (existingPermissions) {
        logger.debug(`Skipping user ${user.email} - permissions already exist`);
        skippedCount++;
        continue;
      }
      
      // Check if user is admin (check both User and UserProfile)
      const profile = await profilesCollection.findOne({ userId });
      const isAdmin = user.role === 'admin' || profile?.isAdmin === true;
      
      if (isAdmin) {
        // Admin users get admin role with full access
        const adminPermissions: UserPermissions = {
          userId,
          role: 'admin',
          accessScope: 'all',
          canInviteUsers: true,
          canManageGroups: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'migration_script'
        };
        
        await permissionsCollection.insertOne(adminPermissions);
        
        // Also update User.role if not set
        if (!user.role) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { role: 'admin' } }
          );
        }
        
        logger.info(`✅ Migrated admin user: ${user.email}`);
        adminCount++;
      } else {
        // Regular users get 'all' access temporarily for backward compatibility
        // This maintains current behavior where all users can see everything
        // Later, admin can assign specific permissions
        const standardPermissions: UserPermissions = {
          userId,
          role: 'standard',
          accessScope: 'all', // Temporary: gives access to everything
          canInviteUsers: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'migration_script'
        };
        
        await permissionsCollection.insertOne(standardPermissions);
        
        // Update User.role if not set
        if (!user.role) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { role: 'standard' } }
          );
        }
        
        logger.debug(`✅ Migrated standard user: ${user.email}`);
      }
      
      migratedCount++;
    }
    
    logger.info('\n📊 Migration Summary:');
    logger.info(`✅ Successfully migrated: ${migratedCount} users`);
    logger.info(`👑 Admin users: ${adminCount}`);
    logger.info(`⏭️  Skipped (already migrated): ${skippedCount}`);
    logger.info(`📝 Standard users: ${migratedCount - adminCount}`);
    
    logger.info('\n⚠️  IMPORTANT NEXT STEPS:');
    logger.info('1. Standard users currently have accessScope="all" for backward compatibility');
    logger.info('2. Use the admin panel to assign specific hub/publication access to users');
    logger.info('3. Once permissions are assigned, their accessScope will update automatically');
    logger.info('4. Enable ENABLE_PERMISSION_FILTERING=true in .env when ready');
    
    logger.info('\n✅ Migration completed successfully!');
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run migration
migrateUserPermissions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

