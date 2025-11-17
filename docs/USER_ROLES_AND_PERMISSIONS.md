# User Roles and Permissions System

## Overview

The Chicago Hub platform now includes a comprehensive role-based access control (RBAC) system that supports three user types with granular permissions for managing hubs and publications.

## User Roles

### 1. Admin Users
- **Full access** to all hubs, publications, and system features
- Can manage all users and assign permissions
- Can create/edit/delete any resource
- Automatically bypass all permission checks

### 2. Hub Users
- Manage one or more assigned hubs
- Access all publications within their assigned hubs
- Can invite other users to their hubs
- Can view/edit hub settings and content

### 3. Publication Users
- Manage one or more assigned publications
- Can invite other users to their publications
- Can view/edit publication settings and content
- Access limited to assigned publications only

### 4. Standard Users
- Basic user account without special permissions
- Can view public content
- No management capabilities

## Permission Model

### Access Scopes

The system supports multiple access patterns for scalability:

1. **All Access** (`accessScope: 'all'`)
   - User has access to everything (used for admins and during migration)

2. **Hub-Level Access** (`accessScope: 'hub_level'`)
   - Most scalable for users managing 100+ publications
   - User gets access to ALL publications within assigned hub(s)
   - Automatically updates when publications are added/removed from hub

3. **Group-Level Access** (`accessScope: 'group_level'`)
   - Access via publication groups (e.g., "Tribune Network")
   - Good for managing publication networks/families

4. **Individual Access** (`accessScope: 'individual'`)
   - Direct assignment to specific publications
   - Used when granular control is needed

### Hub Access Levels

When assigning users to hubs, two access levels are available:

- **Full**: Access to all publications in the hub
- **Limited**: Access to specific publications within the hub

## Database Schema

### Collections

#### `user_permissions`
Stores user permission records:
```typescript
{
  userId: string,
  role: 'admin' | 'hub_user' | 'publication_user' | 'standard',
  accessScope: 'all' | 'hub_level' | 'group_level' | 'individual',
  hubAccess: [{ hubId: string, accessLevel: 'full' | 'limited' }],
  publicationGroupIds: string[],
  individualPublicationIds: string[],
  canInviteUsers: boolean,
  canManageGroups: boolean,
  createdAt: Date,
  updatedAt: Date,
  createdBy: string
}
```

#### `user_publication_access`
Junction table for efficient permission checks:
```typescript
{
  userId: string,
  publicationId: string,
  grantedVia: 'direct' | 'hub' | 'group',
  grantedViaId: string,
  grantedAt: Date,
  grantedBy: string
}
```

#### `publication_groups`
Publication groupings for bulk access:
```typescript
{
  groupId: string,
  name: string,
  description: string,
  publicationIds: string[],
  hubId: string (optional),
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### `user_invitations`
Email-based user invitations:
```typescript
{
  invitedEmail: string,
  invitedBy: string,
  invitationToken: string,
  resourceType: 'hub' | 'publication',
  resourceId: string,
  resourceName: string,
  status: 'pending' | 'accepted' | 'expired' | 'cancelled',
  expiresAt: Date,
  acceptedAt: Date (optional),
  createdAt: Date
}
```

## API Endpoints

### Permissions Management

#### `POST /api/permissions/invite`
Invite a user to a hub or publication
```json
{
  "email": "user@example.com",
  "resourceType": "hub",  // or "publication"
  "resourceId": "chicago-hub",
  "resourceName": "Chicago Hub"
}
```

#### `POST /api/permissions/accept-invitation/:token`
Accept an invitation (requires authentication)

#### `GET /api/permissions/invitation/:token`
Get invitation details (public, for preview)

#### `GET /api/permissions/hub/:hubId/users`
Get all users with access to a hub

#### `GET /api/permissions/publication/:publicationId/users`
Get all users with access to a publication

#### `POST /api/permissions/assign/hub` (Admin only)
Assign existing user to hub
```json
{
  "userId": "user123",
  "hubId": "chicago-hub",
  "accessLevel": "full"  // or "limited"
}
```

#### `POST /api/permissions/assign/publication` (Admin only)
Assign existing user to publication
```json
{
  "userId": "user123",
  "publicationId": "123"
}
```

#### `DELETE /api/permissions/revoke/hub`
Revoke user access from hub
```json
{
  "userId": "user123",
  "hubId": "chicago-hub"
}
```

#### `DELETE /api/permissions/revoke/publication`
Revoke user access from publication
```json
{
  "userId": "user123",
  "publicationId": "123"
}
```

#### `PATCH /api/permissions/role` (Admin only)
Update user role
```json
{
  "userId": "user123",
  "role": "hub_user"
}
```

#### `GET /api/permissions/my-resources`
Get current user's assigned resources

### Middleware

#### `authenticateToken`
Verifies JWT and attaches user to request

#### `requireAdmin`
Requires admin role (checks both `isAdmin` and `role === 'admin'`)

#### `requireHubAccess(paramName?)`
Requires access to specific hub
```typescript
router.get('/hubs/:hubId', requireHubAccess(), handler);
```

#### `requirePublicationAccess(paramName?)`
Requires access to specific publication
```typescript
router.put('/publications/:publicationId', requirePublicationAccess(), handler);
```

#### `requireInvitePermission`
Requires permission to invite users

## Email Notifications

The system automatically sends emails for:

1. **Invitations** - When someone invites you to a hub/publication
2. **Access Granted** - When admin assigns you to a resource
3. **Access Revoked** - When your access is removed
4. **Role Changed** - When your role is updated

All emails are branded and include:
- Clear resource information
- Action buttons (when applicable)
- Expiration notices (for invitations)
- Support contact information

## Implementation Guide

### Step 1: Run Migration

Before enabling permission filtering, migrate existing users:

```bash
npx tsx src/scripts/migrateUserPermissions.ts
```

This script:
- Creates `UserPermissions` records for all existing users
- Converts `isAdmin` flags to roles
- Grants temporary "all access" to maintain backward compatibility

### Step 2: Assign Permissions

Use the admin panel or API to assign users to specific hubs/publications:

```typescript
// Assign user to hub (grants access to all hub publications)
await permissionsService.assignUserToHub(userId, hubId, assignedBy);

// Assign user to specific publication
await permissionsService.assignUserToPublication(userId, publicationId, assignedBy);
```

### Step 3: Enable Permission Filtering

Once permissions are properly assigned, enable filtering:

```bash
# .env file
ENABLE_PERMISSION_FILTERING=true
```

This activates permission checks across the platform.

## Frontend Integration

### User Context

The `AuthUser` interface now includes:

```typescript
interface AuthUser {
  id: string;
  email: string;
  isAdmin?: boolean;  // Legacy support
  role?: UserRole;
  permissions?: {
    assignedHubIds: string[];
    assignedPublicationIds: string[];
    canInviteUsers: boolean;
  };
}
```

### Permission Checks

```typescript
// Check if user is admin
const isAdmin = permissionsService.isAdmin(user);

// Check hub access
const hasAccess = await permissionsService.canAccessHub(userId, hubId);

// Get user's hubs
const hubs = await permissionsService.getUserHubs(userId);

// Get user's publications
const pubs = await permissionsService.getUserPublications(userId);
```

## Best Practices

### For Administrators

1. **Start with hub-level access** - Assign users to hubs rather than individual publications when possible
2. **Use publication groups** - For managing networks of publications (e.g., all Tribune properties)
3. **Enable canInviteUsers** - Allow hub/publication users to invite their team members
4. **Regular audits** - Review user permissions periodically

### For Developers

1. **Always check permissions** - Use middleware for protected routes
2. **Handle gracefully** - Provide clear error messages when access is denied
3. **Test both scenarios** - With and without `ENABLE_PERMISSION_FILTERING`
4. **Use the junction table** - For efficient permission checks on publications

### For Hub/Publication Users

1. **Invite team members** - Use the invite feature to add colleagues
2. **Manage access** - Remove users who no longer need access
3. **Check before sharing** - Ensure invitees actually need access to your resources

## Backward Compatibility

The system maintains backward compatibility through:

1. **Dual admin checks** - Checks both `isAdmin` flag and `role === 'admin'`
2. **Feature flag** - `ENABLE_PERMISSION_FILTERING` controls when filtering activates
3. **Fallback behavior** - Users without permissions records see everything (pre-migration state)
4. **Gradual rollout** - Can assign permissions incrementally before full enforcement

## Troubleshooting

### Users can't access their resources

1. Check if `ENABLE_PERMISSION_FILTERING=true` is set
2. Verify user has `UserPermissions` record
3. Check `user_publication_access` junction table
4. Ensure hub/publication assignments are correct

### Invitations not working

1. Verify Mailgun configuration in `.env`
2. Check invitation hasn't expired (7-day limit)
3. Ensure inviter has `canInviteUsers` permission
4. Check server logs for email service errors

### Permission checks failing

1. Confirm migration script ran successfully
2. Check if user role is set correctly
3. Verify middleware is applied to routes
4. Check console for authentication errors

## Security Considerations

1. **Token expiration** - Invitations expire after 7 days
2. **Unique tokens** - Cryptographically secure random tokens
3. **Permission validation** - All API endpoints validate permissions
4. **Audit trail** - All permission changes are logged with timestamps
5. **Email verification** - Recommended for sensitive operations

## Support

For questions or issues:
- Check server logs for detailed error messages
- Review this documentation
- Contact your system administrator
- File an issue in the project repository

