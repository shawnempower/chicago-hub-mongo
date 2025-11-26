/**
 * Test Script for Campaign Asset URL Fix
 * 
 * This script tests that:
 * 1. Assets can be fetched from the API
 * 2. Fresh signed URLs are generated
 * 3. URLs have proper expiration times
 * 
 * Usage:
 *   npx tsx scripts/testAssetUrlFix.ts [campaignId]
 */

import { config } from 'dotenv';
config();

interface AssetTest {
  assetId: string;
  fileName: string;
  storageProvider: string;
  storagePath: string;
  originalUrl: string;
  freshUrl: string;
  urlHasSignature: boolean;
  expirationSeconds: number | null;
}

async function testAssetUrls(campaignId?: string) {
  const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';
  
  // You'll need to set your auth token here or pass it as an environment variable
  const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
  
  if (!AUTH_TOKEN) {
    console.error('❌ Please set TEST_AUTH_TOKEN environment variable');
    console.log('   Example: export TEST_AUTH_TOKEN="your-jwt-token"');
    process.exit(1);
  }

  console.log('🧪 Testing Campaign Asset URL Fix\n');
  console.log(`📍 API Base: ${API_BASE}`);
  console.log(`📦 Campaign ID: ${campaignId || 'Not specified - will list all'}\n`);

  try {
    // Fetch assets
    const endpoint = campaignId 
      ? `${API_BASE}/api/creative-assets/campaign/${campaignId}`
      : `${API_BASE}/api/creative-assets`;
    
    console.log(`📡 Fetching assets from: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`   Response: ${text}`);
      process.exit(1);
    }

    const data = await response.json();
    const assets = data.assets || [];

    console.log(`✅ Fetched ${assets.length} assets\n`);

    if (assets.length === 0) {
      console.log('ℹ️  No assets found. Upload some campaign assets first.');
      process.exit(0);
    }

    // Test each asset
    const results: AssetTest[] = [];

    for (const asset of assets.slice(0, 5)) { // Test first 5 assets
      const metadata = asset.metadata || asset;
      const fileUrl = metadata.fileUrl;
      const storagePath = metadata.storagePath;
      const storageProvider = metadata.storageProvider;
      const fileName = metadata.fileName || metadata.originalFileName;

      // Check if URL is a signed URL
      const urlHasSignature = fileUrl.includes('X-Amz-Signature');
      
      // Extract expiration if present
      let expirationSeconds: number | null = null;
      if (fileUrl.includes('X-Amz-Expires=')) {
        const match = fileUrl.match(/X-Amz-Expires=(\d+)/);
        if (match) {
          expirationSeconds = parseInt(match[1]);
        }
      }

      results.push({
        assetId: asset._id || asset.assetId,
        fileName,
        storageProvider,
        storagePath,
        originalUrl: fileUrl.substring(0, 100) + '...',
        freshUrl: fileUrl,
        urlHasSignature,
        expirationSeconds
      });
    }

    // Display results
    console.log('📊 Test Results:\n');
    console.log('─'.repeat(80));

    for (const result of results) {
      console.log(`\n📄 Asset: ${result.fileName}`);
      console.log(`   ID: ${result.assetId}`);
      console.log(`   Storage: ${result.storageProvider}`);
      console.log(`   Path: ${result.storagePath}`);
      console.log(`   Has Signature: ${result.urlHasSignature ? '✅ Yes' : '❌ No'}`);
      
      if (result.expirationSeconds) {
        const hours = Math.floor(result.expirationSeconds / 3600);
        const minutes = Math.floor((result.expirationSeconds % 3600) / 60);
        console.log(`   Expiration: ${result.expirationSeconds}s (${hours}h ${minutes}m)`);
        
        if (result.expirationSeconds === 86400) {
          console.log(`   ✅ Correct: 24-hour expiration`);
        } else if (result.expirationSeconds === 3600) {
          console.log(`   ⚠️  Warning: Still using 1-hour expiration`);
        } else {
          console.log(`   ℹ️  Custom expiration time`);
        }
      } else {
        console.log(`   Expiration: N/A (possibly public URL)`);
      }
    }

    console.log('\n' + '─'.repeat(80));

    // Summary
    const s3Assets = results.filter(r => r.storageProvider === 's3');
    const signedUrls = results.filter(r => r.urlHasSignature);
    const correct24h = results.filter(r => r.expirationSeconds === 86400);

    console.log('\n📈 Summary:');
    console.log(`   Total Assets Tested: ${results.length}`);
    console.log(`   S3 Assets: ${s3Assets.length}`);
    console.log(`   Signed URLs: ${signedUrls.length}`);
    console.log(`   24-hour Expiration: ${correct24h.length}`);

    if (s3Assets.length > 0 && signedUrls.length === s3Assets.length && correct24h.length === s3Assets.length) {
      console.log('\n✅ SUCCESS: All S3 assets have fresh 24-hour signed URLs!');
    } else if (s3Assets.length > 0 && signedUrls.length < s3Assets.length) {
      console.log('\n⚠️  WARNING: Some S3 assets are missing signed URLs');
    } else if (s3Assets.length === 0) {
      console.log('\nℹ️  INFO: No S3 assets found (might be using local storage)');
    } else {
      console.log('\n⚠️  WARNING: URL expiration times may not be optimal');
    }

    console.log('\n✨ Test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the test
const campaignId = process.argv[2];
testAssetUrls(campaignId);

