/**
 * Query Williamson Source publication to investigate Title Sponsorship inventory issue
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function queryWilliamsonSource() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('chicago-hub');
    
    // Find Williamson Source publication
    const pub = await db.collection('publications').findOne({
      $or: [
        { 'basicInformation.title': { $regex: /williamson source/i } },
        { 'basicInfo.publicationName': { $regex: /williamson source/i } },
        { 'name': { $regex: /williamson source/i } }
      ]
    });

    if (!pub) {
      console.log('❌ Williamson Source publication not found');
      
      // List all publications to help find it
      console.log('\n📋 Available publications:');
      const allPubs = await db.collection('publications').find({}).limit(50).toArray();
      for (const p of allPubs) {
        const name = p.basicInformation?.title || p.basicInfo?.publicationName || p.name || 'Unknown';
        console.log(`   - ${name}`);
      }
      return;
    }

    const pubName = pub.basicInformation?.title || pub.basicInfo?.publicationName || pub.name;
    console.log(`\n📰 Found: ${pubName}`);
    console.log(`   _id: ${pub._id}`);
    console.log('='.repeat(80));

    // Look at website inventory
    const websiteAds = pub.distributionChannels?.website?.advertisingOpportunities || [];
    
    console.log(`\n🌐 WEBSITE ADVERTISING OPPORTUNITIES (${websiteAds.length} total):\n`);
    
    for (const ad of websiteAds) {
      const isTargetAd = ad.name?.toLowerCase().includes('title') || 
                          ad.name?.toLowerCase().includes('sponsorship');
      
      if (isTargetAd) {
        console.log('🎯 FOUND TARGET AD - FULL STRUCTURE:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(ad, null, 2));
        console.log('='.repeat(80));
        console.log('\n');
      }
      
      console.log(`📦 "${ad.name}" (${ad.adFormat || ad.type || 'no format'}):`);
      console.log(`   id: ${ad.id || 'NOT SET'}`);
      console.log(`   adFormat: ${JSON.stringify(ad.adFormat)}`);
      console.log(`   type: ${JSON.stringify(ad.type)}`);
      console.log(`   dimensions (top-level): ${JSON.stringify(ad.dimensions)}`);
      console.log(`   format: ${JSON.stringify(ad.format)}`);
      console.log(`   format.dimensions: ${JSON.stringify(ad.format?.dimensions)}`);
      console.log(`   specifications: ${JSON.stringify(ad.specifications)}`);
      console.log(`   customSize: ${JSON.stringify(ad.customSize)}`);
      console.log(`   size: ${JSON.stringify(ad.size)}`);
      console.log(`   width: ${ad.width}`);
      console.log(`   height: ${ad.height}`);
      
      // Show ALL fields on this ad
      console.log('\n   ALL FIELDS ON THIS AD:');
      for (const [key, value] of Object.entries(ad)) {
        if (typeof value !== 'object' || value === null) {
          console.log(`      ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`      ${key}: ${JSON.stringify(value)}`);
        }
      }
      console.log('\n' + '-'.repeat(60));
    }

    // Also check for any legacy fields at the publication level
    console.log('\n\n📋 FULL WEBSITE DISTRIBUTION CHANNEL STRUCTURE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(pub.distributionChannels?.website, null, 2));

  } finally {
    await client.close();
  }
}

queryWilliamsonSource().then(() => process.exit(0)).catch(console.error);
