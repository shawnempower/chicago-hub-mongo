#!/bin/bash

# Chicago Hub Frontend - Staging Amplify Manual Deployment Script
# Deploys frontend to staging Amplify app using manual deployment (not Git-connected)
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "🚀 Starting STAGING frontend deployment..."
echo "📋 Deploying to staging Amplify app (manual deployment)"

# Configuration - STAGING
APP_ID="d3wvz0v8d4a1r"
BRANCH_NAME="staging"
AWS_PROFILE="Connection 1"
API_URL="https://hubapi-staging.empowerlocal.co"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "🔧 Configuration:"
echo "   Environment: STAGING"
echo "   Amplify App ID: $APP_ID"
echo "   Branch: $BRANCH_NAME"
echo "   API URL: $API_URL"
echo "   AWS Profile: $AWS_PROFILE"
echo ""

# Step 1: Build the frontend
echo "📦 Step 1: Building frontend..."
cd "$PROJECT_ROOT"

npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi

echo "✅ Build completed successfully"

# Step 2: Create deployment zip
echo "📦 Step 2: Creating deployment package..."
cd dist
ZIP_FILE="$PROJECT_ROOT/staging-deploy-$(date +%Y%m%d-%H%M%S).zip"
zip -r "$ZIP_FILE" . > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ Failed to create deployment package"
    exit 1
fi

cd "$PROJECT_ROOT"
echo "✅ Deployment package created: $ZIP_FILE"

# Step 3: Create Amplify deployment
echo "🚀 Step 3: Creating Amplify deployment..."
DEPLOYMENT_JSON=$(aws amplify create-deployment \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --profile "$AWS_PROFILE" \
  --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create Amplify deployment"
    rm -f "$ZIP_FILE"
    exit 1
fi

UPLOAD_URL=$(echo $DEPLOYMENT_JSON | python3 -c "import sys, json; print(json.load(sys.stdin)['zipUploadUrl'])")
JOB_ID=$(echo $DEPLOYMENT_JSON | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])")

echo "✅ Deployment created with Job ID: $JOB_ID"

# Step 4: Upload the zip file
echo "⬆️  Step 4: Uploading deployment package..."
HTTP_CODE=$(curl -X PUT \
     -H "Content-Type: application/zip" \
     --data-binary @"$ZIP_FILE" \
     "$UPLOAD_URL" \
     --write-out "%{http_code}" \
     --silent \
     --output /dev/null)

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Failed to upload deployment package (HTTP $HTTP_CODE)"
    rm -f "$ZIP_FILE"
    exit 1
fi

echo "✅ Package uploaded successfully (HTTP $HTTP_CODE)"

# Clean up zip file
rm -f "$ZIP_FILE"

# Step 5: Start the deployment
echo "🚀 Step 5: Starting deployment..."
START_JSON=$(aws amplify start-deployment \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --job-id $JOB_ID \
  --profile "$AWS_PROFILE" \
  --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to start deployment"
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
    --output text 2>/dev/null)
  
  if [ "$STATUS" = "SUCCEED" ]; then
    echo "✅ Deployment completed successfully!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "❌ Deployment failed!"
    echo "   Check logs in Amplify console for details"
    exit 1
  fi
  
  echo "   Status: $STATUS (waiting...)"
  sleep 5
done

if [ "$STATUS" != "SUCCEED" ]; then
    echo "⚠️  Deployment may still be in progress. Check manually in Amplify console."
fi

echo ""
echo "🎉 Staging frontend has been deployed!"
echo ""
echo "🔍 Verify deployment:"
echo "   Staging URL: https://staging.d3wvz0v8d4a1r.amplifyapp.com"
echo "   1. Test authentication and login"
echo "   2. Verify API connectivity to $API_URL"
echo "   3. Check all major features"
echo ""
echo "📊 Deployment details:"
echo "   Job ID: $JOB_ID"
echo "   App ID: $APP_ID"
echo "   Branch: $BRANCH_NAME"
echo ""
echo "🚀 Deployment script completed!"
