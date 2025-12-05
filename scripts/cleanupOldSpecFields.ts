/**
 * Cleanup script to remove old specification fields from publications
 * 
 * Removes:
 * - sizes (array of size strings)
 * - specifications (object with duration, fileFormats, etc.)
 * 
 * These fields have been migrated to the `format` object.
 * 
 * Usage:
 *   DRY_RUN=true npx tsx scripts/cleanupOldSpecFields.ts   # Preview changes
 *   npx tsx scripts/cleanupOldSpecFields.ts                # Execute cleanup
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === 'true';
const TARGET_DB = process.env.TARGET_DB || 'staging-chicago-hub';

async function cleanupOldFields() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri.replace('chicago-hub', TARGET_DB));
  
  try {
    await client.connect();
    const db = client.db(TARGET_DB);
    const collection = db.collection('publications');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Cleanup Old Specification Fields`);
    console.log(`Database: ${TARGET_DB}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const publications = await collection.find({}).toArray();
    console.log(`Found ${publications.length} publications to process\n`);
    
    const channels = ['website', 'newsletters', 'print', 'podcasts', 'radio', 'socialMedia', 'streamingVideo'];
    
    let totalCleaned = 0;
    let sizesRemoved = 0;
    let specificationsRemoved = 0;
    
    for (const pub of publications) {
      const pubName = pub.basicInformation?.title || pub._id;
      let pubModified = false;
      const updates: any = {};
      
      for (const channel of channels) {
        const ads = pub.distributionChannels?.[channel]?.advertisingOpportunities;
        if (!ads || ads.length === 0) continue;
        
        const cleanedAds = ads.map((ad: any, idx: number) => {
          let modified = false;
          const cleanedAd = { ...ad };
          
          // Remove sizes field
          if (cleanedAd.sizes !== undefined) {
            if (DRY_RUN) {
              console.log(`  [${channel}] Ad ${idx}: Would remove 'sizes': ${JSON.stringify(cleanedAd.sizes)}`);
            }
            delete cleanedAd.sizes;
            sizesRemoved++;
            modified = true;
          }
          
          // Remove specifications field
          if (cleanedAd.specifications !== undefined) {
            if (DRY_RUN) {
              console.log(`  [${channel}] Ad ${idx}: Would remove 'specifications': ${JSON.stringify(cleanedAd.specifications)}`);
            }
            delete cleanedAd.specifications;
            specificationsRemoved++;
            modified = true;
          }
          
          if (modified) pubModified = true;
          return cleanedAd;
        });
        
        if (pubModified) {
          updates[`distributionChannels.${channel}.advertisingOpportunities`] = cleanedAds;
        }
      }
      
      if (pubModified) {
        totalCleaned++;
        console.log(`${DRY_RUN ? 'Would clean' : 'Cleaning'}: ${pubName}`);
        
        if (!DRY_RUN) {
          await collection.updateOne(
            { _id: pub._id },
            { $set: updates }
          );
        }
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Summary:`);
    console.log(`  Publications ${DRY_RUN ? 'to clean' : 'cleaned'}: ${totalCleaned}`);
    console.log(`  'sizes' fields ${DRY_RUN ? 'to remove' : 'removed'}: ${sizesRemoved}`);
    console.log(`  'specifications' fields ${DRY_RUN ? 'to remove' : 'removed'}: ${specificationsRemoved}`);
    console.log(`${'='.repeat(60)}\n`);
    
    if (DRY_RUN) {
      console.log('This was a DRY RUN. No changes were made.');
      console.log('Run without DRY_RUN=true to execute cleanup.\n');
    }
    
  } finally {
    await client.close();
  }
}

cleanupOldFields().catch(console.error);
