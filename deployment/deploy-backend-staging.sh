#!/bin/bash

# Chicago Hub API - ECS STAGING Deployment Script
# Deploys to staging environment with separate resources
# Uses AWS CLI profile "Connection 1"

set -e  # Exit on any error

echo "🚀 Starting STAGING ECS deployment..."
echo "📋 Deploying to staging environment (separate from production)"

# Configuration - STAGING
ECR_REPOSITORY="947442015939.dkr.ecr.us-east-2.amazonaws.com/chicago-hub-api"
AWS_REGION="us-east-2"
AWS_PROFILE="Connection 1"
CLUSTER_NAME="empowerlocal-api-cluster"
SERVICE_NAME="chicago-hub-service-staging"
TASK_DEFINITION="chicago-hub-api-staging"
IMAGE_TAG="staging"

echo ""
echo "🔧 Configuration:"
echo "   Environment: STAGING"
echo "   ECR Repository: $ECR_REPOSITORY"
echo "   Image Tag: $IMAGE_TAG"
echo "   AWS Region: $AWS_REGION"
echo "   AWS Profile: $AWS_PROFILE"
echo "   Cluster: $CLUSTER_NAME"
echo "   Service: $SERVICE_NAME"
echo "   Task Definition: $TASK_DEFINITION"
echo ""

# Step 1: Build Docker image with EXPLICIT platform targeting
echo "📦 Step 1: Building Docker image for linux/amd64 platform..."
echo "   ⚠️  Using docker buildx to prevent platform compatibility issues"
# Navigate to project root (script is in deployment/ subdirectory)
cd "$(dirname "$0")/.."
docker buildx build --platform linux/amd64 -f deployment/docker/Dockerfile.production -t chicago-hub-api:$IMAGE_TAG . --load

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

# Step 2: Tag for ECR
echo "🏷️  Step 2: Tagging image for ECR..."
docker tag chicago-hub-api:$IMAGE_TAG $ECR_REPOSITORY:$IMAGE_TAG

# Step 3: Login to ECR
echo "🔐 Step 3: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION --profile "$AWS_PROFILE" | docker login --username AWS --password-stdin $ECR_REPOSITORY

if [ $? -ne 0 ]; then
    echo "❌ ECR login failed"
    exit 1
fi

echo "✅ ECR login successful"

# Step 4: Push to ECR
echo "⬆️  Step 4: Pushing image to ECR..."
docker push $ECR_REPOSITORY:$IMAGE_TAG

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed"
    exit 1
fi

echo "✅ Image pushed to ECR successfully"

# Step 5: Register new task definition
echo "📋 Step 5: Registering new task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://deployment/aws/ecs-task-definition-staging.json --profile "$AWS_PROFILE" --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -ne 0 ]; then
    echo "❌ Task definition registration failed"
    exit 1
fi

echo "✅ Task definition registered: $TASK_DEF_ARN"

# Step 6: Update ECS service
echo "🔄 Step 6: Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEFINITION \
  --profile "$AWS_PROFILE" > /dev/null

if [ $? -ne 0 ]; then
    echo "❌ ECS service update failed"
    exit 1
fi

echo "✅ ECS service update initiated"

# Step 7: Monitor deployment
echo "👁️  Step 7: Monitoring deployment status..."
echo "   Waiting for deployment to complete..."

# Wait for deployment to stabilize
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --profile "$AWS_PROFILE"

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "🎉 Chicago Hub API STAGING has been deployed!"
    echo ""
    echo "🔍 Verify deployment:"
    echo "   1. Check staging API health endpoint"
    echo "   2. Verify staging frontend can connect to API"
    echo "   3. Test key functionality in staging environment"
else
    echo "⚠️  Deployment may still be in progress. Check manually:"
    echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --profile \"$AWS_PROFILE\""
fi

echo ""
echo "📊 Current service status:"
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --profile "$AWS_PROFILE" --query 'services[0].{status: status, runningCount: runningCount, desiredCount: desiredCount, taskDefinition: taskDefinition}' --output table

echo ""
echo "🚀 Staging deployment script completed!"

