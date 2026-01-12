# Deploy Click Tracking - Quick Guide

Your simplified tracking setup is ready! Here's what to do:

## What You Have ✅
- ✅ S3 pixel file: `s3://empowerlocal-pixels-ads/pxl.png`
- ✅ CloudFront distribution: `dxafls8akrlrp.cloudfront.net` (E14BMKEZBNSGP4)
- ✅ Impression tracking: Already works via static pixel
- ✅ Simplified Lambda@Edge: Only handles `/c` click redirects

## What You Need ⚠️
- ⚠️ Deploy Lambda@Edge for click redirects
- ⚠️ Enable CloudFront Access Logs
- ⚠️ Verify Athena setup
- ⚠️ Confirm tracking-sync Lambda exists

---

## Step 1: Create IAM Role (5 minutes, first time only)

```bash
cd lambda/tracking-edge

aws iam create-role \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --assume-role-policy-document file://lambda-edge-role.json

aws iam attach-role-policy \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Wait 10 seconds for IAM to propagate
sleep 10
```

---

## Step 2: Create Lambda Function (5 minutes, first time only)

```bash
# Package the function
zip -r function.zip index.js

# Create Lambda
aws lambda create-function \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge \
  --runtime nodejs20.x \
  --role arn:aws:iam::947442015939:role/lambda-edge-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --description "Click tracking redirects only" \
  --timeout 5 \
  --memory-size 128 \
  --publish
```

**Save the FunctionArn from output!**
Example: `arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1`

---

## Step 3: Enable CloudFront Logs & Attach Lambda (15 minutes)

### 3a. Create logs bucket (if needed)
```bash
aws s3 mb s3://empowerlocal-cloudfront-logs --profile "Connection 1"
```

### 3b. Get current CloudFront config
```bash
aws cloudfront get-distribution-config \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --output json > cloudfront-config.json

export ETAG=$(jq -r '.ETag' cloudfront-config.json)
jq '.DistributionConfig' cloudfront-config.json > distribution-config.json
```

### 3c. Edit `distribution-config.json`

Add these two sections:

**1. Enable Logging (add to root level):**
```json
{
  "DistributionConfig": {
    "Logging": {
      "Enabled": true,
      "IncludeCookies": false,
      "Bucket": "empowerlocal-cloudfront-logs.s3.amazonaws.com",
      "Prefix": "tracking/"
    },
```

**2. Add Lambda@Edge (in DefaultCacheBehavior):**
```json
    "DefaultCacheBehavior": {
      "TargetOriginId": "empowerlocal-pixels-ads.s3.us-east-2.amazonaws.com",
      "ViewerProtocolPolicy": "allow-all",
      "LambdaFunctionAssociations": {
        "Quantity": 1,
        "Items": [
          {
            "LambdaFunctionARN": "arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1",
            "EventType": "viewer-request",
            "IncludeBody": false
          }
        ]
      },
```

### 3d. Apply the update
```bash
aws cloudfront update-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --distribution-config file://distribution-config.json \
  --if-match $ETAG
```

### 3e. Wait for deployment
```bash
# Check status (repeat until "Deployed")
aws cloudfront get-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --query 'Distribution.Status'

# Takes 5-15 minutes
```

---

## Step 4: Test It! (2 minutes)

### Test Click Redirect
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/c?oid=test123&cid=camp_test&pid=101&ch=website&t=click&cb=$(date +%s)000&r=https%3A%2F%2Fwww.google.com"
```

**Expected:** `HTTP/2 302` with `Location: https://www.google.com`

### Test Impression Pixel (already works)
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=test123&cid=camp_test&pid=101&ch=website&t=display&cb=$(date +%s)000"
```

**Expected:** `HTTP/2 200` with `Content-Type: image/png`

### Test in Browser
Open this in your browser:
```
https://dxafls8akrlrp.cloudfront.net/c?oid=test123&cid=camp_test&pid=101&ch=website&t=click&r=https%3A%2F%2Fwww.google.com
```

You should be redirected to Google!

---

## Step 5: Verify Logs (wait 1 hour, then check)

```bash
# Check logs are appearing
aws s3 ls s3://empowerlocal-cloudfront-logs/tracking/ --profile "Connection 1"
```

You should see `.gz` files with CloudFront logs.

---

## Step 6: Set Up Athena (if not already done)

See `docs/ATHENA_TRACKING_QUERIES.md` for:
- Creating the `ad_tracking` database
- Creating the `cloudfront_logs` table
- Example queries

---

## Step 7: Verify Tracking Sync Lambda

```bash
aws lambda get-function \
  --profile "Connection 1" \
  --function-name empowerlocal-tracking-sync
```

If it doesn't exist, see `docs/LAMBDA_TRACKING_SYNC_SPEC.md` to create it.

---

## Troubleshooting

### Click redirect not working (403 or 404)
- Wait 10-15 minutes for CloudFront deployment
- Check Lambda is attached: `aws cloudfront get-distribution-config --profile "Connection 1" --id E14BMKEZBNSGP4 --query 'DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations'`
- Verify you used versioned ARN (ends with `:1`, not `$LATEST`)

### No logs appearing in S3
- Wait 15-60 minutes after enabling
- Check bucket name is correct: `empowerlocal-cloudfront-logs`
- Verify CloudFront has write permissions to bucket

### Lambda "Role not found" error
- Wait 30 seconds after creating IAM role
- Verify role name: `lambda-edge-execution-role`
- Check role exists: `aws iam get-role --profile "Connection 1" --role-name lambda-edge-execution-role`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks ad                                                   │
│   → https://dxafls8akrlrp.cloudfront.net/c?r=LANDING_URL        │
│   → Lambda@Edge parses 'r' param                                │
│   → 302 Redirect to landing page                                │
│   → CloudFront logs capture click                               │
├─────────────────────────────────────────────────────────────────┤
│ User views ad                                                    │
│   → https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=...        │
│   → CloudFront serves static file from S3                       │
│   → CloudFront logs capture impression                          │
├─────────────────────────────────────────────────────────────────┤
│ Every day at 6 AM UTC                                           │
│   → empowerlocal-tracking-sync Lambda runs                      │
│   → Queries Athena for yesterday's clicks + impressions         │
│   → Syncs aggregated data to MongoDB performance_entries        │
└─────────────────────────────────────────────────────────────────┘
```

---

## What This Gives You

✅ Click tracking with attribution (campaign, creative, publication)  
✅ Impression tracking with full query params  
✅ User data (IP, user agent, referer, geo)  
✅ Daily aggregation into MongoDB  
✅ Cost: ~$15-20/month (90% cheaper than Lambda for everything)  
✅ Scales to millions of impressions/clicks  

---

## Next: Update Your Tracking URLs

Your tracking URLs are already correct! They're generated by:
- `src/services/trackingScriptService.ts`
- `server/routes/tracking-scripts.ts`

They already use the right format:
- **Clicks:** `https://dxafls8akrlrp.cloudfront.net/c?oid=...&r=LANDING_URL`
- **Impressions:** `https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=...`

No code changes needed! 🎉
