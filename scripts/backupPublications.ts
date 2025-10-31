import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'chicago-hub';
const COLLECTION_NAME = 'publications';

async function backupPublications() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`📊 Fetching all documents from ${DATABASE_NAME}.${COLLECTION_NAME}...`);
    const documents = await collection.find({}).toArray();
    
    console.log(`✅ Found ${documents.length} publication(s)\n`);

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      console.log('📁 Created backups directory\n');
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `publications-backup-${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    // Write to file
    console.log(`💾 Writing backup to ${filename}...`);
    fs.writeFileSync(filepath, JSON.stringify(documents, null, 2), 'utf-8');
    
    // Get file size
    const stats = fs.statSync(filepath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📄 File: ${filepath}`);
    console.log(`📦 Size: ${fileSizeInMB} MB`);
    console.log(`📊 Documents: ${documents.length}`);
    
    // Print summary by publication
    console.log(`\n📋 Publications backed up:`);
    documents.forEach((doc: any, index: number) => {
      console.log(`   ${index + 1}. ${doc.name || 'Unnamed'} (ID: ${doc._id})`);
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the backup
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  backupPublications()
    .then(() => {
      console.log('\n✨ Backup process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Backup process failed:', error);
      process.exit(1);
    });
}

export { backupPublications };

