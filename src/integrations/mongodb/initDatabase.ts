import { getDatabase } from './client';
import { COLLECTIONS, INDEXES } from './schemas';

export const initializeDatabase = async () => {
  try {
    const db = getDatabase();
    console.log('Initializing MongoDB database and indexes...');

    // Create indexes for each collection
    for (const [collectionName, indexes] of Object.entries(INDEXES)) {
      const collection = db.collection(collectionName);
      
      console.log(`Creating indexes for ${collectionName}...`);
      
      for (const indexSpec of indexes) {
        try {
          // Check if it's a unique index (for publicationId and compound unique indexes)
          const isUnique = 
            (collectionName === 'publications' && 'publicationId' in indexSpec) ||
            (collectionName === 'user_profiles' && 'userId' in indexSpec) ||
            (collectionName === 'saved_outlets' && 'userId' in indexSpec && 'outletId' in indexSpec) ||
            (collectionName === 'saved_packages' && 'userId' in indexSpec && 'packageId' in indexSpec);

          const options = isUnique ? { unique: true } : {};
          
          await collection.createIndex(indexSpec, options);
          console.log(`✅ Created index for ${collectionName}:`, indexSpec);
        } catch (error: any) {
          // Ignore error if index already exists
          if (error.code !== 85) { // Index already exists
            console.warn(`⚠️  Warning creating index for ${collectionName}:`, error.message);
          }
        }
      }
    }

    // Create text indexes for search functionality
    try {
      const publicationsCollection = db.collection(COLLECTIONS.PUBLICATIONS);
      await publicationsCollection.createIndex({
        'basicInfo.publicationName': 'text',
        'basicInfo.primaryServiceArea': 'text',
        'basicInfo.headquarters': 'text',
        'editorialInfo.contentFocus': 'text',
        'editorialInfo.contentPillars': 'text'
      }, {
        name: 'publications_text_search'
      });
      console.log('✅ Created text search index for publications');
    } catch (error: any) {
      if (error.code !== 85) {
        console.warn('⚠️  Warning creating text index:', error.message);
      }
    }

    // Create text index for lead inquiries
    try {
      const leadInquiriesCollection = db.collection(COLLECTIONS.LEAD_INQUIRIES);
      await leadInquiriesCollection.createIndex({
        contactName: 'text',
        businessName: 'text',
        contactEmail: 'text'
      }, {
        name: 'lead_inquiries_text_search'
      });
      console.log('✅ Created text search index for lead inquiries');
    } catch (error: any) {
      if (error.code !== 85) {
        console.warn('⚠️  Warning creating lead inquiries text index:', error.message);
      }
    }

    console.log('🎉 Database initialization completed successfully!');
    
    // Return collection stats
    const stats = await getCollectionStats();
    return stats;
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export const getCollectionStats = async () => {
  try {
    const db = getDatabase();
    const stats: Record<string, any> = {};

    for (const collectionName of Object.values(COLLECTIONS)) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const indexes = await collection.listIndexes().toArray();
        
        stats[collectionName] = {
          documentCount: count,
          indexCount: indexes.length,
          indexes: indexes.map(idx => idx.name)
        };
      } catch (error) {
        stats[collectionName] = { error: 'Collection not accessible' };
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting collection stats:', error);
    throw error;
  }
};

// Function to seed initial data
export const seedInitialData = async () => {
  try {
    const db = getDatabase();
    console.log('Seeding initial data...');

    // Seed assistant instructions
    const assistantInstructionsCollection = db.collection(COLLECTIONS.ASSISTANT_INSTRUCTIONS);
    const existingInstructions = await assistantInstructionsCollection.findOne({ isActive: true });
    
    if (!existingInstructions) {
      await assistantInstructionsCollection.insertOne({
        version: '1.0.0',
        instructions: `You are a helpful AI assistant for Chicago Hub, a media planning platform. 
        
Your role is to:
1. Help users find relevant media outlets and advertising packages
2. Provide insights about audience demographics and reach
3. Assist with media planning and budget recommendations
4. Answer questions about advertising opportunities in the Chicago area

Always be professional, helpful, and focus on providing actionable media planning advice.`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Seeded initial assistant instructions');
    }

    console.log('🌱 Initial data seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  }
};

// Utility function to check database health
export const checkDatabaseHealth = async () => {
  try {
    const db = getDatabase();
    
    // Test basic connectivity
    await db.admin().ping();
    console.log('✅ Database connection healthy');

    // Check if collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const expectedCollections = Object.values(COLLECTIONS);
    const missingCollections = expectedCollections.filter(name => !collectionNames.includes(name));
    
    if (missingCollections.length > 0) {
      console.warn('⚠️  Missing collections:', missingCollections);
    } else {
      console.log('✅ All expected collections exist');
    }

    // Get basic stats
    const stats = await getCollectionStats();
    console.log('📊 Collection stats:', stats);

    return {
      healthy: true,
      collections: collectionNames,
      missingCollections,
      stats
    };
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
