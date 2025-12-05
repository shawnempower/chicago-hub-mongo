/**
 * Refresh Package Dimensions
 * 
 * Updates existing packages to include dimensions and specs from source publications
 * for ALL channels (print, newsletter, website, radio, podcast, etc.)
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function refreshPackageDimensions(packageIdOrName: string) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('chicago-hub');
    const packagesCollection = db.collection('hub_packages');
    const publicationsCollection = db.collection('publications');

    // Find package by ID or name
    let query: any;
    if (packageIdOrName.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: new ObjectId(packageIdOrName) };
    } else {
      query = { 'basicInfo.name': new RegExp(packageIdOrName, 'i') };
    }

    const package_ = await packagesCollection.findOne(query);
    
    if (!package_) {
      console.log(`❌ Package not found: "${packageIdOrName}"\n`);
      
      // Show available packages
      const packages = await packagesCollection.find({})
        .project({ 'basicInfo.name': 1, _id: 1 })
        .toArray();
      
      console.log('Available packages:');
      packages.forEach(p => {
        console.log(`  - ${p.basicInfo?.name || 'Unnamed'} (${p._id})`);
      });
      
      return;
    }

    console.log(`📦 Package: ${package_.basicInfo?.name || 'Unnamed'}`);
    console.log(`   ID: ${package_._id}`);
    console.log(`   Publications: ${package_.publications?.length || 0}`);
    console.log();

    if (!package_.publications || package_.publications.length === 0) {
      console.log('⚠️  No publications in this package\n');
      return;
    }

    let updatedCount = 0;
    let itemsProcessed = 0;

    // Process each publication in the package
    for (const pub of package_.publications) {
      const publication = await publicationsCollection.findOne({ publicationId: pub.publicationId });
      
      if (!publication) {
        console.log(`⚠️  Publication ${pub.publicationId} not found in database`);
        continue;
      }

      console.log(`\n📰 ${pub.publicationName} (${pub.publicationId})`);

      // Process each inventory item (all channels)
      for (const item of pub.inventoryItems || []) {
        itemsProcessed++;
        
        // Skip if already has all specs
        if (item.specifications?.dimensions && item.specifications?.fileFormats) {
          console.log(`   ✓ ${item.itemName} (${item.channel}) - already has specs`);
          continue;
        }

        // Parse the item path to find the source opportunity
        // Formats: 
        //   "distributionChannels.print[0].advertisingOpportunities[1]"
        //   "distributionChannels.website.advertisingOpportunities[0]"
        //   "distributionChannels.newsletters[0].advertisingOpportunities[0]"
        //   "distributionChannels.podcasts[0].advertisingOpportunities[0]"
        //   "distributionChannels.radioStations[0].shows[0].advertisingOpportunities[0]"
        let opportunity: any = null;
        
        // Try different path patterns
        const arrayPathMatch = item.itemPath?.match(/distributionChannels\.(\w+)\[(\d+)\]\.advertisingOpportunities\[(\d+)\]/);
        const simplePathMatch = item.itemPath?.match(/distributionChannels\.(\w+)\.advertisingOpportunities\[(\d+)\]/);
        const radioPathMatch = item.itemPath?.match(/distributionChannels\.radioStations\[(\d+)\]\.shows\[(\d+)\]\.advertisingOpportunities\[(\d+)\]/);
        
        if (radioPathMatch) {
          const [, stationIdx, showIdx, oppIdx] = radioPathMatch;
          const station = publication.distributionChannels?.radioStations?.[parseInt(stationIdx)];
          const show = station?.shows?.[parseInt(showIdx)];
          opportunity = show?.advertisingOpportunities?.[parseInt(oppIdx)];
        } else if (arrayPathMatch) {
          const [, channelKey, channelIdx, oppIdx] = arrayPathMatch;
          const channel = publication.distributionChannels?.[channelKey];
          const channelArray = Array.isArray(channel) ? channel : [channel];
          const channelItem = channelArray[parseInt(channelIdx)];
          opportunity = channelItem?.advertisingOpportunities?.[parseInt(oppIdx)];
        } else if (simplePathMatch) {
          const [, channelKey, oppIdx] = simplePathMatch;
          const channel = publication.distributionChannels?.[channelKey];
          opportunity = channel?.advertisingOpportunities?.[parseInt(oppIdx)];
        }
        
        if (!opportunity) {
          console.log(`   ⚠️  ${item.itemName} (${item.channel}) - couldn't find source: ${item.itemPath}`);
          continue;
        }

        // Initialize specifications if not exists
        if (!item.specifications) {
          item.specifications = {};
        }
        
        let wasUpdated = false;

        // Copy dimensions if missing
        if (!item.specifications.dimensions && opportunity.dimensions) {
          item.specifications.dimensions = opportunity.dimensions;
          wasUpdated = true;
          console.log(`   ✅ ${item.itemName} (${item.channel}) - added dimensions: ${opportunity.dimensions}`);
        }
        
        // Copy file formats if missing
        if (!item.specifications.fileFormats && opportunity.specifications?.fileFormats) {
          item.specifications.fileFormats = opportunity.specifications.fileFormats;
          wasUpdated = true;
          console.log(`   ✅ ${item.itemName} (${item.channel}) - added fileFormats: ${opportunity.specifications.fileFormats.join(', ')}`);
        }
        
        // Copy format string if missing
        if (!item.specifications.format && opportunity.specifications?.format) {
          item.specifications.format = opportunity.specifications.format;
          wasUpdated = true;
        }
        
        // Copy duration for audio items
        if (!item.specifications.duration && opportunity.specifications?.duration) {
          item.specifications.duration = opportunity.specifications.duration;
          wasUpdated = true;
          console.log(`   ✅ ${item.itemName} (${item.channel}) - added duration: ${opportunity.specifications.duration}`);
        }
        
        // Copy adFormat if missing (for print)
        if (!item.specifications.adFormat && opportunity.adFormat) {
          item.specifications.adFormat = opportunity.adFormat;
          wasUpdated = true;
        }
        
        // Copy color if missing (for print)
        if (!item.specifications.color && opportunity.color) {
          item.specifications.color = opportunity.color;
          wasUpdated = true;
        }
        
        // Copy standardId if available
        if (!item.specifications.standardId && opportunity.standardId) {
          item.specifications.standardId = opportunity.standardId;
          wasUpdated = true;
        }

        if (wasUpdated) {
          updatedCount++;
        } else if (!item.specifications.dimensions) {
          console.log(`   ⚠️  ${item.itemName} (${item.channel}) - no dimensions in source`);
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Summary:`);
    console.log(`   Items processed: ${itemsProcessed}`);
    console.log(`   Items updated: ${updatedCount}`);
    console.log();

    if (updatedCount > 0) {
      // Update the package in database
      const result = await packagesCollection.updateOne(
        { _id: package_._id },
        { 
          $set: { 
            publications: package_.publications,
            'metadata.lastUpdated': new Date(),
            'metadata.dimensionsRefreshed': new Date()
          } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log('✅ Package updated successfully!\n');
        console.log('You can now use this package to create campaigns with print dimensions.\n');
      } else {
        console.log('⚠️  Package update failed\n');
      }
    } else {
      console.log('ℹ️  No updates needed (all items already have dimensions or no print items found)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Get package ID/name from command line
const packageIdOrName = process.argv[2];

if (!packageIdOrName) {
  console.log(`
Usage: npm exec -- tsx scripts/refreshPackageDimensions.ts <package-id-or-name>

Examples:
  npm exec -- tsx scripts/refreshPackageDimensions.ts "All-Inclusive Package"
  npm exec -- tsx scripts/refreshPackageDimensions.ts 507f1f77bcf86cd799439011

This will update the package to include dimensions and specifications from source 
publications for ALL channels (print, newsletter, website, radio, podcast, etc.).
`);
  process.exit(1);
}

refreshPackageDimensions(packageIdOrName)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

