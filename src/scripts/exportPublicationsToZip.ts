#!/usr/bin/env tsx

/**
 * Script to export all publications from MongoDB to individual JSON files and create a zip archive
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { connectToDatabase, getDatabase } from '../integrations/mongodb/client';
import { COLLECTIONS } from '../integrations/mongodb/schemas';
import archiver from 'archiver';

async function exportPublicationsToZip() {
  try {
    console.log('🚀 Starting publications export process...\n');
    console.log('🔧 Connecting to MongoDB...');
    
    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');
    
    // Get publications collection
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Count and fetch all publications
    const totalCount = await publicationsCollection.countDocuments();
    console.log(`📊 Found ${totalCount} publications in database\n`);
    
    const publications = await publicationsCollection.find({}).toArray();
    
    // Create temporary directory for exports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.resolve(`exports/publications_${timestamp}`);
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    console.log(`📁 Created export directory: ${exportDir}\n`);
    console.log('💾 Exporting publications to JSON files...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Export each publication to a separate JSON file
    for (const publication of publications) {
      try {
        const publicationId = publication.publicationId || 'unknown';
        const publicationName = publication.basicInfo?.publicationName || 'unnamed';
        
        // Create safe filename
        const safeFileName = publicationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        
        const fileName = `${publicationId}_${safeFileName}.json`;
        const filePath = path.join(exportDir, fileName);
        
        // Write JSON file with pretty formatting
        fs.writeFileSync(filePath, JSON.stringify(publication, null, 2), 'utf-8');
        
        console.log(`  ✅ Exported: ${publicationName} (ID: ${publicationId}) → ${fileName}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error exporting publication:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Export completed:`);
    console.log(`   - Success: ${successCount} publications`);
    console.log(`   - Errors: ${errorCount} publications\n`);
    
    // Create zip file
    const zipFileName = `publications_export_${timestamp}.zip`;
    const zipFilePath = path.resolve(`exports/${zipFileName}`);
    
    console.log('📦 Creating zip archive...\n');
    
    await createZipArchive(exportDir, zipFilePath);
    
    console.log(`✅ Zip file created: ${zipFilePath}\n`);
    
    // Get zip file size
    const stats = fs.statSync(zipFilePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('📋 Summary:');
    console.log(`   - Total publications: ${totalCount}`);
    console.log(`   - Successfully exported: ${successCount}`);
    console.log(`   - Individual JSON files: ${exportDir}`);
    console.log(`   - Zip archive: ${zipFilePath}`);
    console.log(`   - Archive size: ${fileSizeInMB} MB\n`);
    
    console.log('🎉 Export process completed successfully!');
    console.log('\n💡 You can now:');
    console.log(`   1. Find individual JSON files in: ${exportDir}`);
    console.log(`   2. Download the zip file: ${zipFilePath}`);
    console.log(`   3. Clean up the individual files if you only need the zip\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Export process failed:', error);
    process.exit(1);
  }
}

function createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      console.log(`   - Total bytes: ${archive.pointer()}`);
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('   ⚠️  Warning:', err);
      } else {
        reject(err);
      }
    });
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Run the export
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  exportPublicationsToZip();
}

export { exportPublicationsToZip };

