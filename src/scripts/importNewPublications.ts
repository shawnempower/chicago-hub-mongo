#!/usr/bin/env tsx

/**
 * Script to import the 5 new publication JSON files to MongoDB
 * Files to import:
 * - airgo_radio_profile.json
 * - chicago_public_square_json.json  
 * - cnw_publisher_profile.json
 * - wrll_publisher_profile.json
 * - wvon_profile.json
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { publicationsService } from '@/integrations/mongodb/services';
import { connectToDatabase } from '@/integrations/mongodb/client';

const publicationFiles = [
  'airgo_radio_profile.json',
  'chicago_public_square_json.json',
  'cnw_publisher_profile.json', 
  'wrll_publisher_profile.json',
  'wvon_profile.json'
];

async function importNewPublications() {
  try {
    console.log('🚀 Starting import of new publication files...');
    console.log('🔧 Connecting to MongoDB...');
    
    // Connect to database
    await connectToDatabase();
    
    console.log(`📋 Files to import: ${publicationFiles.join(', ')}\n`);

    const publicationsDir = path.resolve('json_files/publications');
    
    // Verify all files exist
    for (const filename of publicationFiles) {
      const filePath = path.join(publicationsDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import each file
    for (const filename of publicationFiles) {
      const filePath = path.join(publicationsDir, filename);
      console.log(`📁 Processing ${filename}...`);
      
      try {
        // Read and parse the JSON file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const publicationData = JSON.parse(fileContent);
        
        // Check if publication already exists
        const existing = await publicationsService.getByPublicationId(publicationData.publicationId);
        
        if (existing) {
          console.log(`⏭️  Publication ${publicationData.publicationId} (${publicationData.basicInfo?.publicationName}) already exists - skipping`);
          skipped++;
        } else {
          // Create new publication
          await publicationsService.create(publicationData);
          console.log(`✅ Successfully imported ${publicationData.basicInfo?.publicationName} (ID: ${publicationData.publicationId})`);
          imported++;
        }
        
      } catch (error) {
        console.error(`❌ Error importing ${filename}:`, error);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   - Imported: ${imported} publications`);
    console.log(`   - Skipped: ${skipped} publications (already exist)`);
    console.log(`   - Errors: ${errors} publications`);
    console.log('\n🎉 Publication import process completed!');
    
  } catch (error) {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  }
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  importNewPublications().then(() => {
    console.log('Import script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Import script failed:', error);
    process.exit(1);
  });
}

export { importNewPublications };
