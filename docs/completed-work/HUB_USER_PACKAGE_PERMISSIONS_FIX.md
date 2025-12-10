# Hub User Package Permissions Fix

## Problem
Hub users were unable to save, update, or manage hub packages for their assigned hubs. The backend routes only allowed admin users to perform these operations, blocking hub users from managing packages.

## Root Cause
All hub package management endpoints had permission checks that only allowed users with `isAdmin === true` to access them. This prevented hub users (who have `assignedHubIds` in their permissions) from managing packages for their assigned hubs.

## Solution
Updated all hub package management endpoints to allow both:
1. **Admin users** - Full access to all packages in all hubs
2. **Hub users** - Access to packages for their assigned hubs only

### Permission Check Pattern
The fix implements this permission pattern across all endpoints:

```typescript
const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
const assignedHubIds = req.user.permissions?.assignedHubIds || [];

// For non-admins, verify they have access to the package's hub
if (!isAdmin) {
  const packageHubId = package.hubInfo?.hubId;
  if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
    return res.status(403).json({ error: 'You do not have permission...' });
  }
}
```

## Files Modified

### 1. `/server/routes/builder.ts`
Updated the following endpoints:

- **POST `/save-package`** - Save new packages
  - Now checks if hub user has access to the package's hubId
  
- **PUT `/packages/:id`** - Update existing packages
  - Fetches existing package first to verify hub ownership
  
- **GET `/packages/:id/export-csv`** - Export package to CSV
  - Verifies hub access before allowing export
  
- **GET `/packages`** - List packages
  - Filters results to only show packages from assigned hubs for non-admins
  
- **GET `/packages/:id/health-check`** - Run health check
  - Verifies hub access before running health check
  
- **POST `/packages/:id/recalculate`** - Recalculate package values
  - Verifies hub access before allowing recalculation
  
- **POST `/packages/bulk-health-check`** - Bulk health checks
  - Validates hub access when hubId is provided
  
- **GET `/packages/health-summary`** - Health summary for dashboard
  - Filters by assigned hubs for non-admins

### 2. `/server/routes/admin.ts`
Updated the following endpoints:

- **POST `/hub-packages`** - Create new hub package
  - Validates package belongs to an assigned hub for non-admins
  
- **PUT `/hub-packages/:id`** - Update hub package
  - Fetches existing package to verify hub ownership
  
- **DELETE `/hub-packages/:id`** - Soft delete hub package
  - Verifies hub access before allowing deletion
  
- **POST `/hub-packages/:id/restore`** - Restore deleted package
  - Verifies hub access before allowing restore

## Key Changes

### Before
```typescript
if (!req.user.isAdmin) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### After
```typescript
const isAdmin = req.user.isAdmin === true || req.user.role === 'admin';
const assignedHubIds = req.user.permissions?.assignedHubIds || [];

if (!isAdmin) {
  // For new packages, check hubInfo in request body
  const packageHubId = req.body.hubInfo?.hubId;
  
  // For existing packages, fetch and check hubInfo
  const existingPackage = await hubPackagesService.getById(id);
  const packageHubId = existingPackage.hubInfo?.hubId;
  
  if (!packageHubId || !assignedHubIds.includes(packageHubId)) {
    return res.status(403).json({ 
      error: 'You do not have permission to manage packages for this hub' 
    });
  }
}
```

## Security Considerations

1. **Hub Isolation**: Hub users can only access packages for their assigned hubs
2. **No Hub Switching**: Users cannot change a package's hubId to gain access to other hubs
3. **Existing Package Validation**: For updates, the system fetches the existing package to verify hub ownership before allowing changes
4. **List Filtering**: When listing packages, non-admins only see packages from their assigned hubs

## Testing Recommendations

To verify the fix works correctly:

1. **As a hub user:**
   - ✅ Should be able to create packages for assigned hubs
   - ✅ Should be able to update packages for assigned hubs
   - ✅ Should be able to delete packages for assigned hubs
   - ✅ Should see only packages from assigned hubs in lists
   - ❌ Should NOT be able to create packages for non-assigned hubs
   - ❌ Should NOT be able to update packages for non-assigned hubs
   - ❌ Should NOT see packages from non-assigned hubs

2. **As an admin:**
   - ✅ Should have full access to all packages in all hubs
   - ✅ Should see all packages regardless of hub

## Related Documentation

- [User Roles and Permissions System](../USER_ROLES_AND_PERMISSIONS.md)
- [Hub System](../HUB_SYSTEM.md)
- [Hub Package Schema](../../src/integrations/mongodb/hubPackageSchema.ts)

## Date Completed
December 1, 2025






