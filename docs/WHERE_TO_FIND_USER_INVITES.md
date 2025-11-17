# Where to Find User Invite Features

## ✅ User Management Interfaces Are Now Available!

### 1. **Hub User Management**

**Location:** Admin Dashboard → Hubs Tab

**How to Access:**
1. Navigate to `/admin`
2. Click on the **"Hubs"** tab
3. Find any hub in the table
4. Click the **Users icon** (👥) in the Actions column

**What You Can Do:**
- **Invite users via email** to manage the hub
- See all users with hub access
- Remove user access
- Hub access automatically grants access to all publications within that hub

---

### 2. **Publication User Management**

**Location:** Publication Settings Page

**How to Access:**
1. Select a publication from the publication dropdown
2. Navigate to **Settings** tab (usually in the publication menu)
3. Scroll down to the **"User Access"** section

**What You Can Do:**
- **Invite users via email** to manage this specific publication
- View all users with publication access
- Remove user access
- Perfect for giving specific publication-level permissions

---

### 3. **Quick Visual Guide**

#### Hub Management:
```
Admin Dashboard → Hubs Tab → [Hub Row] → 👥 Icon → User Management Dialog
```

The hub table now has these action buttons for each hub:
- 👥 **Users** - Manage user access (NEW!)
- 📰 **Publications** - Assign publications
- ✏️ **Edit** - Edit hub details
- 🗑️ **Archive** - Archive hub

#### Publication Settings:
```
[Select Publication] → Settings → Scroll to "User Access" Card
```

The User Access card includes:
- **"Invite User"** button (top right)
- Table of current users
- **Remove** action for each user

---

## 🎯 User Invite Flow

### Inviting a New User:

1. **Click "Invite User"** button
2. **Enter email address** of the user you want to invite
3. **Click "Send Invitation"**

The system will:
- ✅ Send an email invitation to the user
- ✅ Create an invitation record in the database
- ✅ Show what permissions they'll receive
- ✅ Handle both new and existing users automatically

### What the User Receives:

- **Welcome email** with invitation link
- Link format: `/accept-invitation?token=xxx`
- Instructions to sign in or create account
- Automatic access grant upon acceptance

---

## 📧 Email Notifications

The system sends professional emails for:
- **Invitations** - Initial invite with acceptance link
- **Access Granted** - When access is given to existing users
- **Access Revoked** - When access is removed
- **Role Changes** - When user roles are updated

All emails are branded and include clear call-to-action buttons.

---

## 🔐 Permission Levels

### Hub Users:
- ✅ Full access to the hub
- ✅ Access to ALL publications within that hub
- ✅ Can manage hub settings
- ✅ Can invite other hub users
- ✅ Perfect for regional managers

### Publication Users:
- ✅ Access to specific publications
- ✅ Can manage publication details
- ✅ Can invite other publication users
- ✅ Cannot access other publications (unless assigned)
- ✅ Perfect for individual publication managers

### Admin Users:
- ✅ Full system access
- ✅ Can manage all hubs and publications
- ✅ Can assign any user to any resource
- ✅ Managed in Admin Dashboard → Users tab

---

## 💡 Tips

1. **Hub vs Publication Access:**
   - Use **hub access** for users who manage multiple publications in a region
   - Use **publication access** for users who manage only specific publications

2. **Inviting Multiple Users:**
   - Invite one at a time through the UI
   - Each user gets their own invitation email
   - You can track pending invitations in the user table

3. **Managing Existing Users:**
   - Click the **"👥 Users"** button to see current access
   - Use the **"Remove"** button to revoke access
   - Re-invite if needed

4. **Email Issues:**
   - Check your `.env` file has Mailgun credentials
   - Ensure `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set
   - Test emails may go to spam folders

---

## 🎨 UI Components Used

The user management interface includes:
- **User Invite Dialog** - Modal for sending invitations
- **User Management Table** - List of users with access
- **Role Badges** - Visual indicators for user roles
- **Action Buttons** - Remove access, manage permissions
- **Empty States** - Helpful messages when no users exist

---

## ⚡ Quick Start

**To invite your first hub user:**
```bash
1. Go to /admin
2. Click "Hubs" tab
3. Click the 👥 icon on any hub
4. Click "Invite User"
5. Enter email → Send!
```

**To invite your first publication user:**
```bash
1. Select a publication
2. Go to Settings
3. Scroll to "User Access"
4. Click "Invite User"
5. Enter email → Send!
```

---

## 🚀 Next Steps

- [ ] Try inviting a test user to a hub
- [ ] Check the email they receive
- [ ] Test the invitation acceptance flow
- [ ] Invite real users to your publications
- [ ] Monitor user access through the management tables

The system is fully functional and ready to use! 🎉

