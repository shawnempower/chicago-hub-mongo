/**
 * Fix Campaign Durations
 * 
 * Fixes durationMonths on campaigns that were calculated incorrectly
 * due to using Math.ceil instead of Math.round
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'chicago-hub';

// Set to true to actually update, false for dry run
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--fix');

async function fixCampaignDurations() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    console.log(DRY_RUN ? '🔍 DRY RUN MODE - No changes will be made\n' : '⚠️  FIX MODE - Changes will be applied\n');
    
    const db = client.db(DATABASE_NAME);
    
    // Get all campaigns with timeline data
    const campaigns = await db.collection('campaigns').find({
      'timeline.startDate': { $exists: true },
      'timeline.endDate': { $exists: true },
      deletedAt: { $exists: false }
    }).toArray();
    
    console.log(`Found ${campaigns.length} campaigns to check\n`);
    
    let fixedCount = 0;
    
    for (const campaign of campaigns) {
      const timeline = campaign.timeline;
      const startDate = new Date(timeline.startDate);
      const endDate = new Date(timeline.endDate);
      
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      // Calculate correct duration using Math.round
      const correctDurationMonths = Math.max(1, Math.round(diffDays / 30));
      const correctDurationWeeks = Math.ceil(diffDays / 7);
      
      const storedMonths = timeline.durationMonths;
      const storedWeeks = timeline.durationWeeks;
      
      // Check if there's a discrepancy
      if (storedMonths !== correctDurationMonths) {
        console.log(`Campaign: ${campaign.basicInfo?.name || campaign._id}`);
        console.log(`   Dates: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]} (${Math.round(diffDays)} days)`);
        console.log(`   Stored durationMonths: ${storedMonths} → Should be: ${correctDurationMonths}`);
        console.log(`   Stored durationWeeks: ${storedWeeks} → Should be: ${correctDurationWeeks}`);
        
        if (!DRY_RUN) {
          await db.collection('campaigns').updateOne(
            { _id: campaign._id },
            {
              $set: {
                'timeline.durationMonths': correctDurationMonths,
                'timeline.durationWeeks': correctDurationWeeks
              }
            }
          );
          console.log(`   ✅ FIXED\n`);
        } else {
          console.log(`   📝 Would fix (run with --fix to apply)\n`);
        }
        
        fixedCount++;
      }
    }
    
    console.log('='.repeat(60));
    if (DRY_RUN) {
      console.log(`\n📊 Summary: ${fixedCount} campaign(s) need fixing`);
      console.log(`\nRun with --fix flag to apply changes:`);
      console.log(`   npx tsx scripts/fixCampaignDurations.ts --fix\n`);
    } else {
      console.log(`\n✅ Fixed ${fixedCount} campaign(s)\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

fixCampaignDurations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
