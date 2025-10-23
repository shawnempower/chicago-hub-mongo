# Storefront Draft Mode & Preview System

## Overview

The storefront configuration system now includes enhanced draft mode functionality with preview capabilities and improved image management.

## Key Features

### 1. **Website URL (Required Field)**

The `websiteUrl` is now a required field in the storefront configuration schema. This enables:
- Preview URLs for draft and published versions
- Direct links to the live storefront
- Better tracking and validation

**Location in UI**: Settings tab → Website URL field (marked with red asterisk)

### 2. **Draft Mode with Preview**

Users can work in draft mode and preview changes before publishing:

#### Draft Mode Toggle
- Located in Settings → Storefront Status
- When enabled: Changes are saved as drafts
- When disabled: Configuration is published/live

#### Preview Buttons
- **Preview Draft**: Opens draft version in new tab (when in draft mode)
- **View Published Version**: Opens live/published storefront (available in draft mode)
- **View Live**: Opens the published storefront (when not in draft mode)

Preview URLs are automatically generated using the website URL:
```
https://yourwebsite.com/storefront?preview=draft  (draft mode)
https://yourwebsite.com/storefront                (published)
```

### 3. **Soft-Delete for Images**

Images are now soft-deleted instead of being permanently removed from S3:

#### Why Soft-Delete?
- **Rollback Support**: Can revert to previous configurations
- **Draft/Publish Workflow**: Published version keeps images until draft is published
- **Version History**: Enables future version control features
- **Safety**: Prevents accidental permanent deletion

#### How It Works
```typescript
// When "Remove Image" is clicked:
// ✅ Image URL removed from configuration
// ✅ Image kept in S3 bucket
// ❌ Image NOT deleted from S3

// Hard delete only when explicitly needed:
permanentlyDeleteImage(s3Key) // Use with caution
```

### 4. **Validation**

The system validates:
- Website URL is required before saving
- Website URL must be valid (proper URL format)
- Visual feedback for invalid URLs

## Implementation Details

### Schema Changes

**storefront.json**:
```json
{
  "meta": {
    "required": ["configVersion", "publisherId", "websiteUrl", "isDraft"]
  }
}
```

**TypeScript Interface**:
```typescript
interface StorefrontConfiguration {
  meta: {
    websiteUrl: string; // Now required (was optional)
    isDraft: boolean;
  }
}
```

### New Files

#### `/src/utils/storefrontPreview.ts`
Utility functions for generating preview URLs:
- `generatePreviewUrl(config, isDraft)` - Main preview URL generator
- `generatePreviewUrlWithParams(url, params)` - Custom parameters
- `isValidUrl(url)` - URL validation
- `getStorefrontEmbedUrl(config, isDraft)` - For iframe embeds

#### Updated Files

1. **`server/storefrontImageService.ts`**
   - Changed `removeStorefrontImage()` to soft-delete
   - Added `permanentlyDeleteImage()` for explicit hard deletes
   - Added documentation about soft-delete benefits

2. **`src/components/dashboard/PublicationStorefront.tsx`**
   - Added Website URL input field (required)
   - Added preview buttons in Storefront Status card
   - Added validation for websiteUrl before saving
   - Imported preview utilities

3. **`src/integrations/mongodb/schemas.ts`**
   - Changed `websiteUrl` from optional to required

## User Workflow

### Typical Draft → Publish Flow

1. **Start in Draft Mode**
   - Toggle "Draft Mode" to ON
   - Website URL is required (set it first if not already set)

2. **Make Changes**
   - Edit storefront content, theme, components
   - Upload images (logos, hero images, etc.)
   - Images are saved to S3 immediately

3. **Preview Changes**
   - Click "Preview Draft" to see changes
   - Opens storefront with `?preview=draft` parameter
   - Click "View Published Version" to compare with live site

4. **Publish When Ready**
   - Toggle "Draft Mode" to OFF
   - Click "Save Changes"
   - Changes are now live!

5. **Continue Editing**
   - Can toggle back to draft mode for next round of changes
   - Old images are preserved in S3 for safety

## API Integration

Your storefront website should handle the preview parameter:

```javascript
// Example storefront integration
const urlParams = new URLSearchParams(window.location.search);
const isPreview = urlParams.get('preview') === 'draft';

// Fetch appropriate configuration
const configId = isPreview ? 'draft' : 'published';
const config = await fetchStorefrontConfig(publicationId, { draft: isPreview });
```

## Benefits

### For Publishers
- ✅ **Safe Editing**: Work on drafts without affecting live site
- ✅ **Preview Before Publish**: See exactly what users will see
- ✅ **No Data Loss**: Images preserved even when "removed"
- ✅ **Easy Comparison**: View draft and published side-by-side

### For Developers
- ✅ **Version Control Ready**: Foundation for future versioning
- ✅ **Rollback Capable**: Can restore previous configurations
- ✅ **Clean Separation**: Draft vs. published logic is clear
- ✅ **Safe Operations**: Soft-deletes prevent accidents

## Future Enhancements

This implementation sets the foundation for:

1. **Version History**
   - Keep multiple versions of configurations
   - Compare changes between versions
   - Rollback to any previous version

2. **Scheduled Publishing**
   - Set publish date/time for drafts
   - Automatic publishing via cron job

3. **Change Tracking**
   - Track what changed between versions
   - Show diff view of modifications
   - Audit trail of all changes

4. **Collaborative Editing**
   - Multiple users editing drafts
   - Lock mechanism to prevent conflicts
   - Change notifications

## Testing

### Manual Testing Checklist

- [ ] Create new storefront config
- [ ] Website URL field shows required indicator
- [ ] Cannot save without valid website URL
- [ ] Draft mode toggle works
- [ ] Preview Draft button opens correct URL
- [ ] View Published button opens correct URL
- [ ] Upload an image while in draft mode
- [ ] Remove the image (should soft-delete)
- [ ] Verify image still exists in S3
- [ ] Toggle draft mode off (publish)
- [ ] Verify preview buttons update appropriately

## Troubleshooting

### Preview shows 404
- Verify website URL is correct
- Check that storefront is configured on the website
- Ensure website handles `?preview=draft` parameter

### Image not deleting
- This is expected! Images are soft-deleted
- They're removed from config but kept in S3
- Use admin tools if permanent deletion is needed

### Cannot save configuration
- Check that Website URL is filled in
- Ensure Website URL is a valid URL format
- Look for validation errors in the form

## Configuration

### Environment Variables

No new environment variables needed. The existing CloudFront setup continues to work:

```bash
AWS_CLOUDFRONT_DOMAIN=dzr71npsexxrt.cloudfront.net
```

## Related Documentation

- `STOREFRONT_IMAGES_SETUP.md` - Image upload and CloudFront setup
- `json_files/schema/storefront.json` - Complete schema documentation
- `HUB_PRICING_FEATURE.md` - Related pricing features

## Migration Notes

### Existing Storefronts

Existing storefront configurations may not have `websiteUrl` set. When they try to save:

1. They'll see an error: "Please provide a valid website URL before saving"
2. They must fill in the Website URL field
3. Then they can save successfully

**No database migration needed** - the field will be populated as users edit their storefronts.

### Image Cleanup

Images uploaded before this update remain in S3. To clean up truly unused images:

1. Run an audit to find unreferenced images
2. Verify they're not used in any configuration (including drafts)
3. Use the `permanentlyDeleteImage()` function if needed

**Recommendation**: Keep images for at least 30 days before considering permanent deletion.

## Support

For issues or questions:
1. Check this documentation
2. Review linter errors with `read_lints`
3. Check browser console for validation errors
4. Verify environment variables are loaded

