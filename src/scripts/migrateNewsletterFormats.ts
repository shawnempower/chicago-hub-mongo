import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import { NewsletterAdFormat, getCategory } from '../types/newsletterAdFormat';

interface MigrationResult {
  publicationId: string | number;
  publicationName: string;
  newsletterName: string;
  adName: string;
  oldDimensions: string | null;
  newDimensions: string | string[];
  category: string;
  status: 'success' | 'needs-review' | 'error';
}

// Migration mapping for known dimension variations
const DIMENSION_MIGRATION_MAP: Record<string, string> = {
  // IAB Standard - keep as-is
  "300x250": "300x250",
  "728x90": "728x90",
  "300x600": "300x600",
  "160x600": "160x600",
  "320x50": "320x50",
  "970x250": "970x250",
  "336x280": "336x280",
  "120x600": "120x600",
  
  // Email Standard - keep as-is
  "600x150": "600x150",
  "600x100": "600x100",
  "600x200": "600x200",
  "600x300": "600x300",
  "728x100": "600x100", // Normalize to email standard
  
  // Takeover variations
  "Full email": "full-newsletter",
  "Full newsletter": "full-newsletter",
  "full email": "full-newsletter",
  "Full newsletter sponsorship": "full-newsletter",
  "Full integration": "full-newsletter",
  "full edition": "full-newsletter",
  "Full edition": "full-newsletter",
  "custom": "full-newsletter", // Assume custom at dedicated position is takeover
  
  // Native
  "Text only": "text-only",
  "Text-based": "text-only",
  "text-only": "text-only",
  "250 characters": "text-only",
  "In-newsletter placement": "content-integration",
  "Thought leadership alignment": "sponsored-content",
  "News-adjacent advertising": "sponsored-content",
  "Lifestyle and entertainment brands": "sponsored-content",
  
  // Responsive
  "600px wide, responsive": "responsive",
  "Flexible": "responsive",
  "Responsive": "responsive",
  "responsive (600px width or phone screen)": "responsive",
  
  // Contact-based - needs review
  "Contact for details": "custom",
  "Contact for specifications": "custom",
  
  // Vague - needs review
  "multiple": "NEEDS_REVIEW",
  "Display ads within content": "NEEDS_REVIEW",
  "Email series": "NEEDS_REVIEW",
};

async function migrateNewsletterFormats(dryRun: boolean = true) {
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
    const publications = await publicationsCollection.find({}).toArray();

    console.log(`📊 Analyzing ${publications.length} publications\n`);
    console.log('='.repeat(100));

    const results: MigrationResult[] = [];
    let publicationsUpdated = 0;
    let adsUpdated = 0;
    let needsReview = 0;

    for (const pub of publications) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const pubId = pub.publicationId || pub._id;
      const newsletters = pub.distributionChannels?.newsletters || [];
      let pubNeedsUpdate = false;

      newsletters.forEach((newsletter: any, nlIdx: number) => {
        const newsletterName = newsletter.name || 'Unnamed Newsletter';
        const ads = newsletter.advertisingOpportunities || [];

        ads.forEach((ad: any, adIdx: number) => {
          const oldDimensions = ad.dimensions;
          const adPosition = ad.position;
          
          // Skip if already has format
          if (ad.format?.dimensions) {
            return;
          }

          // Handle missing dimensions
          if (!oldDimensions) {
            // If position is dedicated, assume takeover
            const newDimensions = adPosition === 'dedicated' ? 'full-newsletter' : 'NEEDS_REVIEW';
            const status = adPosition === 'dedicated' ? 'success' : 'needs-review';
            
            results.push({
              publicationId: pubId,
              publicationName: pubName,
              newsletterName,
              adName: ad.name || 'Unnamed Ad',
              oldDimensions: null,
              newDimensions,
              category: getCategory(newDimensions),
              status
            });
            
            if (status === 'needs-review') {
              needsReview++;
            } else if (!dryRun) {
              newsletters[nlIdx].advertisingOpportunities[adIdx].format = { dimensions: newDimensions };
              pubNeedsUpdate = true;
              adsUpdated++;
            }
            return;
          }

          // Try to find in migration map
          let newDimensions = DIMENSION_MIGRATION_MAP[oldDimensions];

          // If not in map, try to infer
          if (!newDimensions) {
            newDimensions = inferDimensions(oldDimensions, adPosition);
          }

          // Determine status
          const status = newDimensions === 'NEEDS_REVIEW' ? 'needs-review' : 'success';

          const category = status === 'success' 
            ? getCategory(Array.isArray(newDimensions) ? newDimensions[0] : newDimensions) 
            : 'unknown';

          results.push({
            publicationId: pubId,
            publicationName: pubName,
            newsletterName,
            adName: ad.name || 'Unnamed Ad',
            oldDimensions,
            newDimensions,
            category,
            status
          });

          if (status === 'needs-review') {
            needsReview++;
          } else if (!dryRun) {
            newsletters[nlIdx].advertisingOpportunities[adIdx].format = { dimensions: newDimensions };
            pubNeedsUpdate = true;
            adsUpdated++;
          }
        });
      });

      // Update publication if needed
      if (pubNeedsUpdate && !dryRun) {
        await publicationsCollection.updateOne(
          { _id: pub._id },
          { $set: { 'distributionChannels.newsletters': newsletters } }
        );
        publicationsUpdated++;
      }
    }

    // Display results
    console.log('\n📋 MIGRATION RESULTS:');
    console.log('─'.repeat(100));

    // Show successful migrations by category
    const successful = results.filter(r => r.status === 'success');
    console.log(`\n✅ Successfully mapped: ${successful.length}`);
    
    if (successful.length > 0) {
      const byCategory = successful.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n   By category:');
      Object.entries(byCategory).forEach(([category, count]) => {
        console.log(`   • ${category}: ${count}`);
      });
    }
    
    // Show items needing review
    const review = results.filter(r => r.status === 'needs-review');
    if (review.length > 0) {
      console.log(`\n⚠️  Needs Manual Review: ${review.length}`);
      console.log('   These ads require manual inspection and update:');
      review.forEach((r, idx) => {
        console.log(`\n   ${idx + 1}. ${r.publicationName}`);
        console.log(`      Newsletter: "${r.newsletterName}"`);
        console.log(`      Ad: "${r.adName}"`);
        console.log(`      Current: "${r.oldDimensions || 'MISSING'}"`);
        console.log(`      Suggested: Review and set appropriate dimensions`);
      });
    }

    console.log('\n\n📊 SUMMARY:');
    console.log('─'.repeat(100));
    console.log(`  Total Ads Processed: ${results.length}`);
    console.log(`  Successfully Mapped: ${successful.length}`);
    console.log(`  Needs Manual Review: ${needsReview}`);
    
    if (!dryRun) {
      console.log(`  Publications Updated: ${publicationsUpdated}`);
      console.log(`  Ads Updated: ${adsUpdated}`);
    }

    if (dryRun && results.length > 0) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npx tsx src/scripts/migrateNewsletterFormats.ts --apply');
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

/**
 * Infer dimensions from old dimension string and position
 * Returns either a single string or array of strings for multiple dimensions
 */
function inferDimensions(dimensions: string, position?: string): string | string[] {
  // Try to parse as pixel dimensions
  const pixelMatch = dimensions.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
  if (pixelMatch) {
    // Keep pixel dimensions as-is, category will be inferred
    return dimensions;
  }
  
  // Multiple sizes - parse and standardize
  if (dimensions.includes(',') || dimensions.includes('/') || dimensions.toLowerCase().includes(' or ')) {
    const separators = /[,\/]|\s+or\s+/i;
    const sizes = dimensions.split(separators)
      .map(s => s.trim())
      .filter(s => s)
      .map(s => {
        // Try to standardize each size
        const match = s.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
        if (match) return s;
        // Check if it's a known standard
        return DIMENSION_MIGRATION_MAP[s] || s;
      });
    
    // Return array if we have valid multiple sizes
    if (sizes.length > 1 && sizes.every(s => s !== 'NEEDS_REVIEW')) {
      return sizes;
    }
  }
  
  // Check for full newsletter patterns
  if (/full|takeover|dedicated|edition|integration/i.test(dimensions)) {
    return 'full-newsletter';
  }
  
  // Check for responsive patterns
  if (/responsive|flexible|fluid/i.test(dimensions)) {
    return 'responsive';
  }
  
  // Check for native patterns
  if (/text|content|sponsored|native/i.test(dimensions)) {
    return 'text-only';
  }
  
  // Check for character limits
  if (/\d+\s*character/i.test(dimensions)) {
    return 'text-only';
  }
  
  // If dedicated position and unclear, assume takeover
  if (position === 'dedicated') {
    return 'full-newsletter';
  }
  
  // Everything else needs review
  return 'NEEDS_REVIEW';
}

const isApply = process.argv.includes('--apply');

migrateNewsletterFormats(!isApply)
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });

