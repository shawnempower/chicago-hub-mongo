import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function checkRadioFields() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n📻 RADIO INVENTORY - FIELD CHECK`);
    console.log('═'.repeat(80));
    
    // Collect all unique field names and values
    const fieldStats = {
      adFormat: { present: 0, missing: 0, values: new Set<string>() },
      format: { present: 0, missing: 0 },
      'format.dimensions': { present: 0, missing: 0, values: new Set<string>() },
      'specifications.duration': { present: 0, missing: 0, values: new Set<number>() },
      'specifications.format': { present: 0, missing: 0, values: new Set<string>() },
      'specifications.fileFormats': { present: 0, missing: 0 },
    };
    
    let totalAds = 0;
    
    // Sample one full ad for inspection
    let sampleAd: any = null;
    
    pubs.forEach((pub: any) => {
      const stations = pub.distributionChannels?.radioStations || [];
      
      stations.forEach((station: any) => {
        const shows = station.shows || [];
        
        shows.forEach((show: any) => {
          const ads = show.advertisingOpportunities || [];
          
          ads.forEach((ad: any) => {
            totalAds++;
            
            // Save first ad as sample
            if (!sampleAd) {
              sampleAd = { ...ad, _show: show.name, _station: station.callSign };
            }
            
            // Check adFormat
            if (ad.adFormat) {
              fieldStats.adFormat.present++;
              fieldStats.adFormat.values.add(ad.adFormat);
            } else {
              fieldStats.adFormat.missing++;
            }
            
            // Check format object
            if (ad.format) {
              fieldStats.format.present++;
              if (ad.format.dimensions) {
                fieldStats['format.dimensions'].present++;
                fieldStats['format.dimensions'].values.add(String(ad.format.dimensions));
              } else {
                fieldStats['format.dimensions'].missing++;
              }
            } else {
              fieldStats.format.missing++;
              fieldStats['format.dimensions'].missing++;
            }
            
            // Check specifications.duration
            if (ad.specifications?.duration !== undefined) {
              fieldStats['specifications.duration'].present++;
              fieldStats['specifications.duration'].values.add(ad.specifications.duration);
            } else {
              fieldStats['specifications.duration'].missing++;
            }
            
            // Check specifications.format (string like "MP3")
            if (ad.specifications?.format) {
              fieldStats['specifications.format'].present++;
              fieldStats['specifications.format'].values.add(ad.specifications.format);
            } else {
              fieldStats['specifications.format'].missing++;
            }
            
            // Check specifications.fileFormats (array like ["MP3", "WAV"])
            if (ad.specifications?.fileFormats && ad.specifications.fileFormats.length > 0) {
              fieldStats['specifications.fileFormats'].present++;
            } else {
              fieldStats['specifications.fileFormats'].missing++;
            }
          });
        });
      });
    });
    
    console.log(`\nTotal Radio Ads (in shows): ${totalAds}`);
    
    console.log(`\n📋 FIELD PRESENCE`);
    console.log('─'.repeat(60));
    
    Object.entries(fieldStats).forEach(([field, stats]) => {
      const pct = totalAds > 0 ? Math.round(stats.present / totalAds * 100) : 0;
      console.log(`  ${field.padEnd(30)} Present: ${stats.present}/${totalAds} (${pct}%)`);
      if ('values' in stats && stats.values.size > 0) {
        console.log(`    Values: ${Array.from(stats.values).slice(0, 10).join(', ')}${stats.values.size > 10 ? '...' : ''}`);
      }
    });
    
    console.log(`\n📄 SAMPLE AD (first one found)`);
    console.log('─'.repeat(60));
    console.log(JSON.stringify(sampleAd, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkRadioFields();
