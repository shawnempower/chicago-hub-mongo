/**
 * Check Staging Database for Test Pixels
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
const PRODUCTION_DB = 'chicago-hub';
const TEST_CREATIVE = 'cr_test_001';

async function checkBothDatabases() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    console.log('='.repeat(80));
    console.log('🔍 CHECKING BOTH DATABASES FOR TEST PIXELS');
    console.log('='.repeat(80));
    
    // Check Staging
    console.log('\n📊 STAGING DATABASE (staging-chicago-hub):\n');
    const stagingDb = client.db(STAGING_DB);
    const stagingEvents = await stagingDb.collection('tracking_events').find({
      creative_id: TEST_CREATIVE
    }).toArray();
    
    console.log(`   Found ${stagingEvents.length} test events in STAGING`);
    
    if (stagingEvents.length > 0) {
      console.log('\n   ✅ TEST PIXELS FOUND IN STAGING!\n');
      stagingEvents.forEach((event: any, idx) => {
        console.log(`   ${idx + 1}. ${event.event_type.toUpperCase()} | ${event.event_time.toISOString()}`);
      });
    }
    
    // Check Production
    console.log('\n\n📊 PRODUCTION DATABASE (chicago-hub):\n');
    const prodDb = client.db(PRODUCTION_DB);
    const prodEvents = await prodDb.collection('tracking_events').find({
      creative_id: TEST_CREATIVE
    }).toArray();
    
    console.log(`   Found ${prodEvents.length} test events in PRODUCTION`);
    
    if (prodEvents.length > 0) {
      console.log('\n   ✅ TEST PIXELS FOUND IN PRODUCTION!\n');
      prodEvents.forEach((event: any, idx) => {
        console.log(`   ${idx + 1}. ${event.event_type.toUpperCase()} | ${event.event_time.toISOString()}`);
      });
    }
    
    // Count total events in each
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TOTAL EVENTS IN EACH DATABASE:\n');
    
    const stagingTotal = await stagingDb.collection('tracking_events').countDocuments({});
    const prodTotal = await prodDb.collection('tracking_events').countDocuments({});
    
    console.log(`   Staging DB:    ${stagingTotal.toLocaleString()} events`);
    console.log(`   Production DB: ${prodTotal.toLocaleString()} events`);
    
    console.log('\n\n⚠️  IMPORTANT DISCOVERY:\n');
    console.log('   The Lambda function is configured to write to:');
    console.log('   📍 staging-chicago-hub (not chicago-hub)\n');
    console.log('   This explains why test pixels aren\'t showing up!\n');
    
    if (stagingTotal > 0) {
      console.log('💡 The Lambda IS working, but writing to staging database.');
      console.log('   To see real tracking data, check staging-chicago-hub.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

checkBothDatabases()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
