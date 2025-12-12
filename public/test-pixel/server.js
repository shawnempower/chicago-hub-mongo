/**
 * Local Tracking Server for Testing
 * 
 * A simple Express server that mimics the tracking endpoints.
 * Logs all tracking events to console and stores in memory.
 * 
 * Run with: node server.js
 * Server runs on: http://localhost:3099
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3099;

// Enable CORS for local testing
app.use(cors());
app.use(express.json());

// In-memory event storage
const events = [];

// 1x1 transparent GIF
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Helper: Parse tracking parameters
function parseTrackingParams(query) {
  return {
    creative_id: query.cr,
    publication_code: query.p,
    channel: query.t,
    size: query.s,
    campaign_id: query.c,
    placement_id: query.pl,
    cache_buster: query.cb,
    redirect_url: query.r,
  };
}

// Helper: Log event with color
function logEvent(type, params, meta = {}) {
  const timestamp = new Date().toISOString();
  const event = {
    type,
    timestamp,
    ...params,
    ...meta,
  };
  events.push(event);
  
  // Color codes
  const colors = {
    impression: '\x1b[32m', // Green
    click: '\x1b[33m',      // Yellow
    viewability: '\x1b[34m', // Blue
    reset: '\x1b[0m',
  };
  
  const color = colors[type] || colors.reset;
  console.log(
    `${color}[${timestamp.split('T')[1].split('.')[0]}] ${type.toUpperCase()}${colors.reset}`,
    `| cr: ${params.creative_id || 'N/A'}`,
    `| pub: ${params.publication_code || 'N/A'}`,
    `| ch: ${params.channel || 'N/A'}`,
    params.size ? `| size: ${params.size}` : ''
  );
  
  return event;
}

// Impression Pixel Endpoint
app.get('/i.gif', (req, res) => {
  const params = parseTrackingParams(req.query);
  
  logEvent('impression', params, {
    user_agent: req.headers['user-agent'],
    referer: req.headers['referer'],
    ip: req.ip,
  });
  
  // Return 1x1 transparent GIF
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.send(PIXEL_GIF);
});

// Click Tracking Endpoint
app.get('/c', (req, res) => {
  const params = parseTrackingParams(req.query);
  
  logEvent('click', params, {
    user_agent: req.headers['user-agent'],
    referer: req.headers['referer'],
    ip: req.ip,
  });
  
  // Redirect to landing page
  const redirectUrl = params.redirect_url;
  if (redirectUrl) {
    res.redirect(302, decodeURIComponent(redirectUrl));
  } else {
    res.status(400).send('Missing redirect URL');
  }
});

// Viewability Beacon Endpoint
app.post('/v', (req, res) => {
  const body = req.body;
  
  logEvent('viewability', {
    creative_id: body.cr,
    publication_code: body.p,
    view_time_ms: body.vt,
    view_percent: body.vp,
    viewport_size: body.vs,
  });
  
  res.status(204).send();
});

// Custom Event Endpoint
app.post('/e', (req, res) => {
  const body = req.body;
  
  logEvent(body.en || 'custom', {
    creative_id: body.cr,
    publication_code: body.p,
    event_name: body.en,
    event_value: body.ev,
    event_meta: body.em,
  });
  
  res.status(204).send();
});

// Stats Endpoint (for debugging)
app.get('/stats', (req, res) => {
  const stats = {
    total_events: events.length,
    impressions: events.filter(e => e.type === 'impression').length,
    clicks: events.filter(e => e.type === 'click').length,
    viewability: events.filter(e => e.type === 'viewability').length,
    ctr: 0,
  };
  
  if (stats.impressions > 0) {
    stats.ctr = ((stats.clicks / stats.impressions) * 100).toFixed(2);
  }
  
  res.json(stats);
});

// Events List Endpoint (for debugging)
app.get('/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(events.slice(-limit).reverse());
});

// Clear Events (for testing)
app.delete('/events', (req, res) => {
  events.length = 0;
  console.log('\x1b[31m[CLEARED] All events deleted\x1b[0m');
  res.status(204).send();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', events_count: events.length });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           🎯 Ad Tracking Test Server                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running at: http://localhost:${PORT}                  ║`);
  console.log('║                                                            ║');
  console.log('║  Endpoints:                                                ║');
  console.log('║    GET  /i.gif    - Impression pixel                       ║');
  console.log('║    GET  /c        - Click tracker (redirects)              ║');
  console.log('║    POST /v        - Viewability beacon                     ║');
  console.log('║    POST /e        - Custom events                          ║');
  console.log('║    GET  /stats    - View statistics                        ║');
  console.log('║    GET  /events   - View recent events                     ║');
  console.log('║    DEL  /events   - Clear all events                       ║');
  console.log('║                                                            ║');
  console.log('║  To enable in test pages, set USE_LOCAL_SERVER = true      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Waiting for tracking events...\n');
});
