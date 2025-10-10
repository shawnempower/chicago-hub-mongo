#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { connectToDatabase } from '../integrations/mongodb/client';
import { storefrontConfigurationsService } from '../integrations/mongodb/allServices';

dotenv.config();

async function testStorefrontUpdateData() {
  try {
    console.log('🔍 Testing storefront update with problematic data...');
    
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    const publicationId = '68dd9f2a63cfd4fa2a6d615b';
    
    // Test with the same data structure that's causing the 500 error
    const problematicData = {
      "_id": "68e92552d81e70e011e029f9", // This shouldn't be in update data
      "meta": {
        "configVersion": "1.0.0",
        "publisherId": "sample_publisher",
        "isDraft": true,
        "lastUpdated": "2025-10-10T17:01:14.177Z"
      },
      "theme": {
        "colors": {
          "lightPrimary": "#0077b6",
          "darkPrimary": "#003d5c",
          "mode": "light"
        },
        "typography": {
          "primaryFont": "Inter"
        }
      },
      "components": {
        "hero": {
          "enabled": true,
          "order": 1,
          "content": {
            "title": "Welcome to Our Storefront",
            "description": "Your trusted local media partner"
          }
        },
        "inventory": {
          "enabled": true,
          "order": 2,
          "content": {
            "title": "Our Services",
            "subtitle": "Explore what we offer",
            "channels": []
          }
        }
      },
      "publicationId": "68dd9f2a63cfd4fa2a6d615b", // This shouldn't change
      "isActive": true,
      "createdAt": "2025-10-10T15:25:06.716Z", // This shouldn't be in update data
      "updatedAt": "2025-10-10T17:01:14.177Z"  // This shouldn't be in update data
    };
    
    console.log('\n🧪 Testing with problematic data (includes _id, createdAt, updatedAt)...');
    
    try {
      const result1 = await storefrontConfigurationsService.update(publicationId, problematicData);
      console.log('✅ Update with problematic data succeeded');
      console.log('Result ID:', result1?._id);
    } catch (error) {
      console.log('❌ Update with problematic data failed:', error);
    }
    
    // Test with clean data (no _id, createdAt, updatedAt, publicationId)
    const cleanData = {
      "meta": {
        "configVersion": "1.0.0",
        "publisherId": "sample_publisher",
        "isDraft": true
      },
      "theme": {
        "colors": {
          "lightPrimary": "#0077b6",
          "darkPrimary": "#003d5c",
          "mode": "light"
        },
        "typography": {
          "primaryFont": "Inter"
        }
      },
      "components": {
        "hero": {
          "enabled": true,
          "order": 1,
          "content": {
            "title": "Welcome to Our Storefront",
            "description": "Your trusted local media partner"
          }
        },
        "inventory": {
          "enabled": true,
          "order": 2,
          "content": {
            "title": "Our Services",
            "subtitle": "Explore what we offer",
            "channels": []
          }
        }
      },
      "isActive": true
    };
    
    console.log('\n🧪 Testing with clean data (no _id, createdAt, updatedAt)...');
    
    try {
      const result2 = await storefrontConfigurationsService.update(publicationId, cleanData);
      console.log('✅ Update with clean data succeeded');
      console.log('Result ID:', result2?._id);
    } catch (error) {
      console.log('❌ Update with clean data failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

testStorefrontUpdateData();
