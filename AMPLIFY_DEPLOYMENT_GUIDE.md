# 🚀 AWS Amplify Deployment Guide for Chicago Hub

## Prerequisites
- ✅ Backend deployed to ECS (Chicago Hub service running)
- ✅ GitHub repository with latest code
- ✅ AWS account with Amplify access

## 🎯 Quick Deployment Steps

### 1. Connect to AWS Amplify Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** as the source
4. Choose your repository: `chicago-hub-mongo`
5. Select branch: `main`

### 2. Configure Build Settings

The `amplify.yml` file is already configured in your repository. Amplify will automatically detect it.

**Build Configuration:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

### 3. Configure Redirects

The `public/_redirects` file is already configured to route API calls to your Chicago Hub backend:

```
/api/* http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/api/:splat 200
/*    /index.html   200
```

### 4. Deploy!

1. Click **"Save and deploy"**
2. Wait for the build to complete (usually 3-5 minutes)
3. Your app will be available at: `https://[random-id].amplifyapp.com`

## 🔧 Backend Connection Status

### ✅ Current Backend Setup:
- **ECS Service**: `chicago-hub-service` 
- **Load Balancer**: `empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com`
- **API Path**: `/chicago-hub/api/*`
- **Health Check**: Available at `/chicago-hub/health`

### 🧪 Test Backend Connection:

```bash
# Test health endpoint
curl http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/health

# Test survey endpoint (should return 405 Method Not Allowed for GET)
curl http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/api/survey
```

## 📱 Frontend Features Ready:

1. **✅ Survey Form**: "Apply to Network" button with multi-step form
2. **✅ API Integration**: Survey submissions to MongoDB
3. **✅ Admin Panel**: Survey management for admins
4. **✅ Responsive Design**: Mobile-friendly UI

## 🎉 Post-Deployment Testing:

Once deployed, test these features:

1. **Homepage**: Should load with "Apply to Network" button
2. **Survey Form**: Click button, fill form, submit
3. **Admin Access**: Login as admin to view submissions
4. **API Calls**: Check browser network tab for successful API calls

## 🔗 Important URLs:

- **Frontend**: `https://[your-amplify-id].amplifyapp.com`
- **Backend Health**: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/health`
- **Survey API**: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/api/survey`

## 🛠 Troubleshooting:

### If API calls fail:
1. Check browser console for CORS errors
2. Verify backend service is running in ECS
3. Test backend health endpoint directly

### If build fails:
1. Check build logs in Amplify console
2. Verify all dependencies are in `package.json`
3. Ensure Node.js version compatibility

### If survey form doesn't work:
1. Check network tab for failed API calls
2. Verify MongoDB connection in backend logs
3. Test survey endpoint directly with curl

## 🎯 Next Steps:

After successful deployment:
1. **Custom Domain** (optional): Add custom domain in Amplify Console
2. **Environment Variables**: Add any frontend env vars if needed
3. **Monitoring**: Set up CloudWatch alerts for backend
4. **SSL Certificate**: Automatically handled by Amplify

---

## 🚨 Need Help?

If you encounter issues:
1. Check AWS Amplify build logs
2. Verify ECS service is running: `aws ecs describe-services --cluster empowerlocal-api-cluster --services chicago-hub-service`
3. Test backend health endpoint
4. Check CloudWatch logs: `/ecs/chicago-hub-task`

**Your Chicago Hub is ready to deploy! 🎉**
