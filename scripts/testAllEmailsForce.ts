/**
 * Test all email templates - FORCE SEND ALL
 * Temporarily sets EMAIL_NOTIFICATIONS_ENABLED to send all notification emails
 */
import dotenv from 'dotenv';
dotenv.config();

// Force enable notifications for this test
process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';

const TEST_EMAIL = 'daniel@laylinedesign.com';
const TEST_NAME = 'Daniel';

async function testAllEmails() {
  try {
    console.log('\n📧 Testing All Email Templates (FORCED)\n');
    console.log('================================');
    console.log(`Sending to: ${TEST_EMAIL}`);
    console.log('EMAIL_NOTIFICATIONS_ENABLED: forced to true\n');
    
    // Import email service AFTER setting env var
    const { emailService } = await import('../server/emailService');
    
    if (!emailService) {
      console.log('❌ Email service is not initialized');
      process.exit(1);
    }
    
    console.log('✅ Email service loaded\n');
    
    const results: { name: string; success: boolean; error?: string; skipped?: boolean }[] = [];
    
    // Helper to delay between emails
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Skip auth emails (already sent), start with notification emails
    
    // 1. Invitation Email (New User)
    console.log('1/10 Sending Invitation Email (New User)...');
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
    await delay(1500);
    
    // 2. Invitation Email (Existing User)
    console.log('2/10 Sending Invitation Email (Existing User)...');
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
    await delay(1500);
    
    // 3. Access Granted Email
    console.log('3/10 Sending Access Granted Email...');
    const accessGranted = await emailService.sendAccessGrantedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'publication',
      resourceName: 'Sun-Times Media',
      grantedBy: 'Admin User'
    });
    results.push({ name: 'Access Granted', ...accessGranted });
    await delay(1500);
    
    // 4. Access Revoked Email
    console.log('4/10 Sending Access Revoked Email...');
    const accessRevoked = await emailService.sendAccessRevokedEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      resourceType: 'publication',
      resourceName: 'Daily Herald',
      revokedBy: 'Admin User'
    });
    results.push({ name: 'Access Revoked', ...accessRevoked });
    await delay(1500);
    
    // 5. Role Change Email
    console.log('5/10 Sending Role Change Email...');
    const roleChange = await emailService.sendRoleChangeEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      oldRole: 'publication_user',
      newRole: 'admin',
      changedBy: 'Super Admin'
    });
    results.push({ name: 'Role Change', ...roleChange });
    await delay(1500);
    
    // 6. Lead Notification Email
    console.log('6/10 Sending Lead Notification Email...');
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
    await delay(1500);
    
    // 7. Assets Ready Email
    console.log('7/10 Sending Assets Ready Email...');
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
    await delay(1500);
    
    // 8. Order Sent Email
    console.log('8/10 Sending Order Sent Email...');
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
    await delay(1500);
    
    // 9. Order Confirmed Email
    console.log('9/10 Sending Order Confirmed Email...');
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
    await delay(1500);
    
    // 10. Placement Rejected Email
    console.log('10/10 Sending Placement Rejected Email...');
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
      if (r.success && !r.skipped) {
        console.log(`✅ ${r.name}`);
        successCount++;
      } else if (r.skipped) {
        console.log(`⏭️  ${r.name} (skipped)`);
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
      console.log(`📬 Check ${TEST_EMAIL} inbox (and spam folder)!`);
      console.log('Note: Auth emails were already sent in the previous test.\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAllEmails();




