import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function queryPodcastInventory() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    const pubs = await collection.find({
      'distributionChannels.podcasts': { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`\n🎙️ PODCAST INVENTORY ANALYSIS`);
    console.log('═'.repeat(100));
    console.log(`Found ${pubs.length} publications with podcasts\n`);
    
    let totalPodcasts = 0;
    let totalAds = 0;
    
    // Track field presence
    const fieldStats = {
      hasAdFormat: 0,
      hasFormat: 0,
      hasFormatDimensions: 0,
      hasDuration: 0,
      hasFileFormats: 0,
      hasSpecificationsFormat: 0,
    };
    
    for (const pub of pubs) {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const podcasts = pub.distributionChannels?.podcasts || [];
      
      console.log(`\n📰 ${pubName}`);
      console.log('─'.repeat(80));
      
      for (const podcast of podcasts) {
        totalPodcasts++;
        const podcastName = podcast.name || podcast.podcastName || 'Unknown Podcast';
        
        console.log(`\n  🎙️ ${podcastName}`);
        console.log(`     Episodes/Month: ${podcast.episodesPerMonth || podcast.frequency || 'N/A'}`);
        console.log(`     Average Listeners: ${podcast.averageListeners?.toLocaleString() || 'N/A'}`);
        
        const ads = podcast.advertisingOpportunities || [];
        console.log(`     Advertising Opportunities: ${ads.length}`);
        
        for (const ad of ads) {
          totalAds++;
          console.log(`\n     📢 "${ad.name || 'Unnamed'}"`);
          
          // Check all relevant fields
          console.log(`        adFormat: ${ad.adFormat || '❌ MISSING'}`);
          console.log(`        format: ${ad.format ? JSON.stringify(ad.format) : '❌ MISSING'}`);
          console.log(`        format.dimensions: ${ad.format?.dimensions || '❌ MISSING'}`);
          
          if (ad.specifications) {
            console.log(`        specifications.duration: ${ad.specifications.duration || 'N/A'}`);
            console.log(`        specifications.format: ${ad.specifications.format || 'N/A'}`);
            console.log(`        specifications.fileFormats: ${ad.specifications.fileFormats ? JSON.stringify(ad.specifications.fileFormats) : '❌ MISSING'}`);
          } else {
            console.log(`        specifications: ❌ MISSING`);
          }
          
          // Pricing info
          const pricing = Array.isArray(ad.pricing) ? ad.pricing[0] : ad.pricing;
          if (pricing) {
            console.log(`        pricing: $${pricing.flatRate || pricing.cpm || 0} (${pricing.pricingModel || 'unknown'})`);
          }
          
          // Track stats
          if (ad.adFormat) fieldStats.hasAdFormat++;
          if (ad.format) fieldStats.hasFormat++;
          if (ad.format?.dimensions) fieldStats.hasFormatDimensions++;
          if (ad.specifications?.duration) fieldStats.hasDuration++;
          if (ad.specifications?.fileFormats?.length > 0) fieldStats.hasFileFormats++;
          if (ad.specifications?.format) fieldStats.hasSpecificationsFormat++;
        }
      }
    }
    
    // Summary
    console.log('\n\n' + '═'.repeat(100));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(100));
    console.log(`
  Total Podcasts:              ${totalPodcasts}
  Total Ads:                   ${totalAds}
  
  Field Presence:
  ─────────────────────────────────────────────────
  Has adFormat:                ${fieldStats.hasAdFormat}/${totalAds} (${Math.round(fieldStats.hasAdFormat/totalAds*100)}%)
  Has format object:           ${fieldStats.hasFormat}/${totalAds} (${Math.round(fieldStats.hasFormat/totalAds*100)}%)
  Has format.dimensions:       ${fieldStats.hasFormatDimensions}/${totalAds} (${Math.round(fieldStats.hasFormatDimensions/totalAds*100)}%)
  Has specifications.duration: ${fieldStats.hasDuration}/${totalAds} (${Math.round(fieldStats.hasDuration/totalAds*100)}%)
  Has specifications.format:   ${fieldStats.hasSpecificationsFormat}/${totalAds} (${Math.round(fieldStats.hasSpecificationsFormat/totalAds*100)}%)
  Has specifications.fileFormats: ${fieldStats.hasFileFormats}/${totalAds} (${Math.round(fieldStats.hasFileFormats/totalAds*100)}%)
`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

queryPodcastInventory();
