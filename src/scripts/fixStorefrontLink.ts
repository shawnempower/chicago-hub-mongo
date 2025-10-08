import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function fixStorefrontLink() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    // First, let's check the current storefront configuration
    const storefrontCollection = db.collection(COLLECTIONS.STOREFRONT_CONFIGURATIONS);
    const currentConfig = await storefrontCollection.findOne({ 'meta.publisher_id': 'la_raza_chicago' });
    
    if (!currentConfig) {
      console.log('❌ No La Raza storefront configuration found');
      return;
    }

    console.log('📋 Current storefront configuration:');
    console.log(`   🔗 Current publicationId: ${currentConfig.publicationId}`);
    console.log(`   🏪 Publisher ID: ${currentConfig.meta.publisher_id}`);

    // Find the actual La Raza publication
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publication = await publicationsCollection.findOne({ publicationId: 1038 });
    
    if (!publication) {
      console.log('❌ Publication ID 1038 not found');
      return;
    }

    console.log('📰 Found La Raza publication:');
    console.log(`   📄 MongoDB _id: ${publication._id}`);
    console.log(`   🔢 publicationId: ${publication.publicationId}`);
    console.log(`   📰 Name: ${publication.basicInfo.publicationName}`);

    // Update the storefront configuration to use the correct publication ID
    console.log('\n🔄 Updating storefront configuration...');
    
    const updateResult = await storefrontCollection.updateOne(
      { _id: currentConfig._id },
      { 
        $set: { 
          publicationId: publication._id.toString(), // Use the MongoDB _id as string
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ Successfully updated storefront configuration!');
      console.log(`   🔗 Updated publicationId to: ${publication._id.toString()}`);
      
      // Verify the update
      const updatedConfig = await storefrontCollection.findOne({ _id: currentConfig._id });
      console.log('\n✅ Verification:');
      console.log(`   🔗 New publicationId: ${updatedConfig?.publicationId}`);
      console.log(`   📅 Updated at: ${updatedConfig?.updatedAt}`);
      
    } else {
      console.log('⚠️  No changes made to storefront configuration');
    }

    return {
      success: true,
      originalPublicationId: currentConfig.publicationId,
      newPublicationId: publication._id.toString(),
      publicationName: publication.basicInfo.publicationName
    };
    
  } catch (error) {
    console.error('❌ Error fixing storefront link:', error);
    throw error;
  }
}

// Run the script
fixStorefrontLink()
  .then((result) => {
    if (result) {
      console.log('\n🎉 Storefront link fix completed successfully!');
      console.log(`📰 ${result.publicationName} storefront is now properly linked`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });

export { fixStorefrontLink };
