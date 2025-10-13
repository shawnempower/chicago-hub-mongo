#!/usr/bin/env tsx

/**
 * Script to verify the imported publications exist in MongoDB
 */

import 'dotenv/config';
import { publicationsService } from '@/integrations/mongodb/services';
import { connectToDatabase } from '@/integrations/mongodb/client';

const expectedPublications = [
  { id: 5001, name: "New - AirGo Radio" },
  { id: 5002, name: "New - Chicago Public Square" },
  { id: 5003, name: "New - Chicago News Weekly" },
  { id: 5004, name: "New - WRLL 1450 AM" },
  { id: 5005, name: "New - WVON 1690 AM" }
];

async function verifyImport() {
  try {
    console.log('🔍 Verifying publication import...');
    await connectToDatabase();

    let found = 0;
    let missing = 0;

    for (const expected of expectedPublications) {
      try {
        const publication = await publicationsService.getByPublicationId(expected.id);
        if (publication) {
          console.log(`✅ Found: ${expected.name} (ID: ${expected.id})`);
          found++;
        } else {
          console.log(`❌ Missing: ${expected.name} (ID: ${expected.id})`);
          missing++;
        }
      } catch (error) {
        console.log(`❌ Error checking ${expected.name}: ${error}`);
        missing++;
      }
    }

    console.log('\n📊 Verification Summary:');
    console.log(`   - Found: ${found} publications`);
    console.log(`   - Missing: ${missing} publications`);

    if (missing === 0) {
      console.log('\n🎉 All publications successfully imported!');
    } else {
      console.log('\n⚠️  Some publications are missing from the database.');
    }

  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  verifyImport().then(() => {
    console.log('Verification completed');
    process.exit(0);
  }).catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

export { verifyImport };
