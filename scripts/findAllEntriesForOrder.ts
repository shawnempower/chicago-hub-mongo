/**
 * Find All Performance Entries for Test Order
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

async function findAllEntries() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(STAGING_DB);
    
    // Find ALL entries for this order (not just Jan 13)
    const entries = await db.collection('performance_entries').find({
      orderId: TEST_ORDER
    }).toArray();
    
    console.log(`\n📊 Found ${entries.length} total performance_entries for order ${TEST_ORDER}:\n`);
    
    entries.forEach((entry: any, idx) => {
      console.log(`${idx + 1}. ${entry._id}`);
      console.log(`   Date: ${entry.dateStart.toISOString().split('T')[0]}`);
      console.log(`   Item: ${entry.itemName}`);
      console.log(`   Path: ${entry.itemPath}`);
      console.log(`   Source: ${entry.source}`);
      console.log(`   Impressions: ${entry.metrics.impressions}`);
      console.log(`   Clicks: ${entry.metrics.clicks}`);
      console.log(`   Updated: ${entry.updatedAt.toISOString()}`);
      console.log('');
    });
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Documents: ${entries.length}`);
    console.log(`   Total Impressions: ${entries.reduce((sum: number, e: any) => sum + e.metrics.impressions, 0)}`);
    console.log(`   Total Clicks: ${entries.reduce((sum: number, e: any) => sum + e.metrics.clicks, 0)}`);
    console.log('');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

findAllEntries()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
