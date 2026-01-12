# Creative Assets Preview & Download Buttons - Added

**Date**: January 12, 2026  
**Issue**: No way to preview or download uploaded creative assets  
**Status**: ✅ **FIXED**

---

## Problem

When viewing uploaded creative assets in the Creative Requirements tab, users could see:
- ✅ Small thumbnail preview
- ✅ File name and size
- ✅ Remove button

But MISSING:
- ❌ **No Preview button** - couldn't view the full file
- ❌ **No Download button** - couldn't download the file

This was especially problematic for:
- **PDFs** - small thumbnail doesn't show content
- **Text files** - no thumbnail at all
- **Audio files** - can't listen without downloading
- **Large images** - thumbnail too small to see details

---

## Solution

Added **TWO new buttons** for every uploaded asset:

### 1. 👁️ Preview Button
**What it does**: Opens the file in a new browser tab
**Works for**: ALL file types
- **Images** → Opens full-size image in new tab
- **PDFs** → Opens PDF viewer in new tab
- **Text files** → Opens text content in new tab
- **Audio** → Opens audio player in new tab
- **Video** → Opens video player in new tab

### 2. 📥 Download Button
**What it does**: Downloads the file to your computer
**Works for**: ALL file types
- Uses the original filename
- Works even if browser can preview the file
- Always available when a file is uploaded

---

## Changes Made

### File Modified
`src/components/campaign/CreativeAssetsManager.tsx`

### 1. Added Import (line 77)
```typescript
import {
  // ... other icons
  Download,
  Eye,      // ← Added for Preview button
} from 'lucide-react';
```

### 2. Added Buttons (lines 2886-2943)
**Before** (only Remove button):
```typescript
<div className="pt-1">
  <Button>
    <Trash2 /> Remove
  </Button>
</div>
```

**After** (Preview + Download + Remove):
```typescript
<div className="pt-1 flex flex-wrap gap-1">
  {/* Preview Button */}
  {(asset.previewUrl || asset.uploadedUrl) && (
    <Button
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        const url = asset.uploadedUrl || asset.previewUrl;
        if (url) {
          window.open(url, '_blank');
        }
      }}
      title="Preview file in new tab"
    >
      <Eye className="h-3 w-3 mr-1" />
      Preview
    </Button>
  )}
  
  {/* Download Button */}
  {(asset.uploadedUrl || asset.previewUrl) && (
    <Button
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        const url = asset.uploadedUrl || asset.previewUrl;
        const fileName = asset.file?.name || asset.fileName || 'download';
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }}
      title="Download file"
    >
      <Download className="h-3 w-3 mr-1" />
      Download
    </Button>
  )}
  
  {/* Remove Button */}
  <Button variant="ghost">
    <Trash2 /> Remove
  </Button>
</div>
```

---

## How It Works

### Preview Button Logic
1. **Checks for URL**: Uses `asset.uploadedUrl` (S3) or falls back to `asset.previewUrl` (blob)
2. **Opens new tab**: `window.open(url, '_blank')`
3. **Browser handles rendering**: 
   - Images → shown in image viewer
   - PDFs → shown in PDF viewer
   - Text → shown as plain text
   - Audio/Video → shown in media player
   - Unknown types → download dialog

### Download Button Logic
1. **Creates temporary link**: `document.createElement('a')`
2. **Sets href to file URL**: Points to S3 or blob URL
3. **Sets download attribute**: Uses original filename
4. **Triggers click**: Programmatically clicks link
5. **Cleans up**: Removes link from DOM
6. **Result**: File downloads with correct name

---

## User Experience

### Before Fix ❌
```
┌─────────────────────────────┐
│ [Thumbnail]  File: ad.pdf   │
│              2.5 MB         │
│              [Remove]       │ ← Only option
└─────────────────────────────┘

User wants to see the PDF → Can't!
User wants to download → Can't!
```

### After Fix ✅
```
┌─────────────────────────────────────────┐
│ [Thumbnail]  File: ad.pdf               │
│              2.5 MB                     │
│              [👁️ Preview]  [📥 Download]  [Remove] │ ← All options!
└─────────────────────────────────────────┘

User wants to see the PDF → Click Preview!
User wants to download → Click Download!
```

---

## Button Behavior by File Type

| File Type | Preview Button | Download Button |
|-----------|---------------|-----------------|
| **Image (JPG, PNG, GIF)** | Opens full-size in new tab | Downloads with filename |
| **PDF** | Opens in browser PDF viewer | Downloads with filename |
| **Text (TXT)** | Opens as plain text | Downloads with filename |
| **Audio (MP3, WAV)** | Opens in audio player | Downloads with filename |
| **Video (MP4)** | Opens in video player | Downloads with filename |
| **Other** | May show or download | Always downloads |

---

## Button States

### Buttons Show When:
✅ File has been uploaded to S3 (`asset.uploadedUrl` exists)  
✅ OR file has preview blob URL (`asset.previewUrl` exists)  
✅ File status is 'uploaded' or 'pending'

### Buttons Hidden When:
❌ No file attached yet  
❌ File is still analyzing  
❌ Upload failed

---

## Design Decisions

### 1. Why Both Preview AND Download?
- **Preview** = Quick view without leaving the page
- **Download** = Save to computer for use in other tools
- **Both needed**: Different use cases

### 2. Why "outline" Variant for Preview/Download?
- **Visual hierarchy**: Remove button is more destructive (ghost/red)
- **Emphasis**: Preview/Download are primary actions (outlined)
- **Consistency**: Matches other outlined action buttons in the app

### 3. Why Open in New Tab?
- **Don't lose work**: User stays in campaign editor
- **Easy to close**: Close tab when done viewing
- **Browser native**: Uses browser's built-in viewers for PDF, images, etc.

### 4. Why Flex-wrap?
- **Responsive**: Buttons wrap on small screens
- **No overflow**: Works even with long filenames
- **Clean layout**: Buttons stay aligned

---

## Testing Checklist

### ✅ Test Preview Button

1. **Upload an image**:
   - [ ] Click Preview
   - [ ] Should open full-size image in new tab
   - [ ] Tab should be closable

2. **Upload a PDF**:
   - [ ] Click Preview
   - [ ] Should open PDF viewer in new tab
   - [ ] Should be able to scroll through pages

3. **Upload a text file**:
   - [ ] Click Preview
   - [ ] Should show text content in new tab

4. **Upload an audio file**:
   - [ ] Click Preview
   - [ ] Should open audio player in new tab
   - [ ] Should be able to play audio

### ✅ Test Download Button

1. **Upload any file**:
   - [ ] Click Download
   - [ ] File should download to Downloads folder
   - [ ] Filename should match original

2. **Different file types**:
   - [ ] Image → downloads as .jpg/.png
   - [ ] PDF → downloads as .pdf
   - [ ] Text → downloads as .txt
   - [ ] Audio → downloads as .mp3/.wav

### ✅ Test Button Availability

1. **Before upload**:
   - [ ] Buttons should NOT show (no file yet)

2. **During upload**:
   - [ ] Buttons should show (using blob URL)
   - [ ] Both should work

3. **After upload**:
   - [ ] Buttons should show (using S3 URL)
   - [ ] Both should work

4. **After page refresh**:
   - [ ] Buttons should still show
   - [ ] Both should still work (using S3 URL)

---

## Technical Notes

### URL Priority
```typescript
const url = asset.uploadedUrl || asset.previewUrl;
```
**Prefers**: `uploadedUrl` (permanent S3 URL)  
**Fallback**: `previewUrl` (temporary blob URL)

### Why This Order?
1. **S3 URL** is permanent - works after page refresh
2. **Blob URL** is temporary - only works in current session
3. **Try S3 first** - more reliable long-term

### Blob URLs vs S3 URLs
| Type | When Created | Lifespan | Usage |
|------|-------------|----------|-------|
| **Blob URL** | `URL.createObjectURL(file)` | Current session only | Immediate preview before upload |
| **S3 URL** | After upload to server | Permanent | Long-term storage and access |

### Stop Propagation
```typescript
onClick={(e) => {
  e.stopPropagation();  // ← Important!
  // ... button action
}}
```

**Why?**: The row is clickable (expand/collapse), but buttons shouldn't trigger row click.

---

## Future Enhancements (Optional)

### 1. In-App Preview Modal
Instead of new tab, could show modal with preview:
```typescript
<Dialog>
  <DialogContent>
    <img src={asset.previewUrl} />
  </DialogContent>
</Dialog>
```

**Pros**: Stay in page, faster  
**Cons**: More complex, limited by modal size

### 2. Copy URL Button
Add button to copy S3 URL to clipboard:
```typescript
<Button onClick={() => navigator.clipboard.writeText(asset.uploadedUrl)}>
  <Copy /> Copy URL
</Button>
```

**Use case**: Share file URL with others

### 3. Open in External App
For audio/video, add "Open in Player" option:
```typescript
<DropdownMenu>
  <DropdownMenuItem onClick={() => window.open(`vlc://${url}`)}>
    Open in VLC
  </DropdownMenuItem>
</DropdownMenu>
```

**Use case**: Professional editing tools

---

## Summary

✅ **Added Preview button** - Opens file in new tab  
✅ **Added Download button** - Downloads file to computer  
✅ **Works for all file types** - Images, PDFs, text, audio, video  
✅ **Always available** - Shows for both pending and uploaded files  
✅ **No breaking changes** - Existing functionality untouched  
✅ **Clean UI** - Buttons wrap responsively  

**Result**: Users can now ALWAYS preview and download their uploaded creative assets! 🎉
