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

    // Dynamically import to avoid circular deps
    const { WebSearchService } = await import('../services/webSearchService');

    if (!WebSearchService.isConfigured()) {
      return res.status(503).json({ error: 'Perplexity API is not configured. Set PERPLEXITY_API_KEY environment variable.' });
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

    // Get all publications in this hub (uses slug)
    const publications = await HubsService.getHubPublications(hub.hubId);
    if (!publications || publications.length === 0) {
      return res.status(400).json({ error: 'Hub has no publications to summarize' });
    }

    // Build context from publication data
    const pubSummaries = publications.map((pub: any) => {
      const name = pub.basicInfo?.publicationName || `Publication ${pub.publicationId}`;
      const type = pub.basicInfo?.publicationType || '';
      const content = pub.basicInfo?.contentType || '';
      const area = pub.basicInfo?.primaryServiceArea || '';
      const audience = pub.audienceDemographics?.totalAudience;
      const aiSummary = pub.aiProfile?.summary || '';
      const valueProposition = pub.competitiveInfo?.uniqueValueProposition || '';
      const contentFocus = pub.editorialInfo?.contentFocus?.join(', ') || '';

      let line = `- ${name}`;
      if (type) line += ` (${type})`;
      if (area) line += `, serving ${area}`;
      if (audience) line += `, ${audience.toLocaleString()} audience`;
      if (contentFocus) line += `. Content: ${contentFocus}`;
      if (aiSummary) line += `. ${aiSummary}`;
      else if (valueProposition) line += `. ${valueProposition}`;
      return line;
    }).join('\n');

    // Build aggregate stats for context
    const totalAudience = publications.reduce((sum: number, p: any) => 
      sum + (p.audienceDemographics?.totalAudience || 0), 0);
    const channels = new Set<string>();
    const geoAreas = new Set<string>();
    for (const pub of publications) {
      if ((pub as any).basicInfo?.primaryServiceArea) geoAreas.add((pub as any).basicInfo.primaryServiceArea);
      const dc = (pub as any).distributionChannels || {};
      if (dc.website?.length) channels.add('website');
      if (dc.newsletters?.length) channels.add('newsletter');
      if (dc.print?.length) channels.add('print');
      if (dc.socialMedia?.length) channels.add('social');
      if (dc.podcasts?.length) channels.add('podcast');
      if (dc.radioStations?.length) channels.add('radio');
      if (dc.events?.length) channels.add('events');
      if (dc.streamingVideo?.length) channels.add('streaming');
    }

    const hubName = hub.basicInfo?.name || 'This advertising network';
    const region = hub.geography?.region || hub.geography?.primaryCity || '';

    const query = `You are writing a network value proposition for "${hubName}", an advertising network${region ? ` based in ${region}` : ''} with ${publications.length} partner publications reaching a combined audience of ${totalAudience.toLocaleString()}+ across ${channels.size} channels (${[...channels].join(', ')}).

Here are the publications in the network:
${pubSummaries}

Write the following clearly labeled sections:

1. VALUE PROPOSITION: A compelling 3-4 sentence pitch for why an advertiser should buy across this network. Focus on the unique combination of reach, audience quality, geographic coverage, and cross-channel opportunities. Write as if pitching to a CMO.

2. AUDIENCE HIGHLIGHTS: 2-3 sentences about who the combined audience is -- demographics, interests, buying power, community engagement. What makes these readers/listeners/viewers valuable?

3. MARKET COVERAGE: 2-3 sentences about the geographic footprint and local market depth. How does the network cover the region? What types of communities are represented?

4. CHANNEL STRENGTHS: 2-3 sentences about the cross-channel mix. What channels are available and how do they complement each other for campaign reach and frequency?`;

    const searchResponse = await WebSearchService.search(query, {
      model: 'sonar-pro',
      systemPrompt: `You are a media network strategist helping an advertising hub articulate its value to prospective advertisers. Write in a confident, professional tone suitable for sales presentations and RFP responses. Be specific about the network's strengths -- use real publication names and concrete audience data where available. Structure your response with clearly labeled sections: VALUE PROPOSITION, AUDIENCE HIGHLIGHTS, MARKET COVERAGE, CHANNEL STRENGTHS.`,
    });

    if (!searchResponse.answer) {
      return res.status(502).json({ error: 'No response from Perplexity API' });
    }

    // Parse the structured response
    const sections = parseNetworkSummary(searchResponse.answer);
    const currentVersion = hub.networkSummary?.version || 0;

    const networkSummary = {
      valueProposition: sections.valueProposition,
      audienceHighlights: sections.audienceHighlights,
      marketCoverage: sections.marketCoverage,
      channelStrengths: sections.channelStrengths,
      citations: searchResponse.results.map(r => r.url).filter(Boolean),
      generatedAt: new Date(),
      generatedBy: 'perplexity-sonar-pro',
      publicationCount: publications.length,
      version: currentVersion + 1,
    };

    // Save to the hub document (needs ObjectId)
    await HubsService.updateHub(hubObjectId, {
      networkSummary,
      updatedAt: new Date(),
    } as any);

    res.json({
      success: true,
      hubId: hub.hubId,
      hubName: hubName,
      networkSummary,
    });
  } catch (error: any) {
    console.error('Error generating network summary:', error);
    res.status(500).json({ error: `Failed to generate network summary: ${error.message}` });
  }
});

/** Parse Perplexity response into network summary sections */
function parseNetworkSummary(answer: string): {
  valueProposition: string;
  audienceHighlights: string;
  marketCoverage: string;
  channelStrengths: string;
} {
  const sectionLabels = ['VALUE PROPOSITION', 'AUDIENCE HIGHLIGHTS', 'MARKET COVERAGE', 'CHANNEL STRENGTHS'];
  const sections: Record<string, string> = {};

  for (let i = 0; i < sectionLabels.length; i++) {
    const label = sectionLabels[i];
    const nextLabel = sectionLabels[i + 1];

    let pattern: RegExp;
    if (nextLabel) {
      pattern = new RegExp(
        `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*?)(?=(?:#+\\s*)?(?:\\d+\\.\\s*)?${nextLabel})`,
        'i'
      );
    } else {
      pattern = new RegExp(
        `(?:#+\\s*)?(?:\\d+\\.\\s*)?${label}[:\\s]*\\n?([\\s\\S]*)$`,
        'i'
      );
    }

    const match = answer.match(pattern);
    sections[label] = match ? cleanMarkdown(match[1].trim()) : '';
  }

  return {
    valueProposition: sections['VALUE PROPOSITION'] || answer.slice(0, 400),
    audienceHighlights: sections['AUDIENCE HIGHLIGHTS'] || '',
    marketCoverage: sections['MARKET COVERAGE'] || '',
    channelStrengths: sections['CHANNEL STRENGTHS'] || '',
  };
}

/** Strip markdown formatting for clean display */
function cleanMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default router;

