/**
 * Backfill delivery goals on existing orders.
 *
 * Shows before/after diffs so you can review changes before applying.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/backfillDeliveryGoals.ts          # preview only (default)
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

import { computeDeliveryGoals, type DeliveryGoal } from '../src/utils/deliveryGoals.js';

const DRY_RUN = process.env.DRY_RUN !== '0';
const DB_NAME = process.env.DB_NAME || process.env.MONGODB_DB_NAME || 'chicago-hub';

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function goalSummary(g: DeliveryGoal): string {
  return `${fmtNum(g.goalValue)} ${g.goalType}`;
}

async function backfill() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`\nBackfill Delivery Goals`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will update orders)'}\n`);

  const campaigns = await db.collection('campaigns').find({
    deletedAt: { $exists: false }
  }).toArray();
  const campaignMap = new Map(campaigns.map(c => [c.campaignId, c]));

  const orders = await db.collection('publication_insertion_orders').find({
    deletedAt: { $exists: false }
  }).toArray();

  console.log(`Found ${orders.length} orders across ${campaigns.length} campaigns\n`);

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;
  let errors = 0;
  let totalChangedGoals = 0;

  for (const order of orders) {
    const orderId = order._id.toString();
    const pubName = order.publicationName || `pub-${order.publicationId}`;

    const campaign = campaignMap.get(order.campaignId);
    const startDate = campaign?.timeline?.startDate;
    const endDate = campaign?.timeline?.endDate;

    const items = order.selectedInventory?.publications?.[0]?.inventoryItems || [];
    if (items.length === 0) {
      skipped++;
      continue;
    }

    const newGoals = computeDeliveryGoals(items, startDate, endDate);
    const newGoalCount = Object.keys(newGoals).length;
    if (newGoalCount === 0) {
      skipped++;
      continue;
    }

    const oldGoals: Record<string, DeliveryGoal> = order.deliveryGoals || {};

    // Build diffs
    const diffs: Array<{
      itemPath: string;
      itemName: string;
      oldGoal: DeliveryGoal | null;
      newGoal: DeliveryGoal;
      changed: boolean;
    }> = [];

    for (const [itemPath, newGoal] of Object.entries(newGoals)) {
      const oldGoal = oldGoals[itemPath] || null;
      const changed = !oldGoal || oldGoal.goalValue !== newGoal.goalValue || oldGoal.goalType !== newGoal.goalType;
      const item = items.find((i: any) => (i.itemPath || i.sourcePath) === itemPath);
      diffs.push({
        itemPath,
        itemName: item?.itemName || itemPath,
        oldGoal,
        newGoal,
        changed,
      });
    }

    const changedDiffs = diffs.filter(d => d.changed);
    if (changedDiffs.length === 0) {
      unchanged++;
      continue;
    }

    totalChangedGoals += changedDiffs.length;

    // Print order header
    const campaignName = campaign?.basicInfo?.name || order.campaignId;
    console.log('='.repeat(80));
    console.log(`${pubName} | Campaign: ${campaignName} | Status: ${order.status}`);
    console.log('-'.repeat(80));

    for (const diff of diffs) {
      const marker = diff.changed ? '  >>>' : '     ';
      const shortName = diff.itemName.substring(0, 45).padEnd(47);
      const pricingModel = items.find((i: any) => (i.itemPath || i.sourcePath) === diff.itemPath)?.itemPricing?.pricingModel || '?';
      const freq = items.find((i: any) => (i.itemPath || i.sourcePath) === diff.itemPath)?.currentFrequency || '?';

      if (diff.changed) {
        const oldStr = diff.oldGoal ? goalSummary(diff.oldGoal) : '(none)';
        const newStr = goalSummary(diff.newGoal);
        console.log(`${marker} ${shortName} [${pricingModel}, freq=${freq}]`);
        console.log(`        OLD: ${oldStr.padStart(25)}`);
        console.log(`        NEW: ${newStr.padStart(25)}  (${diff.newGoal.description})`);
      } else {
        console.log(`      ${shortName} ${goalSummary(diff.newGoal).padStart(25)}  (unchanged)`);
      }
    }
    console.log();

    if (!DRY_RUN) {
      try {
        await db.collection('publication_insertion_orders').updateOne(
          { _id: order._id },
          { $set: { deliveryGoals: newGoals, updatedAt: new Date() } }
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

  console.log('='.repeat(80));
  console.log(`\nSUMMARY (${DB_NAME})`);
  console.log(`  Orders processed:   ${orders.length}`);
  console.log(`  Orders with changes: ${updated}`);
  console.log(`  Orders unchanged:    ${unchanged}`);
  console.log(`  Orders skipped:      ${skipped} (no inventory)`);
  console.log(`  Total goals changed: ${totalChangedGoals}`);
  console.log(`  Errors:              ${errors}`);
  if (DRY_RUN) {
    console.log(`\n  *** DRY RUN -- no changes written ***`);
    console.log(`  To apply: DRY_RUN=0 npx tsx scripts/backfillDeliveryGoals.ts`);
  }
  console.log();

  await client.close();
}

backfill().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
