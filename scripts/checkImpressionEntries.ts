/**
 * Check for Impression Entries
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
const TEST_ORDER = '6960195199937f3b71a2338d';

async function checkImpressions() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(STAGING_DB);
    
    const jan13 = new Date('2026-01-13');
    
    // Find all entries for our test order
    const entries = await db.collection('performance_entries').find({
      orderId: TEST_ORDER,
      dateStart: jan13
    }).toArray();
    
    console.log(`\n📊 Performance Entries for Order ${TEST_ORDER}:\n`);
    console.log(`   Found ${entries.length} entries\n`);
    
    entries.forEach((entry: any, idx) => {
      console.log(`${idx + 1}. Item: ${entry.itemName}`);
      console.log(`   Path: ${entry.itemPath}`);
      console.log(`   Channel: ${entry.channel}`);
      console.log(`   Impressions: ${entry.metrics.impressions}`);
      console.log(`   Clicks: ${entry.metrics.clicks}`);
      console.log(`   CTR: ${entry.metrics.ctr.toFixed(2)}%`);
      console.log(`   Reach: ${entry.metrics.reach}`);
      console.log('');
    });
    
    // Check for any entries with impressions > 0
    const withImpressions = await db.collection('performance_entries').find({
      dateStart: jan13,
      'metrics.impressions': { $gt: 0 }
    }).toArray();
    
    console.log(`📊 Entries with impressions > 0: ${withImpressions.length}\n`);
    
    if (withImpressions.length > 0) {
      withImpressions.forEach((entry: any) => {
        console.log(`   Order: ${entry.orderId} | Imp: ${entry.metrics.impressions} | Clicks: ${entry.metrics.clicks}`);
      });
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkImpressions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
