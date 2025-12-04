/**
 * Query Specific Campaign
 * 
 * Queries a campaign by name to see its inventory and creative requirements
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function queryCampaign(campaignName: string) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🔍 Connecting to MongoDB...\n');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('chicago-hub');
    const campaignsCollection = db.collection('campaigns');
    const publicationsCollection = db.collection('publications');

    // Find campaign by name (case-insensitive) or by ID
    let campaign;
    
    // Try by basicInfo.name first
    campaign = await campaignsCollection.findOne({
      'basicInfo.name': new RegExp(campaignName, 'i')
    });
    
    // If not found, try other name fields
    if (!campaign) {
      campaign = await campaignsCollection.findOne({
        'campaignName': new RegExp(campaignName, 'i')
      });
    }
    
    // If not found and campaignName looks like an ObjectId, try by _id
    if (!campaign && campaignName.match(/^[0-9a-fA-F]{24}$/)) {
      const { ObjectId } = await import('mongodb');
      campaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignName) });
    }
    
    // If still not found, try by campaignId field
    if (!campaign) {
      campaign = await campaignsCollection.findOne({ campaignId: campaignName });
    }

    if (!campaign) {
      console.log(`❌ Campaign not found: "${campaignName}"\n`);
      
      // Show available campaigns
      const campaigns = await campaignsCollection.find({}).limit(10).toArray();
      console.log('Available campaigns:');
      campaigns.forEach(c => {
        console.log(`  - ${c.campaignName || c.name || 'Unnamed'}`);
      });
      return;
    }

    console.log('='.repeat(80));
    console.log('📋 CAMPAIGN DETAILS');
    console.log('='.repeat(80));
    console.log(`Name: ${campaign.basicInfo?.name || campaign.campaignName || campaign.name}`);
    console.log(`ID: ${campaign._id}`);
    console.log(`Campaign ID: ${campaign.campaignId}`);
    console.log(`Status: ${campaign.status || 'Unknown'}`);
    if (campaign.basicInfo) {
      console.log(`Business: ${campaign.basicInfo.businessName || 'N/A'}`);
      console.log(`Advertiser: ${campaign.basicInfo.advertiserName || 'N/A'}`);
    }
    console.log();
    
    // Show all top-level fields
    console.log('='.repeat(80));
    console.log('🔧 CAMPAIGN STRUCTURE');
    console.log('='.repeat(80));
    console.log('Top-level fields:', Object.keys(campaign).join(', '));
    console.log();
    
    // Check if there's analysisResult
    if (campaign.analysisResult) {
      console.log('Analysis Result exists:');
      console.log('  Fields:', Object.keys(campaign.analysisResult).join(', '));
      if (campaign.analysisResult.selectedInventory) {
        console.log(`  Selected Inventory: ${campaign.analysisResult.selectedInventory.length} items`);
      }
    }
    console.log();

    // Check selected inventory
    console.log('='.repeat(80));
    console.log('🔍 INVENTORY CHECK');
    console.log('='.repeat(80));
    console.log('selectedInventory type:', typeof campaign.selectedInventory);
    console.log('selectedInventory is array:', Array.isArray(campaign.selectedInventory));
    
    if (campaign.selectedInventory && typeof campaign.selectedInventory === 'object') {
      console.log('selectedInventory keys:', Object.keys(campaign.selectedInventory).join(', '));
      console.log('selectedInventory:', JSON.stringify(campaign.selectedInventory, null, 2));
    }
    console.log();
    
    // Handle inventory stored in selectedInventory.publications array
    let inventoryItems: any[] = [];
    if (campaign.selectedInventory && campaign.selectedInventory.publications && Array.isArray(campaign.selectedInventory.publications)) {
      // Extract all inventory items from all publications
      campaign.selectedInventory.publications.forEach((pub: any) => {
        if (pub.inventoryItems && Array.isArray(pub.inventoryItems)) {
          pub.inventoryItems.forEach((item: any) => {
            inventoryItems.push({
              ...item,
              publicationId: pub.publicationId,
              publicationName: pub.publicationName
            });
          });
        }
      });
    } else if (Array.isArray(campaign.selectedInventory)) {
      inventoryItems = campaign.selectedInventory;
    }
    
    if (inventoryItems.length > 0) {
      console.log('='.repeat(80));
      console.log('📦 SELECTED INVENTORY');
      console.log('='.repeat(80));
      console.log(`Total Items: ${campaign.selectedInventory.length}\n`);

      // Count by channel
      const channelCounts = new Map<string, number>();
      campaign.selectedInventory.forEach((item: any) => {
        const channel = item.channel || 'unknown';
        channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
      });

      console.log('By Channel:');
      channelCounts.forEach((count, channel) => {
        console.log(`  ${channel}: ${count} items`);
      });
      console.log();

      // Show print inventory details
      const printItems = campaign.selectedInventory.filter((item: any) => 
        item.channel === 'print'
      );

      if (printItems.length > 0) {
        console.log('='.repeat(80));
        console.log('🖨️  PRINT INVENTORY DETAILS');
        console.log('='.repeat(80));
        console.log();

        for (let i = 0; i < printItems.length; i++) {
          const item = printItems[i];
          
          console.log(`${i + 1}. ${item.itemName || item.name || 'Unnamed'}`);
          console.log(`   Publication: ${item.publicationName || 'Unknown'} (ID: ${item.publicationId})`);
          console.log(`   Item Path: ${item.itemPath || item.sourcePath || 'N/A'}`);
          
          // Check for dimensions in various places
          console.log(`   Dimensions:`);
          console.log(`     - item.dimensions: ${item.dimensions || 'NOT SET'}`);
          console.log(`     - item.format?.dimensions: ${item.format?.dimensions || 'NOT SET'}`);
          console.log(`     - item.sizes: ${item.sizes ? JSON.stringify(item.sizes) : 'NOT SET'}`);
          
          if (item.specifications) {
            console.log(`   Specifications:`);
            Object.entries(item.specifications).forEach(([key, value]) => {
              console.log(`     - ${key}: ${JSON.stringify(value)}`);
            });
          } else {
            console.log(`   Specifications: NONE`);
          }
          
          // Show raw item for debugging
          console.log(`   Raw Item Keys:`, Object.keys(item).join(', '));
          console.log();
        }

        // Now fetch the actual publications to see their source data
        console.log('='.repeat(80));
        console.log('📰 SOURCE PUBLICATION DATA');
        console.log('='.repeat(80));
        console.log();

        const pubIds = [...new Set(printItems.map((item: any) => item.publicationId))];
        
        for (const pubId of pubIds) {
          const pub = await publicationsCollection.findOne({ publicationId: pubId });
          
          if (pub) {
            console.log(`Publication: ${pub.basicInformation?.title || 'Unknown'} (ID: ${pubId})`);
            
            if (pub.distributionChannels?.print) {
              const printChannels = Array.isArray(pub.distributionChannels.print) 
                ? pub.distributionChannels.print 
                : [pub.distributionChannels.print];
              
              printChannels.forEach((printChannel: any, idx: number) => {
                if (printChannel.advertisingOpportunities) {
                  console.log(`  Print Channel ${idx + 1} - ${printChannel.advertisingOpportunities.length} opportunities:`);
                  
                  printChannel.advertisingOpportunities.forEach((opp: any, oppIdx: number) => {
                    console.log(`    ${oppIdx + 1}. ${opp.name || 'Unnamed'}`);
                    console.log(`       adFormat: ${opp.adFormat || 'NOT SET'}`);
                    console.log(`       dimensions: ${opp.dimensions || 'NOT SET'}`);
                    
                    if (opp.specifications) {
                      console.log(`       specifications:`, JSON.stringify(opp.specifications, null, 2));
                    }
                  });
                }
              });
            } else {
              console.log(`  NO PRINT CHANNEL DATA`);
            }
            console.log();
          }
        }
      } else {
        console.log('ℹ️  No print inventory in this campaign\n');
      }
    } else {
      console.log('ℹ️  No inventory selected for this campaign\n');
    }

    console.log('='.repeat(80));
    console.log('✅ Query Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error querying campaign:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Get campaign name from command line or use default
const campaignName = process.argv[2] || 'Coca Cola - Summer 2026';

console.log(`Searching for campaign: "${campaignName}"\n`);

queryCampaign(campaignName)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

