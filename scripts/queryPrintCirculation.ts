/**
 * Query Publications Print Circulation
 * Find publications with print circulation around 20k
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function queryPrintCirculation() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    // Force production database
    const dbName = 'chicago-hub';
    console.log(`📂 Using database: ${dbName} (PRODUCTION)\n`);
    const db = client.db(dbName);
    
    // Find publications with print circulation around 20k (15k-25k range)
    const publications = await db.collection('publications').find({}).toArray();

    console.log(`📋 Found ${publications.length} total publications\n`);
    console.log('='.repeat(100));
    console.log('\n🔍 Publications with print circulation around 20k:\n');

    const matchingPubs: any[] = [];
    
    publications.forEach((pub: any) => {
      const title = pub.basicInformation?.title || pub.name || 'Unnamed';
      
      // Check various circulation fields
      const printChannel = pub.distributionChannels?.print;
      let circulation: number | null = null;
      let circulationSource = '';
      
      // Check print channel circulation
      if (printChannel) {
        const prints = Array.isArray(printChannel) ? printChannel : [printChannel];
        prints.forEach((print: any) => {
          if (print.circulation) {
            circulation = print.circulation;
            circulationSource = 'distributionChannels.print.circulation';
          }
          if (print.weeklyCirculation) {
            circulation = print.weeklyCirculation;
            circulationSource = 'distributionChannels.print.weeklyCirculation';
          }
          if (print.monthlyCirculation) {
            circulation = print.monthlyCirculation;
            circulationSource = 'distributionChannels.print.monthlyCirculation';
          }
        });
      }
      
      // Check top-level circulation fields
      if (pub.circulation) {
        circulation = pub.circulation;
        circulationSource = 'circulation (top-level)';
      }
      if (pub.printCirculation) {
        circulation = pub.printCirculation;
        circulationSource = 'printCirculation (top-level)';
      }
      
      // Check if circulation is around 20k (15k-25k)
      if (circulation && circulation >= 15000 && circulation <= 25000) {
        matchingPubs.push({
          id: pub._id,
          title,
          circulation,
          circulationSource,
          pub
        });
      }
    });

    if (matchingPubs.length === 0) {
      console.log('No publications found with circulation between 15k-25k\n');
      console.log('\n📊 All publications with their circulation data:\n');
      
      publications.forEach((pub: any) => {
        const title = pub.basicInformation?.title || pub.name || 'Unnamed';
        const printChannel = pub.distributionChannels?.print;
        
        console.log(`\n📰 ${title}`);
        console.log(`   ID: ${pub._id}`);
        
        if (printChannel) {
          const prints = Array.isArray(printChannel) ? printChannel : [printChannel];
          prints.forEach((print: any, i: number) => {
            console.log(`   Print Channel ${i + 1}:`);
            console.log(`     - circulation: ${print.circulation ?? 'not set'}`);
            console.log(`     - weeklyCirculation: ${print.weeklyCirculation ?? 'not set'}`);
            console.log(`     - monthlyCirculation: ${print.monthlyCirculation ?? 'not set'}`);
            console.log(`     - frequency: ${print.frequency ?? 'not set'}`);
          });
        } else {
          console.log('   No print channel configured');
        }
        
        // Show top-level fields if they exist
        if (pub.circulation) console.log(`   Top-level circulation: ${pub.circulation}`);
        if (pub.printCirculation) console.log(`   Top-level printCirculation: ${pub.printCirculation}`);
      });
    } else {
      matchingPubs.forEach((item, i) => {
        console.log(`\n${i + 1}. 📰 ${item.title}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Circulation: ${item.circulation.toLocaleString()}`);
        console.log(`   Source field: ${item.circulationSource}`);
        
        // Show full print channel details
        const printChannel = item.pub.distributionChannels?.print;
        if (printChannel) {
          const prints = Array.isArray(printChannel) ? printChannel : [printChannel];
          prints.forEach((print: any, j: number) => {
            console.log(`\n   Print Channel ${j + 1} Full Details:`);
            console.log(`     - circulation: ${print.circulation ?? 'not set'}`);
            console.log(`     - weeklyCirculation: ${print.weeklyCirculation ?? 'not set'}`);
            console.log(`     - monthlyCirculation: ${print.monthlyCirculation ?? 'not set'}`);
            console.log(`     - frequency: ${print.frequency ?? 'not set'}`);
            console.log(`     - All fields:`, JSON.stringify(print, null, 2).split('\n').map(l => '       ' + l).join('\n'));
          });
        }
      });
    }

    console.log('\n' + '='.repeat(100));

  } finally {
    await client.close();
  }
}

queryPrintCirculation().then(() => process.exit(0)).catch(console.error);




