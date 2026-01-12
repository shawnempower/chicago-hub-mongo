# Test Print PDF Dimensions Fix - Quick Guide

**Date**: January 12, 2026  
**What Was Fixed**: Print ad dimensions now save to the correct location (`format.dimensions`) so PDF uploads properly detect and match dimensions

---

## Quick Test (5 minutes)

### 1. Edit a Print Ad's Dimensions

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:5173

3. **Edit a publication with print**:
   - Go to Dashboard → Publications
   - Select any publication with print channel
   - Click "Edit Inventory"
   - Scroll to Print section

4. **Edit dimensions**:
   - Find a print ad (e.g., "Full Page")
   - Change dimensions to: `10" x 8.5"`
   - Save publication
   
   **✅ Expected**: Dimensions save properly with the quote marks

### 2. Create Campaign with Print Inventory

1. **Create new campaign**:
   - Dashboard → Campaigns → New Campaign
   - Add campaign details
   - Add any advertiser

2. **Add print inventory**:
   - Search for the publication you just edited
   - Select it (you should see print inventory)
   - Add to campaign

3. **Go to Creative Requirements tab**:
   - Click "Creative Requirements" tab
   
   **✅ Expected**: See print requirements grouped like:
   ```
   Print - 10" x 8.5"
   └─ [Publication Name] - Full Page
   ```

### 3. Upload a PDF

#### Option A: Use Test PDFs
You have test PDFs in `/test-uploads/pdfs/`:
- `SRL,2025-12-02,_1-005.pdf` (11" x 10")
- `SRL,2025-12-02,_1-016.pdf` (11" x 10")
- `CST FP4C.pdf` (check size)

#### Option B: Create Quick Test PDF
Use any PDF you have, or create one in Adobe/design software at 10" x 8.5"

#### Upload Process
1. In Creative Requirements tab, find the print group
2. Click "Upload" or drag-and-drop your PDF
3. **Watch for**:
   ```
   Detecting specifications...
   
   📐 10" x 8.5"    ← Dimensions detected in INCHES
   🎨 CMYK          ← Color space
   ✨ 300dpi        ← Resolution
   ```

4. **Check for auto-match**:
   - If PDF size matches requirement exactly:
     ```
     ✨ Auto-matched 1 print placement - 95%
     ```
   - If no exact match:
     ```
     ⚠️ No exact match - select manually
     ```

5. **Assign to placement**:
   - Click dropdown
   - Should show print placements sorted by size
   - Select matching size
   
   **✅ Expected**: PDF assigns to print placement(s)

---

## What You Should See

### ✅ Correct Behavior

#### Dimensions Display in Edit Form
```
Dimensions: [10" x 8.5"]
           ↑ Placeholder shows proper format with quotes
```

#### PDF Detection Shows Inches
```
📐 10" x 8.5"     ← Not "720x612" pixels
🎨 CMYK           ← Print color space
```

#### Auto-Matching Works
```
✨ Auto-matched 3 print placements - 95%
10" x 8.5" • 3 placements ✨ Match
```

### ❌ Issues to Watch For

#### PDF Shows Pixels Instead of Inches
```
❌ 720x612    ← WRONG (this would be pixels)
✅ 10" x 8.5" ← CORRECT (inches)
```
**If this happens**: PDF detection may have failed. Check console for errors.

#### No Dimensions Detected
```
❌ No dimensions detected
```
**If this happens**: Check that:
1. File is actually a PDF
2. PDF is not corrupted
3. Console shows no errors
4. `/public/pdf.worker.min.mjs` exists

#### Dimensions Don't Match
```
✅ Detected: 10" x 8.5"
⚠️ No exact match
Available: 9" x 10", 10" x 12.5"
```
**This is CORRECT behavior** - the PDF size doesn't match any requirements. User should manually select closest size or create PDF at correct size.

---

## Console Debugging

Open browser console (F12) and look for:

### ✅ Good Messages
```javascript
[PDF Detection] Detecting PDF specs for: full_page.pdf
[PDF Detection] Successfully detected: { dimensions: { width: 10, height: 8.5, ... } }
Detected dimensions: 10" x 8.5"
🖨️ PRINT DROPDOWN SORT: [...]
```

### ❌ Error Messages
```javascript
[PDF Detection] Failed to detect PDF specifications
[PDF Detection] This appears to be a worker loading issue
```
**Solution**: Check that `/public/pdf.worker.min.mjs` exists

---

## Test Cases

### Case 1: Exact Match ✅
- **Requirement**: 10" x 8.5"
- **PDF Uploaded**: 10" x 8.5"
- **Expected**: Auto-matches with 95%+ confidence

### Case 2: Close Match (Within 5%) ✅
- **Requirement**: 10" x 8.5"
- **PDF Uploaded**: 10.3" x 8.7" (3% difference)
- **Expected**: Still matches due to 5% tolerance

### Case 3: No Match ✅
- **Requirement**: 10" x 8.5"
- **PDF Uploaded**: 11" x 10"
- **Expected**: No auto-match, manual selection required

### Case 4: Multiple Placements ✅
- **Requirements**: 
  - Publication A needs 10" x 8.5"
  - Publication B needs 10" x 8.5"
  - Publication C needs 10" x 8.5"
- **PDF Uploaded**: 10" x 8.5"
- **Expected**: One upload → assigned to all 3 placements

### Case 5: Different Sizes ✅
- **Requirements**:
  - Publication A needs 10" x 8.5"
  - Publication B needs 9" x 10"
- **Expected**: Need 2 separate PDFs (one for each size)

---

## Database Verification (Optional)

If you want to verify the fix at database level:

### Check Print Ad Structure
1. Open MongoDB Compass or use mongo shell
2. Find a publication with print inventory
3. Look at: `distributionChannels.print.advertisingOpportunities[0]`

**✅ Should see**:
```json
{
  "name": "Full Page",
  "adFormat": "full page",
  "format": {
    "dimensions": "10\" x 8.5\""  ← HERE (correct)
  },
  "specifications": {
    "format": "PDF",
    "resolution": "300 DPI"
  }
}
```

**❌ Old format** (still works as fallback):
```json
{
  "name": "Full Page",
  "adFormat": "full page",
  "dimensions": "10\" x 8.5\"",  ← Old location (still supported)
  "specifications": { ... }
}
```

---

## Troubleshooting

### Problem: Dimensions Not Saving
**Check**: 
1. Are you in edit mode?
2. Did you click "Save" after editing?
3. Check browser console for errors

### Problem: PDF Detection Not Working
**Check**:
1. Is `/public/pdf.worker.min.mjs` present?
2. Browser console - any errors?
3. Try a different PDF file
4. File size - very large PDFs may timeout

### Problem: No Auto-Match
**This may be correct**:
1. Check detected dimensions vs requirements
2. Dimensions must match within 5% tolerance
3. For exact match: 10.00" = 10.00"
4. For close match: 10.00" ≈ 10.40" (4% diff, within 5%)
5. No match: 10.00" ≠ 11.00" (10% diff, outside 5%)

---

## Success Criteria

✅ **Fix is working if**:
1. Edit print ad dimensions → saves properly
2. PDF uploads → detects dimensions in inches (not pixels)
3. Detected dimensions → shown with quote marks (10" x 8.5")
4. Exact match → auto-assigns with ✨ indicator
5. No match → shows manual selection
6. One PDF → can assign to multiple placements with same size

---

## Next Steps

After testing:

1. **If working**: You're all set! 🎉
2. **If issues**: Check console for errors and refer to troubleshooting section
3. **Migrate old data** (optional): Run a script to move `ad.dimensions` to `ad.format.dimensions` for consistency

---

## Questions?

- **Why inches not pixels?**: Print ads are measured in physical dimensions (inches), not pixels
- **Why quotes (10" x 8.5")?**: Standard print notation - the " symbol means inches
- **Why CMYK not RGB?**: Print requires CMYK color space (Cyan, Magenta, Yellow, Black)
- **Why 300dpi?**: Print standard resolution for quality output
- **Why 5% tolerance?**: Accounts for slight variations in print sizes between publications

---

## Summary

✅ **What changed**: Print dimensions now save to `format.dimensions` instead of `dimensions`
✅ **User impact**: PDF uploads now properly detect and match print dimensions
✅ **Backward compatible**: Old format still works as fallback
✅ **Easy to test**: Just edit a print ad and upload a PDF

**Expected time to test**: 5 minutes
**Expected result**: PDF dimensions show in inches and auto-match to print requirements
