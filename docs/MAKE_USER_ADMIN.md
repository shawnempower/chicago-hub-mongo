# How to Make a User an Admin

## Issue
Getting "Admin access required" when trying to access admin features like leads management.

## Solution
You need to set `isAdmin: true` in your user record in MongoDB.

### Option 1: Using MongoDB Compass or Shell

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
)
```

### Option 2: Using a Quick Script

Create a temporary script to grant admin access:

```bash
# In your project root
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function makeAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'empowerlocal');
    
    // Replace with your email
    const result = await db.collection('users').updateOne(
      { email: 'your-email@example.com' },
      { \$set: { isAdmin: true } }
    );
    
    console.log('✅ Admin access granted!', result);
  } finally {
    await client.close();
  }
}

makeAdmin();
"
```

### Option 3: Using curl with Admin Creation Endpoint (if available)

If you have direct database access, you can also:

1. Open MongoDB Compass
2. Connect to your database
3. Find the `users` collection
4. Find your user by email
5. Add or update the field: `isAdmin: true`

### After Making Yourself Admin

1. Restart the server if needed
2. Log out and log back in
3. Your token will now include admin privileges
4. You'll be able to access:
   - `/api/admin/leads` - Lead management
   - `/api/admin/surveys` - Survey management
   - `/api/admin/algorithms` - Algorithm configuration
   - All other admin-only endpoints

### Verify Admin Status

```bash
curl 'http://localhost:3001/api/auth/me' \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.user.isAdmin'
```

Should return `true` after you've set admin privileges.

