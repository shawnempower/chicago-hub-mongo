/**
 * Refresh Package Dimensions
 * 
 * Updates existing packages to include print dimensions from source publications
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

      // Process each inventory item
      for (const item of pub.inventoryItems || []) {
        itemsProcessed++;
        
        // Only process print items without dimensions
        if (item.channel !== 'print') continue;
        if (item.specifications?.dimensions) {
          console.log(`   ✓ ${item.itemName} - already has dimensions`);
          continue;
        }

        // Parse the item path to find the source opportunity
        // Format: "distributionChannels.print[0].advertisingOpportunities[1]"
        const pathMatch = item.itemPath.match(/distributionChannels\.(\w+)\[(\d+)\]\.advertisingOpportunities\[(\d+)\]/);
        
        if (!pathMatch) {
          console.log(`   ⚠️  ${item.itemName} - couldn't parse path: ${item.itemPath}`);
          continue;
        }

        const [, channelKey, channelIdx, oppIdx] = pathMatch;
        
        // Get the source opportunity from publication
        const channel = publication.distributionChannels?.[channelKey];
        if (!channel) continue;
        
        const channelArray = Array.isArray(channel) ? channel : [channel];
        const channelItem = channelArray[parseInt(channelIdx)];
        if (!channelItem) continue;
        
        const opportunity = channelItem.advertisingOpportunities?.[parseInt(oppIdx)];
        if (!opportunity) continue;

        // Check if source has dimensions
        if (opportunity.dimensions) {
          // Add dimensions to item specifications
          if (!item.specifications) {
            item.specifications = {};
          }
          item.specifications.dimensions = opportunity.dimensions;
          
          // Also add other print-specific fields if missing
          if (opportunity.adFormat && !item.specifications.adFormat) {
            item.specifications.adFormat = opportunity.adFormat;
          }
          if (opportunity.color && !item.specifications.color) {
            item.specifications.color = opportunity.color;
          }
          
          updatedCount++;
          console.log(`   ✅ ${item.itemName} - added dimensions: ${opportunity.dimensions}`);
        } else {
          console.log(`   ⚠️  ${item.itemName} - no dimensions in source publication`);
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

This will update the package to include print dimensions from source publications.
`);
  process.exit(1);
}

refreshPackageDimensions(packageIdOrName)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

