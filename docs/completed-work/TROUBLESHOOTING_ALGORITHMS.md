# Troubleshooting Algorithm Management

## Issue: "Failed to fetch algorithms" error

### Quick Fix Steps:

1. **Restart the server** (most common issue)
   - The new `/api/admin/algorithms` endpoints were just added
   - The server needs to be restarted to load them
   - Stop the server (Ctrl+C) and restart it

2. **Check the browser console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for the detailed error messages now logged:
     - `Fetching algorithms from: ...`
     - `Response status: ...`
     - `Error response: ...`

3. **Check the server logs**
   - Look for these emoji indicators in the terminal:
     - `📊 Admin algorithms request from user: ...`
     - `👤 User profile isAdmin: ...`
     - `✅ Loading algorithms...`
     - `✅ Returning X algorithms`
   - Or error indicators:
     - `❌ Access denied - user is not admin`
     - `❌ Error fetching algorithms: ...`

### Common Issues:

#### 1. Invalid or Expired Token (FIXED)
**Symptom**: "Invalid or expired token"
**Solution**: ✅ Fixed - Now uses `auth_token` from localStorage (matching other admin routes)

#### 2. Server Not Restarted
**Symptom**: 404 error, "Failed to fetch algorithms"
**Solution**: Restart the development server

#### 3. Not Logged In as Admin
**Symptom**: 403 error, "Admin access required"
**Solution**: 
- Make sure you're logged in
- Verify your user has `isAdmin: true` in the database
- Run: `db.user_profiles.findOne({ userId: "YOUR_USER_ID" })`
- Update if needed: `db.user_profiles.updateOne({ userId: "YOUR_USER_ID" }, { $set: { isAdmin: true } })`

#### 4. MongoDB Not Connected
**Symptom**: 500 error, "Failed to fetch algorithms"
**Solution**: 
- Check MongoDB connection string in `.env`
- Verify MongoDB is running
- Check server logs for connection errors

#### 5. CORS Issue (if frontend on different port)
**Symptom**: Network error, CORS error in console
**Solution**: 
- Make sure Vite proxy is configured correctly
- Or ensure CORS is enabled in server for your frontend origin

### Debug Commands:

Check if endpoint is registered:
```bash
curl http://localhost:5001/api/admin/algorithms -H "Authorization: Bearer YOUR_TOKEN"
```

Check MongoDB collection:
```bash
mongosh
use your_database_name
db.algorithm_configs.find().pretty()
```

Check user admin status:
```bash
mongosh
use your_database_name
db.user_profiles.find({ isAdmin: true }).pretty()
```

### Expected Behavior:

When working correctly, you should see:
1. **Browser Console**:
   - `Fetching algorithms from: /api/admin/algorithms`
   - `Response status: 200`
   - `Algorithms loaded: { algorithms: [...] }`

2. **Server Console**:
   - `📊 Admin algorithms request from user: ...`
   - `👤 User profile isAdmin: true`
   - `✅ Loading algorithms...`
   - `✅ Returning 4 algorithms` (or however many you have)

3. **UI**:
   - List of algorithm cards displayed
   - Each shows name, description, constraints
   - "Edit" button on each card

---

## Still Having Issues?

1. Check all the console outputs (both browser and server)
2. Verify the exact error message
3. Check that:
   - Server is running on expected port
   - MongoDB is connected
   - You're logged in as admin user
   - No JavaScript errors in browser console

