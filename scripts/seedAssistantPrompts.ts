/**
 * Seed Assistant Prompt Defaults
 * 
 * Run this script to populate the assistant_instructions collection
 * with the default prompt configurations. Safe to re-run -- it only
 * inserts keys that don't already exist.
 * 
 * Usage:
 *   npx tsx scripts/seedAssistantPrompts.ts
 * 
 * Requires MONGODB_URI (or MONGODB_URL) environment variable.
 */

import 'dotenv/config';
import { getClient, getDatabase } from '../src/integrations/mongodb/client';
import { PromptConfigService } from '../server/services/promptConfigService';

async function main() {
  console.log('Connecting to MongoDB...');
  
  // Ensure connection is established
  const client = getClient();
  const db = getDatabase();
  const dbName = db.databaseName;
  console.log(`Connected to database: ${dbName}`);

  console.log('\nSeeding assistant prompt defaults...');
  const result = await PromptConfigService.seedDefaults('system');

  if (result.seeded.length > 0) {
    console.log(`\nSeeded ${result.seeded.length} prompt(s):`);
    for (const key of result.seeded) {
      console.log(`  + ${key}`);
    }
  }

  if (result.skipped.length > 0) {
    console.log(`\nSkipped ${result.skipped.length} prompt(s) (already exist):`);
    for (const key of result.skipped) {
      console.log(`  - ${key}`);
    }
  }

  console.log('\nDone!');
  
  // Close the connection
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('Error seeding prompts:', error);
  process.exit(1);
});
