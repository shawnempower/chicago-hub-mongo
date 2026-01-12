# Simplified Tracking Setup

## Current Architecture ✅

Your tracking system uses **CloudFront Access Logs → Athena → MongoDB**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Ad Click                                                      │
│    https://dxafls8akrlrp.cloudfront.net/c?oid=...&r=LANDING_URL │
│                           ↓                                      │
│    Lambda@Edge: Parse 'r' param → 302 Redirect                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 2. Ad Impression                                                │
│    https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=...&cid=... │
│                           ↓                                      │
│    CloudFront serves pxl.png from S3 (static file)              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 3. CloudFront Access Logs (BOTH clicks + impressions)          │
│    → S3 bucket with ALL request details                         │
│    → Includes: timestamp, IP, user-agent, referer, query params │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 4. Athena                                                       │
│    → Queries CloudFront logs from S3                            │
│    → Parses query parameters (oid, cid, pid, cr, etc.)         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 5. empowerlocal-tracking-sync Lambda                            │
│    → Runs daily at 6 AM UTC                                     │
│    → Syncs Athena aggregates to MongoDB performance_entries     │
└─────────────────────────────────────────────────────────────────┘
```

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| S3 pixel file | ✅ Exists | `s3://empowerlocal-pixels-ads/pxl.png` |
| CloudFront distribution | ✅ Active | `dxafls8akrlrp.cloudfront.net` |
| Lambda@Edge for /c | ⚠️ Not deployed | Needed for click redirects |
| CloudFront Access Logs | ❌ Disabled | Need to enable |
| Athena database | ❓ Unknown | `ad_tracking` database |
| Tracking sync Lambda | ❓ Unknown | `empowerlocal-tracking-sync` |

## What You Need to Deploy

### 1. Lambda@Edge (Click Redirects Only)

The simplified `index.js` now ONLY handles `/c` endpoint for click redirects. Impression pixels are served from S3.

**Deploy it:**
```bash
cd lambda/tracking-edge

# Create IAM role (first time only)
aws iam create-role \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --assume-role-policy-document file://lambda-edge-role.json

aws iam attach-role-policy \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create Lambda function
zip -r function.zip index.js

aws lambda create-function \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge \
  --runtime nodejs20.x \
  --role arn:aws:iam::947442015939:role/lambda-edge-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 5 \
  --memory-size 128 \
  --publish
```

Save the version ARN from output (e.g., `arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1`)

### 2. Enable CloudFront Access Logs

You need a separate S3 bucket for logs:

```bash
# Create logs bucket (if doesn't exist)
aws s3 mb s3://empowerlocal-cloudfront-logs --profile "Connection 1"

# Get current CloudFront config
aws cloudfront get-distribution-config \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --output json > cloudfront-config.json

# Save ETag
export ETAG=$(jq -r '.ETag' cloudfront-config.json)

# Extract DistributionConfig
jq '.DistributionConfig' cloudfront-config.json > distribution-config.json
```

**Edit `distribution-config.json`:**

Add logging configuration:
```json
{
  "DistributionConfig": {
    "Logging": {
      "Enabled": true,
      "IncludeCookies": false,
      "Bucket": "empowerlocal-cloudfront-logs.s3.amazonaws.com",
      "Prefix": "tracking/"
    },
    "DefaultCacheBehavior": {
      "LambdaFunctionAssociations": {
        "Quantity": 1,
        "Items": [
          {
            "LambdaFunctionARN": "arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1",
            "EventType": "viewer-request",
            "IncludeBody": false
          }
        ]
      }
    }
  }
}
```

**Apply the update:**
```bash
aws cloudfront update-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --distribution-config file://distribution-config.json \
  --if-match $ETAG
```

### 3. Set Up Athena (If Not Already Done)

```bash
# Create Athena database
aws athena start-query-execution \
  --profile "Connection 1" \
  --query-string "CREATE DATABASE IF NOT EXISTS ad_tracking;" \
  --result-configuration "OutputLocation=s3://empowerlocal-cloudfront-logs/athena-results/"
```

Then create the CloudFront logs table - see `docs/ATHENA_TRACKING_QUERIES.md`

### 4. Verify Tracking Sync Lambda Exists

```bash
aws lambda get-function \
  --profile "Connection 1" \
  --function-name empowerlocal-tracking-sync
```

If it doesn't exist, you'll need to create it - see `docs/LAMBDA_TRACKING_SYNC_SPEC.md`

## Testing

### Test Click Redirect
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/c?oid=test&cid=camp&pid=101&ch=website&t=click&r=https%3A%2F%2Fwww.google.com"
```

**Expected:** HTTP 302 redirect to google.com

### Test Impression Pixel (Already Works)
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=test&cid=camp&pid=101&ch=website&t=display"
```

**Expected:** HTTP 200 with Content-Type: image/png

### Verify CloudFront Logs
Wait 15-60 minutes after enabling, then check:
```bash
aws s3 ls s3://empowerlocal-cloudfront-logs/tracking/ --profile "Connection 1"
```

You should see `.gz` files with CloudFront access logs.

## Query Logs with Athena

Once logs are flowing:

```sql
-- Test query
SELECT 
  date,
  cs_uri_stem,
  cs_uri_query,
  c_ip
FROM ad_tracking.cloudfront_logs
WHERE date = current_date
LIMIT 10;
```

## Cost Estimate

| Service | Cost |
|---------|------|
| Lambda@Edge (clicks only, ~10K/day) | ~$0.60/month |
| CloudFront Access Logs | ~$5-10/month |
| S3 storage (logs) | ~$1-5/month |
| Athena queries | ~$5-10/month |
| **Total** | **~$15-25/month** |

Much cheaper than before since we're not using Lambda@Edge for impressions!

## Benefits of This Architecture

✅ **Simple** - Impression pixels are just static files  
✅ **Cheap** - Lambda only runs on clicks (much less frequent than impressions)  
✅ **Reliable** - CloudFront logs capture everything automatically  
✅ **Scalable** - CloudFront handles any traffic volume  
✅ **Complete** - Athena has all data (clicks + impressions + query params)  

## Next Steps

1. Deploy Lambda@Edge for /c
2. Enable CloudFront Access Logs
3. Set up Athena table
4. Test both click and impression tracking
5. Verify logs appear in S3
6. Run Athena query to confirm data
7. Check tracking-sync Lambda runs daily
