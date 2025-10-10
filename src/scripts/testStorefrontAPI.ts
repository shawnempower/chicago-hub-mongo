#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config();

async function testStorefrontAPI() {
  try {
    console.log('🔍 Testing storefront API update...');
    
    const publicationId = '68dd9f2a63cfd4fa2a6d615b';
    const apiUrl = `http://localhost:3001/api/storefront/${publicationId}`;
    
    // First, let's try to get the current config (no auth needed for GET)
    console.log('\n📋 Getting current configuration...');
    const getResponse = await fetch(apiUrl);
    
    if (!getResponse.ok) {
      console.log('❌ Failed to get current config:', getResponse.status, await getResponse.text());
      return;
    }
    
    const currentConfig = await getResponse.json();
    console.log('✅ Current config retrieved');
    console.log('Current meta:', JSON.stringify(currentConfig.meta, null, 2));
    
    // Now try to update (this will fail without auth, but let's see the error)
    console.log('\n🔄 Attempting update without auth...');
    const updateData = {
      meta: {
        ...currentConfig.meta,
        lastUpdated: new Date().toISOString()
      },
      theme: currentConfig.theme,
      components: {
        ...currentConfig.components,
        testimonials: {
          enabled: true,
          order: 2,
          content: {
            title: "What Our Customers Say",
            subtitle: "Success stories from satisfied clients",
            testimonials: []
          }
        }
      }
    };
    
    const updateResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('Update response status:', updateResponse.status);
    const updateResult = await updateResponse.text();
    console.log('Update response:', updateResult);
    
    if (updateResponse.status === 401 || updateResponse.status === 403) {
      console.log('✅ Expected auth error - API endpoint is working but requires authentication');
    } else if (updateResponse.status === 500) {
      console.log('❌ Server error - this is the issue we need to investigate');
    } else {
      console.log('✅ Unexpected success or different error');
    }
    
  } catch (error) {
    console.error('❌ Error during API test:', error);
  }
}

testStorefrontAPI();
