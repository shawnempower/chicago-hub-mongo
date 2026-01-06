# Athena Queries for Ad Tracking Pixel Analytics

## Prerequisites

1. **Enable CloudFront Access Logging**
   - Go to CloudFront > Your Distribution > General > Settings > Edit
   - Enable "Standard logging"
   - Set S3 bucket (e.g., `your-logs-bucket`)
   - Set prefix (e.g., `cloudfront-logs/tracking/`)

2. **Create Athena Database**
```sql
CREATE DATABASE IF NOT EXISTS ad_tracking;
```

---

## 1. Create Table for CloudFront Logs

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS ad_tracking.cloudfront_logs (
  `date` DATE,
  time STRING,
  x_edge_location STRING,
  sc_bytes BIGINT,
  c_ip STRING,
  cs_method STRING,
  cs_host STRING,
  cs_uri_stem STRING,
  sc_status INT,
  cs_referer STRING,
  cs_user_agent STRING,
  cs_uri_query STRING,
  cs_cookie STRING,
  x_edge_result_type STRING,
  x_edge_request_id STRING,
  x_host_header STRING,
  cs_protocol STRING,
  cs_bytes BIGINT,
  time_taken FLOAT,
  x_forwarded_for STRING,
  ssl_protocol STRING,
  ssl_cipher STRING,
  x_edge_response_result_type STRING,
  cs_protocol_version STRING,
  fle_status STRING,
  fle_encrypted_fields INT,
  c_port INT,
  time_to_first_byte FLOAT,
  x_edge_detailed_result_type STRING,
  sc_content_type STRING,
  sc_content_len BIGINT,
  sc_range_start BIGINT,
  sc_range_end BIGINT
)
ROW FORMAT DELIMITED 
FIELDS TERMINATED BY '\t'
LOCATION 's3://YOUR-LOGS-BUCKET/cloudfront-logs/tracking/'
TBLPROPERTIES ('skip.header.line.count'='2');
```

---

## 2. Create Parsed Tracking Events View

This view extracts tracking parameters from the query string:

```sql
CREATE OR REPLACE VIEW ad_tracking.tracking_events AS
SELECT
  `date`,
  time,
  CONCAT(`date`, 'T', time, 'Z') AS event_timestamp,
  
  -- Parse query string parameters
  REGEXP_EXTRACT(cs_uri_query, 'cr=([^&]+)', 1) AS creative_id,
  REGEXP_EXTRACT(cs_uri_query, 'p=([^&]+)', 1) AS publication_code,
  REGEXP_EXTRACT(cs_uri_query, 't=([^&]+)', 1) AS channel,
  REGEXP_EXTRACT(cs_uri_query, 's=([^&]+)', 1) AS ad_size,
  COALESCE(REGEXP_EXTRACT(cs_uri_query, 'e=([^&]+)', 1), 'impression') AS event_type,
  REGEXP_EXTRACT(cs_uri_query, 'vt=([^&]+)', 1) AS view_time_ms,
  REGEXP_EXTRACT(cs_uri_query, 'vp=([^&]+)', 1) AS view_percent,
  REGEXP_EXTRACT(cs_uri_query, 'c=([^&]+)', 1) AS campaign_id,
  
  -- Request metadata
  c_ip AS ip_address,
  cs_referer AS referer,
  cs_user_agent AS user_agent,
  x_edge_location AS edge_location,
  sc_status AS status_code,
  
  -- For deduplication
  CONCAT(
    COALESCE(REGEXP_EXTRACT(cs_uri_query, 'cr=([^&]+)', 1), ''),
    '-',
    COALESCE(c_ip, ''),
    '-',
    SUBSTR(time, 1, 5)  -- 5-minute bucket
  ) AS dedupe_key

FROM ad_tracking.cloudfront_logs
WHERE cs_uri_stem = '/pxl.png'
  AND sc_status = 200;
```

---

## 3. Daily Aggregation Query

Run this daily to create aggregated metrics:

```sql
-- Create aggregates table if not exists
CREATE TABLE IF NOT EXISTS ad_tracking.daily_aggregates (
  report_date DATE,
  creative_id STRING,
  publication_code STRING,
  channel STRING,
  ad_size STRING,
  impressions BIGINT,
  clicks BIGINT,
  viewable_impressions BIGINT,
  unique_ips BIGINT,
  ctr DOUBLE,
  viewability_rate DOUBLE
)
PARTITIONED BY (year STRING, month STRING)
STORED AS PARQUET
LOCATION 's3://YOUR-DATA-BUCKET/ad-tracking/aggregates/';

-- Insert daily aggregates
INSERT INTO ad_tracking.daily_aggregates
SELECT
  `date` AS report_date,
  creative_id,
  publication_code,
  channel,
  ad_size,
  
  -- Metrics
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks,
  COUNT(CASE WHEN event_type = 'view' THEN 1 END) AS viewable_impressions,
  COUNT(DISTINCT ip_address) AS unique_ips,
  
  -- Calculated metrics
  CASE 
    WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
    THEN CAST(COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS DOUBLE) / 
         COUNT(CASE WHEN event_type = 'impression' THEN 1 END)
    ELSE 0 
  END AS ctr,
  
  CASE 
    WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
    THEN CAST(COUNT(CASE WHEN event_type = 'view' THEN 1 END) AS DOUBLE) / 
         COUNT(CASE WHEN event_type = 'impression' THEN 1 END)
    ELSE 0 
  END AS viewability_rate,
  
  -- Partition columns
  CAST(YEAR(`date`) AS STRING) AS year,
  LPAD(CAST(MONTH(`date`) AS STRING), 2, '0') AS month

FROM ad_tracking.tracking_events
WHERE `date` = DATE_SUB(CURRENT_DATE, 1)  -- Yesterday
GROUP BY 
  `date`,
  creative_id,
  publication_code,
  channel,
  ad_size;
```

---

## 4. Quick Analytics Queries

### Total impressions and clicks by publication (last 7 days)
```sql
SELECT
  publication_code,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks,
  ROUND(
    CAST(COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS DOUBLE) / 
    NULLIF(COUNT(CASE WHEN event_type = 'impression' THEN 1 END), 0) * 100, 
    2
  ) AS ctr_percent
FROM ad_tracking.tracking_events
WHERE `date` >= DATE_SUB(CURRENT_DATE, 7)
GROUP BY publication_code
ORDER BY impressions DESC;
```

### Hourly traffic pattern
```sql
SELECT
  SUBSTR(time, 1, 2) AS hour,
  COUNT(*) AS events,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks
FROM ad_tracking.tracking_events
WHERE `date` = CURRENT_DATE
GROUP BY SUBSTR(time, 1, 2)
ORDER BY hour;
```

### Top performing creatives
```sql
SELECT
  creative_id,
  channel,
  ad_size,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks,
  ROUND(
    CAST(COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS DOUBLE) / 
    NULLIF(COUNT(CASE WHEN event_type = 'impression' THEN 1 END), 0) * 100, 
    3
  ) AS ctr_percent
FROM ad_tracking.tracking_events
WHERE `date` >= DATE_SUB(CURRENT_DATE, 30)
GROUP BY creative_id, channel, ad_size
HAVING COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 100
ORDER BY ctr_percent DESC
LIMIT 20;
```

### Geographic distribution (by edge location)
```sql
SELECT
  CASE 
    WHEN edge_location LIKE 'ORD%' THEN 'Chicago'
    WHEN edge_location LIKE 'JFK%' OR edge_location LIKE 'EWR%' THEN 'New York'
    WHEN edge_location LIKE 'LAX%' THEN 'Los Angeles'
    WHEN edge_location LIKE 'DFW%' THEN 'Dallas'
    WHEN edge_location LIKE 'IAD%' THEN 'Washington DC'
    WHEN edge_location LIKE 'ATL%' THEN 'Atlanta'
    WHEN edge_location LIKE 'SFO%' THEN 'San Francisco'
    WHEN edge_location LIKE 'SEA%' THEN 'Seattle'
    WHEN edge_location LIKE 'MIA%' THEN 'Miami'
    ELSE edge_location
  END AS region,
  COUNT(*) AS events,
  COUNT(DISTINCT ip_address) AS unique_visitors
FROM ad_tracking.tracking_events
WHERE `date` >= DATE_SUB(CURRENT_DATE, 7)
GROUP BY 1
ORDER BY events DESC
LIMIT 15;
```

### Device/Browser breakdown (from user agent)
```sql
SELECT
  CASE
    WHEN user_agent LIKE '%iPhone%' THEN 'iPhone'
    WHEN user_agent LIKE '%iPad%' THEN 'iPad'
    WHEN user_agent LIKE '%Android%' AND user_agent LIKE '%Mobile%' THEN 'Android Phone'
    WHEN user_agent LIKE '%Android%' THEN 'Android Tablet'
    WHEN user_agent LIKE '%Macintosh%' THEN 'Mac'
    WHEN user_agent LIKE '%Windows%' THEN 'Windows'
    WHEN user_agent LIKE '%Linux%' THEN 'Linux'
    WHEN user_agent LIKE '%bot%' OR user_agent LIKE '%Bot%' OR user_agent LIKE '%spider%' THEN 'Bot'
    ELSE 'Other'
  END AS device,
  COUNT(*) AS events,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percent
FROM ad_tracking.tracking_events
WHERE `date` >= DATE_SUB(CURRENT_DATE, 7)
  AND event_type = 'impression'
GROUP BY 1
ORDER BY events DESC;
```

---

## 5. Deduplication Query

Remove duplicate impressions (same user/creative within 5 minutes):

```sql
SELECT
  `date`,
  creative_id,
  publication_code,
  channel,
  ad_size,
  COUNT(*) AS raw_impressions,
  COUNT(DISTINCT dedupe_key) AS deduped_impressions,
  ROUND((1 - CAST(COUNT(DISTINCT dedupe_key) AS DOUBLE) / COUNT(*)) * 100, 1) AS dupe_percent
FROM ad_tracking.tracking_events
WHERE `date` = CURRENT_DATE
  AND event_type = 'impression'
GROUP BY `date`, creative_id, publication_code, channel, ad_size
ORDER BY raw_impressions DESC;
```

---

## 6. Scheduled Query (AWS EventBridge + Lambda)

Create a Lambda function to run the daily aggregation:

```python
import boto3

def lambda_handler(event, context):
    athena = boto3.client('athena')
    
    query = """
    INSERT INTO ad_tracking.daily_aggregates
    SELECT
      `date` AS report_date,
      creative_id,
      publication_code,
      channel,
      ad_size,
      COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions,
      COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks,
      COUNT(CASE WHEN event_type = 'view' THEN 1 END) AS viewable_impressions,
      COUNT(DISTINCT ip_address) AS unique_ips,
      CASE 
        WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
        THEN CAST(COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS DOUBLE) / 
             COUNT(CASE WHEN event_type = 'impression' THEN 1 END)
        ELSE 0 
      END AS ctr,
      CASE 
        WHEN COUNT(CASE WHEN event_type = 'impression' THEN 1 END) > 0 
        THEN CAST(COUNT(CASE WHEN event_type = 'view' THEN 1 END) AS DOUBLE) / 
             COUNT(CASE WHEN event_type = 'impression' THEN 1 END)
        ELSE 0 
      END AS viewability_rate,
      CAST(YEAR(`date`) AS STRING) AS year,
      LPAD(CAST(MONTH(`date`) AS STRING), 2, '0') AS month
    FROM ad_tracking.tracking_events
    WHERE `date` = DATE_SUB(CURRENT_DATE, 1)
    GROUP BY `date`, creative_id, publication_code, channel, ad_size
    """
    
    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={'Database': 'ad_tracking'},
        ResultConfiguration={
            'OutputLocation': 's3://YOUR-QUERY-RESULTS-BUCKET/athena-results/'
        }
    )
    
    return {
        'statusCode': 200,
        'queryExecutionId': response['QueryExecutionId']
    }
```

Schedule with EventBridge: `cron(0 6 * * ? *)` (daily at 6 AM UTC)

---

## 7. Quick Setup Checklist

- [ ] Enable CloudFront logging to S3
- [ ] Create Athena database: `ad_tracking`
- [ ] Create CloudFront logs table (update S3 location)
- [ ] Create `tracking_events` view
- [ ] Test with sample query
- [ ] Create aggregates table (update S3 location)
- [ ] Set up Lambda + EventBridge for daily aggregation
- [ ] Create QuickSight dashboard (optional)

---

## Cost Estimates

| Component | Cost |
|-----------|------|
| CloudFront Logs | Free (storage costs only) |
| S3 Storage | ~$0.023/GB/month |
| Athena Queries | $5/TB scanned |
| Lambda | ~$0.20/million invocations |

**Tip:** Use partitioning by date to reduce Athena scan costs significantly.






