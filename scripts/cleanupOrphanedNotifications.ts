/**
 * Cleanup Orphaned Notifications
 * 
 * Finds and removes notifications that reference campaigns which no longer exist.
 * This can happen when campaigns are manually deleted without cleaning up related records.
 * 
 * Usage:
 *   npx tsx scripts/cleanupOrphanedNotifications.ts
 *   npx tsx scripts/cleanupOrphanedNotifications.ts --execute
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface OrphanedNotification {
  _id: string;
  campaignId: string;
  type?: string;
  title?: string;
  createdAt?: Date;
}

async function cleanupOrphanedNotifications(execute: boolean) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  console.log('\n🧹 CLEANUP ORPHANED NOTIFICATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'chicago-hub';
    console.log(`📂 Database: ${dbName}\n`);
    
    const db = client.db(dbName);
    const notificationsCol = db.collection('notifications');
    const campaignsCol = db.collection('campaigns');

    // Find all notifications that have a campaignId
    const notificationsWithCampaign = await notificationsCol.find({
      campaignId: { $exists: true, $ne: null }
    }).toArray();

    console.log(`📊 Found ${notificationsWithCampaign.length} notifications with campaign references\n`);

    if (notificationsWithCampaign.length === 0) {
      console.log('✅ No notifications with campaign references found. Nothing to clean up.\n');
      return;
    }

    // Get unique campaign IDs from notifications
    const campaignIds = [...new Set(notificationsWithCampaign.map(n => n.campaignId))];
    console.log(`🔍 Checking ${campaignIds.length} unique campaign IDs...\n`);

    // Find which campaigns still exist
    const existingCampaigns = new Set<string>();
    
    for (const campaignId of campaignIds) {
      let found = false;
      
      // Try as ObjectId
      try {
        const objectId = new ObjectId(campaignId);
        const campaign = await campaignsCol.findOne({ _id: objectId });
        if (campaign) {
          found = true;
          existingCampaigns.add(campaignId);
        }
      } catch {
        // Not a valid ObjectId
      }
      
      // Try as campaignId string field
      if (!found) {
        const campaign = await campaignsCol.findOne({ campaignId: campaignId });
        if (campaign) {
          found = true;
          existingCampaigns.add(campaignId);
        }
      }
    }

    // Find orphaned notifications
    const orphanedNotifications: OrphanedNotification[] = notificationsWithCampaign
      .filter(n => !existingCampaigns.has(n.campaignId))
      .map(n => ({
        _id: n._id.toString(),
        campaignId: n.campaignId,
        type: n.type,
        title: n.title,
        createdAt: n.createdAt,
      }));

    console.log('📋 RESULTS');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`   Campaigns still exist: ${existingCampaigns.size}`);
    console.log(`   Orphaned campaign references: ${campaignIds.length - existingCampaigns.size}`);
    console.log(`   Orphaned notifications: ${orphanedNotifications.length}`);
    console.log();

    if (orphanedNotifications.length === 0) {
      console.log('✅ No orphaned notifications found. All notifications reference valid campaigns.\n');
      return;
    }

    // Group orphaned notifications by campaign ID
    const byOrphanedCampaign = new Map<string, OrphanedNotification[]>();
    orphanedNotifications.forEach(n => {
      const list = byOrphanedCampaign.get(n.campaignId) || [];
      list.push(n);
      byOrphanedCampaign.set(n.campaignId, list);
    });

    console.log('📝 ORPHANED NOTIFICATIONS BY MISSING CAMPAIGN');
    console.log('───────────────────────────────────────────────────────────────');
    
    let shown = 0;
    for (const [campaignId, notifications] of byOrphanedCampaign) {
      if (shown >= 10) {
        console.log(`   ... and ${byOrphanedCampaign.size - 10} more missing campaigns`);
        break;
      }
      console.log(`   Campaign: ${campaignId}`);
      console.log(`      └─ ${notifications.length} notification(s)`);
      // Show first notification type as sample
      const types = [...new Set(notifications.map(n => n.type || 'unknown'))];
      console.log(`         Types: ${types.join(', ')}`);
      shown++;
    }
    console.log();

    if (!execute) {
      console.log('⚠️  DRY RUN MODE - No changes made!\n');
      console.log(`To permanently delete ${orphanedNotifications.length} orphaned notifications, run:\n`);
      console.log('   npx tsx scripts/cleanupOrphanedNotifications.ts --execute\n');
    } else {
      console.log('🚨 EXECUTING CLEANUP...\n');

      const orphanedIds = orphanedNotifications.map(n => new ObjectId(n._id));
      const result = await notificationsCol.deleteMany({
        _id: { $in: orphanedIds }
      });

      console.log('───────────────────────────────────────────────────────────────');
      console.log(`✅ CLEANUP COMPLETE: ${result.deletedCount} orphaned notifications removed\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const executeFlag = args.includes('--execute');

cleanupOrphanedNotifications(executeFlag).then(() => process.exit(0));

