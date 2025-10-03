# 🔐 Environment Variables Management Guide

## 🎯 The Problem
- Need `.env` for local development
- Can't commit secrets to GitHub
- Need environment variables in AWS Amplify

## ✅ The Solution

### 1. **Local Development** (.env file)

```bash
# Your .env file (NEVER commit this)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secure-jwt-secret-here
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
# ... other secrets
```

### 2. **GitHub Repository** (env.template)

```bash
# env.template (SAFE to commit)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-secure-jwt-secret-here
OPENAI_API_KEY=your-openai-api-key-here
# ... placeholder values
```

### 3. **AWS Amplify** (Environment Variables in Console)

Set these in **Amplify Console** → **App Settings** → **Environment Variables**:

**Note**: Amplify frontend doesn't need environment variables since it uses API redirects to the ECS backend.

## 🚀 Setup Steps

### Step 1: Secure Your Local Environment

```bash
# 1. Add .env to .gitignore (already done)
echo ".env" >> .gitignore

# 2. Remove .env from git if already tracked
git rm --cached .env

# 3. Create your local .env with real values
cp env.template .env
# Edit .env with your actual secrets
```

### Step 2: For Team Members

```bash
# New team members run:
cp env.template .env
# Then fill in their own values
```

### Step 3: AWS Amplify Configuration

1. **Go to Amplify Console**
2. **Select your app** → **App Settings** → **Environment Variables**
3. **Add frontend variables**:
   ```
   VITE_SUPABASE_PROJECT_ID=vnvbzjcsgyctmbvftlii
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudmJ6amNzZ3ljdG1idmZ0bGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQwNjIsImV4cCI6MjA3MzcwMDA2Mn0.Fg4ZH1o3jwjKOR8JSwwI4Ac68TtTMKjXlZRgOouza2k
   VITE_SUPABASE_URL=https://vnvbzjcsgyctmbvftlii.supabase.co
   ```

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env` in `.gitignore`
- Use `env.template` for documentation
- Set production variables in Amplify Console
- Use different secrets for different environments
- Rotate secrets regularly

### ❌ DON'T:
- Commit `.env` files to git
- Put secrets in code comments
- Use the same secrets across environments
- Share secrets in chat/email

## 🏗 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Dev     │    │     GitHub      │    │   AWS Amplify   │
│                 │    │                 │    │                 │
│ .env (secrets)  │    │ env.template    │    │ Console Env Vars│
│ ├─ MONGODB_URI  │    │ ├─ placeholders │    │ ├─ VITE_* vars  │
│ ├─ JWT_SECRET   │    │ ├─ safe to      │    │ ├─ Frontend only│
│ ├─ API_KEYS     │    │ │   commit      │    │ └─ Production   │
│ └─ Never commit │    │ └─ Team docs    │    │     values      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🧪 Testing Your Setup

```bash
# 1. Check .env is ignored
git status  # Should not show .env as changed

# 2. Test local development
npm run dev  # Should work with your .env

# 3. Test Amplify deployment
# Deploy to Amplify - should work with Console env vars
```

## 🚨 Emergency: If You Accidentally Commit Secrets

```bash
# Remove from git history
git rm --cached .env
git commit -m "Remove .env from tracking"

# If already pushed, rotate all secrets:
# - Change MongoDB password
# - Generate new JWT secret
# - Rotate API keys
# - Update all environments
```

## 📋 Environment Variables Checklist

### Frontend (Amplify Console):
- [x] No environment variables needed - uses API redirects

### Backend (ECS - already configured):
- [x] `MONGODB_URI`
- [x] `JWT_SECRET`
- [x] `OPENAI_API_KEY`
- [x] AWS credentials
- [x] Mailgun configuration

### Local Development (.env):
- [ ] All of the above for testing

---

**✅ Your environment is now secure and ready for deployment!**
