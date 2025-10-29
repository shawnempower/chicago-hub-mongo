#!/usr/bin/env node

/**
 * Frequency Pattern Checker
 * 
 * This script checks how many pricing frequency values would need to be migrated
 * if we enforce the strict numberx pattern (remove "One time" option).
 * 
 * Usage:
 *   node scripts/check-frequency-patterns.cjs
 */

const path = require('path');
require('dotenv').config();

// MongoDB connection
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
const DB_NAME = 'chicago-hub';
const COLLECTION_NAME = 'publications';

// New strict pattern for numberx format only
const STRICT_NUMBERX_PATTERN = /^\d+x$/;

// Current pattern that includes "One time"
const CURRENT_PATTERN = /^(?:\d+x|One time|one time)$/;

/**
 * Check if a frequency value matches the strict pattern
 */
function isStrictNumberX(frequency) {
  return STRICT_NUMBERX_PATTERN.test(frequency);
}

/**
 * Check frequencies in pricing object or array
 */
function checkPricingFrequencies(pricing, context) {
  const issues = [];
  
  if (!pricing) return issues;
  
  // Handle array of pricing tiers
  if (Array.isArray(pricing)) {
    pricing.forEach((tier, idx) => {
      if (tier.pricing?.frequency) {
        const freq = tier.pricing.frequency;
        if (freq && !isStrictNumberX(freq)) {
          issues.push({
            context: `${context} [tier ${idx}]`,
            currentValue: freq,
            needsMigration: true
          });
        }
      }
    });
  }
  // Handle single pricing object
  else if (typeof pricing === 'object' && pricing.frequency) {
    const freq = pricing.frequency;
    if (freq && !isStrictNumberX(freq)) {
      issues.push({
        context: context,
        currentValue: freq,
        needsMigration: true
      });
    }
  }
  
  return issues;
}

/**
 * Check hub pricing for frequency issues
 */
function checkHubPricingFrequencies(hubPricing, context) {
  const issues = [];
  
  if (!hubPricing || !Array.isArray(hubPricing)) return issues;
  
  hubPricing.forEach((hub, idx) => {
    if (hub.pricing) {
      const hubContext = `${context} [${hub.hubName || hub.hubId || `hub ${idx}`}]`;
      issues.push(...checkPricingFrequencies(hub.pricing, hubContext));
    }
  });
  
  return issues;
}

/**
 * Check advertising opportunities for frequency issues
 */
function checkAdvertisingOpportunities(opportunities, channelType, channelName = '') {
  const issues = [];
  
  if (!opportunities || !Array.isArray(opportunities)) return issues;
  
  opportunities.forEach((opp, idx) => {
    const oppName = opp.name || opp.adType || `Ad ${idx}`;
    const context = channelName 
      ? `${channelType} > ${channelName} > ${oppName}`
      : `${channelType} > ${oppName}`;
    
    // Check default pricing
    issues.push(...checkPricingFrequencies(opp.pricing, `${context} [default]`));
    
    // Check hub pricing
    issues.push(...checkHubPricingFrequencies(opp.hubPricing, `${context} [hub]`));
  });
  
  return issues;
}

/**
 * Analyze a single publication for frequency pattern issues
 */
function analyzePublication(publication) {
  const issues = [];
  const pubName = publication.name || publication._id;
  
  if (!publication.distributionChannels) return issues;
  
  const channels = publication.distributionChannels;
  
  // Check Newsletter ads
  if (channels.newsletters) {
    const newsletters = Array.isArray(channels.newsletters) ? channels.newsletters : [channels.newsletters];
    newsletters.forEach(newsletter => {
      const name = newsletter.name || 'Newsletter';
      issues.push(...checkAdvertisingOpportunities(
        newsletter.advertisingOpportunities,
        'Newsletter',
        name
      ));
    });
  }
  
  // Check Print ads
  if (channels.print) {
    const printItems = Array.isArray(channels.print) ? channels.print : [channels.print];
    printItems.forEach(printItem => {
      const name = printItem.name || 'Print';
      issues.push(...checkAdvertisingOpportunities(
        printItem.advertisingOpportunities,
        'Print',
        name
      ));
    });
  }
  
  // Check Podcast ads
  if (channels.podcasts) {
    const podcasts = Array.isArray(channels.podcasts) ? channels.podcasts : [channels.podcasts];
    podcasts.forEach(podcast => {
      const name = podcast.name || 'Podcast';
      issues.push(...checkAdvertisingOpportunities(
        podcast.advertisingOpportunities,
        'Podcast',
        name
      ));
    });
  }
  
  // Check Radio/Streaming ads
  if (channels.radioStations) {
    const stations = Array.isArray(channels.radioStations) ? channels.radioStations : [channels.radioStations];
    stations.forEach(station => {
      const name = station.callSign || station.name || 'Radio';
      issues.push(...checkAdvertisingOpportunities(
        station.advertisingOpportunities,
        'Radio',
        name
      ));
    });
  }
  
  return issues.length > 0 ? { publicationName: pubName, publicationId: publication._id, issues } : null;
}

/**
 * Main analysis function
 */
async function analyzeFrequencyPatterns() {
  console.log('🔍 Analyzing frequency patterns in pricing data...');
  console.log('Checking which records would be affected by enforcing strict numberx pattern (1x, 2x, 3x, etc.)');
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
    
    // Fetch all publications
    console.log('📥 Fetching all publications...');
    const publications = await collection.find({}).toArray();
    console.log(`✓ Found ${publications.length} publications`);
    console.log('');
    
    // Analyze each publication
    console.log('🔬 Analyzing frequency values...');
    console.log('');
    
    const problemPublications = [];
    const frequencyValueCounts = {};
    
    for (const publication of publications) {
      const result = analyzePublication(publication);
      if (result) {
        problemPublications.push(result);
        
        // Count frequency values
        result.issues.forEach(issue => {
          const val = issue.currentValue;
          frequencyValueCounts[val] = (frequencyValueCounts[val] || 0) + 1;
        });
      }
    }
    
    // Summary Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 FREQUENCY PATTERN ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Total publications in database:                ${publications.length}`);
    console.log(`Publications with non-compliant frequencies:   ${problemPublications.length}`);
    console.log(`Total non-compliant frequency fields:          ${problemPublications.reduce((sum, p) => sum + p.issues.length, 0)}`);
    console.log('');
    
    // Frequency value breakdown
    if (Object.keys(frequencyValueCounts).length > 0) {
      console.log('Non-compliant frequency values found:');
      Object.entries(frequencyValueCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([value, count]) => {
          console.log(`  "${value}": ${count} occurrence${count > 1 ? 's' : ''}`);
        });
      console.log('');
    }
    
    // Detailed breakdown by publication
    if (problemPublications.length > 0) {
      console.log('───────────────────────────────────────────────────────────');
      console.log('DETAILED BREAKDOWN BY PUBLICATION:');
      console.log('───────────────────────────────────────────────────────────');
      console.log('');
      
      problemPublications.forEach((pub, idx) => {
        console.log(`${idx + 1}. ${pub.publicationName} (ID: ${pub.publicationId})`);
        console.log(`   Found ${pub.issues.length} non-compliant frequency value${pub.issues.length > 1 ? 's' : ''}:`);
        pub.issues.forEach(issue => {
          console.log(`   • ${issue.context}`);
          console.log(`     Current value: "${issue.currentValue}"`);
        });
        console.log('');
      });
    }
    
    // Recommendations
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (problemPublications.length === 0) {
      console.log('✅ All frequency values already comply with strict numberx pattern!');
      console.log('   You can safely enforce the pattern without migration.');
    } else {
      console.log('⚠️  Before enforcing strict numberx pattern:');
      console.log('');
      console.log('1. Decide on migration strategy for non-compliant values:');
      console.log('   Option A: Convert "One time" → "1x"');
      console.log('   Option B: Keep "One time" as valid option in pattern');
      console.log('   Option C: Manual review and conversion');
      console.log('');
      console.log('2. Create a migration script to update affected records');
      console.log('');
      console.log('3. Test the migration in a development environment');
      console.log('');
      console.log('4. Create a backup before running migration in production');
      console.log('');
      console.log(`   ${problemPublications.length} publication${problemPublications.length > 1 ? 's' : ''} will need to be updated.`);
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('');
    console.log('📡 Database connection closed');
  }
}

// Run the analysis
analyzeFrequencyPatterns()
  .then(() => {
    console.log('');
    console.log('✓ Analysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  });

