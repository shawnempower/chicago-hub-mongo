#!/usr/bin/env tsx

/**
 * Enhanced import script for Publications schema with preview and update capabilities
 * Usage: 
 *   npx tsx src/scripts/importPublications.ts [path-to-json-file] [options]
 *   npx tsx src/scripts/importPublications.ts --stdin [options]
 *   npx tsx src/scripts/importPublications.ts --sample [options]
 * 
 * Options:
 *   --preview         Show changes without applying them
 *   --force           Skip confirmation prompts
 *   --match-field     Field to match on for updates (default: publicationId)
 *   --update-mode     How to handle existing records: update, skip (default: update)
 */

import { publicationsService } from '@/integrations/mongodb/allServices';
import { PublicationInsert, Publication } from '@/integrations/mongodb/schemas';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

interface ImportOptions {
  preview: boolean;
  force: boolean;
  matchField: string;
  updateMode: 'update' | 'skip';
}

interface ImportResult {
  action: 'create' | 'update' | 'skip';
  publication: PublicationInsert;
  existing?: Publication;
  changes?: any;
}

function parseArgs(args: string[]): { source?: string; options: ImportOptions } {
  const options: ImportOptions = {
    preview: false,
    force: false,
    matchField: 'publicationId',
    updateMode: 'update'
  };
  
  let source: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--match-field') {
      options.matchField = args[++i] || 'publicationId';
    } else if (arg === '--update-mode') {
      const mode = args[++i] as 'update' | 'skip';
      if (['update', 'skip'].includes(mode)) {
        options.updateMode = mode;
      }
    } else if (!arg.startsWith('--') && !source) {
      source = arg;
    }
  }
  
  return { source, options };
}

function deepDiff(obj1: any, obj2: any, path = ''): any {
  const changes: any = {};
  
  // Handle null/undefined cases
  if (obj1 === obj2) return null;
  if (obj1 == null || obj2 == null) return { from: obj1, to: obj2 };
  
  // Handle primitive types
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 !== obj2 ? { from: obj1, to: obj2 } : null;
  }
  
  // Handle arrays
  if (Array.isArray(obj1) || Array.isArray(obj2)) {
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
      return { from: obj1, to: obj2 };
    }
    return null;
  }
  
  // Handle objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    const diff = deepDiff(obj1[key], obj2[key], newPath);
    
    if (diff !== null) {
      changes[key] = diff;
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

async function confirmAction(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

function getSampleData() {
  return [
    {
      publicationId: 1001,
      basicInfo: {
        publicationName: "Chicago Sun-Times",
        websiteUrl: "https://chicago.suntimes.com",
        founded: 1844,
        publicationType: "daily",
        contentType: "news",
        geographicCoverage: "local",
        primaryServiceArea: "Chicago Metropolitan Area",
        numberOfPublications: 1
      },
      contactInfo: {
        mainPhone: "(312) 321-3000",
        businessHours: "Monday-Friday 9AM-5PM",
        salesContact: {
          name: "Sales Team",
          email: "advertising@suntimes.com",
          phone: "(312) 321-3200",
          preferredContact: "email"
        }
      },
      distributionChannels: {
        website: {
          url: "https://chicago.suntimes.com",
          metrics: {
            monthlyVisitors: 955000,
            monthlyPageViews: 2500000,
            averageSessionDuration: 3.2,
            pagesPerSession: 2.8,
            bounceRate: 45,
            mobilePercentage: 68
          }
        },
        print: {
          frequency: "daily",
          circulation: 200000,
          paidCirculation: 150000,
          freeCirculation: 50000,
          distributionArea: "Chicago Metro Area"
        }
      },
      audienceDemographics: {
        totalAudience: 955000,
        ageGroups: {
          "25-34": 22,
          "35-44": 25,
          "45-54": 28,
          "55-64": 15,
          "65+": 10
        },
        gender: {
          male: 52,
          female: 48
        },
        householdIncome: {
          "50k-75k": 25,
          "75k-100k": 30,
          "100k-150k": 25,
          "over150k": 20
        },
        targetMarkets: ["General News", "Local Business", "Politics", "Sports"]
      },
      editorialInfo: {
        contentFocus: ["Local News", "Politics", "Sports", "Business"],
        contentPillars: ["Investigative Journalism", "Community Coverage", "Breaking News"],
        specialSections: ["Sports", "Business", "Entertainment", "Opinion"]
      },
      businessInfo: {
        ownershipType: "nonprofit",
        yearsInOperation: 180,
        numberOfEmployees: 150,
        topAdvertiserCategories: ["Automotive", "Healthcare", "Real Estate", "Restaurants"]
      },
      crossChannelPackages: [
        {
          name: "Digital Display",
          packageName: "Digital Display Package",
          includedChannels: ["website"],
          pricing: "Contact for pricing",
          details: "Banner ads across digital properties"
        }
      ],
      competitiveInfo: {
        uniqueValueProposition: "Chicago's nonprofit daily newspaper with comprehensive local coverage.",
        keyDifferentiators: ["Investigative journalism", "Community focus", "Digital innovation"]
      },
      metadata: {
        extractedFrom: ["manual_entry"],
        confidence: 0.95,
        verificationStatus: "verified",
        dataCompleteness: 85
      }
    }
  ];
}

async function analyzeImport(publications: PublicationInsert[], options: ImportOptions): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (const publication of publications) {
    // Find existing publication based on match field
    let existing: Publication | null = null;
    
    if (options.matchField === 'publicationId') {
      existing = await publicationsService.getByPublicationId(publication.publicationId);
    } else {
      // For other fields, we'd need to implement custom matching
      const allPublications = await publicationsService.getAll();
      existing = allPublications.find((pub: Publication) => {
        const value = getNestedValue(pub, options.matchField);
        const newValue = getNestedValue(publication, options.matchField);
        return value === newValue;
      }) || null;
    }
    
    if (existing) {
      if (options.updateMode === 'skip') {
        results.push({
          action: 'skip',
          publication,
          existing
        });
      } else {
        const changes = deepDiff(existing, publication);
        results.push({
          action: 'update',
          publication,
          existing,
          changes
        });
      }
    } else {
      results.push({
        action: 'create',
        publication
      });
    }
  }
  
  return results;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

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

function displayPreview(results: ImportResult[]) {
  console.log('\n📋 Import Preview:');
  console.log('==================');
  
  const summary = {
    create: results.filter(r => r.action === 'create').length,
    update: results.filter(r => r.action === 'update').length,
    skip: results.filter(r => r.action === 'skip').length
  };
  
  console.log(`📊 Summary: ${summary.create} new, ${summary.update} updates, ${summary.skip} skipped\n`);
  
  results.forEach((result, index) => {
    const pub = result.publication;
    const name = pub.basicInfo?.publicationName || 'Unknown';
    
    if (result.action === 'create') {
      console.log(`${index + 1}. ✨ CREATE: "${name}" (ID: ${pub.publicationId})`);
    } else if (result.action === 'update') {
      console.log(`${index + 1}. 🔄 UPDATE: "${name}" (ID: ${pub.publicationId})`);
      if (result.changes) {
        displayChanges(result.changes, '   ');
      }
    } else if (result.action === 'skip') {
      console.log(`${index + 1}. ⏭️  SKIP: "${name}" (ID: ${pub.publicationId}) - already exists`);
    }
    console.log('');
  });
}

function displayChanges(changes: any, indent = '') {
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
      console.log(`${indent}${key}: ${JSON.stringify(value.from)} → ${JSON.stringify(value.to)}`);
    } else if (value && typeof value === 'object') {
      console.log(`${indent}${key}:`);
      displayChanges(value, indent + '  ');
    }
  }
}

async function executeImport(results: ImportResult[]): Promise<void> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: any[] = [];
  
  for (const result of results) {
    try {
      if (result.action === 'create') {
        await publicationsService.create(result.publication);
        created++;
        console.log(`✅ Created: ${result.publication.basicInfo?.publicationName}`);
      } else if (result.action === 'update' && result.existing) {
        await publicationsService.update(result.existing._id!.toString(), result.publication);
        updated++;
        console.log(`🔄 Updated: ${result.publication.basicInfo?.publicationName}`);
      } else if (result.action === 'skip') {
        skipped++;
        console.log(`⏭️  Skipped: ${result.publication.basicInfo?.publicationName}`);
      }
    } catch (error) {
      errors.push({
        publicationId: result.publication.publicationId,
        publicationName: result.publication.basicInfo?.publicationName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Error processing ${result.publication.basicInfo?.publicationName}: ${error}`);
    }
  }
  
  console.log('\n📊 Final Results:');
  console.log(`   - Created: ${created} publications`);
  console.log(`   - Updated: ${updated} publications`);
  console.log(`   - Skipped: ${skipped} publications`);
  console.log(`   - Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Import errors:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. Publication ${error.publicationId} (${error.publicationName}): ${error.error}`);
    });
  }
}

async function importPublications(args: string[] = []) {
  try {
    const { source, options } = parseArgs(args);
    
    console.log('🚀 Starting enhanced publication import...');
    console.log(`📋 Options: ${JSON.stringify(options, null, 2)}`);
    
    let data: any;
    
    if (source === '--stdin') {
      console.log('📥 Reading from stdin...');
      const stdin = process.stdin;
      stdin.setEncoding('utf8');
      
      let inputData = '';
      for await (const chunk of stdin) {
        inputData += chunk;
      }
      
      if (!inputData.trim()) {
        throw new Error('No data received from stdin');
      }
      
      data = JSON.parse(inputData);
      console.log('📥 Data received from stdin');
      
    } else if (source === '--sample') {
      console.log('📝 Using sample data for import');
      data = getSampleData();
      
    } else if (source && !source.startsWith('--')) {
      const fullPath = path.resolve(source);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }
      
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      data = JSON.parse(fileContent);
      console.log(`📁 Importing from file: ${fullPath}`);
    } else {
      console.log('📖 Usage:');
      console.log('  npx tsx src/scripts/importPublications.ts [path-to-json-file] [options]');
      console.log('  npx tsx src/scripts/importPublications.ts --stdin [options]');
      console.log('  npx tsx src/scripts/importPublications.ts --sample [options]');
      console.log('');
      console.log('Options:');
      console.log('  --preview         Show changes without applying them');
      console.log('  --force           Skip confirmation prompts');
      console.log('  --match-field     Field to match on for updates (default: publicationId)');
      console.log('  --update-mode     How to handle existing records: update, skip (default: update)');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx src/scripts/importPublications.ts publications.json --preview');
      console.log('  echo \'[{"publicationId": 1001, ...}]\' | npx tsx src/scripts/importPublications.ts --stdin --force');
      console.log('  npx tsx src/scripts/importPublications.ts --sample --update-mode skip');
      process.exit(0);
    }

    const publications = Array.isArray(data) ? data : [data];
    console.log(`📊 Found ${publications.length} publication(s) to import`);

    // Validate publications and strip hubPricing
    for (const pub of publications) {
      if (!pub.publicationId || !pub.basicInfo?.publicationName) {
        throw new Error(`Invalid publication data: missing publicationId or publicationName`);
      }
      // Strip hubPricing - it should be set up by hub admins after import
      stripHubPricing(pub);
    }

    // Analyze what changes will be made
    console.log('🔍 Analyzing import...');
    const results = await analyzeImport(publications as PublicationInsert[], options);
    
    // Display preview
    displayPreview(results);
    
    if (options.preview) {
      console.log('👁️  Preview mode - no changes will be applied');
      return;
    }
    
    // Confirm before proceeding (unless --force)
    if (!options.force) {
      const shouldProceed = await confirmAction('Proceed with import?');
      if (!shouldProceed) {
        console.log('❌ Import cancelled');
        return;
      }
    }
    
    // Execute the import
    console.log('\n🚀 Executing import...');
    await executeImport(results);
    
    console.log('\n🎉 Publication import process finished!');
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
}

// CLI usage - handle ES modules properly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const args = process.argv.slice(2);
  importPublications(args).then(() => {
    console.log('Import script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Import script failed:', error);
    process.exit(1);
  });
}

export { importPublications };
