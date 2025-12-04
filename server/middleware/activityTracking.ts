/**
 * Activity Tracking Middleware
 * 
 * Automatically tracks user activities for database modifications (POST, PUT, PATCH, DELETE)
 * Provides audit trail for compliance and debugging purposes
 */

import { Request, Response, NextFunction } from 'express';
import { userInteractionsService } from '../../src/integrations/mongodb/allServices';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger('ActivityTracking');

// Sensitive fields to exclude from metadata
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'privateKey',
  'privatekey'
];

// Route patterns to activity types mapping
const ROUTE_ACTIVITY_MAP: Record<string, { create: string; update: string; delete: string }> = {
  '/api/campaigns': {
    create: 'campaign_create',
    update: 'campaign_update',
    delete: 'campaign_delete'
  },
  '/api/hub-packages': {
    create: 'package_create',
    update: 'package_update',
    delete: 'package_delete'
  },
  '/api/admin/hub-packages': {
    create: 'package_create',
    update: 'package_update',
    delete: 'package_delete'
  },
  '/api/publication-orders': {
    create: 'order_create',
    update: 'order_update',
    delete: 'order_delete'
  },
  '/api/admin/orders': {
    create: 'order_create',
    update: 'order_update',
    delete: 'order_delete'
  },
  '/api/builder/leads': {
    create: 'lead_create',
    update: 'lead_update',
    delete: 'lead_delete'
  },
  '/api/admin/builder/leads': {
    create: 'lead_create',
    update: 'lead_update',
    delete: 'lead_delete'
  },
  '/api/publications': {
    create: 'publication_create',
    update: 'publication_update',
    delete: 'publication_delete'
  },
  '/api/storefront': {
    create: 'storefront_create',
    update: 'storefront_update',
    delete: 'storefront_delete'
  }
};

// Special route patterns for specific operations
const SPECIAL_ROUTES: Record<string, string> = {
  'PUT /api/builder/inventory': 'inventory_update',
  'PATCH /api/builder/inventory': 'inventory_update',
  'PUT /api/admin/builder/inventory': 'inventory_update',
  'PATCH /api/admin/builder/inventory': 'inventory_update',
  'PUT /api/builder/settings': 'settings_update',
  'PATCH /api/builder/settings': 'settings_update',
  'POST /api/admin/builder/refresh': 'package_refresh',
  'POST /api/campaigns/save': 'campaign_create',
  'PUT /api/campaigns/save': 'campaign_update'
};

/**
 * Filter out sensitive fields from an object
 */
function filterSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterSensitiveData(item));
  }
  
  const filtered: any = {};
  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    if (!SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      filtered[key] = typeof obj[key] === 'object' ? filterSensitiveData(obj[key]) : obj[key];
    }
  }
  return filtered;
}

/**
 * Extract context (hubId, publicationId) from request
 */
function extractContext(req: any): { hubId?: string; publicationId?: string } {
  const context: { hubId?: string; publicationId?: string } = {};
  
  // Try to get from route params
  if (req.params.hubId) context.hubId = req.params.hubId;
  if (req.params.publicationId) context.publicationId = req.params.publicationId;
  if (req.params.id && req.path.includes('publication')) {
    context.publicationId = req.params.id;
  }
  
  // Try to get from request body
  if (req.body) {
    if (req.body.hubId) context.hubId = req.body.hubId;
    if (req.body.publicationId) context.publicationId = req.body.publicationId;
  }
  
  // Try to get from query params
  if (req.query) {
    if (req.query.hubId) context.hubId = req.query.hubId as string;
    if (req.query.publicationId) context.publicationId = req.query.publicationId as string;
  }
  
  return context;
}

/**
 * Determine activity type from request
 */
function getActivityType(req: Request): string | null {
  const method = req.method;
  const path = req.path;
  
  // Check special routes first
  const specialKey = `${method} ${path}`;
  if (SPECIAL_ROUTES[specialKey]) {
    return SPECIAL_ROUTES[specialKey];
  }
  
  // Check route patterns
  for (const routePattern in ROUTE_ACTIVITY_MAP) {
    if (path.startsWith(routePattern)) {
      const mapping = ROUTE_ACTIVITY_MAP[routePattern];
      
      switch (method) {
        case 'POST':
          return mapping.create;
        case 'PUT':
        case 'PATCH':
          return mapping.update;
        case 'DELETE':
          return mapping.delete;
      }
    }
  }
  
  return null;
}

/**
 * Extract resource ID from request
 */
function getResourceId(req: any): string | undefined {
  // Try params.id first (most common)
  if (req.params.id) return req.params.id;
  
  // Try other common ID fields
  if (req.params.campaignId) return req.params.campaignId;
  if (req.params.packageId) return req.params.packageId;
  if (req.params.orderId) return req.params.orderId;
  if (req.params.leadId) return req.params.leadId;
  
  // For creation, try to get from response body (will be set later)
  if (req.method === 'POST' && req.body) {
    return req.body.id || req.body._id;
  }
  
  return undefined;
}

/**
 * Activity Tracking Middleware
 */
export function activityTrackingMiddleware(req: any, res: Response, next: NextFunction) {
  // Only track modification operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  
  // Skip if no authenticated user
  if (!req.user || !req.user.id) {
    return next();
  }
  
  // Determine activity type
  const activityType = getActivityType(req);
  if (!activityType) {
    // Not a route we're tracking
    return next();
  }
  
  // Extract context
  const context = extractContext(req);
  const resourceId = getResourceId(req);
  
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Track activity after successful response
  const trackActivity = (body: any) => {
    // Only track successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Try to extract resource ID from response if not available from request
      let finalResourceId = resourceId;
      if (!finalResourceId && body && typeof body === 'object') {
        finalResourceId = body.id || body._id || body.campaignId || body.packageId;
      }
      
      // Track asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          logger.info(`🎯 Tracking activity: ${activityType} by user ${req.user.id} on ${req.method} ${req.path}`);
          
          await userInteractionsService.track({
            userId: req.user.id,
            interactionType: activityType as any,
            hubId: context.hubId,
            publicationId: context.publicationId,
            sessionId: req.sessionID || req.headers['x-session-id'] as string,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            metadata: {
              resourceId: finalResourceId,
              resourceType: activityType.split('_')[0], // e.g., 'campaign' from 'campaign_create'
              action: req.method,
              path: req.path,
              // Store minimal sanitized data
              ...filterSensitiveData({
                params: req.params,
                query: Object.keys(req.query).length > 0 ? req.query : undefined
              })
            }
          });
          
          logger.info(`✅ Activity tracked successfully: ${activityType}`);
        } catch (error) {
          // Log but don't throw - tracking failures shouldn't affect the request
          logger.error('❌ Failed to track activity:', error);
        }
      });
    }
  };
  
  // Wrap res.send
  res.send = function(body: any) {
    trackActivity(body);
    return originalSend.call(this, body);
  };
  
  // Wrap res.json
  res.json = function(body: any) {
    trackActivity(body);
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Create activity tracking middleware with custom configuration
 */
export function createActivityTrackingMiddleware(config?: {
  excludeRoutes?: string[];
  includeRoutes?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check exclusions
    if (config?.excludeRoutes?.some(route => req.path.startsWith(route))) {
      return next();
    }
    
    // Check inclusions (if specified)
    if (config?.includeRoutes && !config.includeRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }
    
    return activityTrackingMiddleware(req, res, next);
  };
}

