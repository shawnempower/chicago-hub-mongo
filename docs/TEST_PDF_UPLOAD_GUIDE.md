# Test PDF Upload - Step-by-Step Guide

**Your Test PDFs**: Both are 11" x 10"
- `SRL,2025-12-02,_1-005.pdf` (3.45 MB)
- `SRL,2025-12-02,_1-016.pdf` (4.25 MB)

---

## Quick Test Path

### Option 1: Create New Test Campaign

1. **Go to**: http://localhost:5173
2. **Navigate to**: Campaigns → Create New Campaign
3. **Campaign Details**:
   - Name: "Test Print PDF Upload"
   - Any advertiser/business
   
4. **Add Print Inventory**:
   - Search for publications that have print channels
   - Look for ones with 11" x 10" full page ads (if any)
   - OR just add any print inventory to test the detection

5. **Skip to Creative Requirements**:
   - Go to "Creative Requirements" tab
   - You should see grouped requirements by size

6. **Upload PDF**:
   - Find the 11" x 10" group (or any print group)
   - Click "Upload" or drag-and-drop your PDF
   - **Watch for auto-detection message**

---

## What You Should See

### When PDF is Uploaded

```
Detecting specifications...

✓ Dimensions detected: 11" x 10"
✓ Color Space: CMYK
✓ File Size: 3.45 MB
✓ Page Count: 1

✨ Auto-Suggestion:
This matches: Full Page Print Ad - 11" x 10"
Applies to: [Publication Names]

Match Confidence: 95%
• Dimensions match exactly
• CMYK color space (print ready)
• File size within limit

[Use Suggested] [Choose Manually]
```

### If No 11" x 10" Requirements

```
Could not find exact match.

Detected: 11" x 10"
Available requirements:
( ) Full Page 10" x 12.5" - Chicago Tribune
( ) Full Page 9" x 10" - Evanston Now
( ) Half Page 5" x 6" - Oak Park Patch

[Assign Manually]
```

---

## Finding Publications with Print Inventory

### Check Database for 11" x 10"

Run this to see if any publications need 11" x 10":

```bash
npm exec -- tsx scripts/analyzePrintInventory.ts | grep -A 2 "11\" x 10"
```

### Check for Any Print Inventory

```bash
npm exec -- tsx scripts/analyzePrintInventory.ts | head -30
```

---

## Alternative: Test with Mock Data

If no publications have print with exact dimensions, you can:

### 1. Add Test Print Inventory to a Publication

1. Go to: Publications → Select any publication
2. Add Distribution Channel → Print
3. Add Advertising Opportunity:
   - Name: "Full Page Test"
   - Ad Format: "full page"
   - Dimensions: "11\" x 10\""
   - Specifications:
     - Format: "PDF"
     - Resolution: "300 DPI"
     - Color Space: "CMYK"
4. Save

### 2. Then Create Campaign with That Publication

---

## Testing Scenarios

### Scenario 1: Exact Match ✅
```
Requirement: 11" x 10"
Upload: SRL,2025-12-02,_1-005.pdf (11" x 10")
Expected: Auto-match with 95% confidence
```

### Scenario 2: Close Match ⚠️
```
Requirement: 10.8" x 9.8" (if exists)
Upload: SRL,2025-12-02,_1-005.pdf (11" x 10")
Expected: Close match with warning (within 5%)
```

### Scenario 3: No Match ❌
```
Requirement: 8.5" x 11"
Upload: SRL,2025-12-02,_1-005.pdf (11" x 10")
Expected: Manual selection required
```

### Scenario 4: Multiple Publications, Same Size ✨
```
Requirements:
- Pub A: 11" x 10"
- Pub B: 11" x 10"

Upload: SRL,2025-12-02,_1-005.pdf (11" x 10")
Expected: "Matches 2 placements" - assigns to both!
```

---

## Browser Console Debug

Open browser DevTools (F12) and watch console for:

```javascript
// When you upload PDF
Detecting file specs for: SRL,2025-12-02,_1-005.pdf
Detected specs: {
  dimensions: { width: 11, height: 10, formatted: '11" x 10"' },
  colorSpace: 'CMYK',
  fileSize: 3617280,
  ...
}

// When matching
Auto-matching file to specs...
Found 3 requirement groups
Best match: Group ID xyz, Score: 95
```

---

## Troubleshooting

### "PDF.js worker failed to load"
- Check browser console
- Refresh page
- Worker should load from CDN

### "Could not detect dimensions"
- Check if PDF is valid
- Try the other test PDF
- Check console for errors

### "No requirements found"
- Make sure campaign has print inventory selected
- Verify publication has print advertising opportunities
- Check Creative Requirements tab

---

## Next Steps After Testing

Once you verify it works:

1. **Test with real campaign data**
   - Use actual publications with print inventory
   - Upload actual creative files
   - Verify auto-matching accuracy

2. **Test edge cases**
   - Wrong size PDFs
   - RGB vs CMYK
   - Multi-page PDFs
   - Corrupted PDFs

3. **User feedback**
   - How intuitive is the auto-suggestion?
   - Are confidence scores helpful?
   - Need better error messages?

---

## Current Status

✅ Server running: http://localhost:5173
✅ Test PDFs ready: `test-pdfs/SRL,2025-12-02,_1-*.pdf`
✅ Detection working: Both PDFs detected as 11" x 10"
✅ Ready to test in UI!

**Go ahead and test!** Let me know what you see or if you need help finding publications with print inventory.


