# Email Template Standardization

## Overview

All email templates in the Chicago Hub application have been standardized to provide a consistent, professional, and brand-aligned experience. The email designs now match the web application's visual identity, using the same color palette, typography, and design patterns.

## Design System

### Brand Colors

All emails now use the Chicago Hub brand color palette:

```typescript
{
  navy: '#2a3642',        // hsl(210 20% 18%) - Primary color for text and headers
  orange: '#ee7623',      // hsl(24 86% 52%) - Accent color for CTAs and highlights
  green: '#27AE60',       // hsl(145 63% 42%) - Success states
  cream: '#faf7f2',       // hsl(42 30% 95%) - Background color
  lightGray: '#f8f9fa',   // hsl(0 0% 98%) - Muted backgrounds
  mediumGray: '#6c757d',  // hsl(215 16% 47%) - Secondary text
  red: '#e74c3c',         // hsl(0 84% 60%) - Destructive/warning actions
  white: '#ffffff',       // Pure white for cards
  border: '#e5e7eb'       // hsl(215 20% 90%) - Border color
}
```

### Typography

- **Headings**: Playfair Display (serif) - matches the web application's editorial style
- **Body Text**: Inter (sans-serif) with fallbacks to system fonts
- **Line Height**: 1.6 for optimal readability
- **Font Smoothing**: Anti-aliased for crisp rendering across devices

### Layout Structure

All emails follow a consistent structure:

1. **Preheader Text** (optional) - Hidden text for email preview
2. **Main Card Container** - 600px max-width, centered, with subtle shadow
3. **Header Section** - Colored background with icon and title
4. **Content Section** - White background with 30px padding
5. **Footer Section** - Light gray background with copyright and recipient info

## Reusable Components

### Base Template Generator

The `generateEmailTemplate()` method creates a consistent wrapper for all emails:

```typescript
private generateEmailTemplate(options: {
  title: string;              // Email title shown in header
  preheader?: string;         // Preview text for email clients
  content: string;            // Main email content (HTML)
  headerColor?: string;       // Header background color (defaults to navy)
  headerIcon?: string;        // Emoji icon for header
  recipientEmail: string;     // Recipient's email for footer
}): string
```

### Button Component

The `generateButton()` method creates consistent call-to-action buttons:

```typescript
private generateButton(
  text: string,      // Button label
  url: string,       // Destination URL
  color?: string     // Background color (defaults to orange)
): string
```

**Features:**
- Rounded corners (6px border-radius)
- White text on colored background
- 14px vertical padding, 32px horizontal padding
- Works in email clients and Outlook
- Hover-friendly (though limited in email)

### Info Box Component

The `generateInfoBox()` method creates highlighted information sections:

```typescript
private generateInfoBox(
  content: string,   // Box content (HTML)
  color?: string     // Left border accent color (defaults to orange)
): string
```

**Features:**
- Light gray background
- Colored left border (4px)
- 20px padding
- Rounded corners (6px)

### Alert Box Component

The `generateAlertBox()` method creates contextual alert messages:

```typescript
private generateAlertBox(
  content: string,                           // Alert content
  type: 'warning' | 'info' | 'success'      // Alert type
): string
```

**Alert Types:**
- **Warning**: Yellow background with warning icon (⚠️)
- **Info**: Blue background with info icon (ℹ️)
- **Success**: Green background with checkmark icon (✓)

## Email Templates

### 1. Welcome Email

**Purpose**: Onboard new users to Chicago Hub

**Header Color**: Navy (#2a3642)

**Icon**: 🎉

**Key Features**:
- Personalized greeting
- Platform benefits list
- Email verification button (if needed)
- Warm welcome message

**Template**: `sendWelcomeEmail()`

---

### 2. Password Reset Email

**Purpose**: Allow users to securely reset their password

**Header Color**: Red (#e74c3c)

**Icon**: 🔐

**Key Features**:
- Security warning alert box
- Reset password button
- Expiration notice (1 hour)
- Fallback link if button doesn't work

**Template**: `sendPasswordResetEmail()`

---

### 3. Email Verification Email

**Purpose**: Verify user's email address

**Header Color**: Green (#27AE60)

**Icon**: ✅

**Key Features**:
- Clear verification button
- List of features unlocked after verification
- Simple, focused message

**Template**: `sendEmailVerificationEmail()`

---

### 4. Invitation Email

**Purpose**: Invite users to join a hub or publication

**Header Color**: Orange (#ee7623)

**Icon**: 🎉

**Key Features**:
- Info box with invitation details
- Personalized message from inviter
- Different messaging for new vs. existing users
- List of capabilities granted
- 7-day expiration notice

**Template**: `sendInvitationEmail()`

---

### 5. Access Granted Email

**Purpose**: Notify users when access is granted

**Header Color**: Green (#27AE60)

**Icon**: ✅

**Key Features**:
- Info box with resource details
- Dashboard access button
- Confirmation of access status

**Template**: `sendAccessGrantedEmail()`

---

### 6. Access Revoked Email

**Purpose**: Notify users when access is removed

**Header Color**: Medium Gray (#6c757d)

**Icon**: 🔒

**Key Features**:
- Professional, neutral tone
- Info box with resource details
- Contact information for questions
- Respectful closure message

**Template**: `sendAccessRevokedEmail()`

---

### 7. Role Change Email

**Purpose**: Notify users of role/permission changes

**Header Color**: Navy (#2a3642)

**Icon**: 🔄

**Key Features**:
- Info box showing old vs. new role
- Clear explanation of impact
- Contact information for questions

**Template**: `sendRoleChangeEmail()`

---

### 8. Lead Notification Email

**Purpose**: Alert admins of new lead inquiries

**Header Color**: Orange (#ee7623)

**Icon**: 🎯

**Key Features**:
- Structured info rows for all lead details
- Clickable email and website links
- Action required alert box
- Timestamp of submission
- Professional formatting for quick review

**Template**: `sendLeadNotificationEmail()`

---

## Email Client Compatibility

The templates are designed to work across all major email clients:

- ✅ Gmail (web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (web, desktop, mobile)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Thunderbird
- ✅ Mobile clients (iOS Mail, Android)

### Key Compatibility Features

1. **Table-based layout** - Works in Outlook and legacy clients
2. **Inline CSS** - No external stylesheets
3. **Web-safe fonts** - With system font fallbacks
4. **Conditional comments** - For Outlook-specific fixes
5. **Alt text** - For emoji/icon fallbacks
6. **Responsive design** - Adapts to mobile screens
7. **Plain text fallback** - Auto-generated from HTML

## Best Practices

### When Creating New Email Templates

1. **Use the base template generator** - Always use `generateEmailTemplate()` for consistency
2. **Choose appropriate colors** - Match header color to email purpose (success=green, warning=red, etc.)
3. **Include preheader text** - Improves open rates in email clients
4. **Use component methods** - Leverage `generateButton()`, `generateInfoBox()`, etc.
5. **Test across clients** - Use a service like Litmus or Email on Acid
6. **Keep content concise** - Users scan emails quickly
7. **Clear call-to-action** - Make the primary action obvious
8. **Fallback links** - Always provide text link as backup to buttons
9. **Mobile-first** - Most emails are read on mobile devices
10. **Accessible** - Use semantic HTML and adequate color contrast

### Content Guidelines

- **Subject lines**: 50 characters or less, include emoji if appropriate
- **Preheader**: 90 characters or less, complements subject line
- **Headings**: Use serif font (Playfair Display) for brand consistency
- **Body text**: 16px size, 1.6 line-height for readability
- **Links**: Use brand orange color, underline optional
- **Lists**: Use emoji bullets for visual interest
- **Tone**: Professional but friendly, match brand voice

## Testing

To test email templates:

1. Use the test script: `scripts/testEmail.ts`
2. Send test emails to your own account
3. Check rendering in multiple email clients
4. Verify all links work correctly
5. Test on mobile devices
6. Check spam score (use Mail Tester)

## Maintenance

### Updating Brand Colors

If brand colors change, update the `BRAND_COLORS` constant in the `EmailService` class. All emails will automatically use the new colors.

### Adding New Email Templates

1. Create a new interface for the email data (if needed)
2. Create a new method following the naming pattern: `send[Purpose]Email()`
3. Use `generateEmailTemplate()` as the base
4. Use component methods for buttons, boxes, etc.
5. Add documentation to this file
6. Create a test case

### Updating Existing Templates

1. Modify the content generation within the template method
2. Test the changes thoroughly
3. Update this documentation if behavior changes
4. Communicate changes to the team

## Migration Notes

All email templates have been migrated from the previous format to the new standardized system:

- **Before**: Inline HTML with inconsistent colors and styling
- **After**: Component-based system with brand-aligned design
- **Breaking Changes**: None - all email methods maintain the same signatures
- **Benefits**: 
  - Consistent brand experience
  - Easier to maintain and update
  - Better email client compatibility
  - Professional appearance
  - Matches web application design

## Support

For questions or issues with email templates:

1. Check this documentation first
2. Review the email service code: `server/emailService.ts`
3. Test using the test scripts in `scripts/`
4. Contact the development team

---

**Last Updated**: November 20, 2025
**Version**: 2.0.0
**Author**: Development Team

