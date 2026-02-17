# Fix: analytics-ad-aggregator Lambda — Duplicate Entries & Test Data

**Date:** February 17, 2026  
**Priority:** High  
**Lambda Function:** `analytics-ad-aggregator`  
**Database:** `chicago-hub` (production)  
**Collection:** `performance_entries`

---

## Problem Summary

Three issues discovered in the `analytics-ad-aggregator` Lambda:

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Lambda inserts new docs instead of upserting** | 223 duplicate entries; duplicates created every 2-hour run |
| 2 | **No filtering of test/invalid orderIds** | 154 junk entries from dev pixel testing polluting production data |
| 3 | **No unique compound index on the collection** | Nothing prevents duplicates at the database level |

### Evidence

- **319 total automated entries**, but only **96 unique** (by upsert key)
- **223 excess duplicates** across 4 publications
- **154 test entries** with fake orderIds (`"test"`, `"test123"`, `"xxx"`, `"order_123"`) — none have real orders
- Lambda runs every **2 hours**; duplicate entries are spaced exactly 2h apart
- Affected publications: Windy City Times (ID: 3011), plus IDs 101, 4001, 1065

---

## Fix 1: Use `updateOne` with `upsert: true` (Not `insertOne`)

The Lambda currently creates a **new document every run**. It must use MongoDB `bulkWrite` with `updateOne` + `upsert: true` so that repeated runs update existing entries instead of duplicating them.

### File to Edit

`lambda/analytics-ad-aggregator/index.js` (or equivalent)

### Current Code (BROKEN)

Look for where Athena rows are written to MongoDB. It likely uses `insertOne`, `insertMany`, or a `bulkWrite` with an `insertOne` operation:

```javascript
// BROKEN: Creates a new document every single run
const operations = rows.map(row => ({
  insertOne: {
    document: {
      orderId: row.order_id,
      itemPath: `tracking-${row.channel || 'display'}`,
      itemName: row.creative_id,
      dateStart: new Date(row.date),
      source: 'automated',
      // ... metrics
    }
  }
}));

await collection.bulkWrite(operations);
```

### Fixed Code

Replace with `updateOne` + `upsert: true`. The **filter** must include all fields that uniquely identify an entry. The **$set** updates the metrics to the latest values:

```javascript
const operations = rows.map(row => {
  const ctr = row.impressions > 0
    ? Math.round((row.clicks / row.impressions) * 10000) / 100
    : 0;

  return {
    updateOne: {
      filter: {
        orderId: row.order_id,
        itemPath: `tracking-${row.channel || 'display'}`,
        itemName: row.creative_id,
        dateStart: new Date(row.date),
        source: 'automated'
      },
      update: {
        $set: {
          campaignId: row.campaign_id,
          publicationId: row.publication_id,
          publicationName: row.publication_name,
          channel: row.channel || 'website',
          metrics: {
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            ctr: ctr,
            viewability: row.viewable_impressions && row.impressions
              ? Math.round((row.viewable_impressions / row.impressions) * 100)
              : undefined,
            reach: row.unique_ips || 0,
          },
          validationStatus: 'valid',  // Lambda-validated entry
          enteredBy: 'lambda-tracking-sync',
          enteredAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      upsert: true
    }
  };
});

await collection.bulkWrite(operations, { ordered: false });
```

### Key Points

- **`filter`** = the upsert key. Must include: `orderId`, `itemPath`, `itemName`, `dateStart`, `source`
- **`$set`** = updates metrics every run (latest Athena data wins)
- **`$setOnInsert`** = only sets `createdAt` on first insert
- **`upsert: true`** = creates if not found, updates if found
- **`ordered: false`** = continues processing if one row fails

---

## Fix 2: Filter Out Test / Invalid Data

The Lambda processes ALL rows from Athena, including test pixels with fake orderIds. Add validation before processing:

### Add This Validation Before the bulkWrite Loop

```javascript
// Valid MongoDB ObjectId: 24-character hex string
const VALID_ORDER_ID = /^[a-f0-9]{24}$/;

// Helper to determine validation status for each row
function getValidationStatus(row) {
  if (!row.order_id || !VALID_ORDER_ID.test(row.order_id)) {
    return 'invalid_orderId';
  }
  return 'valid';
}

// Filter out completely empty rows, but keep invalid ones tagged
const processableRows = rows.filter(row => {
  // Skip rows with 0 impressions AND 0 clicks (no real data)
  if ((!row.impressions || row.impressions === 0) && (!row.clicks || row.clicks === 0)) {
    return false;
  }
  return true;
});

console.log(JSON.stringify({
  level: 'info',
  message: `Processing rows: ${rows.length} total, ${processableRows.length} with data`,
}));

// Use processableRows for the bulkWrite, with validationStatus set per row
// In the updateOne $set block, use:
//   validationStatus: getValidationStatus(row),
```

---

## Fix 3: Create Unique Compound Index

After deploying the Lambda fixes and cleaning up existing duplicates, create a unique index to prevent this at the database level.

### Run in MongoDB Shell (mongosh) or Compass

```javascript
db.performance_entries.createIndex(
  {
    orderId: 1,
    itemPath: 1,
    itemName: 1,
    dateStart: 1,
    source: 1
  },
  {
    unique: true,
    name: "upsert_key_unique"
  }
);
```

### Or via AWS Lambda / Script

```javascript
await db.collection('performance_entries').createIndex(
  { orderId: 1, itemPath: 1, itemName: 1, dateStart: 1, source: 1 },
  { unique: true, name: 'upsert_key_unique' }
);
```

> **Important:** You must clean up existing duplicates BEFORE creating the unique index, or the index creation will fail with error code 11000.

---

## Cleanup: Existing Duplicate & Test Data

After deploying the Lambda fix, run the cleanup script in the `chicago-hub` project:

```bash
# Preview what will be cleaned (no changes made)
npx tsx scripts/cleanupDuplicatePerformanceEntries.ts --dry-run

# Execute the cleanup
npx tsx scripts/cleanupDuplicatePerformanceEntries.ts
```

### What the cleanup does:

| Step | Action | Count |
|------|--------|-------|
| 1 | Delete test entries (`orderId` = "test", "test123", "xxx", "order_123") | ~154 entries |
| 2 | Deduplicate automated entries (keep newest per upsert key) | ~78 excess entries |
| 3 | Create unique compound index | 1 index |

**Total removed:** ~231 junk/duplicate entries  
**Remaining after cleanup:** ~88 valid entries

### Manual cleanup alternative (mongosh)

```javascript
// Step 1: Remove test data
db.performance_entries.deleteMany({
  orderId: { $in: ["test", "test123", "xxx", "order_123"] }
});

// Step 2: Find and remove duplicates (keep the one with highest impressions)
// For each duplicate group, delete all but the best entry
const pipeline = [
  { $match: { source: "automated", deletedAt: { $exists: false } } },
  { $group: {
    _id: { orderId: "$orderId", itemPath: "$itemPath", itemName: "$itemName", dateStart: "$dateStart", source: "$source" },
    count: { $sum: 1 },
    docs: { $push: { id: "$_id", impressions: "$metrics.impressions", enteredAt: "$enteredAt" } }
  }},
  { $match: { count: { $gt: 1 } } }
];

db.performance_entries.aggregate(pipeline).forEach(group => {
  // Sort: highest impressions first, then newest
  const sorted = group.docs.sort((a, b) =>
    (b.impressions || 0) - (a.impressions || 0) || 
    new Date(b.enteredAt) - new Date(a.enteredAt)
  );
  // Delete all except the first (best)
  const idsToDelete = sorted.slice(1).map(d => d.id);
  db.performance_entries.deleteMany({ _id: { $in: idsToDelete } });
});

// Step 3: Create unique index (after cleanup)
db.performance_entries.createIndex(
  { orderId: 1, itemPath: 1, itemName: 1, dateStart: 1, source: 1 },
  { unique: true, name: "upsert_key_unique" }
);
```

---

## Deploy Steps

1. **Edit** `analytics-ad-aggregator` Lambda code (Fix 1 + Fix 2)
2. **Test** with dry run:
   ```bash
   aws lambda invoke \
     --function-name analytics-ad-aggregator \
     --cli-binary-format raw-in-base64-out \
     --payload '{"date":"2026-02-16","dryRun":true}' \
     --profile "Connection 1" \
     response.json
   
   cat response.json
   ```
3. **Deploy** live:
   ```bash
   aws lambda invoke \
     --function-name analytics-ad-aggregator \
     --cli-binary-format raw-in-base64-out \
     --payload '{"date":"2026-02-16","dryRun":false}' \
     --profile "Connection 1" \
     response.json
   ```
4. **Verify** no new duplicates after 2-3 Lambda runs (4-6 hours)
5. **Run cleanup** in `chicago-hub` project to remove existing duplicates
6. **Create index** after cleanup is confirmed

---

## Verification

After deploying, wait for 2-3 Lambda cycles (4-6 hours), then run:

```bash
# In the chicago-hub project
npx tsx scripts/checkAllPubDuplicates.ts
```

Expected output:
- `Duplicate groups: 0`
- `Excess duplicates: 0`
- Unique compound index present

---

## Root Cause Recap

```
CloudFront Logs → Athena (daily_aggregates) → Lambda (every 2h) → MongoDB

The Lambda queries Athena and gets the same rows every run.
With insertOne: each run creates NEW documents → duplicates pile up.
With updateOne + upsert: each run UPDATES existing documents → clean data.

Test pixel URLs with orderIds like "test" and "xxx" are also in CloudFront
logs, so Athena returns them alongside real data. The Lambda needs to
validate orderIds before writing to MongoDB.
```

---

**Created:** February 17, 2026  
**Status:** Ready to implement  
**Estimated fix time:** 15-30 minutes  
