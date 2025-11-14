#!/bin/bash

# Chicago Hub - Full Stack Production Deployment
# Deploys both backend (ECS) and frontend (Amplify) to production
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "======================================================================"
echo "🚀 FULL STACK PRODUCTION DEPLOYMENT"
echo "======================================================================"
echo ""
echo "This will deploy:"
echo "  ✓ Backend API to ECS (https://hubapi.empowerlocal.co)"
echo "  ✓ Frontend to Amplify (https://main.dbn59dj42j2z3.amplifyapp.com)"
echo ""
echo "Environment: PRODUCTION"
echo ""
read -p "Continue with production deployment? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_TIME=$(date +%s)

echo ""
echo "======================================================================"
echo "📦 STEP 1/2: Deploying Backend (ECS)"
echo "======================================================================"
echo ""

"$SCRIPT_DIR/deploy-backend-production.sh"

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

"$SCRIPT_DIR/deploy-frontend-production.sh"

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
echo "✅ FULL STACK PRODUCTION DEPLOYMENT COMPLETE!"
echo "======================================================================"
echo ""
echo "⏱️  Total deployment time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "🌐 Production URLs:"
echo "   Frontend: https://main.dbn59dj42j2z3.amplifyapp.com"
echo "   API:      https://hubapi.empowerlocal.co"
echo ""
echo "🔍 Recommended verification steps:"
echo "   1. Open production frontend and test login"
echo "   2. Verify API connectivity and health check"
echo "   3. Test critical user flows"
echo "   4. Check CloudWatch logs for any errors"
echo ""
echo "======================================================================"

