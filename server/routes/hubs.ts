import { Router, Response } from 'express';
import { userProfilesService } from '../../src/integrations/mongodb/allServices';
import { HubsService } from '../../src/integrations/mongodb/hubService';
import { authenticateToken, requireHubAccess } from '../middleware/authenticate';

const router = Router();

/**
 * Hubs Routes
 * 
 * Endpoints for managing hubs, including CRUD operations,
 * stats, and hub-publication associations.
 */

// Get all hubs (public)
router.get('/', async (req, res) => {
  try {
    const hubs = await HubsService.getAllHubs();
    res.json({ hubs });
  } catch (error) {
    console.error('Error fetching hubs:', error);
    res.status(500).json({ error: 'Failed to fetch hubs' });
  }
});

// Get hub by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hub = await HubsService.getHubById(id);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error fetching hub:', error);
    res.status(500).json({ error: 'Failed to fetch hub' });
  }
});

// Get hub by slug/hubId (public)
router.get('/slug/:hubId', async (req, res) => {
  try {
    const { hubId } = req.params;
    const hub = await HubsService.getHubBySlug(hubId);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error fetching hub by slug:', error);
    res.status(500).json({ error: 'Failed to fetch hub' });
  }
});

// Create new hub (admin only)
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const hub = await HubsService.createHub(req.body);
    res.status(201).json({ hub });
  } catch (error) {
    console.error('Error creating hub:', error);
    res.status(500).json({ error: 'Failed to create hub' });
  }
});

// Update hub (admin only)
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const hub = await HubsService.updateHub(id, req.body);
    
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    res.json({ hub });
  } catch (error) {
    console.error('Error updating hub:', error);
    res.status(500).json({ error: 'Failed to update hub' });
  }
});

// Delete hub (admin only)
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    await HubsService.deleteHub(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting hub:', error);
    res.status(500).json({ error: 'Failed to delete hub' });
  }
});

// Get hub statistics (public)
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await HubsService.getHubStats(id);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching hub stats:', error);
    res.status(500).json({ error: 'Failed to fetch hub statistics' });
  }
});

// Get publications for a hub (public)
router.get('/:hubId/publications', async (req, res) => {
  try {
    const { hubId } = req.params;
    const { includeInventory } = req.query;
    
    const publications = await HubsService.getHubPublications(
      hubId,
      includeInventory === 'true'
    );
    
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching hub publications:', error);
    res.status(500).json({ error: 'Failed to fetch hub publications' });
  }
});

// Add publications to hub in bulk (admin only)
router.post('/:hubId/publications/bulk', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { hubId } = req.params;
    const { publicationIds } = req.body;
    
    if (!Array.isArray(publicationIds) || publicationIds.length === 0) {
      return res.status(400).json({ error: 'Publication IDs array is required' });
    }
    
    const modifiedCount = await HubsService.bulkAssignPublicationsToHub(publicationIds, hubId);
    res.json({ success: true, modifiedCount });
  } catch (error) {
    console.error('Error adding publications to hub:', error);
    res.status(500).json({ error: 'Failed to add publications to hub' });
  }
});

// Remove publication from hub (admin only)
router.delete('/:hubId/publications/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { hubId, publicationId } = req.params;
    await HubsService.removePublicationFromHub(publicationId, hubId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing publication from hub:', error);
    res.status(500).json({ error: 'Failed to remove publication from hub' });
  }
});

// Generate AI network summary for a hub (admin only)
router.post('/:hubId/generate-network-summary', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { hubId } = req.params;

    // Check ANTHROPIC_API_KEY is set (agent uses Claude)
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
    }

    // Resolve hub - try by ObjectId first, then by slug
    let hub = null;
    try {
      hub = await HubsService.getHubById(hubId);
    } catch {
      // Not a valid ObjectId, try slug
    }
    if (!hub) {
      hub = await HubsService.getHubBySlug(hubId);
    }
    if (!hub) {
      return res.status(404).json({ error: 'Hub not found' });
    }
    
    const hubObjectId = (hub as any)._id?.toString();

    // Get all publications in this hub
    const publications = await HubsService.getHubPublications(hub.hubId);
    if (!publications || publications.length === 0) {
      return res.status(400).json({ error: 'Hub has no publications to summarize' });
    }

    // Run the agent
    const { HubNetworkSummaryAgent } = await import('../services/hubNetworkSummaryAgent');
    const currentVersion = hub.networkSummary?.version || 0;
    const result = await HubNetworkSummaryAgent.generate(hub, publications, currentVersion);

    // Build the networkSummary object (strip usage from what gets saved)
    const { usage, ...networkSummary } = result;

    // Save to the hub document
    await HubsService.updateHub(hubObjectId, {
      networkSummary,
      updatedAt: new Date(),
    } as any);

    const hubName = hub.basicInfo?.name || hub.hubId;

    res.json({
      success: true,
      hubId: hub.hubId,
      hubName,
      networkSummary,
    });
  } catch (error: any) {
    console.error('Error generating network summary:', error);
    res.status(500).json({ error: `Failed to generate network summary: ${error.message}` });
  }
});

export default router;

