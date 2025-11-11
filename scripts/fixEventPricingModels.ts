#!/usr/bin/env tsx

/**
 * Fix Event Pricing Models
 * 
 * Changes all event sponsorships from 'monthly' pricing model to 'flat' pricing model.
 * Events should never use 'monthly' - they should use 'flat' (per occurrence) and let
 * the event frequency determine how often they occur.
 * 
 * Usage:
 *   npm run fix:event-pricing        # Dry run (preview changes)
 *   npm run fix:event-pricing:live   # Apply changes
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

dotenv.config();

interface FixRecord {
  publicationId: number;
  publicationName: string;
  eventName: string;
  sponsorshipName: string;
  oldPricingModel: string;
  newPricingModel: string;
}

async function fixEventPricingModels(dryRun: boolean = true) {
  console.log('\n' + '='.repeat(70));
  console.log(`  🔧 FIX EVENT PRICING MODELS ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('='.repeat(70) + '\n');

  if (dryRun) {
    console.log('ℹ️  Running in DRY RUN mode - no changes will be made');
    console.log('   Run with --live flag to apply changes\n');
  } else {
    console.log('⚠️  Running in LIVE mode - changes will be applied!\n');
  }

  const fixes: FixRecord[] = [];
  let eventsProcessed = 0;
  let sponsorshipsFixed = 0;

  try {
    await connectToDatabase();
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);

    // Create backup if running live
    if (!dryRun) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backups/event-pricing-fix-backup-${timestamp}.json`;
      
      const publications = await publicationsCollection.find({}).toArray();
      fs.writeFileSync(backupFile, JSON.stringify(publications, null, 2));
      console.log(`✅ Backup created: ${backupFile}\n`);
    }

    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Found ${publications.length} publications\n`);

    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const events = pub.distributionChannels?.events || [];

      if (events.length === 0) continue;

      let publicationUpdated = false;

      for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
        const event = events[eventIndex];
        eventsProcessed++;
        
        const sponsorships = event.advertisingOpportunities || [];

        for (let sponsorIndex = 0; sponsorIndex < sponsorships.length; sponsorIndex++) {
          const sponsorship = sponsorships[sponsorIndex];
          
          // Check if pricing model is 'monthly' (should be 'flat')
          if (sponsorship.pricing?.pricingModel === 'monthly') {
            const sponsorshipName = sponsorship.name || sponsorship.level || 'Unnamed';
            
            fixes.push({
              publicationId: pubId,
              publicationName: pubName,
              eventName: event.name || 'Unnamed Event',
              sponsorshipName,
              oldPricingModel: 'monthly',
              newPricingModel: 'flat'
            });

            console.log(`  📝 ${pubName} (ID: ${pubId})`);
            console.log(`     Event: "${event.name}"`);
            console.log(`     Sponsorship: "${sponsorshipName}"`);
            console.log(`     Changing: monthly → flat`);
            
            if (!dryRun) {
              // Update the pricing model
              events[eventIndex].advertisingOpportunities[sponsorIndex].pricing.pricingModel = 'flat';
              publicationUpdated = true;
              sponsorshipsFixed++;
            } else {
              console.log(`     (Would be updated in live mode)`);
            }
            console.log();
          }
        }
      }

      // Save changes if running live
      if (!dryRun && publicationUpdated) {
        await publicationsCollection.updateOne(
          { publicationId: pubId },
          { $set: { 'distributionChannels.events': events } }
        );
        console.log(`  ✅ Updated publication: ${pubName}\n`);
      }
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Events processed: ${eventsProcessed}`);
    console.log(`Sponsorships fixed: ${fixes.length}`);
    
    if (fixes.length > 0) {
      console.log('\nFixed sponsorships by publication:');
      const byPublication = fixes.reduce((acc, fix) => {
        acc[fix.publicationName] = (acc[fix.publicationName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(byPublication).forEach(([pubName, count]) => {
        console.log(`  - ${pubName}: ${count}`);
      });
    }

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = `reports/event-pricing-fix-${dryRun ? 'dry-run-' : ''}${timestamp}.json`;
    
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      dryRun,
      timestamp: new Date().toISOString(),
      eventsProcessed,
      sponsorshipsFixed: fixes.length,
      fixes
    }, null, 2));
    
    console.log(`\n📄 Report saved: ${reportFile}`);
    
    if (dryRun && fixes.length > 0) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npm run fix:event-pricing:live');
    } else if (!dryRun && fixes.length > 0) {
      console.log('\n✅ Fix complete!');
      console.log(`   Updated ${sponsorshipsFixed} event sponsorships`);
    } else {
      console.log('\n✅ No fixes needed - all events already use correct pricing models!');
    }
    
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isLive = args.includes('--live');

// Run fix
fixEventPricingModels(!isLive)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

