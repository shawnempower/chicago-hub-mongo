import 'dotenv/config';
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

async function fixRemainingPricingModel() {
  console.log('🔧 Fixing remaining pricing model issue for Streetsblog Chicago...\n');
  
  try {
    await connectToDatabase();
    const db = getDatabase();
    console.log('✅ Connected to MongoDB\n');
    
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Find Streetsblog Chicago
    const publication = await publicationsCollection.findOne({ publicationId: 4006 });
    
    if (!publication) {
      console.log('❌ Publication not found');
      return;
    }
    
    console.log(`📰 Found: ${publication.basicInfo?.publicationName}\n`);
    
    // Get the Post Sponsorship item (index 2)
    const websiteAds = publication.distributionChannels?.website?.advertisingOpportunities;
    
    if (!websiteAds || !websiteAds[2]) {
      console.log('❌ Post Sponsorship item not found at index 2');
      return;
    }
    
    const item = websiteAds[2];
    console.log(`📝 Item: ${item.name}`);
    console.log(`   Default pricing model: ${item.pricing?.pricingModel || 'N/A'}`);
    console.log(`   Hub pricing entries: ${item.hubPricing?.length || 0}\n`);
    
    let fixed = 0;
    
    // Check each hub pricing entry
    if (item.hubPricing && Array.isArray(item.hubPricing)) {
      for (let i = 0; i < item.hubPricing.length; i++) {
        const hubPrice = item.hubPricing[i];
        
        if (hubPrice.pricing && !hubPrice.pricing.pricingModel) {
          console.log(`   ⚠️  Hub ${i + 1} (${hubPrice.hubName}) missing pricingModel`);
          
          if (item.pricing?.pricingModel) {
            hubPrice.pricing.pricingModel = item.pricing.pricingModel;
            console.log(`   ✅ Set pricingModel to: ${item.pricing.pricingModel}`);
            fixed++;
          }
        }
      }
    }
    
    if (fixed > 0) {
      // Update the publication
      await publicationsCollection.updateOne(
        { _id: publication._id },
        { $set: { 'distributionChannels.website.advertisingOpportunities.2.hubPricing': item.hubPricing } }
      );
      
      console.log(`\n✅ Fixed ${fixed} hub pricing ${fixed === 1 ? 'entry' : 'entries'}`);
      console.log('💾 Changes saved to database');
    } else {
      console.log('\n✅ No issues found - all hub pricing entries have pricingModel');
    }
    
    await closeConnection();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
fixRemainingPricingModel()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

