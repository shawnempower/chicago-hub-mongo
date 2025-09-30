#!/usr/bin/env node

/**
 * MongoDB Database Initialization Script
 * 
 * This script initializes the MongoDB database with proper indexes and collections.
 * Run with: npx tsx src/scripts/initMongoDB.ts
 */

import { 
  connectToDatabase, 
  initializeDatabase, 
  seedInitialData, 
  checkDatabaseHealth,
  closeConnection 
} from '../integrations/mongodb';

async function main() {
  console.log('🚀 Starting MongoDB initialization...\n');

  try {
    // Connect to database
    console.log('1. Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB successfully!\n');

    // Check database health
    console.log('2. Checking database health...');
    const healthCheck = await checkDatabaseHealth();
    if (healthCheck.healthy) {
      console.log('✅ Database health check passed!\n');
    } else {
      console.warn('⚠️  Database health check failed:', healthCheck.error);
    }

    // Initialize database (create indexes)
    console.log('3. Initializing database and creating indexes...');
    const stats = await initializeDatabase();
    console.log('✅ Database initialization completed!\n');
    console.log('📊 Collection Statistics:');
    console.table(stats);

    // Seed initial data
    console.log('\n4. Seeding initial data...');
    await seedInitialData();
    console.log('✅ Initial data seeding completed!\n');

    // Final health check
    console.log('5. Final health check...');
    const finalCheck = await checkDatabaseHealth();
    if (finalCheck.healthy) {
      console.log('✅ Final health check passed!');
      console.log('🎉 MongoDB initialization completed successfully!\n');
      
      console.log('📋 Summary:');
      console.log(`• Collections created: ${Object.keys(finalCheck.stats || {}).length}`);
      console.log('• Indexes created: ✅');
      console.log('• Initial data seeded: ✅');
      console.log('• Database ready for use: ✅\n');
      
      console.log('🔗 Connection string used:');
      console.log('mongodb+srv://shawn:***@cluster0.1shq5cl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0\n');
      
      console.log('📚 Available collections:');
      if (finalCheck.stats) {
        Object.entries(finalCheck.stats).forEach(([name, info]: [string, any]) => {
          console.log(`  • ${name}: ${info.documentCount || 0} documents, ${info.indexCount || 0} indexes`);
        });
      }
    } else {
      console.error('❌ Final health check failed:', finalCheck.error);
    }

  } catch (error) {
    console.error('❌ Error during MongoDB initialization:', error);
    process.exit(1);
  } finally {
    // Close connection
    console.log('\n6. Closing database connection...');
    await closeConnection();
    console.log('✅ Database connection closed.');
    console.log('🏁 Script completed.');
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
