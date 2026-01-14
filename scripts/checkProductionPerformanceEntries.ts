/**
 * Check Performance Entries in Production (chicago-hub)
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const PRODUCTION_DB = 'chicago-hub';

async function checkProduction() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    const db = client.db(PRODUCTION_DB);
    
    console.log('\n📊 PRODUCTION DATABASE (chicago-hub):\n');
    
    const jan13 = new Date('2026-01-13');
    
    const entries = await db.collection('performance_entries').find({
      dateStart: jan13,
      source: 'automated'
    }).toArray();
    
    console.log(`Found ${entries.length} performance entries for Jan 13\n`);
    
    if (entries.length > 0) {
      console.log('✅ NEW DATA FOUND IN PRODUCTION!\n');
      console.log('='.repeat(80));
      
      // Check for our test order
      const testOrder = '6960195199937f3b71a2338d';
      const testEntries = entries.filter((e: any) => e.orderId === testOrder);
      
      console.log(`\n🎯 Test Order (${testOrder}): ${testEntries.length} document(s)\n`);
      
      testEntries.forEach((entry: any, idx) => {
        console.log(`${idx + 1}. Item: ${entry.itemName}`);
        console.log(`   Path: ${entry.itemPath}`);
        console.log(`   Impressions: ${entry.metrics.impressions} ✅`);
        console.log(`   Clicks: ${entry.metrics.clicks} ✅`);
        console.log(`   CTR: ${entry.metrics.ctr.toFixed(2)}%`);
        console.log(`   Reach: ${entry.metrics.reach}`);
        console.log(`   Updated: ${entry.updatedAt.toISOString()}`);
        console.log('');
      });
      
      if (testEntries.length > 1) {
        console.log('🎉 FIX VERIFIED! Multiple documents created for same order!\n');
      }
      
      // Show all Jan 13 entries
      console.log('\n📋 ALL JAN 13 ENTRIES:\n');
      entries.forEach((entry: any, idx) => {
        const hasImpressions = entry.metrics.impressions > 0 ? '✅' : '⚠️';
        console.log(`${(idx + 1).toString().padStart(2)}. ${entry.orderId} | ${entry.itemName?.substring(0, 20).padEnd(20)} | Imp: ${entry.metrics.impressions.toString().padStart(4)} ${hasImpressions} | Clicks: ${entry.metrics.clicks.toString().padStart(3)}`);
      });
      
      // Summary
      const totalImpressions = entries.reduce((sum: number, e: any) => sum + e.metrics.impressions, 0);
      const totalClicks = entries.reduce((sum: number, e: any) => sum + e.metrics.clicks, 0);
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 SUMMARY:\n');
      console.log(`   Documents: ${entries.length}`);
      console.log(`   Total Impressions: ${totalImpressions}`);
      console.log(`   Total Clicks: ${totalClicks}`);
      console.log(`   Overall CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%`);
      
      const withImpressions = entries.filter((e: any) => e.metrics.impressions > 0).length;
      console.log(`\n   ✅ Entries with impressions: ${withImpressions}/${entries.length}`);
      
      if (withImpressions > 0) {
        console.log('\n🎉 IMPRESSION TRACKING IS WORKING!\n');
      }
      
    } else {
      console.log('⚠️  No Jan 13 entries found in production database\n');
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkProduction()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
