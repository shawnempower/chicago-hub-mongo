# Testing the Asset URL Fix

## Quick Test

1. **Get your auth token:**
   - Log into the application
   - Open browser DevTools (F12)
   - Go to Application/Storage → Local Storage
   - Copy the value of `auth_token`

2. **Run the test script:**
   ```bash
   export TEST_AUTH_TOKEN="your-token-here"
   npx tsx scripts/testAssetUrlFix.ts
   ```

3. **Test a specific campaign:**
   ```bash
   export TEST_AUTH_TOKEN="your-token-here"
   npx tsx scripts/testAssetUrlFix.ts campaign-id-here
   ```

## What the Test Checks

✅ **Signed URLs** - Verifies that S3 assets have signed URLs  
✅ **24-hour Expiration** - Confirms URLs expire in 24 hours (not 1 hour)  
✅ **Fresh URLs** - Ensures URLs are newly generated, not expired  
✅ **Storage Path** - Validates that storagePath is saved correctly  

## Expected Output

### Success
```
📊 Test Results:
────────────────────────────────────────────────────────────────────────────────

📄 Asset: campaign_creative.jpg
   ID: 67456789abcdef123456
   Storage: s3
   Path: users/system/uploads/1234567890_abc123_creative.jpg
   Has Signature: ✅ Yes
   Expiration: 86400s (24h 0m)
   ✅ Correct: 24-hour expiration

────────────────────────────────────────────────────────────────────────────────

📈 Summary:
   Total Assets Tested: 1
   S3 Assets: 1
   Signed URLs: 1
   24-hour Expiration: 1

✅ SUCCESS: All S3 assets have fresh 24-hour signed URLs!
```

### Before the Fix
```
📄 Asset: campaign_creative.jpg
   ID: 67456789abcdef123456
   Storage: s3
   Path: users/system/uploads/1234567890_abc123_creative.jpg
   Has Signature: ✅ Yes
   Expiration: 3600s (1h 0m)
   ⚠️  Warning: Still using 1-hour expiration
```

## Manual Testing

### Test in Browser

1. Upload a campaign asset
2. Note the asset URL from the network tab
3. Wait 2 hours
4. Refresh the campaign page
5. Check if the asset still loads (it should!)

### Test the API Directly

```bash
# Get your auth token first
TOKEN="your-token-here"

# Fetch campaign assets
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/creative-assets/campaign/YOUR_CAMPAIGN_ID

# Check the response - fileUrl should have:
# - X-Amz-Signature parameter
# - X-Amz-Expires=86400 parameter
```

## Troubleshooting

### "API request failed: 401"
- Your auth token expired or is invalid
- Get a fresh token from localStorage

### "No assets found"
- Upload some campaign assets first
- Or specify a campaign ID that has assets

### "S3 service not initialized"
- Check your environment variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - `AWS_REGION`

### Assets still showing "AccessDenied"
- Restart the server to load the new code
- Clear browser cache
- Check server logs for errors

## Next Steps

If tests pass:
1. ✅ The fix is working correctly
2. 💼 Deploy to staging environment
3. 🧪 Test in staging with real users
4. 🚀 Deploy to production

If tests fail:
1. 🔍 Check server logs for errors
2. ✅ Verify S3 credentials are correct
3. 📝 Review the changes in `server/routes/creative-assets.ts`
4. 🆘 Contact the development team

