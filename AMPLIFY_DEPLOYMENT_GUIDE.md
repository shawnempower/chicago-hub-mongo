# Amplify Deployment Guide for Chicago Hub

## Overview
This guide explains how to deploy the Chicago Hub frontend to AWS Amplify with the production API configuration.

## Prerequisites
- ✅ API is deployed and working on ECS
- ✅ Clean ALB endpoint is available: `https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com`
- ✅ Frontend code is updated to use environment-based API configuration

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
- Points to production ALB endpoint

## Deployment Steps

### Option 1: Deploy via Amplify Console
1. Go to AWS Amplify Console
2. Select your Chicago Hub app
3. Go to "Environment variables" in the left sidebar
4. Add the following environment variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com`
5. Save and trigger a new deployment

### Option 2: Deploy via Git Push
1. Commit all changes to your repository
2. Push to the main branch
3. Amplify will automatically detect changes and deploy

## Verification

After deployment, verify the following:

### 1. Check Environment Variables
- Open browser dev tools
- Check that `import.meta.env.VITE_API_BASE_URL` is set correctly

### 2. Test API Calls
- Open browser dev tools → Network tab
- Navigate through the app
- Verify API calls go to: `https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com/api/*`

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
- Verify the ALB endpoint is correct
- Check that the API routes are working directly
- Test with: `curl https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com/health`

## Environment Variables Reference

| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_API_BASE_URL` | Not set (uses relative URLs) | `https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com` |
| `API_BASE_URL` | `/api` | `https://chicago-hub-api-clean-1202657911.us-east-2.elb.amazonaws.com/api` |

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