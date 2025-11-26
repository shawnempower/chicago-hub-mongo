# S3 Immediate Upload for Previews

**Date**: November 25, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## The Problem

User feedback:
> "hmm, wel the blob preview isn't really working, seems like maybe go ahead and uploading"

**Issue**: Blob URLs (`blob:http://localhost:8080/...`) weren't showing previews reliably.

---

## The Solution

**Upload files to S3 immediately** when selected/dropped, then use S3 URLs for previews.

---

## New Flow

### Step 1: File Selection → Immediate S3 Upload
```typescript
1. User drops/selects files
2. Files added to pending list
3. IMMEDIATELY upload to S3 for preview
4. Get S3 URL back
5. Use S3 URL for preview image
```

### Step 2: Detection & Matching
```typescript
6. Detect file specs (dimensions, format, etc.)
7. Match to inventory standard
8. Show suggestion with S3 preview
```

### Step 3: Assignment
```typescript
9. User assigns (or auto-assigns) to standard
10. Asset stored with S3 URL already attached
```

### Step 4: Final "Upload" (Metadata Only)
```typescript
11. User clicks "Upload All to Server"
12. System checks: File already on S3? 
    → Yes: Skip upload, just save metadata
    → No: Upload now
13. Save associations and metadata to database
```

---

## Code Implementation

### Immediate Upload Function

```typescript
const uploadFileForPreview = async (file: File, fileId: string) => {
  try {
    // Upload to S3 immediately
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'creative-assets');
    if (campaignId) {
      formData.append('campaignId', campaignId);
    }
    
    const response = await fetch('/api/creative-assets/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update pending file with S3 URL
      pendingFiles.set(fileId, {
        ...current,
        previewUrl: result.url,        // S3 URL for preview
        uploadedUrl: result.url         // Store for later
      });
    }
  } catch (error) {
    console.error('Error uploading file for preview:', error);
  }
};
```

### When Files Are Selected

```typescript
// Regular file upload
for (const file of files) {
  const fileId = generateId();
  
  pendingFiles.set(fileId, { 
    file, 
    previewUrl: undefined,  // Will be set after S3 upload
    isAnalyzing: true 
  });
  
  // Upload immediately for preview
  if (file.type.startsWith('image/') || file.type === 'application/pdf') {
    uploadFileForPreview(file, fileId, pendingFiles);
  }
}
```

### ZIP File Upload

```typescript
// ZIP files also upload immediately
for (const processedFile of zipResult.processedFiles) {
  const fileId = generateId();
  
  pendingFiles.set(fileId, {
    file: processedFile.file,
    previewUrl: undefined,  // Will be set after upload
    detectedSpecs: processedFile.detectedSpecs,
    isAnalyzing: false
  });
  
  // Upload to S3 for preview
  uploadFileForPreview(processedFile.file, fileId, pendingFiles);
}
```

### Final Upload Check

```typescript
const handleUploadToServer = async (specGroupId: string) => {
  const asset = uploadedAssets.get(specGroupId);
  let fileUrl = asset.uploadedUrl;  // Check if already uploaded
  
  if (!fileUrl) {
    // Not uploaded yet, upload now
    const response = await uploadToS3(asset.file);
    fileUrl = response.url;
  } else {
    // Already on S3, just mark as complete
    console.log('File already on S3, skipping re-upload');
  }
  
  // Save metadata to database
  saveAssetMetadata(asset, fileUrl);
};
```

---

## Benefits

### ✅ Reliable Previews
- S3 URLs always work
- No blob URL issues
- Consistent across browsers

### ✅ Better UX
- Shows spinner while uploading
- Preview appears when ready
- Clear feedback

### ✅ Efficient
- Upload once, use multiple times
- No re-upload on final "Upload All"
- Faster overall process

### ✅ Persistent
- Files stored immediately
- Can leave page and come back
- No lost uploads

---

## UI States

### State 1: Uploading
```
┌──────────────────────────────────┐
│ ┌─────────┐                      │
│ │         │                      │
│ │ [SPIN]  │  filename.jpg        │
│ │ [...]   │  Uploading...        │
│ │         │                      │
│ └─────────┘                      │
└──────────────────────────────────┘
```

### State 2: Preview Loaded
```
┌──────────────────────────────────┐
│ ┌─────────┐          [Preview]   │
│ │         │                      │
│ │ IMAGE   │  filename.jpg        │
│ │ FROM    │  📦 145 KB 📄 PNG   │
│ │  S3     │  📐 300x250 🎨 RGB  │
│ └─────────┘                      │
└──────────────────────────────────┘
```

### State 3: Preview Failed (Fallback)
```
┌──────────────────────────────────┐
│ ┌─────────┐                      │
│ │         │                      │
│ │ [ICON]  │  filename.jpg        │
│ │  📷     │  📦 145 KB 📄 PNG   │
│ │         │                      │
│ └─────────┘                      │
└──────────────────────────────────┘
```

---

## S3 Storage Structure

### Immediate Upload Location
```
s3://bucket/creative-assets/
  campaigns/
    {campaignId}/
      filename-{timestamp}.jpg  ← Uploaded immediately
      filename-{timestamp}.png
      ...
```

### No Temp Directory Needed
- Files go directly to final location
- Uses campaign ID if available
- Falls back to general location if no campaign

---

## Error Handling

### Upload Fails
```typescript
try {
  await uploadFileForPreview(file);
} catch (error) {
  console.error('Upload failed:', error);
  // File still shows in list
  // Preview shows icon instead of image
  // User can still try final upload
}
```

### Preview Image Fails to Load
```typescript
<img 
  src={s3Url}
  onError={(e) => {
    // Hide broken image
    e.currentTarget.style.display = 'none';
    // Fallback icon shows instead
  }}
/>
```

---

## Comparison

### Old Flow (Blob URLs):
```
1. Select files
2. Create blob URL (blob://...)
3. Show preview
4. Assign to specs
5. Click "Upload All"
6. Upload to S3
7. Save metadata

Issues:
❌ Blob URLs sometimes don't work
❌ Files lost if page refreshed
❌ Large uploads at end
```

### New Flow (Immediate S3):
```
1. Select files
2. Upload to S3 immediately
3. Get S3 URL
4. Show preview from S3
5. Assign to specs
6. Click "Upload All"
7. Check: Already uploaded? → Skip!
8. Save metadata only

Benefits:
✅ S3 URLs always work
✅ Files persisted immediately
✅ Faster final step
✅ Better UX
```

---

## Testing

### Test 1: Single Image Upload
1. Drop a PNG file
2. ✅ See spinner in preview area
3. ✅ Preview loads from S3
4. ✅ Assign to standard
5. ✅ "Upload All" completes instantly (already on S3)

### Test 2: ZIP Upload
1. Upload ZIP with 5 files
2. ✅ All show spinners initially
3. ✅ Previews load as uploads complete
4. ✅ Can see previews before assigning
5. ✅ "Upload All" very fast (files already on S3)

### Test 3: Large Files
1. Upload 5MB image
2. ✅ Shows "Uploading..." spinner
3. ✅ Takes a few seconds
4. ✅ Preview appears when complete
5. ✅ No re-upload on final step

### Test 4: Network Error
1. Disconnect network
2. Drop file
3. ✅ Upload fails gracefully
4. ✅ Shows icon instead of preview
5. ✅ Can retry with "Upload All"

---

## Summary

**Problem**: Blob URLs not showing previews reliably  
**Solution**: Upload to S3 immediately, use S3 URLs for previews  
**Result**: Reliable previews, better UX, faster workflow  

**Key Change**: Files uploaded **when selected**, not when "Upload All" clicked

**Files Modified:**
- `src/components/campaign/CampaignCreativeAssetsUploader.tsx`

**Benefits:**
- ✅ Reliable S3-based previews
- ✅ No blob URL issues
- ✅ Persistent storage
- ✅ Faster final upload (metadata only)

---

**Last Updated**: November 25, 2025  
**Status**: ✅ Ready to Test

