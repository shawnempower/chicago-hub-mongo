/**
 * Inventory Chat Routes
 * 
 * API endpoints for the hub inventory exploration agent
 */

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { ConversationService } from '../conversationService';
import { HubInventoryLLMService } from '../hubInventoryLLMService';
import { createLogger } from '../../src/utils/logger';

const router = Router();
const logger = createLogger('InventoryChatRoutes');

/**
 * Create a new conversation
 * POST /api/inventory-chat/conversations
 */
router.post('/conversations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.body;
    
    if (!hubId) {
      return res.status(400).json({ error: 'hubId is required' });
    }
    
    const conversation = await ConversationService.createConversation(req.user.id, hubId);
    
    logger.info(`Created conversation ${conversation.conversationId} for user ${req.user.id}`);
    
    res.status(201).json(conversation);
  } catch (error: any) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * List conversations for the current user
 * GET /api/inventory-chat/conversations?hubId=xxx
 */
router.get('/conversations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { hubId } = req.query;
    
    const conversations = await ConversationService.getConversations(
      req.user.id,
      hubId as string | undefined
    );
    
    res.json({ conversations });
  } catch (error: any) {
    logger.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

/**
 * Get a specific conversation
 * GET /api/inventory-chat/conversations/:id
 */
router.get('/conversations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const conversation = await ConversationService.getConversation(id, req.user.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error: any) {
    logger.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Delete a conversation
 * DELETE /api/inventory-chat/conversations/:id
 */
router.delete('/conversations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await ConversationService.deleteConversation(id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    logger.info(`Deleted conversation ${id} for user ${req.user.id}`);
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * Send a message and get AI response
 * POST /api/inventory-chat/conversations/:id/messages
 */
router.post('/conversations/:id/messages', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch conversation to verify ownership and get hubId
    const conversation = await ConversationService.getConversation(id, req.user.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message to conversation
    await ConversationService.addMessage(id, req.user.id, 'user', message.trim());

    // Auto-generate title from first message if needed
    if (conversation.messages.length === 0 && conversation.title === 'New Conversation') {
      const title = ConversationService.generateTitle(message.trim());
      await ConversationService.updateTitle(id, req.user.id, title);
    }

    // Get recent conversation history
    const recentMessages = await ConversationService.getRecentMessages(id, req.user.id, 10);
    
    // Call LLM service
    logger.info(`Processing message for conversation ${id}, hub ${conversation.hubId}`);
    const response = await HubInventoryLLMService.chat(
      conversation.hubId,
      message.trim(),
      recentMessages.slice(0, -1) // Exclude the message we just added
    );

    // Add assistant response to conversation
    await ConversationService.addMessage(id, req.user.id, 'assistant', response.content);

    logger.info(`Generated response for conversation ${id} (${response.usage?.outputTokens} tokens)`);

    res.json({
      message: response.content,
      usage: response.usage,
    });
  } catch (error: any) {
    logger.error('Error processing message:', error);
    
    // Handle specific error cases
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ error: error.message });
    }
    
    if (error.message.includes('API key')) {
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    res.status(500).json({ error: error.message || 'Failed to process message' });
  }
});

/**
 * Update conversation title
 * PATCH /api/inventory-chat/conversations/:id/title
 */
router.patch('/conversations/:id/title', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updated = await ConversationService.updateTitle(id, req.user.id, title.trim());
    
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

export default router;

