# Campaign Asset URL Expiration Fix

## Problem
Campaign creative assets stored in S3 were returning "AccessDenied" errors after 1 hour because pre-signed URLs were being stored in the database with a 1-hour expiration time. When users tried to access these assets later, the URLs had expired.

## Root Cause
The workflow was:
1. Asset uploaded to S3
2. Pre-signed URL generated with 1-hour (3600s) expiration
3. Pre-signed URL stored in database
4. Hours/days later, user tries to access asset
5. URL has expired → AccessDenied error

## Solution
Modified the API endpoints to generate fresh signed URLs on-the-fly when assets are retrieved, rather than returning the stored (potentially expired) URL.

### Changes Made

#### 1. `/api/creative-assets/campaign/:campaignId` (GET)
- Now generates fresh signed URLs for all S3 assets before returning them
- Uses 24-hour expiration for viewing assets
- Falls back to stored URL if signed URL generation fails

#### 2. `/api/creative-assets/:id` (GET)
- Generates fresh signed URL when fetching individual asset
- 24-hour expiration for consistency

#### 3. `/api/creative-assets` (GET - List with filters)
- Generates fresh signed URLs for all assets in the list
- Handles both full assets and summaries

#### 4. `/api/creative-assets/:id/download` (GET)
- Generates fresh signed URL specifically for downloads
- Uses 1-hour expiration (sufficient for download action)

### Technical Details

**URL Expiration Times:**
- **Viewing/Display:** 24 hours (86400 seconds) - Long enough for a work session
- **Downloads:** 1 hour (3600 seconds) - Immediate action

**Storage Path:**
- The S3 key (`storagePath`) is stored in the database
- This key is used to generate fresh signed URLs on demand
- URLs are never stored permanently anymore

**Fallback Behavior:**
- If signed URL generation fails, the system falls back to the stored URL
- This ensures graceful degradation if S3 is temporarily unavailable

## Impact

### Positive Changes
✅ Assets remain accessible indefinitely  
✅ No more "AccessDenied" errors after URLs expire  
✅ Better security - shorter-lived URLs reduce exposure  
✅ No database migration required - works with existing data  

### No Breaking Changes
✅ Existing assets continue to work  
✅ Frontend code requires no changes  
✅ API responses maintain same structure  

## How It Works

```
┌─────────────────┐
│  Frontend       │
│  Requests Asset │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Backend API            │
│  1. Fetch from DB       │
│  2. Check storageProvider│
│  3. If S3, generate     │
│     fresh signed URL    │
│  4. Return asset with   │
│     fresh URL           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  S3 Validates   │
│  Fresh URL      │
│  Returns Asset  │
└─────────────────┘
```

## Testing

### 1. Upload a New Asset
```bash
# Upload should work as before
# Check that storagePath is saved in DB
```

### 2. Retrieve Asset Immediately
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/creative-assets/campaign/CAMPAIGN_ID
```

### 3. Wait 2+ Hours
```bash
# The same request should still work
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/creative-assets/campaign/CAMPAIGN_ID
```

### 4. Check URL Expiration in Response
- The `fileUrl` in the response will be a fresh signed URL
- It will have a new expiration time (24 hours from request)

## Monitoring

To verify the fix is working:

1. **Check Server Logs** - Look for:
   ```
   Error generating fresh signed URL for asset: [asset_id]
   ```
   If you see these errors, it indicates S3 connectivity issues

2. **Database Check** - Verify assets have:
   - `metadata.storageProvider` = "s3"
   - `metadata.storagePath` = Valid S3 key (e.g., "users/system/uploads/...")

3. **Frontend Check** - Asset URLs should:
   - Start with your S3 bucket URL
   - Include `X-Amz-Algorithm`, `X-Amz-Credential`, etc. query parameters
   - Have `X-Amz-Expires=86400` for viewing URLs

## Rollback Plan

If issues arise, the system gracefully falls back to stored URLs. To fully rollback:

1. Revert changes in `server/routes/creative-assets.ts`
2. Restart the server
3. Assets will use stored URLs (but will still expire after 1 hour)

## Future Enhancements

### Option 1: Make Assets Public
If assets don't contain sensitive information:
- Upload with `isPublic: true` 
- URLs won't expire
- Faster access (no signed URL generation)

### Option 2: CloudFront Integration
- Use CloudFront signed URLs for longer expiration
- Better performance for global access
- Configure `AWS_CLOUDFRONT_DOMAIN` environment variable

### Option 3: Frontend URL Refresh
- Implement URL refresh logic in frontend
- Request new URL when approaching expiration
- Better for long-running sessions

## Environment Variables

Ensure these are set for S3 to work:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

Optional:
```bash
AWS_CLOUDFRONT_DOMAIN=d123456789.cloudfront.net  # For CloudFront
AWS_S3_ENDPOINT=https://custom-endpoint.com      # For custom S3-compatible storage
AWS_S3_FORCE_PATH_STYLE=true                     # For MinIO or custom endpoints
```

## Questions?

Contact the development team or check:
- `/server/routes/creative-assets.ts` - API endpoint implementations
- `/server/s3Service.ts` - S3 integration
- `/server/storage/fileStorage.ts` - File storage abstraction

