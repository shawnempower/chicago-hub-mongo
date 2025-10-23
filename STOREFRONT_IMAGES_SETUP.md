# Storefront Images Setup - Complete

This document describes the storefront image upload feature that has been implemented.

## Overview

Storefront images (logos, hero images, channel images, etc.) are now uploaded to S3 and served publicly via CloudFront CDN.

## Architecture

```
User Upload → Server → S3 (Private) → CloudFront (Public) → Users
```

- **S3 Bucket**: `chicago-hub` (us-east-2)
- **CloudFront Distribution**: `dzr71npsexxrt.cloudfront.net`
- **Security**: S3 bucket is private, CloudFront uses Origin Access Control (OAC)

## Environment Configuration

The following environment variable is configured in `.env`:

```bash
AWS_CLOUDFRONT_DOMAIN=dzr71npsexxrt.cloudfront.net
```

## CloudFront Distribution Details

- **Distribution ID**: E333RWJAZRHR9X
- **Domain**: dzr71npsexxrt.cloudfront.net
- **Origin**: chicago-hub.s3.us-east-2.amazonaws.com
- **OAC ID**: EFDAKKN4PUBLT
- **Status**: Deployed ✅

## S3 Folder Structure

Images are organized in S3 as follows:

```
storefront/
  └── {publicationId}/
      ├── logo/           # Navbar logos
      ├── hero/           # Hero background images
      ├── channel/        # Inventory channel images
      ├── about/          # About us section images
      └── ogImage/        # Social sharing images
```

## Implementation Files

### Backend
- `server/s3Service.ts` - S3 upload service with CloudFront support
- `server/storefrontImageService.ts` - Storefront-specific image handling
- `server/index.ts` - API routes for image upload/replace/remove

### Frontend
- `src/hooks/useStorefrontImages.ts` - React hook for image operations
- `src/components/dashboard/StorefrontImageManager.tsx` - Image upload UI component
- `src/components/dashboard/StorefrontEditor.tsx` - Integrated image uploaders

### API Endpoints
- `POST /api/storefront/:publicationId/images` - Upload image
- `PUT /api/storefront/:publicationId/images` - Replace image
- `DELETE /api/storefront/:publicationId/images` - Remove image

## Image Types Supported

- `logo` - Navbar logo (recommended: 200x50px)
- `hero` - Hero background (recommended: 1920x1080px)
- `channel` - Channel images (per channel)
- `about` - About us image (recommended: 800x600px)
- `ogImage` - Social sharing image

## Usage

### In Storefront Editor

The StorefrontEditor automatically includes image upload components for:
- Navbar → Logo upload
- Hero → Background image upload
- Inventory Channels → Channel images
- About Us → Section image

### Example Code

```tsx
<StorefrontImageManager
  publicationId={publicationId}
  config={storefrontConfig}
  onChange={setStorefrontConfig}
  imageType="hero"
  label="Hero Background Image"
  description="Upload a high-quality hero image (recommended: 1920x1080px)"
/>
```

## CloudFront Setup Files

CloudFront configuration files are stored in `.cloudfront-setup/` (gitignored):
- Configuration files used for setup
- S3 bucket policy
- Setup scripts and documentation

## Monitoring

### Check CloudFront Status

```bash
aws cloudfront get-distribution --id E333RWJAZRHR9X --profile "Connection 1"
```

### View CloudFront Metrics

Go to AWS Console → CloudFront → E333RWJAZRHR9X → Monitoring

### Cache Invalidation (if needed)

```bash
aws cloudfront create-invalidation \
  --distribution-id E333RWJAZRHR9X \
  --paths "/storefront/*" \
  --profile "Connection 1"
```

## Benefits

- ✅ **Fast Global Delivery** - CDN edge caching
- ✅ **Secure** - S3 stays private, CloudFront handles public access
- ✅ **Cost Effective** - Reduced S3 requests through caching
- ✅ **HTTPS** - Secure delivery by default
- ✅ **Scalable** - Handles high traffic automatically

## Maintenance

### Regular Tasks
- Monitor CloudFront costs in AWS Console
- Check error rates in CloudFront metrics
- Invalidate cache if images need immediate updates

### If Issues Arise
1. Check distribution status: `aws cloudfront get-distribution --id E333RWJAZRHR9X`
2. Verify S3 bucket policy allows CloudFront access
3. Check server logs for upload errors
4. Ensure `AWS_CLOUDFRONT_DOMAIN` is in `.env`

## Setup Date

- Created: October 22, 2025
- Distribution Status: Deployed
- Initial images: Working ✅

