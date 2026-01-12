# Quick Start: Deploy Tracking Lambda

## Prerequisites
- AWS CLI configured with profile "Connection 1"
- IAM permissions for Lambda and CloudFront

## 1. Create IAM Role (First Time Only)

```bash
cd lambda/tracking-edge

# Create the IAM role
aws iam create-role \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --assume-role-policy-document file://lambda-edge-role.json

# Attach execution policy
aws iam attach-role-policy \
  --profile "Connection 1" \
  --role-name lambda-edge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Wait 10 seconds for IAM role to propagate
sleep 10
```

## 2. Create Lambda Function (First Time Only)

```bash
# Package the function
zip -r function.zip index.js

# Create the Lambda function
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

**Save the FunctionArn from the output!** You'll need it for CloudFront.

Example: `arn:aws:lambda:us-east-1:947442015939:function:empowerlocal-tracking-edge:1`

## 3. Attach Lambda to CloudFront

```bash
# Get current CloudFront config
aws cloudfront get-distribution-config \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --output json > cloudfront-config.json

# Save the ETag
export ETAG=$(jq -r '.ETag' cloudfront-config.json)

# Extract just the DistributionConfig
jq '.DistributionConfig' cloudfront-config.json > distribution-config.json
```

**Now edit `distribution-config.json`:**

Find the `"DefaultCacheBehavior"` section and add/update `"LambdaFunctionAssociations"`:

```json
{
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
    ...rest of config...
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

## 4. Wait for CloudFront Deployment

```bash
# Check status (repeat until it says "Deployed")
aws cloudfront get-distribution \
  --profile "Connection 1" \
  --id E14BMKEZBNSGP4 \
  --query 'Distribution.Status'

# Takes 5-15 minutes
```

## 5. Test It!

### Test Click Redirect
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/c?oid=test123&cid=camp_test&pid=101&ch=website&t=click&cb=$(date +%s)000&r=https%3A%2F%2Fwww.google.com"
```

**Expected:** HTTP 302 redirect to google.com

### Test Impression Pixel
```bash
curl -I "https://dxafls8akrlrp.cloudfront.net/v?oid=test123&cid=camp_test&pid=101&ch=website&t=display&cb=$(date +%s)000"
```

**Expected:** HTTP 200 with Content-Type: image/gif

### View Logs
```bash
aws logs tail \
  --profile "Connection 1" \
  --follow \
  /aws/lambda/us-east-1.empowerlocal-tracking-edge
```

---

## Future Updates

When you need to update the Lambda code:

```bash
cd lambda/tracking-edge

# Edit index.js with your changes

# Run the deploy script
./deploy.sh

# Then update CloudFront with the new version ARN (repeat step 3)
```

---

## Troubleshooting

### "Role not found" error
Wait 10-30 seconds after creating the IAM role, then try again.

### "Function already exists" error
Skip step 2 and go directly to step 3 with your existing function ARN.

### Still getting 403 errors
1. Check Lambda is attached: `aws cloudfront get-distribution-config --profile "Connection 1" --id E14BMKEZBNSGP4 --query 'DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations'`
2. Verify you're using a versioned ARN (ends with `:1`, not `$LATEST`)
3. Check CloudWatch logs for errors

### No logs appearing
- Lambda@Edge logs appear in the region where requests are processed
- Check `/aws/lambda/us-east-1.empowerlocal-tracking-edge`
- May take 5-10 minutes for first logs to appear after deployment
