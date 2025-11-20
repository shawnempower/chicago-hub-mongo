# Production Deployment: Reach Calculation & Audience Display

## Overview

This deployment includes:
1. **Reach calculation system** - Total and unique reach with exposures
2. **Audience metrics display** - Shows audience data in packages and insertion orders
3. **Data migration** - Fixes "flat" → "monthly" pricing for website inventory
4. **Backend API updates** - Enhanced package builder with reach metrics

## Pre-Deployment Checklist

### ✅ Code Review
- [ ] All changes reviewed and tested locally
- [ ] No linter errors
- [ ] TypeScript compilation successful
- [ ] Backend API tested with Postman/curl
- [ ] Frontend UI tested in browser

### ✅ Database Backup
```bash
# Create backup before migration
mongodump --uri="$MONGODB_URI" --out=./backups/pre-reach-deployment-$(date +%Y%m%d-%H%M%S)
```

### ✅ Files to Deploy

**Backend:**
- `server/routes/builder.ts` (reach calculation)
- Backend restart required

**Frontend:**
- `src/utils/reachCalculations.ts` (NEW)
- `src/utils/insertionOrderFormatting.ts` (UPDATED)
- `src/services/packageBuilderService.ts` (UPDATED - types)
- `src/integrations/mongodb/hubPackageSchema.ts` (UPDATED - types)
- `src/components/admin/PackageBuilder/ReachSummary.tsx` (NEW)
- `src/components/admin/PackageBuilder/PackageResults.tsx` (UPDATED)
- `src/components/admin/PackageBuilder/LineItemsTable.tsx` (UPDATED)
- `src/components/admin/PackageBuilder/LineItemEditor.tsx` (UPDATED)
- `src/components/admin/PackageBuilder/LineItemsDetail.tsx` (UPDATED)

**Migration Script:**
- `scripts/migrateFlatToMonthly.ts`

---

## Deployment Steps

### Step 1: Deploy Backend

```bash
# Navigate to project
cd /Users/shawnchapman/Documents/sites/empowerlocal-all/chicago-hub

# Ensure latest code is committed
git status

# Build if needed (depends on your deployment process)
npm run build

# Deploy backend (your deployment method)
# Example: PM2
pm2 restart chicago-hub-backend

# OR Docker
docker-compose restart backend

# OR your deployment script
./deployment/deploy-backend-production.sh
```

**Verify Backend:**
```bash
# Test the analyze endpoint
curl -X POST https://your-production-api.com/admin/builder/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hubId": "YOUR_HUB_ID",
    "mode": "specification-first",
    "duration": 6,
    "channels": ["website"],
    "publications": [PUBLICATION_ID],
    "frequencyStrategy": "standard"
  }'

# Should return summary with reach metrics:
# - totalMonthlyImpressions
# - totalMonthlyExposures
# - estimatedTotalReach
# - estimatedUniqueReach
# - channelAudiences
```

---

### Step 2: Run Data Migration

**IMPORTANT:** Run migration AFTER backend deployment but BEFORE frontend deployment.

#### Dry Run First (Recommended)
```bash
# Connect to production database with dry-run flag
NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --dry-run
```

**Review the output:**
- How many publications will be updated?
- Which channels are affected?
- Are the changes correct?

#### Run Migration
```bash
# Run actual migration
NODE_OPTIONS="--require dotenv/config" npx tsx scripts/migrateFlatToMonthly.ts --no-dry-run
```

**Expected Results:**
```
✅ MIGRATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Final Statistics:
  Publications Scanned: 150
  Publications Updated: 45
  Total Records Changed: 89

📈 Changes by Channel:
  website:    67 records
  print:      12 records
  newsletter: 8 records
  podcast:    2 records
```

#### Verify Migration
```bash
# Query to verify changes
mongo "YOUR_MONGODB_URI" --eval '
  db.publications.aggregate([
    { $unwind: "$distributionChannels.website.advertisingOpportunities" },
    { $match: { 
      "distributionChannels.website.advertisingOpportunities.hubPricing.pricing.pricingModel": "flat" 
    }},
    { $count: "flatWebsiteAds" }
  ])
'

# Should return 0 or very few (only events should have "flat")
```

---

### Step 3: Deploy Frontend

```bash
# Build frontend
npm run build

# Deploy frontend (your deployment method)
# Example: AWS S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# OR Netlify
netlify deploy --prod

# OR your deployment script
./deployment/deploy-frontend-production.sh
```

---

### Step 4: Clear Cache (if applicable)

```bash
# CloudFront invalidation (if using AWS)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

# Or your CDN cache clear command
```

---

## Post-Deployment Verification

### ✅ Test Package Builder

1. **Navigate to Package Builder**
   - Go to `/admin/packages` (or your admin route)
   - Click "Build New Package"

2. **Select Publications**
   - Choose Evanston Now + others
   - Select Website channel

3. **Build Package**
   - Click "Analyze" or "Build Package"

4. **Verify Reach Display**
   ```
   Should see:
   ┌─────────────────────────────────────┐
   │  Estimated Reach                    │
   ├─────────────────────────────────────┤
   │  ~79.2K                             │
   │  Unique Monthly Reach (People)      │
   │                                     │
   │  120K                               │
   │  Total Monthly Exposures            │
   │                                     │
   │  By Channel:                        │
   │  Website: 112,942                   │
   │  Newsletter: 19,000                 │
   └─────────────────────────────────────┘
   ```

5. **Test Frequency Adjustment**
   - Change newsletter from 4 sends to 8 sends
   - **Unique Reach should stay same**
   - **Total Exposures should increase**

6. **Test Exclude Items**
   - Exclude a newsletter item
   - **Reach should recalculate and decrease**

### ✅ Test Insertion Order

1. **Generate Insertion Order**
   - Enter package name
   - Click "Generate Insertion Order"

2. **Verify Reach Section**
   ```html
   Should include:
   - Unique Monthly Reach: ~79,165 people
   - Total Monthly Exposures: 120,000
   - Average Frequency: 1.5x per person
   - Methodology explanation
   ```

### ✅ Test Data Migration Results

1. **Check Website Inventory**
   - Go to publication inventory editor
   - Select any publication with website ads
   - Check pricing model dropdown

2. **Verify:**
   - Website ads show "monthly" (not "flat")
   - Events still show "flat" (correct)
   - Pricing amounts unchanged

### ✅ Monitor Logs

```bash
# Backend logs
pm2 logs chicago-hub-backend

# OR Docker logs
docker logs -f backend-container

# Look for:
# - No errors in /admin/builder/analyze endpoint
# - Successful reach calculations
# - No MongoDB errors
```

---

## Rollback Plan

If issues occur, follow these steps:

### 1. Rollback Frontend
```bash
# Redeploy previous version
git checkout PREVIOUS_COMMIT
npm run build
./deployment/deploy-frontend-production.sh
```

### 2. Rollback Backend
```bash
# Restart with previous code
git checkout PREVIOUS_COMMIT
pm2 restart chicago-hub-backend
```

### 3. Rollback Database (if needed)
```bash
# Restore from backup
mongorestore --uri="$MONGODB_URI" \
  --dir=./backups/pre-reach-deployment-TIMESTAMP \
  --drop
```

---

## Troubleshooting

### Issue: Reach shows "0" or undefined

**Cause:** `audienceMetrics` not being passed from backend

**Fix:**
1. Check backend logs for errors
2. Verify MongoDB has `metrics` data on publications
3. Test API endpoint directly

**Query to check data:**
```javascript
db.publications.findOne(
  { publicationId: YOUR_PUB_ID },
  { 
    "distributionChannels.website.metrics": 1,
    "distributionChannels.website.advertisingOpportunities.performanceMetrics": 1 
  }
)
```

### Issue: "Contact for reach details" still showing

**Cause:** Migration didn't run or items missing `audienceMetrics`

**Fix:**
1. Verify migration completed
2. Check if `monthlyVisitors` exists on publications
3. Rebuild package (new packages get fresh data)

### Issue: Frequency changes don't update exposures

**Cause:** Frontend not recalculating reach

**Fix:**
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
3. Verify latest frontend deployed

### Issue: Backend 500 errors on /analyze

**Cause:** Backend calculation error

**Fix:**
1. Check backend logs for stack trace
2. Verify `calculatePackageReach` function exists
3. Check if all required fields present

---

## Performance Notes

- **Reach calculation** adds ~5-10ms to package building
- **No impact** on existing packages (only new builds)
- **Database queries** unchanged (same data already fetched)
- **Browser rendering** minimal impact (one extra card)

---

## Communication

### User-Facing Announcement

```
🎉 New Feature: Package Reach Estimation

We've added intelligent reach calculation to the package builder!

What's New:
✅ See estimated unique reach for your packages
✅ Track total exposures with frequency
✅ View audience breakdown by channel
✅ Automatic inclusion in insertion orders

The system accounts for audience overlap across channels 
to provide realistic reach estimates.

Questions? Contact support@chicago-hub.com
```

### Internal Notes

- Migration completed on: [DATE]
- Publications affected: [NUMBER]
- Rollback available until: [DATE + 30 days]
- Backup location: `backups/pre-reach-deployment-[TIMESTAMP]`

---

## Success Criteria

- [ ] Backend deployed successfully
- [ ] Data migration completed (0 flat website ads)
- [ ] Frontend deployed successfully
- [ ] Reach displays in package builder
- [ ] Reach updates dynamically with frequency changes
- [ ] Insertion orders include reach section
- [ ] No errors in logs for 24 hours
- [ ] Positive user feedback

---

## Next Steps (Future Enhancements)

1. **Geographic Intelligence** - Apply different overlap factors by geography
2. **Historical Tracking** - Learn actual overlap from campaign performance
3. **Advertiser Targeting** - Adjust reach based on demographic targeting
4. **Admin Controls** - Allow admins to customize overlap factors per hub
5. **Reach Forecasting** - Predict reach growth over time

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Verified By:** _____________

**Notes:** 
_____________________________________________
_____________________________________________
_____________________________________________

