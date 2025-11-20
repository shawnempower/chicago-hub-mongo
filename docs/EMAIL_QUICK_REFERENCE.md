# Email Templates - Quick Reference Guide

## 🚀 Quick Start

### Sending an Email

```typescript
import { emailService } from './emailService';

// Welcome email
await emailService?.sendWelcomeEmail({
  firstName: 'John',
  email: 'john@example.com',
  verificationToken: 'abc123...'
});

// Password reset
await emailService?.sendPasswordResetEmail({
  firstName: 'Jane',
  email: 'jane@example.com',
  resetToken: 'xyz789...'
});
```

## 📧 Available Email Templates

| Template | Method | Purpose | Header Color |
|----------|--------|---------|--------------|
| **Welcome** | `sendWelcomeEmail()` | Onboard new users | Navy (#2a3642) |
| **Password Reset** | `sendPasswordResetEmail()` | Secure password reset | Red (#e74c3c) |
| **Email Verification** | `sendEmailVerificationEmail()` | Verify email address | Green (#27AE60) |
| **Invitation** | `sendInvitationEmail()` | Invite to hub/publication | Orange (#ee7623) |
| **Access Granted** | `sendAccessGrantedEmail()` | Notify access granted | Green (#27AE60) |
| **Access Revoked** | `sendAccessRevokedEmail()` | Notify access removed | Gray (#6c757d) |
| **Role Change** | `sendRoleChangeEmail()` | Notify role update | Navy (#2a3642) |
| **Lead Notification** | `sendLeadNotificationEmail()` | Alert admins of leads | Orange (#ee7623) |

## 🎨 Brand Colors

```typescript
BRAND_COLORS = {
  navy: '#2a3642',        // Primary
  orange: '#ee7623',      // Accent/CTA
  green: '#27AE60',       // Success
  cream: '#faf7f2',       // Background
  lightGray: '#f8f9fa',   // Muted
  mediumGray: '#6c757d',  // Secondary text
  red: '#e74c3c',         // Warning/Error
  white: '#ffffff',       // Cards
  border: '#e5e7eb'       // Borders
}
```

## 🧩 Reusable Components

### Base Template

```typescript
generateEmailTemplate({
  title: 'Email Title',
  preheader: 'Preview text',
  content: '<p>HTML content</p>',
  headerColor: '#2a3642',
  headerIcon: '🎉',
  recipientEmail: 'user@example.com'
})
```

### Button

```typescript
generateButton(
  'Click Me',              // Button text
  'https://example.com',   // URL
  '#ee7623'               // Color (optional)
)
```

### Info Box

```typescript
generateInfoBox(
  '<p>Info content</p>',  // HTML content
  '#ee7623'              // Border color (optional)
)
```

### Alert Box

```typescript
generateAlertBox(
  'Alert message',
  'warning' | 'info' | 'success'
)
```

## 📝 Creating a New Email Template

### Step 1: Define Interface

```typescript
interface MyEmailData {
  recipientEmail: string;
  recipientName?: string;
  // ... other fields
}
```

### Step 2: Create Method

```typescript
async sendMyEmail(data: MyEmailData): Promise<{ success: boolean; error?: string }> {
  // Build content
  const content = `
    <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy};">
      Hi ${data.recipientName || 'there'}!
    </h2>
    <p>Your email content here...</p>
    ${this.generateButton('Take Action', 'https://example.com')}
  `;

  // Generate email
  const html = this.generateEmailTemplate({
    title: 'Email Title',
    preheader: 'Preview text',
    content,
    headerColor: this.BRAND_COLORS.navy,
    headerIcon: '📧',
    recipientEmail: data.recipientEmail
  });

  // Send
  return await this.sendEmail({
    to: data.recipientEmail,
    subject: '📧 Email Subject',
    html
  });
}
```

### Step 3: Use It

```typescript
await emailService?.sendMyEmail({
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe'
});
```

## 🎯 Best Practices

### ✅ Do

- Use `generateEmailTemplate()` for all emails
- Include preheader text for better open rates
- Use brand colors consistently
- Provide fallback text links for buttons
- Keep content concise and scannable
- Test in multiple email clients
- Use semantic HTML
- Include clear call-to-action

### ❌ Don't

- Create custom HTML without using base template
- Use colors outside the brand palette
- Forget mobile responsiveness
- Use images for critical content
- Make subject lines too long (50 chars max)
- Forget to test before deploying
- Use too many CTAs (1-2 max)

## 🧪 Testing

### Test Script

```bash
npm run test:email
```

### Manual Testing

```typescript
// scripts/testEmail.ts
import { emailService } from '../server/emailService';

await emailService?.sendWelcomeEmail({
  firstName: 'Test',
  email: 'your-email@example.com'
});
```

### Test Checklist

- [ ] Subject line appears correctly
- [ ] Preheader shows in email client
- [ ] Content renders properly
- [ ] Buttons are clickable
- [ ] Links work correctly
- [ ] Colors match brand
- [ ] Responsive on mobile
- [ ] Works in Gmail
- [ ] Works in Outlook
- [ ] Works in Apple Mail

## 🔍 Troubleshooting

### Email Not Sending

```typescript
// Check email service initialization
if (!emailService) {
  console.error('Email service not configured');
}

// Check response
const result = await emailService?.sendWelcomeEmail(data);
if (!result.success) {
  console.error('Email failed:', result.error);
}
```

### Email Looks Wrong

1. Check if using `generateEmailTemplate()`
2. Verify colors match `BRAND_COLORS`
3. Test in different email clients
4. Validate HTML structure
5. Check for inline CSS

### Button Not Working

```typescript
// Always provide fallback link
<p style="font-size: 14px; color: #6c757d;">
  If the button doesn't work, click here:
  <a href="${link}" style="color: #ee7623;">${link}</a>
</p>
```

## 📚 Resources

- **Full Documentation**: [EMAIL_TEMPLATE_STANDARDIZATION.md](./EMAIL_TEMPLATE_STANDARDIZATION.md)
- **Visual Preview**: [email-template-preview.html](./email-template-preview.html)
- **Email Service**: `server/emailService.ts`
- **Test Scripts**: `scripts/testEmail.ts`, `scripts/testInviteEmail.ts`

## 🤝 Need Help?

1. Check the documentation above
2. Review existing email templates
3. Test with the test scripts
4. Contact the development team

---

**Last Updated**: November 20, 2025

