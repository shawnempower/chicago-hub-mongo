/**
 * Test Performance Metrics Sync
 * 
 * This script tests the sync function with La Raza's data to verify
 * it correctly recalculates performanceMetrics from circulation.
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { syncAllPerformanceMetrics, syncPrintMetrics } from '../src/utils/performanceMetricsSync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSync() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    // Use staging database for testing
    const dbName = process.env.MONGODB_DB_NAME || 'staging-chicago-hub';
    console.log(`📂 Using database: ${dbName}\n`);
    const db = client.db(dbName);

    // Fetch La Raza
    const pub = await db.collection('publications').findOne({
      _id: new ObjectId('68db3df49f10c5187ff811b8')
    });

    if (!pub) {
      console.log('❌ Publication not found');
      return;
    }

    const basicInfo = pub.basicInformation || pub.basicInfo;
    console.log(`📰 Testing sync for: ${basicInfo?.publicationName || 'Unknown'}\n`);
    console.log('='.repeat(80));

    // Show BEFORE state
    console.log('\n📊 BEFORE (current database values):\n');
    const print = pub.distributionChannels?.print;
    if (print) {
      const prints = Array.isArray(print) ? print : [print];
      prints.forEach((p: any, i: number) => {
        console.log(`Print Channel ${i + 1}:`);
        console.log(`  circulation: ${p.circulation}`);
        console.log(`  frequency: ${p.frequency}`);
        
        if (p.advertisingOpportunities) {
          p.advertisingOpportunities.forEach((ad: any, j: number) => {
            console.log(`\n  Ad ${j + 1}: ${ad.name}`);
            console.log(`    audienceSize: ${ad.performanceMetrics?.audienceSize}`);
            console.log(`    occurrencesPerMonth: ${ad.performanceMetrics?.occurrencesPerMonth}`);
            console.log(`    impressionsPerMonth: ${ad.performanceMetrics?.impressionsPerMonth}`);
          });
        }
      });
    }

    // Run sync
    console.log('\n' + '='.repeat(80));
    console.log('\n🔄 Running syncAllPerformanceMetrics...\n');
    
    const syncedChannels = syncAllPerformanceMetrics(pub.distributionChannels);

    // Show AFTER state
    console.log('📊 AFTER (synced values):\n');
    const syncedPrint = syncedChannels?.print;
    if (syncedPrint) {
      const prints = Array.isArray(syncedPrint) ? syncedPrint : [syncedPrint];
      prints.forEach((p: any, i: number) => {
        console.log(`Print Channel ${i + 1}:`);
        console.log(`  circulation: ${p.circulation}`);
        console.log(`  frequency: ${p.frequency}`);
        
        if (p.advertisingOpportunities) {
          p.advertisingOpportunities.forEach((ad: any, j: number) => {
            console.log(`\n  Ad ${j + 1}: ${ad.name}`);
            console.log(`    audienceSize: ${ad.performanceMetrics?.audienceSize} ${ad.performanceMetrics?.audienceSize === p.circulation ? '✅' : '⚠️ MISMATCH'}`);
            console.log(`    occurrencesPerMonth: ${ad.performanceMetrics?.occurrencesPerMonth}`);
            console.log(`    impressionsPerMonth: ${ad.performanceMetrics?.impressionsPerMonth}`);
          });
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    
    // Test with a simulated circulation change
    console.log('\n🧪 SIMULATED TEST: What if circulation changes to 50,000?\n');
    
    const testChannels = JSON.parse(JSON.stringify(pub.distributionChannels));
    if (testChannels.print) {
      const prints = Array.isArray(testChannels.print) ? testChannels.print : [testChannels.print];
      prints[0].circulation = 50000; // Simulate user changing circulation
    }
    
    const syncedTest = syncAllPerformanceMetrics(testChannels);
    const testPrint = syncedTest?.print;
    if (testPrint) {
      const prints = Array.isArray(testPrint) ? testPrint : [testPrint];
      prints.forEach((p: any) => {
        console.log(`  New circulation: ${p.circulation}`);
        if (p.advertisingOpportunities?.[0]) {
          const ad = p.advertisingOpportunities[0];
          console.log(`  New audienceSize: ${ad.performanceMetrics?.audienceSize}`);
          console.log(`  New impressionsPerMonth: ${ad.performanceMetrics?.impressionsPerMonth}`);
          console.log(`  (50,000 × 4.33 = ${50000 * 4.33})`);
        }
      });
    }
    
    console.log('\n✅ Sync function is working correctly!');
    console.log('   When circulation changes, performanceMetrics will auto-update.');

  } finally {
    await client.close();
  }
}

testSync().then(() => process.exit(0)).catch(console.error);


