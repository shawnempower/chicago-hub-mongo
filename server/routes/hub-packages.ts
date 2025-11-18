import { Router, Response } from 'express';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';
import { hubPackagesService } from '../../src/integrations/mongodb/hubPackageService';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

/**
 * Hub Packages Routes
 * 
 * Public endpoints for browsing and inquiring about hub packages,
 * plus admin endpoints for managing packages.
 */

// Get all hub packages (public, filtered by hub)
router.get('/', async (req, res) => {
  try {
    const { hubId, isActive, isFeatured, category, approvalStatus } = req.query;
    
    const filters: any = {};
    if (hubId) filters.hubId = hubId as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
    if (category) filters.category = category as string;
    if (approvalStatus) filters.approvalStatus = approvalStatus as string;
    
    const packages = await hubPackagesService.getAll(filters);
    
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching hub packages:', error);
    res.status(500).json({ error: 'Failed to fetch hub packages' });
  }
});

// Get hub package by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await hubPackagesService.getById(id);
    
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({ package: pkg });
  } catch (error) {
    console.error('Error fetching hub package:', error);
    res.status(500).json({ error: 'Failed to fetch hub package' });
  }
});

// Search hub packages (public)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const packages = await hubPackagesService.search(query);
    res.json({ packages });
  } catch (error) {
    console.error('Error searching hub packages:', error);
    res.status(500).json({ error: 'Failed to search hub packages' });
  }
});

// Submit inquiry about a package (authenticated)
router.post('/:id/inquire', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const inquiryData = { ...req.body, userId: req.user.id };
    
    const inquiry = await hubPackagesService.submitInquiry(id, inquiryData);
    res.status(201).json({ success: true, inquiry });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// Generate insertion order for a package (authenticated)
router.post('/:id/insertion-order', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'html' } = req.body;

    // Validate format
    if (format !== 'html' && format !== 'markdown') {
      return res.status(400).json({ error: 'Invalid format. Must be "html" or "markdown"' });
    }

    // Fetch the package
    const hubPackage = await hubPackagesService.getById(id);
    if (!hubPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Generate insertion order
    const { insertionOrderGenerator } = await import('../insertionOrderGenerator');
    const content = format === 'html'
      ? await insertionOrderGenerator.generateHTMLInsertionOrderForPackage(hubPackage)
      : await insertionOrderGenerator.generateMarkdownInsertionOrderForPackage(hubPackage);

    const insertionOrder = {
      generatedAt: new Date(),
      format,
      content,
      version: 1
    };

    // Return the generated insertion order
    res.json({
      success: true,
      insertionOrder
    });
  } catch (error) {
    console.error('Error generating package insertion order:', error);
    res.status(500).json({ error: 'Failed to generate insertion order' });
  }
});

// Note: Admin routes for hub packages (create, update, delete, restore) are in server/routes/admin.ts

export default router;

