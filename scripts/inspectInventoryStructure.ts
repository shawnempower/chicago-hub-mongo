/**
 * Inspect the actual structure of inventory in publications
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function inspectInventory() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('chicago-hub');
    
    // Get one publication with various inventory types
    const pub = await db.collection('publications').findOne({
      'distributionChannels.newsletters': { $exists: true, $ne: [] }
    });

    if (!pub) {
      console.log('No publication found');
      return;
    }

    console.log('📰 Publication:', pub.basicInformation?.title || pub.name);
    console.log('\n');

    // Show raw structure of one newsletter ad opportunity
    if (pub.distributionChannels?.newsletters?.[0]?.advertisingOpportunities?.[0]) {
      console.log('📧 NEWSLETTER AD OPPORTUNITY (raw structure):');
      console.log(JSON.stringify(pub.distributionChannels.newsletters[0].advertisingOpportunities[0], null, 2));
    }

    // Show raw structure of one website ad opportunity
    if (pub.distributionChannels?.website?.advertisingOpportunities?.[0]) {
      console.log('\n🌐 WEBSITE AD OPPORTUNITY (raw structure):');
      console.log(JSON.stringify(pub.distributionChannels.website.advertisingOpportunities[0], null, 2));
    }

    // Show raw structure of one print ad opportunity
    if (pub.distributionChannels?.print?.[0]?.advertisingOpportunities?.[0]) {
      console.log('\n📰 PRINT AD OPPORTUNITY (raw structure):');
      console.log(JSON.stringify(pub.distributionChannels.print[0].advertisingOpportunities[0], null, 2));
    }

    // Check all field names used across all publications
    console.log('\n\n📊 ALL UNIQUE FIELDS IN ADVERTISING OPPORTUNITIES:\n');
    
    const allPubs = await db.collection('publications').find({}).toArray();
    const fieldCounts: Record<string, number> = {};
    
    for (const p of allPubs) {
      const channels = p.distributionChannels || {};
      
      // Website
      for (const ad of channels.website?.advertisingOpportunities || []) {
        for (const key of Object.keys(ad)) {
          fieldCounts[`website.${key}`] = (fieldCounts[`website.${key}`] || 0) + 1;
        }
      }
      
      // Newsletters
      for (const nl of channels.newsletters || []) {
        for (const ad of nl.advertisingOpportunities || []) {
          for (const key of Object.keys(ad)) {
            fieldCounts[`newsletter.${key}`] = (fieldCounts[`newsletter.${key}`] || 0) + 1;
          }
        }
      }
      
      // Print
      for (const pr of channels.print || []) {
        for (const ad of pr.advertisingOpportunities || []) {
          for (const key of Object.keys(ad)) {
            fieldCounts[`print.${key}`] = (fieldCounts[`print.${key}`] || 0) + 1;
          }
        }
      }
    }
    
    // Sort and display
    const sorted = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sorted) {
      console.log(`   ${field}: ${count}`);
    }

  } finally {
    await client.close();
  }
}

inspectInventory().then(() => process.exit(0)).catch(console.error);
