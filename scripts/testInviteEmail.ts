/**
 * Test sending an invitation email
 */
import dotenv from 'dotenv';
dotenv.config();

async function testInviteEmail() {
  try {
    console.log('\n📧 Testing Invitation Email\n');
    
    // Import email service
    const { emailService } = await import('../server/emailService');
    
    if (!emailService) {
      console.log('❌ Email service is not initialized (returned null)');
      return;
    }
    
    console.log('✅ Email service loaded successfully\n');
    
    // Test sending an invitation email
    const testEmail = 'shawn@empowerlocal.com'; // Send to your email
    
    console.log(`Sending test invitation email to: ${testEmail}...`);
    
    const result = await emailService.sendInvitationEmail({
      invitedByName: 'Test Admin',
      invitedByEmail: 'admin@empowerlocal.co',
      recipientEmail: testEmail,
      recipientName: 'Shawn',
      resourceType: 'publication',
      resourceName: 'Test Publication',
      invitationToken: 'test-token-12345',
      isExistingUser: false
    });
    
    console.log('\nResult:', result);
    
    if (result.success) {
      console.log('\n✅ Test invitation email sent successfully!');
      console.log('Check your inbox (and spam folder) for the email.');
    } else {
      console.log('\n❌ Failed to send test email');
      console.log('Error:', result.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInviteEmail();

