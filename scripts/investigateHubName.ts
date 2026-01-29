/**
 * Investigate Hub Name Issue
 * 
 * Checks if publications have hubIds assigned and if the hub has the correct name
 * Run: npx tsx scripts/investigateHubName.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function investigate() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  // Use database name from env or detect from URI
  const dbName = process.env.MONGODB_DB_NAME || (mongoUri.includes('staging') ? 'staging-chicago-hub' : 'chicago-hub');
  const isStaging = dbName.includes('staging');

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(`📂 Using database: ${dbName} (${isStaging ? 'STAGING' : 'PRODUCTION'})\n`);
    const db = client.db(dbName);
    
    console.log('='.repeat(80));
    console.log('🔍 INVESTIGATING HUB NAME CONFIGURATION');
    console.log('='.repeat(80));
    
    // 1. Look up Chicago Sun-Times publication
    console.log('\n📰 Looking for Chicago Sun-Times...');
    const sunTimes = await db.collection('publications').findOne({
      $or: [
        { 'basicInfo.publicationName': /Chicago Sun-Times/i },
        { 'basicInformation.publicationName': /Chicago Sun-Times/i },
        { name: /Chicago Sun-Times/i }
      ]
    });
    
    if (sunTimes) {
      const basicInfo = sunTimes.basicInfo || sunTimes.basicInformation;
      console.log(`\n✅ Found publication:`);
      console.log(`   _id: ${sunTimes._id}`);
      console.log(`   publicationId: ${sunTimes.publicationId}`);
      console.log(`   Name: ${basicInfo?.publicationName || sunTimes.name}`);
      console.log(`   hubIds: ${JSON.stringify(sunTimes.hubIds) || 'NOT SET ❌'}`);
      
      if (sunTimes.hubIds && sunTimes.hubIds.length > 0) {
        // Look up the hub
        console.log(`\n🏢 Looking up hub with hubId: ${sunTimes.hubIds[0]}...`);
        const hub = await db.collection('hubs').findOne({ hubId: sunTimes.hubIds[0] });
        
        if (hub) {
          console.log(`\n✅ Found hub:`);
          console.log(`   hubId: ${hub.hubId}`);
          console.log(`   basicInfo.name: ${hub.basicInfo?.name || 'NOT SET ❌'}`);
          console.log(`   basicInfo.tagline: ${hub.basicInfo?.tagline || 'NOT SET'}`);
          console.log(`   status: ${hub.status}`);
        } else {
          console.log(`\n❌ Hub NOT FOUND with hubId: ${sunTimes.hubIds[0]}`);
        }
      } else {
        console.log(`\n⚠️  Publication has NO hubIds assigned - this causes "Chicago Hub" fallback!`);
      }
    } else {
      console.log(`\n❌ Chicago Sun-Times publication NOT FOUND`);
    }
    
    // 2. List all hubs
    console.log('\n' + '='.repeat(80));
    console.log('🏢 ALL HUBS IN DATABASE:');
    console.log('='.repeat(80));
    
    const hubs = await db.collection('hubs').find({}).toArray();
    
    if (hubs.length === 0) {
      console.log('\n❌ No hubs found in the database!');
    } else {
      hubs.forEach((hub, i) => {
        console.log(`\n${i + 1}. Hub:`);
        console.log(`   hubId: ${hub.hubId}`);
        console.log(`   basicInfo.name: ${hub.basicInfo?.name || 'NOT SET ❌'}`);
        console.log(`   status: ${hub.status}`);
      });
    }
    
    // 3. Count publications with/without hubIds
    console.log('\n' + '='.repeat(80));
    console.log('📊 PUBLICATION HUB ASSIGNMENT STATS:');
    console.log('='.repeat(80));
    
    const totalPubs = await db.collection('publications').countDocuments();
    const pubsWithHubIds = await db.collection('publications').countDocuments({ 
      hubIds: { $exists: true, $ne: [] } 
    });
    const pubsWithoutHubIds = totalPubs - pubsWithHubIds;
    
    console.log(`\n   Total publications: ${totalPubs}`);
    console.log(`   With hubIds: ${pubsWithHubIds}`);
    console.log(`   Without hubIds: ${pubsWithoutHubIds} ⚠️`);
    
    if (pubsWithoutHubIds > 0) {
      console.log('\n📋 Publications WITHOUT hubIds (first 10):');
      const noHubPubs = await db.collection('publications')
        .find({ $or: [{ hubIds: { $exists: false } }, { hubIds: [] }] })
        .limit(10)
        .toArray();
      
      noHubPubs.forEach((pub, i) => {
        const basicInfo = pub.basicInfo || pub.basicInformation;
        console.log(`   ${i + 1}. ${basicInfo?.publicationName || pub.name || 'UNNAMED'} (pubId: ${pub.publicationId})`);
      });
    }
    
    // 4. Check environment variable
    console.log('\n' + '='.repeat(80));
    console.log('🔧 ENVIRONMENT CONFIG:');
    console.log('='.repeat(80));
    console.log(`\n   MAILGUN_FROM_NAME: ${process.env.MAILGUN_FROM_NAME || 'NOT SET (defaults to "Chicago Hub")'}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS:');
    console.log('='.repeat(80));
    
    if (pubsWithoutHubIds > 0) {
      console.log('\n   1. Assign hubIds to publications that are missing them');
      console.log('   2. Ensure the hub has basicInfo.name set correctly');
      console.log('   3. Or set MAILGUN_FROM_NAME env variable for a global default');
    } else {
      console.log('\n   All publications have hubIds assigned! ✅');
      console.log('   Check if hub.basicInfo.name is set correctly for each hub.');
    }

  } finally {
    await client.close();
  }
}

investigate().then(() => process.exit(0)).catch(console.error);
