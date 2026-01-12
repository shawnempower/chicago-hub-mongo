# EmpowerLocal Tracking Edge Lambda

**Simplified:** Lambda@Edge function that ONLY handles click redirects. Impression pixels are served as static files from S3.

## Architecture

```
Clicks:       /c → Lambda@Edge → 302 Redirect
Impressions:  /pxl.png → S3 static file
Both:         CloudFront Access Logs → Athena → MongoDB
```

## Function Details

- **Name:** `empowerlocal-tracking-edge`
- **Runtime:** Node.js 20.x
- **Region:** us-east-1 (required for Lambda@Edge)
- **CloudFront Distribution:** E14BMKEZBNSGP4
- **Domain:** dxafls8akrlrp.cloudfront.net
- **S3 Pixel:** `s3://empowerlocal-pixels-ads/pxl.png`

## Endpoints Handled

### `/c` - Click Tracking (Lambda@Edge)
Parses redirect URL and returns 302 redirect. CloudFront logs capture all parameters.

**Query Parameters:**
- `oid` - Order ID (required)
- `cid` - Campaign ID (required)
- `pid` - Publication ID (required)
- `ch` - Channel (required)
- `t` - Event type: 'click' (required)
- `cr` - Creative ID (optional)
- `r` - Redirect URL - landing page (required)
- `cb` - Cache buster timestamp (optional)

**Example:**
```
https://dxafls8akrlrp.cloudfront.net/c?oid=order123&cid=camp_abc&pid=101&ch=website&t=click&cr=creative456&r=https%3A%2F%2Fwww.example.com&cb=1736726400000
```

**Response:**
- HTTP 302 redirect to landing page
- CloudFront Access Logs capture all request details

### `/pxl.png` - Impression Pixel (Static S3 File)
Served directly from S3. CloudFront logs capture all request parameters automatically.

**Query Parameters:**
- `oid` - Order ID
- `cid` - Campaign ID
- `pid` - Publication ID
- `ch` - Channel
- `t` - Event type: 'display'
- `cr` - Creative ID (optional)
- `s` - Ad size (optional)
- `cb` - Cache buster timestamp

**Example:**
```
https://dxafls8akrlrp.cloudfront.net/pxl.png?oid=order123&cid=camp_abc&pid=101&ch=website&t=display&cr=creative456&s=300x250&cb=1736726400000
```

**Response:**
- HTTP 200 with 1x1 transparent PNG from S3
- CloudFront Access Logs capture all request details

## Event Logging

All events (clicks AND impressions) are captured in **CloudFront Access Logs** automatically.

Logs include:
- Timestamp, edge location
- Request URI and all query parameters (oid, cid, pid, ch, cr, s, etc.)
- Client IP, user agent, referer
- Response status, bytes transferred
- Time taken

Logs are:
1. Written to S3 by CloudFront (15-60 min delay)
2. Queried by Athena using SQL
3. Synced to MongoDB by `empowerlocal-tracking-sync` Lambda (daily at 6 AM UTC)

See `docs/ATHENA_TRACKING_QUERIES.md` for query examples.

## Local Testing

```bash
# Package the function
npm run package

# Test locally (if using SAM or similar)
npm test
```

## Deployment

See `../../docs/CLOUDFRONT_TRACKING_LAMBDA_DEPLOYMENT.md` for full deployment instructions.

### Quick Deploy

```bash
# Package
zip -r function.zip index.js

# Update function code
aws lambda update-function-code \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge \
  --zip-file fileb://function.zip

# Publish new version
aws lambda publish-version \
  --profile "Connection 1" \
  --region us-east-1 \
  --function-name empowerlocal-tracking-edge

# Update CloudFront to use new version ARN
```

## Monitoring

### View CloudFront Logs
```bash
# Check logs bucket
aws s3 ls s3://empowerlocal-cloudfront-logs/tracking/ --profile "Connection 1"

# Download a log file
aws s3 cp s3://empowerlocal-cloudfront-logs/tracking/E14BMKEZBNSGP4.2026-01-12-20.abcdef.gz . --profile "Connection 1"
gunzip E14BMKEZBNSGP4.2026-01-12-20.abcdef.gz
cat E14BMKEZBNSGP4.2026-01-12-20.abcdef
```

### Query with Athena
```sql
-- View recent clicks
SELECT date, time, cs_uri_query
FROM ad_tracking.cloudfront_logs
WHERE cs_uri_stem = '/c'
  AND date = current_date
ORDER BY time DESC
LIMIT 10;

-- View recent impressions
SELECT date, time, cs_uri_query
FROM ad_tracking.cloudfront_logs
WHERE cs_uri_stem = '/pxl.png'
  AND date = current_date
ORDER BY time DESC
LIMIT 10;
```

## Performance

- **Memory:** 128 MB
- **Timeout:** 5 seconds (viewer-request limit)
- **Average Execution:** ~10-50ms for /c redirects
- **Cost:** ~$0.60 per 1M clicks (much cheaper since impressions don't use Lambda)

## Security

- Validates redirect URL has http/https scheme
- CloudFront logs anonymize IPs after 30 days (optional)
- No caching for tracking requests (Cache-Control headers)
- Static pixel file is public (required for tracking)

## Cost Savings

**Old Architecture (Lambda@Edge for everything):**
- 10M impressions/day + 100K clicks/day = ~$180/month

**New Architecture (Lambda@Edge only for clicks):**
- 100K clicks/day = ~$2/month for Lambda@Edge
- CloudFront logs + Athena = ~$10-15/month
- **Total: ~$15-20/month** (90% cost reduction!)
