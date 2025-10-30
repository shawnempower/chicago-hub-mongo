import 'dotenv/config';
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import * as fs from 'fs';
import * as path from 'path';

interface FixResult {
  publicationId: number;
  publicationName: string;
  channel: string;
  itemName: string;
  itemIndex: number;
  hubId: string;
  hubName: string;
  action: string;
  oldValue?: string;
  newValue?: string;
}

async function fixMissingHubPricingModels(dryRun: boolean = true) {
  console.log('🔧 Starting fix for missing hub pricing models...');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE RUN (changes will be saved)'}\n`);
  
  try {
    // Connect to database
    await connectToDatabase();
    const db = getDatabase();
    console.log('✅ Connected to MongoDB\n');
    
    // Get publications collection
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Count total publications
    const totalCount = await publicationsCollection.countDocuments();
    console.log(`📊 Scanning ${totalCount} publications...\n`);
    
    // Get all publications
    const publications = await publicationsCollection.find({}).toArray();
    
    const fixes: FixResult[] = [];
    let updatedPublications = 0;
    
    // Define channels to check
    const channels = [
      'website',
      'print',
      'newsletter',
      'podcast',
      'radio',
      'streaming',
      'events',
      'socialMedia'
    ];
    
    // Process each publication
    for (const pub of publications) {
      const publicationId = pub.publicationId;
      const publicationName = pub.basicInfo?.publicationName || 'Unknown';
      let publicationModified = false;
      
      // Check each channel
      for (const channel of channels) {
        let items: any[] = [];
        let parentArray: any[] | null = null;
        
        // Get advertising opportunities for each channel
        if (channel === 'socialMedia') {
          // Social media is an array of platforms
          if (pub.distributionChannels?.socialMedia && Array.isArray(pub.distributionChannels.socialMedia)) {
            pub.distributionChannels.socialMedia.forEach((platform: any, platformIndex: number) => {
              if (platform.advertisingOpportunities && Array.isArray(platform.advertisingOpportunities)) {
                platform.advertisingOpportunities.forEach((item: any, itemIndex: number) => {
                  items.push({
                    item,
                    itemName: `${platform.platform || 'Unknown Platform'} - ${item.name || 'Unnamed'}`,
                    actualIndex: itemIndex,
                    platformIndex,
                    parentRef: platform.advertisingOpportunities
                  });
                });
              }
            });
          }
        } else if (channel === 'events') {
          // Events is an array
          if (pub.distributionChannels?.events && Array.isArray(pub.distributionChannels.events)) {
            pub.distributionChannels.events.forEach((event: any, eventIndex: number) => {
              if (event.advertisingOpportunities && Array.isArray(event.advertisingOpportunities)) {
                event.advertisingOpportunities.forEach((item: any, itemIndex: number) => {
                  items.push({
                    item,
                    itemName: `${event.eventName || event.name || 'Unknown Event'} - ${item.name || item.level || 'Unnamed'}`,
                    actualIndex: itemIndex,
                    eventIndex,
                    parentRef: event.advertisingOpportunities
                  });
                });
              }
            });
          }
        } else {
          // Other channels are direct objects
          const channelData = pub.distributionChannels?.[channel];
          if (channelData?.advertisingOpportunities && Array.isArray(channelData.advertisingOpportunities)) {
            parentArray = channelData.advertisingOpportunities;
            items = channelData.advertisingOpportunities.map((item: any, index: number) => ({
              item,
              itemName: item.name || 'Unnamed',
              actualIndex: index,
              parentRef: channelData.advertisingOpportunities
            }));
          }
        }
        
        // Check each item for missing pricing models
        for (const itemWrapper of items) {
          const item = itemWrapper.item;
          
          // Check if item has default pricing
          const hasDefaultPricing = item.pricing && typeof item.pricing === 'object';
          const defaultPricingModel = item.pricing?.pricingModel;
          
          // Check hub pricing
          if (item.hubPricing && Array.isArray(item.hubPricing)) {
            for (let hubIndex = 0; hubIndex < item.hubPricing.length; hubIndex++) {
              const hubPrice = item.hubPricing[hubIndex];
              const hubId = hubPrice.hubId || 'unknown';
              const hubName = hubPrice.hubName || 'Unknown Hub';
              
              let fixed = false;
              let action = '';
              let oldValue = '';
              let newValue = '';
              
              // Fix missing pricing object
              if (!hubPrice.pricing || typeof hubPrice.pricing !== 'object') {
                oldValue = 'null/undefined';
                
                if (defaultPricingModel) {
                  newValue = `{pricingModel: "${defaultPricingModel}"}`;
                  hubPrice.pricing = { pricingModel: defaultPricingModel };
                  action = 'Added pricing object with default pricingModel';
                } else {
                  newValue = '{pricingModel: "contact"}';
                  hubPrice.pricing = { pricingModel: 'contact' };
                  action = 'Added pricing object with fallback pricingModel (contact)';
                }
                fixed = true;
              } else {
                // Fix missing or empty pricing model
                if (!hubPrice.pricing.pricingModel || hubPrice.pricing.pricingModel === '') {
                  oldValue = hubPrice.pricing.pricingModel === '' ? 'empty string' : 'undefined';
                  
                  if (defaultPricingModel) {
                    newValue = defaultPricingModel;
                    hubPrice.pricing.pricingModel = defaultPricingModel;
                    action = 'Copied pricingModel from default pricing';
                  } else {
                    newValue = 'contact';
                    hubPrice.pricing.pricingModel = 'contact';
                    action = 'Set pricingModel to fallback (contact)';
                  }
                  fixed = true;
                }
                
                // Fix missing flatRate for non-contact pricing models
                if (hubPrice.pricing.pricingModel && 
                    hubPrice.pricing.pricingModel !== 'contact' && 
                    !hubPrice.pricing.flatRate && 
                    hubPrice.pricing.flatRate !== 0) {
                  
                  const defaultFlatRate = item.pricing?.flatRate;
                  if (defaultFlatRate) {
                    if (!fixed) {
                      oldValue = 'undefined flatRate';
                      newValue = `flatRate: ${defaultFlatRate}`;
                      action = 'Copied flatRate from default pricing';
                    } else {
                      action += ' + copied flatRate from default pricing';
                      newValue += `, flatRate: ${defaultFlatRate}`;
                    }
                    hubPrice.pricing.flatRate = defaultFlatRate;
                    fixed = true;
                  }
                }
              }
              
              if (fixed) {
                fixes.push({
                  publicationId,
                  publicationName,
                  channel,
                  itemName: itemWrapper.itemName,
                  itemIndex: itemWrapper.actualIndex,
                  hubId,
                  hubName,
                  action,
                  oldValue,
                  newValue
                });
                publicationModified = true;
              }
            }
          }
        }
      }
      
      // Save the publication if modified and not in dry run mode
      if (publicationModified) {
        updatedPublications++;
        
        if (!dryRun) {
          await publicationsCollection.updateOne(
            { _id: pub._id },
            { $set: pub }
          );
        }
      }
    }
    
    // Print summary
    console.log('=' .repeat(100));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(100));
    console.log(`Total publications scanned: ${totalCount}`);
    console.log(`Publications that will be updated: ${updatedPublications}`);
    console.log(`Total fixes applied: ${fixes.length}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN - No changes saved' : 'LIVE RUN - Changes saved to database'}`);
    console.log('=' .repeat(100));
    console.log('');
    
    if (fixes.length === 0) {
      console.log('✅ No issues found to fix!');
    } else {
      console.log(`${dryRun ? '🔍 Would fix' : '✅ Fixed'} the following issues:\n`);
      
      // Group by publication
      const fixesByPublication = fixes.reduce((acc, fix) => {
        if (!acc[fix.publicationId]) {
          acc[fix.publicationId] = {
            name: fix.publicationName,
            fixes: []
          };
        }
        acc[fix.publicationId].fixes.push(fix);
        return acc;
      }, {} as Record<number, { name: string; fixes: FixResult[] }>);
      
      // Print grouped fixes
      for (const [pubId, data] of Object.entries(fixesByPublication)) {
        console.log(`\n📰 ${data.name} (ID: ${pubId})`);
        console.log('-'.repeat(100));
        
        data.fixes.forEach((fix, index) => {
          console.log(`\n  ${index + 1}. ${fix.channel.toUpperCase()} - ${fix.itemName}`);
          console.log(`     Hub: ${fix.hubName} (${fix.hubId})`);
          console.log(`     Action: ${fix.action}`);
          if (fix.oldValue) {
            console.log(`     Old: ${fix.oldValue}`);
          }
          if (fix.newValue) {
            console.log(`     New: ${fix.newValue}`);
          }
        });
        
        console.log('');
      }
      
      // Generate report
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const reportDir = path.join(process.cwd(), 'reports');
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportPath = path.join(reportDir, `fix-hub-pricing-models-${dryRun ? 'dry-run-' : ''}${timestamp}.json`);
      
      const report = {
        generatedAt: new Date().toISOString(),
        mode: dryRun ? 'dry-run' : 'live',
        summary: {
          totalPublications: totalCount,
          publicationsUpdated: updatedPublications,
          totalFixes: fixes.length
        },
        fixesByType: {
          addedPricingObject: fixes.filter(f => f.action.includes('Added pricing object')).length,
          copiedFromDefault: fixes.filter(f => f.action.includes('Copied pricingModel from default')).length,
          setToFallback: fixes.filter(f => f.action.includes('fallback')).length,
          copiedFlatRate: fixes.filter(f => f.action.includes('copied flatRate')).length,
        },
        fixesByChannel: channels.reduce((acc, channel) => {
          acc[channel] = fixes.filter(f => f.channel === channel).length;
          return acc;
        }, {} as Record<string, number>),
        fixesByPublication,
        detailedFixes: fixes
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
    }
    
    // Close database connection
    await closeConnection();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

if (dryRun) {
  console.log('💡 Running in DRY RUN mode. Use --live flag to apply changes.\n');
} else {
  console.log('⚠️  Running in LIVE mode. Changes will be saved to the database!\n');
}

// Run the script
fixMissingHubPricingModels(dryRun)
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

