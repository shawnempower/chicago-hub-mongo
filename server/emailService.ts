import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables if not already loaded
if (!process.env.MAILGUN_API_KEY) {
  console.log('📧 [EMAIL SERVICE] Loading .env file...');
  dotenv.config();
}

// Email service configuration
const mailgun = new Mailgun(FormData);

interface EmailConfig {
  apiKey: string;
  domain: string;
  baseUrl: string;
  fromEmail: string;
  fromName: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface WelcomeEmailData {
  firstName: string;
  email: string;
  verificationToken?: string;
}

interface PasswordResetEmailData {
  firstName: string;
  email: string;
  resetToken: string;
}

interface EmailVerificationData {
  firstName: string;
  email: string;
  verificationToken: string;
}

interface InvitationEmailData {
  invitedByName: string;
  invitedByEmail: string;
  recipientEmail: string;
  recipientName?: string;
  resourceType: 'hub' | 'publication';
  resourceName: string;
  invitationToken: string;
  isExistingUser: boolean; // true if user exists, false if new
}

interface AccessGrantedEmailData {
  recipientEmail: string;
  recipientName?: string;
  resourceType: 'hub' | 'publication';
  resourceName: string;
  grantedBy: string;
}

interface AccessRevokedEmailData {
  recipientEmail: string;
  recipientName?: string;
  resourceType: 'hub' | 'publication';
  resourceName: string;
  revokedBy: string;
}

interface RoleChangeEmailData {
  recipientEmail: string;
  recipientName?: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}

interface AssetsReadyEmailData {
  recipientEmail: string;
  recipientName?: string;
  publicationName: string;
  campaignName: string;
  advertiserName?: string;
  assetCount: number;
  orderUrl: string;
  hubName?: string;
}

interface OrderSentEmailData {
  recipientEmail: string;
  recipientName?: string;
  publicationName: string;
  campaignName: string;
  advertiserName?: string;
  hubName?: string;
  flightDates?: string;
  totalValue?: number;
  orderUrl: string;
}

interface OrderConfirmedEmailData {
  recipientEmail: string;
  recipientName?: string;
  publicationName: string;
  campaignName: string;
  advertiserName?: string;
  confirmedAt?: Date;
  campaignUrl: string;
}

interface PlacementRejectedEmailData {
  recipientEmail: string;
  recipientName?: string;
  publicationName: string;
  placementName: string;
  campaignName: string;
  rejectionReason?: string;
  campaignUrl: string;
}

interface MessageNotificationEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  campaignName: string;
  publicationName: string;
  messagePreview?: string;
  orderUrl: string;
  hubName?: string;
}

export class EmailService {
  private mg: any;
  private config: EmailConfig;

  // Brand colors matching the web application
  private readonly BRAND_COLORS = {
    navy: '#2a3642',        // hsl(210 20% 18%) - Primary
    orange: '#ee7623',      // hsl(24 86% 52%) - Accent
    green: '#27AE60',       // hsl(145 63% 42%) - Success
    cream: '#faf7f2',       // hsl(42 30% 95%) - Background
    lightGray: '#f8f9fa',   // hsl(0 0% 98%) - Muted
    mediumGray: '#6c757d',  // hsl(215 16% 47%) - Muted foreground
    red: '#e74c3c',         // hsl(0 84% 60%) - Destructive
    white: '#ffffff',
    border: '#e5e7eb'       // hsl(215 20% 90%)
  };

  constructor(config: EmailConfig) {
    this.config = config;
    this.mg = mailgun.client({
      username: 'api',
      key: config.apiKey,
      url: config.baseUrl
    });
  }

  /**
   * Check if notification emails are enabled via environment variable.
   * Auth emails (password reset, verification, welcome) are ALWAYS sent regardless of this setting.
   * This allows disabling notification emails in dev/staging environments.
   */
  private isNotificationEmailEnabled(): boolean {
    const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED;
    return enabled === 'true' || enabled === '1';
  }

  private async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const data = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html)
      };

      const response = await this.mg.messages.create(this.config.domain, data);
      console.log('Email sent successfully:', response.id);
      
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private getBaseUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Generate standardized email template
   * Uses Chicago Hub brand colors and typography to match the web application
   */
  private generateEmailTemplate(options: {
    title: string;
    preheader?: string;
    content: string;
    headerColor?: string;
    headerIcon?: string;
    recipientEmail: string;
  }): string {
    const { title, preheader, content, headerColor, headerIcon, recipientEmail } = options;
    const primaryColor = headerColor || this.BRAND_COLORS.navy;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${title}</title>
        ${preheader ? `<style type="text/css">
          .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        </style>` : ''}
        <!--[if mso]>
        <style type="text/css">
          .button { padding: 12px 30px !important; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: ${this.BRAND_COLORS.cream}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        ${preheader ? `<span class="preheader" style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">${preheader}</span>` : ''}
        
        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${this.BRAND_COLORS.cream};">
          <tr>
            <td style="padding: 40px 20px;">
              
              <!-- Main Email Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${this.BRAND_COLORS.white}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
                    ${headerIcon ? `<div style="font-size: 48px; margin-bottom: 16px;">${headerIcon}</div>` : ''}
                    <h1 style="margin: 0; color: ${this.BRAND_COLORS.white}; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 600; line-height: 1.2;">${title}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; color: ${this.BRAND_COLORS.navy}; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: ${this.BRAND_COLORS.lightGray}; padding: 30px; text-align: center; border-top: 1px solid ${this.BRAND_COLORS.border};">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray}; line-height: 1.5;">
                      <strong style="color: ${this.BRAND_COLORS.navy};">Chicago Hub</strong> — Your Premier Media Planning Platform
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: ${this.BRAND_COLORS.mediumGray};">
                      © ${new Date().getFullYear()} Chicago Hub. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: ${this.BRAND_COLORS.mediumGray};">
                      This email was sent to <a href="mailto:${recipientEmail}" style="color: ${this.BRAND_COLORS.orange}; text-decoration: none;">${recipientEmail}</a>
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
        
      </body>
      </html>
    `;
  }

  /**
   * Generate a call-to-action button with consistent styling
   */
  private generateButton(text: string, url: string, color?: string): string {
    const buttonColor = color || this.BRAND_COLORS.orange;
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
        <tr>
          <td style="border-radius: 6px; background-color: ${buttonColor};">
            <a href="${url}" target="_blank" class="button" style="display: inline-block; padding: 14px 32px; color: ${this.BRAND_COLORS.white}; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px; background-color: ${buttonColor};">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate an info box with consistent styling
   */
  private generateInfoBox(content: string, color?: string): string {
    const accentColor = color || this.BRAND_COLORS.orange;
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.lightGray}; border-left: 4px solid ${accentColor}; padding: 20px; border-radius: 6px;">
            ${content}
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate an alert/warning box
   */
  private generateAlertBox(content: string, type: 'warning' | 'info' | 'success' = 'warning'): string {
    const colors = {
      warning: { bg: '#fff3cd', border: '#ffc107', icon: '⚠️' },
      info: { bg: '#d1ecf1', border: '#0dcaf0', icon: 'ℹ️' },
      success: { bg: '#d4edda', border: this.BRAND_COLORS.green, icon: '✓' }
    };
    const config = colors[type];

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 6px; padding: 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td width="30" style="vertical-align: top; padding-right: 12px; font-size: 20px;">${config.icon}</td>
                <td style="color: ${this.BRAND_COLORS.navy}; font-size: 15px; line-height: 1.5;">
                  ${content}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  // Welcome email for new users
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
    const verificationLink = data.verificationToken 
      ? `${this.getBaseUrl()}/verify-email?token=${data.verificationToken}`
      : null;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        Thank you for joining <strong>Chicago Hub</strong>, your premier platform for media planning and advertising opportunities in the Chicago area.
      </p>
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        With Chicago Hub, you can:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">🎯 Discover targeted advertising packages</li>
        <li style="margin-bottom: 8px;">📊 Access detailed audience demographics</li>
        <li style="margin-bottom: 8px;">🤝 Connect with local media partners</li>
        <li style="margin-bottom: 8px;">💡 Get AI-powered media planning recommendations</li>
      </ul>
      
      ${verificationLink ? `
        <p style="margin: 0 0 8px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
          Please verify your email address to get started:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          ${this.generateButton('Verify Email Address', verificationLink, this.BRAND_COLORS.green)}
        </div>
        <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationLink}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${verificationLink}</a>
        </p>
      ` : `
        <div style="text-align: center; margin: 24px 0;">
          ${this.generateButton('Get Started', `${this.getBaseUrl()}/dashboard`)}
        </div>
      `}
      
      <p style="margin: 24px 0 0 0;">
        If you have any questions, don't hesitate to reach out to our support team.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Welcome aboard!<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Welcome to Chicago Hub!',
      preheader: 'Your media planning journey starts here',
      content,
      headerColor: this.BRAND_COLORS.navy,
      headerIcon: '🎉',
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: '🎉 Welcome to Chicago Hub!',
      html
    });
  }

  // Password reset email
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> {
    const resetLink = `${this.getBaseUrl()}/reset-password?token=${data.resetToken}`;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        We received a request to reset your password for your Chicago Hub account.
      </p>
      
      ${this.generateAlertBox(
        '<strong>Security Notice:</strong> If you didn\'t request this password reset, please ignore this email. Your account remains secure.',
        'warning'
      )}
      
      <p style="margin: 0 0 8px 0;">
        To reset your password, click the button below:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Reset Password', resetLink, this.BRAND_COLORS.red)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${resetLink}</a>
      </p>
      
      <p style="margin: 24px 0 8px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Important:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px; color: ${this.BRAND_COLORS.navy};">
        <li style="margin-bottom: 8px;">This link will expire in 1 hour for security</li>
        <li style="margin-bottom: 8px;">You can only use this link once</li>
        <li style="margin-bottom: 8px;">If you need a new reset link, request another one</li>
      </ul>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Password Reset Request',
      preheader: 'Reset your Chicago Hub password securely',
      content,
      headerColor: this.BRAND_COLORS.red,
      headerIcon: '🔐',
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: '🔐 Reset Your Chicago Hub Password',
      html
    });
  }

  // Email verification email
  async sendEmailVerificationEmail(data: EmailVerificationData): Promise<{ success: boolean; error?: string }> {
    const verificationLink = `${this.getBaseUrl()}/verify-email?token=${data.verificationToken}`;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        Please verify your email address to complete your <strong>Chicago Hub</strong> account setup.
      </p>
      
      <p style="margin: 0 0 8px 0;">
        Click the button below to verify your email:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Verify Email Address', verificationLink, this.BRAND_COLORS.green)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${verificationLink}</a>
      </p>
      
      <p style="margin: 24px 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Once verified, you'll have full access to:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">🎯 Personalized advertising recommendations</li>
        <li style="margin-bottom: 8px;">💾 Save and manage your favorite packages</li>
        <li style="margin-bottom: 8px;">📊 Access detailed analytics and insights</li>
        <li style="margin-bottom: 8px;">🤖 AI-powered media planning assistant</li>
      </ul>
      
      <p style="margin: 0 0 24px 0;">
        Thanks for joining Chicago Hub!
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Verify Your Email',
      preheader: 'Complete your Chicago Hub account setup',
      content,
      headerColor: this.BRAND_COLORS.green,
      headerIcon: '✅',
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: '✅ Verify Your Chicago Hub Email',
      html
    });
  }

  // User invitation email (for hub/publication access)
  // NOTE: Invitation emails are critical and always sent regardless of EMAIL_NOTIFICATIONS_ENABLED
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Invitation emails are critical - always send them (don't check isNotificationEmailEnabled)
    console.log(`📧 [INVITATION EMAIL] Sending invitation to ${data.recipientEmail} for ${data.resourceName}`);

    const acceptLink = `${this.getBaseUrl()}/accept-invitation/${data.invitationToken}`;
    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">📍 Resource Name:</strong> ${data.resourceName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">👤 Invited By:</strong> ${data.invitedByName}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        <strong>${data.invitedByName}</strong> has invited you to join <strong>${data.resourceName}</strong> on Chicago Hub.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.orange)}
      
      <p style="margin: 0 0 16px 0;">
        ${data.isExistingUser 
          ? 'Since you already have a Chicago Hub account, simply click the button below to accept this invitation and gain access:'
          : 'To get started, you\'ll need to create your Chicago Hub account. Click the button below to accept this invitation and set up your account:'
        }
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Accept Invitation', acceptLink)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${acceptLink}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${acceptLink}</a>
      </p>
      
      <p style="margin: 24px 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        What you'll be able to do:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">✅ Manage ${data.resourceType === 'hub' ? 'hub settings and publications' : 'publication details and content'}</li>
        <li style="margin-bottom: 8px;">✅ Invite other team members</li>
        <li style="margin-bottom: 8px;">✅ Access analytics and insights</li>
        <li style="margin-bottom: 8px;">✅ Collaborate with your team</li>
      </ul>
      
      ${this.generateAlertBox(
        '<strong>Note:</strong> This invitation will expire in 7 days.',
        'info'
      )}
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Welcome to the team!<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'You\'re Invited!',
      preheader: `Join ${data.resourceName} on Chicago Hub`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      headerIcon: '🎉',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `🎉 You've been invited to ${data.resourceName} on Chicago Hub`,
      html
    });
  }

  // Access granted notification
  async sendAccessGrantedEmail(data: AccessGrantedEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send access granted email to ${data.recipientEmail} for ${data.resourceName}`);
      return { success: true, skipped: true };
    }

    const dashboardLink = `${this.getBaseUrl()}/dashboard`;
    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">📍 Resource Name:</strong> ${data.resourceName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">✓ Status:</strong> <span style="color: ${this.BRAND_COLORS.green};">Access Granted</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! You now have access to <strong>${data.resourceName}</strong> on Chicago Hub.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.green)}
      
      <p style="margin: 0 0 16px 0;">
        You can now manage this ${data.resourceType} and collaborate with your team.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Go to Dashboard', dashboardLink, this.BRAND_COLORS.green)}
      </div>
      
      <p style="margin: 24px 0 0 0;">
        If you have any questions, don't hesitate to reach out to your team administrator.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Access Granted!',
      preheader: `You now have access to ${data.resourceName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      headerIcon: '✅',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `✅ Access Granted to ${data.resourceName}`,
      html
    });
  }

  // Access revoked notification
  async sendAccessRevokedEmail(data: AccessRevokedEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send access revoked email to ${data.recipientEmail} for ${data.resourceName}`);
      return { success: true, skipped: true };
    }

    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">📍 Resource Name:</strong> ${data.resourceName}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        We're writing to let you know that your access to <strong>${data.resourceName}</strong> has been removed.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.mediumGray)}
      
      <p style="margin: 0 0 16px 0;">
        If you believe this was done in error or have questions, please contact your team administrator.
      </p>
      
      <p style="margin: 0 0 24px 0;">
        Thank you for your time with this ${data.resourceType}.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Access Update',
      preheader: `Your access to ${data.resourceName} has been updated`,
      content,
      headerColor: this.BRAND_COLORS.mediumGray,
      headerIcon: '🔒',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `Access Update for ${data.resourceName}`,
      html
    });
  }

  // Role change notification
  async sendRoleChangeEmail(data: RoleChangeEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send role change email to ${data.recipientEmail} (${data.oldRole} -> ${data.newRole})`);
      return { success: true, skipped: true };
    }

    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      hub_user: 'Hub User',
      publication_user: 'Publication User',
      standard: 'Standard User'
    };

    const oldRoleLabel = roleLabels[data.oldRole] || data.oldRole;
    const newRoleLabel = roleLabels[data.newRole] || data.newRole;

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">Previous Role:</strong> ${oldRoleLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">New Role:</strong> <span style="color: ${this.BRAND_COLORS.orange};">${newRoleLabel}</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Your role on <strong>Chicago Hub</strong> has been updated.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.orange)}
      
      <p style="margin: 0 0 16px 0;">
        This change may affect your permissions and what you can access on the platform. If you have any questions about your new role, please contact your administrator.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Role Updated',
      preheader: 'Your Chicago Hub role has been changed',
      content,
      headerColor: this.BRAND_COLORS.navy,
      headerIcon: '🔄',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: '🔄 Your Chicago Hub Role Has Been Updated',
      html
    });
  }

  // Lead inquiry notification email (for admins)
  async sendLeadNotificationEmail(leadData: any): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send lead notification email for ${leadData.businessName} - ${leadData.contactName}`);
      return { success: true, skipped: true };
    }

    const adminEmail = process.env.ADMIN_EMAIL || this.config.fromEmail;
    
    const generateInfoRow = (label: string, value: string) => `
      <tr>
        <td style="padding: 12px 16px; background-color: ${this.BRAND_COLORS.lightGray}; border-radius: 6px; margin-bottom: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-weight: 600; color: ${this.BRAND_COLORS.navy}; font-size: 14px; padding-bottom: 4px;">
                ${label}
              </td>
            </tr>
            <tr>
              <td style="color: ${this.BRAND_COLORS.navy}; font-size: 15px;">
                ${value}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.orange}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        New Lead Submission
      </h2>
      
      <p style="margin: 0 0 20px 0; font-size: 15px;">
        A new lead inquiry has been submitted through Chicago Hub. Review the details below and follow up promptly!
      </p>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        ${generateInfoRow('👤 Contact Name', leadData.contactName)}
        ${generateInfoRow('📧 Email', `<a href="mailto:${leadData.contactEmail}" style="color: ${this.BRAND_COLORS.orange}; text-decoration: none;">${leadData.contactEmail}</a>`)}
        ${generateInfoRow('📱 Phone', leadData.contactPhone || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not provided</span>')}
        ${generateInfoRow('🏢 Business Name', leadData.businessName)}
        ${generateInfoRow('🌐 Website', leadData.websiteUrl ? `<a href="${leadData.websiteUrl}" target="_blank" style="color: ${this.BRAND_COLORS.orange}; text-decoration: none;">${leadData.websiteUrl}</a>` : '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not provided</span>')}
        ${generateInfoRow('💰 Budget Range', leadData.budgetRange || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not specified</span>')}
        ${generateInfoRow('📅 Timeline', leadData.timeline || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not specified</span>')}
        ${leadData.marketingGoals && leadData.marketingGoals.length > 0 ? generateInfoRow('🎯 Marketing Goals', leadData.marketingGoals.map((goal: string) => `• ${goal}`).join('<br>')) : ''}
      </table>
      
      ${this.generateAlertBox(
        '<strong>Action Required:</strong> Follow up promptly to convert this lead! First response time is critical for conversion rates.',
        'info'
      )}
      
      <p style="margin: 20px 0 0 0; font-size: 13px; color: ${this.BRAND_COLORS.mediumGray};">
        Lead submitted at ${new Date().toLocaleString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'New Lead Inquiry',
      preheader: `${leadData.businessName} - ${leadData.contactName}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      headerIcon: '🎯',
      recipientEmail: adminEmail
    });

    return await this.sendEmail({
      to: adminEmail,
      subject: `🎯 New Lead: ${leadData.businessName} - ${leadData.contactName}`,
      html
    });
  }

  // Assets ready notification email (for publications)
  async sendAssetsReadyEmail(data: AssetsReadyEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send assets ready email to ${data.recipientEmail} for campaign "${data.campaignName}"`);
      return { success: true, skipped: true };
    }

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">🏢 Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">📦 Assets Ready:</strong> <span style="color: ${this.BRAND_COLORS.green};">${data.assetCount} file${data.assetCount !== 1 ? 's' : ''}</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! The creative assets for your campaign <strong>"${data.campaignName}"</strong> are now ready for download.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.green)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        You can now:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">📥 Download print-ready files</li>
        <li style="margin-bottom: 8px;">📋 Copy tracking scripts for digital placements</li>
        <li style="margin-bottom: 8px;">👁️ Preview all creative assets</li>
        <li style="margin-bottom: 8px;">✅ Confirm placement specifications</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Order & Download Assets', data.orderUrl, this.BRAND_COLORS.green)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.orderUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.orderUrl}</a>
      </p>
      
      ${this.generateAlertBox(
        '<strong>Next Step:</strong> Review the creative assets and accept the placements to move forward with production.',
        'info'
      )}
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>${data.hubName || 'The Chicago Hub Team'}</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Creative Assets Ready!',
      preheader: `Download assets for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      headerIcon: '📦',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `📦 Creative Assets Ready: ${data.campaignName}`,
      html
    });
  }

  // Order sent notification email (for publications)
  async sendOrderSentEmail(data: OrderSentEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send order sent email to ${data.recipientEmail} for campaign "${data.campaignName}"`);
      return { success: true, skipped: true };
    }

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">🏢 Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">📰 Publication:</strong> ${data.publicationName}<br>
        ${data.flightDates ? `<strong style="color: ${this.BRAND_COLORS.navy};">📅 Flight Dates:</strong> ${data.flightDates}<br>` : ''}
        ${data.totalValue ? `<strong style="color: ${this.BRAND_COLORS.navy};">💰 Order Value:</strong> $${data.totalValue.toLocaleString()}<br>` : ''}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        You have received a new insertion order for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.orange)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Please review and:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">📋 Review the order details and placements</li>
        <li style="margin-bottom: 8px;">✅ Accept or reject individual placements</li>
        <li style="margin-bottom: 8px;">💬 Send any questions via the messaging system</li>
        <li style="margin-bottom: 8px;">📥 Download creative assets when available</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Order Details', data.orderUrl, this.BRAND_COLORS.orange)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.orderUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.orderUrl}</a>
      </p>
      
      ${this.generateAlertBox(
        '<strong>Action Required:</strong> Please review and respond to this order at your earliest convenience.',
        'info'
      )}
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>${data.hubName || 'The Chicago Hub Team'}</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'New Insertion Order',
      preheader: `New order received for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      headerIcon: '📋',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `📋 New Insertion Order: ${data.campaignName}`,
      html
    });
  }

  // Order confirmed notification email (for hub admins)
  async sendOrderConfirmedEmail(data: OrderConfirmedEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send order confirmed email to ${data.recipientEmail} for campaign "${data.campaignName}"`);
      return { success: true, skipped: true };
    }

    const confirmedDate = data.confirmedAt ? new Date(data.confirmedAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">🏢 Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">📰 Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">✅ Confirmed:</strong> <span style="color: ${this.BRAND_COLORS.green};">${confirmedDate}</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! <strong>${data.publicationName}</strong> has confirmed their order for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.green)}
      
      <p style="margin: 0 0 16px 0;">
        The publication has reviewed and accepted the order. You can now proceed with the next steps of your campaign.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Campaign', data.campaignUrl, this.BRAND_COLORS.green)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.campaignUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.campaignUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Order Confirmed!',
      preheader: `${data.publicationName} confirmed order for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      headerIcon: '✅',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `✅ Order Confirmed: ${data.publicationName} - ${data.campaignName}`,
      html
    });
  }

  // Placement rejected notification email (for hub admins)
  async sendPlacementRejectedEmail(data: PlacementRejectedEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send placement rejected email to ${data.recipientEmail} for "${data.placementName}" on campaign "${data.campaignName}"`);
      return { success: true, skipped: true };
    }

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Campaign:</strong> ${data.campaignName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">📰 Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">❌ Rejected Placement:</strong> <span style="color: ${this.BRAND_COLORS.red};">${data.placementName}</span>
        ${data.rejectionReason ? `<br><strong style="color: ${this.BRAND_COLORS.navy};">📝 Reason:</strong> ${data.rejectionReason}` : ''}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        <strong>${data.publicationName}</strong> has rejected a placement for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.red)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Recommended next steps:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">💬 Contact the publication to understand the rejection</li>
        <li style="margin-bottom: 8px;">🔄 Consider alternative placements or publications</li>
        <li style="margin-bottom: 8px;">📝 Update the campaign if needed</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Campaign', data.campaignUrl, this.BRAND_COLORS.orange)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.campaignUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.campaignUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The Chicago Hub Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Placement Rejected',
      preheader: `${data.publicationName} rejected "${data.placementName}" for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.red,
      headerIcon: '❌',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `❌ Placement Rejected: ${data.placementName} - ${data.campaignName}`,
      html
    });
  }

  // Message notification email (for order conversations)
  async sendMessageNotificationEmail(data: MessageNotificationEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    // Check if notification emails are enabled
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send message notification email to ${data.recipientEmail} for campaign "${data.campaignName}"`);
      return { success: true, skipped: true };
    }

    const infoBoxContent = `
      <p style="margin: 0; line-height: 1.8; font-size: 15px;">
        <strong style="color: ${this.BRAND_COLORS.navy};">📋 Campaign:</strong> ${data.campaignName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">📰 Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">👤 From:</strong> ${data.senderName}
      </p>
    `;

    const messagePreviewHtml = data.messagePreview ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.cream}; border: 1px solid ${this.BRAND_COLORS.border}; border-radius: 6px; padding: 16px;">
            <p style="margin: 0; font-style: italic; color: ${this.BRAND_COLORS.navy}; font-size: 15px; line-height: 1.5;">
              "${data.messagePreview}${data.messagePreview.length >= 100 ? '...' : ''}"
            </p>
          </td>
        </tr>
      </table>
    ` : '';

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        You have a new message from <strong>${data.senderName}</strong> regarding <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent, this.BRAND_COLORS.orange)}
      
      ${messagePreviewHtml}
      
      <p style="margin: 0 0 16px 0;">
        Click the button below to view the full conversation and reply:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Conversation', data.orderUrl, this.BRAND_COLORS.orange)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.orderUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.orderUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>${data.hubName || 'The Chicago Hub Team'}</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'New Message',
      preheader: `${data.senderName} sent you a message about ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.navy,
      headerIcon: '💬',
      recipientEmail: data.recipientEmail
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `💬 New Message: ${data.campaignName}`,
      html
    });
  }
}

// Create and export email service instance
export const createEmailService = (): EmailService | null => {
  const config = {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
    baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
    fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
    fromName: process.env.MAILGUN_FROM_NAME || 'Chicago Hub'
  };

  console.log('📧 [EMAIL SERVICE] Checking Mailgun config:', {
    hasApiKey: !!config.apiKey,
    hasDomain: !!config.domain,
    hasFromEmail: !!config.fromEmail,
    baseUrl: config.baseUrl
  });

  // Check if required config is present
  if (!config.apiKey || !config.domain || !config.fromEmail) {
    console.warn('❌ [EMAIL SERVICE] Mailgun configuration incomplete. Email service disabled.');
    console.warn('Missing:', {
      apiKey: !config.apiKey,
      domain: !config.domain,
      fromEmail: !config.fromEmail
    });
    return null;
  }

  console.log('✅ [EMAIL SERVICE] Mailgun configured successfully');
  return new EmailService(config);
};

export const emailService = createEmailService();
