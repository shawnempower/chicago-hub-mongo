/**
 * Test email configuration
 */
import dotenv from 'dotenv';
dotenv.config();

async function testEmailConfig() {
  console.log('\n📧 Email Configuration Check\n');
  console.log('================================');
  
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const mailgunBaseUrl = process.env.MAILGUN_BASE_URL;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL;
  const fromName = process.env.MAILGUN_FROM_NAME;
  
  console.log('MAILGUN_API_KEY:', mailgunApiKey ? `✅ SET (${mailgunApiKey.substring(0, 10)}...)` : '❌ NOT SET');
  console.log('MAILGUN_DOMAIN:', mailgunDomain ? `✅ SET (${mailgunDomain})` : '❌ NOT SET');
  console.log('MAILGUN_BASE_URL:', mailgunBaseUrl ? `✅ SET (${mailgunBaseUrl})` : '⚠️  NOT SET (will use default)');
  console.log('MAILGUN_FROM_EMAIL:', fromEmail ? `✅ SET (${fromEmail})` : '❌ NOT SET');
  console.log('MAILGUN_FROM_NAME:', fromName ? `✅ SET (${fromName})` : '⚠️  NOT SET (will use "Chicago Hub")');
  
  console.log('\n================================\n');
  
  if (!mailgunApiKey || !mailgunDomain || !fromEmail) {
    console.log('❌ Email service is DISABLED due to missing configuration!\n');
    console.log('Required environment variables:');
    console.log('  - MAILGUN_API_KEY');
    console.log('  - MAILGUN_DOMAIN');
    console.log('  - MAILGUN_FROM_EMAIL\n');
    console.log('Add these to your .env file to enable email notifications.');
  } else {
    console.log('✅ Email service is ENABLED and ready to send emails!\n');
    
    // Try to initialize the email service
    try {
      const { emailService } = await import('../server/emailService');
      if (emailService) {
        console.log('✅ EmailService initialized successfully!');
      } else {
        console.log('❌ EmailService failed to initialize (returned null)');
      }
    } catch (error) {
      console.log('❌ Error loading EmailService:', error);
    }
  }
  
  process.exit(0);
}

testEmailConfig();

