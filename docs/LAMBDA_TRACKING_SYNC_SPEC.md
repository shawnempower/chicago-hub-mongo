# Lambda Tracking Sync Specification

## Overview

A scheduled Lambda function that syncs CloudFront pixel tracking data from Athena into the MongoDB `performance_entries` collection for the EmpowerLocal Hub platform.

---

## 1. Function Details

| Property | Value |
|----------|-------|
| **Name** | `empowerlocal-tracking-sync` |
| **Runtime** | Node.js 20.x |
| **Memory** | 512 MB |
| **Timeout** | 5 minutes |
| **Schedule** | Daily at 6:00 AM UTC (`cron(0 6 * * ? *)`) |

---

## 2. Environment Variables

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=staging-chicago-hub
ATHENA_DATABASE=ad_tracking
ATHENA_OUTPUT_BUCKET=s3://your-athena-results-bucket/query-results/
AWS_REGION=us-east-1
```

---

## 3. IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution"
      ],
      "Resource": [
        "arn:aws:athena:*:*:workgroup/primary",
        "arn:aws:athena:*:*:datacatalog/AwsDataCatalog"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-athena-results-bucket",
        "arn:aws:s3:::your-athena-results-bucket/*",
        "arn:aws:s3:::your-cloudfront-logs-bucket",
        "arn:aws:s3:::your-cloudfront-logs-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetTable",
        "glue:GetPartitions",
        "glue:GetDatabase"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## 4. Input Event Schema

The Lambda can be triggered by EventBridge schedule or manual invocation:

```typescript
interface SyncEvent {
  // Optional: specific date to sync (default: yesterday)
  date?: string;  // "YYYY-MM-DD"
  
  // Optional: sync multiple days
  days?: number;  // default: 1
  
  // Optional: only sync specific publication
  publicationCode?: string;
  
  // Optional: dry run mode
  dryRun?: boolean;
}
```

**Examples:**
```json
// Sync yesterday (default)
{}

// Sync specific date
{ "date": "2025-12-10" }

// Sync last 7 days
{ "days": 7 }

// Dry run
{ "dryRun": true }
```

---

## 5. Output Response Schema

```typescript
interface SyncResponse {
  success: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  stats: {
    rowsFromAthena: number;
    synced: number;
    skipped: number;
    errors: number;
  };
  duration: number;  // milliseconds
  error?: string;
}
```

---

## 6. Athena Query

The Lambda executes this query against the `ad_tracking.daily_aggregates` table:

```sql
SELECT
  DATE_FORMAT(report_date, '%Y-%m-%d') AS report_date,
  creative_id,
  publication_code,
  channel,
  ad_size,
  impressions,
  clicks,
  viewable_impressions,
  unique_ips
FROM ad_tracking.daily_aggregates
WHERE report_date >= DATE '{start_date}'
  AND report_date <= DATE '{end_date}'
  AND impressions > 0
ORDER BY report_date, publication_code, creative_id
```

---

## 7. MongoDB Target Collection

**Collection:** `performance_entries`

**Document Schema:**
```typescript
interface PerformanceEntry {
  _id: ObjectId;
  
  // References
  orderId: string;           // FK to publication_insertion_orders._id
  campaignId: string;
  publicationId: number;
  publicationName: string;
  
  // Placement info
  itemPath: string;          // e.g., "tracking-display" or actual inventory path
  itemName: string;          // Creative name or placement name
  channel: string;           // "website" | "newsletter" | "streaming"
  dimensions?: string;       // "300x250", "728x90", etc.
  
  // Time period
  dateStart: Date;
  dateEnd: Date;
  
  // Metrics from tracking
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;             // Computed: (clicks/impressions) * 100
    viewability?: number;    // (viewable/impressions) * 100
    reach: number;           // unique_ips
  };
  
  // Metadata
  source: "automated";       // Always "automated" for Lambda sync
  enteredBy: "lambda-tracking-sync";
  enteredAt: Date;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

**Upsert Key:**
```javascript
{
  orderId: entry.orderId,
  itemPath: entry.itemPath,
  dateStart: entry.dateStart,
  source: "automated"
}
```

---

## 8. Publication Code Mapping

The Lambda needs to map tracking `publication_code` (from pixel URLs) to `publicationId` (in MongoDB):

```typescript
const PUBLICATION_CODE_MAP: Record<string, number> = {
  // Chicago Hub publications
  "chireader": 1035,
  "suntimes": 1038,
  "tribune": 1043,
  "wbez": 1047,
  "wvon": 1048,
  "wrll": 1054,
  "chirp": 1056,
  "e3radio": 1058,
  "ssweekly": 1064,
  "triibe": 1065,
  "ndigo": 1067,
  "hydepark": 1037,
  "evanstonrt": 1044,
  "streetwise": 1055,
  // Add all publications...
};
```

**Alternative:** Query MongoDB for publication by matching `publicationCode` field if you add it to the publications collection.

---

## 9. Order/Placement Lookup Logic

To map a tracking creative back to the MongoDB order:

```typescript
async function lookupOrder(
  db: Db,
  creativeId: string,
  publicationCode: string
): Promise<OrderInfo | null> {
  
  const publicationId = PUBLICATION_CODE_MAP[publicationCode.toLowerCase()];
  if (!publicationId) return null;
  
  // Strategy 1: Look up by tracking_scripts collection
  const trackingScript = await db.collection('tracking_scripts').findOne({
    creativeId: creativeId,
    publicationId: publicationId
  });
  
  if (trackingScript) {
    const order = await db.collection('publication_insertion_orders').findOne({
      campaignId: trackingScript.campaignId,
      publicationId: publicationId,
      deletedAt: { $exists: false }
    });
    
    if (order) {
      return {
        orderId: order._id.toString(),
        campaignId: order.campaignId,
        publicationId: order.publicationId,
        publicationName: order.publicationName,
        itemPath: `tracking-${trackingScript.channel}`,
        itemName: trackingScript.creative?.name || creativeId,
        channel: normalizeChannel(trackingScript.channel)
      };
    }
  }
  
  // Strategy 2: Parse campaign ID from creative ID
  // Format: cr_{campaignId}_{suffix} or creative_{campaignId}_{suffix}
  const campaignMatch = creativeId.match(/(?:cr_|creative_)?([a-z0-9-]+)_/i);
  if (campaignMatch) {
    const order = await db.collection('publication_insertion_orders').findOne({
      campaignId: { $regex: campaignMatch[1], $options: 'i' },
      publicationId: publicationId,
      deletedAt: { $exists: false }
    });
    
    if (order) {
      // Get first digital placement from order
      const pub = order.selectedInventory?.publications?.find(
        p => p.publicationId === publicationId
      );
      const item = pub?.inventoryItems?.find(
        i => ['website', 'newsletter', 'streaming'].includes(i.channel)
      ) || pub?.inventoryItems?.[0];
      
      return {
        orderId: order._id.toString(),
        campaignId: order.campaignId,
        publicationId: order.publicationId,
        publicationName: order.publicationName,
        itemPath: item?.itemPath || `digital-${creativeId}`,
        itemName: item?.itemName || creativeId,
        channel: item?.channel || 'website'
      };
    }
  }
  
  return null;
}

function normalizeChannel(channel: string): string {
  return channel
    ?.replace('_image', '')
    .replace('_text', '')
    .replace('newsletter_', 'newsletter')
    || 'website';
}
```

---

## 10. Error Handling

| Error Type | Action |
|------------|--------|
| Athena query timeout | Retry with exponential backoff (max 3 attempts) |
| MongoDB connection failure | Fail with error, CloudWatch alarm |
| Order lookup failure | Skip row, log warning, continue |
| Invalid data | Skip row, log error, continue |

**Partial failure is acceptable** - the Lambda should process as many rows as possible and report stats.

---

## 11. CloudWatch Metrics

Emit custom metrics:

```typescript
await cloudwatch.putMetricData({
  Namespace: 'EmpowerLocal/TrackingSync',
  MetricData: [
    { MetricName: 'RowsSynced', Value: stats.synced, Unit: 'Count' },
    { MetricName: 'RowsSkipped', Value: stats.skipped, Unit: 'Count' },
    { MetricName: 'Errors', Value: stats.errors, Unit: 'Count' },
    { MetricName: 'Duration', Value: duration, Unit: 'Milliseconds' },
  ]
});
```

**Alarms to create:**
- `Errors > 100` in single execution
- `RowsSynced = 0` for 2 consecutive days
- `Duration > 240000` (4 minutes, approaching timeout)

---

## 12. Logging

Use structured JSON logging:

```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'Sync started',
  dateRange: { start: '2025-12-10', end: '2025-12-10' },
  timestamp: new Date().toISOString()
}));

console.log(JSON.stringify({
  level: 'warn',
  message: 'Order not found',
  creativeId: 'cr_xxx',
  publicationCode: 'chireader',
  timestamp: new Date().toISOString()
}));
```

---

## 13. Testing

**Unit tests should cover:**
- Publication code mapping
- Creative ID parsing
- Order lookup logic
- Metrics calculation (CTR, viewability)
- Upsert deduplication

**Integration test:**
```bash
# Invoke with test event
aws lambda invoke \
  --function-name empowerlocal-tracking-sync \
  --payload '{"dryRun": true, "days": 1}' \
  response.json
```

---

## 14. Deployment Checklist

- [ ] Create Lambda function with Node.js 20.x runtime
- [ ] Set environment variables (MONGODB_URI, etc.)
- [ ] Attach IAM role with required permissions
- [ ] Configure VPC if MongoDB requires it
- [ ] Create EventBridge rule for daily schedule
- [ ] Create CloudWatch alarms
- [ ] Test with dry run
- [ ] Enable in production

---

## 15. Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-athena": "^3.x",
    "@aws-sdk/client-cloudwatch": "^3.x",
    "mongodb": "^6.x"
  }
}
```

---

## 16. Sample Lambda Handler

```typescript
import { Handler } from 'aws-lambda';

interface SyncEvent {
  date?: string;
  days?: number;
  publicationCode?: string;
  dryRun?: boolean;
}

interface SyncResponse {
  success: boolean;
  dateRange: { start: string; end: string };
  stats: { rowsFromAthena: number; synced: number; skipped: number; errors: number };
  duration: number;
  error?: string;
}

export const handler: Handler<SyncEvent, SyncResponse> = async (event) => {
  const startTime = Date.now();
  
  try {
    // 1. Calculate date range
    const { startDate, endDate } = getDateRange(event);
    
    // 2. Query Athena
    const rows = await queryAthena(startDate, endDate, event.publicationCode);
    
    // 3. Connect to MongoDB
    const client = await connectMongo();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // 4. Process rows
    const stats = { synced: 0, skipped: 0, errors: 0 };
    
    for (const row of rows) {
      try {
        const order = await lookupOrder(db, row.creative_id, row.publication_code);
        if (!order) {
          stats.skipped++;
          continue;
        }
        
        if (!event.dryRun) {
          await upsertPerformanceEntry(db, order, row);
        }
        stats.synced++;
      } catch (err) {
        console.error('Row error:', err);
        stats.errors++;
      }
    }
    
    // 5. Cleanup
    await client.close();
    
    // 6. Emit metrics
    await emitMetrics(stats, Date.now() - startTime);
    
    return {
      success: true,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      stats: { rowsFromAthena: rows.length, ...stats },
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      success: false,
      dateRange: { start: '', end: '' },
      stats: { rowsFromAthena: 0, synced: 0, skipped: 0, errors: 0 },
      duration: Date.now() - startTime,
      error: error.message
    };
  }
};
```

---

*Spec Version: 1.0*
*Last Updated: December 2024*







