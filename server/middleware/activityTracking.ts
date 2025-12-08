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
  const fullPath = req.originalUrl?.split('?')[0] || req.path;
  
  // Try to get from route params
  if (req.params.hubId) context.hubId = req.params.hubId;
  if (req.params.publicationId) context.publicationId = req.params.publicationId;
  
  // For /api/publications/:id routes, extract publicationId from params.id
  if (req.params.id && fullPath.includes('/publications/')) {
    context.publicationId = req.params.id;
  }
  
  // Try to get from request body
  if (req.body) {
    if (req.body.hubId) context.hubId = req.body.hubId;
    if (req.body.publicationId) context.publicationId = req.body.publicationId;
    // Also check for hubIds array (publications can belong to multiple hubs)
    if (!context.hubId && req.body.hubIds && req.body.hubIds.length > 0) {
      context.hubId = req.body.hubIds[0];
    }
  }
  
  // Try to get from query params
  if (req.query) {
    if (req.query.hubId) context.hubId = req.query.hubId as string;
    if (req.query.publicationId) context.publicationId = req.query.publicationId as string;
  }
  
  logger.debug(`extractContext: hubId=${context.hubId}, publicationId=${context.publicationId}, fullPath=${fullPath}`);
  
  return context;
}

/**
 * Determine activity type from request
 */
function getActivityType(req: Request): string | null {
  const method = req.method;
  // Use originalUrl for the full path (req.path may only show path after route mount point)
  const fullPath = req.originalUrl?.split('?')[0] || req.path;
  const path = req.path;
  
  logger.debug(`getActivityType: method=${method}, path=${path}, fullPath=${fullPath}`);
  
  // Check special routes first (try both full path and relative path)
  const specialKeyFull = `${method} ${fullPath}`;
  const specialKeyRelative = `${method} ${path}`;
  if (SPECIAL_ROUTES[specialKeyFull]) {
    return SPECIAL_ROUTES[specialKeyFull];
  }
  if (SPECIAL_ROUTES[specialKeyRelative]) {
    return SPECIAL_ROUTES[specialKeyRelative];
  }
  
  // Check route patterns (use full path for proper matching)
  for (const routePattern in ROUTE_ACTIVITY_MAP) {
    if (fullPath.startsWith(routePattern)) {
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
  
  logger.debug(`getActivityType: No match found for ${method} ${fullPath}`);
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
 * 
 * NOTE: This middleware must handle the case where it runs BEFORE authenticateToken
 * in the middleware chain. It defers user checking until response time, when
 * authentication will have completed.
 */
export function activityTrackingMiddleware(req: any, res: Response, next: NextFunction) {
  // Only track modification operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  
  // Determine activity type early (before response)
  const activityType = getActivityType(req);
  if (!activityType) {
    // Not a route we're tracking
    return next();
  }
  
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Flag to prevent duplicate tracking (both send and json can be called)
  let activityTracked = false;
  
  // Track activity after successful response
  // NOTE: We defer checking req.user until response time because authenticateToken
  // may not have run yet when this middleware first executes
  const trackActivity = (body: any) => {
    // Prevent duplicate tracking
    if (activityTracked) {
      return;
    }
    activityTracked = true;
    
    // Check for authenticated user at response time (after authenticateToken has run)
    if (!req.user || !req.user.id) {
      logger.debug(`⏭️ Skipping activity tracking - no authenticated user for ${req.method} ${req.path}`);
      return;
    }
    
    // Only track successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Extract context at response time (body may have hubId/publicationId)
      const context = extractContext(req);
      const resourceId = getResourceId(req);
      const fullPath = req.originalUrl?.split('?')[0] || req.path;
      
      // For publication routes, use the MongoDB ObjectId from URL as publicationId
      // This ensures we can query activities by the same ID used in the URL
      if (fullPath.includes('/publications/') && req.params.id) {
        // Use MongoDB _id from URL for publicationId (this is what frontend uses to query)
        context.publicationId = req.params.id;
      }
      
      // Also try to extract hubId from response body if not already set
      if (body && typeof body === 'object') {
        // Check response body for context (e.g., from created/updated entity)
        const responseEntity = body.campaign || body.package || body.order || body.lead || body;
        if (!context.hubId && responseEntity.hubId) {
          context.hubId = responseEntity.hubId;
        }
        // Also check hubIds array for publications
        if (!context.hubId && responseEntity.hubIds && responseEntity.hubIds.length > 0) {
          context.hubId = responseEntity.hubIds[0];
        }
      }
      
      // Try to extract resource ID from response if not available from request
      let finalResourceId = resourceId;
      if (!finalResourceId && body && typeof body === 'object') {
        const responseEntity = body.campaign || body.package || body.order || body.lead || body;
        finalResourceId = responseEntity.id || responseEntity._id || responseEntity.campaignId || responseEntity.packageId;
      }
      
      // Extract additional context from response body for richer activity details
      let additionalMeta: Record<string, any> = {};
      if (body && typeof body === 'object') {
        // Handle both wrapped responses (e.g., { campaign: ... }) and direct entity responses
        const entity = body.campaign || body.package || body.order || body.lead || body.publication || body;
        
        logger.debug(`Extracting entity metadata from response body. Keys: ${Object.keys(body).slice(0, 10).join(', ')}`);
        
        // Debug: Log basicInfo structure for publications
        if (entity.basicInfo) {
          logger.debug(`basicInfo keys: ${Object.keys(entity.basicInfo).join(', ')}`);
          logger.debug(`basicInfo.name = ${entity.basicInfo.name}, basicInfo.publicationName = ${entity.basicInfo.publicationName}`);
        }
        
        // Capture names/titles for better activity display
        // Publications store name in basicInfo.name OR basicInfo.publicationName
        if (entity.name) additionalMeta.entityName = entity.name;
        if (entity.title) additionalMeta.entityName = entity.title;
        if (entity.basicInfo?.name) {
          additionalMeta.entityName = entity.basicInfo.name;
          additionalMeta.publicationName = entity.basicInfo.name;
          logger.debug(`Found basicInfo.name: ${entity.basicInfo.name}`);
        } else if (entity.basicInfo?.publicationName) {
          // Fallback: some publications might use publicationName instead of name
          additionalMeta.entityName = entity.basicInfo.publicationName;
          additionalMeta.publicationName = entity.basicInfo.publicationName;
          logger.debug(`Found basicInfo.publicationName: ${entity.basicInfo.publicationName}`);
        }
        if (entity.companyName) additionalMeta.companyName = entity.companyName;
        if (entity.campaignName) additionalMeta.campaignName = entity.campaignName;
        if (entity.status) additionalMeta.status = entity.status;
        
        // For publications, note what sections might have been updated
        if (activityType === 'publication_update') {
          // Store publication name from the response (could be in different locations)
          const pubName = entity.basicInfo?.name || body.basicInfo?.name || entity.basicInfo?.publicationName;
          if (pubName) {
            additionalMeta.publicationName = pubName;
            logger.debug(`Setting publicationName to: ${pubName}`);
          }
          
          // Detect what sections were updated based on request body
          if (req.body) {
            const updatedSections: string[] = [];
            // distributionChannels contains all ad inventory (website, newsletters, print, etc.)
            if (req.body.distributionChannels || req.body.inventory || req.body.adInventory) updatedSections.push('inventory');
            if (req.body.basicInfo) updatedSections.push('profile');
            if (req.body.contactInfo) updatedSections.push('contact');
            if (req.body.pricing) updatedSections.push('pricing');
            if (req.body.storefront) updatedSections.push('storefront');
            if (req.body.settings) updatedSections.push('settings');
            if (req.body.audienceDemographics) updatedSections.push('demographics');
            if (req.body.socialMediaLinks) updatedSections.push('social');
            if (req.body.competitiveInfo) updatedSections.push('competitive');
            if (req.body.businessInfo) updatedSections.push('business');
            if (updatedSections.length > 0) {
              additionalMeta.changes = updatedSections;
            }
          }
        }
        
        logger.debug(`additionalMeta keys: ${Object.keys(additionalMeta).join(', ')}`);
      }
      
      // Determine the final activity type - use more specific type for partial updates
      let finalActivityType = activityType;
      if (activityType === 'publication_update' && additionalMeta.changes) {
        const changes = additionalMeta.changes as string[];
        // If only inventory was updated, use inventory_update as the activity type
        if (changes.length === 1 && changes[0] === 'inventory') {
          finalActivityType = 'inventory_update';
        }
        // If only profile sections were updated (no inventory), use profile_update
        else if (changes.length > 0 && !changes.includes('inventory') &&
                 (changes.includes('profile') || changes.includes('contact') ||
                  changes.includes('demographics') || changes.includes('social') ||
                  changes.includes('competitive') || changes.includes('business'))) {
          finalActivityType = 'profile_update';
        }
      }
      
      // Track asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          logger.info(`🎯 Tracking activity: ${finalActivityType} by user ${req.user.id} on ${req.method} ${fullPath}`, {
            hubId: context.hubId,
            publicationId: context.publicationId,
            resourceId: finalResourceId
          });
          
          await userInteractionsService.track({
            userId: req.user.id,
            interactionType: finalActivityType as any,
            hubId: context.hubId,
            publicationId: context.publicationId,
            sessionId: req.sessionID || req.headers['x-session-id'] as string,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            metadata: {
              resourceId: finalResourceId,
              resourceType: finalActivityType.split('_')[0], // e.g., 'inventory' from 'inventory_update'
              action: req.method,
              path: fullPath,
              // Store user email for display (avoids needing to look up later)
              userEmail: req.user.email,
              userName: req.user.name || req.user.email?.split('@')[0],
              ...additionalMeta,
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

