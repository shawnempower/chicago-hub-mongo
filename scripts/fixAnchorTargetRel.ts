/**
 * Fix Anchor Tags in Existing Tracking Scripts
 * 
 * Problem: Tracking scripts generated before this fix are missing
 * target="_blank" and/or rel="noopener noreferrer" on click-through <a> tags.
 * 
 * What this script does:
 * 1. Finds all tracking_scripts with <a href="..."> tags missing the attributes
 * 2. Adds target="_blank" rel="noopener noreferrer" to click-through anchors
 * 3. Updates tags.fullTag and tags.simplifiedTag HTML
 * 4. Logs all changes for audit
 * 
 * Usage: npx tsx scripts/fixAnchorTargetRel.ts --dry-run --db=staging-chicago-hub
 *   --dry-run                     Preview changes without writing to database
 *   --db=staging-chicago-hub      Target database (defaults to chicago-hub)
 */

import 'dotenv/config';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const dbArg = args.find(a => a.startsWith('--db='));
const TARGET_DB = dbArg ? dbArg.split('=')[1] : 'chicago-hub';

/**
 * Fix an anchor tag string by ensuring it has target="_blank" rel="noopener noreferrer".
 * Handles three cases:
 *   1. Has neither attribute
 *   2. Has target="_blank" but no rel
 *   3. Already correct (no change)
 */
function fixAnchorTags(html: string): string {
  if (!html) return html;

  // Match <a tags that have an href containing a click tracker URL (/c? endpoint)
  // and may or may not have target/rel attributes already
  return html.replace(
    /<a\s+(href="[^"]*")((?:\s+(?:target|rel|style|class)="[^"]*")*)\s*>/g,
    (match, hrefAttr, restAttrs) => {
      const hasTarget = /target="_blank"/.test(restAttrs);
      const hasRel = /rel="noopener noreferrer"/.test(restAttrs);

      if (hasTarget && hasRel) return match;

      let attrs = restAttrs || '';

      if (!hasTarget) {
        attrs = ` target="_blank"${attrs}`;
      }

      if (!hasRel) {
        // Insert rel right after target="_blank"
        attrs = attrs.replace(
          /target="_blank"/,
          'target="_blank" rel="noopener noreferrer"'
        );
      }

      return `<a ${hrefAttr}${attrs}>`;
    }
  );
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Fix Anchor target/rel in Tracking Scripts');
  console.log('═══════════════════════════════════════════════════════════');
  if (isDryRun) {
    console.log('  MODE: DRY RUN (no changes will be written)');
  } else {
    console.log('  MODE: LIVE (changes will be written to database)');
  }
  console.log(`  DATABASE: ${TARGET_DB}`);
  console.log('');

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
    });
    await client.connect();
    const db = client.db(TARGET_DB);
    console.log(`Connected to database: ${TARGET_DB}\n`);

    const collection = db.collection(COLLECTIONS.TRACKING_SCRIPTS);

    // Find scripts that have anchor tags missing rel="noopener noreferrer"
    // This catches both cases: missing target+rel, and has target but missing rel
    const scripts = await collection.find({
      deletedAt: { $exists: false },
      $or: [
        { 'tags.fullTag': { $regex: /<a\s+href="[^"]*"(?:(?!rel="noopener noreferrer")[^>])*>/ } },
        { 'tags.simplifiedTag': { $regex: /<a\s+href="[^"]*"(?:(?!rel="noopener noreferrer")[^>])*>/ } },
      ]
    }).toArray();

    console.log(`Found ${scripts.length} tracking scripts with anchors missing target/rel.\n`);

    if (scripts.length === 0) {
      console.log('Nothing to fix. All anchor tags already have target="_blank" rel="noopener noreferrer".');
      await client.close();
      process.exit(0);
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const script of scripts) {
      const id = script._id;
      const oldFullTag = script.tags?.fullTag || '';
      const oldSimplifiedTag = script.tags?.simplifiedTag || '';

      const newFullTag = fixAnchorTags(oldFullTag);
      const newSimplifiedTag = oldSimplifiedTag ? fixAnchorTags(oldSimplifiedTag) : oldSimplifiedTag;

      const fullTagChanged = newFullTag !== oldFullTag;
      const simplifiedTagChanged = newSimplifiedTag !== oldSimplifiedTag;

      if (!fullTagChanged && !simplifiedTagChanged) {
        skippedCount++;
        continue;
      }

      const campaignId = script.campaignId || 'unknown';
      const pubId = script.publicationId || 'unknown';
      const channel = script.channel || 'unknown';
      console.log(`  [FIX] Campaign: ${campaignId} | Pub: ${pubId} | Channel: ${channel}`);
      if (fullTagChanged) console.log(`         fullTag: updated`);
      if (simplifiedTagChanged) console.log(`         simplifiedTag: updated`);

      if (!isDryRun) {
        try {
          const updateFields: Record<string, any> = {};
          if (fullTagChanged) updateFields['tags.fullTag'] = newFullTag;
          if (simplifiedTagChanged) updateFields['tags.simplifiedTag'] = newSimplifiedTag;
          updateFields['tags._anchorFixedAt'] = new Date();

          await collection.updateOne(
            { _id: id },
            { $set: updateFields }
          );
          updatedCount++;
        } catch (err) {
          console.error(`  [ERROR] Failed to update ${id}:`, err);
          errorCount++;
        }
      } else {
        updatedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Results: ${updatedCount} scripts ${isDryRun ? 'would be' : ''} fixed, ${skippedCount} skipped, ${errorCount} errors`);
    if (isDryRun) {
      console.log('  Run without --dry-run to apply changes.');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    await client.close();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
