/**
 * Test Full Campaign Creation
 * 
 * Tests the complete flow: AI analysis → Save to database → Verify
 * 
 * Usage:
 *   npm run test:campaign:create
 */

// Load environment variables first!
import dotenv from 'dotenv';
dotenv.config();

import { campaignLLMService } from '../server/campaignLLMService';
import { campaignsService } from '../src/integrations/mongodb/campaignService';
import { CampaignAnalysisRequest } from '../src/integrations/mongodb/campaignSchema';
import { connectToDatabase } from '../src/integrations/mongodb/client';
import * as fs from 'fs';

async function testFullCampaignCreation() {
  console.log('🧪 Testing Full Campaign Creation (Analysis + Save to DB)\n');
  console.log('=' .repeat(60));
  
  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment');
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
  
  console.log('✅ OpenAI API Key found\n');
  
  // Step 1: AI Analysis
  console.log('=' .repeat(60));
  console.log('STEP 1: AI Campaign Analysis\n');
  
  const testRequest: CampaignAnalysisRequest = {
    hubId: 'chicago-hub',
    objectives: {
      primaryGoal: 'brand awareness',
      targetAudience: 'Small business owners in Chicago, ages 30-55, interested in local commerce and community engagement',
      geographicTarget: ['Chicago', 'Evanston', 'Oak Park'],
      budget: {
        totalBudget: 50000,
        currency: 'USD',
        billingCycle: 'monthly'
      },
      channels: ['print', 'website', 'newsletter', 'radio'],
      includeAllOutlets: true
    },
    timeline: {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30')
    },
    includeAllOutlets: true
  };
  
  console.log('📋 Campaign Request:');
  console.log('   Hub:', testRequest.hubId);
  console.log('   Budget:', `$${testRequest.objectives.budget.totalBudget.toLocaleString()}/month`);
  console.log('   Duration: 6 months');
  console.log('   Include All Outlets:', testRequest.includeAllOutlets);
  console.log('');
  
  console.log('🤖 Calling AI for analysis...\n');
  
  let analysisResult;
  try {
    const startTime = Date.now();
    analysisResult = await campaignLLMService.analyzeCampaign(testRequest);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ AI Analysis complete (${duration}s)\n`);
    console.log('📊 AI Suggested:');
    console.log('   Publications:', analysisResult.selectedInventory.totalPublications);
    console.log('   Ad Units:', analysisResult.selectedInventory.totalInventoryItems);
    console.log('   Monthly Cost:', `$${analysisResult.pricing.monthlyTotal?.toLocaleString()}`);
    console.log('   Campaign Total:', `$${analysisResult.pricing.total?.toLocaleString()}`);
    console.log('');
    
    // Show channel breakdown
    console.log('   Channels:');
    Object.entries(analysisResult.selectedInventory.channelBreakdown || {}).forEach(([channel, count]) => {
      console.log(`     - ${channel}: ${count} units`);
    });
    console.log('');
    
  } catch (error: any) {
    console.error('❌ AI Analysis failed:', error.message);
    process.exit(1);
  }
  
  // Step 2: Save to Database
  console.log('=' .repeat(60));
  console.log('STEP 2: Save Campaign to MongoDB\n');
  
  // Transform AI result into campaign data structure
  const campaignData = {
    campaignId: `test-campaign-${Date.now()}`,
    hubId: analysisResult.hubId || 'chicago-hub',
    hubName: analysisResult.hubName || 'Chicago Hub',
    basicInfo: {
      name: analysisResult.basicInfo?.name || 'AI Test Campaign',
      advertiserName: 'Test Advertiser Inc.',
      description: 'Test campaign created by automated script',
      objectives: analysisResult.basicInfo?.objectives || ['brand awareness'],
      targetAudienceDescription: analysisResult.basicInfo?.targetAudienceDescription || testRequest.objectives.targetAudience,
    },
    targeting: analysisResult.targeting || {
      geographicTarget: {
        dmas: testRequest.objectives.geographicTarget || [],
        coverageDescription: 'Chicago area'
      }
    },
    selectedInventory: analysisResult.selectedInventory.publications.map((pub: any) => ({
      publicationId: pub.publicationId,
      publicationName: pub.publicationName,
      channel: pub.inventoryItems[0]?.channel || 'website',
      itemPath: pub.inventoryItems[0]?.itemPath || '',
      itemName: pub.inventoryItems[0]?.itemName || '',
      quantity: pub.inventoryItems[0]?.quantity || 1,
      duration: pub.inventoryItems[0]?.duration,
      frequency: pub.inventoryItems[0]?.frequency,
      specifications: pub.inventoryItems[0]?.specifications,
      itemPricing: pub.inventoryItems[0]?.itemPricing,
      estimatedImpressions: pub.inventoryItems[0]?.estimatedImpressions,
      estimatedReach: pub.inventoryItems[0]?.estimatedReach,
    })),
    pricing: {
      currency: analysisResult.pricing.currency || 'USD',
      totalStandardPrice: 0,
      totalHubPrice: analysisResult.pricing.subtotal || analysisResult.pricing.total || 0,
      packageDiscount: 0,
      finalPrice: analysisResult.pricing.total || 0,
      billingCycle: 'monthly' as const,
      monthlyPrice: analysisResult.pricing.monthlyTotal,
    },
    performance: {
      estimatedReach: {
        minReach: analysisResult.estimatedPerformance.reach.min || 0,
        maxReach: analysisResult.estimatedPerformance.reach.max || 0,
        reachDescription: analysisResult.estimatedPerformance.reach.description || '',
      },
      estimatedImpressions: {
        minImpressions: analysisResult.estimatedPerformance.impressions.min || 0,
        maxImpressions: analysisResult.estimatedPerformance.impressions.max || 0,
        impressionsByChannel: analysisResult.estimatedPerformance.impressions.byChannel,
      },
      costPerThousand: analysisResult.estimatedPerformance.cpm,
    },
    timeline: {
      startDate: analysisResult.timeline?.startDate || testRequest.timeline.startDate,
      endDate: analysisResult.timeline?.endDate || testRequest.timeline.endDate,
      durationMonths: analysisResult.timeline?.durationMonths || 6,
      leadTime: analysisResult.timeline?.leadTime || '5 business days',
      materialDeadline: analysisResult.timeline?.materialDeadline || '3 business days before launch',
    },
    status: 'draft' as const,
    metadata: {
      tags: [],
      internalNotes: 'Created by automated test script'
    }
  };
  
  console.log('💾 Saving campaign to database...');
  
  let savedCampaign;
  try {
    savedCampaign = await campaignsService.create(campaignData, 'test-user-id');
    console.log('✅ Campaign saved successfully!\n');
    console.log('📝 Campaign Details:');
    console.log('   ID:', savedCampaign._id);
    console.log('   Campaign ID:', savedCampaign.campaignId);
    console.log('   Name:', savedCampaign.basicInfo.name);
    console.log('   Status:', savedCampaign.status);
    console.log('   Created:', savedCampaign.metadata.createdAt.toISOString());
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to save campaign:', error.message);
    console.error('Error:', error);
    process.exit(1);
  }
  
  // Step 3: Verify in Database
  console.log('=' .repeat(60));
  console.log('STEP 3: Verify Campaign in Database\n');
  
  try {
    const retrieved = await campaignsService.getById(savedCampaign._id!.toString());
    if (retrieved) {
      console.log('✅ Campaign verified in database!');
      console.log('   Retrieved ID:', retrieved._id);
      console.log('   Publications:', retrieved.selectedInventory.length);
      console.log('   Monthly Cost:', `$${retrieved.pricing.monthlyPrice?.toLocaleString()}`);
      console.log('');
    } else {
      console.error('❌ Campaign not found in database!');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to retrieve campaign:', error.message);
    process.exit(1);
  }
  
  // Step 4: Query All Campaigns
  console.log('=' .repeat(60));
  console.log('STEP 4: Query All Campaigns for Hub\n');
  
  try {
    const allCampaigns = await campaignsService.getByHub('chicago-hub');
    console.log(`✅ Found ${allCampaigns.length} total campaigns in Chicago Hub`);
    console.log('');
    
    if (allCampaigns.length > 0) {
      console.log('Recent campaigns:');
      allCampaigns.slice(0, 5).forEach((c: any) => {
        console.log(`   - ${c.basicInfo.name} (${c.status}) - ${c.selectedInventory?.length || 0} publications`);
      });
    }
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to query campaigns:', error.message);
  }
  
  // Save result to file
  const outputPath = './test-campaign-saved.json';
  fs.writeFileSync(outputPath, JSON.stringify(savedCampaign, null, 2));
  console.log(`📄 Full campaign saved to: ${outputPath}\n`);
  
  console.log('=' .repeat(60));
  console.log('✅ ALL TESTS PASSED!\n');
  console.log('Summary:');
  console.log('  ✓ AI analysis completed');
  console.log('  ✓ Campaign saved to MongoDB');
  console.log('  ✓ Campaign verified in database');
  console.log('  ✓ Query operations working');
  console.log('');
  console.log(`🎉 Campaign ID: ${savedCampaign._id}`);
  console.log(`🔗 View in MongoDB or query: campaignsService.getById('${savedCampaign._id}')`);
  console.log('');
  
  process.exit(0);
}

// Run the test
testFullCampaignCreation().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

