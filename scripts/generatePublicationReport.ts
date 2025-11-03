import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

interface PublicationIssues {
  publicationName: string;
  publicationId: number;
  totalItems: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  items: {
    channel: string;
    itemName: string;
    issues: string[];
  }[];
}

async function generatePublicationReport() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({}).toArray();
    
    console.log(`\n📊 PUBLICATION-BY-PUBLICATION DATA QUALITY REPORT`);
    console.log('═'.repeat(80));
    console.log(`\nAnalyzing ${pubs.length} publications...\n`);
    
    const publicationReports: PublicationIssues[] = [];
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const pubId = pub.publicationId;
      const channels = pub.distributionChannels || {};
      
      let totalItems = 0;
      let issueCount = 0;
      let criticalCount = 0;
      let warningCount = 0;
      const itemsWithIssues: PublicationIssues['items'] = [];
      
      // Helper to check an item
      const checkItem = (item: any, channel: string, itemName: string) => {
        totalItems++;
        const issues: string[] = [];
        const defaultPricing = Array.isArray(item.pricing) ? item.pricing[0] : item.pricing;
        
        // Check for issues
        if (!defaultPricing) {
          issues.push('🔴 No pricing data');
          criticalCount++;
        } else {
          if (!defaultPricing.pricingModel) {
            issues.push('🔴 Missing pricingModel');
            criticalCount++;
          }
          if (defaultPricing.pricingModel !== 'contact' && !defaultPricing.flatRate && defaultPricing.flatRate !== 0) {
            issues.push('🔴 Missing flatRate');
            criticalCount++;
          }
          
          const occurrenceModels = ['per_send', 'per_ad', 'per_spot', 'per_post', 'per_episode', 'per_story'];
          if (defaultPricing.pricingModel && occurrenceModels.includes(defaultPricing.pricingModel)) {
            if (!item.performanceMetrics?.occurrencesPerMonth) {
              issues.push('⚠️  Missing occurrencesPerMonth');
              warningCount++;
            }
          }
          
          const impressionModels = ['cpm', 'cpd', 'cpv', 'cpc'];
          if (defaultPricing.pricingModel && impressionModels.includes(defaultPricing.pricingModel)) {
            if (!item.performanceMetrics?.impressionsPerMonth && !item.monthlyImpressions) {
              issues.push('⚠️  Missing impressionsPerMonth');
              warningCount++;
            }
          }
          
          if (defaultPricing.flatRate === 0 && defaultPricing.pricingModel !== 'contact') {
            issues.push('ℹ️  Zero price (verify if intentional)');
          }
        }
        
        if (issues.length > 0) {
          issueCount += issues.length;
          itemsWithIssues.push({
            channel,
            itemName,
            issues
          });
        }
      };
      
      // Check all channels
      channels.website?.advertisingOpportunities?.forEach((item: any) => {
        checkItem(item, 'Website', item.name || 'Unnamed');
      });
      
      channels.newsletters?.forEach((newsletter: any) => {
        newsletter.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Newsletter', `${newsletter.name} - ${item.name || 'Unnamed'}`);
        });
      });
      
      const printArray = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      printArray.forEach((print: any) => {
        print.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Print', `${print.name || 'Print'} - ${item.name || 'Unnamed'}`);
        });
      });
      
      channels.podcasts?.forEach((podcast: any) => {
        podcast.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Podcast', `${podcast.name} - ${item.name || 'Unnamed'}`);
        });
      });
      
      channels.socialMedia?.forEach((profile: any) => {
        profile.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Social Media', `${profile.platform} - ${item.name || 'Unnamed'}`);
        });
      });
      
      channels.streamingVideo?.forEach((stream: any) => {
        stream.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Streaming', `${stream.name} - ${item.name || 'Unnamed'}`);
        });
      });
      
      channels.radioStations?.forEach((station: any) => {
        if (station.shows && station.shows.length > 0) {
          station.shows.forEach((show: any) => {
            show.advertisingOpportunities?.forEach((item: any) => {
              checkItem(item, 'Radio', `${station.callSign} - ${show.name} - ${item.name || 'Unnamed'}`);
            });
          });
        } else {
          station.advertisingOpportunities?.forEach((item: any) => {
            checkItem(item, 'Radio', `${station.callSign} - ${item.name || 'Unnamed'}`);
          });
        }
      });
      
      channels.events?.forEach((event: any) => {
        event.advertisingOpportunities?.forEach((item: any) => {
          checkItem(item, 'Events', `${event.name} - ${item.level || 'Unnamed'}`);
        });
      });
      
      if (totalItems > 0) {
        publicationReports.push({
          publicationName: pubName,
          publicationId: pubId,
          totalItems,
          issueCount,
          criticalCount,
          warningCount,
          items: itemsWithIssues
        });
      }
    });
    
    // Sort by issue count (highest first)
    publicationReports.sort((a, b) => b.issueCount - a.issueCount);
    
    // Print summary table
    console.log('\n📊 SUMMARY BY PUBLICATION\n');
    console.log('─'.repeat(100));
    console.log(
      'Publication'.padEnd(35) + 
      'Items'.padStart(7) + 
      'Issues'.padStart(8) + 
      'Critical'.padStart(10) + 
      'Warnings'.padStart(10) + 
      'Status'.padStart(15)
    );
    console.log('─'.repeat(100));
    
    publicationReports.forEach(report => {
      const statusIcon = report.criticalCount > 0 ? '🔴' : (report.warningCount > 0 ? '⚠️ ' : '✅');
      const status = report.criticalCount > 0 ? 'NEEDS FIX' : (report.warningCount > 0 ? 'WARNING' : 'OK');
      
      console.log(
        report.publicationName.padEnd(35).substring(0, 35) +
        report.totalItems.toString().padStart(7) +
        report.issueCount.toString().padStart(8) +
        report.criticalCount.toString().padStart(10) +
        report.warningCount.toString().padStart(10) +
        `  ${statusIcon} ${status}`.padStart(15)
      );
    });
    
    console.log('─'.repeat(100));
    
    // Detailed reports for publications with issues
    console.log('\n\n🔍 DETAILED REPORTS (Publications with Issues)\n');
    console.log('═'.repeat(80));
    
    publicationReports
      .filter(report => report.issueCount > 0)
      .slice(0, 15) // Top 15 with most issues
      .forEach((report, idx) => {
        console.log(`\n${idx + 1}. ${report.publicationName.toUpperCase()}`);
        console.log('─'.repeat(80));
        console.log(`   Total Items: ${report.totalItems}`);
        console.log(`   🔴 Critical Issues: ${report.criticalCount}`);
        console.log(`   ⚠️  Warnings: ${report.warningCount}`);
        console.log(`   📊 Quality Score: ${Math.round(((report.totalItems - report.items.length) / report.totalItems) * 100)}%`);
        console.log('');
        
        // Group by channel
        const byChannel: Record<string, typeof report.items> = {};
        report.items.forEach(item => {
          if (!byChannel[item.channel]) {
            byChannel[item.channel] = [];
          }
          byChannel[item.channel].push(item);
        });
        
        Object.entries(byChannel).forEach(([channel, items]) => {
          console.log(`   📌 ${channel}:`);
          items.forEach(item => {
            console.log(`      • ${item.itemName}`);
            item.issues.forEach(issue => {
              console.log(`        ${issue}`);
            });
          });
          console.log('');
        });
      });
    
    // Clean publications
    const cleanPubs = publicationReports.filter(report => report.issueCount === 0);
    if (cleanPubs.length > 0) {
      console.log('\n\n✅ CLEAN PUBLICATIONS (No Issues Found)\n');
      console.log('─'.repeat(80));
      cleanPubs.forEach(report => {
        console.log(`✅ ${report.publicationName} (${report.totalItems} items)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

generatePublicationReport();

