/**
 * Notification Routes
 * 
 * API endpoints for managing user notifications
 */

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { notificationService } from '../../src/services/notificationService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { 
      read, 
      type, 
      limit = '20', 
      skip = '0',
      campaignId,
      hubId,
      publicationId
    } = req.query;

    const notifications = await notificationService.list({
      userId,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type: type as any,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
      campaignId: campaignId as string,
      hubId: hubId as string,
      publicationId: publicationId ? parseInt(publicationId as string) : undefined
    });

    res.json({ 
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the current user
 */
router.get('/unread-count', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({ 
      success: true,
      count 
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * GET /api/notifications/counts
 * Get unread counts grouped by type
 */
router.get('/counts', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const counts = await notificationService.getUnreadCounts(userId);
    
    res.json({ 
      success: true,
      ...counts 
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await notificationService.markRead(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
router.put('/read-all', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { type, campaignId } = req.body;

    const count = await notificationService.markAllRead(userId, { type, campaignId });

    res.json({ 
      success: true,
      markedCount: count 
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await notificationService.delete(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications for the current user
 */
router.delete('/', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.deleteAll(userId);

    res.json({ 
      success: true,
      deletedCount: count 
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

export default router;
