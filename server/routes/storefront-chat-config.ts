import { Router, Response } from 'express';
import { storefrontChatConfigService, userProfilesService } from '../../src/integrations/mongodb/allServices';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

/**
 * Storefront Chat Config Routes
 * 
 * These endpoints manage the AI chat widget configuration for storefronts.
 * Each publication can have custom placeholders, context, and instructions
 * that modify the base LLM agent behavior.
 */

// Get chat config by publicationId
router.get('/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    
    const config = await storefrontChatConfigService.getByPublicationId(publicationId);
    
    if (!config) {
      return res.status(404).json({ error: 'Chat config not found for this publication' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching chat config:', error);
    res.status(500).json({ error: 'Failed to fetch chat config' });
  }
});

// Create or update chat config (upsert)
router.put('/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    const configData = req.body;
    
    console.log(`📝 Upserting chat config for publicationId: ${publicationId}`);
    
    const config = await storefrontChatConfigService.upsert(publicationId, configData);
    
    console.log(`✅ Chat config saved for publicationId: ${publicationId}`);
    
    res.json(config);
  } catch (error) {
    console.error('Error saving chat config:', error);
    res.status(500).json({ error: 'Failed to save chat config' });
  }
});

// Delete chat config
router.delete('/:publicationId', authenticateToken, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const profile = await userProfilesService.getByUserId(req.user.id);
    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { publicationId } = req.params;
    
    const deleted = await storefrontChatConfigService.delete(publicationId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Chat config not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat config:', error);
    res.status(500).json({ error: 'Failed to delete chat config' });
  }
});

/**
 * Test chat endpoint - proxies to the external Lambda AI service
 * 
 * This allows publishers to test their chat configuration with the actual
 * LLM service, using the current (possibly unsaved) configuration.
 * 
 * Works even without a saved config - just uses the configOverride parameter.
 */
router.post('/:publicationId/test', authenticateToken, async (req: any, res: Response) => {
  try {
    const { publicationId } = req.params;
    const { messages, configOverride } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    // Get the Lambda URL from environment
    const lambdaUrl = process.env.STOREFRONT_AI_CHAT_URL;
    
    if (!lambdaUrl) {
      console.error('❌ STOREFRONT_AI_CHAT_URL environment variable not set');
      return res.status(503).json({ 
        error: 'Chat service not configured. Please set STOREFRONT_AI_CHAT_URL environment variable.' 
      });
    }
    
    console.log(`🧪 Testing chat for publicationId: ${publicationId}`);
    
    // If no configOverride provided, try to get saved config (but don't fail if none exists)
    let effectiveConfig = configOverride;
    if (!effectiveConfig) {
      try {
        const savedConfig = await storefrontChatConfigService.getByPublicationId(publicationId);
        if (savedConfig) {
          effectiveConfig = {
            placeholders: savedConfig.placeholders,
            publicationContext: savedConfig.publicationContext,
            prependInstructions: savedConfig.prependInstructions,
            appendInstructions: savedConfig.appendInstructions
          };
        }
      } catch (err) {
        // Ignore - we'll proceed without config
        console.log(`ℹ️ No saved config for publicationId ${publicationId}, using defaults`);
      }
    }
    
    // Prepare the request to the Lambda function
    const lambdaPayload = {
      messages,
      publicationId,
      // Pass config if we have one (either from configOverride or saved)
      ...(effectiveConfig && { configOverride: effectiveConfig })
    };
    
    console.log(`📤 Lambda payload publicationId: ${publicationId}, hasConfig: ${!!effectiveConfig}`);
    
    // Call the Lambda function
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lambdaPayload)
    });
    
    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error(`❌ Lambda returned error: ${lambdaResponse.status} - ${errorText}`);
      return res.status(lambdaResponse.status).json({ 
        error: `Chat service error: ${errorText}` 
      });
    }
    
    // Check if it's a streaming response (SSE)
    const contentType = lambdaResponse.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      // Stream the SSE response directly to the client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = lambdaResponse.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: 'Failed to read stream from chat service' });
      }
      
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // Regular JSON response
      const responseData = await lambdaResponse.json();
      res.json(responseData);
    }
  } catch (error: any) {
    console.error('Error in test chat:', error);
    res.status(500).json({ error: error.message || 'Failed to test chat' });
  }
});

export default router;
