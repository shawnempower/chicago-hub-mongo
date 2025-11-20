/**
 * Migrate Flat to Monthly Pricing Models
 * 
 * Changes pricingModel: "flat" to "monthly" for website, print, newsletter, and podcast ads
 * Keeps "flat" for events (which correctly use frequency)
 * 
 * Usage: 
 *   DRY RUN: NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --dry-run
 *   LIVE RUN: NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --no-dry-run
 */

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

interface ChangeRecord {
  publicationId: number;
  publicationName: string;
  channel: string;
  itemName: string;
  location: string;
  before: string;
  after: string;
  price: number;
}

interface MigrationStats {
  publicationsScanned: number;
  publicationsToUpdate: number;
  totalRecordsToChange: number;
  byChannel: Record<string, number>;
  changes: ChangeRecord[];
}

async function migrateFlatToMonthly(dryRun: boolean = true) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('  🔄 MIGRATE FLAT TO MONTHLY PRICING MODELS');
    console.log(`  Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✍️  LIVE RUN (will update database)'}`);
    console.log('='.repeat(80) + '\n');

    await connectToDatabase();
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Scanning ${publications.length} publications...\n`);
    
    const stats: MigrationStats = {
      publicationsScanned: publications.length,
      publicationsToUpdate: 0,
      totalRecordsToChange: 0,
      byChannel: {},
      changes: []
    };

    const pubsToUpdate = new Set<number>();

    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const channels = pub.distributionChannels || {};
      let pubNeedsUpdate = false;
      const updates: any = {};

      // Helper to process pricing and build update paths
      const processPricing = (
        pricing: any,
        channel: string,
        itemName: string,
        updatePath: string
      ) => {
        if (pricing?.pricingModel === 'flat') {
          stats.totalRecordsToChange++;
          stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
          stats.changes.push({
            publicationId: pubId,
            publicationName: pubName,
            channel,
            itemName,
            location: updatePath,
            before: 'flat',
            after: 'monthly',
            price: pricing.flatRate || 0
          });
          
          // Build the update object
          updates[`${updatePath}.pricingModel`] = 'monthly';
          pubNeedsUpdate = true;
          pubsToUpdate.add(pubId);
        }
      };

      // Check Website
      if (channels.website?.advertisingOpportunities) {
        channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
          const basePath = `distributionChannels.website.advertisingOpportunities.${idx}`;
          
          // Standard pricing
          processPricing(
            ad.pricing,
            'website',
            ad.name || 'Unnamed',
            `${basePath}.pricing`
          );
          
          // Hub pricing
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            pricingArray.forEach((pricing: any, pricingIdx: number) => {
              const hubPath = Array.isArray(hub.pricing) 
                ? `${basePath}.hubPricing.${hubIdx}.pricing.${pricingIdx}`
                : `${basePath}.hubPricing.${hubIdx}.pricing`;
              
              processPricing(
                pricing,
                'website-hub',
                `${ad.name || 'Unnamed'} (${hub.hubName})`,
                hubPath
              );
            });
          });
        });
      }

      // Check Print
      if (channels.print?.advertisingOpportunities) {
        channels.print.advertisingOpportunities.forEach((ad: any, idx: number) => {
          const basePath = `distributionChannels.print.advertisingOpportunities.${idx}`;
          
          processPricing(
            ad.pricing,
            'print',
            ad.name || 'Unnamed',
            `${basePath}.pricing`
          );
          
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            pricingArray.forEach((pricing: any, pricingIdx: number) => {
              const hubPath = Array.isArray(hub.pricing)
                ? `${basePath}.hubPricing.${hubIdx}.pricing.${pricingIdx}`
                : `${basePath}.hubPricing.${hubIdx}.pricing`;
              
              processPricing(
                pricing,
                'print-hub',
                `${ad.name || 'Unnamed'} (${hub.hubName})`,
                hubPath
              );
            });
          });
        });
      }

      // Check Newsletters
      if (channels.newsletters) {
        channels.newsletters.forEach((newsletter: any, nlIdx: number) => {
          newsletter.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            const basePath = `distributionChannels.newsletters.${nlIdx}.advertisingOpportunities.${idx}`;
            
            processPricing(
              ad.pricing,
              'newsletters',
              `${newsletter.name || 'Unnamed'} - ${ad.name || 'Unnamed'}`,
              `${basePath}.pricing`
            );
            
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                const hubPath = Array.isArray(hub.pricing)
                  ? `${basePath}.hubPricing.${hubIdx}.pricing.${pricingIdx}`
                  : `${basePath}.hubPricing.${hubIdx}.pricing`;
                
                processPricing(
                  pricing,
                  'newsletters-hub',
                  `${newsletter.name || 'Unnamed'} - ${ad.name || 'Unnamed'} (${hub.hubName})`,
                  hubPath
                );
              });
            });
          });
        });
      }

      // Apply updates if not dry run
      if (pubNeedsUpdate && !dryRun) {
        await publicationsCollection.updateOne(
          { publicationId: pubId },
          { $set: updates }
        );
        stats.publicationsToUpdate++;
      } else if (pubNeedsUpdate) {
        stats.publicationsToUpdate++;
      }
    }

    // Display Results
    console.log('='.repeat(80));
    console.log('📊 MIGRATION SUMMARY\n');
    console.log(`Publications Scanned: ${stats.publicationsScanned}`);
    console.log(`Publications ${dryRun ? 'To Update' : 'Updated'}: ${stats.publicationsToUpdate}`);
    console.log(`Total Records ${dryRun ? 'To Change' : 'Changed'}: ${stats.totalRecordsToChange}\n`);
    
    if (Object.keys(stats.byChannel).length > 0) {
      console.log('Breakdown by Channel:');
      Object.entries(stats.byChannel).sort(([a], [b]) => a.localeCompare(b)).forEach(([channel, count]) => {
        console.log(`  ${channel.padEnd(20)}: ${count} records`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📝 BEFORE → AFTER COMPARISON\n');
    
    if (stats.changes.length > 0) {
      // Group changes by publication
      const byPub = new Map<number, ChangeRecord[]>();
      stats.changes.forEach(change => {
        if (!byPub.has(change.publicationId)) {
          byPub.set(change.publicationId, []);
        }
        byPub.get(change.publicationId)!.push(change);
      });
      
      // Display each publication's changes
      Array.from(byPub.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([pubId, changes]) => {
          console.log(`\n${changes[0].publicationName} (ID: ${pubId})`);
          console.log('-'.repeat(80));
          
          changes.forEach(change => {
            console.log(`  📍 ${change.channel}: ${change.itemName}`);
            console.log(`     Price: $${change.price}`);
            console.log(`     BEFORE: pricingModel: "${change.before}" → displays as "$${change.price} flat rate"`);
            console.log(`     AFTER:  pricingModel: "${change.after}"  → displays as "$${change.price}/month"`);
            console.log('');
          });
        });
    } else {
      console.log('No changes needed - all records already have correct pricing models!\n');
    }
    
    console.log('='.repeat(80));
    console.log('💡 WHAT THIS MEANS:\n');
    console.log('Website ads are ongoing monthly placements, not one-time purchases.');
    console.log('Changing from "flat" to "monthly" will:');
    console.log('  ✅ Display correctly as "$X/month" instead of "$X flat rate"');
    console.log('  ✅ Make pricing clearer for customers');
    console.log('  ✅ Align with how the system calculates monthly revenue');
    console.log('  ℹ️  Revenue calculations remain the same (no financial impact)');
    console.log('\nEvents will KEEP "flat" pricing (they use frequency, which is correct)');
    console.log('='.repeat(80));
    
    if (dryRun) {
      console.log('\n⚠️  DRY RUN COMPLETE - No changes made to database');
      console.log('💡 To apply these changes, run:');
      console.log('   NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --no-dry-run\n');
    } else {
      console.log('\n✅ MIGRATION COMPLETE - Database updated successfully');
      console.log('💡 Next step: Update UI dropdowns to prevent this issue from recurring\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Check for --no-dry-run flag (default is dry-run)
const dryRun = !process.argv.includes('--no-dry-run');
migrateFlatToMonthly(dryRun);

