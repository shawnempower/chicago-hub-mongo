/**
 * Query Publication Performance Metrics
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function queryPubPerformance(pubId: string) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'staging-chicago-hub';
    console.log(`📂 Using database: ${dbName}\n`);
    const db = client.db(dbName);

    const pub = await db.collection('publications').findOne({
      _id: new ObjectId(pubId)
    });

    if (!pub) {
      console.log(`❌ Publication not found with ID: ${pubId}`);
      return;
    }

    const basicInfo = pub.basicInformation || pub.basicInfo;
    console.log(`📰 ${basicInfo?.publicationName || basicInfo?.title || 'Unknown'}\n`);
    console.log('='.repeat(80));

    const print = pub.distributionChannels?.print;
    if (print) {
      const prints = Array.isArray(print) ? print : [print];
      
      prints.forEach((p: any, i: number) => {
        console.log(`\n📄 Print Channel ${i + 1}:`);
        console.log(`   circulation: ${p.circulation}`);
        console.log(`   frequency: ${p.frequency}`);
        console.log(`   freeCirculation: ${p.freeCirculation}`);
        
        if (p.advertisingOpportunities) {
          console.log(`\n   📊 Ad Opportunities (${p.advertisingOpportunities.length}):\n`);
          
          p.advertisingOpportunities.forEach((opp: any, j: number) => {
            console.log(`   ${j + 1}. ${opp.name}`);
            console.log(`      performanceMetrics:`);
            console.log(`        - audienceSize: ${opp.performanceMetrics?.audienceSize}`);
            console.log(`        - occurrencesPerMonth: ${opp.performanceMetrics?.occurrencesPerMonth}`);
            console.log(`        - impressionsPerMonth: ${opp.performanceMetrics?.impressionsPerMonth}`);
            console.log(`        - guaranteed: ${opp.performanceMetrics?.guaranteed}`);
            
            // Calculate what impressions SHOULD be based on circulation
            const expectedImpressions = p.circulation * (opp.performanceMetrics?.occurrencesPerMonth || 1);
            console.log(`      ⚠️  Expected impressions (circulation × occurrences): ${expectedImpressions.toLocaleString()}`);
            console.log();
          });
        }
      });
    }

    console.log('\n' + '='.repeat(80));

  } finally {
    await client.close();
  }
}

const pubId = process.argv[2] || '68db3df49f10c5187ff811b8';
queryPubPerformance(pubId).then(() => process.exit(0)).catch(console.error);

