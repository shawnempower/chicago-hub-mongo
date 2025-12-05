import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

const DRY_RUN = process.argv.includes('--dry-run');

async function fixNewsletterDimensions() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    console.log(`\n🔧 FIX NEWSLETTER DIMENSIONS`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : '⚠️  LIVE - Changes will be applied'}`);
    console.log('═'.repeat(80));
    
    const allPubs = await collection.find({}).toArray();
    let fixCount = 0;
    
    for (const pub of allPubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const newsletters = pub.distributionChannels?.newsletters || [];
      let pubModified = false;
      
      newsletters.forEach((newsletter: any, nIdx: number) => {
        const adOpps = newsletter.advertisingOpportunities || [];
        
        adOpps.forEach((ad: any, aIdx: number) => {
          const topLevelDim = ad.dimensions;
          const formatDim = ad.format?.dimensions;
          
          // Check if top-level is "multiple" or vague but format.dimensions has a real value
          const vagueTerms = ['multiple', 'various', 'varies', 'variable', 'custom', 'flexible', 'n/a', 'tbd'];
          const isTopLevelVague = typeof topLevelDim === 'string' && 
            vagueTerms.some(term => topLevelDim.toLowerCase().includes(term));
          
          const hasValidFormatDim = formatDim && 
            typeof formatDim === 'string' && 
            /^\d+x\d+$/.test(formatDim);
          
          if (isTopLevelVague && hasValidFormatDim) {
            console.log(`\n📰 ${pubName}`);
            console.log(`   Newsletter: ${newsletter.name}`);
            console.log(`   Ad: ${ad.name}`);
            console.log(`   Current dimensions: "${topLevelDim}"`);
            console.log(`   format.dimensions: "${formatDim}"`);
            console.log(`   ➡️  Will update dimensions to: "${formatDim}"`);
            
            // Update the ad's dimensions to match format.dimensions
            ad.dimensions = formatDim;
            pubModified = true;
            fixCount++;
          }
        });
      });
      
      if (pubModified && !DRY_RUN) {
        await collection.updateOne(
          { _id: pub._id },
          { $set: { 'distributionChannels.newsletters': newsletters } }
        );
        console.log(`   ✅ Saved changes for ${pubName}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    if (DRY_RUN) {
      console.log(`\n📊 DRY RUN COMPLETE: ${fixCount} newsletter ad(s) would be fixed`);
      console.log(`   Run without --dry-run to apply changes`);
    } else {
      console.log(`\n✅ COMPLETE: Fixed ${fixCount} newsletter ad dimensions`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixNewsletterDimensions();
