/**
 * Proof of Performance Routes
 * 
 * API endpoints for uploading, managing, and verifying proof of performance files.
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import { authenticateToken } from '../middleware/authenticate';
import { getDatabase } from '../../src/integrations/mongodb/client';
import { COLLECTIONS } from '../../src/integrations/mongodb/schemas';
import { 
  ProofOfPerformance, 
  ProofOfPerformanceInsert,
  validateProofOfPerformance,
  isValidVerificationTransition,
  ProofFileType,
  VerificationStatus,
  MAX_FILE_SIZE
} from '../../src/integrations/mongodb/proofOfPerformanceSchema';
import { fileStorage } from '../storage/fileStorage';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE // Use schema's max file size (50MB)
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs for tearsheets/proofs
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed for proof of performance`));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/proof-of-performance
 * List proofs with optional filters
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { orderId, campaignId, publicationId, verificationStatus, fileType, limit = 100 } = req.query;
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    // Build query
    const query: any = { deletedAt: { $exists: false } };
    
    if (orderId) query.orderId = orderId;
    if (campaignId) query.campaignId = campaignId;
    if (publicationId) query.publicationId = parseInt(publicationId as string);
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (fileType) query.fileType = fileType;
    
    const proofs = await collection
      .find(query)
      .sort({ uploadedAt: -1 })
      .limit(parseInt(limit as string))
      .toArray();
    
    res.json({ proofs, total: proofs.length });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
});

/**
 * GET /api/proof-of-performance/order/:orderId
 * Get all proofs for a specific order
 */
router.get('/order/:orderId', async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const proofs = await collection
      .find({ orderId, deletedAt: { $exists: false } })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    // Calculate summary
    const summary = {
      total: proofs.length,
      byStatus: {
        pending: 0,
        verified: 0,
        rejected: 0,
      } as Record<VerificationStatus, number>,
      byFileType: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
      allVerified: false,
      hasPending: false,
      hasRejected: false,
    };
    
    proofs.forEach(proof => {
      summary.byStatus[proof.verificationStatus]++;
      summary.byFileType[proof.fileType] = (summary.byFileType[proof.fileType] || 0) + 1;
      if (proof.channel) {
        summary.byChannel[proof.channel] = (summary.byChannel[proof.channel] || 0) + 1;
      }
    });
    
    summary.hasPending = summary.byStatus.pending > 0;
    summary.hasRejected = summary.byStatus.rejected > 0;
    summary.allVerified = proofs.length > 0 && summary.byStatus.verified === proofs.length;
    
    res.json({ proofs, summary });
  } catch (error) {
    console.error('Error fetching order proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
});

/**
 * GET /api/proof-of-performance/verification-queue
 * Get pending proofs for verification (admin)
 */
router.get('/verification-queue', async (req: any, res: Response) => {
  try {
    const { hubId, limit = 50 } = req.query;
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    // Build query - only pending proofs
    const query: any = { 
      verificationStatus: 'pending',
      deletedAt: { $exists: false }
    };
    
    // If hubId provided, filter by campaigns in that hub
    // This requires a lookup to get campaignIds for the hub
    // For now, we'll return all pending and let the frontend filter
    
    const proofs = await collection
      .find(query)
      .sort({ uploadedAt: 1 }) // Oldest first
      .limit(parseInt(limit as string))
      .toArray();
    
    res.json({ proofs, total: proofs.length });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

/**
 * GET /api/proof-of-performance/:id
 * Get a specific proof by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const proof = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    res.json({ proof });
  } catch (error) {
    console.error('Error fetching proof:', error);
    res.status(500).json({ error: 'Failed to fetch proof' });
  }
});

/**
 * POST /api/proof-of-performance
 * Upload a new proof of performance
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const {
      orderId,
      campaignId,
      publicationId,
      publicationName,
      itemPath,
      itemName,
      channel,
      dimensions,
      fileType,
      fileName,
      fileUrl,
      s3Key,
      fileSize,
      mimeType,
      description,
      runDate,
      runDateEnd,
    } = req.body;
    
    const proofData: ProofOfPerformanceInsert = {
      orderId,
      campaignId,
      publicationId,
      publicationName,
      itemPath,
      itemName,
      channel,
      dimensions,
      fileType,
      fileName,
      fileUrl,
      s3Key,
      fileSize,
      mimeType,
      description,
      runDate: runDate ? new Date(runDate) : undefined,
      runDateEnd: runDateEnd ? new Date(runDateEnd) : undefined,
      uploadedBy: userId,
      uploadedAt: new Date(),
      verificationStatus: 'pending',
    };
    
    // Validate
    const errors = validateProofOfPerformance(proofData);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const result = await collection.insertOne(proofData as any);
    
    // Update proof count on order
    await updateOrderProofCount(orderId);

    res.status(201).json({
      success: true, 
      proof: { ...proofData, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error uploading proof:', error);
    res.status(500).json({ error: 'Failed to upload proof' });
  }
});

/**
 * POST /api/proof-of-performance/upload
 * Upload a proof file through the server (avoids CORS issues)
 */
router.post('/upload', upload.single('file'), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { orderId, campaignId } = req.body;
    
    // Upload file to storage (uses S3 via fileStorage)
    const uploadResult = await fileStorage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      { 
        category: 'proof-of-performance',
        subPath: `${campaignId || 'unknown'}/${orderId || 'unknown'}`
      }
    );
    
    if (!uploadResult.success) {
      return res.status(400).json({ error: uploadResult.error });
    }
    
    res.json({
      success: true,
      fileName: uploadResult.originalFileName,
      fileUrl: uploadResult.fileUrl,
      s3Key: uploadResult.storagePath,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.fileType,
    });
  } catch (error) {
    console.error('Error uploading proof file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * PUT /api/proof-of-performance/:id
 * Update a proof (description, run dates, etc.)
 */
router.put('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const existing = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    // Only allow updating certain fields
    const allowedFields = ['description', 'runDate', 'runDateEnd', 'itemPath', 'itemName', 'channel', 'dimensions'];
    const updateData: any = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'runDate' || field === 'runDateEnd') {
          updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    res.json({ success: true, proof: result });
  } catch (error) {
    console.error('Error updating proof:', error);
    res.status(500).json({ error: 'Failed to update proof' });
  }
});

/**
 * PUT /api/proof-of-performance/:id/verify
 * Verify or reject a proof (admin)
 */
router.put('/:id/verify', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { status, notes } = req.body;
    
    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "verified" or "rejected"' });
    }
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const existing = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    // Validate transition
    if (!isValidVerificationTransition(existing.verificationStatus, status)) {
      return res.status(400).json({ 
        error: `Cannot transition from ${existing.verificationStatus} to ${status}` 
      });
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: {
          verificationStatus: status,
          verifiedBy: userId,
          verifiedAt: new Date(),
          verificationNotes: notes || undefined,
        }
      },
      { returnDocument: 'after' }
    );
    
    // Update order proof status
    await updateOrderProofStatus(existing.orderId);

    res.json({ success: true, proof: result });
  } catch (error) {
    console.error('Error verifying proof:', error);
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

/**
 * DELETE /api/proof-of-performance/:id
 * Soft delete a proof
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const db = getDatabase();
    const collection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    
    const existing = await collection.findOne({ 
      _id: new ObjectId(id),
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    // Soft delete
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: new Date() } }
    );
    
    // Update order proof count
    await updateOrderProofCount(existing.orderId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting proof:', error);
    res.status(500).json({ error: 'Failed to delete proof' });
  }
});

/**
 * Helper function to update order proof count
 */
async function updateOrderProofCount(orderId: string): Promise<void> {
  try {
    const db = getDatabase();
    const proofCollection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    const count = await proofCollection.countDocuments({ 
      orderId, 
      deletedAt: { $exists: false } 
    });
    
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          proofCount: count,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating order proof count:', error);
  }
}

/**
 * Helper function to update order proof status
 */
async function updateOrderProofStatus(orderId: string): Promise<void> {
  try {
    const db = getDatabase();
    const proofCollection = db.collection<ProofOfPerformance>(COLLECTIONS.PROOF_OF_PERFORMANCE);
    const ordersCollection = db.collection(COLLECTIONS.PUBLICATION_INSERTION_ORDERS);
    
    const proofs = await proofCollection.find({ 
      orderId, 
      deletedAt: { $exists: false } 
    }).toArray();
    
    const allVerified = proofs.length > 0 && proofs.every(p => p.verificationStatus === 'verified');
    
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          proofOfPerformanceComplete: allVerified,
          proofCount: proofs.length,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating order proof status:', error);
  }
}

export default router;
