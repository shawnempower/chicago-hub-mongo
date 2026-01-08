# Ad Tracking System Specification

## Overview

A server-side ad tracking system to measure impressions, clicks, and conversions for digital advertising campaigns across the EmpowerLocal hub network.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TRACKING FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Publisher Site/Newsletter                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  <a href="https://track.empowerlocal.com/c?cr=xxx&p=pub">        │   │
│  │    <img src="https://cdn.empowerlocal.com/a/creative.jpg"/>      │   │
│  │  </a>                                                             │   │
│  │  <img src="https://track.empowerlocal.com/i.gif?cr=xxx&p=pub"   │   │
│  │       width="1" height="1"/>                                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                           │                     │                        │
│                           │ Click               │ Impression             │
│                           ▼                     ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              TRACKING SERVER (Edge/CDN)                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │    │
│  │  │ /c (click)  │  │ /i.gif      │  │ /v (viewability)         │ │    │
│  │  │             │  │ (impression)│  │ (optional JS callback)   │ │    │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬──────────────┘ │    │
│  └─────────┼────────────────┼─────────────────────┼────────────────┘    │
│            │                │                     │                      │
│            ▼                ▼                     ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    EVENT QUEUE (Kafka/SQS/Redis)                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    EVENT PROCESSOR                               │    │
│  │  - Deduplicate events                                            │    │
│  │  - Enrich with geo/device data                                   │    │
│  │  - Validate & filter fraud                                       │    │
│  │  - Batch write to database                                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    DATA STORES                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │    │
│  │  │ Raw Events   │  │ Aggregates   │  │ Real-time Counters    │  │    │
│  │  │ (TimescaleDB │  │ (PostgreSQL) │  │ (Redis)               │  │    │
│  │  │  or ClickHse)│  │              │  │                       │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. URL Structure

### 2.1 Tracking Domain
```
Production:  https://track.empowerlocal.com
Staging:     https://track-staging.empowerlocal.com
CDN/Assets:  https://cdn.empowerlocal.com
```

### 2.2 Endpoint Definitions

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/i.gif` | GET | Impression tracking | 1x1 transparent GIF |
| `/c` | GET | Click tracking | 302 redirect to landing page |
| `/v` | POST | Viewability beacon (JS) | 204 No Content |
| `/e` | POST | Custom event tracking | 204 No Content |

### 2.3 URL Parameters

```
Common Parameters (all endpoints):
├── cr    = creative_id          (required) Unique creative identifier
├── p     = publication_code     (required) Publisher short code
├── t     = channel_type         (required) display|nli|nlt|stream|social
├── s     = size                 (optional) Ad dimensions: 300x250
├── c     = campaign_id          (optional) Campaign identifier (if not in creative)
├── pl    = placement_id         (optional) Specific placement on page
└── cb    = cache_buster         (auto)     Random number to prevent caching

Click-specific (/c):
├── r     = redirect_url         (encoded)  Final landing page URL
└── ct    = click_type           (optional) cta|image|text

Viewability-specific (/v):
├── vt    = view_time_ms         (required) Time ad was in viewport
├── vp    = view_percent         (required) Percentage of ad visible
└── vs    = viewport_size        (optional) User's viewport dimensions

Event-specific (/e):
├── en    = event_name           (required) conversion|video_start|video_complete|etc
├── ev    = event_value          (optional) Numeric value (revenue, %)
└── em    = event_meta           (optional) JSON-encoded metadata
```

### 2.4 Example URLs

**Impression Pixel:**
```
https://track.empowerlocal.com/i.gif?cr=cr_abc123&p=chireader&t=display&s=300x250&cb=1702345678901
```

**Click Tracker:**
```
https://track.empowerlocal.com/c?cr=cr_abc123&p=chireader&t=display&r=https%3A%2F%2Fadvertiser.com%2Flanding
```

**Viewability Beacon (JS):**
```javascript
POST https://track.empowerlocal.com/v
Body: { cr: "cr_abc123", p: "chireader", vt: 5000, vp: 100 }
```

---

## 3. Database Schema

### 3.1 Raw Events Table (High-volume, append-only)

```sql
-- Using TimescaleDB for time-series optimization
-- Or ClickHouse for extreme scale

CREATE TABLE tracking_events (
    -- Event identification
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(20) NOT NULL,  -- impression, click, viewability, conversion
    event_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Campaign/Creative references
    campaign_id     VARCHAR(50) NOT NULL,
    creative_id     VARCHAR(50) NOT NULL,
    publication_id  INTEGER NOT NULL,
    publication_code VARCHAR(20) NOT NULL,
    placement_id    VARCHAR(100),
    
    -- Ad metadata
    channel         VARCHAR(20) NOT NULL,  -- display, newsletter_image, newsletter_text, streaming
    ad_size         VARCHAR(20),           -- 300x250, 728x90, etc.
    
    -- User/Session tracking (privacy-compliant)
    session_id      VARCHAR(64),           -- Hashed session identifier
    user_hash       VARCHAR(64),           -- Hashed user fingerprint (no PII)
    
    -- Request metadata
    ip_address      INET,                  -- For geo lookup, then discarded/hashed
    user_agent      TEXT,
    referer_url     TEXT,
    landing_url     TEXT,                  -- For clicks only
    
    -- Enriched data (added by processor)
    country_code    CHAR(2),
    region_code     VARCHAR(10),
    city            VARCHAR(100),
    device_type     VARCHAR(20),           -- desktop, mobile, tablet
    browser         VARCHAR(50),
    os              VARCHAR(50),
    
    -- Viewability data (for viewability events)
    view_time_ms    INTEGER,
    view_percent    SMALLINT,
    
    -- Event-specific data
    event_value     DECIMAL(12,2),
    event_meta      JSONB,
    
    -- Fraud detection
    is_suspicious   BOOLEAN DEFAULT FALSE,
    fraud_score     SMALLINT,              -- 0-100
    fraud_reasons   TEXT[],
    
    -- Processing metadata
    processed_at    TIMESTAMPTZ,
    batch_id        VARCHAR(50)
);

-- TimescaleDB: Convert to hypertable
SELECT create_hypertable('tracking_events', 'event_time');

-- Indexes for common queries
CREATE INDEX idx_events_campaign_time ON tracking_events (campaign_id, event_time DESC);
CREATE INDEX idx_events_creative_time ON tracking_events (creative_id, event_time DESC);
CREATE INDEX idx_events_publication_time ON tracking_events (publication_id, event_time DESC);
CREATE INDEX idx_events_type_time ON tracking_events (event_type, event_time DESC);
```

### 3.2 Aggregated Metrics Table (Pre-computed rollups)

```sql
CREATE TABLE tracking_aggregates (
    -- Composite key for aggregation level
    aggregate_id        BIGSERIAL PRIMARY KEY,
    
    -- Time bucket
    time_bucket         TIMESTAMPTZ NOT NULL,  -- Hourly buckets
    granularity         VARCHAR(10) NOT NULL,  -- hourly, daily, weekly, monthly
    
    -- Dimensions (any can be NULL for higher-level aggregates)
    campaign_id         VARCHAR(50),
    creative_id         VARCHAR(50),
    publication_id      INTEGER,
    channel             VARCHAR(20),
    ad_size             VARCHAR(20),
    device_type         VARCHAR(20),
    country_code        CHAR(2),
    
    -- Metrics
    impressions         BIGINT DEFAULT 0,
    clicks              BIGINT DEFAULT 0,
    viewable_impressions BIGINT DEFAULT 0,
    conversions         BIGINT DEFAULT 0,
    conversion_value    DECIMAL(12,2) DEFAULT 0,
    
    -- Calculated metrics (updated on aggregation)
    ctr                 DECIMAL(8,6),          -- clicks / impressions
    viewability_rate    DECIMAL(8,6),          -- viewable / impressions
    conversion_rate     DECIMAL(8,6),          -- conversions / clicks
    
    -- Unique counts (approximate using HyperLogLog)
    unique_users        INTEGER,
    unique_sessions     INTEGER,
    
    -- Quality metrics
    avg_view_time_ms    INTEGER,
    avg_view_percent    SMALLINT,
    
    -- Fraud-filtered metrics
    valid_impressions   BIGINT DEFAULT 0,
    valid_clicks        BIGINT DEFAULT 0,
    
    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (time_bucket, granularity, campaign_id, creative_id, publication_id, 
            channel, ad_size, device_type, country_code)
);

-- Indexes for reporting queries
CREATE INDEX idx_agg_campaign_time ON tracking_aggregates (campaign_id, time_bucket DESC);
CREATE INDEX idx_agg_publication_time ON tracking_aggregates (publication_id, time_bucket DESC);
CREATE INDEX idx_agg_granularity_time ON tracking_aggregates (granularity, time_bucket DESC);
```

### 3.3 Real-time Counters (Redis)

```
Key Patterns:
├── imp:{campaign_id}:{date}              → Daily impression count
├── imp:{campaign_id}:{publication_id}:{date} → Daily by publication
├── click:{campaign_id}:{date}            → Daily click count
├── uniq:{campaign_id}:{date}             → HyperLogLog for unique users
├── budget:{campaign_id}                  → Remaining budget/impressions
└── rate:{ip_hash}:{minute}               → Rate limiting per IP
```

---

## 4. API Endpoints

### 4.1 Tracking Endpoints (High Performance)

```typescript
// GET /i.gif - Impression Tracking
// Response: 1x1 transparent GIF
// Headers: Cache-Control: no-store, no-cache

interface ImpressionParams {
  cr: string;      // creative_id (required)
  p: string;       // publication_code (required)
  t: string;       // channel_type (required)
  s?: string;      // size
  c?: string;      // campaign_id
  pl?: string;     // placement_id
  cb?: string;     // cache_buster
}

// Processing:
// 1. Parse & validate parameters
// 2. Extract headers (IP, User-Agent, Referer)
// 3. Quick fraud check (rate limiting)
// 4. Push to event queue
// 5. Return 1x1 GIF immediately (< 50ms)
```

```typescript
// GET /c - Click Tracking
// Response: 302 Redirect to landing page

interface ClickParams {
  cr: string;      // creative_id (required)
  p: string;       // publication_code (required)
  t: string;       // channel_type (required)
  r: string;       // redirect_url (required, URL-encoded)
  ct?: string;     // click_type
}

// Processing:
// 1. Parse & validate parameters
// 2. Decode redirect URL
// 3. Validate redirect URL (allowlist check)
// 4. Extract headers
// 5. Push to event queue
// 6. Return 302 redirect (< 100ms)
```

```typescript
// POST /v - Viewability Beacon
// Response: 204 No Content

interface ViewabilityPayload {
  cr: string;      // creative_id
  p: string;       // publication_code
  vt: number;      // view_time_ms
  vp: number;      // view_percent (0-100)
  vs?: string;     // viewport_size
}

// Processing:
// 1. Parse JSON body
// 2. Validate viewability metrics
// 3. Push to event queue
// 4. Return 204 immediately
```

### 4.2 Reporting API

```typescript
// GET /api/tracking/metrics
// Aggregated metrics for dashboards

interface MetricsQuery {
  campaign_id?: string;
  publication_id?: number;
  creative_id?: string;
  start_date: string;      // ISO date
  end_date: string;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dimensions?: string[];   // Group by: channel, device_type, country, etc.
}

interface MetricsResponse {
  summary: {
    impressions: number;
    clicks: number;
    ctr: number;
    viewable_impressions: number;
    viewability_rate: number;
    unique_users: number;
  };
  timeseries: Array<{
    time_bucket: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  breakdowns?: Record<string, Array<{
    dimension_value: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>>;
}
```

```typescript
// GET /api/tracking/realtime
// Real-time metrics from Redis

interface RealtimeQuery {
  campaign_id: string;
  window: '5m' | '1h' | '24h';
}

interface RealtimeResponse {
  current_impressions: number;
  current_clicks: number;
  current_ctr: number;
  trend: 'up' | 'down' | 'stable';
  vs_previous_period: {
    impressions_change: number;
    clicks_change: number;
  };
}
```

---

## 5. Tag Generation

### 5.1 Display Ad Tag

```html
<!-- Advertiser Name | Campaign Name | 300x250 | Publication Name -->
<a href="https://track.empowerlocal.com/c?cr=cr_abc123&p=chireader&t=display&r=https%3A%2F%2Fadvertiser.com%2Flanding" 
   target="_blank" rel="noopener">
  <img src="https://cdn.empowerlocal.com/creatives/cr_abc123.jpg" 
       width="300" height="250" border="0" 
       alt="Advertiser Name" 
       style="display:block;" />
</a>
<img src="https://track.empowerlocal.com/i.gif?cr=cr_abc123&p=chireader&t=display&s=300x250" 
     width="1" height="1" border="0" style="display:none;" alt="" />
```

### 5.2 Newsletter Image Tag (Full HTML ESP)

```html
<!-- Advertiser Name | Campaign Name | Newsletter -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <a href="https://track.empowerlocal.com/c?cr=cr_abc123&p=chireader&t=nli&r=https%3A%2F%2Fadvertiser.com%2Flanding" 
         target="_blank" style="text-decoration:none;">
        <img src="https://cdn.empowerlocal.com/creatives/cr_abc123.jpg" 
             width="600" height="auto" 
             style="display:block;max-width:100%;height:auto;" 
             alt="Advertiser Name" border="0" />
      </a>
    </td>
  </tr>
</table>
<img src="https://track.empowerlocal.com/i.gif?cr=cr_abc123&p=chireader&t=nli" 
     width="1" height="1" style="display:none;" alt="" />
```

### 5.3 Newsletter Text Tag

```html
<!-- Advertiser Name | Campaign Name | Newsletter Text -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" 
       style="background-color:#f8f9fa;border-radius:8px;margin:20px 0;">
  <tr>
    <td style="padding:20px;font-family:Arial,Helvetica,sans-serif;">
      <p style="font-size:11px;color:#6c757d;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">
        Sponsored
      </p>
      <h3 style="font-size:20px;color:#212529;margin:0 0 12px 0;line-height:1.3;">
        <a href="https://track.empowerlocal.com/c?cr=cr_abc123&p=chireader&t=nlt&r=https%3A%2F%2Fadvertiser.com%2Flanding" 
           style="color:#212529;text-decoration:none;">
          Your Compelling Headline Here
        </a>
      </h3>
      <p style="font-size:15px;color:#495057;margin:0 0 16px 0;line-height:1.6;">
        Your ad body copy goes here. Keep it concise and compelling.
      </p>
      <a href="https://track.empowerlocal.com/c?cr=cr_abc123&p=chireader&t=nlt&ct=cta&r=https%3A%2F%2Fadvertiser.com%2Flanding" 
         style="display:inline-block;background-color:#0d6efd;color:#ffffff;font-size:14px;font-weight:600;
                padding:10px 20px;border-radius:4px;text-decoration:none;">
        Learn More →
      </a>
    </td>
  </tr>
</table>
<img src="https://track.empowerlocal.com/i.gif?cr=cr_abc123&p=chireader&t=nlt" 
     width="1" height="1" style="display:none;" alt="" />
```

### 5.4 Viewability JavaScript (Optional Enhancement)

```javascript
// Include this for viewability tracking on web placements
(function() {
  var ad = document.querySelector('[data-empowerlocal-ad="cr_abc123"]');
  if (!ad) return;
  
  var tracked = false;
  var viewStart = null;
  var totalViewTime = 0;
  
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!viewStart) viewStart = Date.now();
      } else {
        if (viewStart) {
          totalViewTime += Date.now() - viewStart;
          viewStart = null;
        }
      }
      
      // Track viewability after 1 second at 50%+ visible
      if (!tracked && totalViewTime >= 1000 && entry.intersectionRatio >= 0.5) {
        tracked = true;
        navigator.sendBeacon('https://track.empowerlocal.com/v', JSON.stringify({
          cr: 'cr_abc123',
          p: 'chireader',
          vt: totalViewTime,
          vp: Math.round(entry.intersectionRatio * 100)
        }));
      }
    });
  }, { threshold: [0, 0.5, 1.0] });
  
  observer.observe(ad);
})();
```

---

## 6. Event Processing Pipeline

### 6.1 Event Flow

```
1. Request hits edge/CDN
   └─> Geographic routing to nearest PoP
   
2. Tracking endpoint receives request
   └─> Parse parameters
   └─> Extract headers (IP, UA, Referer)
   └─> Quick validation
   └─> Return response immediately
   
3. Async: Push to event queue
   └─> Kafka topic: tracking-events-raw
   └─> Partitioned by campaign_id for ordering
   
4. Event Processor consumes from queue
   └─> Batch processing (every 1s or 1000 events)
   └─> Enrich with geo data (MaxMind GeoIP)
   └─> Parse User-Agent (device, browser, OS)
   └─> Fraud detection scoring
   └─> Deduplicate (by user_hash + creative + 1min window)
   
5. Write to databases
   └─> Raw events to TimescaleDB
   └─> Increment Redis counters
   └─> Update aggregates (async job)
```

### 6.2 Fraud Detection Rules

```typescript
interface FraudCheck {
  rule: string;
  score: number;  // Added to fraud_score
  check: (event: TrackingEvent, context: RequestContext) => boolean;
}

const FRAUD_RULES: FraudCheck[] = [
  {
    rule: 'rate_limit_exceeded',
    score: 50,
    check: (e, ctx) => ctx.requestsPerMinute > 60
  },
  {
    rule: 'known_bot_ua',
    score: 100,
    check: (e, ctx) => BOT_USER_AGENTS.some(bot => ctx.userAgent.includes(bot))
  },
  {
    rule: 'datacenter_ip',
    score: 30,
    check: (e, ctx) => DATACENTER_IP_RANGES.includes(ctx.ipAddress)
  },
  {
    rule: 'missing_referer',
    score: 10,
    check: (e, ctx) => !ctx.referer && e.event_type === 'impression'
  },
  {
    rule: 'suspicious_click_timing',
    score: 40,
    check: (e, ctx) => {
      // Click within 100ms of impression is suspicious
      const lastImpression = ctx.lastImpressionTime;
      return lastImpression && (e.event_time - lastImpression) < 100;
    }
  },
  {
    rule: 'headless_browser',
    score: 60,
    check: (e, ctx) => {
      // Check for headless browser indicators
      return ctx.userAgent.includes('HeadlessChrome') ||
             ctx.userAgent.includes('PhantomJS');
    }
  },
  {
    rule: 'abnormal_viewport',
    score: 20,
    check: (e, ctx) => {
      // Viewport of 0x0 or extremely large
      const vp = ctx.viewportSize;
      return vp && (vp.width === 0 || vp.height === 0 || vp.width > 10000);
    }
  }
];

// Events with fraud_score >= 50 are flagged as suspicious
// Events with fraud_score >= 80 are discarded
```

### 6.3 Deduplication Logic

```typescript
// Deduplication key: user_hash + creative_id + event_type + time_bucket
function getDedupeKey(event: TrackingEvent): string {
  const timeBucket = Math.floor(event.event_time / 60000); // 1-minute buckets
  return `${event.user_hash}:${event.creative_id}:${event.event_type}:${timeBucket}`;
}

// Check Redis before processing
async function shouldProcess(event: TrackingEvent): Promise<boolean> {
  const key = `dedupe:${getDedupeKey(event)}`;
  const added = await redis.set(key, '1', 'NX', 'EX', 300); // 5-min TTL
  return added !== null;
}
```

---

## 7. Aggregation Jobs

### 7.1 Hourly Aggregation

```sql
-- Run every hour via cron/scheduler
INSERT INTO tracking_aggregates (
  time_bucket, granularity,
  campaign_id, creative_id, publication_id, channel, ad_size, device_type, country_code,
  impressions, clicks, viewable_impressions, conversions,
  ctr, viewability_rate, unique_users, unique_sessions,
  avg_view_time_ms, avg_view_percent, valid_impressions, valid_clicks
)
SELECT
  date_trunc('hour', event_time) AS time_bucket,
  'hourly' AS granularity,
  campaign_id,
  creative_id,
  publication_id,
  channel,
  ad_size,
  device_type,
  country_code,
  COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
  COUNT(*) FILTER (WHERE event_type = 'viewability') AS viewable_impressions,
  COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0 
    THEN COUNT(*) FILTER (WHERE event_type = 'click')::decimal / 
         COUNT(*) FILTER (WHERE event_type = 'impression')
    ELSE 0 
  END AS ctr,
  CASE 
    WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0 
    THEN COUNT(*) FILTER (WHERE event_type = 'viewability')::decimal / 
         COUNT(*) FILTER (WHERE event_type = 'impression')
    ELSE 0 
  END AS viewability_rate,
  COUNT(DISTINCT user_hash) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG(view_time_ms) FILTER (WHERE event_type = 'viewability') AS avg_view_time_ms,
  AVG(view_percent) FILTER (WHERE event_type = 'viewability') AS avg_view_percent,
  COUNT(*) FILTER (WHERE event_type = 'impression' AND NOT is_suspicious) AS valid_impressions,
  COUNT(*) FILTER (WHERE event_type = 'click' AND NOT is_suspicious) AS valid_clicks
FROM tracking_events
WHERE event_time >= date_trunc('hour', NOW() - INTERVAL '1 hour')
  AND event_time < date_trunc('hour', NOW())
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
ON CONFLICT (time_bucket, granularity, campaign_id, creative_id, publication_id, 
             channel, ad_size, device_type, country_code)
DO UPDATE SET
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  viewable_impressions = EXCLUDED.viewable_impressions,
  conversions = EXCLUDED.conversions,
  ctr = EXCLUDED.ctr,
  viewability_rate = EXCLUDED.viewability_rate,
  unique_users = EXCLUDED.unique_users,
  unique_sessions = EXCLUDED.unique_sessions,
  avg_view_time_ms = EXCLUDED.avg_view_time_ms,
  avg_view_percent = EXCLUDED.avg_view_percent,
  valid_impressions = EXCLUDED.valid_impressions,
  valid_clicks = EXCLUDED.valid_clicks,
  updated_at = NOW();
```

### 7.2 Daily Rollup

```sql
-- Roll up hourly data to daily (more efficient for long-range queries)
INSERT INTO tracking_aggregates (
  time_bucket, granularity,
  campaign_id, creative_id, publication_id, channel, ad_size, device_type, country_code,
  impressions, clicks, viewable_impressions, conversions,
  ctr, viewability_rate, unique_users, unique_sessions,
  valid_impressions, valid_clicks
)
SELECT
  date_trunc('day', time_bucket) AS time_bucket,
  'daily' AS granularity,
  campaign_id, creative_id, publication_id, channel, ad_size, device_type, country_code,
  SUM(impressions),
  SUM(clicks),
  SUM(viewable_impressions),
  SUM(conversions),
  CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::decimal / SUM(impressions) ELSE 0 END,
  CASE WHEN SUM(impressions) > 0 THEN SUM(viewable_impressions)::decimal / SUM(impressions) ELSE 0 END,
  SUM(unique_users),  -- Note: This is approximate, not exact unique across hours
  SUM(unique_sessions),
  SUM(valid_impressions),
  SUM(valid_clicks)
FROM tracking_aggregates
WHERE granularity = 'hourly'
  AND time_bucket >= date_trunc('day', NOW() - INTERVAL '1 day')
  AND time_bucket < date_trunc('day', NOW())
GROUP BY 3, 4, 5, 6, 7, 8, 9
ON CONFLICT DO UPDATE SET /* same as above */;
```

---

## 8. Performance Considerations

### 8.1 Latency Requirements

| Endpoint | Target P99 | Max Acceptable |
|----------|------------|----------------|
| `/i.gif` | < 20ms | 50ms |
| `/c` | < 50ms | 100ms |
| `/v` | < 30ms | 100ms |
| Reporting API | < 500ms | 2000ms |

### 8.2 Throughput Targets

```
Initial Scale:
- 10M impressions/day
- 100K clicks/day
- 1M viewability events/day

Growth Target (Year 1):
- 100M impressions/day
- 1M clicks/day
- 10M viewability events/day
```

### 8.3 Infrastructure Recommendations

```
Edge Layer:
- CloudFlare Workers or AWS CloudFront + Lambda@Edge
- Geographically distributed
- < 50ms response time globally

Event Queue:
- AWS SQS (simpler) or Kafka (more features)
- At-least-once delivery
- 7-day retention

Processing:
- Node.js workers (horizontal scaling)
- Auto-scale based on queue depth
- Batch size: 1000 events or 1 second

Database:
- TimescaleDB for raw events (auto-compress older data)
- PostgreSQL for aggregates
- Redis Cluster for real-time counters

CDN for Creatives:
- CloudFront or Cloudflare
- S3 origin
- Cache forever (versioned URLs)
```

---

## 9. Privacy & Compliance

### 9.1 Data Handling

```
DO:
✓ Hash IP addresses before storage (SHA-256 + salt)
✓ Use session-based identifiers (not persistent)
✓ Respect DNT (Do Not Track) headers
✓ Support CCPA deletion requests
✓ Retain raw data for max 90 days
✓ Aggregate old data, delete raw

DON'T:
✗ Store PII (name, email, exact location)
✗ Create cross-site user profiles
✗ Sell data to third parties
✗ Use fingerprinting for identification
```

### 9.2 Cookie Policy

```
First-party session cookie only:
- Name: _el_sid
- Duration: Session only
- Purpose: Deduplicate within session
- No cross-site tracking
```

---

## 10. Integration with Hub Platform

### 10.1 Tag Generation Flow

```
1. Hub uploads creative asset to S3
2. Hub assigns creative to publications
3. System generates tracking tags:
   - Fetch creative metadata (size, landing URL)
   - Generate unique creative_id
   - Build tracking URLs with all parameters
   - Generate HTML snippets for each channel type
4. Store in tracking_scripts collection
5. Publication downloads tag from hub dashboard
6. Publication inserts into their site/newsletter
```

### 10.2 Metrics Display

```
Campaign Detail Page → Performance Tab:
├── Summary Cards
│   ├── Total Impressions (with trend arrow)
│   ├── Total Clicks
│   ├── CTR
│   └── Viewability Rate
│
├── Time Series Chart
│   └── Impressions & Clicks over campaign duration
│
├── Breakdown Tables
│   ├── By Publication
│   ├── By Placement/Channel
│   └── By Device/Geography
│
└── Real-time Feed
    └── Last 100 events (streaming updates)
```

---

## 11. Future Enhancements

1. **Video Tracking**: Quartile completion tracking for video ads
2. **Conversion Tracking**: Post-click conversion attribution
3. **A/B Testing**: Creative performance comparison
4. **Frequency Capping**: Limit impressions per user per campaign
5. **Brand Safety**: Content classification of referring pages
6. **Attribution Models**: Multi-touch attribution for conversions
7. **Machine Learning**: Fraud detection model training
8. **Real-time Bidding**: RTB integration for programmatic

---

## 12. Implementation Phases

### Phase 1: MVP (4-6 weeks)
- [ ] Basic impression/click tracking endpoints
- [ ] Simple event storage (MongoDB or PostgreSQL)
- [ ] Tag generation for display + newsletter
- [ ] Basic reporting dashboard

### Phase 2: Scale (4-6 weeks)
- [ ] Event queue (SQS/Kafka)
- [ ] Fraud detection rules
- [ ] Aggregation jobs
- [ ] Real-time counters

### Phase 3: Advanced (6-8 weeks)
- [ ] Viewability tracking
- [ ] Geographic distribution
- [ ] Advanced reporting
- [ ] API for external access

---

*Document Version: 1.0*
*Last Updated: December 2024*







