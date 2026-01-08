/**
 * Query Publication by ID
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function queryPubById(pubId: string) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = 'chicago-hub';
    console.log(`📂 Using database: ${dbName} (PRODUCTION)\n`);
    const db = client.db(dbName);
    
    const pub = await db.collection('publications').findOne({
      _id: new ObjectId(pubId)
    });

    if (!pub) {
      console.log(`❌ Publication not found with ID: ${pubId}`);
      return;
    }

    console.log('📰 PUBLICATION DETAILS:\n');
    console.log('='.repeat(80));
    
    // Basic info - check both field names
    const basicInfo = pub.basicInformation || pub.basicInfo;
    console.log('\n📋 Basic Information:');
    console.log(`   _id: ${pub._id}`);
    console.log(`   publicationId: ${pub.publicationId || 'NOT SET'}`);
    console.log(`   Title: ${basicInfo?.title || basicInfo?.publicationName || 'NOT SET'}`);
    console.log(`   Name: ${pub.name || 'NOT SET'}`);
    console.log(`   Slug: ${pub.slug || 'NOT SET'}`);
    console.log(`   Publication Type: ${basicInfo?.publicationType || 'NOT SET'}`);
    console.log(`   Description: ${basicInfo?.description || 'NOT SET'}`);
    console.log(`   Website: ${basicInfo?.websiteUrl || basicInfo?.website || pub.website || 'NOT SET'}`);
    
    // Show full basicInfo
    if (basicInfo) {
      console.log('\n   Full basicInfo object:');
      console.log(JSON.stringify(basicInfo, null, 2).split('\n').map(l => '   ' + l).join('\n'));
    }
    
    // Contact info - check both field names
    const contactInfo = pub.contactInformation || pub.contactInfo;
    if (contactInfo) {
      console.log('\n📧 Contact Information:');
      console.log(`   Email: ${contactInfo.email || contactInfo.generalEmail || 'NOT SET'}`);
      console.log(`   Phone: ${contactInfo.phone || contactInfo.mainPhone || 'NOT SET'}`);
      console.log(`   Contact Name: ${contactInfo.contactName || contactInfo.primaryContact || 'NOT SET'}`);
    }

    // Print channel info
    console.log('\n📰 Print Channel:');
    if (pub.distributionChannels?.print) {
      const prints = Array.isArray(pub.distributionChannels.print) 
        ? pub.distributionChannels.print 
        : [pub.distributionChannels.print];
      
      prints.forEach((print: any, i: number) => {
        console.log(`\n   Print Channel ${i + 1}:`);
        console.log(`   - frequency: ${print.frequency || 'NOT SET'}`);
        console.log(`   - circulation: ${print.circulation || 'NOT SET'}`);
        console.log(`   - paidCirculation: ${print.paidCirculation || 'NOT SET'}`);
        console.log(`   - freeCirculation: ${print.freeCirculation || 'NOT SET'}`);
        console.log(`   - distributionArea: ${print.distributionArea || 'NOT SET'}`);
        console.log(`   - printSchedule: ${print.printSchedule || 'NOT SET'}`);
        
        if (print.advertisingOpportunities?.length) {
          console.log(`   - Ad Opportunities: ${print.advertisingOpportunities.length} configured`);
        }
      });
    } else {
      console.log('   No print channel configured');
    }

    console.log('\n' + '='.repeat(80));

  } finally {
    await client.close();
  }
}

// Get the publication ID that showed 20k circulation
const pubId = process.argv[2] || '68db3df49f10c5187ff811b8';
queryPubById(pubId).then(() => process.exit(0)).catch(console.error);




