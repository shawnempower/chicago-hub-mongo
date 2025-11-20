/**
 * Query Flat and Flat Rate Pricing Models
 * 
 * Finds all instances of pricingModel: "flat" and "flat_rate" in the database
 * 
 * Usage: npx tsx scripts/queryFlatRatePricing.ts
 */

import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

interface PricingRecord {
  publicationId: number;
  publicationName: string;
  channel: string;
  itemName: string;
  pricingModel: string;
  flatRate?: number;
  location: string;
  isHubPricing: boolean;
  hubName?: string;
}

async function queryFlatRatePricing() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = getDatabase();
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    const publications = await publicationsCollection.find({}).toArray();
    console.log(`📚 Scanning ${publications.length} publications...\n`);
    
    const flatRecords: PricingRecord[] = [];
    const flatRateRecords: PricingRecord[] = [];
    
    const pubsWithFlat = new Set<number>();
    const pubsWithFlatRate = new Set<number>();

    // Scan all publications
    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const channels = pub.distributionChannels || {};

      // Helper function to check pricing
      const checkPricing = (
        pricing: any, 
        channel: string, 
        itemName: string, 
        location: string,
        isHubPricing: boolean = false,
        hubName?: string
      ) => {
        if (!pricing) return;
        
        const model = pricing.pricingModel;
        if (model === 'flat' || model === 'flat_rate') {
          const record: PricingRecord = {
            publicationId: pubId,
            publicationName: pubName,
            channel,
            itemName,
            pricingModel: model,
            flatRate: pricing.flatRate || pricing.cpm,
            location,
            isHubPricing,
            hubName
          };
          
          if (model === 'flat') {
            flatRecords.push(record);
            pubsWithFlat.add(pubId);
          } else {
            flatRateRecords.push(record);
            pubsWithFlatRate.add(pubId);
          }
        }
      };

      // Check Website
      if (channels.website?.advertisingOpportunities) {
        channels.website.advertisingOpportunities.forEach((ad: any, idx: number) => {
          checkPricing(
            ad.pricing,
            'website',
            ad.name || 'Unnamed',
            `website.advertisingOpportunities[${idx}]`,
            false
          );
          
          // Check hub pricing
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            pricingArray.forEach((pricing: any, pricingIdx: number) => {
              checkPricing(
                pricing,
                'website',
                ad.name || 'Unnamed',
                `website.advertisingOpportunities[${idx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`,
                true,
                hub.hubName
              );
            });
          });
        });
      }

      // Check Print
      if (channels.print?.advertisingOpportunities) {
        channels.print.advertisingOpportunities.forEach((ad: any, idx: number) => {
          checkPricing(
            ad.pricing,
            'print',
            ad.name || 'Unnamed',
            `print.advertisingOpportunities[${idx}]`,
            false
          );
          
          ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
            const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
            pricingArray.forEach((pricing: any, pricingIdx: number) => {
              checkPricing(
                pricing,
                'print',
                ad.name || 'Unnamed',
                `print.advertisingOpportunities[${idx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`,
                true,
                hub.hubName
              );
            });
          });
        });
      }

      // Check Events
      if (channels.events) {
        channels.events.forEach((event: any, eventIdx: number) => {
          event.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(
              ad.pricing,
              'events',
              `${event.name || 'Unnamed Event'} - ${ad.level || 'Unnamed'}`,
              `events[${eventIdx}].advertisingOpportunities[${idx}]`,
              false
            );
            
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                checkPricing(
                  pricing,
                  'events',
                  `${event.name || 'Unnamed Event'} - ${ad.level || 'Unnamed'}`,
                  `events[${eventIdx}].advertisingOpportunities[${idx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`,
                  true,
                  hub.hubName
                );
              });
            });
          });
        });
      }

      // Check Newsletters
      if (channels.newsletters) {
        channels.newsletters.forEach((newsletter: any, newsletterIdx: number) => {
          newsletter.advertisingOpportunities?.forEach((ad: any, idx: number) => {
            checkPricing(
              ad.pricing,
              'newsletters',
              `${newsletter.name || 'Unnamed'} - ${ad.name || 'Unnamed'}`,
              `newsletters[${newsletterIdx}].advertisingOpportunities[${idx}]`,
              false
            );
            
            ad.hubPricing?.forEach((hub: any, hubIdx: number) => {
              const pricingArray = Array.isArray(hub.pricing) ? hub.pricing : [hub.pricing];
              pricingArray.forEach((pricing: any, pricingIdx: number) => {
                checkPricing(
                  pricing,
                  'newsletters',
                  `${newsletter.name || 'Unnamed'} - ${ad.name || 'Unnamed'}`,
                  `newsletters[${newsletterIdx}].advertisingOpportunities[${idx}].hubPricing[${hubIdx}].pricing[${pricingIdx}]`,
                  true,
                  hub.hubName
                );
              });
            });
          });
        });
      }
    }

    // Display Results
    console.log('='.repeat(80));
    console.log('📊 QUERY RESULTS\n');
    
    console.log(`🔵 pricingModel: "flat"`);
    console.log(`   Total Records: ${flatRecords.length}`);
    console.log(`   Publications Affected: ${pubsWithFlat.size}`);
    
    console.log(`\n🟢 pricingModel: "flat_rate"`);
    console.log(`   Total Records: ${flatRateRecords.length}`);
    console.log(`   Publications Affected: ${pubsWithFlatRate.size}`);
    
    console.log(`\n📈 TOTAL: ${flatRecords.length + flatRateRecords.length} records\n`);
    console.log('='.repeat(80));

    // Breakdown by channel
    const flatByChannel: Record<string, number> = {};
    const flatRateByChannel: Record<string, number> = {};
    
    flatRecords.forEach(r => {
      const key = r.isHubPricing ? `${r.channel}-hub` : r.channel;
      flatByChannel[key] = (flatByChannel[key] || 0) + 1;
    });
    
    flatRateRecords.forEach(r => {
      const key = r.isHubPricing ? `${r.channel}-hub` : r.channel;
      flatRateByChannel[key] = (flatRateByChannel[key] || 0) + 1;
    });

    if (flatRecords.length > 0) {
      console.log('\n🔵 "flat" Breakdown by Channel:');
      Object.entries(flatByChannel).forEach(([channel, count]) => {
        console.log(`   ${channel}: ${count}`);
      });
    }

    if (flatRateRecords.length > 0) {
      console.log('\n🟢 "flat_rate" Breakdown by Channel:');
      Object.entries(flatRateByChannel).forEach(([channel, count]) => {
        console.log(`   ${channel}: ${count}`);
      });
    }

    // Show detailed records
    if (flatRecords.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔵 DETAILED RECORDS - pricingModel: "flat"\n');
      
      flatRecords.forEach((record, idx) => {
        console.log(`${idx + 1}. ${record.publicationName} (ID: ${record.publicationId})`);
        console.log(`   Channel: ${record.channel}`);
        console.log(`   Item: ${record.itemName}`);
        console.log(`   Price: $${record.flatRate || 0}`);
        if (record.isHubPricing) {
          console.log(`   Hub: ${record.hubName}`);
        }
        console.log(`   Location: ${record.location}`);
        console.log('');
      });
    }

    if (flatRateRecords.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🟢 DETAILED RECORDS - pricingModel: "flat_rate"\n');
      
      flatRateRecords.forEach((record, idx) => {
        console.log(`${idx + 1}. ${record.publicationName} (ID: ${record.publicationId})`);
        console.log(`   Channel: ${record.channel}`);
        console.log(`   Item: ${record.itemName}`);
        console.log(`   Price: $${record.flatRate || 0}`);
        if (record.isHubPricing) {
          console.log(`   Hub: ${record.hubName}`);
        }
        console.log(`   Location: ${record.location}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('💡 RECOMMENDATIONS:\n');
    console.log('Website ads with "flat" → Should be "monthly"');
    console.log('Events with "flat" → Correct (has frequency)');
    console.log('See docs/DATA_ISSUE_FLAT_VS_MONTHLY.md for details');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

queryFlatRatePricing();

