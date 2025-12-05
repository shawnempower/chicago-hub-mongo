import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function compareRadioAds() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n📻 DETAILED RADIO AD COMPARISON`);
    console.log('═'.repeat(100));
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const stations = pub.distributionChannels?.radioStations || [];
      
      for (const station of stations) {
        const stationName = station.callSign || 'Unknown';
        const stationLevelAds = station.advertisingOpportunities || [];
        const shows = station.shows || [];
        
        if (stationLevelAds.length === 0) continue;
        
        console.log(`\n📰 ${pubName} > 📻 ${stationName}`);
        console.log('─'.repeat(100));
        
        // Collect all show-level ads with their show context
        const showAdsMap: Map<string, { show: any; ad: any }[]> = new Map();
        shows.forEach((show: any) => {
          (show.advertisingOpportunities || []).forEach((ad: any) => {
            const key = ad.name || 'Unnamed';
            if (!showAdsMap.has(key)) showAdsMap.set(key, []);
            showAdsMap.get(key)!.push({ show, ad });
          });
        });
        
        console.log(`\n  Station-level ads: ${stationLevelAds.length}`);
        console.log(`  Show-level ads: ${shows.reduce((sum: number, s: any) => sum + (s.advertisingOpportunities?.length || 0), 0)}`);
        
        // Compare each station-level ad
        for (const stationAd of stationLevelAds) {
          const adName = stationAd.name || 'Unnamed';
          const showMatches = showAdsMap.get(adName) || [];
          
          console.log(`\n  📢 "${adName}"`);
          
          if (showMatches.length === 0) {
            console.log(`     ⚠️  NO MATCH in shows - this is UNIQUE data that would be lost!`);
            console.log(`     Station ad data:`);
            console.log(`       Duration: ${stationAd.specifications?.duration}s`);
            console.log(`       Pricing: $${stationAd.pricing?.flatRate} ${stationAd.pricing?.pricingModel}`);
            console.log(`       Hub Pricing: ${stationAd.hubPricing?.length || 0} entries`);
          } else {
            console.log(`     Found ${showMatches.length} match(es) in shows:`);
            
            showMatches.forEach(({ show, ad: showAd }, idx) => {
              console.log(`\n     Match ${idx + 1}: Show "${show.name}" (${show.timeSlot})`);
              
              // Compare key fields
              const diffs: string[] = [];
              
              // Duration
              if (stationAd.specifications?.duration !== showAd.specifications?.duration) {
                diffs.push(`Duration: station=${stationAd.specifications?.duration}s vs show=${showAd.specifications?.duration}s`);
              }
              
              // Pricing
              if (stationAd.pricing?.flatRate !== showAd.pricing?.flatRate) {
                diffs.push(`Price: station=$${stationAd.pricing?.flatRate} vs show=$${showAd.pricing?.flatRate}`);
              }
              if (stationAd.pricing?.pricingModel !== showAd.pricing?.pricingModel) {
                diffs.push(`Model: station=${stationAd.pricing?.pricingModel} vs show=${showAd.pricing?.pricingModel}`);
              }
              
              // Hub Pricing count
              const stationHubCount = stationAd.hubPricing?.length || 0;
              const showHubCount = showAd.hubPricing?.length || 0;
              if (stationHubCount !== showHubCount) {
                diffs.push(`Hub pricing entries: station=${stationHubCount} vs show=${showHubCount}`);
              }
              
              // adFormat
              if (stationAd.adFormat !== showAd.adFormat) {
                diffs.push(`adFormat: station=${stationAd.adFormat || 'none'} vs show=${showAd.adFormat || 'none'}`);
              }
              
              if (diffs.length === 0) {
                console.log(`       ✅ EXACT DUPLICATE - safe to remove`);
              } else {
                console.log(`       ⚠️  DIFFERENCES FOUND:`);
                diffs.forEach(d => console.log(`          - ${d}`));
              }
            });
          }
        }
      }
    }
    
    // Summary
    console.log('\n\n' + '═'.repeat(100));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('═'.repeat(100));
    
    let totalStationAds = 0;
    let exactDupes = 0;
    let withDifferences = 0;
    let unique = 0;
    
    for (const pub of pubs) {
      const stations = pub.distributionChannels?.radioStations || [];
      
      for (const station of stations) {
        const stationAds = station.advertisingOpportunities || [];
        const shows = station.shows || [];
        
        totalStationAds += stationAds.length;
        
        // Build show ads lookup
        const showAdsMap: Map<string, any[]> = new Map();
        shows.forEach((show: any) => {
          (show.advertisingOpportunities || []).forEach((ad: any) => {
            const key = ad.name || 'Unnamed';
            if (!showAdsMap.has(key)) showAdsMap.set(key, []);
            showAdsMap.get(key)!.push(ad);
          });
        });
        
        for (const stationAd of stationAds) {
          const showMatches = showAdsMap.get(stationAd.name || 'Unnamed') || [];
          
          if (showMatches.length === 0) {
            unique++;
          } else {
            // Check if any match is exact
            const hasExactMatch = showMatches.some((showAd: any) => {
              return stationAd.specifications?.duration === showAd.specifications?.duration &&
                     stationAd.pricing?.flatRate === showAd.pricing?.flatRate &&
                     stationAd.pricing?.pricingModel === showAd.pricing?.pricingModel;
            });
            
            if (hasExactMatch) {
              exactDupes++;
            } else {
              withDifferences++;
            }
          }
        }
      }
    }
    
    console.log(`
  Total station-level ads:     ${totalStationAds}
  Exact duplicates:            ${exactDupes} (safe to remove)
  With differences:            ${withDifferences} (need review)
  Unique (no show match):      ${unique} (would be LOST!)
`);
    
    if (unique > 0) {
      console.log(`\n  ⚠️  WARNING: ${unique} ads at station level have NO match in shows!`);
      console.log(`     These should NOT be removed or data will be lost.\n`);
    }
    
    if (withDifferences > 0) {
      console.log(`\n  ⚠️  WARNING: ${withDifferences} ads have different data between station and show level.`);
      console.log(`     Review which version should be kept.\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

compareRadioAds();
