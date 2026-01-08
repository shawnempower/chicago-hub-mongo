/**
 * Test script to send a message notification email
 * Run with: npx tsx scripts/testMessageEmail.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { emailService } from '../server/emailService';

async function sendTestEmail() {
  if (!emailService) {
    console.error('❌ Email service not configured. Check your environment variables.');
    process.exit(1);
  }

  console.log('📧 Sending test message notification email...');

  const result = await emailService.sendMessageNotificationEmail({
    recipientEmail: 'shawn@empowerlocal.com',
    recipientName: 'Shawn',
    senderName: 'Jane Smith (Chicago Tribune)',
    campaignName: 'Summer 2025 Brand Campaign',
    publicationName: 'Chicago Tribune',
    messagePreview: 'Hi there! I wanted to follow up on the creative assets for the upcoming campaign. Can we schedule a quick call to discuss the specifications?',
    orderUrl: 'https://hub.empowerlocal.com/dashboard?tab=order-detail&campaignId=test123&publicationId=456',
    hubName: 'Chicago Hub'
  });

  if (result.success) {
    if (result.skipped) {
      console.log('⚠️ Email was skipped (notifications disabled in environment)');
    } else {
      console.log('✅ Test email sent successfully!');
    }
  } else {
    console.error('❌ Failed to send email:', result.error);
  }

  process.exit(0);
}

sendTestEmail();




