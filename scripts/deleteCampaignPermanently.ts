/**
 * Delete Campaign Permanently
 * 
 * A support script for cleaning up test campaigns and their associated records.
 * This script PERMANENTLY deletes campaign data across all related collections.
 * 
 * Usage:
 *   npx tsx scripts/deleteCampaignPermanently.ts <campaignId>
 *   npx tsx scripts/deleteCampaignPermanently.ts <campaignId> --execute
 * 
 * Examples:
 *   # Dry run (shows what would be deleted):
 *   npx tsx scripts/deleteCampaignPermanently.ts 6930b89875fbc543afebf055
 * 
 *   # Actually delete:
 *   npx tsx scripts/deleteCampaignPermanently.ts 6930b89875fbc543afebf055 --execute
 * 
 * Related Collections Cleaned:
 *   - campaigns (main campaign document)
 *   - publication_insertion_orders (per-publication orders)
 *   - creative_assets (uploaded creative files)
 *   - tracking_scripts (tracking pixels/tags)
 *   - performance_entries (metrics data)
 *   - proof_of_performance (proof files)
 *   - daily_aggregates (reporting aggregates)
 *   - notifications (campaign-related notifications)
 */

import { MongoClient, ObjectId, Document, Collection } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Collection names (matching schemas.ts COLLECTIONS)
const COLLECTIONS = {
  CAMPAIGNS: 'campaigns',
  PUBLICATION_INSERTION_ORDERS: 'publication_insertion_orders',
  CREATIVE_ASSETS: 'creative_assets',
  TRACKING_SCRIPTS: 'tracking_scripts',
  PERFORMANCE_ENTRIES: 'performance_entries',
  PROOF_OF_PERFORMANCE: 'proof_of_performance',
  DAILY_AGGREGATES: 'daily_aggregates',
  NOTIFICATIONS: 'notifications',
};

interface DeletionStats {
  collection: string;
  count: number;
  sampleIds?: string[];
}

interface CampaignInfo {
  _id: string;
  campaignId?: string;
  name?: string;
  advertiserName?: string;
  status?: string;
  hubId?: string;
  createdAt?: Date;
  totalBudget?: number;
  publicationCount?: number;
}

async function findCampaign(
  campaignsCollection: Collection<Document>,
  idArg: string
): Promise<Document | null> {
  // Try to find by MongoDB _id first
  try {
    const objectId = new ObjectId(idArg);
    const byObjectId = await campaignsCollection.findOne({ _id: objectId });
    if (byObjectId) return byObjectId;
  } catch {
    // Invalid ObjectId, that's fine
  }

  // Try to find by campaignId string
  const byCampaignId = await campaignsCollection.findOne({ campaignId: idArg });
  if (byCampaignId) return byCampaignId;

  return null;
}

function extractCampaignInfo(campaign: Document): CampaignInfo {
  return {
    _id: campaign._id.toString(),
    campaignId: campaign.campaignId,
    name: campaign.basicInfo?.name || campaign.name || 'Unnamed',
    advertiserName: campaign.basicInfo?.advertiserName || campaign.businessName,
    status: campaign.status,
    hubId: campaign.hubId,
    createdAt: campaign.metadata?.createdAt || campaign.createdAt,
    totalBudget: campaign.objectives?.budget?.totalBudget || campaign.pricing?.total,
    publicationCount: campaign.selectedInventory?.totalPublications || 
                      campaign.selectedInventory?.publications?.length || 0,
  };
}

async function countAndSampleRecords(
  collection: Collection<Document>,
  query: Document
): Promise<DeletionStats> {
  const count = await collection.countDocuments(query);
  let sampleIds: string[] = [];
  
  if (count > 0) {
    const samples = await collection.find(query).limit(3).toArray();
    sampleIds = samples.map(s => s._id.toString());
  }
  
  return {
    collection: collection.collectionName,
    count,
    sampleIds: count > 0 ? sampleIds : undefined,
  };
}

async function deleteCampaignPermanently(idArg: string, execute: boolean) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  const stats: DeletionStats[] = [];

  console.log('\n🗑️  DELETE CAMPAIGN PERMANENTLY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'chicago-hub';
    console.log(`📂 Database: ${dbName}`);
    console.log(`🔍 Looking for campaign: ${idArg}\n`);
    
    const db = client.db(dbName);
    
    // Get collection references
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const ordersCol = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    const assetsCol = db.collection(COLLECTIONS.CREATIVE_ASSETS);
    const scriptsCol = db.collection(COLLECTIONS.TRACKING_SCRIPTS);
    const perfCol = db.collection(COLLECTIONS.PERFORMANCE_ENTRIES);
    const proofCol = db.collection(COLLECTIONS.PROOF_OF_PERFORMANCE);
    const aggregatesCol = db.collection(COLLECTIONS.DAILY_AGGREGATES);
    const notificationsCol = db.collection(COLLECTIONS.NOTIFICATIONS);

    // Find the campaign
    const campaign = await findCampaign(campaignsCol, idArg);
    
    if (!campaign) {
      console.error('❌ Campaign not found!\n');
      console.log('Available campaigns:\n');
      
      const allCampaigns = await campaignsCol.find({}).sort({ 'metadata.createdAt': -1 }).limit(10).toArray();
      allCampaigns.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c._id}`);
        console.log(`     Campaign ID: ${c.campaignId || 'N/A'}`);
        console.log(`     Name: ${c.basicInfo?.name || 'Unnamed'}`);
        console.log(`     Status: ${c.status || 'N/A'}`);
        console.log();
      });
      return;
    }

    // Extract campaign info
    const info = extractCampaignInfo(campaign);
    const campaignObjectId = new ObjectId(info._id);
    
    console.log('📋 CAMPAIGN FOUND');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`   MongoDB ID:     ${info._id}`);
    console.log(`   Campaign ID:    ${info.campaignId || 'N/A'}`);
    console.log(`   Name:           ${info.name}`);
    console.log(`   Advertiser:     ${info.advertiserName || 'N/A'}`);
    console.log(`   Status:         ${info.status || 'N/A'}`);
    console.log(`   Hub ID:         ${info.hubId || 'N/A'}`);
    console.log(`   Total Budget:   ${info.totalBudget ? `$${info.totalBudget.toLocaleString()}` : 'N/A'}`);
    console.log(`   Publications:   ${info.publicationCount}`);
    console.log(`   Created:        ${info.createdAt ? new Date(info.createdAt).toLocaleString() : 'N/A'}`);
    console.log();

    // Build query variations to match related records
    // Some collections use ObjectId string, some use campaignId string
    const campaignIdString = info._id;
    const campaignIdField = info.campaignId;

    // Count records in each related collection
    console.log('📊 RELATED RECORDS TO DELETE');
    console.log('───────────────────────────────────────────────────────────────');

    // 1. Campaign itself
    stats.push({
      collection: COLLECTIONS.CAMPAIGNS,
      count: 1,
      sampleIds: [info._id],
    });
    console.log(`   ✓ campaigns: 1 record`);

    // 2. Publication Insertion Orders (uses campaignId string or campaignObjectId)
    const ordersQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
        { campaignObjectId: campaignIdString },
      ].filter(q => Object.values(q)[0]) // Remove undefined queries
    };
    const ordersStats = await countAndSampleRecords(ordersCol, ordersQuery);
    stats.push(ordersStats);
    console.log(`   ✓ publication_insertion_orders: ${ordersStats.count} records`);

    // 3. Creative Assets (uses campaignId)
    const assetsQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const assetsStats = await countAndSampleRecords(assetsCol, assetsQuery);
    stats.push(assetsStats);
    console.log(`   ✓ creative_assets: ${assetsStats.count} records`);

    // 4. Tracking Scripts (uses campaignId)
    const scriptsQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const scriptsStats = await countAndSampleRecords(scriptsCol, scriptsQuery);
    stats.push(scriptsStats);
    console.log(`   ✓ tracking_scripts: ${scriptsStats.count} records`);

    // 5. Performance Entries (uses campaignId)
    const perfQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const perfStats = await countAndSampleRecords(perfCol, perfQuery);
    stats.push(perfStats);
    console.log(`   ✓ performance_entries: ${perfStats.count} records`);

    // 6. Proof of Performance (uses campaignId)
    const proofQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const proofStats = await countAndSampleRecords(proofCol, proofQuery);
    stats.push(proofStats);
    console.log(`   ✓ proof_of_performance: ${proofStats.count} records`);

    // 7. Daily Aggregates (uses campaignId)
    const aggregatesQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const aggregatesStats = await countAndSampleRecords(aggregatesCol, aggregatesQuery);
    stats.push(aggregatesStats);
    console.log(`   ✓ daily_aggregates: ${aggregatesStats.count} records`);

    // 8. Notifications (uses campaignId)
    const notificationsQuery = {
      $or: [
        { campaignId: campaignIdString },
        { campaignId: campaignIdField },
      ].filter(q => Object.values(q)[0])
    };
    const notificationsStats = await countAndSampleRecords(notificationsCol, notificationsQuery);
    stats.push(notificationsStats);
    console.log(`   ✓ notifications: ${notificationsStats.count} records`);

    // Calculate totals
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    console.log(`\n   TOTAL: ${totalRecords} records across ${stats.length} collections`);
    console.log();

    if (!execute) {
      // DRY RUN
      console.log('⚠️  DRY RUN MODE - No changes made!\n');
      console.log('To permanently delete this campaign and all related records, run:\n');
      console.log(`   npx tsx scripts/deleteCampaignPermanently.ts ${idArg} --execute\n`);
      console.log('⚠️  WARNING: This action cannot be undone!\n');
    } else {
      // EXECUTE DELETION
      console.log('🚨 EXECUTING PERMANENT DELETION...\n');

      const results: { collection: string; deleted: number }[] = [];

      // Delete in order of dependencies (children first)
      
      // 1. Delete notifications
      if (notificationsStats.count > 0) {
        const r = await notificationsCol.deleteMany(notificationsQuery);
        results.push({ collection: 'notifications', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} notifications`);
      }

      // 2. Delete daily aggregates
      if (aggregatesStats.count > 0) {
        const r = await aggregatesCol.deleteMany(aggregatesQuery);
        results.push({ collection: 'daily_aggregates', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} daily aggregates`);
      }

      // 3. Delete proof of performance
      if (proofStats.count > 0) {
        const r = await proofCol.deleteMany(proofQuery);
        results.push({ collection: 'proof_of_performance', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} proof of performance records`);
      }

      // 4. Delete performance entries
      if (perfStats.count > 0) {
        const r = await perfCol.deleteMany(perfQuery);
        results.push({ collection: 'performance_entries', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} performance entries`);
      }

      // 5. Delete tracking scripts
      if (scriptsStats.count > 0) {
        const r = await scriptsCol.deleteMany(scriptsQuery);
        results.push({ collection: 'tracking_scripts', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} tracking scripts`);
      }

      // 6. Delete creative assets
      if (assetsStats.count > 0) {
        const r = await assetsCol.deleteMany(assetsQuery);
        results.push({ collection: 'creative_assets', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} creative assets`);
      }

      // 7. Delete publication insertion orders
      if (ordersStats.count > 0) {
        const r = await ordersCol.deleteMany(ordersQuery);
        results.push({ collection: 'publication_insertion_orders', deleted: r.deletedCount });
        console.log(`   ✓ Deleted ${r.deletedCount} insertion orders`);
      }

      // 8. Delete the campaign itself (LAST)
      const campaignResult = await campaignsCol.deleteOne({ _id: campaignObjectId });
      results.push({ collection: 'campaigns', deleted: campaignResult.deletedCount });
      console.log(`   ✓ Deleted ${campaignResult.deletedCount} campaign`);

      // Summary
      const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
      console.log('\n───────────────────────────────────────────────────────────────');
      console.log(`✅ DELETION COMPLETE: ${totalDeleted} total records removed\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const idArg = args.find(a => !a.startsWith('--'));
const executeFlag = args.includes('--execute');

if (!idArg) {
  console.log(`
🗑️  Delete Campaign Permanently - Support Script
═══════════════════════════════════════════════════════════════

Usage:
  npx tsx scripts/deleteCampaignPermanently.ts <campaignId>
  npx tsx scripts/deleteCampaignPermanently.ts <campaignId> --execute

Arguments:
  <campaignId>    MongoDB _id or campaignId string of the campaign

Options:
  --execute       Actually perform the deletion (default is dry run)

Examples:
  # Dry run - preview what would be deleted:
  npx tsx scripts/deleteCampaignPermanently.ts 6930b89875fbc543afebf055

  # Execute deletion:
  npx tsx scripts/deleteCampaignPermanently.ts 6930b89875fbc543afebf055 --execute

  # Using campaign ID string:
  npx tsx scripts/deleteCampaignPermanently.ts campaign-abc123def --execute

Related Collections:
  This script removes records from:
  - campaigns
  - publication_insertion_orders  
  - creative_assets
  - tracking_scripts
  - performance_entries
  - proof_of_performance
  - daily_aggregates
  - notifications
`);
  process.exit(1);
}

deleteCampaignPermanently(idArg, executeFlag).then(() => process.exit(0));

