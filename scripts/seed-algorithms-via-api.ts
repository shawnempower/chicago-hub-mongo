/**
 * Seed Algorithm Configurations via API
 * 
 * This script seeds algorithms using the admin API endpoint.
 * Run the dev server first, then run this script.
 * 
 * Usage: 
 * 1. Make sure server is running: npm run dev
 * 2. Run: npx tsx scripts/seed-algorithms-via-api.ts
 */

import { AllInclusiveAlgorithm } from '../server/campaignAlgorithms/all-inclusive/config';
import { BudgetFriendlyAlgorithm } from '../server/campaignAlgorithms/budget-friendly/config';
import { LittleGuysAlgorithm } from '../server/campaignAlgorithms/little-guys/config';
import { ProportionalAlgorithm } from '../server/campaignAlgorithms/proportional/config';

const API_BASE_URL = 'http://localhost:5001/api';

async function getAuthToken(): Promise<string> {
  // You need to provide an admin user token
  const token = process.env.ADMIN_TOKEN || process.env.AUTH_TOKEN;
  
  if (!token) {
    console.error('❌ No auth token found!');
    console.error('Please set ADMIN_TOKEN or AUTH_TOKEN environment variable');
    console.error('Example: ADMIN_TOKEN="your-token-here" npx tsx scripts/seed-algorithms-via-api.ts');
    process.exit(1);
  }
  
  return token;
}

async function seedAlgorithm(algorithm: any, token: string) {
  const doc = {
    algorithmId: algorithm.id,
    name: algorithm.name,
    description: algorithm.description,
    icon: algorithm.icon,
    llmConfig: algorithm.llmConfig,
    constraints: algorithm.constraints,
    scoring: algorithm.scoring,
    promptInstructions: algorithm.promptInstructions,
    isActive: true,
    isDefault: algorithm.id === 'all-inclusive'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/admin/algorithms/${algorithm.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.log('🌱 Starting algorithm seeding via API...');
  console.log(`📡 API URL: ${API_BASE_URL}`);
  
  const token = await getAuthToken();
  console.log('✓ Auth token found');

  const algorithms = [
    AllInclusiveAlgorithm,
    BudgetFriendlyAlgorithm,
    LittleGuysAlgorithm,
    ProportionalAlgorithm
  ];

  let seeded = 0;
  let errors = 0;

  for (const algorithm of algorithms) {
    try {
      console.log(`\n📝 Seeding: ${algorithm.name} (${algorithm.id})...`);
      await seedAlgorithm(algorithm, token);
      console.log(`✅ Success: ${algorithm.name}`);
      seeded++;
    } catch (error: any) {
      console.error(`❌ Failed: ${algorithm.name}`);
      console.error(`   Error: ${error.message}`);
      errors++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Seeded: ${seeded} algorithms`);
  console.log(`   ❌ Errors: ${errors} algorithms`);
  console.log(`   📁 Total: ${seeded + errors} algorithms processed`);
  
  if (errors > 0) {
    console.log('\n⚠️  Some algorithms failed to seed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✨ All algorithms seeded successfully!');
    console.log('💡 You can now manage them via /admin → Algorithms tab');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

