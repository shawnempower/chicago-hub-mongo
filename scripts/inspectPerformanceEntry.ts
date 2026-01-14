/**
 * Inspect Actual Performance Entry Document
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

async function inspectEntry() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(STAGING_DB);
    
    const jan13 = new Date('2026-01-13');
    
    const entry = await db.collection('performance_entries').findOne({
      orderId: TEST_ORDER,
      dateStart: jan13
    });
    
    console.log('\n📋 RAW DOCUMENT:\n');
    console.log(JSON.stringify(entry, null, 2));
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

inspectEntry()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
