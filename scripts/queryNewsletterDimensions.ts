import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);

async function queryNewsletterDimensions() {
  try {
    await client.connect();
    const db = client.db('chicago-hub');
    const collection = db.collection('publications');
    
    // Find publications with newsletters containing "Local Deals"
    const pubs = await collection.find({
      'distributionChannels.newsletters.name': { $regex: /local deals/i }
    }).toArray();
    
    console.log(`\n📧 NEWSLETTER DIMENSIONS QUERY`);
    console.log('═'.repeat(80));
    console.log(`\nFound ${pubs.length} publication(s) with "Local Deals" newsletter\n`);
    
    pubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      console.log(`\n📰 ${pubName}`);
      console.log('─'.repeat(60));
      
      const newsletters = pub.distributionChannels?.newsletters || [];
      
      newsletters.forEach((newsletter: any) => {
        if (newsletter.name?.toLowerCase().includes('local deals')) {
          console.log(`\n  📧 Newsletter: ${newsletter.name}`);
          console.log(`     Frequency: ${newsletter.frequency || 'Not specified'}`);
          console.log(`     Subscribers: ${newsletter.subscribers || 'Not specified'}`);
          
          const adOpps = newsletter.advertisingOpportunities || [];
          console.log(`\n     📋 Ad Opportunities (${adOpps.length}):`);
          
          adOpps.forEach((ad: any, idx: number) => {
            console.log(`\n     ${idx + 1}. ${ad.name || 'Unnamed'}`);
            console.log(`        Dimensions: ${JSON.stringify(ad.dimensions) || 'NOT SET'}`);
            console.log(`        Format: ${JSON.stringify(ad.format) || 'NOT SET'}`);
            
            // Show all properties for debugging
            const keys = Object.keys(ad).filter(k => !['_id', 'pricing'].includes(k));
            console.log(`        Other fields: ${keys.join(', ')}`);
          });
        }
      });
    });
    
    // Also show all newsletters with "multiple" dimensions
    console.log(`\n\n🔍 ALL NEWSLETTERS WITH "multiple" DIMENSIONS`);
    console.log('═'.repeat(80));
    
    const allPubs = await collection.find({}).toArray();
    
    allPubs.forEach((pub: any) => {
      const pubName = pub.basicInfo?.publicationName || 'Unknown';
      const newsletters = pub.distributionChannels?.newsletters || [];
      
      newsletters.forEach((newsletter: any) => {
        const adOpps = newsletter.advertisingOpportunities || [];
        
        adOpps.forEach((ad: any) => {
          const dimStr = JSON.stringify(ad.dimensions || ad.format?.dimensions || '');
          if (dimStr.toLowerCase().includes('multiple')) {
            console.log(`\n📰 ${pubName}`);
            console.log(`   Newsletter: ${newsletter.name}`);
            console.log(`   Ad: ${ad.name}`);
            console.log(`   Dimensions: ${dimStr}`);
          }
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

queryNewsletterDimensions();
