# 🚨 URGENT: Seed Algorithms to Database

## Problem

Only 1 algorithm is currently in the database, but the system now requires **all 4 algorithms** to be stored in MongoDB (no code fallbacks).

**This will cause campaigns to fail** if users try to select an algorithm that doesn't exist in the database!

---

## Solution: Seed All 4 Algorithms

### Option 1: Direct MongoDB Seeding (Recommended if you have .env)

**If your `.env` file has `MONGODB_URI`:**

```bash
cd /Users/shawnchapman/Documents/sites/empowerlocal-all/chicago-hub
npx tsx scripts/seed-algorithms.ts
```

**Output should be:**
```
🌱 Starting algorithm seeding...
✓ MongoDB URI found
✅ Seeded: All-Inclusive Strategy (all-inclusive)
✅ Seeded: Budget-Friendly Strategy (budget-friendly)  
✅ Seeded: Little Guys First (little-guys)
✅ Seeded: Size-Weighted Distribution (proportional)

📊 Seeding Summary:
   ✅ Seeded: 4 algorithms
   📁 Total in DB: 4 algorithms

✨ Algorithm seeding complete!
```

---

### Option 2: API-Based Seeding (If server is running)

**Steps:**

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Get your auth token** from browser localStorage:
   - Open browser console (F12)
   - Type: `localStorage.getItem('auth_token')`
   - Copy the token value

3. **Run the API seeding script**:
   ```bash
   ADMIN_TOKEN="your-token-here" npx tsx scripts/seed-algorithms-via-api.ts
   ```

**Output should be:**
```
🌱 Starting algorithm seeding via API...
📡 API URL: http://localhost:5001/api
✓ Auth token found

📝 Seeding: All-Inclusive Strategy (all-inclusive)...
✅ Success: All-Inclusive Strategy

📝 Seeding: Budget-Friendly Strategy (budget-friendly)...
✅ Success: Budget-Friendly Strategy

📝 Seeding: Little Guys First (little-guys)...
✅ Success: Little Guys First

📝 Seeding: Size-Weighted Distribution (proportional)...
✅ Success: Size-Weighted Distribution

📊 Seeding Summary:
   ✅ Seeded: 4 algorithms
   📁 Total: 4 algorithms processed

✨ All algorithms seeded successfully!
```

---

### Option 3: Manual MongoDB Insertion

**If scripts don't work, insert directly via MongoDB shell:**

```javascript
// Connect to MongoDB
mongosh "your-mongodb-uri"

// Switch to your database
use your_database_name

// Check current count
db.algorithm_configs.count()  // Should be 1

// Insert all 4 algorithms (copy/paste this entire block)
db.algorithm_configs.insertMany([
  {
    algorithmId: "all-inclusive",
    name: "All-Inclusive Strategy",
    description: "Maximizes reach by including as many publications as possible within budget",
    icon: "🌍",
    isActive: true,
    isDefault: true,
    createdAt: new Date(),
    createdBy: "manual-seed",
    llmConfig: {
      model: { maxTokens: 16000, temperature: 0.7 },
      pressForward: { enforceAllOutlets: true, prioritizeSmallOutlets: false, allowBudgetExceeding: false, maxBudgetExceedPercent: 0 },
      selection: { maxPublications: 50, diversityWeight: 0.3 }
    },
    constraints: {
      strictBudget: false,
      maxBudgetExceedPercent: 5,
      maxPublications: 50,
      maxPublicationPercent: 0.25,
      minPublicationSpend: 500,
      pruningPassesMax: 3
    }
  },
  {
    algorithmId: "budget-friendly",
    name: "Budget-Friendly Strategy",
    description: "Maximizes value by focusing on cost-effective publications and channels",
    icon: "💰",
    isActive: true,
    isDefault: false,
    createdAt: new Date(),
    createdBy: "manual-seed",
    llmConfig: {
      model: { maxTokens: 16000, temperature: 0.7 },
      pressForward: { enforceAllOutlets: false, prioritizeSmallOutlets: false, allowBudgetExceeding: false, maxBudgetExceedPercent: 0 },
      selection: { maxPublications: 30, diversityWeight: 0.2 }
    },
    constraints: {
      strictBudget: true,
      maxBudgetExceedPercent: 0,
      maxPublications: 30,
      maxPublicationPercent: 0.25,
      minPublicationSpend: 500,
      pruningPassesMax: 3
    },
    scoring: { costEfficiencyWeight: 0.4, reachWeight: 0.3, diversityWeight: 0.3 }
  },
  {
    algorithmId: "little-guys",
    name: "Little Guys First",
    description: "Prioritizes smaller, community-focused publications and alternative media",
    icon: "🏘️",
    isActive: true,
    isDefault: false,
    createdAt: new Date(),
    createdBy: "manual-seed",
    llmConfig: {
      model: { maxTokens: 16000, temperature: 0.7 },
      pressForward: { enforceAllOutlets: true, prioritizeSmallOutlets: true, allowBudgetExceeding: false, maxBudgetExceedPercent: 0 },
      selection: { maxPublications: 40, minPublications: 10, diversityWeight: 0.4 }
    },
    constraints: {
      strictBudget: false,
      maxBudgetExceedPercent: 5,
      maxPublications: 40,
      minPublications: 10,
      maxPublicationPercent: 0.20,
      minPublicationSpend: 300,
      pruningPassesMax: 3
    }
  },
  {
    algorithmId: "proportional",
    name: "Size-Weighted Distribution",
    description: "Allocates budget proportionally based on publication size and reach",
    icon: "📊",
    isActive: true,
    isDefault: false,
    createdAt: new Date(),
    createdBy: "manual-seed",
    llmConfig: {
      model: { maxTokens: 16000, temperature: 0.7 },
      pressForward: { enforceAllOutlets: false, prioritizeSmallOutlets: false, allowBudgetExceeding: false, maxBudgetExceedPercent: 0 },
      selection: { maxPublications: 20, diversityWeight: 0.2 }
    },
    constraints: {
      strictBudget: true,
      maxBudgetExceedPercent: 0,
      maxPublications: 20,
      maxPublicationPercent: 0.25,
      minPublicationSpend: 500,
      pruningPassesMax: 3
    },
    scoring: { sizeWeight: 0.5, reachWeight: 0.3, diversityWeight: 0.2 }
  }
])

// Verify all 4 are inserted
db.algorithm_configs.count()  // Should now be 4

// List them
db.algorithm_configs.find({}, { algorithmId: 1, name: 1 }).pretty()
```

---

## Verification

After seeding, verify all algorithms are present:

### Via MongoDB:
```javascript
db.algorithm_configs.find({}, { algorithmId: 1, name: 1, isActive: 1 }).pretty()
```

Should show:
```javascript
{ algorithmId: "all-inclusive", name: "All-Inclusive Strategy", isActive: true }
{ algorithmId: "budget-friendly", name: "Budget-Friendly Strategy", isActive: true }
{ algorithmId: "little-guys", name: "Little Guys First", isActive: true }
{ algorithmId: "proportional", name: "Size-Weighted Distribution", isActive: true }
```

### Via Admin UI:
1. Navigate to `/admin`
2. Click "Algorithms" tab
3. Should see **4 algorithms** listed

### Via Campaign Creation:
1. Go to campaign builder
2. Algorithm dropdown should show **4 options**

---

## What Happens If Not Seeded?

**Error when creating campaigns:**
```
Algorithm 'budget-friendly' not found in database.
Please seed algorithms using the migration script.
```

**Empty algorithm list in Admin UI**

**Campaign creation fails**

---

## After Seeding

Once all 4 algorithms are seeded:

✅ All campaigns will work  
✅ Admin UI will show all algorithms  
✅ Users can select any algorithm  
✅ Settings can be edited via Admin UI  

---

## Need Help?

**Script won't run?**
- Check that MONGODB_URI is in `.env` file
- Or use the API-based seeding method
- Or insert manually via MongoDB shell

**Can't get auth token?**
- Login to the app at `/login`
- Open browser console (F12)
- Run: `localStorage.getItem('auth_token')`

**Still having issues?**
- Check MongoDB connection is working
- Verify server is running (for API method)
- Check server logs for errors

---

## Quick Commands Summary

```bash
# Option 1: Direct seeding (needs MONGODB_URI in .env)
npx tsx scripts/seed-algorithms.ts

# Option 2: API seeding (needs server running + auth token)
ADMIN_TOKEN="your-token" npx tsx scripts/seed-algorithms-via-api.ts

# Option 3: Manual MongoDB (copy commands above)
mongosh "your-uri"
# Then paste insert commands
```

---

**Action Required: Please seed algorithms now before creating more campaigns!** 🚨

