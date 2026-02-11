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
  fromName?: string; // Optional override for hub-specific branding
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
  hubName?: string; // Hub name for branding
}

interface AccessGrantedEmailData {
  recipientEmail: string;
  recipientName?: string;
  resourceType: 'hub' | 'publication';
  resourceName: string;
  grantedBy: string;
  hubName?: string; // Hub name for branding
}

interface AccessRevokedEmailData {
  recipientEmail: string;
  recipientName?: string;
  resourceType: 'hub' | 'publication';
  resourceName: string;
  revokedBy: string;
  hubName?: string; // Hub name for branding
}

interface RoleChangeEmailData {
  recipientEmail: string;
  recipientName?: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  hubName?: string; // Hub name for branding
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
  hubName?: string; // Hub name for branding
}

interface PlacementRejectedEmailData {
  recipientEmail: string;
  recipientName?: string;
  publicationName: string;
  placementName: string;
  campaignName: string;
  rejectionReason?: string;
  campaignUrl: string;
  hubName?: string; // Hub name for branding
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

interface ConversationEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  subject: string;
  messageContent: string;
  conversationUrl: string;
  hubName?: string;
}

interface BroadcastEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  broadcastSubject: string;
  messageContent: string;
  conversationUrl: string;
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
    cream: '#faf7f2',       // hsl(42 30% 95%) - Background (matches dashboard)
    lightGray: '#f8f9fa',   // hsl(0 0% 98%) - Muted
    mediumGray: '#6c757d',  // hsl(215 16% 47%) - Muted foreground
    red: '#e74c3c',         // hsl(0 84% 60%) - Destructive
    white: '#ffffff',
    border: '#e5e7eb',      // hsl(215 20% 90%)
    buttonColor: 'rgb(37, 46, 55)', // Standard button color for all emails
    // Cream variations for info boxes and footer
    infoBoxCream: '#f5f0e8',      // Slightly darker cream for info box background
    infoBoxBorderCream: '#e8dcc8', // Stronger cream tone for left border
    footerCream: '#f0ebe3',        // Darker cream for footer (to stand out from main bg)
    // Orange for body info boxes and alert boxes
    lightOrange: '#fff3e0', // Light orange background for info/alert boxes
    // Light versions for header backgrounds (with dark text)
    lightNavy: '#e8eaed',   // Light navy background
    lightOrangeHeader: '#fef4ed', // Light orange background for headers
    lightGreen: '#e8f5ed',  // Light green background
    lightRed: '#fdecea',    // Light red background
    lightGrayHeader: '#f5f5f6'    // Light gray background for headers
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
      // Use hub-specific fromName if provided, otherwise fall back to config
      const senderName = emailData.fromName || this.config.fromName;
      const data = {
        from: `${senderName} <${this.config.fromEmail}>`,
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
   * Get light background and dark text color for header based on primary color
   */
  private getHeaderColors(primaryColor: string): { backgroundColor: string; textColor: string } {
    const colorMap: { [key: string]: { backgroundColor: string; textColor: string } } = {
      [this.BRAND_COLORS.navy]: { backgroundColor: this.BRAND_COLORS.lightNavy, textColor: this.BRAND_COLORS.navy },
      [this.BRAND_COLORS.orange]: { backgroundColor: this.BRAND_COLORS.lightOrangeHeader, textColor: this.BRAND_COLORS.orange },
      [this.BRAND_COLORS.green]: { backgroundColor: this.BRAND_COLORS.lightGreen, textColor: this.BRAND_COLORS.green },
      [this.BRAND_COLORS.red]: { backgroundColor: this.BRAND_COLORS.lightRed, textColor: this.BRAND_COLORS.red },
      [this.BRAND_COLORS.mediumGray]: { backgroundColor: this.BRAND_COLORS.lightGray, textColor: this.BRAND_COLORS.mediumGray }
    };

    return colorMap[primaryColor] || { backgroundColor: this.BRAND_COLORS.lightNavy, textColor: this.BRAND_COLORS.navy };
  }

  /**
   * Generate standardized email template
   * Uses brand colors and typography to match the web application
   * @param hubName - Optional hub name for branding (defaults to MAILGUN_FROM_NAME)
   */
  private generateEmailTemplate(options: {
    title: string;
    preheader?: string;
    content: string;
    headerColor?: string;
    headerIcon?: string;
    recipientEmail: string;
    hubName?: string; // Hub name for footer branding
  }): string {
    const { title, preheader, content, headerColor, headerIcon, recipientEmail, hubName } = options;
    const primaryColor = headerColor || this.BRAND_COLORS.navy;
    const { backgroundColor, textColor } = this.getHeaderColors(primaryColor);
    // Use hubName if provided, otherwise fall back to config fromName
    const brandName = hubName || this.config.fromName;

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
                  <td style="background-color: ${backgroundColor}; padding: 40px 30px; text-align: center;">
                    ${headerIcon ? `<div style="font-size: 48px; margin-bottom: 16px;">${headerIcon}</div>` : ''}
                    <h1 style="margin: 0; color: ${textColor}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 22px; font-weight: 400; line-height: 1.2;">${title}</h1>
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
                  <td style="background-color: ${this.BRAND_COLORS.footerCream}; padding: 30px; text-align: center; border-top: 1px solid ${this.BRAND_COLORS.border};">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray}; line-height: 1.5;">
                      <strong style="color: ${this.BRAND_COLORS.navy};">${brandName}</strong>
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: ${this.BRAND_COLORS.mediumGray};">
                      © ${new Date().getFullYear()} ${brandName}. All rights reserved.
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
   * All buttons use standard dark color and are 2x wider
   */
  private generateButton(text: string, url: string): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
        <tr>
          <td style="border-radius: 6px; background-color: ${this.BRAND_COLORS.buttonColor};">
            <a href="${url}" target="_blank" class="button" style="display: inline-block; padding: 14px 64px; color: ${this.BRAND_COLORS.white}; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px; background-color: ${this.BRAND_COLORS.buttonColor};">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate an info box with consistent styling
   * Uses cream background with darker cream left border
   */
  private generateInfoBox(content: string): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.infoBoxCream}; border-left: 4px solid ${this.BRAND_COLORS.infoBoxBorderCream}; padding: 20px; border-radius: 6px;">
            ${content}
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Generate an alert/warning box
   * All alert boxes use light orange background with orange left border
   */
  private generateAlertBox(content: string, type: 'warning' | 'info' | 'success' = 'warning'): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.lightOrange}; border-left: 4px solid ${this.BRAND_COLORS.orange}; border-radius: 6px; padding: 16px;">
            <div style="color: ${this.BRAND_COLORS.navy}; font-size: 15px; line-height: 1.5;">
              ${content}
            </div>
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
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        Thank you for joining <strong>${this.config.fromName}</strong>, your premier platform for media planning and advertising opportunities.
      </p>
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        With ${this.config.fromName}, you can:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Discover targeted advertising packages</li>
        <li style="margin-bottom: 8px;">Access detailed audience demographics</li>
        <li style="margin-bottom: 8px;">Connect with local media partners</li>
        <li style="margin-bottom: 8px;">Get AI-powered media planning recommendations</li>
      </ul>
      
      ${verificationLink ? `
        <p style="margin: 0 0 8px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
          Please verify your email address to get started:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          ${this.generateButton('Verify Email Address', verificationLink)}
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
        <strong>The ${this.config.fromName} Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: `Welcome to ${this.config.fromName}!`,
      preheader: 'Your media planning journey starts here',
      content,
      headerColor: this.BRAND_COLORS.navy,
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: `Welcome to ${this.config.fromName}!`,
      html
    });
  }

  // Password reset email
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> {
    const resetLink = `${this.getBaseUrl()}/reset-password?token=${data.resetToken}`;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        We received a request to reset your password for your ${this.config.fromName} account.
      </p>
      
      ${this.generateAlertBox(
        '<strong>Security Notice:</strong> If you didn\'t request this password reset, please ignore this email. Your account remains secure.',
        'warning'
      )}
      
      <p style="margin: 0 0 8px 0;">
        To reset your password, click the button below:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Reset Password', resetLink)}
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
        <strong>The ${this.config.fromName} Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Password Reset Request',
      preheader: `Reset your ${this.config.fromName} password securely`,
      content,
      headerColor: this.BRAND_COLORS.red,
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: `Reset Your ${this.config.fromName} Password`,
      html
    });
  }

  // Email verification email
  async sendEmailVerificationEmail(data: EmailVerificationData): Promise<{ success: boolean; error?: string }> {
    const verificationLink = `${this.getBaseUrl()}/verify-email?token=${data.verificationToken}`;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.firstName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 16px 0;">
        Please verify your email address to complete your <strong>${this.config.fromName}</strong> account setup.
      </p>
      
      <p style="margin: 0 0 8px 0;">
        Click the button below to verify your email:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Verify Email Address', verificationLink)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${verificationLink}</a>
      </p>
      
      <p style="margin: 24px 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Once verified, you'll have full access to:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Personalized advertising recommendations</li>
        <li style="margin-bottom: 8px;">Save and manage your favorite packages</li>
        <li style="margin-bottom: 8px;">Access detailed analytics and insights</li>
        <li style="margin-bottom: 8px;">AI-powered media planning assistant</li>
      </ul>
      
      <p style="margin: 0 0 24px 0;">
        Thanks for joining ${this.config.fromName}!
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${this.config.fromName} Team</strong>
      </p>
    `;

    const html = this.generateEmailTemplate({
      title: 'Verify Your Email',
      preheader: `Complete your ${this.config.fromName} account setup`,
      content,
      headerColor: this.BRAND_COLORS.green,
      recipientEmail: data.email
    });

    return await this.sendEmail({
      to: data.email,
      subject: `Verify Your ${this.config.fromName} Email`,
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Name:</strong> ${data.resourceName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Invited By:</strong> ${data.invitedByName}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        <strong>${data.invitedByName}</strong> has invited you to join <strong>${data.resourceName}</strong> on ${data.hubName || this.config.fromName}.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 16px 0;">
        ${data.isExistingUser 
          ? `Since you already have a ${data.hubName || this.config.fromName} account, simply click the button below to accept this invitation and gain access:`
          : `To get started, you'll need to create your ${data.hubName || this.config.fromName} account. Click the button below to accept this invitation and set up your account:`
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
        <li style="margin-bottom: 8px;">Manage ${data.resourceType === 'hub' ? 'hub settings and publications' : 'publication details and content'}</li>
        <li style="margin-bottom: 8px;">Invite other team members</li>
        <li style="margin-bottom: 8px;">Access analytics and insights</li>
        <li style="margin-bottom: 8px;">Collaborate with your team</li>
      </ul>
      
      ${this.generateAlertBox(
        '<strong>Note:</strong> This invitation will expire in 7 days.',
        'info'
      )}
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Welcome to the team!<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'You\'re Invited!',
      preheader: `Join ${data.resourceName} on ${hubBrandName}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `You've been invited to ${data.resourceName} on ${hubBrandName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Name:</strong> ${data.resourceName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Status:</strong> <span style="color: ${this.BRAND_COLORS.green};">Access Granted</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! You now have access to <strong>${data.resourceName}</strong> on ${data.hubName || this.config.fromName}.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 16px 0;">
        You can now manage this ${data.resourceType} and collaborate with your team.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('Go to Dashboard', dashboardLink)}
      </div>
      
      <p style="margin: 24px 0 0 0;">
        If you have any questions, don't hesitate to reach out to your team administrator.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Access Granted!',
      preheader: `You now have access to ${data.resourceName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] Access Granted to ${data.resourceName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Type:</strong> ${resourceTypeLabel}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Resource Name:</strong> ${data.resourceName}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        We're writing to let you know that your access to <strong>${data.resourceName}</strong> has been removed.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 16px 0;">
        If you believe this was done in error or have questions, please contact your team administrator.
      </p>
      
      <p style="margin: 0 0 24px 0;">
        Thank you for your time with this ${data.resourceType}.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Access Update',
      preheader: `Your access to ${data.resourceName} has been updated`,
      content,
      headerColor: this.BRAND_COLORS.mediumGray,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] Access Update for ${data.resourceName}`,
      html,
      fromName: data.hubName
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
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Your role on <strong>${data.hubName || this.config.fromName}</strong> has been updated.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 16px 0;">
        This change may affect your permissions and what you can access on the platform. If you have any questions about your new role, please contact your administrator.
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Role Updated',
      preheader: `Your ${hubBrandName} role has been changed`,
      content,
      headerColor: this.BRAND_COLORS.navy,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `Your ${hubBrandName} Role Has Been Updated`,
      html,
      fromName: data.hubName
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
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.orange}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        New Lead Submission
      </h2>
      
      <p style="margin: 0 0 20px 0; font-size: 15px;">
        A new lead inquiry has been submitted through ${leadData.hubName || this.config.fromName}. Review the details below and follow up promptly!
      </p>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        ${generateInfoRow('Contact Name', leadData.contactName)}
        ${generateInfoRow('Email', `<a href="mailto:${leadData.contactEmail}" style="color: ${this.BRAND_COLORS.orange}; text-decoration: none;">${leadData.contactEmail}</a>`)}
        ${generateInfoRow('Phone', leadData.contactPhone || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not provided</span>')}
        ${generateInfoRow('Business Name', leadData.businessName)}
        ${generateInfoRow('Website', leadData.websiteUrl ? `<a href="${leadData.websiteUrl}" target="_blank" style="color: ${this.BRAND_COLORS.orange}; text-decoration: none;">${leadData.websiteUrl}</a>` : '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not provided</span>')}
        ${generateInfoRow('Budget Range', leadData.budgetRange || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not specified</span>')}
        ${generateInfoRow('Timeline', leadData.timeline || '<span style="color: ' + this.BRAND_COLORS.mediumGray + ';">Not specified</span>')}
        ${leadData.marketingGoals && leadData.marketingGoals.length > 0 ? generateInfoRow('Marketing Goals', leadData.marketingGoals.map((goal: string) => `• ${goal}`).join('<br>')) : ''}
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

    const hubBrandName = leadData.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'New Lead Inquiry',
      preheader: `${leadData.businessName} - ${leadData.contactName}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      recipientEmail: adminEmail,
      hubName: leadData.hubName
    });

    return await this.sendEmail({
      to: adminEmail,
      subject: `[${hubBrandName}] New Lead: ${leadData.businessName} - ${leadData.contactName}`,
      html,
      fromName: leadData.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">Assets Ready:</strong> <span style="color: ${this.BRAND_COLORS.green};">${data.assetCount} file${data.assetCount !== 1 ? 's' : ''}</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! The creative assets for your campaign <strong>"${data.campaignName}"</strong> are now ready for download.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        You can now:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Download print-ready files</li>
        <li style="margin-bottom: 8px;">Copy tracking scripts for digital placements</li>
        <li style="margin-bottom: 8px;">Preview all creative assets</li>
        <li style="margin-bottom: 8px;">Confirm placement specifications</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Order & Download Assets', data.orderUrl)}
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
        <strong>The ${data.hubName} Team</strong>
      </p>
    `;

    if (!data.hubName) {
      console.warn('⚠️ [EMAIL] sendAssetsReadyEmail called without hubName - hub branding will be missing');
    }
    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Creative Assets Ready!',
      preheader: `Download assets for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] Creative Assets Ready: ${data.campaignName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">Publication:</strong> ${data.publicationName}<br>
        ${data.flightDates ? `<strong style="color: ${this.BRAND_COLORS.navy};">Flight Dates:</strong> ${data.flightDates}<br>` : ''}
        ${data.totalValue ? `<strong style="color: ${this.BRAND_COLORS.navy};">Order Value:</strong> $${data.totalValue.toLocaleString()}<br>` : ''}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        You have received a new insertion order for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Please review and:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Review the order details and placements</li>
        <li style="margin-bottom: 8px;">Accept or reject individual placements</li>
        <li style="margin-bottom: 8px;">Send any questions via the messaging system</li>
        <li style="margin-bottom: 8px;">Download creative assets when available</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Order Details', data.orderUrl)}
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
        <strong>The ${data.hubName} Team</strong>
      </p>
    `;

    if (!data.hubName) {
      console.warn('⚠️ [EMAIL] sendOrderSentEmail called without hubName - hub branding will be missing');
    }
    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'New Insertion Order',
      preheader: `New order received for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] New Insertion Order: ${data.campaignName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Campaign:</strong> ${data.campaignName}<br>
        ${data.advertiserName ? `<strong style="color: ${this.BRAND_COLORS.navy};">Advertiser:</strong> ${data.advertiserName}<br>` : ''}
        <strong style="color: ${this.BRAND_COLORS.navy};">Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Confirmed:</strong> <span style="color: ${this.BRAND_COLORS.green};">${confirmedDate}</span>
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        Great news! <strong>${data.publicationName}</strong> has confirmed their order for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 16px 0;">
        The publication has reviewed and accepted the order. You can now proceed with the next steps of your campaign.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Campaign', data.campaignUrl)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.campaignUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.campaignUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Order Confirmed!',
      preheader: `${data.publicationName} confirmed order for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.green,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] Order Confirmed: ${data.publicationName} - ${data.campaignName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Campaign:</strong> ${data.campaignName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Rejected Placement:</strong> <span style="color: ${this.BRAND_COLORS.red};">${data.placementName}</span>
        ${data.rejectionReason ? `<br><strong style="color: ${this.BRAND_COLORS.navy};">Reason:</strong> ${data.rejectionReason}` : ''}
      </p>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        <strong>${data.publicationName}</strong> has rejected a placement for <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${this.BRAND_COLORS.navy};">
        Recommended next steps:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Contact the publication to understand the rejection</li>
        <li style="margin-bottom: 8px;">Consider alternative placements or publications</li>
        <li style="margin-bottom: 8px;">Update the campaign if needed</li>
      </ul>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Campaign', data.campaignUrl)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.campaignUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.campaignUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'Placement Rejected',
      preheader: `${data.publicationName} rejected "${data.placementName}" for ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.red,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] Placement Rejected: ${data.placementName} - ${data.campaignName}`,
      html,
      fromName: data.hubName
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
        <strong style="color: ${this.BRAND_COLORS.navy};">Campaign:</strong> ${data.campaignName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">Publication:</strong> ${data.publicationName}<br>
        <strong style="color: ${this.BRAND_COLORS.navy};">From:</strong> ${data.senderName}
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
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        You have a new message from <strong>${data.senderName}</strong> regarding <strong>"${data.campaignName}"</strong>.
      </p>
      
      ${this.generateInfoBox(infoBoxContent)}
      
      ${messagePreviewHtml}
      
      <p style="margin: 0 0 16px 0;">
        Click the button below to view the full conversation and reply:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Conversation', data.orderUrl)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.orderUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.orderUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName} Team</strong>
      </p>
    `;

    if (!data.hubName) {
      console.warn('⚠️ [EMAIL] sendMessageNotificationEmail called without hubName - hub branding will be missing');
    }
    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: 'New Message',
      preheader: `${data.senderName} sent you a message about ${data.campaignName}`,
      content,
      headerColor: this.BRAND_COLORS.navy,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] New Message: ${data.campaignName}`,
      html,
      fromName: data.hubName
    });
  }

  // Direct conversation email (standalone messaging system)
  async sendConversationEmail(data: ConversationEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send conversation email to ${data.recipientEmail} re: "${data.subject}"`);
      return { success: true, skipped: true };
    }

    const messagePreviewHtml = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.cream}; border: 1px solid ${this.BRAND_COLORS.border}; border-radius: 6px; padding: 16px;">
            <p style="margin: 0; color: ${this.BRAND_COLORS.navy}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
              ${data.messageContent}
            </p>
          </td>
        </tr>
      </table>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        You have a new message from <strong>${data.senderName}</strong>.
      </p>
      
      ${data.subject ? this.generateInfoBox(`
        <p style="margin: 0; line-height: 1.8; font-size: 15px;">
          <strong style="color: ${this.BRAND_COLORS.navy};">Subject:</strong> ${data.subject}<br>
          <strong style="color: ${this.BRAND_COLORS.navy};">From:</strong> ${data.senderName}
        </p>
      `) : ''}
      
      ${messagePreviewHtml}
      
      <p style="margin: 0 0 16px 0;">
        Click the button below to view the full conversation and reply:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Conversation', data.conversationUrl)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.conversationUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.conversationUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: data.subject || 'New Message',
      preheader: `${data.senderName} sent you a message`,
      content,
      headerColor: this.BRAND_COLORS.navy,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName,
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] ${data.subject || 'New Message'}`,
      html,
      fromName: data.hubName,
    });
  }

  // Broadcast email (hub -> publications)
  async sendBroadcastEmail(data: BroadcastEmailData): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    if (!this.isNotificationEmailEnabled()) {
      console.log(`📧 [EMAIL DISABLED] Would send broadcast email to ${data.recipientEmail} re: "${data.broadcastSubject}"`);
      return { success: true, skipped: true };
    }

    const messagePreviewHtml = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: ${this.BRAND_COLORS.cream}; border: 1px solid ${this.BRAND_COLORS.border}; border-radius: 6px; padding: 16px;">
            <p style="margin: 0; color: ${this.BRAND_COLORS.navy}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
              ${data.messageContent}
            </p>
          </td>
        </tr>
      </table>
    `;

    const content = `
      <h2 style="margin: 0 0 20px 0; color: ${this.BRAND_COLORS.navy}; font-family: 'Hedvig Letters Serif', Georgia, serif; font-size: 24px; font-weight: 600;">
        Hi ${data.recipientName || 'there'}!
      </h2>
      
      <p style="margin: 0 0 20px 0;">
        <strong>${data.senderName}</strong> has sent a message to your publication network.
      </p>
      
      ${this.generateInfoBox(`
        <p style="margin: 0; line-height: 1.8; font-size: 15px;">
          <strong style="color: ${this.BRAND_COLORS.navy};">Subject:</strong> ${data.broadcastSubject}<br>
          <strong style="color: ${this.BRAND_COLORS.navy};">From:</strong> ${data.senderName}
        </p>
      `)}
      
      ${messagePreviewHtml}
      
      <p style="margin: 0 0 16px 0;">
        Click the button below to view the message and reply:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        ${this.generateButton('View Message', data.conversationUrl)}
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${this.BRAND_COLORS.mediumGray};">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.conversationUrl}" style="color: ${this.BRAND_COLORS.orange}; word-break: break-all;">${data.conversationUrl}</a>
      </p>
      
      <p style="margin: 24px 0 0 0; color: ${this.BRAND_COLORS.navy};">
        Best regards,<br>
        <strong>The ${data.hubName || this.config.fromName} Team</strong>
      </p>
    `;

    const hubBrandName = data.hubName || this.config.fromName;
    const html = this.generateEmailTemplate({
      title: data.broadcastSubject,
      preheader: `Broadcast from ${data.senderName}: ${data.broadcastSubject}`,
      content,
      headerColor: this.BRAND_COLORS.orange,
      recipientEmail: data.recipientEmail,
      hubName: data.hubName,
    });

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `[${hubBrandName}] ${data.broadcastSubject}`,
      html,
      fromName: data.hubName,
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
