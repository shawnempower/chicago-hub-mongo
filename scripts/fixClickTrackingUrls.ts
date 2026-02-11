/**
 * Fix Click Tracking URLs in Existing Tracking Scripts
 * 
 * Problem: Tracking scripts generated before the /c endpoint fix have click URLs 
 * pointing to /pxl.png (the static pixel image) instead of /c (the Lambda@Edge redirect).
 * This means clicking the ad shows a 1x1 pixel instead of redirecting to the landing page.
 * 
 * What this script does:
 * 1. Finds all tracking_scripts where urls.clickTracker contains "/pxl.png" 
 * 2. Updates urls.clickTracker: replaces /pxl.png path with /c
 * 3. Updates tags.fullTag and tags.simplifiedTag HTML to use the corrected URL
 * 4. Logs all changes for audit
 * 
 * Usage: npx tsx scripts/fixClickTrackingUrls.ts [--dry-run]
 *   --dry-run   Preview changes without writing to database
 */

import 'dotenv/config';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Target database - defaults to chicago-hub (production), override with --db=<name>
const dbArg = args.find(a => a.startsWith('--db='));
const TARGET_DB = dbArg ? dbArg.split('=')[1] : 'chicago-hub';

function fixClickUrl(url: string): string {
  // Replace the /pxl.png path with /c in click tracking URLs
  // e.g., https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=...&t=click&r=...
  //     → https://dxafls8akrlrp.cloudfront.net/c?oid=...&t=click&r=...
  return url.replace(/\/pxl\.png\?/, '/c?');
}

function fixHtmlTag(tag: string, oldClickUrl: string, newClickUrl: string): string {
  if (!tag) return tag;
  // Replace all occurrences of the old click URL in the HTML tag
  // The URL appears in href attributes like: <a href="https://...cloudfront.net/pxl.png?...&t=click&r=...">
  return tag.split(oldClickUrl).join(newClickUrl);
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Fix Click Tracking URLs in Tracking Scripts');
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

    // Find all tracking scripts where the click URL incorrectly uses /pxl.png
    const brokenScripts = await collection.find({
      'urls.clickTracker': { $regex: /\/pxl\.png\?/ },
      deletedAt: { $exists: false }
    }).toArray();

    console.log(`Found ${brokenScripts.length} tracking scripts with incorrect click URLs.\n`);

    if (brokenScripts.length === 0) {
      console.log('Nothing to fix. All click URLs already use /c endpoint.');
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const script of brokenScripts) {
      const id = script._id;
      const oldClickUrl = script.urls?.clickTracker || '';
      const newClickUrl = fixClickUrl(oldClickUrl);

      // Verify the fix actually changed something
      if (oldClickUrl === newClickUrl) {
        console.log(`  [SKIP] ${id} - URL unchanged after fix attempt`);
        continue;
      }

      // Fix the HTML tags too
      const oldFullTag = script.tags?.fullTag || '';
      const oldSimplifiedTag = script.tags?.simplifiedTag || '';
      const newFullTag = fixHtmlTag(oldFullTag, oldClickUrl, newClickUrl);
      const newSimplifiedTag = oldSimplifiedTag ? fixHtmlTag(oldSimplifiedTag, oldClickUrl, newClickUrl) : oldSimplifiedTag;

      // Log the change
      const campaignId = script.campaignId || 'unknown';
      const pubId = script.publicationId || 'unknown';
      const creativeId = script.creativeId || 'unknown';
      console.log(`  [FIX] Campaign: ${campaignId} | Pub: ${pubId} | Creative: ${creativeId}`);
      console.log(`         Old: ...${oldClickUrl.substring(oldClickUrl.indexOf('/pxl.png'), oldClickUrl.indexOf('/pxl.png') + 20)}...`);
      console.log(`         New: ...${newClickUrl.substring(newClickUrl.indexOf('/c?'), newClickUrl.indexOf('/c?') + 15)}...`);

      if (!isDryRun) {
        try {
          const updateFields: any = {
            'urls.clickTracker': newClickUrl,
            'tags.fullTag': newFullTag,
          };
          if (oldSimplifiedTag) {
            updateFields['tags.simplifiedTag'] = newSimplifiedTag;
          }

          await collection.updateOne(
            { _id: id },
            { 
              $set: {
                ...updateFields,
                'urls._clickTrackerFixedAt': new Date(),
                'urls._clickTrackerOldUrl': oldClickUrl,
              }
            }
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
    console.log(`  Results: ${updatedCount} scripts ${isDryRun ? 'would be' : ''} fixed, ${errorCount} errors`);
    if (isDryRun) {
      console.log('  Run without --dry-run to apply changes.');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
