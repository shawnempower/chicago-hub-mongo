# Hub System Deployment Checklist

**Date:** _______________  
**Deployed By:** _______________  
**Database:** `chicago-hub` (Production)

---

## Pre-Deployment (Do First)

### 1. Backup Production Database ⚠️ CRITICAL
- [ ] Create MongoDB Atlas snapshot: `pre-hub-migration-YYYY-MM-DD`
- [ ] Verify backup completed successfully
- [ ] Document backup timestamp: _______________

### 2. Verify Production Database
```bash
# Check current production state
MONGODB_DB_NAME=chicago-hub npm run verify:production
```
- [ ] Script completes without errors
- [ ] Note if migration is needed (likely yes)

---

## Database Migration

### 3. Dry Run (Preview Changes)
```bash
# Preview what will happen - NO CHANGES
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs:dry-run
```
- [ ] Review output carefully
- [ ] Verify hub count: Expected 6 hubs
- [ ] Verify publication updates: Expected ~26 publications
- [ ] No unexpected errors

### 4. Run Migration
```bash
# Apply changes to production database
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs
```
- [ ] Migration completed successfully
- [ ] Hubs created: _____ (should be 6)
- [ ] Publications updated: _____ (should be ~26)
- [ ] No errors reported

### 5. Verify Migration
```bash
# Verify production database state
MONGODB_DB_NAME=chicago-hub npm run verify:production
```
- [ ] All checks pass ✅
- [ ] 6 active hubs exist
- [ ] Publications have hub assignments
- [ ] Packages have hub info

---

## Code Deployment

### 6. Deploy Application
```bash
# Tag release
git tag -a v1.0.0-hub-system -m "Hub System Release"
git push origin main --tags

# Deploy (use your deployment method)
npm run deploy
```
- [ ] Code deployed to production
- [ ] Application started successfully
- [ ] No deployment errors

---

## Post-Deployment Verification

### 7. Smoke Tests (In Production App)

#### Admin Tests
- [ ] Login as admin
- [ ] Navigate to Admin Dashboard → Hubs tab
- [ ] Verify 6 hubs are listed (Chicago, National, Portland, Seattle, Austin, Denver)
- [ ] Click on "Chicago Hub" → Verify publications are assigned
- [ ] Try editing a hub → Save successfully
- [ ] Try assigning a publication to a hub → Works

#### User Tests
- [ ] Test hub selector in header
- [ ] Switch between hubs (Chicago → National)
- [ ] Verify Hub Central Dashboard updates correctly
- [ ] Check publication counts change per hub
- [ ] Navigate to Packages page
- [ ] Verify packages filter by selected hub
- [ ] Test publication inventory editing
- [ ] Verify hub pricing dropdown only shows assigned hubs

#### Data Integrity
- [ ] No console errors related to hubs
- [ ] API calls return expected data
- [ ] Hub selection persists on page refresh
- [ ] No 404 or 500 errors

---

## Rollback (If Needed)

If anything goes wrong:

### Option 1: Restore Database Backup
```bash
# In MongoDB Atlas:
# 1. Go to Backups
# 2. Select "pre-hub-migration" snapshot
# 3. Click Restore
```
- [ ] Backup restored
- [ ] Database verified

### Option 2: Revert Code
```bash
git revert <commit-hash>
git push origin main
npm run deploy
```
- [ ] Code reverted
- [ ] Previous version deployed

---

## Success Criteria

All must be checked:

- [ ] ✅ Production database has `hubs` collection with 6 hubs
- [ ] ✅ Publications have `hubIds` array populated
- [ ] ✅ Packages have `hubInfo.hubId` set
- [ ] ✅ Application loads without errors
- [ ] ✅ Hub selector works and persists
- [ ] ✅ Hub Central Dashboard filters correctly
- [ ] ✅ Packages page filters by hub
- [ ] ✅ Admin can manage hubs
- [ ] ✅ No console errors
- [ ] ✅ No degraded performance

---

## Quick Reference

### Important Commands
```bash
# Verify production readiness
MONGODB_DB_NAME=chicago-hub npm run verify:production

# Dry run migration (safe, no changes)
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs:dry-run

# Run migration (applies changes)
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs

# Deploy application
npm run deploy
```

### Database Names
- **Staging:** `staging-chicago-hub` (already migrated ✅)
- **Production:** `chicago-hub` (needs migration ⏳)

### Migration is Idempotent
- Safe to run multiple times
- Won't duplicate hubs
- Won't overwrite existing data
- Only adds/updates missing data

---

## Notes

**Estimated Time:** 45-60 minutes  
**Downtime Required:** None (database migration can run while app is live)

**Issues?** See `/docs/HUB_PRODUCTION_DEPLOYMENT.md` for detailed troubleshooting.

---

**Deployment Completed:** _______________  
**All Checks Passed:** [ ] Yes / [ ] No  
**Rollback Required:** [ ] Yes / [ ] No  

**Signature:** _______________

