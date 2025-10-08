import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

async function checkPublication(publicationId: string | number) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!');

    // Convert to number if it's a string
    const pubId = typeof publicationId === 'string' ? parseInt(publicationId) : publicationId;
    
    console.log(`🔍 Searching for publication ID: ${pubId}`);

    // Check publications collection
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publication = await publicationsCollection.findOne({ 
      $or: [
        { publicationId: pubId },
        { _id: publicationId.toString() }
      ]
    });

    if (!publication) {
      console.log('❌ Publication not found in publications collection');
      return { found: false };
    }

    console.log('\n📰 Publication Found:');
    console.log('=' .repeat(60));
    console.log(`📄 MongoDB ID: ${publication._id}`);
    console.log(`🔢 Publication ID: ${publication.publicationId}`);
    console.log(`📰 Name: ${publication.basicInfo?.publicationName || 'N/A'}`);
    console.log(`🌐 Website: ${publication.basicInfo?.websiteUrl || 'N/A'}`);
    console.log(`📅 Founded: ${publication.basicInfo?.founded || 'N/A'}`);
    console.log(`📊 Type: ${publication.basicInfo?.publicationType || 'N/A'}`);
    console.log(`📝 Content Type: ${publication.basicInfo?.contentType || 'N/A'}`);
    console.log(`🌍 Geographic Coverage: ${publication.basicInfo?.geographicCoverage || 'N/A'}`);
    console.log(`📍 Primary Service Area: ${publication.basicInfo?.primaryServiceArea || 'N/A'}`);
    
    // Check contact info
    if (publication.contactInfo?.salesContact) {
      console.log('\n📞 Sales Contact:');
      console.log(`   👤 Name: ${publication.contactInfo.salesContact.name || 'N/A'}`);
      console.log(`   📧 Email: ${publication.contactInfo.salesContact.email || 'N/A'}`);
      console.log(`   ☎️  Phone: ${publication.contactInfo.salesContact.phone || 'N/A'}`);
    }

    // Check for storefront configuration
    const storefrontCollection = db.collection(COLLECTIONS.STOREFRONT_CONFIGURATIONS);
    const storefrontConfig = await storefrontCollection.findOne({ 
      publicationId: publication._id.toString() 
    });

    console.log('\n🏪 Storefront Configuration:');
    if (storefrontConfig) {
      console.log('✅ Storefront configuration exists!');
      console.log(`   🏪 Publisher ID: ${storefrontConfig.meta.publisher_id}`);
      console.log(`   📊 Status: ${storefrontConfig.meta.is_draft ? '🟡 DRAFT' : '🟢 PUBLISHED'}`);
      console.log(`   🔧 Active: ${storefrontConfig.isActive ? '✅' : '❌'}`);
      console.log(`   📅 Last Updated: ${storefrontConfig.meta.lastUpdated}`);
      console.log(`   🧩 Components: ${Object.keys(storefrontConfig.components).length}`);
      console.log(`   ✅ Enabled Components: ${Object.values(storefrontConfig.components).filter((c: any) => c.enabled).length}`);
      console.log(`   🎨 Primary Color: ${storefrontConfig.theme.colors.lightPrimary}`);
    } else {
      console.log('❌ No storefront configuration found');
      console.log('💡 You can create one using the admin dashboard');
    }

    // Check audience demographics
    if (publication.audienceDemographics) {
      console.log('\n👥 Audience Demographics:');
      console.log(`   📊 Total Audience: ${publication.audienceDemographics.totalAudience || 'N/A'}`);
      if (publication.audienceDemographics.ageGroups) {
        console.log('   📈 Age Groups:');
        Object.entries(publication.audienceDemographics.ageGroups).forEach(([age, percentage]) => {
          console.log(`      ${age}: ${percentage}%`);
        });
      }
    }

    // Check distribution channels
    if (publication.distributionChannels) {
      console.log('\n📡 Distribution Channels:');
      
      if (publication.distributionChannels.website) {
        console.log('   🌐 Website:');
        console.log(`      URL: ${publication.distributionChannels.website.url || 'N/A'}`);
        if (publication.distributionChannels.website.metrics) {
          console.log(`      Monthly Visitors: ${publication.distributionChannels.website.metrics.monthlyVisitors || 'N/A'}`);
          console.log(`      Page Views: ${publication.distributionChannels.website.metrics.monthlyPageViews || 'N/A'}`);
        }
      }
      
      if (publication.distributionChannels.print) {
        console.log('   📰 Print:');
        console.log(`      Frequency: ${publication.distributionChannels.print.frequency || 'N/A'}`);
        console.log(`      Circulation: ${publication.distributionChannels.print.circulation || 'N/A'}`);
      }
      
      if (publication.distributionChannels.newsletters && publication.distributionChannels.newsletters.length > 0) {
        console.log('   📧 Newsletters:');
        publication.distributionChannels.newsletters.forEach((newsletter, index) => {
          console.log(`      ${index + 1}. ${newsletter.name || 'Newsletter'}`);
          console.log(`         Subscribers: ${newsletter.subscribers || 'N/A'}`);
          console.log(`         Frequency: ${newsletter.frequency || 'N/A'}`);
        });
      }
    }

    return {
      found: true,
      publication,
      storefrontConfig,
      hasStorefront: !!storefrontConfig
    };
    
  } catch (error) {
    console.error('❌ Error checking publication:', error);
    throw error;
  }
}

// Get publication ID from command line argument or use default
const publicationId = process.argv[2] || '1038';

// Run the script
checkPublication(publicationId)
  .then((result) => {
    if (result.found) {
      console.log('\n🎉 Publication check completed successfully!');
    } else {
      console.log('\n❌ Publication not found');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });

export { checkPublication };
