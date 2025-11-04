#!/usr/bin/env node
/**
 * Check Migration Needs
 * Analyzes live MongoDB data to determine if migration is needed
 */

import { config } from 'dotenv';
config();

import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/index.js';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas.js';

interface MigrationReport {
  newsletters: {
    total: number;
    withOldFormat: number; // Has perSend/monthly fields
    withNewFormat: number; // Has flatRate+pricingModel
    needsMigration: string[];
  };
  events: {
    total: number;
    withOldFormat: number; // pricing is a number
    withNewFormat: number; // pricing is an object
    needsMigration: string[];
  };
  streaming: {
    total: number;
    withHubPricing: number;
    withoutHubPricing: number;
    withFrequency: number;
    withoutFrequency: number;
    needsHubPricingMigration: string[];
    needsFrequencyMigration: string[];
  };
}

async function checkMigrationNeeds() {
  console.log('\n' + '='.repeat(70));
  console.log('  📊 MIGRATION NEEDS ASSESSMENT');
  console.log('='.repeat(70) + '\n');

  try {
    await connectToDatabase();
    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);

    const report: MigrationReport = {
      newsletters: {
        total: 0,
        withOldFormat: 0,
        withNewFormat: 0,
        needsMigration: []
      },
      events: {
        total: 0,
        withOldFormat: 0,
        withNewFormat: 0,
        needsMigration: []
      },
      streaming: {
        total: 0,
        withHubPricing: 0,
        withoutHubPricing: 0,
        withFrequency: 0,
        withoutFrequency: 0,
        needsHubPricingMigration: [],
        needsFrequencyMigration: []
      }
    };

    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Found ${publications.length} publications in database\n`);

    for (const pub of publications) {
      const pubName = pub.basicInfo?.publicationName || pub._id;

      // Check newsletters
      if (pub.distributionChannels?.newsletters) {
        for (const newsletter of pub.distributionChannels.newsletters) {
          if (newsletter.advertisingOpportunities) {
            for (const ad of newsletter.advertisingOpportunities) {
              report.newsletters.total++;
              
              if (ad.pricing) {
                // Check for old format
                if ('perSend' in ad.pricing || 'monthly' in ad.pricing) {
                  report.newsletters.withOldFormat++;
                  report.newsletters.needsMigration.push(`${pubName} - ${newsletter.name} - ${ad.name}`);
                }
                // Check for new format
                if ('flatRate' in ad.pricing && 'pricingModel' in ad.pricing) {
                  report.newsletters.withNewFormat++;
                }
              }
            }
          }
        }
      }

      // Check events
      if (pub.distributionChannels?.events) {
        for (const event of pub.distributionChannels.events) {
          if (event.advertisingOpportunities) {
            for (const ad of event.advertisingOpportunities) {
              report.events.total++;
              
              if (ad.pricing) {
                // Check if pricing is a number (old format)
                if (typeof ad.pricing === 'number') {
                  report.events.withOldFormat++;
                  report.events.needsMigration.push(`${pubName} - ${event.name} - ${ad.level}`);
                }
                // Check if pricing is an object (new format)
                if (typeof ad.pricing === 'object' && 'flatRate' in ad.pricing && 'pricingModel' in ad.pricing) {
                  report.events.withNewFormat++;
                }
              }
            }
          }
        }
      }

      // Check streaming
      if (pub.distributionChannels?.streamingVideo) {
        for (const streaming of pub.distributionChannels.streamingVideo) {
          report.streaming.total++;
          
          // Check for frequency field
          if (streaming.frequency) {
            report.streaming.withFrequency++;
          } else {
            report.streaming.withoutFrequency++;
            report.streaming.needsFrequencyMigration.push(`${pubName} - ${streaming.name}`);
          }
          
          // Check for hubPricing on ads
          if (streaming.advertisingOpportunities) {
            for (const ad of streaming.advertisingOpportunities) {
              if (ad.hubPricing && ad.hubPricing.length > 0) {
                report.streaming.withHubPricing++;
              } else {
                report.streaming.withoutHubPricing++;
                report.streaming.needsHubPricingMigration.push(`${pubName} - ${streaming.name} - ${ad.name}`);
              }
            }
          }
        }
      }
    }

    // Print report
    console.log('📋 NEWSLETTERS');
    console.log('─'.repeat(70));
    console.log(`  Total ads:              ${report.newsletters.total}`);
    console.log(`  ❌ Old format (perSend): ${report.newsletters.withOldFormat}`);
    console.log(`  ✅ New format (flatRate): ${report.newsletters.withNewFormat}`);
    if (report.newsletters.needsMigration.length > 0) {
      console.log(`\n  🔧 NEEDS MIGRATION:`);
      report.newsletters.needsMigration.forEach(item => console.log(`     - ${item}`));
    }

    console.log('\n📋 EVENTS');
    console.log('─'.repeat(70));
    console.log(`  Total opportunities:    ${report.events.total}`);
    console.log(`  ❌ Old format (number):  ${report.events.withOldFormat}`);
    console.log(`  ✅ New format (object):  ${report.events.withNewFormat}`);
    if (report.events.needsMigration.length > 0) {
      console.log(`\n  🔧 NEEDS MIGRATION:`);
      report.events.needsMigration.forEach(item => console.log(`     - ${item}`));
    }

    console.log('\n📋 STREAMING VIDEO');
    console.log('─'.repeat(70));
    console.log(`  Total channels:         ${report.streaming.total}`);
    console.log(`  ✅ With frequency:       ${report.streaming.withFrequency}`);
    console.log(`  ❌ Without frequency:    ${report.streaming.withoutFrequency}`);
    console.log(`  ✅ With hubPricing:      ${report.streaming.withHubPricing}`);
    console.log(`  ❌ Without hubPricing:   ${report.streaming.withoutHubPricing}`);
    
    if (report.streaming.needsFrequencyMigration.length > 0) {
      console.log(`\n  🔧 NEEDS FREQUENCY FIELD:`);
      report.streaming.needsFrequencyMigration.forEach(item => console.log(`     - ${item}`));
    }
    
    if (report.streaming.needsHubPricingMigration.length > 0) {
      console.log(`\n  ℹ️  MISSING HUB PRICING (optional):`);
      report.streaming.needsHubPricingMigration.slice(0, 5).forEach(item => console.log(`     - ${item}`));
      if (report.streaming.needsHubPricingMigration.length > 5) {
        console.log(`     ... and ${report.streaming.needsHubPricingMigration.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('  🎯 SUMMARY');
    console.log('='.repeat(70));
    
    const needsNewsletterMigration = report.newsletters.withOldFormat > 0;
    const needsEventMigration = report.events.withOldFormat > 0;
    const needsStreamingFrequency = report.streaming.withoutFrequency > 0;
    
    if (needsNewsletterMigration || needsEventMigration || needsStreamingFrequency) {
      console.log('\n❌ MIGRATION REQUIRED\n');
      if (needsNewsletterMigration) {
        console.log(`  • Newsletter pricing: ${report.newsletters.withOldFormat} ads need migration`);
      }
      if (needsEventMigration) {
        console.log(`  • Event pricing: ${report.events.withOldFormat} opportunities need migration`);
      }
      if (needsStreamingFrequency) {
        console.log(`  • Streaming frequency: ${report.streaming.withoutFrequency} channels need field`);
      }
      console.log('\n  Run the migration script to fix these issues.');
    } else {
      console.log('\n✅ NO MIGRATION NEEDED\n');
      console.log('  All data is already in the correct format!');
      console.log('  The TypeScript schemas have been updated to match.');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMigrationNeeds();
}

