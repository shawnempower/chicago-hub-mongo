# SourceName Field Fix - Test Plan

## Quick Test Checklist

### 1. Test Newsletter Names Display
- [ ] Create a new package in Package Builder
- [ ] Select multiple publications that have newsletters (e.g., Chicago Reader, Chicago Sun-Times, Streetsblog Chicago)
- [ ] In Package Results, open "By Channel" tab
- [ ] Filter or scroll to "newsletter" section
- [ ] Expand a newsletter channel
- [ ] **Verify**: Each newsletter item shows a badge like "📬 Chicago Reader Newsletter Leaderboard" or "📬 Streetsblog Chicago Daily Digest"
- [ ] **Verify**: Different newsletter items show different names (not all the same publication name)

### 2. Test Radio Show Names Display
- [ ] Create a package with radio stations that have shows (e.g., WVON Radio, WRLL Radio)
- [ ] In Package Results, open "By Channel" tab
- [ ] Scroll to "radio" section
- [ ] Expand the radio channel
- [ ] **Verify**: Each show displays its name as sourceName badge
- [ ] **Verify**: Station-level ads show the call sign (e.g., "📬 WVON", "📬 WRLL")

### 3. Test Print Section Names Display
- [ ] Create a package with print media
- [ ] In Package Results, look at print items
- [ ] **Verify**: Print items show section/edition names as sourceName badge (if available)

### 4. Test By Outlet Tab
- [ ] In Package Results, open "By Outlet" tab
- [ ] Expand one publication
- [ ] Expand a channel within that publication
- [ ] **Verify**: sourceName badges appear for each item (newsletters show newsletter names, radio shows show show names, etc.)

### 5. Test Legacy Package Fallback
- [ ] Open an old saved package that was created before this fix
- [ ] Navigate to Package Results tab
- [ ] Open both "By Channel" and "By Outlet" tabs
- [ ] **Verify**: Newsletter items still display names (either from sourceName field or fallback parsing of itemName)
- [ ] **Note**: Items without sourceName should parse "Newsletter Name - Ad Type" and extract "Newsletter Name"

### 6. Save and Reload Test
- [ ] Create a new package with multiple newsletters
- [ ] Verify sourceName appears in breakdown
- [ ] Click "Save Package"
- [ ] Successfully save with a name
- [ ] **Verify**: Toast shows "Package saved successfully"
- [ ] Return to package list
- [ ] Find and open the saved package
- [ ] Navigate to "View Package" or edit mode
- [ ] **Verify**: sourceName badges still appear in breakdown tabs
- [ ] **Verify**: No "there's no sourceName" console errors

### 7. Edit Existing Package Test
- [ ] Open an existing package for editing
- [ ] Make changes to inventory
- [ ] Click rebuild/refresh
- [ ] **Verify**: Updated inventory shows sourceName badges
- [ ] Save changes
- [ ] **Verify**: Changes persist and sourceName still displays

### 8. Console Check
- [ ] Open browser developer tools (F12)
- [ ] Go to Console tab
- [ ] Perform all above tests
- [ ] **Verify**: No console errors related to sourceName or missing fields
- [ ] **Note**: The logging added in packageBuilderService has been removed, so console should be clean

## Expected Visual Changes

### Before Fix
```
Chicago Reader 📧 Newsletter Newsletter Leaderboard
Frequency: 30x per month $7,500
$250 × 30
```

### After Fix
```
Chicago Reader 📧 Newsletter Chicago Reader Newsletter Leaderboard 📬 Newsletter Leaderboard
Frequency: 30x per month $7,500
$250 × 30
```

The sourceName appears as a blue badge with mail icon: `📬 Newsletter Leaderboard`

## Troubleshooting

### If sourceName badges don't appear:
1. **Check backend logs**: Look for errors in `/api/admin/builder/analyze` endpoint
2. **Inspect browser network**: Check API response includes `sourceName` field in inventory items
3. **Check frontend console**: Look for any React warnings about missing data
4. **Database check**: Verify saved packages have `sourceName` in `components.publications[].inventoryItems[]`

### If some but not all items show sourceName:
1. **Newsletter-specific**: Verify publication data has `name` or `subject` field
2. **Radio**: Verify shows have `name` field, stations have `callSign`
3. **Podcasts**: Verify podcasts have `name` field
4. **Check null/undefined**: Some items might have missing source data

### If old packages don't show names:
1. **Expected behavior**: Fallback parsing should extract from `itemName`
2. **Verify format**: itemName should be "SourceName - AdType"
3. **If not working**: Check `PackageResults.tsx` fallback logic is executing

## Performance Considerations

- ✅ No performance impact: sourceName is a simple string field
- ✅ No additional API calls required
- ✅ No database query changes
- ✅ Backward compatible with existing packages

## Code Review Points

- [x] `extractFromChannel` properly receives sourceInfo parameter
- [x] All 8 channel types pass sourceName to extractFromChannel
- [x] Frontend service populates sourceName for all channels
- [x] Display component has fallback for legacy packages
- [x] No console errors
- [x] TypeScript types match schema definition
- [x] Function signatures are consistent

## Sign-Off

Once all tests pass, the fix is ready for deployment.

**Tester**: _________________  **Date**: _________

**Notes**:

