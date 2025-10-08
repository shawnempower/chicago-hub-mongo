import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function checkStorefrontSetup() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    const collectionName = COLLECTIONS.STOREFRONT_CONFIGURATIONS;
    const collection = db.collection(collectionName);

    // Check collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log('❌ Storefront configurations collection does not exist!');
      return;
    }
    
    console.log('✅ Storefront configurations collection exists');

    // Get collection stats
    const count = await collection.countDocuments();
    console.log(`📊 Collection has ${count} documents`);

    // List all configurations with details
    const configs = await collection.find({}).toArray();
    
    console.log('\n📋 Storefront Configurations:');
    console.log('=' .repeat(60));
    
    for (const config of configs) {
      console.log(`🏪 ${config.meta.publisher_id}`);
      console.log(`   📄 Publication ID: ${config.publicationId}`);
      console.log(`   📝 Description: ${config.meta.description}`);
      console.log(`   📅 Last Updated: ${config.meta.lastUpdated}`);
      console.log(`   🎨 Primary Color: ${config.theme.colors.lightPrimary}`);
      console.log(`   📱 Components: ${Object.keys(config.components).length}`);
      console.log(`   ✅ Enabled Components: ${Object.values(config.components).filter((c: any) => c.enabled).length}`);
      console.log(`   📊 Status: ${config.meta.is_draft ? '🟡 DRAFT' : '🟢 PUBLISHED'}`);
      console.log(`   🔧 Active: ${config.isActive ? '✅' : '❌'}`);
      
      // Show component details
      console.log('   🧩 Components:');
      Object.entries(config.components).forEach(([name, component]: [string, any]) => {
        const status = component.enabled ? '✅' : '❌';
        console.log(`      ${status} ${name} (order: ${component.order})`);
      });
      
      console.log('   ' + '-'.repeat(50));
    }

    // Check indexes
    const indexes = await collection.indexes();
    console.log('\n🔍 Collection Indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    return {
      success: true,
      collectionExists: true,
      documentCount: count,
      configurations: configs.map(c => ({
        id: c._id,
        publisherId: c.meta.publisher_id,
        publicationId: c.publicationId,
        isDraft: c.meta.is_draft,
        isActive: c.isActive,
        componentCount: Object.keys(c.components).length,
        enabledComponents: Object.values(c.components).filter((comp: any) => comp.enabled).length
      }))
    };
    
  } catch (error) {
    console.error('❌ Error checking storefront setup:', error);
    throw error;
  }
}

// Run the script
checkStorefrontSetup()
  .then((result) => {
    console.log('\n🎉 Storefront setup check completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup check failed:', error);
    process.exit(1);
  });

export { checkStorefrontSetup };
