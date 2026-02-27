/**
 * Cleanup Failed Suspension Attempt (staging only)
 *
 * The suspendPlacement method used MongoDB dot-notation $set with placement IDs
 * that contain dots (e.g. "distributionChannels.website[0].advertisingOpportunities[0]").
 * MongoDB interpreted the dots as nested field paths, creating garbage nested fields
 * inside placementStatuses and suspensionDetails instead of updating the correct keys.
 *
 * This script:
 *   1. Finds orders with malformed nested "distributionChannels" inside placementStatuses
 *   2. Removes those nested fields
 *   3. Removes the matching bogus statusHistory / placementStatusHistory entries
 *   4. Logs before/after for verification
 *
 * Run:  npx tsx scripts/cleanupFailedSuspension.ts
 * Dry:  npx tsx scripts/cleanupFailedSuspension.ts --dry-run
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'staging-chicago-hub';
const DRY_RUN = process.argv.includes('--dry-run');
const COLLECTION = 'publication_insertion_orders';

async function cleanup() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const actualDbName = db.databaseName;
    if (actualDbName !== 'staging-chicago-hub') {
      console.error(`Safety check failed: connected to "${actualDbName}", expected "staging-chicago-hub". Aborting.`);
      process.exit(1);
    }

    const collection = db.collection(COLLECTION);

    console.log('\n' + '='.repeat(80));
    console.log(`CLEANUP FAILED SUSPENSION ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
    console.log(`Database: ${actualDbName}`);
    console.log('='.repeat(80));

    // Find orders that have the malformed nested field
    const affected = await collection.find({
      'placementStatuses.distributionChannels': { $exists: true }
    }).toArray();

    console.log(`\nFound ${affected.length} order(s) with malformed placementStatuses.distributionChannels`);

    if (affected.length === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    for (const order of affected) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Order: ${order._id}`);
      console.log(`Campaign: ${order.campaignId} | Publication: ${order.publicationId} (${order.publicationName || 'unknown'})`);

      // Show current (malformed) placementStatuses
      console.log('\nBEFORE placementStatuses:');
      console.log(JSON.stringify(order.placementStatuses, null, 2));

      if (order.suspensionDetails) {
        console.log('\nBEFORE suspensionDetails:');
        console.log(JSON.stringify(order.suspensionDetails, null, 2));
      }

      // Identify bogus history entries (contain "suspended by admin" from the failed attempt)
      const statusHistoryBefore = (order.statusHistory || []).length;
      const placementHistoryBefore = (order.placementStatusHistory || []).length;

      const cleanedStatusHistory = (order.statusHistory || []).filter((entry: any) => {
        const notes: string = entry.notes || '';
        return !notes.includes('suspended by admin');
      });

      const cleanedPlacementHistory = (order.placementStatusHistory || []).filter((entry: any) => {
        return entry.status !== 'suspended';
      });

      const statusHistoryRemoved = statusHistoryBefore - cleanedStatusHistory.length;
      const placementHistoryRemoved = placementHistoryBefore - cleanedPlacementHistory.length;

      console.log(`\nWill remove ${statusHistoryRemoved} bogus statusHistory entries`);
      console.log(`Will remove ${placementHistoryRemoved} bogus placementStatusHistory entries`);

      if (DRY_RUN) {
        console.log('[DRY RUN] Skipping update');
        continue;
      }

      // Build the clean placementStatuses by removing the nested "distributionChannels" key
      const cleanedStatuses = { ...order.placementStatuses };
      delete cleanedStatuses.distributionChannels;

      // Clean suspensionDetails similarly
      const cleanedSuspensionDetails = { ...(order.suspensionDetails || {}) };
      delete cleanedSuspensionDetails.distributionChannels;

      const updateDoc: any = {
        $set: {
          placementStatuses: cleanedStatuses,
          statusHistory: cleanedStatusHistory,
          placementStatusHistory: cleanedPlacementHistory,
        }
      };

      if (Object.keys(cleanedSuspensionDetails).length === 0) {
        updateDoc.$unset = { suspensionDetails: '' };
      } else {
        updateDoc.$set.suspensionDetails = cleanedSuspensionDetails;
      }

      const result = await collection.updateOne({ _id: order._id }, updateDoc);

      console.log(`\nUpdated: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);

      // Verify
      const after = await collection.findOne({ _id: order._id });
      console.log('\nAFTER placementStatuses:');
      console.log(JSON.stringify(after?.placementStatuses, null, 2));
      console.log('AFTER suspensionDetails:');
      console.log(JSON.stringify(after?.suspensionDetails ?? '(removed)', null, 2));
    }

    console.log('\n' + '='.repeat(80));
    console.log('Cleanup complete.');
    console.log('='.repeat(80));
  } finally {
    await client.close();
  }
}

cleanup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
