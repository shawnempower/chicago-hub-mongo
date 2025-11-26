# Website Inventory Standards - Quick Reference

---

## 📊 All Website Standards at a Glance

### IAB Standard Banner Sizes

| ID | Name | Size | Max | Formats | Best For |
|----|------|------|-----|---------|----------|
| `website_banner_300x250` | **Medium Rectangle** | 300×250 | 150KB | JPG, PNG, GIF, HTML5 | Most versatile, sidebar/content |
| `website_banner_728x90` | **Leaderboard** | 728×90 | 150KB | JPG, PNG, GIF, HTML5 | Header/footer horizontal |
| `website_banner_160x600` | **Wide Skyscraper** | 160×600 | 150KB | JPG, PNG, GIF, HTML5 | Vertical sidebar |
| `website_banner_300x600` | **Half Page** | 300×600 | 200KB | JPG, PNG, GIF, HTML5 | Premium sidebar |
| `website_banner_320x50` | **Mobile Leaderboard** | 320×50 | 50KB | JPG, PNG, GIF, HTML5 | Mobile header/footer |
| `website_banner_970x250` | **Billboard** | 970×250 | 200KB | JPG, PNG, GIF, HTML5 | Masthead, premium |

### Video Standards

| ID | Name | Duration | Size | Format | Resolution |
|----|------|----------|------|--------|------------|
| `website_video_preroll` | **Pre-roll** | 30s | 50MB | MP4/H.264 | 1080p |
| `website_video_midroll` | **Mid-roll** | 15s | 30MB | MP4/H.264 | 1080p |

### Special Formats

| ID | Name | Notes |
|----|------|-------|
| `website_native_ad` | **Native Ad** | Responsive, must include 1200×628 thumbnail |
| `website_banner_custom` | **Custom Size** | Publication-specific dimensions |

---

## 🎯 Common Use Cases

### "I need a sidebar banner"
→ Use: `website_banner_300x250` (most common)  
→ Or: `website_banner_300x600` (premium, larger)

### "I need a top banner"
→ Use: `website_banner_728x90` (standard)  
→ Or: `website_banner_970x250` (premium, larger)

### "I need a tall vertical ad"
→ Use: `website_banner_160x600`

### "I need mobile ads"
→ Use: `website_banner_320x50`

### "I need video ads"
→ Use: `website_video_preroll` (30s)  
→ Or: `website_video_midroll` (15s shorter)

---

## 📏 Standard Specs Summary

**All Digital Ads:**
- ✅ Color Space: **RGB** (always)
- ✅ Resolution: **72ppi** (web standard)
- ✅ Animation: Max 15 seconds
- ✅ Formats: JPG, PNG, GIF (static/animated)
- ✅ HTML5: Supported for interactive ads

**Video Ads:**
- ✅ Codec: **H.264**
- ✅ Bitrate: **5Mbps**
- ✅ Aspect: **16:9**
- ✅ Resolution: **1080p**

---

## 💻 Code Snippets

### Import the Standards
```typescript
import { 
  getInventoryStandard,
  findStandardByDimensions,
  validateAgainstStandard,
  getIABStandards 
} from '@/config/inventoryStandards';
```

### Get a Standard
```typescript
const standard = getInventoryStandard('website_banner_300x250');
// Returns full standard object with all specs
```

### Validate a File
```typescript
const result = validateAgainstStandard({
  dimensions: '300x250',
  fileFormat: 'JPG',
  fileSize: 145000,
  colorSpace: 'RGB'
}, standard);

if (result.valid) {
  console.log('✓ File meets all requirements');
}
```

### Auto-Match by Dimensions
```typescript
const standard = findStandardByDimensions('728x90');
console.log(standard.id); 
// "website_banner_728x90"
```

### Get All IAB Standards
```typescript
const iabStandards = getIABStandards();
// Returns only IAB standard sizes (excludes video, custom, etc.)
```

---

## 🔍 Finding the Right Standard

### By Use Case
```typescript
// Homepage sidebar
→ website_banner_300x250

// Top header banner
→ website_banner_728x90

// Premium large sidebar
→ website_banner_300x600

// Mobile banner
→ website_banner_320x50

// Video before content
→ website_video_preroll
```

### By Dimensions (Auto-detect)
```typescript
300×250 → website_banner_300x250
728×90  → website_banner_728x90
160×600 → website_banner_160x600
300×600 → website_banner_300x600
320×50  → website_banner_320x50
970×250 → website_banner_970x250
```

---

## ✅ Validation Rules

### File Format
- ✓ **Allowed**: JPG, PNG, GIF, HTML5
- ✗ **Not Allowed**: BMP, TIFF, SVG (for banners)

### Color Space
- ✓ **Required**: RGB
- ✗ **Not Allowed**: CMYK (that's for print)

### File Size
- Check `maxFileSize` for each standard
- Most banners: **150KB max**
- Large formats: **200KB max**
- Mobile: **50KB max** (faster loading)
- Video: **30-50MB max**

### Dimensions
- Must match exactly (300×250, not 301×250)
- Some standards accept multiple sizes

### Animation
- Max **15 seconds** duration
- Must loop max **3 times**
- Final frame must be **static**

---

## 📱 Platform Integration

### Publication Inventory Form
```typescript
// Publication selects from dropdown
<Select>
  <Option value="website_banner_300x250">
    300×250 Medium Rectangle (Most Common)
  </Option>
  <Option value="website_banner_728x90">
    728×90 Leaderboard
  </Option>
  // ... etc
</Select>

// Specs auto-fill from standard
```

### Asset Upload
```typescript
// 1. User uploads file
// 2. System detects: 300×250, JPG, RGB, 145KB
// 3. System matches: website_banner_300x250 (95% match)
// 4. User confirms or adjusts
// 5. Asset validated against standard
```

### Campaign Gap Analysis
```typescript
// Required: 5 unique standards across 20 placements
// Uploaded: 3 standards
// Missing: 2 standards (affects 8 placements)
```

---

## 🚨 Common Issues & Solutions

### Issue: "File rejected - wrong dimensions"
**Solution:** Check exact dimensions match standard
```typescript
Required: 300×250
Uploaded: 305×250 ✗ (too big by 5px)
Fix: Crop/resize to exactly 300×250
```

### Issue: "File too large"
**Solution:** Compress/optimize image
```typescript
Max: 150KB
Uploaded: 245KB ✗
Fix: Compress using TinyPNG, JPEGmini, etc.
Aim for: 70% of max (~105KB) for safety
```

### Issue: "Wrong color space"
**Solution:** Convert from CMYK to RGB
```typescript
Required: RGB
Uploaded: CMYK ✗
Fix: Convert in Photoshop (Edit > Convert to Profile > sRGB)
```

### Issue: "Format not allowed"
**Solution:** Convert to allowed format
```typescript
Allowed: JPG, PNG, GIF
Uploaded: BMP ✗
Fix: Save as JPG or PNG
```

---

## 🎨 Design Tips

### 300×250 (Medium Rectangle)
- Keep text readable at small size
- Use high contrast
- Clear call-to-action button
- Test with white/dark backgrounds

### 728×90 (Leaderboard)
- Horizontal layout
- Logo on left, CTA on right works well
- Don't make text too small
- Use bold, simple message

### 160×600 (Skyscraper)
- Vertical storytelling
- Can include more content
- Stack elements vertically
- Good for step-by-step messaging

### 320×50 (Mobile)
- VERY small - keep it simple
- Large tap targets (min 44×44px)
- One clear message
- Test on actual phone

### Video Ads
- First 3 seconds are critical
- Include captions (many watch muted)
- Clear branding in first frame
- Strong CTA at end

---

## 📖 See Also

- **Full Documentation**: `docs/INVENTORY_STANDARDS_RESULTS.md`
- **Config File**: `src/config/inventoryStandards.ts`
- **Examples**: `src/config/inventoryStandards.example.ts`

---

**Last Updated**: November 25, 2025

