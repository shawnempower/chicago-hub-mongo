/**
 * Backfill delivery goals on existing orders.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/backfillDeliveryGoals.ts          # preview only
 *   npx tsx scripts/backfillDeliveryGoals.ts                     # write to db
 *   DB_NAME=chicago-hub npx tsx scripts/backfillDeliveryGoals.ts  # target specific db
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the shared utility (relative path for tsx)
import { computeDeliveryGoals, type DeliveryGoal } from '../src/utils/deliveryGoals.js';

const DRY_RUN = process.env.DRY_RUN === '1';
const DB_NAME = process.env.DB_NAME || process.env.MONGODB_DB_NAME || 'staging-chicago-hub';

async function backfill() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`\nBackfill Delivery Goals`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will update orders)'}\n`);

  // Load campaigns for date lookup
  const campaigns = await db.collection('campaigns').find({
    deletedAt: { $exists: false }
  }).toArray();
  const campaignMap = new Map(campaigns.map(c => [c.campaignId, c]));

  // Load all non-draft orders
  const orders = await db.collection('publication_insertion_orders').find({
    deletedAt: { $exists: false }
  }).toArray();

  console.log(`Found ${orders.length} orders across ${campaigns.length} campaigns\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const order of orders) {
    const orderId = order._id.toString();
    const pubName = order.publicationName || `pub-${order.publicationId}`;

    // Get campaign dates
    const campaign = campaignMap.get(order.campaignId);
    const startDate = campaign?.timeline?.startDate;
    const endDate = campaign?.timeline?.endDate;

    // Get inventory items
    const items = order.selectedInventory?.publications?.[0]?.inventoryItems || [];
    if (items.length === 0) {
      skipped++;
      continue;
    }

    // Compute goals
    const goals = computeDeliveryGoals(items, startDate, endDate);
    const goalCount = Object.keys(goals).length;

    if (goalCount === 0) {
      skipped++;
      continue;
    }

    // Check if already populated
    const existingGoals = order.deliveryGoals || {};
    const existingCount = Object.keys(existingGoals).length;

    // Log details
    console.log(`${pubName.substring(0, 35).padEnd(37)} ${goalCount} goals computed${existingCount > 0 ? ` (replacing ${existingCount} existing)` : ''}`);
    for (const [itemPath, goal] of Object.entries(goals)) {
      const shortPath = itemPath.length > 50 ? '...' + itemPath.slice(-47) : itemPath;
      console.log(`  ${shortPath.padEnd(52)} ${goal.goalType.padEnd(12)} ${goal.goalValue.toLocaleString().padStart(12)}  ${goal.description}`);
    }

    if (!DRY_RUN) {
      try {
        await db.collection('publication_insertion_orders').updateOne(
          { _id: order._id },
          { $set: { deliveryGoals: goals, updatedAt: new Date() } }
        );
        updated++;
      } catch (err) {
        console.error(`  ERROR updating order ${orderId}: ${err}`);
        errors++;
      }
    } else {
      updated++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY (${DB_NAME})`);
  console.log(`  Orders processed: ${orders.length}`);
  console.log(`  Goals computed:   ${updated}`);
  console.log(`  Skipped (empty):  ${skipped}`);
  console.log(`  Errors:           ${errors}`);
  if (DRY_RUN) {
    console.log(`\n  *** DRY RUN -- no changes written ***`);
    console.log(`  Run without DRY_RUN=1 to apply.`);
  }
  console.log();

  await client.close();
}

backfill().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
