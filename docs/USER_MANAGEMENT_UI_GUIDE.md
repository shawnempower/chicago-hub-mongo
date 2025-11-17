# User Management UI Guide

## Overview

The new user management system provides comprehensive UI components for managing user access to hubs and publications. All interfaces are now available in your application!

## 🎯 Available UI Components

### 1. **Admin Dashboard - User Management Tab**

**Location:** `/admin` → "Users" tab

**Features:**
- View all users in the system
- See user roles (Admin, Hub User, Publication User, Standard)
- Toggle admin status for any user
- View permission summaries
- Quick access to assign hubs/publications

**Usage:**
```tsx
// Already integrated in AdminDashboard.tsx
// Just navigate to /admin and click the "Users" tab
```

### 2. **User Invite Dialog**

**Component:** `UserInviteDialog`

**Features:**
- Invite users via email
- Assign to specific hub or publication
- Automatic email notification
- Handles both new and existing users

**Usage:**
```tsx
import { UserInviteDialog } from '@/components/permissions';

<UserInviteDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  resourceType="hub" // or "publication"
  resourceId="hub-123"
  resourceName="Chicago Hub"
  onInviteSent={() => {
    // Refresh your user list
  }}
/>
```

### 3. **User Management Table**

**Component:** `UserManagementTable`

**Features:**
- Display users with access to a resource
- Show user roles and access levels
- Remove user access
- Real-time updates

**Usage:**
```tsx
import { UserManagementTable } from '@/components/permissions';

<UserManagementTable
  resourceType="hub"
  resourceId="hub-123"
  onUsersChange={() => {
    // Called when users are added/removed
  }}
/>
```

### 4. **Resource User Management (All-in-One)**

**Component:** `ResourceUserManagement`

**Features:**
- Combines invite dialog + user table
- Ready-to-use card component
- Perfect for Hub/Publication detail pages

**Usage:**
```tsx
import { ResourceUserManagement } from '@/components/permissions';

<ResourceUserManagement
  resourceType="publication"
  resourceId="pub-456"
  resourceName="Chicago Tribune"
  canManageUsers={true}
/>
```

### 5. **Authentication Pages**

Three new pages for complete authentication flow:

#### Accept Invitation Page
**Route:** `/accept-invitation?token=xxx`
- Users land here from email invitations
- Handles sign-in flow
- Automatically accepts invitation

#### Reset Password Page
**Route:** `/reset-password?token=xxx`
- Secure password reset
- Token-based verification
- Password confirmation

#### Verify Email Page
**Route:** `/verify-email?token=xxx`
- Email verification flow
- Auto-redirect after success

## 📊 Permission Filtering

The system automatically filters resources based on user permissions:

### Frontend Filtering

**HubContext** - Only shows assigned hubs to non-admin users:
```tsx
const { hubs } = useHubContext(); 
// Automatically filtered based on user.permissions.assignedHubIds
```

**PublicationContext** - Only shows assigned publications:
```tsx
const { availablePublications } = usePublication();
// Filtered by user.permissions.assignedPublicationIds
// AND by hub access (user.permissions.assignedHubIds)
```

### User Permissions

The `user` object now includes:
```typescript
{
  id: string;
  email: string;
  role?: 'admin' | 'hub_user' | 'publication_user' | 'standard';
  isAdmin?: boolean; // Backward compatible
  permissions?: {
    assignedHubIds?: string[];
    assignedPublicationIds?: string[];
    canInviteUsers?: boolean;
  };
}
```

## 🚀 Integration Examples

### Example 1: Add User Management to Hub Detail Page

```tsx
import { ResourceUserManagement } from '@/components/permissions';
import { useAuth } from '@/contexts/CustomAuthContext';

function HubDetailPage({ hubId, hubName }) {
  const { user } = useAuth();
  
  // Only show to admins and hub users
  const canManage = user?.isAdmin || 
                    user?.permissions?.assignedHubIds?.includes(hubId);

  return (
    <div>
      {/* Your existing hub content */}
      
      {canManage && (
        <ResourceUserManagement
          resourceType="hub"
          resourceId={hubId}
          resourceName={hubName}
          canManageUsers={true}
        />
      )}
    </div>
  );
}
```

### Example 2: Add User Management to Publication Page

```tsx
import { ResourceUserManagement } from '@/components/permissions';

function PublicationDetailPage({ publication }) {
  return (
    <div className="space-y-6">
      {/* Publication details */}
      
      <ResourceUserManagement
        resourceType="publication"
        resourceId={publication._id}
        resourceName={publication.publicationName}
      />
    </div>
  );
}
```

### Example 3: Custom Invite Button

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserInviteDialog } from '@/components/permissions';
import { UserPlus } from 'lucide-react';

function CustomInviteButton({ hubId, hubName }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Invite Team Member
      </Button>
      
      <UserInviteDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        resourceType="hub"
        resourceId={hubId}
        resourceName={hubName}
      />
    </>
  );
}
```

## 🔐 Backend API

The frontend components use the new permissions API:

```typescript
import { permissionsAPI } from '@/api/permissions';

// Invite user
await permissionsAPI.inviteUser({
  email: 'user@example.com',
  resourceType: 'hub',
  resourceId: 'hub-123',
  resourceName: 'Chicago Hub'
});

// Get hub users
const { users } = await permissionsAPI.getHubUsers('hub-123');

// Revoke access
await permissionsAPI.revokeHubAccess({
  userId: 'user-456',
  hubId: 'hub-123'
});
```

## 📧 Email Notifications

The system automatically sends emails for:
- **Invitations** - When users are invited to hubs/publications
- **Access Granted** - When existing users gain new access
- **Access Revoked** - When access is removed
- **Role Changes** - When user roles are updated
- **Password Reset** - Secure reset links
- **Email Verification** - Account verification links
- **Welcome Email** - For new user signups

All emails are sent via Mailgun and include professional templates.

## 🎨 UI Components Used

The system uses your existing UI library:
- `Card`, `CardHeader`, `CardContent` - Layout
- `Button` - Actions
- `Dialog` - Modals
- `Table` - User lists
- `Badge` - Role indicators
- `Alert` - Status messages
- `Input`, `Label` - Forms
- `Spinner` - Loading states

## 🔧 Migration

To enable permissions for existing users, run:

```bash
# From project root
npm run migrate:permissions
```

This will:
- Add `role` field to existing users
- Create `UserPermissions` records
- Set admins based on `isAdmin` flag
- Preserve all existing data

## 🎯 Next Steps

1. **Test the UI** - Navigate to `/admin` and try the user management features
2. **Add to Hub Pages** - Integrate `ResourceUserManagement` into your hub detail views
3. **Add to Publication Pages** - Same for publication detail views
4. **Run Migration** - Use the migration script for existing users
5. **Configure Email** - Ensure Mailgun credentials are in `.env`

## 📝 Notes

- All filtering is **backward compatible** - users without permissions see everything (like before)
- Admins always see all resources
- Hub access automatically grants access to all publications in that hub
- The system gracefully handles missing permissions data
- Frontend filtering happens automatically via contexts
- Backend API filtering is available but optional

---

**Ready to use!** All UI components are built and integrated. Just navigate to `/admin` to start managing users! 🎉

