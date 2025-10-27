# Quick Start: Admin User Management

## 🚀 Fast Setup (Choose One Method)

### Method 1: UI Bootstrap (Easiest)
1. Log in to your account
2. Go to **Admin Dashboard** → **User Management**
3. Click **"Make Me Admin"** button (top right)
4. Refresh the page
5. Done! ✅

### Method 2: Command Line
```bash
npm run make-admin your-email@example.com
```

## 🎯 Managing Other Users

Once you're an admin:

1. Go to **Admin Dashboard** → **User Management**
2. Find the user you want to manage
3. Click **"Make Admin"** to grant privileges
4. Click **"Remove Admin"** to revoke privileges

## 🔍 Troubleshooting

### Button doesn't work?
1. Open browser console (F12)
2. Click the button again
3. Look for error messages in red
4. Share the error message for help

### Still stuck?
- Check if backend is running on port 3001
- Check if you're logged in (localStorage → auth_token)
- Try the command-line method instead

## 📚 More Information

- **Full guide**: See `ADMIN_USER_GUIDE.md`
- **Technical details**: See `ADMIN_FIX_SUMMARY.md`

## ⚠️ Important Notes

- The "Make Me Admin" button is for development/initial setup
- Remove it in production (see ADMIN_FIX_SUMMARY.md)
- Only grant admin to trusted users
- Admins can modify publications, storefronts, and all user data

