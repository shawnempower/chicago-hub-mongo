/**
 * Direct Test of Campaign LLM Service
 * 
 * This tests the LLM service directly without needing auth
 * Run with: npx tsx scripts/testCampaignLLMService.ts
 */

import dotenv from 'dotenv';
dotenv.config();

async function testLLMService() {
  console.log('🧪 Testing Campaign LLM Service Directly\n');

  // Check prerequisites
  console.log('📋 Prerequisites Check:');
  console.log('✓ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `SET (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ NOT SET');
  console.log('✓ MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : '❌ NOT SET');
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required. Add it to your .env file.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is required. Add it to your .env file.');
    process.exit(1);
  }

  try {
    // Import the service
    console.log('📦 Loading Campaign LLM Service...');
    const { campaignLLMService } = await import('../server/campaignLLMService');
    console.log('✅ Service loaded successfully\n');

    // Test request
    const testRequest = {
      hubId: "chicago-hub",
      objectives: {
        primaryGoal: "brand awareness",
        targetAudience: "Small business owners in Chicago, ages 30-55, interested in local commerce",
        geographicTarget: ["Chicago", "South Side"],
        budget: {
          totalBudget: 50000,
          currency: "USD",
          billingCycle: "monthly" as const
        },
        channels: ["print", "website", "newsletter"]
      },
      timeline: {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30")
      },
      includeAllOutlets: true
    };

    console.log('📤 Test Request:');
    console.log('  Hub:', testRequest.hubId);
    console.log('  Budget:', `$${testRequest.objectives.budget.totalBudget.toLocaleString()}/month`);
    console.log('  Duration:', `${testRequest.timeline.startDate.toLocaleDateString()} - ${testRequest.timeline.endDate.toLocaleDateString()}`);
    console.log('  Channels:', testRequest.objectives.channels.join(', '));
    console.log('  Include All Outlets:', testRequest.includeAllOutlets);
    console.log();

    console.log('🚀 Calling LLM Service...');
    console.log('⏳ This may take 15-45 seconds (querying DB + calling OpenAI)...\n');

    const startTime = Date.now();
    const result = await campaignLLMService.analyzeCampaign(testRequest);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Analysis Complete in ${elapsed}s!\n`);
    console.log('═══════════════════════════════════════════════');
    console.log('📊 CAMPAIGN ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📈 Inventory Selection:');
    console.log('  Publications:', result.selectedInventory?.totalPublications || 0);
    console.log('  Total Items:', result.selectedInventory?.totalInventoryItems || 0);
    console.log('  Confidence:', `${((result.selectedInventory?.confidence || 0) * 100).toFixed(0)}%`);
    console.log();

    if (result.selectedInventory?.channelBreakdown) {
      console.log('📺 By Channel:');
      Object.entries(result.selectedInventory.channelBreakdown).forEach(([channel, count]) => {
        console.log(`  ${channel}: ${count} placements`);
      });
      console.log();
    }

    console.log('💰 Pricing:');
    console.log('  Subtotal:', `$${result.pricing?.subtotal?.toLocaleString() || 0}`);
    console.log('  Monthly:', `$${result.pricing?.monthlyTotal?.toLocaleString() || 0}`);
    console.log('  Total:', `$${result.pricing?.total?.toLocaleString() || 0}`);
    console.log();

    if (result.pricing?.breakdown?.byChannel) {
      console.log('💵 Cost by Channel:');
      Object.entries(result.pricing.breakdown.byChannel).forEach(([channel, cost]: [string, any]) => {
        console.log(`  ${channel}: $${cost?.toLocaleString() || 0}`);
      });
      console.log();
    }

    console.log('🎯 Performance Estimates:');
    console.log('  Reach:', `${result.estimatedPerformance?.reach?.min?.toLocaleString() || 0} - ${result.estimatedPerformance?.reach?.max?.toLocaleString() || 0} people`);
    console.log('  Impressions:', `${result.estimatedPerformance?.impressions?.min?.toLocaleString() || 0} - ${result.estimatedPerformance?.impressions?.max?.toLocaleString() || 0}`);
    console.log('  CPM:', `$${result.estimatedPerformance?.cpm?.toFixed(2) || 0}`);
    console.log();

    console.log('💡 AI Reasoning:');
    console.log('─────────────────────────────────────────────');
    const reasoning = result.selectedInventory?.selectionReasoning || 'No reasoning provided';
    console.log(reasoning.substring(0, 500) + (reasoning.length > 500 ? '...' : ''));
    console.log('─────────────────────────────────────────────\n');

    // Sample publications
    if (result.selectedInventory?.publications && result.selectedInventory.publications.length > 0) {
      console.log('📰 Sample Publications (first 3):');
      result.selectedInventory.publications.slice(0, 3).forEach((pub, idx) => {
        console.log(`\n  ${idx + 1}. ${pub.publicationName}`);
        console.log(`     Items: ${pub.inventoryItems?.length || 0}`);
        console.log(`     Cost: $${pub.publicationTotal?.toLocaleString() || 0}`);
        if (pub.inventoryItems && pub.inventoryItems.length > 0) {
          console.log(`     Sample: ${pub.inventoryItems[0].itemName} (${pub.inventoryItems[0].channel})`);
        }
      });
      console.log();
    }

    console.log('═══════════════════════════════════════════════');
    console.log('✅ TEST PASSED! Campaign Builder is working!\n');

    // Save full result
    const fs = await import('fs');
    const filename = 'campaign-llm-test-result.json';
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`📄 Full response saved to: ${filename}`);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!\n');
    console.error('Error:', error.message);
    console.error();
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 MongoDB connection refused. Is MongoDB running?');
    } else if (error.message?.includes('API key')) {
      console.error('💡 OpenAI API key issue. Check your key is valid and has credits.');
    } else if (error.message?.includes('publications')) {
      console.error('💡 No publications found. Ensure chicago-hub has publications with hub pricing in MongoDB.');
    }
    
    process.exit(1);
  }
}

// Run the test
testLLMService().catch(console.error);


