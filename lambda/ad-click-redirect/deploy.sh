#!/bin/bash

# Deploy Ad Click Redirect Lambda@Edge Function
# Usage: ./deploy.sh

set -e

FUNCTION_NAME="ad-click-redirect"
REGION="us-east-1"
PROFILE="Connection 1"
DISTRIBUTION_ID="E14BMKEZBNSGP4"

echo "🚀 Deploying Lambda@Edge function: $FUNCTION_NAME"
echo ""

# Step 1: Package function
echo "📦 Step 1: Packaging function..."
zip -q -r function.zip index.js
echo "✅ Function packaged"
echo ""

# Step 2: Update Lambda function code
echo "⬆️  Step 2: Updating Lambda function code..."
aws lambda update-function-code \
  --profile "$PROFILE" \
  --region $REGION \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --output json > update-result.json

echo "✅ Function code updated"
echo ""

# Step 3: Publish new version
echo "📋 Step 3: Publishing new version..."
VERSION_ARN=$(aws lambda publish-version \
  --profile "$PROFILE" \
  --region $REGION \
  --function-name $FUNCTION_NAME \
  --query 'FunctionArn' \
  --output text)

echo "✅ Published version: $VERSION_ARN"
echo ""

# Step 4: Update CloudFront (manual step)
echo "⚠️  Step 4: Update CloudFront Distribution"
echo ""
echo "To attach this version to CloudFront, update the LambdaFunctionARN in your"
echo "CloudFront distribution config to:"
echo ""
echo "  $VERSION_ARN"
echo ""
echo "See QUICKSTART.md for detailed instructions."
echo ""

# Cleanup
rm -f function.zip update-result.json

echo "✅ Deployment complete!"
echo ""
echo "📊 Test the function:"
echo "   curl -I \"https://dxafls8akrlrp.cloudfront.net/c?r=https%3A%2F%2Fwww.google.com\""
