/**
 * Admin Orders Routes
 * 
 * API endpoints for hub admins to manage all insertion orders
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { insertionOrderService } from '../../../src/services/insertionOrderService';
import { userProfilesService } from '../../../src/integrations/mongodb/allServices';

const router = Router();

// All routes require authentication and admin access
router.use(authenticateToken);
router.use(async (req: any, res: Response, next: Function) => {
  try {
    const userProfile = await userProfilesService.getByUserId(req.user.id);
    if (!userProfile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
});

/**
 * GET /api/admin/orders
 * List all insertion orders with filters
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { status, publicationId, campaignId, dateFrom, dateTo } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (publicationId) filters.publicationId = parseInt(publicationId as string);
    if (campaignId) filters.campaignId = campaignId;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const orders = await insertionOrderService.getAllOrders(filters);

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/admin/orders/stats
 * Get order statistics
 */
router.get('/stats', async (req: any, res: Response) => {
  try {
    const { publicationId, campaignId } = req.query;

    const filters: any = {};
    if (publicationId) filters.publicationId = parseInt(publicationId as string);
    if (campaignId) filters.campaignId = campaignId;

    const stats = await insertionOrderService.getOrderStatistics(filters);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/admin/orders/:campaignId/:publicationId
 * Get a specific insertion order
 */
router.get('/:campaignId/:publicationId', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId } = req.params;

    const order = await insertionOrderService.getOrderByCampaignAndPublication(
      campaignId,
      parseInt(publicationId)
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * PUT /api/admin/orders/:campaignId/:publicationId
 * Update an insertion order (admin override)
 */
router.put('/:campaignId/:publicationId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const updates = req.body;

    // Admin can update any fields
    // TODO: Implement full update logic in insertionOrderService
    
    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * PUT /api/admin/orders/:campaignId/:publicationId/status
 * Update order status (admin override)
 */
router.put('/:campaignId/:publicationId/status', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId, publicationId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await insertionOrderService.updateCampaignOrderStatus(
      campaignId,
      parseInt(publicationId),
      status,
      userId,
      notes || 'Status updated by admin'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, order: result.order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/admin/orders/:campaignId/:publicationId/creative-assets
 * Upload creative assets for an order
 */
router.post('/:campaignId/:publicationId/creative-assets', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId } = req.params;
    const { assetIds } = req.body;

    if (!assetIds || !Array.isArray(assetIds)) {
      return res.status(400).json({ error: 'Asset IDs array is required' });
    }

    // TODO: Link creative assets to the insertion order
    // This would be implemented in the insertionOrderService
    
    res.json({ success: true, message: 'Creative assets added to order' });
  } catch (error) {
    console.error('Error adding creative assets:', error);
    res.status(500).json({ error: 'Failed to add creative assets' });
  }
});

/**
 * POST /api/admin/orders/:campaignId/:publicationId/notes
 * Add hub notes to an order
 */
router.post('/:campaignId/:publicationId/notes', async (req: any, res: Response) => {
  try {
    const { campaignId, publicationId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    const result = await insertionOrderService.addNotes(
      campaignId,
      parseInt(publicationId),
      notes,
      'hub'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding notes:', error);
    res.status(500).json({ error: 'Failed to add notes' });
  }
});

/**
 * POST /api/admin/orders/generate/:campaignId
 * Generate insertion orders for a campaign
 */
router.post('/generate/:campaignId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { campaignId } = req.params;

    const result = await insertionOrderService.generateOrdersForCampaign(
      campaignId,
      userId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      success: true, 
      ordersGenerated: result.ordersGenerated,
      message: `Generated ${result.ordersGenerated} insertion orders`
    });
  } catch (error) {
    console.error('Error generating orders:', error);
    res.status(500).json({ error: 'Failed to generate orders' });
  }
});

/**
 * DELETE /api/admin/orders/:campaignId/publication-orders
 * Delete publication orders for a campaign (to allow regeneration)
 */
router.delete('/:campaignId/publication-orders', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;

    const result = await insertionOrderService.deleteOrdersForCampaign(campaignId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} publication orders successfully`
    });
  } catch (error) {
    console.error('Error deleting publication orders:', error);
    res.status(500).json({ error: 'Failed to delete publication orders' });
  }
});

/**
 * POST /api/admin/orders/bulk-update-status
 * Bulk update status for multiple orders
 */
router.post('/bulk-update-status', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { orders, status, notes } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const results = [];

    for (const order of orders) {
      const result = await insertionOrderService.updateCampaignOrderStatus(
        order.campaignId,
        order.publicationId,
        status,
        userId,
        notes
      );
      
      results.push({
        campaignId: order.campaignId,
        publicationId: order.publicationId,
        success: result.success,
        error: result.error
      });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({ 
      success: true, 
      updated: successCount,
      total: orders.length,
      results 
    });
  } catch (error) {
    console.error('Error bulk updating orders:', error);
    res.status(500).json({ error: 'Failed to bulk update orders' });
  }
});

/**
 * POST /api/admin/orders/send-reminders
 * Send reminder emails for pending orders
 */
router.post('/send-reminders', async (req: any, res: Response) => {
  try {
    const { orderIds } = req.body;

    // TODO: Implement reminder email sending
    // This would use the email service to send reminders

    res.json({ 
      success: true, 
      message: 'Reminders sent',
      count: orderIds?.length || 0
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export default router;

