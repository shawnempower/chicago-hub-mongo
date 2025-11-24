/**
 * PHASE 7: Calculation Validation Script
 * 
 * Validates that campaign pricing and reach calculations match
 * the shared utility calculations used by the package system.
 * 
 * Usage: npx tsx scripts/validate-calculations.ts [campaignId]
 */

import { getDatabase, connectToDatabase } from '../src/integrations/mongodb/client';
import { Campaign } from '../src/integrations/mongodb/campaignSchema';
import { calculateCampaignTotal, calculatePublicationTotal } from '../src/utils/inventoryPricing';
import { calculatePackageReach } from '../src/utils/reachCalculations';

interface ValidationResult {
  campaignId: string;
  campaignName: string;
  pricing: {
    isValid: boolean;
    stored: number;
    calculated: number;
    discrepancy: number;
    percentDiff: number;
  };
  reach: {
    isValid: boolean;
    stored: number;
    calculated: number;
    discrepancy: number;
    percentDiff: number;
  };
}

async function validateCampaign(campaign: Campaign): Promise<ValidationResult> {
  const durationMonths = campaign.timeline?.durationMonths || 1;
  const publications = campaign.selectedInventory?.publications || [];

  // Validate pricing using shared utilities
  const calculatedPricing = calculateCampaignTotal(publications, durationMonths);
  const storedPricing = campaign.pricing?.subtotal || campaign.pricing?.finalPrice || 0;
  const pricingDiscrepancy = Math.abs(calculatedPricing - storedPricing);
  const pricingPercentDiff = storedPricing > 0 ? (pricingDiscrepancy / storedPricing) * 100 : 0;

  // Validate reach using shared utilities
  const reachSummary = calculatePackageReach(publications);
  const calculatedReach = reachSummary.estimatedUniqueReach;
  const storedReach = campaign.estimatedPerformance?.reach?.min || 
                      campaign.estimatedPerformance?.reach?.max || 0;
  const reachDiscrepancy = Math.abs(calculatedReach - storedReach);
  const reachPercentDiff = storedReach > 0 ? (reachDiscrepancy / storedReach) * 100 : 0;

  return {
    campaignId: campaign.campaignId,
    campaignName: campaign.basicInfo.name,
    pricing: {
      isValid: pricingPercentDiff < 1, // Allow 1% difference for rounding
      stored: storedPricing,
      calculated: calculatedPricing,
      discrepancy: pricingDiscrepancy,
      percentDiff: pricingPercentDiff
    },
    reach: {
      isValid: reachPercentDiff < 10, // Allow 10% difference (reach is less precise)
      stored: storedReach,
      calculated: calculatedReach,
      discrepancy: reachDiscrepancy,
      percentDiff: reachPercentDiff
    }
  };
}

async function main() {
  try {
    console.log('🔍 Campaign Calculation Validator\n');
    console.log('Validating that campaigns use shared utility calculations...\n');

    await connectToDatabase();
    const db = getDatabase();
    const campaignsCollection = db.collection<Campaign>('campaigns');

    // Get campaign ID from command line args if provided
    const targetCampaignId = process.argv[2];

    let campaigns: Campaign[];
    if (targetCampaignId) {
      console.log(`Validating single campaign: ${targetCampaignId}\n`);
      const campaign = await campaignsCollection.findOne({ 
        campaignId: targetCampaignId,
        deletedAt: { $exists: false }
      });
      campaigns = campaign ? [campaign] : [];
    } else {
      console.log('Validating all active campaigns...\n');
      campaigns = await campaignsCollection.find({
        deletedAt: { $exists: false },
        'selectedInventory.publications': { $exists: true, $ne: [] }
      }).limit(50).toArray();
    }

    if (campaigns.length === 0) {
      console.log('❌ No campaigns found to validate');
      process.exit(1);
    }

    const results: ValidationResult[] = [];
    let passCount = 0;
    let failCount = 0;

    for (const campaign of campaigns) {
      const result = await validateCampaign(campaign);
      results.push(result);

      const pricingStatus = result.pricing.isValid ? '✅' : '⚠️';
      const reachStatus = result.reach.isValid ? '✅' : '⚠️';

      console.log(`${pricingStatus}${reachStatus} ${result.campaignName} (${result.campaignId})`);
      
      if (!result.pricing.isValid) {
        console.log(`   Pricing: $${result.pricing.stored.toFixed(2)} (stored) vs $${result.pricing.calculated.toFixed(2)} (calculated) - ${result.pricing.percentDiff.toFixed(2)}% diff`);
      }
      
      if (!result.reach.isValid) {
        console.log(`   Reach: ${result.reach.stored.toLocaleString()} (stored) vs ${result.reach.calculated.toLocaleString()} (calculated) - ${result.reach.percentDiff.toFixed(2)}% diff`);
      }

      if (result.pricing.isValid && result.reach.isValid) {
        passCount++;
      } else {
        failCount++;
      }

      console.log('');
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Validation Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total campaigns validated: ${results.length}`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`⚠️  Warnings: ${failCount}`);
    console.log(`Success rate: ${((passCount / results.length) * 100).toFixed(1)}%\n`);

    // Detailed statistics
    const pricingIssues = results.filter(r => !r.pricing.isValid).length;
    const reachIssues = results.filter(r => !r.reach.isValid).length;

    if (pricingIssues > 0) {
      console.log(`⚠️  ${pricingIssues} campaign(s) with pricing discrepancies`);
      const avgPricingDiff = results
        .filter(r => !r.pricing.isValid)
        .reduce((sum, r) => sum + r.pricing.percentDiff, 0) / pricingIssues;
      console.log(`   Average discrepancy: ${avgPricingDiff.toFixed(2)}%`);
    }

    if (reachIssues > 0) {
      console.log(`⚠️  ${reachIssues} campaign(s) with reach discrepancies`);
      const avgReachDiff = results
        .filter(r => !r.reach.isValid)
        .reduce((sum, r) => sum + r.reach.percentDiff, 0) / reachIssues;
      console.log(`   Average discrepancy: ${avgReachDiff.toFixed(2)}%`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (failCount === 0) {
      console.log('✅ All campaigns use consistent calculations!');
      console.log('   Pricing and reach match shared utility calculations.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some campaigns have calculation discrepancies.');
      console.log('   Review warnings above. Small differences may be acceptable.');
      console.log('   Large differences indicate calculations not using shared utilities.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  }
}

main();

