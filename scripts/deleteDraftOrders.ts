import 'dotenv/config';
import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { ObjectId } from 'mongodb';

async function deleteDraftOrders(campaignId: string, execute: boolean = false) {
  console.log(`\n🗑️  Delete Draft Orders Tool\n===========================\n`);
  console.log(`Campaign: ${campaignId}\n`);
  
  try {
    await connectToDatabase();
    const db = getDatabase();
    const campaignsCollection = db.collection('campaigns');
    
    // Find the campaign
    const campaign = await campaignsCollection.findOne({ 
      _id: new ObjectId(campaignId) 
    });
    
    if (!campaign) {
      console.error('❌ Campaign not found!');
      return;
    }
    
    console.log(`📋 Campaign: ${campaign.basicInfo?.name || 'Unnamed'}`);
    
    const orders = campaign.publicationInsertionOrders || [];
    console.log(`\nFound ${orders.length} insertion orders\n`);
    
    if (orders.length === 0) {
      console.log('✅ No orders to delete');
      return;
    }
    
    // Count orders by status
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((order: any) => {
      const status = order.status || 'unknown';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
    });
    
    console.log('📊 Orders by status:');
    Object.entries(ordersByStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Check if safe to delete (all draft or mostly draft)
    const nonDraftOrders = orders.filter((o: any) => o.status !== 'draft');
    
    if (nonDraftOrders.length > 0) {
      console.log(`\n⚠️  WARNING: ${nonDraftOrders.length} orders are NOT in draft status:`);
      nonDraftOrders.slice(0, 5).forEach((order: any) => {
        console.log(`   - ${order.publicationName}: ${order.status}`);
      });
      if (nonDraftOrders.length > 5) {
        console.log(`   ... and ${nonDraftOrders.length - 5} more`);
      }
      console.log(`\n   These orders may have been sent to publications!`);
      console.log(`   Consider only deleting if you're sure this is okay.\n`);
    }
    
    if (execute) {
      console.log('\n🚀 Executing deletion...\n');
      
      const result = await campaignsCollection.updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { publicationInsertionOrders: [] } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Deleted ${orders.length} insertion orders!\n`);
        console.log('Next step: Go to Campaign Detail page → Insertion Orders tab');
        console.log('           Click "Generate Publication Orders" button\n');
      } else {
        console.log('❌ Failed to delete orders (no changes made)\n');
      }
    } else {
      console.log('\n⚠️  DRY RUN: No changes made.\n');
      console.log(`To actually delete these ${orders.length} orders, run:\n`);
      console.log(`   npx tsx scripts/deleteDraftOrders.ts ${campaignId} --execute\n`);
      
      if (nonDraftOrders.length > 0) {
        console.log(`⚠️  Remember: ${nonDraftOrders.length} non-draft orders will be deleted!\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

const args = process.argv.slice(2);
const campaignIdArg = args[0];
const executeArg = args.includes('--execute');

if (!campaignIdArg) {
  console.error('Usage: npx tsx scripts/deleteDraftOrders.ts <campaignId> [--execute]');
  console.error('\nExample:');
  console.error('  npx tsx scripts/deleteDraftOrders.ts 6924ebb79958bf4617152e2f');
  console.error('  npx tsx scripts/deleteDraftOrders.ts 6924ebb79958bf4617152e2f --execute');
  process.exit(1);
}

deleteDraftOrders(campaignIdArg, executeArg);

