import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';

/**
 * Migration script to standardize newsletter frequency values
 */

// Mapping of non-standard values to standard enum values
const FREQUENCY_MIGRATION_MAP: Record<string, string> = {
  // Non-standard values found in database
  'custom': 'on-demand',          // Chicago Reader: Full List Blast - sent on demand
  'Custom': 'on-demand',          // Chicago Reader: Full List Blast - sent on demand (capitalized)
  '6 times a week': 'daily',      // WBEZ: The Rundown - 6x/week is effectively daily
  
  // Additional common variations (for future-proofing)
  'CUSTOM': 'on-demand',
  'Daily': 'daily',
  'DAILY': 'daily',
  'Weekly': 'weekly',
  'WEEKLY': 'weekly',
  'Bi-Weekly': 'bi-weekly',
  'Bi-weekly': 'bi-weekly',
  'BiWeekly': 'bi-weekly',
  'Monthly': 'monthly',
  'MONTHLY': 'monthly',
  'Irregular': 'irregular',
  'IRREGULAR': 'irregular',
  'Quarterly': 'irregular',
  'quarterly': 'irregular',
  'Every other week': 'bi-weekly',
  'Twice a month': 'bi-weekly',
  '2x/month': 'bi-weekly',
  'Once a week': 'weekly',
  '1x/week': 'weekly',
  'Once a month': 'monthly',
  '1x/month': 'monthly',
  'Varies': 'irregular',
  'Variable': 'irregular',
  'As needed': 'irregular',
  'Ad hoc': 'irregular',
  'Sporadic': 'irregular',
};

interface MigrationResult {
  publicationId: string | number;
  publicationName: string;
  newsletterName: string;
  oldFrequency: string;
  newFrequency: string;
  status: 'migrated' | 'already-standard' | 'skipped';
}

async function migrateNewsletterFrequencies(dryRun: boolean = true) {
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
      'distributionChannels.newsletters': { $exists: true, $ne: [] }
    }).toArray();

    console.log(`📊 Processing ${publications.length} publications with newsletters\n`);
    console.log('='.repeat(80));

    const results: MigrationResult[] = [];
    const standardValues = ['daily', 'weekly', 'bi-weekly', 'monthly', 'irregular', 'on-demand'];
    let publicationsUpdated = 0;
    let newslettersMigrated = 0;

    for (const pub of publications) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const pubId = pub.publicationId || pub._id;
      const newsletters = pub.distributionChannels?.newsletters || [];
      let pubNeedsUpdate = false;

      newsletters.forEach((newsletter: any, idx: number) => {
        const newsletterName = newsletter.name || 'Unnamed Newsletter';
        const oldFrequency = newsletter.frequency;

        // Skip if no frequency set
        if (!oldFrequency) {
          return;
        }

        const normalizedOld = String(oldFrequency).trim();

        // Check if already standard
        if (standardValues.includes(normalizedOld)) {
          results.push({
            publicationId: pubId,
            publicationName: pubName,
            newsletterName,
            oldFrequency: normalizedOld,
            newFrequency: normalizedOld,
            status: 'already-standard'
          });
          return;
        }

        // Try to find mapping
        const newFrequency = FREQUENCY_MIGRATION_MAP[normalizedOld];

        if (newFrequency) {
          results.push({
            publicationId: pubId,
            publicationName: pubName,
            newsletterName,
            oldFrequency: normalizedOld,
            newFrequency,
            status: 'migrated'
          });

          // Apply migration if not dry run
          if (!dryRun) {
            newsletters[idx].frequency = newFrequency;
            pubNeedsUpdate = true;
            newslettersMigrated++;
          }
        } else {
          results.push({
            publicationId: pubId,
            publicationName: pubName,
            newsletterName,
            oldFrequency: normalizedOld,
            newFrequency: 'NEEDS MANUAL REVIEW',
            status: 'skipped'
          });
        }
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
    console.log('\n📋 MIGRATION RESULTS:\n');
    console.log('─'.repeat(80));

    const migratedResults = results.filter(r => r.status === 'migrated');
    const standardResults = results.filter(r => r.status === 'already-standard');
    const skippedResults = results.filter(r => r.status === 'skipped');

    if (migratedResults.length > 0) {
      console.log(`\n✅ TO BE MIGRATED: ${migratedResults.length}`);
      migratedResults.forEach((r) => {
        console.log(`\n   ${r.publicationName}`);
        console.log(`   Newsletter: "${r.newsletterName}"`);
        console.log(`   Change: "${r.oldFrequency}" → "${r.newFrequency}"`);
      });
    }

    if (standardResults.length > 0) {
      console.log(`\n\n✨ ALREADY STANDARD: ${standardResults.length}`);
      console.log('   (No changes needed)');
    }

    if (skippedResults.length > 0) {
      console.log(`\n\n⚠️  NEEDS MANUAL REVIEW: ${skippedResults.length}`);
      skippedResults.forEach((r) => {
        console.log(`\n   ${r.publicationName}`);
        console.log(`   Newsletter: "${r.newsletterName}"`);
        console.log(`   Current value: "${r.oldFrequency}"`);
        console.log(`   → Please manually update this value`);
      });
    }

    console.log('\n\n📊 SUMMARY:\n');
    console.log('─'.repeat(80));
    console.log(`Total Newsletters Processed: ${results.length}`);
    console.log(`Already Standard: ${standardResults.length}`);
    console.log(`To Be Migrated: ${migratedResults.length}`);
    console.log(`Needs Manual Review: ${skippedResults.length}`);

    if (!dryRun) {
      console.log(`\nPublications Updated: ${publicationsUpdated}`);
      console.log(`Newsletters Migrated: ${newslettersMigrated}`);
    }

    if (dryRun && migratedResults.length > 0) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npx tsx src/scripts/migrateNewsletterFrequencies.ts --apply');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Parse command line args
const isApply = process.argv.includes('--apply');

migrateNewsletterFrequencies(!isApply)
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });

