import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listDatabases() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    
    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('\n📊 Available Databases:\n');
    
    for (const db of databases) {
      console.log(`- ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    console.log('\n🔍 Checking chicago-hub database:\n');
    const chicagoHub = client.db('chicago-hub');
    const collections = await chicagoHub.listCollections().toArray();
    
    console.log('Collections in chicago-hub:');
    for (const coll of collections) {
      const count = await chicagoHub.collection(coll.name).countDocuments();
      console.log(`  - ${coll.name}: ${count} documents`);
    }

  } finally {
    await client.close();
  }
}

listDatabases().then(() => process.exit(0)).catch(console.error);

