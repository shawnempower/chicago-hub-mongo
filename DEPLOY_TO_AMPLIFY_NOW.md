# 🚀 Deploy Chicago Hub to AWS Amplify - Step by Step

## 📋 Quick Deploy Instructions:

### **Step 1: Open AWS Amplify Console**
👉 **Click this link**: [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

### **Step 2: Create New App**
1. Click **"New app"** button
2. Select **"Host web app"**
3. Choose **"GitHub"** as the source

### **Step 3: Connect Repository**
1. **Repository**: Select `chicago-hub-mongo`
2. **Branch**: Select `main`
3. Click **"Next"**

### **Step 4: Configure Build Settings**
✅ **Build settings will auto-detect** `amplify.yml` - no changes needed!

The detected settings should show:
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

### **Step 5: Environment Variables**
🎉 **SKIP THIS STEP** - No environment variables needed!
(The app uses API redirects to your ECS backend)

### **Step 6: Deploy!**
1. Click **"Save and deploy"**
2. ⏳ Wait 3-5 minutes for build completion
3. 🎉 Your app will be live!

## 🔗 **Your URLs After Deployment:**

### **Frontend (Amplify):**
- **Live App**: `https://[app-id].amplifyapp.com`
- **Build Status**: Check in Amplify Console

### **Backend (ECS - needs fixing):**
- **Health**: `http://empowerlocal-api-lb-1173133034.us-east-2.elb.amazonaws.com/chicago-hub/health`
- **Status**: Currently failing (survey import issues)

## 🧪 **What You Can Test:**

### ✅ **Working Features:**
- Homepage loading
- Navigation
- Media Partners page
- Packages page  
- Basic UI components
- Authentication (login/signup)

### ❌ **Not Working Yet:**
- Survey form ("Apply to Network" button)
- AI assistant features
- Any backend API calls

## 📊 **Expected Build Time:**
- **Typical**: 3-5 minutes
- **First build**: May take up to 8 minutes

## 🔧 **If Build Fails:**
Check the build logs in Amplify Console for:
1. **Dependency issues**: Usually auto-resolved
2. **Build command errors**: Should use our `amplify.yml` config
3. **Memory issues**: Rare, but Amplify will retry

## 🎯 **Next Steps After Deployment:**
1. ✅ **Test the frontend** at your Amplify URL
2. 🔧 **Fix backend survey issues** (if needed)
3. 🚀 **Full end-to-end testing**

---

## 🚨 **Ready to Deploy?**

**👉 Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/) and follow the steps above!**

Your Chicago Hub frontend will be live in minutes! 🎉

