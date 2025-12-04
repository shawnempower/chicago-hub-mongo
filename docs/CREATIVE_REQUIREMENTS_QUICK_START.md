# Creative Requirements - Quick Start Guide

**For**: Hub Users & Developers  
**Updated**: December 4, 2025

---

## TL;DR

✅ **Website ads**: Upload images (JPG/PNG/GIF) → System detects pixels → Auto-matches  
✅ **Print ads**: Upload PDFs → System detects inches → Auto-matches  
✅ Both work the same way now!

---

## For Hub Users

### Uploading Website Creative

1. **Create campaign** with website inventory
2. **Go to Creative Requirements** tab
3. **See grouped requirements**:
   ```
   300x250 Medium Rectangle (5 publications)
   728x90 Leaderboard (3 publications)
   ```
4. **Upload image** (banner_300x250.jpg)
5. **System detects**: "300 x 250 pixels"
6. **System suggests**: "Matches 5 placements"
7. **Click "Use Suggested"** ✅

**One upload → Multiple publications** (if same size)

### Uploading Print Creative

1. **Create campaign** with print inventory
2. **Go to Creative Requirements** tab
3. **See grouped requirements**:
   ```
   Full Page 10"x12.5" (2 publications)
   Full Page 9"x10" (1 publication)
   ```
4. **Upload PDF** (full_page_10x12.5.pdf)
5. **System detects**: '10" x 12.5"'
6. **System suggests**: "Matches 2 placements"
7. **Click "Use Suggested"** ✅

**Each size usually needs separate PDF** (unless pubs have identical dimensions)

---

## Common Questions

### Q: Can I reuse print ads like website ads?

**A**: Only if publications have identical dimensions.

- **Website**: 5 publications need 300x250 → 1 upload ✅
- **Print**: 5 publications need full page → Usually 5 uploads (different sizes)
- **Exception**: 2 publications both need 10"x12.5" → 1 upload ✅

### Q: What if my PDF is RGB instead of CMYK?

**A**: System will warn you. Print requires CMYK.

- **Solution**: Convert to CMYK in design software before upload
- **Tools**: Adobe Photoshop, Illustrator, InDesign, Acrobat Pro

### Q: What if system doesn't auto-detect?

**A**: You'll see manual selection:

```
Please select which requirement this file is for:
( ) Full Page 10"x12.5" - Tribune, Oak Park
( ) Full Page 9"x10" - Evanston Now
```

Just pick the right one and upload.

### Q: Do I need 300 DPI for print?

**A**: Yes! Always.

- **Web**: 72 DPI is fine
- **Print**: 300 DPI minimum
- **System checks**: Will warn if too low

---

## For Developers

### Check What's in Database

```bash
# See all print inventory
npm exec -- tsx scripts/analyzePrintInventory.ts
```

### Get Standards Programmatically

```typescript
import { 
  getWebsiteStandards, 
  getPrintStandards,
  findPrintStandardByFormat 
} from '@/config/inventoryStandards';

// All website standards
const webStandards = getWebsiteStandards(); // Returns 13 standards

// All print standards
const printStandards = getPrintStandards(); // Returns 8 standards

// Find specific print standard
const fullPage = findPrintStandardByFormat('full page');
console.log(fullPage);
// {
//   id: 'print_full_page',
//   name: 'Full Page Print Ad',
//   defaultSpecs: {
//     fileFormats: ['PDF', 'TIFF', 'EPS', 'AI'],
//     colorSpace: 'CMYK',
//     resolution: '300dpi',
//     ...
//   }
// }
```

### Detect File Specs

```typescript
import { detectFileSpecs } from '@/utils/fileSpecDetection';

// Detect from uploaded file
const file = event.target.files[0];
const specs = await detectFileSpecs(file);

console.log(specs);
// For images:
// {
//   dimensions: { width: 300, height: 250, formatted: "300x250" },
//   colorSpace: "RGB",
//   fileSize: 145000,
//   ...
// }

// For PDFs:
// {
//   dimensions: { width: 10, height: 12.5, formatted: '10" x 12.5"' },
//   colorSpace: "CMYK",
//   pageCount: 1,
//   estimatedDPI: 300,
//   ...
// }
```

### Auto-Match to Requirements

```typescript
import { autoMatchFileToSpecs } from '@/utils/fileSpecDetection';

// Match detected specs against requirement groups
const matches = autoMatchFileToSpecs(specs, requirementGroups);

// Get best match
const bestMatch = matches[0];

if (bestMatch.matchScore >= 70) {
  // High confidence - show auto-suggestion
  console.log(`Matches: ${bestMatch.specGroupName}`);
  console.log(`Reasons: ${bestMatch.matchReasons.join(', ')}`);
} else {
  // Low confidence - show manual selection
  console.log('Please select manually');
}
```

### Extract Requirements from Campaign

```typescript
import { extractRequirementsForSelectedInventory } from '@/utils/creativeSpecsExtractor';
import { groupRequirementsBySpec } from '@/utils/creativeSpecsGrouping';

// Extract from selected inventory
const requirements = extractRequirementsForSelectedInventory(
  campaign.selectedInventory
);

// Group by unique specs
const grouped = groupRequirementsBySpec(requirements);

console.log(grouped);
// [
//   {
//     specGroupId: "website::dim:300x250",
//     channel: "website",
//     dimensions: "300x250",
//     placements: [/* 5 placements */],
//     placementCount: 5,
//     publicationCount: 5
//   },
//   {
//     specGroupId: "print::dim:10\"x12.5\"::fmt:PDF::color:CMYK::res:300dpi",
//     channel: "print",
//     dimensions: '10" x 12.5"',
//     fileFormats: ["PDF"],
//     colorSpace: "CMYK",
//     resolution: "300dpi",
//     placements: [/* 2 placements */],
//     placementCount: 2,
//     publicationCount: 2
//   }
// ]
```

---

## Files & Documentation

### Key Code Files

- `src/config/inventoryStandards.ts` - All standards (website + print)
- `src/utils/creativeSpecsExtractor.ts` - Extract requirements
- `src/utils/creativeSpecsGrouping.ts` - Group by specs
- `src/utils/fileSpecDetection.ts` - Detect specs & auto-match
- `scripts/analyzePrintInventory.ts` - Database analysis

### Documentation

- `CREATIVE_REQUIREMENTS_COMPLETE_SUMMARY.md` - Full overview
- `PRINT_INVENTORY_ANALYSIS.md` - Database findings
- `PRINT_CREATIVE_REQUIREMENTS_SUMMARY.md` - Print specifics
- `PDF_DIMENSION_DETECTION.md` - Technical details
- `CREATIVE_REQUIREMENTS_QUICK_START.md` - This file

---

## Standards Reference

### Website (13 standards)

**Most Common IAB Sizes:**
- 300x250 (Medium Rectangle) ⭐ Most popular
- 728x90 (Leaderboard)
- 160x600 (Wide Skyscraper)
- 300x600 (Half Page)
- 320x50 (Mobile Leaderboard)
- 970x250 (Billboard)
- 970x90 (Large Leaderboard)

**Specs**: JPG/PNG/GIF/HTML5, RGB, 72ppi, ~150KB

### Print (8 standards)

**By Format (not size):**
- Full Page (most common)
- Half Page
- Quarter Page
- Eighth Page
- Business Card
- Classified
- Insert
- Custom

**Specs**: PDF/TIFF/EPS/AI, CMYK, 300dpi, 0.125" bleed

---

## Validation Rules

### Website

| Check | Rule | Action |
|-------|------|--------|
| Dimensions | Must match exactly (±1%) | Error if far off |
| Format | JPG, PNG, GIF, WebP accepted | Allow most |
| Color | RGB preferred | Warn if CMYK |
| Size | Keep under 150-200KB | Warn if large |

### Print

| Check | Rule | Action |
|-------|------|--------|
| Dimensions | Must match exactly (±5%) | Error if wrong |
| Format | PDF strongly preferred | Warn if not PDF |
| Color | CMYK required | Error if RGB |
| Resolution | 300dpi minimum | Error if < 300 |
| Bleed | 0.125" if required | Info only |

---

## Testing Checklist

### Website Creative
- [ ] Upload 300x250 JPG
- [ ] System detects dimensions
- [ ] Auto-matches publications
- [ ] Click "Use Suggested"
- [ ] Verify assignment

### Print Creative
- [ ] Upload 10"x12.5" PDF
- [ ] System detects dimensions
- [ ] System detects CMYK
- [ ] Auto-matches publications
- [ ] Click "Use Suggested"
- [ ] Verify assignment

### Mixed Campaign
- [ ] Add website + print inventory
- [ ] Upload images for web
- [ ] Upload PDFs for print
- [ ] All auto-match correctly
- [ ] Generate insertion orders

---

## Troubleshooting

### "No dimensions detected"

**Cause**: Corrupted file or unsupported format  
**Fix**: Try different file or check file integrity

### "Dimensions don't match any requirements"

**Cause**: Wrong size uploaded  
**Fix**: Check campaign requirements, create correct size

### "RGB detected, print requires CMYK"

**Cause**: File is in wrong color space  
**Fix**: Convert to CMYK in design software

### "File too large"

**Cause**: Exceeds size limit  
**Fix**: Compress or optimize file

### "Please select manually"

**Cause**: Auto-detection confidence too low  
**Fix**: Just select the right requirement from dropdown

---

## Need Help?

### For Users
- Check campaign requirements first
- Verify file dimensions in your design software
- Make sure PDFs are CMYK, 300dpi
- Use manual selection if auto-detect fails

### For Developers
- Check browser console for detection logs
- Verify `pdfjs-dist` is loaded
- Test with known-good files first
- Use analysis script to check database inventory

---

## Status: Ready for Production ✅

All features implemented and documented. Ready to use!


