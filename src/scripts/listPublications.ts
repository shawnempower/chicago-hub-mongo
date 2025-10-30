#!/usr/bin/env tsx
/**
 * List Publications Script
 * 
 * This script queries MongoDB and lists all publications with their names and website URLs.
 * 
 * Usage:
 *   npm run list-publications
 *   or
 *   tsx src/scripts/listPublications.ts
 */

import { config } from 'dotenv';
import { connectToDatabase, closeConnection, setupGracefulShutdown } from '../integrations/mongodb/client.js';
import { COLLECTIONS } from '../integrations/mongodb/schemas.js';

// Load environment variables
config();

interface PublicationSummary {
  publicationId?: number;
  publicationName: string;
  websiteUrl?: string;
}

async function listPublications() {
  console.log('🚀 Starting publication list query...\n');
  
  try {
    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Connected to database\n');
    
    // Get publications collection
    const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
    
    // Count total publications
    const totalCount = await publicationsCollection.countDocuments();
    console.log(`📊 Total publications in database: ${totalCount}\n`);
    
    // Query all publications and project only needed fields
    const publications = await publicationsCollection
      .find({})
      .project({
        publicationId: 1,
        'basicInfo.publicationName': 1,
        'basicInfo.websiteUrl': 1,
        _id: 0
      })
      .sort({ publicationId: 1 })
      .toArray();
    
    console.log('📋 Publications List:\n');
    console.log('='.repeat(80));
    
    if (publications.length === 0) {
      console.log('No publications found in the database.');
    } else {
      // Display results in a formatted table
      publications.forEach((pub: any, index: number) => {
        const pubId = pub.publicationId || 'N/A';
        const name = pub.basicInfo?.publicationName || 'Unknown';
        const website = pub.basicInfo?.websiteUrl || 'No website';
        
        console.log(`${index + 1}. [ID: ${pubId}] ${name}`);
        console.log(`   Website: ${website}`);
        console.log('-'.repeat(80));
      });
      
      console.log(`\n✅ Listed ${publications.length} publications\n`);
      
      // Export to JSON file option
      const exportData: PublicationSummary[] = publications.map((pub: any) => ({
        publicationId: pub.publicationId,
        publicationName: pub.basicInfo?.publicationName || 'Unknown',
        websiteUrl: pub.basicInfo?.websiteUrl || ''
      }));
      
      // Optional: Write to JSON file
      const fs = await import('fs/promises');
      const outputPath = 'publications-list.json';
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      console.log(`💾 Data exported to: ${outputPath}\n`);
      
      // Optional: Write to CSV file
      const csvPath = 'publications-list.csv';
      const csvHeader = 'Publication ID,Publication Name,Website URL\n';
      const csvRows = exportData
        .map(pub => `${pub.publicationId || ''},"${pub.publicationName}","${pub.websiteUrl || ''}"`)
        .join('\n');
      await fs.writeFile(csvPath, csvHeader + csvRows);
      console.log(`💾 Data exported to: ${csvPath}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error querying publications:', error);
    throw error;
  } finally {
    // Close database connection
    await closeConnection();
    console.log('👋 Database connection closed');
  }
}

// Setup graceful shutdown
setupGracefulShutdown();

// Run the script
listPublications()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

