#!/bin/bash

# Upload static tracking pixel to S3
# This pixel is served for impression tracking - CloudFront logs capture all query params

set -e

BUCKET="empowerlocal-pixels-ads"
PROFILE="Connection 1"

echo "📦 Uploading tracking pixel to S3..."

# Upload pixel.gif to multiple paths for backwards compatibility
aws s3 cp pixel.gif s3://$BUCKET/v \
  --profile "$PROFILE" \
  --content-type "image/gif" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

aws s3 cp pixel.gif s3://$BUCKET/pxl.png \
  --profile "$PROFILE" \
  --content-type "image/gif" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

aws s3 cp pixel.gif s3://$BUCKET/i.gif \
  --profile "$PROFILE" \
  --content-type "image/gif" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

echo "✅ Pixel uploaded to:"
echo "   - s3://$BUCKET/v"
echo "   - s3://$BUCKET/pxl.png"
echo "   - s3://$BUCKET/i.gif"
echo ""
echo "These URLs will serve the pixel:"
echo "   - https://dxafls8akrlrp.cloudfront.net/v?params..."
echo "   - https://dxafls8akrlrp.cloudfront.net/pxl.png?params..."
echo "   - https://dxafls8akrlrp.cloudfront.net/i.gif?params..."
