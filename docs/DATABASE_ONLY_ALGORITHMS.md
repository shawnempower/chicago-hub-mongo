# Database-Only Algorithm Configuration

## Overview

As of this update, **all algorithm configurations are stored exclusively in MongoDB**. There are no fallbacks to code defaults - the database is the single source of truth.

## Key Changes

### 1. Removed Code Fallbacks
- ❌ **Before**: Code configs were used as defaults, DB configs were optional overrides
- ✅ **After**: All configs MUST be in database, code configs are only for seeding

### 2. Single Source of Truth
```
Database (MongoDB) = ONLY source
    ↓
Campaign Generation
```

### 3. Required Migration
Before using algorithms, you **must seed the database** with initial configurations.

---

## Setup Instructions

### Step 1: Seed Algorithms to Database

Run the seeding script to populate MongoDB with algorithm configurations:

```bash
npx tsx scripts/seed-algorithms.ts
```

This will:
- ✅ Create algorithm_configs documents for all 4 algorithms
- ✅ Copy configurations from code files to database
- ✅ Preserve any existing database configs (won't overwrite)
- ✅ Set `all-inclusive` as the default algorithm

**Output:**
```
🌱 Starting algorithm seeding...
✅ Seeded: All-Inclusive Strategy (all-inclusive)
✅ Seeded: Budget-Friendly Strategy (budget-friendly)
✅ Seeded: Little Guys First (little-guys)
✅ Seeded: Size-Weighted Proportional (proportional)

📊 Seeding Summary:
   ✅ Seeded: 4 algorithms
   ⏭️  Skipped: 0 algorithms (already exist)
   📁 Total in DB: 4 algorithms

✨ Algorithm seeding complete!
```

### Step 2: Verify Database

Check MongoDB to confirm algorithms were seeded:

```javascript
db.algorithm_configs.find().pretty()
```

You should see 4 documents with complete configurations.

### Step 3: Manage via Admin UI

Navigate to `/admin` → **Algorithms** tab to:
- ✅ View all algorithms
- ✅ Edit configurations
- ✅ Enable/disable algorithms
- ✅ Set default algorithm

---

## What Happens Without Seeding?

If algorithms are not in the database:

### ❌ Campaign Creation Fails
```javascript
Error: Algorithm 'proportional' not found in database. 
Please seed algorithms using the migration script.
```

### ❌ Admin UI Shows Empty List
The Algorithms tab will show no algorithms (empty state).

### ❌ No Fallback Behavior
The system will **not** fall back to code configurations. This is intentional to ensure:
- 🎯 Database is always up-to-date
- 🎯 No confusion between code vs. database configs
- 🎯 Easier to track what's actually being used

---

## Re-seeding (Force Update)

If you want to reset algorithms to code defaults:

### Option 1: Delete and Re-seed
```javascript
// Delete all algorithm configs
db.algorithm_configs.deleteMany({})

// Re-run seeding script
npx tsx scripts/seed-algorithms.ts
```

### Option 2: Manually Update in Admin UI
1. Go to `/admin` → Algorithms
2. Edit each algorithm to desired settings
3. Save changes

### Option 3: Direct MongoDB Update
```javascript
db.algorithm_configs.updateOne(
  { algorithmId: "proportional" },
  { 
    $set: { 
      "constraints.pruningPassesMax": 3,
      updatedAt: new Date(),
      updatedBy: "manual-update"
    } 
  }
)
```

---

## Architecture

### Before (Hybrid Model)
```
Code Configs (default)
    ↓
DB Overrides (optional)
    ↓
Merged Config
    ↓
Campaign Generation
```

### After (Database-Only Model)
```
Database ONLY
    ↓
Campaign Generation
```

---

## Code Changes

### 1. Registry (`server/campaignAlgorithms/registry.ts`)

**Before:**
```typescript
export async function getAlgorithmMerged(algorithmId) {
  const base = getAlgorithm(algorithmId); // Code default
  const dbConfig = await db.findOne({ algorithmId });
  if (!dbConfig) return base; // Fallback to code
  return { ...base, ...dbConfig }; // Merge
}
```

**After:**
```typescript
export async function getAlgorithmMerged(algorithmId) {
  const doc = await db.findOne({ algorithmId });
  if (!doc) {
    throw new Error('Algorithm not found in database');
  }
  return doc; // Database only
}
```

### 2. Admin Endpoints (`server/index.ts`)

**Before:**
- Loaded code configs as base
- Merged with DB overrides
- Showed "hasDbOverride" flag

**After:**
- Loads ONLY from database
- No merge logic
- No "hasDbOverride" concept

### 3. Admin UI (`src/components/admin/AlgorithmManagement.tsx`)

**Before:**
- "Reset to Defaults" button
- "Modified" badge
- Code defaults shown for comparison

**After:**
- No reset functionality (database IS the defaults)
- "Default" badge (shows which is default algorithm)
- Simpler UI focused on current database values

---

## Benefits of Database-Only Approach

### 1. **Clarity**
- No confusion about which config is being used
- What you see in admin UI = what's actually running

### 2. **Consistency**
- All environments use same storage mechanism
- Easier to replicate configurations across servers

### 3. **Simplicity**
- Less code (no merge logic)
- Fewer edge cases
- Clearer error messages

### 4. **Production-Ready**
- Configurations can be backed up with normal MongoDB backups
- Easy to export/import algorithm settings
- No need to redeploy code to change settings

---

## Migration Guide

### For Existing Installations

1. **Run the seed script** (required):
   ```bash
   npx tsx scripts/seed-algorithms.ts
   ```

2. **Verify seeding**:
   ```bash
   mongo
   use your_database
   db.algorithm_configs.count()  // Should be 4
   ```

3. **Test campaign creation**:
   - Create a new campaign
   - Verify it works with each algorithm
   - Check server logs for any errors

### For New Installations

The seed script will be run automatically as part of setup:
```bash
npm run setup  # (includes seed-algorithms.ts)
```

---

## Troubleshooting

### Problem: "Algorithm not found in database"

**Solution:**
```bash
npx tsx scripts/seed-algorithms.ts
```

### Problem: Empty algorithms list in admin UI

**Solution:**
1. Check MongoDB connection
2. Verify `algorithm_configs` collection exists
3. Run seed script

### Problem: Want to restore original settings

**Solution:**
```bash
# Delete all configs
db.algorithm_configs.deleteMany({})

# Re-seed from code
npx tsx scripts/seed-algorithms.ts
```

---

## Production Deployment Checklist

- [ ] Run seed script on production database
- [ ] Verify all 4 algorithms are present
- [ ] Test creating a campaign with each algorithm
- [ ] Document custom algorithm settings in your runbook
- [ ] Set up regular MongoDB backups (includes algorithm configs)

---

## Future: Adding New Algorithms

To add a new algorithm:

1. **Create algorithm document** in MongoDB:
   ```javascript
   db.algorithm_configs.insertOne({
     algorithmId: "my-new-algorithm",
     name: "My New Algorithm",
     description: "Does something cool",
     llmConfig: { /* ... */ },
     constraints: { /* ... */ },
     scoring: { /* ... */ },
     promptInstructions: "...",
     isActive: true,
     isDefault: false,
     createdAt: new Date(),
     createdBy: "admin@example.com"
   })
   ```

2. **Update TypeScript types** (for autocomplete):
   ```typescript
   // server/campaignAlgorithms/types.ts
   export type AlgorithmType = 
     | 'all-inclusive' 
     | 'budget-friendly' 
     | 'little-guys' 
     | 'proportional'
     | 'my-new-algorithm';  // Add here
   ```

3. **Test it** via admin UI

No code deployment needed for the algorithm itself - it's all in the database!

---

**Summary**: The database is now the single source of truth for all algorithm configurations. This makes the system simpler, clearer, and more production-ready! 🚀

