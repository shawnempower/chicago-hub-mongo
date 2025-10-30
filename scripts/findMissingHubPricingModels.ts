import 'dotenv/config';
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';
import * as fs from 'fs';
import * as path from 'path';

interface MissingPricingIssue {
  publicationId: number;
  publicationName: string;
  channel: string;
  itemName: string;
  itemIndex: number;
  hubId: string;
  hubName: string;
  issue: string;
  hasDefaultPricing: boolean;
  defaultPricingModel?: string;
}

async function findMissingHubPricingModels() {
  console.log('🔍 Starting search for inventory items with missing pricing models in hub pricing...\n');
  
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
    
    const issues: MissingPricingIssue[] = [];
    let scannedItems = 0;
    let publicationsWithIssues = 0;
    
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
      let hasIssuesInThisPublication = false;
      
      // Check each channel
      for (const channel of channels) {
        let items: any[] = [];
        
        // Get advertising opportunities for each channel
        if (channel === 'socialMedia') {
          // Social media is an array of platforms
          if (pub.distributionChannels?.socialMedia && Array.isArray(pub.distributionChannels.socialMedia)) {
            pub.distributionChannels.socialMedia.forEach((platform: any, platformIndex: number) => {
              if (platform.advertisingOpportunities && Array.isArray(platform.advertisingOpportunities)) {
                platform.advertisingOpportunities.forEach((item: any, itemIndex: number) => {
                  items.push({
                    ...item,
                    itemName: `${platform.platform || 'Unknown Platform'} - ${item.name || 'Unnamed'}`,
                    actualIndex: itemIndex,
                    platformIndex
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
                    ...item,
                    itemName: `${event.eventName || 'Unknown Event'} - ${item.name || 'Unnamed'}`,
                    actualIndex: itemIndex,
                    eventIndex
                  });
                });
              }
            });
          }
        } else {
          // Other channels are direct objects
          const channelData = pub.distributionChannels?.[channel];
          if (channelData?.advertisingOpportunities && Array.isArray(channelData.advertisingOpportunities)) {
            items = channelData.advertisingOpportunities.map((item: any, index: number) => ({
              ...item,
              actualIndex: index
            }));
          }
        }
        
        // Check each item for missing pricing models
        for (const item of items) {
          scannedItems++;
          
          // Check if item has default pricing
          const hasDefaultPricing = item.pricing && typeof item.pricing === 'object';
          const defaultPricingModel = item.pricing?.pricingModel;
          
          // Check hub pricing
          if (item.hubPricing && Array.isArray(item.hubPricing)) {
            for (const hubPrice of item.hubPricing) {
              const hubId = hubPrice.hubId || 'unknown';
              const hubName = hubPrice.hubName || 'Unknown Hub';
              
              // Check if pricing object exists
              if (!hubPrice.pricing || typeof hubPrice.pricing !== 'object') {
                issues.push({
                  publicationId,
                  publicationName,
                  channel,
                  itemName: item.itemName || item.name || 'Unnamed',
                  itemIndex: item.actualIndex,
                  hubId,
                  hubName,
                  issue: 'Missing pricing object',
                  hasDefaultPricing,
                  defaultPricingModel
                });
                hasIssuesInThisPublication = true;
              } else {
                // Check if pricing model exists
                if (!hubPrice.pricing.pricingModel) {
                  issues.push({
                    publicationId,
                    publicationName,
                    channel,
                    itemName: item.itemName || item.name || 'Unnamed',
                    itemIndex: item.actualIndex,
                    hubId,
                    hubName,
                    issue: 'Missing pricingModel field',
                    hasDefaultPricing,
                    defaultPricingModel
                  });
                  hasIssuesInThisPublication = true;
                } else if (hubPrice.pricing.pricingModel === '') {
                  issues.push({
                    publicationId,
                    publicationName,
                    channel,
                    itemName: item.itemName || item.name || 'Unnamed',
                    itemIndex: item.actualIndex,
                    hubId,
                    hubName,
                    issue: 'Empty pricingModel field',
                    hasDefaultPricing,
                    defaultPricingModel
                  });
                  hasIssuesInThisPublication = true;
                }
                
                // Check if flatRate exists when pricing object exists
                if (hubPrice.pricing.pricingModel && !hubPrice.pricing.flatRate && hubPrice.pricing.flatRate !== 0) {
                  issues.push({
                    publicationId,
                    publicationName,
                    channel,
                    itemName: item.itemName || item.name || 'Unnamed',
                    itemIndex: item.actualIndex,
                    hubId,
                    hubName,
                    issue: 'Missing flatRate value',
                    hasDefaultPricing,
                    defaultPricingModel
                  });
                  hasIssuesInThisPublication = true;
                }
              }
            }
          }
        }
      }
      
      if (hasIssuesInThisPublication) {
        publicationsWithIssues++;
      }
    }
    
    // Print summary
    console.log('=' .repeat(100));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(100));
    console.log(`Total publications scanned: ${totalCount}`);
    console.log(`Total inventory items scanned: ${scannedItems}`);
    console.log(`Publications with issues: ${publicationsWithIssues}`);
    console.log(`Total issues found: ${issues.length}`);
    console.log('=' .repeat(100));
    console.log('');
    
    if (issues.length === 0) {
      console.log('✅ No missing pricing models found! All inventory items have proper hub pricing.');
    } else {
      console.log('❌ Found issues with hub pricing:\n');
      
      // Group by publication
      const issuesByPublication = issues.reduce((acc, issue) => {
        if (!acc[issue.publicationId]) {
          acc[issue.publicationId] = {
            name: issue.publicationName,
            issues: []
          };
        }
        acc[issue.publicationId].issues.push(issue);
        return acc;
      }, {} as Record<number, { name: string; issues: MissingPricingIssue[] }>);
      
      // Print grouped issues
      for (const [pubId, data] of Object.entries(issuesByPublication)) {
        console.log(`\n📰 ${data.name} (ID: ${pubId})`);
        console.log('-'.repeat(100));
        
        data.issues.forEach((issue, index) => {
          console.log(`\n  ${index + 1}. ${issue.channel.toUpperCase()} - ${issue.itemName}`);
          console.log(`     Index: ${issue.itemIndex}`);
          console.log(`     Hub: ${issue.hubName} (${issue.hubId})`);
          console.log(`     Issue: ${issue.issue}`);
          console.log(`     Has Default Pricing: ${issue.hasDefaultPricing ? 'Yes' : 'No'}`);
          if (issue.defaultPricingModel) {
            console.log(`     Default Pricing Model: ${issue.defaultPricingModel}`);
          }
        });
        
        console.log('');
      }
      
      // Generate detailed report file
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const reportDir = path.join(process.cwd(), 'reports');
      
      // Create reports directory if it doesn't exist
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportPath = path.join(reportDir, `missing-hub-pricing-models-${timestamp}.json`);
      
      // Create detailed report
      const report = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalPublications: totalCount,
          totalItemsScanned: scannedItems,
          publicationsWithIssues,
          totalIssues: issues.length
        },
        issuesByType: {
          missingPricingObject: issues.filter(i => i.issue === 'Missing pricing object').length,
          missingPricingModel: issues.filter(i => i.issue === 'Missing pricingModel field').length,
          emptyPricingModel: issues.filter(i => i.issue === 'Empty pricingModel field').length,
          missingFlatRate: issues.filter(i => i.issue === 'Missing flatRate value').length
        },
        issuesByChannel: channels.reduce((acc, channel) => {
          acc[channel] = issues.filter(i => i.channel === channel).length;
          return acc;
        }, {} as Record<string, number>),
        issuesByPublication: issuesByPublication,
        detailedIssues: issues
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Generate CSV report
      const csvPath = path.join(reportDir, `missing-hub-pricing-models-${timestamp}.csv`);
      const csvHeaders = [
        'Publication ID',
        'Publication Name',
        'Channel',
        'Item Name',
        'Item Index',
        'Hub ID',
        'Hub Name',
        'Issue',
        'Has Default Pricing',
        'Default Pricing Model'
      ];
      
      const csvRows = issues.map(issue => [
        issue.publicationId,
        `"${issue.publicationName}"`,
        issue.channel,
        `"${issue.itemName}"`,
        issue.itemIndex,
        issue.hubId,
        `"${issue.hubName}"`,
        `"${issue.issue}"`,
        issue.hasDefaultPricing ? 'Yes' : 'No',
        issue.defaultPricingModel || 'N/A'
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      fs.writeFileSync(csvPath, csvContent);
      console.log(`📄 CSV report saved to: ${csvPath}\n`);
    }
    
    // Close database connection
    await closeConnection();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
findMissingHubPricingModels()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

