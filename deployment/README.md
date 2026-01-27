# 🚀 Chicago Hub - Deployment Configuration

This directory contains all deployment-related configuration files and documentation for the Chicago Hub application.

## 📁 Directory Structure

```
deployment/
├── README.md                              # This file - deployment overview
├── deploy-all-production.sh               # Deploy EVERYTHING to production (frontend + backend)
├── deploy-all-staging.sh                  # Deploy EVERYTHING to staging (frontend + backend)
├── deploy-backend-production.sh           # Production backend (ECS) deployment
├── deploy-backend-staging.sh              # Staging backend (ECS) deployment
├── deploy-frontend-production.sh          # Production frontend (Amplify) deployment
├── deploy-frontend-staging.sh             # Staging frontend (Amplify) deployment
├── deploy-to-ecs.sh                       # Legacy: Production ECS deployment
├── deploy-staging.sh                      # Legacy: Staging ECS deployment
├── docker/                                # Docker configuration
│   ├── Dockerfile                         # Development Docker image
│   └── Dockerfile.production              # Production Docker image (ECS Fargate)
├── aws/                                   # AWS infrastructure configuration
│   ├── amplify.yml                        # Production Amplify build configuration
│   ├── amplify-staging.yml                # Staging Amplify build configuration
│   ├── ecs-task-definition.json           # Production ECS task definition
│   ├── ecs-task-definition-staging.json   # Staging ECS task definition
│   └── chicago-hub-ssm-policy.json        # IAM policy for SSM Parameter Store
└── docs/                                  # Deployment documentation
    ├── PRODUCTION_DEPLOYMENT_GUIDE.md     # Backend (ECS) deployment guide
    ├── AMPLIFY_DEPLOYMENT_GUIDE.md        # Frontend (Amplify) deployment guide
    ├── STAGING_SETUP_GUIDE.md             # Staging environment setup guide
    └── CURRENT_PRODUCTION_SETUP.md        # Current production configuration
```

## ⚠️ Pre-Deployment Required: Hub System Migration

**Before deploying to production**, you must apply database changes for the hub system:

```bash
# 1. Verify production database state
MONGODB_DB_NAME=chicago-hub npm run verify:production

# 2. Run migration (after backup!)
MONGODB_DB_NAME=chicago-hub npm run migrate:hubs
```

**See:** [`/DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md) and [`/docs/HUB_PRODUCTION_DEPLOYMENT.md`](../docs/HUB_PRODUCTION_DEPLOYMENT.md)

---

## 🎯 Quick Deployment

### 🏭 Production Environment

#### ⚡ Full Stack Deployment (Recommended)
Deploy both backend and frontend with a single command:
```bash
./deployment/deploy-all-production.sh
```
This will:
1. Deploy backend API to ECS
2. Deploy frontend to Amplify
3. Show total deployment time
4. Provide verification checklist

**Or deploy individually:**
```bash
# Deploy backend (ECS)
./deployment/deploy-backend-production.sh

# Deploy frontend (Amplify)
./deployment/deploy-frontend-production.sh
```

#### Frontend Only (AWS Amplify)
```bash
./deployment/deploy-frontend-production.sh
```
- **Manual deployment** (auto-deploy from GitHub is disabled)
- **App URL:** https://admin.localmedia.store
- **Documentation:** [`docs/AMPLIFY_DEPLOYMENT_GUIDE.md`](./docs/AMPLIFY_DEPLOYMENT_GUIDE.md)

#### Backend Only (AWS ECS)
```bash
./deployment/deploy-backend-production.sh
# Or use legacy script: ./deployment/deploy-to-ecs.sh
```
- **API URL:** https://api.localmedia.store
- **Documentation:** [`docs/PRODUCTION_DEPLOYMENT_GUIDE.md`](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

---

### 🚧 Staging Environment

#### ⚡ Full Stack Deployment (Recommended)
Deploy both backend and frontend with a single command:
```bash
./deployment/deploy-all-staging.sh
```
This will:
1. Deploy backend API to ECS
2. Deploy frontend to Amplify
3. Show total deployment time
4. Provide verification checklist

**Or deploy individually:**
```bash
# Deploy backend (ECS)
./deployment/deploy-backend-staging.sh

# Deploy frontend (Amplify)
./deployment/deploy-frontend-staging.sh
```

#### Frontend Only (AWS Amplify)
```bash
./deployment/deploy-frontend-staging.sh
```
- **Manual deployment** (no auto-deploy)
- **App URL:** https://staging-admin.localmedia.store

#### Backend Only (AWS ECS)
```bash
./deployment/deploy-backend-staging.sh
# Or use: ./deployment/deploy-staging.sh
```
- **API URL:** https://staging-api.localmedia.store

**First-time Setup:** See [`docs/STAGING_SETUP_GUIDE.md`](./docs/STAGING_SETUP_GUIDE.md) for complete staging environment setup instructions.

#### Key Differences from Production
- **Service:** `chicago-hub-service-staging` (separate from production)
- **Image Tag:** `:staging` (vs `:latest` for production)
- **SSM Parameters:** `/chicago-hub-staging/*` namespace
- **Database:** `staging-chicago-hub` (separate from production)
- **Deployment:** Manual control (no auto-deploy)

## 📦 Docker Images

### Development Image
- **File:** `docker/Dockerfile`
- **Purpose:** Local development and testing
- **Build:** `docker build -f deployment/docker/Dockerfile -t chicago-hub:dev .`

### Production Image
- **File:** `docker/Dockerfile.production`
- **Purpose:** AWS ECS Fargate deployment
- **Platform:** `linux/amd64` (required for ECS)
- **Build:** Automated by `deploy-to-ecs.sh`

## ☁️ AWS Infrastructure

### Amplify Configuration
- **File:** `aws/amplify.yml`
- **Purpose:** Defines build steps and environment variables for frontend
- **Auto-deploys:** On push to `main` branch

### ECS Task Definition
- **File:** `aws/ecs-task-definition.json`
- **Purpose:** Defines container configuration, resources, and environment
- **Secrets:** Pulled from AWS Systems Manager Parameter Store

### IAM Policy
- **File:** `aws/chicago-hub-ssm-policy.json`
- **Purpose:** Grants ECS tasks permission to read SSM parameters
- **Usage:** Attach to ECS Task Execution Role

## 🔒 Secrets Management

All sensitive environment variables are stored in **AWS Systems Manager Parameter Store**.

### Production Parameters (`/chicago-hub/*`)

- `/chicago-hub/jwt-secret`
- `/chicago-hub/mongodb-uri`
- `/chicago-hub/mongodb-db-name`
- `/chicago-hub/aws-access-key-id`
- `/chicago-hub/aws-secret-access-key`
- `/chicago-hub/s3-bucket`
- `/chicago-hub/mailgun-api-key`
- `/chicago-hub/mailgun-domain`
- `/chicago-hub/storefront-*` (CloudFront/Route53 configuration)

### Staging Parameters (`/chicago-hub-staging/*`)

Same parameter names, but under `/chicago-hub-staging/*` namespace with staging-specific values.

**Setup Guides:**
- Production: [`docs/PRODUCTION_DEPLOYMENT_GUIDE.md`](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- Staging: [`docs/STAGING_SETUP_GUIDE.md`](./docs/STAGING_SETUP_GUIDE.md)

## 🏗️ Current Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (AWS Amplify)                                      │
│  └─ https://admin.localmedia.store                          │
│     │                                                         │
│     └──> API calls to: https://api.localmedia.store         │
│                         │                                     │
│                         ▼                                     │
│  Backend (AWS ECS Fargate)                                   │
│  ├─ Load Balancer: chicago-hub-api-clean                    │
│  ├─ Service: chicago-hub-service                            │
│  ├─ Task: chicago-hub-api:2                                 │
│  └─ Container: Port 3001                                     │
│     │                                                         │
│     └──> Database: MongoDB Atlas                             │
│     └──> Storage: AWS S3                                     │
│     └──> Email: Mailgun                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

See [`docs/CURRENT_PRODUCTION_SETUP.md`](./docs/CURRENT_PRODUCTION_SETUP.md) for complete details.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md) | Complete backend production deployment guide |
| [STAGING_SETUP_GUIDE.md](./docs/STAGING_SETUP_GUIDE.md) | Complete staging environment setup guide |
| [AMPLIFY_DEPLOYMENT_GUIDE.md](./docs/AMPLIFY_DEPLOYMENT_GUIDE.md) | Frontend deployment and configuration |
| [CURRENT_PRODUCTION_SETUP.md](./docs/CURRENT_PRODUCTION_SETUP.md) | Current production architecture and config |

## 🔧 Environment Variables

For local development, use `env.template` in the project root:

```bash
cp env.template .env
# Edit .env with your local values
```

For production, all environment variables are managed through:
- **Frontend:** AWS Amplify environment variables
- **Backend:** AWS Systems Manager Parameter Store

## 🆘 Troubleshooting

### Common Deployment Issues

1. **Docker platform mismatch**
   - Error: "Manifest does not contain descriptor matching platform 'linux/amd64'"
   - Solution: Use `deploy-to-ecs.sh` or build with `--platform linux/amd64`

2. **ECS task fails to start**
   - Check CloudWatch logs for the task
   - Verify SSM parameters are set correctly
   - Ensure IAM policy is attached to Task Execution Role

3. **Amplify build fails**
   - Check build logs in Amplify console
   - Verify `VITE_API_BASE_URL` environment variable is set

See deployment guides for detailed troubleshooting steps.

## 📞 Support

For deployment issues or questions, consult the documentation files or contact the DevOps team.

