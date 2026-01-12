#!/bin/bash

# Deploy Lambda@Edge function to CloudFront
# Usage: ./deploy.sh

set -e

FUNCTION_NAME="empowerlocal-tracking-edge"
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

# Step 4: Update CloudFront (manual step - requires careful config editing)
echo "⚠️  Step 4: Update CloudFront Distribution"
echo ""
echo "To attach this version to CloudFront, run:"
echo ""
echo "1. Get current distribution config:"
echo "   aws cloudfront get-distribution-config --profile \"$PROFILE\" --id $DISTRIBUTION_ID --output json > cloudfront-config.json"
echo ""
echo "2. Extract ETag and DistributionConfig:"
echo "   export ETAG=\$(jq -r '.ETag' cloudfront-config.json)"
echo "   jq '.DistributionConfig' cloudfront-config.json > distribution-config.json"
echo ""
echo "3. Edit distribution-config.json to add/update LambdaFunctionAssociations:"
echo "   \"LambdaFunctionAssociations\": {"
echo "     \"Quantity\": 1,"
echo "     \"Items\": [{"
echo "       \"LambdaFunctionARN\": \"$VERSION_ARN\","
echo "       \"EventType\": \"viewer-request\","
echo "       \"IncludeBody\": false"
echo "     }]"
echo "   }"
echo ""
echo "4. Update the distribution:"
echo "   aws cloudfront update-distribution --profile \"$PROFILE\" --id $DISTRIBUTION_ID --distribution-config file://distribution-config.json --if-match \$ETAG"
echo ""
echo "5. Wait for deployment (5-15 minutes):"
echo "   aws cloudfront get-distribution --profile \"$PROFILE\" --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""

# Cleanup
rm -f function.zip update-result.json

echo "✅ Deployment complete!"
echo ""
echo "📊 View logs:"
echo "   aws logs tail --profile \"$PROFILE\" --follow /aws/lambda/us-east-1.$FUNCTION_NAME"
