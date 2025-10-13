# 🚀 Chicago Hub API - Production Deployment Guide

## 🎯 Quick Deployment (Recommended)

**Use the automated script to prevent platform compatibility issues:**

```bash
./deploy-to-ecs.sh
```

This script automatically handles the platform compatibility fix and prevents the recurring `linux/amd64` deployment errors.

---

## Manual Deployment Steps

If you prefer to run commands manually, follow the steps below:

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker** installed locally
3. **ECR repository** created for your images
4. **ECS cluster** set up
5. **Application Load Balancer** configured
6. **Security groups** configured for port 3001

## Step 1: Build and Push Docker Image

### ⚠️ Critical: Platform Compatibility Fix
**MUST use `docker buildx build --platform linux/amd64`** to prevent the recurring deployment error:
`"CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'"`

This error occurs when Docker builds images for the local platform (e.g., arm64 on M1 Macs) instead of the required ECS Fargate platform (linux/amd64).

```bash
# Build production image with EXPLICIT platform targeting (REQUIRED for ECS Fargate)
# This prevents the recurring "Manifest does not contain descriptor matching platform 'linux/amd64'" error
docker buildx build --platform linux/amd64 -f Dockerfile.production -t chicago-hub-api:latest . --load

# Tag for ECR
docker tag chicago-hub-api:latest 947442015939.dkr.ecr.us-east-2.amazonaws.com/chicago-hub-api:latest

# Push to ECR
aws ecr get-login-password --region us-east-2 --profile "Connection 1" | docker login --username AWS --password-stdin 947442015939.dkr.ecr.us-east-2.amazonaws.com
docker push 947442015939.dkr.ecr.us-east-2.amazonaws.com/chicago-hub-api:latest
```

## Step 2: Store Secrets in AWS Systems Manager

```bash
# Store sensitive environment variables
aws ssm put-parameter --name "/chicago-hub/jwt-secret" --value "your-super-secure-jwt-secret" --type "SecureString"
aws ssm put-parameter --name "/chicago-hub/mongodb-uri" --value "mongodb+srv://..." --type "SecureString"
aws ssm put-parameter --name "/chicago-hub/aws-access-key-id" --value "your-access-key" --type "SecureString"
aws ssm put-parameter --name "/chicago-hub/aws-secret-access-key" --value "your-secret-key" --type "SecureString"
aws ssm put-parameter --name "/chicago-hub/s3-bucket" --value "your-s3-bucket" --type "String"
aws ssm put-parameter --name "/chicago-hub/mailgun-api-key" --value "your-mailgun-key" --type "SecureString"
aws ssm put-parameter --name "/chicago-hub/mailgun-domain" --value "your-domain.com" --type "String"
```

## Step 3: Update ECS Task Definition

1. Update `ecs-task-definition.json` with your actual values:
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID
   - Replace `YOUR_ECR_REPOSITORY_URI` with your ECR repository URI
   - Update `FRONTEND_URL` with your actual frontend URL

2. Register the task definition:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

## Step 4: Create ECS Service

```bash
aws ecs create-service \
  --cluster your-cluster-name \
  --service-name chicago-hub-api \
  --task-definition chicago-hub-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:YOUR_ACCOUNT:targetgroup/chicago-hub-api/12345,containerName=chicago-hub-api,containerPort=3001"
```

## Step 5: Configure Application Load Balancer

1. **Target Group**: Create target group for port 3001
2. **Health Check**: Configure health check for `/health` endpoint
3. **Listener**: Configure HTTPS listener on port 443 with SSL certificate
4. **Custom Domain**: Set up custom domain (e.g., `hubapi.empowerlocal.co`) with Route 53 CNAME record
5. **CORS**: Ensure ALB forwards requests directly to ECS tasks without path rewriting

## Step 6: Security Considerations

### IAM Roles Required:
- **ECS Task Execution Role**: For pulling images and accessing secrets
- **ECS Task Role**: For accessing AWS services (S3, SSM)

### Security Groups:
- **Inbound**: Port 3001 from ALB security group
- **Outbound**: HTTPS (443) for external API calls

### Network Configuration:
- Use private subnets for ECS tasks
- Use public subnets for ALB
- Configure NAT Gateway for outbound internet access

## Step 7: Monitoring and Logging

1. **CloudWatch Logs**: Configured in task definition
2. **CloudWatch Metrics**: Monitor CPU, memory, and custom metrics
3. **Health Checks**: Both ECS and ALB health checks configured

## Step 8: Environment-Specific Configuration

### Production Environment Variables:
- `NODE_ENV=production`
- `PORT=3001`
- `FRONTEND_URL=https://main.dbn59dj42j2z3.amplifyapp.com` (Amplify frontend domain)

### Required AWS Services:
- **ECS Fargate**: For container orchestration
- **ECR**: For Docker image storage
- **ALB**: For load balancing
- **SSM Parameter Store**: For secrets management
- **CloudWatch**: For logging and monitoring
- **S3**: For file storage
- **VPC**: For network isolation

## Troubleshooting

### Common Issues:
1. **Health check failures**: Verify `/health` endpoint is accessible
2. **Database connection issues**: Check MongoDB URI and network connectivity
3. **S3 access issues**: Verify IAM permissions and bucket configuration
4. **Email service failures**: Check Mailgun configuration

### Debug Commands:
```bash
# Check ECS service status
aws ecs describe-services --cluster your-cluster --services chicago-hub-api

# View task logs
aws logs get-log-events --log-group-name /ecs/chicago-hub-api --log-stream-name ecs/chicago-hub-api/task-id

# Check task definition
aws ecs describe-task-definition --task-definition chicago-hub-api
```

## Performance Optimization

1. **Resource Allocation**: Start with 512 CPU / 1024 Memory, adjust based on usage
2. **Auto Scaling**: Configure ECS service auto scaling
3. **Database Connection Pooling**: Already configured in MongoDB client
4. **Caching**: Consider adding Redis for session storage and caching

## Security Checklist

- [ ] All secrets stored in AWS SSM Parameter Store
- [ ] No hardcoded credentials in source code
- [ ] ECS tasks running in private subnets
- [ ] Security groups properly configured
- [ ] IAM roles follow least privilege principle
- [ ] HTTPS enabled for all external communications
- [ ] Database connections encrypted
- [ ] File uploads validated and sanitized
