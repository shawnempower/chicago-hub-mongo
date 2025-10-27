# Pre-Deployment Testing Checklist

## Overview
This document outlines all testing required before deploying the inventory standardization changes to production.

**Date**: October 27, 2025  
**Changes**: Newsletter/Website dimensions, Newsletter/Podcast frequency, Radio/Podcast durations

---

## 🔍 Critical Areas to Test

### 1. Newsletter Advertising Opportunities

#### ✅ View Mode - Newsletter Cards
- [ ] Open a publication with newsletter inventory
- [ ] Verify dimension badge displays correctly next to ad name
- [ ] Verify "Dimensions" field in card body shows correct values
- [ ] Test with publications that have:
  - [ ] Migrated `format.dimensions` (should show new format)
  - [ ] Legacy `dimensions` only (should show legacy data)
  - [ ] Multiple dimensions (should show all or count)
- [ ] Verify position displays correctly

#### ✅ Inline Edit Mode - Newsletter Ads
- [ ] Click "Edit" on a newsletter section
- [ ] Verify `AdFormatSelector` appears (not old text input)
- [ ] Test selecting primary dimension from dropdown groups:
  - [ ] IAB Standard Sizes
  - [ ] Email/Newsletter Standard Sizes
  - [ ] Native & Responsive
  - [ ] Takeover
  - [ ] Custom
- [ ] Test adding multiple dimensions:
  - [ ] Select primary dimension
  - [ ] Check additional dimension checkboxes
  - [ ] Verify can select from ANY category (not restricted)
  - [ ] Add 2-3 dimensions, verify badge display
  - [ ] Add 4+ dimensions, verify count badge
- [ ] Test with legacy data:
  - [ ] Verify amber warning box shows original dimensions
  - [ ] Verify read-only display of legacy field
  - [ ] Select new format and save
- [ ] Test custom dimension input:
  - [ ] Select "Custom dimensions..."
  - [ ] Enter custom size (e.g., "500x300")
  - [ ] Save and verify

#### ✅ Modal Edit Mode - Newsletter Ads
- [ ] Click "Edit" icon on a newsletter ad card
- [ ] Verify same `AdFormatSelector` functionality as inline mode
- [ ] Test position dropdown (Header, Footer, Inline, Dedicated)
- [ ] Test hub pricing editor works
- [ ] Save and verify changes persist

#### ✅ Newsletter Frequency
- [ ] Test frequency dropdown in inline edit mode:
  - [ ] Daily
  - [ ] Weekly
  - [ ] Bi-Weekly
  - [ ] Monthly
  - [ ] Irregular
  - [ ] On Demand (new)
- [ ] Verify frequency badge displays on newsletter cards
- [ ] Test with publication that had "custom" → should show "on-demand"
- [ ] Create new newsletter, verify dropdown works

---

### 2. Website Advertising Opportunities

#### ✅ View Mode - Website Cards
- [ ] Open a publication with website inventory
- [ ] Verify dimension badge displays correctly next to ad name
- [ ] Verify "Size/Sizes" field in card body shows correct values
- [ ] Test with publications that have:
  - [ ] Migrated `format.dimensions` (should show new format)
  - [ ] Legacy `sizes` array (should show legacy data)
  - [ ] Multiple dimensions
- [ ] Verify "Monthly Impressions" field is **HIDDEN** ✅

#### ✅ Inline Edit Mode - Website Ads
- [ ] Click "Edit" on a website section
- [ ] Verify `WebsiteAdFormatSelector` appears
- [ ] Test selecting from website-specific options:
  - [ ] IAB Standard Sizes
  - [ ] Native & Responsive
  - [ ] Custom
- [ ] Verify **NO Email/Newsletter Standard Sizes** ✅
- [ ] Verify **NO Takeover option** ✅
- [ ] Test multiple dimensions functionality (same as newsletter)
- [ ] Test legacy dimensions display
- [ ] Verify "Monthly Impressions" field is **HIDDEN** ✅

#### ✅ Modal Edit Mode - Website Ads
- [ ] Click "Edit" icon on a website ad card
- [ ] Verify same `WebsiteAdFormatSelector` functionality
- [ ] Verify "Monthly Impressions" field is **HIDDEN** ✅
- [ ] Test location field
- [ ] Test hub pricing editor
- [ ] Save and verify changes persist

---

### 3. Radio Advertising Opportunities

#### ✅ View Mode - Radio Cards
- [ ] Open a publication with radio station inventory
- [ ] Verify duration displays with "s" suffix (e.g., "30s", "60s", "1320s")
- [ ] Test with both standard and custom durations

#### ✅ Inline Edit Mode - Radio Ads
- [ ] Click "Edit" on a radio station section
- [ ] Test duration dropdown:
  - [ ] Select "15 seconds (:15)" → verify saves as 15
  - [ ] Select "30 seconds (:30)" → verify saves as 30
  - [ ] Select "60 seconds (:60)" → verify saves as 60
  - [ ] Select "90 seconds (:90)" → verify saves as 90
  - [ ] Select "120 seconds (:120)" → verify saves as 120
  - [ ] Select "Custom..." → verify custom input appears
- [ ] Test custom duration:
  - [ ] Enter custom value (e.g., 20, 45, 1320)
  - [ ] Save and verify
  - [ ] Re-edit → verify dropdown shows "Custom..." ✅
  - [ ] Verify custom input shows the value
- [ ] Test existing custom durations (e.g., 1320 seconds):
  - [ ] Open ad with custom duration
  - [ ] Verify dropdown shows "Custom..." ✅
  - [ ] Verify input field shows actual value (1320)
- [ ] Verify "Ad Format" is text input (not dropdown)
- [ ] Verify "Time Slot" is text input (not dropdown)

#### ✅ Modal Edit Mode - Radio Ads
- [ ] Click "Edit" icon on a radio ad card
- [ ] Verify same duration dropdown functionality
- [ ] Test switching between standard and custom durations
- [ ] Verify Ad Format and Time Slot are text inputs
- [ ] Test hub pricing editor
- [ ] Save and verify changes persist

#### ✅ Radio Station Properties
- [ ] Test call sign field (text input)
- [ ] Test frequency field (e.g., "101.5 FM") - text input
- [ ] Test format dropdown (news_talk, contemporary, etc.)
- [ ] Test coverage area
- [ ] Test listeners count

---

### 4. Podcast Advertising Opportunities

#### ✅ View Mode - Podcast Cards
- [ ] Open a publication with podcast inventory
- [ ] Verify frequency badge displays correctly (e.g., "Weekly")
- [ ] Verify duration displays correctly

#### ✅ Inline Edit Mode - Podcast Ads
- [ ] Click "Edit" on a podcast section
- [ ] Test duration dropdown (same as radio):
  - [ ] 15 seconds (:15)
  - [ ] 30 seconds (:30)
  - [ ] 60 seconds (:60)
  - [ ] 90 seconds (:90)
  - [ ] 120 seconds (:120)
  - [ ] Custom...
- [ ] Test custom duration functionality
- [ ] Test with existing custom durations
- [ ] Verify position field
- [ ] Test ad format dropdown (pre-roll, mid-roll, post-roll, host-read, etc.)

#### ✅ Modal Edit Mode - Podcast Ads
- [ ] Click "Edit" icon on a podcast ad card
- [ ] Verify same duration dropdown functionality
- [ ] Test switching between standard and custom
- [ ] Test hub pricing editor
- [ ] Save and verify changes persist

#### ✅ Podcast Properties (Modal Edit)
- [ ] Test podcast name field
- [ ] Test frequency dropdown:
  - [ ] Daily
  - [ ] Weekly
  - [ ] Bi-weekly
  - [ ] Monthly
  - [ ] Irregular
  - [ ] On Demand (new) ✅
- [ ] Test description field
- [ ] Test average downloads (numeric validation)
- [ ] Test average listeners (numeric validation)
- [ ] Test episode count

---

### 5. Data Integrity & Migration Verification

#### ✅ Publications with Migrated Data
Test with these specific publications:

**Newsletters:**
- [ ] **Block Club Chicago** - Has migrated newsletter ads
- [ ] **South Side Weekly** - Has newsletter inventory
- [ ] **WBEZ Chicago** - Had "6 times a week" → should be "daily"
- [ ] **Chicago Reader** - Had "custom" → should be "on-demand"

**Websites:**
- [ ] **Block Club Chicago** - Has website ads
- [ ] **Chicago Tribune** - Has website inventory

**Radio:**
- [ ] **WBEZ 91.5 FM** - Has radio ads with migrated durations
- [ ] **WGCI 107.5 FM** - Test standard durations
- [ ] Any station with "22 minutes" → should be 1320 seconds

**Podcasts:**
- [ ] **Block Club Chicago podcasts** - All should have "weekly" frequency
- [ ] **Borderless Magazine podcasts** - Test duration handling

#### ✅ Schema Validation
- [ ] Create NEW newsletter opportunity → verify all fields save correctly
- [ ] Create NEW website opportunity → verify all fields save correctly
- [ ] Create NEW radio ad → verify duration saves as integer
- [ ] Create NEW podcast ad → verify duration and frequency save correctly

#### ✅ Legacy Data Display
- [ ] Find publication with UNMIGRATED newsletter dimensions
- [ ] Verify legacy dimensions display in amber warning box
- [ ] Find publication with UNMIGRATED website sizes
- [ ] Verify legacy sizes display in amber warning box

---

### 6. UI/UX Testing

#### ✅ Responsive Design
- [ ] Test on desktop (1920px, 1440px, 1024px)
- [ ] Test on tablet (768px)
- [ ] Test on mobile (375px)
- [ ] Verify dropdowns work on touch devices
- [ ] Verify custom inputs accessible on mobile

#### ✅ Visual Consistency
- [ ] Verify badge colors consistent across inventory types
- [ ] Verify dropdown styles match design system
- [ ] Verify custom input styles match
- [ ] Verify amber warning box readable and clear
- [ ] Verify spacing and alignment of multi-dimension badges

#### ✅ User Workflow
- [ ] Add new publication from scratch
- [ ] Add newsletter with multiple ad formats
- [ ] Add website with multiple ad sizes
- [ ] Add radio station with multiple ad durations
- [ ] Add podcast with ads
- [ ] Edit existing inventory
- [ ] Delete inventory items
- [ ] Verify auto-save works throughout

---

### 7. Error Handling & Edge Cases

#### ✅ Validation
- [ ] Try saving newsletter ad without dimension → verify validation
- [ ] Try saving custom dimension with invalid format → verify validation
- [ ] Try saving negative duration → verify validation
- [ ] Try saving non-numeric duration → verify validation

#### ✅ Edge Cases
- [ ] Test takeover ad (no dimensions) → verify no dimension field/badge
- [ ] Test ad with 10+ dimensions → verify count badge shows correctly
- [ ] Test switching from standard to custom duration multiple times
- [ ] Test with very long custom dimension strings
- [ ] Test with missing/null data → verify graceful handling

#### ✅ Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

### 8. Performance Testing

#### ✅ Load Testing
- [ ] Open publication with 20+ newsletter ads → verify loads quickly
- [ ] Open publication with 50+ website ads → verify performance
- [ ] Test filtering/searching with large datasets
- [ ] Verify no memory leaks when editing multiple items

#### ✅ Save Performance
- [ ] Time save operation for simple change
- [ ] Time save operation for complex change (multiple dimensions)
- [ ] Verify auto-save doesn't lag UI
- [ ] Test concurrent edits (if applicable)

---

### 9. Integration Testing

#### ✅ Publication Full Summary View
- [ ] Navigate to publication full summary page
- [ ] Verify newsletter ad dimensions display correctly
- [ ] Verify website ad dimensions display correctly
- [ ] Verify radio duration displays with "s" suffix
- [ ] Verify podcast frequency and duration display correctly

#### ✅ Dashboard Inventory Manager
- [ ] View dashboard inventory tab
- [ ] Test filtering by dimension/format
- [ ] Test searching for specific sizes
- [ ] Verify all cards render correctly
- [ ] Test bulk operations (if applicable)

#### ✅ Editable Inventory Manager
- [ ] Test inline editing workflow
- [ ] Verify all selectors and dropdowns function
- [ ] Test rapid editing (multiple changes without page refresh)
- [ ] Verify undo/cancel works properly

---

### 10. Database Verification

#### ✅ MongoDB Data Structure
Run these queries to verify data integrity:

```javascript
// Check newsletter format migrations
db.publications.find({
  'distributionChannels.newsletters.advertisingOpportunities.format': { $exists: true }
}).count()

// Check website format migrations
db.publications.find({
  'distributionChannels.website.advertisingOpportunities.format': { $exists: true }
}).count()

// Check radio duration migrations (should be integers)
db.publications.find({
  'distributionChannels.radioStations.advertisingOpportunities.specifications.duration': { $type: 'int' }
}).count()

// Check podcast duration migrations (should be integers)
db.publications.find({
  'distributionChannels.podcasts.advertisingOpportunities.duration': { $type: 'int' }
}).count()

// Check newsletter frequency values
db.publications.aggregate([
  { $unwind: '$distributionChannels.newsletters' },
  { $group: { _id: '$distributionChannels.newsletters.frequency', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Check podcast frequency values
db.publications.aggregate([
  { $unwind: '$distributionChannels.podcasts' },
  { $group: { _id: '$distributionChannels.podcasts.frequency', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

#### ✅ Schema Validation
- [ ] Verify schema validation rules enforce correct types
- [ ] Test invalid data insertion → should reject
- [ ] Test valid data insertion → should accept

---

## 🚨 Known Issues to Watch For

### Issue 1: Custom Duration Dropdown State
**Description**: When an ad has a custom duration (non-standard), dropdown should show "Custom..."  
**Test**: Edit radio/podcast ad with 1320 seconds → dropdown shows "Custom..."  
**Status**: ✅ Fixed

### Issue 2: Website Monthly Impressions
**Description**: Monthly impressions field should be hidden for website ads  
**Test**: Edit website ad → verify field not present  
**Status**: ✅ Fixed

### Issue 3: Legacy Dimensions Display
**Description**: Original dimensions should show in amber box when format is not migrated  
**Test**: Edit unmigrated ad → verify amber box appears  
**Status**: ✅ Implemented

### Issue 4: Multiple Dimensions Category Restriction
**Description**: Additional dimensions should not be restricted to primary category  
**Test**: Select IAB size, then add Native or Email size → should work  
**Status**: ✅ Fixed

---

## 📋 Test Execution Plan

### Phase 1: Local Testing (Developer)
1. Run through all UI testing sections locally
2. Verify all dropdowns and inputs work
3. Test with real database data
4. Fix any issues found

### Phase 2: Staging Testing (QA)
1. Deploy to staging environment
2. Run full test suite
3. Test with production-like data
4. Performance testing
5. Browser compatibility testing

### Phase 3: User Acceptance Testing (UAT)
1. Select 2-3 power users
2. Have them edit actual publications
3. Gather feedback on workflow
4. Verify no confusion with new UI
5. Address any UX concerns

### Phase 4: Production Deployment
1. Deploy during low-traffic window
2. Monitor error logs
3. Verify migrations completed successfully
4. Quick smoke test of critical paths
5. Be ready to rollback if issues

---

## ✅ Sign-Off Checklist

Before deploying to production, ensure:

- [ ] All test sections above completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Database migrations verified
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Monitoring in place
- [ ] Team notified of deployment

---

## 🔧 Rollback Plan

If critical issues found in production:

1. **Immediate**: Revert code deployment
2. **Database**: No rollback needed - legacy fields still present
3. **Notify**: Alert team of rollback
4. **Debug**: Identify and fix issue
5. **Re-test**: Run full test suite again
6. **Re-deploy**: When ready

**Note**: Because we kept legacy fields (`dimensions`, `sizes`, old duration formats), the system will gracefully fall back to old data if new `format` fields are not present. This makes rollback safer.

---

## 📞 Support Contacts

- **Developer**: [Your contact]
- **QA Lead**: [QA contact]
- **Product Owner**: [PO contact]
- **DevOps**: [DevOps contact]

---

## 📝 Test Results Log

### Test Execution Date: _____________
### Tester Name: _____________
### Environment: [ ] Local [ ] Staging [ ] Production

**Overall Result**: [ ] PASS [ ] FAIL [ ] NEEDS REVIEW

**Critical Issues Found**: ___________________________________

**Notes**: _______________________________________________

---

**Last Updated**: October 27, 2025  
**Version**: 1.0

