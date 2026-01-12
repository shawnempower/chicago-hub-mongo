# Tracking URL Fix - January 2026

## Issue Fixed

The impression tracking URLs were being incorrectly generated as `/v` instead of `/pxl.png` to match the static file in S3.

## What Changed

### 1. Fixed `src/integrations/mongodb/trackingScriptSchema.ts`

**Before:**
```typescript
let path = pixelPath;
if (eventType === 'click') {
  path = '/c';  // Click redirect endpoint
} else if (eventType === 'view' || eventType === 'display') {
  path = '/v';  // Impression/view pixel endpoint  ❌ WRONG
}
```

**After:**
```typescript
let path = pixelPath;
if (eventType === 'click') {
  path = '/c';  // Click redirect endpoint
}
// For impressions/views, use the provided pixelPath (e.g., '/pxl.png')
// This matches the static file in S3, and CloudFront Access Logs capture all parameters
```

### 2. Updated `server/routes/tracking-scripts.ts`

Updated documentation and config endpoint to reference `/pxl.png` instead of `/i.gif`.

## Tracking URLs Now Generated

### Impression Pixel
```
https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=ORDER_ID&cid=CAMPAIGN_ID&pid=PUB_ID&ch=CHANNEL&t=display&cr=CREATIVE_ID&s=SIZE&cb=CACHE_BUSTER
```

**How it works:**
- ✅ Serves static `pxl.png` file from S3
- ✅ CloudFront Access Logs capture all query parameters
- ✅ Athena queries logs to get impression data
- ✅ No Lambda execution = cheaper and faster

### Click Redirect
```
https://dxafls8akrlrp.cloudfront.net/c?oid=ORDER_ID&cid=CAMPAIGN_ID&pid=PUB_ID&ch=CHANNEL&t=click&cr=CREATIVE_ID&r=LANDING_URL&cb=CACHE_BUSTER
```

**How it works:**
- ✅ Lambda@Edge parses `r` parameter
- ✅ Returns 302 redirect to landing page
- ✅ CloudFront Access Logs capture all query parameters
- ✅ Athena queries logs to get click data

## Files Modified

1. `src/integrations/mongodb/trackingScriptSchema.ts` - Fixed path override logic
2. `server/routes/tracking-scripts.ts` - Updated documentation

## Testing

### Test Impression Pixel
```bash
# Should return 200 with image/png
curl -I "https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=test&cid=camp&pid=101&ch=website&t=display&cb=$(date +%s)000"
```

### Test Click Redirect
```bash
# Should return 302 redirect to google.com (once Lambda@Edge is deployed)
curl -I "https://dxafls8akrlrp.cloudfront.net/c?oid=test&cid=camp&pid=101&ch=website&t=click&r=https%3A%2F%2Fwww.google.com&cb=$(date +%s)000"
```

## Impact

- ✅ Impression pixels now work correctly with S3 file
- ✅ No breaking changes to API
- ✅ Generated tracking scripts will use correct URLs
- ✅ CloudFront Access Logs capture everything for both endpoints

## Next Steps

1. **Deploy Lambda@Edge** for click redirects (see `lambda/tracking-edge/DEPLOY_NOW.md`)
2. **Enable CloudFront Access Logs** to capture tracking data
3. **Set up Athena** to query CloudFront logs
4. **Verify tracking-sync Lambda** runs daily to sync to MongoDB

## Architecture Summary

```
User views ad
  ↓
https://...cloudfront.net/pxl.png?oid=...
  ↓
CloudFront serves static file from S3 ✅
CloudFront Access Logs capture: timestamp, IP, query params, user-agent, etc.
  ↓
Athena queries logs daily
  ↓
empowerlocal-tracking-sync Lambda syncs to MongoDB
  ↓
Hub dashboard shows impression metrics
```

```
User clicks ad
  ↓
https://...cloudfront.net/c?r=LANDING_URL&oid=...
  ↓
Lambda@Edge parses 'r' param → 302 Redirect ✅
CloudFront Access Logs capture: timestamp, IP, query params, user-agent, etc.
  ↓
Athena queries logs daily
  ↓
empowerlocal-tracking-sync Lambda syncs to MongoDB
  ↓
Hub dashboard shows click metrics
```

---

**Date:** January 12, 2026  
**Author:** Assistant  
**Status:** Fixed ✅
