/**
 * Test Campaign Analysis Endpoint
 * 
 * Run with: tsx scripts/testCampaignAnalyze.ts
 */

import dotenv from 'dotenv';
dotenv.config();

async function testCampaignAnalyze() {
  console.log('🧪 Testing Campaign Analysis Endpoint\n');

  // Check prerequisites
  console.log('📋 Prerequisites Check:');
  console.log('✓ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `SET (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ NOT SET');
  console.log('✓ MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : '❌ NOT SET');
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required. Add it to your .env file.');
    process.exit(1);
  }

  // Test payload
  const testPayload = {
    hubId: "chicago-hub",
    objectives: {
      primaryGoal: "brand awareness",
      targetAudience: "Small business owners in Chicago, ages 30-55, interested in local commerce",
      geographicTarget: ["Chicago", "South Side"],
      budget: {
        totalBudget: 50000,
        currency: "USD",
        billingCycle: "monthly"
      },
      channels: ["print", "website", "newsletter"]
    },
    timeline: {
      startDate: "2026-01-01T06:00:00.000Z",
      endDate: "2026-06-30T06:00:00.000Z"
    },
    includeAllOutlets: true
  };

  console.log('📤 Test Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log();

  console.log('🚀 Calling endpoint: http://localhost:3001/api/campaigns/analyze');
  console.log('⏳ This may take 10-30 seconds...\n');

  try {
    const response = await fetch('http://localhost:3001/api/campaigns/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need an auth token here
        // For testing, you may need to temporarily disable auth or add a test token
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('\n❌ Error Response:');
      console.error(JSON.stringify(error, null, 2));
      
      if (response.status === 401) {
        console.log('\n💡 Tip: This endpoint requires authentication.');
        console.log('   Either:');
        console.log('   1. Get a JWT token from the browser (localStorage.getItem("auth_token"))');
        console.log('   2. Or temporarily disable auth in server/index.ts for testing');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('\n✅ Success! Analysis Complete\n');
    console.log('📊 Results Summary:');
    console.log('─────────────────────────────────────────────');
    console.log('Total Publications:', data.selectedInventory?.totalPublications || 0);
    console.log('Total Inventory Items:', data.selectedInventory?.totalInventoryItems || 0);
    console.log('Total Cost:', `$${data.pricing?.total?.toLocaleString() || 0}`);
    console.log('Monthly Cost:', `$${data.pricing?.monthlyTotal?.toLocaleString() || 0}`);
    console.log('Estimated Reach:', `${data.estimatedPerformance?.reach?.min?.toLocaleString() || 0} - ${data.estimatedPerformance?.reach?.max?.toLocaleString() || 0}`);
    console.log('Estimated Impressions:', `${data.estimatedPerformance?.impressions?.min?.toLocaleString() || 0} - ${data.estimatedPerformance?.impressions?.max?.toLocaleString() || 0}`);
    console.log('CPM:', `$${data.estimatedPerformance?.cpm?.toFixed(2) || 0}`);
    console.log('Confidence:', `${((data.selectedInventory?.confidence || 0) * 100).toFixed(0)}%`);
    console.log('─────────────────────────────────────────────');

    if (data.selectedInventory?.channelBreakdown) {
      console.log('\n📺 Channel Breakdown:');
      Object.entries(data.selectedInventory.channelBreakdown).forEach(([channel, count]) => {
        console.log(`  ${channel}: ${count} placements`);
      });
    }

    if (data.pricing?.breakdown?.byChannel) {
      console.log('\n💰 Pricing by Channel:');
      Object.entries(data.pricing.breakdown.byChannel).forEach(([channel, cost]: [string, any]) => {
        console.log(`  ${channel}: $${cost.toLocaleString()}`);
      });
    }

    console.log('\n📝 Selection Reasoning:');
    console.log(data.selectedInventory?.selectionReasoning || 'No reasoning provided');

    console.log('\n✅ Full Response saved to: campaign-analysis-response.json');
    const fs = await import('fs');
    fs.writeFileSync('campaign-analysis-response.json', JSON.stringify(data, null, 2));

  } catch (error: any) {
    console.error('\n❌ Request Failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Server is not running. Start it with: npm run server:dev');
    }
    
    process.exit(1);
  }
}

// Run the test
testCampaignAnalyze();


