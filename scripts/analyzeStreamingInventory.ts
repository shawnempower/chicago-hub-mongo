#!/usr/bin/env node

/**
 * Streaming Inventory Analysis Script
 * 
 * Queries MongoDB to analyze actual streaming video data:
 * - How many publications have streaming
 * - What fields are populated
 * - What pricing models are used
 * - Revenue potential analysis
 * 
 * Run with: npx tsx scripts/analyzeStreamingInventory.ts
 */

// MUST load environment variables BEFORE any imports that use them
import { config } from 'dotenv';
config();

// Verify environment is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.error('\n💡 Please create a .env file with your MongoDB connection string:');
  console.error('   cp env.template .env');
  console.error('   # Then edit .env and add your MONGODB_URI\n');
  process.exit(1);
}

// NOW we can import MongoDB modules
import { connectToDatabase, getDatabase, closeConnection } from '../src/integrations/mongodb/index.js';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas.js';

interface StreamingChannel {
  channelId?: string;
  name?: string;
  platform?: string;
  subscribers?: number;
  averageViews?: number;
  contentType?: string;
  streamingSchedule?: string;
  frequency?: string; // This is what we're checking
  advertisingOpportunities?: any[];
}

interface StreamingAnalysis {
  publicationId: number;
  publicationName: string;
  channelCount: number;
  channels: {
    name?: string;
    platform?: string;
    subscribers?: number;
    averageViews?: number;
    frequency?: string;
    hasFrequency: boolean;
    adCount: number;
    ads: {
      name?: string;
      adFormat?: string;
      pricingModel?: string;
      flatRate?: number;
      cpm?: number;
      hasHubPricing: boolean;
      estimatedMonthlyRevenue?: number;
    }[];
  }[];
}

async function analyzeStreamingInventory() {
  console.log('🎬 Streaming Inventory Analysis\n');
  console.log('=' .repeat(70));

  try {
    // Connect to database
    console.log('\n📡 Connecting to MongoDB...');
    await connectToDatabase();
    const db = getDatabase();
    console.log('✅ Connected successfully!\n');

    // Query publications with streaming video
    const publications = await db.collection(COLLECTIONS.PUBLICATIONS)
      .find({ 'distributionChannels.streamingVideo': { $exists: true, $ne: [] } })
      .toArray();

    console.log(`📊 Found ${publications.length} publications with streaming video\n`);
    console.log('=' .repeat(70));

    if (publications.length === 0) {
      console.log('❌ No streaming inventory found in database');
      return;
    }

    const analyses: StreamingAnalysis[] = [];
    let totalChannels = 0;
    let totalAds = 0;
    let channelsWithFrequency = 0;
    let channelsWithoutFrequency = 0;
    const pricingModelCounts: Record<string, number> = {};
    let totalEstimatedRevenue = 0;

    // Analyze each publication
    for (const pub of publications) {
      const streamingChannels = pub.distributionChannels?.streamingVideo || [];
      
      const analysis: StreamingAnalysis = {
        publicationId: pub.publicationId,
        publicationName: pub.basicInfo?.publicationName || 'Unknown',
        channelCount: streamingChannels.length,
        channels: []
      };

      for (const channel of streamingChannels) {
        totalChannels++;
        const hasFrequency = !!channel.frequency;
        if (hasFrequency) channelsWithFrequency++;
        else channelsWithoutFrequency++;

        const ads = channel.advertisingOpportunities || [];
        totalAds += ads.length;

        const channelAnalysis: any = {
          name: channel.name,
          platform: channel.platform,
          subscribers: channel.subscribers,
          averageViews: channel.averageViews,
          frequency: channel.frequency,
          hasFrequency,
          adCount: ads.length,
          ads: []
        };

        // Analyze each ad
        for (const ad of ads) {
          const pricingModel = ad.pricing?.pricingModel || 'unknown';
          pricingModelCounts[pricingModel] = (pricingModelCounts[pricingModel] || 0) + 1;

          // Estimate monthly revenue
          let estimatedRevenue = 0;
          if (pricingModel === 'flat' && ad.pricing?.flatRate) {
            estimatedRevenue = ad.pricing.flatRate;
          } else if (pricingModel === 'cpm' && ad.pricing?.cpm && channel.averageViews) {
            estimatedRevenue = (ad.pricing.cpm * channel.averageViews) / 1000;
          } else if (pricingModel === 'per_spot' && ad.pricing?.flatRate && channel.frequency) {
            // Can only calculate if frequency exists
            const occurrences = getOccurrencesFromFrequency(channel.frequency);
            estimatedRevenue = ad.pricing.flatRate * occurrences;
          }

          totalEstimatedRevenue += estimatedRevenue;

          channelAnalysis.ads.push({
            name: ad.name,
            adFormat: ad.adFormat,
            pricingModel,
            flatRate: ad.pricing?.flatRate,
            cpm: ad.pricing?.cpm,
            hasHubPricing: !!(ad.hubPricing && ad.hubPricing.length > 0),
            estimatedMonthlyRevenue: estimatedRevenue > 0 ? estimatedRevenue : undefined
          });
        }

        analysis.channels.push(channelAnalysis);
      }

      analyses.push(analysis);
    }

    // Print detailed analysis
    for (const analysis of analyses) {
      console.log(`\n📰 ${analysis.publicationName} (ID: ${analysis.publicationId})`);
      console.log('─'.repeat(70));
      console.log(`   Streaming Channels: ${analysis.channelCount}`);

      for (const channel of analysis.channels) {
        console.log(`\n   📺 Channel: ${channel.name || 'Unnamed'}`);
        console.log(`      Platform: ${channel.platform || 'N/A'}`);
        console.log(`      Subscribers: ${channel.subscribers?.toLocaleString() || 'N/A'}`);
        console.log(`      Average Views: ${channel.averageViews?.toLocaleString() || 'N/A'}`);
        console.log(`      Frequency: ${channel.frequency || '❌ MISSING'} ${channel.hasFrequency ? '✅' : '🔴'}`);
        console.log(`      Advertising Opportunities: ${channel.adCount}`);

        if (channel.ads.length > 0) {
          console.log(`\n      💰 Advertising Opportunities:`);
          for (const ad of channel.ads) {
            console.log(`\n         • ${ad.name || 'Unnamed Ad'}`);
            console.log(`           Format: ${ad.adFormat || 'N/A'}`);
            console.log(`           Pricing Model: ${ad.pricingModel}`);
            if (ad.flatRate) console.log(`           Rate: $${ad.flatRate.toLocaleString()}`);
            if (ad.cpm) console.log(`           CPM: $${ad.cpm}`);
            console.log(`           Hub Pricing: ${ad.hasHubPricing ? '✅ Yes' : '❌ No'}`);
            if (ad.estimatedMonthlyRevenue) {
              console.log(`           Est. Monthly Revenue: $${ad.estimatedMonthlyRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
            } else {
              console.log(`           Est. Monthly Revenue: ⚠️  Cannot calculate (missing data)`);
            }
          }
        }
      }
    }

    // Print summary statistics
    console.log('\n\n' + '='.repeat(70));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(70));
    console.log(`\n📊 Inventory Overview:`);
    console.log(`   Publications with streaming: ${publications.length}`);
    console.log(`   Total streaming channels: ${totalChannels}`);
    console.log(`   Total advertising opportunities: ${totalAds}`);
    console.log(`   Avg ads per channel: ${(totalAds / totalChannels).toFixed(1)}`);

    console.log(`\n🔍 Frequency Field Analysis:`);
    console.log(`   Channels WITH frequency field: ${channelsWithFrequency} (${((channelsWithFrequency/totalChannels)*100).toFixed(0)}%)`);
    console.log(`   Channels WITHOUT frequency field: ${channelsWithoutFrequency} (${((channelsWithoutFrequency/totalChannels)*100).toFixed(0)}%) 🔴`);

    console.log(`\n💵 Pricing Models Used:`);
    for (const [model, count] of Object.entries(pricingModelCounts).sort((a, b) => b[1] - a[1])) {
      const percentage = ((count / totalAds) * 100).toFixed(0);
      console.log(`   ${model.padEnd(15)} ${count.toString().padStart(3)} ads (${percentage}%)`);
    }

    console.log(`\n💰 Revenue Potential:`);
    console.log(`   Total Estimated Monthly Revenue: $${totalEstimatedRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    console.log(`   Estimated Annual Revenue: $${(totalEstimatedRevenue * 12).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    console.log(`   Avg Revenue per Ad: $${(totalEstimatedRevenue / totalAds).toLocaleString(undefined, {maximumFractionDigits: 0})}`);

    console.log(`\n🎯 Key Findings:`);
    if (channelsWithoutFrequency > 0) {
      console.log(`   🔴 ${channelsWithoutFrequency} channel(s) missing frequency field`);
      console.log(`      Impact: Per-spot pricing calculations will fail`);
    }
    if (pricingModelCounts['per_spot'] > 0) {
      console.log(`   ⚠️  ${pricingModelCounts['per_spot']} ad(s) using per-spot pricing`);
      console.log(`      Status: Will show $0 revenue if frequency is missing`);
    }
    if (pricingModelCounts['flat'] > 0) {
      console.log(`   ✅ ${pricingModelCounts['flat']} ad(s) using flat pricing (working correctly)`);
    }
    if (pricingModelCounts['cpm'] > 0) {
      console.log(`   ✅ ${pricingModelCounts['cpm']} ad(s) using CPM pricing`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error analyzing streaming inventory:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

function getOccurrencesFromFrequency(frequency: string): number {
  const map: Record<string, number> = {
    'daily': 30,
    'weekly': 4.33,
    'bi-weekly': 2.17,
    'monthly': 1,
    'quarterly': 0.33,
    'irregular': 2
  };
  return map[frequency] || 1;
}

// Run the analysis
analyzeStreamingInventory()
  .then(() => {
    console.log('👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

