#!/usr/bin/env node

/**
 * Website Ad Sizes Migration Script
 * 
 * Migrates website advertising opportunities from:
 *   - OLD: specifications.size (string)
 *   - NEW: sizes (array of strings)
 * 
 * Usage:
 *   node scripts/migrate-website-sizes.cjs           # Dry run
 *   node scripts/migrate-website-sizes.cjs --live    # Apply changes
 */

const path = require('path');
const fs = require('fs');

// Read environment variables
require('dotenv').config();

// MongoDB connection
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';
const COLLECTION_NAME = 'publications';

/**
 * Migrate a single website ad from specifications.size to sizes array
 */
function migrateWebsiteAd(ad) {
  if (!ad) return ad;

  const updated = { ...ad };

  // If already has sizes array with values, keep it
  if (Array.isArray(updated.sizes) && updated.sizes.length > 0) {
    // Clean up sizes array (remove empty strings, trim whitespace)
    updated.sizes = updated.sizes
      .map(s => s?.trim())
      .filter(s => s && s.length > 0);
    
    // Remove deprecated specifications.size field
    if (updated.specifications?.size) {
      delete updated.specifications.size;
    }
    
    return updated;
  }

  // If has specifications.size, migrate it to sizes array
  if (updated.specifications?.size) {
    const size = updated.specifications.size;
    
    // Convert single size to array
    updated.sizes = [size];
    
    // Remove deprecated field
    delete updated.specifications.size;
    
    return updated;
  }

  // If has neither, but has a specification object, leave as is
  // (might need manual review)
  return updated;
}

/**
 * Migrate a publication's website advertising opportunities
 */
function migratePublication(publication) {
  const updated = { ...publication };

  if (!publication.distributionChannels?.website?.advertisingOpportunities) {
    return updated;
  }

  const website = publication.distributionChannels.website;
  
  // Migrate each ad
  const migratedAds = website.advertisingOpportunities.map(ad => migrateWebsiteAd(ad));

  updated.distributionChannels = {
    ...updated.distributionChannels,
    website: {
      ...website,
      advertisingOpportunities: migratedAds
    }
  };

  return updated;
}

/**
 * Check if a publication needs migration
 */
function needsMigration(publication) {
  const ads = publication.distributionChannels?.website?.advertisingOpportunities;
  if (!ads || !Array.isArray(ads)) return false;

  // Check if any ad has specifications.size or empty/invalid sizes array
  return ads.some(ad => {
    // Has old field
    if (ad.specifications?.size) return true;
    
    // Has invalid sizes array (empty, null, or has empty strings)
    if (!Array.isArray(ad.sizes)) return false;
    if (ad.sizes.length === 0) return false;
    if (ad.sizes.some(s => !s || s.trim().length === 0)) return true;
    
    return false;
  });
}

/**
 * Main migration function
 */
async function migrateWebsiteSizes(dryRun = true) {
  console.log('🚀 Starting website sizes migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (will update database)'}`);
  console.log('');

  if (!MONGO_URI) {
    throw new Error('MONGODB_URI or VITE_MONGODB_URI environment variable not set');
  }

  const client = new MongoClient(MONGO_URI);

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    console.log('✓ Connected');
    console.log('');

    // Fetch publications with website advertising
    console.log('📥 Fetching publications with website inventory...');
    const publications = await collection.find({
      'distributionChannels.website.advertisingOpportunities': { $exists: true, $ne: [] }
    }).toArray();
    console.log(`✓ Found ${publications.length} publications with website advertising`);
    console.log('');

    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const details = [];

    // Create backup
    if (!dryRun && publications.length > 0) {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFile = path.join(backupDir, `website-sizes-migration-backup-${new Date().toISOString().replace(/:/g, '-')}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(publications, null, 2));
      console.log(`📦 Backup created: ${backupFile}`);
      console.log('');
    }

    // Process each publication
    for (const publication of publications) {
      try {
        const pubName = publication.name || publication._id.toString();
        console.log(`Processing: ${pubName}`);
        
        if (!needsMigration(publication)) {
          console.log('  ⊘ No changes needed (already using sizes array)');
          skippedCount++;
        } else {
          const migratedPublication = migratePublication(publication);
          
          // Show what changed
          const ads = publication.distributionChannels?.website?.advertisingOpportunities || [];
          const migratedAds = migratedPublication.distributionChannels?.website?.advertisingOpportunities || [];
          
          ads.forEach((ad, idx) => {
            const migratedAd = migratedAds[idx];
            if (ad.specifications?.size && !Array.isArray(ad.sizes)) {
              console.log(`  ✓ ${ad.name}: "${ad.specifications.size}" → ["${ad.specifications.size}"]`);
              details.push({ pub: pubName, ad: ad.name, from: ad.specifications.size, to: [ad.specifications.size] });
            } else if (Array.isArray(ad.sizes) && ad.sizes.some(s => !s || s.trim().length === 0)) {
              const cleaned = migratedAd.sizes;
              console.log(`  ✓ ${ad.name}: cleaned sizes array (removed empty values)`);
              details.push({ pub: pubName, ad: ad.name, from: ad.sizes, to: cleaned });
            }
          });
          
          migratedCount++;

          // Save changes if not dry run
          if (!dryRun) {
            await collection.updateOne(
              { _id: publication._id },
              { $set: { 'distributionChannels.website': migratedPublication.distributionChannels.website } }
            );
            console.log('  💾 Saved to database');
          }
        }
        console.log('');
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        errors.push({ 
          publicationId: publication._id, 
          error: error.message 
        });
        console.log('');
      }
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Total publications with website ads: ${publications.length}`);
    console.log(`Migrated:                           ${migratedCount}`);
    console.log(`Skipped (no changes):               ${skippedCount}`);
    console.log(`Errors:                             ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.publicationId}: ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were saved');
      console.log('Run with --live flag to apply changes:');
      console.log('  node scripts/migrate-website-sizes.cjs --live');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run the migration
const dryRun = !process.argv.includes('--live');

migrateWebsiteSizes(dryRun)
  .then(() => {
    console.log('\n✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });

