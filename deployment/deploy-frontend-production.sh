#!/bin/bash

# Chicago Hub Frontend - Production Amplify Deployment Script
# Deploys frontend to production Amplify app
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "🚀 Starting PRODUCTION frontend deployment..."
echo "📋 Deploying to production Amplify app"

# Configuration - PRODUCTION
APP_ID="dbn59dj42j2z3"
BRANCH_NAME="main"
AWS_PROFILE="Connection 1"
API_URL="https://hubapi.empowerlocal.co"

echo ""
echo "🔧 Configuration:"
echo "   Environment: PRODUCTION"
echo "   Amplify App ID: $APP_ID"
echo "   Branch: $BRANCH_NAME"
echo "   API URL: $API_URL"
echo "   AWS Profile: $AWS_PROFILE"
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend for production..."
cd "$(dirname "$0")/.."
VITE_API_BASE_URL=$API_URL npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Step 2: Create deployment package
echo "📦 Step 2: Creating deployment package..."
cd dist
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_FILE="../production-frontend-${TIMESTAMP}.zip"
zip -r $ZIP_FILE . > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Package creation failed"
    exit 1
fi

cd ..
echo "✅ Package created: $(basename $ZIP_FILE)"

# Step 3: Create deployment in Amplify
echo "🔄 Step 3: Creating deployment in Amplify..."
DEPLOYMENT_JSON=$(aws amplify create-deployment \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --profile "$AWS_PROFILE" \
  --output json)

if [ $? -ne 0 ]; then
    echo "❌ Deployment creation failed"
    exit 1
fi

JOB_ID=$(echo $DEPLOYMENT_JSON | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])")
UPLOAD_URL=$(echo $DEPLOYMENT_JSON | python3 -c "import sys, json; print(json.load(sys.stdin)['zipUploadUrl'])")

echo "✅ Deployment created with Job ID: $JOB_ID"

# Step 4: Upload package to Amplify
echo "⬆️  Step 4: Uploading package to Amplify..."
HTTP_STATUS=$(curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/zip" \
  --data-binary "@$ZIP_FILE" \
  -s -o /dev/null -w "%{http_code}")

if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ Upload failed with HTTP status: $HTTP_STATUS"
    exit 1
fi

echo "✅ Package uploaded successfully"

# Step 5: Start deployment
echo "🚀 Step 5: Starting deployment..."
aws amplify start-deployment \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --job-id $JOB_ID \
  --profile "$AWS_PROFILE" > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Deployment start failed"
    exit 1
fi

echo "✅ Deployment started"

# Step 6: Monitor deployment
echo "👁️  Step 6: Monitoring deployment status..."
echo "   Waiting for deployment to complete..."

for i in {1..60}; do
  STATUS=$(aws amplify get-job \
    --app-id $APP_ID \
    --branch-name $BRANCH_NAME \
    --job-id $JOB_ID \
    --profile "$AWS_PROFILE" \
    --query 'job.summary.status' \
    --output text)
  
  if [ "$STATUS" = "SUCCEED" ]; then
    echo "✅ Deployment completed successfully!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ Deployment failed!"
    exit 1
  fi
  
  sleep 3
done

if [ "$STATUS" != "SUCCEED" ]; then
    echo "⚠️  Deployment may still be in progress. Check manually in Amplify console."
fi

# Step 7: Cleanup
echo "🧹 Step 7: Cleaning up..."
rm -f $ZIP_FILE
echo "✅ Cleanup complete"

echo ""
echo "🎉 Production frontend has been deployed!"
echo ""
echo "🔍 Verify deployment:"
echo "   Production URL: https://main.dbn59dj42j2z3.amplifyapp.com"
echo "   1. Test authentication and login"
echo "   2. Verify API connectivity"
echo "   3. Check all major features"
echo ""
echo "🚀 Deployment script completed!"

