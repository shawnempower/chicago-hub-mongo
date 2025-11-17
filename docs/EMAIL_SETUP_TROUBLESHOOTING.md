# Email Service Troubleshooting

## 🐛 Current Issue

**Error:** `404 Not Found` from Mailgun API

**Cause:** The Mailgun domain is not properly configured or verified.

## ✅ How to Fix

### Option 1: Use Mailgun Sandbox Domain (Quick Test)

For testing, you can use Mailgun's sandbox domain:

1. Go to your Mailgun dashboard: https://app.mailgun.com/
2. Click on "Sending" → "Domains"
3. You should see a **sandbox domain** like: `sandboxXXXXXXXX.mailgun.org`
4. Update your `.env` file:

```bash
MAILGUN_DOMAIN=sandboxXXXXXXXX.mailgun.org
```

**Note:** Sandbox domains can only send to authorized recipients. You need to add recipients in Mailgun dashboard.

### Option 2: Verify Your Custom Domain (Production)

To use `dashboard.empowerlocal.co`:

1. Go to Mailgun dashboard → "Sending" → "Domains"
2. Click "Add New Domain"
3. Enter: `mg.empowerlocal.co` (or another subdomain like `mail.empowerlocal.co`)
4. Mailgun will give you DNS records to add:
   - **TXT** record for domain verification
   - **MX** records for receiving
   - **CNAME** records for tracking
5. Add these DNS records to your domain provider (GoDaddy, Namecheap, etc.)
6. Wait for verification (can take up to 48 hours, usually minutes)
7. Update your `.env`:

```bash
MAILGUN_DOMAIN=mg.empowerlocal.co
MAILGUN_FROM_EMAIL=noreply@mg.empowerlocal.co
```

### Option 3: Use a Different Email Provider (Alternative)

If Mailgun is too complex, you can use:
- **SendGrid** (also has free tier)
- **AWS SES** (very cheap)
- **Postmark** (great for transactional emails)

## 🔧 Quick Fix for Now

**To get emails working immediately:**

```bash
# In your .env file, change:
MAILGUN_DOMAIN=sandboxXXXXXXXX.mailgun.org  # Get this from Mailgun dashboard

# And add authorized recipients in Mailgun dashboard
```

## 🧪 Testing

After updating the domain, test with:

```bash
npm run test:email
# OR
npx tsx scripts/testInviteEmail.ts
```

## 📋 Checklist

- [ ] Mailgun account is active
- [ ] Domain is verified in Mailgun (green checkmark)
- [ ] DNS records are properly configured
- [ ] API key is correct
- [ ] `.env` file has correct `MAILGUN_DOMAIN`
- [ ] From email matches the domain (`noreply@YOUR_DOMAIN`)
- [ ] Server has been restarted after `.env` changes

## Common Mistakes

1. ❌ Using `dashboard.empowerlocal.co` directly (your main domain)
   ✅ Use `mg.empowerlocal.co` (a subdomain)

2. ❌ From email doesn't match domain
   ✅ If domain is `mg.empowerlocal.co`, from email should be `@mg.empowerlocal.co`

3. ❌ DNS records not propagated yet
   ✅ Wait 24-48 hours or use sandbox domain for testing

## 🆘 Still Not Working?

Check Mailgun logs:
1. Go to https://app.mailgun.com/
2. Click "Sending" → "Logs"
3. Look for your failed email attempts
4. It will show the exact error

---

**Current Configuration Found:**
- Domain: `dashboard.empowerlocal.co`
- From Email: `noreply@empowerlocal.co`
- Base URL: `https://api.mailgun.net/v3`

**Problem:** The domain `dashboard.empowerlocal.co` returns 404, meaning Mailgun doesn't recognize it as a verified sending domain.

