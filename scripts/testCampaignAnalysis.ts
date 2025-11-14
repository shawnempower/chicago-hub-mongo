/**
 * Test Campaign Analysis
 * 
 * Quick test script to verify the Campaign Builder LLM integration
 * 
 * Usage:
 *   npx tsx scripts/testCampaignAnalysis.ts
 */

// Load environment variables first!
import dotenv from 'dotenv';
dotenv.config();

import { campaignLLMService } from '../server/campaignLLMService';
import { CampaignAnalysisRequest } from '../src/integrations/mongodb/campaignSchema';
import { connectToDatabase } from '../src/integrations/mongodb/client';
import * as fs from 'fs';

async function testCampaignAnalysis() {
  console.log('🧪 Testing Campaign Analysis\n');
  console.log('=' .repeat(60));
  
  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    console.error('   Add it to your .env file');
    process.exit(1);
  }
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
    console.error('   Add it to your .env file');
    process.exit(1);
  }
  
  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  try {
    await connectToDatabase();
    console.log('✅ MongoDB connected\n');
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
  
  console.log('✅ OpenAI API Key found');
  console.log('🔑 Key:', process.env.OPENAI_API_KEY.substring(0, 15) + '...\n');
  
  // View current config
  const config = campaignLLMService.getConfig();
  console.log('⚙️  Current LLM Config:');
  console.log('   Model:', config.model.name);
  console.log('   Temperature:', config.model.temperature);
  console.log('   Max Tokens:', config.model.maxTokens);
  console.log('   Enforce All Outlets:', config.pressForward.enforceAllOutlets);
  console.log('   Verbose Logging:', config.output.verboseLogging);
  console.log('');
  
  // Test request - 30-day campaign with $50k TOTAL budget
  const testRequest: CampaignAnalysisRequest = {
    hubId: 'chicago-hub',
    objectives: {
      primaryGoal: 'brand awareness',
      targetAudience: 'Small business owners in Chicago, ages 30-55, interested in local commerce and community engagement',
      geographicTarget: ['Chicago', 'Evanston', 'Oak Park'],
      budget: {
        totalBudget: 50000, // This is the TOTAL campaign budget, not per month!
        currency: 'USD',
        billingCycle: 'one-time' // Changed from 'monthly' - this is how the client pays, NOT a multiplier
      },
      channels: ['print', 'website', 'newsletter', 'radio'],
      includeAllOutlets: true
    },
    timeline: {
      startDate: new Date('2026-01-01'), // Jan 1, 2026
      endDate: new Date('2026-01-30')    // Jan 30, 2026 (30-day campaign)
    },
    includeAllOutlets: true
  };
  
  const durationDays = Math.ceil((testRequest.timeline.endDate.getTime() - testRequest.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log('📋 Test Campaign Request:');
  console.log('   Hub:', testRequest.hubId);
  console.log('   Goal:', testRequest.objectives.primaryGoal);
  console.log('   Budget:', `$${testRequest.objectives.budget.totalBudget.toLocaleString()} TOTAL (${testRequest.objectives.budget.billingCycle} payment)`);
  console.log('   Duration:', `${durationDays} days (${testRequest.timeline.startDate.toLocaleDateString()} - ${testRequest.timeline.endDate.toLocaleDateString()})`);
  console.log('   Channels:', testRequest.objectives.channels?.join(', '));
  console.log('   Include All Outlets:', testRequest.includeAllOutlets);
  console.log('');
  
  console.log('=' .repeat(60));
  console.log('🤖 Calling LLM...\n');
  
  try {
    const startTime = Date.now();
    const result = await campaignLLMService.analyzeCampaign(testRequest);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ ANALYSIS COMPLETE\n');
    
    console.log('⏱️  Duration:', duration + 's\n');
    
    console.log('📊 RESULTS:');
    console.log('─'.repeat(60));
    console.log('Publications Selected:', result.selectedInventory.totalPublications);
    console.log('Total Ad Units:', result.selectedInventory.totalInventoryItems);
    console.log('');
    
    console.log('💰 PRICING:');
    console.log('─'.repeat(60));
    console.log('Monthly Total:', `$${result.pricing.monthlyTotal?.toLocaleString() || 'N/A'}`);
    console.log('Campaign Total:', `$${result.pricing.total?.toLocaleString()}`);
    console.log('');
    
    console.log('📈 PERFORMANCE:');
    console.log('─'.repeat(60));
    console.log('Estimated Reach:', result.estimatedPerformance.reach.description);
    console.log('Estimated Impressions:', 
      `${result.estimatedPerformance.impressions.min.toLocaleString()} - ${result.estimatedPerformance.impressions.max.toLocaleString()}`
    );
    console.log('Estimated CPM:', `$${result.estimatedPerformance.cpm?.toFixed(2) || 'N/A'}`);
    console.log('');
    
    console.log('📺 CHANNELS:');
    console.log('─'.repeat(60));
    Object.entries(result.selectedInventory.channelBreakdown || {}).forEach(([channel, count]) => {
      console.log(`   ${channel.padEnd(15)}: ${count} ad units`);
    });
    console.log('');
    
    console.log('🧠 AI REASONING:');
    console.log('─'.repeat(60));
    console.log(result.selectedInventory.selectionReasoning);
    console.log('');
    
    if (result.selectedInventory.confidence) {
      console.log('🎯 Confidence Score:', (result.selectedInventory.confidence * 100).toFixed(0) + '%');
      console.log('');
    }
    
    console.log('=' .repeat(60));
    console.log('✅ Test completed successfully!\n');
    
    // Save full result to file for inspection
    const outputPath = './test-campaign-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`📄 Full result saved to: ${outputPath}`);
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCampaignAnalysis().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

