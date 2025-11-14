# 🚧 Chicago Hub - Staging Environment Setup Guide

This guide walks you through setting up a complete staging environment for Chicago Hub, separate from production.

## 📋 Overview

The staging environment mirrors production with these key differences:
- **ECS Service**: `chicago-hub-service-staging` (separate from production)
- **ECR Image Tag**: `:staging` (separate from `:latest` production tag)
- **SSM Parameters**: `/chicago-hub-staging/*` namespace
- **MongoDB Database**: Separate staging database
- **Amplify App**: Separate app for manual deployments
- **API Subdomain**: `hubapi-staging.empowerlocal.co`

## ⚠️ Prerequisites

Before starting, ensure you have:
- [ ] AWS CLI installed and configured with profile "Connection 1"
- [ ] Access to AWS Console with appropriate permissions
- [ ] MongoDB Atlas access to create staging database
- [ ] Docker with buildx support installed locally

## 🏗️ Step 1: Create MongoDB Staging Database

1. Log into MongoDB Atlas
2. Navigate to your cluster
3. Create new database: `chicago-hub-staging`
4. Create a database user or use existing credentials
5. Note the connection URI (you'll need this for SSM parameters)

**Expected format:**
```
mongodb+srv://username:password@cluster.mongodb.net/chicago-hub-staging
```

## 🔐 Step 2: Create SSM Parameters

Create all required SSM parameters in AWS Systems Manager Parameter Store under the `/chicago-hub-staging/*` namespace.

### Using AWS Console

1. Navigate to AWS Systems Manager → Parameter Store
2. Create each parameter as **SecureString** type
3. Use the parameter paths listed below

### Using AWS CLI

```bash
# Set your AWS profile
AWS_PROFILE="Connection 1"
AWS_REGION="us-east-2"

# JWT Secret (generate a new one for staging)
aws ssm put-parameter \
  --name "/chicago-hub-staging/jwt-secret" \
  --value "YOUR_STAGING_JWT_SECRET" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# MongoDB URI
aws ssm put-parameter \
  --name "/chicago-hub-staging/mongodb-uri" \
  --value "mongodb+srv://user:pass@cluster.mongodb.net/" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# MongoDB Database Name
aws ssm put-parameter \
  --name "/chicago-hub-staging/mongodb-db-name" \
  --value "chicago-hub-staging" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# AWS Credentials (can use same as production or create staging-specific)
aws ssm put-parameter \
  --name "/chicago-hub-staging/aws-access-key-id" \
  --value "YOUR_AWS_ACCESS_KEY_ID" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/aws-secret-access-key" \
  --value "YOUR_AWS_SECRET_ACCESS_KEY" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# S3 Bucket (can use same as production)
aws ssm put-parameter \
  --name "/chicago-hub-staging/s3-bucket" \
  --value "YOUR_S3_BUCKET_NAME" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# Mailgun Configuration (can use same as production)
aws ssm put-parameter \
  --name "/chicago-hub-staging/mailgun-api-key" \
  --value "YOUR_MAILGUN_API_KEY" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/mailgun-domain" \
  --value "YOUR_MAILGUN_DOMAIN" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# Storefront Configuration (can use same as production)
aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-domain" \
  --value "localmedia.store" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-hosted-zone-id" \
  --value "YOUR_HOSTED_ZONE_ID" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-cloudfront-distribution-id" \
  --value "YOUR_CLOUDFRONT_DIST_ID" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-cloudfront-domain" \
  --value "YOUR_CLOUDFRONT_DOMAIN" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-ssl-certificate-arn" \
  --value "YOUR_SSL_CERT_ARN" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-dns-ttl" \
  --value "300" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

aws ssm put-parameter \
  --name "/chicago-hub-staging/storefront-aws-region" \
  --value "us-east-1" \
  --type "SecureString" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

### Verify Parameters

```bash
# List all staging parameters
aws ssm get-parameters-by-path \
  --path "/chicago-hub-staging" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query "Parameters[].Name"
```

You should see 15 parameters listed.

## 🎯 Step 3: Create Load Balancer Target Group

### Using AWS Console

1. Navigate to **EC2 → Load Balancers**
2. Find your existing load balancer: `chicago-hub-api-clean`
3. Go to **Target Groups** tab
4. Click **Create target group**
5. Configure:
   - **Target type**: IP addresses
   - **Target group name**: `chicago-hub-staging-tg`
   - **Protocol**: HTTP
   - **Port**: 3001
   - **VPC**: Same as production
   - **Health check path**: `/health`
   - **Health check interval**: 30 seconds
6. Create target group (don't register targets yet - ECS will do this)

### Using AWS CLI

```bash
# Get VPC ID from existing target group
VPC_ID=$(aws elbv2 describe-target-groups \
  --names chicago-hub-api-tg \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'TargetGroups[0].VpcId' \
  --output text)

# Create staging target group
aws elbv2 create-target-group \
  --name chicago-hub-staging-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

## 🌐 Step 4: Configure Load Balancer Listener Rule

Add a listener rule to route staging subdomain traffic to the staging target group.

### Using AWS Console

1. Go to **Load Balancers** → Select `chicago-hub-api-clean`
2. Select **Listeners** tab
3. Select the **HTTPS:443** listener
4. Click **View/edit rules**
5. Click **+** to add rule
6. Configure:
   - **IF**: Host header is `hubapi-staging.empowerlocal.co`
   - **THEN**: Forward to `chicago-hub-staging-tg`
   - **Priority**: Set to a number before the default rule (e.g., 2)
7. Save

### Using AWS CLI

```bash
# Get listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers \
    --names chicago-hub-api-clean \
    --region $AWS_REGION \
    --profile "$AWS_PROFILE" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text) \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'Listeners[?Port==`443`].ListenerArn' \
  --output text)

# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names chicago-hub-staging-tg \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create listener rule
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 2 \
  --conditions Field=host-header,Values=hubapi-staging.empowerlocal.co \
  --actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

## 🔧 Step 5: Configure DNS for Staging API

Add a DNS record for the staging API subdomain.

### Using Route53 Console

1. Navigate to **Route53 → Hosted zones**
2. Select `empowerlocal.co`
3. Click **Create record**
4. Configure:
   - **Record name**: `hubapi-staging`
   - **Record type**: A - IPv4 address
   - **Alias**: Yes
   - **Route traffic to**: Alias to Application Load Balancer
   - **Region**: us-east-2
   - **Load balancer**: Select `chicago-hub-api-clean`
5. Create record

### Using AWS CLI

```bash
# Get load balancer DNS name
LB_DNS_NAME=$(aws elbv2 describe-load-balancers \
  --names chicago-hub-api-clean \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Get hosted zone ID
LB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --names chicago-hub-api-clean \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Get Route53 hosted zone ID for empowerlocal.co
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name empowerlocal.co \
  --profile "$AWS_PROFILE" \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

# Create DNS record
cat > /tmp/staging-dns-record.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "hubapi-staging.empowerlocal.co",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$LB_ZONE_ID",
          "DNSName": "$LB_DNS_NAME",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/staging-dns-record.json \
  --profile "$AWS_PROFILE"
```

## 📦 Step 6: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/chicago-hub-api-staging \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

## 🚀 Step 7: Create ECS Service

### Using AWS Console

1. Navigate to **ECS → Clusters**
2. Select `empowerlocal-api-cluster`
3. Click **Create** in Services tab
4. Configure:
   - **Compute options**: Launch type
   - **Launch type**: FARGATE
   - **Application type**: Service
   - **Task definition**: `chicago-hub-api-staging` (will be available after first deployment)
   - **Service name**: `chicago-hub-service-staging`
   - **Desired tasks**: 1
5. **Networking**:
   - **VPC**: Same as production
   - **Subnets**: Same as production
   - **Security group**: Same as production
6. **Load balancing**:
   - **Load balancer type**: Application Load Balancer
   - **Container to load balance**: `chicago-hub-api-staging:3001`
   - **Target group**: `chicago-hub-staging-tg`
7. Create service

**Note**: The task definition won't exist until first deployment. You can either:
- Option A: Run deployment first, then create service manually
- Option B: Create a dummy task definition temporarily

### Using AWS CLI (After First Deployment)

```bash
# Get security group and subnet IDs from production service
SECURITY_GROUP=$(aws ecs describe-services \
  --cluster empowerlocal-api-cluster \
  --services chicago-hub-service \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' \
  --output text)

SUBNETS=$(aws ecs describe-services \
  --cluster empowerlocal-api-cluster \
  --services chicago-hub-service \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets' \
  --output text)

# Create service
aws ecs create-service \
  --cluster empowerlocal-api-cluster \
  --service-name chicago-hub-service-staging \
  --task-definition chicago-hub-api-staging \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=chicago-hub-api-staging,containerPort=3001 \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

## 🎨 Step 8: Create Amplify App for Staging Frontend

### Using AWS Console

1. Navigate to **AWS Amplify**
2. Click **New app → Host web app**
3. Select **Deploy without Git provider**
4. Configure:
   - **App name**: `chicago-hub-staging`
   - **Environment name**: `staging`
5. After creation:
   - Go to **App settings → Environment variables**
   - Add: `VITE_API_BASE_URL` = `https://hubapi-staging.empowerlocal.co`
6. Note the Amplify app URL (e.g., `https://staging.dxxxx.amplifyapp.com`)

### Update Task Definition with Amplify URL

After creating the Amplify app, update the staging task definition:

1. Edit `/deployment/aws/ecs-task-definition-staging.json`
2. Update the `FRONTEND_URL` environment variable with your actual Amplify URL
3. Save the file

```json
{
  "name": "FRONTEND_URL",
  "value": "https://staging.dxxxx.amplifyapp.com"
}
```

## 🚀 Step 9: First Deployment to Staging

Now that all AWS resources are configured, run your first staging deployment:

```bash
cd /path/to/chicago-hub

# Make the script executable
chmod +x deployment/deploy-staging.sh

# Run staging deployment
./deployment/deploy-staging.sh
```

The script will:
1. Build Docker image with `:staging` tag
2. Push to ECR
3. Register task definition
4. Update/create ECS service
5. Wait for deployment to stabilize

## 🎨 Step 10: Deploy Frontend to Amplify Staging

Manual deployment process:

```bash
# Build for staging
npm run build

# The build output is in dist/
# Option 1: Use Amplify Console to drag and drop dist/ folder

# Option 2: Use AWS CLI
cd dist
zip -r ../staging-frontend.zip .
cd ..

aws amplify create-deployment \
  --app-id YOUR_STAGING_APP_ID \
  --branch-name staging \
  --profile "$AWS_PROFILE"

# Upload the zip file using the provided URL
```

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] Staging API health check responds: `https://hubapi-staging.empowerlocal.co/health`
- [ ] Staging frontend loads: Check Amplify app URL
- [ ] Frontend can authenticate with staging API
- [ ] Database operations work (check staging MongoDB)
- [ ] File uploads work (check S3)
- [ ] Email functionality works (if testing)
- [ ] Production is still running normally

### Testing Endpoints

```bash
# Health check
curl https://hubapi-staging.empowerlocal.co/health

# API version
curl https://hubapi-staging.empowerlocal.co/api/version
```

## 📚 Next Steps

Now that staging is set up:

1. Test new features in staging before production
2. Use separate staging data for testing
3. Deploy to staging with: `./deployment/deploy-staging.sh`
4. Deploy to production with: `./deployment/deploy-to-ecs.sh`

## 🔧 Troubleshooting

### Service fails to start

Check CloudWatch logs:
```bash
aws logs tail /ecs/chicago-hub-api-staging \
  --follow \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

### Task definition registration fails

Verify all SSM parameters exist:
```bash
aws ssm get-parameters-by-path \
  --path "/chicago-hub-staging" \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

### Health checks failing

1. Check security group allows traffic on port 3001
2. Verify container is running: `docker logs` locally
3. Check if `/health` endpoint works

### DNS not resolving

Wait 5-10 minutes for DNS propagation, then test:
```bash
nslookup hubapi-staging.empowerlocal.co
```

## 🆘 Rollback

If staging deployment fails, production is unaffected. To rollback staging:

```bash
# Find previous task definition
aws ecs list-task-definitions \
  --family-prefix chicago-hub-api-staging \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"

# Update service to previous revision
aws ecs update-service \
  --cluster empowerlocal-api-cluster \
  --service chicago-hub-service-staging \
  --task-definition chicago-hub-api-staging:PREVIOUS_REVISION \
  --region $AWS_REGION \
  --profile "$AWS_PROFILE"
```

## 📞 Support

For issues or questions about staging environment setup, refer to:
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Deployment README](../README.md)

