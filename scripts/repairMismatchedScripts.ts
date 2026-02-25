/**
 * Repair mismatched tracking scripts on production.
 *
 * Finds active scripts where the creative.width/height (and tracking s= param)
 * don't match the expected dimensions from the creative asset's specGroupId.
 * In DRY RUN mode (default), only logs what would change. Pass --execute to apply.
 *
 * The repair soft-deletes the broken scripts, then calls generateScriptsForOrder
 * (with the fixed dimension logic) to regenerate correct replacements.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'chicago-hub';
const DRY_RUN = !process.argv.includes('--execute');

async function repair() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE (pass --execute to apply changes) ===\n');
  } else {
    console.log('=== EXECUTING REPAIRS ===\n');
  }

  const client = new MongoClient(MONGODB_URI!);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const scriptsCollection = db.collection('tracking_scripts');
    const assetsCollection = db.collection('creative_assets');

    // Get all active scripts
    const activeScripts = await scriptsCollection.find({
      deletedAt: { $exists: false }
    }).toArray();

    // Build asset lookup
    const allAssets = await assetsCollection.find({
      deletedAt: { $exists: false }
    }).toArray();
    const assetMap = new Map<string, any>();
    for (const a of allAssets) {
      const id = a.assetId || a._id?.toString();
      if (id) assetMap.set(id, a);
    }

    // Find mismatched scripts and group by campaign+publication for regeneration
    const toDelete: string[] = [];
    const regenPairs = new Set<string>(); // "campaignId|publicationId"

    for (const script of activeScripts) {
      const asset = assetMap.get(script.creativeId);
      if (!asset) continue;

      const specGroupId = asset.associations?.specGroupId || '';
      const specDimMatch = specGroupId.match(/dim:(\d+)\s*x\s*(\d+)/i);
      if (!specDimMatch) continue;

      const expectedW = parseInt(specDimMatch[1]);
      const expectedH = parseInt(specDimMatch[2]);
      const scriptW = script.creative?.width;
      const scriptH = script.creative?.height;

      if (!scriptW || !scriptH) continue;
      if (scriptW === expectedW && scriptH === expectedH) continue;

      // Mismatch found
      toDelete.push(script._id.toString());
      regenPairs.add(`${script.campaignId}|${script.publicationId}`);

      console.log(`MISMATCH: ${script.placementName || script.itemPath} | pub ${script.publicationId} (${script.publicationName})`);
      console.log(`  script dims: ${scriptW}x${scriptH} -> expected: ${expectedW}x${expectedH}`);
      console.log(`  scriptId: ${script._id} | campaign: ${script.campaignId}`);
    }

    console.log(`\n--- Summary ---`);
    console.log(`Scripts to soft-delete: ${toDelete.length}`);
    console.log(`Campaign+pub pairs to regenerate: ${regenPairs.size}`);

    for (const pair of regenPairs) {
      const [cid, pid] = pair.split('|');
      console.log(`  ${cid} / pub ${pid}`);
    }

    if (DRY_RUN) {
      console.log('\nDRY RUN complete. No changes made. Run with --execute to apply.');
      return;
    }

    // Step 1: Soft-delete mismatched scripts
    console.log(`\nSoft-deleting ${toDelete.length} mismatched scripts...`);
    const { ObjectId } = await import('mongodb');
    const deleteIds = toDelete.map(id => {
      try { return new ObjectId(id); } catch { return id; }
    });
    const deleteResult = await scriptsCollection.updateMany(
      { _id: { $in: deleteIds as any[] } },
      { $set: { deletedAt: new Date(), _repairDeletedAt: new Date(), _repairReason: 'dimension_mismatch' } }
    );
    console.log(`Soft-deleted: ${deleteResult.modifiedCount}`);

    // Step 2: Regenerate using the fixed code
    console.log(`\nRegenerating scripts for ${regenPairs.size} campaign+pub pairs...`);
    const { generateScriptsForOrder } = await import('../src/services/trackingScriptService');

    for (const pair of regenPairs) {
      const [campaignId, publicationId] = pair.split('|');
      console.log(`  Regenerating: ${campaignId} / pub ${publicationId}`);
      const result = await generateScriptsForOrder(campaignId, parseInt(publicationId));
      console.log(`    -> generated: ${result.scriptsGenerated}, success: ${result.success}${result.error ? `, error: ${result.error}` : ''}`);
    }

    console.log('\nRepair complete.');

  } finally {
    await client.close();
  }
}

repair().catch(console.error);
