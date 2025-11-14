#!/bin/bash

# Chicago Hub - Full Stack Staging Deployment
# Deploys both backend (ECS) and frontend (Amplify) to staging
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "======================================================================"
echo "🚀 FULL STACK STAGING DEPLOYMENT"
echo "======================================================================"
echo ""
echo "This will deploy:"
echo "  ✓ Backend API to ECS (https://hubapi-staging.empowerlocal.co)"
echo "  ✓ Frontend to Amplify (https://staging.d3wvz0v8d4a1r.amplifyapp.com)"
echo ""
echo "Environment: STAGING"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_TIME=$(date +%s)

echo ""
echo "======================================================================"
echo "📦 STEP 1/2: Deploying Backend (ECS)"
echo "======================================================================"
echo ""

"$SCRIPT_DIR/deploy-backend-staging.sh"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Backend deployment failed!"
    echo "Frontend deployment cancelled for safety."
    exit 1
fi

echo ""
echo "======================================================================"
echo "🎨 STEP 2/2: Deploying Frontend (Amplify)"
echo "======================================================================"
echo ""

"$SCRIPT_DIR/deploy-frontend-staging.sh"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Frontend deployment failed!"
    echo "⚠️  Backend was deployed successfully, but frontend needs manual attention."
    exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "======================================================================"
echo "✅ FULL STACK STAGING DEPLOYMENT COMPLETE!"
echo "======================================================================"
echo ""
echo "⏱️  Total deployment time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "🌐 Staging URLs:"
echo "   Frontend: https://staging.d3wvz0v8d4a1r.amplifyapp.com"
echo "   API:      https://hubapi-staging.empowerlocal.co"
echo ""
echo "🔍 Recommended verification steps:"
echo "   1. Open staging frontend and test login"
echo "   2. Verify API connectivity and health check"
echo "   3. Test new features in staging environment"
echo "   4. Check CloudWatch logs for any errors"
echo ""
echo "💡 Once verified, deploy to production with:"
echo "   ./deployment/deploy-all-production.sh"
echo ""
echo "======================================================================"

