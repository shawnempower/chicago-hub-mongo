'use strict';

/**
 * Ad Click Redirect - Lambda@Edge Function
 * 
 * Purpose:
 * Tracks ad clicks by redirecting users to landing pages while CloudFront Access Logs
 * capture all attribution parameters (campaign, creative, publication, etc.)
 * 
 * Endpoint: /c
 * Method: GET
 * Response: 302 redirect to landing page URL
 * 
 * Architecture:
 * 1. User clicks ad → CloudFront /c endpoint
 * 2. Lambda@Edge parses redirect URL from 'r' parameter
 * 3. Returns HTTP 302 redirect to landing page
 * 4. CloudFront Access Logs capture: timestamp, IP, user-agent, all query params
 * 5. Athena queries logs daily → MongoDB (via empowerlocal-tracking-sync Lambda)
 * 
 * Browser Compatibility:
 * ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
 * ✅ All mobile browsers (iOS Safari, Chrome Android)
 * ✅ HTTP 302 redirects: Universal standard since HTTP/1.0 (1996)
 * ✅ Works with ad blockers (server-side redirect, not client-side JavaScript)
 * 
 * CloudFront Distribution: E14BMKEZBNSGP4
 * Domain: dxafls8akrlrp.cloudfront.net
 * 
 * @version 1.0.0
 * @updated 2026-01-12
 */

/**
 * Main Lambda@Edge handler
 * 
 * Triggered on: viewer-request events
 * Execution time: ~10-50ms
 * Memory: 128 MB
 * 
 * @param {Object} event - CloudFront viewer-request event
 * @param {Object} context - Lambda context
 * @returns {Object} CloudFront response (302 redirect or pass-through)
 */
exports.handler = async (event, context) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;
  
  // Only handle /c endpoint - all other paths pass through to S3 origin
  if (uri !== '/c') {
    return request;
  }
  
  // Parse query string
  const querystring = request.querystring || '';
  const params = parseQueryString(querystring);
  
  // Handle click redirect
  return handleClickRedirect(params, request);
};

/**
 * Handle click redirect with validation
 * 
 * Required parameter:
 * - r: Redirect URL (landing page) - must be URL-encoded
 * 
 * Optional parameters captured in CloudFront logs:
 * - oid: Order ID
 * - cid: Campaign ID  
 * - pid: Publication ID
 * - ch: Channel (website, newsletter, etc.)
 * - cr: Creative ID
 * - cb: Cache buster timestamp
 * 
 * @param {Object} params - Parsed query string parameters
 * @param {Object} request - Original CloudFront request
 * @returns {Object} CloudFront response (302 redirect or 400 error)
 */
function handleClickRedirect(params, request) {
  const { r } = params;
  
  // Validate redirect URL parameter exists
  if (!r) {
    return createErrorResponse(
      400,
      'Bad Request',
      'Missing redirect URL - please provide "r" parameter'
    );
  }
  
  // Decode and validate redirect URL
  let redirectUrl;
  try {
    redirectUrl = decodeURIComponent(r);
  } catch (error) {
    return createErrorResponse(
      400,
      'Bad Request',
      'Invalid URL encoding in "r" parameter'
    );
  }
  
  // Security: Validate URL scheme (prevent javascript:, data:, file: schemes)
  const lowerUrl = redirectUrl.toLowerCase().trim();
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return createErrorResponse(
      400,
      'Bad Request',
      'Invalid redirect URL - must start with http:// or https://'
    );
  }
  
  // Additional security: Check for obvious malicious patterns
  if (lowerUrl.includes('javascript:') || 
      lowerUrl.includes('data:') || 
      lowerUrl.includes('vbscript:')) {
    return createErrorResponse(
      400,
      'Bad Request',
      'Invalid redirect URL - suspicious content detected'
    );
  }
  
  // Validate URL is well-formed
  try {
    new URL(redirectUrl);
  } catch (error) {
    return createErrorResponse(
      400,
      'Bad Request',
      'Malformed redirect URL'
    );
  }
  
  // Return 302 redirect
  // Note: Using 302 (Found) instead of 301 (Moved Permanently) ensures:
  // - Each click is tracked separately (browsers won't cache)
  // - Analytics capture every click event
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
        value: 'no-cache, no-store, must-revalidate, max-age=0'
      }],
      'pragma': [{
        key: 'Pragma',
        value: 'no-cache'
      }],
      'expires': [{
        key: 'Expires',
        value: '0'
      }]
    }
  };
}

/**
 * Create error response
 * 
 * @param {number} status - HTTP status code
 * @param {string} statusDescription - Status description
 * @param {string} message - Error message
 * @returns {Object} CloudFront error response
 */
function createErrorResponse(status, statusDescription, message) {
  return {
    status: String(status),
    statusDescription: statusDescription,
    body: message,
    headers: {
      'content-type': [{
        key: 'Content-Type',
        value: 'text/plain; charset=utf-8'
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate'
      }]
    }
  };
}

/**
 * Parse query string into object
 * 
 * Handles standard URL-encoded query strings
 * Example: "a=1&b=2&c=3" → {a: "1", b: "2", c: "3"}
 * 
 * @param {string} querystring - Query string without leading "?"
 * @returns {Object} Parsed parameters
 */
function parseQueryString(querystring) {
  const params = {};
  
  if (!querystring) {
    return params;
  }
  
  querystring.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[key] = value || '';
    }
  });
  
  return params;
}
