'use strict';

/**
 * Lambda@Edge function for ad click tracking
 * 
 * Handles ONLY:
 * - /c - Click tracking with redirect to landing page
 * 
 * Architecture:
 * 1. This Lambda handles click redirects ONLY
 * 2. Impression pixels (/v, /pxl.png) are served as static files from S3
 * 3. CloudFront Access Logs capture ALL requests (clicks + impressions) automatically
 * 4. Athena queries CloudFront logs from S3
 * 5. empowerlocal-tracking-sync Lambda syncs Athena data to MongoDB daily
 * 
 * Why Lambda@Edge is only needed for clicks:
 * - Click tracking requires parsing the 'r' parameter and redirecting (302)
 * - Impression pixels can be static files - CloudFront logs capture all query params
 * 
 * Deployed to: CloudFront Distribution E14BMKEZBNSGP4
 * Domain: dxafls8akrlrp.cloudfront.net
 */

/**
 * Main Lambda@Edge handler
 * Triggered on viewer-request events for /c path only
 * 
 * Note: CloudFront Access Logs automatically capture all request details
 * including query parameters. No need for custom logging.
 */
exports.handler = async (event, context) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;
  const querystring = request.querystring || '';
  const params = parseQueryString(querystring);

  // Handle click tracking and redirect
  if (uri === '/c') {
    return handleClickTracking(params, request);
  }
  
  // For all other paths, continue to origin (S3)
  // Impression pixels are served from S3 as static files
  return request;
};

/**
 * Handle click tracking and redirect to landing page
 * 
 * CloudFront Access Logs will capture:
 * - All query parameters (oid, cid, pid, ch, cr, r, etc.)
 * - IP address, user agent, referer
 * - Timestamp, edge location
 * 
 * We just need to perform the redirect.
 */
function handleClickTracking(params, request) {
  const { r } = params;  // r = Redirect URL (landing page)
  // Validate redirect URL exists
  if (!r) {
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Missing redirect URL (r parameter)',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    };
  }
  
  // Decode and validate redirect URL
  let redirectUrl;
  try {
    redirectUrl = decodeURIComponent(r);
    
    // Basic validation - must be http/https
    if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
      throw new Error('Invalid redirect URL scheme');
    }
  } catch (error) {
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Invalid redirect URL - must be http:// or https://',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    };
  }
  
  // Return 302 redirect
  return {
    status: '302',
    statusDescription: 'Found',
    headers: {
      'location': [{
        key: 'Location',
        value: redirectUrl
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }],
      'pragma': [{
        key: 'Pragma',
        value: 'no-cache'
      }]
    }
  };
}


/**
 * Parse query string into object
 */
function parseQueryString(querystring) {
  const params = {};
  if (!querystring) return params;
  
  querystring.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[key] = value || '';
    }
  });
  
  return params;
}
