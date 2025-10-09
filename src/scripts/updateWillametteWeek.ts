import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

import { connectToDatabase } from '../integrations/mongodb/client';
import { publicationsService } from '../integrations/mongodb/allServices';

async function updateWillametteWeekData() {
  console.log('🚀 Starting Willamette Week data update...');

  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');

    // Read the WillametteWeek schema file
    const schemaPath = path.join(process.cwd(), 'json_files/publications/WillametteWeek_Schema.json');
    const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    console.log('📄 Loaded WillametteWeek schema file');

    // Remove the custom _id to let MongoDB auto-generate ObjectId
    // Also preserve existing metadata.lastUpdated to avoid conflicts
    const { _id, ...publicationData } = schemaData;
    console.log(`🔄 Removed custom _id "${_id}" - MongoDB will auto-generate ObjectId`);
    
    // Update metadata to include lastUpdated timestamp
    publicationData.metadata = {
      ...publicationData.metadata,
      lastUpdated: new Date().toISOString()
    };

    // Check if Willamette Week publication already exists by publicationId
    const existingPublication = await publicationsService.getByPublicationId(publicationData.publicationId);
    
    if (existingPublication) {
      console.log('📝 Found existing Willamette Week publication, updating...');
      
      // Replace the existing publication with comprehensive data (avoid metadata conflicts)
      console.log(`🔄 Replacing publication with ObjectId: ${existingPublication._id}`);
      
      // Use direct MongoDB replace to avoid metadata conflicts
      const database = await import('../integrations/mongodb/client').then(m => m.getDatabase());
      const collection = database.collection('publications');
      
      // Keep the existing _id and update everything else
      const replacementData = {
        ...publicationData,
        _id: existingPublication._id
      };
      
      const result = await collection.replaceOne(
        { _id: existingPublication._id },
        replacementData
      );
      
      const updatedPublication = result.modifiedCount > 0 ? replacementData : null;
      
      if (updatedPublication) {
        console.log('✅ Successfully updated Willamette Week publication');
        console.log('📊 Updated data includes:');
        console.log(`   • Website ads: ${publicationData.distributionChannels?.website?.advertisingOpportunities?.length || 0}`);
        console.log(`   • Newsletter products: ${publicationData.distributionChannels?.newsletters?.length || 0}`);
        console.log(`   • Print ads: ${publicationData.distributionChannels?.print?.advertisingOpportunities?.length || 0}`);
        console.log(`   • Events: ${publicationData.distributionChannels?.events?.length || 0}`);
        console.log(`   • Cross-channel packages: ${publicationData.crossChannelPackages?.length || 0}`);
        console.log(`   • Social media profiles: ${publicationData.socialMediaProfiles?.length || 0}`);
      } else {
        console.error('❌ Failed to update publication');
      }
    } else {
      console.log('🆕 Creating new Willamette Week publication...');
      
      // Create new publication with the comprehensive data
      const newPublication = await publicationsService.create(publicationData);
      
      if (newPublication) {
        console.log('✅ Successfully created Willamette Week publication');
        console.log('📊 Created data includes:');
        console.log(`   • Website ads: ${publicationData.distributionChannels?.website?.advertisingOpportunities?.length || 0}`);
        console.log(`   • Newsletter products: ${publicationData.distributionChannels?.newsletters?.length || 0}`);
        console.log(`   • Print ads: ${publicationData.distributionChannels?.print?.advertisingOpportunities?.length || 0}`);
        console.log(`   • Events: ${publicationData.distributionChannels?.events?.length || 0}`);
        console.log(`   • Cross-channel packages: ${publicationData.crossChannelPackages?.length || 0}`);
        console.log(`   • Social media profiles: ${publicationData.socialMediaProfiles?.length || 0}`);
      } else {
        console.error('❌ Failed to create publication');
      }
    }

    // Verify the data was saved correctly
    const verifyPublication = await publicationsService.getByPublicationId(publicationData.publicationId);
    if (verifyPublication) {
      console.log('🔍 Verification successful - publication data is in MongoDB');
      console.log(`   • Publication name: ${verifyPublication.basicInfo?.publicationName}`);
      console.log(`   • Website URL: ${verifyPublication.basicInfo?.websiteUrl}`);
      console.log(`   • Total advertising opportunities: ${
        (verifyPublication.distributionChannels?.website?.advertisingOpportunities?.length || 0) +
        (verifyPublication.distributionChannels?.newsletters?.reduce((sum: number, n: any) => sum + (n.advertisingOpportunities?.length || 0), 0) || 0) +
        (verifyPublication.distributionChannels?.print?.advertisingOpportunities?.length || 0) +
        (verifyPublication.distributionChannels?.events?.reduce((sum: number, e: any) => sum + (e.advertisingOpportunities?.length || 0), 0) || 0)
      }`);
    } else {
      console.error('❌ Verification failed - could not retrieve publication');
    }

    console.log('🎉 Willamette Week data update completed!');

  } catch (error) {
    console.error('❌ Error updating Willamette Week data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the update
updateWillametteWeekData();
