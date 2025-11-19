#!/bin/bash

# Chicago Hub Frontend - Staging Amplify Deployment Script
# Deploys frontend to staging Amplify app
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "🚀 Starting STAGING frontend deployment..."
echo "📋 Deploying to staging Amplify app"

# Configuration - STAGING
APP_ID="d3wvz0v8d4a1r"
BRANCH_NAME="staging"
AWS_PROFILE="Connection 1"
API_URL="https://hubapi-staging.empowerlocal.co"

echo ""
echo "🔧 Configuration:"
echo "   Environment: STAGING"
echo "   Amplify App ID: $APP_ID"
echo "   Branch: $BRANCH_NAME"
echo "   API URL: $API_URL"
echo "   AWS Profile: $AWS_PROFILE"
echo ""

# Step 1: Trigger Amplify build from repository
echo "🚀 Step 1: Triggering Amplify build from repository..."
cd "$(dirname "$0")/.."

JOB_JSON=$(aws amplify start-job \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --job-type RELEASE \
  --profile "$AWS_PROFILE" \
  --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Amplify job"
    exit 1
fi

JOB_ID=$(echo $JOB_JSON | python3 -c "import sys, json; print(json.load(sys.stdin)['jobSummary']['jobId'])")
echo "✅ Build started with Job ID: $JOB_ID"

# Step 2: Monitor deployment
echo "👁️  Step 2: Monitoring deployment status..."
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

echo ""
echo "🎉 Staging frontend has been deployed!"
echo ""
echo "🔍 Verify deployment:"
echo "   Staging URL: https://staging.d3wvz0v8d4a1r.amplifyapp.com"
echo "   1. Test authentication and login"
echo "   2. Verify API connectivity"
echo "   3. Check all major features"
echo ""
echo "🚀 Deployment script completed!"

