#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

async function testStorefrontUpdateWithAuth() {
  try {
    console.log('🔍 Testing storefront update with authentication...');
    
    const publicationId = '68dd9f2a63cfd4fa2a6d615b';
    const baseUrl = 'http://localhost:3001';
    
    // Step 1: Try to get an admin token (we'll need to check how auth works)
    console.log('\n🔐 Checking authentication endpoint...');
    
    // Let's first check if there's a test auth endpoint or if we need to create a test admin user
    const testAuthResponse = await fetch(`${baseUrl}/api/auth/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    console.log('Test auth response:', testAuthResponse.status);
    
    // Step 2: Let's try the update without auth to see the specific error
    console.log('\n📝 Testing update without authentication...');
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
          mode: "light"
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
    
    const updateResponse = await fetch(`${baseUrl}/api/storefront/${publicationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    const responseText = await updateResponse.text();
    console.log('Update response status:', updateResponse.status);
    console.log('Update response body:', responseText);
    
    // Step 3: Check what the server logs show
    if (updateResponse.status === 500) {
      console.log('\n❌ Got 500 error - this suggests the issue is after authentication');
      console.log('The error is likely in the database operation or data validation');
    } else if (updateResponse.status === 401 || updateResponse.status === 403) {
      console.log('\n🔒 Got auth error - this is expected without proper authentication');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testStorefrontUpdateWithAuth();
