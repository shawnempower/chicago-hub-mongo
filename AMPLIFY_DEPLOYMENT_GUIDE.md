# 🚀 AWS Amplify Deployment Guide - Chicago Hub

## Current Status
- ✅ **Already Deployed**: https://main.dbn59dj42j2z3.amplifyapp.com
- ✅ **Auto-Deploy**: Connected to GitHub main branch
- ✅ **API Integration**: Connected to https://hubapi.empowerlocal.co

## Overview
This guide covers the AWS Amplify deployment setup for the Chicago Hub frontend, including automatic GitHub integration and environment configuration.

## Configuration Changes Made

### 1. API Configuration (`src/config/api.ts`)
- Created centralized API configuration
- Uses relative URLs in development (Vite proxy)
- Uses environment variable in production

### 2. Updated All API Files
- `src/api/auth.ts` - Authentication endpoints
- `src/api/publications.ts` - Publication management
- `src/api/packages.ts` - Package management
- `src/api/profiles.ts` - User profiles
- `src/api/admin.ts` - Admin functions
- `src/api/leads.ts` - Lead management
- `src/components/dashboard/DocumentManager.tsx` - Document management

### 3. Amplify Configuration (`amplify.yml`)
- Added environment variable: `VITE_API_BASE_URL`
- Points to custom domain: `https://hubapi.empowerlocal.co`

## 🔄 Automatic Deployment

The Chicago Hub is configured for **automatic deployment**:

1. **Push to GitHub**: Any commit to the `main` branch triggers a deployment
2. **Build Process**: Amplify uses the `amplify.yml` configuration
3. **Environment Variables**: Automatically injected during build
4. **Deploy Time**: Typically 3-5 minutes

### Manual Deployment (if needed)
If you need to manually trigger a deployment:

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select the Chicago Hub app
3. Click "Redeploy this version" or trigger new build

## Verification

After deployment, verify the following:

### 1. Check Environment Variables
- Open browser dev tools
- Check that `import.meta.env.VITE_API_BASE_URL` is set correctly

### 2. Test API Calls
- Open browser dev tools → Network tab
- Navigate through the app
- Verify API calls go to: `https://hubapi.empowerlocal.co/api/*`

### 3. Test Key Features
- User authentication (signup/login)
- Publication browsing
- Package management
- Document uploads
- Admin functions

## Troubleshooting

### API Calls Still Going to Localhost
- Check that environment variable is set in Amplify
- Verify the build is using the updated code
- Clear browser cache

### CORS Issues
- The API is configured to allow all origins
- Check browser console for CORS errors
- Verify ALB is accessible from the frontend domain

### 404 Errors on API Calls
- Verify the custom domain is correct
- Check that the API routes are working directly
- Test with: `curl https://hubapi.empowerlocal.co/health`

## Environment Variables Reference

| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_API_BASE_URL` | Not set (uses relative URLs) | `https://hubapi.empowerlocal.co` |
| `API_BASE_URL` | `/api` | `https://hubapi.empowerlocal.co/api` |

## API Endpoints

The following endpoints are available in production:

- `GET /health` - Health check
- `GET /api/test` - Test endpoint
- `GET /api/publications` - Get all publications
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/packages` - Get packages
- `POST /api/files/upload` - File upload
- And all other API routes as defined in the backend

## Security Notes

- All API calls include authentication headers when user is logged in
- CORS is configured to allow the frontend domain
- Environment variables are injected at build time (not runtime)
- API endpoints are protected by authentication middleware

## Support

If you encounter issues:
1. Check the Amplify build logs
2. Verify the API is accessible directly
3. Check browser console for errors
4. Ensure all environment variables are set correctly