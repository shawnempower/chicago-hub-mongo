import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

// Radio standards we just defined
const RADIO_FORMAT_MAP: Record<number, string> = {
  15: '15s-spot',
  20: '15s-spot', // Close to 15s
  30: '30s-spot',
  60: '60s-spot',
};

interface RadioIssue {
  publication: string;
  station: string;
  show?: string;
  ad: string;
  issues: string[];
}

async function analyzeRadioInventory() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({
      'distributionChannels.radioStations': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n📻 RADIO INVENTORY ANALYSIS - IMPROVEMENT NEEDED`);
    console.log('═'.repeat(80));
    
    const allIssues: RadioIssue[] = [];
    let totalAds = 0;
    let adsWithIssues = 0;
    
    // Track what's missing
    const missingFields = {
      adFormat: 0,
      fileFormats: 0,
      format: 0, // format object (like newsletter's format.dimensions)
    };
    
    // Track duplicates
    let duplicateCount = 0;
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const stations = pub.distributionChannels?.radioStations || [];
      
      stations.forEach((station: any) => {
        const stationName = station.callSign || 'Unknown Station';
        const shows = station.shows || [];
        const directAds = station.advertisingOpportunities || [];
        
        // Check for duplicates (ads that exist both in shows AND directly on station)
        const showAdNames = new Set<string>();
        shows.forEach((show: any) => {
          (show.advertisingOpportunities || []).forEach((ad: any) => {
            showAdNames.add(ad.name || '');
          });
        });
        
        directAds.forEach((ad: any) => {
          if (showAdNames.has(ad.name || '')) {
            duplicateCount++;
          }
        });
        
        // Analyze show ads
        shows.forEach((show: any) => {
          const showName = show.name || 'Unknown Show';
          const ads = show.advertisingOpportunities || [];
          
          ads.forEach((ad: any) => {
            totalAds++;
            const issues: string[] = [];
            
            // Check adFormat
            if (!ad.adFormat) {
              issues.push('Missing adFormat (should be 15s-spot, 30s-spot, etc.)');
              missingFields.adFormat++;
            }
            
            // Check format object (like newsletter's format.dimensions)
            if (!ad.format) {
              issues.push('Missing format object (should have format.dimensions like "30s")');
              missingFields.format++;
            }
            
            // Check specifications.format (file formats)
            if (!ad.specifications?.format && !ad.specifications?.fileFormats) {
              issues.push('Missing file format specs (should be MP3, WAV, or TXT)');
              missingFields.fileFormats++;
            }
            
            // Check if duration could map to a standard format
            const duration = ad.specifications?.duration;
            if (duration && !ad.adFormat) {
              const suggestedFormat = inferFormat(duration);
              issues.push(`Duration ${duration}s should have adFormat: "${suggestedFormat}"`);
            }
            
            if (issues.length > 0) {
              adsWithIssues++;
              allIssues.push({
                publication: pubName,
                station: stationName,
                show: showName,
                ad: ad.name || 'Unnamed',
                issues
              });
            }
          });
        });
      });
    });
    
    // Summary
    console.log(`\n📊 SUMMARY`);
    console.log('─'.repeat(60));
    console.log(`  Total Radio Ads: ${totalAds}`);
    console.log(`  Ads with Issues: ${adsWithIssues} (${Math.round(adsWithIssues/totalAds*100)}%)`);
    console.log(`  Duplicate Ads (in shows AND directly on station): ${duplicateCount}`);
    
    console.log(`\n📋 MISSING FIELDS`);
    console.log('─'.repeat(60));
    console.log(`  Missing adFormat: ${missingFields.adFormat}`);
    console.log(`  Missing format object: ${missingFields.format}`);
    console.log(`  Missing file format specs: ${missingFields.fileFormats}`);
    
    // Show sample issues
    console.log(`\n🔍 SAMPLE ISSUES (first 10)`);
    console.log('─'.repeat(60));
    
    allIssues.slice(0, 10).forEach((issue, idx) => {
      console.log(`\n  ${idx + 1}. ${issue.publication} > ${issue.station} > ${issue.show || 'Direct'}`);
      console.log(`     Ad: "${issue.ad}"`);
      issue.issues.forEach(i => console.log(`     ❌ ${i}`));
    });
    
    // Recommendations
    console.log(`\n\n✅ RECOMMENDATIONS`);
    console.log('═'.repeat(80));
    console.log(`
  1. SET adFormat FIELD
     - Infer from duration: 15s → "15s-spot", 30s → "30s-spot", etc.
     - Or from name: "Live Read" → "live-read"
     
  2. ADD format OBJECT (like newsletters)
     - Add format: { dimensions: "30s" } to match standard
     - This enables creative asset matching
     
  3. ADD FILE FORMAT SPECS  
     - For pre-recorded: specifications.fileFormats = ["MP3", "WAV"]
     - For live reads: specifications.fileFormats = ["TXT"]
     
  4. REMOVE DUPLICATES
     - ${duplicateCount} ads appear both in shows AND directly on station
     - Keep only the show-level ads (more specific)
`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

function inferFormat(durationSeconds: number): string {
  if (durationSeconds <= 15) return '15s-spot';
  if (durationSeconds <= 20) return '15s-spot';
  if (durationSeconds <= 30) return '30s-spot';
  if (durationSeconds <= 60) return '60s-spot';
  if (durationSeconds >= 300) return 'long-form';
  return 'custom';
}

analyzeRadioInventory();
