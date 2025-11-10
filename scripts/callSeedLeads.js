/**
 * Call the seed leads API endpoint
 * Make sure the server is running first!
 * 
 * Usage: 
 * 1. Start your server: npm run dev (or however you start it)
 * 2. Get your auth token from localStorage in the browser
 * 3. Run: AUTH_TOKEN=your_token_here node scripts/callSeedLeads.js
 */

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN environment variable is required');
  console.log('\nTo get your auth token:');
  console.log('1. Log into the app in your browser');
  console.log('2. Open browser console');
  console.log('3. Run: localStorage.getItem("auth_token")');
  console.log('4. Copy the token');
  console.log('5. Run this script with: AUTH_TOKEN=your_token node scripts/callSeedLeads.js');
  process.exit(1);
}

async function seedLeads() {
  console.log('🌱 Calling seed leads API...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/admin/seed-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Successfully seeded leads!');
    console.log(`\n📊 Created ${result.count} leads`);
    console.log('\nYou can now view them in the admin dashboard under the Leads tab.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('403') || error.message.includes('Access denied')) {
      console.log('\n💡 Make sure you are logged in as an admin user.');
    }
  }
}

seedLeads();

