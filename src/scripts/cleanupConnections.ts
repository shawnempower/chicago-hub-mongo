#!/usr/bin/env tsx

import { closeConnection } from '../integrations/mongodb/client';

async function cleanupConnections() {
  try {
    console.log('🧹 Cleaning up MongoDB connections...');
    
    // Close any existing connections
    await closeConnection();
    
    console.log('✅ MongoDB connections cleaned up successfully');
    
    // Force exit to ensure process terminates
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error cleaning up connections:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanupConnections();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await cleanupConnections();
});

// Run cleanup
cleanupConnections();
