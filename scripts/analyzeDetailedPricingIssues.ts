import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

interface Issue {
  publicationName: string;
  channel: string;
  itemName: string;
  issueType: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
}

async function analyzeDetailedPricingIssues() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({}).toArray();
    
    console.log(`\n🔍 Deep Analysis: ${pubs.length} publications\n`);
    console.log('═'.repeat(80));
    
    const issues: Issue[] = [];
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const channels = pub.distributionChannels || {};
      
      // Helper to check a single ad
      const checkAd = (ad: any, channel: string, itemName?: string) => {
        const name = itemName || ad.name || 'Unnamed';
        
        // Handle nested pricing structure (print ads often have tier.pricing.flatRate)
        let defaultPricing;
        if (Array.isArray(ad.pricing) && ad.pricing.length > 0) {
          const firstTier = ad.pricing[0];
          // Check if pricing is nested (tier.pricing.flatRate) or flat (tier.flatRate)
          defaultPricing = firstTier.pricing || firstTier;
        } else {
          defaultPricing = ad.pricing;
        }
        
        // Issue 1: Missing flatRate
        if (defaultPricing && defaultPricing.pricingModel !== 'contact' && !defaultPricing.flatRate && defaultPricing.flatRate !== 0) {
          issues.push({
            publicationName: pubName,
            channel,
            itemName: name,
            issueType: 'Missing flatRate',
            details: `pricingModel: ${defaultPricing.pricingModel}, flatRate: ${defaultPricing.flatRate}`,
            severity: 'critical',
            impact: 'Revenue calculations return $0'
          });
        }
        
        // Issue 2: Zero flatRate (not contact)
        if (defaultPricing && defaultPricing.flatRate === 0 && defaultPricing.pricingModel !== 'contact') {
          issues.push({
            publicationName: pubName,
            channel,
            itemName: name,
            issueType: 'Zero Price (Not Contact)',
            details: `flatRate: 0, pricingModel: ${defaultPricing.pricingModel}`,
            severity: 'medium',
            impact: 'Shows as free - verify if intentional'
          });
        }
        
        // Issue 3: Occurrence-based without occurrencesPerMonth
        const occurrenceModels = ['per_send', 'per_ad', 'per_spot', 'per_post', 'per_episode', 'per_story'];
        if (defaultPricing && occurrenceModels.includes(defaultPricing.pricingModel)) {
          if (!ad.performanceMetrics?.occurrencesPerMonth) {
            issues.push({
              publicationName: pubName,
              channel,
              itemName: name,
              issueType: 'Missing occurrencesPerMonth',
              details: `pricingModel: ${defaultPricing.pricingModel} requires occurrencesPerMonth`,
              severity: 'high',
              impact: 'Revenue calculations return $0'
            });
          }
        }
        
        // Issue 4: Impression-based without impressionsPerMonth
        const impressionModels = ['cpm', 'cpd', 'cpv', 'cpc'];
        if (defaultPricing && impressionModels.includes(defaultPricing.pricingModel)) {
          if (!ad.performanceMetrics?.impressionsPerMonth && !ad.monthlyImpressions) {
            issues.push({
              publicationName: pubName,
              channel,
              itemName: name,
              issueType: 'Missing impressionsPerMonth',
              details: `pricingModel: ${defaultPricing.pricingModel} requires impressionsPerMonth`,
              severity: 'high',
              impact: 'Revenue calculations return $0'
            });
          }
        }
        
        // Issue 5: Invalid frequency format
        if (defaultPricing && defaultPricing.frequency) {
          const freq = defaultPricing.frequency;
          const validPattern = /^\d+x$/;
          if (!validPattern.test(freq)) {
            issues.push({
              publicationName: pubName,
              channel,
              itemName: name,
              issueType: 'Invalid Frequency Format',
              details: `frequency: "${freq}" (expected format: "4x", "12x", etc.)`,
              severity: 'medium',
              impact: 'Falls back to 1x multiplier silently'
            });
          }
        }
        
        // Issue 6: Multiple pricing tiers without proper 1x tier
        // Only check if tiers use the same pricing model (true tiers, not alternative pricing)
        if (Array.isArray(ad.pricing) && ad.pricing.length > 0) {
          // Check if all tiers have the same pricing model
          const pricingModels = ad.pricing.map((p: any) => {
            const pricing = p.pricing || p;
            return pricing.pricingModel;
          }).filter(Boolean);
          
          const uniqueModels = [...new Set(pricingModels)];
          
          // Only check for 1x tier if all tiers use the same pricing model
          if (uniqueModels.length === 1) {
            const has1x = ad.pricing.some((p: any) => {
              const pricing = p.pricing || p;
              const freq = (pricing.frequency || '').toLowerCase();
              return freq === '1x' || freq.includes('one time') || freq === 'onetime';
            });
            
            if (!has1x) {
              issues.push({
                publicationName: pubName,
                channel,
                itemName: name,
                issueType: 'Missing 1x Tier',
                details: `Has ${ad.pricing.length} tiers but no 1x base rate`,
                severity: 'medium',
                impact: 'Revenue calculations may use incorrect tier'
              });
            }
          }
          // If different pricing models, they're alternative pricing options, not tiers - no warning needed
        }
        
        // Issue 7: Hub pricing issues
        if (ad.hubPricing && Array.isArray(ad.hubPricing)) {
          ad.hubPricing.forEach((hp: any, idx: number) => {
            // Missing pricing object
            if (!hp.pricing) {
              issues.push({
                publicationName: pubName,
                channel,
                itemName: name,
                issueType: 'Hub Pricing Missing pricing Object',
                details: `hubId: ${hp.hubId}, hubName: ${hp.hubName}`,
                severity: 'critical',
                impact: 'Hub pricing cannot be calculated'
              });
            }
            
            // Missing pricingModel in hub pricing
            if (hp.pricing && !hp.pricing.pricingModel) {
              issues.push({
                publicationName: pubName,
                channel,
                itemName: name,
                issueType: 'Hub Pricing Missing pricingModel',
                details: `hubId: ${hp.hubId}, hubName: ${hp.hubName}`,
                severity: 'critical',
                impact: 'Hub pricing calculation fails'
              });
            }
            
            // Missing flatRate in hub pricing
            if (hp.pricing && hp.pricing.pricingModel !== 'contact' && !hp.pricing.flatRate && hp.pricing.flatRate !== 0) {
              issues.push({
                publicationName: pubName,
                channel,
                itemName: name,
                issueType: 'Hub Pricing Missing flatRate',
                details: `hubId: ${hp.hubId}, pricingModel: ${hp.pricing.pricingModel}`,
                severity: 'critical',
                impact: 'Hub pricing returns $0'
              });
            }
          });
        }
        
        // Issue 8: Missing performanceMetrics entirely
        if (!ad.performanceMetrics) {
          const needsMetrics = defaultPricing && 
            (occurrenceModels.includes(defaultPricing.pricingModel) || 
             impressionModels.includes(defaultPricing.pricingModel));
          
          if (needsMetrics) {
            issues.push({
              publicationName: pubName,
              channel,
              itemName: name,
              issueType: 'Missing performanceMetrics Object',
              details: `pricingModel: ${defaultPricing.pricingModel} requires performanceMetrics`,
              severity: 'high',
              impact: 'Cannot calculate revenue'
            });
          }
        }
      };
      
      // Check Newsletters
      channels.newsletters?.forEach((newsletter: any) => {
        newsletter.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Newsletter', `${newsletter.name} - ${ad.name}`);
        });
      });
      
      // Check Website
      channels.website?.advertisingOpportunities?.forEach((ad: any) => {
        checkAd(ad, 'Website');
      });
      
      // Check Podcasts
      channels.podcasts?.forEach((podcast: any) => {
        podcast.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Podcast', `${podcast.name} - ${ad.name}`);
        });
      });
      
      // Check Print
      const printArray = Array.isArray(channels.print) ? channels.print : (channels.print ? [channels.print] : []);
      printArray.forEach((print: any) => {
        print.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Print', `${print.name || 'Print'} - ${ad.name}`);
        });
      });
      
      // Check Social Media
      channels.socialMedia?.forEach((profile: any) => {
        profile.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Social Media', `${profile.platform} - ${ad.name}`);
        });
      });
      
      // Check Streaming
      channels.streamingVideo?.forEach((stream: any) => {
        stream.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Streaming', `${stream.name} - ${ad.name}`);
        });
      });
      
      // Check Radio
      channels.radioStations?.forEach((station: any) => {
        if (station.shows && station.shows.length > 0) {
          station.shows.forEach((show: any) => {
            show.advertisingOpportunities?.forEach((ad: any) => {
              checkAd(ad, 'Radio', `${station.callSign} - ${show.name} - ${ad.name}`);
            });
          });
        } else {
          station.advertisingOpportunities?.forEach((ad: any) => {
            checkAd(ad, 'Radio', `${station.callSign} - ${ad.name}`);
          });
        }
      });
      
      // Check Events
      channels.events?.forEach((event: any) => {
        event.advertisingOpportunities?.forEach((ad: any) => {
          checkAd(ad, 'Events', `${event.name} - ${ad.level}`);
        });
      });
    });
    
    // Sort issues by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    // Print summary
    console.log('\n📊 ISSUE SUMMARY\n');
    
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
    
    console.log(`🔴 CRITICAL: ${bySeverity.critical} issues`);
    console.log(`🟠 HIGH:     ${bySeverity.high} issues`);
    console.log(`🟡 MEDIUM:   ${bySeverity.medium} issues`);
    console.log(`🟢 LOW:      ${bySeverity.low} issues`);
    console.log(`\n📈 TOTAL:    ${issues.length} issues found`);
    
    // Group by issue type
    const byType: Record<string, number> = {};
    issues.forEach(issue => {
      byType[issue.issueType] = (byType[issue.issueType] || 0) + 1;
    });
    
    console.log('\n\n📋 ISSUES BY TYPE\n');
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${count.toString().padStart(3)} × ${type}`);
      });
    
    // Print detailed issues (limit to top 50)
    if (issues.length > 0) {
      console.log('\n\n🔍 DETAILED ISSUES (Top 50)\n');
      console.log('═'.repeat(80));
      
      issues.slice(0, 50).forEach((issue, idx) => {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity];
        
        console.log(`\n${severityIcon} Issue #${idx + 1}: ${issue.issueType}`);
        console.log(`   Publication: ${issue.publicationName}`);
        console.log(`   Channel: ${issue.channel}`);
        console.log(`   Item: ${issue.itemName}`);
        console.log(`   Details: ${issue.details}`);
        console.log(`   Impact: ${issue.impact}`);
      });
      
      if (issues.length > 50) {
        console.log(`\n... and ${issues.length - 50} more issues`);
      }
    } else {
      console.log('\n✅ No issues found! All pricing data is complete and valid.');
    }
    
    console.log('\n' + '═'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

analyzeDetailedPricingIssues();

