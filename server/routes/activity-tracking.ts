/**
 * Activity Tracking API Routes
 * 
 * Provides endpoints for querying user activity logs and audit trails
 */

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { userInteractionsService } from '../../src/integrations/mongodb/allServices';
import { permissionsService } from '../../src/integrations/mongodb/permissionsService';
import { createLogger } from '../../src/utils/logger';

const router = Router();
const logger = createLogger('ActivityTrackingRoutes');

/**
 * Helper to check if user is admin
 */
function isUserAdmin(user: any): boolean {
  return user.role === 'admin' || user.role === 'super_admin' || user.isAdmin === true;
}

/**
 * GET /api/activities/me
 * Get current user's activity history
 */
router.get('/me', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const activityType = req.query.activityType as string;
    
    let activities;
    
    if (activityType) {
      activities = await userInteractionsService.getByActivityType(activityType, {
        userId,
        limit,
        offset
      });
    } else {
      activities = await userInteractionsService.getByUserId(userId, limit, offset);
    }
    
    res.json({
      activities,
      pagination: {
        limit,
        offset,
        count: activities.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/activities/publication/:id
 * Get activities for a specific publication
 * Requires: User must have access to the publication
 */
router.get('/publication/:id', async (req: any, res: Response) => {
  try {
    const publicationId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has access to this publication
    const userPublications = await permissionsService.getUserPublications(userId);
    const isAdmin = isUserAdmin(req.user);
    
    if (!isAdmin && !userPublications.includes(publicationId)) {
      return res.status(403).json({ error: 'Access denied to this publication' });
    }
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const activityType = req.query.activityType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const activities = await userInteractionsService.getByPublication(publicationId, {
      limit,
      offset,
      activityType,
      startDate,
      endDate
    });
    
    const totalCount = await userInteractionsService.countByPublication(publicationId, {
      activityType,
      startDate,
      endDate
    });
    
    res.json({
      activities,
      pagination: {
        limit,
        offset,
        count: activities.length,
        total: totalCount
      }
    });
  } catch (error: any) {
    logger.error('Error fetching publication activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/activities/hub/:id
 * Get activities for a specific hub
 * Requires: Admin access
 */
router.get('/hub/:id', async (req: any, res: Response) => {
  try {
    const hubId = req.params.id;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!isUserAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const activityType = req.query.activityType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const activities = await userInteractionsService.getByHub(hubId, {
      limit,
      offset,
      activityType,
      startDate,
      endDate
    });
    
    const totalCount = await userInteractionsService.countByHub(hubId, {
      activityType,
      startDate,
      endDate
    });
    
    res.json({
      activities,
      pagination: {
        limit,
        offset,
        count: activities.length,
        total: totalCount
      }
    });
  } catch (error: any) {
    logger.error('Error fetching hub activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/activities/user/:id
 * Get activities for a specific user
 * Requires: Admin access
 */
router.get('/user/:id', async (req: any, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const requestingUserId = req.user.id;
    
    // Check if user is admin or requesting their own data
    if (!isUserAdmin(req.user) && requestingUserId !== targetUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const activityType = req.query.activityType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    let activities;
    
    if (startDate && endDate) {
      activities = await userInteractionsService.getByDateRange(targetUserId, startDate, endDate, {
        limit,
        offset
      });
    } else if (activityType) {
      activities = await userInteractionsService.getByActivityType(activityType, {
        userId: targetUserId,
        limit,
        offset
      });
    } else {
      activities = await userInteractionsService.getByUserId(targetUserId, limit, offset);
    }
    
    res.json({
      activities,
      pagination: {
        limit,
        offset,
        count: activities.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * POST /api/activities/track
 * Manual activity tracking endpoint (for frontend-specific events)
 * Optional - frontend can call this for UI events not captured by middleware
 */
router.post('/track', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { interactionType, hubId, publicationId, metadata } = req.body;
    
    if (!interactionType) {
      return res.status(400).json({ error: 'interactionType is required' });
    }
    
    await userInteractionsService.track({
      userId,
      interactionType,
      hubId,
      publicationId,
      sessionId: req.sessionID || req.headers['x-session-id'] as string,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata
    });
    
    res.status(201).json({ success: true, message: 'Activity tracked' });
  } catch (error: any) {
    logger.error('Error tracking manual activity:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

/**
 * GET /api/activities/summary
 * Get activity summary/statistics
 * Requires: Admin access
 */
router.get('/summary', async (req: any, res: Response) => {
  try {
    // Check if user is admin
    if (!isUserAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const hubId = req.query.hubId as string;
    const publicationId = req.query.publicationId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    // Get activity counts by type
    const activityTypes = [
      'campaign_create', 'campaign_update', 'campaign_delete',
      'order_create', 'order_update', 'order_delete',
      'package_create', 'package_update', 'package_delete',
      'lead_create', 'lead_update', 'lead_delete',
      'publication_update', 'inventory_update', 'storefront_update'
    ];
    
    const summary: any = {
      totalActivities: 0,
      byType: {}
    };
    
    for (const activityType of activityTypes) {
      const activities = await userInteractionsService.getByActivityType(activityType, {
        hubId,
        publicationId,
        limit: 0 // Just need count
      });
      
      summary.byType[activityType] = activities.length;
      summary.totalActivities += activities.length;
    }
    
    res.json(summary);
  } catch (error: any) {
    logger.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;

