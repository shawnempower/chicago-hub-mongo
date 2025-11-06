# Hub System - Production Deployment Guide

**Status:** Ready for Production Deployment  
**Staging Database:** `staging-chicago-hub` ✅ Complete  
**Production Database:** `chicago-hub` ⏳ Pending Migration

---

## Pre-Deployment Checklist

### 1. Verify Staging is Working
- [ ] Hub selector works and persists selection
- [ ] Hub Central Dashboard filters by selected hub
- [ ] Packages page filters by selected hub
- [ ] Hub Management (Admin) CRUD operations work
- [ ] Publication assignment to hubs works
- [ ] Hub pricing editor only shows assigned hubs
- [ ] All 31 publications assigned to hubs
- [ ] All 5 packages assigned to hubs

### 2. Code Deployment
- [ ] All hub code merged to main branch
- [ ] No linter errors
- [ ] No console.log statements in production code
- [ ] Environment variables documented

### 3. Database Backup
- [ ] **CRITICAL:** Backup production `chicago-hub` database before migration
- [ ] Verify backup is complete and accessible
- [ ] Document backup location and timestamp

---

## Production Database Changes Required

### New Collections:
1. **`hubs`** collection
   - Indexes: `hubId`, `basicInfo.name`, `status`, `geography.primaryCity`, `geography.state`

### Modified Collections:
1. **`publications`** collection
   - Add `hubIds` array field (many-to-many relationship)
   - Add index on `hubIds`

2. **`hub_packages`** collection (already has `hubInfo`)
   - Verify all packages have `hubInfo.hubId` set

### Data Migration:
- Create 6 hub documents (Chicago, National, Portland, Seattle, Austin, Denver)
- Scan publications for `hubPricing` references
- Populate `hubIds` arrays on ~26 publications
- Verify all packages have hub assignments

---

## Migration Script

The migration script `scripts/migrateToHubsCollection.ts` is **idempotent** and safe to run:

### Dry Run (Preview Changes):
```bash
# Set to production database
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs:dry-run
```

### Live Migration:
```bash
# Set to production database
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs
```

### What the Script Does:
1. ✅ Creates hub documents (skips if already exist)
2. ✅ Scans all publications for `hubPricing` data
3. ✅ Populates `hubIds` arrays based on pricing references
4. ✅ Verifies data integrity
5. ✅ Provides detailed summary report

---

## Step-by-Step Production Migration

### Step 1: Backup Production Database

```bash
# Using MongoDB Atlas UI:
# 1. Go to Clusters → chicago-hub cluster
# 2. Click "..." → "Take Snapshot"
# 3. Name: "pre-hub-migration-YYYY-MM-DD"
# 4. Wait for completion
# 5. Verify backup exists

# OR using mongodump:
mongodump --uri="mongodb+srv://USER:PASS@cluster.mongodb.net/chicago-hub" \
  --out="./backups/chicago-hub-pre-migration-$(date +%Y-%m-%d)"
```

### Step 2: Verify Current Production State

```bash
# Connect to production and check current state
MONGODB_DB_NAME=chicago-hub node -e "
const { connectToDatabase } = require('./src/integrations/mongodb/client');
const { COLLECTIONS } = require('./src/integrations/mongodb/schemas');

(async () => {
  const db = await connectToDatabase();
  
  // Check if hubs collection exists
  const collections = await db.listCollections().toArray();
  const hasHubs = collections.some(c => c.name === 'hubs');
  console.log('Has hubs collection:', hasHubs);
  
  // Count publications
  const pubCount = await db.collection('publications').countDocuments();
  console.log('Publication count:', pubCount);
  
  // Check for publications with hubIds
  const pubsWithHubIds = await db.collection('publications').countDocuments({ hubIds: { \$exists: true } });
  console.log('Publications with hubIds:', pubsWithHubIds);
  
  process.exit(0);
})();
"
```

### Step 3: Run Dry Run Migration

```bash
# Preview what will happen (NO CHANGES MADE)
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs:dry-run

# Review output carefully:
# - How many hubs will be created?
# - How many publications will be updated?
# - Are the hub assignments correct?
```

### Step 4: Run Production Migration

```bash
# ⚠️ THIS WILL MODIFY PRODUCTION DATABASE
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs

# Expected output:
# ✅ Created 6 hubs (or skipped if exist)
# ✅ Updated ~26 publications with hubIds
# ✅ Verification complete
# 📊 Summary report
```

### Step 5: Verify Production Migration

```bash
# Run verification script
MONGODB_DB_NAME=chicago-hub node -e "
const { connectToDatabase } = require('./src/integrations/mongodb/client');
const { COLLECTIONS } = require('./src/integrations/mongodb/schemas');

(async () => {
  const db = await connectToDatabase();
  
  // Check hubs
  const hubCount = await db.collection('hubs').countDocuments();
  const activeHubs = await db.collection('hubs').countDocuments({ status: 'active' });
  console.log('✅ Total hubs:', hubCount);
  console.log('✅ Active hubs:', activeHubs);
  
  // Check publications with hubIds
  const pubsWithHubs = await db.collection('publications').countDocuments({ hubIds: { \$exists: true, \$ne: [] } });
  const totalPubs = await db.collection('publications').countDocuments();
  console.log('✅ Publications with hubs:', pubsWithHubs, '/', totalPubs);
  
  // Check unassigned publications
  const unassigned = await db.collection('publications').countDocuments({ 
    \$or: [
      { hubIds: { \$exists: false } },
      { hubIds: { \$eq: [] } }
    ]
  });
  console.log('⚠️  Unassigned publications:', unassigned);
  
  // List each hub's publication count
  const hubs = await db.collection('hubs').find({ status: 'active' }).toArray();
  for (const hub of hubs) {
    const count = await db.collection('publications').countDocuments({ hubIds: hub.hubId });
    console.log('  📊', hub.basicInfo.name, ':', count, 'publications');
  }
  
  process.exit(0);
})();
"
```

### Step 6: Deploy Application Code

```bash
# 1. Merge hub feature branch to main
git checkout main
git merge hub-feature-branch

# 2. Tag the release
git tag -a v1.0.0-hub-system -m "Hub System Release"
git push origin main --tags

# 3. Deploy to production (your deployment process)
# - AWS ECS update
# - Or your specific deployment method
```

### Step 7: Post-Deployment Verification

**In Production Application:**
1. ✅ Login as admin
2. ✅ Go to Admin Dashboard → Hubs tab
3. ✅ Verify 6 hubs are listed
4. ✅ Click on Chicago Hub → Verify publications assigned
5. ✅ Test hub selector in header → Switch between hubs
6. ✅ Verify Hub Central Dashboard shows correct data
7. ✅ Verify Packages page filters by hub
8. ✅ Test publication editing → Verify hub pricing dropdown only shows assigned hubs

---

## Rollback Plan

If something goes wrong:

### Option 1: Restore from Backup
```bash
# Using MongoDB Atlas UI:
# 1. Go to Backups
# 2. Select "pre-hub-migration" snapshot
# 3. Click "Restore"
# 4. Choose cluster and confirm

# OR using mongorestore:
mongorestore --uri="mongodb+srv://USER:PASS@cluster.mongodb.net/chicago-hub" \
  --drop \
  ./backups/chicago-hub-pre-migration-YYYY-MM-DD
```

### Option 2: Revert Code Deployment
```bash
# Revert to previous version
git revert <hub-system-commits>
git push origin main

# Redeploy previous version
```

### Option 3: Manual Data Cleanup
```javascript
// Remove hubs collection
db.hubs.drop();

// Remove hubIds from publications
db.publications.updateMany(
  {},
  { $unset: { hubIds: "" } }
);
```

---

## Environment Variables

### Production .env
Ensure these are set in production:

```bash
# Should already be set
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=chicago-hub

# All other existing env vars remain the same
```

No new environment variables are required for the hub system.

---

## Migration Timeline Estimate

- **Backup:** 5-10 minutes
- **Dry Run Verification:** 5 minutes
- **Migration Script:** 1-2 minutes
- **Post-Migration Verification:** 5 minutes
- **Code Deployment:** 10-15 minutes (depends on your process)
- **Post-Deployment Testing:** 10-15 minutes

**Total:** ~45-60 minutes

---

## Support During Migration

### If Migration Fails:
1. **DO NOT PANIC** - The script is idempotent and safe
2. Check the error message in the migration output
3. Verify database connectivity
4. Check MongoDB Atlas for connection issues
5. Review the migration script logs

### Common Issues:

**Issue:** "MONGODB_URI not set"
- **Fix:** Ensure `.env` has `MONGODB_URI` for production

**Issue:** "Hubs already exist"
- **Status:** ✅ This is OK - script skips existing hubs

**Issue:** "Some publications not updated"
- **Check:** Review which publications don't have `hubPricing` data
- **Action:** These can be manually assigned via Admin UI later

---

## Post-Migration Tasks

### 1. Monitor Application
- Check error logs for any hub-related errors
- Monitor API response times
- Verify no database connection issues

### 2. User Communication
- Notify users of new hub selector feature
- Update any documentation
- Train admins on hub management features

### 3. Data Quality
- Review unassigned publications (if any)
- Verify hub assignments are correct
- Check that all packages have hub associations

---

## Success Criteria

✅ All checks must pass:

- [ ] Production database has `hubs` collection with 6 hubs
- [ ] All publications have `hubIds` array (or are intentionally unassigned)
- [ ] All packages have `hubInfo` set
- [ ] Application loads without errors
- [ ] Hub selector works in production
- [ ] Hub filtering works across all pages
- [ ] Admin can manage hubs
- [ ] No console errors related to hubs
- [ ] Performance is acceptable

---

## Notes

- The migration is **idempotent** - safe to run multiple times
- Existing data is never deleted, only updated
- Script includes detailed logging and verification
- Rollback is available via database backup
- No downtime required for migration

---

## Contact

If you need assistance during migration:
- Review migration logs in terminal
- Check MongoDB Atlas for connection/query issues
- Verify environment variables are set correctly
- Consult this documentation for troubleshooting steps

---

**Last Updated:** November 6, 2025  
**Staging Migration Completed:** November 6, 2025  
**Production Migration:** Pending

