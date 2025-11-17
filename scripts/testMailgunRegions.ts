/**
 * Test different Mailgun API endpoints
 */
import dotenv from 'dotenv';
dotenv.config();

import Mailgun from 'mailgun.js';
import FormData from 'form-data';

const mailgun = new Mailgun(FormData);

async function testRegions() {
  const apiKey = process.env.MAILGUN_API_KEY || '';
  const domain = process.env.MAILGUN_DOMAIN || '';
  
  console.log('\n🌍 Testing Mailgun API Endpoints\n');
  console.log('Domain:', domain);
  console.log('API Key:', apiKey.substring(0, 10) + '...\n');
  
  const endpoints = [
    { name: 'US Region', url: 'https://api.mailgun.net' },
    { name: 'EU Region', url: 'https://api.eu.mailgun.net' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing ${endpoint.name}: ${endpoint.url}`);
    console.log('─'.repeat(50));
    
    try {
      const mg = mailgun.client({
        username: 'api',
        key: apiKey,
        url: endpoint.url
      });
      
      // Try to get domain info (this will tell us if the domain exists in this region)
      const result = await mg.domains.get(domain);
      
      console.log(`✅ SUCCESS! Domain found in ${endpoint.name}`);
      console.log('Domain state:', result.state);
      console.log('Domain is_disabled:', result.is_disabled);
      console.log('\n🎯 Use this endpoint in your .env:');
      console.log(`MAILGUN_BASE_URL=${endpoint.url}`);
      
      return; // Found it!
      
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`❌ Domain not found in ${endpoint.name}`);
      } else if (error.status === 401) {
        console.log(`🔒 Authentication failed - check your API key`);
      } else {
        console.log(`❌ Error: ${error.message || error}`);
      }
    }
  }
  
  console.log('\n\n⚠️  Domain not found in either region!');
  console.log('Please verify:');
  console.log('1. Domain is correctly spelled: ' + domain);
  console.log('2. Domain is added to your Mailgun account');
  console.log('3. You\'re using the correct API key for this account');
  
  process.exit(1);
}

testRegions();

