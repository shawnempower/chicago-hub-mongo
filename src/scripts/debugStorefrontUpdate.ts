#!/usr/bin/env tsx

import { connectToDatabase } from '../integrations/mongodb/client';
import { storefrontConfigurationsService } from '../integrations/mongodb/allServices';
import dotenv from 'dotenv';

dotenv.config();

async function debugStorefrontUpdate() {
  try {
    console.log('🔍 Debugging storefront update...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    const publicationId = '68dd9f2a63cfd4fa2a6d615b';
    
    // First, check if the storefront configuration exists
    console.log('\n📋 Checking if storefront configuration exists...');
    const existing = await storefrontConfigurationsService.getByPublicationId(publicationId);
    console.log('Existing config:', existing ? 'Found' : 'Not found');
    
    if (existing) {
      console.log('Existing config ID:', existing._id);
      console.log('Existing meta:', JSON.stringify(existing.meta, null, 2));
    }
    
    // Try the update
    console.log('\n🔄 Attempting update...');
    const updateData = {
      meta: {
        configVersion: "1.0.0",
        publisherId: "sample_publisher",
        isDraft: true,
        lastUpdated: new Date().toISOString()
      },
      theme: {
        colors: {
          lightPrimary: "#0077b6",
          darkPrimary: "#003d5c",
          mode: "light" as const
        },
        typography: {
          primaryFont: "Inter"
        }
      },
      components: {
        hero: {
          enabled: true,
          order: 1,
          content: {
            title: "Welcome to Our Storefront",
            description: "Your trusted local media partner"
          }
        }
      }
    };
    
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    const result = await storefrontConfigurationsService.update(publicationId, updateData);
    
    if (result) {
      console.log('✅ Update successful!');
      console.log('Result ID:', result._id);
      console.log('Updated meta:', JSON.stringify(result.meta, null, 2));
    } else {
      console.log('❌ Update returned null - configuration not found');
    }
    
    // Check if config exists after update
    const afterUpdate = await storefrontConfigurationsService.getByPublicationId(publicationId);
    console.log('Config after update:', afterUpdate ? 'Found' : 'Not found');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

debugStorefrontUpdate();
