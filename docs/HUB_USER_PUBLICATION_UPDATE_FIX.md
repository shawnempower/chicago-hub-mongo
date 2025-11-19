# Hub User Publication Update Fix

## Issue
Hub users were getting "Admin access required" error when trying to update publications that were part of their assigned hubs. After the initial fix, they got "You do not have access to this publication" error.

## Root Causes

### Issue 1: Admin-only Check (Fixed)
The publication update endpoint (`PUT /api/publications/:id`) and related file management endpoints in `server/routes/publications.ts` were only checking for admin access instead of using the proper permission middleware that validates hub-level access.

### Issue 2: ID Format Mismatch (Fixed)
The `canAccessPublication` method had an ID format mismatch:
- The frontend passes the MongoDB `_id` (string format) to the API
- The `user_publication_access` junction table stores the numeric `publicationId` field
- The permission check was comparing the string `_id` against the numeric `publicationId`, causing it to always fail

Publications have two ID fields:
- `_id`: MongoDB ObjectId (string, e.g., "507f1f77bcf86cd799439011")
- `publicationId`: Numeric identifier (integer, e.g., 1001)

## Solution

### Fix 1: Use Proper Permission Middleware
Updated the following endpoints to use the `requirePublicationAccess` middleware instead of manual admin-only checks:

### Updated Endpoints

1. **Update Publication** (Line 173)
   - Before: Manual admin check via `userProfilesService.getByUserId()` 
   - After: Uses `requirePublicationAccess('id')` middleware
   - Route: `PUT /:id`

2. **Upload Publication File** (Line 335)
   - Before: Manual admin check
   - After: Uses `requirePublicationAccess('publicationId')` middleware
   - Route: `POST /:publicationId/files`

3. **Update File Metadata** (Line 399)
   - Before: Manual admin check
   - After: Uses `requirePublicationAccess('publicationId')` middleware
   - Route: `PUT /:publicationId/files/:fileId`

4. **Delete File** (Line 432)
   - Before: Manual admin check
   - After: Uses `requirePublicationAccess('publicationId')` middleware
   - Route: `DELETE /:publicationId/files/:fileId`

### Fix 2: Normalize Publication IDs in Permission Check
Updated `canAccessPublication` method in `src/integrations/mongodb/permissionsService.ts` to:
1. Look up the publication by the provided ID (could be `_id` OR `publicationId`)
2. Extract the numeric `publicationId` from the publication record
3. Check the junction table using the numeric `publicationId`

This ensures the permission check works regardless of which ID format the API receives.

## How requirePublicationAccess Works

The middleware (`server/middleware/authenticate.ts`):
1. Automatically allows admin users full access
2. For non-admin users, checks `permissionsService.canAccessPublication()` which:
   - First looks up the publication to normalize the ID format
   - Extracts the numeric `publicationId` from the publication record
   - Checks the `user_publication_access` junction table using the numeric ID
   - Returns true if an access record exists (from direct, hub, or group assignment)

## Impact

**Before Fix:**
- Only admins could update publications
- Hub users got "Admin access required" error even for their assigned publications

**After Fix:**
- Admins can still update all publications
- Hub users can now update publications within their assigned hubs
- Publication users can update their specifically assigned publications
- Proper permission errors if user truly doesn't have access

## Testing Recommendations

1. **Test as Hub User:**
   - Log in as a user with hub access
   - Navigate to a publication in your assigned hub
   - Try to update inventory/settings
   - Should succeed without errors

2. **Test as Publication User:**
   - Log in as a user with specific publication access
   - Try to update your assigned publication
   - Should succeed

3. **Test Authorization Boundaries:**
   - Try to update a publication NOT in your assigned hub
   - Should get "You do not have access to this publication" error

4. **Test File Management:**
   - Upload files to your publication
   - Update file metadata
   - Delete files
   - All should work for hub/publication users

## Related Files
- `server/routes/publications.ts` - Updated to use permission middleware (Fix 1)
- `src/integrations/mongodb/permissionsService.ts` - Updated `canAccessPublication` to normalize IDs (Fix 2)
- `server/middleware/authenticate.ts` - Permission middleware (no changes needed)
- `src/api/publications.ts` - Frontend API (no changes needed)

## Technical Details

### Junction Table Structure
The `user_publication_access` collection stores access records like:
```json
{
  "userId": "507f191e810c19729de860ea",
  "publicationId": "1001",  // Stored as string of numeric ID
  "grantedVia": "hub",
  "grantedViaId": "chicago-hub",
  "grantedAt": "2024-01-15T10:30:00Z",
  "grantedBy": "admin_user_id"
}
```

### ID Resolution Flow
1. Frontend calls `PUT /api/publications/507f1f77bcf86cd799439011` (MongoDB _id)
2. `requirePublicationAccess` middleware extracts `id` = "507f1f77bcf86cd799439011"
3. `canAccessPublication("user_id", "507f1f77bcf86cd799439011")` is called
4. Method queries publications collection for `_id` OR `publicationId` matching the string
5. Finds publication with `_id: "507f1f77bcf86cd799439011"` and `publicationId: 1001`
6. Checks junction table for `userId` + `publicationId: "1001"`
7. Returns true if record exists

## Troubleshooting

If a hub user still can't access their publications after this fix, the `user_publication_access` junction table might not be properly populated. Use these scripts to diagnose and fix:

### 1. Verify User Access
Check if the user's access records are correct:
```bash
npx tsx scripts/verifyUserPublicationAccess.ts <userId>
```

This will show:
- User's permission settings
- Publications in their assigned hubs
- Access records in the junction table
- Any missing or inconsistent records

### 2. Fix Missing Access Records
If access records are missing, sync them:

For a specific hub:
```bash
npx tsx scripts/fixHubPublicationAccess.ts <userId> <hubId>
```

For all of the user's hubs:
```bash
npx tsx scripts/fixHubPublicationAccess.ts <userId> --all
```

### 3. Finding User IDs
Find a user's ID by their email:
```bash
npx tsx scripts/findUserByEmail.ts user@example.com
```

This will show the user's ID, role, and permissions, plus suggest the correct verification/fix commands.

Alternative methods:
- Check the JWT token payload in browser dev tools (Application > Local Storage > auth_token)
- Query MongoDB directly: `db.users.findOne({ email: "user@example.com" })`

## Migration Notes
No database migration needed. This fix uses the existing permission system that was already in place but not being utilized by these endpoints.

However, if you've recently assigned users to hubs and they don't have access, you may need to run the `fixHubPublicationAccess.ts` script to populate the junction table retroactively.

