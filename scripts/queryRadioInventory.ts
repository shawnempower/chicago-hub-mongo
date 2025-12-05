import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function queryRadioInventory() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    // Find publications with radio stations
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n📻 RADIO INVENTORY ANALYSIS`);
    console.log('═'.repeat(80));
    console.log(`\nFound ${pubs.length} publication(s) with radio stations\n`);
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const radioStations = pub.distributionChannels?.radioStations || [];
      
      console.log(`\n📰 ${pubName}`);
      console.log('─'.repeat(60));
      
      radioStations.forEach((station: any, stationIdx: number) => {
        console.log(`\n  📻 Station: ${station.callSign || 'Unknown'}`);
        console.log(`     Frequency: ${station.frequency || 'Not specified'}`);
        console.log(`     Format: ${station.format || 'Not specified'}`);
        console.log(`     Listeners: ${station.listeners || 'Not specified'}`);
        
        // Check for shows
        const shows = station.shows || [];
        console.log(`\n     📺 Shows (${shows.length}):`);
        
        shows.forEach((show: any, showIdx: number) => {
          console.log(`\n       ${showIdx + 1}. ${show.name || 'Unnamed Show'}`);
          console.log(`          Frequency: ${show.frequency || 'Not specified'}`);
          console.log(`          Time Slot: ${show.timeSlot || 'Not specified'}`);
          console.log(`          Avg Listeners: ${show.averageListeners || 'Not specified'}`);
          
          const ads = show.advertisingOpportunities || [];
          console.log(`          📢 Ads (${ads.length}):`);
          
          ads.forEach((ad: any, adIdx: number) => {
            console.log(`\n             ${adIdx + 1}. ${ad.name || 'Unnamed Ad'}`);
            console.log(`                Format: ${ad.adFormat || 'Not specified'}`);
            console.log(`                Spots/Show: ${ad.spotsPerShow || 'Not specified'}`);
            console.log(`                Specifications: ${JSON.stringify(ad.specifications || {})}`);
            console.log(`                Pricing: ${JSON.stringify(ad.pricing || {})}`);
            console.log(`                Hub Pricing: ${ad.hubPricing?.length || 0} hub price(s)`);
          });
        });
        
        // Check for direct advertising opportunities (not in shows)
        const directAds = station.advertisingOpportunities || [];
        if (directAds.length > 0) {
          console.log(`\n     📢 Direct Ads (not in shows): ${directAds.length}`);
          directAds.forEach((ad: any, adIdx: number) => {
            console.log(`       ${adIdx + 1}. ${ad.name || 'Unnamed'}`);
            console.log(`          Format: ${ad.adFormat || 'Not specified'}`);
            console.log(`          Specifications: ${JSON.stringify(ad.specifications || {})}`);
          });
        }
      });
    });
    
    // Summary stats
    console.log('\n\n📊 SUMMARY');
    console.log('═'.repeat(80));
    
    let totalStations = 0;
    let totalShows = 0;
    let totalAds = 0;
    let adFormats: Record<string, number> = {};
    
    pubs.forEach((pub: any) => {
      const stations = pub.distributionChannels?.radioStations || [];
      totalStations += stations.length;
      
      stations.forEach((station: any) => {
        const shows = station.shows || [];
        totalShows += shows.length;
        
        shows.forEach((show: any) => {
          const ads = show.advertisingOpportunities || [];
          totalAds += ads.length;
          
          ads.forEach((ad: any) => {
            const format = ad.adFormat || 'unknown';
            adFormats[format] = (adFormats[format] || 0) + 1;
          });
        });
        
        // Direct ads
        const directAds = station.advertisingOpportunities || [];
        totalAds += directAds.length;
        directAds.forEach((ad: any) => {
          const format = ad.adFormat || 'unknown';
          adFormats[format] = (adFormats[format] || 0) + 1;
        });
      });
    });
    
    console.log(`\n  Total Radio Stations: ${totalStations}`);
    console.log(`  Total Shows: ${totalShows}`);
    console.log(`  Total Ad Opportunities: ${totalAds}`);
    console.log(`\n  Ad Formats:`);
    Object.entries(adFormats).sort((a, b) => b[1] - a[1]).forEach(([format, count]) => {
      console.log(`    - ${format}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

queryRadioInventory();
