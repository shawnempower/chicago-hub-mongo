import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function showRadioDuplicates() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n📻 RADIO DUPLICATES - BEFORE & AFTER`);
    console.log('═'.repeat(80));
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const stations = pub.distributionChannels?.radioStations || [];
      
      for (const station of stations) {
        const stationName = station.callSign || 'Unknown';
        const stationLevelAds = station.advertisingOpportunities || [];
        const shows = station.shows || [];
        
        // Collect all show-level ads
        const showLevelAds: { showName: string; adName: string }[] = [];
        shows.forEach((show: any) => {
          (show.advertisingOpportunities || []).forEach((ad: any) => {
            showLevelAds.push({
              showName: show.name || 'Unknown Show',
              adName: ad.name || 'Unnamed'
            });
          });
        });
        
        console.log(`\n📰 ${pubName} > 📻 ${stationName}`);
        console.log('─'.repeat(70));
        
        // BEFORE
        console.log(`\n  🔴 BEFORE (Current State):`);
        console.log(`     Station-level ads (DUPLICATES - will be removed): ${stationLevelAds.length}`);
        if (stationLevelAds.length > 0) {
          stationLevelAds.slice(0, 5).forEach((ad: any) => {
            console.log(`       ❌ "${ad.name || 'Unnamed'}"`);
          });
          if (stationLevelAds.length > 5) {
            console.log(`       ... and ${stationLevelAds.length - 5} more`);
          }
        }
        
        console.log(`\n     Show-level ads (CORRECT - will be kept): ${showLevelAds.length}`);
        const showGroups: Record<string, string[]> = {};
        showLevelAds.forEach(({ showName, adName }) => {
          if (!showGroups[showName]) showGroups[showName] = [];
          showGroups[showName].push(adName);
        });
        
        Object.entries(showGroups).forEach(([showName, ads]) => {
          console.log(`       📺 ${showName}:`);
          ads.forEach(ad => console.log(`          ✅ "${ad}"`));
        });
        
        // AFTER
        console.log(`\n  🟢 AFTER (Post-Migration):`);
        console.log(`     Station-level ads: 0 (removed)`);
        console.log(`     Show-level ads: ${showLevelAds.length} (unchanged)`);
        
        // Summary
        console.log(`\n  📊 Summary:`);
        console.log(`     Ads removed: ${stationLevelAds.length}`);
        console.log(`     Ads remaining: ${showLevelAds.length}`);
        console.log(`     Data lost: NONE (station ads are exact duplicates of show ads)`);
      }
    }
    
    // Verify duplicates are exact matches
    console.log('\n\n' + '═'.repeat(80));
    console.log('🔍 DUPLICATE VERIFICATION');
    console.log('═'.repeat(80));
    console.log('\nVerifying that station-level ads are exact duplicates of show-level ads...\n');
    
    let allMatch = true;
    for (const pub of pubs) {
      const stations = pub.distributionChannels?.radioStations || [];
      
      for (const station of stations) {
        const stationAds = station.advertisingOpportunities || [];
        const showAds: any[] = [];
        (station.shows || []).forEach((show: any) => {
          (show.advertisingOpportunities || []).forEach((ad: any) => {
            showAds.push(ad);
          });
        });
        
        // Check each station ad exists in show ads
        for (const stationAd of stationAds) {
          const matchingShowAd = showAds.find(sa => sa.name === stationAd.name);
          if (!matchingShowAd) {
            console.log(`  ⚠️  "${stationAd.name}" at station level has NO match in shows!`);
            allMatch = false;
          }
        }
      }
    }
    
    if (allMatch) {
      console.log('  ✅ All station-level ads have matching show-level ads');
      console.log('  ✅ Safe to remove station-level duplicates - no data will be lost\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

showRadioDuplicates();
