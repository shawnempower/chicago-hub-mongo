/**
 * Inspect website inventory structure specifically
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function inspectWebsiteInventory() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('chicago-hub');
    
    const allPubs = await db.collection('publications').find({
      'distributionChannels.website.advertisingOpportunities': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📰 Found ${allPubs.length} publications with website inventory\n`);
    
    // Collect all unique adFormat values and format.dimensions
    const adFormats: Record<string, number> = {};
    const formatDimensions: Record<string, number> = {};
    const topLevelDimensions: Record<string, number> = {};
    const sampleAds: any[] = [];
    
    for (const pub of allPubs) {
      const ads = pub.distributionChannels?.website?.advertisingOpportunities || [];
      for (const ad of ads) {
        // Track adFormat field
        if (ad.adFormat) {
          adFormats[ad.adFormat] = (adFormats[ad.adFormat] || 0) + 1;
        }
        
        // Track format.dimensions
        if (ad.format?.dimensions) {
          const dims = Array.isArray(ad.format.dimensions) 
            ? ad.format.dimensions.join(', ') 
            : ad.format.dimensions;
          formatDimensions[dims] = (formatDimensions[dims] || 0) + 1;
        }
        
        // Track top-level dimensions (if any)
        if (ad.dimensions) {
          const dims = Array.isArray(ad.dimensions) 
            ? ad.dimensions.join(', ') 
            : ad.dimensions;
          topLevelDimensions[dims] = (topLevelDimensions[dims] || 0) + 1;
        }
        
        // Collect sample ads
        if (sampleAds.length < 10) {
          sampleAds.push({
            pubName: pub.basicInformation?.title || pub.name,
            name: ad.name,
            adFormat: ad.adFormat,
            dimensions: ad.dimensions,
            formatDimensions: ad.format?.dimensions,
            specifications: ad.specifications
          });
        }
      }
    }
    
    console.log('🏷️  WEBSITE adFormat VALUES (the key/type field):');
    console.log('='.repeat(50));
    const sortedFormats = Object.entries(adFormats).sort((a, b) => b[1] - a[1]);
    for (const [format, count] of sortedFormats) {
      console.log(`   "${format}": ${count} occurrences`);
    }
    
    console.log('\n\n📐 WEBSITE format.dimensions VALUES:');
    console.log('='.repeat(50));
    const sortedDims = Object.entries(formatDimensions).sort((a, b) => b[1] - a[1]);
    for (const [dims, count] of sortedDims) {
      console.log(`   "${dims}": ${count} occurrences`);
    }
    
    if (Object.keys(topLevelDimensions).length > 0) {
      console.log('\n\n📏 TOP-LEVEL dimensions field:');
      console.log('='.repeat(50));
      for (const [dims, count] of Object.entries(topLevelDimensions).sort((a, b) => b[1] - a[1])) {
        console.log(`   "${dims}": ${count} occurrences`);
      }
    }
    
    console.log('\n\n📋 SAMPLE WEBSITE ADS (full structure):');
    console.log('='.repeat(50));
    for (const ad of sampleAds.slice(0, 5)) {
      console.log(`\n${ad.pubName} - "${ad.name}":`);
      console.log(`   adFormat: ${JSON.stringify(ad.adFormat)}`);
      console.log(`   dimensions: ${JSON.stringify(ad.dimensions)}`);
      console.log(`   format.dimensions: ${JSON.stringify(ad.formatDimensions)}`);
      console.log(`   specifications: ${JSON.stringify(ad.specifications)}`);
    }

  } finally {
    await client.close();
  }
}

inspectWebsiteInventory().then(() => process.exit(0)).catch(console.error);
