# 🚀 Current Production Setup - Chicago Hub

## Overview
This document describes the current production configuration for the Chicago Hub application as of the latest deployment.

## Architecture

### Frontend (AWS Amplify)
- **Domain**: `https://main.dbn59dj42j2z3.amplifyapp.com`
- **Configuration**: `amplify.yml` with environment variable `VITE_API_BASE_URL`
- **API Endpoint**: `https://hubapi.empowerlocal.co/api`

### Backend (AWS ECS)
- **Service**: `chicago-hub-service`
- **Cluster**: `empowerlocal-api-cluster`
- **Task Definition**: `chicago-hub-api:2`
- **Container**: `chicago-hub-api` on port 3001

### Load Balancer (AWS ALB)
- **Name**: `chicago-hub-api-clean`
- **Domain**: `https://hubapi.empowerlocal.co`
- **SSL Certificate**: `*.empowerlocal.co` (AWS Certificate Manager)
- **Target Group**: `chicago-hub-api-direct`

### Database
- **MongoDB Atlas**: Production cluster
- **Connection**: Via SSM Parameter Store secret

## Environment Variables

### ECS Task Definition (Secrets from SSM)
- `JWT_SECRET` - JWT signing secret
- `MONGODB_URI` - MongoDB connection string
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_S3_BUCKET` - S3 bucket name
- `MAILGUN_API_KEY` - Email service API key
- `MAILGUN_DOMAIN` - Email domain
- `FRONTEND_URL` - CORS origin (Amplify domain)

### Amplify Environment Variables
- `VITE_API_BASE_URL` - API base URL for frontend

## Security Configuration

### CORS
- **Origin**: `https://main.dbn59dj42j2z3.amplifyapp.com`
- **Credentials**: `true`
- **Methods**: All standard HTTP methods

### SSL/TLS
- **Certificate**: `*.empowerlocal.co` from AWS Certificate Manager
- **Protocol**: TLS 1.2
- **Port**: 443 (HTTPS only)

### IAM Roles
- **ECS Task Execution Role**: `ecsTaskExecutionRole` with SSM access
- **ECS Task Role**: `ecsTaskRole` for AWS service access

## Network Configuration

### VPC
- **Region**: `us-east-2`
- **Subnets**: Private subnets for ECS tasks
- **Security Groups**: Configured for port 3001 and HTTPS

### DNS
- **Route 53**: CNAME record `hubapi.empowerlocal.co` → ALB DNS name
- **Certificate**: Wildcard certificate for `*.empowerlocal.co`

## Monitoring

### CloudWatch
- **Log Group**: `/ecs/chicago-hub-api`
- **Metrics**: CPU, Memory, Network
- **Alarms**: Health check failures

### Health Checks
- **ECS**: Container health check on port 3001
- **ALB**: HTTP health check on `/health` endpoint
- **Target Group**: Health check every 30 seconds

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /chicago-hub/health` - Load balancer health check

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/logout` - User logout

### Publications
- `GET /api/publications` - List all publications
- `GET /api/publications/:id` - Get specific publication

### Packages
- `GET /api/packages` - List packages
- `POST /api/packages` - Create package

### Files
- `POST /api/files/upload` - Upload files
- `GET /api/files/documents` - List documents

## Troubleshooting

### Common Issues
1. **502 Bad Gateway**: Check ECS task health and target group registration
2. **CORS Errors**: Verify `FRONTEND_URL` SSM parameter matches Amplify domain
3. **SSL Errors**: Check certificate validity and domain configuration
4. **Database Connection**: Verify MongoDB URI and network connectivity

### Debug Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster empowerlocal-api-cluster --services chicago-hub-service

# Check target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-2:947442015939:targetgroup/chicago-hub-api-direct/3d3a625170dc84fc

# Test API directly
curl https://hubapi.empowerlocal.co/health

# Check logs
aws logs get-log-events --log-group-name /ecs/chicago-hub-api --log-stream-name ecs/chicago-hub-api/task-id
```

## Deployment Process

### Frontend (Amplify)
1. Push changes to main branch
2. Amplify automatically builds and deploys
3. Environment variables are injected at build time

### Backend (ECS)
1. Build and push Docker image to ECR
2. Update task definition if needed
3. Force new deployment: `aws ecs update-service --force-new-deployment`

## Maintenance

### Regular Tasks
- Monitor CloudWatch logs for errors
- Check SSL certificate expiration
- Review security group rules
- Update dependencies as needed

### Scaling
- ECS service can be scaled up/down as needed
- Consider auto-scaling based on CPU/memory metrics
- ALB can handle multiple ECS tasks automatically

## Security Notes

- All secrets stored in AWS SSM Parameter Store
- No hardcoded credentials in source code
- HTTPS enforced for all communications
- CORS properly configured for production domain
- Database connections encrypted
- File uploads validated and sanitized
