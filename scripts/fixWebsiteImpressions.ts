/**
 * Fix Website Impressions Data
 * 
 * This script fixes the incorrectly calculated impressionsPerMonth for website inventory.
 * 
 * THE BUG: impressionsPerMonth was calculated as: monthlyVisitors × 30
 * This was wrong because monthlyVisitors is already a monthly aggregate, not a daily count.
 * 
 * THE FIX: impressionsPerMonth should be: monthlyPageViews (or monthlyVisitors if not available)
 * with occurrencesPerMonth = 1 (since the metric is already monthly)
 * 
 * Example:
 * - Before: 120,000 visitors × 30 = 3,600,000 impressions (WRONG!)
 * - After: 150,000 page views = 150,000 impressions (CORRECT!)
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface FixResult {
  publicationId: string;
  publicationName: string;
  beforeImpressions: number;
  afterImpressions: number;
  monthlyVisitors: number;
  monthlyPageViews: number;
  adCount: number;
}

async function fixWebsiteImpressions(dryRun: boolean = true) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = 'chicago-hub';
    console.log(`📂 Using database: ${dbName} (PRODUCTION)`);
    console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}\n`);
    
    const db = client.db(dbName);
    
    // Find all publications with website advertising opportunities
    const publications = await db.collection('publications').find({
      'distributionChannels.website.advertisingOpportunities': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📰 Found ${publications.length} publications with website inventory\n`);
    console.log('='.repeat(90));
    
    const results: FixResult[] = [];
    let totalFixed = 0;
    
    for (const pub of publications) {
      const website = pub.distributionChannels?.website;
      if (!website?.advertisingOpportunities?.length) continue;
      
      const pubName = pub.basicInformation?.title || pub.name || 'Unknown';
      const monthlyVisitors = website.metrics?.monthlyVisitors || 0;
      const monthlyPageViews = website.metrics?.monthlyPageViews || 0;
      
      // The correct impressions value
      const correctImpressions = monthlyPageViews || monthlyVisitors;
      
      // Check if any ads have the wrong impressions
      let needsUpdate = false;
      let oldImpressions = 0;
      
      for (const ad of website.advertisingOpportunities) {
        const currentImpressions = ad.performanceMetrics?.impressionsPerMonth || 0;
        if (currentImpressions > 0) {
          oldImpressions = currentImpressions;
          // Check if it looks like the buggy calculation (visitors × 30)
          const expectedBuggyValue = monthlyVisitors * 30;
          if (Math.abs(currentImpressions - expectedBuggyValue) < 1000) {
            needsUpdate = true;
          }
        }
      }
      
      if (!needsUpdate && oldImpressions === correctImpressions) {
        // Already correct
        continue;
      }
      
      console.log(`\n📰 ${pubName}`);
      console.log(`   ID: ${pub._id}`);
      console.log(`   Monthly Visitors: ${monthlyVisitors.toLocaleString()}`);
      console.log(`   Monthly Page Views: ${monthlyPageViews.toLocaleString()}`);
      console.log(`   Ads: ${website.advertisingOpportunities.length}`);
      console.log(`   Current impressionsPerMonth (per ad): ${oldImpressions.toLocaleString()}`);
      console.log(`   Correct impressionsPerMonth (per ad): ${correctImpressions.toLocaleString()}`);
      
      if (oldImpressions > 0) {
        const ratio = oldImpressions / correctImpressions;
        console.log(`   ⚠️  Current value is ${ratio.toFixed(1)}x the correct value`);
      }
      
      results.push({
        publicationId: pub._id.toString(),
        publicationName: pubName,
        beforeImpressions: oldImpressions,
        afterImpressions: correctImpressions,
        monthlyVisitors,
        monthlyPageViews,
        adCount: website.advertisingOpportunities.length
      });
      
      if (!dryRun) {
        // Update the database
        const updatedAds = website.advertisingOpportunities.map((ad: any) => ({
          ...ad,
          performanceMetrics: {
            audienceSize: monthlyVisitors,
            occurrencesPerMonth: 1,
            impressionsPerMonth: correctImpressions,
            guaranteed: ad.performanceMetrics?.guaranteed ?? true
          }
        }));
        
        await db.collection('publications').updateOne(
          { _id: pub._id },
          { 
            $set: { 
              'distributionChannels.website.advertisingOpportunities': updatedAds 
            } 
          }
        );
        
        console.log(`   ✅ UPDATED in database`);
        totalFixed++;
      } else {
        console.log(`   📋 Would be updated (dry run)`);
      }
    }
    
    console.log('\n' + '='.repeat(90));
    console.log('\n📊 SUMMARY:');
    console.log(`   Publications analyzed: ${publications.length}`);
    console.log(`   Publications needing fix: ${results.length}`);
    
    if (!dryRun) {
      console.log(`   Publications updated: ${totalFixed}`);
    }
    
    if (results.length > 0) {
      console.log('\n📋 AFFECTED PUBLICATIONS:');
      console.log('-'.repeat(90));
      console.log('Publication'.padEnd(35) + 'Before'.padStart(15) + 'After'.padStart(15) + 'Ratio'.padStart(10) + 'Ads'.padStart(8));
      console.log('-'.repeat(90));
      
      for (const r of results) {
        const ratio = r.beforeImpressions > 0 ? (r.beforeImpressions / r.afterImpressions).toFixed(1) + 'x' : 'N/A';
        console.log(
          r.publicationName.substring(0, 33).padEnd(35) + 
          r.beforeImpressions.toLocaleString().padStart(15) + 
          r.afterImpressions.toLocaleString().padStart(15) + 
          ratio.padStart(10) + 
          r.adCount.toString().padStart(8)
        );
      }
    }
    
    if (dryRun && results.length > 0) {
      console.log('\n💡 To apply these fixes, run with --apply flag:');
      console.log('   npx tsx scripts/fixWebsiteImpressions.ts --apply');
    }

  } finally {
    await client.close();
  }
}

// Check for --apply flag
const applyChanges = process.argv.includes('--apply');
fixWebsiteImpressions(!applyChanges).then(() => process.exit(0)).catch(console.error);
