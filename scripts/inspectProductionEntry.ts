/**
 * Inspect Production Performance Entry
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PRODUCTION_DB = 'chicago-hub';
const TEST_ORDER = '6960195199937f3b71a2338d';

async function inspectEntry() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(PRODUCTION_DB);
    
    const jan13 = new Date('2026-01-13');
    
    const entries = await db.collection('performance_entries').find({
      orderId: TEST_ORDER,
      dateStart: jan13
    }).toArray();
    
    console.log('\n📋 RAW DOCUMENTS FROM PRODUCTION:\n');
    console.log(`Found ${entries.length} document(s)\n`);
    
    entries.forEach((entry: any, idx) => {
      console.log(`Document ${idx + 1}:`);
      console.log(JSON.stringify(entry, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
    });
    
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
