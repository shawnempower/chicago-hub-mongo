/**
 * Test all email templates
 * Sends one of each email type to the specified recipient
 */
import dotenv from 'dotenv';
dotenv.config();

const TEST_EMAIL = 'daniel@laylinedesign.com';
const TEST_NAME = 'Daniel';

async function testAllEmails() {
  try {
    console.log('\n📧 Testing All Email Templates\n');
    console.log('================================');
    console.log(`Sending to: ${TEST_EMAIL}\n`);
    
    // Import email service
    const { emailService } = await import('../server/emailService');
    
    if (!emailService) {
      console.log('❌ Email service is not initialized');
      console.log('Check your .env file for MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL');
      process.exit(1);
    }
    
    console.log('✅ Email service loaded\n');
    
    const results: { name: string; success: boolean; error?: string }[] = [];
    
    // Helper to delay between emails
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // 1. Welcome Email
    console.log('1/12 Sending Welcome Email...');
    const welcome = await emailService.sendWelcomeEmail({
      firstName: TEST_NAME,
      email: TEST_EMAIL,
      verificationToken: 'test-verify-token-12345'
    });
    results.push({ name: 'Welcome', ...welcome });
    await delay(1000);
    
    // 2. Password Reset Email
    console.log('2/12 Sending Password Reset Email...');
    const passwordReset = await emailService.sendPasswordResetEmail({
      firstName: TEST_NAME,
      email: TEST_EMAIL,
      resetToken: 'test-reset-token-67890'
    });
    results.push({ name: 'Password Reset', ...passwordReset });
    await delay(1000);
    
    // 3. Email Verification Email
    console.log('3/12 Sending Email Verification...');
    const verification = await emailService.sendEmailVerificationEmail({
      firstName: TEST_NAME,
      email: TEST_EMAIL,
      verificationToken: 'test-verify-token-abcde'
    });
    results.push({ name: 'Email Verification', ...verification });
    await delay(1000);
    
    // 4. Invitation Email (New User)
    console.log('4/12 Sending Invitation Email (New User)...');
    const inviteNew = await emailService.sendInvitationEmail({
      invitedByName: 'John Smith',
      invitedByEmail: 'john@empowerlocal.com',
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'publication',
      resourceName: 'Chicago Tribune',
      invitationToken: 'test-invite-token-new',
      isExistingUser: false
    });
    results.push({ name: 'Invitation (New User)', ...inviteNew });
    await delay(1000);
    
    // 5. Invitation Email (Existing User)
    console.log('5/12 Sending Invitation Email (Existing User)...');
    const inviteExisting = await emailService.sendInvitationEmail({
      invitedByName: 'Jane Doe',
      invitedByEmail: 'jane@empowerlocal.com',
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'hub',
      resourceName: 'Chicago Media Hub',
      invitationToken: 'test-invite-token-existing',
      isExistingUser: true
    });
    results.push({ name: 'Invitation (Existing User)', ...inviteExisting });
    await delay(1000);
    
    // 6. Access Granted Email
    console.log('6/12 Sending Access Granted Email...');
    const accessGranted = await emailService.sendAccessGrantedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'publication',
      resourceName: 'Sun-Times Media',
      grantedBy: 'Admin User'
    });
    results.push({ name: 'Access Granted', ...accessGranted });
    await delay(1000);
    
    // 7. Access Revoked Email
    console.log('7/12 Sending Access Revoked Email...');
    const accessRevoked = await emailService.sendAccessRevokedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'publication',
      resourceName: 'Daily Herald',
      revokedBy: 'Admin User'
    });
    results.push({ name: 'Access Revoked', ...accessRevoked });
    await delay(1000);
    
    // 8. Role Change Email
    console.log('8/12 Sending Role Change Email...');
    const roleChange = await emailService.sendRoleChangeEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      oldRole: 'publication_user',
      newRole: 'admin',
      changedBy: 'Super Admin'
    });
    results.push({ name: 'Role Change', ...roleChange });
    await delay(1000);
    
    // 9. Lead Notification Email
    console.log('9/12 Sending Lead Notification Email...');
    const leadNotif = await emailService.sendLeadNotificationEmail({
      contactName: 'Robert Martinez',
      contactEmail: 'robert@martinezauto.com',
      contactPhone: '(312) 555-1234',
      businessName: 'Martinez Auto Group',
      websiteUrl: 'https://martinezauto.com',
      budgetRange: '$10,000 - $25,000',
      timeline: 'Q1 2025',
      marketingGoals: ['Brand Awareness', 'Lead Generation', 'Local Reach']
    });
    results.push({ name: 'Lead Notification', ...leadNotif });
    await delay(1000);
    
    // 10. Assets Ready Email
    console.log('10/12 Sending Assets Ready Email...');
    const assetsReady = await emailService.sendAssetsReadyEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      publicationName: 'Chicago Tribune',
      campaignName: 'Spring Sale 2025',
      advertiserName: 'Acme Corp',
      assetCount: 5,
      orderUrl: 'http://localhost:5173/dashboard?tab=order-detail&campaignId=test123',
      hubName: 'Chicago Media Hub'
    });
    results.push({ name: 'Assets Ready', ...assetsReady });
    await delay(1000);
    
    // 11. Order Sent Email
    console.log('11/12 Sending Order Sent Email...');
    const orderSent = await emailService.sendOrderSentEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      publicationName: 'Sun-Times',
      campaignName: 'Summer Campaign 2025',
      advertiserName: 'Big Brand Inc',
      hubName: 'Chicago Media Hub',
      flightDates: 'June 1 - August 31, 2025',
      totalValue: 15000,
      orderUrl: 'http://localhost:5173/dashboard?tab=order-detail&campaignId=test456'
    });
    results.push({ name: 'Order Sent', ...orderSent });
    await delay(1000);
    
    // 12. Order Confirmed Email
    console.log('12/12 Sending Order Confirmed Email...');
    const orderConfirmed = await emailService.sendOrderConfirmedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      publicationName: 'Daily Herald',
      campaignName: 'Fall Promotion 2025',
      advertiserName: 'Local Business LLC',
      confirmedAt: new Date(),
      campaignUrl: 'http://localhost:5173/campaigns/test789'
    });
    results.push({ name: 'Order Confirmed', ...orderConfirmed });
    await delay(1000);
    
    // 13. Placement Rejected Email
    console.log('13/13 Sending Placement Rejected Email...');
    const placementRejected = await emailService.sendPlacementRejectedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      publicationName: 'Chicago Reader',
      placementName: 'Full Page Print Ad',
      campaignName: 'Holiday Special 2025',
      rejectionReason: 'Placement no longer available for selected dates',
      campaignUrl: 'http://localhost:5173/campaigns/test-abc'
    });
    results.push({ name: 'Placement Rejected', ...placementRejected });
    
    // Summary
    console.log('\n================================');
    console.log('📊 Results Summary\n');
    
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    results.forEach(r => {
      if (r.success && !(r as any).skipped) {
        console.log(`✅ ${r.name}`);
        successCount++;
      } else if ((r as any).skipped) {
        console.log(`⏭️  ${r.name} (skipped - notifications disabled)`);
        skippedCount++;
      } else {
        console.log(`❌ ${r.name}: ${r.error}`);
        failedCount++;
      }
    });
    
    console.log('\n================================');
    console.log(`✅ Sent: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('================================\n');
    
    if (successCount > 0) {
      console.log(`📬 Check ${TEST_EMAIL} inbox (and spam folder)!\n`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAllEmails();




