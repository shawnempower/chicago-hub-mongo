# Lambda Fix: Impression Tracking Issue

## Problem

Impressions are showing as 0 in the database even though they are correctly captured in CloudFront logs and Athena.

**Root Cause:** When multiple creatives exist for the same order on the same date, the Lambda's upsert filter doesn't uniquely identify each creative. The last upsert overwrites previous ones, causing data loss.

---

## Solution

Add `itemName` to the upsert filter to uniquely identify each creative's performance entry.

---

## Code Changes

### File to Edit
`lambda/analytics-ad-aggregator/index.js` (or your Lambda function file)

### Find This Code (around line 136):

```javascript
const operation = {
  updateOne: {
    filter: {
      orderId: row.order_id,
      itemPath: `tracking-${row.channel || 'display'}`,
      dateStart: new Date(row.date),
      source: 'automated'
    },
```

### Change It To:

```javascript
const operation = {
  updateOne: {
    filter: {
      orderId: row.order_id,
      itemPath: `tracking-${row.channel || 'display'}`,
      itemName: row.creative_id,  // ADD THIS LINE
      dateStart: new Date(row.date),
      source: 'automated'
    },
```

**That's it!** Just add one line: `itemName: row.creative_id,`

---

## What This Does

- **Before:** All creatives for an order write to the same document → overwrites
- **After:** Each creative gets its own document → no data loss

**Example:**
```
Before (1 document):
{
  orderId: "abc123",
  itemName: "cr_test_001",  // Last creative wins
  impressions: 0,            // Data from earlier creatives lost
  clicks: 2
}

After (2 documents):
{
  orderId: "abc123",
  itemName: "cr_test_001",
  impressions: 5,
  clicks: 2
},
{
  orderId: "abc123",
  itemName: "asset-xyz",
  impressions: 5,
  clicks: 2
}
```

---

## Deploy Steps

1. **Edit the Lambda function code** in AWS Console or your local file
2. **Add the one line:** `itemName: row.creative_id,` to the filter
3. **Save and deploy** the Lambda function
4. **Test:** Run the Lambda manually:
   ```bash
   aws lambda invoke \
     --function-name analytics-ad-aggregator \
     --payload '{"date":"2026-01-13","dryRun":false}' \
     --profile "Connection 1" \
     response.json
   ```
5. **Verify:** Check the database - impressions should now be correct

---

## Testing

After deploying, fire test pixels again:
```bash
bash scripts/firePixels.sh
```

Wait 5-15 minutes, then trigger Lambda:
```bash
aws lambda invoke \
  --function-name analytics-ad-aggregator \
  --cli-binary-format raw-in-base64-out \
  --payload '{"date":"2026-01-13","dryRun":false}' \
  --profile "Connection 1" \
  response.json
```

Check database:
```bash
npx tsx scripts/checkPerformanceEntries.ts
```

You should see **impressions > 0** now! ✅

---

## Summary

**Change:** Add 1 line to the upsert filter  
**Line to add:** `itemName: row.creative_id,`  
**Result:** Impressions track correctly, no more overwrites  
**Deploy time:** ~5 minutes  

---

**Created:** January 13, 2026  
**Status:** Ready to implement
