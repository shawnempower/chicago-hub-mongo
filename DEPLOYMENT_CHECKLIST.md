# Deployment Checklist - Inventory Standardization

## Overview
Quick reference checklist for deploying inventory standardization changes to production.

**Date**: October 27, 2025  
**Feature**: Newsletter/Website dimensions, Frequency, Radio/Podcast durations standardization

---

## Pre-Deployment (48 hours before)

### Code Review
- [ ] All code changes reviewed and approved
- [ ] No merge conflicts
- [ ] All tests passing
- [ ] Linting errors resolved
- [ ] TypeScript compilation successful

### Testing
- [ ] Local testing completed (see `PRE_DEPLOYMENT_TESTING.md`)
- [ ] Staging testing completed
- [ ] UAT completed with 2+ users
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness verified
- [ ] Performance testing passed

### Database
- [ ] Backup of production database created
- [ ] Backup verified and downloadable
- [ ] Migration scripts tested on staging
- [ ] Migration rollback scripts prepared

### Documentation
- [ ] `COMPLETE_STANDARDIZATION_SUMMARY.md` reviewed
- [ ] `PRE_DEPLOYMENT_TESTING.md` completed
- [ ] API documentation updated (if applicable)
- [ ] User-facing documentation updated (if applicable)

---

## Deployment Day (Morning)

### Environment Check
- [ ] Staging environment reflects production data
- [ ] Staging deployment successful
- [ ] Final smoke test on staging passed
- [ ] Production environment accessible
- [ ] Deploy tools ready (AWS CLI, etc.)

### Team Communication
- [ ] Deployment time communicated to team
- [ ] All stakeholders notified
- [ ] Support team on standby
- [ ] Rollback team identified and available

### Preparation
- [ ] Code branch ready to deploy (main/master)
- [ ] Build artifacts created and verified
- [ ] Environment variables checked
- [ ] Database connection strings verified
- [ ] Feature flags configured (if using)

---

## Deployment Execution

### Step 1: Database Migrations (if not already run)
```bash
# Run newsletter format migration
npx tsx src/scripts/migrateNewsletterFormats.ts --apply

# Run newsletter frequency migration
npx tsx src/scripts/migrateNewsletterFrequencies.ts --apply

# Run radio duration migration (if created)
npx tsx src/scripts/migrateRadioDurations.ts --apply

# Run podcast duration migration (if created)
npx tsx src/scripts/migratePodcastDurations.ts --apply
```

**Checklist**:
- [ ] Newsletter formats migrated successfully
- [ ] Newsletter frequencies updated
- [ ] Radio durations converted to integers
- [ ] Podcast durations converted to integers
- [ ] Migration logs reviewed - no errors
- [ ] Spot check 3-5 publications in database

### Step 2: Code Deployment
```bash
# Deploy to production
# (Your deployment command - e.g., AWS Amplify, Vercel, etc.)
```

**Checklist**:
- [ ] Build successful
- [ ] Deployment initiated
- [ ] Deployment progress monitored
- [ ] No errors during deployment
- [ ] Health checks passing

### Step 3: Post-Deployment Verification (Immediate)
**5-Minute Smoke Test**:

- [ ] **Homepage loads** → No errors
- [ ] **Login works** → Authentication successful
- [ ] **Navigate to Dashboard** → Loads correctly
- [ ] **Open publication with newsletters** → Cards display correctly
- [ ] **Edit newsletter ad** → AdFormatSelector appears
- [ ] **Select dimension** → Saves successfully
- [ ] **Open publication with website** → Cards display correctly
- [ ] **Edit website ad** → WebsiteAdFormatSelector appears
- [ ] **Open publication with radio** → Duration shows "s" suffix
- [ ] **Edit radio ad** → Duration dropdown works
- [ ] **Open publication with podcast** → Frequency badge shows
- [ ] **Edit podcast** → Frequency dropdown works

### Step 4: Extended Verification (30 minutes)
- [ ] Test 5+ publications across different types
- [ ] Verify legacy data displays correctly (amber boxes)
- [ ] Test creating new inventory items
- [ ] Test editing existing inventory items
- [ ] Test deleting inventory items
- [ ] Check error logs - no new errors
- [ ] Monitor server metrics - no spikes
- [ ] Test on mobile device
- [ ] Test in different browsers

---

## Post-Deployment (First 24 hours)

### Monitoring
- [ ] Check error logs every 2 hours
- [ ] Monitor server performance
- [ ] Monitor database performance
- [ ] Track user activity - any issues?
- [ ] Review support tickets - any new issues?

### User Feedback
- [ ] Send notification to users about new features
- [ ] Monitor user feedback channels
- [ ] Address any questions quickly
- [ ] Document any confusion points

### Data Quality Check
Run these queries after 24 hours:

```javascript
// How many ads have migrated formats?
db.publications.find({
  'distributionChannels.newsletters.advertisingOpportunities.format': { $exists: true }
}).count()

// How many new ads created with new format?
db.publications.find({
  'distributionChannels.newsletters.advertisingOpportunities.format': { $exists: true },
  'distributionChannels.newsletters.advertisingOpportunities.format.updatedAt': {
    $gte: new Date('2025-10-27') // Deployment date
  }
}).count()

// Any validation errors?
// Check logs for schema validation failures
```

**Checklist**:
- [ ] Migration coverage looks good
- [ ] New items using new format
- [ ] No unexpected data patterns
- [ ] No schema validation errors

---

## Week 1 Post-Deployment

### Review & Optimization
- [ ] Review all error logs
- [ ] Analyze user feedback
- [ ] Identify any UX issues
- [ ] Plan minor improvements if needed
- [ ] Update documentation based on learnings

### Team Retrospective
- [ ] What went well?
- [ ] What could be improved?
- [ ] Any surprises?
- [ ] Lessons learned?
- [ ] Document for next deployment

---

## Rollback Procedure (If Needed)

### When to Rollback
- [ ] Critical bugs affecting core functionality
- [ ] Data corruption detected
- [ ] Severe performance degradation
- [ ] Multiple user-reported issues
- [ ] Security vulnerability discovered

### Rollback Steps

#### 1. Code Rollback
```bash
# Revert to previous deployment
# (Your rollback command)
```

#### 2. Database Rollback (if needed)
**Good News**: No database rollback needed! Legacy fields are still present:
- `dimensions` (newsletter/website)
- `sizes` (website)
- Old duration formats still work
- System will fall back to legacy fields if `format` missing

#### 3. Verification After Rollback
- [ ] Application loads correctly
- [ ] Users can view inventory
- [ ] Users can edit inventory (old UI)
- [ ] No data loss
- [ ] Error logs clear

#### 4. Communication
- [ ] Notify team of rollback
- [ ] Notify stakeholders
- [ ] Document issue that caused rollback
- [ ] Plan fix and redeployment

---

## Emergency Contacts

### During Deployment Window
- **Lead Developer**: Available via [contact method]
- **DevOps**: Available via [contact method]
- **Product Owner**: Available via [contact method]

### After Hours
- **On-Call Engineer**: [contact]
- **Emergency Hotline**: [number]

---

## Success Criteria

Deployment considered successful when:
- [x] All migrations completed without errors
- [x] Application deployed and accessible
- [x] Smoke tests passing
- [x] No critical errors in logs
- [x] Users can view and edit inventory
- [x] New format selectors working
- [x] Legacy data displaying correctly
- [x] Performance within acceptable range
- [x] Mobile experience working
- [x] No data corruption

---

## Files Changed Summary

### Schema
- `json_files/schema/publication.json`

### Types
- `src/types/newsletterAdFormat.ts`

### Components
- `src/components/AdFormatSelector.tsx`
- `src/components/AdFormatBadge.tsx`
- `src/components/AdFormatFilter.tsx`
- `src/components/WebsiteAdFormatSelector.tsx`
- `src/components/dashboard/EditableInventoryManager.tsx`
- `src/components/dashboard/DashboardInventoryManager.tsx`
- `src/components/dashboard/PublicationFullSummary.tsx`

### Migration Scripts
- `src/scripts/migrateNewsletterFormats.ts`
- `src/scripts/migrateNewsletterFrequencies.ts`
- (Additional migration scripts if created)

---

## Quick Reference - What Changed

### For Users
✅ **Newsletter Ads**: Cleaner dimension selection, multi-format support  
✅ **Website Ads**: Standardized sizes, removed monthly impressions  
✅ **Newsletter/Podcast Frequency**: Dropdown instead of text, added "On Demand"  
✅ **Radio/Podcast Duration**: Dropdown for standards, custom input for others  

### For Developers
✅ **New Components**: AdFormatSelector, WebsiteAdFormatSelector  
✅ **Schema Updates**: Added `format` object, updated frequency/duration enums  
✅ **Type Safety**: New interfaces and helper functions  
✅ **Migration Scripts**: Automated data standardization  

---

**Deployment Version**: 1.0  
**Last Updated**: October 27, 2025  
**Deployment Lead**: ________________  
**Deployment Date**: ________________  
**Sign-Off**: ________________

