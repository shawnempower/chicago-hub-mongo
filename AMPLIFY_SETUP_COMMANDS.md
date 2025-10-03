# 🚀 Deploy Chicago Hub to AWS Amplify

## Current Status:
- ✅ **ECS Backend**: Fully configured and running
- ❌ **Amplify Frontend**: Not yet deployed

## Deploy to Amplify (2 Options):

### Option 1: Use AWS CLI
```bash
# Create new Amplify app
aws amplify create-app --profile "Connection 1" \
  --name "chicago-hub" \
  --repository "https://github.com/shawnempower/chicago-hub-mongo" \
  --platform "WEB"

# Connect main branch
aws amplify create-branch --profile "Connection 1" \
  --app-id "NEW_APP_ID" \
  --branch-name "main" \
  --framework "React"

# No environment variables needed - uses API redirects!
```

### Option 2: Use AWS Console (RECOMMENDED)
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** and connect repository: `chicago-hub-mongo`
4. Select branch: `main`
5. Build settings will auto-detect `amplify.yml`
6. **No environment variables needed** - the app uses API redirects!
7. Click **"Save and deploy"**

## Environment Variables Summary:

### ✅ ECS Backend (Already Configured):
- MongoDB, JWT, OpenAI, AWS S3, Mailgun - ALL SET ✅

### ✅ Amplify Frontend:
- No environment variables needed - uses API redirects!

## After Deployment:
- Frontend: `https://[app-id].amplifyapp.com`
- Backend API: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/api/`
- Survey form will work end-to-end!

## Test URLs:
- Health: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/health`
- Survey API: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/api/survey`
