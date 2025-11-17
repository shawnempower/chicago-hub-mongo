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

export class EmailService {
  private mg: any;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.mg = mailgun.client({
      username: 'api',
      key: config.apiKey,
      url: config.baseUrl
    });
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

  // Welcome email for new users
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
    const verificationLink = data.verificationToken 
      ? `${this.getBaseUrl()}/verify-email?token=${data.verificationToken}`
      : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Chicago Hub!</h1>
            <p>Your media planning journey starts here</p>
          </div>
          
          <div class="content">
            <h2>Hi ${data.firstName || 'there'}!</h2>
            
            <p>Thank you for joining Chicago Hub, your premier platform for media planning and advertising opportunities in the Chicago area.</p>
            
            <p>With Chicago Hub, you can:</p>
            <ul>
              <li>🎯 Discover targeted advertising packages</li>
              <li>📊 Access detailed audience demographics</li>
              <li>🤝 Connect with local media partners</li>
              <li>💡 Get AI-powered media planning recommendations</li>
            </ul>
            
            ${verificationLink ? `
              <p><strong>Please verify your email address to get started:</strong></p>
              <p style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </p>
              <p><small>If the button doesn't work, copy and paste this link: ${verificationLink}</small></p>
            ` : `
              <p style="text-align: center;">
                <a href="${this.getBaseUrl()}/dashboard" class="button">Get Started</a>
              </p>
            `}
            
            <p>If you have any questions, don't hesitate to reach out to our support team.</p>
            
            <p>Welcome aboard!<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.email,
      subject: '🎉 Welcome to Chicago Hub!',
      html
    });
  }

  // Password reset email
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> {
    const resetLink = `${this.getBaseUrl()}/reset-password?token=${data.resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.firstName || 'there'}!</h2>
            
            <p>We received a request to reset your password for your Chicago Hub account.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
            </div>
            
            <p>To reset your password, click the button below:</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            
            <p><small>If the button doesn't work, copy and paste this link: ${resetLink}</small></p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This link will expire in 1 hour for security</li>
              <li>You can only use this link once</li>
              <li>If you need a new reset link, request another one</li>
            </ul>
            
            <p>Best regards,<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.email,
      subject: '🔐 Reset Your Chicago Hub Password',
      html
    });
  }

  // Email verification email
  async sendEmailVerificationEmail(data: EmailVerificationData): Promise<{ success: boolean; error?: string }> {
    const verificationLink = `${this.getBaseUrl()}/verify-email?token=${data.verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Verify Your Email</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.firstName || 'there'}!</h2>
            
            <p>Please verify your email address to complete your Chicago Hub account setup.</p>
            
            <p>Click the button below to verify your email:</p>
            
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </p>
            
            <p><small>If the button doesn't work, copy and paste this link: ${verificationLink}</small></p>
            
            <p>Once verified, you'll have full access to:</p>
            <ul>
              <li>🎯 Personalized advertising recommendations</li>
              <li>💾 Save and manage your favorite packages</li>
              <li>📊 Access detailed analytics and insights</li>
              <li>🤖 AI-powered media planning assistant</li>
            </ul>
            
            <p>Thanks for joining Chicago Hub!</p>
            
            <p>Best regards,<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.email,
      subject: '✅ Verify Your Chicago Hub Email',
      html
    });
  }

  // User invitation email (for hub/publication access)
  async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
    const acceptLink = `${this.getBaseUrl()}/accept-invitation/${data.invitationToken}`;
    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${data.resourceName} - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info-box { background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.recipientName || 'there'}!</h2>
            
            <p><strong>${data.invitedByName}</strong> has invited you to join <strong>${data.resourceName}</strong> on Chicago Hub.</p>
            
            <div class="info-box">
              <strong>📋 Resource Type:</strong> ${resourceTypeLabel}<br>
              <strong>📍 Resource Name:</strong> ${data.resourceName}<br>
              <strong>👤 Invited By:</strong> ${data.invitedByName}
            </div>
            
            ${data.isExistingUser ? `
              <p>Since you already have a Chicago Hub account, simply click the button below to accept this invitation and gain access:</p>
            ` : `
              <p>To get started, you'll need to create your Chicago Hub account. Click the button below to accept this invitation and set up your account:</p>
            `}
            
            <p style="text-align: center;">
              <a href="${acceptLink}" class="button">Accept Invitation</a>
            </p>
            
            <p><small>If the button doesn't work, copy and paste this link: ${acceptLink}</small></p>
            
            <p><strong>What you'll be able to do:</strong></p>
            <ul>
              <li>✅ Manage ${data.resourceType === 'hub' ? 'hub settings and publications' : 'publication details and content'}</li>
              <li>✅ Invite other team members</li>
              <li>✅ Access analytics and insights</li>
              <li>✅ Collaborate with your team</li>
            </ul>
            
            <p><small><strong>Note:</strong> This invitation will expire in 7 days.</small></p>
            
            <p>Welcome to the team!<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `🎉 You've been invited to ${data.resourceName} on Chicago Hub`,
      html
    });
  }

  // Access granted notification
  async sendAccessGrantedEmail(data: AccessGrantedEmailData): Promise<{ success: boolean; error?: string }> {
    const dashboardLink = `${this.getBaseUrl()}/dashboard`;
    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Granted - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Access Granted!</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.recipientName || 'there'}!</h2>
            
            <p>Great news! You now have access to <strong>${data.resourceName}</strong> on Chicago Hub.</p>
            
            <div class="info-box">
              <strong>📋 Resource Type:</strong> ${resourceTypeLabel}<br>
              <strong>📍 Resource Name:</strong> ${data.resourceName}<br>
              <strong>✓ Status:</strong> Access Granted
            </div>
            
            <p>You can now manage this ${data.resourceType} and collaborate with your team.</p>
            
            <p style="text-align: center;">
              <a href="${dashboardLink}" class="button">Go to Dashboard</a>
            </p>
            
            <p>If you have any questions, don't hesitate to reach out to your team administrator.</p>
            
            <p>Best regards,<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `✅ Access Granted to ${data.resourceName}`,
      html
    });
  }

  // Access revoked notification
  async sendAccessRevokedEmail(data: AccessRevokedEmailData): Promise<{ success: boolean; error?: string }> {
    const resourceTypeLabel = data.resourceType === 'hub' ? 'Hub' : 'Publication';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Removed - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0; auto; padding: 20px; }
          .header { background: #6c757d; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .info-box { background: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Access Update</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.recipientName || 'there'}!</h2>
            
            <p>We're writing to let you know that your access to <strong>${data.resourceName}</strong> has been removed.</p>
            
            <div class="info-box">
              <strong>📋 Resource Type:</strong> ${resourceTypeLabel}<br>
              <strong>📍 Resource Name:</strong> ${data.resourceName}
            </div>
            
            <p>If you believe this was done in error or have questions, please contact your team administrator.</p>
            
            <p>Thank you for your time with this ${data.resourceType}.</p>
            
            <p>Best regards,<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: `Access Update for ${data.resourceName}`,
      html
    });
  }

  // Role change notification
  async sendRoleChangeEmail(data: RoleChangeEmailData): Promise<{ success: boolean; error?: string }> {
    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      hub_user: 'Hub User',
      publication_user: 'Publication User',
      standard: 'Standard User'
    };

    const oldRoleLabel = roleLabels[data.oldRole] || data.oldRole;
    const newRoleLabel = roleLabels[data.newRole] || data.newRole;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Role Updated - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .info-box { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Role Updated</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${data.recipientName || 'there'}!</h2>
            
            <p>Your role on Chicago Hub has been updated.</p>
            
            <div class="info-box">
              <strong>Previous Role:</strong> ${oldRoleLabel}<br>
              <strong>New Role:</strong> ${newRoleLabel}
            </div>
            
            <p>This change may affect your permissions and what you can access on the platform. If you have any questions about your new role, please contact your administrator.</p>
            
            <p>Best regards,<br>
            The Chicago Hub Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>This email was sent to ${data.recipientEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.recipientEmail,
      subject: '🔄 Your Chicago Hub Role Has Been Updated',
      html
    });
  }

  // Lead inquiry notification email (for admins)
  async sendLeadNotificationEmail(leadData: any): Promise<{ success: boolean; error?: string }> {
    const adminEmail = process.env.ADMIN_EMAIL || this.config.fromEmail;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Lead Inquiry - Chicago Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; text-align: center; padding: 30px 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .info-row { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
          .label { font-weight: bold; color: #495057; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Lead Inquiry</h1>
          </div>
          
          <div class="content">
            <h2>New Lead Submission</h2>
            
            <div class="info-row">
              <span class="label">Contact Name:</span> ${leadData.contactName}
            </div>
            
            <div class="info-row">
              <span class="label">Email:</span> ${leadData.contactEmail}
            </div>
            
            <div class="info-row">
              <span class="label">Phone:</span> ${leadData.contactPhone || 'Not provided'}
            </div>
            
            <div class="info-row">
              <span class="label">Business:</span> ${leadData.businessName}
            </div>
            
            <div class="info-row">
              <span class="label">Website:</span> ${leadData.websiteUrl || 'Not provided'}
            </div>
            
            <div class="info-row">
              <span class="label">Budget Range:</span> ${leadData.budgetRange || 'Not specified'}
            </div>
            
            <div class="info-row">
              <span class="label">Timeline:</span> ${leadData.timeline || 'Not specified'}
            </div>
            
            ${leadData.marketingGoals && leadData.marketingGoals.length > 0 ? `
              <div class="info-row">
                <span class="label">Marketing Goals:</span><br>
                ${leadData.marketingGoals.map((goal: string) => `• ${goal}`).join('<br>')}
              </div>
            ` : ''}
            
            <p><strong>Follow up promptly to convert this lead!</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2025 Chicago Hub. All rights reserved.</p>
            <p>Lead submitted at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: `🎯 New Lead: ${leadData.businessName} - ${leadData.contactName}`,
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
