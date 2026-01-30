/**
 * Earnings Routes
 * 
 * API endpoints for managing publication earnings.
 * Provides endpoints for viewing earnings, recording payments, and generating summaries.
 */

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { earningsService } from '../../src/services/earningsService';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { ObjectId } from 'mongodb';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/earnings/publication/:publicationId
 * Get all earnings for a specific publication
 */
router.get('/publication/:publicationId', async (req: any, res: Response) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { paymentStatus, finalized, limit, skip } = req.query;
    
    const earnings = await earningsService.getPublicationEarnings(publicationId, {
      paymentStatus: paymentStatus as any,
      finalized: finalized === 'true' ? true : finalized === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    });
    
    res.json({ earnings, total: earnings.length });
  } catch (error) {
    console.error('Error fetching publication earnings:', error);
    res.status(500).json({ error: 'Failed to fetch publication earnings' });
  }
});

/**
 * GET /api/earnings/publication/:publicationId/summary
 * Get earnings summary for a publication
 */
router.get('/publication/:publicationId/summary', async (req: any, res: Response) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const summary = await earningsService.getPublicationEarningsSummary(publicationId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching publication earnings summary:', error);
    res.status(500).json({ error: 'Failed to fetch earnings summary' });
  }
});

/**
 * GET /api/earnings/order/:orderId
 * Get earnings for a specific order
 */
router.get('/order/:orderId', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.PUBLICATION_EARNINGS);
    
    const earnings = await collection.findOne({ orderId });
    
    if (!earnings) {
      return res.status(404).json({ error: 'Earnings record not found' });
    }
    
    res.json(earnings);
  } catch (error) {
    console.error('Error fetching order earnings:', error);
    res.status(500).json({ error: 'Failed to fetch order earnings' });
  }
});

/**
 * GET /api/earnings/campaign/:campaignId
 * Get all earnings for a campaign (across all publications)
 */
router.get('/campaign/:campaignId', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.PUBLICATION_EARNINGS);
    
    const earnings = await collection
      .find({ campaignId })
      .sort({ publicationName: 1 })
      .toArray();
    
    // Calculate campaign totals
    const totals = earnings.reduce((acc, e) => ({
      estimatedTotal: acc.estimatedTotal + e.estimated.total,
      actualTotal: acc.actualTotal + e.actual.total,
      amountPaid: acc.amountPaid + e.amountPaid,
      amountOwed: acc.amountOwed + e.amountOwed,
    }), {
      estimatedTotal: 0,
      actualTotal: 0,
      amountPaid: 0,
      amountOwed: 0,
    });
    
    res.json({ earnings, totals, publicationCount: earnings.length });
  } catch (error) {
    console.error('Error fetching campaign earnings:', error);
    res.status(500).json({ error: 'Failed to fetch campaign earnings' });
  }
});

/**
 * POST /api/earnings/order/:orderId/create-estimate
 * Create earnings estimate for an order (typically called when order is confirmed)
 */
router.post('/order/:orderId/create-estimate', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const earnings = await earningsService.createPublisherEarningsEstimate(orderId);
    
    if (!earnings) {
      return res.status(400).json({ error: 'Failed to create earnings estimate' });
    }
    
    res.json(earnings);
  } catch (error) {
    console.error('Error creating earnings estimate:', error);
    res.status(500).json({ error: 'Failed to create earnings estimate' });
  }
});

/**
 * POST /api/earnings/order/:orderId/update-actual
 * Update actual earnings based on performance data
 */
router.post('/order/:orderId/update-actual', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const earnings = await earningsService.updatePublisherActualEarnings(orderId);
    
    if (!earnings) {
      return res.status(400).json({ error: 'Failed to update earnings' });
    }
    
    res.json(earnings);
  } catch (error) {
    console.error('Error updating earnings:', error);
    res.status(500).json({ error: 'Failed to update earnings' });
  }
});

/**
 * POST /api/earnings/order/:orderId/finalize
 * Finalize earnings for an order (typically called at campaign end)
 */
router.post('/order/:orderId/finalize', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const earnings = await earningsService.finalizePublisherEarnings(orderId);
    
    if (!earnings) {
      return res.status(400).json({ error: 'Failed to finalize earnings' });
    }
    
    res.json(earnings);
  } catch (error) {
    console.error('Error finalizing earnings:', error);
    res.status(500).json({ error: 'Failed to finalize earnings' });
  }
});

/**
 * POST /api/earnings/:earningsId/payment
 * Record a payment to a publisher
 */
router.post('/:earningsId/payment', async (req: any, res: Response) => {
  try {
    const { earningsId } = req.params;
    const { amount, reference, method, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    
    const earnings = await earningsService.recordPublisherPayment(earningsId, {
      amount,
      reference,
      method,
      notes,
      recordedBy: req.user?.id,
    });
    
    if (!earnings) {
      return res.status(404).json({ error: 'Earnings record not found' });
    }
    
    res.json(earnings);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * GET /api/earnings/hub/:hubId
 * Get all earnings for a hub (hub admin view of publisher earnings)
 */
router.get('/hub/:hubId', async (req: any, res: Response) => {
  try {
    const { hubId } = req.params;
    const { paymentStatus, finalized, limit, skip } = req.query;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.PUBLICATION_EARNINGS);
    
    const query: any = { hubId };
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (finalized !== undefined) query.finalized = finalized === 'true';
    
    const earnings = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip ? parseInt(skip as string) : 0)
      .limit(limit ? parseInt(limit as string) : 100)
      .toArray();
    
    // Calculate hub totals
    const totals = earnings.reduce((acc, e) => ({
      estimatedTotal: acc.estimatedTotal + e.estimated.total,
      actualTotal: acc.actualTotal + e.actual.total,
      amountPaid: acc.amountPaid + e.amountPaid,
      amountOwed: acc.amountOwed + e.amountOwed,
    }), {
      estimatedTotal: 0,
      actualTotal: 0,
      amountPaid: 0,
      amountOwed: 0,
    });
    
    res.json({ earnings, totals, total: earnings.length });
  } catch (error) {
    console.error('Error fetching hub earnings:', error);
    res.status(500).json({ error: 'Failed to fetch hub earnings' });
  }
});

/**
 * GET /api/earnings/hub/:hubId/summary
 * Get earnings summary for a hub
 */
router.get('/hub/:hubId/summary', async (req: any, res: Response) => {
  try {
    const { hubId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.PUBLICATION_EARNINGS);
    
    const allEarnings = await collection.find({ hubId }).toArray();
    
    const publicationMap = new Map<number, {
      publicationId: number;
      publicationName: string;
      totalEarned: number;
      totalPaid: number;
      totalOwed: number;
      campaignCount: number;
    }>();
    
    for (const e of allEarnings) {
      const existing = publicationMap.get(e.publicationId);
      const earned = e.actual.total || e.estimated.total;
      
      if (existing) {
        existing.totalEarned += earned;
        existing.totalPaid += e.amountPaid;
        existing.totalOwed += e.amountOwed;
        existing.campaignCount += 1;
      } else {
        publicationMap.set(e.publicationId, {
          publicationId: e.publicationId,
          publicationName: e.publicationName,
          totalEarned: earned,
          totalPaid: e.amountPaid,
          totalOwed: e.amountOwed,
          campaignCount: 1,
        });
      }
    }
    
    const byPublication = Array.from(publicationMap.values())
      .sort((a, b) => b.totalEarned - a.totalEarned);
    
    const summary = {
      totalEarned: byPublication.reduce((sum, p) => sum + p.totalEarned, 0),
      totalPaid: byPublication.reduce((sum, p) => sum + p.totalPaid, 0),
      totalOwed: byPublication.reduce((sum, p) => sum + p.totalOwed, 0),
      publicationCount: byPublication.length,
      campaignCount: allEarnings.length,
      byPublication,
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching hub earnings summary:', error);
    res.status(500).json({ error: 'Failed to fetch hub earnings summary' });
  }
});

export default router;
