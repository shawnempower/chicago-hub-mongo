# 🚀 MongoDB Database Name Configuration Deployment Guide

## Overview

The MongoDB database name has been made configurable via the `MONGODB_DB_NAME` environment variable. This allows you to easily switch between production and staging databases without code changes.

## Changes Made

### 1. **Code Changes**
- ✅ Updated `src/integrations/mongodb/client.ts` to use `process.env.MONGODB_DB_NAME`
- ✅ Falls back to `'chicago-hub'` if not specified

### 2. **Configuration Files Updated**
- ✅ `env.template` - Added `MONGODB_DB_NAME=chicago-hub`
- ✅ `ecs-task-definition.json` - Added SSM parameter reference

### 3. **Documentation Updated**
- ✅ `PRODUCTION_ENV_VARIABLES.md`
- ✅ `ENV_MANAGEMENT_GUIDE.md`
- ✅ `README.md`

## 🔧 Required Deployment Steps

### Step 1: Create AWS SSM Parameter

You need to create a new AWS Systems Manager Parameter Store entry for the database name:

```bash
# For production (chicago-hub database)
aws ssm put-parameter \
  --name "/chicago-hub/mongodb-db-name" \
  --value "chicago-hub" \
  --type "String" \
  --description "MongoDB database name for Chicago Hub" \
  --region us-east-2

# Verify the parameter was created
aws ssm get-parameter \
  --name "/chicago-hub/mongodb-db-name" \
  --region us-east-2
```

### Step 2: Update IAM Policy (if needed)

Ensure your ECS task execution role has permission to access the new SSM parameter. The policy should include:

```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameters",
    "ssm:GetParameter"
  ],
  "Resource": [
    "arn:aws:ssm:us-east-2:947442015939:parameter/chicago-hub/*"
  ]
}
```

This should already be configured based on your existing `chicago-hub-ssm-policy.json`, but verify if you encounter permission issues.

### Step 3: Update ECS Task Definition

The `ecs-task-definition.json` file has already been updated with the new parameter:

```json
{
  "name": "MONGODB_DB_NAME",
  "valueFrom": "arn:aws:ssm:us-east-2:947442015939:parameter/chicago-hub/mongodb-db-name"
}
```

Deploy the updated task definition:

```bash
# Register the new task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-2

# Update the service to use the new task definition
aws ecs update-service \
  --cluster chicago-hub-cluster \
  --service chicago-hub-service \
  --task-definition chicago-hub-api \
  --force-new-deployment \
  --region us-east-2
```

### Step 4: Update Local Environment

For local development, update your `.env` file:

```bash
# Add this line to your .env file
MONGODB_DB_NAME=chicago-hub
```

Or use the template:

```bash
cp env.template .env
# Then edit with your actual values
```

## 🧪 Testing

### Local Testing

```bash
# Verify the environment variable is loaded
npm run dev

# Check the server logs - should show:
# "🔧 Creating new MongoDB client..."
# "✅ Connected to MongoDB..."
```

### Production Testing

After deployment:

1. Check ECS task logs in CloudWatch
2. Verify the application connects successfully
3. Confirm database operations work correctly

```bash
# View ECS service logs
aws logs tail /ecs/chicago-hub-api --follow --region us-east-2
```

## 🔄 Switching Databases (Production vs Staging)

To switch between databases, simply update the SSM parameter:

```bash
# Switch to staging database
aws ssm put-parameter \
  --name "/chicago-hub/mongodb-db-name" \
  --value "staging-chicago-hub" \
  --overwrite \
  --region us-east-2

# Force new deployment to pick up the change
aws ecs update-service \
  --cluster chicago-hub-cluster \
  --service chicago-hub-service \
  --force-new-deployment \
  --region us-east-2
```

## 📋 Verification Checklist

- [ ] AWS SSM parameter created (`/chicago-hub/mongodb-db-name`)
- [ ] IAM permissions verified
- [ ] ECS task definition registered with new parameter
- [ ] ECS service updated with new task definition
- [ ] Local `.env` file updated
- [ ] Application tested locally
- [ ] Application tested in production
- [ ] Database operations verified

## 🚨 Rollback Plan

If issues occur:

1. **Revert to previous task definition**:
```bash
aws ecs update-service \
  --cluster chicago-hub-cluster \
  --service chicago-hub-service \
  --task-definition chicago-hub-api:PREVIOUS_REVISION \
  --region us-east-2
```

2. **The code still works without the parameter** - it falls back to `'chicago-hub'`

3. **Check CloudWatch logs** for error messages

## 💡 Benefits

✅ **Flexibility**: Easily switch between production and staging databases
✅ **Security**: Database name stored in AWS SSM, not hardcoded
✅ **Environment Parity**: Same code runs in all environments
✅ **Backward Compatible**: Falls back to default if not set
✅ **Easy Testing**: Can test against different databases without code changes

## 📞 Support

If you encounter issues:

1. Check CloudWatch logs: `/ecs/chicago-hub-api`
2. Verify SSM parameter exists and is accessible
3. Ensure IAM permissions are correct
4. Check MongoDB connection string is valid

---

**Status**: ✅ Code changes complete, awaiting AWS deployment

