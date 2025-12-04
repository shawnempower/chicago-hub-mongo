import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkPublication(name: string) {
  const mongoUri = process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('chicago-hub');
    
    const pub = await db.collection('publications').findOne({
      'basicInformation.title': new RegExp(name, 'i')
    });
    
    if (!pub) {
      console.log(`❌ Publication not found: "${name}"\n`);
      return;
    }
    
    console.log(`\n📰 ${pub.basicInformation?.title}\n`);
    console.log('='.repeat(80));
    
    if (pub.distributionChannels?.print) {
      const prints = Array.isArray(pub.distributionChannels.print) 
        ? pub.distributionChannels.print 
        : [pub.distributionChannels.print];
      
      prints.forEach((print: any, i: number) => {
        console.log(`\nPrint Channel ${i + 1}:`);
        
        if (print.advertisingOpportunities) {
          print.advertisingOpportunities.forEach((opp: any, j: number) => {
            console.log(`\n  ${j + 1}. ${opp.name || 'Unnamed'}`);
            console.log(`     Ad Format: ${opp.adFormat || 'N/A'}`);
            console.log(`     Dimensions: ${opp.dimensions || '❌ NOT SET'}`);
            console.log(`     Color: ${opp.color || 'N/A'}`);
            
            if (opp.specifications) {
              console.log(`     Specifications:`);
              Object.entries(opp.specifications).forEach(([key, val]) => {
                console.log(`       - ${key}: ${JSON.stringify(val)}`);
              });
            }
          });
        }
      });
    } else {
      console.log('No print channel');
    }

  } finally {
    await client.close();
  }
}

// Check a few publications from the campaign
const pubs = ['Chicago Reader', 'Chicago Sun-Times', 'StreetWise'];

Promise.all(pubs.map(p => checkPublication(p)))
  .then(() => process.exit(0))
  .catch(console.error);

