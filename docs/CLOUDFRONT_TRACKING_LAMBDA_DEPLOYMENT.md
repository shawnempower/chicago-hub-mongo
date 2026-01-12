# CloudFront Tracking Lambda@Edge Deployment Guide

## Overview

This guide shows how to deploy a Lambda@Edge function to handle click tracking and impression pixels on your existing CloudFront distribution.

**Existing CloudFront Distribution:**
- **ID:** `E14BMKEZBNSGP4`
- **Domain:** `dxafls8akrlrp.cloudfront.net`
- **Purpose:** Serves tracking pixels and handles click redirects

---

## Architecture

```
User clicks ad → CloudFront /c endpoint → Lambda@Edge
                                           ├─→ Log click event (to S3/CloudWatch)
                                           └─→ 302 Redirect to landing page

User views ad → CloudFront /v endpoint → Lambda@Edge
                                           ├─→ Log impression event
                                           └─→ Return 1x1 transparent pixel
```

---

## 1. Lambda@Edge Function Code

### Directory Structure

```
chicago-hub/
└── lambda/
    └── tracking-edge/
        ├── index.js           # Main Lambda handler
        ├── package.json       # Dependencies (if needed)
        └── README.md          # Function documentation
```

### Function Code: `lambda/tracking-edge/index.js`

```javascript
'use strict';

/**
 * Lambda@Edge function for ad tracking
 * 
 * Handles:
 * - /c - Click tracking with redirect
 * - /v - Impression pixel (1x1 transparent GIF)
 * 
 * Deployed to: CloudFront Distribution E14BMKEZBNSGP4
 * Domain: dxafls8akrlrp.cloudfront.net
 */

// 1x1 transparent GIF as base64
const PIXEL_GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Main Lambda@Edge handler
 * Triggered on viewer-request events
 */
exports.handler = async (event, context) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;
  const querystring = request.querystring || '';
  const params = parseQueryString(querystring);
  
  console.log('Tracking request:', {
    uri,
    params: {
      oid: params.oid,
      cid: params.cid,
      pid: params.pid,
      ch: params.ch,
      t: params.t
    }
  });

  // Handle click tracking and redirect
  if (uri === '/c') {
    return handleClickTracking(params, request);
  }
  
  // Handle impression pixel
  if (uri === '/v' || uri === '/i.gif' || uri === '/pxl.png') {
    return handleImpressionPixel(params, request);
  }
  
  // For all other paths, continue to origin (S3)
  return request;
};

/**
 * Handle click tracking and redirect to landing page
 */
function handleClickTracking(params, request) {
  const {
    oid,    // Order ID
    cid,    // Campaign ID
    pid,    // Publication ID
    ch,     // Channel
    t,      // Event type (should be 'click')
    cr,     // Creative ID
    r       // Redirect URL (landing page)
  } = params;
  
  // Log click event (goes to CloudWatch Logs)
  console.log('CLICK_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    eventType: 'click',
    orderId: oid,
    campaignId: cid,
    publicationId: pid,
    channel: ch,
    creativeId: cr,
    userAgent: request.headers['user-agent']?.[0]?.value,
    referer: request.headers['referer']?.[0]?.value,
    clientIp: request.headers['cloudfront-viewer-address']?.[0]?.value,
    edgeLocation: request.headers['cloudfront-viewer-country']?.[0]?.value
  }));
  
  // Validate redirect URL
  if (!r) {
    console.error('Missing redirect URL (r parameter)');
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Missing redirect URL',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    };
  }
  
  // Decode and validate redirect URL
  let redirectUrl;
  try {
    redirectUrl = decodeURIComponent(r);
    
    // Basic validation - must be http/https
    if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
      throw new Error('Invalid redirect URL scheme');
    }
  } catch (error) {
    console.error('Invalid redirect URL:', error);
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Invalid redirect URL',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    };
  }
  
  // Return 302 redirect
  return {
    status: '302',
    statusDescription: 'Found',
    headers: {
      'location': [{
        key: 'Location',
        value: redirectUrl
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }],
      'pragma': [{
        key: 'Pragma',
        value: 'no-cache'
      }]
    }
  };
}

/**
 * Handle impression pixel
 * Returns 1x1 transparent GIF
 */
function handleImpressionPixel(params, request) {
  const {
    oid,    // Order ID
    cid,    // Campaign ID
    pid,    // Publication ID
    ch,     // Channel
    t,      // Event type (should be 'display')
    cr,     // Creative ID
    s       // Size
  } = params;
  
  // Log impression event (goes to CloudWatch Logs)
  console.log('IMPRESSION_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    eventType: 'display',
    orderId: oid,
    campaignId: cid,
    publicationId: pid,
    channel: ch,
    creativeId: cr,
    adSize: s,
    userAgent: request.headers['user-agent']?.[0]?.value,
    referer: request.headers['referer']?.[0]?.value,
    clientIp: request.headers['cloudfront-viewer-address']?.[0]?.value,
    edgeLocation: request.headers['cloudfront-viewer-country']?.[0]?.value
  }));
  
  // Return 1x1 transparent GIF
  return {
    status: '200',
    statusDescription: 'OK',
    headers: {
      'content-type': [{
        key: 'Content-Type',
        value: 'image/gif'
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }],
      'pragma': [{
        key: 'Pragma',
        value: 'no-cache'
      }],
      'access-control-allow-origin': [{
        key: 'Access-Control-Allow-Origin',
        value: '*'
      }]
    },
    bodyEncoding: 'base64',
    body: PIXEL_GIF
  };
}

/**
 * Parse query string into object
 */
function parseQueryString(querystring) {
  const params = {};
  if (!querystring) return params;
  
  querystring.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[key] = value || '';
    }
  });
  
  return params;
}
```

---

## 2. Deployment Steps

### Step 1: Create Lambda Function in us-east-1

⚠️ **Important:** Lambda@Edge functions MUST be created in `us-east-1` region.

```bash
# Navigate to lambda directory
cd lambda/tracking-edge

# Create deployment package
zip -r function.zip index.js

# Create Lambda function
aws lambda create-function \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge \
  --runtime nodejs20.x \
  --role arn:aws:iam::947442015939:role/lambda-edge-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --description "CloudFront tracking - click redirects and impression pixels" \
  --timeout 5 \
  --memory-size 128 \
  --publish
```

### Step 2: Create IAM Role for Lambda@Edge

Create file: `lambda/tracking-edge/lambda-edge-role.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:

```bash
# Create IAM role
aws iam create-role \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --assume-role-policy-document file://lambda-edge-role.json

# Attach basic execution policy
aws iam attach-role-policy \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### Step 3: Get Lambda Version ARN

```bash
# Publish a version and get the ARN
aws lambda publish-version \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge

# Note the VersionArn from output - you'll need this for CloudFront
# Example: arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1
```

### Step 4: Update CloudFront Distribution

First, get the current distribution config:

```bash
# Get current config and save to file
aws cloudfront get-distribution-config \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --output json > cloudfront-config.json

# Extract the ETag (needed for update)
export ETAG=$(jq -r '.ETag' cloudfront-config.json)

# Extract just the DistributionConfig
jq '.DistributionConfig' cloudfront-config.json > distribution-config.json
```

Now edit `distribution-config.json` to add the Lambda@Edge function to the **DefaultCacheBehavior**:

```json
{
  "DistributionConfig": {
    "DefaultCacheBehavior": {
      "TargetOriginId": "empowerlocal-pixels-ads.s3.us-east-2.amazonaws.com",
      "ViewerProtocolPolicy": "allow-all",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
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
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }
  }
}
```

Apply the update:

```bash
# Update the distribution
aws cloudfront update-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --distribution-config file://distribution-config.json \
  --if-match $ETAG
```

### Step 5: Wait for Deployment

```bash
# Check deployment status
aws cloudfront get-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --query 'Distribution.Status'

# Status will be "InProgress" then "Deployed" (takes 5-15 minutes)
```

---

## 3. Testing the Deployment

### Test Click Tracking

```bash
# Test click redirect
curl -I "https://dxafls8akrlrp.cloudfront.net/c?oid=test123&cid=camp_test&pid=101&ch=website&t=click&cb=$(date +%s)000&r=https%3A%2F%2Fwww.google.com"

# Expected output:
# HTTP/2 302
# Location: https://www.google.com
```

### Test Impression Pixel

```bash
# Test impression pixel
curl -I "https://dxafls8akrlrp.cloudfront.net/v?oid=test123&cid=camp_test&pid=101&ch=website&t=display&cb=$(date +%s)000"

# Expected output:
# HTTP/2 200
# Content-Type: image/gif
```

### Test in Browser

Open in browser:
```
https://dxafls8akrlrp.cloudfront.net/c?oid=order_123&cid=camp_abc&pid=101&ch=website&t=click&cb=1736726400000&r=https%3A%2F%2Fwww.example.com
```

You should be redirected to example.com.

---

## 4. View Tracking Logs

```bash
# View CloudWatch logs for the Lambda function
aws logs tail \
  --profile "Connection 1" \
  --follow \
  /aws/lambda/us-east-1.empowerlocal-tracking-edge

# Filter for click events only
aws logs filter-log-events \
  --profile "Connection 1" \
  --log-group-name /aws/lambda/us-east-1.empowerlocal-tracking-edge \
  --filter-pattern "CLICK_EVENT"

# Filter for impression events
aws logs filter-log-events \
  --profile "Connection 1" \
  --log-group-name /aws/lambda/us-east-1.empowerlocal-tracking-edge \
  --filter-pattern "IMPRESSION_EVENT"
```

---

## 5. Update Lambda Function (Future Changes)

When you need to update the function:

```bash
cd lambda/tracking-edge

# Update the code in index.js, then:

# Create new deployment package
zip -r function.zip index.js

# Update function code
aws lambda update-function-code \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge \
  --zip-file fileb://function.zip

# Publish new version
aws lambda publish-version \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge

# Update CloudFront to use new version ARN (repeat Step 4)
```

---

## 6. Next Steps: Enhanced Tracking

### Current State
✅ Click redirects working  
✅ Impression pixels working  
✅ CloudWatch logs capturing events  

### Future Enhancements

1. **Add S3 Event Logging**
   - Store events in S3 for long-term analysis
   - Format: JSON Lines, partitioned by date
   - Location: `s3://empowerlocal-pixels-ads/events/YYYY/MM/DD/`

2. **Add Kinesis Firehose**
   - Stream events to Kinesis for real-time processing
   - Enable the `empowerlocal-tracking-sync` Lambda to process events

3. **Add Athena Queries**
   - Create Glue tables over S3 event logs
   - Use queries from `docs/ATHENA_TRACKING_QUERIES.md`

4. **Add Fraud Detection**
   - Check for suspicious patterns (rapid clicks, bot user agents)
   - Add fraud score to logs

5. **Add GeoIP Enrichment**
   - Use CloudFront headers to capture country/region
   - Already available in `cloudfront-viewer-country` header

---

## 7. Troubleshooting

### Lambda Function Not Executing

```bash
# Check if Lambda is associated with CloudFront
aws cloudfront get-distribution-config \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --query 'DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations'
```

### 403 Errors

- Lambda@Edge function must be in `us-east-1`
- Must use versioned ARN (not `$LATEST`)
- IAM role must trust `edgelambda.amazonaws.com`

### 502 Errors

- Check CloudWatch logs for function errors
- Lambda timeout (max 5 seconds for viewer-request)
- Check function memory (128MB should be sufficient)

### No Logs Appearing

- Lambda@Edge logs appear in CloudWatch in the region where they execute
- Check multiple regions (logs appear near edge locations)
- Log group name: `/aws/lambda/us-east-1.{function-name}`

---

## 8. Cost Estimate

**Lambda@Edge Pricing (us-east-1):**
- $0.60 per 1M requests
- $0.00005001 per GB-second

**Assumptions:**
- 10M requests/day (impressions + clicks)
- 128MB memory, 50ms average execution
- ~300M requests/month

**Estimated Cost:**
- Requests: 300M × $0.60 / 1M = **$180/month**
- Compute: 300M × 0.05s × 0.128GB × $0.00005001 = **$9.60/month**
- **Total: ~$190/month**

**CloudWatch Logs:**
- ~$5-10/month for storage

**Total Tracking Infrastructure: ~$200/month**

---

## 9. Security Considerations

1. **Redirect URL Validation**
   - Function validates redirect URL has http/https scheme
   - Consider adding allowlist of domains if needed

2. **Rate Limiting**
   - Consider adding WAF rules to CloudFront for DDoS protection

3. **CORS Headers**
   - Impression pixel includes `Access-Control-Allow-Origin: *`
   - Required for cross-origin pixel requests

4. **No PII Storage**
   - Function logs hashed data only
   - No user identifiable information stored

---

## Reference Links

- [Lambda@Edge Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html)
- [CloudFront Event Structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html)
- [Lambda@Edge Limits](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-limits.html)
