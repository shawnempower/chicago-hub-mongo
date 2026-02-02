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

/**
 * Remove hubPricing from all advertising opportunities in a publication.
 * Hub pricing should be set up by hub admins after import, not imported from JSON.
 * This prevents orphaned hub pricing entries when hub IDs don't match.
 */
function stripHubPricing(publication: any): void {
  const dc = publication.distributionChannels;
  if (!dc) return;

  // Website
  if (dc.website?.advertisingOpportunities) {
    for (const ad of dc.website.advertisingOpportunities) {
      delete ad.hubPricing;
    }
  }

  // Newsletters
  if (dc.newsletters) {
    for (const nl of dc.newsletters) {
      for (const ad of nl.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
    }
  }

  // Print
  if (Array.isArray(dc.print)) {
    for (const print of dc.print) {
      for (const ad of print.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
    }
  } else if (dc.print?.advertisingOpportunities) {
    for (const ad of dc.print.advertisingOpportunities) {
      delete ad.hubPricing;
    }
  }

  // Social Media
  if (dc.socialMedia) {
    for (const social of dc.socialMedia) {
      for (const ad of social.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
    }
  }

  // Events
  if (dc.events) {
    for (const event of dc.events) {
      for (const opp of event.advertisingOpportunities || event.sponsorshipOpportunities || []) {
        delete opp.hubPricing;
      }
    }
  }

  // Podcasts
  if (dc.podcasts) {
    for (const podcast of dc.podcasts) {
      for (const ad of podcast.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
    }
  }

  // Radio Stations
  if (dc.radioStations) {
    for (const radio of dc.radioStations) {
      for (const ad of radio.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
      for (const show of radio.shows || []) {
        for (const ad of show.advertisingOpportunities || []) {
          delete ad.hubPricing;
        }
      }
    }
  }

  // Streaming Video
  if (dc.streamingVideo) {
    for (const stream of dc.streamingVideo) {
      for (const ad of stream.advertisingOpportunities || []) {
        delete ad.hubPricing;
      }
    }
  }
}

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
        
        // Strip hubPricing from all distribution channels - hub pricing should be set up
        // by hub admins after import, not imported from JSON
        stripHubPricing(publicationData);
        
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
