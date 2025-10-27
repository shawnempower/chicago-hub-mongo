import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

/**
 * Migration script to populate format.dimensions for website advertising opportunities
 * Similar to newsletter formats migration but for website ads
 */

interface MigrationResult {
  publicationId: string;
  publicationName: string;
  adName: string;
  oldSizes: string[];
  newDimensions: string | string[];
  category: string;
  status: 'success' | 'review';
}

// IAB standard sizes
const IAB_SIZES = [
  '728x90',    // Leaderboard
  '970x90',    // Super Leaderboard
  '300x250',   // Medium Rectangle
  '336x280',   // Large Rectangle
  '300x600',   // Half Page / Wide Skyscraper
  '160x600',   // Wide Skyscraper
  '120x600',   // Skyscraper
  '970x250',   // Billboard
  '250x250',   // Square
  '200x200',   // Small Square
  '180x150',   // Small Rectangle
  '125x125',   // Button
  '320x50',    // Mobile Leaderboard
  '320x100',   // Large Mobile Banner
  '300x50',    // Mobile Banner
  '468x60',    // Full Banner
];

function inferDimensions(sizes: string[], adFormat?: string): string | string[] {
  if (!sizes || sizes.length === 0) {
    return 'NEEDS_REVIEW';
  }

  // Handle single size
  if (sizes.length === 1) {
    const size = sizes[0].trim();
    
    // Check for special text indicators
    const lowerSize = size.toLowerCase();
    
    // Native/Content ads
    if (lowerSize === 'article' || lowerSize.includes('article') ||
        lowerSize === 'sponsored content' || lowerSize.includes('sponsored') ||
        lowerSize.includes('native') || lowerSize.includes('in-story')) {
      return 'native-inline';
    }
    
    // Text-based descriptions that are too vague
    if (lowerSize === 'multiple ad placements' || 
        lowerSize === 'standard banner dimensions' ||
        lowerSize === 'custom' ||
        lowerSize === 'various') {
      return 'NEEDS_REVIEW';
    }
    
    // Check if it's a pixel dimension (with or without "px")
    const pixelMatch = size.match(/^(\d+)\s*[xX×]\s*(\d+)(?:px)?$/);
    if (pixelMatch) {
      const width = parseInt(pixelMatch[1]);
      const height = parseInt(pixelMatch[2]);
      const normalized = `${width}x${height}`;
      
      // Check if it's IAB standard
      if (IAB_SIZES.includes(normalized)) {
        return normalized;
      }
      
      // Custom display size
      return normalized;
    }
    
    return 'NEEDS_REVIEW';
  }

  // Handle multiple sizes
  const normalizedSizes: string[] = [];
  
  for (const size of sizes) {
    const trimmed = size.trim();
    const lowerSize = trimmed.toLowerCase();
    
    // Skip vague descriptions in multi-size arrays
    if (lowerSize === 'article' || lowerSize === 'multiple ad placements' ||
        lowerSize === 'standard banner dimensions' || lowerSize === 'custom') {
      continue;
    }
    
    // Try to extract pixel dimensions
    const pixelMatch = trimmed.match(/^(\d+)\s*[xX×]\s*(\d+)(?:px)?$/);
    if (pixelMatch) {
      const width = parseInt(pixelMatch[1]);
      const height = parseInt(pixelMatch[2]);
      normalizedSizes.push(`${width}x${height}`);
    }
  }
  
  if (normalizedSizes.length === 0) {
    return 'NEEDS_REVIEW';
  }
  
  if (normalizedSizes.length === 1) {
    return normalizedSizes[0];
  }
  
  // Return array of sizes
  return normalizedSizes;
}

function getCategory(dimensions: string | string[]): string {
  if (dimensions === 'NEEDS_REVIEW') return 'needs-review';
  
  const dim = Array.isArray(dimensions) ? dimensions[0] : dimensions;
  
  // Native/responsive
  if (dim.startsWith('native-')) return 'native';
  if (dim.startsWith('responsive-')) return 'responsive';
  
  // Check if IAB standard
  if (IAB_SIZES.includes(dim)) return 'iab-standard';
  
  // Custom display
  if (dim.match(/^\d+x\d+$/)) return 'custom-display';
  
  return 'unknown';
}

async function migrateWebsiteFormats(dryRun: boolean = true) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    
    const db = getDatabase();
    console.log('✅ Connected successfully!\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  LIVE MODE - Changes will be applied!\n');
    }

    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    const publications = await publicationsCollection.find({
      'distributionChannels.website.advertisingOpportunities': { $exists: true, $ne: [] }
    }).toArray();

    console.log(`📊 Analyzing ${publications.length} publications\n`);
    console.log('='.repeat(100));

    const results: MigrationResult[] = [];
    const categoryCount: Record<string, number> = {};

    for (const pub of publications) {
      const pubId = pub._id.toString();
      const pubName = pub.basicInfo?.publicationName || 'Unknown Publication';
      const websiteAds = pub.distributionChannels?.website?.advertisingOpportunities || [];

      for (const ad of websiteAds) {
        // Skip if already has format.dimensions
        if (ad.format?.dimensions) {
          continue;
        }

        const adName = ad.name || 'Unnamed Ad';
        const sizes = ad.sizes || (ad.specifications?.size ? [ad.specifications.size] : []);
        
        if (sizes.length === 0) {
          continue;
        }

        const newDimensions = inferDimensions(sizes, ad.adFormat);
        const category = getCategory(newDimensions);
        
        categoryCount[category] = (categoryCount[category] || 0) + 1;

        results.push({
          publicationId: pubId,
          publicationName: pubName,
          adName,
          oldSizes: sizes,
          newDimensions,
          category,
          status: newDimensions === 'NEEDS_REVIEW' ? 'review' : 'success'
        });
      }
    }

    // Separate successful and needs-review
    const successful = results.filter(r => r.status === 'success');
    const needsReview = results.filter(r => r.status === 'review');

    console.log('\n📋 MIGRATION RESULTS:');
    console.log('─'.repeat(100));

    if (successful.length > 0) {
      console.log(`\n✅ Successfully mapped: ${successful.length}\n`);
      console.log('   By category:');
      Object.entries(categoryCount).forEach(([cat, count]) => {
        if (cat !== 'needs-review') {
          console.log(`   • ${cat}: ${count}`);
        }
      });
    }

    if (needsReview.length > 0) {
      console.log(`\n\n⚠️  Needs Manual Review: ${needsReview.length}`);
      console.log('   These ads require manual inspection and update:\n');
      
      needsReview.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.publicationName}`);
        console.log(`      Ad: "${result.adName}"`);
        console.log(`      Current sizes: ${result.oldSizes.join(', ')}`);
        console.log(`      Suggested: Review and set appropriate dimensions\n`);
      });
    }

    console.log('\n\n📊 SUMMARY:');
    console.log('─'.repeat(100));
    console.log(`  Total Ads Processed: ${results.length}`);
    console.log(`  Successfully Mapped: ${successful.length}`);
    console.log(`  Needs Manual Review: ${needsReview.length}`);

    if (!dryRun && successful.length > 0) {
      console.log('\n\n✍️  Applying changes...\n');
      
      let updatedCount = 0;
      
      for (const pub of publications) {
        const websiteAds = pub.distributionChannels?.website?.advertisingOpportunities || [];
        let modified = false;

        for (let i = 0; i < websiteAds.length; i++) {
          const ad = websiteAds[i];
          
          // Skip if already has format.dimensions
          if (ad.format?.dimensions) {
            continue;
          }

          const sizes = ad.sizes || (ad.specifications?.size ? [ad.specifications.size] : []);
          if (sizes.length === 0) {
            continue;
          }

          const newDimensions = inferDimensions(sizes, ad.adFormat);
          
          if (newDimensions !== 'NEEDS_REVIEW') {
            // Add format object with dimensions
            websiteAds[i] = {
              ...ad,
              format: {
                dimensions: newDimensions
              }
            };
            modified = true;
          }
        }

        if (modified) {
          await publicationsCollection.updateOne(
            { _id: pub._id },
            { $set: { 'distributionChannels.website.advertisingOpportunities': websiteAds } }
          );
          updatedCount++;
          console.log(`✅ Updated: ${pub.basicInfo?.publicationName || pub._id}`);
        }
      }

      console.log(`\n\n📊 SUMMARY:`);
      console.log('─'.repeat(100));
      console.log(`  Publications Updated: ${updatedCount}`);
      console.log(`  Ads Updated: ${successful.length}`);
    }

    if (dryRun) {
      console.log('\n\n💡 To apply these changes, run:');
      console.log('   npx tsx src/scripts/migrateWebsiteFormats.ts --apply\n');
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ Migration analysis completed!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Check for --apply flag
const applyChanges = process.argv.includes('--apply');

// Run the migration
migrateWebsiteFormats(!applyChanges)
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

