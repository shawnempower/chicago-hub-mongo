/**
 * Check Recent Database Changes
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const STAGING_DB = 'staging-chicago-hub';

async function checkChanges() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(STAGING_DB);
    
    console.log('\n📊 DATABASE STATUS:\n');
    
    const totalEntries = await db.collection('performance_entries').countDocuments({});
    console.log(`Total entries: ${totalEntries}`);
    
    // Check for entries updated in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentUpdates = await db.collection('performance_entries').find({
      updatedAt: { $gte: fiveMinutesAgo }
    }).toArray();
    
    console.log(`\nEntries updated in last 5 minutes: ${recentUpdates.length}\n`);
    
    if (recentUpdates.length > 0) {
      console.log('✅ RECENT UPDATES FOUND:\n');
      recentUpdates.forEach((entry: any) => {
        console.log(`- Order: ${entry.orderId}`);
        console.log(`  Item: ${entry.itemName}`);
        console.log(`  Impressions: ${entry.metrics.impressions}`);
        console.log(`  Clicks: ${entry.metrics.clicks}`);
        console.log(`  Updated: ${entry.updatedAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No recent updates in last 5 minutes\n');
      console.log('The Lambda may not have run yet, or processed different dates.\n');
    }
    
    // Check for entries with itemName in filter (new structure)
    const jan13 = new Date('2026-01-13');
    const jan13Entries = await db.collection('performance_entries').find({
      dateStart: jan13
    }).toArray();
    
    console.log(`\n📅 Jan 13 entries: ${jan13Entries.length}\n`);
    
    // Group by orderId to see if there are duplicates (which would indicate the fix worked)
    const byOrder = new Map();
    jan13Entries.forEach((entry: any) => {
      const key = entry.orderId;
      if (!byOrder.has(key)) {
        byOrder.set(key, []);
      }
      byOrder.get(key).push(entry);
    });
    
    console.log('📊 Entries per order:\n');
    byOrder.forEach((entries, orderId) => {
      console.log(`Order ${orderId}: ${entries.length} document(s)`);
      entries.forEach((e: any) => {
        console.log(`  - ${e.itemName}: Imp ${e.metrics.impressions}, Clicks ${e.metrics.clicks}`);
      });
    });
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkChanges()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
