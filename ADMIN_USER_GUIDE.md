# Admin User Management Guide

## Overview
This guide explains how to manage admin users in the Chicago Hub application, including granting and revoking admin privileges.

## Features

### 1. "Make Admin" Button
- Located on each user card in the Admin Dashboard → User Management section
- Allows existing admins to grant or revoke admin privileges for any user
- Shows real-time feedback with loading states and toast notifications

### 2. "Make Me Admin" Button (Bootstrap Feature)
- Located at the top of the User Management page
- Allows the first user to become an admin when no admins exist
- **Note**: This is a temporary bootstrap feature for development/testing

## Getting Started

### Option 1: Bootstrap First Admin via UI

1. **Log in** to your account
2. Navigate to the **Admin Dashboard** (if you can access it)
3. Go to the **User Management** tab
4. Click the **"Make Me Admin"** button at the top right
5. Wait for the success message
6. **Refresh the page** to see your new admin status

### Option 2: Bootstrap First Admin via Command Line

If you need to make a specific user an admin via the database:

```bash
npm run make-admin <user-email>
```

**Example:**
```bash
npm run make-admin admin@chicagohub.com
```

This script will:
- Find the user by email address
- Update their profile to grant admin privileges
- Confirm the update

### Option 3: Make Specific User Admin by ID

If you know the user's ID:

```bash
tsx src/scripts/makeUserAdminById.ts <userId>
```

## Using the Admin Management Features

### Granting Admin Privileges

1. Log in as an admin user
2. Navigate to **Admin Dashboard** → **User Management**
3. Find the user you want to make an admin
4. Click the **"Make Admin"** button on their user card
5. Confirm the success toast notification
6. The user will immediately have admin privileges

### Revoking Admin Privileges

1. Log in as an admin user
2. Navigate to **Admin Dashboard** → **User Management**
3. Find the admin user you want to revoke privileges from
4. Click the **"Remove Admin"** button (appears red when user is already an admin)
5. Confirm the success toast notification
6. The user's admin privileges are immediately revoked

## Troubleshooting

### Issue: "Make Admin" button doesn't work

**Possible causes and solutions:**

1. **You're not logged in as an admin**
   - Solution: Use the "Make Me Admin" button first, or use the command-line script
   - Error message: "Access denied. You must be an admin to manage user privileges."

2. **Network/API connection issue**
   - Check browser console (F12) for error messages
   - Verify the backend server is running on port 3001
   - Check that the Vite dev server is running on port 8080

3. **User missing required identifiers**
   - Check browser console for error: "Cannot update admin status: missing userId or _id"
   - Solution: User may need to complete their profile or re-authenticate

4. **Database connection issue**
   - Check backend server logs for MongoDB connection errors
   - Verify MONGODB_URI environment variable is set correctly

### Issue: "Make Me Admin" button doesn't work

**Possible causes and solutions:**

1. **Not authenticated**
   - Solution: Log out and log back in to refresh your session

2. **Backend endpoint not responding**
   - Check backend logs for errors
   - Verify the `/api/admin/make-me-admin` endpoint exists

### Issue: Admin status not showing immediately

**Solution:**
- Refresh the page after granting admin privileges
- Log out and log back in to refresh your session
- The admin status should be reflected in the Header (Admin Dashboard menu item appears)

## Debugging

### Enable Detailed Logging

The application now includes detailed console logging for admin operations:

1. Open browser **Developer Tools** (F12)
2. Go to the **Console** tab
3. Perform the admin action (Make Admin / Remove Admin)
4. Check console logs for detailed information:
   - API call parameters
   - Response status codes
   - Error messages
   - Success confirmations

### What to Look For in Logs

**Successful admin grant:**
```
Attempting to grant admin status for user: { userId: "...", email: "...", currentStatus: false, newStatus: true }
API call: Updating admin status for userId=..., isAdmin=true
API response status: 200
API success response: { success: true, profile: {...}, message: "..." }
```

**Permission denied:**
```
API response status: 403
API error response: { error: "Access denied. Admin privileges required." }
```

## Security Considerations

1. **The "Make Me Admin" endpoint should be removed in production** - It's marked as TEMPORARY in the server code
2. Only trusted users should be granted admin privileges
3. Admin users can:
   - Manage publications
   - Upload files
   - Configure storefronts
   - Manage all users
   - View sensitive data

## Technical Details

### Backend Endpoints

- `GET /api/admin/check` - Check if current user is admin
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:userId/admin` - Update user admin status (admin only)
- `POST /api/admin/make-me-admin` - Bootstrap first admin (temporary)

### Database Collections

- `users` - Authentication and basic user data
- `user_profiles` - Extended user profiles including `isAdmin` flag

### Admin Status Storage

The `isAdmin` flag is stored in the `user_profiles` collection:

```javascript
{
  userId: "user_id_here",
  isAdmin: true,  // boolean flag
  // ... other profile fields
}
```

## API Authentication

All admin endpoints require:
1. Valid JWT token in `Authorization: Bearer <token>` header
2. Token stored in localStorage as `auth_token`
3. Current user must have `isAdmin: true` in their profile (except for bootstrap endpoint)

## Need More Help?

Check the following files for implementation details:
- Frontend: `src/components/admin/UserManagement.tsx`
- Backend: `server/index.ts` (search for "admin")
- API: `src/api/admin.ts`
- Service: `src/integrations/mongodb/allServices.ts` (UserProfilesService)

