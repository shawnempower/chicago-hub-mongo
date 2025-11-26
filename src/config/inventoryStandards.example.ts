/**
 * EXAMPLE: How to Use Inventory Standards
 * 
 * This file demonstrates how publications and campaigns
 * should reference and use the standardized inventory specs.
 */

import inventoryStandards, {
  WEBSITE_STANDARDS,
  getInventoryStandard,
  findStandardByDimensions,
  validateAgainstStandard,
  getStandardRecommendations,
  getIABStandards
} from './inventoryStandards';

// =====================================================
// EXAMPLE 1: View All Available Standards
// =====================================================

console.log('=== Available Website Standards ===\n');

const allStandards = inventoryStandards.getAllStandards();
allStandards.forEach(standard => {
  console.log(`${standard.name} (${standard.id})`);
  console.log(`  Description: ${standard.description}`);
  console.log(`  Dimensions: ${standard.defaultSpecs.dimensions}`);
  console.log(`  Formats: ${standard.defaultSpecs.fileFormats.join(', ')}`);
  console.log(`  Max Size: ${standard.defaultSpecs.maxFileSize}`);
  console.log('');
});

// =====================================================
// EXAMPLE 2: Get IAB Standard Sizes Only
// =====================================================

console.log('=== IAB Standard Ad Sizes ===\n');

const iabStandards = getIABStandards();
iabStandards.forEach(standard => {
  console.log(`✓ ${standard.name}: ${standard.defaultSpecs.dimensions}`);
});

// =====================================================
// EXAMPLE 3: Publication References Standard
// =====================================================

console.log('\n=== How a Publication Uses Standards ===\n');

// Instead of defining specs from scratch, publication references a standard
const publicationInventory = {
  name: "Chicago Tribune",
  distributionChannels: {
    website: {
      advertisingOpportunities: [
        {
          name: "Homepage Sidebar Banner",
          standardId: "website_banner_300x250", // ← References config
          pricing: {
            flatRate: 500,
            pricingModel: "per_week"
          },
          location: "Homepage - Right Sidebar",
          available: true
          
          // Specs come from config automatically!
          // No need to specify dimensions, formats, etc.
        },
        {
          name: "Top Header Banner",
          standardId: "website_banner_728x90", // ← References config
          pricing: {
            flatRate: 750,
            pricingModel: "per_week"
          },
          location: "All Pages - Header",
          
          // Optional: Override if publication has different limits
          specOverrides: {
            maxFileSize: "200KB" // Allow larger files
          }
        },
        {
          name: "Custom Premium Placement",
          standardId: "website_banner_custom",
          pricing: {
            flatRate: 1200,
            pricingModel: "per_week"
          },
          
          // For custom sizes, specify dimensions
          customDimensions: "970x300",
          additionalRequirements: "Prime homepage position, guaranteed impressions"
        }
      ]
    }
  }
};

console.log('Publication defines inventory by referencing standard IDs:');
console.log(JSON.stringify(publicationInventory.distributionChannels.website.advertisingOpportunities, null, 2));

// =====================================================
// EXAMPLE 4: Look Up Standard by ID
// =====================================================

console.log('\n=== Looking Up a Standard ===\n');

const standard = getInventoryStandard('website_banner_300x250');
if (standard) {
  console.log(`Found: ${standard.name}`);
  console.log(`Specs:`, standard.defaultSpecs);
  console.log(`Examples:`, standard.examples);
}

// =====================================================
// EXAMPLE 5: Find Standard by Dimensions
// =====================================================

console.log('\n=== Find Standard by Dimensions ===\n');

const foundStandard = findStandardByDimensions('728x90');
if (foundStandard) {
  console.log(`Found standard for 728x90: ${foundStandard.name}`);
  console.log(`ID: ${foundStandard.id}`);
}

// =====================================================
// EXAMPLE 6: Validate Uploaded File
// =====================================================

console.log('\n=== Validating Uploaded Asset ===\n');

// Simulate an uploaded file
const uploadedFile = {
  dimensions: '300x250',
  fileFormat: 'JPG',
  fileSize: 145000, // 145KB in bytes
  colorSpace: 'RGB'
};

const standardToValidate = getInventoryStandard('website_banner_300x250');
if (standardToValidate) {
  const validation = validateAgainstStandard(uploadedFile, standardToValidate);
  
  console.log('Validation Result:');
  console.log(`  Valid: ${validation.valid ? '✓ Yes' : '✗ No'}`);
  
  if (validation.errors.length > 0) {
    console.log('  Errors:');
    validation.errors.forEach(err => console.log(`    - ${err}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('  Warnings:');
    validation.warnings.forEach(warn => console.log(`    - ${warn}`));
  }
}

// Example with invalid file
console.log('\n--- Validating INVALID file ---\n');

const invalidFile = {
  dimensions: '400x400', // Wrong dimensions
  fileFormat: 'BMP', // Not allowed
  fileSize: 200000, // Too large
  colorSpace: 'CMYK' // Wrong color space
};

if (standardToValidate) {
  const validation2 = validateAgainstStandard(invalidFile, standardToValidate);
  
  console.log('Validation Result:');
  console.log(`  Valid: ${validation2.valid ? '✓ Yes' : '✗ No'}`);
  console.log('  Errors:');
  validation2.errors.forEach(err => console.log(`    - ${err}`));
}

// =====================================================
// EXAMPLE 7: Get Recommendations
// =====================================================

console.log('\n=== Getting Recommendations ===\n');

const banner300x250 = getInventoryStandard('website_banner_300x250');
if (banner300x250) {
  const recommendations = getStandardRecommendations(banner300x250);
  
  console.log(`Recommendations for ${banner300x250.name}:`);
  recommendations.forEach(rec => console.log(`  • ${rec}`));
}

// =====================================================
// EXAMPLE 8: Campaign Uses Standards for Gap Analysis
// =====================================================

console.log('\n=== Campaign Gap Analysis ===\n');

// Campaign has selected inventory across multiple publications
const campaignInventory = [
  { publicationName: "Chicago Tribune", standardId: "website_banner_300x250" },
  { publicationName: "Daily Herald", standardId: "website_banner_300x250" },
  { publicationName: "Chicago Sun-Times", standardId: "website_banner_728x90" },
  { publicationName: "Block Club", standardId: "website_banner_300x250" }
];

// Uploaded assets
const uploadedAssets = [
  { standardId: "website_banner_300x250", fileName: "banner-300x250.jpg" }
  // Missing: website_banner_728x90
];

// Find missing assets
const requiredStandardIds = new Set(campaignInventory.map(i => i.standardId));
const uploadedStandardIds = new Set(uploadedAssets.map(a => a.standardId));

const missingStandardIds = [...requiredStandardIds].filter(
  id => !uploadedStandardIds.has(id)
);

console.log('Campaign Inventory:');
campaignInventory.forEach(item => {
  const standard = getInventoryStandard(item.standardId);
  console.log(`  ${item.publicationName}: ${standard?.name}`);
});

console.log('\nUploaded Assets:');
uploadedAssets.forEach(asset => {
  const standard = getInventoryStandard(asset.standardId);
  console.log(`  ✓ ${standard?.name} (${asset.fileName})`);
});

console.log('\nMissing Assets:');
missingStandardIds.forEach(id => {
  const standard = getInventoryStandard(id);
  const affectedPubs = campaignInventory
    .filter(i => i.standardId === id)
    .map(i => i.publicationName);
  
  console.log(`  ✗ ${standard?.name}`);
  console.log(`    Needed by: ${affectedPubs.join(', ')}`);
});

// =====================================================
// EXAMPLE 9: Spec Group ID Generation
// =====================================================

console.log('\n=== Spec Group ID Generation ===\n');

const banner = getInventoryStandard('website_banner_300x250');
if (banner) {
  const specGroupId = inventoryStandards.generateSpecGroupId(banner);
  console.log(`Standard: ${banner.name}`);
  console.log(`Spec Group ID: ${specGroupId}`);
  console.log('');
  console.log('This ID is used for:');
  console.log('  • Matching uploaded assets to requirements');
  console.log('  • Grouping identical specs across publications');
  console.log('  • Gap analysis and reporting');
}

// =====================================================
// OUTPUT SUMMARY
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('SUMMARY: Benefits of Config-Based Standards');
console.log('='.repeat(60));
console.log('');
console.log('✓ Publications reference standard IDs instead of defining specs');
console.log('✓ Single source of truth - update once, affects all');
console.log('✓ Consistent validation across entire system');
console.log('✓ Easy gap analysis - find missing assets instantly');
console.log('✓ Type-safe - TypeScript catches errors at compile time');
console.log('✓ Version controlled - see history of all changes');
console.log('✓ Auto-complete in IDE - discover available standards');
console.log('');

