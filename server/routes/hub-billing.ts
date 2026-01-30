/**
 * Hub Billing Routes
 * 
 * API endpoints for managing platform fees charged to hubs.
 * Includes revenue share fees and platform CPM fees on tracked impressions.
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
 * GET /api/hub-billing/:hubId
 * Get all billing records for a hub
 */
router.get('/:hubId', async (req: any, res: Response) => {
  try {
    const { hubId } = req.params;
    const { paymentStatus, finalized, limit, skip } = req.query;
    
    const billing = await earningsService.getHubBilling(hubId, {
      paymentStatus: paymentStatus as any,
      finalized: finalized === 'true' ? true : finalized === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    });
    
    res.json({ billing, total: billing.length });
  } catch (error) {
    console.error('Error fetching hub billing:', error);
    res.status(500).json({ error: 'Failed to fetch hub billing' });
  }
});

/**
 * GET /api/hub-billing/:hubId/summary
 * Get billing summary for a hub
 */
router.get('/:hubId/summary', async (req: any, res: Response) => {
  try {
    const { hubId } = req.params;
    const summary = await earningsService.getHubBillingSummary(hubId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching hub billing summary:', error);
    res.status(500).json({ error: 'Failed to fetch billing summary' });
  }
});

/**
 * GET /api/hub-billing/:hubId/campaign/:campaignId
 * Get billing for a specific campaign
 */
router.get('/:hubId/campaign/:campaignId', async (req: any, res: Response) => {
  try {
    const { hubId, campaignId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.HUB_BILLING);
    
    const billing = await collection.findOne({ hubId, campaignId });
    
    if (!billing) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error fetching campaign billing:', error);
    res.status(500).json({ error: 'Failed to fetch campaign billing' });
  }
});

/**
 * POST /api/hub-billing/campaign/:campaignId/create-estimate
 * Create billing estimate for a campaign
 */
router.post('/campaign/:campaignId/create-estimate', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const billing = await earningsService.createHubBillingEstimate(campaignId);
    
    if (!billing) {
      return res.status(400).json({ 
        error: 'Failed to create billing estimate. Ensure hub has platform billing configured.' 
      });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error creating billing estimate:', error);
    res.status(500).json({ error: 'Failed to create billing estimate' });
  }
});

/**
 * POST /api/hub-billing/campaign/:campaignId/update-actual
 * Update actual billing based on publisher earnings
 */
router.post('/campaign/:campaignId/update-actual', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const billing = await earningsService.updateHubBillingActual(campaignId);
    
    if (!billing) {
      return res.status(400).json({ error: 'Failed to update billing' });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({ error: 'Failed to update billing' });
  }
});

/**
 * POST /api/hub-billing/campaign/:campaignId/finalize
 * Finalize billing for a campaign
 */
router.post('/campaign/:campaignId/finalize', async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const billing = await earningsService.finalizeHubBilling(campaignId);
    
    if (!billing) {
      return res.status(400).json({ error: 'Failed to finalize billing' });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error finalizing billing:', error);
    res.status(500).json({ error: 'Failed to finalize billing' });
  }
});

/**
 * POST /api/hub-billing/:billingId/payment
 * Record a payment from a hub
 */
router.post('/:billingId/payment', async (req: any, res: Response) => {
  try {
    const { billingId } = req.params;
    const { amount, reference, method, invoiceNumber, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    
    const billing = await earningsService.recordHubPayment(billingId, {
      amount,
      reference,
      method,
      invoiceNumber,
      notes,
    });
    
    if (!billing) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    
    res.json(billing);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * PATCH /api/hub-billing/:billingId/invoice
 * Update invoice information
 */
router.patch('/:billingId/invoice', async (req: any, res: Response) => {
  try {
    const { billingId } = req.params;
    const { invoiceNumber, invoiceDate, dueDate } = req.body;
    
    const db = getDatabase();
    const collection = db.collection(COLLECTIONS.HUB_BILLING);
    
    const updateFields: any = { updatedAt: new Date() };
    if (invoiceNumber) updateFields.invoiceNumber = invoiceNumber;
    if (invoiceDate) updateFields.invoiceDate = new Date(invoiceDate);
    if (dueDate) updateFields.dueDate = new Date(dueDate);
    
    // Set status to invoiced if we're adding invoice info and it was pending
    if (invoiceNumber) {
      updateFields.paymentStatus = 'invoiced';
    }
    
    const result = await collection.findOneAndUpdate(
      { 
        $or: [
          { _id: new ObjectId(billingId) },
          { _id: billingId as any }
        ]
      },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// ==================== Platform Admin Routes ====================

/**
 * GET /api/hub-billing/platform/all
 * Get all billing records across all hubs (platform admin view)
 */
router.get('/platform/all', async (req: any, res: Response) => {
  try {
    // TODO: Add admin check
    const { paymentStatus, limit, skip } = req.query;
    
    const billing = await earningsService.getAllHubBilling({
      paymentStatus: paymentStatus as string,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    });
    
    res.json({ billing, total: billing.length });
  } catch (error) {
    console.error('Error fetching all billing:', error);
    res.status(500).json({ error: 'Failed to fetch billing' });
  }
});

/**
 * GET /api/hub-billing/platform/summary
 * Get platform-wide billing summary (platform admin view)
 */
router.get('/platform/summary', async (req: any, res: Response) => {
  try {
    // TODO: Add admin check
    const summary = await earningsService.getPlatformBillingSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching platform billing summary:', error);
    res.status(500).json({ error: 'Failed to fetch platform billing summary' });
  }
});

export default router;
