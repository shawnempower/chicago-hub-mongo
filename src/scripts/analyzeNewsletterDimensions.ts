import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

interface DimensionUsage {
  dimension: string;
  count: number;
  usedBy: Array<{
    publication: string;
    newsletter: string;
    adName: string;
    position: string;
  }>;
}

async function analyzeNewsletterDimensions() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publications = await publicationsCollection.find({}).toArray();

    console.log(`📊 Analyzing ${publications.length} publications\n`);
    console.log('='.repeat(100));
    console.log('NEWSLETTER DIMENSION ANALYSIS - CURRENT VALUES');
    console.log('='.repeat(100));

    const dimensionMap = new Map<string, DimensionUsage>();
    let totalNewsletters = 0;
    let newslettersWithAds = 0;
    let totalNewsletterAds = 0;
    let adsWithoutDimensions = 0;

    publications.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const newsletters = pub.distributionChannels?.newsletters || [];

      totalNewsletters += newsletters.length;

      newsletters.forEach((newsletter: any) => {
        const newsletterName = newsletter.name || 'Unnamed Newsletter';
        const ads = newsletter.advertisingOpportunities || [];

        if (ads.length > 0) {
          newslettersWithAds++;
        }

        ads.forEach((ad: any) => {
          totalNewsletterAds++;
          const dimension = ad.dimensions || null;
          const position = ad.position || 'unknown';
          const adName = ad.name || 'Unnamed Ad';

          if (!dimension) {
            adsWithoutDimensions++;
            return;
          }

          if (!dimensionMap.has(dimension)) {
            dimensionMap.set(dimension, {
              dimension,
              count: 0,
              usedBy: []
            });
          }

          const usage = dimensionMap.get(dimension)!;
          usage.count++;
          usage.usedBy.push({
            publication: pubName,
            newsletter: newsletterName,
            adName,
            position
          });
        });
      });
    });

    // Summary Statistics
    console.log('\n📈 SUMMARY:');
    console.log('─'.repeat(100));
    console.log(`  Total Publications: ${publications.length}`);
    console.log(`  Total Newsletters: ${totalNewsletters}`);
    console.log(`  Newsletters with Ads: ${newslettersWithAds}`);
    console.log(`  Total Newsletter Ad Opportunities: ${totalNewsletterAds}`);
    console.log(`  Ads WITHOUT Dimensions: ${adsWithoutDimensions}`);
    console.log(`  Unique Dimension Values Found: ${dimensionMap.size}`);

    // Sort by count (most used first)
    const sortedDimensions = Array.from(dimensionMap.values())
      .sort((a, b) => b.count - a.count);

    // Display all unique dimension values
    console.log('\n\n📐 ALL UNIQUE DIMENSION VALUES:');
    console.log('─'.repeat(100));

    sortedDimensions.forEach((usage, index) => {
      console.log(`\n${index + 1}. "${usage.dimension}"`);
      console.log(`   Used ${usage.count} time(s)`);
      console.log('   ' + '─'.repeat(97));
      
      usage.usedBy.forEach((pub) => {
        console.log(`   • ${pub.publication}`);
        console.log(`     └─ Newsletter: "${pub.newsletter}"`);
        console.log(`     └─ Ad: "${pub.adName}" (position: ${pub.position})`);
      });
    });

    // Categorize by pattern
    console.log('\n\n📊 CATEGORIZED BY FORMAT:');
    console.log('─'.repeat(100));

    const pixelDimensions = sortedDimensions.filter(d => /^\d+x\d+$/i.test(d.dimension));
    const physicalDimensions = sortedDimensions.filter(d => /[""'']|inch/i.test(d.dimension));
    const descriptive = sortedDimensions.filter(d => 
      /full|responsive|integration|email|newsletter|edition|custom|image|words/i.test(d.dimension) &&
      !physicalDimensions.includes(d)
    );
    const other = sortedDimensions.filter(d => 
      !pixelDimensions.includes(d) && 
      !physicalDimensions.includes(d) && 
      !descriptive.includes(d)
    );

    console.log('\n🖼️  PIXEL-BASED DIMENSIONS (WxH):');
    if (pixelDimensions.length === 0) {
      console.log('   None found');
    } else {
      pixelDimensions.forEach(d => {
        console.log(`   • "${d.dimension}" (${d.count} occurrence${d.count > 1 ? 's' : ''})`);
      });
    }

    console.log('\n📏 PHYSICAL DIMENSIONS (inches):');
    if (physicalDimensions.length === 0) {
      console.log('   None found');
    } else {
      physicalDimensions.forEach(d => {
        console.log(`   • "${d.dimension}" (${d.count} occurrence${d.count > 1 ? 's' : ''})`);
      });
    }

    console.log('\n📝 DESCRIPTIVE VALUES:');
    if (descriptive.length === 0) {
      console.log('   None found');
    } else {
      descriptive.forEach(d => {
        console.log(`   • "${d.dimension}" (${d.count} occurrence${d.count > 1 ? 's' : ''})`);
      });
    }

    if (other.length > 0) {
      console.log('\n❓ OTHER/UNCLEAR:');
      other.forEach(d => {
        console.log(`   • "${d.dimension}" (${d.count} occurrence${d.count > 1 ? 's' : ''})`);
      });
    }

    if (adsWithoutDimensions > 0) {
      console.log(`\n⚠️  WARNING: ${adsWithoutDimensions} ad(s) have NO dimension value set!`);
    }

    console.log('\n\n💡 OBSERVATIONS:');
    console.log('─'.repeat(100));
    console.log('Review the values above and consider:');
    console.log('1. Which values represent the same thing but are formatted differently?');
    console.log('2. Should we establish standard formats for pixel dimensions? (e.g., "300x250")');
    console.log('3. Should we establish standard descriptive values? (e.g., "Full newsletter")');
    console.log('4. Are there any values that need clarification or correction?');

    console.log('\n' + '='.repeat(100));
    console.log('✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

analyzeNewsletterDimensions()
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });


