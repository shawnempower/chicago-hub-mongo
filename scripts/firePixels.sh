#!/bin/bash

# Fire Real Tracking Pixels
# Tests the CloudFront -> Lambda -> Database pipeline

echo ""
echo "🎯 FIRING TRACKING PIXELS"
echo "================================"
echo ""

# CloudFront distribution
CLOUDFRONT_URL="https://dxafls8akrlrp.cloudfront.net"

# Example tracking parameters (these would come from real tracking scripts)
ORDER_ID="6960195199937f3b71a2338d"
CAMPAIGN_ID="campaign-mk5xcmza-buh26b"
PUB_ID="1035"
CHANNEL="web"
CREATIVE_ID="cr_test_001"

echo "📊 Test Parameters:"
echo "   CloudFront: $CLOUDFRONT_URL"
echo "   Campaign: $CAMPAIGN_ID"
echo "   Order: $ORDER_ID"
echo ""

# Fire 5 impression pixels
echo "🔥 Firing 5 impressions..."
for i in {1..5}; do
  CB=$(date +%s)${i}
  URL="${CLOUDFRONT_URL}/pxl.png?oid=${ORDER_ID}&cid=${CAMPAIGN_ID}&pid=${PUB_ID}&ch=${CHANNEL}&t=display&cr=${CREATIVE_ID}&s=300x250&test=1&cb=${CB}"
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
    -H "Referer: https://chicagoreader.com/test")
  
  echo "   ✅ Impression $i: HTTP $STATUS"
  sleep 0.5
done

echo ""
echo "🔥 Firing 2 clicks..."
for i in {1..2}; do
  CB=$(date +%s)${i}
  LANDING_URL=$(printf '%s' 'https://example.com/landing' | jq -sRr @uri)
  URL="${CLOUDFRONT_URL}/c?oid=${ORDER_ID}&cid=${CAMPAIGN_ID}&pid=${PUB_ID}&ch=${CHANNEL}&t=click&cr=${CREATIVE_ID}&r=${LANDING_URL}&test=1&cb=${CB}"
  
  # Get redirect location
  RESPONSE=$(curl -s -I "$URL" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
    -H "Referer: https://chicagoreader.com/test")
  
  STATUS=$(echo "$RESPONSE" | head -n 1 | cut -d' ' -f2)
  LOCATION=$(echo "$RESPONSE" | grep -i "^location:" | cut -d' ' -f2- | tr -d '\r')
  
  if [ "$STATUS" = "302" ] || [ "$STATUS" = "301" ]; then
    echo "   ✅ Click $i: HTTP $STATUS → $LOCATION"
  else
    echo "   ⚠️  Click $i: HTTP $STATUS"
  fi
  sleep 0.5
done

echo ""
echo "================================"
echo "✅ Pixel Firing Complete"
echo ""
echo "📊 Summary:"
echo "   - 5 impression pixels fired"
echo "   - 2 click trackers fired"
echo "   - Total: 7 requests to CloudFront"
echo ""
echo "⏳ Next Steps:"
echo "   1. CloudFront Access Logs will be written to S3 (5-15 min delay)"
echo "   2. Lambda 'analytics-ad-aggregator' will process the logs"
echo "   3. Events will appear in tracking_events collection"
echo ""
echo "🔍 Monitor Lambda logs:"
echo "   aws logs tail /aws/lambda/analytics-ad-aggregator --follow --profile \"Connection 1\""
echo ""
echo "🔍 Check database:"
echo "   npx tsx scripts/checkTrackingDatabase.ts"
echo ""
